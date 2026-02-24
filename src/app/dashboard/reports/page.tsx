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

/* ───── Constants ───── */
const categoryLabels: Record<string, string> = {
  FEED: 'علف', MEDICINE: 'دواء', EQUIPMENT: 'معدات', LABOR: 'عمالة',
  UTILITIES: 'مرافق', MAINTENANCE: 'صيانة', TRANSPORT: 'نقل', OTHER: 'أخرى',
}

const paymentStatusLabels: Record<string, string> = {
  PAID: 'مدفوع', PENDING: 'معلق', CANCELLED: 'ملغي', PARTIAL: 'جزئي',
}

const paymentStatusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  PAID: 'success', PENDING: 'warning', CANCELLED: 'error', PARTIAL: 'default',
}

const healthTypeLabels: Record<string, string> = {
  VACCINATION: 'تطعيم', TREATMENT: 'علاج', CHECKUP: 'فحص',
  SURGERY: 'جراحة', MEDICATION: 'دواء', OTHER: 'أخرى',
}

const breedingResultLabels: Record<string, string> = {
  SUCCESS: 'ناجح', FAILED: 'فاشل', PENDING: 'قيد الانتظار', BORN: 'ولد',
}

const breedingResultColors: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
  SUCCESS: 'success', FAILED: 'error', PENDING: 'warning', BORN: 'info',
}

const goatStatusLabels: Record<string, string> = {
  ACTIVE: 'نشط', SOLD: 'مباع', DEAD: 'نافق', SLAUGHTERED: 'مذبوح',
}

const goatStatusColors: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
  ACTIVE: 'success', SOLD: 'warning', DEAD: 'error', SLAUGHTERED: 'default',
}

/* ───── Helpers ───── */
const today = () => new Date().toISOString().split('T')[0]
const firstOfMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
const fmt = (dateStr?: string | null) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('ar-AE')
}

/* ───── Empty-state component ───── */
function EmptyState({ message }: { message: string }) {
  return (
    <TableRow>
      <TableCell colSpan={99} align="center" sx={{ py: 6 }}>
        <Typography color="text.secondary">{message}</Typography>
      </TableCell>
    </TableRow>
  )
}

/* ───── Loading row ───── */
function LoadingRow() {
  return (
    <TableRow>
      <TableCell colSpan={99} align="center" sx={{ py: 4 }}>
        <CircularProgress size={28} />
      </TableCell>
    </TableRow>
  )
}

/* ───── Section header inside a tab ───── */
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
        <Tooltip title="تحديث البيانات">
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

