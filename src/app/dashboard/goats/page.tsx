'use client'

import { useState, useEffect } from 'react'
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
  TablePagination,
  Chip,
  IconButton,
  TextField,
  InputAdornment,
  Stack,
  Divider,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  AlertTitle,
  Checkbox,
  Card,
  CardContent,
  CardActions,
  Grid,
  useMediaQuery
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { calculateGoatAge } from '@/lib/ageCalculator'
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Male as MaleIcon,
  Female as FemaleIcon,
  Inventory as ArchiveIcon,
  ReportProblem as DeathIcon,
  MoveDown as MoveIcon,
  History as HistoryIcon,
  GridView as GridViewIcon,
  ViewList as ListViewIcon,
  FileDownload as ExportIcon,
  Pets as PetsIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Scale as ScaleIcon,
  FilterList as FilterIcon,
  BabyChangingStation as PregnantIcon
} from '@mui/icons-material'
import * as XLSX from 'xlsx'
import { generateArabicPDF } from '@/lib/pdfHelper'
import { formatDate } from '@/lib/formatters'
import { EntityHistory } from '@/components/EntityHistory'
import { useAuth } from '@/lib/useAuth'

const farmTypePageLabels: Record<string, { title: string; animal: string; animalPlural: string }> = {
  GOAT: { title: 'إدارة الماعز والخرفان', animal: 'ماعز', animalPlural: 'الماعز' },
  SHEEP: { title: 'إدارة الأغنام', animal: 'أغنام', animalPlural: 'الأغنام' },
  CAMEL: { title: 'إدارة الإبل', animal: 'إبل', animalPlural: 'الإبل' },
  MIXED: { title: 'إدارة الحيوانات', animal: 'حيوان', animalPlural: 'الحيوانات' },
}

interface Goat {
  id: string
  tagId: string
  name?: string
  gender: 'MALE' | 'FEMALE'
  birthDate: string
  weight?: number
  status: 'ACTIVE' | 'SOLD' | 'DECEASED' | 'QUARANTINE'
  motherTagId?: string | null
  fatherTagId?: string | null
  notes?: string | null
  pen?: { nameAr: string } | null
  breed: {
    id: string
    nameAr: string
    type: {
      id: string
      nameAr: string
    }
  }
  age?: {
    years: number
    months: number
    days: number
    totalMonths: number
    category: string
    formatted: string
  }
  pregnancyStatus?: 'PREGNANT' | 'CONFIRMED' | null
  dueDate?: string | null
}

interface FamilyMember {
  id: string
  tagId: string
  name?: string
  gender: 'MALE' | 'FEMALE'
  birthDate: string
  status: 'ACTIVE' | 'SOLD' | 'DECEASED' | 'QUARANTINE'
  breed: { nameAr: string }
  mother?: FamilyMember | null
  father?: FamilyMember | null
}

const maleIconColor = 'info.main'
const femaleIconColor = '#EC4899'

