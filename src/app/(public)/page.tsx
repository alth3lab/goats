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
  Avatar,
  Paper,
} from '@mui/material'
import { useTheme, alpha } from '@mui/material/styles'
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
import FavoriteIcon from '@mui/icons-material/Favorite'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import CloudDoneIcon from '@mui/icons-material/CloudDone'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import AppRegistrationIcon from '@mui/icons-material/AppRegistration'
import SettingsIcon from '@mui/icons-material/Settings'
import AutoGraphIcon from '@mui/icons-material/AutoGraph'
import Link from 'next/link'

const stats = [
  { value: '+', label: 'وحدة إدارية' },
  { value: '', label: 'أنواع مزارع' },
  { value: '/', label: 'متاح دائما' },
  { value: '', label: 'عربي كامل' },
]

const farmTypes = [
  { emoji: '', name: 'أغنام', desc: 'إدارة كاملة لقطعان الأغنام والضأن مع سجلات السلالات المعتمدة' },
  { emoji: '', name: 'إبل', desc: 'متخصص في إدارة الإبل مع مراعاة مدة الحمل ومعايير التغذية الخاصة' },
  { emoji: '', name: 'مزارع مختلطة', desc: 'دعم المزارع التي تضم أنواعا متعددة مع عزل كامل للبيانات' },
]

const features = [
  { icon: <DashboardIcon sx={{ fontSize: 32 }} />, color: '#4F7A57', title: 'لوحة تحكم شاملة', desc: 'متابعة القطيع والإنتاج والمالية في مكان واحد مع رسوم بيانية حية' },
  { icon: <HealthAndSafetyIcon sx={{ fontSize: 32 }} />, color: '#d32f2f', title: 'سجلات صحية متكاملة', desc: 'تطعيمات وعلاجات وبروتوكولات صحية مع تنبيهات تلقائية قبل المواعيد' },
  { icon: <FavoriteIcon sx={{ fontSize: 32 }} />, color: '#e91e63', title: 'إدارة التكاثر', desc: 'تتبع التلقيح والحمل والولادات مع حساب تاريخ الولادة تلقائيا' },
  { icon: <InventoryIcon sx={{ fontSize: 32 }} />, color: '#ff6f00', title: 'إدارة الأعلاف والمخزون', desc: 'جداول التغذية الذكية مع كميات مقترحة حسب نوع الحيوان وعمره' },
  { icon: <AssessmentIcon sx={{ fontSize: 32 }} />, color: '#1565c0', title: 'تقارير PDF وإكسل', desc: 'تقارير جاهزة للطباعة بالعربية لجميع صفحات النظام' },
  { icon: <NotificationsActiveIcon sx={{ fontSize: 32 }} />, color: '#6a1b9a', title: 'تنبيهات ذكية', desc: 'إشعارات فورية للمواعيد الصحية والولادات القادمة ومستويات المخزون' },
  { icon: <GroupsIcon sx={{ fontSize: 32 }} />, color: '#00838f', title: 'إدارة فريق العمل', desc: 'أدوار وصلاحيات متعددة  مشرف مزارع طبيب بيطري محاسب' },
  { icon: <SecurityIcon sx={{ fontSize: 32 }} />, color: '#37474f', title: 'أمان وعزل البيانات', desc: 'كل مزرعة معزولة بالكامل في بيئة آمنة مع دعم متعدد المستأجرين' },
  { icon: <TrendingUpIcon sx={{ fontSize: 32 }} />, color: '#2e7d32', title: 'تحليلات الأداء', desc: 'قياس معدلات النمو والإنتاج والمبيعات واتخاذ قرارات مبنية على بيانات' },
]

const steps = [
  { num: '', icon: <AppRegistrationIcon sx={{ fontSize: 36 }} />, title: 'سجل مجانا', desc: 'أنشئ حسابك وأضف مزرعتك في أقل من دقيقتين' },
  { num: '', icon: <SettingsIcon sx={{ fontSize: 36 }} />, title: 'أضف قطيعك', desc: 'أدخل بيانات الحيوانات أو استورد من ملف إكسل' },
  { num: '', icon: <AutoGraphIcon sx={{ fontSize: 36 }} />, title: 'تابع وأدر', desc: 'استمتع بلوحة تحكم شاملة وتقارير فورية' },
]

