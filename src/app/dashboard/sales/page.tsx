'use client'

import { formatCurrency, formatDate, formatNumber } from '@/lib/formatters'

import { useEffect, useState } from 'react'
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Card,
  CardContent,
  Grid,
  InputAdornment,
  Divider,
  Alert
} from '@mui/material'
import { 
  Add as AddIcon, 
  ShoppingCart as SalesIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Payment as PaymentIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  HourglassEmpty as PendingIcon,
  Info as InfoIcon,
  History as HistoryIcon
} from '@mui/icons-material'
import { EntityHistory } from '@/components/EntityHistory'

interface Payment {
  id: string
  amount: number
  paymentDate: string
  paymentMethod: string
  notes?: string
}

interface Sale {
  id: string
  goat?: { 
    tagId: string
    breed: {
      nameAr: string
      type: {
        nameAr: string
      }
    }
  }
  date: string
  buyerName: string
  buyerPhone?: string
  salePrice: number
  paymentStatus: string
  notes?: string
  payments: Payment[]
  totalPaid: number
  remaining: number
}

interface Stats {
  totalSales: number
  pendingSales: number
  partialSales: number
  paidSales: number
  totalRevenue: number
  totalPaidAmount: number
  totalRemaining: number
}

const paymentLabels: Record<string, string> = {
  PENDING: 'معلق',
  PARTIAL: 'جزئي',
  PAID: 'مدفوع'
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [filteredSales, setFilteredSales] = useState<Sale[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [goats, setGoats] = useState<Array<{ id: string; tagId: string }>>([])
  const [form, setForm] = useState({
    goatId: '',
    date: '',
    buyerName: '',
    buyerPhone: '',
    salePrice: '',
    paidAmount: '', // حقل جديد للمبلغ المدفوع
    notes: ''
  })
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'CASH',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)

  useEffect(() => {
    loadSales()
    loadStats()
  }, [])

  useEffect(() => {
    filterSales()
  }, [sales, searchTerm, filterStatus])

  const loadSales = async () => {
    try {
      const res = await fetch('/api/sales')
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'خطأ في جلب البيانات' }))
        console.error('Sales fetch error:', error)
        alert(error.error || 'فشل في جلب المبيعات')
        setSales([])
        return
      }
      const data = await res.json()
      setSales(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load sales:', error)
      alert('خطأ في الاتصال بالخادم')
      setSales([])
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const res = await fetch('/api/sales/stats')
      const data = await res.json()
      setStats(data)
    } catch {
      setStats(null)
    }
  }

  const filterSales = () => {
    let filtered = sales

    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.goat?.tagId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.buyerPhone?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (filterStatus !== 'ALL') {
      filtered = filtered.filter(s => s.paymentStatus === filterStatus)
    }

    setFilteredSales(filtered)
  }

  const loadGoats = async () => {
    const res = await fetch('/api/goats')
    const data = await res.json()
    setGoats(Array.isArray(data) ? data : [])
  }

  const handleOpen = () => {
    setForm({ goatId: '', date: new Date().toISOString().split('T')[0], buyerName: '', buyerPhone: '', salePrice: '', paidAmount: '', notes: '' })
    setOpen(true)
    if (goats.length === 0) loadGoats()
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    
    try {
      const payload = {
        goatId: form.goatId || null,
        date: new Date(form.date),
        buyerName: form.buyerName,
        buyerPhone: form.buyerPhone || null,
        salePrice: Number(form.salePrice),
        paidAmount: form.paidAmount ? Number(form.paidAmount) : 0, // إرسال المبلغ المدفوع
        notes: form.notes || null
      }

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'فشل في إضافة البيع')
        return
      }

      setForm({ goatId: '', date: '', buyerName: '', buyerPhone: '', salePrice: '', paidAmount: '', notes: '' })
      setOpen(false)
      loadSales()
      loadStats()
    } catch (error) {
      alert('حدث خطأ أثناء إضافة البيع')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddPayment = async () => {
    if (!selectedSale || paymentSubmitting) return
    setPaymentSubmitting(true)

    try {
      const payload = {
        amount: Number(paymentForm.amount),
        paymentDate: paymentForm.paymentDate,
        paymentMethod: paymentForm.paymentMethod,
        notes: paymentForm.notes || null
      }

      const res = await fetch(`/api/sales/${selectedSale.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const error = await res.json()
        alert(error.error || 'فشل في إضافة الدفعة')
        return
      }

      setPaymentForm({ amount: '', paymentDate: new Date().toISOString().split('T')[0], paymentMethod: 'CASH', notes: '' })
      setPaymentDialogOpen(false)
      setSelectedSale(null)
      loadSales()
      loadStats()
    } catch (error) {
      alert('حدث خطأ أثناء إضافة الدفعة')
    } finally {
      setPaymentSubmitting(false)
    }
  }

  const openPaymentDialog = (sale: Sale) => {
    setSelectedSale(sale)
    setPaymentForm({ 
      amount: sale.remaining.toString(), 
      paymentDate: new Date().toISOString().split('T')[0], 
      paymentMethod: 'CASH', 
      notes: '' 
    })
    setPaymentDialogOpen(true)
  }

  const openDetailsDialog = (sale: Sale) => {
    setSelectedSale(sale)
    setDetailsDialogOpen(true)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID': return 'success'
      case 'PARTIAL': return 'warning'
      case 'PENDING': return 'error'
      default: return 'default'
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'CASH': return 'نقد'
      case 'TRANSFER': return 'تحويل'
      case 'CHECK': return 'شيك'
      case 'OTHER': return 'أخرى'
      default: return method
    }
  }

  return (
    <Box>
      {/* إحصائيات */}
      {stats && (
        <Grid container spacing={3} mb={3}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <MoneyIcon color="primary" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">إجمالي الإيرادات</Typography>
                    <Typography variant="h5" fontWeight="bold">{formatCurrency(stats.totalRevenue)}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <TrendingUpIcon color="success" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">المبلغ المدفوع</Typography>
                    <Typography variant="h5" fontWeight="bold" color="success.main">{formatCurrency(stats.totalPaidAmount)}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <PendingIcon color="error" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">المبلغ المتبقي</Typography>
                    <Typography variant="h5" fontWeight="bold" color="error.main">{formatCurrency(stats.totalRemaining)}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <SalesIcon color="info" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary">عدد المبيعات</Typography>
                    <Typography variant="h5" fontWeight="bold">{formatNumber(stats.totalSales)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      معلق: {formatNumber(stats.pendingSales)} • جزئي: {formatNumber(stats.partialSales)}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* الفلاتر والبحث */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <SalesIcon color="primary" />
            <Typography variant="h4" fontWeight="bold">المبيعات</Typography>
          </Stack>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen}>
            إضافة بيع
          </Button>
        </Stack>
        
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            placeholder="بحث بالمشتري أو رقم التاج..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
            sx={{ flexGrow: 1 }}
          />
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>حالة الدفع</InputLabel>
            <Select
              value={filterStatus}
              label="حالة الدفع"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="ALL">الكل</MenuItem>
              <MenuItem value="PENDING">معلق</MenuItem>
              <MenuItem value="PARTIAL">جزئي</MenuItem>
              <MenuItem value="PAID">مدفوع</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell><strong>رقم التاج</strong></TableCell>
              <TableCell><strong>التاريخ</strong></TableCell>
              <TableCell><strong>المشتري</strong></TableCell>
              <TableCell><strong>الهاتف</strong></TableCell>
              <TableCell><strong>السعر</strong></TableCell>
              <TableCell><strong>المدفوع</strong></TableCell>
              <TableCell><strong>المتبقي</strong></TableCell>
              <TableCell><strong>حالة الدفع</strong></TableCell>
              <TableCell><strong>الإجراءات</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} align="center">جاري التحميل...</TableCell></TableRow>
            ) : filteredSales.length === 0 ? (
              <TableRow><TableCell colSpan={9} align="center">لا توجد بيانات</TableCell></TableRow>
            ) : (
              filteredSales.map(s => (
                <TableRow key={s.id} hover>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography>{s.goat?.tagId || '-'}</Typography>
                      {s.goat?.breed?.type && (
                        <Chip label={s.goat.breed.type.nameAr} size="small" variant="outlined" />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>{formatDate(s.date)}</TableCell>
                  <TableCell>{s.buyerName}</TableCell>
                  <TableCell>{s.buyerPhone || '-'}</TableCell>
                  <TableCell>
                    <Typography fontWeight="bold">{formatCurrency(s.salePrice)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography color="success.main" fontWeight="bold">{formatCurrency(s.totalPaid)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography color="error.main" fontWeight="bold">{formatCurrency(s.remaining)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={paymentLabels[s.paymentStatus] || s.paymentStatus} 
                      color={getStatusColor(s.paymentStatus)} 
                      size="small" 
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <IconButton 
                        size="small" 
                        color="info"
                        onClick={() => openDetailsDialog(s)}
                        title="عرض التفاصيل"
                      >
                        <InfoIcon />
                      </IconButton>
                      {s.remaining > 0 && (
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => openPaymentDialog(s)}
                          title="إضافة دفعة"
                        >
                          <PaymentIcon />
                        </IconButton>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>إضافة عملية بيع</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={1}>
            <FormControl>
              <InputLabel>الماعز (اختياري)</InputLabel>
              <Select
                value={form.goatId}
                label="الماعز (اختياري)"
                onChange={(e) => setForm({ ...form, goatId: e.target.value })}
              >
                <MenuItem value="">بدون</MenuItem>
                {goats.map(g => (
                  <MenuItem key={g.id} value={g.id}>{g.tagId}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="تاريخ البيع"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <TextField
              label="اسم المشتري"
              value={form.buyerName}
              onChange={(e) => setForm({ ...form, buyerName: e.target.value })}
            />
            <TextField
              label="رقم الهاتف"
              value={form.buyerPhone}
              onChange={(e) => setForm({ ...form, buyerPhone: e.target.value })}
            />
            <TextField
              label="السعر"
              type="number"
              value={form.salePrice}
              onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
            />
            <TextField
              label="المبلغ المدفوع (اختياري)"
              type="number"
              value={form.paidAmount}
              onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}
              helperText="اتركه فارغاً إذا لم يتم دفع أي مبلغ"
            />
            <TextField
              label="ملاحظات"
              multiline
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={submitting}>إلغاء</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* نافذة إضافة دفعة */}
      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <PaymentIcon color="primary" />
            <Typography variant="h6">إضافة دفعة</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedSale && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  <strong>المبلغ الإجمالي:</strong> {formatCurrency(selectedSale.salePrice)}<br />
                  <strong>المدفوع:</strong> {formatCurrency(selectedSale.totalPaid)}<br />
                  <strong>المتبقي:</strong> {formatCurrency(selectedSale.remaining)}
                </Typography>
              </Alert>
              <Stack spacing={2} mt={1}>
                <TextField
                  label="المبلغ"
                  type="number"
                  fullWidth
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  inputProps={{ max: selectedSale.remaining }}
                  helperText={`الحد الأقصى: ${formatCurrency(selectedSale.remaining)}`}
                />
                <TextField
                  label="تاريخ الدفع"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                />
                <FormControl fullWidth>
                  <InputLabel>طريقة الدفع</InputLabel>
                  <Select
                    value={paymentForm.paymentMethod}
                    label="طريقة الدفع"
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  >
                    <MenuItem value="CASH">نقد</MenuItem>
                    <MenuItem value="TRANSFER">تحويل</MenuItem>
                    <MenuItem value="CHECK">شيك</MenuItem>
                    <MenuItem value="OTHER">أخرى</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  label="ملاحظات"
                  multiline
                  rows={2}
                  fullWidth
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                />
              </Stack>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)} disabled={paymentSubmitting}>إلغاء</Button>
          <Button 
            variant="contained" 
            onClick={handleAddPayment} 
            startIcon={<AddIcon />}
            disabled={paymentSubmitting}
          >
            {paymentSubmitting ? 'جاري الإضافة...' : 'إضافة الدفعة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* نافذة التفاصيل */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <InfoIcon color="info" />
            <Typography variant="h6">تفاصيل عملية البيع</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedSale && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                {/* معلومات البيع */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" color="primary" gutterBottom>معلومات البيع</Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Stack spacing={1.5}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">رقم التاج</Typography>
                          <Typography variant="body1">{selectedSale.goat?.tagId || '-'}</Typography>
                        </Box>
                        {selectedSale.goat?.breed?.type && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">النوع</Typography>
                            <Chip label={selectedSale.goat.breed.type.nameAr} size="small" />
                          </Box>
                        )}
                        <Box>
                          <Typography variant="caption" color="text.secondary">تاريخ البيع</Typography>
                          <Typography variant="body1">{formatDate(selectedSale.date)}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">السعر الإجمالي</Typography>
                          <Typography variant="h6" color="primary">{formatCurrency(selectedSale.salePrice)}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">حالة الدفع</Typography>
                          <Chip 
                            label={paymentLabels[selectedSale.paymentStatus]} 
                            color={getStatusColor(selectedSale.paymentStatus)} 
                            size="small" 
                          />
                        </Box>
                        {selectedSale.notes && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">ملاحظات</Typography>
                            <Typography variant="body2">{selectedSale.notes}</Typography>
                          </Box>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* معلومات المشتري */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" color="primary" gutterBottom>معلومات المشتري</Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Stack spacing={1.5}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">الاسم</Typography>
                          <Typography variant="body1">{selectedSale.buyerName}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">رقم الهاتف</Typography>
                          <Typography variant="body1">{selectedSale.buyerPhone || '-'}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>

                  <Card variant="outlined" sx={{ mt: 2 }}>
                    <CardContent>
                      <Typography variant="h6" color="primary" gutterBottom>ملخص الدفعات</Typography>
                      <Divider sx={{ mb: 2 }} />
                      <Stack spacing={1.5}>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">المبلغ الإجمالي</Typography>
                          <Typography variant="body1" fontWeight="bold">{formatCurrency(selectedSale.salePrice)}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">المدفوع</Typography>
                          <Typography variant="body1" fontWeight="bold" color="success.main">{formatCurrency(selectedSale.totalPaid)}</Typography>
                        </Box>
                        <Box display="flex" justifyContent="space-between">
                          <Typography variant="body2" color="text.secondary">المتبقي</Typography>
                          <Typography variant="body1" fontWeight="bold" color="error.main">{formatCurrency(selectedSale.remaining)}</Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* جدول الدفعات */}
                <Grid size={{ xs: 12 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6" color="primary">سجل الدفعات ({selectedSale.payments.length})</Typography>
                        {selectedSale.remaining > 0 && (
                          <Button 
                            variant="contained" 
                            size="small" 
                            startIcon={<AddIcon />}
                            onClick={() => {
                              setDetailsDialogOpen(false)
                              openPaymentDialog(selectedSale)
                            }}
                          >
                            إضافة دفعة
                          </Button>
                        )}
                      </Stack>
                      <Divider sx={{ mb: 2 }} />
                      {selectedSale.payments.length === 0 ? (
                        <Alert severity="info">لا توجد دفعات مسجلة</Alert>
                      ) : (
                        <TableContainer>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell><strong>التاريخ</strong></TableCell>
                                <TableCell><strong>المبلغ</strong></TableCell>
                                <TableCell><strong>طريقة الدفع</strong></TableCell>
                                <TableCell><strong>ملاحظات</strong></TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {selectedSale.payments.map(payment => (
                                <TableRow key={payment.id}>
                                  <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                                  <TableCell>
                                    <Typography fontWeight="bold" color="success.main">
                                      {formatCurrency(payment.amount)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell>
                                    <Chip label={getPaymentMethodLabel(payment.paymentMethod)} size="small" variant="outlined" />
                                  </TableCell>
                                  <TableCell>{payment.notes || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                        <HistoryIcon color="action" />
                        <Typography variant="h6" color="primary">سجل التغييرات</Typography>
                      </Stack>
                      <EntityHistory entity="Sale" entityId={selectedSale.id} />
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