// دالة لحساب الأيام المتبقية للولادة
const getDaysRemaining = (dueDate: string | null) => {
  if (!dueDate) return null
  const today = new Date()
  const due = new Date(dueDate)
  const diffTime = due.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

// دالة لتحديد لون chip الحمل حسب القرب من الموعد
const getPregnancyColor = (daysRemaining: number | null): 'success' | 'warning' | 'error' | 'secondary' => {
  if (daysRemaining === null) return 'secondary'
  if (daysRemaining < 0) return 'error' // متأخرة
  if (daysRemaining <= 7) return 'error' // أقل من أسبوع
  if (daysRemaining <= 30) return 'warning' // أقل من شهر
  return 'success' // أكثر من شهر
}

// دالة لصياغة رسالة الأيام المتبقية
const formatDaysRemaining = (days: number | null): string => {
  if (days === null) return ''
  if (days < 0) return `متأخرة ${Math.abs(days)} يوم`
  if (days === 0) return 'اليوم!'
  if (days === 1) return 'غداً'
  if (days <= 7) return `${days} أيام متبقية`
  if (days <= 30) return `${days} يوم متبقي`
  const weeks = Math.floor(days / 7)
  return `${weeks} أسبوع متبقي`
}

const GoatNode = ({ member, label, color = "default" }: { member?: FamilyMember | null | Goat, label: string, color?: "default" | "primary" | "secondary" }) => (
  <Paper 
    elevation={member ? 2 : 0} 
    sx={{ 
      p: 1.5, 
      textAlign: 'center', 
      minWidth: 120, 
      bgcolor: member ? (color === "primary" ? 'primary.light' : color === "secondary" ? 'secondary.light' : 'background.paper') : 'action.hover',
      border: member ? 1 : 1,
      borderColor: member ? 'divider' : 'transparent',
      borderStyle: member ? 'solid' : 'dashed'
    }}
  >
    <Typography variant="caption" display="block" color="text.secondary" gutterBottom>
      {label}
    </Typography>
    {member ? (
      <>
        <Typography variant="body2" fontWeight="bold">
          {member.tagId}
        </Typography>
        <Typography variant="caption" display="block" noWrap sx={{ maxWidth: 100, mx: 'auto' }}>
          {member.name || '-'}
        </Typography>
        <Typography variant="caption" display="block" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
          {member.breed?.nameAr}
        </Typography>
      </>
    ) : (
      <Typography variant="caption" color="text.disabled">
        غير معروف
      </Typography>
    )}
  </Paper>
)


interface FamilyResponse {
  goat: Goat
  mother?: FamilyMember | null
  father?: FamilyMember | null
  siblings: FamilyMember[]
  offspring: FamilyMember[]
}

export default function GoatsPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { farm } = useAuth()
  const pageLabels = farmTypePageLabels[farm?.farmType || 'GOAT'] || farmTypePageLabels.GOAT
  const [goats, setGoats] = useState<Goat[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(25)
  const [open, setOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedGoat, setSelectedGoat] = useState<Goat | null>(null)
  const [familyData, setFamilyData] = useState<FamilyResponse | null>(null)
  const [familyLoading, setFamilyLoading] = useState(false)
  const [familyError, setFamilyError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [deathDialogOpen, setDeathDialogOpen] = useState(false)
  const [deathForm, setDeathForm] = useState({ date: new Date().toISOString().split('T')[0], notes: '' })
  const [selectedGoatIds, setSelectedGoatIds] = useState<string[]>([])
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [batchPenId, setBatchPenId] = useState('')
  const [types, setTypes] = useState<Array<{ id: string; nameAr: string }>>([])
  const [breeds, setBreeds] = useState<Array<{ id: string; nameAr: string }>>([])
  const [pens, setPens] = useState<Array<{ id: string; nameAr: string }>>([])
  
  // Advanced filters state
  const [filterGender, setFilterGender] = useState('ALL')
  const [filterAgeCategory, setFilterAgeCategory] = useState('ALL')
  const [filterType, setFilterType] = useState('ALL')
  const [filterBreed, setFilterBreed] = useState('ALL')
  const [filterPen, setFilterPen] = useState('ALL')
  const [filterPregnant, setFilterPregnant] = useState(false)
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [form, setForm] = useState({
    tagId: '',
    name: '',
    gender: 'MALE',
    birthDate: '',
    typeId: '',
    breedId: '',
    weight: '',
    status: 'ACTIVE',
    motherTagId: '',
    fatherTagId: '',
    penId: ''
  })

  useEffect(() => {
    loadGoats()
    loadTypes()
    loadPens()
  }, [])

  useEffect(() => {
    setPage(0)
  }, [searchTerm, filterStatus, goats.length, filterGender, filterAgeCategory, filterType, filterBreed, filterPen, filterPregnant])

  // Calculate statistics
  const activeGoats = goats.filter(g => ['ACTIVE', 'QUARANTINE'].includes(g.status))
  const stats = {
    total: activeGoats.length,
    males: activeGoats.filter(g => g.gender === 'MALE').length,
    females: activeGoats.filter(g => g.gender === 'FEMALE').length,
    weaningReady: activeGoats.filter(g => {
      const age = calculateGoatAge(g.birthDate)
      return age.totalMonths >= 3 && age.totalMonths < 5
    }).length,
    quarantine: activeGoats.filter(g => g.status === 'QUARANTINE').length,
    avgAge: activeGoats.length > 0 
      ? Math.round(activeGoats.reduce((sum, g) => {
          const age = calculateGoatAge(g.birthDate)
          return sum + age.totalMonths
        }, 0) / activeGoats.length) 
      : 0,
    totalWeight: Number(activeGoats.reduce((sum, g) => sum + (g.weight || 0), 0).toFixed(2))
  }

  // Export functions
  const exportToPDF = async () => {
    const data = filteredGoats.map(goat => {
      const age = calculateGoatAge(goat.birthDate)
      const status = goat.status === 'ACTIVE' ? 'نشط' : goat.status === 'QUARANTINE' ? 'حجر' : goat.status
      return {
        tagId: goat.tagId,
        name: goat.name || '-',
        gender: goat.gender === 'MALE' ? '♂' : '♀',
        typeNameAr: goat.breed.type.nameAr,
        breedNameAr: goat.breed.nameAr,
        age: `${age.years}س ${age.months}ش`,
        weight: goat.weight ? `${goat.weight} كجم` : '-',
        status
      }
    })
    
    await generateArabicPDF({
      title: `تقرير ${pageLabels.title}`,
      date: new Date().toLocaleDateString('en-GB'),
      stats: [
        { label: 'إجمالي القطيع', value: stats.total },
        { label: 'الذكور', value: stats.males },
        { label: 'الإناث', value: stats.females },
        { label: 'في الحجر', value: stats.quarantine },
        { label: 'جاهز للفطام', value: stats.weaningReady },
        { label: 'متوسط العمر', value: `${stats.avgAge} شهر` }
      ],
      columns: [
        { header: 'الحالة', dataKey: 'status', colorMap: { 'نشط': '#2e7d32', 'حجر': '#d32f2f' } },
        { header: 'الوزن', dataKey: 'weight' },
        { header: 'العمر', dataKey: 'age' },
        { header: 'السلالة', dataKey: 'breedNameAr' },
        { header: 'النوع', dataKey: 'typeNameAr' },
        { header: 'الجنس', dataKey: 'gender', colorMap: { '♂': '#0288d1', '♀': '#e91e63' } },
        { header: 'الاسم', dataKey: 'name' },
        { header: 'رقم التاج', dataKey: 'tagId' }
      ],
      data,
      totals: { tagId: 'الإجمالي', gender: `♂${stats.males} ♀${stats.females}` },
      filename: `goats-report-${new Date().toISOString().split('T')[0]}.pdf`
    })
  }

  const exportToExcel = () => {
    const statsSheet = XLSX.utils.json_to_sheet([
      { 'المؤشر': 'إجمالي القطيع', 'القيمة': stats.total },
      { 'المؤشر': 'الذكور', 'القيمة': stats.males },
      { 'المؤشر': 'الإناث', 'القيمة': stats.females },
      { 'المؤشر': 'جاهز للفطام', 'القيمة': stats.weaningReady },
      { 'المؤشر': 'حجر صحي', 'القيمة': stats.quarantine },
      { 'المؤشر': 'متوسط العمر (شهر)', 'القيمة': stats.avgAge },
      { 'المؤشر': 'إجمالي الوزن (كجم)', 'القيمة': stats.totalWeight }
    ])
    
    const goatsData = filteredGoats.map(goat => {
      const age = calculateGoatAge(goat.birthDate)
      return {
        'رقم التاج': goat.tagId,
        'الاسم': goat.name || '-',
        'الجنس': goat.gender === 'MALE' ? 'ذكر' : 'أنثى',
        'النوع': goat.breed.type.nameAr,
        'السلالة': goat.breed.nameAr,
        'تاريخ الميلاد': formatDate(goat.birthDate),
        'العمر (سنوات)': age.years,
        'العمر (شهور)': age.months,
        'العمر (أيام)': age.days,
        'الفئة العمرية': age.category === 'kid' ? 'رضيع' : age.category === 'young' ? 'جذع' : age.category === 'juvenile' ? 'يافع' : 'بالغ',
        'الوزن (كجم)': goat.weight || '-',
        'الحظيرة': goat.pen?.nameAr || '-',
        'الحالة': goat.status === 'ACTIVE' ? 'نشط' : goat.status === 'QUARANTINE' ? 'حجر صحي' : goat.status === 'SOLD' ? 'مباع' : 'متوفى',
        'رقم الأم': goat.motherTagId || '-',
        'رقم الأب': goat.fatherTagId || '-',
        'ملاحظات': goat.notes || '-'
      }
    })
    const goatsSheet = XLSX.utils.json_to_sheet(goatsData)
    
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, statsSheet, 'الإحصائيات')
    XLSX.utils.book_append_sheet(wb, goatsSheet, `قائمة ${pageLabels.animalPlural}`)
    
    XLSX.writeFile(wb, `goats-report-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const loadGoats = async () => {
    try {
      const res = await fetch('/api/goats')
      const data = await res.json()
      setGoats(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('خطأ في جلب البيانات:', error)
      setGoats([])
    } finally {
      setLoading(false)
    }
  }

  const loadTypes = async () => {
    try {
      const res = await fetch('/api/types')
      const data = await res.json()
      setTypes(Array.isArray(data) ? data : [])
    } catch {
      setTypes([])
    }
  }

  const loadBreeds = async (typeId: string) => {
    try {
      const res = await fetch(`/api/breeds?typeId=${typeId}`)
      const data = await res.json()
      setBreeds(Array.isArray(data) ? data : [])
    } catch {
      setBreeds([])
    }
  }

  const loadPens = async () => {
    try {
      const res = await fetch('/api/pens')
      if (res.ok) {
        const data = await res.json()
        setPens(data)
      }
    } catch {
      setPens([])
    }
  }

  const handleOpen = () => {
    setEditMode(false)
    setSelectedGoat(null) // Clear any selected goat
    setForm({ 
      tagId: '', 
      name: '', 
      gender: 'MALE', 
      birthDate: '', 
      typeId: '', 
      breedId: '', 
      weight: '', 
      status: 'ACTIVE', 
      motherTagId: '', 
      fatherTagId: '',
      penId: ''
    })
    setOpen(true)
    loadPens()
    if (types.length === 0) {
      loadTypes()
    }
  }

  const handleClose = () => {
    setOpen(false)
    setEditMode(false)
    setSelectedGoat(null)
    setForm({ 
      tagId: '', 
      name: '', 
      gender: 'MALE', 
      birthDate: '', 
      typeId: '', 
      breedId: '', 
      weight: '', 
      status: 'ACTIVE',
      motherTagId: '',
      fatherTagId: '',
      penId: ''
    })
  }

  const handleView = async (goat: Goat) => {
    setSelectedGoat(goat)
    setViewDialogOpen(true)
    setFamilyLoading(true)
    setFamilyData(null)
    setFamilyError(null)
    try {
      const res = await fetch(`/api/goats/${goat.id}/family`)
      const data = await res.json()
      if (!res.ok) {
        setFamilyError(data?.error || 'تعذر تحميل بيانات العائلة')
        setFamilyData(null)
        return
      }
      setFamilyData(data)
    } catch {
      setFamilyError('تعذر الاتصال بخدمة العائلة')
      setFamilyData(null)
    } finally {
      setFamilyLoading(false)
    }
  }

  const handleAddOffspring = async (mother: Goat) => {
    setViewDialogOpen(false) // Close view dialog if open
    setEditMode(false)
    
    // تحميل الأنواع والتأكد منها
    if (types.length === 0) await loadTypes()
    
    // تحميل السلالات للنوع المحدد
    await loadBreeds(mother.breed.type.id)
    loadPens()

    setForm({
      tagId: '',
      name: '',
      gender: 'MALE',
      birthDate: new Date().toISOString().split('T')[0], // Default to today
      typeId: mother.breed.type.id,
      breedId: mother.breed.id,
      weight: '',
      status: 'ACTIVE',
      motherTagId: mother.tagId,
      fatherTagId: '',
      penId: (mother as any).penId || ''
    })
    setOpen(true)
  }

  const handleEdit = async (goat: Goat) => {
    setEditMode(true)
    setSelectedGoat(goat)
    
    // تحميل الأنواع أولاً
    await loadTypes()
    loadPens()
    
    // تحميل السلالات للنوع المحدد
    await loadBreeds(goat.breed.type.id)
    
    setForm({
      tagId: goat.tagId,
      name: goat.name || '',
      gender: goat.gender,
      birthDate: goat.birthDate.split('T')[0],
      typeId: goat.breed.type.id,
      breedId: goat.breed.id,
      weight: goat.weight?.toString() || '',
      status: goat.status,
      motherTagId: goat.motherTagId || '',
      fatherTagId: goat.fatherTagId || '',
      penId: (goat as any).penId || ''
    })
    setOpen(true)
  }

  const handleDeleteClick = (goat: Goat) => {
    setSelectedGoat(goat)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!selectedGoat) return
    
    try {
      await fetch(`/api/goats/${selectedGoat.id}`, {
        method: 'DELETE'
      })
      setDeleteDialogOpen(false)
      setSelectedGoat(null)
      loadGoats()
    } catch (error) {
      console.error('خطأ في الحذف:', error)
    }
  }

  const handleSubmit = async () => {
    const payload = {
      tagId: form.tagId,
      name: form.name || null,
      gender: form.gender,
      birthDate: new Date(form.birthDate),
      breedId: form.breedId,
      weight: form.weight ? Number(form.weight) : null,
      status: form.status,
      penId: form.penId || null
    }

    const url = editMode && selectedGoat ? `/api/goats/${selectedGoat.id}` : '/api/goats'
    const method = editMode ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const savedGoat = await res.json()

    // تحديث النسب إذا تم تغييره أو في وضع التعديل (للسماح بالحذف)
    if (form.motherTagId !== '' || form.fatherTagId !== '' || editMode) {
      const parentageRes = await fetch(`/api/goats/${savedGoat.id ?? selectedGoat?.id}/parentage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motherTagId: form.motherTagId || null,
          fatherTagId: form.fatherTagId || null
        })
      })

      if (!parentageRes.ok) {
        const errorData = await parentageRes.json()
        alert(`تم الحفظ ولكن فشل تحديث النسب: ${errorData.error}`)
      }
    }

    setForm({ tagId: '', name: '', gender: 'MALE', birthDate: '', typeId: '', breedId: '', weight: '', status: 'ACTIVE', motherTagId: '', fatherTagId: '', penId: '' })
    setOpen(false)
    setEditMode(false)
    setSelectedGoat(null)
    loadGoats()
  }

  const filteredGoats = goats.filter(goat => {
    const matchesSearch = 
      goat.tagId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      goat.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      goat.breed.nameAr.includes(searchTerm)
    
    // Weaning Filter Logic
    if (filterStatus === 'WEANING_READY') {
      const age = calculateGoatAge(goat.birthDate)
      return matchesSearch && goat.status === 'ACTIVE' && age.totalMonths >= 3 && age.totalMonths < 5
    }
    
    const matchesStatus = 
      filterStatus === 'ALL' ? ['ACTIVE', 'QUARANTINE'].includes(goat.status) :
      filterStatus === 'ARCHIVE' ? ['SOLD', 'DECEASED'].includes(goat.status) :
      goat.status === filterStatus

    // Advanced filters
    const matchesGender = filterGender === 'ALL' || goat.gender === filterGender
    
    const age = calculateGoatAge(goat.birthDate)
    const matchesAgeCategory = filterAgeCategory === 'ALL' || 
      (filterAgeCategory === 'kid' && age.category === 'kid') ||
      (filterAgeCategory === 'young' && age.category === 'young') ||
      (filterAgeCategory === 'juvenile' && age.category === 'juvenile') ||
      (filterAgeCategory === 'adult' && age.category === 'adult')
    
    const matchesType = filterType === 'ALL' || goat.breed.type.id === filterType
    const matchesBreed = filterBreed === 'ALL' || goat.breed.id === filterBreed
    const matchesPen = filterPen === 'ALL' || (goat as any).penId === filterPen
    
    // Pregnancy filter
    const matchesPregnancy = !filterPregnant || (goat.gender === 'FEMALE' && goat.pregnancyStatus)

    return matchesSearch && matchesStatus && matchesGender && matchesAgeCategory && matchesType && matchesBreed && matchesPen && matchesPregnancy
  }).sort((a, b) => {
    // ترتيب تنازلي حسب تاريخ الولادة المتوقع (الماعز الحوامل أولاً)
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    }
    if (a.dueDate && !b.dueDate) return -1
    if (!a.dueDate && b.dueDate) return 1
    return 0
  })

  const paginatedGoats = filteredGoats.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  )

  // Calculate stats for alerts
  const weaningCandidates = goats.filter(g => {
    const age = calculateGoatAge(g.birthDate)
    return g.status === 'ACTIVE' && age.totalMonths >= 3 && age.totalMonths < 5
  }).length
  
  const pregnantGoats = goats.filter(g => g.gender === 'FEMALE' && g.pregnancyStatus).length
  const upcomingBirths = goats.filter(g => {
    if (!g.dueDate || g.gender !== 'FEMALE') return false
    const days = getDaysRemaining(g.dueDate)
    return days !== null && days >= 0 && days <= 7
  }).length
  const overdueBirths = goats.filter(g => {
    if (!g.dueDate || g.gender !== 'FEMALE') return false
    const days = getDaysRemaining(g.dueDate)
    return days !== null && days < 0
  }).length

  const handleOpenDeathDialog = (goat: Goat) => {
    setSelectedGoat(goat)
    setDeathForm({ date: new Date().toISOString().split('T')[0], notes: '' })
    setDeathDialogOpen(true)
  }

  const handleRecordDeath = async () => {
    if (!selectedGoat) return

    try {
      const res = await fetch(`/api/goats/${selectedGoat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'DECEASED',
          notes: selectedGoat.notes ? `${selectedGoat.notes}\n[تم تسجيل النفوق بتاريخ ${formatDate(deathForm.date)}]: ${deathForm.notes}` : `[تم تسجيل النفوق بتاريخ ${formatDate(deathForm.date)}]: ${deathForm.notes}`
        })
      })

      if (res.ok) {
        setDeathDialogOpen(false)
        loadGoats()
      }
    } catch (error) {
      console.error('Failed to record death:', error)
    }
  }
  
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelecteds = filteredGoats.map((n) => n.id)
      setSelectedGoatIds(newSelecteds)
    } else {
      setSelectedGoatIds([])
    }
  }

  const handleSelectOne = (event: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const selectedIndex = selectedGoatIds.indexOf(id)
    let newSelected: string[] = []

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selectedGoatIds, id)
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selectedGoatIds.slice(1))
    } else if (selectedIndex === selectedGoatIds.length - 1) {
      newSelected = newSelected.concat(selectedGoatIds.slice(0, -1))
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selectedGoatIds.slice(0, selectedIndex),
        selectedGoatIds.slice(selectedIndex + 1),
      )
    }
    setSelectedGoatIds(newSelected)
  }

  const handleBatchTransfer = async () => {
    if (selectedGoatIds.length === 0) return

    try {
      const res = await fetch('/api/goats/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goatIds: selectedGoatIds,
          penId: batchPenId || null
        })
      })

      const data = await res.json()

      if (res.ok) {
        setBatchDialogOpen(false)
        setBatchPenId('')
        setSelectedGoatIds([])
        loadGoats()
        alert('تم النقل الجماعي بنجاح')
      } else {
        alert(data.error || 'فشل في عملية النقل')
      }
    } catch (error) {
       alert('حدث خطأ أثناء النقل')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success'
      case 'SOLD': return 'info'
      case 'DECEASED': return 'error'
      case 'QUARANTINE': return 'warning'
      default: return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'نشط'
      case 'SOLD': return 'مباع'
      case 'DECEASED': return 'متوفى'
      case 'QUARANTINE': return 'حجر صحي'
      default: return status
    }
  }

  const statusFilterLabelMap: Record<string, string> = {
    ALL: 'القطيع الحالي',
    WEANING_READY: 'جاهز للفطام',
    ARCHIVE: 'الأرشيف (مباع/متوفى)',
    ACTIVE: 'نشط',
    SOLD: 'مباع',
    QUARANTINE: 'حجر صحي',
    DECEASED: 'متوفى'
  }

  return (
    <Box sx={{ width: '100%', overflowX: 'hidden' }}>
      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
                <PetsIcon color="primary" />
                <Typography variant="h4" fontWeight="bold" color="primary">
                  {stats.total}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" mt={1}>
                إجمالي القطيع
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
                <MaleIcon sx={{ color: maleIconColor }} />
                <Typography variant="h4" fontWeight="bold" sx={{ color: maleIconColor }}>
                  {stats.males}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" mt={1}>
                الذكور
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
                <FemaleIcon sx={{ color: femaleIconColor }} />
                <Typography variant="h4" fontWeight="bold" sx={{ color: femaleIconColor }}>
                  {stats.females}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" mt={1}>
                الإناث
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card sx={{ height: '100%', bgcolor: stats.weaningReady > 0 ? 'warning.light' : 'background.paper' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
                {stats.weaningReady > 0 && <WarningIcon color="warning" />}
                <Typography variant="h4" fontWeight="bold" color={stats.weaningReady > 0 ? 'warning.main' : 'text.secondary'}>
                  {stats.weaningReady}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" mt={1}>
                جاهز للفطام
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
                <TrendingUpIcon color="secondary" />
                <Typography variant="h4" fontWeight="bold" color="secondary">
                  {stats.avgAge}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" mt={1}>
                متوسط العمر (شهر)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
                <ScaleIcon color="success" />
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {stats.totalWeight.toFixed(2)}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" mt={1}>
                إجمالي الوزن (كجم)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Smart Alerts */}
      {(stats.weaningReady > 0 || stats.quarantine > 0) && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'warning.light', border: '1px solid', borderColor: 'warning.main' }}>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <WarningIcon color="warning" />
              <Typography variant="h6" fontWeight="bold" color="warning.dark">
                تنبيهات ذكية
              </Typography>
            </Stack>
            
            {stats.weaningReady > 0 && (
              <Paper sx={{ p: 2, bgcolor: 'background.paper', cursor: 'pointer' }} onClick={() => setFilterStatus('WEANING_READY')}>
                <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                  <PetsIcon color="info" />
                  <Typography variant="subtitle1" fontWeight="bold" color="info.main">
                    جاهز للفطام
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  يوجد {stats.weaningReady} مولود جاهز للفطام (عمر 3-5 أشهر). انقر للعرض.
                </Typography>
              </Paper>
            )}
            
            {upcomingBirths > 0 && (
              <Paper sx={{ p: 2, bgcolor: 'background.paper', border: '1px solid', borderColor: 'warning.main', cursor: 'pointer' }} onClick={() => setFilterPregnant(true)}>
                <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                  <PregnantIcon sx={{ color: 'warning.main' }} />
                  <Typography variant="subtitle1" fontWeight="bold" color="warning.dark">
                    ولادات قريبة
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  يوجد {upcomingBirths} ماعز متوقع ولادتها خلال 7 أيام. انقر للعرض.
                </Typography>
              </Paper>
            )}
            
            {overdueBirths > 0 && (
              <Paper sx={{ p: 2, bgcolor: 'error.light', border: '1px solid', borderColor: 'error.main', cursor: 'pointer' }} onClick={() => setFilterPregnant(true)}>
                <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                  <WarningIcon color="error" />
                  <Typography variant="subtitle1" fontWeight="bold" color="error.main">
                    ولادات متأخرة
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  يوجد {overdueBirths} ماعز تجاوزت موعد الولادة المتوقع. يُرجى الفحص.
                </Typography>
              </Paper>
            )}

            {stats.quarantine > 0 && (
              <Paper sx={{ p: 2, bgcolor: 'error.light' }}>
                <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                  <WarningIcon color="error" />
                  <Typography variant="subtitle1" fontWeight="bold" color="error">
                    حجر صحي
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  يوجد {stats.quarantine} حيوان في الحجر الصحي. تابع حالتهم الصحية.
                </Typography>
              </Paper>
            )}
          </Stack>
        </Paper>
      )}

      {/* Alerts Section */}
      {weaningCandidates > 0 && (
         <Alert 
           severity="info" 
           sx={{ mb: 2, cursor: 'pointer' }}
           onClick={() => setFilterStatus('WEANING_READY')}
           action={
             <Button color="inherit" size="small" onClick={() => setFilterStatus('WEANING_READY')}>
               عرض القائمة ({weaningCandidates})
             </Button>
           }
         >
           <AlertTitle>تنبيه الفطام</AlertTitle>
           يوجد <strong>{weaningCandidates}</strong> مواليد جاهزون للفطام (عمر 3-5 أشهر).
         </Alert>
      )}
      
      {pregnantGoats > 0 && (
         <Alert 
           severity="success" 
           sx={{ mb: 2, cursor: 'pointer' }}
           onClick={() => setFilterPregnant(true)}
           action={
             <Button color="inherit" size="small" onClick={() => setFilterPregnant(true)}>
               عرض الحوامل ({pregnantGoats})
             </Button>
           }
         >
           <AlertTitle>الإناث الحوامل</AlertTitle>
           يوجد <strong>{pregnantGoats}</strong> حامل 
           {upcomingBirths > 0 && <>, منها <strong>{upcomingBirths}</strong> متوقع ولادتها خلال أسبوع</>}.
         </Alert>
      )}

      <Paper sx={{ p: { xs: 1.5, sm: 3 }, mb: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} mb={2} spacing={1.5}>
          <Box>
            <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold" gutterBottom>
              {pageLabels.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              إجمالي: {filteredGoats.length} حيوان
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1}>
              <Button
                variant="outlined"
                size="small"
                onClick={exportToPDF}
                sx={{ color: 'error.main', borderColor: 'error.main' }}
                startIcon={<ExportIcon />}
                fullWidth={isMobile}
              >
                PDF
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={exportToExcel}
                sx={{ color: 'success.main', borderColor: 'success.main' }}
                startIcon={<ExportIcon />}
                fullWidth={isMobile}
              >
                Excel
              </Button>
              {!isMobile && (
                <>
                  <Button
                    variant={viewMode === 'table' ? 'contained' : 'outlined'}
                    size="small"
                    startIcon={<ListViewIcon />}
                    onClick={() => setViewMode('table')}
                  >
                    جدول
                  </Button>
                  <Button
                    variant={viewMode === 'grid' ? 'contained' : 'outlined'}
                    size="small"
                    startIcon={<GridViewIcon />}
                    onClick={() => setViewMode('grid')}
                  >
                    شبكة
                  </Button>
                </>
              )}
              {selectedGoatIds.length > 0 && (
                <Button 
                   variant="contained" 
                   color="warning" 
                   startIcon={<MoveIcon />}
                   onClick={() => {
                     loadPens()
                     setBatchDialogOpen(true)
                   }}
                   fullWidth={isMobile}
                >
                   نقل جماعي ({selectedGoatIds.length})
                </Button>
              )}
            <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpen}
                 fullWidth={isMobile}
            >
                إضافة جديد
            </Button>
          </Stack>
        </Stack>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mt={2}>
          <TextField
            placeholder="بحث برقم التاج، الاسم، أو السلالة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <FormControl sx={{ minWidth: { xs: '100%', md: 200 } }}>
            <InputLabel>الحالة</InputLabel>
            <Select
              value={filterStatus}
              label="الحالة"
              renderValue={(value) => statusFilterLabelMap[String(value)] || String(value)}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="ALL">القطيع الحالي</MenuItem>
              <MenuItem value="WEANING_READY">جاهز للفطام</MenuItem>
              <MenuItem value="ARCHIVE">الأرشيف (مباع/متوفى)</MenuItem>
              <Divider />
              <MenuItem value="ACTIVE">نشط</MenuItem>
              <MenuItem value="SOLD">مباع</MenuItem>
              <MenuItem value="QUARANTINE">حجر صحي</MenuItem>
              <MenuItem value="DECEASED">متوفى</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        {/* Advanced Filters */}
        <Box mt={2}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Button
              size="small"
              variant="text"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              startIcon={<FilterIcon />}
            >
              {showAdvancedFilters ? 'إخفاء' : 'عرض'} الفلاتر المتقدمة
            </Button>
            
            {pregnantGoats > 0 && (
              <Chip 
                icon={<PregnantIcon />}
                label={`الحوامل فقط (${pregnantGoats})`}
                color={filterPregnant ? 'secondary' : 'default'}
                onClick={() => setFilterPregnant(!filterPregnant)}
                onDelete={filterPregnant ? () => setFilterPregnant(false) : undefined}
                sx={{ cursor: 'pointer' }}
              />
            )}
          </Stack>
          
          {showAdvancedFilters && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>الجنس</InputLabel>
                  <Select
                    value={filterGender}
                    label="الجنس"
                    onChange={(e) => setFilterGender(e.target.value)}
                  >
                    <MenuItem value="ALL">الكل</MenuItem>
                    <MenuItem value="MALE">ذكر</MenuItem>
                    <MenuItem value="FEMALE">أنثى</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>الفئة العمرية</InputLabel>
                  <Select
                    value={filterAgeCategory}
                    label="الفئة العمرية"
                    onChange={(e) => setFilterAgeCategory(e.target.value)}
                  >
                    <MenuItem value="ALL">الكل</MenuItem>
                    <MenuItem value="kid">رضيع (0-6 شهور)</MenuItem>
                    <MenuItem value="young">جذع (6-12 شهر)</MenuItem>
                    <MenuItem value="juvenile">يافع (1-2 سنة)</MenuItem>
                    <MenuItem value="adult">بالغ (2+ سنة)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>النوع</InputLabel>
                  <Select
                    value={filterType}
                    label="النوع"
                    onChange={(e) => {
                      setFilterType(e.target.value)
                      setFilterBreed('ALL')
                      if (e.target.value !== 'ALL') {
                        loadBreeds(e.target.value)
                      }
                    }}
                  >
                    <MenuItem value="ALL">الكل</MenuItem>
                    {types.map(type => (
                      <MenuItem key={type.id} value={type.id}>{type.nameAr}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>السلالة</InputLabel>
                  <Select
                    value={filterBreed}
                    label="السلالة"
                    onChange={(e) => setFilterBreed(e.target.value)}
                    disabled={filterType === 'ALL'}
                  >
                    <MenuItem value="ALL">الكل</MenuItem>
                    {breeds.map(breed => (
                      <MenuItem key={breed.id} value={breed.id}>{breed.nameAr}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>الحظيرة</InputLabel>
                  <Select
                    value={filterPen}
                    label="الحظيرة"
                    onChange={(e) => setFilterPen(e.target.value)}
                  >
                    <MenuItem value="ALL">الكل</MenuItem>
                    {pens.map(pen => (
                      <MenuItem key={pen.id} value={pen.id}>{pen.nameAr}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          )}
        </Box>
      </Paper>

      {/* Mobile Cards View */}
      {isMobile ? (
        <Box sx={{ mt: 2 }}>
          <Stack spacing={2}>
            {paginatedGoats.map((goat) => {
              const age = calculateGoatAge(goat.birthDate)
              const isSelected = selectedGoatIds.indexOf(goat.id) !== -1
              return (
                <Card 
                  key={goat.id}
                  sx={{ 
                    borderRadius: 3,
                    border: isSelected ? 2 : 1,
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    position: 'relative'
                  }}
                >
                  <Checkbox
                    checked={isSelected}
                    onChange={(event) => handleSelectOne(event, goat.id)}
                    sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
                  />
                  <CardContent>
                    <Stack spacing={2}>
                      {/* Header */}
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ pr: 5 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip 
                            label={goat.tagId} 
                            color="primary" 
                            sx={{ fontSize: '1.1rem', fontWeight: 'bold', px: 2 }}
                          />
                          {goat.gender === 'MALE' ? (
                            <MaleIcon sx={{ color: maleIconColor, fontSize: 32 }} />
                          ) : (
                            <FemaleIcon sx={{ color: femaleIconColor, fontSize: 32 }} />
                          )}
                        </Stack>
                        <Chip 
                          label={getStatusLabel(goat.status)} 
                          color={getStatusColor(goat.status)} 
                          size="small"
                        />
                      </Stack>

                      {goat.name && (
                        <Typography variant="h6" fontWeight="bold">{goat.name}</Typography>
                      )}

                      <Divider />

                      {/* Details Grid */}
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="body2" color="text.secondary">النوع</Typography>
                          <Typography variant="body1" fontWeight="bold">{goat.breed.type.nameAr}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="body2" color="text.secondary">السلالة</Typography>
                          <Typography variant="body1">{goat.breed.nameAr}</Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="body2" color="text.secondary">العمر</Typography>
                          <Typography variant="body1">{age.years}س {age.months}ش {age.days}ي</Typography>
                        </Grid>
                        {goat.weight && (
                          <Grid size={{ xs: 6 }}>
                            <Typography variant="body2" color="text.secondary">الوزن</Typography>
                            <Typography variant="body1" fontWeight="bold" color="primary.main">
                              {goat.weight} كجم
                            </Typography>
                          </Grid>
                        )}
                        {goat.pen && (
                          <Grid size={{ xs: 12 }}>
                            <Typography variant="body2" color="text.secondary">الحظيرة</Typography>
                            <Chip label={goat.pen.nameAr} size="small" color="default" sx={{ mt: 0.5 }} />
                          </Grid>
                        )}
                      </Grid>

                      {/* حالة الحمل للإناث */}
                      {goat.gender === 'FEMALE' && goat.pregnancyStatus && goat.dueDate && (
                        <Box>
                          {(() => {
                            const daysRemaining = getDaysRemaining(goat.dueDate)
                            const chipColor = getPregnancyColor(daysRemaining)
                            return (
                              <>
                                <Chip 
                                  icon={<PregnantIcon />}
                                  label={'🤰 حامل'}
                                  color={chipColor}
                                  size="small"
                                  sx={{ fontWeight: 'bold' }}
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                  {formatDaysRemaining(daysRemaining)} • {new Date(goat.dueDate).toLocaleDateString('en-GB')}
                                </Typography>
                              </>
                            )
                          })()}
                        </Box>
                      )}

                      {age.totalMonths >= 3 && age.totalMonths < 5 && goat.status === 'ACTIVE' && (
                        <Box>
                          <Chip 
                            label="🍼 جاهز للفطام" 
                            color="warning" 
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                          />
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'flex-end', px: 2, gap: 0.5 }}>
                    <IconButton size="small" color="info" onClick={() => handleView(goat)} title="عرض">
                      <ViewIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" color="primary" onClick={() => handleEdit(goat)} title="تعديل">
                      <EditIcon fontSize="small" />
                    </IconButton>
                    {goat.status === 'ACTIVE' && (
                      <IconButton size="small" color="error" onClick={() => handleOpenDeathDialog(goat)} title="وفاة">
                        <DeathIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton size="small" color="warning" onClick={() => handleDeleteClick(goat)} title="حذف">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </CardActions>
                </Card>
              )
            })}
          </Stack>
        </Box>
      ) : viewMode === 'grid' ? (
        /* Desktop Grid View */
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {paginatedGoats.map((goat) => {
            const age = calculateGoatAge(goat.birthDate)
            const isSelected = selectedGoatIds.indexOf(goat.id) !== -1
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={goat.id}>
                <Card 
                  sx={{ 
                    height: '100%', 
                    position: 'relative',
                    border: isSelected ? 2 : 1,
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    '&:hover': { boxShadow: 6 }
                  }}
                >
                  <Checkbox
                    checked={isSelected}
                    onChange={(event) => handleSelectOne(event, goat.id)}
                    sx={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }}
                  />
                  <CardContent>
                    <Stack spacing={2}>
                      <Stack direction="row" justifyContent="center" spacing={1}>
                        <Chip 
                          label={goat.tagId} 
                          color="primary" 
                          size="medium"
                          sx={{ fontSize: '1rem', fontWeight: 'bold' }}
                        />
                        {goat.gender === 'MALE' ? (
                          <MaleIcon sx={{ color: maleIconColor, fontSize: 32 }} />
                        ) : (
                          <FemaleIcon sx={{ color: femaleIconColor, fontSize: 32 }} />
                        )}
                      </Stack>
                      
                      <Typography variant="h6" textAlign="center" fontWeight="bold">
                        {goat.name || '-'}
                      </Typography>
                      
                      <Divider />
                      
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">النوع:</Typography>
                          <Typography variant="body2" fontWeight="bold">{goat.breed.type.nameAr}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">السلالة:</Typography>
                          <Typography variant="body2">{goat.breed.nameAr}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">العمر:</Typography>
                          <Typography variant="body2">{age.years}س {age.months}ش {age.days}ي</Typography>
                        </Stack>
                        {goat.weight && (
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption" color="text.secondary">الوزن:</Typography>
                            <Typography variant="body2">{goat.weight} كجم</Typography>
                          </Stack>
                        )}
                        {goat.pen && (
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="caption" color="text.secondary">الحظيرة:</Typography>
                            <Typography variant="body2">{goat.pen.nameAr}</Typography>
                          </Stack>
                        )}
                      </Stack>
                      
                      <Stack direction="row" justifyContent="center" flexWrap="wrap" gap={0.5}>
                        <Chip 
                          label={getStatusLabel(goat.status)} 
                          color={getStatusColor(goat.status)} 
                          size="small"
                        />
                        {goat.gender === 'FEMALE' && goat.pregnancyStatus && goat.dueDate && (() => {
                          const daysRemaining = getDaysRemaining(goat.dueDate)
                          const chipColor = getPregnancyColor(daysRemaining)
                          return (
                            <Chip 
                              icon={<PregnantIcon />}
                              label="حامل"
                              color={chipColor}
                              size="small"
                            />
                          )
                        })()}
                        {age.totalMonths >= 3 && age.totalMonths < 5 && goat.status === 'ACTIVE' && (
                          <Chip 
                            label="جاهز للفطام" 
                            color="warning" 
                            size="small"
                          />
                        )}
                      </Stack>
                      
                      {goat.gender === 'FEMALE' && goat.dueDate && (() => {
                        const daysRemaining = getDaysRemaining(goat.dueDate)
                        return (
                          <Typography variant="caption" color="text.secondary" align="center">
                            {formatDaysRemaining(daysRemaining)} • {new Date(goat.dueDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}
                          </Typography>
                        )
                      })()}
                    </Stack>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <IconButton size="small" color="info" onClick={() => handleView(goat)}>
                      <ViewIcon />
                    </IconButton>
                    <IconButton size="small" color="primary" onClick={() => handleEdit(goat)}>
                      <EditIcon />
                    </IconButton>
                    {goat.status === 'ACTIVE' && (
                      <IconButton size="small" color="error" onClick={() => handleOpenDeathDialog(goat)}>
                        <DeathIcon />
                      </IconButton>
                    )}
                    <IconButton size="small" color="warning" onClick={() => handleDeleteClick(goat)}>
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      ) : (
      <TableContainer component={Paper} sx={{ borderRadius: 3, mt: 2, overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  color="primary"
                  indeterminate={selectedGoatIds.length > 0 && selectedGoatIds.length < filteredGoats.length}
                  checked={filteredGoats.length > 0 && selectedGoatIds.length === filteredGoats.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell><strong>رقم التاج</strong></TableCell>
              <TableCell><strong>السلالة</strong></TableCell>
              <TableCell><strong>الجنس</strong></TableCell>
              <TableCell><strong>الحمل</strong></TableCell>
              <TableCell><strong>العمر</strong></TableCell>
              <TableCell><strong>الحظيرة</strong></TableCell>
              <TableCell><strong>الحالة</strong></TableCell>
              <TableCell><strong>الإجراءات</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">جاري التحميل...</TableCell>
              </TableRow>
            ) : filteredGoats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">لا توجد بيانات</TableCell>
              </TableRow>
            ) : (
              paginatedGoats.map((goat) => (
                <TableRow key={goat.id} hover selected={selectedGoatIds.indexOf(goat.id) !== -1}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      color="primary"
                      checked={selectedGoatIds.indexOf(goat.id) !== -1}
                      onChange={(event) => handleSelectOne(event, goat.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip label={goat.tagId} color="primary" size="small" />
                  </TableCell>
                  <TableCell>{goat.breed.nameAr}</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {goat.gender === 'MALE' ? (
                        <>
                          <MaleIcon sx={{ color: maleIconColor }} />
                          <span>ذكر</span>
                        </>
                      ) : (
                        <>
                          <FemaleIcon sx={{ color: femaleIconColor }} />
                          <span>أنثى</span>
                        </>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {goat.gender === 'FEMALE' && goat.pregnancyStatus && goat.dueDate ? (
                      <Stack spacing={0.5} alignItems="center">
                        {(() => {
                          const daysRemaining = getDaysRemaining(goat.dueDate)
                          const chipColor = getPregnancyColor(daysRemaining)
                          return (
                            <>
                              <Chip 
                                icon={<PregnantIcon />}
                                label="🤰 حامل"
                                color={chipColor}
                                size="small"
                              />
                              <Typography variant="caption" color="text.secondary">
                                {formatDaysRemaining(daysRemaining)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                {new Date(goat.dueDate).toLocaleDateString('en-GB')}
                              </Typography>
                            </>
                          )
                        })()}
                      </Stack>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {goat.age ? (
                      <Stack>
                        <Typography variant="body2" fontWeight="bold">
                          {goat.age.formatted}
                        </Typography>
                        <Chip 
                          label={goat.age.category} 
                          size="small" 
                          variant="outlined"
                          color="secondary"
                        />
                      </Stack>
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    {goat.pen ? (
                      <Chip label={goat.pen.nameAr} size="small" variant="outlined" />
                    ) : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getStatusLabel(goat.status)} 
                      color={getStatusColor(goat.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <IconButton 
                        size="small" 
                        color="primary" 
                        onClick={() => handleView(goat)}
                        title="عرض التفاصيل"
                      >
                        <ViewIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="success" 
                        onClick={() => handleEdit(goat)}
                        title="تعديل"
                      >
                        <EditIcon />
                      </IconButton>
                      {['ACTIVE', 'QUARANTINE'].includes(goat.status) && (
                        <IconButton
                          size="small" 
                          color="error"
                          onClick={() => handleOpenDeathDialog(goat)}
                          title="تسجيل نفوق"
                        >
                          <DeathIcon />
                        </IconButton>
                      )}
                      <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => {
                          setSelectedGoat(goat)
                          setDeleteDialogOpen(true)
                        }}
                        title="حذف"
                      >
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
      )}

      <TablePagination
        component="div"
        count={filteredGoats.length}
        page={page}
        onPageChange={(_event, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => {
          setRowsPerPage(parseInt(event.target.value, 10))
          setPage(0)
        }}
        rowsPerPageOptions={[10, 25, 50, 100]}
        labelRowsPerPage="عدد الصفوف"
      />

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle>{editMode ? `تعديل ${pageLabels.animal}` : `إضافة ${pageLabels.animal} جديد`}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={1}>
            <TextField
              label="رقم التاج"
              value={form.tagId}
              onChange={(e) => setForm({ ...form, tagId: e.target.value })}
              required
            />
            <TextField
              label="الاسم"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <FormControl>
              <InputLabel>النوع</InputLabel>
              <Select
                value={form.typeId}
                label="النوع"
                renderValue={(value) => {
                  const selectedType = types.find((item) => item.id === value)
                  return selectedType?.nameAr || 'نوع غير متوفر'
                }}
                onChange={(e) => {
                  const typeId = e.target.value
                  setForm({ ...form, typeId, breedId: '' })
                  if (typeId) {
                    loadBreeds(typeId)
                  } else {
                    setBreeds([])
                  }
                }}
                required
              >
                {types.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.nameAr}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>السلالة</InputLabel>
              <Select
                value={form.breedId}
                label="السلالة"
                renderValue={(value) => {
                  const selectedBreed = breeds.find((item) => item.id === value)
                  return selectedBreed?.nameAr || 'سلالة غير متوفرة'
                }}
                onChange={(e) => setForm({ ...form, breedId: e.target.value })}
                required
                disabled={!form.typeId}
              >
                {breeds.map((b) => (
                  <MenuItem key={b.id} value={b.id}>
                    {b.nameAr}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>الجنس</InputLabel>
              <Select
                value={form.gender}
                label="الجنس"
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
              >
                <MenuItem value="MALE">ذكر</MenuItem>
                <MenuItem value="FEMALE">أنثى</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="تاريخ الميلاد"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={form.birthDate}
              onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
              required
            />
            <FormControl fullWidth>
              <InputLabel>الأم (اختياري)</InputLabel>
              <Select
                value={form.motherTagId}
                label="الأم (اختياري)"
                onChange={(e) => setForm({ ...form, motherTagId: e.target.value })}
                disabled={!editMode && selectedGoat?.gender === 'FEMALE'}
              >
                <MenuItem value="">
                  <em>غير محدد</em>
                </MenuItem>
                {/* 
                  When adding offspring for a specific mother (!editMode && selectedGoat), 
                  we force that mother to be in the list even if not active (though handleAddOffspring only works for active?)
                  Actually filter logic below handles it: g.tagId === form.motherTagId ensures the selected one is shown.
                */}
                {goats
                  .filter((g) => 
                    (g.gender === 'FEMALE' && g.status === 'ACTIVE' && (!selectedGoat || g.id !== selectedGoat.id)) || 
                    (!editMode && selectedGoat?.gender === 'FEMALE' && g.tagId === form.motherTagId)
                  )
                  .map((g) => (
                    <MenuItem key={g.id} value={g.tagId}>
                      {g.tagId} {g.name ? `- ${g.name}` : ''} ({g.breed.nameAr})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>الأب (اختياري)</InputLabel>
              <Select
                value={form.fatherTagId}
                label="الأب (اختياري)"
                onChange={(e) => setForm({ ...form, fatherTagId: e.target.value })}
              >
                <MenuItem value="">
                  <em>غير محدد</em>
                </MenuItem>
                {goats
                  .filter((g) => g.gender === 'MALE' && g.status === 'ACTIVE' && (!selectedGoat || g.id !== selectedGoat.id))
                  .map((g) => (
                    <MenuItem key={g.id} value={g.tagId}>
                      {g.tagId} {g.name ? `- ${g.name}` : ''} ({g.breed.nameAr})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <TextField
              label="الوزن (كجم)"
              type="number"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
            />
            <FormControl>
              <InputLabel>الحظيرة (الموقع)</InputLabel>
              <Select
                value={form.penId}
                label="الحظيرة (الموقع)"
                onChange={(e) => setForm({ ...form, penId: e.target.value })}
              >
                <MenuItem value="">
                  <em>غير محدد</em>
                </MenuItem>
                {pens.map((pen) => (
                  <MenuItem key={pen.id} value={pen.id}>
                    {pen.nameAr}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel>الحالة</InputLabel>
              <Select
                value={form.status}
                label="الحالة"
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <MenuItem value="ACTIVE">نشط</MenuItem>
                <MenuItem value="SOLD">مباع</MenuItem>
                <MenuItem value="QUARANTINE">حجر صحي</MenuItem>
                <MenuItem value="DECEASED">متوفى</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>إلغاء</Button>
          <Button variant="contained" onClick={handleSubmit}>حفظ</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog عرض التفاصيل */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => {
          setViewDialogOpen(false)
          setFamilyData(null)
          setFamilyError(null)
        }}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
        scroll="paper"
      >
        <DialogTitle>تفاصيل {pageLabels.animal}</DialogTitle>
        <DialogContent dividers sx={{ maxHeight: '70vh' }}>
          {selectedGoat && (
            <Stack spacing={2} mt={2}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>المعلومات الأساسية</Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 1
                  }}
                >
                  <Typography><strong>رقم التاج:</strong> {selectedGoat.tagId}</Typography>
                  <Typography><strong>الاسم:</strong> {selectedGoat.name || '-'}</Typography>
                  <Typography><strong>النوع:</strong> {selectedGoat.breed.type.nameAr}</Typography>
                  <Typography><strong>السلالة:</strong> {selectedGoat.breed.nameAr}</Typography>
                  <Typography><strong>الجنس:</strong> {selectedGoat.gender === 'MALE' ? 'ذكر' : 'أنثى'}</Typography>
                  <Typography><strong>تاريخ الميلاد:</strong> {formatDate(selectedGoat.birthDate)}</Typography>
                  {selectedGoat.age ? (
                    <Typography><strong>العمر:</strong> {selectedGoat.age.formatted}</Typography>
                  ) : (
                    <Typography><strong>العمر:</strong> -</Typography>
                  )}
                  {selectedGoat.age ? (
                    <Typography><strong>الفئة العمرية:</strong> {selectedGoat.age.category}</Typography>
                  ) : (
                    <Typography><strong>الفئة العمرية:</strong> -</Typography>
                  )}
                  <Typography><strong>الوزن:</strong> {selectedGoat.weight ? `${selectedGoat.weight} كجم` : '-'}</Typography>
                  <Typography><strong>الحظيرة:</strong> {selectedGoat.pen ? selectedGoat.pen.nameAr : 'غير محدد'}</Typography>
                  <Typography><strong>الحالة:</strong> {getStatusLabel(selectedGoat.status)}</Typography>
                </Box>
              </Paper>

              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>العائلة</Typography>
                <Divider sx={{ mb: 2 }} />
                {familyLoading ? (
                  <Stack alignItems="center" py={2}>
                    <CircularProgress size={28} />
                    <Typography variant="body2" sx={{ mt: 1 }}>جاري تحميل بيانات العائلة...</Typography>
                  </Stack>
                ) : familyError ? (
                  <Typography variant="body2" color="error">{familyError}</Typography>
                ) : familyData ? (
                  <Stack spacing={2}>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default', overflowX: 'auto' }}>
                      <Stack spacing={3} alignItems="center" minWidth={500}>
                        {/* الأجداد */}
                        <Stack direction="row" spacing={4} justifyContent="center">
                          <Stack spacing={1} alignItems="center">
                            <Typography variant="caption" color="text.secondary">أهل الأب</Typography>
                            <Stack direction="row" spacing={1}>
                              <GoatNode member={familyData.father?.father} label="أب الأب" />
                              <GoatNode member={familyData.father?.mother} label="أم الأب" />
                            </Stack>
                          </Stack>
                          <Stack spacing={1} alignItems="center">
                            <Typography variant="caption" color="text.secondary">أهل الأم</Typography>
                            <Stack direction="row" spacing={1}>
                              <GoatNode member={familyData.mother?.father} label="أب الأم" />
                              <GoatNode member={familyData.mother?.mother} label="أم الأم" />
                            </Stack>
                          </Stack>
                        </Stack>

                        {/* الآباء */}
                        <Stack direction="row" spacing={12} position="relative">
                          <GoatNode member={familyData.father} label="الأب" color="secondary" />
                          <GoatNode member={familyData.mother} label="الأم" color="secondary" />
                        </Stack>

                        {/* الماعز الحالي */}
                        <GoatNode member={selectedGoat} label="الحيوان المختار" color="primary" />
                      </Stack>
                    </Paper>
                    
                    <Divider />

                    <Stack spacing={1}>
                      <Typography fontWeight="bold">الإخوة (نفس الأم ونفس الولادة)</Typography>
                      {familyData.siblings.length > 0 ? (
                        <Stack direction="row" flexWrap="wrap" gap={1}>
                          {familyData.siblings.map((sibling) => (
                            <Chip
                              key={sibling.id}
                              label={`${sibling.tagId} - ${sibling.breed.nameAr}`}
                              size="small"
                            />
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2">لا يوجد</Typography>
                      )}
                    </Stack>

                    <Stack spacing={1}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography fontWeight="bold">الأبناء (من الأم)</Typography>
                        <Button 
                          size="small" 
                          startIcon={<AddIcon />}
                          onClick={() => selectedGoat && handleAddOffspring(selectedGoat)}
                          disabled={selectedGoat?.gender !== 'FEMALE'}
                        >
                          إضافة ابن
                        </Button>
                      </Stack>
                      {familyData.offspring.length > 0 ? (
                        <Stack direction="row" flexWrap="wrap" gap={1}>
                          {familyData.offspring.map((kid) => (
                            <Chip
                              key={kid.id}
                              label={`${kid.tagId} - ${kid.breed.nameAr}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      ) : (
                        <Typography variant="body2">لا يوجد</Typography>
                      )}
                    </Stack>
                  </Stack>
                ) : (
                  <Typography variant="body2">تعذر تحميل بيانات العائلة</Typography>
                )}
              </Paper>

              <Paper sx={{ p: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                  <HistoryIcon color="action" />
                  <Typography variant="h6">سجل التغييرات</Typography>
                </Stack>
                <EntityHistory entity="Goat" entityId={selectedGoat.id} />
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog تسجيل النفوق */}
      <Dialog open={deathDialogOpen} onClose={() => setDeathDialogOpen(false)} fullWidth maxWidth="sm" fullScreen={isMobile}>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <DeathIcon color="error" />
            <Typography variant="h6">تسجيل حالة نفوق</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={1}>
            <Alert severity="warning">
              سيتم تغيير حالة <strong>{selectedGoat?.tagId}</strong> إلى "متوفى".
            </Alert>
            <TextField
              label="تاريخ النفوق"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={deathForm.date}
              onChange={(e) => setDeathForm({ ...deathForm, date: e.target.value })}
            />
            <TextField
              label="سبب الوفاة / ملاحظات"
              multiline
              rows={3}
              fullWidth
              value={deathForm.notes}
              onChange={(e) => setDeathForm({ ...deathForm, notes: e.target.value })}
              placeholder="اكتب سبب الوفاة أو أي تفاصيل أخرى..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeathDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleRecordDeath}>
            تأكيد التسجيل
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog تأكيد الحذف */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} fullWidth maxWidth="xs" fullScreen={isMobile}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف <strong>{selectedGoat?.tagId}</strong>؟
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

      {/* Dialog نقل جماعي */}
      <Dialog
        open={batchDialogOpen}
        onClose={() => setBatchDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>نقل مجموعة من الحيوانات</DialogTitle>
        <DialogContent>
           <Stack spacing={2} mt={1}>
             <Alert severity="info">
               سيتم نقل <strong>{selectedGoatIds.length}</strong> حيوانات إلى الحظيرة المحددة.
             </Alert>
             <TextField
               select
               label="إلى الحظيرة"
               fullWidth
               value={batchPenId}
               onChange={(e) => setBatchPenId(e.target.value)}
             >
               {pens.map((pen) => (
                 <MenuItem key={pen.id} value={pen.id}>
                   {pen.nameAr}
                 </MenuItem>
               ))}
             </TextField>
           </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBatchDialogOpen(false)}>إلغاء</Button>
          <Button 
            variant="contained" 
            color="warning" 
            onClick={handleBatchTransfer}
            disabled={!batchPenId}
          >
            نقل
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
