
'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Stack,
  TextField,
  Alert,
  LinearProgress,
  Skeleton,
  Divider,
  Avatar,
  useTheme
} from '@mui/material'
import {
  Assessment as ReportsIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  TrendingUp as GrowthIcon,
  TrendingDown as TrendingDownIcon,
  Receipt as ExpensesIcon,
  ShoppingCart as SalesIcon,
  LocalHospital as HealthIcon,
  Pets as PetsIcon,
  AccountBalance as ProfitIcon,
  Grass as FeedIcon,
  MonetizationOn as RevenueIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Remove as FlatIcon,
  ChildCare as BirthIcon
} from '@mui/icons-material'
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer
} from 'recharts'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { generateArabicPDF } from '@/lib/pdfHelper'
import * as XLSX from 'xlsx'

/* ───── Category labels ───── */
const categoryLabels: Record<string, string> = {
  FEED: 'علف', MEDICINE: 'دواء', EQUIPMENT: 'معدات', LABOR: 'عمالة',
  UTILITIES: 'مرافق', MAINTENANCE: 'صيانة', TRANSPORT: 'نقل', OTHER: 'أخرى'
}

const CHART_COLORS = ['#2196f3', '#ff9800', '#4caf50', '#f44336', '#9c27b0', '#00bcd4', '#ff5722', '#607d8b']

/* ───── Types ───── */
interface AnalyticsData {
  period: { year: number; month: number }
  totalSales: number
  totalExpenses: number
  netProfit: number
  salesCount: number
  averageSale: number
  birthsCount: number
  deathsCount: number
  activeGoats: number
  herdGrowth: number
  mortalityRate: number
  feedCostPerHead: number
  revenuePerHead: number
  expensesByCategory: Array<{ category: string; amount: number }>
  comparison: Record<string, number | null>
  previous: {
    totalSales: number
    totalExpenses: number
    netProfit: number
  }
}

