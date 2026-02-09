'use client'

import { useState, useEffect } from 'react'
import {
  Button,
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

interface Goat {
  id: string
  tagId: string
  name?: string
  gender: 'MALE' | 'FEMALE'
  birthDate: string
  weight?: number
  status: string
  motherTagId?: string | null
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

interface GoatFormDialogProps {
  open: boolean
  onClose: () => void
  goat?: Goat | null // If present, edit mode
  onSave: () => void
  readOnly?: boolean
}

export default function GoatFormDialog({ open, onClose, goat, onSave, readOnly = false }: GoatFormDialogProps) {
  const [types, setTypes] = useState<Array<{ id: string; nameAr: string }>>([])
  const [breeds, setBreeds] = useState<Array<{ id: string; nameAr: string }>>([])
  const [pens, setPens] = useState<Array<{ id: string; nameAr: string }>>([])
  const [goats, setGoats] = useState<Goat[]>([]) // For parent selection

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
    if (open) {
      loadTypes()
      loadPens()
      loadGoats() // Need all goats for parent selection
    }
  }, [open])

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
        penId: (goat.pen as any)?.id || (goat as any).penId || ''
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
        penId: ''
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
      penId: form.penId || null
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

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{readOnly ? 'ملف الماعز' : goat ? 'تعديل بيانات الماعز' : 'إضافة ماعز جديد'}</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2} mt={1}>
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
        </Stack>
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
