import { useState, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import ChatArea from './components/ChatArea'
import './App.css'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [chatOpen, setChatOpen] = useState(true)
  const [activeNavItem, setActiveNavItem] = useState('dashboard')

  const handleSendMessage = useCallback((content: string) => {
    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
  }, [])

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
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(true)}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen(prev => !prev)}
      />
    </div>
  )
}

export default App
