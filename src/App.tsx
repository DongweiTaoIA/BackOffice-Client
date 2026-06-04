import { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import ChatArea from './components/ChatArea'
import { api } from './services/api'
import type { EligibilityResult, SuggestedAction } from './services/api'
import { useAuth } from './auth/useAuth'
import './App.css'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  eligibilityResult?: EligibilityResult
  suggestions?: SuggestedAction[]
  isLoading?: boolean
  isError?: boolean
}

function App() {
  const { isAuthenticated, isLoading, login, userProfile } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [chatOpen, setChatOpen] = useState(true)
  const [activeNavItem, setActiveNavItem] = useState('dashboard')
  const [isProcessing, setIsProcessing] = useState(false)

  const sendLocalAgentMessage = useCallback(async (content: string, loadingId: string) => {
    const response = await api.sendLocalAgentMessage(content)

    setMessages(prev => prev.map(m => m.id === loadingId ? {
      id: response.id,
      role: 'assistant' as const,
      content: response.content,
      timestamp: new Date(response.timestamp),
      suggestions: response.suggestions,
    } : m))
  }, [])

  const handleSendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    setIsProcessing(true)

    // Add a loading placeholder
    const loadingId = `msg-${Date.now()}-loading`
    setMessages(prev => [...prev, {
      id: loadingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    }])

    try {
      await sendLocalAgentMessage(content, loadingId)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const isOllamaDown = /failed to fetch|networkerror|ollama/i.test(message)
        && !/contract api/i.test(message)
      const friendly = isOllamaDown
        ? 'Local Ollama is not available. Make sure Ollama is running and llama3.2:3b is installed.'
        : `Request failed: ${message}`
      setMessages(prev => prev.map(m => m.id === loadingId ? {
        id: loadingId,
        role: 'assistant' as const,
        content: friendly,
        timestamp: new Date(),
        isError: true,
      } : m))
      console.error('Failed to send message:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [sendLocalAgentMessage])

  const handleRetry = useCallback((messageContent: string) => {
    // Remove the error message and resend
    setMessages(prev => prev.filter(m => !m.isError))
    handleSendMessage(messageContent)
  }, [handleSendMessage])

  if (isLoading) {
    return (
      <div className="app-login">
        <div className="login-card">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="app-login">
        <div className="login-card">
          <h1>Team PnC</h1>
          <p>Please sign in with your work account to continue.</p>
          <button className="login-button" onClick={login}>
            Sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <Sidebar
        activeNavItem={activeNavItem}
        onNavItemSelect={setActiveNavItem}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(prev => !prev)}
      />
      <main className="main-content">
        <Dashboard />
      </main>
      <ChatArea
        messages={messages}
        onSendMessage={handleSendMessage}
        onRetry={handleRetry}
        isProcessing={isProcessing}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(true)}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen(prev => !prev)}
      />
    </div>
  )
}

export default App
