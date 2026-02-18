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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import CheckIcon from '@mui/icons-material/Check'
import StarIcon from '@mui/icons-material/Star'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import BusinessIcon from '@mui/icons-material/Business'
import PetsIcon from '@mui/icons-material/Pets'
import HomeIcon from '@mui/icons-material/Home'
import PeopleIcon from '@mui/icons-material/People'
import HistoryIcon from '@mui/icons-material/History'
import WarningIcon from '@mui/icons-material/Warning'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
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

interface SubscriptionRecord {
  id: string
  plan: string
  status: string
  startDate: string
  endDate: string | null
  amount: number
  currency: string
  notes: string | null
  createdAt: string
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
    isActive: boolean
    createdAt: string
  }
  usage: { farms: number; users: number; goats: number }
  limits: { farms: number; users: number; goats: number }
  currentPlan: PlanInfo
  plans: Record<string, PlanInfo>
  subscriptions: SubscriptionRecord[]
  status: {
    active: boolean
    trialExpired?: boolean
    subscriptionExpired?: boolean
    trialDaysLeft: number | null
    reason: string | null
  }
}

const PLAN_ORDER = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE']

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
      {pct >= 90 && (
        <Typography variant="caption" color="error" mt={0.5}>
          تحذير: وصلت لـ {Math.round(pct)}% من الحد الأقصى
        </Typography>
      )}
    </Box>
  )
}

const statusLabels: Record<string, { label: string; color: 'success' | 'error' | 'warning' | 'info' }> = {
  ACTIVE: { label: 'نشط', color: 'success' },
  CANCELLED: { label: 'ملغي', color: 'error' },
  EXPIRED: { label: 'منتهي', color: 'error' },
  PAST_DUE: { label: 'متأخر', color: 'warning' },
}

