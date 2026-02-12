'use client'

import { 
  Box, 
  Grid,
  Card, 
  CardContent, 
  Typography, 
  Button,
  Paper,
  Stack,
  Alert,
  AlertTitle,
  Chip
} from '@mui/material'
import { 
  Pets as PetsIcon,
  LocalHospital as HealthIcon,
  FavoriteBorder as BreedingIcon,
  ShoppingCart as SalesIcon,
  Assessment as StatsIcon,
  TrendingUp as TrendingUpIcon,
  NotificationsActive as AlertIcon,
  ChildCare as WeaningIcon,
  HomeWork as PenIcon,
  ReportProblem as DeathIcon
} from '@mui/icons-material'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { formatCurrency, formatDate, formatNumber } from '@/lib/formatters'

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
}

interface AlertItem {
  id: string
  type: 'BIRTH' | 'HEALTH' | 'WEANING' | 'PEN_CAPACITY' | 'DEATHS' | 'BREEDING_OVERDUE'
  severity: 'error' | 'warning' | 'info'
  title: string
  message: string
  date: string
}

interface Pen {
  id: string
  name: string
  nameAr: string
  type: string
  capacity: number | null
  notes: string | null
  _count: {
    goats: number
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loadingAlerts, setLoadingAlerts] = useState(true)
  const [pens, setPens] = useState<Pen[]>([])
  const [showCharts, setShowCharts] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
      
    fetch('/api/alerts')
      .then(res => res.json())
      .then(data => {
        setAlerts(Array.isArray(data) ? data : [])
        setLoadingAlerts(false)
      })
      .catch(() => setLoadingAlerts(false))

