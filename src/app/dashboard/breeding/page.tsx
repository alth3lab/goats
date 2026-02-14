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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
   TextField,
  IconButton,
  Alert,
  AlertTitle,
  Grid,
  Card,
  CardContent,
  Menu,
  Checkbox,
  Tooltip,
  useMediaQuery
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  Add as AddIcon,
  FavoriteBorder as BreedingIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  History as HistoryIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  FileDownload as ExportIcon,
  BabyChangingStation as BirthIcon,
  CheckCircle as SuccessIcon,
  Pending as PendingIcon,
  EmojiEvents as TrophyIcon,
  TrendingUp as TrendIcon,
  ChildCare as ChildIcon,
  Error as ErrorIcon,
  Favorite as PregnantIcon,
  Remove as RemoveIcon
} from '@mui/icons-material'
import { formatDate } from '@/lib/formatters'
import { EntityHistory } from '@/components/EntityHistory'

interface BirthRecord {
  id: string
  kidTagId: string
  kidGoatId?: string
  gender: 'MALE' | 'FEMALE'
  weight?: number
  status: 'ALIVE' | 'DEAD' | 'STILLBORN'
  notes?: string
  createdAt: string
}

interface BreedingRecord {
  id: string
  motherId: string
  fatherId: string
  mother: { id: string; tagId: string }
  father: { id: string; tagId: string }
  matingDate: string
  pregnancyStatus: string
  dueDate?: string
  birthDate?: string
  numberOfKids?: number
  notes?: string
  births?: BirthRecord[]
}

interface KidForm {
  tagId: string
  gender: 'MALE' | 'FEMALE'
  weight: string
  status: 'ALIVE' | 'DEAD' | 'STILLBORN'
  notes: string
}

const statusLabels: Record<string, string> = {
  MATED: 'تزاوج',
  PREGNANT: 'حامل',
  DELIVERED: 'ولادة',
  FAILED: 'فشل'
}

