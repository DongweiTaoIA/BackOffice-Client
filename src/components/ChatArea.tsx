import { useState, useRef, useEffect } from 'react'
import {
  Send,
  Menu,
  Sparkles,
  Paperclip,
  Mic,
  MessageSquare,
  ChevronRight,
} from 'lucide-react'
import type { Message } from '../App'
import './ChatArea.css'

interface ChatAreaProps {
  messages: Message[]
  onSendMessage: (content: string) => void
  sidebarOpen: boolean
  onToggleSidebar: () => void
  chatOpen: boolean
  onToggleChat: () => void
}

function ChatArea({ messages, onSendMessage, sidebarOpen, onToggleSidebar, chatOpen, onToggleChat }: ChatAreaProps) {
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
            <p>Ask me anything.</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map(msg => (
              <div key={msg.id} className={`message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'user' ? 'U' : '✦'}
                </div>
                <div className="message-content-wrapper">
                  <div className="message-sender">
                    {msg.role === 'user' ? 'You' : 'Team PnC'}
                    <span className="message-time">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div className="message-bubble">
                    {msg.content}
                  </div>
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
                placeholder="Message Team PnC..."
                rows={1}
              />
              <button type="button" className="input-btn" title="Voice input">
                <Mic size={18} />
              </button>
              <button
                type="submit"
                className="send-btn"
                disabled={!input.trim()}
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

export default ChatArea