/* ───── Trend badge component ───── */
function TrendBadge({ value, invertColor }: { value: number | null; invertColor?: boolean }) {
  if (value === null) return null
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

/* ───── KPI Card component ───── */
function KpiCard({
  icon, title, value, subtitle, trend, color, invertColor
}: {
  icon: React.ReactNode
  title: string
  value: string
  subtitle?: string
  trend: number | null
  color: string
  invertColor?: boolean
}) {
  return (
    <Card sx={{ height: '100%', borderRadius: 3, position: 'relative', overflow: 'visible' }}>
      <CardContent sx={{ pt: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Avatar sx={{ bgcolor: `${color}.main`, width: 48, height: 48, mb: 1 }}>
            {icon}
          </Avatar>
          <TrendBadge value={trend} invertColor={invertColor} />
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

/* ───── Loading skeleton ───── */
function ReportSkeleton() {
  return (
    <>
      <Grid container spacing={3} mb={3}>
        {[...Array(6)].map((_, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
            <Card sx={{ borderRadius: 3, p: 2 }}>
              <Skeleton variant="circular" width={48} height={48} />
              <Skeleton variant="text" sx={{ mt: 2, fontSize: '1.5rem' }} width="60%" />
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="40%" />
            </Card>
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={3} mb={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, borderRadius: 3, height: 350 }}>
            <Skeleton variant="text" width="40%" sx={{ fontSize: '1.25rem', mb: 2 }} />
            <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 2 }} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper sx={{ p: 3, borderRadius: 3, height: 350 }}>
            <Skeleton variant="text" width="40%" sx={{ fontSize: '1.25rem', mb: 2 }} />
            <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 2 }} />
          </Paper>
        </Grid>
      </Grid>
    </>
  )
}

/* ────────────────────── Main Page ────────────────────── */
export default function ReportsPage() {
  const theme = useTheme()
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [importResult, setImportResult] = useState<string | null>(null)

  const { year, monthNumber } = useMemo(() => {
    const [y, m] = month.split('-').map(Number)
    return { year: y, monthNumber: m }
  }, [month])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/analytics?year=${year}&month=${monthNumber}`)
      .then((res) => res.json())
      .then((payload) => setData(payload))
      .finally(() => setLoading(false))
  }, [year, monthNumber])

  /* ── Expense pie data ── */
  const pieData = useMemo(() => {
    if (!data) return []
    return data.expensesByCategory.map(item => ({
      name: categoryLabels[item.category] || item.category,
      value: item.amount
    }))
  }, [data])

  /* ── Bar chart data ── */
  const barData = useMemo(() => {
    if (!data) return []
    return [
      { name: 'المبيعات', current: data.totalSales, previous: data.previous.totalSales },
      { name: 'المصروفات', current: data.totalExpenses, previous: data.previous.totalExpenses },
      { name: 'صافي الربح', current: Math.max(0, data.netProfit), previous: Math.max(0, data.previous.netProfit) }
    ]
  }, [data])

  /* ── Total expenses for progress bars ── */
  const totalCategoryExpenses = useMemo(() => {
    return data?.expensesByCategory.reduce((s, i) => s + i.amount, 0) || 1
  }, [data])

  /* ── Export functions ── */
  const exportKpiToExcel = () => {
    if (!data) return
    const kpiSheet = XLSX.utils.json_to_sheet([
      { 'البيان': 'إجمالي المبيعات', 'القيمة': data.totalSales },
      { 'البيان': 'عدد عمليات البيع', 'القيمة': data.salesCount },
      { 'البيان': 'متوسط البيع', 'القيمة': data.averageSale },
      { 'البيان': 'إجمالي المصروفات', 'القيمة': data.totalExpenses },
      { 'البيان': 'صافي الربح', 'القيمة': data.netProfit },
      { 'البيان': 'تكلفة العلف لكل رأس', 'القيمة': data.feedCostPerHead },
      { 'البيان': 'الإيراد لكل رأس', 'القيمة': data.revenuePerHead },
      { 'البيان': 'عدد المواليد', 'القيمة': data.birthsCount },
      { 'البيان': 'عدد النفوق', 'القيمة': data.deathsCount },
      { 'البيان': 'القطيع النشط', 'القيمة': data.activeGoats },
      { 'البيان': 'نمو القطيع', 'القيمة': data.herdGrowth },
      { 'البيان': 'نسبة النفوق', 'القيمة': `${data.mortalityRate.toFixed(1)}%` }
    ])
    const expensesByCatData = data.expensesByCategory.map(item => ({
      'الفئة': categoryLabels[item.category] || item.category,
      'المبلغ': item.amount
    }))
    const catSheet = XLSX.utils.json_to_sheet(expensesByCatData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, kpiSheet, 'مؤشرات الأداء')
    XLSX.utils.book_append_sheet(wb, catSheet, 'المصروفات حسب الفئة')
    XLSX.writeFile(wb, `monthly-report-${year}-${monthNumber}.xlsx`)
  }

  const exportKpiToPDF = async () => {
    if (!data) return
    const pData = data.expensesByCategory.map(item => ({
      category: categoryLabels[item.category] || item.category,
      amount: formatCurrency(item.amount)
    }))
    const kpiRows = [
      { category: 'إجمالي المبيعات', amount: formatCurrency(data.totalSales) },
      { category: 'عدد عمليات البيع', amount: formatNumber(data.salesCount) },
      { category: 'متوسط البيع', amount: formatCurrency(data.averageSale) },
      { category: 'إجمالي المصروفات', amount: formatCurrency(data.totalExpenses) },
      { category: 'صافي الربح', amount: formatCurrency(data.netProfit) },
      { category: 'تكلفة العلف لكل رأس', amount: formatCurrency(data.feedCostPerHead) },
      { category: 'الإيراد لكل رأس', amount: formatCurrency(data.revenuePerHead) },
      { category: 'عدد المواليد', amount: formatNumber(data.birthsCount) },
      { category: 'عدد النفوق', amount: formatNumber(data.deathsCount) },
      { category: 'القطيع النشط', amount: formatNumber(data.activeGoats) },
      { category: 'نمو القطيع', amount: formatNumber(data.herdGrowth) },
      { category: 'نسبة النفوق', amount: `${data.mortalityRate.toFixed(1)}%` }
    ]
    await generateArabicPDF({
      title: `تقرير شهري - ${monthNumber}/${year}`,
      date: new Date().toLocaleDateString('en-GB'),
      stats: [
        { label: 'إجمالي المبيعات', value: formatCurrency(data.totalSales) },
        { label: 'المصروفات', value: formatCurrency(data.totalExpenses) },
        { label: 'صافي الربح', value: formatCurrency(data.netProfit) },
        { label: 'القطيع النشط', value: data.activeGoats },
        { label: 'المواليد', value: data.birthsCount },
        { label: 'نسبة النفوق', value: `${data.mortalityRate.toFixed(1)}%` }
      ],
      columns: [
        { header: 'القيمة', dataKey: 'amount' },
        { header: 'البيان', dataKey: 'category' }
      ],
      data: [...kpiRows, { category: '', amount: '' }, { category: '--- المصروفات حسب الفئة ---', amount: '' }, ...pData],
      totals: { category: 'إجمالي المصروفات', amount: formatCurrency(data.totalExpenses) },
      filename: `monthly-report-${year}-${monthNumber}.pdf`
    })
  }

  const handleExportData = async (type: 'goats' | 'sales' | 'expenses') => {
    const endpoints: Record<string, string> = {
      goats: '/api/goats', sales: '/api/sales', expenses: '/api/expenses'
    }
    const labels: Record<string, string> = {
      goats: 'الحيوانات', sales: 'المبيعات', expenses: 'المصروفات'
    }
    const res = await fetch(endpoints[type])
    const json = await res.json()
    const rows = Array.isArray(json) ? json : json.data || []
    if (rows.length === 0) return
    const sheet = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, sheet, labels[type])
    XLSX.writeFile(wb, `${type}-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleImport = async (file: File) => {
    setImportResult(null)
    const text = await file.text()
    const res = await fetch('/api/goats/import', {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv' },
      body: text
    })
    const payload = await res.json()
    if (!res.ok) {
      setImportResult(payload.error || 'فشل في الاستيراد')
      return
    }
    const errors = Array.isArray(payload.errors) ? payload.errors.length : 0
    setImportResult(`تم استيراد ${payload.created || 0} سجل. أخطاء: ${errors}`)
  }

  /* ─── Custom tooltip for recharts ─── */
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }> }) => {
    if (!active || !payload?.length) return null
    return (
      <Paper sx={{ p: 1.5, borderRadius: 2 }}>
        {payload.map((entry, i) => (
          <Typography key={i} variant="body2" sx={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </Typography>
        ))}
      </Paper>
    )
  }

  return (
    <Box sx={{ width: '100%', overflowX: 'hidden' }}>
      {/* ── Header ── */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <ReportsIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h4" fontWeight="bold">تقارير شهرية</Typography>
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
            <TextField
              type="month"
              label="الشهر"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: { xs: '100%', md: 180 } }}
            />
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportKpiToExcel} disabled={!data} sx={{ color: 'success.main', borderColor: 'success.main' }}>
              تصدير Excel
            </Button>
            <Button variant="contained" startIcon={<DownloadIcon />} onClick={exportKpiToPDF} disabled={!data}>
              تصدير PDF
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {loading ? (
        <ReportSkeleton />
      ) : data ? (
        <>
          {/* ── KPI Cards (6 cards) ── */}
          <Grid container spacing={3} mb={3}>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <KpiCard
                icon={<SalesIcon />}
                title="إجمالي المبيعات"
                value={formatCurrency(data.totalSales)}
                subtitle={`عمليات البيع: ${formatNumber(data.salesCount)}`}
                trend={data.comparison.totalSales}
                color="primary"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <KpiCard
                icon={<ExpensesIcon />}
                title="المصروفات"
                value={formatCurrency(data.totalExpenses)}
                subtitle={`متوسط البيع: ${formatCurrency(data.averageSale)}`}
                trend={data.comparison.totalExpenses}
                color="warning"
                invertColor
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <KpiCard
                icon={<ProfitIcon />}
                title="صافي الربح"
                value={formatCurrency(data.netProfit)}
                trend={data.comparison.netProfit}
                color="success"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <KpiCard
                icon={<FeedIcon />}
                title="تكلفة العلف / رأس"
                value={formatCurrency(data.feedCostPerHead)}
                trend={data.comparison.feedCostPerHead}
                color="info"
                invertColor
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <KpiCard
                icon={<RevenueIcon />}
                title="الإيراد / رأس"
                value={formatCurrency(data.revenuePerHead)}
                trend={data.comparison.revenuePerHead}
                color="secondary"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }}>
              <KpiCard
                icon={<PetsIcon />}
                title="القطيع النشط"
                value={formatNumber(data.activeGoats)}
                subtitle={`نمو: ${data.herdGrowth >= 0 ? '+' : ''}${data.herdGrowth}`}
                trend={data.comparison.herdGrowth}
                color="success"
              />
            </Grid>
          </Grid>

          {/* ── Extra KPI row ── */}
          <Grid container spacing={3} mb={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard
                icon={<BirthIcon />}
                title="المواليد"
                value={formatNumber(data.birthsCount)}
                trend={data.comparison.birthsCount}
                color="info"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard
                icon={<HealthIcon />}
                title="النفوق"
                value={formatNumber(data.deathsCount)}
                subtitle={`نسبة: ${data.mortalityRate.toFixed(1)}%`}
                trend={data.comparison.deathsCount}
                color="error"
                invertColor
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard
                icon={<GrowthIcon />}
                title="نمو القطيع"
                value={formatNumber(data.herdGrowth)}
                subtitle={`مواليد: ${data.birthsCount} | نفوق: ${data.deathsCount}`}
                trend={data.comparison.herdGrowth}
                color="success"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard
                icon={<HealthIcon />}
                title="نسبة النفوق"
                value={`${data.mortalityRate.toFixed(1)}%`}
                trend={data.comparison.mortalityRate}
                color="error"
                invertColor
              />
            </Grid>
          </Grid>

          {/* ── Charts row ── */}
          <Grid container spacing={3} mb={3}>
            {/* Pie chart – Expenses by category */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  المصروفات حسب الفئة
                </Typography>
                {pieData.length === 0 ? (
                  <Typography color="text.secondary" align="center" sx={{ mt: 8 }}>
                    لا توجد مصروفات لهذا الشهر
                  </Typography>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={50}
                        paddingAngle={3}
                        dataKey="value"
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        label={((entry: any) => `${entry.name} ${((entry.percent ?? 0) * 100).toFixed(0)}%`) as any}
                      >
                        {pieData.map((_, index) => (
                          <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <ReTooltip content={<CustomTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>

            {/* Bar chart – Sales vs Expenses vs Profit */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  مقارنة مع الشهر السابق
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontFamily: 'Cairo', fontSize: 12 }} />
                    <YAxis tick={{ fontFamily: 'Cairo', fontSize: 12 }} />
                    <ReTooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="current" name="الشهر الحالي" fill={theme.palette.primary.main} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="previous" name="الشهر السابق" fill={theme.palette.grey[400]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* ── Expenses breakdown with progress bars ── */}
          <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              تفاصيل المصروفات
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {data.expensesByCategory.length === 0 ? (
              <Typography color="text.secondary" align="center">
                لا توجد مصروفات لهذا الشهر
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {data.expensesByCategory
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

      {/* ── Import / Export section ── */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <PetsIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">استيراد / تصدير البيانات</Typography>
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Button variant="outlined" onClick={() => handleExportData('goats')} sx={{ color: 'success.main', borderColor: 'success.main' }}>
              تصدير الحيوانات
            </Button>
            <Button variant="outlined" onClick={() => handleExportData('sales')} sx={{ color: 'success.main', borderColor: 'success.main' }}>
              تصدير المبيعات
            </Button>
            <Button variant="outlined" onClick={() => handleExportData('expenses')} sx={{ color: 'success.main', borderColor: 'success.main' }}>
              تصدير المصروفات
            </Button>
          </Stack>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} mt={3}>
          <Button component="label" variant="contained" startIcon={<UploadIcon />}>
            استيراد الحيوانات (CSV)
            <input
              type="file"
              hidden
              accept=".csv"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) handleImport(file)
              }}
            />
          </Button>
          <Typography variant="body2" color="text.secondary">
            الأعمدة المطلوبة: tagId, breed, gender, birthDate (YYYY-MM-DD)
          </Typography>
        </Stack>

        {importResult && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {importResult}
          </Alert>
        )}
      </Paper>
    </Box>
  )
}
