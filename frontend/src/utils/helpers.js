import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { ar } from 'date-fns/locale'

// Format date
export function formatDate(date, formatStr = 'yyyy-MM-dd') {
  if (!date) return '-'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, formatStr, { locale: ar })
}

// Format time
export function formatTime(date) {
  if (!date) return '-'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'HH:mm', { locale: ar })
}

// Format relative time
export function formatRelativeTime(date) {
  if (!date) return '-'
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatDistanceToNow(d, { addSuffix: true, locale: ar })
}

// Format minutes to hours and minutes
export function formatMinutes(minutes) {
  if (!minutes) return '0 min'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

// Get status color
export function getStatusColor(status) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-gray-100 text-gray-800',
    overdue: 'bg-red-100 text-red-800',
    blocked: 'bg-orange-100 text-orange-800',
    present: 'bg-green-100 text-green-800',
    late: 'bg-orange-100 text-orange-800',
    absent: 'bg-red-100 text-red-800',
    vacation: 'bg-purple-100 text-purple-800',
    sick: 'bg-pink-100 text-pink-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

// Get priority color
export function getPriorityColor(priority) {
  const colors = {
    urgent: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
  }
  return colors[priority] || 'bg-gray-500'
}

// Truncate text
export function truncate(text, length = 50) {
  if (!text) return ''
  return text.length > length ? text.slice(0, length) + '...' : text
}

// Translate status
export function translateStatus(status) {
  const translations = {
    pending: 'قيد الانتظار',
    in_progress: 'جاري العمل',
    completed: 'مكتمل',
    cancelled: 'ملغي',
    overdue: 'متأخر',
    blocked: 'محظور',
    present: 'حاضر',
    late: 'متأخر',
    absent: 'غائب',
    vacation: 'إجازة',
    sick: 'مريض',
  }
  return translations[status] || status
}

// Translate priority
export function translatePriority(priority) {
  const translations = {
    urgent: 'عاجل',
    high: 'عالي',
    medium: 'متوسط',
    low: 'منخفض',
  }
  return translations[priority] || priority
}

// Translate role
export function translateRole(role) {
  const translations = {
    admin: 'مدير النظام',
    manager: 'مدير',
    hr: 'موارد بشرية',
    accountant: 'محاسب',
    employee: 'موظف',
  }
  return translations[role] || role
}

/**
 * Export array of objects to CSV and trigger download
 * @param {Object[]} data
 * @param {string} filename
 */
export function exportToCSV(data, filename = 'export.csv') {
  if (!Array.isArray(data) || data.length === 0) return
  const keys = Object.keys(data[0])
  const header = keys.join(',')
  const rows = data.map((row) =>
    keys.map((k) => {
      const v = row[k]
      if (v == null) return ''
      const s = String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }).join(',')
  )
  const csv = '\uFEFF' + [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename.replace(/\.csv$/i, '') + '.csv'
  link.click()
  URL.revokeObjectURL(link.href)
}
