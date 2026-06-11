import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import DOMPurify from 'dompurify'
import {
  X, Loader2, AlertCircle, RefreshCw, Plus, Search, ArrowLeft,
  Calendar, User, Send, MessageSquare, Upload, Trash2, Paperclip,
  Image, Video, Link, Pencil,
} from 'lucide-react'
import { api } from '../../services/api'
import type {
  SupportTicket, SupportTicketIndexEntry, SupportTicketType,
  TicketStatus, CreateSupportTicketRequest,
} from '../../services/api'
import { useAuth } from '../../auth/useAuth'
import { RichTextEditor } from './RichTextEditor'
import './SupportTicketDialog.css'

function AuthImage({ ticketId, fileName, alt, className, onClick }: {
  ticketId: string; fileName: string; alt: string; className?: string; onClick?: () => void
}) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    let revoked = false
    api.getSupportTicketAttachmentBlob(ticketId, fileName).then(url => {
      if (!revoked) setBlobUrl(url)
    }).catch(() => {})
    return () => { revoked = true; if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [ticketId, fileName])

  if (!blobUrl) return <span className="st-image-loading">Loading...</span>
  return <img src={blobUrl} alt={alt} className={className} onClick={onClick} />
}

export interface FormFieldConfig {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select'
  required?: boolean
  options?: { value: string; label: string }[]
  placeholder?: string
}

export interface SupportTicketDialogProps {
  ticketType: SupportTicketType
  title: string
  icon: ReactNode
  iconClass: string
  formFields: FormFieldConfig[]
  onClose: () => void
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function statusClass(status: TicketStatus): string {
  switch (status) {
    case 'New': return 'st-card-status--new'
    case 'InProgress': return 'st-card-status--inprogress'
    case 'Resolved': return 'st-card-status--resolved'
    case 'Closed': return 'st-card-status--closed'
    default: return ''
  }
}

function statusLabel(status: TicketStatus): string {
  switch (status) {
    case 'InProgress': return 'In Progress'
    default: return status
  }
}

export default function SupportTicketDialog({
  ticketType,
  title,
  icon,
  iconClass,
  formFields,
  onClose,
}: SupportTicketDialogProps) {
  const { userProfile } = useAuth()
  const [tickets, setTickets] = useState<SupportTicketIndexEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'mine'>('all')
  const [commentText, setCommentText] = useState('')

  // Form state
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [formFiles, setFormFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [editOriginalValues, setEditOriginalValues] = useState<Record<string, string>>({})
  const [editFiles, setEditFiles] = useState<File[]>([])
  const [editDeleteAttachments, setEditDeleteAttachments] = useState<string[]>([])
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editFileInputRef = useRef<HTMLInputElement>(null)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const commentFileInputRef = useRef<HTMLInputElement>(null)
  const [commentFiles, setCommentFiles] = useState<File[]>([])

  const currentUserName = userProfile?.displayName ?? 'Current User'
  const currentUserEmail = userProfile?.email ?? ''

  const loadTickets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [all, mine] = await Promise.all([
        api.getSupportTickets(ticketType, searchQuery || undefined),
        currentUserEmail ? api.getMySupportTickets(currentUserEmail, ticketType) : Promise.resolve([]),
      ])
      const map = new Map<string, SupportTicketIndexEntry>()
      for (const t of all) map.set(t.id, t)
      for (const t of mine) map.set(t.id, t)
      setTickets(Array.from(map.values()))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }, [ticketType, searchQuery, currentUserEmail])

  const hasEditChanges = useCallback(() => {
    if (!editing) return false
    if (editFiles.length > 0) return true
    if (editDeleteAttachments.length > 0) return true
    for (const key of Object.keys(editValues)) {
      if ((editValues[key] || '') !== (editOriginalValues[key] || '')) return true
    }
    return false
  }, [editing, editValues, editOriginalValues, editFiles, editDeleteAttachments])

  const navigateWithSaveCheck = useCallback((action: () => void) => {
    if (hasEditChanges()) {
      setPendingAction(() => action)
    } else {
      if (editing) {
        setEditing(false)
        setEditValues({})
        setEditOriginalValues({})
        setEditFiles([]); setEditDeleteAttachments([])
      }
      action()
    }
  }, [hasEditChanges, editing])

