'use client'

import { useState, useEffect } from 'react'
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Alert,
  useMediaQuery,
  Card,
  CardContent,
  CardActions,
  Divider,
  Stack,
  InputAdornment,
  CircularProgress,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material'
import { useTheme, alpha } from '@mui/material/styles'
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  SwapHoriz as SwapHorizIcon,
  Search as SearchIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material'
import { formatCurrency } from '@/lib/formatters'
import { useAuth } from '@/lib/useAuth'

const CATEGORIES = [
  { value: 'MEDICINE',  label: 'أدوية',       color: 'error'   as const },
  { value: 'VACCINE',   label: 'لقاحات',      color: 'warning' as const },
  { value: 'EQUIPMENT', label: 'معدات',        color: 'info'    as const },
  { value: 'SUPPLIES',  label: 'مستلزمات',    color: 'default' as const },
]

const TRANSACTION_TYPES = [
  { value: 'PURCHASE',   label: 'شراء' },
  { value: 'USAGE',      label: 'استخدام' },
  { value: 'ADJUSTMENT', label: 'تعديل' },
  { value: 'EXPIRED',    label: 'منتهي الصلاحية' },
  { value: 'RETURN',     label: 'إرجاع' },
]

const EMPTY_FORM = { nameAr: '', nameEn: '', category: 'SUPPLIES', unit: '', minStock: 0, currentStock: 0, unitPrice: 0, notes: '' }
const EMPTY_TX   = { type: 'PURCHASE', quantity: 0, unitPrice: 0, reference: '', notes: '' }

