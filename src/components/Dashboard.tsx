import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Users,
  FileText,
  Package,
  ClipboardList,
  FileSignature,
  UserCheck,
  Car,
  Store,
  RefreshCw,
  CheckCircle2,
  UserPlus,
  LogIn,
  FilePlus2,
  FileCheck2,
  FileX2,
} from 'lucide-react'
import { api, type DashboardMetrics } from '../services/api'
import './Dashboard.css'

interface MetricDef {
  key: keyof DashboardMetrics
  label: string
  icon: typeof Users
  iconClass: string
  animated?: boolean
}

const METRIC_DEFS: MetricDef[] = [
  { key: 'dealers', label: 'Dealers', icon: Store, iconClass: 'card-icon-blue' },
  { key: 'products', label: 'Products', icon: Package, iconClass: 'card-icon-green' },
  { key: 'programs', label: 'Programs', icon: ClipboardList, iconClass: 'card-icon-purple' },
  { key: 'contracts', label: 'Contracts', icon: FileSignature, iconClass: 'card-icon-orange', animated: true },
  { key: 'customers', label: 'Customers', icon: UserCheck, iconClass: 'card-icon-pink', animated: true },
  { key: 'vehicles', label: 'Vehicles', icon: Car, iconClass: 'card-icon-teal', animated: true },
]

// Smooth ease-out cubic — fast start, gentle landing.
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

interface AnimatedNumberProps {
  value: number | null
  duration?: number
  onAnimating?: (animating: boolean) => void
}

/**
 * Tweens from the previously displayed value to `value` using requestAnimationFrame.
 * Skips animation on the very first non-null value if it's 0, otherwise counts from 0.
 */
function AnimatedNumber({ value, duration = 1100, onAnimating }: AnimatedNumberProps) {
  const [display, setDisplay] = useState<number>(value ?? 0)
  const prevRef = useRef<number>(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (value === null || value === undefined) return

    const from = prevRef.current
    const to = value
    if (from === to) {
      setDisplay(to)
      return
    }

    const start = performance.now()
    onAnimating?.(true)

    const tick = (now: number) => {
      const elapsed = now - start
      const t = Math.min(1, elapsed / duration)
      const eased = easeOutCubic(t)
      const current = Math.round(from + (to - from) * eased)
      setDisplay(current)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        prevRef.current = to
        rafRef.current = null
        onAnimating?.(false)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      prevRef.current = to
      onAnimating?.(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])

  if (value === null || value === undefined) return <>—</>
  return <>{display.toLocaleString()}</>
}

// Fake data for Unification system until its API is available.
const UNIFICATION_METRICS: DashboardMetrics = {
  dealers: 312,
  products: 18,
  programs: 47,
  contracts: 9842,
  customers: 8765,
  vehicles: 9120,
}

function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString()
}

interface SystemPanelProps {
  title: string
  subtitle: string
  metrics: DashboardMetrics | null
  loading: boolean
  error: string | null
  onRefresh?: () => void
  refreshing?: boolean
  hiddenMetrics?: Array<keyof DashboardMetrics>
}

