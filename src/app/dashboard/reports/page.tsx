
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  TextField,
  Alert,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableFooter,
  Chip,
  MenuItem,
  CircularProgress,
  Divider,
  IconButton,
  Tooltip,
  InputAdornment,
} from '@mui/material'
import {
  Assessment as ReportsIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Pets as PetsIcon,
  FilterAlt as FilterIcon,
  Refresh as RefreshIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
} from '@mui/icons-material'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { generateArabicPDF } from '@/lib/pdfHelper'
import { useAuth } from '@/lib/useAuth'
import { getAnimalLabels } from '@/lib/animalLabels'
import * as XLSX from 'xlsx'

/* â”€â”€â”€â”€â”€ Constants â”€â”€â”€â”€â”€ */
const categoryLabels: Record<string, string> = {
  FEED: 'ط¹ظ„ظپ', MEDICINE: 'ط¯ظˆط§ط،', EQUIPMENT: 'ظ…ط¹ط¯ط§طھ', LABOR: 'ط¹ظ…ط§ظ„ط©',
  UTILITIES: 'ظ…ط±ط§ظپظ‚', MAINTENANCE: 'طµظٹط§ظ†ط©', TRANSPORT: 'ظ†ظ‚ظ„', OTHER: 'ط£ط®ط±ظ‰',
}

const paymentStatusLabels: Record<string, string> = {
  PAID: 'ظ…ط¯ظپظˆط¹', PENDING: 'ظ…ط¹ظ„ظ‚', CANCELLED: 'ظ…ظ„ط؛ظٹ', PARTIAL: 'ط¬ط²ط¦ظٹ',
}

const paymentStatusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  PAID: 'success', PENDING: 'warning', CANCELLED: 'error', PARTIAL: 'default',
}

const healthTypeLabels: Record<string, string> = {
  VACCINATION: 'طھط·ط¹ظٹظ…', TREATMENT: 'ط¹ظ„ط§ط¬', CHECKUP: 'ظپط­طµ',
  SURGERY: 'ط¬ط±ط§ط­ط©', MEDICATION: 'ط¯ظˆط§ط،', OTHER: 'ط£ط®ط±ظ‰',
}

const breedingResultLabels: Record<string, string> = {
  SUCCESS: 'ظ†ط§ط¬ط­', FAILED: 'ظپط§ط´ظ„', PENDING: 'ظ‚ظٹط¯ ط§ظ„ط§ظ†طھط¸ط§ط±', BORN: 'ظˆظ„ط¯',
}

const breedingResultColors: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
  SUCCESS: 'success', FAILED: 'error', PENDING: 'warning', BORN: 'info',
}

const goatStatusLabels: Record<string, string> = {
  ACTIVE: 'ظ†ط´ط·', SOLD: 'ظ…ط¨ط§ط¹', DEAD: 'ظ†ط§ظپظ‚', SLAUGHTERED: 'ظ…ط°ط¨ظˆط­',
}

const goatStatusColors: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  ACTIVE: 'success', SOLD: 'warning', DEAD: 'error', SLAUGHTERED: 'default',
}

/* â”€â”€â”€â”€â”€ Helpers â”€â”€â”€â”€â”€ */
const today = () => new Date().toISOString().split('T')[0]
const firstOfMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
const fmt = (dateStr?: string | null) => {
  if (!dateStr) return 'â€”'
  return new Date(dateStr).toLocaleDateString('ar-AE')
}

/* â”€â”€â”€â”€â”€ Empty-state component â”€â”€â”€â”€â”€ */
function EmptyState({ message }: { message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={99} align="center" sx={{ py: 6 }}>
        <Typography color="text.secondary">{message}</Typography>
      </TableCell>
    </TableRow>
  )
}

/* â”€â”€â”€â”€â”€ Loading row â”€â”€â”€â”€â”€ */
function LoadingRow() {
  return (
    <TableRow>
      <TableCell colSpan={99} align="center" sx={{ py: 4 }}>
        <CircularProgress size={28} />
      </TableCell>
    </TableRow>
  )
}

