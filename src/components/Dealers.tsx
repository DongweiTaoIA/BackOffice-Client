import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Building2, Phone, Globe, MapPin, ArrowLeft, MessageSquare, Search,
  List, LayoutGrid, Map, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown,
  X, Loader2,
} from 'lucide-react'
import DealersMap from './DealersMap'
import { api } from '../services/api'
import type { DealerSearchResult, DealerDetailsDto } from '../services/api'
import './Dealers.css'

type ViewMode = 'list' | 'card' | 'map'
type SortField = 'dealerId' | 'dbaName' | 'dealerStat' | 'city' | 'provState'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 50

interface DealersProps {
  onSendMessage: (content: string) => void
  externalResults?: DealerSearchResult[]
  externalQuery?: string
  externalDealer?: DealerDetailsDto | null
}

function Dealers({ onSendMessage, externalResults, externalQuery, externalDealer }: DealersProps) {
  const [dealers, setDealers] = useState<DealerSearchResult[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [selectedDealer, setSelectedDealer] = useState<DealerDetailsDto | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // Filters
  const [activeOnly, setActiveOnly] = useState(true)
  const [includeDemo, setIncludeDemo] = useState(false)
  const [provinceFilter, setProvinceFilter] = useState<string>('')

  // Sort
  const [sortField, setSortField] = useState<SortField>('dealerId')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // External override mode (from chat)
  const [externalMode, setExternalMode] = useState(false)
  const [filterLabel, setFilterLabel] = useState('')

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Fetch dealers from paginated API
  const fetchDealers = useCallback(async (pageNum: number, append: boolean) => {
    if (pageNum === 1) setIsLoading(true)
    else setIsLoadingMore(true)

    try {
      const result = await api.getDealersPaged({
        page: pageNum,
        pageSize: PAGE_SIZE,
        status: activeOnly ? 'A' : undefined,
        province: provinceFilter || undefined,
        sortBy: sortField,
        sortDir: sortDir,
        excludeDemo: !includeDemo,
      })

      if (append) {
        setDealers(prev => [...prev, ...result.items])
      } else {
        setDealers(result.items)
      }
      setTotalCount(result.totalCount)
      setHasMore(result.hasMore)
      setPage(pageNum)
    } catch (err) {
      console.error('Failed to load dealers:', err)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [activeOnly, includeDemo, provinceFilter, sortField, sortDir])

  // Initial load and reload on filter/sort changes
  useEffect(() => {
    if (!externalMode) {
      fetchDealers(1, false)
    }
  }, [fetchDealers, externalMode])

  // Sync external results from chat
  useEffect(() => {
    if (externalResults && externalResults.length > 0) {
      setDealers(externalResults)
      setTotalCount(externalResults.length)
      setHasMore(false)
      setIsLoading(false)
      setSelectedDealer(null)
      setExternalMode(true)
      setFilterLabel(externalQuery || '')
      setActiveOnly(true)
      setIncludeDemo(false)
      setProvinceFilter('')
    }
  }, [externalResults, externalQuery])

  // Sync external dealer details from chat (also clears when nav resets it)
  useEffect(() => {
    setSelectedDealer(externalDealer || null)
  }, [externalDealer])

  // When filters/sort change, exit external mode
  const handleFilterChange = (setter: (v: string) => void, value: string) => {
    setter(value)
    setExternalMode(false)
    setFilterLabel('')
  }

  const handleCheckboxChange = (setter: (v: boolean) => void, value: boolean) => {
    setter(value)
    setExternalMode(false)
    setFilterLabel('')
  }

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !isLoadingMore && !externalMode) {
        fetchDealers(page + 1, true)
      }
    }, { rootMargin: '200px' })

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, page, fetchDealers, externalMode])

  const handleSelectDealer = useCallback(async (dealerCode: string) => {
    setIsLoadingDetails(true)
    try {
      const details = await api.getDealerDetails(dealerCode)
      setSelectedDealer(details)
    } catch (err) {
      console.error('Failed to load dealer details:', err)
    } finally {
      setIsLoadingDetails(false)
    }
  }, [])

  const handleAskAboutDealer = (dealer: DealerDetailsDto) => {
    onSendMessage(`show dealer ${dealer.dealerId}`)
  }

  const handleCheckEligibility = (dealer: DealerDetailsDto) => {
    onSendMessage(`can ${dealer.dealerId} sell EW`)
  }

  const toggleSort = (field: SortField) => {
    setExternalMode(false)
    setFilterLabel('')
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const clearFilters = () => {
    setActiveOnly(true)
    setIncludeDemo(false)
    setProvinceFilter('')
    setExternalMode(false)
    setFilterLabel('')
  }

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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="sort-icon inactive" />
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="sort-icon active" />
      : <ArrowDown size={12} className="sort-icon active" />
  }

  // Detail view
  if (selectedDealer) {
    return (
      <div className="dealers-page">
        <div className="dealers-header">
          <button className="back-btn" onClick={() => setSelectedDealer(null)}>
            <ArrowLeft size={18} />
            Back to Results
          </button>
        </div>

        <div className="dealer-detail-view">
          <div className="dealer-detail-title">
            <Building2 size={24} />
            <div>
              <h2>{selectedDealer.dbaName}</h2>
              <span className="dealer-code-subtitle">{selectedDealer.dealerId}</span>
            </div>
            <span className={`status-badge ${statusClass(selectedDealer.dealerStat)}`}>
              {formatStatus(selectedDealer.dealerStat)}
            </span>
          </div>

          <div className="dealer-detail-actions">
            <button className="action-btn chat-action" onClick={() => handleAskAboutDealer(selectedDealer)}>
              <MessageSquare size={14} />
              Ask AI about this dealer
            </button>
            <button className="action-btn eligibility-action" onClick={() => handleCheckEligibility(selectedDealer)}>
              <Search size={14} />
              Check Eligibility
            </button>
          </div>

          <div className="details-grid">
            <div className="details-section">
              <h3>General Information</h3>
              <div className="details-rows">
                <div className="detail-row">
                  <span className="detail-label">DBA Name</span>
                  <span className="detail-value">{selectedDealer.dbaName}</span>
                </div>
                {selectedDealer.legalName && (
                  <div className="detail-row">
                    <span className="detail-label">Legal Name</span>
                    <span className="detail-value">{selectedDealer.legalName}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Dealer Group</span>
                  <span className="detail-value">{selectedDealer.dealerGroup || '—'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Category</span>
                  <span className="detail-value">{selectedDealer.dealerCatg || '—'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Territory</span>
                  <span className="detail-value">{selectedDealer.territoryId}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Language</span>
                  <span className="detail-value">{formatLanguage(selectedDealer.language)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">OEM</span>
                  <span className="detail-value">{selectedDealer.oem || '—'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Is Dealership</span>
                  <span className="detail-value">{formatYN(selectedDealer.isDealershipYN)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Is Broker</span>
                  <span className="detail-value">{formatYN(selectedDealer.isBrokerYN)}</span>
                </div>
                {selectedDealer.producerMake && (
                  <div className="detail-row">
                    <span className="detail-label">Producer Make</span>
                    <span className="detail-value">{selectedDealer.producerMake}</span>
                  </div>
                )}
                {selectedDealer.producerClass && (
                  <div className="detail-row">
                    <span className="detail-label">Producer Class</span>
                    <span className="detail-value">{selectedDealer.producerClass}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="details-section">
              <h3><MapPin size={16} /> Location & Contact</h3>
              <div className="details-rows">
                <div className="detail-row">
                  <span className="detail-label">City</span>
                  <span className="detail-value">{selectedDealer.city || '—'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Province/State</span>
                  <span className="detail-value">{selectedDealer.provState || '—'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Postal/Zip</span>
                  <span className="detail-value">{selectedDealer.postalZip || '—'}</span>
                </div>
                {selectedDealer.phoneNum && (
                  <div className="detail-row">
                    <span className="detail-label"><Phone size={14} /> Phone</span>
                    <span className="detail-value">{selectedDealer.phoneNum}</span>
                  </div>
                )}
                {selectedDealer.faxNum && (
                  <div className="detail-row">
                    <span className="detail-label">Fax</span>
                    <span className="detail-value">{selectedDealer.faxNum}</span>
                  </div>
                )}
                {selectedDealer.webPageUrl && (
                  <div className="detail-row">
                    <span className="detail-label"><Globe size={14} /> Website</span>
                    <span className="detail-value">
                      <a href={selectedDealer.webPageUrl} target="_blank" rel="noopener noreferrer">{selectedDealer.webPageUrl}</a>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Main list view
  return (
    <div className="dealers-page">
      <div className="dealers-header">
        <div className="dealers-title-row">
          <div>
            <h1>Dealers</h1>
            <p className="dealers-subtitle">
              {filterLabel
                ? `${totalCount} dealer${totalCount !== 1 ? 's' : ''} matching "${filterLabel}"`
                : `${totalCount} dealer${totalCount !== 1 ? 's' : ''}`}
            </p>
          </div>
          <div className="view-mode-toggle">
            <button
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <List size={16} />
            </button>
            <button
              className={`view-btn ${viewMode === 'card' ? 'active' : ''}`}
              onClick={() => setViewMode('card')}
              title="Card view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`view-btn ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
              title="Map view"
            >
              <Map size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Filters (hidden in map view) */}
      {viewMode !== 'map' && (
        <div className="dealers-toolbar">
          <div className="filters">
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={e => handleCheckboxChange(setActiveOnly, e.target.checked)}
              />
              Active Only
            </label>
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={includeDemo}
                onChange={e => handleCheckboxChange(setIncludeDemo, e.target.checked)}
              />
              Include Demo Dealers
            </label>
            <div className="filter-group">
              <select
                value={provinceFilter}
                onChange={e => handleFilterChange(setProvinceFilter, e.target.value)}
              >
                <option value="">All Provinces</option>
                {['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <ChevronDown size={14} className="select-chevron" />
            </div>
            {(!activeOnly || includeDemo || provinceFilter || externalMode) && (
              <button className="clear-filters-btn" onClick={clearFilters}>
                <X size={14} />
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="dealers-loading">
          <div className="spinner" />
          <span>Loading dealers...</span>
        </div>
      )}

      {!isLoading && dealers.length === 0 && (
        <div className="dealers-empty">
          <p>No dealers match your filters.</p>
        </div>
      )}

      {/* List View */}
      {!isLoading && viewMode === 'list' && dealers.length > 0 && (
        <div className="dealers-results">
          <div className="dealer-table-container">
            <table className="dealer-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort('dealerId')} className="sortable-th">
                    Dealer Code <SortIcon field="dealerId" />
                  </th>
                  <th onClick={() => toggleSort('dbaName')} className="sortable-th">
                    Name <SortIcon field="dbaName" />
                  </th>
                  <th onClick={() => toggleSort('dealerStat')} className="sortable-th">
                    Status <SortIcon field="dealerStat" />
                  </th>
                  <th onClick={() => toggleSort('city')} className="sortable-th">
                    City <SortIcon field="city" />
                  </th>
                  <th onClick={() => toggleSort('provState')} className="sortable-th">
                    Province <SortIcon field="provState" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {dealers.map(dealer => (
                  <tr
                    key={dealer.dealerId}
                    className="dealer-row"
                    onClick={() => handleSelectDealer(dealer.dealerId)}
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
      )}

      {/* Card View */}
      {!isLoading && viewMode === 'card' && dealers.length > 0 && (
        <div className="dealers-card-grid">
          {dealers.map(dealer => (
            <div
              key={dealer.dealerId}
              className="dealer-card"
              onClick={() => handleSelectDealer(dealer.dealerId)}
            >
              <div className="card-header">
                <Building2 size={18} className="card-icon" />
                <span className={`status-badge ${statusClass(dealer.dealerStat)}`}>
                  {formatStatus(dealer.dealerStat)}
                </span>
              </div>
              <h4 className="card-name">{dealer.dbaName}</h4>
              <span className="card-code">{dealer.dealerId}</span>
              <div className="card-location">
                <MapPin size={12} />
                <span>{[dealer.city, dealer.provState].filter(Boolean).join(', ') || '—'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Map View */}
      {!isLoading && viewMode === 'map' && (
        <div className="dealers-map-view">
          <DealersMap
            onSelectDealer={handleSelectDealer}
            externalDealers={externalMode ? dealers : undefined}
          />
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {hasMore && !externalMode && viewMode !== 'map' && (
        <div ref={sentinelRef} className="load-more-sentinel">
          <Loader2 size={16} className="spinning" />
          <span>Loading more...</span>
        </div>
      )}

      {!hasMore && dealers.length > PAGE_SIZE && viewMode !== 'map' && (
        <div className="end-of-list">All {totalCount} dealers shown</div>
      )}

      {isLoadingMore && (
        <div className="load-more-sentinel">
          <Loader2 size={16} className="spinning" />
          <span>Loading more...</span>
        </div>
      )}

      {isLoadingDetails && (
        <div className="dealers-loading overlay">
          <div className="spinner" />
          <span>Loading dealer details...</span>
        </div>
      )}
    </div>
  )
}

export default Dealers
