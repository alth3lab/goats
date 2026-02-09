'use client'

import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Button,
  Paper,
  Stack
} from '@mui/material'
import { 
  Pets as PetsIcon,
  LocalHospital as HealthIcon,
  FavoriteBorder as BreedingIcon,
  ShoppingCart as SalesIcon,
  Assessment as StatsIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material'
import Link from 'next/link'
import { useEffect, useState } from 'react'

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

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const dashboardCards = [
    {
      title: 'الماعز والخرفان',
      icon: <PetsIcon sx={{ fontSize: 40 }} />,
      color: '#2e7d32',
      link: '/dashboard/goats',
      stats: loading ? '...' : `${stats?.activeGoats || 0} نشط`
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
      stats: loading ? '...' : `${stats?.pregnantGoats || 0} حامل`
    },
    {
      title: 'المبيعات',
      icon: <SalesIcon sx={{ fontSize: 40 }} />,
      color: '#1976d2',
      link: '/dashboard/sales',
      stats: loading ? '...' : `${(stats?.totalSales || 0).toLocaleString()} ريال`
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
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', bgcolor: '#fff' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  إجمالي القطيع
                </Typography>
                <Typography variant="h3" fontWeight="bold" color="primary">
                  {stats.totalGoats}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stats.totalTypes} أنواع • {stats.totalBreeds} سلالة
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  الذكور / الإناث
                </Typography>
                <Typography variant="h3" fontWeight="bold" color="secondary">
                  {stats.maleGoats} / {stats.femaleGoats}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stats.pregnantGoats} أنثى حامل
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  إجمالي المبيعات
                </Typography>
                <Typography variant="h3" fontWeight="bold" color="info.main">
                  {stats.totalSales.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ريال سعودي
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <TrendingUpIcon color="success" />
                  <Typography variant="h6">صافي الربح</Typography>
                </Stack>
                <Typography variant="h3" fontWeight="bold" color="success.main" mt={1}>
                  {stats.netProfit.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ريال سعودي
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      <Grid container spacing={3}>
        {dashboardCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
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

        <Grid item xs={12} sm={6} md={3}>
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
                {loading ? '...' : `${stats?.totalTypes} / ${stats?.totalBreeds}`}
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
