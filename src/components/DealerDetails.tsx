import { ArrowLeft, Building2, Phone, Globe, MapPin } from 'lucide-react'
import type { DealerDetailsDto } from '../services/api'
import './DealerDetails.css'

interface DealerDetailsProps {
  dealer: DealerDetailsDto
  onBack: () => void
}

function DealerDetails({ dealer, onBack }: DealerDetailsProps) {
  const formatStatus = (stat: string) => {
    switch (stat) {
      case 'A': return 'Active'
      case 'I': return 'Inactive'
      case 'S': return 'Suspended'
      default: return stat
    }
  }

  const statusClass = (stat: string) => {
    switch (stat) {
      case 'A': return 'status-active'
      case 'I': return 'status-inactive'
      case 'S': return 'status-suspended'
      default: return ''
    }
  }

  const formatYN = (val: string) => val === 'Y' ? 'Yes' : 'No'

  const formatLanguage = (val: string | null) => {
    if (!val) return '—'
    return val === 'E' ? 'English' : val === 'F' ? 'French' : val
  }

  return (
    <div className="dealer-details">
      <div className="dealer-details-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={18} />
          Back
        </button>
        <div className="dealer-title">
          <Building2 size={24} />
          <div>
            <h2>{dealer.dbaName}</h2>
            <span className="dealer-code-subtitle">{dealer.dealerId}</span>
          </div>
          <span className={`status-badge ${statusClass(dealer.dealerStat)}`}>
            {formatStatus(dealer.dealerStat)}
          </span>
        </div>
      </div>

      <div className="details-grid">
        <div className="details-section">
          <h3>General Information</h3>
          <div className="details-rows">
            <div className="detail-row">
              <span className="detail-label">DBA Name</span>
              <span className="detail-value">{dealer.dbaName}</span>
            </div>
            {dealer.legalName && (
              <div className="detail-row">
                <span className="detail-label">Legal Name</span>
                <span className="detail-value">{dealer.legalName}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">Dealer Group</span>
              <span className="detail-value">{dealer.dealerGroup || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Category</span>
              <span className="detail-value">{dealer.dealerCatg || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Territory</span>
              <span className="detail-value">{dealer.territoryId}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Language</span>
              <span className="detail-value">{formatLanguage(dealer.language)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">OEM</span>
              <span className="detail-value">{dealer.oem || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Is Dealership</span>
              <span className="detail-value">{formatYN(dealer.isDealershipYN)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Is Broker</span>
              <span className="detail-value">{formatYN(dealer.isBrokerYN)}</span>
            </div>
            {dealer.producerMake && (
              <div className="detail-row">
                <span className="detail-label">Producer Make</span>
                <span className="detail-value">{dealer.producerMake}</span>
              </div>
            )}
            {dealer.producerClass && (
              <div className="detail-row">
                <span className="detail-label">Producer Class</span>
                <span className="detail-value">{dealer.producerClass}</span>
              </div>
            )}
          </div>
        </div>

        <div className="details-section">
          <h3><MapPin size={16} /> Location & Contact</h3>
          <div className="details-rows">
            <div className="detail-row">
              <span className="detail-label">City</span>
              <span className="detail-value">{dealer.city || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Province/State</span>
              <span className="detail-value">{dealer.provState || '—'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Postal/Zip</span>
              <span className="detail-value">{dealer.postalZip || '—'}</span>
            </div>
            {dealer.phoneNum && (
              <div className="detail-row">
                <span className="detail-label"><Phone size={14} /> Phone</span>
                <span className="detail-value">{dealer.phoneNum}</span>
              </div>
            )}
            {dealer.faxNum && (
              <div className="detail-row">
                <span className="detail-label">Fax</span>
                <span className="detail-value">{dealer.faxNum}</span>
              </div>
            )}
            {dealer.webPageUrl && (
              <div className="detail-row">
                <span className="detail-label"><Globe size={14} /> Website</span>
                <span className="detail-value">
                  <a href={dealer.webPageUrl} target="_blank" rel="noopener noreferrer">{dealer.webPageUrl}</a>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DealerDetails
