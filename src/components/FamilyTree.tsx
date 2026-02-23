'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Divider,
  useMediaQuery
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  Male as MaleIcon,
  Female as FemaleIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  FitScreen as FitIcon,
  Pets as PetsIcon
} from '@mui/icons-material'

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
  kidsAsMother?: FamilyMember[]
  kidsAsFather?: FamilyMember[]
}

interface FamilyStats {
  totalOffspring: number
  maleOffspring: number
  femaleOffspring: number
  aliveOffspring: number
  totalMates: number
  generations: number
}

interface FamilyData {
  goat: FamilyMember
  mother?: FamilyMember | null
  father?: FamilyMember | null
  siblings: FamilyMember[]
  offspring: FamilyMember[]
  mates: FamilyMember[]
  stats: FamilyStats
}

interface FamilyTreeProps {
  goatId: string
  compact?: boolean // compact mode for dialog, full for standalone page
  onNavigate?: (goatId: string) => void // callback when user clicks a node
}

// ===== Constants =====
const NODE_W = 130
const NODE_H = 80
const H_GAP = 20
const V_GAP = 50
const MALE_COLOR = '#1976d2'
const FEMALE_COLOR = '#d81b60'
const ACTIVE_COLOR = '#2e7d32'
const DECEASED_COLOR = '#9e9e9e'
const SOLD_COLOR = '#ed6c02'
const SELECTED_BG = '#e3f2fd'

// ===== Helper =====
function getStatusColor(status: string) {
  switch (status) {
    case 'ACTIVE': return ACTIVE_COLOR
    case 'DECEASED': return DECEASED_COLOR
    case 'SOLD': return SOLD_COLOR
    default: return '#757575'
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'ACTIVE': return 'حي'
    case 'DECEASED': return 'نافق'
    case 'SOLD': return 'مباع'
    case 'QUARANTINE': return 'حجر'
    case 'EXTERNAL': return 'خارجي'
    default: return status
  }
}

function calcAge(birthDate?: string | null): string {
  if (!birthDate) return ''
  const months = Math.floor((Date.now() - new Date(birthDate).getTime()) / (30.44 * 24 * 60 * 60 * 1000))
  if (months < 1) return 'حديث'
  if (months < 12) return `${months} شهر`
  const y = Math.floor(months / 12)
  const m = months % 12
  return m > 0 ? `${y} سنة ${m} شهر` : `${y} سنة`
}

// ===== Node Component =====
function TreeNode({
  member,
  label,
  isSelected,
  onClick,
  x,
  y
}: {
  member?: FamilyMember | null
  label: string
  isSelected?: boolean
  onClick?: () => void
  x: number
  y: number
}) {
  const genderColor = member?.gender === 'MALE' ? MALE_COLOR : FEMALE_COLOR
  const statusColor = member ? getStatusColor(member.status) : '#bdbdbd'
  const isEmpty = !member

  return (
    <foreignObject x={x} y={y} width={NODE_W} height={NODE_H}>
      <Box
        onClick={onClick}
        sx={{
          width: NODE_W,
          height: NODE_H,
          borderRadius: 2,
          border: 2,
          borderColor: isEmpty ? 'divider' : genderColor,
          borderStyle: isEmpty ? 'dashed' : 'solid',
          bgcolor: isSelected ? SELECTED_BG : (isEmpty ? 'action.hover' : 'background.paper'),
          cursor: onClick && member ? 'pointer' : 'default',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 1,
          transition: 'all 0.2s',
          '&:hover': onClick && member ? {
            boxShadow: 3,
            transform: 'scale(1.03)'
          } : {},
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Gender indicator bar */}
        {member && (
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            bgcolor: genderColor
          }} />
        )}

        <Typography
          variant="caption"
          sx={{ fontSize: '0.6rem', color: 'text.secondary', lineHeight: 1 }}
        >
          {label}
        </Typography>

        {member ? (
          <>
            <Stack direction="row" alignItems="center" spacing={0.3}>
              {member.gender === 'MALE'
                ? <MaleIcon sx={{ fontSize: 12, color: MALE_COLOR }} />
                : <FemaleIcon sx={{ fontSize: 12, color: FEMALE_COLOR }} />
              }
              <Typography
                variant="body2"
                sx={{ fontWeight: 'bold', fontSize: '0.75rem', lineHeight: 1.2 }}
                noWrap
              >
                {member.tagId}
              </Typography>
            </Stack>
            {member.name && (
              <Typography
                variant="caption"
                sx={{ fontSize: '0.6rem', lineHeight: 1, maxWidth: NODE_W - 16 }}
                noWrap
              >
                {member.name}
              </Typography>
            )}
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography
                variant="caption"
                sx={{ fontSize: '0.55rem', color: 'text.secondary', lineHeight: 1 }}
                noWrap
              >
                {member.breed?.nameAr || ''}
              </Typography>
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: statusColor,
                  flexShrink: 0
                }}
              />
            </Stack>
          </>
        ) : (
          <Typography
            variant="caption"
            sx={{ color: 'text.disabled', fontSize: '0.65rem' }}
          >
            غير معروف
          </Typography>
        )}
      </Box>
    </foreignObject>
  )
}

