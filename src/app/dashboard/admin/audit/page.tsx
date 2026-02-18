'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Box, Paper, Typography, Button, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, LinearProgress, TextField,
  FormControl, InputLabel, Select, MenuItem, IconButton, Tooltip,
  Pagination,
} from '@mui/material'
import HistoryIcon from '@mui/icons-material/History'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SearchIcon from '@mui/icons-material/Search'
import { useAuth } from '@/lib/useAuth'
import { useRouter } from 'next/navigation'

interface AuditLog {
  id: string
  tenantId: string
  tenantName: string
  userId: string
  user: { id: string; fullName: string; username: string; role: string }
  action: string
  entity: string
  entityId: string | null
  description: string
  ipAddress: string | null
  createdAt: string
}

const actionLabels: Record<string, { label: string; color: 'success' | 'error' | 'warning' | 'info' | 'primary' | 'default' }> = {
  CREATE: { label: 'إنشاء', color: 'success' },
  UPDATE: { label: 'تعديل', color: 'info' },
  DELETE: { label: 'حذف', color: 'error' },
  ADMIN_ACTION: { label: 'إجراء إداري', color: 'warning' },
  LOGIN: { label: 'تسجيل دخول', color: 'primary' },
}

const entityLabels: Record<string, string> = {
  Tenant: 'مستأجر',
  User: 'مستخدم',
  Farm: 'مزرعة',
  Goat: 'ماعز',
  HealthRecord: 'سجل صحي',
  Breeding: 'تكاثر',
  Sale: 'بيع',
  Expense: 'مصروف',
  SystemSetting: 'إعدادات النظام',
  Pen: 'حظيرة',
  Birth: 'ولادة',
  Subscription: 'اشتراك',
}

export default function AuditLogPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [filterAction, setFilterAction] = useState('')
  const [filterEntity, setFilterEntity] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '30' })
      if (filterAction) params.set('action', filterAction)
      if (filterEntity) params.set('entity', filterEntity)
      if (search) params.set('search', search)

      const res = await fetch(`/api/admin/audit?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs)
        setTotalPages(data.totalPages)
        setTotal(data.total)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [page, filterAction, filterEntity, search])

  useEffect(() => {
    if (!authLoading && user?.role !== 'SUPER_ADMIN') {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  if (authLoading) return <LinearProgress />
  if (user?.role !== 'SUPER_ADMIN') return null

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <IconButton onClick={() => router.push('/dashboard/admin')}>
            <ArrowBackIcon />
          </IconButton>
          <HistoryIcon color="primary" sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">سجل تدقيق النظام</Typography>
            <Typography variant="body2" color="text.secondary">
              جميع الأنشطة الإدارية عبر كل المستأجرين ({total} سجل)
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <TextField
            size="small"
            placeholder="بحث..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1) } }}
            slotProps={{ input: { endAdornment: (
              <IconButton size="small" onClick={() => { setSearch(searchInput); setPage(1) }}>
                <SearchIcon fontSize="small" />
              </IconButton>
            )}}}
            sx={{ minWidth: 250 }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>الإجراء</InputLabel>
            <Select value={filterAction} label="الإجراء" onChange={(e) => { setFilterAction(e.target.value); setPage(1) }}>
              <MenuItem value="">الكل</MenuItem>
              <MenuItem value="CREATE">إنشاء</MenuItem>
              <MenuItem value="UPDATE">تعديل</MenuItem>
              <MenuItem value="DELETE">حذف</MenuItem>
              <MenuItem value="ADMIN_ACTION">إجراء إداري</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>الكيان</InputLabel>
            <Select value={filterEntity} label="الكيان" onChange={(e) => { setFilterEntity(e.target.value); setPage(1) }}>
              <MenuItem value="">الكل</MenuItem>
              {Object.entries(entityLabels).map(([k, v]) => (
                <MenuItem key={k} value={k}>{v}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            size="small"
            onClick={() => { setFilterAction(''); setFilterEntity(''); setSearch(''); setSearchInput(''); setPage(1) }}
          >
            مسح الفلاتر
          </Button>
        </Stack>
      </Paper>

      {/* Logs Table */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        {loading ? <LinearProgress /> : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>المستأجر</TableCell>
                  <TableCell>المستخدم</TableCell>
                  <TableCell>الإجراء</TableCell>
                  <TableCell>الكيان</TableCell>
                  <TableCell>الوصف</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((log) => {
                  const actionInfo = actionLabels[log.action] || { label: log.action, color: 'default' as const }
                  return (
                    <TableRow key={log.id} hover>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="body2">
                          {new Date(log.createdAt).toLocaleDateString('ar-AE')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(log.createdAt).toLocaleTimeString('ar-AE')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{log.tenantName}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">{log.user?.fullName || '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          @{log.user?.username}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={actionInfo.label} color={actionInfo.color} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {entityLabels[log.entity] || log.entity}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 300 }}>
                        <Tooltip title={log.description}>
                          <Typography variant="body2" noWrap>{log.description}</Typography>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {logs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>لا توجد سجلات</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {totalPages > 1 && (
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, v) => setPage(v)}
              color="primary"
            />
          </Box>
        )}
      </Paper>
    </Box>
  )
}
