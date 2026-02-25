'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Box, Paper, Typography, Button, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Alert, Card, CardContent,
  Stack, LinearProgress, Tooltip, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Fade, Skeleton, useMediaQuery
} from '@mui/material'
import MuiGrid from '@mui/material/Grid'
import { useTheme, alpha } from '@mui/material/styles'
import type { GridColDef } from '@mui/x-data-grid'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  Grass as GrassIcon, Inventory as InventoryIcon,
  Schedule as ScheduleIcon,
  Today as TodayIcon,
  CalendarMonth as CalendarIcon, PictureAsPdf as PdfIcon,
  Description as ExcelIcon,
  History as HistoryIcon, Undo as UndoIcon,
  FilterList as FilterIcon,
  Blender as RecipeIcon,
  ShoppingCart as ReorderIcon,
  Pets as AnimalIcon
} from '@mui/icons-material'
import * as XLSX from 'xlsx'
import { generateArabicPDF } from '@/lib/pdfHelper'
import { useAuth } from '@/lib/useAuth'

const Grid = MuiGrid as any

// ─── Constants ───
const CATEGORIES = [
  { value: 'HAY', label: 'تبن' },
  { value: 'GRAINS', label: 'حبوب' },
  { value: 'CONCENTRATE', label: 'مركزات' },
  { value: 'SUPPLEMENTS', label: 'مكملات' },
  { value: 'MINERALS', label: 'معادن' },
  { value: 'OTHER', label: 'أخرى' }
]

const catLabel = (v: string) => CATEGORIES.find(c => c.value === v)?.label ?? v

// ─── Types ───
interface FeedType { id: string; name: string; nameAr: string; category: string; protein?: number; energy?: number; reorderLevel?: number; notes?: string }
interface Stock { id: string; feedTypeId: string; feedType: FeedType; quantity: number; unit: string; cost?: number; purchaseDate: string; expiryDate?: string; supplier?: string; notes?: string }
interface Schedule { id: string; feedTypeId: string; feedType: FeedType; penId?: string; pen?: { id: string; nameAr: string; _count?: { goats: number } }; goatId?: string; goat?: { tagId: string; name: string }; recipeId?: string; quantity: number; frequency: number; startDate: string; endDate?: string; isActive: boolean; notes?: string }
interface Pen { id: string; nameAr: string; name: string; _count?: { goats: number }; goats?: any[] }
interface Recipe { id: string; name: string; nameAr: string; description?: string; isActive: boolean; items: RecipeItem[] }
interface RecipeItem { id: string; feedTypeId: string; feedType: { id: string; nameAr: string; name: string; category: string }; percentage: number; notes?: string }
interface ReorderSuggestion { feedTypeId: string; feedName: string; category: string; currentStock: number; reorderLevel: number; dailyConsumption: number; daysRemaining: number; suggestedPurchase: number; avgPrice: number; estimatedCost: number; urgency: 'critical' | 'warning' | 'ok' }

// ─── AI Feed Suggestion ───
interface FeedSuggestion {
  amount: number
  meals: number
  reasoning: string
  ageGroup: string
  avgWeight: number
}

function suggestFeedAmount(penGoats: { gender: string; birthDate: string; status: string; weight?: number }[], feedCategory: string, farmType?: string): FeedSuggestion | null {
  if (!penGoats || penGoats.length === 0) return null

  const isCamel = farmType === 'CAMEL'

  const now = Date.now()
  const ages = penGoats.map(g => (now - new Date(g.birthDate).getTime()) / (365.25 * 86400000))
  const avgAge = ages.reduce((a, b) => a + b, 0) / ages.length
  const weights = penGoats.filter(g => g.weight).map(g => g.weight!)
  // Default weight estimates: camels are much heavier than sheep/goats
  const defaultWeight = isCamel
    ? (avgAge < 0.5 ? 50 : avgAge < 1 ? 100 : avgAge < 2 ? 180 : avgAge < 4 ? 280 : 420)
    : (avgAge < 0.5 ? 15 : avgAge < 1 ? 30 : avgAge < 2 ? 45 : 55)
  const avgWeight = weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : defaultWeight

  let ageGroup: string
  if (avgAge < 0.25) ageGroup = 'رضيع (أقل من 3 أشهر)'
  else if (avgAge < 0.5) ageGroup = 'فطيم (3-6 أشهر)'
  else if (avgAge < 1) ageGroup = 'صغير (6-12 شهر)'
  else if (avgAge < 2) ageGroup = 'شاب (1-2 سنة)'
  else ageGroup = 'بالغ (أكبر من سنتين)'

  // Feed recommendations (kg/head/day) by category and age group
  // Sheep/Goat norms (standard small ruminant guidelines)
  const sheepMatrix: Record<string, Record<string, { amount: number; meals: number; note: string }>> = {
    HAY: {
      'رضيع': { amount: 0.1, meals: 3, note: 'كمية قليلة كتعويد' },
      'فطيم': { amount: 0.3, meals: 3, note: 'تدريجي مع الفطام' },
      'صغير': { amount: 0.5, meals: 2, note: 'أساسي للنمو' },
      'شاب': { amount: 0.8, meals: 2, note: 'نسبة 2% من الوزن' },
      'بالغ': { amount: 1.0, meals: 2, note: 'نسبة 2% من الوزن' }
    },
    GRAINS: {
      'رضيع': { amount: 0.05, meals: 2, note: 'كمية رمزية' },
      'فطيم': { amount: 0.15, meals: 2, note: 'لدعم النمو' },
      'صغير': { amount: 0.25, meals: 2, note: 'تدريجي' },
      'شاب': { amount: 0.4, meals: 2, note: 'للطاقة والنمو' },
      'بالغ': { amount: 0.5, meals: 2, note: 'حسب النشاط' }
    },
    CONCENTRATE: {
      'رضيع': { amount: 0.0, meals: 0, note: 'غير مناسب للرضّع' },
      'فطيم': { amount: 0.1, meals: 2, note: 'كمية بسيطة' },
      'صغير': { amount: 0.2, meals: 2, note: 'لدعم النمو' },
      'شاب': { amount: 0.3, meals: 2, note: 'للبروتين' },
      'بالغ': { amount: 0.4, meals: 2, note: 'للإنتاج والصحة' }
    },
    SUPPLEMENTS: {
      'رضيع': { amount: 0.0, meals: 0, note: 'غير مطلوب' },
      'فطيم': { amount: 0.02, meals: 1, note: 'فيتامينات أساسية' },
      'صغير': { amount: 0.03, meals: 1, note: 'مكملات نمو' },
      'شاب': { amount: 0.05, meals: 1, note: 'دعم المناعة' },
      'بالغ': { amount: 0.05, meals: 1, note: 'صيانة عامة' }
    },
    MINERALS: {
      'رضيع': { amount: 0.0, meals: 0, note: 'غير مطلوب' },
      'فطيم': { amount: 0.01, meals: 1, note: 'كالسيوم وفوسفور' },
      'صغير': { amount: 0.02, meals: 1, note: 'لبناء العظام' },
      'شاب': { amount: 0.03, meals: 1, note: 'للنمو السليم' },
      'بالغ': { amount: 0.03, meals: 1, note: 'وقائي' }
    },
    OTHER: {
      'رضيع': { amount: 0.1, meals: 2, note: 'حسب النوع' },
      'فطيم': { amount: 0.2, meals: 2, note: 'حسب النوع' },
      'صغير': { amount: 0.3, meals: 2, note: 'حسب النوع' },
      'شاب': { amount: 0.4, meals: 2, note: 'حسب النوع' },
      'بالغ': { amount: 0.5, meals: 2, note: 'حسب النوع' }
    }
  }

  // Camel norms (kg/head/day) — camels are 6-10x heavier and eat proportionally more
  const camelMatrix: Record<string, Record<string, { amount: number; meals: number; note: string }>> = {
    HAY: {
      'رضيع': { amount: 0.5, meals: 3, note: 'بداية تعويد' },
      'فطيم': { amount: 2.5, meals: 3, note: 'تدريجي مع الفطام' },
      'صغير': { amount: 5.0, meals: 2, note: 'أساسي للنمو' },
      'شاب': { amount: 8.0, meals: 2, note: 'نسبة 2-3% من الوزن' },
      'بالغ': { amount: 10.0, meals: 2, note: 'نسبة 2% من الوزن' }
    },
    GRAINS: {
      'رضيع': { amount: 0.1, meals: 2, note: 'كمية رمزية' },
      'فطيم': { amount: 0.5, meals: 2, note: 'لدعم النمو' },
      'صغير': { amount: 1.0, meals: 2, note: 'تدريجي' },
      'شاب': { amount: 2.0, meals: 2, note: 'للطاقة والنمو' },
      'بالغ': { amount: 3.0, meals: 2, note: 'حسب النشاط' }
    },
    CONCENTRATE: {
      'رضيع': { amount: 0.0, meals: 0, note: 'غير مناسب للرضّع' },
      'فطيم': { amount: 0.3, meals: 2, note: 'كمية بسيطة' },
      'صغير': { amount: 0.8, meals: 2, note: 'لدعم النمو' },
      'شاب': { amount: 1.5, meals: 2, note: 'للبروتين' },
      'بالغ': { amount: 2.0, meals: 2, note: 'للإنتاج والصحة' }
    },
    SUPPLEMENTS: {
      'رضيع': { amount: 0.0, meals: 0, note: 'غير مطلوب' },
      'فطيم': { amount: 0.1, meals: 1, note: 'فيتامينات أساسية' },
      'صغير': { amount: 0.15, meals: 1, note: 'مكملات نمو' },
      'شاب': { amount: 0.25, meals: 1, note: 'دعم المناعة' },
      'بالغ': { amount: 0.3, meals: 1, note: 'صيانة عامة' }
    },
    MINERALS: {
      'رضيع': { amount: 0.0, meals: 0, note: 'غير مطلوب' },
      'فطيم': { amount: 0.05, meals: 1, note: 'كالسيوم وفوسفور' },
      'صغير': { amount: 0.1, meals: 1, note: 'لبناء العظام' },
      'شاب': { amount: 0.15, meals: 1, note: 'للنمو السليم' },
      'بالغ': { amount: 0.2, meals: 1, note: 'وقائي' }
    },
    OTHER: {
      'رضيع': { amount: 0.3, meals: 2, note: 'حسب النوع' },
      'فطيم': { amount: 1.0, meals: 2, note: 'حسب النوع' },
      'صغير': { amount: 2.0, meals: 2, note: 'حسب النوع' },
      'شاب': { amount: 3.0, meals: 2, note: 'حسب النوع' },
      'بالغ': { amount: 4.0, meals: 2, note: 'حسب النوع' }
    }
  }

  const matrix = isCamel ? camelMatrix : sheepMatrix

  const ageKey = avgAge < 0.25 ? 'رضيع' : avgAge < 0.5 ? 'فطيم' : avgAge < 1 ? 'صغير' : avgAge < 2 ? 'شاب' : 'بالغ'
  const rec = matrix[feedCategory]?.[ageKey] || matrix['OTHER'][ageKey]

  // Adjust by weight if available (heavier → slightly more)
  let adjustedAmount = rec.amount
  const heavyThreshold = isCamel ? 450 : 60
  const medThreshold = isCamel ? 250 : 40
  const lightThreshold = isCamel ? 100 : 20
  if (avgWeight > heavyThreshold) adjustedAmount *= 1.15
  else if (avgWeight > medThreshold) adjustedAmount *= 1.0
  else if (avgWeight < lightThreshold) adjustedAmount *= 0.85

  // Pregnant females get 20% more
  const femaleCount = penGoats.filter(g => g.gender === 'FEMALE').length
  if (femaleCount > penGoats.length * 0.7) adjustedAmount *= 1.1

  adjustedAmount = Math.round(adjustedAmount * 100) / 100

  const reasoning = `${ageGroup} • متوسط الوزن ${avgWeight.toFixed(0)} كجم • ${rec.note}${femaleCount > penGoats.length * 0.7 ? ' • +10% (إناث)' : ''}`

  return { amount: adjustedAmount, meals: rec.meals || 2, reasoning, ageGroup, avgWeight }
}

