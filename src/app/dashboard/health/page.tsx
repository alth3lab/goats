'use client'

import { useEffect, useState } from 'react'
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
  useMediaQuery
} from '@mui/material'
import { useTheme, alpha } from '@mui/material/styles'
import {
  Add as AddIcon,
  Check as CheckIcon,
  Warning as WarningIcon,
  LocalHospital as HealthIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  History as HistoryIcon
} from '@mui/icons-material'
import { formatCurrency, formatDate } from '@/lib/formatters'
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

const typeLabels: Record<string, string> = {
  VACCINATION: 'تطعيم',
  DEWORMING: 'مضاد ديدان',
  TREATMENT: 'علاج',
  CHECKUP: 'فحص',
  SURGERY: 'جراحة'
}

export default function HealthPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
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

  const handleBatchOpen = () => {
      setBatchOpen(true)
      if (pens.length === 0) loadPens()
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
    <Box>
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
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} mb={2} spacing={1.5}>
          <Stack direction="row" spacing={2} alignItems="center">
            <HealthIcon color="error" />
            <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">السجلات الصحية</Typography>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button variant="outlined" color="secondary" startIcon={<HealthIcon />} onClick={handleBatchOpen} fullWidth={isMobile}>
              علاج جماعي
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen} fullWidth={isMobile}>
              إضافة سجل
            </Button>
          </Stack>
        </Stack>
        <TextField
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

      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
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

      {/* Single Record Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle>إضافة سجل صحي</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={1}>
            <FormControl>
              <InputLabel>الماعز</InputLabel>
              <Select
                value={form.goatId}
                label="الماعز"
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
                label="نقل الماعز إلى العزل الصحي تلقائياً"
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
    </Box>
  )
}
