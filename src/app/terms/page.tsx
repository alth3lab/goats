'use client'

import { Box, Container, Typography, Paper, Button, Stack, AppBar, Toolbar } from '@mui/material'
import PetsIcon from '@mui/icons-material/Pets'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Link from 'next/link'

export default function TermsPage() {
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
          <Typography variant="h4" fontWeight="bold" gutterBottom>الشروط والأحكام</Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>آخر تحديث: {new Date().toLocaleDateString('ar-AE')}</Typography>

          <Typography variant="h6" fontWeight="bold" mt={3} mb={1}>1. قبول الشروط</Typography>
          <Typography variant="body1" paragraph>
            باستخدامك لنظام "رعاة" لإدارة المواشي، فإنك توافق على الالتزام بهذه الشروط والأحكام.
            إذا كنت لا توافق على أي جزء من هذه الشروط، يرجى عدم استخدام النظام.
          </Typography>

          <Typography variant="h6" fontWeight="bold" mt={3} mb={1}>2. وصف الخدمة</Typography>
          <Typography variant="body1" paragraph>
            نظام رعاة هو منصة سحابية (SaaS) لإدارة مزارع المواشي (ماعز، أغنام، إبل) تشمل إدارة القطيع، السجلات الصحية،
            التكاثر، المبيعات، المخزون، والتقارير.
          </Typography>

          <Typography variant="h6" fontWeight="bold" mt={3} mb={1}>3. الحسابات والاشتراكات</Typography>
          <Typography variant="body1" paragraph>
            كل مستخدم مسؤول عن الحفاظ على سرية بيانات حسابه. الخطط المتاحة (مجاني، أساسي، احترافي، مؤسسي)
            تحدد حدود الاستخدام من حيث عدد المزارع والحيوانات والمستخدمين.
          </Typography>

          <Typography variant="h6" fontWeight="bold" mt={3} mb={1}>4. ملكية البيانات</Typography>
          <Typography variant="body1" paragraph>
            جميع البيانات المدخلة في النظام تظل ملكاً للمستخدم. يحق للمستخدم تصدير بياناته في أي وقت
            عبر خاصية النسخ الاحتياطي. لن يتم بيع أو مشاركة بياناتك مع أطراف ثالثة.
          </Typography>

          <Typography variant="h6" fontWeight="bold" mt={3} mb={1}>5. عزل البيانات</Typography>
          <Typography variant="body1" paragraph>
            بيانات كل مزرعة معزولة بالكامل عن المزارع الأخرى. لا يمكن لأي مستخدم الوصول إلى بيانات
            مزرعة لم يتم تخويله فيها.
          </Typography>

          <Typography variant="h6" fontWeight="bold" mt={3} mb={1}>6. تعديل الشروط</Typography>
          <Typography variant="body1" paragraph>
            نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إخطار المستخدمين بأي تغييرات جوهرية.
          </Typography>

          <Typography variant="h6" fontWeight="bold" mt={3} mb={1}>7. التواصل</Typography>
          <Typography variant="body1" paragraph>
            لأي استفسارات حول هذه الشروط، يرجى التواصل معنا عبر البريد الإلكتروني.
          </Typography>
        </Paper>
      </Container>
    </Box>
  )
}