// ===== Connector Lines =====
function Connector({ x1, y1, x2, y2, color = '#bdbdbd' }: {
  x1: number; y1: number; x2: number; y2: number; color?: string
}) {
  const midY = (y1 + y2) / 2
  return (
    <path
      d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeDasharray={color === '#bdbdbd' ? '4 2' : 'none'}
    />
  )
}

// ===== Marriage line (horizontal) =====
function MarriageLine({ x1, y, x2, color = '#9c27b0' }: {
  x1: number; y: number; x2: number; color?: string
}) {
  return (
    <line
      x1={x1} y1={y} x2={x2} y2={y}
      stroke={color}
      strokeWidth={2}
      strokeDasharray="6 3"
    />
  )
}

// ===== Main Component =====
export default function FamilyTree({ goatId, compact = false, onNavigate }: FamilyTreeProps) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [data, setData] = useState<FamilyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(isMobile ? 0.7 : 1)
  const [currentGoatId, setCurrentGoatId] = useState(goatId)
  const containerRef = useRef<HTMLDivElement>(null)

  const loadFamily = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/goats/${id}/family`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setError(err.error || 'فشل في تحميل بيانات العائلة')
        return
      }
      const familyData = await res.json()
      setData(familyData)
    } catch {
      setError('فشل في الاتصال بالخادم')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFamily(currentGoatId)
  }, [currentGoatId, loadFamily])

  // Update when external goatId changes
  useEffect(() => {
    setCurrentGoatId(goatId)
  }, [goatId])

  const handleNodeClick = (id: string) => {
    setCurrentGoatId(id)
    if (onNavigate) onNavigate(id)
  }

  if (loading) {
    return (
      <Stack alignItems="center" py={4}>
        <CircularProgress size={32} />
        <Typography variant="body2" sx={{ mt: 1 }}>جاري بناء شجرة الأنساب...</Typography>
      </Stack>
    )
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>
  }

  if (!data) return null

  const { goat, mother, father, siblings, offspring, mates, stats } = data

  // ===== Calculate positions =====
  // Great-grandparents level (row 0)
  // Grandparents level (row 1)
  // Parents level (row 2)
  // Selected animal (row 3)
  // Offspring (row 4)

  // RTL layout: الأب on the RIGHT, الأم on the LEFT (Arabic tradition)
  const centerX = 520
  const startY = 10
  const PARENT_GAP = 60  // horizontal gap between father and mother nodes
  const GGP_GAP = H_GAP  // gap between grandparent pairs

  // Row positions
  const row1Y = startY + NODE_H + V_GAP   // grandparents
  const row2Y = row1Y + NODE_H + V_GAP    // parents
  const row3Y = row2Y + NODE_H + V_GAP    // selected
  const row4Y = row3Y + NODE_H + V_GAP    // offspring

  // Parent positions: father RIGHT, mother LEFT
  const fatherCenter = centerX + NODE_W / 2 + PARENT_GAP / 2   // center of father node
  const motherCenter = centerX - NODE_W / 2 - PARENT_GAP / 2   // center of mother node
  const fatherX = fatherCenter - NODE_W / 2
  const motherX = motherCenter - NODE_W / 2
  const selectedX = centerX - NODE_W / 2

  // Grandparent positions — 2 centered above each parent, no overlap
  // Father's side (right): أب الأب (far right), أم الأب (inner right)
  const gfFatherX = fatherCenter + GGP_GAP / 2               // أب الأب — right of father
  const gfMotherX = fatherCenter - NODE_W - GGP_GAP / 2      // أم الأب — left of father
  // Mother's side (left): أب الأم (inner left), أم الأم (far left)
  const gmFatherX = motherCenter + GGP_GAP / 2               // أب الأم — right of mother
  const gmMotherX = motherCenter - NODE_W - GGP_GAP / 2      // أم الأم — left of mother

  // Offspring positions (limited to 8, clamped to avoid negative x)
  const offspringCount = Math.min(offspring.length, 8)
  const offspringTotalW = offspringCount * (NODE_W + H_GAP) - H_GAP
  const offspringStartX = Math.max(40, centerX - offspringTotalW / 2)

  // SVG dimensions
  const hasOffspring = offspring.length > 0
  const hasGrandparents = father?.father || father?.mother || mother?.father || mother?.mother
  const svgH = hasOffspring ? row4Y + NODE_H + 20 : row3Y + NODE_H + 20
  const rightEdge = Math.max(gfFatherX + NODE_W, offspringStartX + offspringTotalW) + 40
  const leftEdge = Math.min(gmMotherX, offspringStartX, 0)
  const svgW = Math.max(rightEdge - leftEdge, 900)

  return (
    <Stack spacing={2}>
      {/* Stats bar */}
      {stats && (
        <Stack direction="row" flexWrap="wrap" gap={1}>
          <Chip
            icon={<PetsIcon />}
            label={`${stats.totalOffspring} أبناء`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip
            icon={<MaleIcon />}
            label={`${stats.maleOffspring} ذكور`}
            size="small"
            sx={{ color: MALE_COLOR, borderColor: MALE_COLOR }}
            variant="outlined"
          />
          <Chip
            icon={<FemaleIcon />}
            label={`${stats.femaleOffspring} إناث`}
            size="small"
            sx={{ color: FEMALE_COLOR, borderColor: FEMALE_COLOR }}
            variant="outlined"
          />
          <Chip
            label={`${stats.aliveOffspring} أحياء`}
            size="small"
            color="success"
            variant="outlined"
          />
          {stats.totalMates > 0 && (
            <Chip
              label={`${stats.totalMates} ${goat.gender === 'MALE' ? 'أم' : 'أب'}`}
              size="small"
              color="secondary"
              variant="outlined"
            />
          )}
          <Chip
            label={`${stats.generations} أجيال`}
            size="small"
            variant="outlined"
          />
        </Stack>
      )}

      {/* Zoom controls */}
      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
        <Tooltip title="تصغير">
          <IconButton size="small" onClick={() => setZoom(z => Math.max(0.4, z - 0.1))}>
            <ZoomOutIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="تكبير">
          <IconButton size="small" onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}>
            <ZoomInIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="ملائمة">
          <IconButton size="small" onClick={() => setZoom(1)}>
            <FitIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Tree SVG */}
      <Box
        ref={containerRef}
        sx={{
          overflowX: 'auto',
          overflowY: 'auto',
          maxHeight: compact ? 500 : '75vh',
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          bgcolor: 'background.default',
          p: 1
        }}
      >
        <svg
          width={svgW * zoom}
          height={svgH * zoom}
          viewBox={`0 0 ${svgW} ${svgH}`}
          style={{ direction: 'ltr' }}
        >
          {/* ===== CONNECTORS ===== */}

          {/* Father's parents → Father */}
          {father && father.father && (
            <Connector
              x1={gfFatherX + NODE_W / 2} y1={row1Y + NODE_H}
              x2={fatherX + NODE_W / 2} y2={row2Y}
              color={MALE_COLOR}
            />
          )}
          {father && father.mother && (
            <Connector
              x1={gfMotherX + NODE_W / 2} y1={row1Y + NODE_H}
              x2={fatherX + NODE_W / 2} y2={row2Y}
              color={FEMALE_COLOR}
            />
          )}

          {/* Mother's parents → Mother */}
          {mother && mother.father && (
            <Connector
              x1={gmFatherX + NODE_W / 2} y1={row1Y + NODE_H}
              x2={motherX + NODE_W / 2} y2={row2Y}
              color={MALE_COLOR}
            />
          )}
          {mother && mother.mother && (
            <Connector
              x1={gmMotherX + NODE_W / 2} y1={row1Y + NODE_H}
              x2={motherX + NODE_W / 2} y2={row2Y}
              color={FEMALE_COLOR}
            />
          )}

          {/* Marriage line between grandparents (left-node+width → right-node) */}
          {father?.father && father?.mother && (
            <MarriageLine
              x1={gfMotherX + NODE_W} y={row1Y + NODE_H / 2}
              x2={gfFatherX}
            />
          )}
          {mother?.father && mother?.mother && (
            <MarriageLine
              x1={gmMotherX + NODE_W} y={row1Y + NODE_H / 2}
              x2={gmFatherX}
            />
          )}

          {/* Parents → Selected */}
          {father && (
            <Connector
              x1={fatherX + NODE_W / 2} y1={row2Y + NODE_H}
              x2={selectedX + NODE_W / 2} y2={row3Y}
              color={MALE_COLOR}
            />
          )}
          {mother && (
            <Connector
              x1={motherX + NODE_W / 2} y1={row2Y + NODE_H}
              x2={selectedX + NODE_W / 2} y2={row3Y}
              color={FEMALE_COLOR}
            />
          )}

          {/* Marriage line between parents (mother left+width → father right) */}
          {father && mother && (
            <MarriageLine
              x1={motherX + NODE_W} y={row2Y + NODE_H / 2}
              x2={fatherX}
            />
          )}

          {/* Selected → Offspring */}
          {offspring.slice(0, 8).map((_, i) => {
            const ox = offspringStartX + i * (NODE_W + H_GAP) + NODE_W / 2
            return (
              <Connector
                key={`off-conn-${i}`}
                x1={selectedX + NODE_W / 2} y1={row3Y + NODE_H}
                x2={ox} y2={row4Y}
                color={offspring[i].gender === 'MALE' ? MALE_COLOR : FEMALE_COLOR}
              />
            )
          })}

          {/* ===== NODES ===== */}

          {/* Grandparents (Father's side) */}
          {hasGrandparents && (
            <>
              <TreeNode
                member={father?.father}
                label="أب الأب"
                x={gfFatherX} y={row1Y}
                onClick={father?.father ? () => handleNodeClick(father.father!.id) : undefined}
              />
              <TreeNode
                member={father?.mother}
                label="أم الأب"
                x={gfMotherX} y={row1Y}
                onClick={father?.mother ? () => handleNodeClick(father.mother!.id) : undefined}
              />
              <TreeNode
                member={mother?.father}
                label="أب الأم"
                x={gmFatherX} y={row1Y}
                onClick={mother?.father ? () => handleNodeClick(mother.father!.id) : undefined}
              />
              <TreeNode
                member={mother?.mother}
                label="أم الأم"
                x={gmMotherX} y={row1Y}
                onClick={mother?.mother ? () => handleNodeClick(mother.mother!.id) : undefined}
              />
            </>
          )}

          {/* Parents */}
          <TreeNode
            member={father}
            label="الأب"
            x={fatherX} y={row2Y}
            onClick={father ? () => handleNodeClick(father.id) : undefined}
          />
          <TreeNode
            member={mother}
            label="الأم"
            x={motherX} y={row2Y}
            onClick={mother ? () => handleNodeClick(mother.id) : undefined}
          />

          {/* Selected animal */}
          <TreeNode
            member={goat}
            label="الحيوان المختار"
            isSelected
            x={selectedX} y={row3Y}
          />

          {/* Offspring */}
          {offspring.slice(0, 8).map((kid, i) => (
            <TreeNode
              key={kid.id}
              member={kid}
              label={kid.gender === 'MALE' ? 'ابن' : 'ابنة'}
              x={offspringStartX + i * (NODE_W + H_GAP)} y={row4Y}
              onClick={() => handleNodeClick(kid.id)}
            />
          ))}
        </svg>
      </Box>

      {offspring.length > 8 && (
        <Typography variant="caption" color="text.secondary" textAlign="center">
          + {offspring.length - 8} أبناء آخرين
        </Typography>
      )}

      {/* Siblings */}
      {siblings.length > 0 && (
        <>
          <Divider />
          <Box>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              الإخوة ({siblings.length})
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {siblings.map(s => (
                <Chip
                  key={s.id}
                  icon={s.gender === 'MALE' ? <MaleIcon /> : <FemaleIcon />}
                  label={`${s.tagId} - ${s.breed?.nameAr || ''}`}
                  size="small"
                  sx={{
                    borderColor: s.gender === 'MALE' ? MALE_COLOR : FEMALE_COLOR,
                    cursor: 'pointer'
                  }}
                  variant="outlined"
                  onClick={() => handleNodeClick(s.id)}
                />
              ))}
            </Stack>
          </Box>
        </>
      )}

      {/* Mates */}
      {mates.length > 0 && (
        <>
          <Divider />
          <Box>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              {goat.gender === 'MALE' ? 'الأمهات المنجبة' : 'الآباء المنجبون'} ({mates.length})
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {mates.map(m => (
                <Chip
                  key={m.id}
                  icon={m.gender === 'MALE' ? <MaleIcon /> : <FemaleIcon />}
                  label={`${m.tagId}${m.name ? ` - ${m.name}` : ''}`}
                  size="small"
                  color="secondary"
                  variant="outlined"
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleNodeClick(m.id)}
                />
              ))}
            </Stack>
          </Box>
        </>
      )}

      {/* Legend */}
      <Stack direction="row" flexWrap="wrap" gap={1.5} justifyContent="center" sx={{ opacity: 0.7 }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 10, height: 3, bgcolor: MALE_COLOR }} />
          <Typography variant="caption">ذكر</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 10, height: 3, bgcolor: FEMALE_COLOR }} />
          <Typography variant="caption">أنثى</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: ACTIVE_COLOR }} />
          <Typography variant="caption">حي</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: SOLD_COLOR }} />
          <Typography variant="caption">مباع</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: DECEASED_COLOR }} />
          <Typography variant="caption">نافق</Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 20, height: 0, border: '1px dashed #9c27b0' }} />
          <Typography variant="caption">تزاوج</Typography>
        </Stack>
      </Stack>
    </Stack>
  )
}
