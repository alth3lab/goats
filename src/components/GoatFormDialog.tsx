'use client'

import { useState, useEffect } from 'react'
import {
  Button,
  Paper,
  Typography,
  Divider,
  Chip,
  CircularProgress,
  Box,
  TextField,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'
import { formatDate } from '@/lib/formatters'
import { useAuth } from '@/lib/useAuth'

const animalLabel: Record<string, { file: string; edit: string; add: string }> = {
  SHEEP: { file: 'ملف الأغنام', edit: 'تعديل بيانات الأغنام', add: 'إضافة أغنام جديد' },
  CAMEL: { file: 'ملف البعير', edit: 'تعديل بيانات البعير', add: 'إضافة بعير جديد' },
  MIXED: { file: 'ملف الحيوان', edit: 'تعديل بيانات الحيوان', add: 'إضافة حيوان جديد' },
}

interface Goat {
  id: string
  tagId: string
  name?: string
  gender: 'MALE' | 'FEMALE'
  birthDate: string
  weight?: number
  notes?: string | null
  status: string
  motherTagId?: string | null
  age?: {
    formatted: string
    category: string
  }
  fatherTagId?: string | null
  pen?: { id: string; nameAr: string } | null
  breed: {
    id: string
    nameAr: string
    type: {
      id: string
      nameAr: string
    }
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
  mother?: FamilyMember | null
  father?: FamilyMember | null
}

interface FamilyResponse {
  goat: Goat
  mother?: FamilyMember | null
  father?: FamilyMember | null
  siblings: FamilyMember[]
  offspring: FamilyMember[]
}

const GoatNode = ({ member, label, color = "default" }: { member?: FamilyMember | null | Goat, label: string, color?: "default" | "primary" | "secondary" }) => (
  <Paper 
    elevation={member ? 2 : 0} 
    sx={{ 
      p: 1.5, 
      textAlign: 'center', 
      minWidth: 120, 
      bgcolor: member ? (color === "primary" ? '#e3f2fd' : color === "secondary" ? '#f3e5f5' : 'background.paper') : '#f5f5f5',
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


interface GoatFormDialogProps {
  open: boolean
  onClose: () => void
  goat?: Goat | null // If present, edit mode
  onSave: () => void
  readOnly?: boolean
}

export default function GoatFormDialog({ open, onClose, goat, onSave, readOnly = false }: GoatFormDialogProps) {
  const { farm } = useAuth()
  const lbl = animalLabel[farm?.farmType || 'SHEEP'] || animalLabel.SHEEP
  const [types, setTypes] = useState<Array<{ id: string; nameAr: string }>>([])
  const [breeds, setBreeds] = useState<Array<{ id: string; nameAr: string }>>([])
  const [pens, setPens] = useState<Array<{ id: string; nameAr: string }>>([])
  const [goats, setGoats] = useState<Goat[]>([]) // For parent selection
  const [familyData, setFamilyData] = useState<FamilyResponse | null>(null)
  const [familyLoading, setFamilyLoading] = useState(false)
  const [familyError, setFamilyError] = useState<string | null>(null)

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
    penId: '',
    notes: ''
  })

  useEffect(() => {
    if (open) {
      loadTypes()
      loadPens()
      loadGoats() // Need all goats for parent selection
    }
  }, [open])

  useEffect(() => {
    if (open && goat && readOnly) {
      setFamilyLoading(true)
      setFamilyError(null)
      setFamilyData(null)
      fetch(`/api/goats/${goat.id}/family`)
        .then(async (res) => {
          const data = await res.json()
          if (!res.ok) throw new Error(data?.error || 'تعذر تحميل بيانات العائلة')
          setFamilyData(data)
        })
        .catch((err) => {
          setFamilyError(err.message || 'تعذر تحميل بيانات العائلة')
        })
        .finally(() => setFamilyLoading(false))
    }
  }, [open, goat, readOnly])

  useEffect(() => {
    if (goat) {
      // Edit mode
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
        penId: (goat.pen as any)?.id || (goat as any).penId || '',
        notes: goat.notes || ''
      })
      loadBreeds(goat.breed.type.id)
    } else {
      // Add mode - reset
      setForm({
        tagId: '',
        name: '',
        gender: 'MALE',
        birthDate: new Date().toISOString().split('T')[0],
        typeId: '',
        breedId: '',
        weight: '',
        status: 'ACTIVE',
        motherTagId: '',
        fatherTagId: '',
        penId: '',
        notes: ''
      })
      setBreeds([])
    }
  }, [goat, open])

  const loadTypes = async () => {
    try {
      const res = await fetch('/api/types')
      const data = await res.json()
      setTypes(Array.isArray(data) ? data : [])
    } catch { setTypes([]) }
  }

  const loadPens = async () => {
    try {
      const res = await fetch('/api/pens')
      if (res.ok) {
        const data = await res.json()
        setPens(data)
      }
    } catch { setPens([]) }
  }
  
  const loadBreeds = async (typeId: string) => {
    try {
      const res = await fetch(`/api/breeds?typeId=${typeId}`)
      const data = await res.json()
      setBreeds(Array.isArray(data) ? data : [])
    } catch { setBreeds([]) }
  }

  const loadGoats = async () => {
    try {
      const res = await fetch('/api/goats')
      const data = await res.json()
      setGoats(Array.isArray(data) ? data : [])
    } catch { setGoats([]) }
  }

  const handleSubmit = async () => {
    if (readOnly) return
    const payload = {
      tagId: form.tagId,
      name: form.name || null,
      gender: form.gender,
      birthDate: new Date(form.birthDate),
      breedId: form.breedId,
      weight: form.weight ? Number(form.weight) : null,
      status: form.status,
      penId: form.penId || null,
      notes: form.notes?.trim() || null
    }

    const url = goat ? `/api/goats/${goat.id}` : '/api/goats'
    const method = goat ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Failed to save')
      const savedGoat = await res.json()

      // Handle Parentage
      if (form.motherTagId !== '' || form.fatherTagId !== '' || goat) {
        await fetch(`/api/goats/${savedGoat.id ?? goat?.id}/parentage`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            motherTagId: form.motherTagId || null,
            fatherTagId: form.fatherTagId || null
          })
        })
      }
      onSave()
      onClose()
    } catch (error) {
      console.error(error)
      alert('حدث خطأ أثناء الحفظ')
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'نشط'
      case 'SOLD':
        return 'مباع'
      case 'QUARANTINE':
        return 'حجر صحي'
      case 'DECEASED':
        return 'متوفى'
      default:
        return status
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth={readOnly ? 'md' : 'sm'}>
      <DialogTitle>{readOnly ? lbl.file : goat ? lbl.edit : lbl.add}</DialogTitle>
      <DialogContent sx={{ pt: 2 }} dividers={readOnly}>
        {readOnly ? (
          goat ? (
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
                  <Typography><strong>رقم التاج:</strong> {goat.tagId}</Typography>
                  <Typography><strong>الاسم:</strong> {goat.name || '-'}</Typography>
                  <Typography><strong>النوع:</strong> {goat.breed.type.nameAr}</Typography>
                  <Typography><strong>السلالة:</strong> {goat.breed.nameAr}</Typography>
                  <Typography><strong>الجنس:</strong> {goat.gender === 'MALE' ? 'ذكر' : 'أنثى'}</Typography>
                  <Typography><strong>تاريخ الميلاد:</strong> {formatDate(goat.birthDate)}</Typography>
                  {goat.age ? (
                    <Typography><strong>العمر:</strong> {goat.age.formatted}</Typography>
                  ) : (
                    <Typography><strong>العمر:</strong> -</Typography>
                  )}
                  {goat.age ? (
                    <Typography><strong>الفئة العمرية:</strong> {goat.age.category}</Typography>
                  ) : (
                    <Typography><strong>الفئة العمرية:</strong> -</Typography>
                  )}
                  <Typography><strong>الوزن:</strong> {goat.weight ? `${goat.weight} كجم` : '-'}</Typography>
                  <Typography><strong>الحظيرة:</strong> {goat.pen ? goat.pen.nameAr : 'غير محدد'}</Typography>
                  <Typography><strong>الحالة:</strong> {getStatusLabel(goat.status)}</Typography>
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
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#fafafa', overflowX: 'auto' }}>
                      <Stack spacing={3} alignItems="center" minWidth={500}>
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

                        <Stack direction="row" spacing={12} position="relative">
                          <GoatNode member={familyData.father} label="الأب" color="secondary" />
                          <GoatNode member={familyData.mother} label="الأم" color="secondary" />
                        </Stack>

                        <GoatNode member={goat} label="الحيوان المختار" color="primary" />
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
          ) : (
            <Typography variant="body2">لا توجد بيانات للعرض</Typography>
          )
        ) : (
          <Stack spacing={2} mt={2}>
          <TextField
            label="رقم التاج"
            value={form.tagId}
            onChange={(e) => setForm({ ...form, tagId: e.target.value })}
            required
            disabled={readOnly}
          />
          <TextField
            label="الاسم"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            disabled={readOnly}
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
              disabled={readOnly}
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
              disabled={readOnly || !form.typeId}
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
              disabled={readOnly}
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
            disabled={readOnly}
          />
          <FormControl fullWidth>
            <InputLabel>الأم (اختياري)</InputLabel>
            <Select
              value={form.motherTagId}
              label="الأم (اختياري)"
              onChange={(e) => setForm({ ...form, motherTagId: e.target.value })}
              disabled={readOnly}
            >
               <MenuItem value=""><em>غير محدد</em></MenuItem>
               {goats
                  .filter((g) => 
                    (g.gender === 'FEMALE' && g.status === 'ACTIVE' && (!goat || g.id !== goat.id)) ||
                    (goat && goat.motherTagId === g.tagId) // keep existing mother in list
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
              disabled={readOnly}
            >
                <MenuItem value=""><em>غير محدد</em></MenuItem>
                {goats
                  .filter((g) => 
                    (g.gender === 'MALE' && g.status === 'ACTIVE' && (!goat || g.id !== goat.id)) ||
                    (goat && goat.fatherTagId === g.tagId) // keep existing father in list
                  )
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
            disabled={readOnly}
          />
          <FormControl>
            <InputLabel>الحظيرة (الموقع)</InputLabel>
            <Select
              value={form.penId}
              label="الحظيرة (الموقع)"
              onChange={(e) => setForm({ ...form, penId: e.target.value })}
              disabled={readOnly}
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
              disabled={readOnly}
            >
              <MenuItem value="ACTIVE">نشط</MenuItem>
              <MenuItem value="SOLD">مباع</MenuItem>
              <MenuItem value="QUARANTINE">حجر صحي</MenuItem>
              <MenuItem value="DECEASED">متوفى</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="ملاحظات"
            multiline
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            disabled={readOnly}
            placeholder="أي ملاحظات إضافية..."
          />
        </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        {!readOnly && (
          <Button variant="contained" onClick={handleSubmit}>حفظ</Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
