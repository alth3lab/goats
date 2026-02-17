'use client'

import { useEffect, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  Snackbar,
  Grid,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import StarIcon from '@mui/icons-material/Star'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import BusinessIcon from '@mui/icons-material/Business'
import PetsIcon from '@mui/icons-material/Pets'
import HomeIcon from '@mui/icons-material/Home'
import PeopleIcon from '@mui/icons-material/People'
import { useAuth } from '@/lib/useAuth'

interface PlanInfo {
  name: string
  nameEn: string
  maxFarms: number
  maxGoats: number
  maxUsers: number
  price: number
  features: string[]
}

interface SubscriptionData {
  tenant: {
    id: string
    name: string
    plan: string
    maxFarms: number
    maxGoats: number
    maxUsers: number
    trialEndsAt: string | null
    createdAt: string
  }
  usage: { farms: number; users: number; goats: number }
  limits: { farms: number; users: number; goats: number }
  currentPlan: PlanInfo
  plans: Record<string, PlanInfo>
}

function UsageBar({ label, icon, used, max }: { label: string; icon: React.ReactNode; used: number; max: number }) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0
  const color = pct >= 90 ? 'error' : pct >= 70 ? 'warning' : 'primary'
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          {icon}
          <Typography variant="body2" fontWeight="bold">{label}</Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">{used} / {max}</Typography>
      </Stack>
      <LinearProgress variant="determinate" value={pct} color={color} sx={{ height: 8, borderRadius: 4 }} />
    </Box>
  )
}

export default function BillingPage() {
  const { user } = useAuth()
  const [data, setData] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgradeDialog, setUpgradeDialog] = useState<string | null>(null)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success'
  })

  const fetchData = async () => {
    try {
      const res = await fetch('/api/settings/subscription')
      if (res.ok) setData(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleUpgrade = async (plan: string) => {
    try {
      const res = await fetch('/api/settings/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const result = await res.json()
      if (res.ok) {
        setSnackbar({ open: true, message: result.message, severity: 'success' })
        setUpgradeDialog(null)
        fetchData()
      } else {
        setSnackbar({ open: true, message: result.error, severity: 'error' })
      }
    } catch {
      setSnackbar({ open: true, message: 'خطأ في الاتصال', severity: 'error' })
    }
  }

  const planIcon: Record<string, React.ReactNode> = {
    FREE: <StarIcon />,
    BASIC: <StarIcon />,
    PRO: <RocketLaunchIcon />,
    ENTERPRISE: <BusinessIcon />,
  }

  const planColor: Record<string, string> = {
    FREE: '#9e9e9e',
    BASIC: '#4F7A57',
    PRO: '#1976d2',
    ENTERPRISE: '#9c27b0',
  }

  if (loading) return <Box p={4}><LinearProgress /></Box>
  if (!data) return <Alert severity="error">فشل في تحميل بيانات الاشتراك</Alert>

  const isOwner = user?.role === 'OWNER' || user?.role === 'SUPER_ADMIN'

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <StarIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" fontWeight="bold">الاشتراك والفوترة</Typography>
        </Stack>
      </Paper>

      {/* Current Usage */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>الاستخدام الحالي</Typography>
        <Chip
          label={`الخطة: ${data.currentPlan.name}`}
          color="primary"
          sx={{ mb: 2 }}
        />
        <Stack spacing={2}>
          <UsageBar label="الماعز" icon={<PetsIcon fontSize="small" />} used={data.usage.goats} max={data.limits.goats} />
          <UsageBar label="المزارع" icon={<HomeIcon fontSize="small" />} used={data.usage.farms} max={data.limits.farms} />
          <UsageBar label="المستخدمين" icon={<PeopleIcon fontSize="small" />} used={data.usage.users} max={data.limits.users} />
        </Stack>
      </Paper>

      {/* Plans */}
      <Typography variant="h6" fontWeight="bold" mb={2}>الخطط المتاحة</Typography>
      <Grid container spacing={3}>
        {Object.entries(data.plans).map(([key, plan]) => {
          const isCurrent = data.tenant.plan === key
          const color = planColor[key] || '#4F7A57'

          return (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={key}>
              <Card
                sx={{
                  borderRadius: 3,
                  border: isCurrent ? `2px solid ${color}` : '1px solid',
                  borderColor: isCurrent ? color : 'divider',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                {isCurrent && (
                  <Chip
                    label="الخطة الحالية"
                    size="small"
                    sx={{ position: 'absolute', top: 12, left: 12, bgcolor: color, color: '#fff' }}
                  />
                )}
                <CardContent sx={{ flexGrow: 1, pt: isCurrent ? 5 : 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <Box sx={{ color }}>{planIcon[key]}</Box>
                    <Typography variant="h6" fontWeight="bold">{plan.name}</Typography>
                  </Stack>
                  <Typography variant="h4" fontWeight="bold" color={color} mb={2}>
                    {plan.price < 0 ? 'تواصل معنا' : plan.price === 0 ? 'مجاني' : `${plan.price} د.إ/شهر`}
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  <List dense disablePadding>
                    {plan.features.map((f, i) => (
                      <ListItem key={i} disablePadding sx={{ py: 0.3 }}>
                        <ListItemIcon sx={{ minWidth: 28 }}>
                          <CheckIcon fontSize="small" sx={{ color }} />
                        </ListItemIcon>
                        <ListItemText primary={f} primaryTypographyProps={{ variant: 'body2' }} />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>
                  {!isCurrent && isOwner && key !== 'ENTERPRISE' && (
                    <Button
                      fullWidth
                      variant="contained"
                      sx={{ bgcolor: color, '&:hover': { bgcolor: color, filter: 'brightness(0.9)' } }}
                      onClick={() => setUpgradeDialog(key)}
                    >
                      ترقية
                    </Button>
                  )}
                  {key === 'ENTERPRISE' && !isCurrent && (
                    <Button fullWidth variant="outlined" disabled>
                      تواصل معنا
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          )
        })}
      </Grid>

      {/* Upgrade Confirmation */}
      <Dialog open={!!upgradeDialog} onClose={() => setUpgradeDialog(null)}>
        <DialogTitle>تأكيد الترقية</DialogTitle>
        <DialogContent>
          <Typography>
            هل تريد الترقية للخطة{' '}
            <strong>{upgradeDialog ? data.plans[upgradeDialog]?.name : ''}</strong>؟
          </Typography>
          {upgradeDialog && data.plans[upgradeDialog]?.price > 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              سيتم تفعيل الخطة فوراً. الدفع سيكون متاحاً قريباً عبر بوابة الدفع.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpgradeDialog(null)}>إلغاء</Button>
          <Button variant="contained" onClick={() => upgradeDialog && handleUpgrade(upgradeDialog)}>
            تأكيد الترقية
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
