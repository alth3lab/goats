'use client'

import { 
  Box, 
  Grid,
  Card, 
  CardContent, 
  Typography, 
  Paper,
  Stack,
  Alert,
  AlertTitle,
  Chip,
  Avatar,
  Skeleton,
  LinearProgress,
  Divider,
  TextField,
  IconButton,
  Tooltip
} from '@mui/material'
import { 
  Pets as PetsIcon,
  LocalHospital as HealthIcon,
  FavoriteBorder as BreedingIcon,
  ShoppingCart as SalesIcon,
  TrendingUp as TrendingUpIcon,
  NotificationsActive as AlertIcon,
  ChildCare as WeaningIcon,
  HomeWork as PenIcon,
  ReportProblem as DeathIcon,
  AccountBalance as ProfitIcon,
  Receipt as ExpensesIcon,
  ChildCare as BirthIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Remove as FlatIcon,
  Male as MaleIcon,
  Female as FemaleIcon,
  FilterAltOff as ClearFilterIcon,
  CalendarMonth as CalendarIcon,
  Diversity1 as BreedingActiveIcon,
  Inventory2 as InventoryIcon,
  Grass as FeedIcon,
  Warning as WarningIcon
} from '@mui/icons-material'
import {
  BarChart, Bar, XAxis, YAxis, Cell,
  Tooltip as ReTooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts'
import { useEffect, useMemo, useState } from 'react'
import { useTheme } from '@mui/material/styles'
import { formatCurrency, formatDate, formatNumber } from '@/lib/formatters'
import { useAuth } from '@/lib/useAuth'

const farmTypeSubtitle: Record<string, string> = {
  SHEEP: 'متابعة وإدارة قطيع الأغنام',
  CAMEL: 'متابعة وإدارة قطيع الإبل',
  MIXED: 'متابعة وإدارة الحيوانات',
}

const CHART_COLORS = ['#2196f3', '#ff9800', '#4caf50', '#f44336', '#9c27b0', '#00bcd4', '#ff5722', '#607d8b']

interface Stats {
  totalGoats: number
  activeGoats: number
  maleGoats: number
  femaleGoats: number
  pregnantGoats: number
  totalTypes: number
  totalBreeds: number
  totalExpenses: number
  totalSales: number
  netProfit: number
  filtered: boolean
  currentYear: number
  expensesByMonth: Array<{ month: number; name: string; amount: number }>
  salesByMonth: Array<{ month: number; name: string; amount: number }>
  activeBreedings: number
  lowStockCount: number
  feedConsumption: { quantity: number; cost: number; hasLogs?: boolean; source?: string }
  monthly: {
    totalSales: number
    totalExpenses: number
    netProfit: number
    salesCount: number
    birthsCount: number
    deathsCount: number
    herdGrowth: number
    mortalityRate: number
    expensesByCategory: Array<{ category: string; amount: number }>
  }
  previous: {
    totalSales: number
    totalExpenses: number
    netProfit: number
  } | null
  comparison: Record<string, number | null> | null
}

interface AlertItem {
  id: string
  type: 'BIRTH' | 'HEALTH' | 'WEANING' | 'PEN_CAPACITY' | 'DEATHS' | 'BREEDING_OVERDUE'
  severity: 'error' | 'warning' | 'info'
  title: string
  message: string
  date: string
}



/* ── Trend Badge ── */
function TrendBadge({ value, invertColor }: { value: number | null | undefined; invertColor?: boolean }) {
  if (value === null || value === undefined) return null
  const positive = invertColor ? value < 0 : value > 0
  const color = value === 0 ? 'text.secondary' : positive ? 'success.main' : 'error.main'
  const Icon = value > 0 ? ArrowUpIcon : value < 0 ? ArrowDownIcon : FlatIcon
  return (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color }}>
      <Icon sx={{ fontSize: 16 }} />
      <Typography variant="caption" fontWeight="bold" sx={{ color }}>
        {Math.abs(value).toFixed(1)}%
      </Typography>
    </Stack>
  )
}

