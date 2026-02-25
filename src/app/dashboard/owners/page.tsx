'use client'

import { useEffect, useState, useCallback } from 'react'
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
  TextField,
  IconButton,
  Tooltip,
  InputAdornment,
  useMediaQuery,
  Card,
  CardContent,
  CardActions,
  Grid,
  Divider,
  Avatar,
  LinearProgress,
  Alert,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  CircularProgress
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { formatCurrency, formatDate } from '@/lib/formatters'
import {
  Add as AddIcon,
  People as OwnersIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  LocationOn as AddressIcon,
  Pets as PetsIcon,
  Receipt as ExpensesIcon,
  ShoppingCart as SalesIcon,
  TrendingUp as ProfitIcon,
  TrendingDown as LossIcon,
  AccountBalance as BalanceIcon
} from '@mui/icons-material'
import { useNotifier } from '@/components/AppNotifier'

interface Owner {
  id: string
  name: string
  phone?: string
  idNumber?: string
  address?: string
  notes?: string
  isActive: boolean
  createdAt: string
  activeGoats: number
  expensesCount: number
  totalExpenses: number
  totalSales: number
  salesCount: number
}

interface OwnerDetail extends Owner {
  goats: Array<{
    id: string
    tagId: string
    name?: string
    gender: string
    status: string
    breed: { nameAr: string; type: { nameAr: string } }
    pen?: { nameAr: string }
  }>
  expenses: Array<{
    id: string
    date: string
    category: string
    description: string
    amount: number
  }>
  sales: Array<{
    id: string
    date: string
    salePrice: number
    buyerName: string
    goat?: { tagId: string; name?: string }
  }>
  financialSummary: {
    totalExpenses: number
    totalSales: number
    netProfit: number
    salesCount: number
    expensesByCategory: Array<{ category: string; amount: number }>
  }
  goatsCount: {
    total: number
    active: number
    sold: number
    deceased: number
  }
}

interface OwnerStats {
  owners: Array<{
    id: string
    name: string
    phone?: string
    activeGoats: number
    totalGoats: number
    maleCount: number
    femaleCount: number
    totalExpenses: number
    totalSales: number
    salesCount: number
    netProfit: number
  }>
  unassigned: {
    activeGoats: number
    totalExpenses: number
    totalSales: number
    salesCount: number
  }
  summary: {
    totalOwners: number
    totalActiveGoats: number
    totalExpenses: number
    totalSales: number
    netProfit: number
  }
}

const categoryLabels: Record<string, string> = {
  FEED: 'علف',
  MEDICINE: 'دواء',
  VETERINARY: 'بيطري',
  EQUIPMENT: 'معدات',
  LABOR: 'عمالة',
  UTILITIES: 'مرافق',
  MAINTENANCE: 'صيانة',
  OTHER: 'أخرى'
}