  const handleConfirmSave = async () => {
    if (!selectedTicket) return
    const titleVal = editValues['title']?.trim()
    const descVal = editValues['description']?.trim()
    if (titleVal && descVal) {
      try {
        const request: Record<string, unknown> = {
          requesterEmail: currentUserEmail,
          title: titleVal,
          description: descVal,
        }
        for (const field of formFields) {
          if (field.key === 'title' || field.key === 'description') continue
          const val = editValues[field.key]?.trim()
          if (val) request[field.key] = val
        }
        const videoLink = editValues['videoLink']?.trim()
        if (videoLink) request.videoLink = videoLink
        if (editFiles.length > 0) request.files = editFiles
        if (editDeleteAttachments.length > 0) request.deleteAttachments = editDeleteAttachments
        await api.updateSupportTicket(selectedTicket.id, request as Parameters<typeof api.updateSupportTicket>[1])
        loadTickets()
      } catch {
        // save failed silently
      }
    }
    setEditing(false)
    setEditValues({})
    setEditOriginalValues({})
    setEditFiles([]); setEditDeleteAttachments([])
    if (pendingAction) {
      pendingAction()
      setPendingAction(null)
    }
  }

  const handleDiscardChanges = () => {
    setEditing(false)
    setEditValues({})
    setEditOriginalValues({})
    setEditFiles([]); setEditDeleteAttachments([])
    if (pendingAction) {
      pendingAction()
      setPendingAction(null)
    }
  }

  const handleCancelNavigation = () => {
    setPendingAction(null)
  }

  const selectTicket = useCallback(async (id: string) => {
    const doSelect = async () => {
      setShowForm(false)
      setDetailLoading(true)
      try {
        const ticket = await api.getSupportTicket(id)
        setSelectedTicket(ticket)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load ticket details')
      } finally {
        setDetailLoading(false)
      }
    }
    if (editing && hasEditChanges()) {
      setPendingAction(() => doSelect)
    } else {
      if (editing) {
        setEditing(false)
        setEditValues({})
        setEditOriginalValues({})
        setEditFiles([]); setEditDeleteAttachments([])
      }
      await doSelect()
    }
  }, [editing, hasEditChanges])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  // Filter tickets
  const filteredTickets = tickets.filter(t => {
    if (filter === 'mine') return t.authorEmail.toLowerCase() === currentUserEmail.toLowerCase()
    return true
  })

  // Form handlers
  const resetForm = () => {
    setFormValues({})
    setFormFiles([])
    setSubmitError(null)
  }

