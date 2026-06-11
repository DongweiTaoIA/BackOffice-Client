import { Bug } from 'lucide-react'
import SupportTicketDialog, { type FormFieldConfig } from './SupportTicketDialog'

interface BugReportDialogProps {
  onClose: () => void
}

const formFields: FormFieldConfig[] = [
  { key: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Brief summary of the bug' },
  { key: 'severity', label: 'Severity', type: 'select', required: true, options: [
    { value: 'Critical', label: 'Critical - System down / data loss' },
    { value: 'High', label: 'High - Major feature broken' },
    { value: 'Medium', label: 'Medium - Feature impaired but workaround exists' },
    { value: 'Low', label: 'Low - Minor issue / cosmetic' },
  ]},
  { key: 'description', label: 'Description', type: 'textarea', required: true, placeholder: 'What happened? What did you expect?' },
  { key: 'stepsToReproduce', label: 'Steps to Reproduce', type: 'textarea', placeholder: '1. Go to...\n2. Click on...\n3. See error' },
  { key: 'browser', label: 'Browser', type: 'text', placeholder: 'e.g. Chrome 125, Edge 124' },
  { key: 'os', label: 'Operating System', type: 'text', placeholder: 'e.g. Windows 11, macOS 14' },
]

export default function BugReportDialog({ onClose }: BugReportDialogProps) {
  return (
    <SupportTicketDialog
      ticketType="bug"
      title="Bug Reports"
      icon={<Bug size={18} />}
      iconClass="st-header-icon--bug"
      formFields={formFields}
      onClose={onClose}
    />
  )
}
