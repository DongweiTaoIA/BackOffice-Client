import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, RefreshCw, Search, FileText, Save, Edit3, X, Calculator } from 'lucide-react'
import { api } from '../services/api'
import type {
  CancellationEligibilityResult,
  CancellationRefundDetails,
  ContractDetailsDto,
} from '../services/api'
import './CancellationPage.css'

interface CancellationPageProps {
  eligibility: CancellationEligibilityResult
  onBack: () => void
}

// SP rule / type codes pulled from cfCancRule + cfCancType.
const CANC_RULES: { code: string; label: string }[] = [
  { code: 'CR001', label: 'Customer Cancellation' },
  { code: 'CR002', label: 'Repossession / Total Loss / Dealer Participation' },
  { code: 'CR01M', label: 'Customer Cancellation (admin fee $100)' },
  { code: 'CR01H', label: 'Customer Request' },
  { code: 'CR02H', label: 'Lienholder Request' },
  { code: 'CR017', label: 'Terminate - $0 Refund' },
]

const CANC_TYPES: { code: string; label: string }[] = [
  { code: 'CS', label: 'Customer' },
  { code: 'DP', label: 'Dealer Portion' },
  { code: 'LH', label: 'Lienholder' },
  { code: 'LC', label: 'Loyalty Credit' },
]

