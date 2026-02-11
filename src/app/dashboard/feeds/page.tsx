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
  Grid,
  Alert,
  Tabs,
  Tab,
  Card,
  CardContent
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import ScheduleIcon from '@mui/icons-material/Schedule'
import InventoryIcon from '@mui/icons-material/Inventory'
import WarningIcon from '@mui/icons-material/Warning'
import GrassIcon from '@mui/icons-material/Grass'

const FEED_CATEGORIES = [
  { value: 'HAY', label: 'تبن' },
  { value: 'GRAIN', label: 'حبوب' },
  { value: 'CONCENTRATE', label: 'مركزات' },
  { value: 'SUPPLEMENT', label: 'مكملات' }
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
        setTypeData({
          nameAr: '',
          nameEn: '',
          category: 'HAY',
          protein: 0,
          energy: 0,
          fiber: 0,
          description: ''
        })
      }
    } catch (error) {
      console.error('Failed to save feed type:', error)
    }
  }

  const handleSaveStock = async () => {
    try {
      const res = await fetch('/api/feeds/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stockData)
      })

      if (res.ok) {
        fetchData()
        setStockDialogOpen(false)
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
      }
    } catch (error) {
      console.error('Failed to add stock:', error)
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">إدارة الأعلاف</Typography>
      </Box>

      {expiringStocks.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }} icon={<WarningIcon />}>
          هناك {expiringStocks.length} نوع علف سينتهي خلال 30 يوم
        </Alert>
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
                          setTypeData(type)
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
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setStockDialogOpen(true)}
            >
              إضافة مخزون
            </Button>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>نوع العلف</TableCell>
                  <TableCell>الكمية</TableCell>
                  <TableCell>تاريخ الشراء</TableCell>
                  <TableCell>تاريخ الانتهاء</TableCell>
                  <TableCell>المورد</TableCell>
                  <TableCell>السعر</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stocks.map((stock) => {
                  const daysUntilExpiry = stock.expiryDate
                    ? Math.ceil((new Date(stock.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                    : null
                  return (
                    <TableRow key={stock.id}>
                      <TableCell>{stock.feedType?.nameAr}</TableCell>
                      <TableCell>{stock.quantity} {stock.unit}</TableCell>
                      <TableCell>{new Date(stock.purchaseDate).toLocaleDateString('ar-AE')}</TableCell>
                      <TableCell>
                        {stock.expiryDate ? (
                          <Box>
                            <Typography variant="body2">
                              {new Date(stock.expiryDate).toLocaleDateString('ar-AE')}
                            </Typography>
                            {daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
                              <Chip
                                label={`${daysUntilExpiry} يوم متبقي`}
                                size="small"
                                color="warning"
                              />
                            )}
                          </Box>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{stock.supplier || '-'}</TableCell>
                      <TableCell>{stock.unitPrice} درهم</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
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
                    <TableCell>{schedule.dailyAmount} كجم</TableCell>
                    <TableCell>{schedule.feedingTimes} مرة</TableCell>
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
      <Dialog open={typeDialogOpen} onClose={() => setTypeDialogOpen(false)} maxWidth="md" fullWidth>
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
          <Button onClick={() => setTypeDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleSaveType} variant="contained">حفظ</Button>
        </DialogActions>
      </Dialog>

      {/* Stock Dialog */}
      <Dialog open={stockDialogOpen} onClose={() => setStockDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>إضافة مخزون علف</DialogTitle>
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
          <Button onClick={() => setStockDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleSaveStock} variant="contained">حفظ</Button>
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