  const handleSubmit = async () => {
    const titleVal = formValues['title']?.trim()
    const descVal = formValues['description']?.trim()
    if (!titleVal || !descVal) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      const request: CreateSupportTicketRequest = {
        type: ticketType,
        title: titleVal,
        description: descVal,
        authorName: currentUserName,
        authorEmail: currentUserEmail,
        files: formFiles.length > 0 ? formFiles : undefined,
      }
      // Map extra form fields to the request
      for (const field of formFields) {
        if (field.key === 'title' || field.key === 'description') continue
        const val = formValues[field.key]?.trim()
        if (val) {
          (request as unknown as Record<string, unknown>)[field.key] = val
        }
      }
      // Include video link if provided
      const videoLink = formValues['videoLink']?.trim()
      if (videoLink) {
        (request as unknown as Record<string, unknown>).videoLink = videoLink
      }

      await api.createSupportTicket(request)
      resetForm()
      setShowForm(false)
      await loadTickets()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddComment = async () => {
    if ((!commentText.trim() && commentFiles.length === 0) || !selectedTicket) return
    try {
      // If there are pasted images, upload them as attachments first
      let fullText = commentText.trim()
      if (commentFiles.length > 0) {
        await api.updateSupportTicket(selectedTicket.id, {
          requesterEmail: currentUserEmail,
          files: commentFiles,
        } as Parameters<typeof api.updateSupportTicket>[1])
        // Append image references to comment text
        const imageRefs = commentFiles.map(f => `[image:${f.name}]`).join('\n')
        fullText = fullText ? `${fullText}\n${imageRefs}` : imageRefs
      }
      const updated = await api.addSupportTicketComment(
        selectedTicket.id, fullText, currentUserName, currentUserEmail
      )
      setSelectedTicket(updated)
      setCommentText('')
      setCommentFiles([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comment')
    }
  }

  const handleCommentPaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    const imageFiles: File[] = []
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const ext = file.type.split('/')[1] || 'png'
          const namedFile = new File([file], `comment-${timestamp}.${ext}`, { type: file.type })
          imageFiles.push(namedFile)
        }
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault()
      setCommentFiles(prev => [...prev, ...imageFiles])
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedTicket) return
    try {
      await api.deleteSupportTicketComment(selectedTicket.id, commentId)
      setSelectedTicket(prev => prev ? {
        ...prev,
        comments: prev.comments.filter(c => c.id !== commentId),
      } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment')
    }
  }

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!selectedTicket) return
    try {
      const updated = await api.updateSupportTicketStatus(selectedTicket.id, newStatus, currentUserEmail)
      setSelectedTicket(updated)
      await loadTickets()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  const handleDelete = async () => {
    if (!selectedTicket) return
    try {
      await api.deleteSupportTicket(selectedTicket.id, currentUserEmail)
      setSelectedTicket(null)
      await loadTickets()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete ticket')
    }
  }

  const startEditing = () => {
    if (!selectedTicket) return
    const values: Record<string, string> = {
      title: selectedTicket.title,
      description: selectedTicket.description,
    }
    for (const field of formFields) {
      if (field.key === 'title' || field.key === 'description') continue
      const val = (selectedTicket as unknown as Record<string, string>)[field.key]
      if (val) values[field.key] = val
    }
    const videoLink = (selectedTicket as unknown as Record<string, string>).videoLink
    if (videoLink) values.videoLink = videoLink
    setEditValues(values)
    setEditOriginalValues({ ...values })
    setEditFiles([]); setEditDeleteAttachments([])
    setEditError(null)
    setEditing(true)
  }

  const cancelEditing = () => {
    if (hasEditChanges()) {
      setPendingAction(() => () => {
        setEditing(false)
        setEditValues({})
        setEditOriginalValues({})
        setEditFiles([]); setEditDeleteAttachments([])
        setEditError(null)
      })
    } else {
      setEditing(false)
      setEditValues({})
      setEditOriginalValues({})
      setEditFiles([]); setEditDeleteAttachments([])
      setEditError(null)
    }
  }

  const handleEditSubmit = async () => {
    if (!selectedTicket) return
    const titleVal = editValues['title']?.trim()
    const descVal = editValues['description']?.trim()
    if (!titleVal || !descVal) return

    setEditSubmitting(true)
    setEditError(null)
    try {
      const request: Record<string, unknown> = {
        requesterEmail: currentUserEmail,
        title: titleVal,
        description: descVal,
      }
      for (const field of formFields) {
        if (field.key === 'title' || field.key === 'description') continue
        const val = editValues[field.key]?.trim()
        if (val) request[field.key] = val
      }
      const videoLink = editValues['videoLink']?.trim()
      if (videoLink) request.videoLink = videoLink
      if (editFiles.length > 0) request.files = editFiles
      if (editDeleteAttachments.length > 0) request.deleteAttachments = editDeleteAttachments

      const updated = await api.updateSupportTicket(selectedTicket.id, request as Parameters<typeof api.updateSupportTicket>[1])
      setSelectedTicket(updated)
      setEditing(false)
      await loadTickets()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update ticket')
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleEditFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setEditFiles(prev => [...prev, ...files])
    e.target.value = ''
  }

  const handleEditFileRemove = (index: number) => {
    setEditFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleEditPaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    const imageFiles: File[] = []
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const ext = file.type.split('/')[1] || 'png'
          const namedFile = new File([file], `screenshot-${timestamp}.${ext}`, { type: file.type })
          imageFiles.push(namedFile)
        }
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault()
      setEditFiles(prev => [...prev, ...imageFiles])
    }
  }

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setFormFiles(prev => [...prev, ...files])
    e.target.value = ''
  }

  const handleFileRemove = (index: number) => {
    setFormFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    const imageFiles: File[] = []
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
          const ext = file.type.split('/')[1] || 'png'
          const namedFile = new File([file], `screenshot-${timestamp}.${ext}`, { type: file.type })
          imageFiles.push(namedFile)
        }
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault()
      setFormFiles(prev => [...prev, ...imageFiles])
    }
  }

  const getBadgeForCard = (ticket: SupportTicketIndexEntry): ReactNode => {
    if (ticket.severity) {
      return <span className={`st-card-badge st-card-badge--${ticket.severity.toLowerCase()}`}>{ticket.severity}</span>
    }
    if (ticket.priority) {
      return <span className="st-card-badge st-card-badge--must-have">{ticket.priority}</span>
    }
    if (ticket.urgency) {
      return <span className={`st-card-badge st-card-badge--${ticket.urgency === 'Blocking' ? 'blocking' : 'low'}`}>{ticket.urgency}</span>
    }
    return null
  }

  // Render form
  const renderForm = () => (
    <div className="st-form-panel" onPaste={handlePaste}>
      <div className="st-form">
        <h3 className="st-form-title">New {title.replace(/s$/, '')}</h3>
        {submitError && (
          <div className="st-error"><AlertCircle size={16} />{submitError}</div>
        )}
        {formFields.map(field => (
          <div key={field.key} className="st-form-group">
            <label className={`st-form-label ${field.required ? 'st-form-label--required' : ''}`}>
              {field.label}
            </label>
            {field.type === 'select' ? (
              <select
                className="st-form-select"
                value={formValues[field.key] || ''}
                onChange={e => setFormValues(prev => ({ ...prev, [field.key]: e.target.value }))}
              >
                <option value="">Select...</option>
                {field.options?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : field.type === 'textarea' ? (
              field.key === 'description' ? (
                <RichTextEditor
                  content={formValues[field.key] || ''}
                  onChange={html => setFormValues(prev => ({ ...prev, [field.key]: html }))}
                  placeholder={field.placeholder}
                  onImagePaste={async (file) => {
                    return new Promise<string>((resolve) => {
                      const reader = new FileReader()
                      reader.onloadend = () => resolve(reader.result as string)
                      reader.readAsDataURL(file)
                    })
                  }}
                />
              ) : (
                <textarea
                  className="st-form-textarea"
                  value={formValues[field.key] || ''}
                  onChange={e => setFormValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  rows={3}
                />
              )
            ) : (
              <input
                className="st-form-input"
                type="text"
                value={formValues[field.key] || ''}
                onChange={e => setFormValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
              />
            )}
          </div>
        ))}

        {/* Video link */}
        <div className="st-form-group">
          <label className="st-form-label">Video Recording Link</label>
          <div className="st-form-video-link-row">
            <Video size={14} className="st-form-video-icon" />
            <input
              className="st-form-input"
              type="url"
              value={formValues['videoLink'] || ''}
              onChange={e => setFormValues(prev => ({ ...prev, videoLink: e.target.value }))}
              placeholder="Paste link to Teams/Stream recording..."
            />
          </div>
        </div>

        {/* File attachments & screenshots */}
        <div className="st-form-group">
          <label className="st-form-label">Attachments & Screenshots</label>
          <div className="st-form-file-row">
            <button className="st-form-file-btn" onClick={() => fileInputRef.current?.click()}>
              <Upload size={14} /> Add files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileAdd}
              accept="image/*,.pdf,.pptx,.ppt,.doc,.docx,.txt,.log,.mp4,.webm"
            />
          </div>
          <div className="st-paste-hint">
            <Image size={12} /> Tip: You can paste screenshots directly from clipboard (Ctrl+V)
          </div>
          {formFiles.length > 0 && (
            <div className="st-form-file-list">
              {formFiles.map((f, i) => (
                <div key={i} className="st-form-file-item">
                  {f.type.startsWith('image/') ? <Image size={12} /> : <Paperclip size={12} />}
                  <span className="st-form-file-name">{f.name}</span>
                  {f.type.startsWith('image/') && (
                    <img
                      src={URL.createObjectURL(f)}
                      alt={f.name}
                      className="st-form-file-thumbnail"
                    />
                  )}
                  <button className="st-form-file-remove" onClick={() => handleFileRemove(i)}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="st-form-actions">
          <button className="st-form-cancel" onClick={() => { setShowForm(false); resetForm() }}>Cancel</button>
          <button
            className="st-form-submit"
            disabled={!formValues['title']?.trim() || !formValues['description']?.trim() || submitting}
            onClick={handleSubmit}
          >
            {submitting ? <><Loader2 size={14} /> Submitting...</> : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  )

  // Render detail
  const renderDetail = () => {
    if (!selectedTicket) return null
    const isOwner = selectedTicket.authorEmail.toLowerCase() === currentUserEmail.toLowerCase()

    return (
      <div className="st-detail-panel">
        <button className="st-detail-back" onClick={() => navigateWithSaveCheck(() => setSelectedTicket(null))}>
          <ArrowLeft size={14} /> Back to list
        </button>

        <h2 className="st-detail-title">{selectedTicket.title}</h2>

        <div className="st-detail-meta">
          <span className="st-detail-meta-item"><User size={12} /> {selectedTicket.authorName}</span>
          <span className="st-detail-meta-item"><Calendar size={12} /> {formatDate(selectedTicket.createdAt)}</span>
          <span className={`st-card-status ${statusClass(selectedTicket.status)}`}>
            {statusLabel(selectedTicket.status)}
          </span>
        </div>

        {/* Status actions - only owner can manage */}
        {isOwner && (
        <div className="st-detail-actions">
          {(selectedTicket.status === 'New' || selectedTicket.status === 'InProgress') && (
            <button className="st-detail-action-pill" onClick={() => handleStatusChange('Resolved')}>
              Mark Resolved
            </button>
          )}
          {selectedTicket.status !== 'Closed' && (
            <button className="st-detail-action-pill" onClick={() => handleStatusChange('Closed')}>
              Close
            </button>
          )}
          {(selectedTicket.status === 'Resolved' || selectedTicket.status === 'Closed') && (
            <button className="st-detail-action-pill" onClick={() => handleStatusChange('New')}>
              Reopen
            </button>
          )}
          <button className="st-detail-action-pill" onClick={startEditing}>
            <Pencil size={12} /> Edit
          </button>
          <button className="st-detail-action-pill st-detail-action-pill--danger" onClick={handleDelete}>
            <Trash2 size={12} /> Delete
          </button>
        </div>
        )}

        {/* Type-specific fields */}
        {editing ? (
          <div className="st-edit-form" onPaste={handleEditPaste}>
            {editError && (
              <div className="st-error"><AlertCircle size={16} />{editError}</div>
            )}
            {formFields.map(field => (
              <div key={field.key} className="st-form-group">
                <label className={`st-form-label ${field.required ? 'st-form-label--required' : ''}`}>
                  {field.label}
                </label>
                {field.type === 'select' ? (
                  <select
                    className="st-form-select"
                    value={editValues[field.key] || ''}
                    onChange={e => setEditValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                  >
                    <option value="">Select...</option>
                    {field.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <>
                    {field.key === 'description' ? (
                      <RichTextEditor
                        content={editValues[field.key] || ''}
                        onChange={html => setEditValues(prev => ({ ...prev, [field.key]: html }))}
                        placeholder={field.placeholder}
                        onImagePaste={async (file) => {
                          return new Promise<string>((resolve) => {
                            const reader = new FileReader()
                            reader.onloadend = () => resolve(reader.result as string)
                            reader.readAsDataURL(file)
                          })
                        }}
                      />
                    ) : (
                      <textarea
                        className="st-form-textarea"
                        value={editValues[field.key] || ''}
                        onChange={e => setEditValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        rows={3}
                      />
                    )}
                  </>
                ) : (
                  <input
                    className="st-form-input"
                    type="text"
                    value={editValues[field.key] || ''}
                    onChange={e => setEditValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                  />
                )}
              </div>
            ))}

            {/* Video link */}
            <div className="st-form-group">
              <label className="st-form-label">Video Recording Link</label>
              <div className="st-form-video-link-row">
                <Video size={14} className="st-form-video-icon" />
                <input
                  className="st-form-input"
                  type="url"
                  value={editValues['videoLink'] || ''}
                  onChange={e => setEditValues(prev => ({ ...prev, videoLink: e.target.value }))}
                  placeholder="Paste link to Teams/Stream recording..."
                />
              </div>
            </div>

            {/* Attachments */}
            <div className="st-form-group">
              <label className="st-form-label">Attachments</label>
              {/* Existing attachments */}
              {selectedTicket.attachments.filter(att => !editDeleteAttachments.includes(att.fileName)).length > 0 && (
                <div className="st-form-file-list">
                  {selectedTicket.attachments.filter(att => !editDeleteAttachments.includes(att.fileName)).map(att => (
                    <div key={att.fileName} className="st-form-file-item">
                      {att.contentType.startsWith('image/') ? <Image size={12} /> : <Paperclip size={12} />}
                      <span className="st-form-file-name">{att.fileName}</span>
                      <button className="st-form-file-remove" onClick={() => setEditDeleteAttachments(prev => [...prev, att.fileName])}>×</button>
                    </div>
                  ))}
                </div>
              )}
              {/* New files to upload */}
              {editFiles.length > 0 && (
                <div className="st-form-file-list" style={{ marginTop: 8 }}>
                  {editFiles.map((f, i) => (
                    <div key={i} className="st-form-file-item st-form-file-item--new">
                      {f.type.startsWith('image/') ? <Image size={12} /> : <Paperclip size={12} />}
                      <span className="st-form-file-name">{f.name}</span>
                      <span className="st-form-file-badge">new</span>
                      <button className="st-form-file-remove" onClick={() => handleEditFileRemove(i)}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="st-form-file-row" style={{ marginTop: 8 }}>
                <button className="st-form-file-btn" onClick={() => editFileInputRef.current?.click()}>
                  <Upload size={14} /> Add files
                </button>
                <input
                  ref={editFileInputRef}
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleEditFileAdd}
                  accept="image/*,.pdf,.pptx,.ppt,.doc,.docx,.txt,.log,.mp4,.webm"
                />
              </div>
            </div>

            <div className="st-form-actions">
              <button className="st-form-cancel" onClick={cancelEditing}>Cancel</button>
              <button
                className="st-form-submit"
                disabled={!editValues['title']?.trim() || !editValues['description']?.trim() || editSubmitting}
                onClick={handleEditSubmit}
              >
                {editSubmitting ? <><Loader2 size={14} /> Saving...</> : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
        <>
        <div className="st-detail-section">
          {selectedTicket.severity && (
            <div className="st-detail-field">
              <span className="st-detail-field-label">Severity:</span>
              <span className="st-detail-field-value">{selectedTicket.severity}</span>
            </div>
          )}
          {selectedTicket.stepsToReproduce && (
            <div className="st-detail-field">
              <span className="st-detail-field-label">Steps to Reproduce:</span>
              <span className="st-detail-field-value">{selectedTicket.stepsToReproduce}</span>
            </div>
          )}
          {selectedTicket.browser && (
            <div className="st-detail-field">
              <span className="st-detail-field-label">Browser:</span>
              <span className="st-detail-field-value">{selectedTicket.browser}</span>
            </div>
          )}
          {selectedTicket.os && (
            <div className="st-detail-field">
              <span className="st-detail-field-label">OS:</span>
              <span className="st-detail-field-value">{selectedTicket.os}</span>
            </div>
          )}
          {selectedTicket.priority && (
            <div className="st-detail-field">
              <span className="st-detail-field-label">Priority:</span>
              <span className="st-detail-field-value">{selectedTicket.priority}</span>
            </div>
          )}
          {selectedTicket.useCase && (
            <div className="st-detail-field">
              <span className="st-detail-field-label">Use Case:</span>
              <span className="st-detail-field-value">{selectedTicket.useCase}</span>
            </div>
          )}
          {selectedTicket.urgency && (
            <div className="st-detail-field">
              <span className="st-detail-field-label">Urgency:</span>
              <span className="st-detail-field-value">{selectedTicket.urgency}</span>
            </div>
          )}
          {selectedTicket.relatedModule && (
            <div className="st-detail-field">
              <span className="st-detail-field-label">Related Module:</span>
              <span className="st-detail-field-value">{selectedTicket.relatedModule}</span>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="st-detail-section">
          <span className="st-detail-section-title">Description</span>
          <div className="st-detail-description" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedTicket.description) }} />
        </div>

        {/* Video link */}
        {(selectedTicket as unknown as Record<string, unknown>).videoLink && (
          <div className="st-detail-section">
            <span className="st-detail-section-title"><Video size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> Video Recording</span>
            <a
              className="st-video-link"
              href={(selectedTicket as unknown as Record<string, string>).videoLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Link size={12} /> {(selectedTicket as unknown as Record<string, string>).videoLink}
            </a>
          </div>
        )}

        {/* Non-image attachments */}
        {selectedTicket.attachments.filter(att => !att.contentType.startsWith('image/')).length > 0 && (
          <div className="st-detail-section">
            <span className="st-detail-section-title">Attachments</span>
            <div className="st-attachments">
              {selectedTicket.attachments.filter(att => !att.contentType.startsWith('image/')).map((att) => (
                <button
                  key={att.fileName}
                  className="st-attachment-link"
                  onClick={async () => {
                    try {
                      const blobUrl = await api.getSupportTicketAttachmentBlob(selectedTicket.id, att.fileName)
                      const parsed = new URL(blobUrl);
                      if (parsed.protocol === 'blob:') {
                        const a = document.createElement('a');
                        a.href = parsed.href;
                        a.target = '_blank';
                        a.rel = 'noopener noreferrer';
                        a.click();
                      }
                    } catch {
                      setError('Failed to open attachment')
                    }
                  }}
                >
                  <Paperclip size={12} /> {att.fileName}
                </button>
              ))}
            </div>
          </div>
        )}
        </>
        )}

        {/* Comments - hidden when editing */}
        {!editing && (
        <div className="st-detail-section">
          <span className="st-detail-section-title">
            <MessageSquare size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> Comments ({selectedTicket.comments.length})
          </span>
          <div className="st-comments">
            {selectedTicket.comments.map(c => {
              // Parse comment text for image references: ![alt](url) or [image:filename]
              const renderCommentContent = (text: string) => {
                const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)|\[image:([^\]]+)\]/g
                const parts: React.ReactNode[] = []
                let lastIndex = 0
                let match: RegExpExecArray | null

                while ((match = imagePattern.exec(text)) !== null) {
                  if (match.index > lastIndex) {
                    parts.push(<span key={lastIndex}>{text.slice(lastIndex, match.index)}</span>)
                  }
                  if (match[2]) {
                    // ![alt](url) pattern - render as plain text (external URLs not trusted)
                    parts.push(
                      <span key={match.index} className="st-comment-image-ref">
                        [image: {match[1] || 'image'}]
                      </span>
                    )
                  } else if (match[3]) {
                    // [image:filename] pattern - reference to ticket attachment
                    parts.push(
                      <div key={match.index} className="st-comment-image-wrapper">
                        <AuthImage
                          ticketId={selectedTicket.id}
                          fileName={match[3]}
                          alt={match[3]}
                          className="st-comment-image"
                        />
                      </div>
                    )
                  }
                  lastIndex = match.index + match[0].length
                }
                if (lastIndex < text.length) {
                  parts.push(<span key={lastIndex}>{text.slice(lastIndex)}</span>)
                }
                return parts.length > 0 ? parts : text
              }

              return (
              <div key={c.id} className="st-comment">
                <div className="st-comment-header">
                  <span className="st-comment-author">{c.authorName}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="st-comment-date">{formatDate(c.createdAt)}</span>
                    {c.authorEmail.toLowerCase() === currentUserEmail.toLowerCase() && (
                      <button className="st-comment-delete" onClick={() => handleDeleteComment(c.id)}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="st-comment-text">{renderCommentContent(c.text)}</div>
              </div>
              )
            })}
          </div>
          <div className="st-comment-input-row">
            <div className="st-comment-input-wrapper">
              <textarea
                ref={commentInputRef}
                className="st-comment-input"
                placeholder="Add a comment... (paste images with Ctrl+V)"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment() } }}
                onPaste={handleCommentPaste}
                rows={commentFiles.length > 0 ? 2 : 1}
              />
              {commentFiles.length > 0 && (
                <div className="st-comment-images-preview">
                  {commentFiles.map((f, i) => (
                    <div key={i} className="st-comment-image-preview-item">
                      <img src={URL.createObjectURL(f)} alt={f.name} className="st-comment-image-preview" />
                      <button className="st-comment-image-remove" onClick={() => setCommentFiles(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              className="st-comment-attach"
              onClick={() => commentFileInputRef.current?.click()}
              title="Attach file"
            >
              <Paperclip size={14} />
            </button>
            <input
              ref={commentFileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={e => {
                const files = Array.from(e.target.files || [])
                setCommentFiles(prev => [...prev, ...files])
                e.target.value = ''
              }}
              accept="image/*,.pdf,.pptx,.ppt,.doc,.docx,.txt,.log"
            />
            <button
              className="st-comment-send"
              disabled={!commentText.trim() && commentFiles.length === 0}
              onClick={handleAddComment}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
        )}
      </div>
    )
  }

  return (
    <>
    {pendingAction && (
      <div className="st-confirm-overlay" onClick={handleCancelNavigation}>
        <div className="st-confirm-dialog" onClick={e => e.stopPropagation()}>
          <h4 className="st-confirm-title">Unsaved Changes</h4>
          <p className="st-confirm-message">You have unsaved changes. Do you want to save them before leaving?</p>
          <div className="st-confirm-actions">
            <button className="st-confirm-btn st-confirm-btn--discard" onClick={handleDiscardChanges}>Discard</button>
            <button className="st-confirm-btn st-confirm-btn--cancel" onClick={handleCancelNavigation}>Cancel</button>
            <button className="st-confirm-btn st-confirm-btn--save" onClick={handleConfirmSave}>Save</button>
          </div>
        </div>
      </div>
    )}
    <div className="st-overlay" onClick={onClose}>
      <div className="st-dialog" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="st-header">
          <div className={`st-header-icon ${iconClass}`}>{icon}</div>
          <h3>{title}</h3>
          <span className="st-count">{filteredTickets.length}</span>

          <div className="st-header-search">
            <Search size={14} className="st-search-icon" />
            <input
              className="st-search-input"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="st-filter-chips">
            <button
              className={`st-filter-chip ${filter === 'all' ? 'st-filter-chip--active' : ''}`}
              onClick={() => setFilter('all')}
            >All</button>
            <button
              className={`st-filter-chip ${filter === 'mine' ? 'st-filter-chip--active' : ''}`}
              onClick={() => setFilter('mine')}
            >Mine</button>
          </div>

          <div className="st-spacer" />

          <button className="st-new-btn" onClick={() => navigateWithSaveCheck(() => { setShowForm(true); setSelectedTicket(null); resetForm() })}>
            <Plus size={14} /> New
          </button>
          <button className="st-action-btn" onClick={loadTickets} title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button className="st-action-btn" onClick={onClose} title="Close">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="st-body">
          {/* List panel */}
          <div className={`st-list-panel ${!selectedTicket && !showForm ? 'st-list-panel--full' : ''}`}>
            {loading ? (
              <div className="st-loading"><Loader2 size={16} /> Loading...</div>
            ) : error ? (
              <div className="st-error"><AlertCircle size={16} /> {error}</div>
            ) : filteredTickets.length === 0 ? (
              <div className="st-empty">
                <div className="st-empty-icon">{icon}</div>
                <p>No tickets yet. Click <strong>New</strong> to create one.</p>
              </div>
            ) : (
              filteredTickets.map(t => (
                <div
                  key={t.id}
                  className={`st-card ${selectedTicket?.id === t.id ? 'st-card--active' : ''}`}
                  onClick={() => selectTicket(t.id)}
                >
                  <div className="st-card-header">
                    <span className="st-card-title">{t.title}</span>
                    <span className={`st-card-status ${statusClass(t.status)}`}>
                      {statusLabel(t.status)}
                    </span>
                  </div>
                  <div className="st-card-meta">
                    {getBadgeForCard(t)}
                    <span>{t.authorName}</span>
                    <span>{formatDate(t.createdAt)}</span>
                    {t.commentCount > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <MessageSquare size={11} /> {t.commentCount}
                      </span>
                    )}
                    {t.attachmentCount > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Paperclip size={11} /> {t.attachmentCount}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right panel */}
          {showForm && renderForm()}
          {detailLoading && (
            <div className="st-detail-panel">
              <div className="st-loading"><Loader2 size={16} /> Loading details...</div>
            </div>
          )}
          {!showForm && !detailLoading && selectedTicket && renderDetail()}
        </div>
      </div>
    </div>
    </>
  )
}
