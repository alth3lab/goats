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
  ExitToApp as LogoutIcon,
  Description as FileIcon
} from '@mui/icons-material'
import Link from 'next/link'
import GoatFormDialog from '@/components/GoatFormDialog'

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
      }
    } catch (error) {
      console.error('Error saving pen', error)
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

      <Grid container spacing={3}>
        {pens.map((pen) => (
          <Grid item xs={12} sm={6} md={4} key={pen.id}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {pen.nameAr}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {pen.name}
                    </Typography>
                  </Box>
                  <PenIcon color="primary" />
                </Stack>
                
                <Stack direction="row" spacing={1} mt={2}>
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

                <Typography variant="h3" color="primary.main" my={2} fontWeight="bold">
                  {pen._count.goats}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  رأساً حالياً
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" startIcon={<ViewIcon />} onClick={() => handleViewPen(pen.id)}>
                  عرض التفاصيل
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

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
                <Grid item xs={6} md={3}>
                  <Typography variant="caption" color="text.secondary">الاسم</Typography>
                  <Typography fontWeight="bold">{selectedPen.nameAr}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
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
                <Grid item xs={6} md={3}>
                  <Typography variant="caption" color="text.secondary">العدد الحالي</Typography>
                  <Typography fontWeight="bold" color="primary">{selectedPen.goats?.length || 0} رأس</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
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
                      <TableRow bgcolor="#f5f5f5">
                        <TableCell>رقم التاج</TableCell>
                        <TableCell>الاسم</TableCell>
                        <TableCell>النوع</TableCell>
                        <TableCell>الجنس</TableCell>
                        <TableCell>الإجراءات</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedPen.goats.map((goat) => (
                        <TableRow key={goat.id} hover>
                          <TableCell sx={{ fontWeight: 'bold' }}>{goat.tagId}</TableCell>
                          <TableCell>{goat.name || '-'}</TableCell>
                          <TableCell>{goat.breed.nameAr}</TableCell>
                          <TableCell>{goat.gender === 'MALE' ? 'ذكر' : 'أنثى'}</TableCell>
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
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary" align="center" py={4} bgcolor="#f9f9f9" borderRadius={2}>
                  هذه الحظيرة خالية حالياً
                </Typography>
              )}
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
