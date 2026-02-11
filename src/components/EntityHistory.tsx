'use client'

import { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Stack,
  Chip,
  Paper
} from '@mui/material'
import { formatDate } from '@/lib/formatters'

interface ActivityLog {
  id: string
  action: string
  description: string
  createdAt: string
  user?: {
    fullName: string
  }
}

interface EntityHistoryProps {
  entity: string
  entityId: string
  limit?: number
}

const actionColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  CREATE: 'success',
  UPDATE: 'primary',
  DELETE: 'error',
  VIEW: 'default',
  LOGIN: 'warning',
  LOGOUT: 'default'
}

export function EntityHistory({ entity, entityId, limit = 10 }: EntityHistoryProps) {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!entityId) return
    setLoading(true)
    fetch(`/api/activities?entity=${encodeURIComponent(entity)}&entityId=${encodeURIComponent(entityId)}&limit=${limit}`)
      .then((res) => res.json())
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [entity, entityId, limit])

  if (loading) {
    return <Typography variant="body2">جاري تحميل السجل...</Typography>
  }

  if (logs.length === 0) {
    return <Typography variant="body2">لا توجد تغييرات مسجلة.</Typography>
  }

  return (
    <Stack spacing={1.5}>
      {logs.map((log) => (
        <Paper key={log.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between">
            <Stack spacing={0.5}>
              <Typography variant="body2" fontWeight="bold">
                {log.description}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {log.user?.fullName || 'غير معروف'} • {formatDate(log.createdAt)}
              </Typography>
            </Stack>
            <Chip label={log.action} size="small" color={actionColors[log.action] || 'default'} />
          </Stack>
        </Paper>
      ))}
    </Stack>
  )
}
