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
  Tab,
  Tabs,
  Button,
  Chip,
} from '@mui/material'
import {
  AccountTree as TreeIcon,
  CompareArrows as CompareIcon,
  ArrowForward as ArrowIcon,
} from '@mui/icons-material'
import FamilyTree from '@/components/FamilyTree'
import FamilyTreeCompare from '@/components/FamilyTreeCompare'
import { useSearchParams, useRouter } from 'next/navigation'

interface GoatOption {
  id: string
  tagId: string
  name?: string | null
  gender: string
  breed?: { nameAr: string } | null
}

function GoatAutocomplete({
  goats,
  value,
  onChange,
  label,
}: {
  goats: GoatOption[]
  value: GoatOption | null
  onChange: (val: GoatOption | null) => void
  label: string
}) {
  return (
    <Autocomplete
      options={goats}
      value={value}
      onChange={(_, val) => onChange(val)}
      getOptionLabel={(opt) =>
        `${opt.tagId}${opt.name ? ` - ${opt.name}` : ''} (${opt.gender === 'MALE' ? 'ذكر' : 'أنثى'}${opt.breed?.nameAr ? ` - ${opt.breed.nameAr}` : ''})`
      }
      renderInput={(params) => <TextField {...params} label={label} size="small" />}
      isOptionEqualToValue={(opt, val) => opt.id === val.id}
      noOptionsText="لا توجد نتائج"
      sx={{ flex: 1, minWidth: 220 }}
    />
  )
}

function FamilyTreeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [goats, setGoats] = useState<GoatOption[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'tree' | 'compare'>('tree')

  // Tree tab
  const [selectedGoatId, setSelectedGoatId] = useState<string | null>(
    searchParams.get('id') || null
  )

  // Compare tab
  const [compareGoat1, setCompareGoat1] = useState<GoatOption | null>(null)
  const [compareGoat2, setCompareGoat2] = useState<GoatOption | null>(null)
  const [showCompare, setShowCompare] = useState(false)

  useEffect(() => {
    async function loadGoats() {
      try {
        const res = await fetch('/api/goats?limit=9999')
        const data = await res.json()
        const list = (data.goats || data || []).map((g: GoatOption) => ({
          id: g.id, tagId: g.tagId, name: g.name, gender: g.gender, breed: g.breed,
        }))
        setGoats(list)
        if (searchParams.get('id') && list.find((g: GoatOption) => g.id === searchParams.get('id'))) {
          setSelectedGoatId(searchParams.get('id'))
        }
      } catch { /* ignore */ } finally {
        setLoading(false)
      }
    }
    loadGoats()
  }, [searchParams])

  const selectedGoat = goats.find(g => g.id === selectedGoatId) || null

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1} mb={3}>
        <TreeIcon color="primary" sx={{ fontSize: 32 }} />
        <Typography variant="h5" fontWeight="bold">شجرة الأنساب</Typography>
      </Stack>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => { setTab(v); setShowCompare(false) }}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab value="tree" label={
            <Stack direction="row" spacing={1} alignItems="center">
              <TreeIcon fontSize="small" /><span>شجرة فردية</span>
            </Stack>
          } />
          <Tab value="compare" label={
            <Stack direction="row" spacing={1} alignItems="center">
              <CompareIcon fontSize="small" /><span>مقارنة للتلقيح</span>
            </Stack>
          } />
        </Tabs>

        {/* Single tree: selector */}
        {tab === 'tree' && (
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              اختر الحيوان لعرض شجرة أنسابه
            </Typography>
            {loading
              ? <Stack alignItems="center" py={2}><CircularProgress size={24} /></Stack>
              : <GoatAutocomplete
                  goats={goats}
                  value={selectedGoat}
                  onChange={(val) => {
                    setSelectedGoatId(val?.id || null)
                    if (val) router.replace(`/dashboard/goats/family?id=${val.id}`)
                  }}
                  label="بحث بالرقم أو الاسم"
                />
            }
          </Box>
        )}

        {/* Compare: two selectors */}
        {tab === 'compare' && (
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              اختر حيوانَين لتحليل التوافق الجيني واكتشاف الأسلاف المشتركة قبل التلقيح
            </Typography>
            {loading
              ? <Stack alignItems="center" py={2}><CircularProgress size={24} /></Stack>
              : (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                  <GoatAutocomplete
                    goats={goats.filter(g => g.id !== compareGoat2?.id)}
                    value={compareGoat1}
                    onChange={(val) => { setCompareGoat1(val); setShowCompare(false) }}
                    label="الحيوان الأول"
                  />
                  <ArrowIcon color="action" sx={{ flexShrink: 0, display: { xs: 'none', sm: 'block' } }} />
                  <GoatAutocomplete
                    goats={goats.filter(g => g.id !== compareGoat1?.id)}
                    value={compareGoat2}
                    onChange={(val) => { setCompareGoat2(val); setShowCompare(false) }}
                    label="الحيوان الثاني"
                  />
                  <Button
                    variant="contained"
                    onClick={() => { if (compareGoat1 && compareGoat2 && compareGoat1.id !== compareGoat2.id) setShowCompare(true) }}
                    disabled={!compareGoat1 || !compareGoat2 || compareGoat1.id === compareGoat2.id}
                    startIcon={<CompareIcon />}
                    sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                  >
                    تحليل التوافق
                  </Button>
                </Stack>
              )
            }
            {compareGoat1 && compareGoat2 && compareGoat1.id === compareGoat2.id && (
              <Alert severity="warning" sx={{ mt: 1 }}>يجب اختيار حيوانَين مختلفَين</Alert>
            )}
            {compareGoat1 && compareGoat2 && compareGoat1.id !== compareGoat2.id && (
              <Stack direction="row" flexWrap="wrap" spacing={1} sx={{ mt: 1.5 }} alignItems="center">
                <Chip
                  label={`${compareGoat1.tagId}${compareGoat1.name ? ' - ' + compareGoat1.name : ''}`}
                  color={compareGoat1.gender === 'MALE' ? 'primary' : 'secondary'}
                  variant="outlined" size="small"
                />
                <CompareIcon fontSize="small" color="action" />
                <Chip
                  label={`${compareGoat2.tagId}${compareGoat2.name ? ' - ' + compareGoat2.name : ''}`}
                  color={compareGoat2.gender === 'MALE' ? 'primary' : 'secondary'}
                  variant="outlined" size="small"
                />
              </Stack>
            )}
          </Box>
        )}
      </Paper>

      {/* ===== Tree content ===== */}
      {tab === 'tree' && (
        selectedGoatId ? (
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
        )
      )}

      {/* ===== Compare content ===== */}
      {tab === 'compare' && (
        showCompare && compareGoat1 && compareGoat2 ? (
          <FamilyTreeCompare
            goatId1={compareGoat1.id}
            goatId2={compareGoat2.id}
            onNavigate={(id) => {
              setTab('tree')
              setSelectedGoatId(id)
              router.replace(`/dashboard/goats/family?id=${id}`)
            }}
          />
        ) : (
          !loading && (
            <Alert severity="info" icon={<CompareIcon />}>
              اختر حيوانَين واضغط &quot;تحليل التوافق&quot; لعرض تقرير التوافق الجيني ومقارنة شجرتَي الأنساب
            </Alert>
          )
        )
      )}
    </Box>
  )
}

export default function FamilyTreePage() {
  return (
    <Suspense fallback={<Stack alignItems="center" py={8}><CircularProgress /></Stack>}>
      <FamilyTreeContent />
    </Suspense>
  )
}
