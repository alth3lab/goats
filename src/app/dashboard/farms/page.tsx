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
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  Snackbar,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import AgricultureIcon from '@mui/icons-material/Agriculture'
import PetsIcon from '@mui/icons-material/Pets'
import HomeIcon from '@mui/icons-material/Home'
import PeopleIcon from '@mui/icons-material/People'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import LinearProgress from '@mui/material/LinearProgress'

interface Farm {
  id: string
  name: string
  nameAr: string
  farmType: string
  phone: string | null
  address: string | null
  currency: string
  isActive: boolean
  role: string
  goatsCount: number
  pensCount: number
  usersCount: number
  createdAt: string
}

export default function FarmsPage() {
  const { user, farm: currentFarm, switchFarm, can, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !['SUPER_ADMIN', 'OWNER'].includes(user?.role || '')) {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  const [farms, setFarms] = useState<Farm[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  })

  const [form, setForm] = useState({
    name: '',
    nameAr: '',
    phone: '',
    address: '',
    currency: 'AED',
    farmType: 'GOAT',
  })

  const fetchFarms = async () => {
    try {
      const res = await fetch('/api/farms')
      if (res.ok) {
        setFarms(await res.json())
      }
    } catch (error) {
      console.error('Error fetching farms:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFarms()
  }, [])

  const handleCreate = async () => {
    if (!form.name) return

    try {
      const res = await fetch('/api/farms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        setSnackbar({ open: true, message: 'تم إنشاء المزرعة بنجاح', severity: 'success' })
        setDialogOpen(false)
        setForm({ name: '', nameAr: '', phone: '', address: '', currency: 'AED', farmType: 'GOAT' })
        fetchFarms()
      } else {
        const data = await res.json()
        setSnackbar({ open: true, message: data.error || 'فشل في إنشاء المزرعة', severity: 'error' })
      }
    } catch {
      setSnackbar({ open: true, message: 'خطأ في الاتصال', severity: 'error' })
    }
  }

  const handleSwitch = async (farmId: string) => {
    try {
      await switchFarm(farmId)
      setSnackbar({ open: true, message: 'تم التبديل للمزرعة بنجاح', severity: 'success' })
      fetchFarms()
    } catch {
      setSnackbar({ open: true, message: 'فشل في التبديل', severity: 'error' })
    }
  }

  const roleLabel: Record<string, string> = {
    SUPER_ADMIN: 'مدير النظام',
    OWNER: 'المالك',
    ADMIN: 'مدير',
    USER: 'مستخدم',
    VIEWER: 'مشاهد',
  }

  if (authLoading || !user) return <Box sx={{ p: 4 }}><LinearProgress /></Box>
  if (!['SUPER_ADMIN', 'OWNER'].includes(user.role)) return null

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <AgricultureIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h4" fontWeight="bold">المزارع</Typography>
          </Stack>
          {(user?.role === 'OWNER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
              إضافة مزرعة
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Farm Cards */}
      <Grid container spacing={3}>
        {farms.map((f) => {
          const isCurrent = currentFarm?.id === f.id

          return (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={f.id}>
              <Card
                sx={{
                  borderRadius: 3,
                  border: isCurrent ? '2px solid' : '1px solid',
                  borderColor: isCurrent ? 'primary.main' : 'divider',
                  position: 'relative',
                }}
              >
                {isCurrent && (
                  <Chip
                    icon={<CheckCircleIcon />}
                    label="المزرعة الحالية"
                    color="primary"
                    size="small"
                    sx={{ position: 'absolute', top: 12, left: 12 }}
                  />
                )}
                <CardContent sx={{ pt: isCurrent ? 5 : 2 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    {f.nameAr || f.name}
                  </Typography>
                  {f.address && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {f.address}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <Chip
                      label={{
                        GOAT: 'ماعز',
                        SHEEP: 'أغنام',
                        CAMEL: 'إبل',
                        MIXED: 'مختلطة',
                      }[f.farmType] || 'ماعز'}
                      size="small"
                      color={{
                        GOAT: 'success' as const,
                        SHEEP: 'info' as const,
                        CAMEL: 'warning' as const,
                        MIXED: 'secondary' as const,
                      }[f.farmType] || 'default' as const}
                    />
                  </Stack>
                  <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <Chip icon={<PetsIcon />} label={`${f.goatsCount} رأس`} size="small" variant="outlined" />
                    <Chip icon={<HomeIcon />} label={`${f.pensCount} حظيرة`} size="small" variant="outlined" />
                    <Chip icon={<PeopleIcon />} label={`${f.usersCount} عضو`} size="small" variant="outlined" />
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                    <Chip label={roleLabel[f.role] || f.role} size="small" color="info" />
                    <Chip label={f.currency} size="small" variant="outlined" />
                  </Stack>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  {!isCurrent && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<SwapHorizIcon />}
                      onClick={() => handleSwitch(f.id)}
                    >
                      التبديل لهذه المزرعة
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      {!loading && farms.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Typography color="text.secondary">لا توجد مزارع</Typography>
        </Paper>
      )}

      {/* Create Farm Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة مزرعة جديدة</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="اسم المزرعة (إنجليزي)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="اسم المزرعة (عربي)"
              value={form.nameAr}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>نوع المزرعة</InputLabel>
              <Select
                value={form.farmType}
                label="نوع المزرعة"
                onChange={(e) => setForm({ ...form, farmType: e.target.value })}
              >
                <MenuItem value="GOAT">ماعز</MenuItem>
                <MenuItem value="SHEEP">أغنام</MenuItem>
                <MenuItem value="CAMEL">إبل</MenuItem>
                <MenuItem value="MIXED">مختلطة</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="الهاتف"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              fullWidth
            />
            <TextField
              label="العنوان"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              fullWidth
            />
            <TextField
              label="العملة"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreate} disabled={!form.name}>إنشاء</Button>
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
