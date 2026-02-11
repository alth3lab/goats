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
  Paper
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
  History as HistoryIcon
} from '@mui/icons-material'
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
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight="bold">
          إدارة الحظائر
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
        >
          إضافة حظيرة
        </Button>
      </Stack>

      {/* Pen Sections */}
      {['BREEDING', 'ISOLATION', 'FATTENING', 'GENERAL'].map((type) => {
        const typePens = pens.filter(p => (p.type || 'GENERAL') === type || (type === 'GENERAL' && !p.type))
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
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={pen.id}>
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
              </Typography>
              
              {selectedPen.goats && selectedPen.goats.length > 0 ? (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
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
