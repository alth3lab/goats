'use client'

import { useState, useEffect, Suspense } from 'react'
import {
  Box,
  Paper,
  Typography,
  Stack,
  Autocomplete,
  TextField,
  CircularProgress,
  Alert,
} from '@mui/material'
import { AccountTree as TreeIcon } from '@mui/icons-material'
import FamilyTree from '@/components/FamilyTree'
import { useSearchParams, useRouter } from 'next/navigation'

interface GoatOption {
  id: string
  tagId: string
  name?: string | null
  gender: string
  breed?: { nameAr: string } | null
}

function FamilyTreeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [goats, setGoats] = useState<GoatOption[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGoatId, setSelectedGoatId] = useState<string | null>(
    searchParams.get('id') || null
  )

  useEffect(() => {
    async function loadGoats() {
      try {
        const res = await fetch('/api/goats?limit=9999')
        const data = await res.json()
        const list = (data.goats || data || []).map((g: GoatOption) => ({
          id: g.id,
          tagId: g.tagId,
          name: g.name,
          gender: g.gender,
          breed: g.breed,
        }))
        setGoats(list)

        // Auto-select from URL param
        if (searchParams.get('id') && list.find((g: GoatOption) => g.id === searchParams.get('id'))) {
          setSelectedGoatId(searchParams.get('id'))
        }
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    loadGoats()
  }, [searchParams])

  const selectedGoat = goats.find(g => g.id === selectedGoatId) || null

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} mb={3}>
        <TreeIcon color="primary" sx={{ fontSize: 32 }} />
        <Typography variant="h5" fontWeight="bold">
          شجرة الأنساب
        </Typography>
      </Stack>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom color="text.secondary">
          اختر الحيوان لعرض شجرة أنسابه
        </Typography>
        {loading ? (
          <Stack alignItems="center" py={2}>
            <CircularProgress size={24} />
          </Stack>
        ) : (
          <Autocomplete
            options={goats}
            value={selectedGoat}
            onChange={(_, val) => {
              setSelectedGoatId(val?.id || null)
              if (val) {
                router.replace(`/dashboard/goats/family?id=${val.id}`)
              }
            }}
            getOptionLabel={(opt) =>
              `${opt.tagId}${opt.name ? ` - ${opt.name}` : ''} (${opt.gender === 'MALE' ? 'ذكر' : 'أنثى'}${opt.breed?.nameAr ? ` - ${opt.breed.nameAr}` : ''})`
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="بحث بالرقم أو الاسم"
                size="small"
              />
            )}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            noOptionsText="لا توجد نتائج"
            sx={{ maxWidth: 500 }}
          />
        )}
      </Paper>

      {selectedGoatId ? (
        <Paper sx={{ p: 2 }}>
          <FamilyTree
            goatId={selectedGoatId}
            onNavigate={(id) => {
              setSelectedGoatId(id)
              router.replace(`/dashboard/goats/family?id=${id}`)
            }}
          />
        </Paper>
      ) : (
        <Alert severity="info" icon={<TreeIcon />}>
          اختر حيواناً من القائمة أعلاه لعرض شجرة أنسابه التفاعلية
        </Alert>
      )}
    </Box>
  )
}

export default function FamilyTreePage() {
  return (
    <Suspense fallback={
      <Stack alignItems="center" py={8}><CircularProgress /></Stack>
    }>
      <FamilyTreeContent />
    </Suspense>
  )
}
