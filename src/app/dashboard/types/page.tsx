'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Divider,
  InputAdornment
} from '@mui/material'
import {
  Add as AddIcon,
  Category as CategoryIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AddCircleOutline as AddBreedIcon,
  History as HistoryIcon
} from '@mui/icons-material'
import { useAuth } from '@/lib/useAuth'
import { actionPermissions } from '@/lib/permissionMap'
import { EntityHistory } from '@/components/EntityHistory'

interface Breed {
  id: string
  name: string
  nameAr: string
  description?: string | null
}

interface GoatType {
  id: string
  name: string
  nameAr: string
  description?: string | null
  breeds: Breed[]
}

export default function TypesPage() {
  const { can } = useAuth()
  const canEditBreed = can(actionPermissions.editBreed)
  const canDeleteBreed = can(actionPermissions.deleteBreed)
  const [types, setTypes] = useState<GoatType[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', nameAr: '', description: '' })
  const [breedDialogOpen, setBreedDialogOpen] = useState(false)
  const [editingBreedId, setEditingBreedId] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyType, setHistoryType] = useState<GoatType | null>(null)
  const [breedForm, setBreedForm] = useState({
    typeId: '',
    name: '',
    nameAr: '',
    description: ''
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'NAME_ASC' | 'NAME_DESC' | 'BREEDS_DESC' | 'BREEDS_ASC'>('NAME_ASC')
  const [submitting, setSubmitting] = useState(false)

  const loadTypes = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/types')
      const data = await res.json()
      setTypes(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTypes()
  }, [])

  const handleOpenAddType = () => {
    setEditingTypeId(null)
    setForm({ name: '', nameAr: '', description: '' })
    setOpen(true)
  }

  const handleOpenEditType = (type: GoatType) => {
    setEditingTypeId(type.id)
    setForm({
      name: type.name || '',
      nameAr: type.nameAr || '',
      description: type.description || ''
    })
    setOpen(true)
  }

  const handleSubmitType = async () => {
    setSubmitting(true)
    try {
      const method = editingTypeId ? 'PUT' : 'POST'
      const url = editingTypeId ? `/api/types/${editingTypeId}` : '/api/types'
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      setOpen(false)
      setForm({ name: '', nameAr: '', description: '' })
      setEditingTypeId(null)
      await loadTypes()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteType = async (type: GoatType) => {
    const confirmed = window.confirm(`هل تريد حذف النوع "${type.nameAr}"؟ سيتم حذف السلالات التابعة له.`)
    if (!confirmed) return
    setSubmitting(true)
    try {
      await fetch(`/api/types/${type.id}`, { method: 'DELETE' })
      await loadTypes()
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenAddBreed = (type: GoatType) => {
    setEditingBreedId(null)
    setBreedForm({ typeId: type.id, name: '', nameAr: '', description: '' })
    setBreedDialogOpen(true)
  }

  const handleOpenHistory = (type: GoatType) => {
    setHistoryType(type)
    setHistoryOpen(true)
  }

  const handleOpenEditBreed = (typeId: string, breed: Breed) => {
    setEditingBreedId(breed.id)
    setBreedForm({
      typeId,
      name: breed.name || '',
      nameAr: breed.nameAr || '',
      description: breed.description || ''
    })
    setBreedDialogOpen(true)
  }

  const handleSubmitBreed = async () => {
    setSubmitting(true)
    try {
      const method = editingBreedId ? 'PUT' : 'POST'
      const url = editingBreedId ? `/api/breeds/${editingBreedId}` : '/api/breeds'
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typeId: breedForm.typeId,
          name: breedForm.name,
          nameAr: breedForm.nameAr,
          description: breedForm.description
        })
      })
      setBreedDialogOpen(false)
      setEditingBreedId(null)
      setBreedForm({ typeId: '', name: '', nameAr: '', description: '' })
      await loadTypes()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteBreed = async (breed: Breed) => {
    const confirmed = window.confirm(`هل تريد حذف السلالة "${breed.nameAr}"؟`)
    if (!confirmed) return
    setSubmitting(true)
    try {
      await fetch(`/api/breeds/${breed.id}`, { method: 'DELETE' })
      await loadTypes()
    } finally {
      setSubmitting(false)
    }
  }

  const filteredTypes = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const list = term
      ? types.filter(type => {
          const typeMatch = [type.name, type.nameAr, type.description]
            .filter(Boolean)
            .some(value => value!.toLowerCase().includes(term))
          const breedMatch = type.breeds.some(breed =>
            [breed.name, breed.nameAr, breed.description]
              .filter(Boolean)
              .some(value => value!.toLowerCase().includes(term))
          )
          return typeMatch || breedMatch
        })
      : [...types]

    return list.sort((a, b) => {
      switch (sortBy) {
        case 'NAME_DESC':
          return b.nameAr.localeCompare(a.nameAr)
        case 'BREEDS_DESC':
          return b.breeds.length - a.breeds.length
        case 'BREEDS_ASC':
          return a.breeds.length - b.breeds.length
        default:
          return a.nameAr.localeCompare(b.nameAr)
      }
    })
  }, [types, searchTerm, sortBy])

  const totalBreeds = useMemo(
    () => types.reduce((sum, type) => sum + type.breeds.length, 0),
    [types]
  )

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 2, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <CategoryIcon color="warning" />
            <Typography variant="h4" fontWeight="bold">الأنواع والسلالات</Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={`إجمالي الأنواع: ${types.length}`} color="primary" variant="outlined" />
            <Chip label={`إجمالي السلالات: ${totalBreeds}`} color="warning" variant="outlined" />
          </Stack>
        </Stack>
      </Paper>

      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField
            placeholder="ابحث عن نوع أو سلالة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              )
            }}
            fullWidth
          />
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel id="types-sort">الترتيب</InputLabel>
            <Select
              labelId="types-sort"
              label="الترتيب"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            >
              <MenuItem value="NAME_ASC">الاسم (تصاعدي)</MenuItem>
              <MenuItem value="NAME_DESC">الاسم (تنازلي)</MenuItem>
              <MenuItem value="BREEDS_DESC">الأكثر سلالات</MenuItem>
              <MenuItem value="BREEDS_ASC">الأقل سلالات</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAddType}
            disabled={!can(actionPermissions.addType)}
          >
            إضافة نوع
          </Button>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        {loading ? (
          <Grid size={{ xs: 12 }}><Typography align="center">جاري التحميل...</Typography></Grid>
        ) : filteredTypes.length === 0 ? (
          <Grid size={{ xs: 12 }}><Typography align="center">لا توجد بيانات</Typography></Grid>
        ) : (
          filteredTypes.map(type => (
            <Grid size={{ xs: 12, md: 6 }} key={type.id}>
              <Card sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                    <Box>
                      <Typography variant="h5" fontWeight="bold" gutterBottom>
                        {type.nameAr}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        الاسم (EN): {type.name || '-'}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <IconButton color="default" onClick={() => handleOpenHistory(type)}>
                        <HistoryIcon />
                      </IconButton>
                      <IconButton
                        color="primary"
                        onClick={() => handleOpenEditType(type)}
                        disabled={!can(actionPermissions.editType)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteType(type)}
                        disabled={!can(actionPermissions.deleteType)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  </Stack>

                  {type.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {type.description}
                    </Typography>
                  )}

                  <Divider sx={{ my: 2 }} />

                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" color="text.secondary">
                      عدد السلالات: {type.breeds.length}
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<AddBreedIcon />}
                      onClick={() => handleOpenAddBreed(type)}
                      disabled={!can(actionPermissions.addBreed)}
                    >
                      إضافة سلالة
                    </Button>
                  </Stack>

                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    {type.breeds.length === 0 ? (
                      <Chip label="لا توجد سلالات" size="small" variant="outlined" />
                    ) : (
                      type.breeds.map(breed => (
                        <Chip
                          key={breed.id}
                          label={breed.nameAr}
                          size="small"
                          color="primary"
                          onClick={canEditBreed ? () => handleOpenEditBreed(type.id, breed) : undefined}
                          onDelete={canDeleteBreed ? () => handleDeleteBreed(breed) : undefined}
                          clickable={canEditBreed}
                          disabled={!canEditBreed && !canDeleteBreed}
                        />
                      ))
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingTypeId ? 'تعديل النوع' : 'إضافة نوع جديد'}</DialogTitle>
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
          <Button variant="contained" onClick={handleSubmitType} disabled={submitting}>
            {submitting ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={breedDialogOpen} onClose={() => setBreedDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingBreedId ? 'تعديل السلالة' : 'إضافة سلالة'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={1}>
            <TextField
              label="اسم السلالة (EN)"
              value={breedForm.name}
              onChange={(e) => setBreedForm({ ...breedForm, name: e.target.value })}
            />
            <TextField
              label="اسم السلالة (عربي)"
              value={breedForm.nameAr}
              onChange={(e) => setBreedForm({ ...breedForm, nameAr: e.target.value })}
            />
            <TextField
              label="الوصف"
              value={breedForm.description}
              onChange={(e) => setBreedForm({ ...breedForm, description: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBreedDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSubmitBreed} disabled={submitting}>
            {submitting ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>سجل التغييرات</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {historyType ? (
            <EntityHistory entity="GoatType" entityId={historyType.id} />
          ) : (
            <Typography variant="body2">لا توجد بيانات</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
