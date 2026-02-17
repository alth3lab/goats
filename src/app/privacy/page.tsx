'use client'

import { Box, Container, Typography, Paper, Button, Stack, AppBar, Toolbar } from '@mui/material'
import PetsIcon from '@mui/icons-material/Pets'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <Box>
      <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1 }}>
            <PetsIcon color="primary" />
            <Typography variant="h6" fontWeight="bold" color="primary" component={Link} href="/" sx={{ textDecoration: 'none' }}>
              رعاة
            </Typography>
          </Stack>
          <Button component={Link} href="/" startIcon={<ArrowBackIcon />} size="small">الرئيسية</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 6 }}>
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>سياسة الخصوصية</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>آخر تحديث: {new Date().toLocaleDateString('ar-AE')}</Typography>

          <Typography variant="h6" fontWeight="bold" mt={3} mb={1}>1. البيانات التي نجمعها</Typography>
          <Typography variant="body1" paragraph>
            نجمع البيانات التالية عند إنشاء حسابك: الاسم الكامل، البريد الإلكتروني، اسم المستخدم، رقم الهاتف (اختياري).
            كما نجمع بيانات المزرعة التي تدخلها (الماعز، السجلات الصحية، المبيعات، إلخ).
          </Typography>

          <Typography variant="h6" fontWeight="bold" mt={3} mb={1}>2. كيف نستخدم البيانات</Typography>
          <Typography variant="body1" paragraph>
            نستخدم بياناتك فقط لتوفير خدمة إدارة المزرعة. لا نبيع أو نشارك بياناتك مع أطراف ثالثة.
            قد نستخدم بيانات مجمّعة (بدون تحديد هوية) لتحسين الخدمة.
          </Typography>

          <Typography variant="h6" fontWeight="bold" mt={3} mb={1}>3. حماية البيانات</Typography>
          <Typography variant="body1" paragraph>
            نستخدم تشفير كلمات المرور (bcrypt)، رموز JWT للمصادقة، وعزل بيانات كل مستأجر بالكامل.
            البيانات مخزنة على خوادم آمنة مع نسخ احتياطي منتظم.
          </Typography>

          <Typography variant="h6" fontWeight="bold" mt={3} mb={1}>4. حقوق المستخدم</Typography>
          <Typography variant="body1" paragraph>
            يحق لك: تصدير جميع بياناتك عبر النسخ الاحتياطي، طلب حذف حسابك وبياناتك بالكامل،
            تعديل بياناتك الشخصية في أي وقت.
          </Typography>

          <Typography variant="h6" fontWeight="bold" mt={3} mb={1}>5. ملفات تعريف الارتباط</Typography>
          <Typography variant="body1" paragraph>
            نستخدم ملف تعريف ارتباط واحد فقط (token) لتسجيل الدخول. لا نستخدم ملفات تتبع
            أو إعلانات من أطراف ثالثة.
          </Typography>

          <Typography variant="h6" fontWeight="bold" mt={3} mb={1}>6. التواصل</Typography>
          <Typography variant="body1" paragraph>
            لأي استفسارات حول سياسة الخصوصية، يرجى التواصل معنا.
          </Typography>
        </Paper>
      </Container>
    </Box>
  )
}
