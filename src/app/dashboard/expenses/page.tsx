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
  IconButton
} from '@mui/material'
import { formatCurrency, formatDate } from '@/lib/formatters'
import {
  Add as AddIcon,
  Receipt as ExpensesIcon,
  Visibility as ViewIcon,
  History as HistoryIcon
} from '@mui/icons-material'
import { EntityHistory } from '@/components/EntityHistory'

interface Expense {
  id: string
  date: string
  category: string
  description: string
  amount: number
  paymentMethod?: string
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
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [form, setForm] = useState({
    date: '',
    category: 'FEED',
    description: '',
    amount: '',
    paymentMethod: ''
  })

  useEffect(() => {
    fetch('/api/expenses')
      .then(res => res.json())
      .then(data => setExpenses(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async () => {
    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: new Date(form.date),
        category: form.category,
        description: form.description,
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod || null
      })
    })

    setForm({ date: '', category: 'FEED', description: '', amount: '', paymentMethod: '' })
    setOpen(false)
    const res = await fetch('/api/expenses')
    const data = await res.json()
    setExpenses(Array.isArray(data) ? data : [])
  }

  const handleView = (expense: Expense) => {
    setSelectedExpense(expense)
    setViewOpen(true)
  }

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <ExpensesIcon color="warning" />
            <Typography variant="h4" fontWeight="bold">المصروفات</Typography>
          </Stack>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            إضافة مصروف
          </Button>
        </Stack>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell><strong>التاريخ</strong></TableCell>
              <TableCell><strong>الفئة</strong></TableCell>
              <TableCell><strong>الوصف</strong></TableCell>
              <TableCell><strong>المبلغ</strong></TableCell>
              <TableCell><strong>طريقة الدفع</strong></TableCell>
              <TableCell><strong>التفاصيل</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center">جاري التحميل...</TableCell></TableRow>
            ) : expenses.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">لا توجد بيانات</TableCell></TableRow>
            ) : (
              expenses.map(e => (
                <TableRow key={e.id} hover>
                  <TableCell>{formatDate(e.date)}</TableCell>
                  <TableCell>
                    <Chip label={categoryLabels[e.category] || e.category} size="small" color="warning" />
                  </TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell>{formatCurrency(e.amount)}</TableCell>
                  <TableCell>{e.paymentMethod || '-'}</TableCell>
                  <TableCell>
                    <IconButton color="primary" onClick={() => handleView(e)}>
                      <ViewIcon />
                    </IconButton>
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSubmit}>حفظ</Button>
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