/* â”€â”€â”€â”€â”€ Section header inside a tab â”€â”€â”€â”€â”€ */
function TabHeader({
  title,
  count,
  onExcelExport,
  onPdfExport,
  onRefresh,
  loading,
}: {
  title: string
  count: number
  onExcelExport: () => void
  onPdfExport: () => void
  onRefresh: () => void
  loading: boolean
}) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={2} spacing={1}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="h6" fontWeight="bold">{title}</Typography>
        {count > 0 && (
          <Chip label={formatNumber(count)} size="small" color="primary" />
        )}
      </Stack>
      <Stack direction="row" spacing={1}>
        <Tooltip title="طھط­ط¯ظٹط« ط§ظ„ط¨ظٹط§ظ†ط§طھ">
          <span>
            <IconButton size="small" onClick={onRefresh} disabled={loading}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ExcelIcon />}
          onClick={onExcelExport}
          disabled={loading || count === 0}
          sx={{ color: 'success.main', borderColor: 'success.main' }}
        >
          Excel
        </Button>
        <Button
          size="small"
          variant="contained"
          startIcon={<PdfIcon />}
          onClick={onPdfExport}
          disabled={loading || count === 0}
        >
          PDF
        </Button>
      </Stack>
    </Stack>
  )
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   TAB 1 â€“ Sales Report
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function SalesTab({ animalLbl }: { animalLbl: ReturnType<typeof getAnimalLabels> }) {
  const [dateFrom, setDateFrom] = useState(firstOfMonth())
  const [dateTo, setDateTo] = useState(today())
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<Sale[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)
      params.set('limit', '9999')
      const res = await fetch(`/api/sales?${params}`)
      const json = await res.json()
      setRows(Array.isArray(json) ? json : json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = useMemo(() => {
    let data = rows
    if (statusFilter) data = data.filter(r => r.status === statusFilter)
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(r =>
        r.goat?.tagId?.toLowerCase().includes(q) ||
        r.buyerName?.toLowerCase().includes(q) ||
        r.goat?.breed?.toLowerCase().includes(q)
      )
    }
    return data
  }, [rows, statusFilter, search])

  const total = useMemo(() => filtered.reduce((s, r) => s + (r.price ?? 0), 0), [filtered])
  const paid = useMemo(() => filtered.filter(r => r.status === 'PAID').reduce((s, r) => s + (r.price ?? 0), 0), [filtered])
  const pending = useMemo(() => filtered.filter(r => r.status === 'PENDING').reduce((s, r) => s + (r.price ?? 0), 0), [filtered])

  const exportExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(filtered.map(r => ({
      'ط§ظ„طھط§ط±ظٹط®': fmt(r.saleDate),
      'ط±ظ‚ظ… ط§ظ„ط­ظٹظˆط§ظ†': r.goat?.tagId ?? 'â€”',
      'ط§ظ„ط³ظ„ط§ظ„ط©': r.goat?.breed ?? 'â€”',
      'ط§ظ„ظ…ط´طھط±ظٹ': r.buyerName ?? 'â€”',
      'ظ‡ط§طھظپ ط§ظ„ظ…ط´طھط±ظٹ': r.buyerPhone ?? 'â€”',
      'ط§ظ„ط³ط¹ط±': r.price,
      'ط§ظ„ط­ط§ظ„ط©': paymentStatusLabels[r.status] ?? r.status,
      'ظ…ظ„ط§ط­ط¸ط§طھ': r.notes ?? '',
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, 'طھظ‚ط±ظٹط± ط§ظ„ظ…ط¨ظٹط¹ط§طھ')
    XLSX.writeFile(wb, `sales-report-${dateFrom}-${dateTo}.xlsx`)
  }

  const exportPdf = async () => {
    await generateArabicPDF({
      title: `طھظ‚ط±ظٹط± ط§ظ„ظ…ط¨ظٹط¹ط§طھ (${fmt(dateFrom)} â€“ ${fmt(dateTo)})`,
      date: new Date().toLocaleDateString('ar-AE'),
      stats: [
        { label: 'ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ط¨ظٹط¹ط§طھ', value: formatCurrency(total) },
        { label: 'ط§ظ„ظ…ط¨ط§ظ„ط؛ ط§ظ„ظ…ط¯ظپظˆط¹ط©', value: formatCurrency(paid) },
        { label: 'ط§ظ„ظ…ط¨ط§ظ„ط؛ ط§ظ„ظ…ط¹ظ„ظ‚ط©', value: formatCurrency(pending) },
        { label: 'ط¹ط¯ط¯ ط¹ظ…ظ„ظٹط§طھ ط§ظ„ط¨ظٹط¹', value: filtered.length },
      ],
      columns: [
        { header: 'ط§ظ„طھط§ط±ظٹط®', dataKey: 'date' },
        { header: 'ط±ظ‚ظ… ط§ظ„ط­ظٹظˆط§ظ†', dataKey: 'tagId' },
        { header: 'ط§ظ„ط³ظ„ط§ظ„ط©', dataKey: 'breed' },
        { header: 'ط§ظ„ظ…ط´طھط±ظٹ', dataKey: 'buyer' },
        { header: 'ط§ظ„ط³ط¹ط±', dataKey: 'price' },
        { header: 'ط§ظ„ط­ط§ظ„ط©', dataKey: 'status' },
      ],
      data: filtered.map(r => ({
        date: fmt(r.saleDate),
        tagId: r.goat?.tagId ?? 'â€”',
        breed: r.goat?.breed ?? 'â€”',
        buyer: r.buyerName ?? 'â€”',
        price: formatCurrency(r.price ?? 0),
        status: paymentStatusLabels[r.status] ?? r.status,
      })),
      totals: {
        date: 'ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ',
        tagId: '',
        breed: '',
        buyer: `${filtered.length} ط¹ظ…ظ„ظٹط©`,
        price: formatCurrency(total),
        status: '',
      },
      filename: `sales-report-${dateFrom}-${dateTo}.pdf`,
    })
  }

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap="wrap">
          <FilterIcon color="action" sx={{ alignSelf: 'center' }} />
          <TextField label="ظ…ظ† طھط§ط±ظٹط®" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} size="small" sx={{ minWidth: 150 }} />
          <TextField label="ط¥ظ„ظ‰ طھط§ط±ظٹط®" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} size="small" sx={{ minWidth: 150 }} />
          <TextField select label="ط­ط§ظ„ط© ط§ظ„ط¯ظپط¹" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} size="small" sx={{ minWidth: 140 }}>
            <MenuItem value="">ط§ظ„ظƒظ„</MenuItem>
            {Object.entries(paymentStatusLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </TextField>
          <TextField
            label="ط¨ط­ط«" value={search} onChange={e => setSearch(e.target.value)} size="small" sx={{ flex: 1, minWidth: 160 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment> : null,
            }}
          />
        </Stack>
      </Paper>
      <TabHeader title="طھظ‚ط±ظٹط± ط§ظ„ظ…ط¨ظٹط¹ط§طھ" count={filtered.length} onExcelExport={exportExcel} onPdfExport={exportPdf} onRefresh={fetchData} loading={loading} />
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>ط§ظ„طھط§ط±ظٹط®</TableCell>
              <TableCell>ط±ظ‚ظ… {animalLbl.singular}</TableCell>
              <TableCell>ط§ظ„ط³ظ„ط§ظ„ط©</TableCell>
              <TableCell>ط§ظ„ظ…ط´طھط±ظٹ</TableCell>
              <TableCell align="right">ط§ظ„ط³ط¹ط±</TableCell>
              <TableCell>ط§ظ„ط­ط§ظ„ط©</TableCell>
              <TableCell>ظ…ظ„ط§ط­ط¸ط§طھ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? <LoadingRow /> : filtered.length === 0 ? <EmptyState message="ظ„ط§ طھظˆط¬ط¯ ظ…ط¨ظٹط¹ط§طھ ظپظٹ ظ‡ط°ظ‡ ط§ظ„ظپطھط±ط©" /> : (
              filtered.map((row, idx) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{idx + 1}</TableCell>
                  <TableCell>{fmt(row.saleDate)}</TableCell>
                  <TableCell><strong>{row.goat?.tagId ?? 'â€”'}</strong></TableCell>
                  <TableCell>{row.goat?.breed ?? 'â€”'}</TableCell>
                  <TableCell>
                    <div>{row.buyerName ?? 'â€”'}</div>
                    {row.buyerPhone && <Typography variant="caption" color="text.secondary">{row.buyerPhone}</Typography>}
                  </TableCell>
                  <TableCell align="right"><strong>{formatCurrency(row.price ?? 0)}</strong></TableCell>
                  <TableCell>
                    <Chip label={paymentStatusLabels[row.status] ?? row.status} size="small" color={paymentStatusColors[row.status] ?? 'default'} />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{row.notes ?? 'â€”'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {!loading && filtered.length > 0 && (
            <TableFooter>
              <TableRow sx={{ bgcolor: 'primary.50', '& td': { fontWeight: 'bold', borderTop: '2px solid', borderColor: 'primary.200' } }}>
                <TableCell colSpan={5}>
                  <Stack direction="row" spacing={3}>
                    <span>ط§ظ„ط¹ظ…ظ„ظٹط§طھ: {formatNumber(filtered.length)}</span>
                    <span style={{ color: '#2e7d32' }}>ظ…ط¯ظپظˆط¹: {formatCurrency(paid)}</span>
                    <span style={{ color: '#ed6c02' }}>ظ…ط¹ظ„ظ‚: {formatCurrency(pending)}</span>
                  </Stack>
                </TableCell>
                <TableCell align="right" colSpan={3}>{formatCurrency(total)} ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </TableContainer>
    </Box>
  )
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   TAB 2 â€“ Expenses Report
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function ExpensesTab() {
  const [dateFrom, setDateFrom] = useState(firstOfMonth())
  const [dateTo, setDateTo] = useState(today())
  const [categoryFilter, setCategoryFilter] = useState('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<Expense[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)
      params.set('limit', '9999')
      const res = await fetch(`/api/expenses?${params}`)
      const json = await res.json()
      setRows(Array.isArray(json) ? json : json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = useMemo(() => {
    let data = rows
    if (categoryFilter) data = data.filter(r => r.category === categoryFilter)
    if (search) {
      const q = search.toLowerCase()
      data = data.filter(r => r.description?.toLowerCase().includes(q) || r.notes?.toLowerCase().includes(q))
    }
    return data
  }, [rows, categoryFilter, search])

  const total = useMemo(() => filtered.reduce((s, r) => s + (r.amount ?? 0), 0), [filtered])

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.forEach(r => { map[r.category] = (map[r.category] ?? 0) + (r.amount ?? 0) })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [filtered])

  const exportExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(filtered.map(r => ({
      'ط§ظ„طھط§ط±ظٹط®': fmt(r.date),
      'ط§ظ„ظˆطµظپ': r.description ?? 'â€”',
      'ط§ظ„ظپط¦ط©': categoryLabels[r.category] ?? r.category,
      'ط§ظ„ظ…ط¨ظ„ط؛': r.amount,
      'ظ…ظ„ط§ط­ط¸ط§طھ': r.notes ?? '',
    })))
    const summarySheet = XLSX.utils.json_to_sheet(byCategory.map(([cat, amt]) => ({
      'ط§ظ„ظپط¦ط©': categoryLabels[cat] ?? cat,
      'ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ': amt,
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, 'طھظپط§طµظٹظ„ ط§ظ„ظ…طµط±ظˆظپط§طھ')
    XLSX.utils.book_append_sheet(wb, summarySheet, 'ظ…ظ„ط®طµ ط­ط³ط¨ ط§ظ„ظپط¦ط©')
    XLSX.writeFile(wb, `expenses-report-${dateFrom}-${dateTo}.xlsx`)
  }

  const exportPdf = async () => {
    await generateArabicPDF({
      title: `طھظ‚ط±ظٹط± ط§ظ„ظ…طµط±ظˆظپط§طھ (${fmt(dateFrom)} â€“ ${fmt(dateTo)})`,
      date: new Date().toLocaleDateString('ar-AE'),
      stats: [
        { label: 'ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…طµط±ظˆظپط§طھ', value: formatCurrency(total) },
        { label: 'ط¹ط¯ط¯ ط§ظ„ط³ط¬ظ„ط§طھ', value: filtered.length },
        ...byCategory.slice(0, 4).map(([cat, amt]) => ({ label: categoryLabels[cat] ?? cat, value: formatCurrency(amt) })),
      ],
      columns: [
        { header: 'ط§ظ„طھط§ط±ظٹط®', dataKey: 'date' },
        { header: 'ط§ظ„ظˆطµظپ', dataKey: 'desc' },
        { header: 'ط§ظ„ظپط¦ط©', dataKey: 'cat' },
        { header: 'ط§ظ„ظ…ط¨ظ„ط؛', dataKey: 'amount' },
      ],
      data: filtered.map(r => ({
        date: fmt(r.date),
        desc: r.description ?? 'â€”',
        cat: categoryLabels[r.category] ?? r.category,
        amount: formatCurrency(r.amount ?? 0),
      })),
      totals: { date: 'ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ', desc: '', cat: `${filtered.length} ط³ط¬ظ„`, amount: formatCurrency(total) },
      filename: `expenses-report-${dateFrom}-${dateTo}.pdf`,
    })
  }

  return (
    <Box>
      {!loading && byCategory.length > 0 && (
        <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
          {byCategory.map(([cat, amt]) => (
            <Chip key={cat} label={`${categoryLabels[cat] ?? cat}: ${formatCurrency(amt)}`} size="small"
              variant={categoryFilter === cat ? 'filled' : 'outlined'} color="warning"
              onClick={() => setCategoryFilter(prev => prev === cat ? '' : cat)} sx={{ cursor: 'pointer' }} />
          ))}
        </Stack>
      )}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap="wrap">
          <FilterIcon color="action" sx={{ alignSelf: 'center' }} />
          <TextField label="ظ…ظ† طھط§ط±ظٹط®" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} size="small" sx={{ minWidth: 150 }} />
          <TextField label="ط¥ظ„ظ‰ طھط§ط±ظٹط®" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} size="small" sx={{ minWidth: 150 }} />
          <TextField select label="ط§ظ„ظپط¦ط©" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} size="small" sx={{ minWidth: 140 }}>
            <MenuItem value="">ط§ظ„ظƒظ„</MenuItem>
            {Object.entries(categoryLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </TextField>
          <TextField
            label="ط¨ط­ط«" value={search} onChange={e => setSearch(e.target.value)} size="small" sx={{ flex: 1, minWidth: 160 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment> : null,
            }}
          />
        </Stack>
      </Paper>
      <TabHeader title="طھظ‚ط±ظٹط± ط§ظ„ظ…طµط±ظˆظپط§طھ" count={filtered.length} onExcelExport={exportExcel} onPdfExport={exportPdf} onRefresh={fetchData} loading={loading} />
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>ط§ظ„طھط§ط±ظٹط®</TableCell>
              <TableCell>ط§ظ„ظˆطµظپ</TableCell>
              <TableCell>ط§ظ„ظپط¦ط©</TableCell>
              <TableCell align="right">ط§ظ„ظ…ط¨ظ„ط؛</TableCell>
              <TableCell>ظ…ظ„ط§ط­ط¸ط§طھ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? <LoadingRow /> : filtered.length === 0 ? <EmptyState message="ظ„ط§ طھظˆط¬ط¯ ظ…طµط±ظˆظپط§طھ ظپظٹ ظ‡ط°ظ‡ ط§ظ„ظپطھط±ط©" /> : (
              filtered.map((row, idx) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{idx + 1}</TableCell>
                  <TableCell>{fmt(row.date)}</TableCell>
                  <TableCell>{row.description ?? 'â€”'}</TableCell>
                  <TableCell><Chip label={categoryLabels[row.category] ?? row.category} size="small" color="warning" variant="outlined" /></TableCell>
                  <TableCell align="right"><strong>{formatCurrency(row.amount ?? 0)}</strong></TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{row.notes ?? 'â€”'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {!loading && filtered.length > 0 && (
            <TableFooter>
              <TableRow sx={{ '& td': { fontWeight: 'bold', borderTop: '2px solid', borderColor: 'warning.200' } }}>
                <TableCell colSpan={4}>{formatNumber(filtered.length)} ط³ط¬ظ„</TableCell>
                <TableCell align="right">{formatCurrency(total)} ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…طµط±ظˆظپط§طھ</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </TableContainer>
    </Box>
  )
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   TAB 3 â€“ Herd Report
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function HerdTab({ animalLbl }: { animalLbl: ReturnType<typeof getAnimalLabels> }) {
  const [statusFilter, setStatusFilter] = useState('ACTIVE')
  const [genderFilter, setGenderFilter] = useState('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<Goat[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '9999' })
      if (statusFilter) params.set('status', statusFilter)
      if (genderFilter) params.set('gender', genderFilter)
      const res = await fetch(`/api/goats?${params}`)
      const json = await res.json()
      setRows(Array.isArray(json) ? json : json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, genderFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = useMemo(() => {
    if (!search) return rows
    const q = search.toLowerCase()
    return rows.filter(r =>
      r.tagId?.toLowerCase().includes(q) || r.name?.toLowerCase().includes(q) ||
      r.breed?.toLowerCase().includes(q) || r.pen?.name?.toLowerCase().includes(q)
    )
  }, [rows, search])

  const calcAge = (birthDate?: string | null) => {
    if (!birthDate) return 'â€”'
    const months = Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    if (months < 12) return `${months} ط´ظ‡ط±`
    const years = Math.floor(months / 12)
    const rem = months % 12
    return rem > 0 ? `${years} ط³ظ†ط© ${rem} ط´ظ‡ط±` : `${years} ط³ظ†ط©`
  }

  const exportExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(filtered.map(r => ({
      'ط±ظ‚ظ… ط§ظ„ط­ظٹظˆط§ظ†': r.tagId, 'ط§ظ„ط§ط³ظ…': r.name ?? 'â€”',
      'ط§ظ„ط¬ظ†ط³': r.gender === 'MALE' ? 'ط°ظƒط±' : 'ط£ظ†ط«ظ‰', 'ط§ظ„ط³ظ„ط§ظ„ط©': r.breed ?? 'â€”',
      'ط§ظ„ط¹ظ…ط±': calcAge(r.birthDate), 'ط§ظ„ط­ط¸ظٹط±ط©': r.pen?.name ?? 'â€”',
      'ط§ظ„ط­ط§ظ„ط©': goatStatusLabels[r.status] ?? r.status, 'ط§ظ„ظˆط²ظ† (ظƒط¬ظ…)': r.currentWeight ?? '',
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, `طھظ‚ط±ظٹط± ${animalLbl.plural}`)
    XLSX.writeFile(wb, `herd-report-${today()}.xlsx`)
  }

  const exportPdf = async () => {
    await generateArabicPDF({
      title: `طھظ‚ط±ظٹط± ط§ظ„ظ‚ط·ظٹط¹ â€“ ${animalLbl.plural}`,
      date: new Date().toLocaleDateString('ar-AE'),
      stats: [
        { label: 'ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ†طھط§ط¦ط¬', value: filtered.length },
        { label: 'ط°ظƒظˆط±', value: filtered.filter(r => r.gender === 'MALE').length },
        { label: 'ط¥ظ†ط§ط«', value: filtered.filter(r => r.gender === 'FEMALE').length },
      ],
      columns: [
        { header: 'ط±ظ‚ظ… ط§ظ„ط­ظٹظˆط§ظ†', dataKey: 'tagId' }, { header: 'ط§ظ„ط§ط³ظ…', dataKey: 'name' },
        { header: 'ط§ظ„ط¬ظ†ط³', dataKey: 'gender' }, { header: 'ط§ظ„ط³ظ„ط§ظ„ط©', dataKey: 'breed' },
        { header: 'ط§ظ„ط¹ظ…ط±', dataKey: 'age' }, { header: 'ط§ظ„ط­ط¸ظٹط±ط©', dataKey: 'pen' },
        { header: 'ط§ظ„ط­ط§ظ„ط©', dataKey: 'status' },
      ],
      data: filtered.map(r => ({
        tagId: r.tagId, name: r.name ?? 'â€”',
        gender: r.gender === 'MALE' ? 'ط°ظƒط±' : 'ط£ظ†ط«ظ‰', breed: r.breed ?? 'â€”',
        age: calcAge(r.birthDate), pen: r.pen?.name ?? 'â€”',
        status: goatStatusLabels[r.status] ?? r.status,
      })),
      totals: { tagId: `${filtered.length} ط¥ط¬ظ…ط§ظ„ظٹ`, name: '', gender: '', breed: '', age: '', pen: '', status: '' },
      filename: `herd-report-${today()}.pdf`,
    })
  }

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap="wrap">
          <FilterIcon color="action" sx={{ alignSelf: 'center' }} />
          <TextField select label="ط§ظ„ط­ط§ظ„ط©" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} size="small" sx={{ minWidth: 130 }}>
            <MenuItem value="">ط§ظ„ظƒظ„</MenuItem>
            {Object.entries(goatStatusLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </TextField>
          <TextField select label="ط§ظ„ط¬ظ†ط³" value={genderFilter} onChange={e => setGenderFilter(e.target.value)} size="small" sx={{ minWidth: 120 }}>
            <MenuItem value="">ط§ظ„ظƒظ„</MenuItem>
            <MenuItem value="MALE">ط°ظƒط±</MenuItem>
            <MenuItem value="FEMALE">ط£ظ†ط«ظ‰</MenuItem>
          </TextField>
          <TextField
            label="ط¨ط­ط« ط¨ط§ظ„ط±ظ‚ظ… ط£ظˆ ط§ظ„ط§ط³ظ… ط£ظˆ ط§ظ„ط³ظ„ط§ظ„ط©" value={search} onChange={e => setSearch(e.target.value)} size="small" sx={{ flex: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment> : null,
            }}
          />
        </Stack>
      </Paper>
      <TabHeader title={`طھظ‚ط±ظٹط± ط§ظ„ظ‚ط·ظٹط¹ â€“ ${animalLbl.plural}`} count={filtered.length} onExcelExport={exportExcel} onPdfExport={exportPdf} onRefresh={fetchData} loading={loading} />
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>ط±ظ‚ظ… ط§ظ„ط­ظٹظˆط§ظ†</TableCell>
              <TableCell>ط§ظ„ط§ط³ظ…</TableCell>
              <TableCell>ط§ظ„ط¬ظ†ط³</TableCell>
              <TableCell>ط§ظ„ط³ظ„ط§ظ„ط©</TableCell>
              <TableCell>ط§ظ„ط¹ظ…ط±</TableCell>
              <TableCell>ط§ظ„ظˆط²ظ†</TableCell>
              <TableCell>ط§ظ„ط­ط¸ظٹط±ط©</TableCell>
              <TableCell>ط§ظ„ط­ط§ظ„ط©</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? <LoadingRow /> : filtered.length === 0 ? <EmptyState message="ظ„ط§ طھظˆط¬ط¯ ظ†طھط§ط¦ط¬" /> : (
              filtered.map((row, idx) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{idx + 1}</TableCell>
                  <TableCell><strong>{row.tagId}</strong></TableCell>
                  <TableCell>{row.name ?? 'â€”'}</TableCell>
                  <TableCell><Chip label={row.gender === 'MALE' ? 'ط°ظƒط±' : 'ط£ظ†ط«ظ‰'} size="small" color={row.gender === 'MALE' ? 'info' : 'secondary'} /></TableCell>
                  <TableCell>{row.breed ?? 'â€”'}</TableCell>
                  <TableCell>{calcAge(row.birthDate)}</TableCell>
                  <TableCell>{row.currentWeight ? `${row.currentWeight} ظƒط¬ظ…` : 'â€”'}</TableCell>
                  <TableCell>{row.pen?.name ?? 'â€”'}</TableCell>
                  <TableCell><Chip label={goatStatusLabels[row.status] ?? row.status} size="small" color={goatStatusColors[row.status] ?? 'default'} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {!loading && filtered.length > 0 && (
            <TableFooter>
              <TableRow sx={{ '& td': { fontWeight: 'bold', borderTop: '2px solid', borderColor: 'success.200' } }}>
                <TableCell colSpan={3}>{formatNumber(filtered.length)} ط­ظٹظˆط§ظ†</TableCell>
                <TableCell>ط°ظƒظˆط±: {filtered.filter(r => r.gender === 'MALE').length} | ط¥ظ†ط§ط«: {filtered.filter(r => r.gender === 'FEMALE').length}</TableCell>
                <TableCell colSpan={5} />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </TableContainer>
    </Box>
  )
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   TAB 4 â€“ Health Report
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function HealthTab({ animalLbl }: { animalLbl: ReturnType<typeof getAnimalLabels> }) {
  const [dateFrom, setDateFrom] = useState(firstOfMonth())
  const [dateTo, setDateTo] = useState(today())
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<HealthRecord[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '9999' })
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)
      if (typeFilter) params.set('type', typeFilter)
      const res = await fetch(`/api/health?${params}`)
      const json = await res.json()
      setRows(Array.isArray(json) ? json : json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, typeFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = useMemo(() => {
    if (!search) return rows
    const q = search.toLowerCase()
    return rows.filter(r =>
      r.goat?.tagId?.toLowerCase().includes(q) ||
      r.diagnosis?.toLowerCase().includes(q) ||
      r.vetName?.toLowerCase().includes(q)
    )
  }, [rows, search])

  const totalCost = useMemo(() => filtered.reduce((s, r) => s + (r.cost ?? 0), 0), [filtered])

  const exportExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(filtered.map(r => ({
      'ط§ظ„طھط§ط±ظٹط®': fmt(r.date), 'ط±ظ‚ظ… ط§ظ„ط­ظٹظˆط§ظ†': r.goat?.tagId ?? 'â€”',
      'ظ†ظˆط¹ ط§ظ„ط³ط¬ظ„': healthTypeLabels[r.type] ?? r.type, 'ط§ظ„طھط´ط®ظٹطµ/ط§ظ„ظˆطµظپ': r.diagnosis ?? 'â€”',
      'ط§ظ„ط·ط¨ظٹط¨ ط§ظ„ط¨ظٹط·ط±ظٹ': r.vetName ?? 'â€”', 'ط§ظ„طھظƒظ„ظپط©': r.cost ?? 0,
      'ط§ظ„ظ…ظˆط¹ط¯ ط§ظ„ظ‚ط§ط¯ظ…': fmt(r.nextDate), 'ظ…ظ„ط§ط­ط¸ط§طھ': r.notes ?? '',
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, 'طھظ‚ط±ظٹط± ط§ظ„طµط­ط©')
    XLSX.writeFile(wb, `health-report-${dateFrom}-${dateTo}.xlsx`)
  }

  const exportPdf = async () => {
    await generateArabicPDF({
      title: `طھظ‚ط±ظٹط± ط§ظ„طµط­ط© ظˆط§ظ„طھط·ط¹ظٹظ…ط§طھ (${fmt(dateFrom)} â€“ ${fmt(dateTo)})`,
      date: new Date().toLocaleDateString('ar-AE'),
      stats: [
        { label: 'ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط³ط¬ظ„ط§طھ', value: filtered.length },
        { label: 'ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„طھظƒط§ظ„ظٹظپ', value: formatCurrency(totalCost) },
      ],
      columns: [
        { header: 'ط§ظ„طھط§ط±ظٹط®', dataKey: 'date' },
        { header: `ط±ظ‚ظ… ${animalLbl.singular}`, dataKey: 'tagId' },
        { header: 'ط§ظ„ظ†ظˆط¹', dataKey: 'type' },
        { header: 'ط§ظ„طھط´ط®ظٹطµ', dataKey: 'diag' },
        { header: 'ط§ظ„ط·ط¨ظٹط¨', dataKey: 'vet' },
        { header: 'ط§ظ„طھظƒظ„ظپط©', dataKey: 'cost' },
        { header: 'ط§ظ„ظ…ظˆط¹ط¯ ط§ظ„ظ‚ط§ط¯ظ…', dataKey: 'next' },
      ],
      data: filtered.map(r => ({
        date: fmt(r.date), tagId: r.goat?.tagId ?? 'â€”',
        type: healthTypeLabels[r.type] ?? r.type, diag: r.diagnosis ?? 'â€”',
        vet: r.vetName ?? 'â€”', cost: formatCurrency(r.cost ?? 0), next: fmt(r.nextDate),
      })),
      totals: { date: 'ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ', tagId: '', type: '', diag: '', vet: '', cost: formatCurrency(totalCost), next: '' },
      filename: `health-report-${dateFrom}-${dateTo}.pdf`,
    })
  }

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap="wrap">
          <FilterIcon color="action" sx={{ alignSelf: 'center' }} />
          <TextField label="ظ…ظ† طھط§ط±ظٹط®" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} size="small" sx={{ minWidth: 150 }} />
          <TextField label="ط¥ظ„ظ‰ طھط§ط±ظٹط®" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} size="small" sx={{ minWidth: 150 }} />
          <TextField select label="ظ†ظˆط¹ ط§ظ„ط³ط¬ظ„" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} size="small" sx={{ minWidth: 140 }}>
            <MenuItem value="">ط§ظ„ظƒظ„</MenuItem>
            {Object.entries(healthTypeLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </TextField>
          <TextField
            label="ط¨ط­ط«" value={search} onChange={e => setSearch(e.target.value)} size="small" sx={{ flex: 1, minWidth: 160 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment> : null,
            }}
          />
        </Stack>
      </Paper>
      <TabHeader title="طھظ‚ط±ظٹط± ط§ظ„طµط­ط© ظˆط§ظ„طھط·ط¹ظٹظ…ط§طھ" count={filtered.length} onExcelExport={exportExcel} onPdfExport={exportPdf} onRefresh={fetchData} loading={loading} />
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>ط§ظ„طھط§ط±ظٹط®</TableCell>
              <TableCell>ط±ظ‚ظ… {animalLbl.singular}</TableCell>
              <TableCell>ط§ظ„ظ†ظˆط¹</TableCell>
              <TableCell>ط§ظ„طھط´ط®ظٹطµ / ط§ظ„ظˆطµظپ</TableCell>
              <TableCell>ط§ظ„ط·ط¨ظٹط¨ ط§ظ„ط¨ظٹط·ط±ظٹ</TableCell>
              <TableCell align="right">ط§ظ„طھظƒظ„ظپط©</TableCell>
              <TableCell>ط§ظ„ظ…ظˆط¹ط¯ ط§ظ„ظ‚ط§ط¯ظ…</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? <LoadingRow /> : filtered.length === 0 ? <EmptyState message="ظ„ط§ طھظˆط¬ط¯ ط³ط¬ظ„ط§طھ طµط­ظٹط© ظپظٹ ظ‡ط°ظ‡ ط§ظ„ظپطھط±ط©" /> : (
              filtered.map((row, idx) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{idx + 1}</TableCell>
                  <TableCell>{fmt(row.date)}</TableCell>
                  <TableCell><strong>{row.goat?.tagId ?? 'â€”'}</strong></TableCell>
                  <TableCell><Chip label={healthTypeLabels[row.type] ?? row.type} size="small" color="info" variant="outlined" /></TableCell>
                  <TableCell>{row.diagnosis ?? 'â€”'}</TableCell>
                  <TableCell>{row.vetName ?? 'â€”'}</TableCell>
                  <TableCell align="right">{row.cost ? formatCurrency(row.cost) : 'â€”'}</TableCell>
                  <TableCell>{row.nextDate ? <Chip label={fmt(row.nextDate)} size="small" color="warning" variant="outlined" /> : 'â€”'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {!loading && filtered.length > 0 && (
            <TableFooter>
              <TableRow sx={{ '& td': { fontWeight: 'bold', borderTop: '2px solid', borderColor: 'info.200' } }}>
                <TableCell colSpan={6}>{formatNumber(filtered.length)} ط³ط¬ظ„ طµط­ظٹ</TableCell>
                <TableCell align="right">{formatCurrency(totalCost)} ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„طھظƒط§ظ„ظٹظپ</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </TableContainer>
    </Box>
  )
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   TAB 5 â€“ Breeding Report
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function BreedingTab({ animalLbl }: { animalLbl: ReturnType<typeof getAnimalLabels> }) {
  const [dateFrom, setDateFrom] = useState(firstOfMonth())
  const [dateTo, setDateTo] = useState(today())
  const [resultFilter, setResultFilter] = useState('')
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<BreedingRecord[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '9999' })
      if (dateFrom) params.set('from', dateFrom)
      if (dateTo) params.set('to', dateTo)
      if (resultFilter) params.set('result', resultFilter)
      const res = await fetch(`/api/breeding?${params}`)
      const json = await res.json()
      setRows(Array.isArray(json) ? json : json.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo, resultFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = useMemo(() => {
    if (!search) return rows
    const q = search.toLowerCase()
    return rows.filter(r => r.mother?.tagId?.toLowerCase().includes(q) || r.father?.tagId?.toLowerCase().includes(q))
  }, [rows, search])

  const successCount = useMemo(() => filtered.filter(r => r.result === 'SUCCESS' || r.result === 'BORN').length, [filtered])
  const successRate = filtered.length > 0 ? ((successCount / filtered.length) * 100).toFixed(1) : 'â€”'
  const totalOffspring = useMemo(() => filtered.reduce((s, r) => s + (r.offspringCount ?? 0), 0), [filtered])

  const exportExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(filtered.map(r => ({
      'طھط§ط±ظٹط® ط§ظ„طھظ„ظ‚ظٹط­': fmt(r.breedingDate), 'ط§ظ„ط£ظ…': r.mother?.tagId ?? 'â€”', 'ط§ظ„ط£ط¨': r.father?.tagId ?? 'â€”',
      'طھط§ط±ظٹط® ط§ظ„ظˆظ„ط§ط¯ط© ط§ظ„ظ…طھظˆظ‚ط¹': fmt(r.expectedBirthDate), 'طھط§ط±ظٹط® ط§ظ„ظˆظ„ط§ط¯ط© ط§ظ„ظپط¹ظ„ظٹ': fmt(r.actualBirthDate),
      'ط§ظ„ظ†طھظٹط¬ط©': breedingResultLabels[r.result] ?? r.result, 'ط¹ط¯ط¯ ط§ظ„ظ…ظˆط§ظ„ظٹط¯': r.offspringCount ?? 0, 'ظ…ظ„ط§ط­ط¸ط§طھ': r.notes ?? '',
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, 'طھظ‚ط±ظٹط± ط§ظ„طھظƒط§ط«ط±')
    XLSX.writeFile(wb, `breeding-report-${dateFrom}-${dateTo}.xlsx`)
  }

  const exportPdf = async () => {
    await generateArabicPDF({
      title: `طھظ‚ط±ظٹط± ط§ظ„طھظƒط§ط«ط± (${fmt(dateFrom)} â€“ ${fmt(dateTo)})`,
      date: new Date().toLocaleDateString('ar-AE'),
      stats: [
        { label: 'ط¥ط¬ظ…ط§ظ„ظٹ ط¹ظ…ظ„ظٹط§طھ ط§ظ„طھظ„ظ‚ظٹط­', value: filtered.length },
        { label: 'ظ†ط³ط¨ط© ط§ظ„ظ†ط¬ط§ط­', value: `${successRate}%` },
        { label: 'ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ظˆط§ظ„ظٹط¯', value: totalOffspring },
        { label: 'ظ†ط§ط¬ط­', value: successCount },
        { label: 'ظپط§ط´ظ„', value: filtered.filter(r => r.result === 'FAILED').length },
      ],
      columns: [
        { header: 'طھط§ط±ظٹط® ط§ظ„طھظ„ظ‚ظٹط­', dataKey: 'date' },
        { header: 'ط§ظ„ط£ظ…', dataKey: 'mother' },
        { header: 'ط§ظ„ط£ط¨', dataKey: 'father' },
        { header: 'ط§ظ„ظˆظ„ط§ط¯ط© ط§ظ„ظ…طھظˆظ‚ط¹ط©', dataKey: 'expected' },
        { header: 'ط§ظ„ظ†طھظٹط¬ط©', dataKey: 'result' },
        { header: 'ط§ظ„ظ…ظˆط§ظ„ظٹط¯', dataKey: 'offspring' },
      ],
      data: filtered.map(r => ({
        date: fmt(r.breedingDate), mother: r.mother?.tagId ?? 'â€”', father: r.father?.tagId ?? 'â€”',
        expected: fmt(r.expectedBirthDate), result: breedingResultLabels[r.result] ?? r.result,
        offspring: r.offspringCount ?? 0,
      })),
      totals: { date: 'ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ', mother: '', father: '', expected: '', result: `ظ†ط³ط¨ط© ط§ظ„ظ†ط¬ط§ط­: ${successRate}%`, offspring: totalOffspring },
      filename: `breeding-report-${dateFrom}-${dateTo}.pdf`,
    })
  }

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap="wrap">
          <FilterIcon color="action" sx={{ alignSelf: 'center' }} />
          <TextField label="ظ…ظ† طھط§ط±ظٹط®" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} size="small" sx={{ minWidth: 150 }} />
          <TextField label="ط¥ظ„ظ‰ طھط§ط±ظٹط®" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} size="small" sx={{ minWidth: 150 }} />
          <TextField select label="ط§ظ„ظ†طھظٹط¬ط©" value={resultFilter} onChange={e => setResultFilter(e.target.value)} size="small" sx={{ minWidth: 150 }}>
            <MenuItem value="">ط§ظ„ظƒظ„</MenuItem>
            {Object.entries(breedingResultLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </TextField>
          <TextField
            label="ط¨ط­ط« ط¨ط±ظ‚ظ… ط§ظ„ط£ظ… ط£ظˆ ط§ظ„ط£ط¨" value={search} onChange={e => setSearch(e.target.value)} size="small" sx={{ flex: 1, minWidth: 180 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment> : null,
            }}
          />
        </Stack>
      </Paper>
      <TabHeader title="طھظ‚ط±ظٹط± ط§ظ„طھظƒط§ط«ط±" count={filtered.length} onExcelExport={exportExcel} onPdfExport={exportPdf} onRefresh={fetchData} loading={loading} />
      {!loading && filtered.length > 0 && (
        <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" useFlexGap>
          <Chip label={`ظ†ط³ط¨ط© ط§ظ„ظ†ط¬ط§ط­: ${successRate}%`} color="success" />
          <Chip label={`ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ظˆط§ظ„ظٹط¯: ${totalOffspring}`} color="info" />
          <Chip label={`ظ‚ظٹط¯ ط§ظ„ط§ظ†طھط¸ط§ط±: ${filtered.filter(r => r.result === 'PENDING').length}`} color="warning" />
          <Chip label={`ظپط§ط´ظ„: ${filtered.filter(r => r.result === 'FAILED').length}`} color="error" variant="outlined" />
        </Stack>
      )}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>طھط§ط±ظٹط® ط§ظ„طھظ„ظ‚ظٹط­</TableCell>
              <TableCell>ط§ظ„ط£ظ… ({animalLbl.singular})</TableCell>
              <TableCell>ط§ظ„ط£ط¨ ({animalLbl.singular})</TableCell>
              <TableCell>ط§ظ„ظˆظ„ط§ط¯ط© ط§ظ„ظ…طھظˆظ‚ط¹ط©</TableCell>
              <TableCell>ط§ظ„ظˆظ„ط§ط¯ط© ط§ظ„ظپط¹ظ„ظٹط©</TableCell>
              <TableCell>ط§ظ„ظ†طھظٹط¬ط©</TableCell>
              <TableCell align="center">ط§ظ„ظ…ظˆط§ظ„ظٹط¯</TableCell>
              <TableCell>ظ…ظ„ط§ط­ط¸ط§طھ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? <LoadingRow /> : filtered.length === 0 ? <EmptyState message="ظ„ط§ طھظˆط¬ط¯ ط³ط¬ظ„ط§طھ طھظƒط§ط«ط± ظپظٹ ظ‡ط°ظ‡ ط§ظ„ظپطھط±ط©" /> : (
              filtered.map((row, idx) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{idx + 1}</TableCell>
                  <TableCell>{fmt(row.breedingDate)}</TableCell>
                  <TableCell><strong>{row.mother?.tagId ?? 'â€”'}</strong></TableCell>
                  <TableCell><strong>{row.father?.tagId ?? 'â€”'}</strong></TableCell>
                  <TableCell>{fmt(row.expectedBirthDate)}</TableCell>
                  <TableCell>{fmt(row.actualBirthDate)}</TableCell>
                  <TableCell><Chip label={breedingResultLabels[row.result] ?? row.result} size="small" color={breedingResultColors[row.result] ?? 'default'} /></TableCell>
                  <TableCell align="center">{row.offspringCount ? <Chip label={row.offspringCount} size="small" color="info" /> : 'â€”'}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{row.notes ?? 'â€”'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {!loading && filtered.length > 0 && (
            <TableFooter>
              <TableRow sx={{ '& td': { fontWeight: 'bold', borderTop: '2px solid', borderColor: 'success.200' } }}>
                <TableCell colSpan={6}>{formatNumber(filtered.length)} ط¹ظ…ظ„ظٹط© طھظ„ظ‚ظٹط­</TableCell>
                <TableCell>ظ†ط¬ط§ط­: {successCount}</TableCell>
                <TableCell align="center">{totalOffspring} ظ…ظˆظ„ظˆط¯</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </TableContainer>
    </Box>
  )
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   TYPE DECLARATIONS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
interface Sale {
  id: string; saleDate?: string | null; price?: number | null; status: string
  buyerName?: string | null; buyerPhone?: string | null; notes?: string | null
  goat?: { tagId?: string | null; breed?: string | null } | null
}
interface Expense {
  id: string; date?: string | null; description?: string | null
  category: string; amount?: number | null; notes?: string | null
}
interface Goat {
  id: string; tagId: string; name?: string | null; gender: string
  breed?: string | null; birthDate?: string | null; currentWeight?: number | null
  status: string; pen?: { name?: string | null } | null
}
interface HealthRecord {
  id: string; date?: string | null; type: string; diagnosis?: string | null
  vetName?: string | null; cost?: number | null; nextDate?: string | null
  notes?: string | null; goat?: { tagId?: string | null } | null
}
interface BreedingRecord {
  id: string; breedingDate?: string | null; expectedBirthDate?: string | null
  actualBirthDate?: string | null; result: string; offspringCount?: number | null
  notes?: string | null
  mother?: { tagId?: string | null } | null
  father?: { tagId?: string | null } | null
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   MAIN PAGE
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function ReportsPage() {
  const { farm } = useAuth()
  const animalLbl = getAnimalLabels(farm?.farmType)
  const [tab, setTab] = useState(0)
  const [importResult, setImportResult] = useState<string | null>(null)

  const handleExportData = async (type: 'goats' | 'sales' | 'expenses') => {
    const endpoints: Record<string, string> = {
      goats: '/api/goats', sales: '/api/sales', expenses: '/api/expenses',
    }
    const labels: Record<string, string> = {
      goats: animalLbl.plural, sales: 'ط§ظ„ظ…ط¨ظٹط¹ط§طھ', expenses: 'ط§ظ„ظ…طµط±ظˆظپط§طھ',
    }
    const res = await fetch(`${endpoints[type]}?limit=9999`)
    const json = await res.json()
    const rows = Array.isArray(json) ? json : json.data ?? []
    if (rows.length === 0) return
    const sheet = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, labels[type])
    XLSX.writeFile(wb, `${type}-${today()}.xlsx`)
  }

  const handleImport = async (file: File) => {
    setImportResult(null)
    const text = await file.text()
    const res = await fetch('/api/goats/import', {
      method: 'POST', headers: { 'Content-Type': 'text/csv' }, body: text,
    })
    const payload = await res.json()
    if (!res.ok) { setImportResult(payload.error || 'ظپط´ظ„ ظپظٹ ط§ظ„ط§ط³طھظٹط±ط§ط¯'); return }
    const errors = Array.isArray(payload.errors) ? payload.errors.length : 0
    setImportResult(`طھظ… ط§ط³طھظٹط±ط§ط¯ ${payload.created ?? 0} ط³ط¬ظ„. ط£ط®ط·ط§ط،: ${errors}`)
  }

  return (
    <Box sx={{ width: '100%', overflowX: 'hidden' }}>
      {/* â”€â”€ Page Header â”€â”€ */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <ReportsIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">ط§ظ„طھظ‚ط§ط±ظٹط±</Typography>
            <Typography variant="body2" color="text.secondary">
              ظپظ„طھط±ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ ظˆظ…ط±ط§ط¬ط¹طھظ‡ط§ ظ‚ط¨ظ„ ط§ظ„طھطµط¯ظٹط±
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* â”€â”€ Tabs â”€â”€ */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1, borderColor: 'divider', px: 2,
            '& .MuiTab-root': { fontWeight: 'bold', fontSize: { xs: 13, sm: 14 } },
          }}
        >
          <Tab label="ط§ظ„ظ…ط¨ظٹط¹ط§طھ" />
          <Tab label="ط§ظ„ظ…طµط±ظˆظپط§طھ" />
          <Tab label="ط§ظ„ظ‚ط·ظٹط¹" />
          <Tab label="ط§ظ„طµط­ط©" />
          <Tab label="ط§ظ„طھظƒط§ط«ط±" />
          <Tab label="ط§ط³طھظٹط±ط§ط¯ / طھطµط¯ظٹط±" />
        </Tabs>

        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {tab === 0 && <SalesTab animalLbl={animalLbl} />}
          {tab === 1 && <ExpensesTab />}
          {tab === 2 && <HerdTab animalLbl={animalLbl} />}
          {tab === 3 && <HealthTab animalLbl={animalLbl} />}
          {tab === 4 && <BreedingTab animalLbl={animalLbl} />}
          {tab === 5 && (
            <Box>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" mb={3}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <PetsIcon color="primary" />
                  <Typography variant="h6" fontWeight="bold">طھطµط¯ظٹط± ط§ظ„ط¨ظٹط§ظ†ط§طھ (Excel)</Typography>
                </Stack>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => handleExportData('goats')} sx={{ color: 'success.main', borderColor: 'success.main' }}>
                    طھطµط¯ظٹط± {animalLbl.plural}
                  </Button>
                  <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => handleExportData('sales')} sx={{ color: 'success.main', borderColor: 'success.main' }}>
                    طھطµط¯ظٹط± ط§ظ„ظ…ط¨ظٹط¹ط§طھ
                  </Button>
                  <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => handleExportData('expenses')} sx={{ color: 'success.main', borderColor: 'success.main' }}>
                    طھطµط¯ظٹط± ط§ظ„ظ…طµط±ظˆظپط§طھ
                  </Button>
                </Stack>
              </Stack>
              <Divider sx={{ mb: 3 }} />
              <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <PetsIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">ط§ط³طھظٹط±ط§ط¯ {animalLbl.plural} (CSV)</Typography>
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
                <Button component="label" variant="contained" startIcon={<UploadIcon />}>
                  ط§ط®طھط± ظ…ظ„ظپ CSV
                  <input type="file" hidden accept=".csv" onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f) }} />
                </Button>
                <Typography variant="body2" color="text.secondary">
                  ط§ظ„ط£ط¹ظ…ط¯ط© ط§ظ„ظ…ط·ظ„ظˆط¨ط©: tagId, breed, gender, birthDate (YYYY-MM-DD)
                </Typography>
              </Stack>
              {importResult && <Alert severity="info" sx={{ mt: 2 }}>{importResult}</Alert>}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  )
}
