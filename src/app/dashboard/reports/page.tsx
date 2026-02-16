
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
  Chip,
  Alert
} from '@mui/material'
import {
  Assessment as ReportsIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  TrendingUp as GrowthIcon,
  Receipt as ExpensesIcon,
  ShoppingCart as SalesIcon,
  LocalHospital as HealthIcon,
  Pets as PetsIcon
} from '@mui/icons-material'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { generateArabicPDF } from '@/lib/pdfHelper'
import * as XLSX from 'xlsx'

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
  expensesByCategory: Array<{ category: string; amount: number }>
}

export default function ReportsPage() {
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

  const exportKpiToExcel = () => {
    if (!data) return
    const categoryLabels: Record<string, string> = {
      FEED: 'علف', MEDICINE: 'دواء', EQUIPMENT: 'معدات', LABOR: 'عمالة',
      UTILITIES: 'مرافق', MAINTENANCE: 'صيانة', TRANSPORT: 'نقل', OTHER: 'أخرى'
    }
    const kpiSheet = XLSX.utils.json_to_sheet([
      { 'البيان': 'إجمالي المبيعات', 'القيمة': data.totalSales },
      { 'البيان': 'عدد عمليات البيع', 'القيمة': data.salesCount },
      { 'البيان': 'متوسط البيع', 'القيمة': data.averageSale },
      { 'البيان': 'إجمالي المصروفات', 'القيمة': data.totalExpenses },
      { 'البيان': 'صافي الربح', 'القيمة': data.netProfit },
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
    const categoryLabels: Record<string, string> = {
      FEED: 'علف', MEDICINE: 'دواء', EQUIPMENT: 'معدات', LABOR: 'عمالة',
      UTILITIES: 'مرافق', MAINTENANCE: 'صيانة', TRANSPORT: 'نقل', OTHER: 'أخرى'
    }
    const pData = data.expensesByCategory.map(item => ({
      category: categoryLabels[item.category] || item.category,
      amount: formatCurrency(item.amount)
    }))
    // KPI summary rows
    const kpiRows = [
      { category: 'إجمالي المبيعات', amount: formatCurrency(data.totalSales) },
      { category: 'عدد عمليات البيع', amount: formatNumber(data.salesCount) },
      { category: 'متوسط البيع', amount: formatCurrency(data.averageSale) },
      { category: 'إجمالي المصروفات', amount: formatCurrency(data.totalExpenses) },
      { category: 'صافي الربح', amount: formatCurrency(data.netProfit) },
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
      goats: '/api/goats',
      sales: '/api/sales',
      expenses: '/api/expenses'
    }
    const labels: Record<string, string> = {
      goats: 'الماعز',
      sales: 'المبيعات',
      expenses: 'المصروفات'
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

  return (
    <Box sx={{ width: '100%', overflowX: 'hidden' }}>
      <Paper sx={{ p: 3, mb: 2, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <ReportsIcon color="primary" />
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
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography align="center">جاري تحميل التقرير...</Typography>
        </Paper>
      ) : data ? (
        <>
          <Grid container spacing={3} mb={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <SalesIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight="bold">إجمالي المبيعات</Typography>
                  </Stack>
                  <Typography variant="h5" fontWeight="bold">
                    {formatCurrency(data.totalSales)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    عدد العمليات: {formatNumber(data.salesCount)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <ExpensesIcon color="warning" />
                    <Typography variant="subtitle1" fontWeight="bold">المصروفات</Typography>
                  </Stack>
                  <Typography variant="h5" fontWeight="bold">
                    {formatCurrency(data.totalExpenses)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    صافي الربح: {formatCurrency(data.netProfit)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <GrowthIcon color="success" />
                    <Typography variant="subtitle1" fontWeight="bold">نمو القطيع</Typography>
                  </Stack>
                  <Typography variant="h5" fontWeight="bold">
                    {formatNumber(data.herdGrowth)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    مواليد: {formatNumber(data.birthsCount)} | نفوق: {formatNumber(data.deathsCount)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <HealthIcon color="error" />
                    <Typography variant="subtitle1" fontWeight="bold">نسبة النفوق</Typography>
                  </Stack>
                  <Typography variant="h5" fontWeight="bold">
                    {data.mortalityRate.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    القطيع النشط: {formatNumber(data.activeGoats)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              المصروفات حسب الفئة
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {data.expensesByCategory.length === 0 ? (
                <Chip label="لا توجد بيانات" variant="outlined" />
              ) : (
                data.expensesByCategory.map((item) => (
                  <Chip
                    key={item.category}
                    label={`${item.category}: ${formatCurrency(item.amount)}`}
                    color="primary"
                    variant="outlined"
                  />
                ))
              )}
            </Stack>
          </Paper>
        </>
      ) : null}

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <PetsIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">استيراد/تصدير البيانات</Typography>
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <Button variant="outlined" onClick={() => handleExportData('goats')} sx={{ color: 'success.main', borderColor: 'success.main' }}>
              تصدير الماعز
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
            استيراد الماعز (CSV)
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
