'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import { getAnimalLabels } from '@/lib/animalLabels'
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  IconButton,
  useMediaQuery,
  Card,
  CardContent,
  CardActions,
  Grid,
  Divider,
  Tabs,
  Tab,
  Alert,
  Tooltip
} from '@mui/material'
import { useTheme, alpha } from '@mui/material/styles'
import {
  Add as AddIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  LocalHospital as HealthIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  History as HistoryIcon,
  Vaccines as VaccineIcon,
  Schedule as ScheduleIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlaylistAddCheck as ProtocolIcon
} from '@mui/icons-material'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { generateArabicPDF } from '@/lib/pdfHelper'
import * as XLSX from 'xlsx'
import { EntityHistory } from '@/components/EntityHistory'

interface HealthRecord {
  id: string
  type: string
  date: string
  description: string
  veterinarian?: string
  cost?: number
  nextDueDate?: string
  goat: { tagId: string }
}

interface VaccinationProtocol {
  id: string
  name: string
  nameAr: string
  type: string
  ageMonths: number
  repeatMonths: number | null
  description: string | null
  medication: string | null
  dosage: string | null
  gender: string | null
  isActive: boolean
  notes: string | null
}

interface DueVaccination {
  goatId: string
  tagId: string
  goatName: string | null
  protocolId: string
  protocolName: string
  protocolNameAr: string
  protocolType: string
  medication: string | null
  dosage: string | null
  ageMonths: number
  goatAgeMonths: number
  status: 'overdue' | 'due_soon' | 'due'
  dueDate: string
  lastVaccination: string | null
}

const typeLabels: Record<string, string> = {
  VACCINATION: 'تطعيم',
  DEWORMING: 'مضاد ديدان',
  TREATMENT: 'علاج',
  CHECKUP: 'فحص',
  SURGERY: 'جراحة'
}

