'use client'

import { useEffect, useState, useCallback, use } from 'react'
import {
  Box, Paper, Typography, Stack, LinearProgress, IconButton,
  Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Card, CardContent,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import BusinessIcon from '@mui/icons-material/Business'
import PetsIcon from '@mui/icons-material/Pets'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import PointOfSaleIcon from '@mui/icons-material/PointOfSale'
import HistoryIcon from '@mui/icons-material/History'
import { useAuth } from '@/lib/useAuth'
import { useRouter } from 'next/navigation'

const sections = ['summary', 'goats', 'health', 'sales', 'activities'] as const
type Section = typeof sections[number]

const tabLabels: Record<Section, { label: string; icon: React.ReactElement }> = {
  summary: { label: 'الملخص', icon: <BusinessIcon /> },
  goats: { label: 'الماعز', icon: <PetsIcon /> },
  health: { label: 'الصحة', icon: <LocalHospitalIcon /> },
  sales: { label: 'المبيعات', icon: <PointOfSaleIcon /> },
  activities: { label: 'الأنشطة', icon: <HistoryIcon /> },
}

export default function TenantDataPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = use(params)
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Section>('summary')
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [tenantInfo, setTenantInfo] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/data?section=${tab}`)
      if (res.ok) {
        const json = await res.json()
        setData(json.data)
        setTenantInfo(json.tenant)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [tenantId, tab])

  useEffect(() => {
    if (!authLoading && user?.role !== 'SUPER_ADMIN') {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  useEffect(() => { fetchData() }, [fetchData])

  if (authLoading) return <LinearProgress />
  if (user?.role !== 'SUPER_ADMIN') return null

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <IconButton onClick={() => router.push('/dashboard/admin')}>
            <ArrowBackIcon />
          </IconButton>
          <BusinessIcon color="primary" sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">
              عرض بيانات: {(tenantInfo as Record<string, string>)?.name || '...'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {(tenantInfo as Record<string, string>)?.companyName || '—'} | {(tenantInfo as Record<string, string>)?.email || '—'}
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Paper sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          {sections.map(s => (
            <Tab key={s} value={s} label={tabLabels[s].label} icon={tabLabels[s].icon} iconPosition="start" />
          ))}
        </Tabs>
      </Paper>

      {loading ? <LinearProgress /> : (
        <Box>
          {tab === 'summary' && <SummaryView data={data} />}
          {tab === 'goats' && <GoatsView data={data} />}
          {tab === 'health' && <HealthView data={data} />}
          {tab === 'sales' && <SalesView data={data} />}
          {tab === 'activities' && <ActivitiesView data={data} />}
        </Box>
      )}
    </Box>
  )
}

function SummaryView({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return null
  const stats = [
    { label: 'الماعز', value: data.goatsCount, color: '#2196f3' },
    { label: 'السجلات الصحية', value: data.healthCount, color: '#4caf50' },
    { label: 'المبيعات', value: data.salesCount, color: '#ff9800' },
    { label: 'المزارع', value: data.farmsCount, color: '#9c27b0' },
    { label: 'المستخدمين', value: data.usersCount, color: '#f44336' },
    { label: 'التكاثر', value: data.breedingsCount, color: '#00bcd4' },
    { label: 'المصاريف', value: data.expensesCount, color: '#795548' },
  ]
  return (
    <Stack direction="row" flexWrap="wrap" gap={2}>
      {stats.map(s => (
        <Card key={s.label} sx={{ minWidth: 160, borderRadius: 3, borderTop: `4px solid ${s.color}` }}>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" fontWeight="bold" sx={{ color: s.color }}>{String(s.value)}</Typography>
            <Typography variant="body2" color="text.secondary">{s.label}</Typography>
          </CardContent>
        </Card>
      ))}
    </Stack>
  )
}

function GoatsView({ data }: { data: Record<string, unknown> | null }) {
  const goats = (data as { goats?: Record<string, unknown>[] })?.goats || []
  return (
    <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>رقم الأذن</TableCell>
              <TableCell>الاسم</TableCell>
              <TableCell>السلالة</TableCell>
              <TableCell>الحظيرة</TableCell>
              <TableCell>المزرعة</TableCell>
              <TableCell>الحالة</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {goats.map((g: Record<string, unknown>) => (
              <TableRow key={String(g.id)} hover>
                <TableCell>{String(g.tagId || '—')}</TableCell>
                <TableCell><Typography variant="body2" fontWeight="bold">{String(g.name || '—')}</Typography></TableCell>
                <TableCell>{(g.breed as Record<string, string>)?.nameAr || (g.breed as Record<string, string>)?.name || '—'}</TableCell>
                <TableCell>{(g.pen as Record<string, string>)?.name || '—'}</TableCell>
                <TableCell>{(g.farm as Record<string, string>)?.nameAr || (g.farm as Record<string, string>)?.name || '—'}</TableCell>
                <TableCell>
                  <Chip
                    label={String(g.status) === 'ACTIVE' ? 'نشط' : String(g.status)}
                    color={String(g.status) === 'ACTIVE' ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
            {goats.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary" sx={{ py: 3 }}>لا توجد ماعز</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}

function HealthView({ data }: { data: Record<string, unknown> | null }) {
  const records = (data as { records?: Record<string, unknown>[] })?.records || []
  return (
    <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>التاريخ</TableCell>
              <TableCell>الماعز</TableCell>
              <TableCell>النوع</TableCell>
              <TableCell>الوصف</TableCell>
              <TableCell>العلاج</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((r: Record<string, unknown>) => (
              <TableRow key={String(r.id)} hover>
                <TableCell>{new Date(String(r.date)).toLocaleDateString('ar-AE')}</TableCell>
                <TableCell>
                  {(r.goat as Record<string, string>)?.name || '—'} ({(r.goat as Record<string, string>)?.tagId || '—'})
                </TableCell>
                <TableCell>
                  <Chip label={String(r.type)} size="small" color="info" />
                </TableCell>
                <TableCell sx={{ maxWidth: 200 }}>
                  <Typography variant="body2" noWrap>{String(r.description || '—')}</Typography>
                </TableCell>
                <TableCell>{String(r.treatment || '—')}</TableCell>
              </TableRow>
            ))}
            {records.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary" sx={{ py: 3 }}>لا توجد سجلات صحية</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}

function SalesView({ data }: { data: Record<string, unknown> | null }) {
  const sales = (data as { sales?: Record<string, unknown>[] })?.sales || []
  return (
    <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>التاريخ</TableCell>
              <TableCell>الماعز</TableCell>
              <TableCell>المشتري</TableCell>
              <TableCell>المبلغ</TableCell>
              <TableCell>حالة الدفع</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sales.map((s: Record<string, unknown>) => (
              <TableRow key={String(s.id)} hover>
                <TableCell>{new Date(String(s.date)).toLocaleDateString('ar-AE')}</TableCell>
                <TableCell>
                  {(s.goat as Record<string, string>)?.name || '—'} ({(s.goat as Record<string, string>)?.tagId || '—'})
                </TableCell>
                <TableCell>{String(s.buyerName || '—')}</TableCell>
                <TableCell><Typography variant="body2" fontWeight="bold">{String(s.salePrice)} د.إ</Typography></TableCell>
                <TableCell>
                  <Chip
                    label={String(s.paymentStatus) === 'PAID' ? 'مدفوع' : String(s.paymentStatus) === 'PENDING' ? 'معلق' : String(s.paymentStatus)}
                    color={String(s.paymentStatus) === 'PAID' ? 'success' : 'warning'}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
            {sales.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary" sx={{ py: 3 }}>لا توجد مبيعات</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}

function ActivitiesView({ data }: { data: Record<string, unknown> | null }) {
  const activities = (data as { activities?: Record<string, unknown>[] })?.activities || []
  return (
    <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>التاريخ</TableCell>
              <TableCell>المستخدم</TableCell>
              <TableCell>الإجراء</TableCell>
              <TableCell>الكيان</TableCell>
              <TableCell>الوصف</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activities.map((a: Record<string, unknown>) => (
              <TableRow key={String(a.id)} hover>
                <TableCell>{new Date(String(a.createdAt)).toLocaleDateString('ar-AE')}</TableCell>
                <TableCell>{(a.user as Record<string, string>)?.fullName || '—'}</TableCell>
                <TableCell>
                  <Chip label={String(a.action)} size="small" />
                </TableCell>
                <TableCell>{String(a.entity)}</TableCell>
                <TableCell sx={{ maxWidth: 300 }}>
                  <Typography variant="body2" noWrap>{String(a.description || '—')}</Typography>
                </TableCell>
              </TableRow>
            ))}
            {activities.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="text.secondary" sx={{ py: 3 }}>لا توجد أنشطة</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  )
}
