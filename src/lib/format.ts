const auecFormatter = new Intl.NumberFormat('en-US')

export function formatAUEC(value: number): string {
  return auecFormatter.format(Math.round(value))
}

export function formatTime(seconds: number): string {
  if (seconds <= 0) return '00:00:00'

  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  if (d > 0) {
    return `${d}d ${h}h ${String(m).padStart(2, '0')}m`
  }

  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}

export function formatTimeAgo(timestamp: number): string {
  const diffMs = Date.now() - timestamp
  const diffH = Math.floor(diffMs / 3600000)
  if (diffH < 1) return 'just now'
  if (diffH === 1) return '1 hour ago'
  return `${diffH} hours ago`
}