const testimonials = [
  { name: 'محمد العامري', role: 'مربي إبل  أبوظبي', text: 'أفضل نظام جربته لإدارة إبلي. خاصة ميزة حساب مدة الحمل ومتابعة التكاثر.' },
  { name: 'سالم الشامسي', role: 'مزرعة أغنام  العين', text: 'وفر علي ساعات يوميا. التقارير الجاهزة والتنبيهات الصحية لا تقدر بثمن.' },
  { name: 'خالد المنصوري', role: 'مزرعة مختلطة  الشارقة', text: 'دعم الإبل والأغنام في نظام واحد مع عزل كامل للبيانات. ممتاز.' },
]

const plans = [
  { key: 'FREE', name: 'مجاني', price: 0, color: '#9e9e9e', icon: <StarIcon />, features: ['مزرعة واحدة', 'حتى 50 رأس', 'مستخدمان', 'تقارير أساسية'] },
  { key: 'BASIC', name: 'أساسي', price: 49, color: '#4F7A57', icon: <StarIcon />, popular: true, features: ['3 مزارع', 'حتى 500 رأس', '5 مستخدمين', 'تقارير متقدمة', 'نسخ احتياطي'] },
  { key: 'PRO', name: 'احترافي', price: 149, color: '#1976d2', icon: <RocketLaunchIcon />, features: ['10 مزارع', 'حتى 5000 رأس', '20 مستخدم', 'تقارير شاملة', 'دعم أولوية', 'API'] },
  { key: 'ENTERPRISE', name: 'مؤسسي', price: -1, color: '#9c27b0', icon: <BusinessIcon />, features: ['مزارع غير محدودة', 'رؤوس غير محدودة', 'مستخدمين غير محدودين', 'دعم مخصص', 'تكامل كامل'] },
]

