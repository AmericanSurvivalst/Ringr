import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

export function formatPhoneNumber(phone: string | null): string {
  if (!phone) return 'Unknown'
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  return phone
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  return new Date(date).toLocaleDateString('en-US', options || {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)} at ${formatTime(date)}`
}

export function getInitials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function getOutcomeLabel(outcome: string | null): string {
  const labels: Record<string, string> = {
    'appointment_booked': 'Appointment Booked',
    'callback_requested': 'Callback Requested',
    'information_provided': 'Info Provided',
    'not_qualified': 'Not Qualified',
    'voicemail': 'Voicemail',
    'transferred': 'Transferred',
    'other': 'Other'
  }
  return outcome ? labels[outcome] || outcome : 'Unknown'
}

export function getOutcomeColor(outcome: string | null): string {
  const colors: Record<string, string> = {
    'appointment_booked': 'bg-green-100 text-green-700',
    'callback_requested': 'bg-blue-100 text-blue-700',
    'information_provided': 'bg-gray-100 text-gray-700',
    'not_qualified': 'bg-orange-100 text-orange-700',
    'voicemail': 'bg-yellow-100 text-yellow-700',
    'transferred': 'bg-purple-100 text-purple-700',
    'other': 'bg-gray-100 text-gray-700'
  }
  return outcome ? colors[outcome] || 'bg-gray-100 text-gray-700' : 'bg-gray-100 text-gray-700'
}

export function getSentimentColor(sentiment: string | null): string {
  const colors: Record<string, string> = {
    'positive': 'text-green-600',
    'neutral': 'text-gray-600',
    'negative': 'text-red-600'
  }
  return sentiment ? colors[sentiment] || 'text-gray-600' : 'text-gray-600'
}

export function getSentimentIcon(sentiment: string | null): string {
  const icons: Record<string, string> = {
    'positive': '😊',
    'neutral': '😐',
    'negative': '😟'
  }
  return sentiment ? icons[sentiment] || '😐' : '😐'
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Subscription statuses
    'trialing': 'bg-blue-100 text-blue-700',
    'active': 'bg-green-100 text-green-700',
    'past_due': 'bg-red-100 text-red-700',
    'canceled': 'bg-gray-100 text-gray-700',
    'locked': 'bg-red-100 text-red-700',
    // Appointment statuses
    'scheduled': 'bg-blue-100 text-blue-700',
    'confirmed': 'bg-green-100 text-green-700',
    'completed': 'bg-gray-100 text-gray-700',
    'cancelled': 'bg-red-100 text-red-700',
    'no_show': 'bg-orange-100 text-orange-700',
    // Call statuses
    'in_progress': 'bg-blue-100 text-blue-700',
    'failed': 'bg-red-100 text-red-700',
    'missed': 'bg-orange-100 text-orange-700'
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural || `${singular}s`)
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0
  return Math.round((value / total) * 100)
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}