export default function OwnersPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { notify } = useNotifier()
  const [owners, setOwners] = useState<Owner[]>([])
  const [filteredOwners, setFilteredOwners] = useState<Owner[]>([])
  const [ownerStats, setOwnerStats] = useState<OwnerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Dialogs
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedOwner, setSelectedOwner] = useState<Owner | null>(null)
  const [ownerDetail, setOwnerDetail] = useState<OwnerDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [viewTab, setViewTab] = useState(0)
  
  // Forms
  const [form, setForm] = useState({ name: '', phone: '', idNumber: '', address: '', notes: '' })
  const [editForm, setEditForm] = useState({ name: '', phone: '', idNumber: '', address: '', notes: '', isActive: true })

  const loadOwners = useCallback(async () => {
    try {
      const [ownersRes, statsRes] = await Promise.all([
        fetch('/api/owners'),
        fetch('/api/owners/stats')
      ])
      if (ownersRes.ok) {
        const data = await ownersRes.json()
        setOwners(Array.isArray(data) ? data : [])
      }
      if (statsRes.ok) {
        setOwnerStats(await statsRes.json())
      }
    } catch {
      notify('حدث خطأ في الاتصال بالخادم', { severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => { loadOwners() }, [loadOwners])

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) { setFilteredOwners(owners); return }
    setFilteredOwners(owners.filter(o =>
      o.name.toLowerCase().includes(q) ||
      (o.phone || '').includes(q) ||
      (o.idNumber || '').includes(q)
    ))
  }, [owners, searchQuery])

  const handleSubmit = async () => {
    if (submitting) return
    if (!form.name.trim()) { notify('اسم المالك مطلوب', { severity: 'warning' }); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/owners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        notify(err.error || 'فشل في إضافة المالك', { severity: 'error' }); return
      }
      setForm({ name: '', phone: '', idNumber: '', address: '', notes: '' })
      setOpen(false)
      notify('تم إضافة المالك بنجاح', { severity: 'success' })
      await loadOwners()
    } catch { notify('حدث خطأ', { severity: 'error' }) }
    finally { setSubmitting(false) }
  }

  const handleEditOpen = (owner: Owner) => {
    setSelectedOwner(owner)
    setEditForm({
      name: owner.name,
      phone: owner.phone || '',
      idNumber: owner.idNumber || '',
      address: owner.address || '',
      notes: owner.notes || '',
      isActive: owner.isActive
    })
    setEditOpen(true)
  }

  const handleEditSubmit = async () => {
    if (!selectedOwner || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/owners/${selectedOwner.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        notify(err.error || 'فشل في تعديل المالك', { severity: 'error' }); return
      }
      setEditOpen(false)
      notify('تم تعديل المالك بنجاح', { severity: 'success' })
      await loadOwners()
    } catch { notify('حدث خطأ', { severity: 'error' }) }
    finally { setSubmitting(false) }
  }

  const handleView = async (owner: Owner) => {
    setSelectedOwner(owner)
    setViewTab(0)
    setViewOpen(true)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/owners/${owner.id}`)
      if (res.ok) setOwnerDetail(await res.json())
    } catch { notify('حدث خطأ في جلب التفاصيل', { severity: 'error' }) }
    finally { setDetailLoading(false) }
  }

  const handleDelete = async () => {
    if (!selectedOwner || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/owners/${selectedOwner.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        notify(err.error || 'فشل في حذف المالك', { severity: 'error' }); return
      }
      setConfirmDeleteOpen(false)
      notify('تم حذف المالك بنجاح', { severity: 'success' })
      await loadOwners()
    } catch { notify('حدث خطأ', { severity: 'error' }) }
    finally { setSubmitting(false) }
  }

  const statCards = ownerStats ? [
    { label: 'عدد الملاك', value: ownerStats.summary.totalOwners, icon: <OwnersIcon />, color: 'primary.main' },
    { label: 'إجمالي الحيوانات', value: ownerStats.summary.totalActiveGoats, icon: <PetsIcon />, color: 'success.main' },
    { label: 'إجمالي المبيعات', value: formatCurrency(ownerStats.summary.totalSales), icon: <SalesIcon />, color: 'info.main' },
    { label: 'إجمالي المصروفات', value: formatCurrency(ownerStats.summary.totalExpenses), icon: <ExpensesIcon />, color: 'warning.main' },
    { label: 'صافي الربح', value: formatCurrency(ownerStats.summary.netProfit), icon: ownerStats.summary.netProfit >= 0 ? <ProfitIcon /> : <LossIcon />, color: ownerStats.summary.netProfit >= 0 ? 'success.main' : 'error.main' },
  ] : []

  // Form dialog (shared between add/edit)
  const renderFormFields = (formData: typeof form, setFormData: (v: typeof form) => void) => (
    <Stack spacing={2.5} sx={{ mt: 1 }}>
      <TextField label="اسم المالك *" fullWidth value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
        InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon fontSize="small" /></InputAdornment> }} />
      <TextField label="رقم الجوال" fullWidth value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
        InputProps={{ startAdornment: <InputAdornment position="start"><PhoneIcon fontSize="small" /></InputAdornment> }} />
      <TextField label="رقم الهوية" fullWidth value={formData.idNumber} onChange={e => setFormData({ ...formData, idNumber: e.target.value })}
        InputProps={{ startAdornment: <InputAdornment position="start"><BadgeIcon fontSize="small" /></InputAdornment> }} />
      <TextField label="العنوان" fullWidth value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
        InputProps={{ startAdornment: <InputAdornment position="start"><AddressIcon fontSize="small" /></InputAdornment> }} />
      <TextField label="ملاحظات" fullWidth multiline rows={2} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
    </Stack>
  )

  return (
    <Box sx={{ width: '100%', overflowX: 'hidden' }}>
      {/* Stats Cards */}
      {ownerStats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {statCards.map((card, i) => (
            <Grid key={i} size={{ xs: 6, sm: 4, md: 2.4 }}>
              <Paper sx={{ p: 2, borderRadius: 3, textAlign: 'center' }}>
                <Avatar sx={{ bgcolor: card.color, mx: 'auto', mb: 1, width: 40, height: 40 }}>{card.icon}</Avatar>
                <Typography variant="h6" fontWeight="bold">{card.value}</Typography>
                <Typography variant="caption" color="text.secondary">{card.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={1.5}>
          <Stack direction="row" spacing={2} alignItems="center">
            <OwnersIcon color="primary" />
            <Typography variant="h4" fontWeight="bold">إدارة الملاك</Typography>
          </Stack>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ width: { xs: '100%', md: 'auto' } }}>
            إضافة مالك
          </Button>
        </Stack>
        <TextField
          sx={{ mt: 2 }} fullWidth placeholder="بحث بالاسم أو الجوال أو رقم الهوية..."
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        />
      </Paper>

      {/* Unassigned alert */}
      {ownerStats && ownerStats.unassigned.activeGoats > 0 && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          يوجد {ownerStats.unassigned.activeGoats} حيوان نشط بدون مالك محدد
        </Alert>
      )}

      {/* Mobile Cards */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <Stack spacing={2}>
          {loading ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}><CircularProgress size={24} /><Typography sx={{ mt: 1 }}>جاري التحميل...</Typography></Paper>
          ) : filteredOwners.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>لا يوجد ملاك</Paper>
          ) : (
            filteredOwners.map(owner => (
              <Card key={owner.id} sx={{ borderRadius: 3, opacity: owner.isActive ? 1 : 0.6 }}>
                <CardContent>
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                          <PersonIcon fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">{owner.name}</Typography>
                          {owner.phone && <Typography variant="caption" color="text.secondary">{owner.phone}</Typography>}
                        </Box>
                      </Stack>
                      {!owner.isActive && <Chip label="غير فعال" size="small" color="default" />}
                    </Stack>
                    <Divider />
                    <Grid container spacing={1}>
                      <Grid size={{ xs: 4 }}>
                        <Typography variant="caption" color="text.secondary">الحيوانات</Typography>
                        <Typography variant="body1" fontWeight="bold">{owner.activeGoats}</Typography>
                      </Grid>
                      <Grid size={{ xs: 4 }}>
                        <Typography variant="caption" color="text.secondary">المبيعات</Typography>
                        <Typography variant="body2" fontWeight="bold" color="info.main">{formatCurrency(owner.totalSales)}</Typography>
                      </Grid>
                      <Grid size={{ xs: 4 }}>
                        <Typography variant="caption" color="text.secondary">المصروفات</Typography>
                        <Typography variant="body2" fontWeight="bold" color="warning.main">{formatCurrency(owner.totalExpenses)}</Typography>
                      </Grid>
                    </Grid>
                    <Box sx={{ textAlign: 'center', py: 0.5, bgcolor: (owner.totalSales - owner.totalExpenses) >= 0 ? 'success.50' : 'error.50', borderRadius: 1 }}>
                      <Typography variant="body2" fontWeight="bold" color={(owner.totalSales - owner.totalExpenses) >= 0 ? 'success.main' : 'error.main'}>
                        الصافي: {formatCurrency(owner.totalSales - owner.totalExpenses)}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', px: 2 }}>
                  <IconButton size="small" color="primary" onClick={() => handleView(owner)}><ViewIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="success" onClick={() => handleEditOpen(owner)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => { setSelectedOwner(owner); setConfirmDeleteOpen(true) }}><DeleteIcon fontSize="small" /></IconButton>
                </CardActions>
              </Card>
            ))
          )}
        </Stack>
      </Box>

      {/* Desktop Table */}
      <TableContainer component={Paper} sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell><strong>المالك</strong></TableCell>
              <TableCell><strong>الجوال</strong></TableCell>
              <TableCell><strong>رقم الهوية</strong></TableCell>
              <TableCell align="center"><strong>الحيوانات</strong></TableCell>
              <TableCell align="center"><strong>المبيعات</strong></TableCell>
              <TableCell align="center"><strong>المصروفات</strong></TableCell>
              <TableCell align="center"><strong>الصافي</strong></TableCell>
              <TableCell><strong>الحالة</strong></TableCell>
              <TableCell><strong>الإجراءات</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} align="center">جاري التحميل...</TableCell></TableRow>
            ) : filteredOwners.length === 0 ? (
              <TableRow><TableCell colSpan={9} align="center">لا يوجد ملاك</TableCell></TableRow>
            ) : (
              filteredOwners.map(owner => {
                const net = owner.totalSales - owner.totalExpenses
                return (
                  <TableRow key={owner.id} hover sx={{ opacity: owner.isActive ? 1 : 0.6 }}>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}><PersonIcon fontSize="small" /></Avatar>
                        <Typography fontWeight="bold">{owner.name}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{owner.phone || '-'}</TableCell>
                    <TableCell>{owner.idNumber || '-'}</TableCell>
                    <TableCell align="center">
                      <Chip label={owner.activeGoats} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell align="center">
                      <Typography color="info.main" fontWeight="bold">{formatCurrency(owner.totalSales)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography color="warning.main" fontWeight="bold">{formatCurrency(owner.totalExpenses)}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={formatCurrency(net)}
                        size="small"
                        color={net >= 0 ? 'success' : 'error'}
                        variant="filled"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label={owner.isActive ? 'فعال' : 'غير فعال'} size="small" color={owner.isActive ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="عرض التفاصيل"><IconButton color="primary" onClick={() => handleView(owner)}><ViewIcon /></IconButton></Tooltip>
                        <Tooltip title="تعديل"><IconButton color="success" onClick={() => handleEditOpen(owner)}><EditIcon /></IconButton></Tooltip>
                        <Tooltip title="حذف"><IconButton color="error" onClick={() => { setSelectedOwner(owner); setConfirmDeleteOpen(true) }}><DeleteIcon /></IconButton></Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة مالك جديد</DialogTitle>
        <DialogContent>{renderFormFields(form, setForm as never)}</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تعديل بيانات المالك</DialogTitle>
        <DialogContent>
          {renderFormFields(editForm, setEditForm as never)}
          <FormControlLabel
            sx={{ mt: 2 }}
            control={<Switch checked={editForm.isActive} onChange={e => setEditForm({ ...editForm, isActive: e.target.checked })} />}
            label="مالك فعال"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleEditSubmit} disabled={submitting}>
            {submitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Detail Dialog */}
      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar sx={{ bgcolor: 'primary.main' }}><PersonIcon /></Avatar>
            <Box>
              <Typography variant="h6">{selectedOwner?.name}</Typography>
              {selectedOwner?.phone && <Typography variant="caption" color="text.secondary">{selectedOwner.phone}</Typography>}
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress /><Typography sx={{ mt: 1 }}>جاري التحميل...</Typography></Box>
          ) : ownerDetail ? (
            <>
              {/* Financial Summary Cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: 'primary.50' }}>
                    <PetsIcon color="primary" />
                    <Typography variant="h5" fontWeight="bold">{ownerDetail.goatsCount.active}</Typography>
                    <Typography variant="caption">حيوان نشط</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: 'info.50' }}>
                    <SalesIcon color="info" />
                    <Typography variant="h6" fontWeight="bold">{formatCurrency(ownerDetail.financialSummary.totalSales)}</Typography>
                    <Typography variant="caption">مبيعات</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: 'warning.50' }}>
                    <ExpensesIcon color="warning" />
                    <Typography variant="h6" fontWeight="bold">{formatCurrency(ownerDetail.financialSummary.totalExpenses)}</Typography>
                    <Typography variant="caption">مصروفات</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2, bgcolor: ownerDetail.financialSummary.netProfit >= 0 ? 'success.50' : 'error.50' }}>
                    <BalanceIcon color={ownerDetail.financialSummary.netProfit >= 0 ? 'success' : 'error'} />
                    <Typography variant="h6" fontWeight="bold" color={ownerDetail.financialSummary.netProfit >= 0 ? 'success.main' : 'error.main'}>
                      {formatCurrency(ownerDetail.financialSummary.netProfit)}
                    </Typography>
                    <Typography variant="caption">صافي الربح</Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Owner Info */}
              {(ownerDetail.idNumber || ownerDetail.address || ownerDetail.notes) && (
                <Paper sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: 'grey.50' }}>
                  <Grid container spacing={2}>
                    {ownerDetail.idNumber && (
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">رقم الهوية</Typography>
                        <Typography>{ownerDetail.idNumber}</Typography>
                      </Grid>
                    )}
                    {ownerDetail.address && (
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary">العنوان</Typography>
                        <Typography>{ownerDetail.address}</Typography>
                      </Grid>
                    )}
                    {ownerDetail.notes && (
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="caption" color="text.secondary">ملاحظات</Typography>
                        <Typography>{ownerDetail.notes}</Typography>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              )}

              {/* Tabs */}
              <Tabs value={viewTab} onChange={(_, v) => setViewTab(v)} sx={{ mb: 2 }}>
                <Tab label={`الحيوانات (${ownerDetail.goatsCount.active})`} />
                <Tab label={`المصروفات (${ownerDetail.expenses.length})`} />
                <Tab label={`المبيعات (${ownerDetail.sales.length})`} />
                <Tab label="التوزيع المالي" />
              </Tabs>

              {/* Tab 0: Goats */}
              {viewTab === 0 && (
                <Box>
                  {/* Status summary */}
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip label={`نشط: ${ownerDetail.goatsCount.active}`} color="success" size="small" />
                    <Chip label={`مباع: ${ownerDetail.goatsCount.sold}`} color="info" size="small" />
                    <Chip label={`نافق: ${ownerDetail.goatsCount.deceased}`} color="error" size="small" />
                  </Stack>
                  {ownerDetail.goats.length === 0 ? (
                    <Typography color="text.secondary" textAlign="center" sx={{ py: 3 }}>لا توجد حيوانات نشطة</Typography>
                  ) : (
                    <List disablePadding>
                      {ownerDetail.goats.map(goat => (
                        <ListItem key={goat.id} divider>
                          <ListItemText
                            primary={
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip label={goat.tagId} size="small" color="primary" variant="outlined" />
                                {goat.name && <Typography variant="body2">{goat.name}</Typography>}
                              </Stack>
                            }
                            secondary={
                              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                <Chip label={goat.gender === 'MALE' ? 'ذكر' : 'أنثى'} size="small" variant="outlined" />
                                <Typography variant="caption">{goat.breed?.type?.nameAr} - {goat.breed?.nameAr}</Typography>
                                {goat.pen && <Typography variant="caption">📍 {goat.pen.nameAr}</Typography>}
                              </Stack>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              )}

              {/* Tab 1: Expenses */}
              {viewTab === 1 && (
                <Box>
                  {ownerDetail.expenses.length === 0 ? (
                    <Typography color="text.secondary" textAlign="center" sx={{ py: 3 }}>لا توجد مصروفات</Typography>
                  ) : (
                    <List disablePadding>
                      {ownerDetail.expenses.map(exp => (
                        <ListItem key={exp.id} divider>
                          <ListItemText
                            primary={
                              <Stack direction="row" justifyContent="space-between">
                                <Typography>{exp.description}</Typography>
                                <Typography fontWeight="bold" color="warning.main">{formatCurrency(exp.amount)}</Typography>
                              </Stack>
                            }
                            secondary={
                              <Stack direction="row" spacing={1}>
                                <Chip label={categoryLabels[exp.category] || exp.category} size="small" />
                                <Typography variant="caption">{formatDate(exp.date)}</Typography>
                              </Stack>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              )}

              {/* Tab 2: Sales */}
              {viewTab === 2 && (
                <Box>
                  {ownerDetail.sales.length === 0 ? (
                    <Typography color="text.secondary" textAlign="center" sx={{ py: 3 }}>لا توجد مبيعات</Typography>
                  ) : (
                    <List disablePadding>
                      {ownerDetail.sales.map(sale => (
                        <ListItem key={sale.id} divider>
                          <ListItemText
                            primary={
                              <Stack direction="row" justifyContent="space-between">
                                <Typography>{sale.goat?.tagId || 'بدون'} → {sale.buyerName}</Typography>
                                <Typography fontWeight="bold" color="success.main">{formatCurrency(sale.salePrice)}</Typography>
                              </Stack>
                            }
                            secondary={formatDate(sale.date)}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Box>
              )}

              {/* Tab 3: Financial Breakdown */}
              {viewTab === 3 && (
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>توزيع المصروفات حسب الفئة</Typography>
                  {ownerDetail.financialSummary.expensesByCategory.length === 0 ? (
                    <Typography color="text.secondary" textAlign="center">لا توجد مصروفات</Typography>
                  ) : (
                    <Stack spacing={1.5}>
                      {ownerDetail.financialSummary.expensesByCategory
                        .sort((a, b) => b.amount - a.amount)
                        .map(cat => {
                          const total = ownerDetail.financialSummary.totalExpenses
                          const pct = total > 0 ? (cat.amount / total) * 100 : 0
                          return (
                            <Box key={cat.category}>
                              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                <Typography variant="body2">{categoryLabels[cat.category] || cat.category}</Typography>
                                <Typography variant="body2" fontWeight="bold">{formatCurrency(cat.amount)} ({pct.toFixed(0)}%)</Typography>
                              </Stack>
                              <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4 }} />
                            </Box>
                          )
                        })}
                    </Stack>
                  )}
                </Box>
              )}
            </>
          ) : (
            <Typography>لا توجد بيانات</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>هل أنت متأكد من حذف المالك <strong>{selectedOwner?.name}</strong>؟</Typography>
          {selectedOwner && selectedOwner.activeGoats > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              لدى هذا المالك {selectedOwner.activeGoats} حيوان نشط. يجب نقل الحيوانات أولاً.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={submitting || (selectedOwner?.activeGoats || 0) > 0}>
            {submitting ? 'جاري الحذف...' : 'حذف'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
