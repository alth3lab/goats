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
  Checkbox,
  useMediaQuery,
  Card,
  CardContent,
  CardActions,
  Grid,
  Alert,
  OutlinedInput,
  ListItemText,
  Tooltip,
  Switch,
  FormControlLabel,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  Add as AddIcon,
  People as UsersIcon,
  Security as SecurityIcon,
  Edit as EditIcon,
  Agriculture as FarmIcon,
} from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { actionPermissions } from '@/lib/permissionMap'
import LinearProgress from '@mui/material/LinearProgress'

interface Farm {
  id: string
  name: string
  nameAr: string
}

interface UserFarm {
  farmId: string
  role: string
  farm: Farm
}

interface User {
  id: string
  fullName: string
  username: string
  email: string
  phone?: string
  role: string
  isActive: boolean
  userFarms?: UserFarm[]
}

interface Permission {
  id: string
  name: string
  nameAr: string
  category: string
  categoryAr: string
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'مدير النظام',
  OWNER: 'مالك المزرعة',
  ADMIN: 'مسؤول',
  MANAGER: 'مشرف',
  VETERINARIAN: 'بيطري',
  USER: 'مستخدم',
  VIEWER: 'عارض'
}

const emptyForm = {
  fullName: '',
  username: '',
  email: '',
  phone: '',
  password: '',
  role: 'USER',
  isActive: true,
  farmIds: [] as string[],
}

