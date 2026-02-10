'use client'

import { useEffect, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material'
import { Add as AddIcon, Category as CategoryIcon } from '@mui/icons-material'

interface Breed {
  id: string
  nameAr: string
}

interface GoatType {
  id: string
  nameAr: string
  breeds: Breed[]
}

export default function TypesPage() {
  const [types, setTypes] = useState<GoatType[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', nameAr: '', description: '' })

  useEffect(() => {
    fetch('/api/types')
      .then(res => res.json())
      .then(data => setTypes(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  const handleSubmit = async () => {
    await fetch('/api/types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })

    setForm({ name: '', nameAr: '', description: '' })
    setOpen(false)
    const res = await fetch('/api/types')
    const data = await res.json()
    setTypes(Array.isArray(data) ? data : [])
  }

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <CategoryIcon color="warning" />
            <Typography variant="h4" fontWeight="bold">الأنواع والسلالات</Typography>
          </Stack>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            إضافة نوع
          </Button>
        </Stack>
      </Paper>

      {loading ? (
        <Typography align="center">جاري التحميل...</Typography>
      ) : types.length === 0 ? (
        <Typography align="center">لا توجد بيانات</Typography>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
          {types.map(type => (
            <Card key={type.id} sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    {type.nameAr}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    عدد السلالات: {type.breeds.length}
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    {type.breeds.map(breed => (
                      <Chip key={breed.id} label={breed.nameAr} size="small" color="primary" />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
          ))}
        </Box>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>إضافة نوع جديد</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={1}>
            <TextField
              label="اسم النوع (EN)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <TextField
              label="اسم النوع (عربي)"
              value={form.nameAr}
              onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
            />
            <TextField
              label="الوصف"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSubmit}>حفظ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
