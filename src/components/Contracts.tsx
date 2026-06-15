import { useState, useEffect, useCallback, useRef } from 'react'
import {
  FileText, ArrowLeft, MessageSquare, Search,
  List, LayoutGrid, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown,
  X, Loader2, Calendar, Building2,
} from 'lucide-react'
import { api } from '../services/api'
import type { ContractSearchResult, ContractDetailsDto } from '../services/api'
import './Contracts.css'

type ViewMode = 'list' | 'card'
type SortField = 'contractNum' | 'dealerId' | 'productId' | 'status' | 'effectDt' | 'expiryDt'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 50

interface ContractsProps {
  onSendMessage: (content: string) => void
}

function Contracts({ onSendMessage }: ContractsProps) {
  const [contracts, setContracts] = useState<ContractSearchResult[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [selectedContract, setSelectedContract] = useState<ContractDetailsDto | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [productFilter, setProductFilter] = useState<string>('')

  // Sort
  const [sortField, setSortField] = useState<SortField>('effectDt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Fetch contracts from paginated API
  const fetchContracts = useCallback(async (pageNum: number, append: boolean) => {
    if (pageNum === 1) setIsLoading(true)
    else setIsLoadingMore(true)

    try {
      const result = await api.getContractsPaged({
        page: pageNum,
        pageSize: PAGE_SIZE,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
        product: productFilter || undefined,
        sortBy: sortField,
        sortDir: sortDir,
      })

      if (append) {
        setContracts(prev => [...prev, ...result.items])
      } else {
        setContracts(result.items)
      }
      setTotalCount(result.totalCount)
      setHasMore(result.hasMore)
      setPage(pageNum)
    } catch (err) {
      console.error('Failed to load contracts:', err)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }, [searchQuery, statusFilter, productFilter, sortField, sortDir])

  // Initial load and reload on filter/sort changes
  useEffect(() => {
    fetchContracts(1, false)
  }, [fetchContracts])

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
        fetchContracts(page + 1, true)
      }
    }, { rootMargin: '200px' })

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, page, fetchContracts])

  const handleSelectContract = useCallback(async (contractNum: string) => {
    setIsLoadingDetails(true)
    try {
      const details = await api.getContractDetails(contractNum)
      setSelectedContract(details)
    } catch (err) {
      console.error('Failed to load contract details:', err)
    } finally {
      setIsLoadingDetails(false)
    }
  }, [])

  const handleAskAboutContract = (contract: ContractDetailsDto) => {
    onSendMessage(`what is the status of contract ${contract.contractNum}`)
  }

  const handleCheckCancellation = (contract: ContractDetailsDto) => {
    onSendMessage(`is contract ${contract.contractNum} eligible for cancellation`)
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
    setProductFilter('')
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchContracts(1, false)
  }

  const formatStatus = (stat: string) => {
    switch (stat) {
      case 'A': return 'Active'
      case 'C': return 'Cancelled'
      case 'E': return 'Expired'
      case 'P': return 'Pending'
      case 'F': return 'Final'
      default: return stat
    }
  }

  const statusClass = (stat: string) => {
    switch (stat) {
      case 'A': return 'status-active'
      case 'C': return 'status-cancelled'
      case 'E': return 'status-expired'
      case 'P': return 'status-pending'
      case 'F': return 'status-final'
      default: return ''
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-CA')
  }

  const formatProduct = (productId: string) => {
    switch (productId) {
      case 'EW': return 'Extended Warranty'
      case 'DW': return 'Dealer Warranty'
      case 'GP': return 'GAP Premium'
      case 'RW': return 'Replacement Warranty'
      case 'PM': return 'Pre-Paid Maintenance'
      case 'TR': return 'Tire & Rim'
      default: return productId
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="sort-icon inactive" />
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="sort-icon active" />
      : <ArrowDown size={12} className="sort-icon active" />
  }

  // Detail view
  if (selectedContract) {
    return (
      <div className="contracts-page">
        <div className="contracts-header">
          <button className="back-btn" onClick={() => setSelectedContract(null)}>
            <ArrowLeft size={18} />
            Back to Results
          </button>
        </div>

        <div className="contract-detail-view">
          <div className="contract-detail-title">
            <FileText size={24} />
            <div>
              <h2>{selectedContract.contractNum}</h2>
              <span className="contract-code-subtitle">{formatProduct(selectedContract.productId)} • {selectedContract.dealerId}</span>
            </div>
            <span className={`status-badge ${statusClass(selectedContract.contractStatPri)}`}>
              {formatStatus(selectedContract.contractStatPri)}
            </span>
          </div>

          <div className="contract-detail-actions">
            <button className="action-btn chat-action" onClick={() => handleAskAboutContract(selectedContract)}>
              <MessageSquare size={14} />
              Ask AI about this contract
            </button>
            <button className="action-btn eligibility-action" onClick={() => handleCheckCancellation(selectedContract)}>
              <Search size={14} />
              Check Cancellation
            </button>
          </div>

          <div className="details-grid">
            <div className="details-section">
              <h3>Contract Information</h3>
              <div className="details-rows">
                <div className="detail-row">
                  <span className="detail-label">Contract Number</span>
                  <span className="detail-value">{selectedContract.contractNum}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Product</span>
                  <span className="detail-value">{formatProduct(selectedContract.productId)} ({selectedContract.productId})</span>
                </div>
                {selectedContract.programId && (
                  <div className="detail-row">
                    <span className="detail-label">Program</span>
                    <span className="detail-value">{selectedContract.programId}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Contract Type</span>
                  <span className="detail-value">{selectedContract.contractType || '—'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status (Primary)</span>
                  <span className="detail-value">{formatStatus(selectedContract.contractStatPri)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status (Secondary)</span>
                  <span className="detail-value">{selectedContract.contractStatSec || '—'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Created</span>
                  <span className="detail-value">{formatDate(selectedContract.createDt)} by {selectedContract.createdBy}</span>
                </div>
                {selectedContract.finalDt && (
                  <div className="detail-row">
                    <span className="detail-label">Finalized</span>
                    <span className="detail-value">{formatDate(selectedContract.finalDt)} by {selectedContract.finalBy || '—'}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="details-section">
              <h3><Calendar size={16} /> Dates & Coverage</h3>
              <div className="details-rows">
                <div className="detail-row">
                  <span className="detail-label">Effective Date</span>
                  <span className="detail-value">{formatDate(selectedContract.effectDt)}</span>
                </div>
                {selectedContract.effectKm && (
                  <div className="detail-row">
                    <span className="detail-label">Effective KM</span>
                    <span className="detail-value">{selectedContract.effectKm.toLocaleString()}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Expiry Date</span>
                  <span className="detail-value">{formatDate(selectedContract.expiryDt)}</span>
                </div>
                {selectedContract.expiryKm && (
                  <div className="detail-row">
                    <span className="detail-label">Expiry KM</span>
                    <span className="detail-value">{selectedContract.expiryKm.toLocaleString()}</span>
                  </div>
                )}
                {selectedContract.purchaseDt && (
                  <div className="detail-row">
                    <span className="detail-label">Purchase Date</span>
                    <span className="detail-value">{formatDate(selectedContract.purchaseDt)}</span>
                  </div>
                )}
                {selectedContract.deliveryDt && (
                  <div className="detail-row">
                    <span className="detail-label">Delivery Date</span>
                    <span className="detail-value">{formatDate(selectedContract.deliveryDt)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="details-section">
              <h3><Building2 size={16} /> Dealer</h3>
              <div className="details-rows">
                <div className="detail-row">
                  <span className="detail-label">Dealer ID</span>
                  <span className="detail-value">{selectedContract.dealerId}</span>
                </div>
                {selectedContract.dealerName && (
                  <div className="detail-row">
                    <span className="detail-label">Dealer Name</span>
                    <span className="detail-value">{selectedContract.dealerName}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="details-section">
              <h3>Vehicle</h3>
              <div className="details-rows">
                <div className="detail-row">
                  <span className="detail-label">Vehicle Price</span>
                  <span className="detail-value">${selectedContract.vehiclePrice.toLocaleString()}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Condition</span>
                  <span className="detail-value">{selectedContract.vehicleCondition || '—'}</span>
                </div>
                {selectedContract.licensePlate && (
                  <div className="detail-row">
                    <span className="detail-label">License Plate</span>
                    <span className="detail-value">{selectedContract.licensePlate}</span>
                  </div>
                )}
                {selectedContract.stockNum && (
                  <div className="detail-row">
                    <span className="detail-label">Stock Number</span>
                    <span className="detail-value">{selectedContract.stockNum}</span>
                  </div>
                )}
                {selectedContract.classCode && (
                  <div className="detail-row">
                    <span className="detail-label">Class Code</span>
                    <span className="detail-value">{selectedContract.classCode}</span>
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
    <div className="contracts-page">
      <div className="contracts-header">
        <div className="contracts-title-row">
          <div>
            <h1>Contracts</h1>
            <p className="contracts-subtitle">
              {totalCount} contract{totalCount !== 1 ? 's' : ''}
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

      <div className="contracts-toolbar">
        <form className="search-form" onSubmit={handleSearchSubmit}>
          <div className="search-input-group">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Search by contract #, dealer, or ext contract #..."
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
              <option value="A">Active</option>
              <option value="C">Cancelled</option>
              <option value="E">Expired</option>
              <option value="P">Pending</option>
              <option value="F">Final</option>
            </select>
            <ChevronDown size={14} className="select-chevron" />
          </div>
          <div className="filter-group">
            <select
              value={productFilter}
              onChange={e => setProductFilter(e.target.value)}
            >
              <option value="">All Products</option>
              <option value="EW">Extended Warranty</option>
              <option value="DW">Dealer Warranty</option>
              <option value="GP">GAP Premium</option>
              <option value="RW">Replacement Warranty</option>
              <option value="PM">Pre-Paid Maintenance</option>
              <option value="TR">Tire & Rim</option>
            </select>
            <ChevronDown size={14} className="select-chevron" />
          </div>
          {(searchQuery || statusFilter || productFilter) && (
            <button className="clear-filters-btn" onClick={clearFilters}>
              <X size={14} />
              Clear
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="contracts-loading">
          <div className="spinner" />
          <span>Loading contracts...</span>
        </div>
      )}

      {!isLoading && contracts.length === 0 && (
        <div className="contracts-empty">
          <p>No contracts match your filters.</p>
        </div>
      )}

      {/* List View */}
      {!isLoading && viewMode === 'list' && contracts.length > 0 && (
        <div className="contracts-results">
          <div className="contract-table-container">
            <table className="contract-table">
              <thead>
                <tr>
                  <th onClick={() => toggleSort('contractNum')} className="sortable-th">
                    Contract # <SortIcon field="contractNum" />
                  </th>
                  <th onClick={() => toggleSort('dealerId')} className="sortable-th">
                    Dealer <SortIcon field="dealerId" />
                  </th>
                  <th onClick={() => toggleSort('productId')} className="sortable-th">
                    Product <SortIcon field="productId" />
                  </th>
                  <th onClick={() => toggleSort('status')} className="sortable-th">
                    Status <SortIcon field="status" />
                  </th>
                  <th onClick={() => toggleSort('effectDt')} className="sortable-th">
                    Effective <SortIcon field="effectDt" />
                  </th>
                  <th onClick={() => toggleSort('expiryDt')} className="sortable-th">
                    Expiry <SortIcon field="expiryDt" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {contracts.map(contract => (
                  <tr
                    key={contract.contractKey}
                    className="contract-row"
                    onClick={() => handleSelectContract(contract.contractNum)}
                  >
                    <td className="contract-num">{contract.contractNum}</td>
                    <td className="contract-dealer">
                      <span className="dealer-id">{contract.dealerId}</span>
                      {contract.dealerName && <span className="dealer-name-sub">{contract.dealerName}</span>}
                    </td>
                    <td>{contract.productId}</td>
                    <td>
                      <span className={`status-badge ${statusClass(contract.contractStatPri)}`}>
                        {formatStatus(contract.contractStatPri)}
                      </span>
                    </td>
                    <td>{formatDate(contract.effectDt)}</td>
                    <td>{formatDate(contract.expiryDt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Card View */}
      {!isLoading && viewMode === 'card' && contracts.length > 0 && (
        <div className="contracts-card-grid">
          {contracts.map(contract => (
            <div
              key={contract.contractKey}
              className="contract-card"
              onClick={() => handleSelectContract(contract.contractNum)}
            >
              <div className="card-header">
                <FileText size={18} className="card-icon" />
                <span className={`status-badge ${statusClass(contract.contractStatPri)}`}>
                  {formatStatus(contract.contractStatPri)}
                </span>
              </div>
              <h4 className="card-contract-num">{contract.contractNum}</h4>
              <span className="card-product">{formatProduct(contract.productId)}</span>
              <div className="card-dealer">
                <Building2 size={12} />
                <span>{contract.dealerName || contract.dealerId}</span>
              </div>
              <div className="card-dates">
                <Calendar size={12} />
                <span>{formatDate(contract.effectDt)} — {formatDate(contract.expiryDt)}</span>
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

      {!hasMore && contracts.length > PAGE_SIZE && (
        <div className="end-of-list">All {totalCount} contracts shown</div>
      )}

      {isLoadingMore && (
        <div className="load-more-sentinel">
          <Loader2 size={16} className="spinning" />
          <span>Loading more...</span>
        </div>
      )}

      {isLoadingDetails && (
        <div className="contracts-loading overlay">
          <div className="spinner" />
          <span>Loading contract details...</span>
        </div>
      )}
    </div>
  )
}

export default Contracts
