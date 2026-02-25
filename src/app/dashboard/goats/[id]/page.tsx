'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Box, Paper, Typography, Grid, Stack, Chip, Avatar, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tabs, Tab, Button, IconButton, Tooltip, Skeleton, Alert,
  Card, CardContent, CircularProgress, Snackbar, Badge,
} from '@mui/material'
import {
  ArrowBack as BackIcon,
  Male as MaleIcon,
  Female as FemaleIcon,
  Pets as PetsIcon,
  LocalHospital as HealthIcon,
  FavoriteBorder as BreedingIcon,
  ShoppingCart as SalesIcon,
  Restaurant as FeedIcon,
  AccountTree as TreeIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  CalendarToday as CalendarIcon,
  Scale as WeightIcon,
  HomeWork as PenIcon,
  Person as OwnerIcon,
  Tag as TagIcon,
  Palette as ColorIcon,
  ChildCare as OffspringIcon,
  Print as PrintIcon,
  CameraAlt as CameraIcon,
  DeleteForever as DeletePhotoIcon,
} from '@mui/icons-material'
import { useAuth } from '@/lib/useAuth'
import { getAnimalLabels } from '@/lib/animalLabels'
import { formatCurrency, formatDate, formatNumber } from '@/lib/formatters'
import FamilyTree from '@/components/FamilyTree'
import { EntityHistory } from '@/components/EntityHistory'

/* ── Status & type labels ── */
const statusMap: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
  ACTIVE: { label: 'نشط', color: 'success' },
  SOLD: { label: 'مباع', color: 'warning' },
  DECEASED: { label: 'نافق', color: 'error' },
  QUARANTINE: { label: 'حجر صحي', color: 'info' },
  EXTERNAL: { label: 'خارجي', color: 'default' },
}

const healthTypeMap: Record<string, string> = {
  VACCINATION: 'تطعيم', DEWORMING: 'تجريع', TREATMENT: 'علاج',
  CHECKUP: 'فحص', SURGERY: 'جراحة',
}

const pregnancyStatusMap: Record<string, string> = {
  MATED: 'ملقّحة', PREGNANT: 'حامل', DELIVERED: 'ولدت', FAILED: 'فاشل',
}

const pregnancyColorMap: Record<string, 'info' | 'warning' | 'success' | 'error'> = {
  MATED: 'info', PREGNANT: 'warning', DELIVERED: 'success', FAILED: 'error',
}

/* ── Info Row ── */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  if (!value || value === '—') return null
  return (
    <Stack direction="row" spacing={2} alignItems="center" py={0.8}>
      <Box sx={{ color: 'text.secondary', minWidth: 28, display: 'flex', justifyContent: 'center' }}>{icon}</Box>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 100 }}>{label}</Typography>
      <Typography variant="body2" fontWeight="bold" sx={{ flex: 1 }}>{value}</Typography>
    </Stack>
  )
}

/* ── Stat Mini Card ── */
function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ bgcolor: `${color}.main`, width: 36, height: 36 }}>{icon}</Avatar>
          <Box>
            <Typography variant="h6" fontWeight="bold" lineHeight={1.2}>{value}</Typography>
            <Typography variant="caption" color="text.secondary">{label}</Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

/* ── Skeleton ── */
function ProfileSkeleton() {
  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" spacing={3} alignItems="center">
          <Skeleton variant="circular" width={72} height={72} />
          <Box sx={{ flex: 1 }}>
            <Skeleton width="40%" height={36} />
            <Skeleton width="60%" />
          </Box>
        </Stack>
      </Paper>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, borderRadius: 3, height: 300 }}><Skeleton variant="rectangular" height="100%" /></Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3, borderRadius: 3, height: 300 }}><Skeleton variant="rectangular" height="100%" /></Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════ */
