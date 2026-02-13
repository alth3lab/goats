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
  Divider,
  Checkbox
} from '@mui/material'
import {
  Add as AddIcon,
  People as UsersIcon,
  Security as SecurityIcon
} from '@mui/icons-material'
import { useAuth } from '@/lib/useAuth'
import { actionPermissions } from '@/lib/permissionMap'

interface User {
  id: string
  fullName: string
  username: string
  email: string
  role: string
  isActive: boolean
}

interface Permission {
  id: string
  name: string
  nameAr: string
  category: string
  categoryAr: string
}

const roleLabels: Record<string, string> = {
  ADMIN: 'مدير النظام',
  MANAGER: 'مدير المزرعة',
  VETERINARIAN: 'بيطري',
  USER: 'مستخدم',
  VIEWER: 'عارض'
}

export default function UsersPage() {
  const { can } = useAuth()
  const canAddUser = can(actionPermissions.addUser)
  const canManagePermissions = can(actionPermissions.manageUserPermissions)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [permissionsOpen, setPermissionsOpen] = useState(false)
  const [permissionsLoading, setPermissionsLoading] = useState(false)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([])
  const [savingPermissions, setSavingPermissions] = useState(false)
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
    if (!canAddUser) return
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

  const handleOpenPermissions = async (user: User) => {
    if (!canManagePermissions) return
    setSelectedUser(user)
    setPermissionsOpen(true)
    setPermissionsLoading(true)
    try {
      const [permissionsRes, userPermissionsRes] = await Promise.all([
        fetch('/api/permissions'),
        fetch(`/api/users/${user.id}/permissions`)
      ])
      const permissionsData = await permissionsRes.json()
      const userPermissionsData = await userPermissionsRes.json()

      setPermissions(Array.isArray(permissionsData) ? permissionsData : [])
      const selectedIds = Array.isArray(userPermissionsData)
        ? userPermissionsData.map((item: { permissionId: string }) => item.permissionId)
        : []
      setSelectedPermissionIds(selectedIds)
    } finally {
      setPermissionsLoading(false)
    }
  }

  const togglePermission = (permissionId: string) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    )
  }

  const handleSavePermissions = async () => {
    if (!selectedUser) return
    setSavingPermissions(true)
    try {
      await fetch(`/api/users/${selectedUser.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionIds: selectedPermissionIds })
      })
      setPermissionsOpen(false)
    } finally {
      setSavingPermissions(false)
    }
  }

  const groupedPermissions = permissions.reduce<Record<string, Permission[]>>((acc, permission) => {
    const key = permission.categoryAr || permission.category || 'عام'
    if (!acc[key]) acc[key] = []
    acc[key].push(permission)
    return acc
  }, {})

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <UsersIcon color="primary" />
            <Typography variant="h4" fontWeight="bold">المستخدمين والصلاحيات</Typography>
          </Stack>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
            disabled={!canAddUser}
          >
            إضافة مستخدم
          </Button>
        </Stack>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell><strong>الاسم</strong></TableCell>
              <TableCell><strong>اسم المستخدم</strong></TableCell>
              <TableCell><strong>البريد</strong></TableCell>
              <TableCell><strong>الدور</strong></TableCell>
              <TableCell><strong>الحالة</strong></TableCell>
              <TableCell><strong>الصلاحيات</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} align="center">جاري التحميل...</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">لا توجد بيانات</TableCell></TableRow>
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
                  <TableCell>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenPermissions(u)}
                      disabled={!canManagePermissions}
                    >
                      <SecurityIcon />
                    </IconButton>
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

      <Dialog open={permissionsOpen} onClose={() => setPermissionsOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>إدارة صلاحيات المستخدم</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedUser && (
            <Stack spacing={1} mb={2}>
              <Typography variant="body2" color="text.secondary">المستخدم</Typography>
              <Typography variant="h6" fontWeight="bold">
                {selectedUser.fullName}
              </Typography>
            </Stack>
          )}
          <Divider sx={{ mb: 2 }} />
          {permissionsLoading ? (
            <Typography align="center">جاري تحميل الصلاحيات...</Typography>
          ) : (
            <Stack spacing={2}>
              {Object.entries(groupedPermissions).map(([category, list]) => (
                <Paper key={category} sx={{ p: 2, borderRadius: 2 }} variant="outlined">
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    {category}
                  </Typography>
                  <Stack spacing={1}>
                    {list.map((permission) => (
                      <Stack key={permission.id} direction="row" spacing={1} alignItems="center">
                        <Checkbox
                          checked={selectedPermissionIds.includes(permission.id)}
                          onChange={() => togglePermission(permission.id)}
                        />
                        <Typography>{permission.nameAr}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          ({permission.name})
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermissionsOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSavePermissions} disabled={savingPermissions}>
            {savingPermissions ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
