'use client'

import { useEffect, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import PeopleIcon from '@mui/icons-material/People'
import DeleteIcon from '@mui/icons-material/Delete'
import { useAuth } from '@/lib/useAuth'

interface TeamMember {
  id: string
  fullName: string
  username: string
  email: string
  phone: string | null
  role: string
  isActive: boolean
  lastLogin: string | null
  createdAt: string
  farmRole: string
  userFarmId: string
}

export default function TeamPage() {
  const { user, can } = useAuth()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  })

  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    phone: '',
    role: 'USER' as string,
  })

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/team')
      if (res.ok) {
        setMembers(await res.json())
      }
    } catch (error) {
      console.error('Error fetching team:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  const handleAdd = async () => {
    if (!form.fullName || !form.username || !form.email || !form.password) return

    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        setSnackbar({ open: true, message: 'تم إضافة العضو بنجاح', severity: 'success' })
        setDialogOpen(false)
        setForm({ fullName: '', username: '', email: '', password: '', phone: '', role: 'USER' })
        fetchMembers()
      } else {
        const data = await res.json()
        setSnackbar({ open: true, message: data.error || 'فشل في إضافة العضو', severity: 'error' })
      }
    } catch {
      setSnackbar({ open: true, message: 'خطأ في الاتصال', severity: 'error' })
    }
  }

  const roleLabel: Record<string, string> = {
    SUPER_ADMIN: 'مدير النظام',
    OWNER: 'المالك',
    ADMIN: 'مدير',
    USER: 'مستخدم',
    VIEWER: 'مشاهد',
  }

  const roleColor: Record<string, 'error' | 'warning' | 'primary' | 'default' | 'info'> = {
    SUPER_ADMIN: 'error',
    OWNER: 'warning',
    ADMIN: 'primary',
    USER: 'default',
    VIEWER: 'info',
  }

  const isAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <PeopleIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h4" fontWeight="bold">فريق العمل</Typography>
            <Chip label={`${members.length} عضو`} color="primary" size="small" />
          </Stack>
          {isAdmin && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
              إضافة عضو
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Members Table */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>الاسم</TableCell>
                <TableCell>اسم المستخدم</TableCell>
                <TableCell>البريد الإلكتروني</TableCell>
                <TableCell>الهاتف</TableCell>
                <TableCell>الدور</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>آخر دخول</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id} hover>
                  <TableCell>
                    <Typography fontWeight="bold">{m.fullName}</Typography>
                  </TableCell>
                  <TableCell>{m.username}</TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell>{m.phone || '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={roleLabel[m.farmRole] || m.farmRole}
                      color={roleColor[m.farmRole] || 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={m.isActive ? 'نشط' : 'معطل'}
                      color={m.isActive ? 'success' : 'default'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    {m.lastLogin
                      ? new Date(m.lastLogin).toLocaleDateString('ar-AE')
                      : 'لم يسجل دخول'}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary" py={4}>لا يوجد أعضاء</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add Member Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة عضو جديد</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="الاسم الكامل"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="اسم المستخدم"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="البريد الإلكتروني"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="كلمة المرور"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="الهاتف"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>الدور</InputLabel>
              <Select
                value={form.role}
                label="الدور"
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <MenuItem value="ADMIN">مدير</MenuItem>
                <MenuItem value="USER">مستخدم</MenuItem>
                <MenuItem value="VIEWER">مشاهد</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={!form.fullName || !form.username || !form.email || !form.password}
          >
            إضافة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
