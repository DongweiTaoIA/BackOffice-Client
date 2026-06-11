import { HelpCircle } from 'lucide-react'
import SupportTicketDialog, { type FormFieldConfig } from './SupportTicketDialog'

interface HelpRequestDialogProps {
  onClose: () => void
}

const formFields: FormFieldConfig[] = [
  { key: 'title', label: 'Title', type: 'text', required: true, placeholder: 'What do you need help with?' },
  { key: 'urgency', label: 'Urgency', type: 'select', required: true, options: [
    { value: 'Blocking', label: 'Blocking - I cannot proceed without help' },
    { value: 'Non-blocking', label: 'Non-blocking - I can work around it for now' },
  ]},
  { key: 'description', label: 'Description', type: 'textarea', required: true, placeholder: 'Describe the issue or question in detail...' },
  { key: 'relatedModule', label: 'Related System / Module', type: 'text', placeholder: 'e.g. Contracts, Claims, Sherlock, One Statement' },
]

export default function HelpRequestDialog({ onClose }: HelpRequestDialogProps) {
  return (
    <SupportTicketDialog
      ticketType="help"
      title="Help Requests"
      icon={<HelpCircle size={18} />}
      iconClass="st-header-icon--help"
      formFields={formFields}
      onClose={onClose}
    />
  )
}
