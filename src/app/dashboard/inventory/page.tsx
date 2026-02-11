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
  Tab
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import WarningIcon from '@mui/icons-material/Warning'
import InventoryIcon from '@mui/icons-material/Inventory'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'

const CATEGORIES = [
  { value: 'MEDICINE', label: 'أدوية' },
  { value: 'VACCINE', label: 'لقاحات' },
  { value: 'EQUIPMENT', label: 'معدات' },
  { value: 'SUPPLIES', label: 'مستلزمات' }
]

const TRANSACTION_TYPES = [
  { value: 'PURCHASE', label: 'شراء' },
  { value: 'USAGE', label: 'استخدام' },
  { value: 'ADJUSTMENT', label: 'تعديل' },
  { value: 'EXPIRED', label: 'منتهي' },
  { value: 'RETURN', label: 'إرجاع' }
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

export default function InventoryPage() {
  const [tabValue, setTabValue] = useState(0)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<any>(null)
  const [formData, setFormData] = useState({
    nameAr: '',
    nameEn: '',
    category: 'SUPPLIES',
    unit: '',
    minStock: 0,
    currentStock: 0,
    unitPrice: 0,
    notes: ''
  })
  const [transactionData, setTransactionData] = useState({
    type: 'PURCHASE',
    quantity: 0,
    unitPrice: 0,
    reference: '',
    notes: ''
  })

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/inventory')
      if (res.ok) {
        const data = await res.json()
        setItems(data)
      }
    } catch (error) {
      console.error('Failed to fetch items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveItem = async () => {
    try {
      const url = selectedItem ? `/api/inventory/${selectedItem.id}` : '/api/inventory'
      const method = selectedItem ? 'PUT' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        fetchItems()
        handleCloseDialog()
      }
    } catch (error) {
      console.error('Failed to save item:', error)
    }
  }

  const handleAddTransaction = async () => {
    if (!selectedItem) return

    try {
      const res = await fetch(`/api/inventory/${selectedItem.id}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData)
      })

      if (res.ok) {
        fetchItems()
        setTransactionDialogOpen(false)
        setTransactionData({
          type: 'PURCHASE',
          quantity: 0,
          unitPrice: 0,
          reference: '',
          notes: ''
        })
      }
    } catch (error) {
      console.error('Failed to add transaction:', error)
    }
  }

  const handleOpenDialog = (item?: any) => {
    if (item) {
      setSelectedItem(item)
      setFormData({ ...item })
    } else {
      setSelectedItem(null)
      setFormData({
        nameAr: '',
        nameEn: '',
        category: 'SUPPLIES',
        unit: '',
        minStock: 0,
        currentStock: 0,
        unitPrice: 0,
        notes: ''
      })
    }
    setDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setDialogOpen(false)
    setSelectedItem(null)
  }

  const handleOpenTransactionDialog = (item: any) => {
    setSelectedItem(item)
    setTransactionDialogOpen(true)
  }

  const lowStockItems = items.filter(item => item.currentStock <= item.minStock)

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">إدارة المخزون</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          إضافة صنف جديد
        </Button>
      </Box>

      {lowStockItems.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }} icon={<WarningIcon />}>
          هناك {lowStockItems.length} صنف بحاجة لإعادة التزويد
        </Alert>
      )}

      <Paper>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="جميع الأصناف" />
          <Tab label="أدوية" />
          <Tab label="لقاحات" />
          <Tab label="معدات" />
          <Tab label="مستلزمات" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <InventoryTable
            items={items}
            onEdit={handleOpenDialog}
            onTransaction={handleOpenTransactionDialog}
          />
        </TabPanel>
        
        {CATEGORIES.map((cat, idx) => (
          <TabPanel key={cat.value} value={tabValue} index={idx + 1}>
            <InventoryTable
              items={items.filter(item => item.category === cat.value)}
              onEdit={handleOpenDialog}
              onTransaction={handleOpenTransactionDialog}
            />
          </TabPanel>
        ))}
      </Paper>

      {/* Add/Edit Item Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedItem ? 'تعديل الصنف' : 'إضافة صنف جديد'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="الاسم بالعربية"
                value={formData.nameAr}
                onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="الاسم بالإنجليزية"
                value={formData.nameEn}
                onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="الفئة"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {CATEGORIES.map(cat => (
                  <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="الوحدة"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="الحد الأدنى"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="الكمية الحالية"
                value={formData.currentStock}
                onChange={(e) => setFormData({ ...formData, currentStock: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="سعر الوحدة"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="ملاحظات"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button onClick={handleSaveItem} variant="contained">
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog open={transactionDialogOpen} onClose={() => setTransactionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تسجيل حركة مخزون - {selectedItem?.nameAr}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="نوع الحركة"
                value={transactionData.type}
                onChange={(e) => setTransactionData({ ...transactionData, type: e.target.value })}
              >
                {TRANSACTION_TYPES.map(type => (
                  <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="الكمية"
                value={transactionData.quantity}
                onChange={(e) => setTransactionData({ ...transactionData, quantity: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="سعر الوحدة"
                value={transactionData.unitPrice}
                onChange={(e) => setTransactionData({ ...transactionData, unitPrice: Number(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="المرجع / الفاتورة"
                value={transactionData.reference}
                onChange={(e) => setTransactionData({ ...transactionData, reference: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="ملاحظات"
                value={transactionData.notes}
                onChange={(e) => setTransactionData({ ...transactionData, notes: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransactionDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleAddTransaction} variant="contained">
            تسجيل
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function InventoryTable({ items, onEdit, onTransaction }: any) {
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>الصنف</TableCell>
            <TableCell>الفئة</TableCell>
            <TableCell>الكمية</TableCell>
            <TableCell>الحد الأدنى</TableCell>
            <TableCell>الحالة</TableCell>
            <TableCell>سعر الوحدة</TableCell>
            <TableCell align="left">الإجراءات</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item: any) => (
            <TableRow key={item.id}>
              <TableCell>
                <Typography variant="body1">{item.nameAr}</Typography>
                <Typography variant="caption" color="text.secondary">{item.nameEn}</Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={CATEGORIES.find(c => c.value === item.category)?.label}
                  size="small"
                  color={
                    item.category === 'MEDICINE' ? 'error' :
                    item.category === 'VACCINE' ? 'warning' :
                    item.category === 'EQUIPMENT' ? 'info' : 'default'
                  }
                />
              </TableCell>
              <TableCell>
                <Typography variant="body1" fontWeight="bold">
                  {item.currentStock} {item.unit}
                </Typography>
              </TableCell>
              <TableCell>{item.minStock} {item.unit}</TableCell>
              <TableCell>
                {item.currentStock <= item.minStock ? (
                  <Chip
                    icon={<WarningIcon />}
                    label="نقص مخزون"
                    color="error"
                    size="small"
                  />
                ) : (
                  <Chip label="جيد" color="success" size="small" />
                )}
              </TableCell>
              <TableCell>{item.unitPrice || 0} درهم</TableCell>
              <TableCell align="left">
                <IconButton onClick={() => onTransaction(item)} color="primary" size="small">
                  <SwapHorizIcon />
                </IconButton>
                <IconButton onClick={() => onEdit(item)} size="small">
                  <EditIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