    fetch('/api/pens')
      .then(res => res.json())
      .then(data => {
        setPens(Array.isArray(data) ? data : [])
      })
      .catch(() => setPens([]))
  }, [])

  const dashboardCards = [
    {
      title: 'الماعز والخرفان',
      icon: <PetsIcon sx={{ fontSize: 40 }} />,
      color: '#2e7d32',
      link: '/dashboard/goats',
      stats: loading ? '...' : `${formatNumber(stats?.activeGoats || 0)} نشط`
    },
    {
      title: 'السجلات الصحية',
      icon: <HealthIcon sx={{ fontSize: 40 }} />,
      color: '#d32f2f',
      link: '/dashboard/health',
      stats: 'إدارة الصحة'
    },
    {
      title: 'التكاثر',
      icon: <BreedingIcon sx={{ fontSize: 40 }} />,
      color: '#e91e63',
      link: '/dashboard/breeding',
      stats: loading ? '...' : `${formatNumber(stats?.pregnantGoats || 0)} حامل`
    },
    {
      title: 'المبيعات',
      icon: <SalesIcon sx={{ fontSize: 40 }} />,
      color: '#1976d2',
      link: '/dashboard/sales',
      stats: loading ? '...' : formatCurrency(stats?.totalSales || 0)
    },
  ]

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2} mb={1}>
          <PetsIcon sx={{ fontSize: 48 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">
              لوحة التحكم الرئيسية
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              متابعة وإدارة قطيع الماعز والخرفان
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {!loading && stats && (
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

          {stats && (
            <Grid container spacing={3} mb={4}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ height: '100%', bgcolor: '#fff' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  إجمالي القطيع
                </Typography>
                <Typography variant="h3" fontWeight="bold" color="primary">
                  {formatNumber(stats.totalGoats)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatNumber(stats.totalTypes)} أنواع • {formatNumber(stats.totalBreeds)} سلالة
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  الذكور / الإناث
                </Typography>
                <Typography variant="h3" fontWeight="bold" color="secondary">
                  {formatNumber(stats.maleGoats)} / {formatNumber(stats.femaleGoats)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatNumber(stats.pregnantGoats)} أنثى حامل
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  إجمالي المبيعات
                </Typography>
                <Typography variant="h3" fontWeight="bold" color="info.main">
                  {formatCurrency(stats.totalSales || 0)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  درهم
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <TrendingUpIcon color="success" />
                  <Typography variant="h6">صافي الربح</Typography>
                </Stack>
                <Typography variant="h3" fontWeight="bold" color="success.main" mt={1}>
                  {formatCurrency(stats.netProfit)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  درهم
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

          {/* Charts Section */}
          {pens.length > 0 && (
            <Box mb={4}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                  التحليل البياني
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setShowCharts(!showCharts)}
                >
                  {showCharts ? 'إخفاء' : 'عرض'}
                </Button>
              </Stack>
              
              {showCharts && (
                <Grid container spacing={3}>
                  {/* Pie Chart - Distribution by Type */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="bold" mb={2} textAlign="center">
                          توزيع الحيوانات حسب نوع الحظيرة
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'ولادة', value: pens.filter(p => p.type === 'BREEDING').reduce((sum, p) => sum + p._count.goats, 0), color: '#2196f3' },
                                { name: 'عزل', value: pens.filter(p => p.type === 'ISOLATION').reduce((sum, p) => sum + p._count.goats, 0), color: '#f44336' },
                                { name: 'تسمين', value: pens.filter(p => p.type === 'FATTENING').reduce((sum, p) => sum + p._count.goats, 0), color: '#4caf50' },
                                { name: 'عام', value: pens.filter(p => !p.type || p.type === 'GENERAL').reduce((sum, p) => sum + p._count.goats, 0), color: '#ff9800' }
                              ].filter(item => item.value > 0)}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {[
                                { name: 'ولادة', value: pens.filter(p => p.type === 'BREEDING').reduce((sum, p) => sum + p._count.goats, 0), color: '#2196f3' },
                                { name: 'عزل', value: pens.filter(p => p.type === 'ISOLATION').reduce((sum, p) => sum + p._count.goats, 0), color: '#f44336' },
                                { name: 'تسمين', value: pens.filter(p => p.type === 'FATTENING').reduce((sum, p) => sum + p._count.goats, 0), color: '#4caf50' },
                                { name: 'عام', value: pens.filter(p => !p.type || p.type === 'GENERAL').reduce((sum, p) => sum + p._count.goats, 0), color: '#ff9800' }
                              ].filter(item => item.value > 0).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Bar Chart - Gender Distribution */}
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="bold" mb={2} textAlign="center">
                          توزيع الذكور والإناث
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'ذكور', value: stats?.maleGoats || 0, color: '#2196f3' },
                                { name: 'إناث', value: stats?.femaleGoats || 0, color: '#e91e63' }
                              ].filter(item => item.value > 0)}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, value, percent }) => `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {[
                                { name: 'ذكور', value: stats?.maleGoats || 0, color: '#2196f3' },
                                { name: 'إناث', value: stats?.femaleGoats || 0, color: '#e91e63' }
                              ].filter(item => item.value > 0).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Bar Chart - Top 10 Pens */}
                  <Grid size={{ xs: 12 }}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle1" fontWeight="bold" mb={2} textAlign="center">
                          أكثر 10 حظائر من حيث عدد الحيوانات
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={[...pens]
                              .sort((a, b) => b._count.goats - a._count.goats)
                              .slice(0, 10)
                              .map(pen => ({
                                name: pen.nameAr,
                                'عدد الحيوانات': pen._count.goats,
                                'السعة': pen.capacity || 0
                              }))}
                          >
                            <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                            <YAxis />
                            <RechartsTooltip />
                            <Legend />
                            <Bar dataKey="عدد الحيوانات" fill="#82ca9d" />
                            <Bar dataKey="السعة" fill="#8884d8" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              )}
            </Box>
          )}
      </>
      )}

      <Grid container spacing={3}>
        {dashboardCards.map((card, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Card
              component={Link}
              href={card.link}
              sx={{
                height: '100%',
                textDecoration: 'none',
                transition: 'all 0.3s ease',
                '&:hover': { transform: 'translateY(-8px)', boxShadow: 6 }
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                    bgcolor: `${card.color}20`,
                    color: card.color
                  }}
                >
                  {card.icon}
                </Box>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  {card.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {card.stats}
                </Typography>
                <Button
                  variant="contained"
                  sx={{ mt: 2, bgcolor: card.color, '&:hover': { bgcolor: card.color } }}
                >
                  فتح
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            component={Link}
            href="/dashboard/types"
            sx={{
              height: '100%',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              '&:hover': { transform: 'translateY(-8px)', boxShadow: 6 }
            }}
          >
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                  bgcolor: '#ff980020',
                  color: '#ff9800'
                }}
              >
                <StatsIcon sx={{ fontSize: 40 }} />
              </Box>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                الأنواع والسلالات
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {loading ? '...' : `${formatNumber(stats?.totalTypes || 0)} / ${formatNumber(stats?.totalBreeds || 0)}`}
              </Typography>
              <Button
                variant="contained"
                sx={{ mt: 2, bgcolor: '#ff9800', '&:hover': { bgcolor: '#ff9800' } }}
              >
                إدارة
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