export default function LandingPage() {
  const theme = useTheme()
  const pc = theme.palette.primary.main

  return (
    <Box>

      {/* Navbar */}
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', backdropFilter: 'blur(12px)', bgcolor: alpha('#fff', 0.92) }}>
        <Toolbar sx={{ maxWidth: 1200, mx: 'auto', width: '100%' }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1 }}>
            <Box sx={{ bgcolor: pc, borderRadius: 2, p: 0.6, display: 'flex', alignItems: 'center' }}>
              <PetsIcon sx={{ fontSize: 22, color: '#fff' }} />
            </Box>
            <Typography variant="h6" fontWeight="bold" color="primary">رعاة</Typography>
            <Chip label="إبل  أغنام  مواشي" size="small" sx={{ display: { xs: 'none', sm: 'flex' }, bgcolor: alpha(pc, 0.1), color: pc, fontSize: 11, fontWeight: 600 }} />
          </Stack>
          <Stack direction="row" spacing={1}>
            <Button component={Link} href="/login" variant="text" size="small" sx={{ fontWeight: 600 }}>تسجيل الدخول</Button>
            <Button component={Link} href="/register" variant="contained" size="small" sx={{ px: 2.5, fontWeight: 600, borderRadius: 2 }}>ابدأ مجانا</Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Hero */}
      <Box sx={{
        pt: { xs: 10, md: 16 }, pb: { xs: 8, md: 14 }, textAlign: 'center',
        background: `radial-gradient(ellipse at 65% 0%, ${alpha(pc, 0.13)} 0%, transparent 65%), radial-gradient(ellipse at 20% 100%, ${alpha('#1565c0', 0.08)} 0%, transparent 55%), ${theme.palette.background.default}`,
        position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', bgcolor: alpha(pc, 0.06), pointerEvents: 'none' }} />
        <Box sx={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', bgcolor: alpha('#1565c0', 0.05), pointerEvents: 'none' }} />
        <Container maxWidth="md" sx={{ position: 'relative' }}>
          <Chip icon={<CloudDoneIcon sx={{ fontSize: '16px !important' }} />} label="نظام سحابي متعدد المزارع" sx={{ mb: 3, bgcolor: alpha(pc, 0.1), color: pc, fontWeight: 600, px: 1 }} />
          <Typography variant="h2" fontWeight={800} sx={{ fontSize: { xs: '2rem', md: '3rem' }, lineHeight: 1.3, mb: 2, background: `linear-gradient(135deg, ${pc}, #1565c0)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            أدر مزرعتك بذكاء 
          </Typography>
          <Typography variant="h5" fontWeight={400} color="text.secondary" sx={{ mb: 2, fontSize: { xs: '1.1rem', md: '1.3rem' } }}>
            نظام إدارة متكامل لمزارع الإبل والأغنام والمواشي
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 5, maxWidth: 560, mx: 'auto', lineHeight: 1.8 }}>
            من التكاثر والصحة إلى الأعلاف والمبيعات  كل ما تحتاجه في مكان واحد مع دعم كامل للغة العربية.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" mb={8}>
            <Button component={Link} href="/register" variant="contained" size="large" endIcon={<ArrowBackIcon />} sx={{ px: 5, py: 1.8, fontSize: '1.05rem', fontWeight: 700, borderRadius: 3, boxShadow: `0 8px 24px ${alpha(pc, 0.35)}` }}>
              ابدأ مجانا الآن
            </Button>
            <Button href="#features" variant="outlined" size="large" sx={{ px: 4, py: 1.8, fontSize: '1.05rem', fontWeight: 600, borderRadius: 3 }}>
              استكشف المميزات
            </Button>
          </Stack>
          <Stack direction="row" spacing={{ xs: 3, md: 6 }} justifyContent="center" flexWrap="wrap" gap={2}>
            {stats.map((s, i) => (
              <Box key={i} textAlign="center">
                <Typography variant="h4" fontWeight={800} color="primary">{s.value}</Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>{s.label}</Typography>
              </Box>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* Farm types */}
      <Box sx={{ py: 8, bgcolor: alpha(pc, 0.03), borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Typography variant="h5" fontWeight={700} textAlign="center" mb={1}>يدعم جميع أنواع المزارع</Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center" mb={5}>كل نوع مزرعة يحصل على إعدادات ومعايير مخصصة</Typography>
          <Grid container spacing={3} justifyContent="center">
            {farmTypes.map((f, i) => (
              <Grid size={{ xs: 12, sm: 4 }} key={i}>
                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, textAlign: 'center', border: '1px solid', borderColor: 'divider', transition: 'all 0.2s', '&:hover': { borderColor: pc, transform: 'translateY(-4px)', boxShadow: `0 8px 24px ${alpha(pc, 0.12)}` } }}>
                  <Typography sx={{ fontSize: 48, mb: 1.5 }}>{f.emoji}</Typography>
                  <Typography variant="h6" fontWeight={700} mb={1}>{f.name}</Typography>
                  <Typography variant="body2" color="text.secondary" lineHeight={1.7}>{f.desc}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Features */}
      <Box id="features" sx={{ py: 10 }}>
        <Container maxWidth="lg">
          <Typography variant="h4" fontWeight={800} textAlign="center" gutterBottom>كل ما تحتاجه لإدارة مزرعتك</Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" mb={7}>أدوات متكاملة صممت خصيصا لمربي الإبل والأغنام في الوطن العربي</Typography>
          <Grid container spacing={3}>
            {features.map((f, i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                <Card elevation={0} sx={{ height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider', p: 0.5, transition: 'all 0.2s', '&:hover': { borderColor: f.color, transform: 'translateY(-3px)', boxShadow: `0 6px 20px ${alpha(f.color, 0.15)}` } }}>
                  <CardContent>
                    <Box sx={{ width: 54, height: 54, borderRadius: 2.5, bgcolor: alpha(f.color, 0.1), display: 'flex', alignItems: 'center', justifyContent: 'center', color: f.color, mb: 2 }}>
                      {f.icon}
                    </Box>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>{f.title}</Typography>
                    <Typography variant="body2" color="text.secondary" lineHeight={1.7}>{f.desc}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* How it works */}
      <Box sx={{ py: 10, bgcolor: alpha(pc, 0.03), borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="sm">
          <Typography variant="h4" fontWeight={800} textAlign="center" gutterBottom>ابدأ في 3 خطوات بسيطة</Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" mb={7}>لا تحتاج إلى خبرة تقنية  النظام صمم ليكون سهلا لمربي المواشي</Typography>
          <Stack spacing={5}>
            {steps.map((s, i) => (
              <Stack key={i} direction="row" spacing={3} alignItems="flex-start">
                <Avatar sx={{ width: 64, height: 64, bgcolor: pc, fontSize: '1.5rem', fontWeight: 800, flexShrink: 0, boxShadow: `0 4px 16px ${alpha(pc, 0.35)}` }}>{s.num}</Avatar>
                <Box pt={0.5}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                    <Box sx={{ color: pc }}>{s.icon}</Box>
                    <Typography variant="h6" fontWeight={700}>{s.title}</Typography>
                  </Stack>
                  <Typography variant="body1" color="text.secondary" lineHeight={1.8}>{s.desc}</Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Container>
      </Box>

      {/* Testimonials */}
      <Box sx={{ py: 10 }}>
        <Container maxWidth="lg">
          <Typography variant="h4" fontWeight={800} textAlign="center" gutterBottom>ماذا يقول مستخدمونا</Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" mb={7}>تجارب حقيقية من مربي إبل وأغنام يستخدمون النظام يوميا</Typography>
          <Grid container spacing={3}>
            {testimonials.map((t, i) => (
              <Grid size={{ xs: 12, md: 4 }} key={i}>
                <Card elevation={0} sx={{ height: '100%', borderRadius: 3, border: '1px solid', borderColor: 'divider', p: 1 }}>
                  <CardContent>
                    <Stack direction="row" spacing={0.5} mb={2}>{[...Array(5)].map((_, j) => <StarIcon key={j} sx={{ fontSize: 18, color: '#f9a825' }} />)}</Stack>
                    <Typography variant="body1" color="text.secondary" lineHeight={1.8} mb={3} sx={{ fontStyle: 'italic' }}>"{t.text}"</Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ bgcolor: pc, width: 38, height: 38, fontSize: 14 }}>{t.name.charAt(0)}</Avatar>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700}>{t.name}</Typography>
                        <Typography variant="caption" color="text.secondary">{t.role}</Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Pricing */}
      <Box id="pricing" sx={{ py: 10, bgcolor: 'grey.50', borderTop: '1px solid', borderColor: 'divider' }}>
        <Container maxWidth="lg">
          <Typography variant="h4" fontWeight={800} textAlign="center" gutterBottom>خطط شفافة لكل الأحجام</Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" mb={7}>ابدأ مجانا وطور الخطة مع نمو مزرعتك</Typography>
          <Grid container spacing={3} justifyContent="center">
            {plans.map((plan) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={plan.key}>
                <Card sx={{ borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column', border: plan.popular ? `2px solid ${plan.color}` : '1px solid', borderColor: plan.popular ? plan.color : 'divider', position: 'relative', transition: 'all 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 12px 32px ${alpha(plan.color, 0.2)}` } }} elevation={plan.popular ? 4 : 0}>
                  {plan.popular && <Chip label=" الأكثر شيوعا" size="small" sx={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', bgcolor: plan.color, color: '#fff', fontWeight: 700, px: 1 }} />}
                  <CardContent sx={{ flexGrow: 1, textAlign: 'center', pt: plan.popular ? 4 : 2.5 }}>
                    <Box sx={{ color: plan.color, mb: 1 }}>{plan.icon}</Box>
                    <Typography variant="h6" fontWeight={700}>{plan.name}</Typography>
                    <Box sx={{ my: 2 }}>
                      <Typography variant="h3" fontWeight={800} sx={{ color: plan.color, lineHeight: 1 }}>
                        {plan.price < 0 ? 'مخصص' : plan.price === 0 ? 'مجاني' : plan.price}
                      </Typography>
                      {plan.price > 0 && <Typography variant="body2" color="text.secondary">د.إ / شهريا</Typography>}
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <List dense disablePadding>
                      {plan.features.map((f, i) => (
                        <ListItem key={i} disablePadding sx={{ py: 0.4 }}>
                          <ListItemIcon sx={{ minWidth: 28 }}><CheckIcon fontSize="small" sx={{ color: plan.color }} /></ListItemIcon>
                          <ListItemText primary={f} primaryTypographyProps={{ variant: 'body2', textAlign: 'right' }} />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                  <Box sx={{ p: 2 }}>
                    <Button component={Link} href="/register" fullWidth variant={plan.popular ? 'contained' : 'outlined'} sx={plan.popular ? { bgcolor: plan.color, fontWeight: 700, py: 1.2, borderRadius: 2, '&:hover': { bgcolor: plan.color, opacity: 0.9 } } : { borderColor: plan.color, color: plan.color, fontWeight: 700, py: 1.2, borderRadius: 2 }}>
                      {plan.price < 0 ? 'تواصل معنا' : plan.price === 0 ? 'ابدأ مجانا' : 'اشترك الآن'}
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Banner */}
      <Box sx={{ py: { xs: 8, md: 12 }, textAlign: 'center', background: `linear-gradient(135deg, ${pc} 0%, #1565c0 100%)`, color: '#fff' }}>
        <Container maxWidth="sm">
          <Typography sx={{ fontSize: 52, mb: 1 }}></Typography>
          <Typography variant="h4" fontWeight={800} mb={1.5}>جاهز لتحويل مزرعتك</Typography>
          <Typography variant="body1" sx={{ opacity: 0.88, mb: 4, lineHeight: 1.8 }}>انضم الآن وابدأ مجانا  لا بطاقة ائتمان مطلوبة</Typography>
          <Button component={Link} href="/register" variant="contained" size="large" endIcon={<ArrowBackIcon />} sx={{ bgcolor: '#fff', color: pc, fontWeight: 800, px: 5, py: 1.8, fontSize: '1.05rem', borderRadius: 3, '&:hover': { bgcolor: alpha('#fff', 0.9) }, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
            أنشئ حسابك الآن
          </Button>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ py: 5, bgcolor: '#1a1a2e', color: 'grey.300' }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={3}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box sx={{ bgcolor: pc, borderRadius: 1.5, p: 0.5, display: 'flex', alignItems: 'center' }}>
                <PetsIcon sx={{ fontSize: 20, color: '#fff' }} />
              </Box>
              <Typography variant="subtitle1" fontWeight={700} color="grey.100">رعاة</Typography>
              <Typography variant="body2" color="grey.500"> نظام إدارة المواشي</Typography>
            </Stack>
            <Stack direction="row" spacing={2}>
              <Button component={Link} href="/terms" size="small" sx={{ color: 'grey.400', '&:hover': { color: '#fff' } }}>الشروط والأحكام</Button>
              <Button component={Link} href="/privacy" size="small" sx={{ color: 'grey.400', '&:hover': { color: '#fff' } }}>سياسة الخصوصية</Button>
              <Button component={Link} href="/login" size="small" sx={{ color: 'grey.400', '&:hover': { color: '#fff' } }}>تسجيل الدخول</Button>
            </Stack>
          </Stack>
          <Divider sx={{ my: 3, borderColor: 'grey.800' }} />
          <Typography variant="body2" color="grey.600" textAlign="center">
             {new Date().getFullYear()} رعاة  جميع الحقوق محفوظة. صنع بـ  لمربي المواشي في الوطن العربي
          </Typography>
        </Container>
      </Box>

    </Box>
  )
}