export default function HealthPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { farm } = useAuth()
  const animalLbl = getAnimalLabels(farm?.farmType)
  const [records, setRecords] = useState<HealthRecord[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<HealthRecord | null>(null)
  const [goats, setGoats] = useState<Array<{ id: string; tagId: string }>>([])
  
  // Batch State
  const [batchOpen, setBatchOpen] = useState(false)
  const [pens, setPens] = useState<Array<{ id: string; nameAr: string }>>([])
  const [isAllGoats, setIsAllGoats] = useState(false)

  // Tab State
  const [activeTab, setActiveTab] = useState(0)

  // Protocols State
  const [protocols, setProtocols] = useState<VaccinationProtocol[]>([])
  const [protocolOpen, setProtocolOpen] = useState(false)
  const [editingProtocol, setEditingProtocol] = useState<VaccinationProtocol | null>(null)
  const [protocolForm, setProtocolForm] = useState({
    name: '',
    nameAr: '',
    type: 'VACCINATION',
    ageMonths: '',
    repeatMonths: '',
    description: '',
    medication: '',
    dosage: '',
    gender: '',
    isActive: true,
    notes: ''
  })

  // Due Vaccinations State
  const [dueVaccinations, setDueVaccinations] = useState<DueVaccination[]>([])
  const [dueLoading, setDueLoading] = useState(false)

  // Form State
  const [form, setForm] = useState({
    goatId: '',
    type: 'VACCINATION',
    date: new Date().toISOString().split('T')[0],
    description: '',
    veterinarian: '',
    cost: '',
    nextDueDate: '',
    moveToIsolation: false,
    penId: '' // For batch
  })

  // Analytics
  const upcomingAlerts = records.filter(r => {
      if (!r.nextDueDate) return false
      const due = new Date(r.nextDueDate)
      const today = new Date()
      const diffTime = due.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) 
      return diffDays >= 0 && diffDays <= 7 // Due this week
  })

  const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0)
  const topTreatment = records.length > 0 ? 
    Object.entries(
        records.reduce((acc, r) => { acc[r.type] = (acc[r.type] || 0) + 1; return acc }, {} as any)
    ).sort((a:any, b:any) => b[1] - a[1])[0] 
    : null

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setRecords(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  const loadGoats = async () => {
    const res = await fetch('/api/goats')
    const data = await res.json()
    setGoats(Array.isArray(data) ? data : [])
  }
  
  const loadPens = async () => {
      const res = await fetch('/api/pens')
      const data = await res.json()
      setPens(Array.isArray(data) ? data : [])
  }

  const handleOpen = () => {
    setOpen(true)
    if (goats.length === 0) loadGoats()
  }

  const exportToPDF = async () => {
    const pData = filtered.map(r => ({
      tagId: r.goat.tagId,
      type: typeLabels[r.type] || r.type,
      date: formatDate(r.date),
      nextDueDate: r.nextDueDate ? formatDate(r.nextDueDate) : '-',
      description: r.description,
      veterinarian: r.veterinarian || '-',
      cost: r.cost ? formatCurrency(r.cost) : '-'
    }))
    await generateArabicPDF({
      title: 'التقرير الصحي',
      date: new Date().toLocaleDateString('en-GB'),
      stats: [
        { label: 'إجمالي السجلات', value: records.length },
        { label: 'إجمالي التكاليف', value: formatCurrency(totalCost) },
        { label: 'أكثر علاج شيوعاً', value: topTreatment ? `${typeLabels[topTreatment[0]] || topTreatment[0]} (${topTreatment[1]})` : '-' },
        { label: 'تنبيهات قادمة', value: upcomingAlerts.length }
      ],
      columns: [
        { header: 'التكلفة', dataKey: 'cost' },
        { header: 'الطبيب', dataKey: 'veterinarian' },
        { header: 'الوصف', dataKey: 'description' },
        { header: 'المستحق القادم', dataKey: 'nextDueDate' },
        { header: 'التاريخ', dataKey: 'date' },
        { header: 'النوع', dataKey: 'type' },
        { header: 'رقم التاج', dataKey: 'tagId' }
      ],
      data: pData,
      totals: { tagId: 'الإجمالي', cost: formatCurrency(totalCost) },
      filename: `health-report-${new Date().toISOString().split('T')[0]}.pdf`
    })
  }

  const exportToExcel = () => {
    const statsSheet = XLSX.utils.json_to_sheet([
      { 'المؤشر': 'إجمالي السجلات', 'القيمة': records.length },
      { 'المؤشر': 'إجمالي التكاليف', 'القيمة': totalCost },
      { 'المؤشر': 'أكثر علاج شيوعاً', 'القيمة': topTreatment ? `${typeLabels[topTreatment[0]] || topTreatment[0]} (${topTreatment[1]})` : '-' },
      { 'المؤشر': 'تنبيهات قادمة', 'القيمة': upcomingAlerts.length }
    ])
    const healthData = filtered.map(r => ({
      'رقم التاج': r.goat.tagId,
      'النوع': typeLabels[r.type] || r.type,
      'التاريخ': formatDate(r.date),
      'المستحق القادم': r.nextDueDate ? formatDate(r.nextDueDate) : '-',
      'الوصف': r.description,
      'الطبيب': r.veterinarian || '-',
      'التكلفة': r.cost || 0
    }))
    const healthSheet = XLSX.utils.json_to_sheet(healthData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, statsSheet, 'الإحصائيات')
    XLSX.utils.book_append_sheet(wb, healthSheet, 'السجلات الصحية')
    XLSX.writeFile(wb, `health-report-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleBatchOpen = () => {
      setBatchOpen(true)
      if (pens.length === 0) loadPens()
  }

  const loadProtocols = async () => {
    const res = await fetch('/api/health/protocols')
    const data = await res.json()
    setProtocols(Array.isArray(data) ? data : [])
  }

  const loadDueVaccinations = async () => {
    setDueLoading(true)
    const res = await fetch('/api/health/protocols/due')
    const data = await res.json()
    setDueVaccinations(Array.isArray(data) ? data : [])
    setDueLoading(false)
  }

  useEffect(() => {
    if (activeTab === 1 && protocols.length === 0) loadProtocols()
    if (activeTab === 2) loadDueVaccinations()
  }, [activeTab])

  const handleProtocolOpen = (protocol?: VaccinationProtocol) => {
    if (protocol) {
      setEditingProtocol(protocol)
      setProtocolForm({
        name: protocol.name,
        nameAr: protocol.nameAr,
        type: protocol.type,
        ageMonths: String(protocol.ageMonths),
        repeatMonths: protocol.repeatMonths ? String(protocol.repeatMonths) : '',
        description: protocol.description || '',
        medication: protocol.medication || '',
        dosage: protocol.dosage || '',
        gender: protocol.gender || '',
        isActive: protocol.isActive,
        notes: protocol.notes || ''
      })
    } else {
      setEditingProtocol(null)
      setProtocolForm({
        name: '', nameAr: '', type: 'VACCINATION', ageMonths: '', repeatMonths: '',
        description: '', medication: '', dosage: '', gender: '', isActive: true, notes: ''
      })
    }
    setProtocolOpen(true)
  }

  const handleProtocolSubmit = async () => {
    const payload = {
      name: protocolForm.name,
      nameAr: protocolForm.nameAr,
      type: protocolForm.type,
      ageMonths: Number(protocolForm.ageMonths),
      repeatMonths: protocolForm.repeatMonths ? Number(protocolForm.repeatMonths) : null,
      description: protocolForm.description || null,
      medication: protocolForm.medication || null,
      dosage: protocolForm.dosage || null,
      gender: protocolForm.gender || null,
      isActive: protocolForm.isActive,
      notes: protocolForm.notes || null
    }

    const resp = editingProtocol
      ? await fetch(`/api/health/protocols`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingProtocol.id, ...payload })
        })
      : await fetch('/api/health/protocols', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}))
      alert(err.error || 'فشل في حفظ البروتوكول')
      return
    }

    setProtocolOpen(false)
    loadProtocols()
  }

  const handleProtocolDelete = async (id: string) => {
    if (!confirm('هل تريد حذف هذا البروتوكول؟')) return
    const resp = await fetch('/api/health/protocols', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    if (!resp.ok) {
      alert('فشل في حذف البروتوكول')
      return
    }
    loadProtocols()
  }

  const handleQuickVaccinate = async (due: DueVaccination) => {
    const payload = {
      goatId: due.goatId,
      type: due.protocolType || 'VACCINATION',
      date: new Date(),
      description: `${due.protocolNameAr} (${due.protocolName})`,
      veterinarian: null,
      cost: null,
      nextDueDate: null,
      moveToIsolation: false
    }
    const resp = await fetch('/api/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!resp.ok) {
      alert('فشل في تسجيل التطعيم')
      return
    }
    loadDueVaccinations()
    // Refresh records too
    const res = await fetch('/api/health')
    setRecords(await res.json())
  }

  const handleView = (record: HealthRecord) => {
    setSelectedRecord(record)
    setViewOpen(true)
  }

  const handleSubmit = async () => {
    const payload = {
      goatId: form.goatId,
      type: form.type,
      date: new Date(form.date),
      description: form.description,
      veterinarian: form.veterinarian || null,
      cost: form.cost ? Number(form.cost) : null,
      nextDueDate: form.nextDueDate ? new Date(form.nextDueDate) : null,
      moveToIsolation: form.moveToIsolation
    }

    await fetch('/api/health', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    setOpen(false)
    // Refresh
    const res = await fetch('/api/health')
    setRecords(await res.json())
  }

  const handleBatchSubmit = async () => {
      const payload = {
          penId: isAllGoats ? null : form.penId,
          type: form.type,
          date: new Date(form.date),
          description: form.description,
          veterinarian: form.veterinarian || null,
          cost: form.cost ? Number(form.cost) : null,
          nextDueDate: form.nextDueDate ? new Date(form.nextDueDate) : null,
          moveToIsolation: form.moveToIsolation
      }

      const res = await fetch('/api/health/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      })

      if (res.ok) {
          setBatchOpen(false)
          alert('تم تسجيل العلاج الجماعي بنجاح')
          // Refresh
          const updated = await fetch('/api/health')
          setRecords(await updated.json())
      } else {
          alert('فشل في المعالجة')
      }
  }



  const filtered = records.filter(r =>
    r.goat.tagId.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Box sx={{ width: '100%', overflowX: 'hidden' }}>
      {/* Alerts */}
      {upcomingAlerts.length > 0 && (
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'warning.light', border: '1px solid', borderColor: 'warning.main' }}>
              <Stack direction="row" spacing={2} alignItems="center">
                  <WarningIcon color="warning" />
                  <Box>
                      <Typography variant="subtitle1" fontWeight="bold">تنبيهات صحية</Typography>
                      <Typography variant="body2">
                          يوجد {upcomingAlerts.length} حيوانات تستحق العلاج/التطعيم خلال هذا الأسبوع.
                      </Typography>
                  </Box>
              </Stack>
          </Paper>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="fullWidth"
          textColor="primary"
          indicatorColor="primary"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<HealthIcon />} label="السجلات الصحية" iconPosition="start" />
          <Tab icon={<VaccineIcon />} label="بروتوكولات التطعيم" iconPosition="start" />
          <Tab icon={<ScheduleIcon />} label="التطعيمات المستحقة" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab 0: Health Records (existing content) */}
      {activeTab === 0 && (<>

      {/* Analytics Cards */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3}>
         <Paper
           sx={{
             p: 2,
             flex: 1,
             borderRadius: 3,
             border: '1px solid',
             borderColor: alpha(theme.palette.primary.main, 0.22),
             bgcolor: alpha(theme.palette.primary.main, 0.08)
           }}
         >
            <Typography variant="subtitle2" color="text.secondary">إجمالي التكاليف الطبية</Typography>
            <Typography variant="h4" fontWeight="bold" color="primary.dark">{formatCurrency(totalCost)}</Typography>
         </Paper>
         <Paper
           sx={{
             p: 2,
             flex: 1,
             borderRadius: 3,
             border: '1px solid',
             borderColor: alpha(theme.palette.secondary.main, 0.24),
             bgcolor: alpha(theme.palette.secondary.main, 0.08)
           }}
         >
            <Typography variant="subtitle2" color="text.secondary">أكثر العلاجات شيوعاً</Typography>
            <Typography variant="h5" fontWeight="bold" color="secondary.dark">
                {topTreatment ? typeLabels[topTreatment[0]] || topTreatment[0] : '-'}
            </Typography>
            <Typography variant="caption">{topTreatment ? `${topTreatment[1]} حالة` : ''}</Typography>
         </Paper>
      </Stack>

      <Paper sx={{ p: { xs: 1.5, sm: 3 }, mb: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} mb={2} spacing={1.5}>
          <Stack direction="row" spacing={2} alignItems="center">
            <HealthIcon color="error" />
            <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">السجلات الصحية</Typography>
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
            <Button variant="outlined" startIcon={<HealthIcon />} onClick={exportToPDF} fullWidth={isMobile} sx={{ color: 'error.main', borderColor: 'error.main' }}>
              تصدير PDF
            </Button>
            <Button variant="outlined" startIcon={<HealthIcon />} onClick={exportToExcel} fullWidth={isMobile} sx={{ color: 'success.main', borderColor: 'success.main' }}>
              تصدير Excel
            </Button>
            <Button variant="outlined" color="secondary" startIcon={<HealthIcon />} onClick={handleBatchOpen} fullWidth={isMobile}>
              علاج جماعي
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen} fullWidth={isMobile}>
              إضافة سجل
            </Button>
          </Stack>
        </Stack>
        <TextField
          fullWidth
          placeholder="بحث برقم التاج أو الوصف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
        />
      </Paper>

      {/* Mobile Cards View */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <Stack spacing={2}>
          {loading ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>جاري التحميل...</Paper>
          ) : filtered.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>لا توجد بيانات</Paper>
          ) : (
            filtered.map(r => (
              <Card key={r.id} sx={{ borderRadius: 3 }}>
                <CardContent>
                  <Stack spacing={2}>
                    {/* Tag & Type */}
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6" fontWeight="bold">{r.goat.tagId}</Typography>
                      <Chip label={typeLabels[r.type] || r.type} color="error" size="small" />
                    </Stack>

                    <Divider />

                    {/* Details Grid */}
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="body2" color="text.secondary">التاريخ</Typography>
                        <Typography variant="body1">{formatDate(r.date)}</Typography>
                      </Grid>
                      {r.nextDueDate && (
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="body2" color="text.secondary">المستحق القادم</Typography>
                          <Chip 
                            label={formatDate(r.nextDueDate)} 
                            size="small" 
                            color={new Date(r.nextDueDate) <= new Date() ? 'warning' : 'default'} 
                            variant="outlined"
                            sx={{ mt: 0.5 }}
                          />
                        </Grid>
                      )}
                      {r.description && (
                        <Grid size={{ xs: 12 }}>
                          <Typography variant="body2" color="text.secondary">الوصف</Typography>
                          <Typography variant="body1">{r.description}</Typography>
                        </Grid>
                      )}
                      {r.veterinarian && (
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="body2" color="text.secondary">الطبيب</Typography>
                          <Typography variant="body1">{r.veterinarian}</Typography>
                        </Grid>
                      )}
                      {r.cost && (
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="body2" color="text.secondary">التكلفة</Typography>
                          <Typography variant="body1" fontWeight="bold" color="primary.main">
                            {r.cost.toFixed(2)} ريال
                          </Typography>
                        </Grid>
                      )}
                    </Grid>
                  </Stack>
                </CardContent>
                <CardActions sx={{ justifyContent: 'flex-end', px: 2 }}>
                  <Button size="small" onClick={() => { setSelectedRecord(r); setViewOpen(true); }}>
                    التفاصيل
                  </Button>
                </CardActions>
              </Card>
            ))
          )}
        </Stack>
      </Box>

      {/* Desktop Table View */}
      <TableContainer component={Paper} sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 3, overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell><strong>رقم التاج</strong></TableCell>
              <TableCell><strong>النوع</strong></TableCell>
              <TableCell><strong>التاريخ</strong></TableCell>
              <TableCell><strong>المستحق القادم</strong></TableCell>
              <TableCell><strong>الوصف</strong></TableCell>
              <TableCell><strong>الطبيب</strong></TableCell>
              <TableCell><strong>التكلفة</strong></TableCell>
              <TableCell><strong>التفاصيل</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} align="center">جاري التحميل...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center">لا توجد بيانات</TableCell></TableRow>
            ) : (
              filtered.map(r => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.goat.tagId}</TableCell>
                  <TableCell>
                    <Chip label={typeLabels[r.type] || r.type} color="error" size="small" />
                  </TableCell>
                  <TableCell>{formatDate(r.date)}</TableCell>
                    <TableCell>
                        {r.nextDueDate ? (
                            <Chip 
                              label={formatDate(r.nextDueDate)} 
                              size="small" 
                              color={new Date(r.nextDueDate) <= new Date() ? 'warning' : 'default'} 
                              variant="outlined" 
                            />
                        ) : '-'}
                    </TableCell>
                  <TableCell>{r.description}</TableCell>
                  <TableCell>{r.veterinarian || '-'}</TableCell>
                  <TableCell>{r.cost ? formatCurrency(r.cost) : '-'}</TableCell>
                  <TableCell>
                    <IconButton color="primary" onClick={() => handleView(r)}>
                      <ViewIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      </>)} {/* End Tab 0 */}

      {/* Tab 1: Vaccination Protocols */}
      {activeTab === 1 && (
        <Box>
          <Paper sx={{ p: { xs: 1.5, sm: 3 }, mb: 3, borderRadius: 3 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} mb={2} spacing={1.5}>
              <Stack direction="row" spacing={2} alignItems="center">
                <VaccineIcon color="primary" />
                <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">بروتوكولات التطعيم</Typography>
              </Stack>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleProtocolOpen()} fullWidth={isMobile}>
                إضافة بروتوكول
              </Button>
            </Stack>
          </Paper>

          {/* Protocol Cards (Mobile) */}
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            <Stack spacing={2}>
              {protocols.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <VaccineIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">لا توجد بروتوكولات بعد</Typography>
                </Paper>
              ) : (
                protocols.map(p => (
                  <Card key={p.id} sx={{ borderRadius: 3, opacity: p.isActive ? 1 : 0.6 }}>
                    <CardContent>
                      <Stack spacing={1.5}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="h6" fontWeight="bold">{p.nameAr}</Typography>
                          <Chip
                            label={p.isActive ? 'فعّال' : 'معطّل'}
                            color={p.isActive ? 'success' : 'default'}
                            size="small"
                          />
                        </Stack>
                        <Divider />
                        <Grid container spacing={1}>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="body2" color="text.secondary">النوع</Typography>
                            <Chip label={typeLabels[p.type] || p.type} size="small" color="error" />
                          </Grid>
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="body2" color="text.secondary">العمر</Typography>
                            <Typography>{p.ageMonths} شهر</Typography>
                          </Grid>
                          {p.repeatMonths && (
                            <Grid size={{ xs: 6 }}>
                              <Typography variant="body2" color="text.secondary">يتكرر كل</Typography>
                              <Typography>{p.repeatMonths} شهر</Typography>
                            </Grid>
                          )}
                          {p.medication && (
                            <Grid size={{ xs: 6 }}>
                              <Typography variant="body2" color="text.secondary">الدواء</Typography>
                              <Typography>{p.medication}</Typography>
                            </Grid>
                          )}
                          {p.dosage && (
                            <Grid size={{ xs: 6 }}>
                              <Typography variant="body2" color="text.secondary">الجرعة</Typography>
                              <Typography>{p.dosage}</Typography>
                            </Grid>
                          )}
                          {p.gender && (
                            <Grid size={{ xs: 6 }}>
                              <Typography variant="body2" color="text.secondary">الجنس</Typography>
                              <Typography>{p.gender === 'MALE' ? 'ذكر' : 'أنثى'}</Typography>
                            </Grid>
                          )}
                        </Grid>
                        {p.description && (
                          <Typography variant="body2" color="text.secondary">{p.description}</Typography>
                        )}
                      </Stack>
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'flex-end', px: 2 }}>
                      <IconButton color="primary" onClick={() => handleProtocolOpen(p)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleProtocolDelete(p.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </CardActions>
                  </Card>
                ))
              )}
            </Stack>
          </Box>

          {/* Protocol Table (Desktop) */}
          <TableContainer component={Paper} sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 3 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'action.hover' }}>
                  <TableCell><strong>البروتوكول</strong></TableCell>
                  <TableCell><strong>النوع</strong></TableCell>
                  <TableCell><strong>العمر (شهر)</strong></TableCell>
                  <TableCell><strong>التكرار</strong></TableCell>
                  <TableCell><strong>الدواء</strong></TableCell>
                  <TableCell><strong>الجرعة</strong></TableCell>
                  <TableCell><strong>الجنس</strong></TableCell>
                  <TableCell><strong>الحالة</strong></TableCell>
                  <TableCell><strong>إجراءات</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {protocols.length === 0 ? (
                  <TableRow><TableCell colSpan={9} align="center">لا توجد بروتوكولات بعد</TableCell></TableRow>
                ) : (
                  protocols.map(p => (
                    <TableRow key={p.id} hover sx={{ opacity: p.isActive ? 1 : 0.6 }}>
                      <TableCell>
                        <Tooltip title={p.name}>
                          <Typography fontWeight="bold">{p.nameAr}</Typography>
                        </Tooltip>
                        {p.description && <Typography variant="caption" color="text.secondary">{p.description}</Typography>}
                      </TableCell>
                      <TableCell><Chip label={typeLabels[p.type] || p.type} color="error" size="small" /></TableCell>
                      <TableCell>{p.ageMonths}</TableCell>
                      <TableCell>{p.repeatMonths ? `كل ${p.repeatMonths} شهر` : 'مرة واحدة'}</TableCell>
                      <TableCell>{p.medication || '-'}</TableCell>
                      <TableCell>{p.dosage || '-'}</TableCell>
                      <TableCell>{p.gender ? (p.gender === 'MALE' ? 'ذكر' : 'أنثى') : 'الكل'}</TableCell>
                      <TableCell>
                        <Chip label={p.isActive ? 'فعّال' : 'معطّل'} color={p.isActive ? 'success' : 'default'} size="small" />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" color="primary" onClick={() => handleProtocolOpen(p)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleProtocolDelete(p.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tab 2: Due Vaccinations */}
      {activeTab === 2 && (
        <Box>
          <Paper sx={{ p: { xs: 1.5, sm: 3 }, mb: 3, borderRadius: 3 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} mb={2} spacing={1.5}>
              <Stack direction="row" spacing={2} alignItems="center">
                <ScheduleIcon color="warning" />
                <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">التطعيمات المستحقة</Typography>
              </Stack>
              <Button variant="outlined" onClick={loadDueVaccinations} fullWidth={isMobile}>
                تحديث
              </Button>
            </Stack>

            {dueVaccinations.filter(d => d.status === 'overdue').length > 0 && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                يوجد {dueVaccinations.filter(d => d.status === 'overdue').length} تطعيمات متأخرة تحتاج تنفيذ فوري!
              </Alert>
            )}
          </Paper>

          {dueLoading ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>جاري تحليل التطعيمات المستحقة...</Paper>
          ) : dueVaccinations.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
              <ScheduleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
              <Typography variant="h6" color="success.main">جميع التطعيمات محدّثة!</Typography>
              <Typography color="text.secondary">لا توجد تطعيمات مستحقة حالياً</Typography>
            </Paper>
          ) : (
            <>
              {/* Mobile Cards */}
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>
                <Stack spacing={2}>
                  {dueVaccinations.map((d, i) => (
                    <Card key={i} sx={{
                      borderRadius: 3,
                      borderRight: 4,
                      borderColor: d.status === 'overdue' ? 'error.main' : d.status === 'due_soon' ? 'warning.main' : 'info.main'
                    }}>
                      <CardContent>
                        <Stack spacing={1.5}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="h6" fontWeight="bold">{d.tagId}</Typography>
                            <Chip
                              label={d.status === 'overdue' ? 'متأخر' : d.status === 'due_soon' ? 'قريباً' : 'مستحق'}
                              color={d.status === 'overdue' ? 'error' : d.status === 'due_soon' ? 'warning' : 'info'}
                              size="small"
                            />
                          </Stack>
                          <Divider />
                          <Typography fontWeight="bold">{d.protocolNameAr}</Typography>
                          <Grid container spacing={1}>
                            <Grid size={{ xs: 6 }}>
                              <Typography variant="body2" color="text.secondary">عمر الحيوان</Typography>
                              <Typography>{d.goatAgeMonths} شهر</Typography>
                            </Grid>
                            <Grid size={{ xs: 6 }}>
                              <Typography variant="body2" color="text.secondary">تاريخ الاستحقاق</Typography>
                              <Typography>{formatDate(d.dueDate)}</Typography>
                            </Grid>
                          </Grid>
                        </Stack>
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'flex-end', px: 2 }}>
                        <Button
                          variant="contained"
                          size="small"
                          color={d.status === 'overdue' ? 'error' : 'primary'}
                          startIcon={<VaccineIcon />}
                          onClick={() => handleQuickVaccinate(d)}
                        >
                          تسجيل التطعيم
                        </Button>
                      </CardActions>
                    </Card>
                  ))}
                </Stack>
              </Box>

              {/* Desktop Table */}
              <TableContainer component={Paper} sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 3 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <TableCell><strong>رقم التاج</strong></TableCell>
                      <TableCell><strong>البروتوكول</strong></TableCell>
                      <TableCell><strong>عمر الحيوان</strong></TableCell>
                      <TableCell><strong>تاريخ الاستحقاق</strong></TableCell>
                      <TableCell><strong>الحالة</strong></TableCell>
                      <TableCell><strong>إجراء</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dueVaccinations.map((d, i) => (
                      <TableRow key={i} hover sx={{
                        bgcolor: d.status === 'overdue' ? 'error.50' : undefined
                      }}>
                        <TableCell><Typography fontWeight="bold">{d.tagId}</Typography></TableCell>
                        <TableCell>{d.protocolNameAr}</TableCell>
                        <TableCell>{d.goatAgeMonths} شهر</TableCell>
                        <TableCell>{formatDate(d.dueDate)}</TableCell>
                        <TableCell>
                          <Chip
                            label={d.status === 'overdue' ? 'متأخر' : d.status === 'due_soon' ? 'قريباً' : 'مستحق'}
                            color={d.status === 'overdue' ? 'error' : d.status === 'due_soon' ? 'warning' : 'info'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="contained"
                            size="small"
                            color={d.status === 'overdue' ? 'error' : 'primary'}
                            startIcon={<VaccineIcon />}
                            onClick={() => handleQuickVaccinate(d)}
                          >
                            تسجيل
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Box>
      )}

      {/* Single Record Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle>إضافة سجل صحي</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={1}>
            <FormControl>
              <InputLabel>{animalLbl.plural}</InputLabel>
              <Select
                value={form.goatId}
                label={animalLbl.plural}
                onChange={(e) => setForm({ ...form, goatId: e.target.value })}
              >
                {goats.map(g => (
                  <MenuItem key={g.id} value={g.id}>{g.tagId}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>نوع السجل</InputLabel>
              <Select
                value={form.type}
                label="نوع السجل"
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <MenuItem value="VACCINATION">تطعيم</MenuItem>
                <MenuItem value="DEWORMING">مضاد ديدان</MenuItem>
                <MenuItem value="TREATMENT">علاج</MenuItem>
                <MenuItem value="CHECKUP">فحص</MenuItem>
                <MenuItem value="SURGERY">جراحة</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="التاريخ"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <TextField
              label="تاريخ الاستحقاق القادم (اختياري)"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.nextDueDate}
              onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
              helperText="للتذكير بالجرعة القادمة"
            />
            
            <FormControlLabel
                control={
                    <Checkbox 
                        checked={form.moveToIsolation}
                        onChange={(e) => setForm({...form, moveToIsolation: e.target.checked})}
                    />
                }
                label={`نقل ${animalLbl.plural} إلى العزل الصحي تلقائياً`}
            />

            <TextField
              label="الوصف"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <TextField
              label="الطبيب"
              value={form.veterinarian}
              onChange={(e) => setForm({ ...form, veterinarian: e.target.value })}
            />
            <TextField
              label="التكلفة"
              type="number"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSubmit}>حفظ</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={viewOpen} onClose={() => setViewOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle>تفاصيل السجل الصحي</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedRecord ? (
            <Stack spacing={2}>
              <Typography><strong>رقم التاج:</strong> {selectedRecord.goat.tagId}</Typography>
              <Typography><strong>النوع:</strong> {typeLabels[selectedRecord.type] || selectedRecord.type}</Typography>
              <Typography><strong>التاريخ:</strong> {formatDate(selectedRecord.date)}</Typography>
              <Typography><strong>الوصف:</strong> {selectedRecord.description}</Typography>
              <Typography><strong>الطبيب:</strong> {selectedRecord.veterinarian || '-'}</Typography>
              <Typography><strong>التكلفة:</strong> {selectedRecord.cost ? formatCurrency(selectedRecord.cost) : '-'}</Typography>
              <Typography><strong>المراجعة القادمة:</strong> {selectedRecord.nextDueDate ? formatDate(selectedRecord.nextDueDate) : '-'}</Typography>
              <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                <HistoryIcon color="action" />
                <Typography variant="h6">سجل التغييرات</Typography>
              </Stack>
              <EntityHistory entity="Health" entityId={selectedRecord.id} />
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Batch Record Dialog */}
      <Dialog open={batchOpen} onClose={() => setBatchOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle>تسجيل علاج جماعي</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={1}>
             <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                 <Chip 
                    label="كل القطيع" 
                    color={isAllGoats ? "primary" : "default"} 
                    onClick={() => setIsAllGoats(true)}
                    clickable
                 />
                 <Typography>أو</Typography>
                 <Chip 
                    label="حظيرة محددة" 
                    color={!isAllGoats ? "primary" : "default"}
                    onClick={() => setIsAllGoats(false)}
                    clickable
                 />
             </Stack>

             {!isAllGoats && (
                <FormControl fullWidth>
                    <InputLabel>اختر الحظيرة</InputLabel>
                    <Select
                        value={form.penId}
                        label="اختر الحظيرة"
                        onChange={(e) => setForm({ ...form, penId: e.target.value })}
                    >
                        {pens.map(p => (
                            <MenuItem key={p.id} value={p.id}>{p.nameAr}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
             )}

             <FormControl>
              <InputLabel>نوع العلاج</InputLabel>
              <Select
                value={form.type}
                label="نوع العلاج"
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <MenuItem value="VACCINATION">تطعيم</MenuItem>
                <MenuItem value="DEWORMING">مضاد ديدان</MenuItem>
                <MenuItem value="TREATMENT">علاج</MenuItem>
                <MenuItem value="CHECKUP">فحص</MenuItem>
              </Select>
            </FormControl>

             <TextField
              label="التاريخ"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
            <TextField
              label="تاريخ الاستحقاق القادم (اختياري)"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.nextDueDate}
              onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
              helperText="سيتم تذكيرك بالجرعة القادمة لجميع الحيوانات المحددة"
            />
            
            <TextField
              label="الوصف / اسم الدواء"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            
             <FormControlLabel
                control={
                    <Checkbox 
                        checked={form.moveToIsolation}
                        onChange={(e) => setForm({...form, moveToIsolation: e.target.checked})}
                    />
                }
                label="نقل الحيوانات المريضة للعزل (اذا تم اختيار تشخيص معدي)"
            />

            <TextField
              label="إجمالي التكلفة (للمجموعة كلها)"
              type="number"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setBatchOpen(false)}>إلغاء</Button>
            <Button variant="contained" color="secondary" onClick={handleBatchSubmit}>
                تسجيل للمجموعة
            </Button>
        </DialogActions>
      </Dialog>

      {/* Protocol Form Dialog */}
      <Dialog open={protocolOpen} onClose={() => setProtocolOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle>{editingProtocol ? 'تعديل بروتوكول' : 'إضافة بروتوكول تطعيم'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={1}>
            <TextField
              label="الاسم بالعربية"
              value={protocolForm.nameAr}
              onChange={(e) => setProtocolForm({ ...protocolForm, nameAr: e.target.value })}
              required
            />
            <TextField
              label="الاسم بالإنجليزية"
              value={protocolForm.name}
              onChange={(e) => setProtocolForm({ ...protocolForm, name: e.target.value })}
              required
            />
            <FormControl>
              <InputLabel>النوع</InputLabel>
              <Select
                value={protocolForm.type}
                label="النوع"
                onChange={(e) => setProtocolForm({ ...protocolForm, type: e.target.value })}
              >
                <MenuItem value="VACCINATION">تطعيم</MenuItem>
                <MenuItem value="DEWORMING">مضاد ديدان</MenuItem>
                <MenuItem value="TREATMENT">علاج</MenuItem>
                <MenuItem value="CHECKUP">فحص</MenuItem>
                <MenuItem value="SURGERY">جراحة</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="العمر المطلوب (بالأشهر)"
              type="number"
              value={protocolForm.ageMonths}
              onChange={(e) => setProtocolForm({ ...protocolForm, ageMonths: e.target.value })}
              helperText="العمر الذي يجب أن يحصل فيه الحيوان على هذا التطعيم"
              required
            />
            <TextField
              label="التكرار (بالأشهر) - اتركه فارغاً للمرة الواحدة"
              type="number"
              value={protocolForm.repeatMonths}
              onChange={(e) => setProtocolForm({ ...protocolForm, repeatMonths: e.target.value })}
              helperText="كم شهر بين كل جرعة متكررة"
            />
            <TextField
              label="اسم الدواء"
              value={protocolForm.medication}
              onChange={(e) => setProtocolForm({ ...protocolForm, medication: e.target.value })}
            />
            <TextField
              label="الجرعة"
              value={protocolForm.dosage}
              onChange={(e) => setProtocolForm({ ...protocolForm, dosage: e.target.value })}
            />
            <FormControl>
              <InputLabel>الجنس (اختياري)</InputLabel>
              <Select
                value={protocolForm.gender}
                label="الجنس (اختياري)"
                onChange={(e) => setProtocolForm({ ...protocolForm, gender: e.target.value })}
              >
                <MenuItem value="">الكل</MenuItem>
                <MenuItem value="MALE">ذكر فقط</MenuItem>
                <MenuItem value="FEMALE">أنثى فقط</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="الوصف"
              value={protocolForm.description}
              onChange={(e) => setProtocolForm({ ...protocolForm, description: e.target.value })}
              multiline
              rows={2}
            />
            <TextField
              label="ملاحظات"
              value={protocolForm.notes}
              onChange={(e) => setProtocolForm({ ...protocolForm, notes: e.target.value })}
              multiline
              rows={2}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={protocolForm.isActive}
                  onChange={(e) => setProtocolForm({ ...protocolForm, isActive: e.target.checked })}
                />
              }
              label="بروتوكول فعّال"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProtocolOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleProtocolSubmit}>
            {editingProtocol ? 'تحديث' : 'إضافة'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