export default function UsersPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const router = useRouter()
  const { can, user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(user?.role || '')) {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  const canAddUser = can(actionPermissions.addUser)
  const canManagePermissions = can(actionPermissions.manageUserPermissions)
  const [users, setUsers] = useState<User[]>([])
  const [farms, setFarms] = useState<Farm[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [permissionsOpen, setPermissionsOpen] = useState(false)
  const [permissionsLoading, setPermissionsLoading] = useState(false)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([])
  const [savingPermissions, setSavingPermissions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/users')
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch {
      setUsers([])
    }
  }

  const loadFarms = async () => {
    try {
      const res = await fetch('/api/farms')
      const data = await res.json()
      setFarms(Array.isArray(data) ? data.map((f: any) => ({ id: f.id, name: f.name, nameAr: f.nameAr })) : [])
    } catch {
      setFarms([])
    }
  }

  useEffect(() => {
    Promise.all([loadUsers(), loadFarms()]).finally(() => setLoading(false))
  }, [])

  const handleOpenAdd = () => {
    setEditMode(false)
    setEditingUserId(null)
    setForm(emptyForm)
    setError('')
    setOpen(true)
  }

  const handleOpenEdit = (u: User) => {
    setEditMode(true)
    setEditingUserId(u.id)
    setForm({
      fullName: u.fullName,
      username: u.username,
      email: u.email,
      phone: u.phone || '',
      password: '',
      role: u.role,
      isActive: u.isActive,
      farmIds: u.userFarms?.map(uf => uf.farmId) || [],
    })
    setError('')
    setOpen(true)
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    try {
      if (editMode && editingUserId) {
        const payload: any = {
          fullName: form.fullName,
          email: form.email,
          phone: form.phone || null,
          role: form.role,
          isActive: form.isActive,
          farmIds: form.farmIds,
        }
        if (form.password) payload.password = form.password

        const res = await fetch(`/api/users/${editingUserId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'فشل في تعديل المستخدم')
          return
        }
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: form.fullName,
            username: form.username,
            email: form.email,
            phone: form.phone || undefined,
            password: form.password,
            role: form.role,
            isActive: true,
            farmIds: form.farmIds,
          })
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'فشل في إضافة المستخدم')
          return
        }
      }
      setOpen(false)
      setForm(emptyForm)
      await loadUsers()
    } catch {
      setError('حدث خطأ غير متوقع')
    } finally {
      setSaving(false)
    }
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

  if (authLoading || !user) return <Box sx={{ p: 4 }}><LinearProgress /></Box>
  if (!['SUPER_ADMIN', 'OWNER', 'ADMIN'].includes(user.role)) return null

  return (
    <Box sx={{ width: '100%', overflowX: 'hidden' }}>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={1.5}>
          <Stack direction="row" spacing={2} alignItems="center">
            <UsersIcon color="primary" />
            <Typography variant="h4" fontWeight="bold">المستخدمين والصلاحيات</Typography>
          </Stack>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
            disabled={!canAddUser}
            sx={{ width: { xs: '100%', md: 'auto' } }}
          >
            إضافة مستخدم
          </Button>
        </Stack>
      </Paper>

      {/* Mobile Cards View */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <Stack spacing={2}>
          {loading ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>جاري التحميل...</Paper>
          ) : users.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>لا توجد بيانات</Paper>
          ) : (
            users.map(u => (
              <Card key={u.id} sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Stack spacing={2}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6" fontWeight="bold">{u.fullName}</Typography>
                      <Chip label={u.isActive ? 'نشط' : 'معطل'} color={u.isActive ? 'success' : 'default'} size="small" />
                    </Stack>

                    <Divider />

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="body2" color="text.secondary">اسم المستخدم</Typography>
                        <Typography variant="body1">{u.username}</Typography>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="body2" color="text.secondary">البريد الإلكتروني</Typography>
                        <Typography variant="body1">{u.email}</Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="body2" color="text.secondary">الدور</Typography>
                        <Chip label={roleLabels[u.role] || u.role} color="secondary" size="small" sx={{ mt: 0.5 }} />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <Typography variant="body2" color="text.secondary">المزارع</Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                          {u.userFarms && u.userFarms.length > 0 ? (
                            u.userFarms.map(uf => (
                              <Chip
                                key={uf.farmId}
                                icon={<FarmIcon />}
                                label={uf.farm.nameAr || uf.farm.name}
                                size="small"
                                variant="outlined"
                                color="primary"
                              />
                            ))
                          ) : (
                            <Chip label="بدون مزرعة" size="small" color="warning" variant="outlined" />
                          )}
                        </Stack>
                      </Grid>
                    </Grid>
                  </Stack>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', px: 2 }}>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    onClick={() => handleOpenEdit(u)}
                    disabled={!canAddUser}
                  >
                    تعديل
                  </Button>
                  <Button
                    size="small"
                    startIcon={<SecurityIcon />}
                    onClick={() => handleOpenPermissions(u)}
                    disabled={!canManagePermissions}
                  >
                    الصلاحيات
                  </Button>
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
              <TableCell><strong>الاسم</strong></TableCell>
              <TableCell><strong>اسم المستخدم</strong></TableCell>
              <TableCell><strong>البريد</strong></TableCell>
              <TableCell><strong>الدور</strong></TableCell>
              <TableCell><strong>المزارع</strong></TableCell>
              <TableCell><strong>الحالة</strong></TableCell>
              <TableCell><strong>الإجراءات</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} align="center">جاري التحميل...</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center">لا توجد بيانات</TableCell></TableRow>
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
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {u.userFarms && u.userFarms.length > 0 ? (
                        u.userFarms.map(uf => (
                          <Chip
                            key={uf.farmId}
                            icon={<FarmIcon />}
                            label={uf.farm.nameAr || uf.farm.name}
                            size="small"
                            variant="outlined"
                            color="primary"
                          />
                        ))
                      ) : (
                        <Chip label="بدون مزرعة" size="small" color="warning" variant="outlined" />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip label={u.isActive ? 'نشط' : 'معطل'} color={u.isActive ? 'success' : 'default'} size="small" />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="تعديل">
                        <IconButton
                          color="primary"
                          onClick={() => handleOpenEdit(u)}
                          disabled={!canAddUser}
                          size="small"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="الصلاحيات">
                        <IconButton
                          color="secondary"
                          onClick={() => handleOpenPermissions(u)}
                          disabled={!canManagePermissions}
                          size="small"
                        >
                          <SecurityIcon />
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

      {/* Add/Edit User Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editMode ? 'تعديل مستخدم' : 'إضافة مستخدم'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={1}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="الاسم الكامل"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
            {!editMode && (
              <TextField
                label="اسم المستخدم"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            )}
            <TextField
              label="البريد الإلكتروني"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <TextField
              label="رقم الهاتف"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <TextField
              label={editMode ? 'كلمة المرور الجديدة (اتركها فارغة لعدم التغيير)' : 'كلمة المرور'}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!editMode}
            />
            <FormControl>
              <InputLabel>الدور</InputLabel>
              <Select value={form.role} label="الدور" onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {user?.role === 'SUPER_ADMIN' && <MenuItem value="OWNER">مالك المزرعة</MenuItem>}
                <MenuItem value="ADMIN">مسؤول</MenuItem>
                <MenuItem value="MANAGER">مشرف</MenuItem>
                <MenuItem value="VETERINARIAN">بيطري</MenuItem>
                <MenuItem value="USER">مستخدم</MenuItem>
                <MenuItem value="VIEWER">عارض</MenuItem>
              </Select>
            </FormControl>

            {/* Farm Selector */}
            <FormControl>
              <InputLabel>المزارع</InputLabel>
              <Select
                multiple
                value={form.farmIds}
                onChange={(e) => setForm({ ...form, farmIds: typeof e.target.value === 'string' ? [e.target.value] : e.target.value as string[] })}
                input={<OutlinedInput label="المزارع" />}
                renderValue={(selected) => (
                  <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    {selected.map(id => {
                      const farm = farms.find(f => f.id === id)
                      return <Chip key={id} label={farm?.nameAr || farm?.name || id} size="small" icon={<FarmIcon />} />
                    })}
                  </Stack>
                )}
              >
                {farms.map(farm => (
                  <MenuItem key={farm.id} value={farm.id}>
                    <Checkbox checked={form.farmIds.includes(farm.id)} />
                    <ListItemText primary={farm.nameAr || farm.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {editMode && (
              <FormControlLabel
                control={
                  <Switch
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    color="success"
                  />
                }
                label={form.isActive ? 'نشط' : 'معطل'}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={saving}>
            {saving ? 'جاري الحفظ...' : editMode ? 'تحديث' : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permissions Dialog */}
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