export default function GoatProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { farm } = useAuth()
  const animalLbl = getAnimalLabels(farm?.farmType)
  const id = params.id as string

  const [goat, setGoat] = useState<GoatProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [snackMsg, setSnackMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchGoat = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/goats/${id}`)
      if (!res.ok) throw new Error('not found')
      const data = await res.json()
      setGoat(data)
    } catch {
      setError('لم يتم العثور على الحيوان')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchGoat() }, [fetchGoat])

  /* ── Image resize helper ── */
  const resizeImage = (file: File, maxSize: number, quality: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let w = img.width, h = img.height
          if (w > h) { if (w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize } }
          else { if (h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize } }
          canvas.width = w
          canvas.height = h
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, w, h)
          resolve(canvas.toDataURL('image/jpeg', quality))
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setSnackMsg('الرجاء اختيار ملف صورة')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setSnackMsg('حجم الصورة كبير جداً (الحد الأقصى 10 ميجابايت)')
      return
    }
    setUploading(true)
    try {
      const [image, thumbnail] = await Promise.all([
        resizeImage(file, 800, 0.8),
        resizeImage(file, 150, 0.7),
      ])
      const res = await fetch(`/api/goats/${id}/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, thumbnail }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'فشل الرفع')
      }
      setSnackMsg('تم رفع الصورة بنجاح')
      fetchGoat()
    } catch (err: unknown) {
      setSnackMsg(err instanceof Error ? err.message : 'فشل في رفع الصورة')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteImage = async () => {
    if (!confirm('هل تريد حذف الصورة؟')) return
    setUploading(true)
    try {
      const res = await fetch(`/api/goats/${id}/image`, { method: 'DELETE' })
      if (!res.ok) throw new Error('فشل الحذف')
      setSnackMsg('تم حذف الصورة')
      fetchGoat()
    } catch {
      setSnackMsg('فشل في حذف الصورة')
    } finally {
      setUploading(false)
    }
  }

  /* ── Computed data ── */
  const allBreedings = useMemo(() => {
    if (!goat) return []
    return [
      ...(goat.breedingAsMother ?? []).map(b => ({ ...b, role: 'أم' as const })),
      ...(goat.breedingAsFather ?? []).map(b => ({ ...b, role: 'أب' as const })),
    ].sort((a, b) => new Date(b.matingDate).getTime() - new Date(a.matingDate).getTime())
  }, [goat])

  const totalHealthCost = useMemo(() =>
    goat?.healthRecords?.reduce((s, r) => s + (r.cost ?? 0), 0) ?? 0
  , [goat])

  const totalSalesAmount = useMemo(() =>
    goat?.sales?.reduce((s, r) => s + (r.salePrice ?? 0), 0) ?? 0
  , [goat])

  const calcAge = (birthDate?: string | null) => {
    if (!birthDate) return '—'
    const months = Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    if (months < 12) return `${months} شهر`
    const years = Math.floor(months / 12)
    const rem = months % 12
    return rem > 0 ? `${years} سنة ${rem} شهر` : `${years} سنة`
  }

  if (loading) return <ProfileSkeleton />
  if (error || !goat) return (
    <Box textAlign="center" py={8}>
      <Alert severity="error" sx={{ maxWidth: 400, mx: 'auto', mb: 2 }}>{error || 'خطأ'}</Alert>
      <Button startIcon={<BackIcon />} onClick={() => router.push('/dashboard/goats')}>العودة للقائمة</Button>
    </Box>
  )

  const st = statusMap[goat.status] ?? statusMap.ACTIVE
  const isFemale = goat.gender === 'FEMALE'

  return (
    <Box sx={{ width: '100%', overflowX: 'hidden' }}>
      {/* ── Header ── */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={2}>
          <Tooltip title="العودة">
            <IconButton onClick={() => router.push('/dashboard/goats')}><BackIcon /></IconButton>
          </Tooltip>
          <Typography variant="body2" color="text.secondary">إدارة {animalLbl.plural}</Typography>
          <Typography variant="body2" color="text.secondary">›</Typography>
          <Typography variant="body2" fontWeight="bold">ملف {animalLbl.singular}</Typography>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', sm: 'center' }}>
          {/* Avatar with photo upload */}
          <Box sx={{ position: 'relative', display: 'inline-block' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handleImageUpload}
            />
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                uploading ? (
                  <CircularProgress size={24} />
                ) : (
                  <Stack direction="row" spacing={0}>
                    <IconButton
                      size="small"
                      onClick={() => fileInputRef.current?.click()}
                      sx={{ bgcolor: 'primary.main', color: 'white', width: 28, height: 28, '&:hover': { bgcolor: 'primary.dark' } }}
                    >
                      <CameraIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    {goat.image && (
                      <IconButton
                        size="small"
                        onClick={handleDeleteImage}
                        sx={{ bgcolor: 'error.main', color: 'white', width: 28, height: 28, ml: 0.5, '&:hover': { bgcolor: 'error.dark' } }}
                      >
                        <DeletePhotoIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                  </Stack>
                )
              }
            >
              <Avatar
                src={goat.image || undefined}
                sx={{
                  bgcolor: isFemale ? 'secondary.main' : 'info.main',
                  width: 80,
                  height: 80,
                  fontSize: 32,
                  cursor: 'pointer',
                  border: goat.image ? '3px solid' : 'none',
                  borderColor: isFemale ? 'secondary.main' : 'info.main',
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {!goat.image && (isFemale ? <FemaleIcon sx={{ fontSize: 40 }} /> : <MaleIcon sx={{ fontSize: 40 }} />)}
              </Avatar>
            </Badge>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <Typography variant="h4" fontWeight="bold">{goat.tagId}</Typography>
              {goat.name && <Typography variant="h6" color="text.secondary">({goat.name})</Typography>}
              <Chip label={st.label} color={st.color} size="small" />
              <Chip label={isFemale ? 'أنثى' : 'ذكر'} color={isFemale ? 'secondary' : 'info'} variant="outlined" size="small" />
              {goat.age?.category && <Chip label={goat.age.category} size="small" variant="outlined" />}
            </Stack>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              {goat.breed?.type?.nameAr} — {goat.breed?.nameAr} | العمر: {goat.age?.formatted ?? calcAge(goat.birthDate)}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" size="small" startIcon={<EditIcon />} onClick={() => router.push(`/dashboard/goats?edit=${goat.id}`)}>
              تعديل
            </Button>
            <Button variant="outlined" size="small" startIcon={<PrintIcon />} onClick={() => window.print()}>
              طباعة
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* ── Quick Stats ── */}
      <Grid container spacing={2} mb={3}>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard label="سجلات صحية" value={formatNumber(goat.healthRecords?.length ?? 0)} icon={<HealthIcon sx={{ fontSize: 20 }} />} color="info" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard label="تكلفة العلاج" value={formatCurrency(totalHealthCost)} icon={<HealthIcon sx={{ fontSize: 20 }} />} color="error" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard label="سجلات التكاثر" value={formatNumber(allBreedings.length)} icon={<BreedingIcon sx={{ fontSize: 20 }} />} color="secondary" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard label="المبيعات" value={formatCurrency(totalSalesAmount)} icon={<SalesIcon sx={{ fontSize: 20 }} />} color="success" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard label="سجلات التغذية" value={formatNumber(goat.feedingRecords?.length ?? 0)} icon={<FeedIcon sx={{ fontSize: 20 }} />} color="warning" />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 2 }}>
          <StatCard label="الوزن" value={goat.weight ? `${goat.weight} كجم` : '—'} icon={<WeightIcon sx={{ fontSize: 20 }} />} color="primary" />
        </Grid>
      </Grid>

      {/* ── Main Content ── */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2, '& .MuiTab-root': { fontWeight: 'bold', fontSize: { xs: 12, sm: 14 } } }}
        >
          <Tab label="المعلومات" icon={<PetsIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="الصحة" icon={<HealthIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="التكاثر" icon={<BreedingIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="المبيعات" icon={<SalesIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="التغذية" icon={<FeedIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="شجرة النسب" icon={<TreeIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab label="السجل" icon={<HistoryIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
        </Tabs>

        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {/* ── TAB 0: Info ── */}
          {tab === 0 && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle1" fontWeight="bold" mb={1}>البيانات الأساسية</Typography>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <InfoRow icon={<TagIcon fontSize="small" />} label="رقم الحيوان" value={goat.tagId} />
                  <InfoRow icon={<PetsIcon fontSize="small" />} label="الاسم" value={goat.name ?? '—'} />
                  <InfoRow icon={isFemale ? <FemaleIcon fontSize="small" /> : <MaleIcon fontSize="small" />} label="الجنس" value={isFemale ? 'أنثى' : 'ذكر'} />
                  <InfoRow icon={<CalendarIcon fontSize="small" />} label="تاريخ الميلاد" value={formatDate(goat.birthDate)} />
                  <InfoRow icon={<WeightIcon fontSize="small" />} label="الوزن" value={goat.weight ? `${goat.weight} كجم` : '—'} />
                  <InfoRow icon={<ColorIcon fontSize="small" />} label="اللون" value={goat.color ?? '—'} />
                  <InfoRow icon={<PenIcon fontSize="small" />} label="الحظيرة" value={goat.pen?.name ?? '—'} />
                  <InfoRow icon={<OwnerIcon fontSize="small" />} label="المالك" value={goat.ownerName ?? '—'} />
                </Paper>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle1" fontWeight="bold" mb={1}>النسب والمصدر</Typography>
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <InfoRow icon={<PetsIcon fontSize="small" />} label="النوع" value={goat.breed?.type?.nameAr ?? '—'} />
                  <InfoRow icon={<PetsIcon fontSize="small" />} label="السلالة" value={goat.breed?.nameAr ?? '—'} />
                  <InfoRow icon={<FemaleIcon fontSize="small" />} label="رقم الأم" value={goat.motherTagId ?? '—'} />
                  <InfoRow icon={<MaleIcon fontSize="small" />} label="رقم الأب" value={goat.fatherTagId ?? '—'} />
                  <InfoRow icon={<CalendarIcon fontSize="small" />} label="تاريخ الشراء" value={formatDate(goat.purchaseDate) ?? '—'} />
                  <InfoRow icon={<SalesIcon fontSize="small" />} label="سعر الشراء" value={goat.purchasePrice ? formatCurrency(goat.purchasePrice) : '—'} />
                  <InfoRow icon={<PetsIcon fontSize="small" />} label="المزرعة الأصلية" value={goat.originFarm ?? '—'} />
                </Paper>
                {goat.notes && (
                  <Box mt={2}>
                    <Typography variant="subtitle1" fontWeight="bold" mb={1}>ملاحظات</Typography>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                      <Typography variant="body2">{goat.notes}</Typography>
                    </Paper>
                  </Box>
                )}
              </Grid>
            </Grid>
          )}

          {/* ── TAB 1: Health Records ── */}
          {tab === 1 && (
            <Box>
              {(!goat.healthRecords || goat.healthRecords.length === 0) ? (
                <Typography color="text.secondary" textAlign="center" py={4}>لا توجد سجلات صحية</Typography>
              ) : (
                <TableContainer>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>التاريخ</TableCell>
                        <TableCell>النوع</TableCell>
                        <TableCell>الوصف</TableCell>
                        <TableCell>الطبيب</TableCell>
                        <TableCell>الدواء</TableCell>
                        <TableCell align="right">التكلفة</TableCell>
                        <TableCell>الموعد القادم</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {goat.healthRecords.map((r, i) => (
                        <TableRow key={r.id} hover>
                          <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{i + 1}</TableCell>
                          <TableCell>{formatDate(r.date)}</TableCell>
                          <TableCell>
                            <Chip label={healthTypeMap[r.type] ?? r.type} size="small" color="info" variant="outlined" />
                          </TableCell>
                          <TableCell>{r.description ?? '—'}</TableCell>
                          <TableCell>{r.veterinarian ?? '—'}</TableCell>
                          <TableCell>
                            {r.medication && <span>{r.medication}{r.dosage ? ` (${r.dosage})` : ''}</span>}
                            {!r.medication && '—'}
                          </TableCell>
                          <TableCell align="right">{r.cost ? formatCurrency(r.cost) : '—'}</TableCell>
                          <TableCell>
                            {r.nextDueDate ? <Chip label={formatDate(r.nextDueDate)} size="small" color="warning" variant="outlined" /> : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {totalHealthCost > 0 && (
                <Paper variant="outlined" sx={{ p: 2, mt: 2, borderRadius: 2, bgcolor: 'error.50' }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" fontWeight="bold">إجمالي تكاليف العلاج</Typography>
                    <Typography variant="body2" fontWeight="bold" color="error.main">{formatCurrency(totalHealthCost)}</Typography>
                  </Stack>
                </Paper>
              )}
            </Box>
          )}

          {/* ── TAB 2: Breeding ── */}
          {tab === 2 && (
            <Box>
              {allBreedings.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>لا توجد سجلات تكاثر</Typography>
              ) : (
                <TableContainer>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>تاريخ التلقيح</TableCell>
                        <TableCell>الدور</TableCell>
                        <TableCell>الشريك</TableCell>
                        <TableCell>الحالة</TableCell>
                        <TableCell>تاريخ الولادة المتوقع</TableCell>
                        <TableCell>تاريخ الولادة</TableCell>
                        <TableCell align="center">المواليد</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {allBreedings.map((b, i) => {
                        const partner = b.role === 'أم' ? b.father : b.mother
                        return (
                          <TableRow key={b.id} hover>
                            <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{i + 1}</TableCell>
                            <TableCell>{formatDate(b.matingDate)}</TableCell>
                            <TableCell><Chip label={b.role} size="small" color={b.role === 'أم' ? 'secondary' : 'info'} /></TableCell>
                            <TableCell>
                              {partner?.tagId ? (
                                <Chip label={partner.tagId} size="small" variant="outlined" clickable
                                  onClick={() => router.push(`/dashboard/goats/${partner.id ?? ''}`)} />
                              ) : '—'}
                            </TableCell>
                            <TableCell>
                              <Chip label={pregnancyStatusMap[b.pregnancyStatus] ?? b.pregnancyStatus} size="small"
                                color={pregnancyColorMap[b.pregnancyStatus] ?? 'default'} />
                            </TableCell>
                            <TableCell>{formatDate(b.dueDate) ?? '—'}</TableCell>
                            <TableCell>{formatDate(b.birthDate) ?? '—'}</TableCell>
                            <TableCell align="center">
                              {b.births?.length ? (
                                <Stack spacing={0.5}>
                                  {b.births.map((birth: Birth) => (
                                    <Chip key={birth.id}
                                      label={`${birth.kidTagId ?? '—'} (${birth.gender === 'MALE' ? 'ذكر' : 'أنثى'}) ${birth.weight ? birth.weight + ' كجم' : ''}`}
                                      size="small" variant="outlined" color={birth.status === 'ALIVE' ? 'success' : 'error'}
                                      clickable={!!birth.kidGoatId}
                                      onClick={() => birth.kidGoatId && router.push(`/dashboard/goats/${birth.kidGoatId}`)}
                                    />
                                  ))}
                                </Stack>
                              ) : (
                                <Typography variant="caption" color="text.secondary">{b.numberOfKids ?? 0}</Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* ── TAB 3: Sales ── */}
          {tab === 3 && (
            <Box>
              {(!goat.sales || goat.sales.length === 0) ? (
                <Typography color="text.secondary" textAlign="center" py={4}>لا توجد مبيعات مسجلة</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>التاريخ</TableCell>
                        <TableCell>المشتري</TableCell>
                        <TableCell>هاتف المشتري</TableCell>
                        <TableCell align="right">السعر</TableCell>
                        <TableCell>حالة الدفع</TableCell>
                        <TableCell>ملاحظات</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {goat.sales.map((s) => (
                        <TableRow key={s.id} hover>
                          <TableCell>{formatDate(s.date)}</TableCell>
                          <TableCell>{s.buyerName ?? '—'}</TableCell>
                          <TableCell>{s.buyerPhone ?? '—'}</TableCell>
                          <TableCell align="right"><strong>{formatCurrency(s.salePrice ?? 0)}</strong></TableCell>
                          <TableCell>
                            <Chip label={s.paymentStatus === 'PAID' ? 'مدفوع' : s.paymentStatus === 'PENDING' ? 'معلق' : 'جزئي'}
                              size="small" color={s.paymentStatus === 'PAID' ? 'success' : s.paymentStatus === 'PENDING' ? 'warning' : 'default'} />
                          </TableCell>
                          <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{s.notes ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
              {totalSalesAmount > 0 && (
                <Paper variant="outlined" sx={{ p: 2, mt: 2, borderRadius: 2, bgcolor: 'success.50' }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" fontWeight="bold">إجمالي المبيعات</Typography>
                    <Typography variant="body2" fontWeight="bold" color="success.main">{formatCurrency(totalSalesAmount)}</Typography>
                  </Stack>
                </Paper>
              )}
            </Box>
          )}

          {/* ── TAB 4: Feeding ── */}
          {tab === 4 && (
            <Box>
              {(!goat.feedingRecords || goat.feedingRecords.length === 0) ? (
                <Typography color="text.secondary" textAlign="center" py={4}>لا توجد سجلات تغذية</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>#</TableCell>
                        <TableCell>التاريخ</TableCell>
                        <TableCell>نوع العلف</TableCell>
                        <TableCell>الكمية</TableCell>
                        <TableCell align="right">التكلفة</TableCell>
                        <TableCell>ملاحظات</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {goat.feedingRecords.map((f, i) => (
                        <TableRow key={f.id} hover>
                          <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{i + 1}</TableCell>
                          <TableCell>{formatDate(f.date)}</TableCell>
                          <TableCell>{f.feedType ?? '—'}</TableCell>
                          <TableCell>{f.quantity ? `${f.quantity} ${f.unit ?? 'كجم'}` : '—'}</TableCell>
                          <TableCell align="right">{f.cost ? formatCurrency(f.cost) : '—'}</TableCell>
                          <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{f.notes ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* ── TAB 5: Family Tree ── */}
          {tab === 5 && (
            <Box sx={{ minHeight: 400 }}>
              <FamilyTree goatId={goat.id} onNavigate={(navId) => router.push(`/dashboard/goats/${navId}`)} />
            </Box>
          )}

          {/* ── TAB 6: Activity History ── */}
          {tab === 6 && (
            <Box>
              <EntityHistory entity="Goat" entityId={goat.id} limit={50} />
            </Box>
          )}
        </Box>
      </Paper>
      <Snackbar
        open={!!snackMsg}
        autoHideDuration={3000}
        onClose={() => setSnackMsg('')}
        message={snackMsg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  )
}

/* ── Types ── */
interface GoatProfile {
  id: string
  tagId: string
  name?: string | null
  gender: string
  birthDate: string
  weight?: number | null
  color?: string | null
  status: string
  motherTagId?: string | null
  fatherTagId?: string | null
  purchaseDate?: string | null
  purchasePrice?: number | null
  ownerName?: string | null
  ownerPhone?: string | null
  originFarm?: string | null
  sireLineage?: string | null
  damLineage?: string | null
  ownerId?: string | null
  notes?: string | null
  image?: string | null
  thumbnail?: string | null
  pen?: { name?: string | null } | null
  breed?: { name?: string | null; nameAr?: string | null; type?: { name?: string | null; nameAr?: string | null } | null } | null
  age?: { years: number; months: number; days: number; totalMonths: number; category: string; formatted: string } | null
  healthRecords?: HealthRecord[]
  breedingAsMother?: BreedingRecord[]
  breedingAsFather?: BreedingRecord[]
  feedingRecords?: FeedingRecord[]
  sales?: SaleRecord[]
}

interface HealthRecord {
  id: string; date: string; type: string; description?: string | null
  veterinarian?: string | null; medication?: string | null; dosage?: string | null
  cost?: number | null; nextDueDate?: string | null; notes?: string | null
}

interface BreedingRecord {
  id: string; matingDate: string; pregnancyStatus: string
  dueDate?: string | null; birthDate?: string | null; numberOfKids?: number | null
  role?: string; notes?: string | null
  mother?: { id?: string; tagId?: string } | null
  father?: { id?: string; tagId?: string } | null
  births?: Birth[]
}

interface Birth {
  id: string; kidTagId?: string | null; kidGoatId?: string | null
  gender?: string; weight?: number | null; status?: string
}

interface FeedingRecord {
  id: string; date: string; feedType?: string | null
  quantity?: number | null; unit?: string | null; cost?: number | null; notes?: string | null
}

interface SaleRecord {
  id: string; date?: string | null; buyerName?: string | null; buyerPhone?: string | null
  salePrice?: number | null; paymentStatus?: string; notes?: string | null
}
