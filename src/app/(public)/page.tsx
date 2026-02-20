'use client'

import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  IconButton,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import PetsIcon from '@mui/icons-material/Pets'
import CheckIcon from '@mui/icons-material/Check'
import DashboardIcon from '@mui/icons-material/Dashboard'
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety'
import InventoryIcon from '@mui/icons-material/Inventory'
import AssessmentIcon from '@mui/icons-material/Assessment'
import GroupsIcon from '@mui/icons-material/Groups'
import SecurityIcon from '@mui/icons-material/Security'
import StarIcon from '@mui/icons-material/Star'
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch'
import BusinessIcon from '@mui/icons-material/Business'
import Link from 'next/link'

const features = [
  {
    icon: <DashboardIcon sx={{ fontSize: 40 }} />,
    title: 'لوحة تحكم شاملة',
    desc: 'متابعة القطيع والإنتاج والمالية في مكان واحد',
  },
  {
    icon: <HealthAndSafetyIcon sx={{ fontSize: 40 }} />,
    title: 'سجلات صحية متكاملة',
    desc: 'تطعيمات، علاجات، بروتوكولات صحية مع تنبيهات تلقائية',
  },
  {
    icon: <InventoryIcon sx={{ fontSize: 40 }} />,
    title: 'إدارة المخزون والأعلاف',
    desc: 'تتبع المخزون وجداول التغذية واستهلاك الأعلاف',
  },
  {
    icon: <AssessmentIcon sx={{ fontSize: 40 }} />,
    title: 'تقارير وتحليلات',
    desc: 'تقارير PDF، رسوم بيانية، تحليلات الأداء والمبيعات',
  },
  {
    icon: <GroupsIcon sx={{ fontSize: 40 }} />,
    title: 'إدارة فريق العمل',
    desc: 'أدوار وصلاحيات متعددة مع سجل نشاطات كامل',
  },
  {
    icon: <SecurityIcon sx={{ fontSize: 40 }} />,
    title: 'أمان وعزل البيانات',
    desc: 'كل مزرعة معزولة بالكامل مع نسخ احتياطي واستعادة',
  },
]

const plans = [
  {
    key: 'FREE',
    name: 'مجاني',
    price: 0,
    color: '#9e9e9e',
    icon: <StarIcon />,
    features: ['مزرعة واحدة', 'حتى 50 رأس', 'مستخدمان', 'تقارير أساسية'],
  },
  {
    key: 'BASIC',
    name: 'أساسي',
    price: 49,
    color: '#4F7A57',
    icon: <StarIcon />,
    popular: true,
    features: ['3 مزارع', 'حتى 500 رأس', '5 مستخدمين', 'تقارير متقدمة', 'نسخ احتياطي'],
  },
  {
    key: 'PRO',
    name: 'احترافي',
    price: 149,
    color: '#1976d2',
    icon: <RocketLaunchIcon />,
    features: ['10 مزارع', 'حتى 5000 رأس', '20 مستخدم', 'تقارير شاملة', 'دعم أولوية', 'API'],
  },
  {
    key: 'ENTERPRISE',
    name: 'مؤسسي',
    price: -1,
    color: '#9c27b0',
    icon: <BusinessIcon />,
    features: ['مزارع غير محدودة', 'رؤوس غير محدودة', 'مستخدمين غير محدودين', 'دعم مخصص', 'تكامل كامل'],
  },
]

