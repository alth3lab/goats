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
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'
import {
  Add as AddIcon,
  Search as SearchIcon,
  LocalHospital as HealthIcon
} from '@mui/icons-material'

interface HealthRecord {
  id: string
  type: string
  date: string
  description: string
  veterinarian?: string
  cost?: number
  goat: { tagId: string }
}

const typeLabels: Record<string, string> = {
  VACCINATION: 'تطعيم',
  DEWORMING: 'مضاد ديدان',
  TREATMENT: 'علاج',
  CHECKUP: 'فحص',
  SURGERY: 'جراحة'
}

export default function HealthPage() {
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [goats, setGoats] = useState<Array<{ id: string; tagId: string }>>([])
  const [form, setForm] = useState({
    goatId: '',
    type: 'VACCINATION',
    date: '',
    description: '',
    veterinarian: '',
    cost: ''
  })

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setRecords(Array.isArray(data) ? data : []))
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
      goatId: form.goatId,
      type: form.type,
      date: new Date(form.date),
      description: form.description,
      veterinarian: form.veterinarian || null,
      cost: form.cost ? Number(form.cost) : null
    }

    await fetch('/api/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    setForm({ goatId: '', type: 'VACCINATION', date: '', description: '', veterinarian: '', cost: '' })
    setOpen(false)
    const res = await fetch('/api/health')
    const data = await res.json()
    setRecords(Array.isArray(data) ? data : [])
  }

  const filtered = records.filter(r =>
    r.goat.tagId.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <HealthIcon color="error" />
            <Typography variant="h4" fontWeight="bold">السجلات الصحية</Typography>
          </Stack>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen}>
            إضافة سجل
          </Button>
        </Stack>
        <TextField
          placeholder="بحث برقم التاج أو الوصف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell><strong>رقم التاج</strong></TableCell>
              <TableCell><strong>النوع</strong></TableCell>
              <TableCell><strong>التاريخ</strong></TableCell>
              <TableCell><strong>الوصف</strong></TableCell>
              <TableCell><strong>الطبيب</strong></TableCell>
              <TableCell><strong>التكلفة</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center">جاري التحميل...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">لا توجد بيانات</TableCell></TableRow>
            ) : (
              filtered.map(r => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.goat.tagId}</TableCell>
                  <TableCell>
                    <Chip label={typeLabels[r.type] || r.type} color="error" size="small" />
                  </TableCell>
                  <TableCell>{new Date(r.date).toLocaleDateString('ar-SA')}</TableCell>
                  <TableCell>{r.description}</TableCell>
                  <TableCell>{r.veterinarian || '-'}</TableCell>
                  <TableCell>{r.cost ? `${r.cost} ريال` : '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>إضافة سجل صحي</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={1}>
            <FormControl>
              <InputLabel>الماعز</InputLabel>
              <Select
                value={form.goatId}
                label="الماعز"
                onChange={(e) => setForm({ ...form, goatId: e.target.value })}
              >
                {goats.map(g => (
                  <MenuItem key={g.id} value={g.id}>{g.tagId}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>نوع السجل</InputLabel>
              <Select
                value={form.type}
                label="نوع السجل"
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <MenuItem value="VACCINATION">تطعيم</MenuItem>
                <MenuItem value="DEWORMING">مضاد ديدان</MenuItem>
                <MenuItem value="TREATMENT">علاج</MenuItem>
                <MenuItem value="CHECKUP">فحص</MenuItem>
                <MenuItem value="SURGERY">جراحة</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="التاريخ"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <TextField
              label="الوصف"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <TextField
              label="الطبيب"
              value={form.veterinarian}
              onChange={(e) => setForm({ ...form, veterinarian: e.target.value })}
            />
            <TextField
              label="التكلفة"
              type="number"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />
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
