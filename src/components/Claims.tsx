import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ClipboardCheck, ArrowLeft, MessageSquare, Search,
  List, LayoutGrid, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown,
  X, Loader2, Calendar, Building2, Phone, Mail,
} from 'lucide-react'
import { api } from '../services/api'
import type { ClaimSearchResult, ClaimDetailsDto } from '../services/api'
import './Claims.css'

type ViewMode = 'list' | 'card'
type SortField = 'claimNum' | 'dealerId' | 'claimType' | 'status' | 'claimDt' | 'lossDt'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 50

interface ClaimsProps {
  onSendMessage: (content: string) => void
}

function Claims({ onSendMessage }: ClaimsProps) {
  const [claims, setClaims] = useState<ClaimSearchResult[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [selectedClaim, setSelectedClaim] = useState<ClaimDetailsDto | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')

  // Sort
  const [sortField, setSortField] = useState<SortField>('claimDt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null)

  const fetchClaims = useCallback(async (pageNum: number, append: boolean) => {
    if (pageNum === 1) setIsLoading(true)
    else setIsLoadingMore(true)

    try {
      const result = await api.getClaimsPaged({
        page: pageNum,
        pageSize: PAGE_SIZE,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        claimType: typeFilter || undefined,
        sortBy: sortField,
        sortDir: sortDir,
      })

      if (append) {
        setClaims(prev => [...prev, ...result.items])
      } else {
        setClaims(result.items)
      }
      setTotalCount(result.totalCount)
      setHasMore(result.hasMore)
      setPage(pageNum)
    } catch (err) {
      console.error('Failed to load claims:', err)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [searchQuery, statusFilter, typeFilter, sortField, sortDir])

  useEffect(() => {
    fetchClaims(1, false)
  }, [fetchClaims])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
        fetchClaims(page + 1, true)
      }
    }, { rootMargin: '200px' })

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, page, fetchClaims])

  const handleSelectClaim = useCallback(async (claimNum: string) => {
    setIsLoadingDetails(true)
    try {
      const details = await api.getClaimDetails(claimNum)
      setSelectedClaim(details)
    } catch (err) {
      console.error('Failed to load claim details:', err)
    } finally {
      setIsLoadingDetails(false)
    }
  }, [])

  const handleAskAboutClaim = (claim: ClaimDetailsDto) => {
    onSendMessage(`what is the status of claim ${claim.claimNum}`)
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('')
    setTypeFilter('')
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchClaims(1, false)
  }

  const formatStatus = (stat: string) => {
    switch (stat) {
      case 'O': return 'Open'
      case 'C': return 'Closed'
      case 'P': return 'Pending'
      case 'A': return 'Approved'
      case 'D': return 'Denied'
      default: return stat
    }
  }

  const statusClass = (stat: string) => {
    switch (stat) {
      case 'O': return 'status-open'
      case 'C': return 'status-closed'
      case 'P': return 'status-pending'
      case 'A': return 'status-approved'
      case 'D': return 'status-denied'
      default: return ''
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-CA')
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="sort-icon inactive" />
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="sort-icon active" />
      : <ArrowDown size={12} className="sort-icon active" />
  }

  // Detail view
  if (selectedClaim) {
    return (
      <div className="claims-page">
        <div className="claims-header">
          <button className="back-btn" onClick={() => setSelectedClaim(null)}>
            <ArrowLeft size={18} />
            Back to Results
          </button>
        </div>

        <div className="claim-detail-view">
          <div className="claim-detail-title">
            <ClipboardCheck size={24} />
            <div>
              <h2>{selectedClaim.claimNum}</h2>
              <span className="claim-code-subtitle">
                {selectedClaim.claimType || 'Claim'} • Contract {selectedClaim.contractNum || selectedClaim.contractKey}
              </span>
            </div>
            <span className={`status-badge ${statusClass(selectedClaim.claimStatPri)}`}>
              {formatStatus(selectedClaim.claimStatPri)}
            </span>
          </div>

          <div className="claim-detail-actions">
            <button className="action-btn chat-action" onClick={() => handleAskAboutClaim(selectedClaim)}>
              <MessageSquare size={14} />
              Ask AI about this claim
            </button>
          </div>

          <div className="details-grid">
            <div className="details-section">
              <h3>Claim Information</h3>
              <div className="details-rows">
                <div className="detail-row">
                  <span className="detail-label">Claim Number</span>
                  <span className="detail-value">{selectedClaim.claimNum}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Claim Type</span>
                  <span className="detail-value">{selectedClaim.claimType || '—'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Loss Type</span>
                  <span className="detail-value">{selectedClaim.lossType || '—'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status (Primary)</span>
                  <span className="detail-value">{formatStatus(selectedClaim.claimStatPri)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status (Secondary)</span>
                  <span className="detail-value">{selectedClaim.claimStatSec || '—'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Adjuster</span>
                  <span className="detail-value">{selectedClaim.adjusterId || '—'}</span>
                </div>
                {selectedClaim.adjudPriority && (
                  <div className="detail-row">
                    <span className="detail-label">Priority</span>
                    <span className="detail-value">{selectedClaim.adjudPriority}</span>
                  </div>
                )}
                {selectedClaim.adjudStat && (
                  <div className="detail-row">
                    <span className="detail-label">Adjud Status</span>
                    <span className="detail-value">{selectedClaim.adjudStat}</span>
                  </div>
                )}
                {selectedClaim.liabilityLimit != null && (
                  <div className="detail-row">
                    <span className="detail-label">Liability Limit</span>
                    <span className="detail-value">${selectedClaim.liabilityLimit.toLocaleString()}</span>
                  </div>
                )}
                {selectedClaim.roNum && (
                  <div className="detail-row">
                    <span className="detail-label">RO Number</span>
                    <span className="detail-value">{selectedClaim.roNum}</span>
                  </div>
                )}
                {selectedClaim.extClaimNum && (
                  <div className="detail-row">
                    <span className="detail-label">External Claim #</span>
                    <span className="detail-value">{selectedClaim.extClaimNum}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="details-section">
              <h3><Calendar size={16} /> Dates</h3>
              <div className="details-rows">
                <div className="detail-row">
                  <span className="detail-label">Loss Date</span>
                  <span className="detail-value">{formatDate(selectedClaim.lossDt)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Claim Date</span>
                  <span className="detail-value">{formatDate(selectedClaim.claimDt)}</span>
                </div>
                {selectedClaim.submitDt && (
                  <div className="detail-row">
                    <span className="detail-label">Submit Date</span>
                    <span className="detail-value">{formatDate(selectedClaim.submitDt)}</span>
                  </div>
                )}
                {selectedClaim.openDt && (
                  <div className="detail-row">
                    <span className="detail-label">Open Date</span>
                    <span className="detail-value">{formatDate(selectedClaim.openDt)}</span>
                  </div>
                )}
                {selectedClaim.closedDt && (
                  <div className="detail-row">
                    <span className="detail-label">Closed Date</span>
                    <span className="detail-value">{formatDate(selectedClaim.closedDt)}</span>
                  </div>
                )}
                {selectedClaim.createdDt && (
                  <div className="detail-row">
                    <span className="detail-label">Created</span>
                    <span className="detail-value">{formatDate(selectedClaim.createdDt)} by {selectedClaim.createdBy || '—'}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="details-section">
              <h3><Building2 size={16} /> Dealer & Contact</h3>
              <div className="details-rows">
                <div className="detail-row">
                  <span className="detail-label">Dealer ID</span>
                  <span className="detail-value">{selectedClaim.claimDealerId || '—'}</span>
                </div>
                {selectedClaim.dealerName && (
                  <div className="detail-row">
                    <span className="detail-label">Dealer Name</span>
                    <span className="detail-value">{selectedClaim.dealerName}</span>
                  </div>
                )}
                {selectedClaim.contactName && (
                  <div className="detail-row">
                    <span className="detail-label">Contact</span>
                    <span className="detail-value">{selectedClaim.contactName}</span>
                  </div>
                )}
                {selectedClaim.contactPhoneNum && (
                  <div className="detail-row">
                    <span className="detail-label"><Phone size={12} /> Phone</span>
                    <span className="detail-value">{selectedClaim.contactPhoneNum}</span>
                  </div>
                )}
                {selectedClaim.contactEmail && (
                  <div className="detail-row">
                    <span className="detail-label"><Mail size={12} /> Email</span>
                    <span className="detail-value">{selectedClaim.contactEmail}</span>
                  </div>
                )}
                {selectedClaim.repairCenter && (
                  <div className="detail-row">
                    <span className="detail-label">Repair Center</span>
                    <span className="detail-value">{selectedClaim.repairCenter}</span>
                  </div>
                )}
              </div>
            </div>

            {selectedClaim.comments && (
              <div className="details-section">
                <h3>Comments</h3>
                <p className="claim-comments">{selectedClaim.comments}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Main list view
  return (
    <div className="claims-page">
      <div className="claims-header">
        <div className="claims-title-row">
          <div>
            <h1>Claims</h1>
            <p className="claims-subtitle">
              {totalCount} claim{totalCount !== 1 ? 's' : ''}
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
          </div>
        </div>
      </div>

      <div className="claims-toolbar">
        <form className="search-form" onSubmit={handleSearchSubmit}>
          <div className="search-input-group">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search by claim #, contract #, RO #, dealer..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </form>
        <div className="filters">
          <div className="filter-group">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="O">Open</option>
              <option value="C">Closed</option>
              <option value="P">Pending</option>
              <option value="A">Approved</option>
              <option value="D">Denied</option>
            </select>
            <ChevronDown size={14} className="select-chevron" />
          </div>
          <div className="filter-group">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="M">Mechanical</option>
              <option value="B">Body</option>
              <option value="T">Theft</option>
              <option value="W">Warranty</option>
            </select>
            <ChevronDown size={14} className="select-chevron" />
          </div>
          {(searchQuery || statusFilter || typeFilter) && (
            <button className="clear-filters-btn" onClick={clearFilters}>
              <X size={14} />
              Clear
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="claims-loading">
          <div className="spinner" />
          <span>Loading claims...</span>
        </div>
      )}

      {!isLoading && claims.length === 0 && (
        <div className="claims-empty">
          <p>No claims match your filters.</p>
        </div>
      )}

      {/* List View */}
      {!isLoading && viewMode === 'list' && claims.length > 0 && (
        <div className="claims-results">
          <div className="claim-table-container">
            <table className="claim-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort('claimNum')} className="sortable-th">
                    Claim # <SortIcon field="claimNum" />
                  </th>
                  <th onClick={() => toggleSort('dealerId')} className="sortable-th">
                    Dealer <SortIcon field="dealerId" />
                  </th>
                  <th onClick={() => toggleSort('claimType')} className="sortable-th">
                    Type <SortIcon field="claimType" />
                  </th>
                  <th onClick={() => toggleSort('status')} className="sortable-th">
                    Status <SortIcon field="status" />
                  </th>
                  <th onClick={() => toggleSort('claimDt')} className="sortable-th">
                    Claim Date <SortIcon field="claimDt" />
                  </th>
                  <th onClick={() => toggleSort('lossDt')} className="sortable-th">
                    Loss Date <SortIcon field="lossDt" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {claims.map(claim => (
                  <tr
                    key={claim.claimKey}
                    className="claim-row"
                    onClick={() => handleSelectClaim(claim.claimNum)}
                  >
                    <td className="claim-num">{claim.claimNum}</td>
                    <td className="claim-dealer">
                      <span className="dealer-id">{claim.claimDealerId || '—'}</span>
                      {claim.dealerName && <span className="dealer-name-sub">{claim.dealerName}</span>}
                    </td>
                    <td>{claim.claimType || '—'}</td>
                    <td>
                      <span className={`status-badge ${statusClass(claim.claimStatPri)}`}>
                        {formatStatus(claim.claimStatPri)}
                      </span>
                    </td>
                    <td>{formatDate(claim.claimDt)}</td>
                    <td>{formatDate(claim.lossDt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Card View */}
      {!isLoading && viewMode === 'card' && claims.length > 0 && (
        <div className="claims-card-grid">
          {claims.map(claim => (
            <div
              key={claim.claimKey}
              className="claim-card"
              onClick={() => handleSelectClaim(claim.claimNum)}
            >
              <div className="card-header">
                <ClipboardCheck size={18} className="card-icon" />
                <span className={`status-badge ${statusClass(claim.claimStatPri)}`}>
                  {formatStatus(claim.claimStatPri)}
                </span>
              </div>
              <h4 className="card-claim-num">{claim.claimNum}</h4>
              <span className="card-type">{claim.claimType || 'Claim'}</span>
              <div className="card-dealer">
                <Building2 size={12} />
                <span>{claim.dealerName || claim.claimDealerId || '—'}</span>
              </div>
              <div className="card-dates">
                <Calendar size={12} />
                <span>Loss: {formatDate(claim.lossDt)} • Claim: {formatDate(claim.claimDt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className="load-more-sentinel">
          <Loader2 size={16} className="spinning" />
          <span>Loading more...</span>
        </div>
      )}

      {!hasMore && claims.length > PAGE_SIZE && (
        <div className="end-of-list">All {totalCount} claims shown</div>
      )}

      {isLoadingMore && (
        <div className="load-more-sentinel">
          <Loader2 size={16} className="spinning" />
          <span>Loading more...</span>
        </div>
      )}

      {isLoadingDetails && (
        <div className="claims-loading overlay">
          <div className="spinner" />
          <span>Loading claim details...</span>
        </div>
      )}
    </div>
  )
}

export default Claims