/* ════════════════════════════════════════════════════════════════
   TAB 1 — Sales Report
════════════════════════════════════════════════════════════════ */
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
      'التاريخ': fmt(r.saleDate),
      'رقم الحيوان': r.goat?.tagId ?? '—',
      'السلالة': r.goat?.breed ?? '—',
      'المشتري': r.buyerName ?? '—',
      'هاتف المشتري': r.buyerPhone ?? '—',
      'السعر': r.price,
      'الحالة': paymentStatusLabels[r.status] ?? r.status,
      'ملاحظات': r.notes ?? '',
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, 'تقرير المبيعات')
    XLSX.writeFile(wb, `sales-report-${dateFrom}-${dateTo}.xlsx`)
  }

  const exportPdf = async () => {
    await generateArabicPDF({
      title: `تقرير المبيعات (${fmt(dateFrom)} — ${fmt(dateTo)})`,
      date: new Date().toLocaleDateString('ar-AE'),
      stats: [
        { label: 'إجمالي المبيعات', value: formatCurrency(total) },
        { label: 'المبالغ المدفوعة', value: formatCurrency(paid) },
        { label: 'المبالغ المعلقة', value: formatCurrency(pending) },
        { label: 'عدد عمليات البيع', value: filtered.length },
      ],
      columns: [
        { header: 'التاريخ', dataKey: 'date' },
        { header: 'رقم الحيوان', dataKey: 'tagId' },
        { header: 'السلالة', dataKey: 'breed' },
        { header: 'المشتري', dataKey: 'buyer' },
        { header: 'السعر', dataKey: 'price' },
        { header: 'الحالة', dataKey: 'status' },
      ],
      data: filtered.map(r => ({
        date: fmt(r.saleDate),
        tagId: r.goat?.tagId ?? '—',
        breed: r.goat?.breed ?? '—',
        buyer: r.buyerName ?? '—',
        price: formatCurrency(r.price ?? 0),
        status: paymentStatusLabels[r.status] ?? r.status,
      })),
      totals: {
        date: 'الإجمالي',
        tagId: '',
        breed: '',
        buyer: `${filtered.length} عملية`,
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
          <TextField label="من تاريخ" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} size="small" sx={{ minWidth: 150 }} />
          <TextField label="إلى تاريخ" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} size="small" sx={{ minWidth: 150 }} />
          <TextField select label="حالة الدفع" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} size="small" sx={{ minWidth: 140 }}>
            <MenuItem value="">الكل</MenuItem>
            {Object.entries(paymentStatusLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </TextField>
          <TextField
            label="بحث" value={search} onChange={e => setSearch(e.target.value)} size="small" sx={{ flex: 1, minWidth: 160 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment> : null,
            }}
          />
        </Stack>
      </Paper>
      <TabHeader title="تقرير المبيعات" count={filtered.length} onExcelExport={exportExcel} onPdfExport={exportPdf} onRefresh={fetchData} loading={loading} />
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell>رقم {animalLbl.singular}</TableCell>
              <TableCell>السلالة</TableCell>
              <TableCell>المشتري</TableCell>
              <TableCell align="right">السعر</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>ملاحظات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? <LoadingRow /> : filtered.length === 0 ? <EmptyState message="لا توجد مبيعات في هذه الفترة" /> : (
              filtered.map((row, idx) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{idx + 1}</TableCell>
                  <TableCell>{fmt(row.saleDate)}</TableCell>
                  <TableCell><strong>{row.goat?.tagId ?? '—'}</strong></TableCell>
                  <TableCell>{row.goat?.breed ?? '—'}</TableCell>
                  <TableCell>
                    <div>{row.buyerName ?? '—'}</div>
                    {row.buyerPhone && <Typography variant="caption" color="text.secondary">{row.buyerPhone}</Typography>}
                  </TableCell>
                  <TableCell align="right"><strong>{formatCurrency(row.price ?? 0)}</strong></TableCell>
                  <TableCell>
                    <Chip label={paymentStatusLabels[row.status] ?? row.status} size="small" color={paymentStatusColors[row.status] ?? 'default'} />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{row.notes ?? '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {!loading && filtered.length > 0 && (
            <TableFooter>
              <TableRow sx={{ bgcolor: 'primary.50', '& td': { fontWeight: 'bold', borderTop: '2px solid', borderColor: 'primary.200' } }}>
                <TableCell colSpan={5}>
                  <Stack direction="row" spacing={3}>
                    <span>العمليات: {formatNumber(filtered.length)}</span>
                    <span style={{ color: '#2e7d32' }}>مدفوع: {formatCurrency(paid)}</span>
                    <span style={{ color: '#ed6c02' }}>معلق: {formatCurrency(pending)}</span>
                  </Stack>
                </TableCell>
                <TableCell align="right" colSpan={3}>{formatCurrency(total)} الإجمالي</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </TableContainer>
    </Box>
  )
}

/* ════════════════════════════════════════════════════════════════
   TAB 2 — Expenses Report
════════════════════════════════════════════════════════════════ */
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
      'التاريخ': fmt(r.date),
      'الوصف': r.description ?? '—',
      'الفئة': categoryLabels[r.category] ?? r.category,
      'المبلغ': r.amount,
      'ملاحظات': r.notes ?? '',
    })))
    const summarySheet = XLSX.utils.json_to_sheet(byCategory.map(([cat, amt]) => ({
      'الفئة': categoryLabels[cat] ?? cat,
      'الإجمالي': amt,
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, 'تفاصيل المصروفات')
    XLSX.utils.book_append_sheet(wb, summarySheet, 'ملخص حسب الفئة')
    XLSX.writeFile(wb, `expenses-report-${dateFrom}-${dateTo}.xlsx`)
  }

  const exportPdf = async () => {
    await generateArabicPDF({
      title: `تقرير المصروفات (${fmt(dateFrom)} — ${fmt(dateTo)})`,
      date: new Date().toLocaleDateString('ar-AE'),
      stats: [
        { label: 'إجمالي المصروفات', value: formatCurrency(total) },
        { label: 'عدد السجلات', value: filtered.length },
        ...byCategory.slice(0, 4).map(([cat, amt]) => ({ label: categoryLabels[cat] ?? cat, value: formatCurrency(amt) })),
      ],
      columns: [
        { header: 'التاريخ', dataKey: 'date' },
        { header: 'الوصف', dataKey: 'desc' },
        { header: 'الفئة', dataKey: 'cat' },
        { header: 'المبلغ', dataKey: 'amount' },
      ],
      data: filtered.map(r => ({
        date: fmt(r.date),
        desc: r.description ?? '—',
        cat: categoryLabels[r.category] ?? r.category,
        amount: formatCurrency(r.amount ?? 0),
      })),
      totals: { date: 'الإجمالي', desc: '', cat: `${filtered.length} سجل`, amount: formatCurrency(total) },
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
          <TextField label="من تاريخ" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} size="small" sx={{ minWidth: 150 }} />
          <TextField label="إلى تاريخ" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} size="small" sx={{ minWidth: 150 }} />
          <TextField select label="الفئة" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} size="small" sx={{ minWidth: 140 }}>
            <MenuItem value="">الكل</MenuItem>
            {Object.entries(categoryLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </TextField>
          <TextField
            label="بحث" value={search} onChange={e => setSearch(e.target.value)} size="small" sx={{ flex: 1, minWidth: 160 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment> : null,
            }}
          />
        </Stack>
      </Paper>
      <TabHeader title="تقرير المصروفات" count={filtered.length} onExcelExport={exportExcel} onPdfExport={exportPdf} onRefresh={fetchData} loading={loading} />
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell>الوصف</TableCell>
              <TableCell>الفئة</TableCell>
              <TableCell align="right">المبلغ</TableCell>
              <TableCell>ملاحظات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? <LoadingRow /> : filtered.length === 0 ? <EmptyState message="لا توجد مصروفات في هذه الفترة" /> : (
              filtered.map((row, idx) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{idx + 1}</TableCell>
                  <TableCell>{fmt(row.date)}</TableCell>
                  <TableCell>{row.description ?? '—'}</TableCell>
                  <TableCell><Chip label={categoryLabels[row.category] ?? row.category} size="small" color="warning" variant="outlined" /></TableCell>
                  <TableCell align="right"><strong>{formatCurrency(row.amount ?? 0)}</strong></TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{row.notes ?? '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {!loading && filtered.length > 0 && (
            <TableFooter>
              <TableRow sx={{ '& td': { fontWeight: 'bold', borderTop: '2px solid', borderColor: 'warning.200' } }}>
                <TableCell colSpan={4}>{formatNumber(filtered.length)} سجل</TableCell>
                <TableCell align="right">{formatCurrency(total)} إجمالي المصروفات</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </TableContainer>
    </Box>
  )
}

/* ════════════════════════════════════════════════════════════════
   TAB 3 — Herd Report
════════════════════════════════════════════════════════════════ */
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
    if (!birthDate) return '—'
    const months = Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    if (months < 12) return `${months} شهر`
    const years = Math.floor(months / 12)
    const rem = months % 12
    return rem > 0 ? `${years} سنة ${rem} شهر` : `${years} سنة`
  }

  const exportExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(filtered.map(r => ({
      'رقم الحيوان': r.tagId, 'الاسم': r.name ?? '—',
      'الجنس': r.gender === 'MALE' ? 'ذكر' : 'أنثى', 'السلالة': r.breed ?? '—',
      'العمر': calcAge(r.birthDate), 'الحظيرة': r.pen?.name ?? '—',
      'الحالة': goatStatusLabels[r.status] ?? r.status, 'الوزن (كجم)': r.currentWeight ?? '',
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, `تقرير ${animalLbl.plural}`)
    XLSX.writeFile(wb, `herd-report-${today()}.xlsx`)
  }

  const exportPdf = async () => {
    await generateArabicPDF({
      title: `تقرير القطيع — ${animalLbl.plural}`,
      date: new Date().toLocaleDateString('ar-AE'),
      stats: [
        { label: 'إجمالي النتائج', value: filtered.length },
        { label: 'ذكور', value: filtered.filter(r => r.gender === 'MALE').length },
        { label: 'إناث', value: filtered.filter(r => r.gender === 'FEMALE').length },
      ],
      columns: [
        { header: 'رقم الحيوان', dataKey: 'tagId' }, { header: 'الاسم', dataKey: 'name' },
        { header: 'الجنس', dataKey: 'gender' }, { header: 'السلالة', dataKey: 'breed' },
        { header: 'العمر', dataKey: 'age' }, { header: 'الحظيرة', dataKey: 'pen' },
        { header: 'الحالة', dataKey: 'status' },
      ],
      data: filtered.map(r => ({
        tagId: r.tagId, name: r.name ?? '—',
        gender: r.gender === 'MALE' ? 'ذكر' : 'أنثى', breed: r.breed ?? '—',
        age: calcAge(r.birthDate), pen: r.pen?.name ?? '—',
        status: goatStatusLabels[r.status] ?? r.status,
      })),
      totals: { tagId: `${filtered.length} إجمالي`, name: '', gender: '', breed: '', age: '', pen: '', status: '' },
      filename: `herd-report-${today()}.pdf`,
    })
  }

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap="wrap">
          <FilterIcon color="action" sx={{ alignSelf: 'center' }} />
          <TextField select label="الحالة" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} size="small" sx={{ minWidth: 130 }}>
            <MenuItem value="">الكل</MenuItem>
            {Object.entries(goatStatusLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </TextField>
          <TextField select label="الجنس" value={genderFilter} onChange={e => setGenderFilter(e.target.value)} size="small" sx={{ minWidth: 120 }}>
            <MenuItem value="">الكل</MenuItem>
            <MenuItem value="MALE">ذكر</MenuItem>
            <MenuItem value="FEMALE">أنثى</MenuItem>
          </TextField>
          <TextField
            label="بحث بالرقم أو الاسم أو السلالة" value={search} onChange={e => setSearch(e.target.value)} size="small" sx={{ flex: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment> : null,
            }}
          />
        </Stack>
      </Paper>
      <TabHeader title={`تقرير القطيع — ${animalLbl.plural}`} count={filtered.length} onExcelExport={exportExcel} onPdfExport={exportPdf} onRefresh={fetchData} loading={loading} />
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>رقم الحيوان</TableCell>
              <TableCell>الاسم</TableCell>
              <TableCell>الجنس</TableCell>
              <TableCell>السلالة</TableCell>
              <TableCell>العمر</TableCell>
              <TableCell>الوزن</TableCell>
              <TableCell>الحظيرة</TableCell>
              <TableCell>الحالة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? <LoadingRow /> : filtered.length === 0 ? <EmptyState message="لا توجد نتائج" /> : (
              filtered.map((row, idx) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{idx + 1}</TableCell>
                  <TableCell><strong>{row.tagId}</strong></TableCell>
                  <TableCell>{row.name ?? '—'}</TableCell>
                  <TableCell><Chip label={row.gender === 'MALE' ? 'ذكر' : 'أنثى'} size="small" color={row.gender === 'MALE' ? 'info' : 'secondary'} /></TableCell>
                  <TableCell>{row.breed ?? '—'}</TableCell>
                  <TableCell>{calcAge(row.birthDate)}</TableCell>
                  <TableCell>{row.currentWeight ? `${row.currentWeight} كجم` : '—'}</TableCell>
                  <TableCell>{row.pen?.name ?? '—'}</TableCell>
                  <TableCell><Chip label={goatStatusLabels[row.status] ?? row.status} size="small" color={goatStatusColors[row.status] ?? 'default'} /></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {!loading && filtered.length > 0 && (
            <TableFooter>
              <TableRow sx={{ '& td': { fontWeight: 'bold', borderTop: '2px solid', borderColor: 'success.200' } }}>
                <TableCell colSpan={3}>{formatNumber(filtered.length)} حيوان</TableCell>
                <TableCell>ذكور: {filtered.filter(r => r.gender === 'MALE').length} | إناث: {filtered.filter(r => r.gender === 'FEMALE').length}</TableCell>
                <TableCell colSpan={5} />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </TableContainer>
    </Box>
  )
}

/* ════════════════════════════════════════════════════════════════
   TAB 4 — Health Report
════════════════════════════════════════════════════════════════ */
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
      'التاريخ': fmt(r.date), 'رقم الحيوان': r.goat?.tagId ?? '—',
      'نوع السجل': healthTypeLabels[r.type] ?? r.type, 'التشخيص/الوصف': r.diagnosis ?? '—',
      'الطبيب البيطري': r.vetName ?? '—', 'التكلفة': r.cost ?? 0,
      'الموعد القادم': fmt(r.nextDate), 'ملاحظات': r.notes ?? '',
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, 'تقرير الصحة')
    XLSX.writeFile(wb, `health-report-${dateFrom}-${dateTo}.xlsx`)
  }

  const exportPdf = async () => {
    await generateArabicPDF({
      title: `تقرير الصحة والتطعيمات (${fmt(dateFrom)} — ${fmt(dateTo)})`,
      date: new Date().toLocaleDateString('ar-AE'),
      stats: [
        { label: 'إجمالي السجلات', value: filtered.length },
        { label: 'إجمالي التكاليف', value: formatCurrency(totalCost) },
      ],
      columns: [
        { header: 'التاريخ', dataKey: 'date' },
        { header: `رقم ${animalLbl.singular}`, dataKey: 'tagId' },
        { header: 'النوع', dataKey: 'type' },
        { header: 'التشخيص', dataKey: 'diag' },
        { header: 'الطبيب', dataKey: 'vet' },
        { header: 'التكلفة', dataKey: 'cost' },
        { header: 'الموعد القادم', dataKey: 'next' },
      ],
      data: filtered.map(r => ({
        date: fmt(r.date), tagId: r.goat?.tagId ?? '—',
        type: healthTypeLabels[r.type] ?? r.type, diag: r.diagnosis ?? '—',
        vet: r.vetName ?? '—', cost: formatCurrency(r.cost ?? 0), next: fmt(r.nextDate),
      })),
      totals: { date: 'الإجمالي', tagId: '', type: '', diag: '', vet: '', cost: formatCurrency(totalCost), next: '' },
      filename: `health-report-${dateFrom}-${dateTo}.pdf`,
    })
  }

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap="wrap">
          <FilterIcon color="action" sx={{ alignSelf: 'center' }} />
          <TextField label="من تاريخ" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} size="small" sx={{ minWidth: 150 }} />
          <TextField label="إلى تاريخ" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} size="small" sx={{ minWidth: 150 }} />
          <TextField select label="نوع السجل" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} size="small" sx={{ minWidth: 140 }}>
            <MenuItem value="">الكل</MenuItem>
            {Object.entries(healthTypeLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </TextField>
          <TextField
            label="بحث" value={search} onChange={e => setSearch(e.target.value)} size="small" sx={{ flex: 1, minWidth: 160 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment> : null,
            }}
          />
        </Stack>
      </Paper>
      <TabHeader title="تقرير الصحة والتطعيمات" count={filtered.length} onExcelExport={exportExcel} onPdfExport={exportPdf} onRefresh={fetchData} loading={loading} />
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>التاريخ</TableCell>
              <TableCell>رقم {animalLbl.singular}</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>التشخيص / الوصف</TableCell>
              <TableCell>الطبيب البيطري</TableCell>
              <TableCell align="right">التكلفة</TableCell>
              <TableCell>الموعد القادم</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? <LoadingRow /> : filtered.length === 0 ? <EmptyState message="لا توجد سجلات صحية في هذه الفترة" /> : (
              filtered.map((row, idx) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{idx + 1}</TableCell>
                  <TableCell>{fmt(row.date)}</TableCell>
                  <TableCell><strong>{row.goat?.tagId ?? '—'}</strong></TableCell>
                  <TableCell><Chip label={healthTypeLabels[row.type] ?? row.type} size="small" color="info" variant="outlined" /></TableCell>
                  <TableCell>{row.diagnosis ?? '—'}</TableCell>
                  <TableCell>{row.vetName ?? '—'}</TableCell>
                  <TableCell align="right">{row.cost ? formatCurrency(row.cost) : '—'}</TableCell>
                  <TableCell>{row.nextDate ? <Chip label={fmt(row.nextDate)} size="small" color="warning" variant="outlined" /> : '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {!loading && filtered.length > 0 && (
            <TableFooter>
              <TableRow sx={{ '& td': { fontWeight: 'bold', borderTop: '2px solid', borderColor: 'info.200' } }}>
                <TableCell colSpan={6}>{formatNumber(filtered.length)} سجل صحي</TableCell>
                <TableCell align="right">{formatCurrency(totalCost)} إجمالي التكاليف</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </TableContainer>
    </Box>
  )
}

/* ════════════════════════════════════════════════════════════════
   TAB 5 — Breeding Report
════════════════════════════════════════════════════════════════ */
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
  const successRate = filtered.length > 0 ? ((successCount / filtered.length) * 100).toFixed(1) : '—'
  const totalOffspring = useMemo(() => filtered.reduce((s, r) => s + (r.offspringCount ?? 0), 0), [filtered])

  const exportExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(filtered.map(r => ({
      'تاريخ التلقيح': fmt(r.breedingDate), 'الأم': r.mother?.tagId ?? '—', 'الأب': r.father?.tagId ?? '—',
      'تاريخ الولادة المتوقع': fmt(r.expectedBirthDate), 'تاريخ الولادة الفعلي': fmt(r.actualBirthDate),
      'النتيجة': breedingResultLabels[r.result] ?? r.result, 'عدد المواليد': r.offspringCount ?? 0, 'ملاحظات': r.notes ?? '',
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, 'تقرير التكاثر')
    XLSX.writeFile(wb, `breeding-report-${dateFrom}-${dateTo}.xlsx`)
  }

  const exportPdf = async () => {
    await generateArabicPDF({
      title: `تقرير التكاثر (${fmt(dateFrom)} — ${fmt(dateTo)})`,
      date: new Date().toLocaleDateString('ar-AE'),
      stats: [
        { label: 'إجمالي عمليات التلقيح', value: filtered.length },
        { label: 'نسبة النجاح', value: `${successRate}%` },
        { label: 'إجمالي المواليد', value: totalOffspring },
        { label: 'ناجح', value: successCount },
        { label: 'فاشل', value: filtered.filter(r => r.result === 'FAILED').length },
      ],
      columns: [
        { header: 'تاريخ التلقيح', dataKey: 'date' },
        { header: 'الأم', dataKey: 'mother' },
        { header: 'الأب', dataKey: 'father' },
        { header: 'الولادة المتوقعة', dataKey: 'expected' },
        { header: 'النتيجة', dataKey: 'result' },
        { header: 'المواليد', dataKey: 'offspring' },
      ],
      data: filtered.map(r => ({
        date: fmt(r.breedingDate), mother: r.mother?.tagId ?? '—', father: r.father?.tagId ?? '—',
        expected: fmt(r.expectedBirthDate), result: breedingResultLabels[r.result] ?? r.result,
        offspring: r.offspringCount ?? 0,
      })),
      totals: { date: 'الإجمالي', mother: '', father: '', expected: '', result: `نسبة النجاح: ${successRate}%`, offspring: totalOffspring },
      filename: `breeding-report-${dateFrom}-${dateTo}.pdf`,
    })
  }

  return (
    <Box>
      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }} flexWrap="wrap">
          <FilterIcon color="action" sx={{ alignSelf: 'center' }} />
          <TextField label="من تاريخ" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} size="small" sx={{ minWidth: 150 }} />
          <TextField label="إلى تاريخ" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} size="small" sx={{ minWidth: 150 }} />
          <TextField select label="النتيجة" value={resultFilter} onChange={e => setResultFilter(e.target.value)} size="small" sx={{ minWidth: 150 }}>
            <MenuItem value="">الكل</MenuItem>
            {Object.entries(breedingResultLabels).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
          </TextField>
          <TextField
            label="بحث برقم الأم أو الأب" value={search} onChange={e => setSearch(e.target.value)} size="small" sx={{ flex: 1, minWidth: 180 }}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
              endAdornment: search ? <InputAdornment position="end"><IconButton size="small" onClick={() => setSearch('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment> : null,
            }}
          />
        </Stack>
      </Paper>
      <TabHeader title="تقرير التكاثر" count={filtered.length} onExcelExport={exportExcel} onPdfExport={exportPdf} onRefresh={fetchData} loading={loading} />
      {!loading && filtered.length > 0 && (
        <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" useFlexGap>
          <Chip label={`نسبة النجاح: ${successRate}%`} color="success" />
          <Chip label={`إجمالي المواليد: ${totalOffspring}`} color="info" />
          <Chip label={`قيد الانتظار: ${filtered.filter(r => r.result === 'PENDING').length}`} color="warning" />
          <Chip label={`فاشل: ${filtered.filter(r => r.result === 'FAILED').length}`} color="error" variant="outlined" />
        </Stack>
      )}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>تاريخ التلقيح</TableCell>
              <TableCell>الأم ({animalLbl.singular})</TableCell>
              <TableCell>الأب ({animalLbl.singular})</TableCell>
              <TableCell>الولادة المتوقعة</TableCell>
              <TableCell>الولادة الفعلية</TableCell>
              <TableCell>النتيجة</TableCell>
              <TableCell align="center">المواليد</TableCell>
              <TableCell>ملاحظات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? <LoadingRow /> : filtered.length === 0 ? <EmptyState message="لا توجد سجلات تكاثر في هذه الفترة" /> : (
              filtered.map((row, idx) => (
                <TableRow key={row.id} hover>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{idx + 1}</TableCell>
                  <TableCell>{fmt(row.breedingDate)}</TableCell>
                  <TableCell><strong>{row.mother?.tagId ?? '—'}</strong></TableCell>
                  <TableCell><strong>{row.father?.tagId ?? '—'}</strong></TableCell>
                  <TableCell>{fmt(row.expectedBirthDate)}</TableCell>
                  <TableCell>{fmt(row.actualBirthDate)}</TableCell>
                  <TableCell><Chip label={breedingResultLabels[row.result] ?? row.result} size="small" color={breedingResultColors[row.result] ?? 'default'} /></TableCell>
                  <TableCell align="center">{row.offspringCount ? <Chip label={row.offspringCount} size="small" color="info" /> : '—'}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{row.notes ?? '—'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {!loading && filtered.length > 0 && (
            <TableFooter>
              <TableRow sx={{ '& td': { fontWeight: 'bold', borderTop: '2px solid', borderColor: 'success.200' } }}>
                <TableCell colSpan={6}>{formatNumber(filtered.length)} عملية تلقيح</TableCell>
                <TableCell>نجاح: {successCount}</TableCell>
                <TableCell align="center">{totalOffspring} مولود</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </TableContainer>
    </Box>
  )
}

/* ════════════════════════════════════════════════════════════════
   TYPE DECLARATIONS
════════════════════════════════════════════════════════════════ */
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

/* ════════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════════ */
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
      goats: animalLbl.plural, sales: 'المبيعات', expenses: 'المصروفات',
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
    if (!res.ok) { setImportResult(payload.error || 'فشل في الاستيراد'); return }
    const errors = Array.isArray(payload.errors) ? payload.errors.length : 0
    setImportResult(`تم استيراد ${payload.created ?? 0} سجل. أخطاء: ${errors}`)
  }

  return (
    <Box sx={{ width: '100%', overflowX: 'hidden' }}>
      {/* —— Page Header —— */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <ReportsIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">التقارير</Typography>
            <Typography variant="body2" color="text.secondary">
              فلترة البيانات ومراجعتها قبل التصدير
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* —— Tabs —— */}
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
          <Tab label="المبيعات" />
          <Tab label="المصروفات" />
          <Tab label="القطيع" />
          <Tab label="الصحة" />
          <Tab label="التكاثر" />
          <Tab label="استيراد / تصدير" />
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
                  <Typography variant="h6" fontWeight="bold">تصدير البيانات (Excel)</Typography>
                </Stack>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                  <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => handleExportData('goats')} sx={{ color: 'success.main', borderColor: 'success.main' }}>
                    تصدير {animalLbl.plural}
                  </Button>
                  <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => handleExportData('sales')} sx={{ color: 'success.main', borderColor: 'success.main' }}>
                    تصدير المبيعات
                  </Button>
                  <Button variant="outlined" startIcon={<DownloadIcon />} onClick={() => handleExportData('expenses')} sx={{ color: 'success.main', borderColor: 'success.main' }}>
                    تصدير المصروفات
                  </Button>
                </Stack>
              </Stack>
              <Divider sx={{ mb: 3 }} />
              <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <PetsIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">استيراد {animalLbl.plural} (CSV)</Typography>
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
                <Button component="label" variant="contained" startIcon={<UploadIcon />}>
                  اختر ملف CSV
                  <input type="file" hidden accept=".csv" onChange={e => { const f = e.target.files?.[0]; if (f) handleImport(f) }} />
                </Button>
                <Typography variant="body2" color="text.secondary">
                  الأعمدة المطلوبة: tagId, breed, gender, birthDate (YYYY-MM-DD)
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