function formatDate(d: string | null | undefined): string {
  if (!d) return ''
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return ''
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${mm}/${dd}/${date.getFullYear()}`
}

function formatDateIso(d: string | null | undefined): string {
  if (!d) return ''
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return ''
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatMoney(n: number | null | undefined): string {
  if (n === null || n === undefined) return ''
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatPercent(fraction: number | null | undefined, decimals = 4): string {
  if (fraction === null || fraction === undefined) return ''
  // SP returns Factor as a decimal fraction (e.g. 0.6729). Convert to a percent for display.
  return `${(fraction * 100).toFixed(decimals)} %`
}

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return ''
  return n.toLocaleString('en-US')
}

function statusLabel(pri: string, sec: string): { text: string; tone: 'ok' | 'warn' | 'danger' } {
  const map: Record<string, string> = {
    A: 'Active', F: 'Finalized', P: 'Pending', Q: 'Quote',
    C: 'Cancelled', T: 'Terminated', X: 'Expired', V: 'Void',
  }
  const left = map[pri?.toUpperCase()] ?? pri
  const right = map[sec?.toUpperCase()] ?? sec
  const text = [left, right].filter(Boolean).join(' / ')
  const p = pri?.toUpperCase()
  let tone: 'ok' | 'warn' | 'danger' = 'ok'
  if (p === 'C' || p === 'T' || p === 'V') tone = 'danger'
  else if (p === 'P' || p === 'Q' || p === 'X') tone = 'warn'
  return { text, tone }
}

function productLabel(code: string | undefined): string {
  if (!code) return ''
  const map: Record<string, string> = {
    EW: 'Extended Warranty', DW: 'Dealer Warranty', GP: 'GAP Insurance', AU: 'Auto',
  }
  return map[code.toUpperCase()] ?? code
}

function planTermLabel(details: ContractDetailsDto): string {
  const program = details.programId?.trim()
  const months = details.mespMonths
  const km = details.mespKm

  // Fallback: derive term in months from effect → expiry.
  let derivedMonths: number | null = null
  if (!months && details.effectDt && details.expiryDt) {
    const start = new Date(details.effectDt)
    const end = new Date(details.expiryDt)
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      derivedMonths = Math.round(
        (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
      )
    }
  }

  const term = months ?? derivedMonths
  const parts: string[] = []
  if (program) parts.push(program)
  if (term) parts.push(`${term} mo`)
  if (km) parts.push(`${km.toLocaleString('en-US')} km`)
  return parts.length > 0 ? parts.join(' • ') : '—'
}

function CancellationPage({ eligibility, onBack }: CancellationPageProps) {
  const [contractInput, setContractInput] = useState(eligibility.contractNumber)
  const [details, setDetails] = useState<ContractDetailsDto | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(true)
  const [detailsError, setDetailsError] = useState<string | null>(null)

  // Cancellation form state — defaults to today.
  const today = useMemo(() => formatDateIso(new Date().toISOString()), [])
  const [cancellationDate, setCancellationDate] = useState(today)
  const [receivedDate, setReceivedDate] = useState(today)
  const [cancelOdoKm, setCancelOdoKm] = useState<string>('')
  const [cancelOdoMiles, setCancelOdoMiles] = useState<string>('')
  const [ruleCode, setRuleCode] = useState('CR001')
  const [typeCode, setTypeCode] = useState('CS')
  const [cancellationReason, setCancellationReason] = useState('Customer Request')

  // Refund details from the SP. Seeded with whatever the chat-driven check
  // returned, then re-fetched whenever the cancellation parameters change.
  const [refund, setRefund] = useState<CancellationRefundDetails | undefined>(eligibility.refundDetails)
  const [calcMessages, setCalcMessages] = useState(eligibility.messages ?? [])
  const [calcLoading, setCalcLoading] = useState(false)
  const [calcError, setCalcError] = useState<string | null>(null)

  // Cheque info — Issue Cheque flag is driven by the SP's EnableIssueChequeYN.
  const [paymentMethod, setPaymentMethod] = useState('Cheque')
  const [issueCheque, setIssueCheque] = useState((refund?.enableIssueChequeYN ?? 'Y') === 'Y')
  const [payeeType, setPayeeType] = useState('Lienholder and Primary Customer')
  const [payeeName, setPayeeName] = useState('')
  const [chequeDescription, setChequeDescription] = useState('')

  // Load real contract details for the Contract Information block.
  useEffect(() => {
    let cancelled = false
    setDetailsLoading(true)
    setDetailsError(null)
    api
      .getContractDetails(eligibility.contractNumber)
      .then(d => {
        if (cancelled) return
        setDetails(d)
        setCancelOdoKm(d.numOfKm != null ? String(d.numOfKm) : '')
        setCancelOdoMiles(d.numOfMiles != null ? String(d.numOfMiles) : '')
        setChequeDescription(`${d.licensePlate || ''} ${d.contractNum} ${d.dealerName || ''}`.trim())
        setPayeeName(d.dealerName || '')
      })
      .catch(err => {
        if (cancelled) return
        setDetailsError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setDetailsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [eligibility.contractNumber])

  // Debounced re-calc when the user changes cancellation date / rule / type.
  const lastRequestId = useRef(0)
  const recalc = useCallback(async () => {
    const reqId = ++lastRequestId.current
    setCalcLoading(true)
    setCalcError(null)
    try {
      const res = await api.getCancellationEligibility(eligibility.contractNumber, {
        cancDt: cancellationDate,
        ruleId: ruleCode,
        cancType: typeCode,
      })
      if (reqId !== lastRequestId.current) return
      setRefund(res.refundDetails)
      setCalcMessages(res.messages ?? [])
      setIssueCheque((res.refundDetails?.enableIssueChequeYN ?? 'Y') === 'Y')
    } catch (err) {
      if (reqId !== lastRequestId.current) return
      setCalcError(err instanceof Error ? err.message : String(err))
    } finally {
      if (reqId === lastRequestId.current) setCalcLoading(false)
    }
  }, [eligibility.contractNumber, cancellationDate, ruleCode, typeCode])

  useEffect(() => {
    // Skip the very first run — props already carry the initial result.
    const t = setTimeout(() => { void recalc() }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancellationDate, ruleCode, typeCode])

  // Display helpers driven entirely by the SP result set.
  const retailPremium = refund?.retailPremiumPaidAmount ?? 0
  const grossRefund = refund?.refundAmount ?? 0
  const factor = refund?.factor ?? 0
  const claimsPaid = refund?.claimsPaidAmount ?? 0
  const adminFee = refund?.adminFee ?? 0
  const netRefund = refund?.netRefundAmount ?? 0
  const refundTax1 = refund?.refundTax1Amount ?? 0
  const refundTax2 = refund?.refundTax2Amount ?? 0
  const totalRefund = refund?.totalRefund ?? (netRefund + refundTax1 + refundTax2)

  const dealerMarkup = refund?.dealerMarkupAmount ?? 0
  const dealerMarkupPct = refund?.dealerMarkupPercentage ?? 0
  const netDealerChargeback = refund?.netDealerChargebackAmount ?? 0
  const chargebackTax1 = refund?.chargebackTax1Amount ?? 0
  const chargebackTax2 = refund?.chargebackTax2Amount ?? 0
  const dealerChargeback = refund?.dealerChargebackAmount ?? 0
  const iapPortion = refund?.iapPortionAmount ?? 0

  const chequeTotal = +(totalRefund - dealerChargeback).toFixed(2)

  return (
    <div className="cancellation-page">
      <div className="cancel-topbar">
        <button className="back-btn" onClick={onBack} aria-label="Back">
          <ArrowLeft size={16} /> Back
        </button>
        <div className="cancel-toolbar">
          <label className="cancel-toolbar-field">
            <span>Contract #</span>
            <input
              type="text"
              value={contractInput}
              onChange={e => setContractInput(e.target.value)}
            />
          </label>
          <button className="toolbar-btn" onClick={() => void recalc()}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="toolbar-btn"><Search size={14} /> Advanced Search</button>
          <button className="toolbar-btn"><FileText size={14} /> Claims</button>
          {calcLoading && <span className="calc-status">Recalculating</span>}
        </div>
      </div>

      {detailsError && <div className="cancel-error">{detailsError}</div>}
      {calcError && <div className="cancel-error">Calc error: {calcError}</div>}
      {calcMessages.length > 0 && (
        <div className="cancel-warn">
          {calcMessages.map((m, i) => (
            <div key={i}>
              <strong>[{m.msgType}]</strong> {m.msgText}
            </div>
          ))}
        </div>
      )}
      {detailsLoading && <div className="cancel-loading">Loading contract details…</div>}

      {!detailsLoading && details && (
        <>
          {/* Contract Information */}
          <section className="cancel-section">
            <div className="cancel-section-header">Contract Information</div>
            <div className="cancel-grid four-col">
              <Field label="Contract #" value={<a href="#">{details.contractNum}</a>} />
              <Field label="Customer Name" value={details.customer1Name ?? '—'} />
              <Field label="VIN" value={details.vin ? <span className="mono">{details.vin}</span> : '—'} />
              <Field
                label="Status"
                value={(() => {
                  const s = statusLabel(details.contractStatPri, details.contractStatSec)
                  const cls = s.tone === 'ok' ? 'status-pill' : `status-pill ${s.tone}`
                  return <span className={cls}>{s.text}</span>
                })()}
              />

              <Field label="Effect Date" value={formatDate(details.effectDt)} />
              <Field label="Effect Kms" value={formatNumber(details.effectKm)} />
              <Field label="Plan / Term" value={planTermLabel(details)} />
              <Field
                label="Open Claim?"
                value={
                  (details.openClaimCount ?? 0) > 0
                    ? <span className="status-pill warn">{details.openClaimCount} Open</span>
                    : <span className="status-pill">No Open Claims</span>
                }
              />

              <Field label="Purchase Date" value={formatDate(details.purchaseDt)} />
              <Field label="Contract Type" value={details.contractType} />
              <Field label="Lienholder" value={details.lienHolderLabel ?? details.lienHolderId ?? '—'} />
              <Field label="Product" value={productLabel(details.productId)} />

              <Field label="Expiry Date" value={formatDate(details.expiryDt)} />
              <Field label="Ext. Contract #" value={details.extContractNum ?? '—'} />
              <Field label="Vehicle Price" value={details.vehiclePrice ? formatMoney(details.vehiclePrice) : '—'} />
              <Field label="Dealer" value={details.dealerName ?? details.dealerId} />
            </div>
          </section>

          {/* Cancellation Information */}
          <section className="cancel-section">
            <div className="cancel-section-header">Cancellation Information</div>
            <div className="cancel-grid two-col">
              <FieldInput
                label="Cancellation Date"
                type="date"
                value={cancellationDate}
                onChange={setCancellationDate}
              />
              <div className="field">
                <label>Cancellation Rule</label>
                <select value={ruleCode} onChange={e => setRuleCode(e.target.value)}>
                  {CANC_RULES.map(r => (
                    <option key={r.code} value={r.code}>{r.code} — {r.label}</option>
                  ))}
                </select>
              </div>

              <FieldInput
                label="Received Date"
                type="date"
                value={receivedDate}
                onChange={setReceivedDate}
              />
              <div className="field">
                <label>Cancel Type</label>
                <select value={typeCode} onChange={e => setTypeCode(e.target.value)}>
                  {CANC_TYPES.map(c => (
                    <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Cancel Odometer</label>
                <div className="odo-row">
                  <input
                    type="text"
                    value={cancelOdoKm}
                    onChange={e => setCancelOdoKm(e.target.value)}
                  />
                  <span>km</span>
                  <input
                    type="text"
                    value={cancelOdoMiles}
                    onChange={e => setCancelOdoMiles(e.target.value)}
                  />
                  <span>miles</span>
                </div>
              </div>
              <FieldSelect
                label="Cancellation Reason"
                value={cancellationReason}
                onChange={setCancellationReason}
                options={['Customer Request', 'Vehicle Sold', 'Total Loss', 'Dealer Error', 'Other']}
              />
            </div>
          </section>

          <div className="cancel-two-col">
            {/* Customer Refund */}
            <section className="cancel-section">
              <div className="cancel-section-header">Customer Refund</div>
              <table className="calc-table">
                <thead>
                  <tr>
                    <th></th>
                    <th><span className="check">✓</span> Calculated</th>
                    <th>Overridden</th>
                  </tr>
                </thead>
                <tbody>
                  <CalcRow label="Retail Premium Paid" calc={formatMoney(retailPremium)} ovr={formatMoney(retailPremium)} />
                  <CalcRow label="Gross Refund" calc={formatMoney(grossRefund)} ovr={formatMoney(grossRefund)} editable />
                  <CalcRow label="Factor" calc={formatPercent(factor)} ovr={formatPercent(factor)} />
                  <CalcRow label="Claims Paid" calc={formatMoney(claimsPaid)} ovr={formatMoney(claimsPaid)} editable />
                  <CalcRow label="Admin Fee" calc={formatMoney(adminFee)} ovr={formatMoney(adminFee)} editable />
                  <CalcRow label="Net Refund Amount" calc={formatMoney(netRefund)} ovr={formatMoney(netRefund)} />
                  <CalcRow label="GST/HST" calc={formatMoney(refundTax1)} ovr={formatMoney(refundTax1)} editable />
                  <CalcRow label="PST/IPT" calc={formatMoney(refundTax2)} ovr={formatMoney(refundTax2)} editable />
                  <CalcRow label="Total Refund" calc={formatMoney(totalRefund)} ovr={formatMoney(totalRefund)} bold />
                </tbody>
              </table>
            </section>

            {/* Dealer Chargeback */}
            <section className="cancel-section">
              <div className="cancel-section-header">Dealer Chargeback Calculation</div>
              <table className="calc-table">
                <thead>
                  <tr>
                    <th></th>
                    <th><span className="check">✓</span> Calculated</th>
                    <th>Overridden</th>
                  </tr>
                </thead>
                <tbody>
                  <CalcRow label="Retail Premium Paid" calc={formatMoney(retailPremium)} ovr={formatMoney(retailPremium)} />
                  <CalcRow label="Dealer Markup" calc={formatMoney(dealerMarkup)} ovr={formatMoney(dealerMarkup)} />
                  <CalcRow label="Dealer Markup Percentage" calc={formatPercent(dealerMarkupPct, 2)} ovr={formatPercent(dealerMarkupPct, 2)} editable />
                  <CalcRow label="Net Dealer Chargeback" calc={formatMoney(netDealerChargeback)} ovr={formatMoney(netDealerChargeback)} />
                  <CalcRow label="GST/HST" calc={formatMoney(chargebackTax1)} ovr={formatMoney(chargebackTax1)} editable />
                  <CalcRow label="PST/IPT" calc={formatMoney(chargebackTax2)} ovr={formatMoney(chargebackTax2)} editable />
                  <CalcRow label="Dealer Chargeback" calc={formatMoney(dealerChargeback)} ovr={formatMoney(dealerChargeback)} />
                  <CalcRow label="IAP Portion" calc={formatMoney(iapPortion)} ovr={formatMoney(iapPortion)} />
                </tbody>
              </table>
            </section>
          </div>

          {/* Cheque Information (full width) */}
          <section className="cancel-section">
            <div className="cancel-section-header">Cheque Information</div>
            <div className="cheque-grid wide">
              <div className="field-inline">
                <label>Payment Method</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option>Cheque</option>
                  <option>EFT</option>
                  <option>Credit Card</option>
                </select>
              </div>
              <div className="field-inline">
                <label>Cheque Total</label>
                <span className="static-value accent">{formatMoney(chequeTotal)}</span>
              </div>
              <div className="field-inline">
                <label>Cheque ID</label>
                <input type="text" />
              </div>
              <div className="field-inline">
                <label>Issue Cheque</label>
                <input
                  type="checkbox"
                  checked={issueCheque}
                  onChange={e => setIssueCheque(e.target.checked)}
                />
              </div>

              <div className="field-inline">
                <label>Cheque Status</label>
                <input type="text" />
              </div>
              <div className="field-inline">
                <label>Payee Type</label>
                <select value={payeeType} onChange={e => setPayeeType(e.target.value)}>
                  <option>Lienholder and Primary Customer</option>
                  <option>Primary Customer</option>
                  <option>Lienholder</option>
                  <option>Dealer</option>
                </select>
              </div>
              <div className="field-inline">
                <label>Payee Name</label>
                <input
                  type="text"
                  value={payeeName}
                  onChange={e => setPayeeName(e.target.value)}
                />
              </div>
              <div className="field-inline">
                <label>Country</label>
                <select>
                  <option>Canada</option>
                  <option>United States</option>
                </select>
              </div>

              <div className="field-inline span-2">
                <label>Address</label>
                <input type="text" />
              </div>
              <div className="field-inline">
                <label>City</label>
                <input type="text" />
              </div>
              <div className="field-inline">
                <label>Province</label>
                <select>
                  <option>Ontario</option>
                  <option>Quebec</option>
                  <option>British Columbia</option>
                  <option>Alberta</option>
                </select>
              </div>

              <div className="field-inline span-4">
                <label>Cheque Description</label>
                <input
                  type="text"
                  value={chequeDescription}
                  onChange={e => setChequeDescription(e.target.value)}
                />
              </div>
              <div className="field-inline">
                <label>Postal Code</label>
                <input type="text" />
              </div>
            </div>
          </section>

          {/* Action bar */}
          <div className="cancel-actions">
            <div className="cancel-actions-left">
              <button className="action-btn"><Edit3 size={14} /> Edit Quote</button>
              <button className="action-btn primary"><Save size={14} /> Save Quote</button>
              <button className="action-btn danger"><X size={14} /> Cancel Contract</button>
            </div>
            <div className="cancel-actions-right">
              <button className="action-btn ghost"><Calculator size={14} /> Calculation Override</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface FieldProps {
  label: string
  value: React.ReactNode
}

function Field({ label, value }: FieldProps) {
  return (
    <div className="field readonly">
      <label>{label}</label>
      <div className="static-value">{value}</div>
    </div>
  )
}

interface FieldInputProps {
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
}

function FieldInput({ label, type = 'text', value, onChange }: FieldInputProps) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

interface FieldSelectProps {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}

function FieldSelect({ label, value, onChange, options }: FieldSelectProps) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

interface CalcRowProps {
  label: string
  calc: string
  ovr: string
  editable?: boolean
  bold?: boolean
}

function CalcRow({ label, calc, ovr, editable, bold }: CalcRowProps) {
  return (
    <tr className={bold ? 'bold' : ''}>
      <td>{label}</td>
      <td className="num">{calc}</td>
      <td className={`num ${editable ? 'editable' : ''}`}>{ovr}</td>
    </tr>
  )
}

export default CancellationPage
