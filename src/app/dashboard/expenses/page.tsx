'use client'

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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  InputAdornment,
  useMediaQuery,
  Card,
  CardContent,
  CardActions,
  Grid,
  Divider
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { generateArabicPDF } from '@/lib/pdfHelper'
import * as XLSX from 'xlsx'
import {
  Add as AddIcon,
  Receipt as ExpensesIcon,
  Visibility as ViewIcon,
  History as HistoryIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterIcon
} from '@mui/icons-material'
import { EntityHistory } from '@/components/EntityHistory'
import { useNotifier } from '@/components/AppNotifier'

interface Expense {
  id: string
  date: string
  category: string
  description: string
  amount: number
  paymentMethod?: string
  ownerId?: string | null
  owner?: { id: string; name: string } | null
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

export default function ExpensesPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { notify } = useNotifier()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [owners, setOwners] = useState<Array<{ id: string; name: string }>>([])
  const [filterOwner, setFilterOwner] = useState('ALL')
  const [form, setForm] = useState({
    date: '',
    category: 'FEED',
    description: '',
    amount: '',
    paymentMethod: '',
    ownerId: ''
  })
  const [editForm, setEditForm] = useState({
    date: '',
    category: 'FEED',
    description: '',
    amount: '',
    paymentMethod: '',
    ownerId: ''
  })

  useEffect(() => {
    loadExpenses()
    loadOwners()
  }, [])

  useEffect(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      setFilteredExpenses(expenses)
      return
    }

