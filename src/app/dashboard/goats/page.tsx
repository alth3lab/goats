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
  DialogActions
} from '@mui/material'
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Male as MaleIcon,
  Female as FemaleIcon
} from '@mui/icons-material'

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
}

interface FamilyMember {
  id: string
  tagId: string
  name?: string
  gender: 'MALE' | 'FEMALE'
  birthDate: string
  status: 'ACTIVE' | 'SOLD' | 'DECEASED' | 'QUARANTINE'
  breed: { nameAr: string }
}

interface FamilyResponse {
  goat: Goat
  mother?: FamilyMember | null
  father?: FamilyMember | null
  siblings: FamilyMember[]
  offspring: FamilyMember[]
}

export default function GoatsPage() {
  const [goats, setGoats] = useState<Goat[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [open, setOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedGoat, setSelectedGoat] = useState<Goat | null>(null)
  const [familyData, setFamilyData] = useState<FamilyResponse | null>(null)
  const [familyLoading, setFamilyLoading] = useState(false)
  const [familyError, setFamilyError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [types, setTypes] = useState<Array<{ id: string; nameAr: string }>>([])
  const [breeds, setBreeds] = useState<Array<{ id: string; nameAr: string }>>([])
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
    fatherTagId: ''
  })

  useEffect(() => {
    loadGoats()
  }, [])

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

  const handleOpen = () => {
    setEditMode(false)
    setForm({ tagId: '', name: '', gender: 'MALE', birthDate: '', typeId: '', breedId: '', weight: '', status: 'ACTIVE', motherTagId: '', fatherTagId: '' })
    setOpen(true)
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
      fatherTagId: ''
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

  const handleEdit = async (goat: Goat) => {
    setEditMode(true)
    setSelectedGoat(goat)
    
    // تحميل الأنواع أولاً
    await loadTypes()
    
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
      fatherTagId: goat.fatherTagId || ''
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
      console.error('خطأ في حذف الماعز:', error)
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
      status: form.status
    }

    const url = editMode && selectedGoat ? `/api/goats/${selectedGoat.id}` : '/api/goats'
    const method = editMode ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    const savedGoat = await res.json()

    if (form.motherTagId || form.fatherTagId) {
      await fetch(`/api/goats/${savedGoat.id ?? selectedGoat?.id}/parentage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motherTagId: form.motherTagId || null,
          fatherTagId: form.fatherTagId || null
        })
      })
    }

    setForm({ tagId: '', name: '', gender: 'MALE', birthDate: '', typeId: '', breedId: '', weight: '', status: 'ACTIVE', motherTagId: '', fatherTagId: '' })
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
    
    const matchesStatus = filterStatus === 'ALL' || goat.status === filterStatus

    return matchesSearch && matchesStatus
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

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              إدارة الماعز والخرفان
            </Typography>
            <Typography variant="body2" color="text.secondary">
              إجمالي: {filteredGoats.length} حيوان
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ bgcolor: '#2e7d32' }}
            onClick={handleOpen}
          >
            إضافة جديد
          </Button>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mt={2}>
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
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>الحالة</InputLabel>
            <Select
              value={filterStatus}
              label="الحالة"
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <MenuItem value="ALL">الكل</MenuItem>
              <MenuItem value="ACTIVE">نشط</MenuItem>
              <MenuItem value="SOLD">مباع</MenuItem>
              <MenuItem value="QUARANTINE">حجر صحي</MenuItem>
              <MenuItem value="DECEASED">متوفى</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell><strong>رقم التاج</strong></TableCell>
              <TableCell><strong>الاسم</strong></TableCell>
              <TableCell><strong>النوع</strong></TableCell>
              <TableCell><strong>السلالة</strong></TableCell>
              <TableCell><strong>الجنس</strong></TableCell>
              <TableCell><strong>العمر</strong></TableCell>
              <TableCell><strong>الوزن</strong></TableCell>
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
              filteredGoats.map((goat) => (
                <TableRow key={goat.id} hover>
                  <TableCell>
                    <Chip label={goat.tagId} color="primary" size="small" />
                  </TableCell>
                  <TableCell>{goat.name || '-'}</TableCell>
                  <TableCell>{goat.breed.type.nameAr}</TableCell>
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
                  <TableCell>{goat.weight ? `${goat.weight} كجم` : '-'}</TableCell>
                  <TableCell>
                    <Chip 
                      label={getStatusLabel(goat.status)} 
                      color={getStatusColor(goat.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <IconButton size="small" color="primary" onClick={() => handleView(goat)}>
                        <ViewIcon />
                      </IconButton>
                      <IconButton size="small" color="success" onClick={() => handleEdit(goat)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDeleteClick(goat)}>
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

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{editMode ? 'تعديل الماعز' : 'إضافة ماعز جديد'}</DialogTitle>
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
            <TextField
              label="رقم تاج الأم (اختياري)"
              value={form.motherTagId}
              onChange={(e) => setForm({ ...form, motherTagId: e.target.value })}
              helperText="يمكن إدخال رقم تاج الأم لربط النسب تلقائياً"
            />
            <TextField
              label="رقم تاج الأب (اختياري)"
              value={form.fatherTagId}
              onChange={(e) => setForm({ ...form, fatherTagId: e.target.value })}
              helperText="يمكن إدخال رقم تاج الأب لربط النسب تلقائياً"
            />
            <TextField
              label="الوزن (كجم)"
              type="number"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
            />
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
        scroll="paper"
      >
        <DialogTitle>تفاصيل الماعز</DialogTitle>
        <DialogContent dividers sx={{ maxHeight: '70vh' }}>
          {selectedGoat && (
            <Stack spacing={2} mt={2}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>المعلومات الأساسية</Typography>
                <Stack spacing={1}>
                  <Typography><strong>رقم التاج:</strong> {selectedGoat.tagId}</Typography>
                  <Typography><strong>الاسم:</strong> {selectedGoat.name || '-'}</Typography>
                  <Typography><strong>النوع:</strong> {selectedGoat.breed.type.nameAr}</Typography>
                  <Typography><strong>السلالة:</strong> {selectedGoat.breed.nameAr}</Typography>
                  <Typography><strong>الجنس:</strong> {selectedGoat.gender === 'MALE' ? 'ذكر' : 'أنثى'}</Typography>
                  <Typography><strong>تاريخ الميلاد:</strong> {new Date(selectedGoat.birthDate).toLocaleDateString('ar-SA')}</Typography>
                  {selectedGoat.age && (
                    <>
                      <Typography><strong>العمر:</strong> {selectedGoat.age.formatted}</Typography>
                      <Typography><strong>الفئة العمرية:</strong> {selectedGoat.age.category}</Typography>
                    </>
                  )}
                  <Typography><strong>الوزن:</strong> {selectedGoat.weight ? `${selectedGoat.weight} كجم` : '-'}</Typography>
                  <Typography><strong>الحالة:</strong> {getStatusLabel(selectedGoat.status)}</Typography>
                </Stack>
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
                    <Stack spacing={1}>
                      <Typography fontWeight="bold">الأم</Typography>
                      {familyData.mother ? (
                        <Chip
                          label={`${familyData.mother.tagId} - ${familyData.mother.breed.nameAr}`}
                          color="secondary"
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="body2">غير محدد</Typography>
                      )}
                    </Stack>
                    <Stack spacing={1}>
                      <Typography fontWeight="bold">الأب</Typography>
                      {familyData.father ? (
                        <Chip
                          label={`${familyData.father.tagId} - ${familyData.father.breed.nameAr}`}
                          color="secondary"
                          variant="outlined"
                        />
                      ) : (
                        <Typography variant="body2">غير محدد</Typography>
                      )}
                    </Stack>

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
                      <Typography fontWeight="bold">الأبناء (من الأم)</Typography>
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
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog تأكيد الحذف */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف الماعز <strong>{selectedGoat?.tagId}</strong>؟
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
    </Box>
  )
}