export default function BreedingPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [records, setRecords] = useState<BreedingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [quickBirthDialogOpen, setQuickBirthDialogOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<BreedingRecord | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [goats, setGoats] = useState<any[]>([]) // Using any to access full goat object properties
  const [inbreedingWarning, setInbreedingWarning] = useState<string | null>(null)
  
  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(false)
  const [selectedRecords, setSelectedRecords] = useState<string[]>([])
  
  const [form, setForm] = useState({
    motherId: '',
    fatherId: '',
    matingDate: '',
    pregnancyStatus: 'MATED',
    dueDate: '',
    birthDate: '',
    numberOfKids: '',
    notes: ''
  })
  
  const [quickBirthForm, setQuickBirthForm] = useState<{
    birthDate: string
    kids: KidForm[]
  }>({
    birthDate: new Date().toISOString().split('T')[0],
    kids: [
      {
        tagId: '',
        gender: 'MALE',
        weight: '',
        status: 'ALIVE',
        notes: ''
      }
    ]
  })

  // حساب تاريخ الولادة المتوقع (5 أشهر = 150 يوم من تاريخ التلقيح)
  const calculateDueDate = (matingDate: string): string => {
    if (!matingDate) return ''
    const date = new Date(matingDate)
    date.setDate(date.getDate() + 150) // 5 أشهر تقريباً
    return date.toISOString().split('T')[0]
  }

  // تحديث تاريخ التلقيح وحساب تاريخ الولادة تلقائياً
  const handleMatingDateChange = (matingDate: string) => {
    const dueDate = calculateDueDate(matingDate)
    setForm({ ...form, matingDate, dueDate })
  }

  // حساب الأيام المتبقية للولادة
  const getDaysRemaining = (dueDate: string): number => {
    const today = new Date()
    const due = new Date(dueDate)
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  useEffect(() => {
    fetch('/api/breeding')
      .then(res => res.json())
      .then(data => setRecords(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  const loadGoats = async () => {
    const res = await fetch('/api/goats')
    const data = await res.json()
    setGoats(Array.isArray(data) ? data : [])
  }

  const handleOpen = () => {
    setOpen(true)
    if (goats.length === 0) loadGoats()
  }

  const handleClose = () => {
    setOpen(false)
    setEditMode(false)
    setSelectedRecord(null)
    setInbreedingWarning(null)
    setForm({
      motherId: '',
      fatherId: '',
      matingDate: '',
      pregnancyStatus: 'MATED',
      dueDate: '',
      birthDate: '',
      numberOfKids: '',
      notes: ''
    })
  }

  // Check for inbreeding when parents are selected
  useEffect(() => {
    if (form.motherId && form.fatherId && goats.length > 0) {
      const mother = goats.find(g => g.id === form.motherId)
      const father = goats.find(g => g.id === form.fatherId)

      if (mother && father) {
        const warnings = []
        
        // 1. Direct Parent-Child Relationship (Impossible gender-wise usually, but data might be wrong)
        if (mother.fatherId === father.id) warnings.push('تحذير: الأب هو والد الأم!')
        if (father.motherId === mother.id) warnings.push('تحذير: الأم هي والدة الأب!')

        // 2. Siblings (Full or Half)
        if (mother.motherId && father.motherId && mother.motherId === father.motherId) {
          warnings.push('تحذير: الأم والأب إخوة من نفس الأم!')
        }
        if (mother.fatherId && father.fatherId && mother.fatherId === father.fatherId) {
          warnings.push('تحذير: الأم والأب إخوة من نفس الأب!')
        }

        // 3. Grandparents
        if (mother.fatherId && mother.fatherId === father.id) warnings.push('تحذير: تزاوج بين أب وابنته!')
        if (mother.motherId && mother.motherId === father.id) warnings.push('تحذير: تزاوج بين أم وابنها!') // Unlikely gender

        if (warnings.length > 0) {
          setInbreedingWarning(warnings.join('\n'))
        } else {
          setInbreedingWarning(null)
        }
      }
    } else {
       setInbreedingWarning(null)
    }
  }, [form.motherId, form.fatherId, goats])

  const handleView = (record: BreedingRecord) => {
    setSelectedRecord(record)
    setViewDialogOpen(true)
  }

  const handleEdit = async (record: BreedingRecord) => {
    setEditMode(true)
    setSelectedRecord(record)
    await loadGoats()
    setForm({
      motherId: record.motherId,
      fatherId: record.fatherId,
      matingDate: record.matingDate.split('T')[0],
      pregnancyStatus: record.pregnancyStatus,
      dueDate: record.dueDate ? record.dueDate.split('T')[0] : '',
      birthDate: record.birthDate ? record.birthDate.split('T')[0] : '',
      numberOfKids: record.numberOfKids?.toString() || '',
      notes: record.notes || ''
    })
    setOpen(true)
  }

  const handleDeleteClick = (record: BreedingRecord) => {
    setSelectedRecord(record)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedRecord) return
    
    try {
      await fetch(`/api/breeding/${selectedRecord.id}`, {
        method: 'DELETE'
      })
      setDeleteDialogOpen(false)
      setSelectedRecord(null)
      const res = await fetch('/api/breeding')
      const data = await res.json()
      setRecords(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('خطأ في حذف السجل:', error)
    }
  }

  const handleSubmit = async () => {
    const payload = {
      motherId: form.motherId,
      fatherId: form.fatherId,
      matingDate: new Date(form.matingDate),
      pregnancyStatus: form.pregnancyStatus,
      dueDate: form.dueDate ? new Date(form.dueDate) : null,
      birthDate: form.birthDate ? new Date(form.birthDate) : null,
      numberOfKids: form.numberOfKids ? Number(form.numberOfKids) : null,
      notes: form.notes.trim() || null
    }

    const url = editMode && selectedRecord ? `/api/breeding/${selectedRecord.id}` : '/api/breeding'
    const method = editMode ? 'PUT' : 'POST'

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    handleClose()
    const res = await fetch('/api/breeding')
    const data = await res.json()
    setRecords(Array.isArray(data) ? data : [])
  }

  const upcomingBirths = records.filter(r => {
    if (r.pregnancyStatus !== 'PREGNANT' || !r.dueDate) return false
    const days = getDaysRemaining(r.dueDate)
    return days <= 14 // Upcoming in 2 weeks or overdue
  })

  // Calculate statistics
  const deliveredRecords = records.filter(r => r.pregnancyStatus === 'DELIVERED')
  const allBirths = records.flatMap(r => r.births || [])
  const stats = {
    total: records.length,
    mated: records.filter(r => r.pregnancyStatus === 'MATED').length,
    pregnant: records.filter(r => r.pregnancyStatus === 'PREGNANT').length,
    delivered: deliveredRecords.length,
    failed: records.filter(r => r.pregnancyStatus === 'FAILED').length,
    successRate: records.length > 0 
      ? Math.round((deliveredRecords.length / records.length) * 100) 
      : 0,
    // Advanced stats
    twinRate: deliveredRecords.length > 0
      ? Math.round((deliveredRecords.filter(r => (r.numberOfKids || 0) > 1).length / deliveredRecords.length) * 100)
      : 0,
    avgKidsPerBirth: deliveredRecords.length > 0
      ? (deliveredRecords.reduce((sum, r) => sum + (r.numberOfKids || r.births?.length || 0), 0) / deliveredRecords.length).toFixed(1)
      : '0',
    mortalityRate: allBirths.length > 0
      ? Math.round((allBirths.filter(b => b.status === 'DEAD' || b.status === 'STILLBORN').length / allBirths.length) * 100)
      : 0,
    totalKids: allBirths.length,
    aliveKids: allBirths.filter(b => b.status === 'ALIVE').length,
    deadKids: allBirths.filter(b => b.status === 'DEAD' || b.status === 'STILLBORN').length,
  }

  // Top mothers by successful births
  const topMothers = (() => {
    const motherMap: Record<string, { tagId: string; deliveries: number; totalKids: number; aliveKids: number }> = {}
    deliveredRecords.forEach(r => {
      if (!motherMap[r.motherId]) {
        motherMap[r.motherId] = { tagId: r.mother.tagId, deliveries: 0, totalKids: 0, aliveKids: 0 }
      }
      motherMap[r.motherId].deliveries++
      motherMap[r.motherId].totalKids += (r.numberOfKids || r.births?.length || 0)
      motherMap[r.motherId].aliveKids += (r.births?.filter(b => b.status === 'ALIVE').length || 0)
    })
    return Object.values(motherMap).sort((a, b) => b.totalKids - a.totalKids || b.deliveries - a.deliveries).slice(0, 5)
  })()

  // Filter records based on search and filters
  const filteredRecords = records.filter(record => {
    // Search filter
    const matchesSearch = searchQuery === '' || 
      record.mother.tagId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.father.tagId.toLowerCase().includes(searchQuery.toLowerCase())
    
    // Status filter
    const matchesStatus = statusFilter === 'ALL' || record.pregnancyStatus === statusFilter
    
    // Upcoming filter
    const matchesUpcoming = !showUpcomingOnly || 
      (record.pregnancyStatus === 'PREGNANT' && record.dueDate && getDaysRemaining(record.dueDate) <= 14)
    
    return matchesSearch && matchesStatus && matchesUpcoming
  })

  // Handle quick birth recording
  const handleQuickBirth = (record: BreedingRecord) => {
    setSelectedRecord(record)
    const expectedKids = record.numberOfKids || 1
    setQuickBirthForm({
      birthDate: new Date().toISOString().split('T')[0],
      kids: Array.from({ length: expectedKids }, () => ({
        tagId: '',
        gender: 'MALE',
        weight: '',
        status: 'ALIVE',
        notes: ''
      }))
    })
    setQuickBirthDialogOpen(true)
  }

  const handleAddKid = () => {
    setQuickBirthForm({
      ...quickBirthForm,
      kids: [
        ...quickBirthForm.kids,
        {
          tagId: '',
          gender: 'MALE',
          weight: '',
          status: 'ALIVE',
          notes: ''
        }
      ]
    })
  }

  const handleRemoveKid = (index: number) => {
    if (quickBirthForm.kids.length > 1) {
      setQuickBirthForm({
        ...quickBirthForm,
        kids: quickBirthForm.kids.filter((_, i) => i !== index)
      })
    }
  }

  const handleKidChange = (index: number, field: keyof KidForm, value: string) => {
    const updatedKids = [...quickBirthForm.kids]
    updatedKids[index] = { ...updatedKids[index], [field]: value }
    setQuickBirthForm({ ...quickBirthForm, kids: updatedKids })
  }

  const handleQuickBirthSubmit = async () => {
    if (!selectedRecord) return
    
    try {
      const response = await fetch(`/api/breeding/${selectedRecord.id}/births`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDate: quickBirthForm.birthDate,
          kids: quickBirthForm.kids.map(kid => ({
            tagId: kid.tagId.trim() || undefined,
            gender: kid.gender,
            weight: kid.weight ? parseFloat(kid.weight) : undefined,
            status: kid.status,
            notes: kid.notes.trim() || undefined
          }))
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'فشل في تسجيل الولادة' }))
        throw new Error(errorData.error || 'فشل في تسجيل الولادة')
      }
      
      setQuickBirthDialogOpen(false)
      const res = await fetch('/api/breeding')
      const data = await res.json()
      setRecords(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('خطأ في تسجيل الولادة:', error)
      const message = error instanceof Error ? error.message : 'حدث خطأ أثناء تسجيل الولادة. يرجى المحاولة مرة أخرى.'
      alert(message)
    }
  }

  // Handle bulk status update
  const handleBulkStatusUpdate = async (newStatus: string) => {
    try {
      await Promise.all(
        selectedRecords.map(id =>
          fetch(`/api/breeding/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pregnancyStatus: newStatus })
          })
        )
      )
      
      setSelectedRecords([])
      const res = await fetch('/api/breeding')
      const data = await res.json()
      setRecords(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('خطأ في التحديث الجماعي:', error)
    }
  }

  // Export to CSV
  const handleExport = () => {
    const headers = ['رقم الأم', 'رقم الأب', 'تاريخ التزاوج', 'الحالة', 'تاريخ الولادة المتوقع', 'تاريخ الولادة الفعلي', 'عدد المواليد']
    const rows = filteredRecords.map(r => [
      r.mother.tagId,
      r.father.tagId,
      formatDate(r.matingDate),
      statusLabels[r.pregnancyStatus],
      r.dueDate ? formatDate(r.dueDate) : '-',
      r.birthDate ? formatDate(r.birthDate) : '-',
      r.numberOfKids ?? '-'
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `breeding-records-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // Toggle record selection
  const handleToggleSelect = (id: string) => {
    setSelectedRecords(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedRecords.length === filteredRecords.length) {
      setSelectedRecords([])
    } else {
      setSelectedRecords(filteredRecords.map(r => r.id))
    }
  }

  return (
    <Box sx={{ width: '100%', overflowX: 'hidden' }}>
      {upcomingBirths.length > 0 && (
         <Alert severity="warning" sx={{ mb: 3 }} icon={<BirthIcon />}>
           <AlertTitle>ولادات قريبة ⚠️</AlertTitle>
           يوجد <strong>{upcomingBirths.length}</strong> حالات ولادة متوقعة خلال أسبوعين أو متأخرة. يرجى تجهيز حظائر الولادة.
         </Alert>
      )}

      {/* ═══════════════════ UNIFIED STATS ═══════════════════ */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        {/* Row 1: Main KPIs as compact strip */}
        <Stack direction="row" spacing={0} useFlexGap flexWrap="wrap" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
          {[
            { label: 'إجمالي', value: stats.total, color: 'primary.main' },
            { label: 'تزاوج', value: stats.mated, color: 'secondary.main' },
            { label: 'حامل', value: stats.pregnant, color: 'warning.main' },
            { label: 'ولادة', value: stats.delivered, color: 'success.main' },
            { label: 'فشل', value: stats.failed, color: 'text.disabled' },
            { label: 'نجاح', value: `${stats.successRate}%`, color: 'info.main' },
          ].map((item, i) => (
            <Box key={i} sx={{ flex: '1 1 140px', textAlign: 'center', py: 1.5, px: 1, borderRight: { lg: i < 5 ? '1px solid' : 'none' }, borderColor: 'divider', bgcolor: 'background.default' }}>
              <Typography variant="h5" fontWeight="bold" sx={{ color: item.color, lineHeight: 1.2 }}>{item.value}</Typography>
              <Typography variant="caption" color="text.secondary" fontWeight="bold">{item.label}</Typography>
            </Box>
          ))}
        </Stack>

        {/* Row 2: Production Indicators */}
        <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
          <TrendIcon sx={{ fontSize: 20, color: 'primary.main' }} />
          <Typography variant="subtitle1" fontWeight="bold">مؤشرات الإنتاج</Typography>
        </Stack>
        <Stack direction="row" spacing={0} useFlexGap flexWrap="wrap" sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider', mb: 2 }}>
          {[
            { label: 'معدل التوائم', value: `${stats.twinRate}%`, sub: null, icon: <ChildIcon sx={{ fontSize: 18, color: 'primary.main' }} /> },
            { label: 'متوسط مواليد/ولادة', value: stats.avgKidsPerBirth, sub: null, icon: <BirthIcon sx={{ fontSize: 18, color: 'primary.main' }} /> },
            { label: 'معدل النفوق', value: `${stats.mortalityRate}%`, sub: `${stats.deadKids}/${stats.totalKids}`, icon: <ErrorIcon sx={{ fontSize: 18, color: stats.mortalityRate > 10 ? 'error.main' : 'primary.main' }} /> },
            { label: 'مواليد أحياء', value: stats.aliveKids, sub: `من ${stats.totalKids}`, icon: <SuccessIcon sx={{ fontSize: 18, color: 'success.main' }} /> },
          ].map((item, i) => (
            <Box key={i} sx={{ flex: '1 1 180px', textAlign: 'center', py: 1.5, px: 1, borderRight: { lg: i < 3 ? '1px solid' : 'none' }, borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center" mb={0.25}>
                {item.icon}
                <Typography variant="h6" fontWeight="bold" sx={{ color: stats.mortalityRate > 10 && i === 2 ? 'error.main' : 'text.primary' }}>{item.value}</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" fontWeight="bold" display="block">{item.label}</Typography>
              {item.sub && <Typography variant="caption" color="text.disabled" sx={{ fontSize: 10 }}>{item.sub}</Typography>}
            </Box>
          ))}
        </Stack>

        {/* Row 3: Top Mothers */}
        {topMothers.length > 0 && (
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              <TrophyIcon sx={{ fontSize: 20, color: 'warning.main' }} />
              <Typography variant="subtitle1" fontWeight="bold">أفضل الأمهات إنتاجاً</Typography>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {topMothers.map((m, i) => (
                <Chip
                  key={m.tagId}
                  icon={i === 0 ? <TrophyIcon sx={{ fontSize: 14 }} /> : undefined}
                  label={`${m.tagId} — ${m.totalKids} مولود (${m.deliveries} ولادة${m.aliveKids > 0 ? ` • ${m.aliveKids} حي` : ''})`}
                  size="small"
                  sx={{
                    fontWeight: 'bold',
                    fontSize: 11,
                    height: 28,
                    bgcolor: i === 0 ? 'warning.light' : 'background.default',
                    border: '1px solid',
                    borderColor: i === 0 ? 'warning.main' : 'divider',
                    color: i === 0 ? 'warning.dark' : 'text.primary',
                    '& .MuiChip-icon': { color: 'warning.main' }
                  }}
                />
              ))}
            </Stack>
          </Box>
        )}
      </Paper>

      {/* Header with title and actions */}
      <Paper sx={{ p: { xs: 1.5, sm: 3 }, mb: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={1.5}>
          <Stack direction="row" spacing={2} alignItems="center">
            <BreedingIcon sx={{ color: 'secondary.main', fontSize: 32 }} />
            <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">سجلات التكاثر</Typography>
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
            <Button 
              variant="outlined" 
              startIcon={<ExportIcon />} 
              onClick={handleExport}
              disabled={filteredRecords.length === 0}
              fullWidth={isMobile}
            >
              تصدير
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen} fullWidth={isMobile}>
              إضافة سجل
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Search and Filter Bar */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="بحث برقم الأم أو الأب..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>الحالة</InputLabel>
              <Select
                value={statusFilter}
                label="الحالة"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="ALL">الكل</MenuItem>
                <MenuItem value="MATED">تزاوج</MenuItem>
                <MenuItem value="PREGNANT">حامل</MenuItem>
                <MenuItem value="DELIVERED">ولادة</MenuItem>
                <MenuItem value="FAILED">فشل</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Checkbox 
                checked={showUpcomingOnly}
                onChange={(e) => setShowUpcomingOnly(e.target.checked)}
              />
              <Typography variant="body2">ولادات قريبة فقط</Typography>
            </Stack>
          </Grid>
          <Grid item xs={12} md={2}>
            <Typography variant="body2" color="text.secondary" textAlign="right">
              النتائج: <strong>{filteredRecords.length}</strong> من {records.length}
            </Typography>
          </Grid>
        </Grid>

        {/* Bulk Actions */}
        {selectedRecords.length > 0 && (
          <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ lineHeight: '36px' }}>
              محدد: <strong>{selectedRecords.length}</strong>
            </Typography>
            <Button 
              size="small" 
              variant="outlined"
              onClick={() => handleBulkStatusUpdate('PREGNANT')}
            >
              تحديث لحامل
            </Button>
            <Button 
              size="small" 
              variant="outlined"
              onClick={() => handleBulkStatusUpdate('DELIVERED')}
            >
              تحديث لولادة
            </Button>
            <Button 
              size="small" 
              variant="outlined" 
              color="error"
              onClick={() => setSelectedRecords([])}
            >
              إلغاء التحديد
            </Button>
          </Stack>
        )}
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 3, overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox 
                  checked={selectedRecords.length === filteredRecords.length && filteredRecords.length > 0}
                  indeterminate={selectedRecords.length > 0 && selectedRecords.length < filteredRecords.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell><strong>الأم</strong></TableCell>
              <TableCell><strong>الأب</strong></TableCell>
              <TableCell><strong>تاريخ التزاوج</strong></TableCell>
              <TableCell><strong>الحالة</strong></TableCell>
              <TableCell><strong>تاريخ الولادة المتوقع</strong></TableCell>
              <TableCell><strong>الأيام المتبقية</strong></TableCell>
              <TableCell><strong>عدد المواليد</strong></TableCell>
              <TableCell><strong>ملاحظات</strong></TableCell>
              <TableCell><strong>الإجراءات</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} align="center">جاري التحميل...</TableCell></TableRow>
            ) : filteredRecords.length === 0 ? (
              <TableRow><TableCell colSpan={10} align="center">لا توجد نتائج</TableCell></TableRow>
            ) : (
              filteredRecords.map(r => {
                const daysRemaining = r.dueDate ? getDaysRemaining(r.dueDate) : null
                const isUpcoming = r.pregnancyStatus === 'PREGNANT' && daysRemaining !== null && daysRemaining <= 14
                const statusIcons: Record<string, any> = {
                  MATED: <PendingIcon sx={{ fontSize: 16 }} />,
                  PREGNANT: <PregnantIcon sx={{ fontSize: 16 }} />,
                  DELIVERED: <SuccessIcon sx={{ fontSize: 16 }} />,
                  FAILED: <ErrorIcon sx={{ fontSize: 16 }} />
                }
                const statusColors: Record<string, any> = {
                  MATED: 'info',
                  PREGNANT: 'warning',
                  DELIVERED: 'success',
                  FAILED: 'error'
                }
                
                return (
                  <TableRow 
                    key={r.id} 
                    hover
                    selected={selectedRecords.includes(r.id)}
                    sx={{ 
                      bgcolor: isUpcoming ? 'rgba(255, 152, 0, 0.05)' : 'inherit',
                      '&:hover': { bgcolor: isUpcoming ? 'rgba(255, 152, 0, 0.1)' : undefined }
                    }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox 
                        checked={selectedRecords.includes(r.id)}
                        onChange={() => handleToggleSelect(r.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {r.mother.tagId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {r.father.tagId}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDate(r.matingDate)}</TableCell>
                    <TableCell>
                      <Chip 
                        icon={statusIcons[r.pregnancyStatus]}
                        label={statusLabels[r.pregnancyStatus] || r.pregnancyStatus} 
                        color={statusColors[r.pregnancyStatus] || 'default'}
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </TableCell>
                    <TableCell>{r.dueDate ? formatDate(r.dueDate) : '-'}</TableCell>
                    <TableCell>
                      {daysRemaining !== null ? (
                        <Chip 
                          label={
                            daysRemaining > 0 
                              ? `${daysRemaining} يوم` 
                              : daysRemaining === 0 
                                ? '🎯 اليوم' 
                                : `⚠️ متأخر ${Math.abs(daysRemaining)} يوم`
                          }
                          color={daysRemaining > 7 ? 'success' : daysRemaining >= 0 ? 'warning' : 'error'}
                          size="small"
                          sx={{ fontWeight: 'bold' }}
                        />
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={r.numberOfKids ? 'bold' : 'normal'}>
                        {r.numberOfKids ?? '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.notes || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        {/* Quick Birth Button for pregnant records */}
                        {(r.pregnancyStatus === 'PREGNANT' || r.pregnancyStatus === 'MATED') && (
                          <Tooltip title="تسجيل ولادة سريع">
                            <IconButton 
                              size="small" 
                              sx={{ 
                                color: 'common.white',
                                bgcolor: isUpcoming ? 'warning.main' : 'success.main',
                                '&:hover': { bgcolor: isUpcoming ? 'warning.dark' : 'success.dark' }
                              }}
                              onClick={() => handleQuickBirth(r)}
                            >
                              <BirthIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="عرض التفاصيل">
                          <IconButton size="small" color="primary" onClick={() => handleView(r)}>
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تعديل">
                          <IconButton size="small" color="success" onClick={() => handleEdit(r)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton size="small" color="error" onClick={() => handleDeleteClick(r)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle>{editMode ? 'تعديل سجل التكاثر' : 'إضافة سجل تكاثر'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={1}>
            {inbreedingWarning && (
              <Alert severity="warning">
                <AlertTitle>⚠️ تنبيه زواج أقارب</AlertTitle>
                {inbreedingWarning.split('\n').map((w, i) => <div key={i}>{w}</div>)}
              </Alert>
            )}
            <FormControl>
              <InputLabel>الأم</InputLabel>
              <Select
                value={form.motherId}
                label="الأم"
                onChange={(e) => setForm({ ...form, motherId: e.target.value })}
              >
                {goats.filter(g => g.gender === 'FEMALE').map(g => (
                  <MenuItem key={g.id} value={g.id}>{g.tagId}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>الأب</InputLabel>
              <Select
                value={form.fatherId}
                label="الأب"
                onChange={(e) => setForm({ ...form, fatherId: e.target.value })}
              >
                {goats.filter(g => g.gender === 'MALE').map(g => (
                  <MenuItem key={g.id} value={g.id}>{g.tagId}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="تاريخ التزاوج"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.matingDate}
              onChange={(e) => handleMatingDateChange(e.target.value)}
              required
            />
            <FormControl>
              <InputLabel>الحالة</InputLabel>
              <Select
                value={form.pregnancyStatus}
                label="الحالة"
                onChange={(e) => setForm({ ...form, pregnancyStatus: e.target.value })}
              >
                <MenuItem value="MATED">تزاوج</MenuItem>
                <MenuItem value="PREGNANT">حامل</MenuItem>
                <MenuItem value="DELIVERED">ولادة</MenuItem>
                <MenuItem value="FAILED">فشل</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="تاريخ الولادة المتوقع (يُحسب تلقائياً بعد 5 أشهر)"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.dueDate}
              InputProps={{
                readOnly: true,
              }}
              helperText="يتم الحساب تلقائياً بعد إدخال تاريخ التلقيح"
              disabled
            />
            <TextField
              label="تاريخ الولادة الفعلي"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            />
            <TextField
              label="عدد المواليد"
              type="number"
              value={form.numberOfKids}
              onChange={(e) => setForm({ ...form, numberOfKids: e.target.value })}
            />
            <TextField
              label="ملاحظات"
              multiline
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="مثل: تلقيح صناعي، ولادة عسرة، ..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>إلغاء</Button>
          <Button variant="contained" onClick={handleSubmit}>حفظ</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog عرض التفاصيل */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle>تفاصيل سجل التكاثر</DialogTitle>
        <DialogContent>
          {selectedRecord && (
            <Stack spacing={2} mt={2}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>معلومات التكاثر</Typography>
                <Stack spacing={1}>
                  <Typography><strong>الأم:</strong> {selectedRecord.mother.tagId}</Typography>
                  <Typography><strong>الأب:</strong> {selectedRecord.father.tagId}</Typography>
                    <Typography><strong>تاريخ التزاوج:</strong> {formatDate(selectedRecord.matingDate)}</Typography>
                  <Typography><strong>الحالة:</strong> {statusLabels[selectedRecord.pregnancyStatus]}</Typography>
                  {selectedRecord.dueDate && (
                    <>
                      <Typography><strong>تاريخ الولادة المتوقع:</strong> {formatDate(selectedRecord.dueDate)}</Typography>
                      <Typography>
                        <strong>الأيام المتبقية:</strong>{' '}
                        {(() => {
                          const days = getDaysRemaining(selectedRecord.dueDate)
                          return days > 0 ? `${days} يوم` : days === 0 ? 'اليوم' : 'متأخر'
                        })()}
                      </Typography>
                    </>
                  )}
                  {selectedRecord.birthDate && (
                    <Typography><strong>تاريخ الولادة الفعلي:</strong> {formatDate(selectedRecord.birthDate)}</Typography>
                  )}
                  {selectedRecord.numberOfKids && (
                    <Typography><strong>عدد المواليد:</strong> {selectedRecord.numberOfKids}</Typography>
                  )}
                  {selectedRecord.notes && (
                    <Typography><strong>ملاحظات:</strong> {selectedRecord.notes}</Typography>
                  )}
                </Stack>
              </Paper>

              {/* بيانات المواليد */}
              {selectedRecord.births && selectedRecord.births.length > 0 && (
                <Paper sx={{ p: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                    <BirthIcon color="warning" />
                    <Typography variant="h6">المواليد ({selectedRecord.births.length})</Typography>
                  </Stack>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'warning.light' }}>
                          <TableCell sx={{ fontWeight: 'bold' }}>رقم التعريف</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>الجنس</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>الوزن (كجم)</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>ملاحظات</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedRecord.births.map((b: BirthRecord) => (
                          <TableRow key={b.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight="bold">{b.kidTagId}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={b.gender === 'MALE' ? 'ذكر' : 'أنثى'}
                                size="small"
                                sx={{
                                  bgcolor: b.gender === 'MALE' ? 'info.light' : 'error.light',
                                  color: b.gender === 'MALE' ? 'info.dark' : 'error.dark',
                                  fontWeight: 'bold', fontSize: 11
                                }}
                              />
                            </TableCell>
                            <TableCell>{b.weight ? `${b.weight} كجم` : '-'}</TableCell>
                            <TableCell>
                              <Chip
                                label={b.status === 'ALIVE' ? 'حي' : b.status === 'DEAD' ? 'ميت' : 'ميت عند الولادة'}
                                size="small"
                                color={b.status === 'ALIVE' ? 'success' : 'error'}
                                sx={{ fontWeight: 'bold', fontSize: 11 }}
                              />
                            </TableCell>
                            <TableCell>{b.notes || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              )}

              <Paper sx={{ p: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                  <HistoryIcon color="action" />
                  <Typography variant="h6">سجل التغييرات</Typography>
                </Stack>
                <EntityHistory entity="Breeding" entityId={selectedRecord.id} />
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog تأكيد الحذف */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} fullWidth maxWidth="xs" fullScreen={isMobile}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف سجل التكاثر للأم <strong>{selectedRecord?.mother.tagId}</strong> والأب <strong>{selectedRecord?.father.tagId}</strong>؟
          </Typography>
          <Typography color="error" sx={{ mt: 1 }}>
            لا يمكن التراجع عن هذا الإجراء!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quick Birth Dialog */}
      <Dialog open={quickBirthDialogOpen} onClose={() => setQuickBirthDialogOpen(false)} maxWidth="md" fullWidth fullScreen={isMobile}>
        <DialogTitle sx={{ bgcolor: 'warning.main', color: 'warning.contrastText' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <BirthIcon />
            <Typography variant="h6">تسجيل ولادة سريع 🎉</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedRecord && (
            <Stack spacing={3}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>الأم:</strong> {selectedRecord.mother.tagId} | <strong>الأب:</strong> {selectedRecord.father.tagId}
                </Typography>
              </Alert>
              
              <TextField
                label="تاريخ الولادة"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={quickBirthForm.birthDate}
                onChange={(e) => setQuickBirthForm({ ...quickBirthForm, birthDate: e.target.value })}
              />

              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    معلومات المواليد ({quickBirthForm.kids.length})
                  </Typography>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    startIcon={<AddIcon />}
                    onClick={handleAddKid}
                  >
                    إضافة مولود
                  </Button>
                </Stack>

                {quickBirthForm.kids.map((kid, index) => (
                  <Paper 
                    key={index} 
                    sx={{ 
                      p: 2, 
                      mb: 2, 
                      bgcolor: 'background.default',
                      border: '2px solid',
                      borderColor: 'divider',
                      borderRadius: 2
                    }}
                  >
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontWeight="bold" color="primary">
                          المولود {index + 1}
                        </Typography>
                        {quickBirthForm.kids.length > 1 && (
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleRemoveKid(index)}
                          >
                            <RemoveIcon />
                          </IconButton>
                        )}
                      </Stack>

                      <TextField
                        label="رقم التعريف (اختياري)"
                        size="small"
                        fullWidth
                        placeholder="سيتم إنشاؤه تلقائياً إذا تُرك فارغاً"
                        value={kid.tagId}
                        onChange={(e) => handleKidChange(index, 'tagId', e.target.value)}
                        helperText="مثال: KID-2026-001"
                      />

                      <Stack direction="row" spacing={2}>
                        <FormControl fullWidth size="small">
                          <InputLabel>الجنس *</InputLabel>
                          <Select
                            value={kid.gender}
                            label="الجنس *"
                            onChange={(e) => handleKidChange(index, 'gender', e.target.value)}
                          >
                            <MenuItem value="MALE">ذكر 🐏</MenuItem>
                            <MenuItem value="FEMALE">أنثى 🐐</MenuItem>
                          </Select>
                        </FormControl>

                        <FormControl fullWidth size="small">
                          <InputLabel>الحالة *</InputLabel>
                          <Select
                            value={kid.status}
                            label="الحالة *"
                            onChange={(e) => handleKidChange(index, 'status', e.target.value)}
                          >
                            <MenuItem value="ALIVE">حي ✅</MenuItem>
                            <MenuItem value="DEAD">ميت ❌</MenuItem>
                            <MenuItem value="STILLBORN">ميت عند الولادة 💀</MenuItem>
                          </Select>
                        </FormControl>
                      </Stack>

                      <TextField
                        label="الوزن عند الولادة (كجم)"
                        size="small"
                        fullWidth
                        type="number"
                        placeholder="مثال: 2.5"
                        value={kid.weight}
                        onChange={(e) => handleKidChange(index, 'weight', e.target.value)}
                        inputProps={{ min: 0, max: 10, step: 0.1 }}
                        helperText="اختياري - الوزن بالكيلوجرام"
                      />

                      <TextField
                        label="ملاحظات"
                        size="small"
                        fullWidth
                        multiline
                        rows={2}
                        placeholder="أي ملاحظات إضافية..."
                        value={kid.notes}
                        onChange={(e) => handleKidChange(index, 'notes', e.target.value)}
                      />
                    </Stack>
                  </Paper>
                ))}
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuickBirthDialogOpen(false)}>إلغاء</Button>
          <Button 
            variant="contained" 
            color="warning"
            onClick={handleQuickBirthSubmit}
            startIcon={<BirthIcon />}
          >
            تسجيل الولادة ({quickBirthForm.kids.length})
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