// ─── View Enum ───
type View = 'today' | 'stock' | 'schedules' | 'history' | 'recipes' | 'reorder'

export default function FeedsPage() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { farm } = useAuth()
  const categoryColors = useMemo<Record<string, string>>(() => ({
    HAY: theme.palette.warning.dark,
    GRAINS: theme.palette.warning.main,
    CONCENTRATE: theme.palette.info.main,
    SUPPLEMENTS: theme.palette.success.main,
    MINERALS: theme.palette.secondary.main,
    OTHER: theme.palette.text.secondary
  }), [theme])
  const catColor = useCallback((value: string) => categoryColors[value] ?? theme.palette.text.secondary, [categoryColors, theme])

  // Data
  const [feedTypes, setFeedTypes] = useState<FeedType[]>([])
  const [stocks, setStocks] = useState<Stock[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [pens, setPens] = useState<Pen[]>([])
  const [loading, setLoading] = useState(true)

  // Navigation
  const [view, setView] = useState<View>('today')

  // Dialogs
  const [typeDialog, setTypeDialog] = useState(false)
  const [stockDialog, setStockDialog] = useState(false)
  const [scheduleDialog, setScheduleDialog] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ type: 'stock' | 'type' | 'schedule'; item: any } | null>(null)
  const [consumeSubmitting, setConsumeSubmitting] = useState(false)
  const [smartScheduleLoading, setSmartScheduleLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  // Forms
  const [editingType, setEditingType] = useState<FeedType | null>(null)
  const [editingStock, setEditingStock] = useState<Stock | null>(null)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [typeForm, setTypeForm] = useState({ nameAr: '', nameEn: '', category: 'HAY', protein: 0, energy: 0, reorderLevel: 50, description: '' })
  const [stockForm, setStockForm] = useState({ feedTypeId: '', quantity: 0, unit: 'كجم', unitPrice: 0, purchaseDate: today(), expiryDate: '', supplier: '', notes: '' })
  const [scheduleForm, setScheduleForm] = useState({ penId: '', feedTypeId: '', dailyAmount: 0, feedingTimes: '2', startDate: today(), endDate: '', notes: '', goatId: '' })
  const [aiSuggestion, setAiSuggestion] = useState<FeedSuggestion | null>(null)

  // History & Filtering
  const [consumptionHistory, setConsumptionHistory] = useState<any[]>([])
  const [undoingDate, setUndoingDate] = useState<string | null>(null)
  const [stockCategoryFilter, setStockCategoryFilter] = useState<string>('ALL')

  // Recipes
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [recipeDialog, setRecipeDialog] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [recipeForm, setRecipeForm] = useState({ nameAr: '', nameEn: '', description: '', items: [] as { feedTypeId: string; percentage: number }[] })

  // Reorder
  const [reorderData, setReorderData] = useState<{ suggestions: ReorderSuggestion[]; summary: any } | null>(null)
  const [reorderLoading, setReorderLoading] = useState(false)

  // Unified feeding (schedule for individual goat)
  const [scheduleTarget, setScheduleTarget] = useState<'pen' | 'goat'>('pen')
  const [goats, setGoats] = useState<any[]>([])

  // ─── Fetch ───
  useEffect(() => {
    fetchAll()
    fetchHistory()
    // HI-06: Removed auto-consume from page load — user should trigger explicitly
  }, [])

  const runAutoConsume = async () => {
    try {
      const res = await fetch('/api/feeds/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto: true, date: today() })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setActionMessage({
          type: 'error',
          text: data.error || 'تعذر تنفيذ الصرف التلقائي'
        })
      } else if (Array.isArray(data.executedDates) && data.executedDates.length > 0) {
        const skippedCount = Array.isArray(data.skippedDates) ? data.skippedDates.length : 0
        setActionMessage({
          type: skippedCount > 0 ? 'info' : 'success',
          text: skippedCount > 0
            ? `${data.message || 'تم تنفيذ جزء من الصرف التلقائي'} (تم التنفيذ ${data.executedDates.length} يوم، وتجاوز ${skippedCount} يوم بسبب نقص المخزون)`
            : data.message || `تم تنفيذ الصرف التلقائي لـ ${data.executedDates.length} يوم`
        })
        // تحديث البيانات بعد الصرف الناجح
        await fetchAll()
      } else if (Array.isArray(data.skippedDates) && data.skippedDates.length > 0) {
        setActionMessage({
          type: 'error',
          text: `تعذر التنفيذ التلقائي: نقص مخزون في ${data.skippedDates.length} يوم`
        })
      }
      // لا رسالة إذا كان كل شيء محدّث - لا حاجة لعرض رسالة
    } catch {
      // فشل الاتصال - لا نعرقل الصفحة
      console.warn('Auto consume failed silently')
    }
  }

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [t, s, sc, p, rec, g] = await Promise.all([
        fetch('/api/feeds').then(r => r.ok ? r.json() : []),
        fetch('/api/feeds/stock').then(r => r.ok ? r.json() : []),
        fetch('/api/feeds/schedule').then(r => r.ok ? r.json() : []),
        fetch('/api/pens').then(r => r.ok ? r.json() : []),
        fetch('/api/feeds/recipes').then(r => r.ok ? r.json() : []),
        fetch('/api/goats?limit=500').then(r => r.ok ? r.json() : [])
      ])
      setFeedTypes(t); setStocks(s); setSchedules(sc); setPens(p); setRecipes(rec)
      setGoats(Array.isArray(g) ? g : (g?.data || []))
    } catch {
      console.error('fetchAll failed')
      setActionMessage({ type: 'error', text: 'فشل في تحميل البيانات' })
    } finally { setLoading(false) }
  }

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/feeds/consume?limit=30')
      if (res.ok) {
        const data = await res.json()
        setConsumptionHistory(Array.isArray(data) ? data : [])
      }
    } catch {
      console.error('fetchHistory failed')
    }
  }

  const undoConsumption = async (date: string) => {
    if (!confirm(`هل تريد التراجع عن صرف يوم ${date}؟ سيتم استرجاع المخزون.`)) return
    setUndoingDate(date)
    try {
      const res = await fetch('/api/feeds/consume', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setActionMessage({ type: 'success', text: data.message || 'تم التراجع عن الصرف واسترجاع المخزون بنجاح' })
        fetchAll()
        fetchHistory()
      } else {
        setActionMessage({ type: 'error', text: data.error || 'فشل في التراجع عن الصرف' })
      }
    } catch {
      setActionMessage({ type: 'error', text: 'فشل في الاتصال بالخادم' })
    } finally {
      setUndoingDate(null)
    }
  }

  const fetchReorder = async () => {
    setReorderLoading(true)
    try {
      const res = await fetch('/api/feeds/reorder')
      if (res.ok) setReorderData(await res.json())
    } catch {
      console.error('fetchReorder failed')
    } finally { setReorderLoading(false) }
  }

  const openAddRecipe = () => {
    setEditingRecipe(null)
    setRecipeForm({ nameAr: '', nameEn: '', description: '', items: [{ feedTypeId: feedTypes[0]?.id || '', percentage: 100 }] })
    setRecipeDialog(true)
  }
  const openEditRecipe = (r: Recipe) => {
    setEditingRecipe(r)
    setRecipeForm({
      nameAr: r.nameAr, nameEn: r.name, description: r.description || '',
      items: r.items.map(i => ({ feedTypeId: i.feedTypeId, percentage: i.percentage }))
    })
    setRecipeDialog(true)
  }

  const saveRecipe = async () => {
    if (saving) return
    setSaving(true)
    try {
      const url = editingRecipe ? `/api/feeds/recipes/${editingRecipe.id}` : '/api/feeds/recipes'
      const method = editingRecipe ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(recipeForm) })
      if (res.ok) {
        fetchAll()
        setRecipeDialog(false)
        setActionMessage({ type: 'success', text: editingRecipe ? 'تم تعديل الخلطة بنجاح' : 'تم إنشاء الخلطة بنجاح' })
      } else {
        const d = await res.json().catch(() => ({}))
        setActionMessage({ type: 'error', text: d.error || 'فشل في حفظ الخلطة' })
      }
    } finally { setSaving(false) }
  }

  const deleteRecipe = async (r: Recipe) => {
    if (!confirm(`هل تريد حذف خلطة "${r.nameAr}"؟`)) return
    try {
      const res = await fetch(`/api/feeds/recipes/${r.id}`, { method: 'DELETE' })
      if (res.ok) {
        fetchAll()
        setActionMessage({ type: 'success', text: 'تم حذف الخلطة بنجاح' })
      } else {
        const d = await res.json().catch(() => ({}))
        setActionMessage({ type: 'error', text: d.error || 'فشل في حذف الخلطة' })
      }
    } catch {
      setActionMessage({ type: 'error', text: 'حدث خطأ أثناء الحذف' })
    }
  }

  const recipeFormTotalPct = useMemo(() => recipeForm.items.reduce((s, i) => s + (i.percentage || 0), 0), [recipeForm.items])

  // ─── Computed ───
  const activeSchedules = useMemo(() => schedules.filter(s => s.isActive), [schedules])

  const todayFeedings = useMemo(() => {
    const byPen: Record<string, {
      pen: string; penId: string; heads: number;
      items: { scheduleId: string; feed: string; amount: number; meals: number; category: string; unitCost: number; stockQty: number }[]
    }> = {}
    activeSchedules.forEach(s => {
      const penId = s.penId || 'none'
      const penName = s.pen?.nameAr || 'بدون حظيرة'
      const heads = s.pen?._count?.goats || 0
      if (!byPen[penId]) byPen[penId] = { pen: penName, penId, heads, items: [] }
      const stock = stocks.find(st => st.feedTypeId === s.feedTypeId)
      const totalStockForType = stocks.filter(st => st.feedTypeId === s.feedTypeId).reduce((sum, st) => sum + st.quantity, 0)
      byPen[penId].items.push({
        scheduleId: s.id,
        feed: s.feedType?.nameAr || '-',
        amount: s.quantity,
        meals: s.frequency,
        category: s.feedType?.category || 'OTHER',
        unitCost: stock?.cost || 0,
        stockQty: totalStockForType
      })
    })
    return Object.values(byPen)
  }, [activeSchedules, stocks])

  const stockSummary = useMemo(() => {
    const byType: Record<string, { feedType: FeedType; totalQty: number; totalValue: number; lowestExpiry: string | null; isLow: boolean }> = {}
    stocks.forEach(s => {
      const id = s.feedTypeId
      if (!byType[id]) byType[id] = { feedType: s.feedType, totalQty: 0, totalValue: 0, lowestExpiry: null, isLow: false }
      byType[id].totalQty += s.quantity
      byType[id].totalValue += s.quantity * (s.cost || 0)
      if (s.expiryDate && (!byType[id].lowestExpiry || s.expiryDate < byType[id].lowestExpiry!)) {
        byType[id].lowestExpiry = s.expiryDate
      }
    })
    Object.values(byType).forEach(v => { v.isLow = v.totalQty < (v.feedType.reorderLevel || 50) })
    return Object.values(byType).sort((a, b) => a.totalQty - b.totalQty)
  }, [stocks])

  const alerts = useMemo(() => {
    const list: { severity: 'error' | 'warning' | 'info'; text: string }[] = []
    const expired = stocks.filter(s => s.expiryDate && new Date(s.expiryDate) < new Date())
    const expiring = stocks.filter(s => {
      if (!s.expiryDate) return false
      const d = daysUntil(s.expiryDate)
      return d > 0 && d <= 30
    })
    const low = stockSummary.filter(s => s.isLow)
    if (expired.length) list.push({ severity: 'error', text: `${expired.length} أصناف منتهية الصلاحية — يجب التخلص منها فوراً` })
    if (expiring.length) list.push({ severity: 'warning', text: `${expiring.length} أصناف ستنتهي صلاحيتها خلال 30 يوم` })
    if (low.length) {
      // Enhanced with purchase suggestion
      const lowNames = low.map(l => l.feedType.nameAr).join('، ')
      list.push({ severity: 'warning', text: `${low.length} أنواع أعلاف بمخزون منخفض (${lowNames}) — انتقل لتبويب إعادة الطلب لعرض كميات الشراء المقترحة` })
    }
    if (activeSchedules.length === 0 && pens.length > 0) list.push({ severity: 'info', text: 'لا توجد جداول تغذية نشطة — أنشئ جدول لبدء التتبع' })
    return list
  }, [stocks, stockSummary, activeSchedules, pens])

  const totalStockValue = useMemo(() => stocks.reduce((s, i) => s + i.quantity * (i.cost || 0), 0), [stocks])

  // Daily consumption per feed type (from active schedules)
  const dailyConsumptionByType = useMemo(() => {
    const byType: Record<string, number> = {}
    activeSchedules.forEach(s => {
      const heads = s.pen?._count?.goats || 0
      const daily = s.quantity * heads
      byType[s.feedTypeId] = (byType[s.feedTypeId] || 0) + daily
    })
    return byType
  }, [activeSchedules])

  // HI-05: Use weighted average price per feed type for accurate daily cost
  const weightedPriceByType = useMemo(() => {
    const byType: Record<string, number> = {}
    const qtyByType: Record<string, number> = {}
    stocks.forEach(s => {
      const id = s.feedTypeId
      byType[id] = (byType[id] || 0) + s.quantity * (s.cost || 0)
      qtyByType[id] = (qtyByType[id] || 0) + s.quantity
    })
    const result: Record<string, number> = {}
    for (const id of Object.keys(byType)) {
      result[id] = qtyByType[id] > 0 ? byType[id] / qtyByType[id] : 0
    }
    return result
  }, [stocks])

  const dailyCost = useMemo(() => {
    return activeSchedules.reduce((sum, s) => {
      const heads = s.pen?._count?.goats || 0
      const avgPrice = weightedPriceByType[s.feedTypeId] || 0
      return sum + (s.quantity * heads * avgPrice)
    }, 0)
  }, [activeSchedules, weightedPriceByType])

  const stockRows = useMemo(() => {
    return stocks.map((s) => {
      const expD = s.expiryDate ? daysUntil(s.expiryDate) : null
      const isExpired = expD !== null && expD <= 0
      const isExpiring = expD !== null && expD > 0 && expD <= 30
      const reorderLvl = s.feedType?.reorderLevel || 50
      const isLow = s.quantity < reorderLvl
      const dailyUse = dailyConsumptionByType[s.feedTypeId] || 0
      return {
        id: s.id,
        item: s,
        feedName: s.feedType?.nameAr || '-',
        category: catLabel(s.feedType?.category),
        categoryColor: catColor(s.feedType?.category || 'OTHER'),
        quantity: `${s.quantity} ${s.unit}`,
        unitPrice: s.cost ? `${s.cost} د.إ` : '-',
        value: `${(s.quantity * (s.cost || 0)).toFixed(0)} د.إ`,
        supplier: s.supplier || '-',
        purchaseDate: new Date(s.purchaseDate).toLocaleDateString('ar-AE'),
        expiryDate: s.expiryDate ? new Date(s.expiryDate).toLocaleDateString('ar-AE') : '-',
        dailyUse: dailyUse > 0 ? `${dailyUse.toFixed(1)} كجم/يوم` : '-',
        status: isExpired ? 'منتهي' : isExpiring ? `ينتهي ${expD} يوم` : isLow ? 'منخفض' : 'جيد',
        statusColor: isExpired ? 'error' : isExpiring || isLow ? 'warning' : 'success'
      }
    })
  }, [stocks, dailyConsumptionByType])

  const filteredStockRows = useMemo(() => {
    if (stockCategoryFilter === 'ALL') return stockRows
    return stockRows.filter((r: any) => {
      const stock = r.item as Stock
      return stock.feedType?.category === stockCategoryFilter
    })
  }, [stockRows, stockCategoryFilter])

  const stockColumns = useMemo<GridColDef[]>(() => [
    { field: 'feedName', headerName: 'نوع العلف', flex: 1.2, minWidth: 140 },
    {
      field: 'category',
      headerName: 'الفئة',
      minWidth: 120,
      renderCell: (params) => (
        <Chip
          label={params.value as string}
          size="small"
          sx={{
            bgcolor: alpha(params.row.categoryColor as string, 0.14),
            color: params.row.categoryColor as string,
            fontWeight: 700
          }}
        />
      )
    },
    { field: 'quantity', headerName: 'الكمية', minWidth: 120 },
    { field: 'unitPrice', headerName: 'سعر الوحدة', minWidth: 110 },
    { field: 'value', headerName: 'القيمة', minWidth: 110 },
    { field: 'supplier', headerName: 'المورد', minWidth: 130 },
    { field: 'purchaseDate', headerName: 'تاريخ الشراء', minWidth: 120 },
    { field: 'expiryDate', headerName: 'الانتهاء', minWidth: 120 },
    { field: 'dailyUse', headerName: 'الاستهلاك', minWidth: 120 },
    {
      field: 'status',
      headerName: 'الحالة',
      minWidth: 120,
      renderCell: (params) => (
        <Chip label={params.value as string} size="small" color={params.row.statusColor as any} variant="outlined" />
      )
    },
    {
      field: 'actions',
      headerName: 'إجراءات',
      minWidth: 110,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" color="primary" onClick={() => openEditStock(params.row.item)}><EditIcon fontSize="small" /></IconButton>
          <IconButton size="small" color="error" onClick={() => setDeleteDialog({ type: 'stock', item: params.row.item })}><DeleteIcon fontSize="small" /></IconButton>
        </Stack>
      )
    }
  ], [])

  // ─── Handlers ───
  const openAddType = () => { setEditingType(null); setTypeForm({ nameAr: '', nameEn: '', category: 'HAY', protein: 0, energy: 0, reorderLevel: 50, description: '' }); setTypeDialog(true) }
  const openEditType = (t: FeedType) => { setEditingType(t); setTypeForm({ nameAr: t.nameAr, nameEn: t.name, category: t.category, protein: t.protein || 0, energy: t.energy || 0, reorderLevel: t.reorderLevel || 50, description: t.notes || '' }); setTypeDialog(true) }

  const openAddStock = () => { setEditingStock(null); setStockForm({ feedTypeId: feedTypes[0]?.id || '', quantity: 0, unit: 'كجم', unitPrice: 0, purchaseDate: today(), expiryDate: '', supplier: '', notes: '' }); setStockDialog(true) }
  const openEditStock = (s: Stock) => { setEditingStock(s); setStockForm({ feedTypeId: s.feedTypeId, quantity: s.quantity, unit: s.unit, unitPrice: s.cost || 0, purchaseDate: s.purchaseDate.split('T')[0], expiryDate: s.expiryDate ? s.expiryDate.split('T')[0] : '', supplier: s.supplier || '', notes: s.notes || '' }); setStockDialog(true) }

  const computeSuggestion = useCallback((penId: string, feedTypeId: string) => {
    const pen = pens.find(p => p.id === penId)
    const feed = feedTypes.find(f => f.id === feedTypeId)
    if (pen?.goats && pen.goats.length > 0 && feed) {
      setAiSuggestion(suggestFeedAmount(pen.goats, feed.category, farm?.farmType))
    } else {
      setAiSuggestion(null)
    }
  }, [pens, feedTypes])

  const openAddSchedule = () => { setEditingSchedule(null); setAiSuggestion(null); setScheduleTarget('pen'); setScheduleForm({ penId: '', feedTypeId: feedTypes[0]?.id || '', dailyAmount: 0, feedingTimes: '2', startDate: today(), endDate: '', notes: '', goatId: '' }); setScheduleDialog(true) }
  const openEditSchedule = (s: Schedule) => { setEditingSchedule(s); setAiSuggestion(null); setScheduleTarget(s.goatId ? 'goat' : 'pen'); setScheduleForm({ penId: s.penId || '', feedTypeId: s.feedTypeId, dailyAmount: s.quantity, feedingTimes: String(s.frequency), startDate: s.startDate.split('T')[0], endDate: s.endDate ? s.endDate.split('T')[0] : '', notes: s.notes || '', goatId: s.goatId || '' }); setScheduleDialog(true) }

  const saveType = async () => {
    if (saving) return
    setSaving(true)
    try {
      const url = editingType ? `/api/feeds/${editingType.id}` : '/api/feeds'
      const method = editingType ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(typeForm) })
      if (res.ok) { fetchAll(); setTypeDialog(false); setActionMessage({ type: 'success', text: editingType ? 'تم تحديث نوع العلف بنجاح' : 'تم إضافة نوع العلف بنجاح' }) } else { const d = await res.json().catch(() => ({})); setActionMessage({ type: 'error', text: d.error || 'فشل في الحفظ' }) }
    } finally { setSaving(false) }
  }

  const saveStock = async () => {
    if (saving) return
    setSaving(true)
    try {
      const url = editingStock ? `/api/feeds/stock/${editingStock.id}` : '/api/feeds/stock'
      const method = editingStock ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(stockForm) })
      if (res.ok) { fetchAll(); setStockDialog(false); setActionMessage({ type: 'success', text: editingStock ? 'تم تحديث المخزون بنجاح' : 'تم إضافة المخزون بنجاح' }) } else { const d = await res.json().catch(() => ({})); setActionMessage({ type: 'error', text: d.error || 'فشل في الحفظ' }) }
    } finally { setSaving(false) }
  }

  const saveSchedule = async () => {
    if (saving) return
    setSaving(true)
    try {
      const url = editingSchedule ? `/api/feeds/schedule/${editingSchedule.id}` : '/api/feeds/schedule'
      const method = editingSchedule ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...scheduleForm, dailyAmount: Number(scheduleForm.dailyAmount), feedingTimes: Number(scheduleForm.feedingTimes) })
      })
      if (res.ok) { fetchAll(); setScheduleDialog(false); setEditingSchedule(null); setActionMessage({ type: 'success', text: editingSchedule ? 'تم تحديث الجدول بنجاح' : 'تم إضافة الجدول بنجاح' }) } else { const d = await res.json().catch(() => ({})); setActionMessage({ type: 'error', text: d.error || 'فشل في الحفظ' }) }
    } finally { setSaving(false) }
  }

  const toggleScheduleActive = async (s: Schedule) => {
    const res = await fetch(`/api/feeds/schedule/${s.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !s.isActive })
    })
    // MD-08: Add success/error feedback
    if (res.ok) {
      setActionMessage({ type: 'success', text: s.isActive ? 'تم إيقاف الجدول' : 'تم تفعيل الجدول' })
      fetchAll()
    } else {
      const d = await res.json().catch(() => ({}))
      setActionMessage({ type: 'error', text: d.error || 'فشل في تغيير حالة الجدول' })
    }
  }

  const confirmDelete = async () => {
    if (!deleteDialog) return
    const { type, item } = deleteDialog
    const url = type === 'stock' ? `/api/feeds/stock/${item.id}` : type === 'schedule' ? `/api/feeds/schedule/${item.id}` : `/api/feeds/${item.id}`
    try {
      const res = await fetch(url, { method: 'DELETE' })
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'تم الحذف بنجاح' })
        fetchAll()
      } else {
        const d = await res.json().catch(() => ({}))
        setActionMessage({ type: 'error', text: d.error || 'فشل في الحذف' })
      }
    } catch {
      setActionMessage({ type: 'error', text: 'حدث خطأ أثناء الحذف' })
    }
    setDeleteDialog(null)
  }

  const executeTodayConsumption = async () => {
    if (consumeSubmitting) return
    // MD-10: Confirmation before executing consumption
    if (!confirm('هل تريد تنفيذ صرف الأعلاف اليومي لهذا اليوم؟')) return
    setConsumeSubmitting(true)
    setActionMessage(null)

    try {
      const res = await fetch('/api/feeds/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: today() })
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (Array.isArray(data.shortages) && data.shortages.length > 0) {
          const firstShortage = data.shortages[0]
          setActionMessage({
            type: 'error',
            text: `${data.error || 'مخزون غير كاف'}: ${firstShortage.feedTypeName} (مطلوب ${firstShortage.required} كجم، متاح ${firstShortage.available} كجم)`
          })
        } else {
          setActionMessage({ type: 'error', text: data.error || 'فشل تنفيذ صرف الأعلاف' })
        }
        return
      }

      setActionMessage({
        type: 'success',
        text: data.message || 'تم تنفيذ صرف الأعلاف اليومي'
      })
      await fetchAll()
    } catch {
      setActionMessage({ type: 'error', text: 'حدث خطأ أثناء تنفيذ صرف الأعلاف' })
    } finally {
      setConsumeSubmitting(false)
    }
  }

  const generateSmartSchedules = async () => {
    if (smartScheduleLoading) return
    if (!confirm('سيتم إنشاء جداول تغذية ذكية لجميع الحظائر بناءً على أعمار الحيوانات وأنواع الأعلاف المتاحة. الجداول الحالية سيتم استبدالها. هل تريد المتابعة؟')) return
    setSmartScheduleLoading(true)
    setActionMessage(null)
    try {
      const res = await fetch('/api/feeds/schedule/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replaceExisting: true })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setActionMessage({ type: 'success', text: data.message || 'تم إنشاء الجداول الذكية بنجاح' })
        await fetchAll()
      } else {
        setActionMessage({ type: 'error', text: data.error || 'فشل في إنشاء الجداول الذكية' })
      }
    } catch {
      setActionMessage({ type: 'error', text: 'حدث خطأ أثناء إنشاء الجداول' })
    } finally {
      setSmartScheduleLoading(false)
    }
  }

  // ─── Export ───
  const exportPDF = async () => {
    const totalValue = stocks.reduce((sum, s) => sum + (s.cost || 0) * s.quantity, 0)
    const totalQty = stocks.reduce((sum, s) => sum + s.quantity, 0)
    const data = stocks.map(s => ({
      feedType: s.feedType?.nameAr || '-',
      quantity: `${s.quantity} ${s.unit}`,
      cost: `${s.cost || 0} درهم`,
      supplier: s.supplier || '-'
    }))
    
    await generateArabicPDF({
      title: 'تقرير إدارة الأعلاف',
      date: new Date().toLocaleDateString('en-GB'),
      stats: [
        { label: 'عدد الأصناف', value: stocks.length },
        { label: 'إجمالي الكمية', value: totalQty },
        { label: 'إجمالي القيمة', value: `${totalValue} درهم` }
      ],
      columns: [
        { header: 'المورد', dataKey: 'supplier' },
        { header: 'سعر الوحدة', dataKey: 'cost' },
        { header: 'الكمية', dataKey: 'quantity' },
        { header: 'نوع العلف', dataKey: 'feedType' }
      ],
      data,
      totals: { feedType: 'الإجمالي', quantity: String(totalQty), cost: `${totalValue} درهم` },
      filename: `feeds-${today()}.pdf`
    })
  }

  const exportExcel = () => {
    const data = stocks.map(s => ({
      'نوع العلف': s.feedType?.nameAr || '',
      'الكمية': s.quantity,
      'الوحدة': s.unit,
      'سعر الوحدة': s.cost || 0,
      'القيمة': s.quantity * (s.cost || 0),
      'المورد': s.supplier || '',
      'تاريخ الشراء': new Date(s.purchaseDate).toLocaleDateString('ar-AE'),
      'تاريخ الانتهاء': s.expiryDate ? new Date(s.expiryDate).toLocaleDateString('ar-AE') : ''
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'المخزون')
    XLSX.writeFile(wb, `feeds-${today()}.xlsx`)
  }

  // ─── View Navigation ───
  const navItems: { key: View; label: string; icon: any; count?: number }[] = [
    { key: 'today', label: 'لوحة اليوم', icon: <TodayIcon /> },
    { key: 'stock', label: 'المخزون', icon: <InventoryIcon />, count: stocks.length },
    { key: 'schedules', label: 'جداول التغذية', icon: <ScheduleIcon />, count: activeSchedules.length },
    { key: 'recipes', label: 'الخلطات', icon: <RecipeIcon />, count: recipes.length },
    { key: 'reorder', label: 'إعادة الطلب', icon: <ReorderIcon /> },
    { key: 'history', label: 'سجل الاستهلاك', icon: <HistoryIcon />, count: consumptionHistory.length }
  ]

  if (loading) return (
    <Box sx={{ p: 3 }}>
      <Skeleton variant="rectangular" height={60} sx={{ mb: 2, borderRadius: 2 }} />
      <Grid container spacing={2}>
        {[1, 2, 3, 4].map(i => <Grid size={{ xs: 12, sm: 6, md: 3 }} key={i}><Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} /></Grid>)}
      </Grid>
    </Box>
  )

  return (
    <Box sx={{ width: '100%', overflowX: 'hidden' }}>
      {/* ─── Top Bar ─── */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={1.5}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <GrassIcon color="success" sx={{ fontSize: 32 }} />
            <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight="bold">إدارة الأعلاف</Typography>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {navItems.map(n => (
              <Chip
                key={n.key}
                icon={n.icon}
                label={`${n.label}${n.count !== undefined ? ` (${n.count})` : ''}`}
                variant={view === n.key ? 'filled' : 'outlined'}
                color={view === n.key ? 'primary' : 'default'}
                onClick={() => setView(n.key)}
                sx={{ fontWeight: view === n.key ? 700 : 400 }}
              />
            ))}
          </Stack>
        </Stack>
      </Paper>

      {/* ─── Alerts ─── */}
      {alerts.length > 0 && (
        <Stack spacing={1} mb={2}>
          {alerts.map((a, i) => <Alert key={i} severity={a.severity} variant="outlined">{a.text}</Alert>)}
        </Stack>
      )}

      {actionMessage && (
        <Alert severity={actionMessage.type} sx={{ mb: 2 }}>
          {actionMessage.text}
        </Alert>
      )}

      {/* ═══════════════════ VIEW: TODAY ═══════════════════ */}
      {view === 'today' && (
        <Fade in>
          <Box>
            {/* ── Combined Summary Strip (MVP) ── */}
            {(() => {
              const totalHeads = todayFeedings.reduce((s, p) => s + p.heads, 0)
              const totalKg = todayFeedings.reduce((s, p) => s + p.items.reduce((ss, i) => ss + i.amount * p.heads, 0), 0)
              const totalCost = todayFeedings.reduce((s, p) => s + p.items.reduce((ss, i) => ss + i.amount * p.heads * i.unitCost, 0), 0)

              return (
                <Paper sx={{ p: 2, mb: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" color="text.secondary" mb={1}>ملخص اليوم</Typography>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip color="primary" variant="outlined" label={`جداول نشطة: ${activeSchedules.length}`} />
                    <Chip color="info" variant="outlined" label={`عدد الرؤوس: ${totalHeads}`} />
                    <Chip color="success" variant="outlined" label={`إجمالي اليوم: ${totalKg.toFixed(1)} كجم`} />
                    <Chip color="warning" variant="outlined" label={`تكلفة اليوم: ${totalCost.toFixed(0)} د.إ`} />
                    <Chip color="secondary" variant="outlined" label={`قيمة المخزون: ${totalStockValue.toFixed(0)} د.إ`} />
                  </Stack>
                </Paper>
              )
            })()}

            {/* ── Main Content: Feeding Plan + Stock Side by Side ── */}
            <Grid container spacing={2}>
              {/* Left: Feeding Plan */}
              <Grid size={{ xs: 12 }}>
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TodayIcon color="primary" />
                      <Typography variant="h6" fontWeight="bold">خطة التغذية اليوم</Typography>
                    </Stack>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        startIcon={<InventoryIcon />}
                        onClick={executeTodayConsumption}
                        disabled={consumeSubmitting || todayFeedings.length === 0}
                      >
                        {consumeSubmitting ? 'جاري التنفيذ...' : 'تنفيذ صرف اليوم'}
                      </Button>
                      <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openAddSchedule}>إضافة جدول</Button>
                    </Stack>
                  </Stack>

                  {todayFeedings.length === 0 ? (
                    <Alert severity="info" variant="outlined">لا توجد جداول تغذية نشطة. أنشئ جدول تغذية لتظهر هنا.</Alert>
                  ) : (
                    <Grid container spacing={2}>
                      {todayFeedings.map(p => {
                        const penDailyKg = p.items.reduce((s, i) => s + i.amount * p.heads, 0)
                        const penDailyCost = p.items.reduce((s, i) => s + i.amount * p.heads * i.unitCost, 0)
                        return (
                          <Grid size={{ xs: 12, sm: 6 }} key={p.penId}>
                            <Card sx={{
                              borderRadius: 3, height: '100%',
                              bgcolor: 'background.paper',
                              border: '1px solid',
                              borderColor: 'divider',
                              transition: 'box-shadow 0.2s',
                              '&:hover': { boxShadow: 4 }
                            }}>
                              {/* Card Header */}
                              <Box
                                sx={{
                                  px: 2,
                                  py: 1.25,
                                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                                  borderBottom: '1px solid',
                                  borderColor: alpha(theme.palette.primary.main, 0.2),
                                  borderRadius: '12px 12px 0 0'
                                }}
                              >
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: alpha(theme.palette.primary.main, 0.14), color: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M9 21V12h6v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </Box>
                                    <Typography variant="subtitle2" fontWeight="bold" color="primary.dark">{p.pen}</Typography>
                                  </Stack>
                                  <Chip label={`${p.heads} رأس`} size="small" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.12), color: 'primary.dark', fontWeight: 'bold', fontSize: 11, height: 22 }} />
                                </Stack>
                              </Box>

                              <CardContent sx={{ pt: 1.5, pb: '12px !important' }}>
                                <TableContainer sx={{ overflowX: 'auto' }}>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', fontSize: 11, py: 0.4, borderBottom: '2px solid', borderColor: 'divider' }}>العلف</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: 11, py: 0.4, borderBottom: '2px solid', borderColor: 'divider' }}>كجم/رأس</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: 11, py: 0.4, borderBottom: '2px solid', borderColor: 'divider' }}>وجبات</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: 11, py: 0.4, borderBottom: '2px solid', borderColor: 'divider' }}>الإجمالي</TableCell>
                                        <TableCell align="center" sx={{ fontWeight: 'bold', fontSize: 11, py: 0.4, borderBottom: '2px solid', borderColor: 'divider' }}>إجراءات</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {p.items.map((item, i) => {
                                        const totalForItem = item.amount * p.heads
                                        // HI-01: Prevent division by zero
                                        const daysRemaining = totalForItem > 0 && item.stockQty > 0 ? Math.floor(item.stockQty / totalForItem) : 0
                                        const schedule = schedules.find(s => s.id === item.scheduleId)
                                        return (
                                          <TableRow key={i} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                                            <TableCell sx={{ py: 0.5, fontSize: 12 }}>
                                              <Stack direction="row" spacing={0.5} alignItems="center">
                                                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: catColor(item.category), flexShrink: 0 }} />
                                                <Typography variant="body2" fontSize={12} noWrap>{item.feed}</Typography>
                                              </Stack>
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 0.5, fontSize: 12, fontWeight: 600 }}>{item.amount}</TableCell>
                                            <TableCell align="center" sx={{ py: 0.5, fontSize: 12 }}>{item.meals}×</TableCell>
                                            <TableCell align="center" sx={{ py: 0.5 }}>
                                              <Tooltip title={daysRemaining > 0 ? `يكفي المخزون لـ ${daysRemaining} يوم` : 'لا يوجد مخزون'}>
                                                <Chip
                                                  label={`${totalForItem.toFixed(1)}`}
                                                  size="small"
                                                  sx={{
                                                    fontSize: 10.5, fontWeight: 'bold', height: 20,
                                                    bgcolor: daysRemaining <= 3 ? 'error.light' : daysRemaining <= 7 ? 'warning.light' : 'success.light',
                                                    color: daysRemaining <= 3 ? 'error.dark' : daysRemaining <= 7 ? 'warning.dark' : 'success.dark',
                                                  }}
                                                />
                                              </Tooltip>
                                            </TableCell>
                                            <TableCell align="center" sx={{ py: 0.5 }}>
                                              <Stack direction="row" spacing={0.5} justifyContent="center">
                                                {schedule && (
                                                  <>
                                                    <Tooltip title="تعديل">
                                                      <IconButton size="small" color="primary" onClick={() => openEditSchedule(schedule)} sx={{ p: 0.25 }}>
                                                        <EditIcon sx={{ fontSize: 14 }} />
                                                      </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="حذف">
                                                      <IconButton size="small" color="error" onClick={() => setDeleteDialog({ type: 'schedule', item: schedule })} sx={{ p: 0.25 }}>
                                                        <DeleteIcon sx={{ fontSize: 14 }} />
                                                      </IconButton>
                                                    </Tooltip>
                                                  </>
                                                )}
                                              </Stack>
                                            </TableCell>
                                          </TableRow>
                                        )
                                      })}
                                    </TableBody>
                                  </Table>
                                </TableContainer>

                                {/* Footer */}
                                <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1} pt={1} sx={{ borderTop: '1px dashed', borderColor: 'divider' }}>
                                  <Typography variant="caption" fontWeight="bold" color="primary.main">
                                    {penDailyKg.toFixed(1)} كجم/يوم {penDailyCost > 0 ? `≈ ${penDailyCost.toFixed(0)} د.إ` : ''}
                                  </Typography>
                                  {p.heads > 0 && (
                                    <Chip label={`${(penDailyKg / p.heads).toFixed(1)} كجم/رأس`} size="small" variant="outlined" color="primary" sx={{ fontSize: 10.5, fontWeight: 'bold', height: 20 }} />
                                  )}
                                </Stack>
                              </CardContent>
                            </Card>
                          </Grid>
                        )
                      })}
                    </Grid>
                  )}
                </Paper>
              </Grid>

              {/* Stock - Horizontal */}
              <Grid size={{ xs: 12 }}>
                <Paper sx={{ p: 2.5, borderRadius: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <InventoryIcon color="primary" />
                      <Typography variant="h6" fontWeight="bold">المخزون</Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" color="error" onClick={exportPDF}><PdfIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="success" onClick={exportExcel}><ExcelIcon fontSize="small" /></IconButton>
                    </Stack>
                  </Stack>
                  {stockSummary.length === 0 ? (
                    <Alert severity="info" variant="outlined" sx={{ fontSize: 12 }}>لا يوجد مخزون</Alert>
                  ) : (
                    <Grid container spacing={2}>
                      {stockSummary.map(s => {
                        // MD-02: Use reorderLevel directly instead of arbitrary ×4 multiplier
                        const reorderLevelVal = s.feedType.reorderLevel || 50
                        const pct = Math.min(100, (s.totalQty / reorderLevelVal) * 100)
                        const expDays = s.lowestExpiry ? daysUntil(s.lowestExpiry) : null
                        const isExpired = expDays !== null && expDays <= 0
                        const dailyUse = dailyConsumptionByType[s.feedType.id] || 0
                        const stockDaysLeft = dailyUse > 0 ? Math.floor(s.totalQty / dailyUse) : null
                        const color = catColor(s.feedType.category)
                        return (
                          <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={s.feedType.id}>
                            <Card sx={{
                              borderRadius: 3, height: '100%',
                              bgcolor: 'background.paper',
                              border: '1px solid',
                              borderColor: 'divider',
                              transition: 'box-shadow 0.2s',
                              '&:hover': { boxShadow: 4 }
                            }}>
                              {/* Header */}
                              <Box
                                sx={{
                                  px: 1.5,
                                  py: 1,
                                  bgcolor: alpha(color, 0.12),
                                  borderBottom: '1px solid',
                                  borderColor: alpha(color, 0.28),
                                  borderRadius: '12px 12px 0 0'
                                }}
                              >
                                <Stack direction="row" justifyContent="space-between" alignItems="center">
                                  <Stack direction="row" spacing={0.75} alignItems="center">
                                    <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: alpha(color, 0.2), color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" stroke="currentColor" strokeWidth="2"/>
                                        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke="currentColor" strokeWidth="2"/>
                                      </svg>
                                    </Box>
                                    <Typography variant="caption" fontWeight="bold" sx={{ color }} noWrap>{s.feedType.nameAr}</Typography>
                                  </Stack>
                                  <Chip label={catLabel(s.feedType.category)} size="small" sx={{ bgcolor: alpha(color, 0.18), color, fontWeight: 'bold', fontSize: 10, height: 20 }} />
                                </Stack>
                              </Box>

                              <CardContent sx={{ pt: 1.5, pb: '12px !important', px: 1.5 }}>
                                <Typography variant="h5" fontWeight="bold" color={s.isLow ? 'warning.main' : 'primary.main'} mb={0.5}>
                                  {s.totalQty.toFixed(0)} <Typography component="span" variant="caption" color="text.secondary">كجم</Typography>
                                </Typography>
                                <LinearProgress variant="determinate" value={pct} color={s.isLow ? 'warning' : 'primary'} sx={{ height: 5, borderRadius: 3, mb: 1 }} />

                                {/* Footer */}
                                <Stack direction="row" justifyContent="space-between" alignItems="center" pt={0.75} sx={{ borderTop: '1px dashed', borderColor: 'divider' }}>
                                  {dailyUse > 0 ? (
                                    <Typography variant="caption" color="text.secondary">{dailyUse.toFixed(1)} كجم/يوم</Typography>
                                  ) : (
                                    <Typography variant="caption" color="text.secondary">{s.totalValue.toFixed(0)} د.إ</Typography>
                                  )}
                                  {stockDaysLeft !== null ? (
                                    <Chip
                                      label={`${stockDaysLeft} يوم`}
                                      size="small"
                                      sx={{
                                        height: 20, fontSize: 10.5, fontWeight: 'bold',
                                        bgcolor: stockDaysLeft <= 3 ? 'error.light' : stockDaysLeft <= 7 ? 'warning.light' : 'success.light',
                                        color: stockDaysLeft <= 3 ? 'error.dark' : stockDaysLeft <= 7 ? 'warning.dark' : 'success.dark',
                                      }}
                                    />
                                  ) : expDays !== null ? (
                                    <Typography variant="caption" color={isExpired ? 'error.main' : expDays <= 30 ? 'warning.main' : 'text.secondary'}>
                                      {isExpired ? 'منتهي!' : `${expDays} يوم`}
                                    </Typography>
                                  ) : null}
                                </Stack>
                              </CardContent>
                            </Card>
                          </Grid>
                        )
                      })}
                    </Grid>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </Fade>
      )}

      {/* ═══════════════════ VIEW: STOCK ═══════════════════ */}
      {view === 'stock' && (
        <Fade in>
          <Box>
            {/* Quick Add Buttons */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2}>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openAddType}>نوع علف جديد</Button>
              <Button variant="contained" color="secondary" startIcon={<AddIcon />} onClick={openAddStock}>إضافة للمخزون</Button>
            </Stack>

            {/* Feed Types */}
            <Paper sx={{ p: 2.5, borderRadius: 3, mb: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <GrassIcon color="success" />
                <Typography variant="h6" fontWeight="bold">أنواع الأعلاف ({feedTypes.length})</Typography>
              </Stack>
              <Grid container spacing={2}>
                {feedTypes.map(t => {
                  const color = catColor(t.category)
                  return (
                    <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={t.id}>
                      <Card sx={{
                        borderRadius: 3, height: '100%',
                        bgcolor: 'background.paper',
                        border: '1px solid', borderColor: 'divider',
                        transition: 'box-shadow 0.2s',
                        '&:hover': { boxShadow: 4 }
                      }}>
                        <Box
                          sx={{
                            px: 1.5,
                            py: 1,
                            bgcolor: alpha(color, 0.12),
                            borderBottom: '1px solid',
                            borderColor: alpha(color, 0.28),
                            borderRadius: '12px 12px 0 0'
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2" fontWeight="bold" sx={{ color }}>{t.nameAr}</Typography>
                            <Chip label={catLabel(t.category)} size="small" sx={{ bgcolor: alpha(color, 0.18), color, fontWeight: 'bold', fontSize: 10, height: 20 }} />
                          </Stack>
                        </Box>
                        <CardContent sx={{ pt: 1.5, pb: '10px !important', px: 1.5 }}>
                          <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>{t.name}</Typography>
                          {(t.protein || t.energy) && (
                            <Stack direction="row" spacing={0.75} mb={1} flexWrap="wrap" useFlexGap>
                              {t.protein ? <Chip label={`بروتين ${t.protein}%`} size="small" variant="outlined" sx={{ fontSize: 10.5, height: 22 }} /> : null}
                              {t.energy ? <Chip label={`${t.energy} kcal`} size="small" variant="outlined" sx={{ fontSize: 10.5, height: 22 }} /> : null}
                            </Stack>
                          )}
                          <Stack direction="row" spacing={0.5} pt={0.75} sx={{ borderTop: '1px dashed', borderColor: 'divider' }}>
                            <IconButton size="small" onClick={() => openEditType(t)}><EditIcon fontSize="small" /></IconButton>
                            <IconButton size="small" color="error" onClick={() => setDeleteDialog({ type: 'type', item: t })}><DeleteIcon fontSize="small" /></IconButton>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  )
                })}
              </Grid>
            </Paper>

            {/* Stock Items (MVP DataGrid) */}
            <Paper sx={{ p: 2.5, borderRadius: 3 }}>
              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <InventoryIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">المخزون ({stocks.length})</Typography>
              </Stack>

              {/* Stock Category Filter */}
              <Stack direction="row" spacing={1} mb={2} flexWrap="wrap" useFlexGap>
                <Chip
                  icon={<FilterIcon />}
                  label="الكل"
                  variant={stockCategoryFilter === 'ALL' ? 'filled' : 'outlined'}
                  color={stockCategoryFilter === 'ALL' ? 'primary' : 'default'}
                  onClick={() => setStockCategoryFilter('ALL')}
                  size="small"
                />
                {CATEGORIES.map(c => (
                  <Chip
                    key={c.value}
                    label={c.label}
                    variant={stockCategoryFilter === c.value ? 'filled' : 'outlined'}
                    color={stockCategoryFilter === c.value ? 'primary' : 'default'}
                    onClick={() => setStockCategoryFilter(c.value)}
                    size="small"
                    sx={stockCategoryFilter === c.value ? {} : { borderColor: catColor(c.value), color: catColor(c.value) }}
                  />
                ))}
              </Stack>
              {filteredStockRows.length === 0 ? (
                <Alert severity="info" variant="outlined">{stockCategoryFilter === 'ALL' ? 'لا يوجد مخزون' : 'لا يوجد مخزون في هذه الفئة'}</Alert>
              ) : (
                <>
                  {/* Tablet/Mobile Cards View */}
                  <Box sx={{ display: { xs: 'block', lg: 'none' } }}>
                    <Stack spacing={1.5}>
                      {filteredStockRows.map((row: any) => (
                        <Card key={row.id} sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'divider' }}>
                          <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Stack spacing={1}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="subtitle2" fontWeight="bold">{row.feedName}</Typography>
                                <Chip
                                  label={row.status}
                                  size="small"
                                  color={row.statusColor as any}
                                  variant="outlined"
                                />
                              </Stack>

                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip
                                  label={row.category}
                                  size="small"
                                  sx={{
                                    bgcolor: alpha(row.categoryColor as string, 0.14),
                                    color: row.categoryColor as string,
                                    fontWeight: 700
                                  }}
                                />
                                <Chip label={`الكمية: ${row.quantity}`} size="small" variant="outlined" />
                                <Chip label={`الاستهلاك: ${row.dailyUse}`} size="small" variant="outlined" />
                              </Stack>

                              <Grid container spacing={1}>
                                <Grid size={{ xs: 6 }}>
                                  <Typography variant="caption" color="text.secondary">القيمة</Typography>
                                  <Typography variant="body2" fontWeight="bold">{row.value}</Typography>
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                  <Typography variant="caption" color="text.secondary">المورد</Typography>
                                  <Typography variant="body2" fontWeight="bold" noWrap>{row.supplier}</Typography>
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                  <Typography variant="caption" color="text.secondary">الشراء</Typography>
                                  <Typography variant="body2">{row.purchaseDate}</Typography>
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                  <Typography variant="caption" color="text.secondary">الانتهاء</Typography>
                                  <Typography variant="body2">{row.expiryDate}</Typography>
                                </Grid>
                              </Grid>

                              <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                <IconButton size="small" color="primary" onClick={() => openEditStock(row.item)}><EditIcon fontSize="small" /></IconButton>
                                <IconButton size="small" color="error" onClick={() => setDeleteDialog({ type: 'stock', item: row.item })}><DeleteIcon fontSize="small" /></IconButton>
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  </Box>

                  {/* Desktop DataGrid */}
                  <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
                    <AppDataGrid
                      title=""
                      showDensityToggle={false}
                      autoHeight
                      rows={filteredStockRows}
                      columns={stockColumns}
                      initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                    />
                  </Box>
                </>
              )}
            </Paper>
          </Box>
        </Fade>
      )}

      {/* ═══════════════════ VIEW: SCHEDULES ═══════════════════ */}
      {view === 'schedules' && (
        <Fade in>
          <Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2}>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openAddSchedule}>إضافة جدول تغذية</Button>
              <Button variant="outlined" color="secondary" startIcon={<CalendarIcon />} onClick={generateSmartSchedules} disabled={smartScheduleLoading}>
                {smartScheduleLoading ? 'جاري الإنشاء...' : 'جداول ذكية شهرية'}
              </Button>
            </Stack>

            {schedules.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                <ScheduleIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">لا توجد جداول تغذية</Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>أنشئ جدول تغذية لكل حظيرة لتنظيم الوجبات اليومية</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openAddSchedule}>إنشاء أول جدول</Button>
              </Paper>
            ) : (
              <>
                {/* Mobile Cards View */}
                <Box sx={{ display: { xs: 'block', lg: 'none' } }}>
                  <Stack spacing={2}>
                    {schedules.map(s => {
                      const heads = s.goat ? 1 : (s.pen?._count?.goats || 0)
                      return (
                        <Card key={s.id} sx={{ opacity: s.isActive ? 1 : 0.6, borderRadius: 3 }}>
                          <CardContent>
                            <Stack spacing={2}>
                              {/* Header */}
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="h6" fontWeight="bold">{s.goat ? `${s.goat.tagId} — ${s.goat.name || ''}` : (s.pen?.nameAr || 'غير محدد')}</Typography>
                                <Chip
                                  label={s.isActive ? 'نشط' : 'متوقف'}
                                  size="small"
                                  color={s.isActive ? 'success' : 'default'}
                                  onClick={() => toggleScheduleActive(s)}
                                  sx={{ cursor: 'pointer' }}
                                />
                              </Stack>

                              {/* Feed Type */}
                              <Box>
                                <Typography variant="body2" color="text.secondary">نوع العلف</Typography>
                                <Chip label={s.feedType?.nameAr || '-'} size="small" sx={{ bgcolor: catColor(s.feedType?.category || ''), color: 'common.white', mt: 0.5 }} />
                              </Box>

                              {/* Details Grid */}
                              <Grid container spacing={2}>
                                <Grid size={{ xs: 6 }}>
                                  <Typography variant="body2" color="text.secondary">عدد الرؤوس</Typography>
                                  <Typography variant="body1" fontWeight="bold">{heads}</Typography>
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                  <Typography variant="body2" color="text.secondary">كجم / رأس / يوم</Typography>
                                  <Typography variant="body1" fontWeight="bold">{s.quantity} كجم</Typography>
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                  <Typography variant="body2" color="text.secondary">الوجبات</Typography>
                                  <Typography variant="body1" fontWeight="bold">{s.frequency} وجبات</Typography>
                                </Grid>
                                <Grid size={{ xs: 6 }}>
                                  <Typography variant="body2" color="text.secondary">الإجمالي اليومي</Typography>
                                  <Typography variant="body1" fontWeight="bold" color="primary.main">{(s.quantity * heads).toFixed(1)} كجم</Typography>
                                </Grid>
                              </Grid>

                              {/* Date */}
                              <Box>
                                <Typography variant="body2" color="text.secondary">تاريخ البدء</Typography>
                                <Typography variant="body2">{new Date(s.startDate).toLocaleDateString('ar-AE')}</Typography>
                              </Box>

                              {/* Actions */}
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <IconButton size="small" color="primary" onClick={() => openEditSchedule(s)}><EditIcon fontSize="small" /></IconButton>
                                <IconButton size="small" color="error" onClick={() => setDeleteDialog({ type: 'schedule', item: s })}><DeleteIcon fontSize="small" /></IconButton>
                              </Stack>
                            </Stack>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </Stack>
                </Box>

                {/* Desktop Table View */}
                <TableContainer component={Paper} sx={{ display: { xs: 'none', lg: 'block' }, borderRadius: 2, overflowX: 'auto' }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell><strong>الحظيرة</strong></TableCell>
                        <TableCell><strong>عدد الرؤوس</strong></TableCell>
                        <TableCell><strong>نوع العلف</strong></TableCell>
                        <TableCell><strong>كجم / رأس / يوم</strong></TableCell>
                        <TableCell><strong>الوجبات</strong></TableCell>
                        <TableCell><strong>الإجمالي اليومي</strong></TableCell>
                        <TableCell><strong>تاريخ البدء</strong></TableCell>
                        <TableCell><strong>الحالة</strong></TableCell>
                        <TableCell align="center"><strong>إجراءات</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {schedules.map(s => {
                        const heads = s.goat ? 1 : (s.pen?._count?.goats || 0)
                        return (
                          <TableRow key={s.id} hover sx={{ opacity: s.isActive ? 1 : 0.6 }}>
                            <TableCell><Typography fontWeight="bold">{s.goat ? `${s.goat.tagId} — ${s.goat.name || ''}` : (s.pen?.nameAr || 'غير محدد')}</Typography></TableCell>
                            <TableCell>{heads}</TableCell>
                            <TableCell>
                              <Chip label={s.feedType?.nameAr || '-'} size="small" sx={{ bgcolor: catColor(s.feedType?.category || ''), color: 'common.white' }} />
                            </TableCell>
                            <TableCell>{s.quantity} كجم</TableCell>
                            <TableCell>{s.frequency} وجبات</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', color: 'primary.main' }}>{(s.quantity * heads).toFixed(1)} كجم</TableCell>
                            <TableCell>{new Date(s.startDate).toLocaleDateString('ar-AE')}</TableCell>
                            <TableCell>
                              <Chip
                                label={s.isActive ? 'نشط' : 'متوقف'}
                                size="small"
                                color={s.isActive ? 'success' : 'default'}
                                onClick={() => toggleScheduleActive(s)}
                                sx={{ cursor: 'pointer' }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <IconButton size="small" color="primary" onClick={() => openEditSchedule(s)}><EditIcon fontSize="small" /></IconButton>
                              <IconButton size="small" color="error" onClick={() => setDeleteDialog({ type: 'schedule', item: s })}><DeleteIcon fontSize="small" /></IconButton>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                  </TableBody>
                </Table>
              </TableContainer>
              </>
            )}
          </Box>
        </Fade>
      )}

      {/* ═══════════════════ VIEW: RECIPES ═══════════════════ */}
      {view === 'recipes' && (
        <Fade in>
          <Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2}>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openAddRecipe}>إنشاء خلطة جديدة</Button>
            </Stack>

            {recipes.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                <RecipeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">لا توجد خلطات أعلاف</Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>أنشئ خلطة لتعريف وصفة خلط (مثال: 60% شعير + 30% نخالة + 10% أملاح)</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openAddRecipe}>إنشاء أول خلطة</Button>
              </Paper>
            ) : (
              <Grid container spacing={2}>
                {recipes.map(r => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={r.id}>
                    <Card sx={{ borderRadius: 3, height: '100%', border: '1px solid', borderColor: 'divider', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 4 } }}>
                      <Box sx={{ px: 2, py: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.08), borderBottom: '1px solid', borderColor: 'divider', borderRadius: '12px 12px 0 0' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Stack direction="row" spacing={1} alignItems="center">
                            <RecipeIcon color="primary" fontSize="small" />
                            <Typography variant="subtitle1" fontWeight="bold">{r.nameAr}</Typography>
                          </Stack>
                          <Chip label={r.isActive ? 'نشطة' : 'معطلة'} size="small" color={r.isActive ? 'success' : 'default'} />
                        </Stack>
                      </Box>
                      <CardContent sx={{ pt: 1.5 }}>
                        {r.description && <Typography variant="body2" color="text.secondary" mb={1}>{r.description}</Typography>}
                        <Typography variant="caption" fontWeight="bold" color="text.secondary" mb={0.5} display="block">المكونات ({r.items.length})</Typography>
                        <Stack spacing={0.5} mb={1.5}>
                          {r.items.map(item => (
                            <Stack key={item.id} direction="row" spacing={1} alignItems="center">
                              <Box sx={{ width: '100%' }}>
                                <Stack direction="row" justifyContent="space-between" mb={0.25}>
                                  <Typography variant="body2" fontSize={12.5}>{item.feedType.nameAr}</Typography>
                                  <Typography variant="body2" fontSize={12.5} fontWeight="bold">{item.percentage}%</Typography>
                                </Stack>
                                <LinearProgress
                                  variant="determinate"
                                  value={item.percentage}
                                  sx={{
                                    height: 6, borderRadius: 3,
                                    bgcolor: alpha(catColor(item.feedType.category), 0.12),
                                    '& .MuiLinearProgress-bar': { bgcolor: catColor(item.feedType.category), borderRadius: 3 }
                                  }}
                                />
                              </Box>
                            </Stack>
                          ))}
                        </Stack>
                        <Stack direction="row" spacing={0.5} pt={0.75} sx={{ borderTop: '1px dashed', borderColor: 'divider' }}>
                          <IconButton size="small" onClick={() => openEditRecipe(r)}><EditIcon fontSize="small" /></IconButton>
                          <IconButton size="small" color="error" onClick={() => deleteRecipe(r)}><DeleteIcon fontSize="small" /></IconButton>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </Fade>
      )}

      {/* ═══════════════════ VIEW: REORDER ═══════════════════ */}
      {view === 'reorder' && (
        <Fade in>
          <Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center" mb={2}>
              <ReorderIcon color="primary" sx={{ fontSize: 28 }} />
              <Typography variant="h6" fontWeight="bold">اقتراحات إعادة الطلب</Typography>
              <Button size="small" variant="outlined" onClick={fetchReorder} disabled={reorderLoading}>
                {reorderLoading ? 'جاري الحساب...' : 'تحديث'}
              </Button>
            </Stack>

            {!reorderData ? (
              <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                <ReorderIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">اضغط "تحديث" لحساب كميات الشراء المقترحة</Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>سيتم تحليل معدل الاستهلاك ومستوى المخزون لكل نوع علف</Typography>
                <Button variant="contained" onClick={fetchReorder} disabled={reorderLoading}>{reorderLoading ? 'جاري...' : 'حساب الاقتراحات'}</Button>
              </Paper>
            ) : (
              <>
                {/* Summary Strip */}
                <Paper sx={{ p: 2, mb: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap" useFlexGap>
                    {reorderData.summary.criticalCount > 0 && (
                      <Chip color="error" label={`${reorderData.summary.criticalCount} حرج`} variant="filled" />
                    )}
                    {reorderData.summary.warningCount > 0 && (
                      <Chip color="warning" label={`${reorderData.summary.warningCount} تحذير`} variant="filled" />
                    )}
                    <Chip color="info" variant="outlined" label={`${reorderData.summary.totalTypes} أنواع`} />
                    <Chip color="warning" variant="outlined" label={`تكلفة تقديرية: ${reorderData.summary.totalEstimatedCost.toLocaleString()} د.إ`} />
                  </Stack>
                </Paper>

                {/* Suggestions Table */}
                <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell><strong>الحالة</strong></TableCell>
                        <TableCell><strong>نوع العلف</strong></TableCell>
                        <TableCell><strong>المخزون الحالي</strong></TableCell>
                        <TableCell><strong>حد إعادة الطلب</strong></TableCell>
                        <TableCell><strong>الاستهلاك اليومي</strong></TableCell>
                        <TableCell><strong>يكفي لـ</strong></TableCell>
                        <TableCell><strong>الكمية المقترحة</strong></TableCell>
                        <TableCell><strong>التكلفة التقديرية</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reorderData.suggestions.map(s => (
                        <TableRow key={s.feedTypeId} hover sx={{
                          bgcolor: s.urgency === 'critical' ? alpha(theme.palette.error.main, 0.06) : s.urgency === 'warning' ? alpha(theme.palette.warning.main, 0.04) : undefined
                        }}>
                          <TableCell>
                            <Chip
                              label={s.urgency === 'critical' ? 'حرج' : s.urgency === 'warning' ? 'تحذير' : 'جيد'}
                              size="small"
                              color={s.urgency === 'critical' ? 'error' : s.urgency === 'warning' ? 'warning' : 'success'}
                              variant="filled"
                            />
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <Typography fontWeight="bold">{s.feedName}</Typography>
                              <Chip label={catLabel(s.category)} size="small" sx={{ height: 18, fontSize: 10, bgcolor: alpha(catColor(s.category), 0.14), color: catColor(s.category) }} />
                            </Stack>
                          </TableCell>
                          <TableCell>{s.currentStock.toFixed(1)} كجم</TableCell>
                          <TableCell>{s.reorderLevel} كجم</TableCell>
                          <TableCell>{s.dailyConsumption.toFixed(1)} كجم/يوم</TableCell>
                          <TableCell>
                            <Typography fontWeight="bold" color={s.daysRemaining <= 3 ? 'error.main' : s.daysRemaining <= 7 ? 'warning.main' : 'success.main'}>
                              {s.daysRemaining >= 999 ? '∞' : `${s.daysRemaining.toFixed(0)} يوم`}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography fontWeight="bold" color="primary.main">
                              {s.suggestedPurchase > 0 ? `${s.suggestedPurchase} كجم` : '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>{s.estimatedCost > 0 ? `${s.estimatedCost.toLocaleString()} د.إ` : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Box>
        </Fade>
      )}

      {/* ═══════════════════ VIEW: HISTORY ═══════════════════ */}
      {view === 'history' && (
        <Fade in>
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
              <HistoryIcon color="primary" sx={{ fontSize: 28 }} />
              <Typography variant="h6" fontWeight="bold">سجل الاستهلاك اليومي</Typography>
              <Button size="small" variant="outlined" onClick={fetchHistory} startIcon={<HistoryIcon />}>تحديث</Button>
            </Stack>

            {consumptionHistory.length === 0 ? (
              <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                <HistoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">لا يوجد سجل استهلاك</Typography>
                <Typography variant="body2" color="text.secondary">سيظهر هنا سجل الصرف اليومي بعد تنفيذ الصرف التلقائي</Typography>
              </Paper>
            ) : (
              <Stack spacing={2}>
                {consumptionHistory.map((day: any) => (
                  <Card key={day.date} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                    <CardContent sx={{ p: 2 }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1} mb={1.5}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CalendarIcon fontSize="small" color="primary" />
                          <Typography variant="subtitle1" fontWeight="bold">
                            {new Date(day.date).toLocaleDateString('ar-AE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip label={`${day.totalQty?.toFixed(1) || 0} كجم`} size="small" color="primary" variant="outlined" />
                          <Chip label={`${day.totalCost?.toFixed(0) || 0} د.إ`} size="small" color="warning" variant="outlined" />
                          <Tooltip title="التراجع عن هذا الصرف واسترجاع المخزون">
                            <span>
                              <Button
                                size="small"
                                color="error"
                                variant="outlined"
                                startIcon={<UndoIcon />}
                                disabled={undoingDate === day.date}
                                onClick={() => undoConsumption(day.date)}
                                sx={{ borderRadius: 2, fontSize: 12 }}
                              >
                                {undoingDate === day.date ? 'جاري التراجع...' : 'تراجع'}
                              </Button>
                            </span>
                          </Tooltip>
                        </Stack>
                      </Stack>

                      {/* Consumption Items */}
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: 'action.hover' }}>
                            <TableCell><strong>نوع العلف</strong></TableCell>
                            <TableCell><strong>الحظيرة</strong></TableCell>
                            <TableCell><strong>الكمية</strong></TableCell>
                            <TableCell><strong>التكلفة</strong></TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(day.items || []).map((item: any, idx: number) => (
                            <TableRow key={idx} hover>
                              <TableCell>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  <Typography variant="body2">{item.feedType || '-'}</Typography>
                                  {item.category && (
                                    <Chip label={catLabel(item.category)} size="small" sx={{ height: 18, fontSize: 10, bgcolor: alpha(catColor(item.category), 0.14), color: catColor(item.category) }} />
                                  )}
                                </Stack>
                              </TableCell>
                              <TableCell><Typography variant="body2">{item.pen || '-'}</Typography></TableCell>
                              <TableCell><Typography variant="body2" fontWeight="bold">{item.quantity?.toFixed(1)} كجم</Typography></TableCell>
                              <TableCell><Typography variant="body2">{item.cost?.toFixed(0) || 0} د.إ</Typography></TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>
        </Fade>
      )}

      {/* ═══════════════════ DIALOGS ═══════════════════ */}

      {/* Feed Type Dialog */}
      <Dialog open={typeDialog} onClose={() => setTypeDialog(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>{editingType ? 'تعديل نوع علف' : 'إضافة نوع علف'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField fullWidth label="الاسم بالعربية" value={typeForm.nameAr} onChange={e => setTypeForm({ ...typeForm, nameAr: e.target.value })} />
            <TextField fullWidth label="الاسم بالإنجليزية" value={typeForm.nameEn} onChange={e => setTypeForm({ ...typeForm, nameEn: e.target.value })} />
            <TextField select fullWidth label="الفئة" value={typeForm.category} onChange={e => setTypeForm({ ...typeForm, category: e.target.value })}>
              {CATEGORIES.map(c => <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>)}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth type="number" label="بروتين (%)" value={typeForm.protein} onChange={e => setTypeForm({ ...typeForm, protein: Number(e.target.value) })} />
              <TextField fullWidth type="number" label="طاقة (kcal)" value={typeForm.energy} onChange={e => setTypeForm({ ...typeForm, energy: Number(e.target.value) })} />
            </Stack>
            <TextField fullWidth type="number" label="حد إعادة الطلب (كجم)" helperText="عند انخفاض المخزون عن هذه الكمية سيظهر تنبيه" value={typeForm.reorderLevel} onChange={e => setTypeForm({ ...typeForm, reorderLevel: Number(e.target.value) })} InputProps={{ endAdornment: <InputAdornment position="end">كجم</InputAdornment> }} />
            <TextField fullWidth multiline rows={2} label="وصف" value={typeForm.description} onChange={e => setTypeForm({ ...typeForm, description: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTypeDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={saveType} disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ'}</Button>
        </DialogActions>
      </Dialog>

      {/* Stock Dialog */}
      <Dialog open={stockDialog} onClose={() => setStockDialog(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>{editingStock ? 'تعديل المخزون' : 'إضافة للمخزون'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField select fullWidth label="نوع العلف" value={stockForm.feedTypeId} onChange={e => setStockForm({ ...stockForm, feedTypeId: e.target.value })}>
              {feedTypes.map(t => <MenuItem key={t.id} value={t.id}>{t.nameAr}</MenuItem>)}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth type="number" label="الكمية" value={stockForm.quantity} onChange={e => setStockForm({ ...stockForm, quantity: Number(e.target.value) })} />
              <TextField fullWidth label="الوحدة" value={stockForm.unit} onChange={e => setStockForm({ ...stockForm, unit: e.target.value })} />
            </Stack>
            <TextField fullWidth type="number" label="سعر الوحدة" value={stockForm.unitPrice} onChange={e => setStockForm({ ...stockForm, unitPrice: Number(e.target.value) })} />
            <Stack direction="row" spacing={2}>
              <TextField fullWidth type="date" label="تاريخ الشراء" InputLabelProps={{ shrink: true }} value={stockForm.purchaseDate} onChange={e => setStockForm({ ...stockForm, purchaseDate: e.target.value })} />
              <TextField fullWidth type="date" label="تاريخ الانتهاء" InputLabelProps={{ shrink: true }} value={stockForm.expiryDate} onChange={e => setStockForm({ ...stockForm, expiryDate: e.target.value })} />
            </Stack>
            <TextField fullWidth label="المورد" value={stockForm.supplier} onChange={e => setStockForm({ ...stockForm, supplier: e.target.value })} />
            <TextField fullWidth multiline rows={2} label="ملاحظات" value={stockForm.notes} onChange={e => setStockForm({ ...stockForm, notes: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStockDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={saveStock} disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ'}</Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Dialog — Unified (Pen or Individual Animal) */}
      <Dialog open={scheduleDialog} onClose={() => { setScheduleDialog(false); setEditingSchedule(null); setAiSuggestion(null); setScheduleTarget('pen') }} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>{editingSchedule ? 'تعديل جدول التغذية' : 'إضافة جدول تغذية'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {/* Unified: Choose target type (pen vs individual goat) */}
            <Stack direction="row" spacing={1}>
              <Chip
                icon={<ScheduleIcon />}
                label="حظيرة كاملة"
                variant={scheduleTarget === 'pen' ? 'filled' : 'outlined'}
                color={scheduleTarget === 'pen' ? 'primary' : 'default'}
                onClick={() => setScheduleTarget('pen')}
              />
              <Chip
                icon={<AnimalIcon />}
                label="حيوان فردي"
                variant={scheduleTarget === 'goat' ? 'filled' : 'outlined'}
                color={scheduleTarget === 'goat' ? 'primary' : 'default'}
                onClick={() => setScheduleTarget('goat')}
              />
            </Stack>

            {scheduleTarget === 'pen' ? (
              <TextField select fullWidth label="الحظيرة" value={scheduleForm.penId} onChange={e => {
                const newPenId = e.target.value
                setScheduleForm({ ...scheduleForm, penId: newPenId, goatId: '' })
                computeSuggestion(newPenId, scheduleForm.feedTypeId)
              }}>
                {pens.map(p => <MenuItem key={p.id} value={p.id}>{p.nameAr} ({p._count?.goats || 0} رأس)</MenuItem>)}
              </TextField>
            ) : (
              <TextField select fullWidth label="الحيوان" value={(scheduleForm as any).goatId || ''} onChange={e => {
                setScheduleForm({ ...scheduleForm, penId: '', goatId: e.target.value } as any)
              }}>
                {goats.map((g: any) => <MenuItem key={g.id} value={g.id}>{g.tagId} — {g.name || g.breed?.nameAr || ''}</MenuItem>)}
              </TextField>
            )}
            <TextField select fullWidth label="نوع العلف" value={scheduleForm.feedTypeId} onChange={e => {
              const newFeedTypeId = e.target.value
              setScheduleForm({ ...scheduleForm, feedTypeId: newFeedTypeId })
              computeSuggestion(scheduleForm.penId, newFeedTypeId)
            }}>
              {feedTypes.map(t => <MenuItem key={t.id} value={t.id}>{t.nameAr}</MenuItem>)}
            </TextField>

            {/* AI Suggestion Card */}
            {aiSuggestion && (
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'secondary.light', borderColor: 'secondary.main' }}>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'secondary.main', color: 'common.white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 01-1 1H9a1 1 0 01-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z" fill="currentColor"/>
                        <path d="M9 21h6M10 17v1a2 2 0 002 2h0a2 2 0 002-2v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </Box>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ color: 'secondary.main' }}>اقتراح ذكي للكمية</Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ color: 'secondary.dark', fontSize: 12.5 }}>{aiSuggestion.reasoning}</Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="contained"
                      sx={{ bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' }, fontSize: 12, borderRadius: 2 }}
                      onClick={() => setScheduleForm(f => ({ ...f, dailyAmount: aiSuggestion.amount, feedingTimes: String(aiSuggestion.meals) }))}
                    >
                      تطبيق: {aiSuggestion.amount} كجم / {aiSuggestion.meals} وجبات
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            )}

            <Stack direction="row" spacing={2}>
              <TextField fullWidth type="number" label="كجم / رأس / يوم" value={scheduleForm.dailyAmount} onChange={e => setScheduleForm({ ...scheduleForm, dailyAmount: Number(e.target.value) })} />
              <TextField fullWidth type="number" label="عدد الوجبات" value={scheduleForm.feedingTimes} onChange={e => setScheduleForm({ ...scheduleForm, feedingTimes: e.target.value })} />
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField fullWidth type="date" label="تاريخ البدء" InputLabelProps={{ shrink: true }} value={scheduleForm.startDate} onChange={e => setScheduleForm({ ...scheduleForm, startDate: e.target.value })} />
              <TextField fullWidth type="date" label="تاريخ الانتهاء (اختياري)" InputLabelProps={{ shrink: true }} value={scheduleForm.endDate} onChange={e => setScheduleForm({ ...scheduleForm, endDate: e.target.value })} />
            </Stack>
            <TextField fullWidth multiline rows={2} label="ملاحظات" value={scheduleForm.notes} onChange={e => setScheduleForm({ ...scheduleForm, notes: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setScheduleDialog(false); setEditingSchedule(null); setAiSuggestion(null) }}>إلغاء</Button>
          <Button variant="contained" onClick={saveSchedule} disabled={saving}>{saving ? 'جاري الحفظ...' : (editingSchedule ? 'تحديث' : 'حفظ')}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteDialog} onClose={() => setDeleteDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>هل أنت متأكد من الحذف؟ لا يمكن التراجع.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog(null)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>حذف</Button>
        </DialogActions>
      </Dialog>

      {/* Recipe Dialog (Mix Builder) */}
      <Dialog open={recipeDialog} onClose={() => setRecipeDialog(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>{editingRecipe ? 'تعديل خلطة علف' : 'إنشاء خلطة علف'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField fullWidth label="اسم الخلطة بالعربية" value={recipeForm.nameAr} onChange={e => setRecipeForm({ ...recipeForm, nameAr: e.target.value })} />
            <TextField fullWidth label="اسم الخلطة بالإنجليزية" value={recipeForm.nameEn} onChange={e => setRecipeForm({ ...recipeForm, nameEn: e.target.value })} />
            <TextField fullWidth multiline rows={2} label="وصف" value={recipeForm.description} onChange={e => setRecipeForm({ ...recipeForm, description: e.target.value })} />

            {/* Ingredients */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2" fontWeight="bold">المكونات</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={`المجموع: ${recipeFormTotalPct}%`}
                    size="small"
                    color={Math.abs(recipeFormTotalPct - 100) < 0.1 ? 'success' : 'error'}
                    variant="filled"
                  />
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => setRecipeForm(f => ({ ...f, items: [...f.items, { feedTypeId: '', percentage: 0 }] }))}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
              <Stack spacing={1.5}>
                {recipeForm.items.map((item, idx) => (
                  <Stack key={idx} direction="row" spacing={1} alignItems="center">
                    <TextField
                      select
                      fullWidth
                      size="small"
                      label="نوع العلف"
                      value={item.feedTypeId}
                      onChange={e => {
                        const items = [...recipeForm.items]
                        items[idx] = { ...items[idx], feedTypeId: e.target.value }
                        setRecipeForm({ ...recipeForm, items })
                      }}
                    >
                      {feedTypes.map(t => (
                        <MenuItem key={t.id} value={t.id} disabled={recipeForm.items.some((it, i) => i !== idx && it.feedTypeId === t.id)}>
                          {t.nameAr}
                        </MenuItem>
                      ))}
                    </TextField>
                    <TextField
                      type="number"
                      size="small"
                      label="%"
                      sx={{ minWidth: 80 }}
                      value={item.percentage}
                      onChange={e => {
                        const items = [...recipeForm.items]
                        items[idx] = { ...items[idx], percentage: Number(e.target.value) }
                        setRecipeForm({ ...recipeForm, items })
                      }}
                      InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                    />
                    {recipeForm.items.length > 1 && (
                      <IconButton size="small" color="error" onClick={() => {
                        setRecipeForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
                      }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                ))}
              </Stack>
              {Math.abs(recipeFormTotalPct - 100) >= 0.1 && (
                <Alert severity="warning" sx={{ mt: 1 }}>مجموع النسب يجب أن يساوي 100% (الحالي: {recipeFormTotalPct}%)</Alert>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRecipeDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={saveRecipe}
            disabled={saving || Math.abs(recipeFormTotalPct - 100) >= 0.1 || !recipeForm.nameAr.trim() || recipeForm.items.some(i => !i.feedTypeId)}
          >
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

// ─── Utilities ───
function today() { return new Date().toISOString().split('T')[0] }
function daysUntil(d: string) { return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000) }
