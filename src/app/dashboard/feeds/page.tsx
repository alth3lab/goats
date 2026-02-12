'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardActions,
  Stack,
  LinearProgress,
  Tooltip,
  InputAdornment,
  FormControl,
  InputLabel,
  Select
} from '@mui/material'
import MuiGrid from '@mui/material/Grid'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ScheduleIcon from '@mui/icons-material/Schedule'
import InventoryIcon from '@mui/icons-material/Inventory'
import WarningIcon from '@mui/icons-material/Warning'
import GrassIcon from '@mui/icons-material/Grass'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import InfoIcon from '@mui/icons-material/Info'
import SearchIcon from '@mui/icons-material/Search'
import FilterListIcon from '@mui/icons-material/FilterList'
import GridViewIcon from '@mui/icons-material/GridView'
import ViewListIcon from '@mui/icons-material/ViewList'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'
import DescriptionIcon from '@mui/icons-material/Description'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx'

const Grid = MuiGrid as any

const FEED_CATEGORIES = [
  { value: 'HAY', label: 'تبن' },
  { value: 'GRAINS', label: 'حبوب' },
  { value: 'CONCENTRATE', label: 'مركزات' },
  { value: 'SUPPLEMENTS', label: 'مكملات' },
  { value: 'MINERALS', label: 'معادن' },
  { value: 'OTHER', label: 'أخرى' }
]

const SMART_FEED_GUIDE = [
  { key: 'kids_0_3', label: 'مواليد (0-3 أشهر)', minMonths: 0, maxMonths: 3, kgPerHeadPerDay: 0.35 },
  { key: 'kids_3_6', label: 'صغار (3-6 أشهر)', minMonths: 3, maxMonths: 6, kgPerHeadPerDay: 0.55 },
  { key: 'young_6_12', label: 'يافعة (6-12 شهر)', minMonths: 6, maxMonths: 12, kgPerHeadPerDay: 0.85 },
  { key: 'subadult_12_24', label: 'نمو (12-24 شهر)', minMonths: 12, maxMonths: 24, kgPerHeadPerDay: 1.2 },
  { key: 'adult_24_plus', label: 'بالغة (+24 شهر)', minMonths: 24, maxMonths: 999, kgPerHeadPerDay: 1.6 }
]

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  )
}