export default function BillingPage() {
  const { user } = useAuth()
  const [data, setData] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionDialog, setActionDialog] = useState<{ plan: string; type: 'upgrade' | 'downgrade' } | null>(null)
  const [processing, setProcessing] = useState(false)
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

  const handlePlanChange = async (plan: string) => {
    setProcessing(true)
    try {
      const res = await fetch('/api/settings/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const result = await res.json()
      if (res.ok) {
        setSnackbar({ open: true, message: result.message, severity: 'success' })
        setActionDialog(null)
        fetchData()
      } else {
        setSnackbar({ open: true, message: result.error, severity: 'error' })
      }
    } catch {
      setSnackbar({ open: true, message: 'خطأ في الاتصال', severity: 'error' })
    } finally {
      setProcessing(false)
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
  const currentPlanIndex = PLAN_ORDER.indexOf(data.tenant.plan)

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <StarIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" fontWeight="bold">الاشتراك والفوترة</Typography>
        </Stack>
      </Paper>

      {/* Status Alerts */}
      {data.status.trialExpired && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2, borderRadius: 2 }}>
          انتهت الفترة التجريبية. قم بالترقية للاستمرار بجميع الميزات.
        </Alert>
      )}
      {data.status.subscriptionExpired && (
        <Alert severity="error" icon={<WarningIcon />} sx={{ mb: 2, borderRadius: 2 }}>
          انتهى اشتراكك. يرجى تجديد الاشتراك للاستمرار.
        </Alert>
      )}
      {data.status.trialDaysLeft !== null && data.status.trialDaysLeft > 0 && data.status.trialDaysLeft <= 7 && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          متبقي {data.status.trialDaysLeft} يوم على انتهاء الفترة التجريبية
        </Alert>
      )}

      {/* Current Usage */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight="bold" mb={2}>الاستخدام الحالي</Typography>
        <Stack direction="row" spacing={1} alignItems="center" mb={2}>
          <Chip label={`الخطة: ${data.currentPlan.name}`} color="primary" />
          {data.status.trialDaysLeft !== null && data.status.trialDaysLeft > 0 && (
            <Chip label={`فترة تجريبية: ${data.status.trialDaysLeft} يوم متبقي`} color="warning" variant="outlined" />
          )}
          {!data.tenant.isActive && (
            <Chip label="الحساب معطل" color="error" />
          )}
        </Stack>
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
          const targetIndex = PLAN_ORDER.indexOf(key)
          const isUpgrade = targetIndex > currentPlanIndex
          const isDowngrade = targetIndex < currentPlanIndex

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
                  {!isCurrent && isOwner && key !== 'ENTERPRISE' && isUpgrade && (
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<ArrowUpwardIcon />}
                      sx={{ bgcolor: color, '&:hover': { bgcolor: color, filter: 'brightness(0.9)' } }}
                      onClick={() => setActionDialog({ plan: key, type: 'upgrade' })}
                    >
                      ترقية
                    </Button>
                  )}
                  {!isCurrent && isOwner && key !== 'ENTERPRISE' && isDowngrade && (
                    <Button
                      fullWidth
                      variant="outlined"
                      color="warning"
                      startIcon={<ArrowDownwardIcon />}
                      onClick={() => setActionDialog({ plan: key, type: 'downgrade' })}
                    >
                      تخفيض
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

      {/* Subscription History */}
      {data.subscriptions.length > 0 && (
        <Paper sx={{ p: 3, mt: 3, borderRadius: 3 }}>
          <Stack direction="row" spacing={1} alignItems="center" mb={2}>
            <HistoryIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">سجل الاشتراكات</Typography>
          </Stack>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>الخطة</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>تاريخ البدء</TableCell>
                  <TableCell>تاريخ الانتهاء</TableCell>
                  <TableCell>المبلغ</TableCell>
                  <TableCell>ملاحظات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.subscriptions.map((sub) => {
                  const st = statusLabels[sub.status] || { label: sub.status, color: 'info' as const }
                  return (
                    <TableRow key={sub.id}>
                      <TableCell>{data.plans[sub.plan]?.name || sub.plan}</TableCell>
                      <TableCell>
                        <Chip label={st.label} color={st.color} size="small" />
                      </TableCell>
                      <TableCell>{new Date(sub.startDate).toLocaleDateString('ar-AE')}</TableCell>
                      <TableCell>{sub.endDate ? new Date(sub.endDate).toLocaleDateString('ar-AE') : '—'}</TableCell>
                      <TableCell>{sub.amount > 0 ? `${sub.amount} ${sub.currency}` : 'مجاني'}</TableCell>
                      <TableCell>{sub.notes || '—'}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Action Confirmation Dialog */}
      <Dialog open={!!actionDialog} onClose={() => !processing && setActionDialog(null)}>
        <DialogTitle>
          {actionDialog?.type === 'upgrade' ? 'تأكيد الترقية' : 'تأكيد التخفيض'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            هل تريد {actionDialog?.type === 'upgrade' ? 'الترقية' : 'التخفيض'} للخطة{' '}
            <strong>{actionDialog ? data.plans[actionDialog.plan]?.name : ''}</strong>؟
          </Typography>
          {actionDialog?.type === 'upgrade' && actionDialog.plan && data.plans[actionDialog.plan]?.price > 0 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              سعر الخطة: {data.plans[actionDialog.plan]?.price} د.إ/شهر.
              سيتم إرسال طلب الترقية للإدارة. يجب إتمام الدفع والحصول على موافقة الإدارة لتفعيل الخطة.
            </Alert>
          )}
          {actionDialog?.type === 'downgrade' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              تخفيض الخطة قد يحد من استخدامك. تأكد أن استخدامك الحالي لا يتجاوز حدود الخطة الجديدة.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog(null)} disabled={processing}>إلغاء</Button>
          <Button
            variant="contained"
            color={actionDialog?.type === 'upgrade' ? 'primary' : 'warning'}
            onClick={() => actionDialog && handlePlanChange(actionDialog.plan)}
            disabled={processing}
          >
            {processing ? 'جاري التنفيذ...' : actionDialog?.type === 'upgrade' ? 'تأكيد الترقية' : 'تأكيد التخفيض'}
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