export default function LandingPage() {
  const theme = useTheme()

  return (
    <Box>
      {/* Navbar */}
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1 }}>
            <PetsIcon color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h6" fontWeight="bold" color="primary">
              رعاة
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button component={Link} href="/login" variant="outlined" size="small">
              تسجيل الدخول
            </Button>
            <Button component={Link} href="/register" variant="contained" size="small">
              ابدأ مجاناً
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Hero */}
      <Box
        sx={{
          py: { xs: 8, md: 14 },
          textAlign: 'center',
          background: `linear-gradient(135deg, ${theme.palette.primary.main}11, ${theme.palette.primary.main}08)`,
        }}
      >
        <Container maxWidth="md">
          <PetsIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            نظام إدارة المواشي
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
            نظام سحابي شامل لإدارة مزرعتك — من التكاثر والصحة إلى المبيعات والتقارير.
            ابدأ مجاناً اليوم.
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button component={Link} href="/register" variant="contained" size="large" sx={{ px: 4, py: 1.5, fontSize: '1.1rem' }}>
              ابدأ مجاناً
            </Button>
            <Button href="#pricing" variant="outlined" size="large" sx={{ px: 4, py: 1.5 }}>
              الأسعار
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Features */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Typography variant="h4" fontWeight="bold" textAlign="center" gutterBottom>
          كل ما تحتاجه لإدارة مزرعتك
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center" mb={6}>
          أدوات متكاملة صممت خصيصاً لمربي الأغنام والإبل والمواشي
        </Typography>
        <Grid container spacing={4}>
          {features.map((f, i) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
              <Card sx={{ height: '100%', borderRadius: 3, textAlign: 'center', p: 2 }} elevation={0} variant="outlined">
                <CardContent>
                  <Box sx={{ color: 'primary.main', mb: 2 }}>{f.icon}</Box>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>{f.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{f.desc}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Pricing */}
      <Box id="pricing" sx={{ py: 10, bgcolor: 'grey.50' }}>
        <Container maxWidth="lg">
          <Typography variant="h4" fontWeight="bold" textAlign="center" gutterBottom>
            خطط الأسعار
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" mb={6}>
            اختر الخطة المناسبة لحجم مزرعتك
          </Typography>
          <Grid container spacing={3} justifyContent="center">
            {plans.map((plan) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={plan.key}>
                <Card
                  sx={{
                    borderRadius: 3,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: plan.popular ? `2px solid ${plan.color}` : undefined,
                    position: 'relative',
                  }}
                  elevation={plan.popular ? 4 : 1}
                >
                  {plan.popular && (
                    <Chip
                      label="الأكثر شيوعاً"
                      size="small"
                      sx={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', bgcolor: plan.color, color: '#fff' }}
                    />
                  )}
                  <CardContent sx={{ flexGrow: 1, textAlign: 'center', pt: plan.popular ? 4 : 2 }}>
                    <Box sx={{ color: plan.color, mb: 1 }}>{plan.icon}</Box>
                    <Typography variant="h6" fontWeight="bold">{plan.name}</Typography>
                    <Typography variant="h4" fontWeight="bold" sx={{ color: plan.color, my: 2 }}>
                      {plan.price < 0 ? 'مخصص' : plan.price === 0 ? 'مجاني' : `${plan.price} د.إ`}
                    </Typography>
                    {plan.price > 0 && <Typography variant="body2" color="text.secondary">شهرياً</Typography>}
                    <Divider sx={{ my: 2 }} />
                    <List dense>
                      {plan.features.map((f, i) => (
                        <ListItem key={i} disablePadding sx={{ py: 0.3 }}>
                          <ListItemIcon sx={{ minWidth: 28 }}>
                            <CheckIcon fontSize="small" sx={{ color: plan.color }} />
                          </ListItemIcon>
                          <ListItemText primary={f} primaryTypographyProps={{ variant: 'body2' }} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                  <Box sx={{ p: 2 }}>
                    <Button
                      component={Link}
                      href="/register"
                      fullWidth
                      variant={plan.popular ? 'contained' : 'outlined'}
                      sx={plan.popular ? { bgcolor: plan.color, '&:hover': { bgcolor: plan.color } } : { borderColor: plan.color, color: plan.color }}
                    >
                      {plan.price < 0 ? 'تواصل معنا' : 'ابدأ الآن'}
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 4, textAlign: 'center', borderTop: '1px solid', borderColor: 'divider' }}>
        <Container>
          <Stack direction="row" spacing={3} justifyContent="center" mb={2}>
            <Button component={Link} href="/terms" size="small" color="inherit">الشروط والأحكام</Button>
            <Button component={Link} href="/privacy" size="small" color="inherit">سياسة الخصوصية</Button>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} رعاة — نظام إدارة المواشي. جميع الحقوق محفوظة.
          </Typography>
        </Container>
      </Box>
    </Box>
  )
}
