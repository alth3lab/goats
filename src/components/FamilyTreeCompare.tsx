'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Box,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Paper,
  Grid,
  LinearProgress,
  Tooltip,
} from '@mui/material'
import {
  Male as MaleIcon,
  Female as FemaleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  ErrorOutline as ErrorIcon,
  AccountTree as TreeIcon,
  Pets as PetsIcon,
} from '@mui/icons-material'
import FamilyTree from '@/components/FamilyTree'

// ===== Types =====
interface FamilyMember {
  id: string
  tagId: string
  name?: string | null
  gender: 'MALE' | 'FEMALE'
  birthDate?: string | null
  status: string
  breed?: { nameAr: string } | null
  mother?: FamilyMember | null
  father?: FamilyMember | null
}

interface FamilyData {
  goat: FamilyMember
  mother?: FamilyMember | null
  father?: FamilyMember | null
  stats: { generations: number; totalOffspring: number }
}

interface CommonAncestor {
  id: string
  tagId: string
  name?: string | null
  gender: 'MALE' | 'FEMALE'
  breed?: { nameAr: string } | null
  relation1: string
  relation2: string
  generationDepth: number
}

interface CompareProps {
  goatId1: string
  goatId2: string
  onNavigate?: (id: string) => void
}

const MALE_COLOR = '#1976d2'
const FEMALE_COLOR = '#d81b60'

// ===== Build ancestor map =====
function buildAncestorMap(
  member: FamilyMember | null | undefined,
  depth: number,
  relation: string,
  map: Map<string, { member: FamilyMember; relation: string; depth: number }>
) {
  if (!member || depth > 4) return
  if (!map.has(member.id)) {
    map.set(member.id, { member, relation, depth })
  }
  buildAncestorMap(member.father, depth + 1, `أب ${relation}`, map)
  buildAncestorMap(member.mother, depth + 1, `أم ${relation}`, map)
}

function getCompatibilityScore(commonAncestors: CommonAncestor[]): {
  score: number
  label: string
  color: 'success' | 'warning' | 'error'
  icon: React.ReactNode
  advice: string
} {
  if (commonAncestors.length === 0) {
    return {
      score: 100,
      label: 'ممتاز - لا أسلاف مشتركة',
      color: 'success',
      icon: <CheckIcon sx={{ color: 'success.main' }} />,
      advice: 'التزاوج آمن تماماً. التنوع الجيني ممتاز لصحة وقوة النسل.',
    }
  }

  const minDepth = Math.min(...commonAncestors.map(a => a.generationDepth))
  // depth 1 = parent, 2 = grandparent, 3 = great-grandparent
  if (minDepth <= 1) {
    return {
      score: 5,
      label: 'خطر شديد - أحد الوالدين مشترك',
      color: 'error',
      icon: <ErrorIcon sx={{ color: 'error.main' }} />,
      advice: 'يُمنع التزاوج! الحيوانان يشتركان في أحد الوالدين المباشرين مما يؤدي لعيوب وراثية خطيرة.',
    }
  }
  if (minDepth === 2) {
    return {
      score: 30,
      label: 'خطر مرتفع - أجداد مشتركون',
      color: 'error',
      icon: <ErrorIcon sx={{ color: 'error.main' }} />,
      advice: 'يُنصح بتجنب هذا التزاوج. الأجداد المشتركون ترفع معدل الأمراض الوراثية بشكل كبير.',
    }
  }
  if (minDepth === 3) {
    return {
      score: 60,
      label: 'تحذير - أجداد من الجيل الثالث',
      color: 'warning',
      icon: <WarningIcon sx={{ color: 'warning.main' }} />,
      advice: 'التزاوج مقبول لكن يُراقب. جداد الجيل الثالث المشتركون مخاطرة معقولة عند الضرورة.',
    }
  }
  return {
    score: 80,
    label: 'جيد - أسلاف بعيدة مشتركة',
    color: 'warning',
    icon: <WarningIcon sx={{ color: 'warning.main' }} />,
    advice: 'التزاوج مقبول. الأسلاف المشتركة بعيدة جداً وتأثيرها الجيني محدود.',
  }
}