export default function FeedsPage() {
  const [tabValue, setTabValue] = useState(0)
  const [feedTypes, setFeedTypes] = useState<any[]>([])
  const [stocks, setStocks] = useState<any[]>([])
  const [schedules, setSchedules] = useState<any[]>([])
  const [pens, setPens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [typeDialogOpen, setTypeDialogOpen] = useState(false)
  const [stockDialogOpen, setStockDialogOpen] = useState(false)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<any>(null)
  const [selectedStock, setSelectedStock] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  
  // New features state
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [filterCategory, setFilterCategory] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const [typeData, setTypeData] = useState({
    nameAr: '',
    nameEn: '',
    category: 'HAY',
    protein: 0,
    energy: 0,
    fiber: 0,
    description: ''
  })

  const [stockData, setStockData] = useState({
    feedTypeId: '',
    quantity: 0,
    unit: 'كيس',
    unitPrice: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    supplier: '',
    notes: ''
  })

  const [scheduleData, setScheduleData] = useState({
    penId: '',
    feedTypeId: '',
    dailyAmount: 0,
    feedingTimes: '2',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    isActive: true,
    notes: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [typesRes, stocksRes, schedulesRes, pensRes] = await Promise.all([
        fetch('/api/feeds'),
        fetch('/api/feeds/stock'),
        fetch('/api/feeds/schedule'),
        fetch('/api/pens')
      ])

      if (!typesRes.ok) {
        const error = await typesRes.json().catch(() => ({ error: 'خطأ في جلب البيانات' }))
        console.error('Feeds fetch error:', error)
        alert(error.error || 'فشل في جلب الأعلاف')
        return
      }

      if (typesRes.ok) setFeedTypes(await typesRes.json())
      if (stocksRes.ok) setStocks(await stocksRes.json())
      if (schedulesRes.ok) setSchedules(await schedulesRes.json())
      if (pensRes.ok) setPens(await pensRes.json())
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScheduleDailyAmount = (schedule: any) => {
    return Number(schedule.dailyAmount ?? schedule.quantity ?? 0)
  }

  const getScheduleFeedingTimes = (schedule: any) => {
    return Number(schedule.feedingTimes ?? schedule.frequency ?? 0)
  }

  const getGoatAgeInMonths = (birthDate?: string | Date | null) => {
    if (!birthDate) return 0
    const birth = new Date(birthDate)
    const now = new Date()
    const diffMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
    return Math.max(0, diffMonths)
  }

  const selectedPen = pens.find(pen => pen.id === scheduleData.penId)
  const selectedPenGoats = (selectedPen?.goats || []).filter((goat: any) => goat.status ? goat.status === 'ACTIVE' : true)

  const smartRecommendation = SMART_FEED_GUIDE.map(group => {
    const goatsInGroup = selectedPenGoats.filter((goat: any) => {
      const ageMonths = getGoatAgeInMonths(goat.birthDate)
      return ageMonths >= group.minMonths && ageMonths < group.maxMonths
    })

    const count = goatsInGroup.length
    const dailyNeed = count * group.kgPerHeadPerDay

    return {
      ...group,
      count,
      dailyNeed
    }
  })

  const smartTotals = {
    heads: selectedPenGoats.length,
    dailyAmount: smartRecommendation.reduce((sum, item) => sum + item.dailyNeed, 0),
    monthlyAmount: smartRecommendation.reduce((sum, item) => sum + item.dailyNeed, 0) * 30
  }

  const recommendedPerHead = smartTotals.heads > 0 ? (smartTotals.dailyAmount / smartTotals.heads) : 0
  const scheduleVsSmartDiff = Number(scheduleData.dailyAmount) - recommendedPerHead

  const getSmartPerHeadForGoats = (goats: any[]) => {
    if (!goats || goats.length === 0) return 0
    const activeGoats = goats.filter((goat: any) => goat.status ? goat.status === 'ACTIVE' : true)
    if (activeGoats.length === 0) return 0

    const totalDaily = SMART_FEED_GUIDE.reduce((sum, group) => {
      const count = activeGoats.filter((goat: any) => {
        const ageMonths = getGoatAgeInMonths(goat.birthDate)
        return ageMonths >= group.minMonths && ageMonths < group.maxMonths
      }).length
      return sum + (count * group.kgPerHeadPerDay)
    }, 0)

    return totalDaily / activeGoats.length
  }

  const smartPerHeadByPen = pens.reduce((acc: Record<string, number>, pen: any) => {
    acc[pen.id] = getSmartPerHeadForGoats(pen.goats || [])
    return acc
  }, {})

  const activeSchedules = schedules.filter(schedule => schedule.isActive)
  const activeSchedulesByPen = activeSchedules.reduce((acc: Record<string, any[]>, schedule: any) => {
    const penId = schedule.penId || schedule.pen?.id
    if (!penId) return acc
    if (!acc[penId]) acc[penId] = []
    acc[penId].push(schedule)
    return acc
  }, {})

  const adjustedPerHeadByScheduleId = Object.values(activeSchedulesByPen).reduce((acc: Record<string, { perHead: number; mode: 'علمي' | 'يدوي' }>, penSchedules: any) => {
    const schedulesForPen = penSchedules as any[]
    const penId = schedulesForPen[0]?.penId || schedulesForPen[0]?.pen?.id
    const smartPerHead = Number(smartPerHeadByPen[penId] || 0)
    const scheduledPerHeadTotal = schedulesForPen.reduce((sum, schedule) => sum + getScheduleDailyAmount(schedule), 0)

    schedulesForPen.forEach(schedule => {
      let perHead = getScheduleDailyAmount(schedule)
      let mode: 'علمي' | 'يدوي' = 'يدوي'

      if (smartPerHead > 0 && scheduledPerHeadTotal > 0) {
        const scheduleShare = getScheduleDailyAmount(schedule) / scheduledPerHeadTotal
        perHead = smartPerHead * scheduleShare
        mode = 'علمي'
      } else if (smartPerHead > 0 && scheduledPerHeadTotal === 0) {
        perHead = smartPerHead / Math.max(1, schedulesForPen.length)
        mode = 'علمي'
      }

      acc[schedule.id] = { perHead, mode }
    })

    return acc
  }, {})

  const activeSchedulesWithContext = schedules
    .filter(schedule => schedule.isActive)
    .map(schedule => {
      const pen = schedule.pen || pens.find(p => p.id === schedule.penId)
      const headsCount = Number(schedule?.pen?._count?.goats ?? pen?._count?.goats ?? pen?.currentCount ?? 0)
      const calibrated = adjustedPerHeadByScheduleId[schedule.id]
      const perHeadDailyAmount = calibrated?.perHead ?? getScheduleDailyAmount(schedule)
      const dailyNeed = headsCount > 0 ? (perHeadDailyAmount * headsCount) : perHeadDailyAmount

      return {
        ...schedule,
        pen,
        headsCount,
        perHeadDailyAmount,
        dailyNeed,
        calculationMode: calibrated?.mode || 'يدوي'
      }
    })

  const stockByFeedType = stocks.reduce((acc: Record<string, number>, stock) => {
    if (!stock.feedTypeId) return acc
    acc[stock.feedTypeId] = (acc[stock.feedTypeId] || 0) + Number(stock.quantity || 0)
    return acc
  }, {})

  const monthlyPlanningMap = activeSchedulesWithContext.reduce((acc: Record<string, any>, schedule) => {
    const feedTypeId = schedule.feedTypeId
    if (!feedTypeId) return acc

    if (!acc[feedTypeId]) {
      acc[feedTypeId] = {
        feedTypeId,
        feedType: schedule.feedType,
        headsCount: 0,
        dailyNeed: 0,
        scientificCount: 0,
        manualCount: 0
      }
    }

    acc[feedTypeId].headsCount += schedule.headsCount
    acc[feedTypeId].dailyNeed += schedule.dailyNeed
    if (schedule.calculationMode === 'علمي') acc[feedTypeId].scientificCount += 1
    else acc[feedTypeId].manualCount += 1
    return acc
  }, {})

  const monthlyPlanning = Object.values(monthlyPlanningMap)
    .map((item: any) => {
      const availableStock = Number(stockByFeedType[item.feedTypeId] || 0)
      const monthlyNeed = item.dailyNeed * 30
      const monthlyNeedWithSafety = monthlyNeed * 1.1
      const recommendedPurchase = Math.max(0, monthlyNeedWithSafety - availableStock)
      const stockCoverageDays = item.dailyNeed > 0 ? (availableStock / item.dailyNeed) : 0

      return {
        ...item,
        availableStock,
        monthlyNeed,
        monthlyNeedWithSafety,
        recommendedPurchase,
        stockCoverageDays,
        deficit: Math.max(0, monthlyNeed - availableStock),
        surplus: Math.max(0, availableStock - monthlyNeed),
        calculationMode: item.scientificCount > 0 ? 'علمي' : 'يدوي'
      }
    })
    .sort((a: any, b: any) => b.recommendedPurchase - a.recommendedPurchase)

  const uniqueActivePenIds = Array.from(new Set(activeSchedulesWithContext.map(schedule => schedule.penId).filter(Boolean)))
  const totalHeadsInActivePens = uniqueActivePenIds.reduce((sum, penId) => {
    const firstScheduleForPen = activeSchedulesWithContext.find(schedule => schedule.penId === penId)
    return sum + Number(firstScheduleForPen?.headsCount || 0)
  }, 0)

  const monthlyPlanSummary = {
    activePens: uniqueActivePenIds.length,
    totalHeads: totalHeadsInActivePens,
    totalMonthlyNeed: monthlyPlanning.reduce((sum: number, item: any) => sum + item.monthlyNeed, 0),
    totalAvailableStock: monthlyPlanning.reduce((sum: number, item: any) => sum + item.availableStock, 0),
    totalRecommendedPurchase: monthlyPlanning.reduce((sum: number, item: any) => sum + item.recommendedPurchase, 0),
    criticalItems: monthlyPlanning.filter((item: any) => item.stockCoverageDays < 14 || item.recommendedPurchase > 0).length
  }

  // Calculate statistics
  const stats = {
    totalTypes: feedTypes.length,
    totalStockValue: stocks.reduce((sum, stock) => sum + (stock.quantity * (stock.cost || 0)), 0),
    totalStockQuantity: stocks.reduce((sum, stock) => sum + stock.quantity, 0),
    lowStockItems: stocks.filter(stock => stock.quantity < 10).length,
    expiringItems: stocks.filter(stock => {
      if (!stock.expiryDate) return false
      const days = Math.ceil((new Date(stock.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      return days <= 30 && days > 0
    }).length,
    expiredItems: stocks.filter(stock => {
      if (!stock.expiryDate) return false
      return new Date(stock.expiryDate) < new Date()
    }).length,
    activeSchedules: schedules.filter(s => s.isActive).length,
    dailyCost: schedules
      .filter(s => s.isActive)
      .reduce((sum, schedule) => {
        const feedType = feedTypes.find(f => f.id === schedule.feedTypeId)
        const stock = stocks.find(s => s.feedTypeId === schedule.feedTypeId)
        const unitPrice = stock?.cost || 0
        return sum + (schedule.dailyAmount * unitPrice)
      }, 0),
    monthlyCost: 0
  }
  stats.monthlyCost = stats.dailyCost * 30

  // Filter stocks
  const filteredStocks = stocks.filter(stock => {
    const matchesSearch = searchQuery === '' || 
      stock.feedType?.nameAr?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.supplier?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = filterCategory === 'ALL' || stock.feedType?.category === filterCategory
    
    let matchesStatus = true
    if (filterStatus === 'LOW_STOCK') matchesStatus = stock.quantity < 10
    else if (filterStatus === 'EXPIRING') {
      if (!stock.expiryDate) matchesStatus = false
      else {
        const days = Math.ceil((new Date(stock.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        matchesStatus = days <= 30 && days > 0
      }
    }
    else if (filterStatus === 'EXPIRED') {
      matchesStatus = stock.expiryDate && new Date(stock.expiryDate) < new Date()
    }
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF()
    
    // Add Arabic font support
    doc.text('تقرير إدارة الأعلاف', 105, 15, { align: 'center' })
    doc.setFontSize(10)
    doc.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-AE')}`, 105, 25, { align: 'center' })
    
    // Statistics section
    doc.setFontSize(12)
    doc.text('الإحصائيات', 14, 35)
    doc.setFontSize(10)
    let yPos = 45
    doc.text(`عدد أنواع الأعلاف: ${stats.totalTypes}`, 14, yPos)
    yPos += 7
    doc.text(`إجمالي قيمة المخزون: ${stats.totalStockValue.toFixed(2)} درهم`, 14, yPos)
    yPos += 7
    doc.text(`الأعلاف منخفضة المخزون: ${stats.lowStockItems}`, 14, yPos)
    yPos += 7
    doc.text(`التكلفة اليومية: ${stats.dailyCost.toFixed(2)} درهم`, 14, yPos)
    yPos += 7
    doc.text(`التكلفة الشهرية المتوقعة: ${stats.monthlyCost.toFixed(2)} درهم`, 14, yPos)
    
    // Stocks table
    yPos += 15
    doc.setFontSize(12)
    doc.text('المخزون', 14, yPos)
    
    const stocksData = filteredStocks.map(stock => [
      stock.feedType?.nameAr || '',
      `${stock.quantity} ${stock.unit}`,
      `${stock.cost || 0} AED`,
      `${(stock.quantity * (stock.cost || 0)).toFixed(2)} AED`,
      stock.supplier || '-',
      new Date(stock.purchaseDate).toLocaleDateString('ar-AE')
    ])
    
    ;(doc as any).autoTable({
      startY: yPos + 5,
      head: [['نوع العلف', 'الكمية', 'سعر الوحدة', 'القيمة الإجمالية', 'المورد', 'تاريخ الشراء']],
      body: stocksData,
      styles: { font: 'helvetica', fontSize: 9 }
    })
    
    doc.save(`feeds-report-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // Export to Excel
  const exportToExcel = () => {
    // Statistics sheet
    const statsData = [
      ['الإحصائية', 'القيمة'],
      ['عدد أنواع الأعلاف', stats.totalTypes],
      ['إجمالي قيمة المخزون', `${stats.totalStockValue.toFixed(2)} درهم`],
      ['كمية المخزون الإجمالية', stats.totalStockQuantity],
      ['الأعلاف منخفضة المخزون', stats.lowStockItems],
      ['الأعلاف القريبة من الانتهاء', stats.expiringItems],
      ['الأعلاف المنتهية', stats.expiredItems],
      ['عدد الجداول النشطة', stats.activeSchedules],
      ['التكلفة اليومية', `${stats.dailyCost.toFixed(2)} درهم`],
      ['التكلفة الشهرية المتوقعة', `${stats.monthlyCost.toFixed(2)} درهم`]
    ]
    
    // Stocks sheet
    const stocksData = [
      ['نوع العلف', 'الفئة', 'الكمية', 'الوحدة', 'سعر الوحدة', 'القيمة الإجمالية', 'المورد', 'تاريخ الشراء', 'تاريخ الانتهاء'],
      ...filteredStocks.map(stock => [
        stock.feedType?.nameAr || '',
        FEED_CATEGORIES.find(c => c.value === stock.feedType?.category)?.label || '',
        stock.quantity,
        stock.unit,
        stock.cost || 0,
        stock.quantity * (stock.cost || 0),
        stock.supplier || '',
        new Date(stock.purchaseDate).toLocaleDateString('ar-AE'),
        stock.expiryDate ? new Date(stock.expiryDate).toLocaleDateString('ar-AE') : ''
      ])
    ]
    
    // Schedules sheet
    const schedulesData = [
      ['الحظيرة', 'نوع العلف', 'الكمية اليومية (كجم)', 'عدد الوجبات', 'تاريخ البدء', 'الحالة'],
      ...schedules.map(schedule => [
        schedule.pen?.nameAr || '',
        schedule.feedType?.nameAr || '',
        getScheduleDailyAmount(schedule),
        getScheduleFeedingTimes(schedule),
        new Date(schedule.startDate).toLocaleDateString('ar-AE'),
        schedule.isActive ? 'نشط' : 'متوقف'
      ])
    ]
    
    const wb = XLSX.utils.book_new()
    const statsWs = XLSX.utils.aoa_to_sheet(statsData)
    const stocksWs = XLSX.utils.aoa_to_sheet(stocksData)
    const schedulesWs = XLSX.utils.aoa_to_sheet(schedulesData)
    
    XLSX.utils.book_append_sheet(wb, statsWs, 'الإحصائيات')
    XLSX.utils.book_append_sheet(wb, stocksWs, 'المخزون')
    XLSX.utils.book_append_sheet(wb, schedulesWs, 'جداول التغذية')
    
    XLSX.writeFile(wb, `feeds-report-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const handleSaveType = async () => {
    try {
      const url = selectedType ? `/api/feeds/${selectedType.id}` : '/api/feeds'
      const method = selectedType ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(typeData)
      })

      if (res.ok) {
        fetchData()
        setTypeDialogOpen(false)
        setSelectedType(null)
        setTypeData({
          nameAr: '',
          nameEn: '',
          category: 'HAY',
          protein: 0,
          energy: 0,
          fiber: 0,
          description: ''
        })
      } else {
        const data = await res.json().catch(() => ({}))
        console.error('Failed to save feed type:', data?.error || res.statusText)
        alert(data?.error || 'فشل في حفظ نوع العلف')
      }
    } catch (error) {
      console.error('Failed to save feed type:', error)
      alert('فشل في حفظ نوع العلف')
    }
  }

  const handleSaveStock = async () => {
    if (selectedStock) {
      await handleUpdateStock()
      return
    }
    
    try {
      const res = await fetch('/api/feeds/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stockData)
      })

      if (res.ok) {
        fetchData()
        setStockDialogOpen(false)
        setSelectedStock(null)
        setStockData({
          feedTypeId: '',
          quantity: 0,
          unit: 'كيس',
          unitPrice: 0,
          purchaseDate: new Date().toISOString().split('T')[0],
          expiryDate: '',
          supplier: '',
          notes: ''
        })
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data?.error || 'فشل في حفظ المخزون')
      }
    } catch (error) {
      console.error('Failed to add stock:', error)
      alert('فشل في حفظ المخزون')
    }
  }

  const handleEditStock = (stock: any) => {
    setSelectedStock(stock)
    setStockData({
      feedTypeId: stock.feedTypeId,
      quantity: stock.quantity,
      unit: stock.unit,
      unitPrice: stock.cost || 0,
      purchaseDate: new Date(stock.purchaseDate).toISOString().split('T')[0],
      expiryDate: stock.expiryDate ? new Date(stock.expiryDate).toISOString().split('T')[0] : '',
      supplier: stock.supplier || '',
      notes: stock.notes || ''
    })
    setStockDialogOpen(true)
  }

  const handleUpdateStock = async () => {
    if (!selectedStock) return
    
    try {
      const res = await fetch(`/api/feeds/stock/${selectedStock.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stockData)
      })

      if (res.ok) {
        fetchData()
        setStockDialogOpen(false)
        setSelectedStock(null)
        setStockData({
          feedTypeId: '',
          quantity: 0,
          unit: 'كيس',
          unitPrice: 0,
          purchaseDate: new Date().toISOString().split('T')[0],
          expiryDate: '',
          supplier: '',
          notes: ''
        })
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data?.error || 'فشل في تحديث المخزون')
      }
    } catch (error) {
      console.error('Failed to update stock:', error)
      alert('فشل في تحديث المخزون')
    }
  }

  const handleDeleteStock = async () => {
    if (!selectedStock) return
    
    try {
      const res = await fetch(`/api/feeds/stock/${selectedStock.id}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        fetchData()
        setDeleteDialogOpen(false)
        setSelectedStock(null)
      }
    } catch (error) {
      console.error('Failed to delete stock:', error)
    }
  }

  const handleSaveSchedule = async () => {
    try {
      const res = await fetch('/api/feeds/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...scheduleData,
          dailyAmount: Number(scheduleData.dailyAmount),
          feedingTimes: Number(scheduleData.feedingTimes)
        })
      })

      if (res.ok) {
        fetchData()
        setScheduleDialogOpen(false)
        setScheduleData({
          penId: '',
          feedTypeId: '',
          dailyAmount: 0,
          feedingTimes: '2',
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          isActive: true,
          notes: ''
        })
      }
    } catch (error) {
      console.error('Failed to add schedule:', error)
    }
  }

  const expiringStocks = stocks.filter(stock => {
    if (!stock.expiryDate) return false
    const daysUntilExpiry = Math.ceil((new Date(stock.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0
  })

  return (
    <Box>
      {/* Header with Export Buttons */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Typography variant="h4">إدارة الأعلاف</Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            color="error"
            startIcon={<PictureAsPdfIcon />}
            onClick={exportToPDF}
            size="small"
          >
            تصدير PDF
          </Button>
          <Button
            variant="outlined"
            color="success"
            startIcon={<DescriptionIcon />}
            onClick={exportToExcel}
            size="small"
          >
            تصدير Excel
          </Button>
        </Stack>
      </Stack>

      {/* Statistics Dashboard */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ p: 1, bgcolor: 'primary.light', borderRadius: 2 }}>
                  <GrassIcon color="primary" />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">{stats.totalTypes}</Typography>
                  <Typography variant="body2" color="text.secondary">أنواع الأعلاف</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ p: 1, bgcolor: 'success.light', borderRadius: 2 }}>
                  <AttachMoneyIcon color="success" />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="bold">{stats.totalStockValue.toFixed(0)}</Typography>
                  <Typography variant="body2" color="text.secondary">قيمة المخزون (درهم)</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ p: 1, bgcolor: 'warning.light', borderRadius: 2 }}>
                  <InventoryIcon color="warning" />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">{stats.lowStockItems}</Typography>
                  <Typography variant="body2" color="text.secondary">مخزون منخفض</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ p: 1, bgcolor: 'info.light', borderRadius: 2 }}>
                  <TrendingUpIcon color="info" />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="bold">{stats.dailyCost.toFixed(0)}</Typography>
                  <Typography variant="body2" color="text.secondary">التكلفة اليومية (درهم)</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Additional Statistics */}
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ p: 1, bgcolor: 'error.light', borderRadius: 2 }}>
                  <WarningIcon color="error" />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">{stats.expiringItems}</Typography>
                  <Typography variant="body2" color="text.secondary">قريبة من الانتهاء (30 يوم)</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ p: 1, bgcolor: 'secondary.light', borderRadius: 2 }}>
                  <ScheduleIcon color="secondary" />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">{stats.activeSchedules}</Typography>
                  <Typography variant="body2" color="text.secondary">جداول نشطة</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box sx={{ p: 1, bgcolor: 'primary.light', borderRadius: 2 }}>
                  <ShoppingCartIcon color="primary" />
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight="bold">{stats.monthlyCost.toFixed(0)}</Typography>
                  <Typography variant="body2" color="text.secondary">التكلفة الشهرية المتوقعة</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Smart Notifications */}
      {(stats.lowStockItems > 0 || stats.expiringItems > 0 || stats.expiredItems > 0) && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'rgba(255, 152, 0, 0.05)' }}>
          <Stack spacing={2}>
            <Typography variant="h6" color="warning.main" display="flex" alignItems="center" gap={1}>
              <WarningIcon /> تنبيهات هامة
            </Typography>
            
            {stats.lowStockItems > 0 && (
              <Alert severity="warning" icon={<TrendingDownIcon />}>
                لديك {stats.lowStockItems} نوع علف بمخزون منخفض (أقل من 10 وحدات). يُنصح بإعادة الطلب قريباً.
              </Alert>
            )}
            
            {stats.expiringItems > 0 && (
              <Alert severity="error" icon={<WarningIcon />}>
                تنبيه! هناك {stats.expiringItems} نوع علف سينتهي خلال 30 يوم. تحقق من المخزون لتجنب الهدر.
              </Alert>
            )}
            
            {stats.expiredItems > 0 && (
              <Alert severity="error">
                تحذير! لديك {stats.expiredItems} نوع علف منتهي الصلاحية. يجب التخلص منه فوراً.
              </Alert>
            )}
            
            {stats.dailyCost > 500 && (
              <Alert severity="info" icon={<InfoIcon />}>
                ملاحظة: تكلفة التغذية اليومية مرتفعة ({stats.dailyCost.toFixed(0)} درهم). راجع جداول التغذية لتحسين الكفاءة.
              </Alert>
            )}
          </Stack>
        </Paper>
      )}

      <Paper>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="أنواع الأعلاف" icon={<GrassIcon />} iconPosition="start" />
          <Tab label="المخزون" icon={<InventoryIcon />} iconPosition="start" />
          <Tab label="جداول التغذية" icon={<ScheduleIcon />} iconPosition="start" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setSelectedType(null)
                setTypeData({
                  nameAr: '',
                  nameEn: '',
                  category: 'HAY',
                  protein: 0,
                  energy: 0,
                  fiber: 0,
                  description: ''
                })
                setTypeDialogOpen(true)
              }}
            >
              إضافة نوع علف
            </Button>
          </Box>
          <Grid container spacing={2}>
            {feedTypes.map((type) => (
              <Grid item xs={12} md={6} lg={4} key={type.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h6">{type.nameAr}</Typography>
                      <Chip
                        label={FEED_CATEGORIES.find(c => c.value === type.category)?.label}
                        size="small"
                        color="primary"
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                      {type.nameEn}
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2">بروتين: {type.protein}%</Typography>
                      <Typography variant="body2">طاقة: {type.energy} kcal</Typography>
                      <Typography variant="body2">ألياف: {type.fiber}%</Typography>
                    </Box>
                    {type.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {type.description}
                      </Typography>
                    )}
                    <Box sx={{ mt: 2 }}>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedType(type)
                          setTypeData({
                            nameAr: type.nameAr,
                            nameEn: type.name || type.nameEn || '',
                            category: type.category,
                            protein: type.protein || 0,
                            energy: type.energy || 0,
                            fiber: 0,
                            description: type.notes || ''
                          })
                          setTypeDialogOpen(true)
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* Filters and Actions */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={3} justifyContent="space-between">
            <Stack direction="row" spacing={2} flex={1}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setSelectedStock(null)
                  setStockData({
                    feedTypeId: '',
                    quantity: 0,
                    unit: 'كيس',
                    unitPrice: 0,
                    purchaseDate: new Date().toISOString().split('T')[0],
                    expiryDate: '',
                    supplier: '',
                    notes: ''
                  })
                  setStockDialogOpen(true)
                }}
              >
                إضافة مخزون
              </Button>
              <Button
                variant="outlined"
                startIcon={viewMode === 'grid' ? <ViewListIcon /> : <GridViewIcon />}
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? 'عرض جدولي' : 'عرض شبكي'}
              </Button>
            </Stack>
          </Stack>
          
          {/* Advanced Filters */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                placeholder="بحث عن علف أو مورد..."
                size="small"
                fullWidth
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>الفئة</InputLabel>
                <Select
                  value={filterCategory}
                  label="الفئة"
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <MenuItem value="ALL">الكل</MenuItem>
                  {FEED_CATEGORIES.map(cat => (
                    <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>الحالة</InputLabel>
                <Select
                  value={filterStatus}
                  label="الحالة"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="ALL">الكل</MenuItem>
                  <MenuItem value="LOW_STOCK">مخزون منخفض</MenuItem>
                  <MenuItem value="EXPIRING">قريب من الانتهاء</MenuItem>
                  <MenuItem value="EXPIRED">منتهي</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </Paper>

          {/* Grid or Table View */}
          {viewMode === 'grid' ? (
             <Grid container spacing={3}>
              {filteredStocks.map((stock) => {
                const daysUntilExpiry = stock.expiryDate
                  ? Math.ceil((new Date(stock.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  : null
                const isLowStock = stock.quantity < 10
                const isExpiring = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0
                const isExpired = stock.expiryDate && new Date(stock.expiryDate) < new Date()
                const totalValue = stock.quantity * (stock.cost || 0)
                
                return (
                  <Grid item xs={12} sm={6} md={4} key={stock.id}>
                    <Card sx={{ 
                      height: '100%', 
                      border: isExpired ? '2px solid #f44336' : isExpiring ? '2px solid #ff9800' : 'none',
                      position: 'relative'
                    }}>
                      {(isLowStock || isExpiring || isExpired) && (
                        <Chip 
                          label={isExpired ? 'منتهي' : isExpiring ? 'قريب من الانتهاء' : 'مخزون منخفض'} 
                          color={isExpired ? 'error' : isExpiring ? 'warning' : 'default'}
                          size="small"
                          sx={{ position: 'absolute', top: 10, right: 10 }} 
                        />
                      )}
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {stock.feedType?.nameAr}
                        </Typography>
                        <Chip
                          label={FEED_CATEGORIES.find(c => c.value === stock.feedType?.category)?.label}
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ mb: 2 }}
                        />
                        
                        <Stack spacing={1.5}>
                          <Box>
                            <Typography variant="body2" color="text.secondary">الكمية المتوفرة</Typography>
                            <Typography variant="h5" color="primary.main">
                              {stock.quantity} {stock.unit}
                            </Typography>
                            {isLowStock && (
                              <LinearProgress 
                                variant="determinate" 
                                value={(stock.quantity / 10) * 100} 
                                color="warning"
                                sx={{ mt: 1, height: 6, borderRadius: 3 }}
                              />
                            )}
                          </Box>
                          
                          <Box>
                            <Typography variant="body2" color="text.secondary">القيمة الإجمالية</Typography>
                            <Typography variant="h6" color="success.main">
                              {totalValue.toFixed(2)} درهم
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ({stock.cost || 0} درهم / {stock.unit})
                            </Typography>
                          </Box>
                          
                          <Box>
                            <Typography variant="body2" color="text.secondary">تاريخ الشراء</Typography>
                            <Typography variant="body2">
                              {new Date(stock.purchaseDate).toLocaleDateString('ar-AE')}
                            </Typography>
                          </Box>
                          
                          {stock.expiryDate && (
                            <Box>
                              <Typography variant="body2" color="text.secondary">تاريخ الانتهاء</Typography>
                              <Typography variant="body2" color={isExpired ? 'error.main' : isExpiring ? 'warning.main' : 'inherit'}>
                                {new Date(stock.expiryDate).toLocaleDateString('ar-AE')}
                                {daysUntilExpiry !== null && daysUntilExpiry > 0 && (
                                  <Typography component="span" variant="caption" display="block">
                                    ({daysUntilExpiry} يوم متبقي)
                                  </Typography>
                                )}
                              </Typography>
                            </Box>
                          )}
                          
                          {stock.supplier && (
                            <Box>
                              <Typography variant="body2" color="text.secondary">المورد</Typography>
                              <Typography variant="body2">{stock.supplier}</Typography>
                            </Box>
                          )}
                        </Stack>
                      </CardContent>
                      <CardActions sx={{ justifyContent: 'flex-end', p: 2 }}>
                        <Tooltip title="تعديل">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleEditStock(stock)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelectedStock(stock)
                              setDeleteDialogOpen(true)
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </CardActions>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>نوع العلف</TableCell>
                    <TableCell>الفئة</TableCell>
                    <TableCell>الكمية</TableCell>
                    <TableCell>سعر الوحدة</TableCell>
                    <TableCell>القيمة الإجمالية</TableCell>
                    <TableCell>تاريخ الشراء</TableCell>
                    <TableCell>تاريخ الانتهاء</TableCell>
                    <TableCell>المورد</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell align="center">إجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredStocks.map((stock) => {
                    const daysUntilExpiry = stock.expiryDate
                      ? Math.ceil((new Date(stock.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                      : null
                    const isLowStock = stock.quantity < 10
                    const isExpiring = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0
                    const isExpired = stock.expiryDate && new Date(stock.expiryDate) < new Date()
                    
                    return (
                      <TableRow key={stock.id} sx={{ bgcolor: isExpired ? 'rgba(244, 67, 54, 0.05)' : 'inherit' }}>
                        <TableCell>{stock.feedType?.nameAr}</TableCell>
                        <TableCell>
                          <Chip
                            label={FEED_CATEGORIES.find(c => c.value === stock.feedType?.category)?.label}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color={isLowStock ? 'warning.main' : 'inherit'}>
                            {stock.quantity} {stock.unit}
                          </Typography>
                        </TableCell>
                        <TableCell>{stock.cost || 0} درهم</TableCell>
                        <TableCell sx={{ fontWeight: 'bold' }}>
                          {(stock.quantity * (stock.cost || 0)).toFixed(2)} درهم
                        </TableCell>
                        <TableCell>{new Date(stock.purchaseDate).toLocaleDateString('ar-AE')}</TableCell>
                        <TableCell>
                          {stock.expiryDate ? (
                            <Stack spacing={0.5}>
                              <Typography variant="body2" color={isExpired ? 'error' : isExpiring ? 'warning.main' : 'inherit'}>
                                {new Date(stock.expiryDate).toLocaleDateString('ar-AE')}
                              </Typography>
                              {daysUntilExpiry !== null && daysUntilExpiry > 0 && (
                                <Typography variant="caption" color={isExpiring ? 'warning.main' : 'text.secondary'}>
                                  {daysUntilExpiry} يوم متبقي
                                </Typography>
                              )}
                            </Stack>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{stock.supplier || '-'}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            {isExpired && <Chip label="منتهي" size="small" color="error" />}
                            {isExpiring && <Chip label="قريب" size="small" color="warning" />}
                            {isLowStock && <Chip label="منخفض" size="small" color="default" />}
                            {!isExpired && !isExpiring && !isLowStock && <Chip label="جيد" size="small" color="success" />}
                          </Stack>
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Tooltip title="تعديل">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleEditStock(stock)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="حذف">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => {
                                  setSelectedStock(stock)
                                  setDeleteDialogOpen(true)
                                }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">إجمالي الرؤوس (نشط)</Typography>
                  <Typography variant="h4" fontWeight="bold">{monthlyPlanSummary.totalHeads}</Typography>
                  <Typography variant="caption" color="text.secondary">{monthlyPlanSummary.activePens} حظيرة نشطة</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">الاحتياج الشهري</Typography>
                  <Typography variant="h5" fontWeight="bold">{monthlyPlanSummary.totalMonthlyNeed.toFixed(1)} كجم</Typography>
                  <Typography variant="caption" color="text.secondary">بناءً على عدد الرؤوس</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">المخزون المتاح</Typography>
                  <Typography variant="h5" fontWeight="bold">{monthlyPlanSummary.totalAvailableStock.toFixed(1)} كجم</Typography>
                  <Typography variant="caption" color="text.secondary">المتاح حاليًا</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="text.secondary">الشراء المقترح (10%)</Typography>
                  <Typography variant="h5" fontWeight="bold" color={monthlyPlanSummary.totalRecommendedPurchase > 0 ? 'warning.main' : 'success.main'}>
                    {monthlyPlanSummary.totalRecommendedPurchase.toFixed(1)} كجم
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{monthlyPlanSummary.criticalItems} عناصر حرجة</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" mb={2}>تحليل الاحتياج الشهري حسب نوع العلف</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>نوع العلف</TableCell>
                    <TableCell>نمط الحساب</TableCell>
                    <TableCell>عدد الرؤوس</TableCell>
                    <TableCell>احتياج يومي (كجم)</TableCell>
                    <TableCell>احتياج شهري (كجم)</TableCell>
                    <TableCell>المتاح (كجم)</TableCell>
                    <TableCell>يكفي (يوم)</TableCell>
                    <TableCell>شراء مقترح (كجم)</TableCell>
                    <TableCell>الحالة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {monthlyPlanning.map((plan: any) => {
                    const isCritical = plan.stockCoverageDays < 7
                    const isWarning = plan.stockCoverageDays >= 7 && plan.stockCoverageDays < 14

                    return (
                      <TableRow key={plan.feedTypeId}>
                        <TableCell>{plan.feedType?.nameAr || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={plan.calculationMode === 'علمي' ? 'info' : 'default'}
                            label={plan.calculationMode}
                          />
                        </TableCell>
                        <TableCell>{plan.headsCount}</TableCell>
                        <TableCell>{plan.dailyNeed.toFixed(2)}</TableCell>
                        <TableCell>{plan.monthlyNeed.toFixed(2)}</TableCell>
                        <TableCell>{plan.availableStock.toFixed(2)}</TableCell>
                        <TableCell>{plan.stockCoverageDays.toFixed(1)}</TableCell>
                        <TableCell sx={{ fontWeight: 'bold', color: plan.recommendedPurchase > 0 ? 'warning.main' : 'inherit' }}>
                          {plan.recommendedPurchase.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {isCritical ? (
                            <Chip size="small" color="error" label="حرج" />
                          ) : isWarning ? (
                            <Chip size="small" color="warning" label="منخفض" />
                          ) : (
                            <Chip size="small" color="success" label="جيد" />
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setScheduleDialogOpen(true)}
            >
              إضافة جدول تغذية
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>الحظيرة</TableCell>
                  <TableCell>نوع العلف</TableCell>
                  <TableCell>الكمية اليومية</TableCell>
                  <TableCell>عدد الوجبات</TableCell>
                  <TableCell>تاريخ البدء</TableCell>
                  <TableCell>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell>{schedule.pen?.nameAr}</TableCell>
                    <TableCell>{schedule.feedType?.nameAr}</TableCell>
                    <TableCell>{getScheduleDailyAmount(schedule)} كجم</TableCell>
                    <TableCell>{getScheduleFeedingTimes(schedule)} مرة</TableCell>
                    <TableCell>{new Date(schedule.startDate).toLocaleDateString('ar-AE')}</TableCell>
                    <TableCell>
                      <Chip
                        label={schedule.isActive ? 'نشط' : 'متوقف'}
                        color={schedule.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>

      {/* Feed Type Dialog */}
      <Dialog open={typeDialogOpen} onClose={() => {
        setTypeDialogOpen(false)
        setSelectedType(null)
      }} maxWidth="md" fullWidth>
        <DialogTitle>{selectedType ? 'تعديل نوع العلف' : 'إضافة نوع علف جديد'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="الاسم بالعربية"
                value={typeData.nameAr}
                onChange={(e) => setTypeData({ ...typeData, nameAr: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="الاسم بالإنجليزية"
                value={typeData.nameEn}
                onChange={(e) => setTypeData({ ...typeData, nameEn: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="الفئة"
                value={typeData.category}
                onChange={(e) => setTypeData({ ...typeData, category: e.target.value })}
              >
                {FEED_CATEGORIES.map(cat => (
                  <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="نسبة البروتين (%)"
                value={typeData.protein}
                onChange={(e) => setTypeData({ ...typeData, protein: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="الطاقة (kcal)"
                value={typeData.energy}
                onChange={(e) => setTypeData({ ...typeData, energy: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="نسبة الألياف (%)"
                value={typeData.fiber}
                onChange={(e) => setTypeData({ ...typeData, fiber: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="الوصف"
                value={typeData.description}
                onChange={(e) => setTypeData({ ...typeData, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setTypeDialogOpen(false)
            setSelectedType(null)
          }}>إلغاء</Button>
          <Button onClick={handleSaveType} variant="contained">حفظ</Button>
        </DialogActions>
      </Dialog>

      {/* Stock Dialog */}
      <Dialog open={stockDialogOpen} onClose={() => {
        setStockDialogOpen(false)
        setSelectedStock(null)
      }} maxWidth="md" fullWidth>
        <DialogTitle>{selectedStock ? 'تعديل المخزون' : 'إضافة مخزون علف'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="نوع العلف"
                value={stockData.feedTypeId}
                onChange={(e) => setStockData({ ...stockData, feedTypeId: e.target.value })}
              >
                {feedTypes.map(type => (
                  <MenuItem key={type.id} value={type.id}>{type.nameAr}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="الكمية "
                value={stockData.quantity}
                onChange={(e) => setStockData({ ...stockData, quantity: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="الوحدة"
                value={stockData.unit}
                onChange={(e) => setStockData({ ...stockData, unit: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="سعر الوحدة"
                value={stockData.unitPrice}
                onChange={(e) => setStockData({ ...stockData, unitPrice: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ الشراء"
                InputLabelProps={{ shrink: true }}
                value={stockData.purchaseDate}
                onChange={(e) => setStockData({ ...stockData, purchaseDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ الانتهاء"
                InputLabelProps={{ shrink: true }}
                value={stockData.expiryDate}
                onChange={(e) => setStockData({ ...stockData, expiryDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="المورد"
                value={stockData.supplier}
                onChange={(e) => setStockData({ ...stockData, supplier: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="ملاحظات"
                value={stockData.notes}
                onChange={(e) => setStockData({ ...stockData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setStockDialogOpen(false)
            setSelectedStock(null)
          }}>إلغاء</Button>
          <Button onClick={handleSaveStock} variant="contained">حفظ</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm">
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف هذا المخزون؟ لا يمكن التراجع عن هذا الإجراء.
          </Typography>
          {selectedStock && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight="bold">
                {selectedStock.feedType?.nameAr}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                الكمية: {selectedStock.quantity} {selectedStock.unit}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleDeleteStock} variant="contained" color="error">
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onClose={() => setScheduleDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>إضافة جدول تغذية</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="الحظيرة"
                value={scheduleData.penId}
                onChange={(e) => setScheduleData({ ...scheduleData, penId: e.target.value })}
              >
                {pens.map(pen => (
                  <MenuItem key={pen.id} value={pen.id}>{pen.nameAr}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="نوع العلف"
                value={scheduleData.feedTypeId}
                onChange={(e) => setScheduleData({ ...scheduleData, feedTypeId: e.target.value })}
              >
                {feedTypes.map(type => (
                  <MenuItem key={type.id} value={type.id}>{type.nameAr}</MenuItem>
                ))}
              </TextField>
            </Grid>
            {scheduleData.penId && (
              <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2} mb={2}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">المساعد الذكي للتغذية</Typography>
                      <Typography variant="body2" color="text.secondary">
                        مبني على أعمار الأغنام الموجودة فعليًا في الحظيرة
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setScheduleData({ ...scheduleData, dailyAmount: Number(recommendedPerHead.toFixed(2)) })}
                      disabled={smartTotals.heads === 0}
                    >
                      تطبيق الكمية المقترحة للرأس ({recommendedPerHead.toFixed(2)} كجم)
                    </Button>
                  </Stack>

                  {smartTotals.heads === 0 ? (
                    <Alert severity="warning">لا توجد أغنام نشطة في هذه الحظيرة لحساب توصية علمية.</Alert>
                  ) : (
                    <>
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mb={2}>
                        <Chip label={`عدد الرؤوس: ${smartTotals.heads}`} color="primary" />
                        <Chip label={`احتياج يومي للحظيرة: ${smartTotals.dailyAmount.toFixed(2)} كجم`} color="info" />
                        <Chip label={`احتياج شهري للحظيرة: ${smartTotals.monthlyAmount.toFixed(2)} كجم`} color="secondary" />
                      </Stack>

                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>فئة العمر</TableCell>
                              <TableCell>عدد الرؤوس</TableCell>
                              <TableCell>كجم/رأس/يوم</TableCell>
                              <TableCell>احتياج الفئة/يوم</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {smartRecommendation.map(item => (
                              <TableRow key={item.key}>
                                <TableCell>{item.label}</TableCell>
                                <TableCell>{item.count}</TableCell>
                                <TableCell>{item.kgPerHeadPerDay}</TableCell>
                                <TableCell>{item.dailyNeed.toFixed(2)} كجم</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <Alert severity={Math.abs(scheduleVsSmartDiff) > 0.4 ? 'warning' : 'success'} sx={{ mt: 2 }}>
                        الكمية الحالية بالرأس: {Number(scheduleData.dailyAmount).toFixed(2)} كجم — الموصى بها: {recommendedPerHead.toFixed(2)} كجم (الفرق: {scheduleVsSmartDiff.toFixed(2)} كجم)
                      </Alert>
                    </>
                  )}
                </Paper>
              </Grid>
            )}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="الكمية اليومية (كجم)"
                value={scheduleData.dailyAmount}
                onChange={(e) => setScheduleData({ ...scheduleData, dailyAmount: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="عدد الوجبات في اليوم"
                value={scheduleData.feedingTimes}
                onChange={(e) => setScheduleData({ ...scheduleData, feedingTimes: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ البدء"
                InputLabelProps={{ shrink: true }}
                value={scheduleData.startDate}
                onChange={(e) => setScheduleData({ ...scheduleData, startDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ الانتهاء"
                InputLabelProps={{ shrink: true }}
                value={scheduleData.endDate}
                onChange={(e) => setScheduleData({ ...scheduleData, endDate: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="ملاحظات"
                value={scheduleData.notes}
                onChange={(e) => setScheduleData({ ...scheduleData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleSaveSchedule} variant="contained">حفظ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
