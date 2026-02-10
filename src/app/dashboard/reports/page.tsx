'use client'

import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Button
} from '@mui/material'
import {
  Assessment as ReportsIcon,
  Pets as PetsIcon,
  LocalHospital as HealthIcon,
  ShoppingCart as SalesIcon,
  Receipt as ExpensesIcon
} from '@mui/icons-material'

export default function ReportsPage() {
  const reports = [
    { title: 'تقرير القطيع', icon: <PetsIcon />, desc: 'تفاصيل كاملة عن الماعز والخرفان' },
    { title: 'التقرير الصحي', icon: <HealthIcon />, desc: 'سجلات التطعيم والعلاج' },
    { title: 'تقرير المبيعات', icon: <SalesIcon />, desc: 'تحليل المبيعات والأرباح' },
    { title: 'تقرير المصروفات', icon: <ExpensesIcon />, desc: 'تفصيل المصروفات حسب الفئة' }
  ]

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          التقارير والإحصائيات
        </Typography>
        <Typography variant="body2" color="text.secondary">
          اختر التقرير الذي تريد تصديره أو عرضه
        </Typography>
      </Paper>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3 }}>
        {reports.map((r, i) => (
          <Card key={i} sx={{ height: '100%', borderRadius: 3 }}>
            <CardContent>
                <Box sx={{ mb: 2, color: 'primary.main' }}>{r.icon}</Box>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  {r.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {r.desc}
                </Typography>
                <Button variant="outlined" fullWidth>
                  عرض التقرير
                </Button>
              </CardContent>
            </Card>
        ))}
      </Box>
    </Box>
  )
}
