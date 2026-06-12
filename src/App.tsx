import { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import ChatArea from './components/ChatArea'
import DealerSearch from './components/DealerSearch'
import DealerDetails from './components/DealerDetails'
import Dealers from './components/Dealers'
import BugReportDialog from './components/support/BugReportDialog'
import FeatureRequestDialog from './components/support/FeatureRequestDialog'
import HelpRequestDialog from './components/support/HelpRequestDialog'
import { api } from './services/api'
import type { EligibilityResult, SuggestedAction, DealerSearchResult, DealerDetailsDto } from './services/api'
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
  const { isAuthenticated, isLoading, login } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [chatOpen, setChatOpen] = useState(true)
  const [activeNavItem, setActiveNavItem] = useState('dashboard')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showBugDialog, setShowBugDialog] = useState(false)
  const [showFeatureDialog, setShowFeatureDialog] = useState(false)
  const [showHelpDialog, setShowHelpDialog] = useState(false)
  const [mainView, setMainView] = useState<'dashboard' | 'dealers' | 'dealerSearch' | 'dealerDetails'>('dashboard')
  const [dealerSearchResults, setDealerSearchResults] = useState<DealerSearchResult[]>([])
  const [dealerSearchQuery, setDealerSearchQuery] = useState('')
  const [selectedDealer, setSelectedDealer] = useState<DealerDetailsDto | null>(null)

  // Handle sidebar nav item clicks
  const handleNavItemSelect = useCallback((id: string) => {
    if (id === 'report-bug') {
      setShowBugDialog(true)
      return
    }
    if (id === 'request-feature') {
      setShowFeatureDialog(true)
      return
    }
    if (id === 'ask-for-help') {
      setShowHelpDialog(true)
      return
    }

    setActiveNavItem(id)

    if (id === 'dealers') {
      setMainView('dealers')
      setSelectedDealer(null)
      setDealerSearchResults([])
      setDealerSearchQuery('')
    } else if (id === 'dashboard') {
      setMainView('dashboard')
    }
  }, [])

  const sendLocalAgentMessage = useCallback(async (content: string, loadingId: string) => {
    const response = await api.sendLocalAgentMessage(content)

    // If the response contains dealer search results, update main view
    if (response.dealerSearchResults && response.dealerSearchResults.length > 0) {
      setDealerSearchResults(response.dealerSearchResults)
      setDealerSearchQuery(content)
      setMainView('dealers')
      setActiveNavItem('dealers')
    } else if (response.dealerDetails) {
      setSelectedDealer(response.dealerDetails)
      setMainView('dealers')
      setActiveNavItem('dealers')
    }

    setMessages(prev => prev.map(m => m.id === loadingId ? {
      id: response.id,
      role: 'assistant' as const,
      content: response.content,
      timestamp: new Date(response.timestamp),
      suggestions: response.suggestions,
    } : m))
  }, [])

  const handleSendMessage = useCallback(async (content: string) => {
    // Check for support & feedback chat keywords
    const msgLower = content.trim().toLowerCase()
    if (msgLower === 'report bug' || msgLower === 'bug report' || msgLower === 'report a bug') {
      setShowBugDialog(true)
      return
    }
    if (msgLower === 'request feature' || msgLower === 'feature request' || msgLower === 'request a feature') {
      setShowFeatureDialog(true)
      return
    }
    if (msgLower === 'ask for help' || msgLower === 'help' || msgLower === 'need help') {
      setShowHelpDialog(true)
      return
    }

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
          <h1>Backoffice Admin</h1>
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
        onNavItemSelect={handleNavItemSelect}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(prev => !prev)}
      />
      <main className="main-content">
        {mainView === 'dashboard' && <Dashboard />}
        {mainView === 'dealers' && (
          <Dealers
            onSendMessage={handleSendMessage}
            externalResults={dealerSearchResults}
            externalQuery={dealerSearchQuery}
            externalDealer={selectedDealer}
          />
        )}
        {mainView === 'dealerSearch' && (
          <DealerSearch
            results={dealerSearchResults}
            searchQuery={dealerSearchQuery}
            onSelectDealer={async (dealerCode) => {
              const details = await api.getDealerDetails(dealerCode)
              setSelectedDealer(details)
              setMainView('dealerDetails')
            }}
            onBack={() => setMainView('dashboard')}
          />
        )}
        {mainView === 'dealerDetails' && selectedDealer && (
          <DealerDetails
            dealer={selectedDealer}
            onBack={() => {
              if (dealerSearchResults.length > 0) {
                setMainView('dealerSearch')
              } else {
                setMainView('dashboard')
              }
            }}
          />
        )}
      </main>
      <ChatArea
        messages={messages}
        onSendMessage={handleSendMessage}
        onRetry={handleRetry}
        isProcessing={isProcessing}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen(prev => !prev)}
      />
      {showBugDialog && <BugReportDialog onClose={() => setShowBugDialog(false)} />}
      {showFeatureDialog && <FeatureRequestDialog onClose={() => setShowFeatureDialog(false)} />}
      {showHelpDialog && <HelpRequestDialog onClose={() => setShowHelpDialog(false)} />}
    </div>
  )
}

export default App
