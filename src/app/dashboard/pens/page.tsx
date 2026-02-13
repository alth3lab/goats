'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  IconButton,
  Chip,
  LinearProgress,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox
} from '@mui/material'
import {
  Add as AddIcon,
  HomeWork as PenIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Male as MaleIcon,
  Female as FemaleIcon,
  ExitToApp as LogoutIcon,
  Description as FileIcon,
  History as HistoryIcon,
  SwapHoriz as TransferIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  GridView as GridViewIcon,
  ViewList as ListViewIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { EntityHistory } from '@/components/EntityHistory'
import Link from 'next/link'
import GoatFormDialog from '@/components/GoatFormDialog'
import { calculateGoatAge, formatAge } from '@/lib/ageCalculator'

interface Goat {
  id: string
  tagId: string
  name?: string
  breed: { id: string; nameAr: string; type: { id: string; nameAr: string } }
  gender: 'MALE' | 'FEMALE'
  birthDate: string
  status: string
  weight?: number
  motherTagId?: string | null
  fatherTagId?: string | null
  pen?: { id: string; nameAr: string } | null
}


interface Pen {
  id: string
  name: string
  nameAr: string
  type: string
  capacity: number | null
  notes: string | null
  _count: {
    goats: number
  }
  goats?: Goat[]
}

export default function PensPage() {
  const [pens, setPens] = useState<Pen[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)
  const [selectedPen, setSelectedPen] = useState<Pen | null>(null)
  const [penLoading, setPenLoading] = useState(false)
  const [editGoat, setEditGoat] = useState<Goat | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [goatDialogMode, setGoatDialogMode] = useState<'view' | 'edit'>('edit')
  
  // New features state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [selectedGoatForTransfer, setSelectedGoatForTransfer] = useState<Goat | null>(null)
  const [targetPenId, setTargetPenId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [selectedGoatsForBulk, setSelectedGoatsForBulk] = useState<Set<string>>(new Set())
  const [bulkTransferDialogOpen, setBulkTransferDialogOpen] = useState(false)
  const [bulkTargetPenId, setBulkTargetPenId] = useState('')
  
  const [form, setForm] = useState({
    name: '',
    nameAr: '',
    type: 'GENERAL',
    capacity: '',
    notes: ''
  })

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


  useEffect(() => {
    loadPens()
  }, [])

  const loadPens = async () => {
    try {
      const res = await fetch('/api/pens')
      if (res.ok) {
        const data = await res.json()
        setPens(data)
      }
    } catch (error) {
      console.error('Error loading pens', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewPen = async (penId: string) => {
    setViewOpen(true)
    setPenLoading(true)
    setSelectedPen(null)
    
    try {
      const res = await fetch(`/api/pens/${penId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedPen(data)
      }
    } catch {
      console.error('Error fetching pen details')
    } finally {
      setPenLoading(false)
    }
  }

  const handleRemoveGoat = async (goatId: string) => {
    if (!selectedPen) return
    if (!confirm('هل أنت متأكد من إخراج هذا الحيوان من الحظيرة؟')) return

    try {
      // Update goat to remove penId
      const res = await fetch(`/api/goats/${goatId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ penId: null })
      })

      if (res.ok) {
        // Refresh local state
        const updatedGoats = selectedPen.goats?.filter(g => g.id !== goatId)
        setSelectedPen({ 
          ...selectedPen, 
          goats: updatedGoats,
          _count: { goats: (selectedPen._count.goats - 1) } 
        })
        loadPens() // Refresh main list
      }
    } catch {
      alert('فشل في إخراج الحيوان')
    }
  }

  const openGoatDialog = async (goatId: string, mode: 'view' | 'edit') => {
    setGoatDialogMode(mode)
    try {
      const res = await fetch(`/api/goats/${goatId}`)
      if (res.ok) {
        const data = await res.json()
        setEditGoat(data)
        setEditDialogOpen(true)
      } else {
        alert('تعذر تحميل بيانات الماعز')
      }
    } catch {
      alert('تعذر تحميل بيانات الماعز')
    }
  }

  const handleEditGoat = (goat: Goat) => {
    openGoatDialog(goat.id, 'edit')
  }

  const handleViewGoat = (goat: Goat) => {
    openGoatDialog(goat.id, 'view')
  }

  const handleGoatSaved = () => {
    // Refresh pen details if open
    if (selectedPen) {
        handleViewPen(selectedPen.id)
    }
    loadPens() // Refresh stats
  }

  const handleTransferGoat = async () => {
    if (!selectedGoatForTransfer || !targetPenId) return

    try {
      const res = await fetch(`/api/goats/${selectedGoatForTransfer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ penId: targetPenId })
      })

      if (res.ok) {
        setTransferDialogOpen(false)
        setSelectedGoatForTransfer(null)
        setTargetPenId('')
        if (selectedPen) {
          handleViewPen(selectedPen.id)
        }
        loadPens()
        alert('تم نقل الحيوان بنجاح')
      }
    } catch {
      alert('فشل في نقل الحيوان')
    }
  }

  const getAvailablePens = () => {
    if (!selectedGoatForTransfer) return []
    return pens.filter(p => {
      const currentCount = p._count.goats
      const capacity = p.capacity || Infinity
      return p.id !== selectedGoatForTransfer.pen?.id && currentCount < capacity
    })
  }

  const filteredPens = pens.filter(pen => {
    // Filter by type
    if (filterType !== 'ALL' && pen.type !== filterType) return false
    
    // Filter by status
    if (filterStatus === 'FULL' && pen.capacity) {
      if (pen._count.goats < pen.capacity) return false
    }
    if (filterStatus === 'EMPTY' && pen._count.goats > 0) return false
    if (filterStatus === 'AVAILABLE' && pen.capacity) {
      if (pen._count.goats >= pen.capacity) return false
    }
    
    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return pen.nameAr.toLowerCase().includes(query) || 
             pen.name.toLowerCase().includes(query)
    }
    
    return true
  })

  const stats = {
    totalPens: pens.length,
    totalAnimals: pens.reduce((sum, p) => sum + p._count.goats, 0),
    totalCapacity: pens.reduce((sum, p) => sum + (p.capacity || 0), 0),
    fullPens: pens.filter(p => p.capacity && p._count.goats >= p.capacity).length,
    overcrowdedPens: pens.filter(p => p.capacity && p._count.goats > p.capacity).length,
    emptyPens: pens.filter(p => p._count.goats === 0).length
  }

  // Export functions
  const exportToPDF = async () => {
    const doc = new jsPDF('p', 'pt', 'a4')
    
    const rowsHtml = filteredPens.map(pen => `
      <tr>
        <td>${pen.nameAr}</td>
        <td>${pen.type === 'BREEDING' ? 'ولادة' : pen.type === 'ISOLATION' ? 'عزل' : pen.type === 'FATTENING' ? 'تسمين' : 'عام'}</td>
        <td>${pen._count.goats}</td>
        <td>${pen.capacity || '-'}</td>
        <td>${pen.capacity ? Math.round((pen._count.goats / pen.capacity) * 100) + '%' : '-'}</td>
      </tr>
    `).join('')

    const html = `
      <div style="font-family: Cairo, Arial, sans-serif; direction: rtl; padding: 20px; color: #333;">
        <h2 style="text-align: center; margin-bottom: 10px;">تقرير إدارة الحظائر</h2>
        <p style="text-align: center; margin-bottom: 20px;">التاريخ: ${new Date().toLocaleDateString('ar-AE')}</p>
        
        <div style="margin-bottom: 20px; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
          <h3 style="margin-top: 0; margin-bottom: 10px;">الإحصائيات</h3>
          <ul style="list-style: none; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <li><strong>إجمالي الحظائر:</strong> ${stats.totalPens}</li>
            <li><strong>إجمالي الحيوانات:</strong> ${stats.totalAnimals}</li>
            <li><strong>نسبة الامتلاء:</strong> ${stats.totalCapacity > 0 ? Math.round((stats.totalAnimals / stats.totalCapacity) * 100) : 0}%</li>
            <li><strong>حظائر ممتلئة:</strong> ${stats.fullPens}</li>
            <li><strong>حظائر مكتظة:</strong> ${stats.overcrowdedPens}</li>
            <li><strong>حظائر فارغة:</strong> ${stats.emptyPens}</li>
          </ul>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="border: 1px solid #ccc; padding: 8px;">الاسم</th>
              <th style="border: 1px solid #ccc; padding: 8px;">النوع</th>
              <th style="border: 1px solid #ccc; padding: 8px;">العدد</th>
              <th style="border: 1px solid #ccc; padding: 8px;">السعة</th>
              <th style="border: 1px solid #ccc; padding: 8px;">الامتلاء</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    `

    await new Promise<void>((resolve) => {
      ;(doc as any).html(html, {
        x: 15,
        y: 15,
        width: 565,
        windowWidth: 1000,
        callback: () => resolve()
      })
    })
    
    doc.save(`pens-report-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const exportToExcel = () => {
    // Statistics sheet
    const statsSheet = XLSX.utils.json_to_sheet([
      { 'المؤشر': 'إجمالي الحظائر', 'القيمة': stats.totalPens },
      { 'المؤشر': 'إجمالي الحيوانات', 'القيمة': stats.totalAnimals },
      { 'المؤشر': 'السعة الكلية', 'القيمة': stats.totalCapacity },
      { 'المؤشر': 'نسبة الامتلاء', 'القيمة': `${stats.totalCapacity > 0 ? Math.round((stats.totalAnimals / stats.totalCapacity) * 100) : 0}%` },
      { 'المؤشر': 'حظائر ممتلئة', 'القيمة': stats.fullPens },
      { 'المؤشر': 'حظائر مكتظة', 'القيمة': stats.overcrowdedPens },
      { 'المؤشر': 'حظائر فارغة', 'القيمة': stats.emptyPens }
    ])
    
    // Pens details sheet
    const pensData = filteredPens.map(pen => ({
      'الاسم': pen.nameAr,
      'الاسم الإنجليزي': pen.name,
      'النوع': pen.type === 'BREEDING' ? 'ولادة' : pen.type === 'ISOLATION' ? 'عزل' : pen.type === 'FATTENING' ? 'تسمين' : 'عام',
      'عدد الحيوانات': pen._count.goats,
      'السعة': pen.capacity || '-',
      'نسبة الامتلاء': pen.capacity ? `${Math.round((pen._count.goats / pen.capacity) * 100)}%` : '-',
      'ملاحظات': pen.notes || '-'
    }))
    const pensSheet = XLSX.utils.json_to_sheet(pensData)
    
    // Create workbook
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, statsSheet, 'الإحصائيات')
    XLSX.utils.book_append_sheet(wb, pensSheet, 'تفاصيل الحظائر')
    
    XLSX.writeFile(wb, `pens-report-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // Bulk transfer functions
  const handleSelectGoat = (goatId: string) => {
    const newSelection = new Set(selectedGoatsForBulk)
    if (newSelection.has(goatId)) {
      newSelection.delete(goatId)
    } else {
      newSelection.add(goatId)
    }
    setSelectedGoatsForBulk(newSelection)
  }

  const handleBulkTransfer = async () => {
    if (selectedGoatsForBulk.size === 0 || !bulkTargetPenId) return

    try {
      const promises = Array.from(selectedGoatsForBulk).map(goatId =>
        fetch(`/api/goats/${goatId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ penId: bulkTargetPenId })
        })
      )

      await Promise.all(promises)
      
      setBulkTransferDialogOpen(false)
      setSelectedGoatsForBulk(new Set())
      setBulkTargetPenId('')
      if (selectedPen) {
        handleViewPen(selectedPen.id)
      }
      loadPens()
      alert(`تم نقل ${selectedGoatsForBulk.size} حيوان بنجاح`)
    } catch (error) {
      console.error('Bulk transfer error:', error)
      alert('حدث خطأ أثناء النقل الجماعي')
    }
  }

  const handleSubmit = async () => {
    try {
      const res = await fetch('/api/pens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      if (res.ok) {
        setOpen(false)
        setForm({ name: '', nameAr: '', type: 'GENERAL', capacity: '', notes: '' })
        loadPens()
      } else {
        const data = await res.json()
        alert(data.error || 'فشل حفظ الحظيرة')
      }
    } catch (error) {
      console.error('Error saving pen', error)
      alert('حدث خطأ أثناء الاتصال بالخادم')
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          إدارة الحظائر
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            size="small"
            onClick={exportToPDF}
            sx={{ color: 'error.main', borderColor: 'error.main' }}
          >
            تصدير PDF
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={exportToExcel}
            sx={{ color: 'success.main', borderColor: 'success.main' }}
          >
            تصدير Excel
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'contained' : 'outlined'}
            size="small"
            startIcon={<GridViewIcon />}
            onClick={() => setViewMode('grid')}
          >
            شبكة
          </Button>
          <Button
            variant={viewMode === 'list' ? 'contained' : 'outlined'}
            size="small"
            startIcon={<ListViewIcon />}
            onClick={() => setViewMode('list')}
          >
            قائمة
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
          >
            إضافة حظيرة
          </Button>
        </Stack>
      </Stack>

      {/* Statistics Dashboard */}
      <Grid container spacing={2} mb={4}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" fontWeight="bold" color="primary">
                {stats.totalPens}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                إجمالي الحظائر
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" fontWeight="bold" color="secondary">
                {stats.totalAnimals}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                إجمالي الحيوانات
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {stats.totalCapacity > 0 ? Math.round((stats.totalAnimals / stats.totalCapacity) * 100) : 0}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                نسبة الامتلاء
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card sx={{ bgcolor: stats.fullPens > 0 ? 'warning.light' : 'background.paper' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" fontWeight="bold" sx={{ color: stats.fullPens > 0 ? 'warning.main' : 'text.secondary' }}>
                {stats.fullPens}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                حظائر ممتلئة
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card sx={{ bgcolor: stats.overcrowdedPens > 0 ? 'error.light' : 'background.paper' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Stack direction="row" justifyContent="center" alignItems="center" spacing={0.5}>
                {stats.overcrowdedPens > 0 && <WarningIcon color="error" fontSize="small" />}
                <Typography variant="h4" fontWeight="bold" color={stats.overcrowdedPens > 0 ? 'error' : 'inherit'}>
                  {stats.overcrowdedPens}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                حظائر مكتظة
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" fontWeight="bold" color="text.secondary">
                {stats.emptyPens}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                حظائر فارغة
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Smart Notifications & Recommendations */}
      {(stats.overcrowdedPens > 0 || stats.fullPens > 2 || (stats.totalCapacity > 0 && (stats.totalAnimals / stats.totalCapacity) > 0.8)) && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'warning.light', border: '1px solid', borderColor: 'warning.main' }}>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <WarningIcon color="warning" />
              <Typography variant="h6" fontWeight="bold" color="warning.dark">
                تنبيهات وتوصيات ذكية
              </Typography>
            </Stack>
            
            {stats.overcrowdedPens > 0 && (
              <Paper sx={{ p: 2, bgcolor: 'error.light', border: '1px solid', borderColor: 'error.main' }}>
                <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                  <WarningIcon color="error" />
                  <Typography variant="subtitle1" fontWeight="bold" color="error">
                    تحذير: حظائر مكتظة
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  يوجد {stats.overcrowdedPens} حظيرة تجاوزت السعة القصوى. يُنصح بنقل بعض الحيوانات إلى حظائر أخرى لتجنب المشاكل الصحية.
                </Typography>
              </Paper>
            )}

            {stats.fullPens > 2 && (
              <Paper sx={{ p: 2, bgcolor: 'warning.light' }}>
                <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                  <AssessmentIcon color="warning" />
                  <Typography variant="subtitle1" fontWeight="bold" color="warning.dark">
                    توصية: إضافة حظائر جديدة
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  لديك {stats.fullPens} حظيرة ممتلئة. يُنصح بإنشاء حظائر إضافية لاستيعاب المزيد من الحيوانات.
                </Typography>
              </Paper>
            )}

            {stats.totalCapacity > 0 && (stats.totalAnimals / stats.totalCapacity) > 0.8 && (
              <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
                <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                  <TrendingUpIcon color="info" />
                  <Typography variant="subtitle1" fontWeight="bold" color="info.main">
                    ملاحظة: نسبة امتلاء عالية
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  نسبة الامتلاء الإجمالية {Math.round((stats.totalAnimals / stats.totalCapacity) * 100)}%. 
                  يُنصح بالتخطيط لتوسعة المزرعة قريباً.
                </Typography>
              </Paper>
            )}

            {stats.emptyPens > 3 && (
              <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
                <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                  <AssessmentIcon color="secondary" />
                  <Typography variant="subtitle1" fontWeight="bold" color="secondary">
                    توصية: تحسين التوزيع
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  لديك {stats.emptyPens} حظيرة فارغة. يمكنك إعادة توزيع الحيوانات للاستفادة المثلى من المساحات المتاحة.
                </Typography>
              </Paper>
            )}
          </Stack>
        </Paper>
      )}

      {/* Search and Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            placeholder="بحث عن حظيرة..."
            size="small"
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
            }}
          />
          <TextField
            select
            size="small"
            label="نوع الحظيرة"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="ALL">الكل</MenuItem>
            <MenuItem value="GENERAL">عام</MenuItem>
            <MenuItem value="BREEDING">ولادة</MenuItem>
            <MenuItem value="FATTENING">تسمين</MenuItem>
            <MenuItem value="ISOLATION">عزل</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            label="حالة الحظيرة"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="ALL">الكل</MenuItem>
            <MenuItem value="AVAILABLE">متاحة</MenuItem>
            <MenuItem value="FULL">ممتلئة</MenuItem>
            <MenuItem value="EMPTY">فارغة</MenuItem>
          </TextField>
        </Stack>
      </Paper>

      {/* Pen Sections */}
      {['BREEDING', 'ISOLATION', 'FATTENING', 'GENERAL'].map((type) => {
        const typePens = filteredPens.filter(p => (p.type || 'GENERAL') === type || (type === 'GENERAL' && !p.type))
        if (typePens.length === 0) return null

        return (
          <Box key={type} mb={4}>
            <Typography variant="h6" color="primary" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              {type === 'BREEDING' && '🍼 قسم الولادة والرضاعة'}
              {type === 'ISOLATION' && '🏥 قسم العزل والحجر الصحي'}
              {type === 'FATTENING' && '🥩 قسم التسمين'}
              {type === 'GENERAL' && '🏠 الحظائر العامة'}
              <Chip label={typePens.length} size="small" color="primary" variant="outlined" sx={{ ml: 1 }} />
            </Typography>
            
            <Grid container spacing={3}>
              {typePens.map((pen) => {
                const capacity = pen.capacity || 0
                const count = pen._count.goats || 0
                const usagePercentage = capacity > 0 ? (count / capacity) * 100 : 0
                const isFull = capacity > 0 && count >= capacity
                const isOvercrowded = capacity > 0 && count > capacity
                
                return (
                  <Grid size={{ xs: 12, sm: 6, md: viewMode === 'grid' ? 6 : 4, lg: viewMode === 'grid' ? 4 : 4 }} key={pen.id}>
                    <Card sx={{ height: '100%', position: 'relative', border: isOvercrowded ? '2px solid #ef5350' : 'none' }}>
                      {isFull && (
                        <Chip 
                          label={isOvercrowded ? 'تجاوز السعة !' : 'ممتلئة'} 
                          color={isOvercrowded ? 'error' : 'warning'}
                          size="small"
                          sx={{ position: 'absolute', top: 10, left: 10 }} 
                        />
                      )}
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Typography variant="h6" fontWeight="bold">
                              {pen.nameAr}
                            </Typography>
                            {!pen.name.startsWith('PEN-') && (
                              <Typography variant="caption" color="text.secondary">
                                {pen.name}
                              </Typography>
                            )}
                          </Box>
                          <PenIcon color={isOvercrowded ? 'error' : isFull ? 'warning' : 'primary'} />
                        </Stack>
                        
                        <Stack direction="row" spacing={1} mt={2} mb={2}>
                          <Chip 
                            label={
                              pen.type === 'ISOLATION' ? 'عزل' :
                              pen.type === 'BREEDING' ? 'ولادة' :
                              pen.type === 'FATTENING' ? 'تسمين' : 'عام'
                            } 
                            size="small" 
                            color={pen.type === 'ISOLATION' ? 'error' : 'default'}
                          />
                          {pen.capacity && (
                            <Chip label={`السعة: ${pen.capacity}`} size="small" variant="outlined" />
                          )}
                        </Stack>

                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Typography variant="h3" color="primary.main" fontWeight="bold">
                            {pen._count.goats}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mx: 1 }}>
                            من {capacity > 0 ? capacity : '∞'} رأس
                            </Typography>
                        </Box>

                        <Stack direction="row" spacing={2} mb={2} sx={{ bgcolor: 'background.paper', p: 1, borderRadius: 1, border: '1px solid #eee' }}>
                           <Stack direction="row" spacing={0.5} alignItems="center">
                              <MaleIcon fontSize="small" color="primary" />
                              <Typography variant="body2" fontWeight="bold">
                                 {pen.goats?.filter((g: any) => g.gender === 'MALE').length || 0}
                              </Typography>
                           </Stack>
                           
                           <Stack direction="row" spacing={0.5} alignItems="center">
                              <FemaleIcon fontSize="small" sx={{ color: '#e91e63' }} />
                              <Typography variant="body2" fontWeight="bold">
                                 {pen.goats?.filter((g: any) => g.gender === 'FEMALE').length || 0}
                              </Typography>
                           </Stack>
                        </Stack>
                        
                        {capacity > 0 && (
                            <Box sx={{ width: '100%' }}>
                                <LinearProgress 
                                    variant="determinate" 
                                    value={Math.min(usagePercentage, 100)} 
                                    color={isOvercrowded ? 'error' : isFull ? 'warning' : usagePercentage > 75 ? 'warning' : 'success'}
                                    sx={{ height: 8, borderRadius: 4 }}
                                />
                                <Typography variant="caption" color="text.secondary" align="right" display="block" mt={0.5}>
                                    {usagePercentage.toFixed(0)}% مشغول
                                </Typography>
                            </Box>
                        )}
                      </CardContent>
                      <CardActions>
                        <Button size="small" startIcon={<ViewIcon />} onClick={() => handleViewPen(pen.id)}>
                          عرض التفاصيل
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          </Box>
        )
      })}

      {/* Dialog View Pen */}
      <Dialog 
        open={viewOpen} 
        onClose={() => setViewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedPen ? `تفاصيل: ${selectedPen.nameAr}` : 'جاري التحميل...'}
        </DialogTitle>
        <DialogContent dividers>
          {penLoading ? (
            <Typography align="center" py={4}>جاري تحميل البيانات...</Typography>
          ) : selectedPen ? (
            <Box>
              <Grid container spacing={2} mb={3}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">الاسم</Typography>
                  <Typography fontWeight="bold">{selectedPen.nameAr}</Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">النوع</Typography>
                  <Chip 
                    label={
                      selectedPen.type === 'ISOLATION' ? 'عزل' :
                      selectedPen.type === 'BREEDING' ? 'ولادة' :
                      selectedPen.type === 'FATTENING' ? 'تسمين' : 'عام'
                    } 
                    size="small" 
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">العدد الحالي</Typography>
                  <Typography fontWeight="bold" color="primary">{selectedPen.goats?.length || 0} رأس</Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <Typography variant="caption" color="text.secondary">السعة</Typography>
                  <Typography>{selectedPen.capacity || 'غير محدد'}</Typography>
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                قائمة الحيوانات
                {selectedGoatsForBulk.size > 0 && (
                  <Button
                    variant="contained"
                    size="small"
                    color="success"
                    startIcon={<TransferIcon />}
                    onClick={() => setBulkTransferDialogOpen(true)}
                    sx={{ ml: 2 }}
                  >
                    نقل المحدد ({selectedGoatsForBulk.size})
                  </Button>
                )}
              </Typography>
              
              {selectedPen.goats && selectedPen.goats.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <TableCell padding="checkbox">
                          <Checkbox
                            indeterminate={
                              selectedGoatsForBulk.size > 0 && 
                              selectedPen?.goats && 
                              selectedGoatsForBulk.size < selectedPen.goats.length
                            }
                            checked={
                              selectedPen?.goats && 
                              selectedPen.goats.length > 0 && 
                              selectedGoatsForBulk.size === selectedPen.goats.length
                            }
                            onChange={(e) => {
                              if (e.target.checked && selectedPen?.goats) {
                                setSelectedGoatsForBulk(new Set(selectedPen.goats.map(g => g.id)))
                              } else {
                                setSelectedGoatsForBulk(new Set())
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>رقم التاج</TableCell>
                        <TableCell>الاسم</TableCell>
                        <TableCell>النوع</TableCell>
                        <TableCell>السلالة</TableCell>
                        <TableCell>الجنس</TableCell>
                        <TableCell>العمر</TableCell>
                        <TableCell>الوزن</TableCell>
                        <TableCell>الحالة</TableCell>
                        <TableCell>الإجراءات</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedPen.goats.map((goat) => {
                        const age = calculateGoatAge(goat.birthDate)
                        return (
                          <TableRow key={goat.id} hover>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedGoatsForBulk.has(goat.id)}
                                onChange={() => handleSelectGoat(goat.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <Chip label={goat.tagId} color="primary" size="small" />
                            </TableCell>
                            <TableCell>{goat.name || '-'}</TableCell>
                            <TableCell>{goat.breed.type?.nameAr || '-'}</TableCell>
                            <TableCell>{goat.breed.nameAr}</TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1} alignItems="center">
                                {goat.gender === 'MALE' ? (
                                  <>
                                    <MaleIcon color="primary" />
                                    <span>ذكر</span>
                                  </>
                                ) : (
                                  <>
                                    <FemaleIcon sx={{ color: '#e91e63' }} />
                                    <span>أنثى</span>
                                  </>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Stack>
                                <Typography variant="body2" fontWeight="bold">
                                  {formatAge(age)}
                                </Typography>
                                <Chip label={age.categoryAr} size="small" variant="outlined" color="secondary" />
                              </Stack>
                            </TableCell>
                            <TableCell>{goat.weight ? `${goat.weight} كجم` : '-'}</TableCell>
                            <TableCell>
                              <Chip label={getStatusLabel(goat.status)} color={getStatusColor(goat.status)} size="small" />
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1}>
                                <Button 
                                  size="small" 
                                  variant="outlined" 
                                  color="success"
                                  startIcon={<TransferIcon />}
                                  onClick={() => {
                                    setSelectedGoatForTransfer(goat)
                                    setTransferDialogOpen(true)
                                  }}
                                >
                                  نقل
                                </Button>
                                <Button 
                                  size="small" 
                                  variant="outlined" 
                                  color="error"
                                  onClick={() => handleRemoveGoat(goat.id)}
                                >
                                  إخراج
                                </Button>
                                <Button 
                                  size="small" 
                                  color="info" 
                                  startIcon={<FileIcon />}
                                  onClick={() => handleViewGoat(goat)}
                                >
                                  ملف
                                </Button>
                                <Button 
                                  size="small" 
                                  color="primary" 
                                  startIcon={<EditIcon />}
                                  onClick={() => handleEditGoat(goat)}
                                >
                                  تعديل
                                </Button>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary" align="center" py={4} bgcolor="#f9f9f9" borderRadius={2}>
                  هذه الحظيرة خالية حالياً
                </Typography>
              )}

              <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                  <HistoryIcon color="action" />
                  <Typography variant="h6">سجل التغييرات</Typography>
                </Stack>
                <EntityHistory entity="Pen" entityId={selectedPen.id} />
              </Paper>
            </Box>
          ) : (
            <Typography color="error">تعذر تحميل البيانات</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إضافة حظيرة جديدة</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="الاسم بالعربية (مثال: الحظيرة الشمالية)"
              fullWidth
              value={form.nameAr}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
            />
            <TextField
              label="الاسم بالإنجليزية (Internal ID)"
              fullWidth
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <TextField
              select
              label="نوع الحظيرة"
              fullWidth
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <MenuItem value="GENERAL">عام</MenuItem>
              <MenuItem value="BREEDING">ولادة/تربية</MenuItem>
              <MenuItem value="FATTENING">تسمين</MenuItem>
              <MenuItem value="ISOLATION">عزل/حجر</MenuItem>
            </TextField>
            <TextField
              label="السعة الاستيعابية (اختياري)"
              type="number"
              fullWidth
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
            <TextField
              label="ملاحظات"
              multiline
              rows={3}
              fullWidth
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSubmit}>حفظ</Button>
        </DialogActions>
      </Dialog>
      
      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>نقل حيوان إلى حظيرة أخرى</DialogTitle>
        <DialogContent>
          {selectedGoatForTransfer && (
            <Box>
              <Paper sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  الحيوان المحدد:
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Chip label={selectedGoatForTransfer.tagId} color="primary" />
                  <Typography fontWeight="bold">
                    {selectedGoatForTransfer.name || 'بدون اسم'}
                  </Typography>
                  <Chip 
                    icon={selectedGoatForTransfer.gender === 'MALE' ? <MaleIcon /> : <FemaleIcon />}
                    label={selectedGoatForTransfer.gender === 'MALE' ? 'ذكر' : 'أنثى'}
                    size="small"
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  الحظيرة الحالية: {selectedGoatForTransfer.pen?.nameAr || 'بدون حظيرة'}
                </Typography>
              </Paper>

              <TextField
                select
                label="اختر الحظيرة الجديدة"
                fullWidth
                value={targetPenId}
                onChange={(e) => setTargetPenId(e.target.value)}
              >
                {getAvailablePens().map(pen => {
                  const available = (pen.capacity || Infinity) - pen._count.goats
                  return (
                    <MenuItem key={pen.id} value={pen.id}>
                      <Stack direction="row" justifyContent="space-between" width="100%">
                        <span>{pen.nameAr}</span>
                        <Chip 
                          label={`${pen._count.goats}/${pen.capacity || '∞'} - متاح: ${available === Infinity ? '∞' : available}`}
                          size="small"
                          color={available > 5 ? 'success' : 'warning'}
                        />
                      </Stack>
                    </MenuItem>
                  )
                })}
              </TextField>

              {getAvailablePens().length === 0 && (
                <Typography color="error" variant="body2" sx={{ mt: 2 }}>
                  لا توجد حظائر متاحة للنقل. جميع الحظائر ممتلئة أو هذه هي الحظيرة الوحيدة.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferDialogOpen(false)}>إلغاء</Button>
          <Button 
            variant="contained" 
            onClick={handleTransferGoat}
            disabled={!targetPenId || getAvailablePens().length === 0}
            startIcon={<TransferIcon />}
          >
            نقل الآن
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Transfer Dialog */}
      <Dialog open={bulkTransferDialogOpen} onClose={() => setBulkTransferDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <TransferIcon />
            <Typography variant="h6">نقل جماعي للحيوانات</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Paper sx={{ p: 2, mb: 3, bgcolor: '#e3f2fd' }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              عدد الحيوانات المحددة: {selectedGoatsForBulk.size}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              سيتم نقل جميع الحيوانات المحددة إلى الحظيرة الجديدة
            </Typography>
          </Paper>

          <TextField
            select
            label="اختر الحظيرة الجديدة"
            fullWidth
            value={bulkTargetPenId}
            onChange={(e) => setBulkTargetPenId(e.target.value)}
          >
            {pens
              .filter(p => {
                const currentCount = p._count.goats
                const capacity = p.capacity || Infinity
                const availableSpace = capacity - currentCount
                return availableSpace >= selectedGoatsForBulk.size
              })
              .map(pen => {
                const available = (pen.capacity || Infinity) - pen._count.goats
                return (
                  <MenuItem key={pen.id} value={pen.id}>
                    <Stack direction="row" justifyContent="space-between" width="100%">
                      <span>{pen.nameAr}</span>
                      <Chip 
                        label={`متاح: ${available === Infinity ? '∞' : available} مكان`}
                        size="small"
                        color={available >= selectedGoatsForBulk.size * 2 ? 'success' : 'warning'}
                      />
                    </Stack>
                  </MenuItem>
                )
              })}
          </TextField>

          {pens.filter(p => {
            const currentCount = p._count.goats
            const capacity = p.capacity || Infinity
            const availableSpace = capacity - currentCount
            return availableSpace >= selectedGoatsForBulk.size
          }).length === 0 && (
            <Typography color="error" variant="body2" sx={{ mt: 2 }}>
              لا توجد حظائر بسعة كافية لاستيعاب {selectedGoatsForBulk.size} حيوان
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkTransferDialogOpen(false)}>إلغاء</Button>
          <Button 
            variant="contained" 
            onClick={handleBulkTransfer}
            disabled={!bulkTargetPenId}
            startIcon={<TransferIcon />}
          >
            نقل {selectedGoatsForBulk.size} حيوان
          </Button>
        </DialogActions>
      </Dialog>

      {/* Shared Goat Editing Dialog */}
      <GoatFormDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false)
          setEditGoat(null)
        }}
        goat={editGoat}
        onSave={handleGoatSaved}
        readOnly={goatDialogMode === 'view'}
      />
    </Box>
  )
}
