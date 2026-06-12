import { Search, ArrowLeft } from 'lucide-react'
import type { DealerSearchResult } from '../services/api'
import './DealerSearch.css'

interface DealerSearchProps {
  results: DealerSearchResult[]
  searchQuery: string
  onSelectDealer: (dealerCode: string) => void
  onBack: () => void
}

function DealerSearch({ results, searchQuery, onSelectDealer, onBack }: DealerSearchProps) {
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

  return (
    <div className="dealer-search">
      <div className="dealer-search-header">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>
        <div className="search-info">
          <Search size={20} />
          <h2>Dealer Search Results</h2>
          <span className="result-count">{results.length} result{results.length !== 1 ? 's' : ''} for "{searchQuery}"</span>
        </div>
      </div>

      <div className="dealer-table-container">
        <table className="dealer-table">
          <thead>
            <tr>
              <th>Dealer Code</th>
              <th>Name</th>
              <th>Status</th>
              <th>City</th>
              <th>Province</th>
            </tr>
          </thead>
          <tbody>
            {results.map(dealer => (
              <tr
                key={dealer.dealerId}
                className="dealer-row"
                onClick={() => onSelectDealer(dealer.dealerId)}
              >
                <td className="dealer-code">{dealer.dealerId}</td>
                <td className="dealer-name">{dealer.dbaName}</td>
                <td>
                  <span className={`status-badge ${statusClass(dealer.dealerStat)}`}>
                    {formatStatus(dealer.dealerStat)}
                  </span>
                </td>
                <td>{dealer.city || '—'}</td>
                <td>{dealer.provState || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DealerSearch
