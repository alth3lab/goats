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
  MenuItem
} from '@mui/material'
import { Add as AddIcon, People as UsersIcon } from '@mui/icons-material'

interface User {
  id: string
  fullName: string
  username: string
  email: string
  role: string
  isActive: boolean
}

const roleLabels: Record<string, string> = {
  ADMIN: 'مدير النظام',
  MANAGER: 'مدير المزرعة',
  VETERINARIAN: 'بيطري',
  USER: 'مستخدم',
  VIEWER: 'عارض'
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    role: 'USER'
  })

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async () => {
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        isActive: true
      })
    })

    setForm({ fullName: '', username: '', email: '', password: '', role: 'USER' })
    setOpen(false)
    const res = await fetch('/api/users')
    const data = await res.json()
    setUsers(Array.isArray(data) ? data : [])
  }

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <UsersIcon color="primary" />
            <Typography variant="h4" fontWeight="bold">المستخدمين والصلاحيات</Typography>
          </Stack>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            إضافة مستخدم
          </Button>
        </Stack>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell><strong>الاسم</strong></TableCell>
              <TableCell><strong>اسم المستخدم</strong></TableCell>
              <TableCell><strong>البريد</strong></TableCell>
              <TableCell><strong>الدور</strong></TableCell>
              <TableCell><strong>الحالة</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} align="center">جاري التحميل...</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center">لا توجد بيانات</TableCell></TableRow>
            ) : (
              users.map(u => (
                <TableRow key={u.id} hover>
                  <TableCell>{u.fullName}</TableCell>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Chip label={roleLabels[u.role] || u.role} color="secondary" size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip label={u.isActive ? 'نشط' : 'معطل'} color={u.isActive ? 'success' : 'default'} size="small" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>إضافة مستخدم</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={1}>
            <TextField label="الاسم الكامل" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <TextField label="اسم المستخدم" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <TextField label="البريد الإلكتروني" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <TextField label="كلمة المرور" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <FormControl>
              <InputLabel>الدور</InputLabel>
              <Select value={form.role} label="الدور" onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <MenuItem value="ADMIN">مدير النظام</MenuItem>
                <MenuItem value="MANAGER">مدير المزرعة</MenuItem>
                <MenuItem value="VETERINARIAN">بيطري</MenuItem>
                <MenuItem value="USER">مستخدم</MenuItem>
                <MenuItem value="VIEWER">عارض</MenuItem>
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
