import { useState } from 'react'
import {
  ChevronLeft,
  ChevronDown,
  LogIn,
  LogOut,
  Code,
  LayoutDashboard,
  Upload,
  FileText,
  CreditCard,
  ClipboardCheck,
  Users,
  Shield,
  Lock,
  BarChart3,
  ClipboardList,
  Database,
  Layers,
  Settings,
  FileCode,
  Puzzle,
  Wrench,
  LifeBuoy,
  Bug,
  Lightbulb,
  HelpCircle,
  BookOpen,
} from 'lucide-react'
import { useAuth } from '../auth/useAuth'
import './Sidebar.css'

interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
}

interface NavSection {
  id: string
  label: string
  icon: React.ReactNode
  badge?: string
  items: NavItem[]
}

interface SidebarProps {
  activeNavItem: string
  onNavItemSelect: (id: string) => void
  isOpen: boolean
  onToggle: () => void
}

const navSections: NavSection[] = [
  {
    id: 'operations',
    label: 'Operations',
    icon: <Code size={14} />,
    items: [
      { id: 'dealers', label: 'Dealers', icon: <Users size={16} /> },
      { id: 'contracts', label: 'Contracts', icon: <FileText size={16} /> },
      { id: 'claims', label: 'Claims', icon: <ClipboardCheck size={16} /> },
    ],
  },
  {
    id: 'tools',
    label: 'Tools',
    icon: <Wrench size={14} />,
    items: [
      { id: 'sherlock-upload', label: 'Sherlock Upload', icon: <Upload size={16} /> },
      { id: 'one-statement', label: 'One Statement', icon: <FileText size={16} /> },
      { id: 'add-clipp-id', label: 'Add Clipp ID', icon: <CreditCard size={16} /> },
    ],
  },
  {
    id: 'user-management',
    label: 'User Management',
    icon: <Users size={14} />,
    badge: 'New',
    items: [
      { id: 'users', label: 'Users', icon: <Users size={16} /> },
      { id: 'roles', label: 'Roles', icon: <Shield size={16} /> },
      { id: 'permissions', label: 'Permissions', icon: <Lock size={16} /> },
    ],
  },
  {
    id: 'data-reports',
    label: 'Data & Reports',
    icon: <BarChart3 size={14} />,
    items: [
      { id: 'reports', label: 'Reports', icon: <BarChart3 size={16} /> },
      { id: 'audit-logs', label: 'Audit Logs', icon: <ClipboardList size={16} /> },
      { id: 'data-export', label: 'Data Export', icon: <Database size={16} /> },
      { id: 'batches', label: 'Batches', icon: <Layers size={16} /> },
    ],
  },
  {
    id: 'configuration',
    label: 'Configuration',
    icon: <Settings size={14} />,
    items: [
      { id: 'system-settings', label: 'System Settings', icon: <Settings size={16} /> },
      { id: 'templates', label: 'Templates', icon: <FileCode size={16} /> },
      { id: 'integrations', label: 'Integrations', icon: <Puzzle size={16} /> },
    ],
  },
  {
    id: 'support-feedback',
    label: 'Support & Feedback',
    icon: <LifeBuoy size={14} />,
    items: [
      { id: 'report-bug', label: 'Report a Bug', icon: <Bug size={16} /> },
      { id: 'request-feature', label: 'Request a Feature', icon: <Lightbulb size={16} /> },
      { id: 'ask-for-help', label: 'Ask for Help', icon: <HelpCircle size={16} /> },
    ],
  },
  {
    id: 'documentation',
    label: 'Documentation',
    icon: <BookOpen size={14} />,
    items: [],
  },
]

function Sidebar({ activeNavItem, onNavItemSelect, isOpen, onToggle }: SidebarProps) {
  const { isAuthenticated, isLoading, userProfile, login, logout } = useAuth()
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>
      <div className="sidebar-header">
        {isOpen && (
          <div className="logo">
            <span className="logo-text">Backoffice Admin</span>
          </div>
        )}
        <button className="collapse-btn" onClick={onToggle} title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
          {isOpen ? <ChevronLeft size={20} /> : <ChevronDown size={20} style={{ transform: 'rotate(-90deg)' }} />}
        </button>
      </div>

      <button
        className={`new-chat-btn ${activeNavItem === 'dashboard' ? 'active' : ''}`}
        onClick={() => onNavItemSelect('dashboard')}
        title="Dashboard"
      >
        <LayoutDashboard size={20} />
        {isOpen && <span>Dashboard</span>}
      </button>

      <nav className="nav-list">
        {navSections.map(section => {
          const isCollapsed = collapsedSections.has(section.id)
          return (
            <div key={section.id} className="nav-section">
              {isOpen && (
                <div className="nav-section-header" onClick={() => toggleSection(section.id)}>
                  <span className="nav-section-label">
                    <span className="section-icon">{section.icon}</span>
                    {section.label}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {section.badge && (
                      <span className="nav-section-badge">{section.badge}</span>
                    )}
                    {section.items.length > 0 && (
                      <ChevronDown
                        size={14}
                        className={`nav-section-chevron ${isCollapsed ? 'collapsed' : ''}`}
                      />
                    )}
                  </div>
                </div>
              )}
              {section.items.length > 0 && (isOpen ? !isCollapsed : true) && (
                <div className={`nav-section-items ${isCollapsed ? 'collapsed' : ''}`}>
                  {section.items.map(item => (
                    <button
                      key={item.id}
                      className={`nav-item ${activeNavItem === item.id ? 'active' : ''}`}
                      onClick={() => onNavItemSelect(item.id)}
                      title={item.label}
                    >
                      {item.icon}
                      {isOpen && item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        {!isAuthenticated ? (
          <button
            className="sidebar-login-link"
            onClick={login}
            disabled={isLoading}
            title="Sign in"
          >
            <LogIn size={20} />
            {isOpen && <span>{isLoading ? 'Signing in...' : 'Sign in with Microsoft'}</span>}
          </button>
        ) : (
          <div className="sidebar-user-profile">
            <div className="user-avatar">
              {userProfile?.initials || 'U'}
            </div>
            {isOpen && (
              <div className="user-info">
                <span className="user-name">{userProfile?.displayName || 'User'}</span>
                <span className="user-email">{userProfile?.email || ''}</span>
              </div>
            )}
            <button className="user-logout-btn" onClick={logout} title="Sign out">
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