/* ── KPI Card ── */
function KpiCard({
  icon, title, value, subtitle, trend, color, invertColor
}: {
  icon: React.ReactNode
  title: string
  value: string
  subtitle?: string
  trend?: number | null
  color: string
  invertColor?: boolean
}) {
  return (
    <Card sx={{ height: '100%', borderRadius: 3 }}>
      <CardContent sx={{ pt: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Avatar sx={{ bgcolor: `${color}.main`, width: 48, height: 48, mb: 1 }}>
            {icon}
          </Avatar>
          {trend !== undefined && <TrendBadge value={trend} invertColor={invertColor} />}
        </Stack>
        <Typography variant="h5" fontWeight="bold" sx={{ mt: 1 }}>
          {value}
        </Typography>
        <Typography variant="subtitle2" color="text.secondary" fontWeight="bold" sx={{ mt: 0.5 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}

/* ── Skeleton ── */
function DashboardSkeleton() {
  return (
    <Grid container spacing={3} mb={4}>
      {[...Array(8)].map((_, i) => (
        <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderRadius: 3, p: 2 }}>
            <Skeleton variant="circular" width={48} height={48} />
            <Skeleton variant="text" sx={{ mt: 2, fontSize: '1.5rem' }} width="60%" />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="40%" />
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default function DashboardPage() {
  const theme = useTheme()
  const { farm } = useAuth()
  const subtitle = farmTypeSubtitle[farm?.farmType || 'SHEEP'] || farmTypeSubtitle.SHEEP
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [selectedMonth, setSelectedMonth] = useState('')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedMonth) {
      const [y, m] = selectedMonth.split('-')
      params.set('year', y)
      params.set('month', m)
    }
    const qs = params.toString() ? `?${params.toString()}` : ''
    fetch(`/api/stats${qs}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.monthly) {
          setStats(data)
        } else if (data && !data.error) {
          // Ensure monthly defaults exist
          setStats({
            ...data,
            monthly: data.monthly || { totalSales: 0, totalExpenses: 0, netProfit: 0, salesCount: 0, birthsCount: 0, deathsCount: 0, herdGrowth: 0, mortalityRate: 0, expensesByCategory: [] },
            feedConsumption: data.feedConsumption || { quantity: 0, cost: 0 },
            activeBreedings: data.activeBreedings ?? 0,
            lowStockCount: data.lowStockCount ?? 0,
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [selectedMonth])

  useEffect(() => {
    fetch('/api/alerts')
      .then(res => res.json())
      .then(data => setAlerts(Array.isArray(data) ? data : []))
      .catch(() => setAlerts([]))
  }, [])

  const periodLabel = selectedMonth ? 'الشهر' : 'الإجمالي'

  /* ── Category labels ── */
  const categoryLabels: Record<string, string> = {
    FEED: 'علف', MEDICINE: 'دواء', EQUIPMENT: 'معدات', LABOR: 'عمالة',
    UTILITIES: 'مرافق', MAINTENANCE: 'صيانة', TRANSPORT: 'نقل', OTHER: 'أخرى'
  }

  /* ── Memoized chart data ── */

  const totalCategoryExpenses = useMemo(() => {
    return stats?.monthly?.expensesByCategory?.reduce((s, i) => s + i.amount, 0) || 1
  }, [stats])

  return (
    <Box sx={{ width: '100%', overflowX: 'hidden' }}>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 3,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider'
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" spacing={2} mb={1}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <PetsIcon sx={{ fontSize: 48, color: 'primary.main' }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">
                لوحة التحكم الرئيسية
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {subtitle}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CalendarIcon color="action" />
            <TextField
              type="month"
              size="small"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              placeholder="اختر شهر"
              sx={{ minWidth: 180 }}
              slotProps={{
                inputLabel: { shrink: true }
              }}
            />
            {selectedMonth && (
              <Tooltip title="إزالة الفلتر - عرض الكل">
                <IconButton size="small" onClick={() => setSelectedMonth('')} color="error">
                  <ClearFilterIcon />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      </Paper>

      {loading ? (
        <DashboardSkeleton />
      ) : stats ? (
        <>
          {/* قسم التنبيهات */}
          {alerts.length > 0 && (
            <Box mb={4}>
              <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                <AlertIcon color="warning" />
                <Typography variant="h6" fontWeight="bold">
                  تنبيهات هامة ({alerts.length})
                </Typography>
              </Stack>
              <Grid container spacing={2}>
                {alerts.map((alert) => (
                  <Grid size={{ xs: 12, md: 6, lg: 4 }} key={alert.id}>
                    <Alert 
                      severity={alert.severity} 
                      icon={
                        alert.type === 'BIRTH' ? <BreedingIcon fontSize="inherit" /> :
                        alert.type === 'WEANING' ? <WeaningIcon fontSize="inherit" /> :
                        alert.type === 'PEN_CAPACITY' ? <PenIcon fontSize="inherit" /> :
                        alert.type === 'DEATHS' ? <DeathIcon fontSize="inherit" /> :
                        alert.type === 'BREEDING_OVERDUE' ? <AlertIcon fontSize="inherit" /> :
                        <HealthIcon fontSize="inherit" />
                      }
                      sx={{ 
                        height: '100%', 
                        alignItems: 'center',
                        '& .MuiAlert-message': { width: '100%' }
                      }}
                    >
                      <AlertTitle sx={{ fontWeight: 'bold' }}>{alert.title}</AlertTitle>
                      <Typography variant="body2">{alert.message}</Typography>
                      {alert.type !== 'WEANING' && (
                        <Chip 
                          label={formatDate(alert.date)} 
                          size="small" 
                          sx={{ mt: 1, height: 20, fontSize: '0.7rem' }} 
                        />
                      )}
                    </Alert>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* ── KPI Cards ── */}
          <Grid container spacing={3} mb={4}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard
                icon={<PetsIcon />}
                title="إجمالي القطيع"
                value={formatNumber(stats.totalGoats)}
                subtitle={`نشط: ${formatNumber(stats.activeGoats)} | ${formatNumber(stats.totalTypes)} أنواع`}
                color="primary"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard
                icon={<MaleIcon />}
                title="الذكور / الإناث"
                value={`${formatNumber(stats.maleGoats)} / ${formatNumber(stats.femaleGoats)}`}
                subtitle={`${formatNumber(stats.pregnantGoats)} أنثى حامل`}
                color="secondary"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard
                icon={<SalesIcon />}
                title={`مبيعات ${periodLabel}`}
                value={formatCurrency(stats.monthly.totalSales)}
                subtitle={`عمليات البيع: ${formatNumber(stats.monthly.salesCount)}`}
                trend={stats.comparison?.totalSales}
                color="info"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard
                icon={<ExpensesIcon />}
                title={`مصروفات ${periodLabel}`}
                value={formatCurrency(stats.monthly.totalExpenses)}
                trend={stats.comparison?.totalExpenses}
                color="warning"
                invertColor
              />
            </Grid>
          </Grid>

          <Grid container spacing={3} mb={4}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard
                icon={<ProfitIcon />}
                title={`صافي الربح (${periodLabel})`}
                value={formatCurrency(stats.monthly.netProfit)}
                trend={stats.comparison?.netProfit}
                color="success"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard
                icon={<BirthIcon />}
                title="المواليد"
                value={formatNumber(stats.monthly.birthsCount)}
                trend={stats.comparison?.birthsCount}
                color="info"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard
                icon={<TrendingUpIcon />}
                title="نمو القطيع"
                value={formatNumber(stats.monthly.herdGrowth)}
                subtitle={`مواليد: ${stats.monthly.birthsCount} | نفوق: ${stats.monthly.deathsCount}`}
                trend={stats.comparison?.herdGrowth}
                color="success"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard
                icon={<HealthIcon />}
                title="نسبة النفوق"
                value={`${stats.monthly.mortalityRate.toFixed(1)}%`}
                subtitle={`عدد النفوق: ${formatNumber(stats.monthly.deathsCount)}`}
                trend={stats.comparison?.deathsCount}
                color="error"
                invertColor
              />
            </Grid>
          </Grid>

          {/* ── Row 3 - Additional KPIs ── */}
          <Grid container spacing={3} mb={4}>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <KpiCard
                icon={<BreedingActiveIcon />}
                title="التكاثر النشط"
                value={formatNumber(stats.activeBreedings)}
                subtitle={`${formatNumber(stats.pregnantGoats)} حامل حالياً`}
                color="secondary"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <KpiCard
                icon={stats.lowStockCount > 0 ? <WarningIcon /> : <InventoryIcon />}
                title="المخزون المنخفض"
                value={formatNumber(stats.lowStockCount)}
                subtitle={stats.lowStockCount > 0 ? 'أصناف تحت الحد الأدنى ⚠️' : 'المخزون جيد ✓'}
                color={stats.lowStockCount > 0 ? 'error' : 'success'}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <KpiCard
                icon={<FeedIcon />}
                title={`استهلاك الأعلاف (${periodLabel})`}
                value={`${formatNumber(stats.feedConsumption?.quantity ?? 0)} كجم`}
                subtitle={`التكلفة: ${formatCurrency(stats.feedConsumption?.cost ?? 0)}`}
                color="warning"
              />
            </Grid>
          </Grid>
          {/* ── Yearly Sales vs Expenses Comparison Chart ── */}
          <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              مقارنة المبيعات والمصروفات الشهرية - {stats.currentYear}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {stats.expensesByMonth?.every(m => m.amount === 0) && stats.salesByMonth?.every(m => m.amount === 0) ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                لا توجد بيانات مسجلة لهذه السنة
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height={380}>
                <BarChart
                  data={stats.expensesByMonth?.map((exp, i) => ({
                    name: exp.name,
                    expenses: exp.amount,
                    sales: stats.salesByMonth?.[i]?.amount || 0,
                    profit: (stats.salesByMonth?.[i]?.amount || 0) - exp.amount
                  }))}
                  barGap={4}
                  barSize={18}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontFamily: 'Cairo', fontSize: 11 }} angle={-35} textAnchor="end" height={60} />
                  <YAxis tick={{ fontFamily: 'Cairo', fontSize: 12 }} />
                  <ReTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      return (
                        <Paper sx={{ p: 1.5, borderRadius: 2 }}>
                          {payload.map((entry, i) => (
                            <Typography key={i} variant="body2" sx={{ color: entry.color }} fontWeight="bold">
                              {entry.name}: {formatCurrency(Number(entry.value))}
                            </Typography>
                          ))}
                        </Paper>
                      )
                    }}
                  />
                  <Legend />
                  <Bar dataKey="sales" name="المبيعات" fill="#4caf50" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="المصروفات" fill="#f44336" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="صافي الربح" fill="#2196f3" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>

          {/* ── Expenses breakdown with progress bars ── */}
          <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              تفاصيل المصروفات {selectedMonth ? '' : '(إجمالي)'}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {!stats.monthly.expensesByCategory || stats.monthly.expensesByCategory.length === 0 ? (
              <Typography color="text.secondary" align="center">
                لا توجد مصروفات {selectedMonth ? 'لهذا الشهر' : ''}
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {stats.monthly.expensesByCategory
                  .sort((a, b) => b.amount - a.amount)
                  .map((item, idx) => {
                    const pct = (item.amount / totalCategoryExpenses) * 100
                    const color = CHART_COLORS[idx % CHART_COLORS.length]
                    return (
                      <Grid key={item.category} size={{ xs: 12, sm: 6 }}>
                        <Stack spacing={0.5}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" fontWeight="bold">
                              {categoryLabels[item.category] || item.category}
                            </Typography>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Typography variant="body2" color="text.secondary">
                                {pct.toFixed(1)}%
                              </Typography>
                              <Typography variant="body2" fontWeight="bold">
                                {formatCurrency(item.amount)}
                              </Typography>
                            </Stack>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{
                              height: 10,
                              borderRadius: 5,
                              bgcolor: 'grey.200',
                              '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 5 }
                            }}
                          />
                        </Stack>
                      </Grid>
                    )
                  })}
              </Grid>
            )}
          </Paper>
      </>
      ) : null}
    </Box>
  )
}