function SystemPanel({
  title,
  subtitle,
  metrics,
  loading,
  error,
  onRefresh,
  refreshing,
  hiddenMetrics,
}: SystemPanelProps) {
  // Track which animated metrics are currently tweening so we can pulse their cards.
  const [animatingKeys, setAnimatingKeys] = useState<Record<string, boolean>>({})

  const setAnimating = useCallback((key: string, animating: boolean) => {
    setAnimatingKeys((prev) => {
      if (!!prev[key] === animating) return prev
      return { ...prev, [key]: animating }
    })
  }, [])

  return (
    <div className="system-panel">
      <div className="system-panel-header">
        <div>
          <h2>{title}</h2>
          <p className="system-panel-subtitle">{subtitle}</p>
        </div>
        <div className="system-panel-actions">
          {loading && <span className="system-panel-status">Loading…</span>}
          {error && (
            <span className="system-panel-status system-panel-status-error">{error}</span>
          )}
          {onRefresh && (
            <button
              type="button"
              className="system-panel-refresh"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label={`Refresh ${title}`}
              title="Refresh"
            >
              <RefreshCw size={14} className={refreshing ? 'spin' : undefined} />
            </button>
          )}
        </div>
      </div>
      <div className="dashboard-grid">
        {METRIC_DEFS.filter(({ key }) => !hiddenMetrics?.includes(key)).map(({ key, label, icon: Icon, iconClass, animated }) => {
          const rawValue = metrics ? metrics[key] : null
          const isAnimating = !!animatingKeys[key]
          const cardClass = [
            'dashboard-card',
            animated ? 'dashboard-card-animated' : '',
            isAnimating ? 'is-pulsing' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <div key={key} className={cardClass}>
              <div className={`card-icon ${iconClass}`}>
                <Icon size={20} />
              </div>
              <div className="card-content">
                <span className="card-label">{label}</span>
                <span className={`card-value${isAnimating ? ' is-counting' : ''}`}>
                  {loading && rawValue === null ? (
                    '…'
                  ) : animated ? (
                    <AnimatedNumber
                      value={rawValue}
                      onAnimating={(a) => setAnimating(key, a)}
                    />
                  ) : (
                    formatNumber(rawValue)
                  )}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Dashboard() {
  const [unifiMetrics, setUnifiMetrics] = useState<DashboardMetrics | null>(null)
  const [unifiLoading, setUnifiLoading] = useState(true)
  const [unifiError, setUnifiError] = useState<string | null>(null)

  const loadUnifi = useCallback(async () => {
    setUnifiLoading(true)
    setUnifiError(null)
    try {
      const data = await api.getUnifiDashboardMetrics()
      setUnifiMetrics(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load metrics'
      setUnifiError(message)
    } finally {
      setUnifiLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUnifi()
  }, [loadUnifi])

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="dashboard-subtitle">Overview of your back office operations</p>
      </div>

      <SystemPanel
        title="Unifi"
        subtitle="Live data from the Unifi back office"
        metrics={unifiMetrics}
        loading={unifiLoading}
        error={unifiError}
        onRefresh={() => void loadUnifi()}
        refreshing={unifiLoading}
      />

      <SystemPanel
        title="Unification"
        subtitle="Preview data — Unification API not yet wired"
        metrics={UNIFICATION_METRICS}
        loading={false}
        error={null}
        hiddenMetrics={['products']}
      />

      <div className="dashboard-section">
        <h2>Recent Activity</h2>
        <RecentActivity
          onContractCreated={() =>
            setUnifiMetrics((prev) =>
              prev ? { ...prev, contracts: prev.contracts + 1 } : prev,
            )
          }
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Recent Activity (live fake feed)
// ---------------------------------------------------------------------------

type ActivityType =
  | 'batch-completed'
  | 'statement-generated'
  | 'user-added'
  | 'user-login'
  | 'contract-created'
  | 'contract-finalized'
  | 'contract-cancelled'

interface ActivityItem {
  id: string
  type: ActivityType
  timestamp: number
  batchJobCode?: string
  contractNum?: string
  userEmail?: string
  // Contract metadata (populated for contract-* and statement-generated events).
  productCode?: string
  programCode?: string
  dealerName?: string
  actorEmail?: string
}

const BATCH_PREFIXES = ['NDPY', 'NDPX', 'NDPZ', 'NDPA']
const BATCH_SUFFIXES = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const USER_FIRSTS = ['john', 'mary', 'alex', 'sophie', 'liam', 'olivia', 'ethan', 'chloe', 'noah', 'emma']
const USER_LASTS = ['doe', 'tremblay', 'martin', 'roy', 'gagnon', 'smith', 'lee', 'patel', 'nguyen', 'brown']

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomBatchCode(): string {
  const prefix = pick(BATCH_PREFIXES)
  const digits = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
  const suffix = BATCH_SUFFIXES[Math.floor(Math.random() * BATCH_SUFFIXES.length)]
  return `${prefix}${digits}${suffix}`
}

const CONTRACT_TEMPLATES: ReadonlyArray<{
  prefix: string
  productCode: string
  programCode: string
}> = [
  // 3-letter program prefixes
  { prefix: 'AQG', productCode: 'AQ', programCode: 'AQG' },
  { prefix: 'EWG', productCode: 'EW', programCode: 'EWG' },
  { prefix: 'DWG', productCode: 'DW', programCode: 'DWG' },
  { prefix: 'TPG', productCode: 'TP', programCode: 'TPG' },
  { prefix: 'GAP', productCode: 'GP', programCode: 'GAP' },
  // 4-letter program prefixes
  { prefix: 'DWAU', productCode: 'DW', programCode: 'DWAU' },
  { prefix: 'EWAU', productCode: 'EW', programCode: 'EWAU' },
  { prefix: 'AQAU', productCode: 'AQ', programCode: 'AQAU' },
  { prefix: 'TPAU', productCode: 'TP', programCode: 'TPAU' },
  { prefix: 'BWAU', productCode: 'BW', programCode: 'BWAU' },
  // 5-letter program prefixes
  { prefix: 'BWRCA', productCode: 'BW', programCode: 'BWRCA' },
  { prefix: 'EWRCA', productCode: 'EW', programCode: 'EWRCA' },
  { prefix: 'DWRCA', productCode: 'DW', programCode: 'DWRCA' },
  { prefix: 'AQRCA', productCode: 'AQ', programCode: 'AQRCA' },
  { prefix: 'TPRCA', productCode: 'TP', programCode: 'TPRCA' },
]

const DEALER_NAMES = [
  'Toronto Subaru',
  'Montréal Honda',
  'Calgary BMW',
  'Vancouver Ford',
  'Ottawa Toyota',
  'Edmonton Mazda',
  'Québec Hyundai',
  'Halifax Kia',
  'Winnipeg Nissan',
  'Saskatoon Chevrolet',
  'Mississauga Audi',
  'Laval Volkswagen',
  'Burnaby Lexus',
  'London Volvo',
  'Gatineau Acura',
]

interface ContractDetails {
  contractNum: string
  productCode: string
  programCode: string
  dealerName: string
  actorEmail: string
}

function randomContractDetails(): ContractDetails {
  // Contract numbers are 12 chars: prefix (3-5 letters) + zero-padded digits.
  const template = pick(CONTRACT_TEMPLATES)
  const digitCount = 12 - template.prefix.length
  const max = 10 ** digitCount
  const digits = String(Math.floor(Math.random() * max)).padStart(digitCount, '0')
  return {
    contractNum: `${template.prefix}${digits}`,
    productCode: template.productCode,
    programCode: template.programCode,
    dealerName: pick(DEALER_NAMES),
    actorEmail: randomUserEmail(),
  }
}

function randomUserEmail(): string {
  return `${pick(USER_FIRSTS)}.${pick(USER_LASTS)}@ia.ca`
}

function createId(): string {
  return `act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Weighted random activity factory. */
function generateActivity(timestamp: number = Date.now()): ActivityItem {
  const roll = Math.random()
  let type: ActivityType
  // Contract events dominate (created > finalized > cancelled), then statements,
  // then user activity and batch jobs.
  if (roll < 0.35) type = 'contract-created'
  else if (roll < 0.5) type = 'contract-finalized'
  else if (roll < 0.6) type = 'contract-cancelled'
  else if (roll < 0.78) type = 'statement-generated'
  else if (roll < 0.88) type = 'user-login'
  else if (roll < 0.94) type = 'user-added'
  else type = 'batch-completed'

  const base: ActivityItem = { id: createId(), type, timestamp }
  switch (type) {
    case 'batch-completed':
      return { ...base, batchJobCode: randomBatchCode() }
    case 'statement-generated':
    case 'contract-created':
    case 'contract-finalized':
    case 'contract-cancelled': {
      const details = randomContractDetails()
      return { ...base, ...details }
    }
    case 'user-added':
    case 'user-login':
      return { ...base, userEmail: randomUserEmail() }
  }
}

/** Build a seed list of past activities so the feed isn't empty on mount. */
function generateInitialActivities(now: number, count: number): ActivityItem[] {
  const items: ActivityItem[] = []
  // Spread the seed items across the last few hours.
  let offset = 30_000 // 30s ago
  for (let i = 0; i < count; i++) {
    items.push(generateActivity(now - offset))
    offset += 60_000 + Math.floor(Math.random() * 30 * 60_000) // +1-31 min
  }
  return items
}

function formatRelativeTime(ts: number, now: number): string {
  const diffSec = Math.max(0, Math.floor((now - ts) / 1000))
  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec} sec ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`
}

interface ActivityRenderInfo {
  icon: typeof Users
  iconClass: string
  content: ReactNode
  meta?: ReactNode
}

function renderContractMeta(item: ActivityItem): ReactNode {
  if (!item.productCode && !item.programCode && !item.dealerName) return undefined
  return (
    <>
      {item.productCode && <span className="activity-chip activity-chip-product">{item.productCode}</span>}
      {item.programCode && <span className="activity-chip activity-chip-program">{item.programCode}</span>}
      {item.dealerName && <span className="activity-dealer">{item.dealerName}</span>}
    </>
  )
}

function renderActivity(item: ActivityItem): ActivityRenderInfo {
  switch (item.type) {
    case 'contract-created':
      return {
        icon: FilePlus2,
        iconClass: 'activity-icon-teal',
        content: (
          <>
            Contract <strong>{item.contractNum}</strong> was created
            {item.actorEmail && <> by <strong>{item.actorEmail}</strong></>}
          </>
        ),
        meta: renderContractMeta(item),
      }
    case 'contract-finalized':
      return {
        icon: FileCheck2,
        iconClass: 'activity-icon-green',
        content: (
          <>
            Contract <strong>{item.contractNum}</strong> finalized
            {item.actorEmail && <> by <strong>{item.actorEmail}</strong></>}
          </>
        ),
        meta: renderContractMeta(item),
      }
    case 'contract-cancelled':
      return {
        icon: FileX2,
        iconClass: 'activity-icon-orange',
        content: (
          <>
            Contract <strong>{item.contractNum}</strong> cancelled
            {item.actorEmail && <> by <strong>{item.actorEmail}</strong></>}
          </>
        ),
        meta: renderContractMeta(item),
      }
    case 'statement-generated':
      return {
        icon: FileText,
        iconClass: 'activity-icon-blue',
        content: (
          <>
            One Statement generated for <strong>{item.contractNum}</strong>
          </>
        ),
        meta: renderContractMeta(item),
      }
    case 'batch-completed':
      return {
        icon: CheckCircle2,
        iconClass: 'activity-icon-green',
        content: (
          <>
            Batch job <strong>{item.batchJobCode}</strong> completed successfully
          </>
        ),
      }
    case 'user-added':
      return {
        icon: UserPlus,
        iconClass: 'activity-icon-purple',
        content: (
          <>
            New user <strong>{item.userEmail}</strong> added
          </>
        ),
      }
    case 'user-login':
      return {
        icon: LogIn,
        iconClass: 'activity-icon-purple',
        content: (
          <>
            <strong>{item.userEmail}</strong> signed in
          </>
        ),
      }
  }
}

const MAX_ACTIVITY_ITEMS = 8
const MIN_INTERVAL_MS = 6_000
const MAX_INTERVAL_MS = 14_000

interface RecentActivityProps {
  /** Called whenever a fake "contract-created" event is appended to the feed. */
  onContractCreated?: () => void
}

function RecentActivity({ onContractCreated }: RecentActivityProps) {
  const [items, setItems] = useState<ActivityItem[]>(() =>
    generateInitialActivities(Date.now(), 4),
  )
  const [now, setNow] = useState<number>(() => Date.now())
  const newItemIdsRef = useRef<Set<string>>(new Set())
  const onContractCreatedRef = useRef(onContractCreated)
  useEffect(() => {
    onContractCreatedRef.current = onContractCreated
  }, [onContractCreated])

  // Tick "now" every 10s so relative timestamps refresh.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 10_000)
    return () => window.clearInterval(id)
  }, [])

  // Periodically prepend a new fake activity with jittered timing.
  useEffect(() => {
    let timeoutId: number
    const schedule = () => {
      const delay =
        MIN_INTERVAL_MS + Math.floor(Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS))
      timeoutId = window.setTimeout(() => {
        const item = generateActivity(Date.now())
        newItemIdsRef.current.add(item.id)
        setItems((prev) => [item, ...prev].slice(0, MAX_ACTIVITY_ITEMS))
        setNow(Date.now())
        if (item.type === 'contract-created') {
          onContractCreatedRef.current?.()
        }
        schedule()
      }, delay)
    }
    schedule()
    return () => window.clearTimeout(timeoutId)
  }, [])

  return (
    <div className="activity-list">
      {items.map((item) => {
        const info = renderActivity(item)
        const Icon = info.icon
        const isNew = newItemIdsRef.current.has(item.id)
        // Consume the "new" flag after first render so re-renders don't re-animate.
        if (isNew) {
          // Defer the delete to after this render commits.
          queueMicrotask(() => newItemIdsRef.current.delete(item.id))
        }
        return (
          <div
            key={item.id}
            className={`activity-item${isNew ? ' is-new' : ''}`}
          >
            <span className={`activity-icon ${info.iconClass}`}>
              <Icon size={14} />
            </span>
            <div className="activity-body">
              <div className="activity-main">
                <span className="activity-text">{info.content}</span>
                <span className="activity-time">{formatRelativeTime(item.timestamp, now)}</span>
              </div>
              {info.meta && <div className="activity-meta">{info.meta}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default Dashboard

