export const formatDate = (value?: string | Date | null) => {
  if (!value) return '-'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
}

export const formatNumber = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') return '-'
  const num = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(num)) return '-'
  return new Intl.NumberFormat('en-US').format(num)
}

export const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined) return '-'
  return `${formatNumber(value)} درهم`
}
