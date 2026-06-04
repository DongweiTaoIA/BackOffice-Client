import { useState, useRef, useEffect } from 'react'
import {
  Send,
  Menu,
  Sparkles,
  Paperclip,
  Mic,
  MessageSquare,
  ChevronRight,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import type { Message } from '../App'
import type { EligibilityResult } from '../services/api'
import './ChatArea.css'

interface ChatAreaProps {
  messages: Message[]
  onSendMessage: (content: string) => void
  onRetry: (lastUserMessage: string) => void
  isProcessing: boolean
  sidebarOpen: boolean
  onToggleSidebar: () => void
  chatOpen: boolean
  onToggleChat: () => void
}

function ChatArea({ messages, onSendMessage, onRetry, isProcessing, sidebarOpen, onToggleSidebar, chatOpen, onToggleChat }: ChatAreaProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      onSendMessage(input.trim())
      setInput('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    const textarea = e.target
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const showWelcome = messages.length === 0

  if (!chatOpen) {
    return (
      <div className="chat-area collapsed">
        <button className="chat-expand-btn" onClick={onToggleChat} title="Open chat">
          <MessageSquare size={20} />
        </button>
      </div>
    )
  }

  return (
    <div className="chat-area">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-left">
          {!sidebarOpen && (
            <button className="menu-btn" onClick={onToggleSidebar}>
              <Menu size={20} />
            </button>
          )}
          <div className="chat-title">
            <Sparkles size={20} className="sparkle-icon" />
            Team PnC at your service
          </div>
        </div>
        <div className="chat-header-right">
          <button className="chat-collapse-btn" onClick={onToggleChat} title="Collapse chat">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Messages or Welcome */}
      <div className="messages-container">
        {showWelcome ? (
          <div className="welcome-screen">
            <div className="welcome-icon">
              <Sparkles size={40} />
            </div>
            <h2>How can I help you today?</h2>
            <p>Ask me about contract status, e.g., "What is the status of contract AUMU02522380?"</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((msg, idx) => (
              <div key={msg.id} className={`message ${msg.role}${msg.isError ? ' error' : ''}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? 'U' : '✦'}
                </div>
                <div className="message-content-wrapper">
                  <div className="message-sender">
                    {msg.role === 'user' ? 'You' : 'Team PnC'}
                    <span className="message-time">{formatTime(msg.timestamp)}</span>
                  </div>
                  {msg.isLoading ? (
                    <div className="message-bubble loading-bubble">
                      <Loader2 size={16} className="spin" />
                      <span>Thinking...</span>
                    </div>
                  ) : msg.isError ? (
                    <div className="message-bubble error-bubble">
                      <span>{msg.content}</span>
                      <button
                        className="retry-btn"
                        onClick={() => {
                          const lastUserMsg = messages.slice(0, idx).reverse().find(m => m.role === 'user')
                          if (lastUserMsg) onRetry(lastUserMsg.content)
                        }}
                      >
                        <RefreshCw size={14} /> Retry
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="message-bubble">
                        {msg.content}
                      </div>
                      {msg.eligibilityResult && (
                        <EligibilityCard result={msg.eligibilityResult} />
                      )}
                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="suggestions-container">
                          {msg.suggestions.map((s, i) => (
                            <button
                              key={i}
                              className="suggestion-chip"
                              onClick={() => onSendMessage(s.action)}
                              disabled={isProcessing}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="input-area">
        <div className="input-container">
          <form onSubmit={handleSubmit}>
            <div className="input-wrapper">
              <button type="button" className="input-btn" title="Attach file">
                <Paperclip size={18} />
              </button>
              <textarea
                ref={textareaRef}
                className="message-input"
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask about contract status, e.g., 'What is the status of contract AUMU02522380?'"
                rows={1}
                disabled={isProcessing}
              />
              <button type="button" className="input-btn" title="Voice input">
                <Mic size={18} />
              </button>
              <button
                type="submit"
                className="send-btn"
                disabled={!input.trim() || isProcessing}
                title="Send message"
              >
                <Send size={16} />
              </button>
            </div>
          </form>
          <div className="chat-footer-text">
            Team PnC Toolbox | IA Dealer Service
          </div>
        </div>
      </div>
    </div>
  )
}

function EligibilityCard({ result }: { result: EligibilityResult }) {
  return (
    <div className={`eligibility-card ${result.isEligible ? 'eligible' : 'ineligible'}`}>
      <div className="eligibility-header">
        {result.isEligible ? (
          <CheckCircle size={18} className="status-icon eligible" />
        ) : (
          <XCircle size={18} className="status-icon ineligible" />
        )}
        <span className="status-text">
          {result.isEligible ? 'Eligible' : 'Not Eligible'}
        </span>
      </div>
      <div className="eligibility-details">
        <div className="detail-row">
          <span className="detail-label">Dealer:</span>
          <span className="detail-value">{result.dealerCode} — {result.dealerName}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Product:</span>
          <span className="detail-value">{result.product}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Environment:</span>
          <span className="detail-value">{result.environment}</span>
        </div>
      </div>
      {result.programs.length > 0 && (
        <div className="eligibility-programs">
          <div className="programs-title">Active Programs</div>
          {result.programs.map((p, i) => (
            <div key={i} className="program-row">
              <span className="program-code">{p.code}</span>
              <span className="program-name">{p.name}</span>
              <span className={`program-status ${p.status.toLowerCase()}`}>{p.status}</span>
            </div>
          ))}
        </div>
      )}
      <div className="eligibility-summary">{result.summary}</div>
    </div>
  )
}

export default ChatArea
