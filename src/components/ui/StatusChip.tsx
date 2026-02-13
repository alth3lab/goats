'use client'

import { Chip } from '@mui/material'

type GoatStatus = 'ACTIVE' | 'SOLD' | 'DECEASED' | 'QUARANTINE'
type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID'
type AppStatus = GoatStatus | PaymentStatus

type Lang = 'ar' | 'en'

interface StatusChipProps {
  status: AppStatus
  lang?: Lang
  labels?: Partial<Record<AppStatus, string>>
  size?: 'small' | 'medium'
}

const defaultLabels: Record<Lang, Record<AppStatus, string>> = {
  ar: {
    ACTIVE: 'نشط',
    SOLD: 'مباع',
    DECEASED: 'متوفى',
    QUARANTINE: 'حجر صحي',
    PENDING: 'معلق',
    PARTIAL: 'جزئي',
    PAID: 'مدفوع'
  },
  en: {
    ACTIVE: 'Active',
    SOLD: 'Sold',
    DECEASED: 'Deceased',
    QUARANTINE: 'Quarantine',
    PENDING: 'Pending',
    PARTIAL: 'Partial',
    PAID: 'Paid'
  }
}

const statusStyles: Record<AppStatus, { bg: string; color: string; border: string }> = {
  ACTIVE: { bg: '#E9F5ED', color: '#2F6A40', border: '#CFE7D6' },
  SOLD: { bg: '#EEF3F8', color: '#3A536A', border: '#D6E2EE' },
  DECEASED: { bg: '#FDEBEB', color: '#A34B4B', border: '#F6D2D2' },
  QUARANTINE: { bg: '#FFF4E6', color: '#9B6A2D', border: '#F4DFC2' },
  PENDING: { bg: '#FFF6EA', color: '#9C6C2F', border: '#F2E2C9' },
  PARTIAL: { bg: '#EDF2F7', color: '#4D6073', border: '#D8E1EB' },
  PAID: { bg: '#E9F5ED', color: '#2F6A40', border: '#CFE7D6' }
}

export function StatusChip({ status, lang = 'ar', labels, size = 'small' }: StatusChipProps) {
  const style = statusStyles[status]
  const label = labels?.[status] || defaultLabels[lang][status]

  return (
    <Chip
      size={size}
      label={label}
      sx={{
        bgcolor: style.bg,
        color: style.color,
        border: '1px solid',
        borderColor: style.border,
        fontWeight: 700,
        borderRadius: 999
      }}
    />
  )
}
