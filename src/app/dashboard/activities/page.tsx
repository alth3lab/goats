'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useMediaQuery,
  Card,
  CardContent,
  Grid,
  Divider
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  History as HistoryIcon,
  Search as SearchIcon,
  Download as DownloadIcon
} from '@mui/icons-material'
import { formatDate } from '@/lib/formatters'
import { useAuth } from '@/lib/useAuth'

interface ActivityLog {
  id: string
  action: string
  entity: string
  description: string
  createdAt: string
  user?: {
    fullName: string
    username: string
  }
}

const actionColors: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  CREATE: 'success',
  UPDATE: 'primary',
  DELETE: 'error',
  VIEW: 'default',
  LOGIN: 'warning',
  LOGOUT: 'default'
}

export default function ActivitiesPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { can, loading: authLoading } = useAuth()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const [action, setAction] = useState('ALL')
  const [entity, setEntity] = useState('ALL')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())
    if (action && action !== 'ALL') params.set('action', action)
    if (entity && entity !== 'ALL') params.set('entity', entity)
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    return params
  }, [search, action, entity, from, to])

  useEffect(() => {
    setPage(1)
    setHasMore(true)
    setLogs([])
  }, [queryParams])

  useEffect(() => {
    const limit = 50
    setLoading(true)
    fetch(`/api/activities?${queryParams.toString()}&page=${page}&limit=${limit}`)
      .then(res => res.json())
      .then(data => {
        const rows = Array.isArray(data) ? data : []
        setLogs((prev) => (page === 1 ? rows : [...prev, ...rows]))
        setHasMore(rows.length === limit)
      })
      .finally(() => setLoading(false))
  }, [queryParams, page])

  const handleExport = async () => {
    const params = new URLSearchParams(queryParams)
    params.set('format', 'csv')
    const res = await fetch(`/api/activities?${params.toString()}`)
    const blob = await res.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `activity-log-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  if (!authLoading && !can('view_activities')) {
    return (
      <Box>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight="bold">
            ليس لديك صلاحية لعرض سجل النشاطات.
          </Typography>
        </Paper>
      </Box>
    )
  }

  return (
    <Box sx={{ width: '100%', overflowX: 'hidden' }}>
      <Paper sx={{ p: 3, mb: 2, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <HistoryIcon color="primary" />
            <Typography variant="h4" fontWeight="bold">سجل النشاطات</Typography>
          </Stack>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport} sx={{ width: { xs: '100%', md: 'auto' } }}>
            تصدير CSV
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField
            placeholder="بحث في الوصف أو المستخدم..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              )
            }}
            fullWidth
          />
          <FormControl sx={{ minWidth: { xs: '100%', md: 160 } }}>
            <InputLabel id="activity-action">الإجراء</InputLabel>
            <Select
              labelId="activity-action"
              label="الإجراء"
              value={action}
              onChange={(event) => setAction(event.target.value)}
            >
              <MenuItem value="ALL">الكل</MenuItem>
              <MenuItem value="CREATE">إضافة</MenuItem>
              <MenuItem value="UPDATE">تعديل</MenuItem>
              <MenuItem value="DELETE">حذف</MenuItem>
              <MenuItem value="LOGIN">تسجيل دخول</MenuItem>
              <MenuItem value="LOGOUT">تسجيل خروج</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: { xs: '100%', md: 160 } }}>
            <InputLabel id="activity-entity">الكيان</InputLabel>
            <Select
              labelId="activity-entity"
              label="الكيان"
              value={entity}
              onChange={(event) => setEntity(event.target.value)}
            >
              <MenuItem value="ALL">الكل</MenuItem>
              <MenuItem value="User">المستخدمين</MenuItem>
              <MenuItem value="UserPermission">صلاحيات المستخدم</MenuItem>
              <MenuItem value="GoatType">الأنواع</MenuItem>
              <MenuItem value="Breed">السلالات</MenuItem>
              <MenuItem value="Goat">الماعز</MenuItem>
              <MenuItem value="Pen">الحظائر</MenuItem>
              <MenuItem value="Sale">المبيعات</MenuItem>
              <MenuItem value="Expense">المصروفات</MenuItem>
              <MenuItem value="Health">الصحة</MenuItem>
              <MenuItem value="Breeding">التكاثر</MenuItem>
              <MenuItem value="Settings">الإعدادات</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="من"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: { xs: '100%', md: 150 } }}
          />
          <TextField
            label="إلى"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: { xs: '100%', md: 150 } }}
          />
        </Stack>
      </Paper>

      {/* Mobile Cards View */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <Stack spacing={2}>
          {loading ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>جاري التحميل...</Paper>
          ) : logs.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>لا توجد سجلات</Paper>
          ) : (
            logs.map(log => (
              <Card key={log.id} sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Stack spacing={2}>
                    {/* Header */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {log.user?.fullName || 'غير معروف'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {log.user?.username || '-'}
                        </Typography>
                      </Box>
                      <Chip label={log.action} size="small" color={actionColors[log.action] || 'default'} />
                    </Stack>

                    <Divider />

                    {/* Details */}
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">الكيان</Typography>
                        <Typography variant="body1">{log.entity}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">التاريخ</Typography>
                        <Typography variant="body1">{formatDate(log.createdAt)}</Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">الوصف</Typography>
                        <Typography variant="body1">{log.description}</Typography>
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
              </Card>
            ))
          )}
        </Stack>
      </Box>

      {/* Desktop Table View */}
      <TableContainer component={Paper} sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 3, overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell><strong>المستخدم</strong></TableCell>
              <TableCell><strong>الإجراء</strong></TableCell>
              <TableCell><strong>الكيان</strong></TableCell>
              <TableCell><strong>الوصف</strong></TableCell>
              <TableCell><strong>التاريخ</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} align="center">جاري التحميل...</TableCell></TableRow>
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center">لا توجد سجلات</TableCell></TableRow>
            ) : (
              logs.map(log => (
                <TableRow key={log.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {log.user?.fullName || 'غير معروف'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {log.user?.username || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={log.action} size="small" color={actionColors[log.action] || 'default'} />
                  </TableCell>
                  <TableCell>{log.entity}</TableCell>
                  <TableCell>{log.description}</TableCell>
                  <TableCell>{formatDate(log.createdAt)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {hasMore && !loading && (
        <Stack alignItems="center" mt={2}>
          <Button variant="outlined" onClick={() => setPage((prev) => prev + 1)}>
            تحميل المزيد
          </Button>
        </Stack>
      )}
    </Box>
  )
}