export default function InventoryPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  useAuth()

  const [items,    setItems]    = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [catFilter, setCatFilter] = useState('ALL')

  const [dialogOpen, setDialogOpen]             = useState(false)
  const [txDialogOpen, setTxDialogOpen]         = useState(false)
  const [selectedItem, setSelectedItem]         = useState<any>(null)
  const [formData, setFormData]                 = useState({ ...EMPTY_FORM })
  const [txData, setTxData]                     = useState({ ...EMPTY_TX })
  const [snack, setSnack]                       = useState({ open: false, msg: '', ok: true })

  const showSnack = (msg: string, ok = true) => setSnack({ open: true, msg, ok })

  useEffect(() => { fetchItems() }, [])

  const fetchItems = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/inventory')
      if (!res.ok) throw new Error('فشل في جلب البيانات')
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch (e: any) {
      showSnack(e.message, false)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveItem = async () => {
    try {
      const url    = selectedItem ? `/api/inventory/${selectedItem.id}` : '/api/inventory'
      const method = selectedItem ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      if (!res.ok) throw new Error('فشل في حفظ الصنف')
      showSnack(selectedItem ? 'تم التعديل بنجاح' : 'تمت الإضافة بنجاح')
      fetchItems()
      setDialogOpen(false)
    } catch (e: any) { showSnack(e.message, false) }
  }

  const handleDeleteItem = async (item: any) => {
    if (!confirm(`هل تريد حذف "${item.nameAr}"؟`)) return
    try {
      const res = await fetch(`/api/inventory/${item.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('فشل في الحذف')
      showSnack('تم الحذف بنجاح')
      fetchItems()
    } catch (e: any) { showSnack(e.message, false) }
  }

  const handleAddTransaction = async () => {
    if (!selectedItem) return
    try {
      const res = await fetch(`/api/inventory/${selectedItem.id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txData)
      })

      if (!res.ok) throw new Error('فشل في تسجيل الحركة')
      showSnack('تم تسجيل الحركة بنجاح')
      fetchItems()
      setTxDialogOpen(false)
      setTxData({ ...EMPTY_TX })
    } catch (e: any) { showSnack(e.message, false) }
  }

  const openEdit = (item?: any) => {
    setSelectedItem(item || null)
    setFormData(item ? { ...item } : { ...EMPTY_FORM })
    setDialogOpen(true)
  }

  const openTx = (item: any) => {
    setSelectedItem(item)
    setTxData({ ...EMPTY_TX })
    setTxDialogOpen(true)
  }

  // ── KPI ──────────────────────────────────────────────────────────────────
  const lowStock   = items.filter(i => i.currentStock <= i.minStock)
  const totalValue = items.reduce((s, i) => s + (i.currentStock * (i.unitPrice || 0)), 0)

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = items.filter(i => {
    const matchSearch = !search ||
      i.nameAr?.toLowerCase().includes(search.toLowerCase()) ||
      i.nameEn?.toLowerCase().includes(search.toLowerCase())
    const matchCat = catFilter === 'ALL' || i.category === catFilter
    return matchSearch && matchCat
  })

  return (
    <Box sx={{ width: '100%', overflowX: 'hidden' }}>

      {/* Low-stock alert banner */}
      {lowStock.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }} icon={<WarningIcon />}>
          يوجد <strong>{lowStock.length}</strong> صنف وصل للحد الأدنى أو نفد — تحقق من المخزون
        </Alert>
      )}

      {/* KPI Cards */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
        <Paper sx={{ p: 2, flex: 1, borderRadius: 3, border: '1px solid', borderColor: alpha(theme.palette.primary.main, 0.22), bgcolor: alpha(theme.palette.primary.main, 0.07) }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <InventoryIcon sx={{ color: 'primary.main', fontSize: 36 }} />
            <Box>
              <Typography variant="subtitle2" color="text.secondary">إجمالي الأصناف</Typography>
              <Typography variant="h4" fontWeight="bold" color="primary.dark">{items.length}</Typography>
            </Box>
          </Stack>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, borderRadius: 3, border: '1px solid', borderColor: alpha(theme.palette.error.main, 0.22), bgcolor: alpha(theme.palette.error.main, 0.07) }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <WarningIcon sx={{ color: 'error.main', fontSize: 36 }} />
            <Box>
              <Typography variant="subtitle2" color="text.secondary">مخزون منخفض</Typography>
              <Typography variant="h4" fontWeight="bold" color="error.dark">{lowStock.length}</Typography>
            </Box>
          </Stack>
        </Paper>
        <Paper sx={{ p: 2, flex: 1, borderRadius: 3, border: '1px solid', borderColor: alpha(theme.palette.success.main, 0.22), bgcolor: alpha(theme.palette.success.main, 0.07) }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <MoneyIcon sx={{ color: 'success.main', fontSize: 36 }} />
            <Box>
              <Typography variant="subtitle2" color="text.secondary">قيمة المخزون</Typography>
              <Typography variant="h5" fontWeight="bold" color="success.dark">{formatCurrency(totalValue)}</Typography>
            </Box>
          </Stack>
        </Paper>
      </Stack>

      {/* Main Content */}
      <Paper sx={{ p: { xs: 1.5, sm: 3 }, borderRadius: 3 }}>

        {/* Header row */}
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} mb={2} spacing={1.5}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <InventoryIcon color="primary" />
            <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">إدارة المخزون</Typography>
            <Chip label={`${items.length} صنف`} size="small" color="primary" variant="outlined" />
          </Stack>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => openEdit()} fullWidth={isMobile}>
            إضافة صنف
          </Button>
        </Stack>

        {/* Search + category filter */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2}>
          <TextField
            fullWidth
            size="small"
            placeholder="بحث بالاسم..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>الفئة</InputLabel>
            <Select value={catFilter} label="الفئة" onChange={e => setCatFilter(e.target.value)}>
              <MenuItem value="ALL">جميع الفئات</MenuItem>
              {CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>

        {/* Content area */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <InventoryIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography color="text.secondary">لا توجد أصناف</Typography>
          </Box>
        ) : (
          <>
            {/* ── Mobile Cards ─────────────────────────────────────────────── */}
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              <Stack spacing={2}>
                {filtered.map((item: any) => {
                  const cat   = CATEGORIES.find(c => c.value === item.category)
                  const isLow = item.currentStock <= item.minStock
                  return (
                    <Card key={item.id} sx={{ borderRadius: 3, border: '1px solid', borderColor: isLow ? 'error.light' : 'divider' }}>
                      <CardContent>
                        <Stack spacing={1.5}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                            <Box>
                              <Typography variant="h6" fontWeight="bold">{item.nameAr}</Typography>
                              {item.nameEn && <Typography variant="caption" color="text.secondary">{item.nameEn}</Typography>}
                            </Box>
                            <Stack spacing={0.5} alignItems="flex-end">
                              <Chip label={cat?.label} size="small" color={cat?.color} />
                              {isLow && (
                                <Chip
                                  icon={<WarningIcon />}
                                  label={item.currentStock === 0 ? 'نفد' : 'منخفض'}
                                  color="error"
                                  size="small"
                                />
                              )}
                            </Stack>
                          </Stack>
                          <Divider />
                          <Grid container spacing={1.5}>
                            <Grid size={{ xs: 6 }}>
                              <Typography variant="caption" color="text.secondary">الكمية الحالية</Typography>
                              <Typography variant="h6" fontWeight="bold" color={isLow ? 'error.main' : 'primary.main'}>
                                {item.currentStock} {item.unit}
                              </Typography>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <Typography variant="caption" color="text.secondary">الحد الأدنى</Typography>
                              <Typography variant="body2">{item.minStock} {item.unit}</Typography>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <Typography variant="caption" color="text.secondary">سعر الوحدة</Typography>
                              <Typography variant="body2">{formatCurrency(item.unitPrice || 0)}</Typography>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <Typography variant="caption" color="text.secondary">إجمالي القيمة</Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {formatCurrency(item.currentStock * (item.unitPrice || 0))}
                              </Typography>
                            </Grid>
                          </Grid>
                        </Stack>
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 1.5 }}>
                        <IconButton size="small" color="primary" onClick={() => openTx(item)} title="تسجيل حركة">
                          <SwapHorizIcon />
                        </IconButton>
                        <IconButton size="small" onClick={() => openEdit(item)} title="تعديل">
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteItem(item)} title="حذف">
                          <DeleteIcon />
                        </IconButton>
                      </CardActions>
                    </Card>
                  )
                })}
              </Stack>
            </Box>

            {/* ── Desktop Table ─────────────────────────────────────────────── */}
            <TableContainer sx={{ display: { xs: 'none', md: 'block' }, overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>الصنف</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الفئة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الكمية</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الحد الأدنى</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>سعر الوحدة</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>إجمالي القيمة</TableCell>
                    <TableCell align="left" sx={{ fontWeight: 'bold' }}>الإجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((item: any) => {
                    const cat   = CATEGORIES.find(c => c.value === item.category)
                    const isLow = item.currentStock <= item.minStock
                    return (
                      <TableRow key={item.id} hover sx={{ bgcolor: isLow ? alpha(theme.palette.error.main, 0.03) : undefined }}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold">{item.nameAr}</Typography>
                          {item.nameEn && <Typography variant="caption" color="text.secondary">{item.nameEn}</Typography>}
                        </TableCell>
                        <TableCell>
                          <Chip label={cat?.label} size="small" color={cat?.color} />
                        </TableCell>
                        <TableCell>
                          <Typography fontWeight="bold" color={isLow ? 'error.main' : 'text.primary'}>
                            {item.currentStock} {item.unit}
                          </Typography>
                        </TableCell>
                        <TableCell>{item.minStock} {item.unit}</TableCell>
                        <TableCell>
                          {item.currentStock === 0 ? (
                            <Chip icon={<WarningIcon />} label="نفد المخزون" color="error" size="small" />
                          ) : isLow ? (
                            <Chip icon={<WarningIcon />} label="مخزون منخفض" color="warning" size="small" />
                          ) : (
                            <Chip label="جيد" color="success" size="small" />
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency(item.unitPrice || 0)}</TableCell>
                        <TableCell>{formatCurrency(item.currentStock * (item.unitPrice || 0))}</TableCell>
                        <TableCell align="left">
                          <Stack direction="row" spacing={0.5}>
                            <IconButton size="small" color="primary" onClick={() => openTx(item)} title="تسجيل حركة">
                              <SwapHorizIcon />
                            </IconButton>
                            <IconButton size="small" onClick={() => openEdit(item)} title="تعديل">
                              <EditIcon />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => handleDeleteItem(item)} title="حذف">
                              <DeleteIcon />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Paper>

      {/* ── Add / Edit Dialog ──────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedItem ? 'تعديل الصنف' : 'إضافة صنف جديد'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="الاسم بالعربية" value={formData.nameAr}
                onChange={e => setFormData({ ...formData, nameAr: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="الاسم بالإنجليزية" value={formData.nameEn}
                onChange={e => setFormData({ ...formData, nameEn: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField select fullWidth label="الفئة" value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}>
                {CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="وحدة القياس (حبة / مل / كجم)" value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth type="number" label="الحد الأدنى للمخزون" value={formData.minStock}
                onChange={e => setFormData({ ...formData, minStock: Number(e.target.value) })} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth type="number" label="الكمية الحالية" value={formData.currentStock}
                onChange={e => setFormData({ ...formData, currentStock: Number(e.target.value) })} />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth type="number" label="سعر الوحدة (درهم)" value={formData.unitPrice}
                onChange={e => setFormData({ ...formData, unitPrice: Number(e.target.value) })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline rows={2} label="ملاحظات" value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleSaveItem} variant="contained">
            {selectedItem ? 'حفظ التعديل' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Transaction Dialog ──────────────────────────────────────────────── */}
      <Dialog open={txDialogOpen} onClose={() => setTxDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <SwapHorizIcon color="primary" />
            <Box>
              <Typography variant="h6">تسجيل حركة مخزون</Typography>
              {selectedItem && (
                <Typography variant="body2" color="text.secondary">
                  {selectedItem.nameAr} — الكمية الحالية: <strong>{selectedItem.currentStock} {selectedItem.unit}</strong>
                </Typography>
              )}
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField select fullWidth label="نوع الحركة" value={txData.type}
                onChange={e => setTxData({ ...txData, type: e.target.value })}>
                {TRANSACTION_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth type="number" label="الكمية" value={txData.quantity}
                onChange={e => setTxData({ ...txData, quantity: Number(e.target.value) })} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth type="number" label="سعر الوحدة (درهم)" value={txData.unitPrice}
                onChange={e => setTxData({ ...txData, unitPrice: Number(e.target.value) })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="المرجع / رقم الفاتورة" value={txData.reference}
                onChange={e => setTxData({ ...txData, reference: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline rows={2} label="ملاحظات" value={txData.notes}
                onChange={e => setTxData({ ...txData, notes: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTxDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleAddTransaction} variant="contained" startIcon={<SwapHorizIcon />}>
            تسجيل الحركة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.ok ? 'success' : 'error'}
          variant="filled"
          onClose={() => setSnack(s => ({ ...s, open: false }))}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  )
}
