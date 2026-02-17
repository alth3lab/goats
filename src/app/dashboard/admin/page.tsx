'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Snackbar,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  IconButton,
  Tooltip,
  Divider,
  Avatar,
} from '@mui/material'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import PeopleIcon from '@mui/icons-material/People'
import PetsIcon from '@mui/icons-material/Pets'
import HomeIcon from '@mui/icons-material/Home'
import AgricultureIcon from '@mui/icons-material/Agriculture'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import EditIcon from '@mui/icons-material/Edit'
import PersonIcon from '@mui/icons-material/Person'
import BlockIcon from '@mui/icons-material/Block'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LockResetIcon from '@mui/icons-material/LockReset'
import DeleteIcon from '@mui/icons-material/Delete'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { useAuth } from '@/lib/useAuth'
import { useRouter } from 'next/navigation'

interface TenantInfo {
  id: string
  name: string
  nameAr: string | null
  email: string
  phone: string | null
  plan: string
  maxFarms: number
  maxGoats: number
  maxUsers: number
  isActive: boolean
  createdAt: string
  usersCount: number
  farmsCount: number
  goatsCount: number
  farms: { id: string; name: string; goats: number; pens: number; users: number }[]
}

interface TenantUser {
  id: string
  fullName: string
  username: string
  email: string
  phone: string | null
  role: string
  isActive: boolean
  createdAt: string
  farms: { id: string; name: string; role: string }[]
  permissions: string[]
}

interface Stats {
  totals: {
    tenants: number
    activeTenants: number
    farms: number
    users: number
    goats: number
    sales: number
    healthRecords: number
    breedings: number
  }
  planBreakdown: { plan: string; count: number }[]
  recentTenants: { id: string; name: string; email: string; plan: string; isActive: boolean; createdAt: string }[]
}

const ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'USER', 'VETERINARIAN', 'VIEWER']
const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'مدير النظام',
  OWNER: 'مالك',
  ADMIN: 'مدير',
  MANAGER: 'مشرف',
  USER: 'مستخدم',
  VETERINARIAN: 'بيطري',
  VIEWER: 'مشاهد',
}
const roleColors: Record<string, 'error' | 'warning' | 'primary' | 'default' | 'success' | 'info' | 'secondary'> = {
  SUPER_ADMIN: 'error',
  OWNER: 'warning',
  ADMIN: 'primary',
  MANAGER: 'info',
  USER: 'default',
  VETERINARIAN: 'success',
  VIEWER: 'secondary',
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [tenants, setTenants] = useState<TenantInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [editDialog, setEditDialog] = useState<TenantInfo | null>(null)
  const [editPlan, setEditPlan] = useState('')
  const [editActive, setEditActive] = useState(true)

  // User management state
  const [selectedTenant, setSelectedTenant] = useState<TenantInfo | null>(null)
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [resetDialog, setResetDialog] = useState<TenantUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [roleDialog, setRoleDialog] = useState<TenantUser | null>(null)
  const [newRole, setNewRole] = useState('')
  const [deleteDialog, setDeleteDialog] = useState<TenantUser | null>(null)

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  })

  useEffect(() => {
    if (!authLoading && user?.role !== 'SUPER_ADMIN') {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  const fetchData = async () => {
    try {
      const [statsRes, tenantsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/tenants'),
      ])
      if (statsRes.ok) setStats(await statsRes.json())
      if (tenantsRes.ok) setTenants(await tenantsRes.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const fetchTenantUsers = useCallback(async (tenantId: string) => {
    setUsersLoading(true)
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/users`)
      if (res.ok) {
        const data = await res.json()
        setTenantUsers(data.users)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setUsersLoading(false)
    }
  }, [])

  const handleManageUsers = (t: TenantInfo) => {
    setSelectedTenant(t)
    fetchTenantUsers(t.id)
  }

  const handleUserAction = async (userId: string, action: string, extra: Record<string, string> = {}) => {
    if (!selectedTenant) return
    try {
      const res = await fetch(`/api/admin/tenants/${selectedTenant.id}/users`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action, ...extra }),
      })
      const data = await res.json()
      if (res.ok) {
        setSnackbar({ open: true, message: data.message, severity: 'success' })
        fetchTenantUsers(selectedTenant.id)
        fetchData()
      } else {
        setSnackbar({ open: true, message: data.error, severity: 'error' })
      }
    } catch {
      setSnackbar({ open: true, message: 'خطأ في الاتصال', severity: 'error' })
    }
  }

  const handleEdit = (t: TenantInfo) => {
    setEditDialog(t)
    setEditPlan(t.plan)
    setEditActive(t.isActive)
  }

  const handleSave = async () => {
    if (!editDialog) return
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: editDialog.id,
          plan: editPlan,
          isActive: editActive,
        }),
      })
      if (res.ok) {
        setSnackbar({ open: true, message: 'تم التحديث بنجاح', severity: 'success' })
        setEditDialog(null)
        fetchData()
      } else {
        const data = await res.json()
        setSnackbar({ open: true, message: data.error, severity: 'error' })
      }
    } catch {
      setSnackbar({ open: true, message: 'خطأ في الاتصال', severity: 'error' })
    }
  }

  const planLabel: Record<string, string> = {
    FREE: 'مجاني',
    BASIC: 'أساسي',
    PRO: 'احترافي',
    ENTERPRISE: 'مؤسسي',
  }

  const planColor: Record<string, 'default' | 'success' | 'primary' | 'secondary'> = {
    FREE: 'default',
    BASIC: 'success',
    PRO: 'primary',
    ENTERPRISE: 'secondary',
  }

  if (authLoading || loading) return <Box p={4}><LinearProgress /></Box>
  if (user?.role !== 'SUPER_ADMIN') return null

  // ——— User Management View ———
  if (selectedTenant) {
    return (
      <Box sx={{ width: '100%' }}>
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <IconButton onClick={() => { setSelectedTenant(null); setTenantUsers([]) }}>
              <ArrowBackIcon />
            </IconButton>
            <ManageAccountsIcon color="primary" sx={{ fontSize: 28 }} />
            <Box>
              <Typography variant="h5" fontWeight="bold">
                إدارة مستخدمي: {selectedTenant.nameAr || selectedTenant.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                الخطة: {planLabel[selectedTenant.plan]} — الحد: {selectedTenant.maxUsers} مستخدم
              </Typography>
            </Box>
          </Stack>
        </Paper>

        {usersLoading ? (
          <LinearProgress />
        ) : (
          <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                المستخدمون ({tenantUsers.length}/{selectedTenant.maxUsers})
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>المستخدم</TableCell>
                    <TableCell>البريد</TableCell>
                    <TableCell>الدور</TableCell>
                    <TableCell>المزارع</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>تاريخ الإنشاء</TableCell>
                    <TableCell>إجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tenantUsers.map((u) => (
                    <TableRow key={u.id} hover sx={{ opacity: u.isActive ? 1 : 0.6 }}>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 32, height: 32, bgcolor: roleColors[u.role] === 'default' ? 'grey.400' : `${roleColors[u.role]}.main` }}>
                            <PersonIcon sx={{ fontSize: 18 }} />
                          </Avatar>
                          <Box>
                            <Typography fontWeight="bold" variant="body2">{u.fullName}</Typography>
                            <Typography variant="caption" color="text.secondary">@{u.username}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{u.email}</Typography>
                        {u.phone && <Typography variant="caption" color="text.secondary">{u.phone}</Typography>}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={roleLabels[u.role] || u.role}
                          color={roleColors[u.role] || 'default'}
                          size="small"
                          onClick={() => { setRoleDialog(u); setNewRole(u.role) }}
                          sx={{ cursor: 'pointer' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                          {u.farms.length > 0 ? u.farms.map((f) => (
                            <Chip key={f.id} label={f.name} size="small" variant="outlined" />
                          )) : (
                            <Typography variant="caption" color="text.secondary">—</Typography>
                          )}
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={u.isActive ? 'نشط' : 'معطل'}
                          color={u.isActive ? 'success' : 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(u.createdAt).toLocaleDateString('ar-AE')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title={u.isActive ? 'تعطيل' : 'تفعيل'}>
                            <IconButton
                              size="small"
                              color={u.isActive ? 'warning' : 'success'}
                              onClick={() => handleUserAction(u.id, 'toggleActive')}
                            >
                              {u.isActive ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="تغيير الدور">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => { setRoleDialog(u); setNewRole(u.role) }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="إعادة تعيين كلمة المرور">
                            <IconButton
                              size="small"
                              color="info"
                              onClick={() => { setResetDialog(u); setNewPassword('') }}
                            >
                              <LockResetIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="حذف المستخدم">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setDeleteDialog(u)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {tenantUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        <Typography color="text.secondary" sx={{ py: 4 }}>لا يوجد مستخدمين</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* Change Role Dialog */}
        <Dialog open={!!roleDialog} onClose={() => setRoleDialog(null)} maxWidth="xs" fullWidth>
          <DialogTitle>تغيير دور: {roleDialog?.fullName}</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 1 }}>
              <InputLabel>الدور</InputLabel>
              <Select value={newRole} label="الدور" onChange={(e) => setNewRole(e.target.value)}>
                {ROLES.map((r) => (
                  <MenuItem key={r} value={r}>{roleLabels[r]}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRoleDialog(null)}>إلغاء</Button>
            <Button variant="contained" onClick={() => {
              if (roleDialog) {
                handleUserAction(roleDialog.id, 'changeRole', { role: newRole })
                setRoleDialog(null)
              }
            }}>حفظ</Button>
          </DialogActions>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={!!resetDialog} onClose={() => setResetDialog(null)} maxWidth="xs" fullWidth>
          <DialogTitle>إعادة تعيين كلمة مرور: {resetDialog?.fullName}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="كلمة المرور الجديدة"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              sx={{ mt: 1 }}
              helperText="6 أحرف على الأقل"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setResetDialog(null)}>إلغاء</Button>
            <Button
              variant="contained"
              color="warning"
              disabled={newPassword.length < 6}
              onClick={() => {
                if (resetDialog) {
                  handleUserAction(resetDialog.id, 'resetPassword', { newPassword })
                  setResetDialog(null)
                }
              }}
            >
              تعيين
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)} maxWidth="xs" fullWidth>
          <DialogTitle color="error">حذف المستخدم</DialogTitle>
          <DialogContent>
            <Alert severity="error" sx={{ mt: 1 }}>
              هل أنت متأكد من حذف <strong>{deleteDialog?.fullName}</strong> (@{deleteDialog?.username})؟
              <br />
              سيتم حذف المستخدم وجميع صلاحياته وربطه بالمزارع نهائياً.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog(null)}>إلغاء</Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => {
                if (deleteDialog) {
                  handleUserAction(deleteDialog.id, 'delete')
                  setDeleteDialog(null)
                }
              }}
            >
              حذف نهائي
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

  // ——— Main Admin Dashboard ———
  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <AdminPanelSettingsIcon color="error" sx={{ fontSize: 32 }} />
          <Typography variant="h4" fontWeight="bold">لوحة إدارة النظام</Typography>
          <Chip label="SUPER ADMIN" color="error" size="small" />
        </Stack>
      </Paper>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'المستأجرين', value: stats.totals.tenants, icon: <PeopleIcon />, color: '#1976d2' },
            { label: 'المزارع', value: stats.totals.farms, icon: <AgricultureIcon />, color: '#4F7A57' },
            { label: 'المستخدمين', value: stats.totals.users, icon: <PeopleIcon />, color: '#ed6c02' },
            { label: 'الماعز', value: stats.totals.goats, icon: <PetsIcon />, color: '#9c27b0' },
          ].map((s, i) => (
            <Grid size={{ xs: 6, md: 3 }} key={i}>
              <Card sx={{ borderRadius: 3, borderTop: `3px solid ${s.color}` }}>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Box sx={{ color: s.color, mb: 1 }}>{s.icon}</Box>
                  <Typography variant="h4" fontWeight="bold">{s.value}</Typography>
                  <Typography variant="body2" color="text.secondary">{s.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Plan Breakdown */}
      {stats && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight="bold" mb={2}>توزيع الخطط</Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            {stats.planBreakdown.map((p) => (
              <Chip
                key={p.plan}
                label={`${planLabel[p.plan] || p.plan}: ${p.count}`}
                color={planColor[p.plan] || 'default'}
                sx={{ fontSize: '0.9rem', py: 2 }}
              />
            ))}
          </Stack>
        </Paper>
      )}

      {/* Tenants Table */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight="bold">جميع المستأجرين ({tenants.length})</Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>الاسم</TableCell>
                <TableCell>البريد</TableCell>
                <TableCell>الخطة</TableCell>
                <TableCell>المزارع</TableCell>
                <TableCell>الماعز</TableCell>
                <TableCell>المستخدمين</TableCell>
                <TableCell>الحالة</TableCell>
                <TableCell>التاريخ</TableCell>
                <TableCell>إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tenants.map((t) => (
                <TableRow key={t.id} hover>
                  <TableCell>
                    <Typography fontWeight="bold">{t.nameAr || t.name}</Typography>
                  </TableCell>
                  <TableCell>{t.email}</TableCell>
                  <TableCell>
                    <Chip label={planLabel[t.plan] || t.plan} color={planColor[t.plan]} size="small" />
                  </TableCell>
                  <TableCell>{t.farmsCount}/{t.maxFarms}</TableCell>
                  <TableCell>{t.goatsCount}/{t.maxGoats}</TableCell>
                  <TableCell>{t.usersCount}/{t.maxUsers}</TableCell>
                  <TableCell>
                    <Chip
                      label={t.isActive ? 'نشط' : 'معطل'}
                      color={t.isActive ? 'success' : 'default'}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{new Date(t.createdAt).toLocaleDateString('ar-AE')}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <Button size="small" startIcon={<EditIcon />} onClick={() => handleEdit(t)}>
                        تعديل
                      </Button>
                      <Button
                        size="small"
                        color="info"
                        startIcon={<ManageAccountsIcon />}
                        onClick={() => handleManageUsers(t)}
                      >
                        المستخدمين
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Edit Tenant Dialog */}
      <Dialog open={!!editDialog} onClose={() => setEditDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>تعديل المستأجر: {editDialog?.nameAr || editDialog?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>الخطة</InputLabel>
              <Select value={editPlan} label="الخطة" onChange={(e) => setEditPlan(e.target.value)}>
                <MenuItem value="FREE">مجاني</MenuItem>
                <MenuItem value="BASIC">أساسي</MenuItem>
                <MenuItem value="PRO">احترافي</MenuItem>
                <MenuItem value="ENTERPRISE">مؤسسي</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Switch checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />}
              label="الحساب نشط"
            />
            {editDialog && (
              <Alert severity="info">
                الاستخدام: {editDialog.goatsCount} ماعز، {editDialog.farmsCount} مزرعة، {editDialog.usersCount} مستخدم
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(null)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave}>حفظ</Button>
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