    setFilteredExpenses(
      expenses.filter((expense) => {
        const matchesSearch = !query || 
          expense.description.toLowerCase().includes(query) ||
          (expense.paymentMethod || '').toLowerCase().includes(query) ||
          (categoryLabels[expense.category] || expense.category).toLowerCase().includes(query) ||
          (expense.owner?.name || '').toLowerCase().includes(query)
        const matchesOwner = filterOwner === 'ALL' || 
          (filterOwner === 'NONE' ? !expense.ownerId : expense.ownerId === filterOwner)
        return matchesSearch && matchesOwner
      })
    )
  }, [expenses, searchQuery, filterOwner])

  const loadExpenses = async () => {
    try {
      const res = await fetch('/api/expenses')
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'فشل في جلب المصروفات' }))
        notify(error.error || 'فشل في جلب المصروفات', { severity: 'error' })
        setExpenses([])
        return
      }
      const data = await res.json()
      setExpenses(Array.isArray(data) ? data : [])
    } catch {
      notify('حدث خطأ في الاتصال بالخادم', { severity: 'error' })
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }

  const loadOwners = async () => {
    try {
      const res = await fetch('/api/owners?active=true')
      if (res.ok) {
        const data = await res.json()
        setOwners(data.map((o: { id: string; name: string }) => ({ id: o.id, name: o.name })))
      }
    } catch {
      setOwners([])
    }
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date(form.date),
          category: form.category,
          description: form.description,
          amount: Number(form.amount),
          paymentMethod: form.paymentMethod || null,
          ownerId: form.ownerId || null
        })
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'فشل في إضافة المصروف' }))
        notify(error.error || 'فشل في إضافة المصروف', { severity: 'error' })
        return
      }

      setForm({ date: '', category: 'FEED', description: '', amount: '', paymentMethod: '', ownerId: '' })
      setOpen(false)
      notify('تمت إضافة المصروف بنجاح', { severity: 'success' })
      await loadExpenses()
    } catch {
      notify('حدث خطأ أثناء إضافة المصروف', { severity: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleView = (expense: Expense) => {
    setSelectedExpense(expense)
    setViewOpen(true)
  }

  const handleEditOpen = (expense: Expense) => {
    setSelectedExpense(expense)
    setEditForm({
      date: new Date(expense.date).toISOString().split('T')[0],
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
      paymentMethod: expense.paymentMethod || '',
      ownerId: expense.ownerId || ''
    })
    setEditOpen(true)
  }

  const handleEditSubmit = async () => {
    if (!selectedExpense || editSubmitting) return
    setEditSubmitting(true)
    try {
      const res = await fetch(`/api/expenses/${selectedExpense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date(editForm.date),
          category: editForm.category,
          description: editForm.description,
          amount: Number(editForm.amount),
          paymentMethod: editForm.paymentMethod || null,
          ownerId: editForm.ownerId || null
        })
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'فشل في تعديل المصروف' }))
        notify(error.error || 'فشل في تعديل المصروف', { severity: 'error' })
        return
      }

      setEditOpen(false)
      setSelectedExpense(null)
      notify('تم تعديل المصروف بنجاح', { severity: 'success' })
      await loadExpenses()
    } catch {
      notify('حدث خطأ أثناء تعديل المصروف', { severity: 'error' })
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDeleteClick = (expense: Expense) => {
    setSelectedExpense(expense)
    setConfirmDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedExpense || deletingId) return
    setDeletingId(selectedExpense.id)
    try {
      const res = await fetch(`/api/expenses/${selectedExpense.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'فشل في حذف المصروف' }))
        notify(error.error || 'فشل في حذف المصروف', { severity: 'error' })
        return
      }

      setConfirmDeleteOpen(false)
      setSelectedExpense(null)
      notify('تم حذف المصروف بنجاح', { severity: 'success' })
      await loadExpenses()
    } catch {
      notify('حدث خطأ أثناء حذف المصروف', { severity: 'error' })
    } finally {
      setDeletingId(null)
    }
  }

  const exportToPDF = async () => {
    const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
    const pData = filteredExpenses.map(e => ({
      date: formatDate(e.date),
      category: categoryLabels[e.category] || e.category,
      description: e.description,
      amount: formatCurrency(e.amount),
      paymentMethod: e.paymentMethod || '-'
    }))
    await generateArabicPDF({
      title: '\u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a',
      date: new Date().toLocaleDateString('en-GB'),
      stats: [
        { label: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a', value: formatCurrency(totalAmount) },
        { label: '\u0639\u062f\u062f \u0627\u0644\u0633\u062c\u0644\u0627\u062a', value: filteredExpenses.length }
      ],
      columns: [
        { header: '\u0637\u0631\u064a\u0642\u0629 \u0627\u0644\u062f\u0641\u0639', dataKey: 'paymentMethod' },
        { header: '\u0627\u0644\u0645\u0628\u0644\u063a', dataKey: 'amount' },
        { header: '\u0627\u0644\u0648\u0635\u0641', dataKey: 'description' },
        { header: '\u0627\u0644\u0641\u0626\u0629', dataKey: 'category' },
        { header: '\u0627\u0644\u062a\u0627\u0631\u064a\u062e', dataKey: 'date' }
      ],
      data: pData,
      totals: { date: '\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a', amount: formatCurrency(totalAmount) },
      filename: `expenses-report-${new Date().toISOString().split('T')[0]}.pdf`
    })
  }

  const exportToExcel = () => {
    const totalAmount = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
    const statsSheet = XLSX.utils.json_to_sheet([
      { 'المؤشر': 'إجمالي المصروفات', 'القيمة': totalAmount },
      { 'المؤشر': 'عدد السجلات', 'القيمة': filteredExpenses.length }
    ])
    const expensesData = filteredExpenses.map(e => ({
      'التاريخ': formatDate(e.date),
      'الفئة': categoryLabels[e.category] || e.category,
      'الوصف': e.description,
      'المبلغ': e.amount,
      'طريقة الدفع': e.paymentMethod || '-'
    }))
    const expensesSheet = XLSX.utils.json_to_sheet(expensesData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, statsSheet, 'الإحصائيات')
    XLSX.utils.book_append_sheet(wb, expensesSheet, 'المصروفات')
    XLSX.writeFile(wb, `expenses-report-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <Box sx={{ width: '100%', overflowX: 'hidden' }}>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={1.5}>
          <Stack direction="row" spacing={2} alignItems="center">
            <ExpensesIcon color="warning" />
            <Typography variant="h4" fontWeight="bold">المصروفات</Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ExpensesIcon />} onClick={exportToPDF} sx={{ color: 'error.main', borderColor: 'error.main', width: { xs: '100%', md: 'auto' } }}>
              تصدير PDF
            </Button>
            <Button variant="outlined" startIcon={<ExpensesIcon />} onClick={exportToExcel} sx={{ color: 'success.main', borderColor: 'success.main', width: { xs: '100%', md: 'auto' } }}>
              تصدير Excel
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ width: { xs: '100%', md: 'auto' } }}>
              إضافة مصروف
            </Button>
          </Stack>
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} mt={2}>
          <TextField
            fullWidth
            placeholder="بحث بالوصف أو الفئة أو طريقة الدفع..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
          />
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel>المالك</InputLabel>
            <Select
              value={filterOwner}
              label="المالك"
              onChange={(e) => setFilterOwner(e.target.value)}
            >
              <MenuItem value="ALL">الكل</MenuItem>
              <MenuItem value="NONE">بدون مالك</MenuItem>
              {owners.map(o => (
                <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      {/* Mobile Cards View */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <Stack spacing={2}>
          {loading ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>جاري التحميل...</Paper>
          ) : filteredExpenses.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>لا توجد بيانات</Paper>
          ) : (
            filteredExpenses.map(e => (
              <Card key={e.id} sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Stack spacing={2}>
                    {/* Header */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Chip label={categoryLabels[e.category] || e.category} size="small" color="warning" />
                      <Typography variant="body2" color="text.secondary">{formatDate(e.date)}</Typography>
                    </Stack>

                    <Divider />

                    {/* Details */}
                    <Box>
                      <Typography variant="body2" color="text.secondary">الوصف</Typography>
                      <Typography variant="body1">{e.description}</Typography>
                    </Box>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="body2" color="text.secondary">المبلغ</Typography>
                        <Typography variant="h6" fontWeight="bold" color="error.main">
                          {formatCurrency(e.amount)}
                        </Typography>
                      </Grid>
                      {e.paymentMethod && (
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="body2" color="text.secondary">طريقة الدفع</Typography>
                          <Typography variant="body1">{e.paymentMethod}</Typography>
                        </Grid>
                      )}
                      {e.owner && (
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="body2" color="text.secondary">المالك</Typography>
                          <Chip label={e.owner.name} size="small" variant="outlined" color="primary" />
                        </Grid>
                      )}
                    </Grid>
                  </Stack>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', px: 2 }}>
                  <IconButton size="small" color="primary" onClick={() => handleView(e)}>
                    <ViewIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="success" onClick={() => handleEditOpen(e)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDeleteClick(e)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </CardActions>
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
              <TableCell><strong>التاريخ</strong></TableCell>
              <TableCell><strong>الفئة</strong></TableCell>
              <TableCell><strong>الوصف</strong></TableCell>
              <TableCell><strong>المبلغ</strong></TableCell>
              <TableCell><strong>طريقة الدفع</strong></TableCell>
              <TableCell><strong>المالك</strong></TableCell>
              <TableCell><strong>الإجراءات</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} align="center">جاري التحميل...</TableCell></TableRow>
            ) : filteredExpenses.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center">لا توجد بيانات</TableCell></TableRow>
            ) : (
              filteredExpenses.map(e => (
                <TableRow key={e.id} hover>
                  <TableCell>{formatDate(e.date)}</TableCell>
                  <TableCell>
                    <Chip label={categoryLabels[e.category] || e.category} size="small" color="warning" />
                  </TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell>{formatCurrency(e.amount)}</TableCell>
                  <TableCell>{e.paymentMethod || '-'}</TableCell>
                  <TableCell>
                    {e.owner ? <Chip label={e.owner.name} size="small" variant="outlined" color="primary" /> : '-'}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="عرض">
                        <IconButton color="primary" onClick={() => handleView(e)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="تعديل">
                        <IconButton color="success" onClick={() => handleEditOpen(e)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton color="error" onClick={() => handleDeleteClick(e)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>إضافة مصروف</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={1}>
            <TextField
              label="التاريخ"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <FormControl>
              <InputLabel>الفئة</InputLabel>
              <Select
                value={form.category}
                label="الفئة"
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <MenuItem value="FEED">علف</MenuItem>
                <MenuItem value="MEDICINE">دواء</MenuItem>
                <MenuItem value="VETERINARY">بيطري</MenuItem>
                <MenuItem value="EQUIPMENT">معدات</MenuItem>
                <MenuItem value="LABOR">عمالة</MenuItem>
                <MenuItem value="UTILITIES">مرافق</MenuItem>
                <MenuItem value="MAINTENANCE">صيانة</MenuItem>
                <MenuItem value="OTHER">أخرى</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="الوصف"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <TextField
              label="المبلغ"
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <TextField
              label="طريقة الدفع"
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
            />
            <FormControl>
              <InputLabel>المالك</InputLabel>
              <Select
                value={form.ownerId}
                label="المالك"
                onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
              >
                <MenuItem value="">بدون مالك</MenuItem>
                {owners.map(o => (
                  <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>تعديل مصروف</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={1}>
            <TextField
              label="التاريخ"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={editForm.date}
              onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
            />
            <FormControl>
              <InputLabel>الفئة</InputLabel>
              <Select
                value={editForm.category}
                label="الفئة"
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
              >
                <MenuItem value="FEED">علف</MenuItem>
                <MenuItem value="MEDICINE">دواء</MenuItem>
                <MenuItem value="VETERINARY">بيطري</MenuItem>
                <MenuItem value="EQUIPMENT">معدات</MenuItem>
                <MenuItem value="LABOR">عمالة</MenuItem>
                <MenuItem value="UTILITIES">مرافق</MenuItem>
                <MenuItem value="MAINTENANCE">صيانة</MenuItem>
                <MenuItem value="OTHER">أخرى</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="الوصف"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            />
            <TextField
              label="المبلغ"
              type="number"
              value={editForm.amount}
              onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
            />
            <TextField
              label="طريقة الدفع"
              value={editForm.paymentMethod}
              onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
            />
            <FormControl>
              <InputLabel>المالك</InputLabel>
              <Select
                value={editForm.ownerId}
                label="المالك"
                onChange={(e) => setEditForm({ ...editForm, ownerId: e.target.value })}
              >
                <MenuItem value="">بدون مالك</MenuItem>
                {owners.map(o => (
                  <MenuItem key={o.id} value={o.id}>{o.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleEditSubmit} disabled={editSubmitting}>
            {editSubmitting ? 'جاري الحفظ...' : 'حفظ التعديل'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>تأكيد حذف المصروف</DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 1 }}>
            هل أنت متأكد من حذف هذا المصروف؟
          </Typography>
          {selectedExpense && (
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {selectedExpense.description} - {formatCurrency(selectedExpense.amount)}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>إلغاء</Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={Boolean(deletingId)}>
            {deletingId ? 'جاري الحذف...' : 'حذف'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>تفاصيل المصروف</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedExpense ? (
            <Stack spacing={2}>
              <Typography><strong>التاريخ:</strong> {formatDate(selectedExpense.date)}</Typography>
              <Typography><strong>الفئة:</strong> {categoryLabels[selectedExpense.category] || selectedExpense.category}</Typography>
              <Typography><strong>الوصف:</strong> {selectedExpense.description}</Typography>
              <Typography><strong>المبلغ:</strong> {formatCurrency(selectedExpense.amount)}</Typography>
              <Typography><strong>طريقة الدفع:</strong> {selectedExpense.paymentMethod || '-'}</Typography>
              <Typography><strong>المالك:</strong> {selectedExpense.owner?.name || 'غير محدد'}</Typography>
              <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                <HistoryIcon color="action" />
                <Typography variant="h6">سجل التغييرات</Typography>
              </Stack>
              <EntityHistory entity="Expense" entityId={selectedExpense.id} />
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
