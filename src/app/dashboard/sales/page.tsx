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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField
} from '@mui/material'
import { Add as AddIcon, ShoppingCart as SalesIcon } from '@mui/icons-material'

interface Sale {
  id: string
  goat?: { tagId: string }
  date: string
  buyerName: string
  salePrice: number
  paymentStatus: string
}

const paymentLabels: Record<string, string> = {
  PENDING: 'معلق',
  PARTIAL: 'جزئي',
  PAID: 'مدفوع'
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [goats, setGoats] = useState<Array<{ id: string; tagId: string }>>([])
  const [form, setForm] = useState({
    goatId: '',
    date: '',
    buyerName: '',
    salePrice: '',
    paymentStatus: 'PENDING'
  })

  useEffect(() => {
    fetch('/api/sales')
      .then(res => res.json())
      .then(data => setSales(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  const loadGoats = async () => {
    const res = await fetch('/api/goats')
    const data = await res.json()
    setGoats(Array.isArray(data) ? data : [])
  }

  const handleOpen = () => {
    setOpen(true)
    if (goats.length === 0) loadGoats()
  }

  const handleSubmit = async () => {
    const payload = {
      goatId: form.goatId || null,
      date: new Date(form.date),
      buyerName: form.buyerName,
      salePrice: Number(form.salePrice),
      paymentStatus: form.paymentStatus
    }

    await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    setForm({ goatId: '', date: '', buyerName: '', salePrice: '', paymentStatus: 'PENDING' })
    setOpen(false)
    const res = await fetch('/api/sales')
    const data = await res.json()
    setSales(Array.isArray(data) ? data : [])
  }

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <SalesIcon color="primary" />
            <Typography variant="h4" fontWeight="bold">المبيعات</Typography>
          </Stack>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen}>
            إضافة بيع
          </Button>
        </Stack>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell><strong>رقم التاج</strong></TableCell>
              <TableCell><strong>التاريخ</strong></TableCell>
              <TableCell><strong>المشتري</strong></TableCell>
              <TableCell><strong>السعر</strong></TableCell>
              <TableCell><strong>حالة الدفع</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} align="center">جاري التحميل...</TableCell></TableRow>
            ) : sales.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center">لا توجد بيانات</TableCell></TableRow>
            ) : (
              sales.map(s => (
                <TableRow key={s.id} hover>
                  <TableCell>{s.goat?.tagId || '-'}</TableCell>
                  <TableCell>{new Date(s.date).toLocaleDateString('ar-SA')}</TableCell>
                  <TableCell>{s.buyerName}</TableCell>
                  <TableCell>{s.salePrice.toLocaleString()} ريال</TableCell>
                  <TableCell>
                    <Chip label={paymentLabels[s.paymentStatus] || s.paymentStatus} color="info" size="small" />
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
              label="السعر"
              type="number"
              value={form.salePrice}
              onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
            />
            <FormControl>
              <InputLabel>حالة الدفع</InputLabel>
              <Select
                value={form.paymentStatus}
                label="حالة الدفع"
                onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
              >
                <MenuItem value="PENDING">معلق</MenuItem>
                <MenuItem value="PARTIAL">جزئي</MenuItem>
                <MenuItem value="PAID">مدفوع</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSubmit}>حفظ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
