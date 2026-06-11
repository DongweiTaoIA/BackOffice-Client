import { Lightbulb } from 'lucide-react'
import SupportTicketDialog, { type FormFieldConfig } from './SupportTicketDialog'

interface FeatureRequestDialogProps {
  onClose: () => void
}

const formFields: FormFieldConfig[] = [
  { key: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Brief summary of the feature' },
  { key: 'priority', label: 'Priority', type: 'select', required: true, options: [
    { value: 'Must-have', label: 'Must-have - Critical for workflow' },
    { value: 'Nice-to-have', label: 'Nice-to-have - Would improve experience' },
  ]},
  { key: 'description', label: 'Description', type: 'textarea', required: true, placeholder: 'Describe the feature you would like...' },
  { key: 'useCase', label: 'Use Case / Business Justification', type: 'textarea', placeholder: 'Why is this needed? What problem does it solve?' },
]

export default function FeatureRequestDialog({ onClose }: FeatureRequestDialogProps) {
  return (
    <SupportTicketDialog
      ticketType="feature"
      title="Feature Requests"
      icon={<Lightbulb size={18} />}
      iconClass="st-header-icon--feature"
      formFields={formFields}
      onClose={onClose}
    />
  )
}