// ===== Component =====
export default function FamilyTreeCompare({ goatId1, goatId2, onNavigate }: CompareProps) {
  const [data1, setData1] = useState<FamilyData | null>(null)
  const [data2, setData2] = useState<FamilyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [commonAncestors, setCommonAncestors] = useState<CommonAncestor[]>([])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [res1, res2] = await Promise.all([
        fetch(`/api/goats/${goatId1}/family`),
        fetch(`/api/goats/${goatId2}/family`),
      ])
      if (!res1.ok || !res2.ok) throw new Error('فشل في تحميل البيانات')
      const [d1, d2]: [FamilyData, FamilyData] = await Promise.all([res1.json(), res2.json()])
      setData1(d1)
      setData2(d2)

      // Build ancestor maps
      const map1 = new Map<string, { member: FamilyMember; relation: string; depth: number }>()
      const map2 = new Map<string, { member: FamilyMember; relation: string; depth: number }>()
      buildAncestorMap(d1.father, 1, 'الأب', map1)
      buildAncestorMap(d1.mother, 1, 'الأم', map1)
      buildAncestorMap(d2.father, 1, 'الأب', map2)
      buildAncestorMap(d2.mother, 1, 'الأم', map2)

      // Find common ancestors
      const common: CommonAncestor[] = []
      for (const [id, info1] of map1) {
        if (map2.has(id)) {
          const info2 = map2.get(id)!
          common.push({
            id,
            tagId: info1.member.tagId,
            name: info1.member.name,
            gender: info1.member.gender,
            breed: info1.member.breed,
            relation1: info1.relation,
            relation2: info2.relation,
            generationDepth: Math.min(info1.depth, info2.depth),
          })
        }
      }
      // Sort by depth (closest first)
      common.sort((a, b) => a.generationDepth - b.generationDepth)
      setCommonAncestors(common)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطأ غير متوقع')
    } finally {
      setLoading(false)
    }
  }, [goatId1, goatId2])

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <Stack alignItems="center" py={6} spacing={2}>
        <CircularProgress size={36} />
        <Typography variant="body2" color="text.secondary">
          جاري تحليل الأنساب...
        </Typography>
      </Stack>
    )
  }

  if (error) return <Alert severity="error">{error}</Alert>
  if (!data1 || !data2) return null

  const compat = getCompatibilityScore(commonAncestors)

  return (
    <Stack spacing={3}>
      {/* ===== Compatibility Banner ===== */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2,
          borderColor: `${compat.color}.main`,
          bgcolor: `${compat.color}.50`,
        }}
      >
        <Stack spacing={1.5}>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            {compat.icon}
            <Box flex={1}>
              <Typography variant="subtitle1" fontWeight="bold">
                نتيجة تحليل التوافق الجيني
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {data1.goat.tagId}
                {data1.goat.name ? ` (${data1.goat.name})` : ''} ←→{' '}
                {data2.goat.tagId}
                {data2.goat.name ? ` (${data2.goat.name})` : ''}
              </Typography>
            </Box>
            <Chip
              label={`${compat.score}%`}
              color={compat.color}
              sx={{ fontWeight: 'bold', fontSize: '1rem', px: 1 }}
            />
          </Stack>

          <Box>
            <Stack direction="row" justifyContent="space-between" mb={0.5}>
              <Typography variant="caption" color="text.secondary">
                نسبة التوافق
              </Typography>
              <Typography variant="caption" fontWeight="bold" color={`${compat.color}.main`}>
                {compat.label}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={compat.score}
              color={compat.color}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>

          <Alert severity={compat.color === 'success' ? 'success' : compat.color === 'warning' ? 'warning' : 'error'}
            icon={false}
            sx={{ py: 0.5 }}
          >
            <Typography variant="caption">{compat.advice}</Typography>
          </Alert>
        </Stack>
      </Paper>

      {/* ===== Common Ancestors ===== */}
      {commonAncestors.length > 0 ? (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <WarningIcon color="warning" fontSize="small" />
            <Typography variant="subtitle2" fontWeight="bold">
              الأسلاف المشتركة ({commonAncestors.length})
            </Typography>
          </Stack>
          <Stack spacing={1}>
            {commonAncestors.map((anc) => (
              <Box
                key={anc.id}
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  bgcolor: anc.generationDepth <= 2 ? 'error.50' : 'warning.50',
                  border: 1,
                  borderColor: anc.generationDepth <= 2 ? 'error.200' : 'warning.200',
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" gap={0.5}>
                  {anc.gender === 'MALE'
                    ? <MaleIcon sx={{ fontSize: 16, color: MALE_COLOR }} />
                    : <FemaleIcon sx={{ fontSize: 16, color: FEMALE_COLOR }} />
                  }
                  <Typography variant="body2" fontWeight="bold">
                    {anc.tagId}{anc.name ? ` - ${anc.name}` : ''}
                  </Typography>
                  {anc.breed?.nameAr && (
                    <Typography variant="caption" color="text.secondary">
                      ({anc.breed.nameAr})
                    </Typography>
                  )}
                  <Chip
                    label={`جيل ${anc.generationDepth}`}
                    size="small"
                    color={anc.generationDepth <= 2 ? 'error' : 'warning'}
                    variant="outlined"
                    sx={{ fontSize: '0.6rem', height: 20 }}
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  في شجرة {data1?.goat.tagId}: <strong>{anc.relation1}</strong>
                  {' • '}
                  في شجرة {data2?.goat.tagId}: <strong>{anc.relation2}</strong>
                </Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'success.50', borderColor: 'success.200' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <CheckIcon color="success" />
            <Typography variant="body2" color="success.dark">
              لا توجد أسلاف مشتركة في السجلات المتاحة — تنوع جيني ممتاز
            </Typography>
          </Stack>
        </Paper>
      )}

      {/* ===== Quick Stats Comparison ===== */}
      <Grid container spacing={2}>
        {[
          { data: data1, label: 'الحيوان الأول' },
          { data: data2, label: 'الحيوان الثاني' },
        ].map(({ data, label }, idx) => (
          <Grid size={{ xs: 12, sm: 6 }} key={idx}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <PetsIcon
                  fontSize="small"
                  sx={{ color: data.goat.gender === 'MALE' ? MALE_COLOR : FEMALE_COLOR }}
                />
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {label}
                  </Typography>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {data.goat.tagId}{data.goat.name ? ` - ${data.goat.name}` : ''}
                  </Typography>
                </Box>
                <Chip
                  label={data.goat.gender === 'MALE' ? 'ذكر' : 'أنثى'}
                  size="small"
                  sx={{
                    mr: 'auto',
                    color: data.goat.gender === 'MALE' ? MALE_COLOR : FEMALE_COLOR,
                    borderColor: data.goat.gender === 'MALE' ? MALE_COLOR : FEMALE_COLOR,
                  }}
                  variant="outlined"
                />
              </Stack>
              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                {data.goat.breed?.nameAr && (
                  <Chip label={data.goat.breed.nameAr} size="small" variant="filled" />
                )}
                <Chip
                  label={`${data.stats.totalOffspring} أبناء`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label={`${data.stats.generations} أجيال`}
                  size="small"
                  variant="outlined"
                />
                {data.father && (
                  <Tooltip title={`الأب: ${data.father.tagId}`}>
                    <Chip
                      icon={<MaleIcon />}
                      label="الأب موثق"
                      size="small"
                      sx={{ color: MALE_COLOR, borderColor: MALE_COLOR }}
                      variant="outlined"
                    />
                  </Tooltip>
                )}
                {data.mother && (
                  <Tooltip title={`الأم: ${data.mother.tagId}`}>
                    <Chip
                      icon={<FemaleIcon />}
                      label="الأم موثقة"
                      size="small"
                      sx={{ color: FEMALE_COLOR, borderColor: FEMALE_COLOR }}
                      variant="outlined"
                    />
                  </Tooltip>
                )}
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Divider>
        <Stack direction="row" alignItems="center" spacing={1}>
          <TreeIcon fontSize="small" color="action" />
          <Typography variant="caption" color="text.secondary">
            شجرتا الأنساب
          </Typography>
        </Stack>
      </Divider>

      {/* ===== Side-by-side Trees ===== */}
      <Grid container spacing={2}>
        {[
          { goatId: goatId1, data: data1, label: 'الحيوان الأول' },
          { goatId: goatId2, data: data2, label: 'الحيوان الثاني' },
        ].map(({ goatId, data, label }, idx) => (
          <Grid size={{ xs: 12, lg: 6 }} key={idx}>
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                <Typography variant="subtitle2" fontWeight="bold">
                  {label}:{' '}
                  <span style={{ color: data.goat.gender === 'MALE' ? MALE_COLOR : FEMALE_COLOR }}>
                    {data.goat.tagId}{data.goat.name ? ` - ${data.goat.name}` : ''}
                  </span>
                </Typography>
              </Stack>
              <FamilyTree
                goatId={goatId}
                compact
                onNavigate={onNavigate}
              />
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Stack>
  )
}
