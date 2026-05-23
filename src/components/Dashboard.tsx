import { LayoutDashboard, TrendingUp, Users, FileText, AlertCircle } from 'lucide-react'
import './Dashboard.css'

function Dashboard() {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="dashboard-subtitle">Overview of your back office operations</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-icon card-icon-blue">
            <FileText size={20} />
          </div>
          <div className="card-content">
            <span className="card-label">One Statements</span>
            <span className="card-value">1,284</span>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-icon card-icon-green">
            <TrendingUp size={20} />
          </div>
          <div className="card-content">
            <span className="card-label">Batch Jobs Today</span>
            <span className="card-value">47</span>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-icon card-icon-purple">
            <Users size={20} />
          </div>
          <div className="card-content">
            <span className="card-label">Active Users</span>
            <span className="card-value">32</span>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-icon card-icon-orange">
            <AlertCircle size={20} />
          </div>
          <div className="card-content">
            <span className="card-label">Errors (24h)</span>
            <span className="card-value">3</span>
          </div>
        </div>
      </div>

      <div className="dashboard-section">
        <h2>Recent Activity</h2>
        <div className="activity-list">
          <div className="activity-item">
            <LayoutDashboard size={16} />
            <span>Batch job <strong>BJ-2026-0523</strong> completed successfully</span>
            <span className="activity-time">2 min ago</span>
          </div>
          <div className="activity-item">
            <FileText size={16} />
            <span>One Statement generated for <strong>BC006642</strong></span>
            <span className="activity-time">15 min ago</span>
          </div>
          <div className="activity-item">
            <Users size={16} />
            <span>New user <strong>john.doe@ia.ca</strong> added</span>
            <span className="activity-time">1 hour ago</span>
          </div>
          <div className="activity-item">
            <AlertCircle size={16} />
            <span>Error resolved in <strong>Sherlock Upload</strong></span>
            <span className="activity-time">3 hours ago</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
