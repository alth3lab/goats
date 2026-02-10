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
  AlertTitle
} from '@mui/material'
import {
  Add as AddIcon,
  FavoriteBorder as BreedingIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon
} from '@mui/icons-material'
import { formatDate } from '@/lib/formatters'

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
}

const statusLabels: Record<string, string> = {
  MATED: 'تزاوج',
  PREGNANT: 'حامل',
  DELIVERED: 'ولادة',
  FAILED: 'فشل'
}

export default function BreedingPage() {
  const [records, setRecords] = useState<BreedingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<BreedingRecord | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [goats, setGoats] = useState<any[]>([]) // Using any to access full goat object properties
  const [inbreedingWarning, setInbreedingWarning] = useState<string | null>(null)
  const [form, setForm] = useState({
    motherId: '',
    fatherId: '',
    matingDate: '',
    pregnancyStatus: 'MATED',
    dueDate: '',
    birthDate: '',
    numberOfKids: ''
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
      numberOfKids: ''
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
      numberOfKids: record.numberOfKids?.toString() || ''
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
      numberOfKids: form.numberOfKids ? Number(form.numberOfKids) : null
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

  return (
    <Box>
      {upcomingBirths.length > 0 && (
         <Alert severity="warning" sx={{ mb: 2 }}>
           <AlertTitle>ولادات قريبة</AlertTitle>
           يوجد <strong>{upcomingBirths.length}</strong> حالات ولادة متوقعة خلال أسبوعين أو متأخرة. يرجى تجهيز حظائر الولادة.
         </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <BreedingIcon sx={{ color: '#e91e63' }} />
            <Typography variant="h4" fontWeight="bold">سجلات التكاثر</Typography>
          </Stack>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpen}>
            إضافة سجل
          </Button>
        </Stack>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell><strong>الأم</strong></TableCell>
              <TableCell><strong>الأب</strong></TableCell>
              <TableCell><strong>تاريخ التزاوج</strong></TableCell>
              <TableCell><strong>الحالة</strong></TableCell>
              <TableCell><strong>تاريخ الولادة المتوقع</strong></TableCell>
              <TableCell><strong>الأيام المتبقية</strong></TableCell>
              <TableCell><strong>عدد المواليد</strong></TableCell>
              <TableCell><strong>الإجراءات</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} align="center">جاري التحميل...</TableCell></TableRow>
            ) : records.length === 0 ? (
              <TableRow><TableCell colSpan={8} align="center">لا توجد بيانات</TableCell></TableRow>
            ) : (
              records.map(r => {
                const daysRemaining = r.dueDate ? getDaysRemaining(r.dueDate) : null
                return (
                  <TableRow key={r.id} hover>
                    <TableCell>{r.mother.tagId}</TableCell>
                    <TableCell>{r.father.tagId}</TableCell>
                    <TableCell>{formatDate(r.matingDate)}</TableCell>
                    <TableCell>
                      <Chip label={statusLabels[r.pregnancyStatus] || r.pregnancyStatus} color="secondary" size="small" />
                    </TableCell>
                    <TableCell>{r.dueDate ? formatDate(r.dueDate) : '-'}</TableCell>
                    <TableCell>
                      {daysRemaining !== null ? (
                        <Chip 
                          label={daysRemaining > 0 ? `${daysRemaining} يوم` : daysRemaining === 0 ? 'اليوم' : 'متأخر'}
                          color={daysRemaining > 7 ? 'success' : daysRemaining >= 0 ? 'warning' : 'error'}
                          size="small"
                        />
                      ) : '-'}
                    </TableCell>
                    <TableCell>{r.numberOfKids ?? '-'}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <IconButton size="small" color="primary" onClick={() => handleView(r)}>
                          <ViewIcon />
                        </IconButton>
                        <IconButton size="small" color="success" onClick={() => handleEdit(r)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDeleteClick(r)}>
                          <DeleteIcon />
                        </IconButton>
                      </Stack>

            {inbreedingWarning && (
              <Alert severity="warning">
                <AlertTitle>تنبيه زواج أقارب</AlertTitle>
                {inbreedingWarning.split('\n').map((w, i) => <div key={i}>{w}</div>)}
              </Alert>
            )}

                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
        <DialogTitle>{editMode ? 'تعديل سجل التكاثر' : 'إضافة سجل تكاثر'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={1}>
            <FormControl>
              <InputLabel>الأم</InputLabel>
              <Select
                value={form.motherId}
                label="الأم"
                onChange={(e) => setForm({ ...form, motherId: e.target.value })}
              >
                {goats.map(g => (
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
                {goats.map(g => (
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>إلغاء</Button>
          <Button variant="contained" onClick={handleSubmit}>حفظ</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog عرض التفاصيل */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
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
                </Stack>
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
    </Box>
  )
}
