'use client'

import { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Chip,
  IconButton,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Alert,
  Snackbar
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import BabyIcon from '@mui/icons-material/ChildCare'
import VaccinesIcon from '@mui/icons-material/Vaccines'
import MedicalIcon from '@mui/icons-material/MedicalServices'
import FavoriteIcon from '@mui/icons-material/Favorite'
import CakeIcon from '@mui/icons-material/Cake'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import SyncIcon from '@mui/icons-material/Sync'
import PetsIcon from '@mui/icons-material/Pets'

const EVENT_TYPES = [
  { value: 'BIRTH', label: 'ولادة', icon: BabyIcon, color: 'success.main' },
  { value: 'VACCINATION', label: 'تطعيم', icon: VaccinesIcon, color: 'warning.main' },
  { value: 'DEWORMING', label: 'تقليل الديدان', icon: PetsIcon, color: 'info.main' },
  { value: 'CHECKUP', label: 'فحص', icon: MedicalIcon, color: 'primary.main' },
  { value: 'BREEDING', label: 'تزاوج', icon: FavoriteIcon, color: 'secondary.main' },
  { value: 'WEANING', label: 'فطام', icon: CakeIcon, color: 'secondary.dark' },
  { value: 'SALE', label: 'بيع', icon: ShoppingCartIcon, color: 'error.main' }
]

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<any[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })
  const [eventData, setEventData] = useState({
    eventType: 'CHECKUP',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    goatId: '',
    penId: '',
    reminder: false,
    isCompleted: false,
    notes: ''
  })

  useEffect(() => {
    fetchEvents()
  }, [currentDate])

  const fetchEvents = async () => {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      const res = await fetch(
        `/api/calendar?start=${startOfMonth.toISOString()}&end=${endOfMonth.toISOString()}`
      )

      if (res.ok) {
        const data = await res.json()
        setEvents(data)
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
    }
  }

  const handleSaveEvent = async () => {
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      })

      if (res.ok) {
        fetchEvents()
        setDialogOpen(false)
        setEventData({
          eventType: 'CHECKUP',
          title: '',
          description: '',
          date: new Date().toISOString().split('T')[0],
          time: '',
          goatId: '',
          penId: '',
          reminder: false,
          isCompleted: false,
          notes: ''
        })
      }
    } catch (error) {
      console.error('Failed to save event:', error)
    }
  }

  const handleToggleComplete = async (event: any) => {
    try {
      const res = await fetch(`/api/calendar/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...event, isCompleted: !event.isCompleted })
      })

      if (res.ok) {
        fetchEvents()
      }
    } catch (error) {
      console.error('Failed to update event:', error)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/calendar/sync', {
        method: 'POST'
      })

      if (res.ok) {
        const data = await res.json()
        setSnackbar({
          open: true,
          message: data.message || `تم إنشاء ${data.created} حدث بنجاح`,
          severity: 'success'
        })
        fetchEvents()
      } else {
        const error = await res.json()
        setSnackbar({
          open: true,
          message: error.error || 'فشل في المزامنة',
          severity: 'error'
        })
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'فشل في الاتصال بالخادم',
        severity: 'error'
      })
    } finally {
      setSyncing(false)
    }
  }

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }

    return days
  }

  const getEventsForDate = (date: Date | null) => {
    if (!date) return []
    return events.filter(event => {
      const eventDate = new Date(event.date)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      )
    })
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const today = new Date()
  const upcomingEvents = events.filter(event => {
    const eventDate = new Date(event.date)
    return eventDate >= today && !event.isCompleted
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">التقويم</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<SyncIcon />}
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? 'جارٍ المزامنة...' : 'مزامنة الأحداث'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setSelectedDate(null)
              setDialogOpen(true)
            }}
          >
            إضافة حدث
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <IconButton onClick={previousMonth}>
                <ChevronRightIcon />
              </IconButton>
              <Typography variant="h5">
                {currentDate.toLocaleDateString('ar-AE', { month: 'long', year: 'numeric' })}
              </Typography>
              <IconButton onClick={nextMonth}>
                <ChevronLeftIcon />
              </IconButton>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 1
              }}
            >
              {['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map(day => (
                <Box
                  key={day}
                  sx={{
                    p: 1,
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: 'text.secondary'
                  }}
                >
                  {day}
                </Box>
              ))}

              {getDaysInMonth().map((date, index) => {
                const dayEvents = getEventsForDate(date)
                const isToday = date && 
                  date.getDate() === today.getDate() &&
                  date.getMonth() === today.getMonth() &&
                  date.getFullYear() === today.getFullYear()

                return (
                  <Box
                    key={index}
                    sx={{
                      minHeight: 100,
                      p: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      bgcolor: date ? (isToday ? 'primary.light' : 'background.paper') : 'action.hover',
                      cursor: date ? 'pointer' : 'default',
                      '&:hover': date ? { bgcolor: 'action.hover' } : {}
                    }}
                    onClick={() => {
                      if (date) {
                        setSelectedDate(date)
                        setEventData({ ...eventData, date: date.toISOString().split('T')[0] })
                        setDialogOpen(true)
                      }
                    }}
                  >
                    {date && (
                      <>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: isToday ? 'bold' : 'normal',
                            color: isToday ? 'primary.contrastText' : 'text.primary'
                          }}
                        >
                          {date.getDate()}
                        </Typography>
                        <Box sx={{ mt: 0.5 }}>
                          {dayEvents.slice(0, 3).map((event, i) => {
                            const eventType = EVENT_TYPES.find(t => t.value === event.eventType)
                            return (
                              <Chip
                                key={i}
                                label={event.title}
                                size="small"
                                sx={{
                                  fontSize: '0.7rem',
                                  height: 20,
                                  mb: 0.5,
                                  width: '100%',
                                  bgcolor: eventType?.color,
                                  color: 'white',
                                  '& .MuiChip-label': {
                                    px: 0.5
                                  }
                                }}
                              />
                            )
                          })}
                          {dayEvents.length > 3 && (
                            <Typography variant="caption" color="text.secondary">
                              +{dayEvents.length - 3} أكثر
                            </Typography>
                          )}
                        </Box>
                      </>
                    )}
                  </Box>
                )
              })}
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              الأحداث القادمة
            </Typography>
            {upcomingEvents.length === 0 ? (
              <Alert severity="info">لا توجد أحداث قادمة</Alert>
            ) : (
              <List>
                {upcomingEvents.slice(0, 10).map((event) => {
                  const eventType = EVENT_TYPES.find(t => t.value === event.eventType)
                  const Icon = eventType?.icon || CheckCircleIcon
                  return (
                    <ListItem
                      key={event.id}
                      sx={{
                        borderLeft: 3,
                        borderColor: eventType?.color,
                        mb: 1,
                        bgcolor: 'background.default'
                      }}
                    >
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={event.isCompleted}
                          onChange={() => handleToggleComplete(event)}
                        />
                      </ListItemIcon>
                      <ListItemIcon>
                        <Icon sx={{ color: eventType?.color }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={event.title}
                        secondary={
                          <>
                            {new Date(event.date).toLocaleDateString('ar-AE')}
                            {event.time && ` - ${event.time}`}
                          </>
                        }
                      />
                    </ListItem>
                  )
                })}
              </List>
            )}
          </Paper>

          <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              أنواع الأحداث
            </Typography>
            <List>
              {EVENT_TYPES.map((type) => {
                const Icon = type.icon
                const count = events.filter(e => e.eventType === type.value).length
                return (
                  <ListItem key={type.value}>
                    <ListItemIcon>
                      <Icon sx={{ color: type.color }} />
                    </ListItemIcon>
                    <ListItemText primary={type.label} />
                    <Chip label={count} size="small" />
                  </ListItem>
                )
              })}
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* Event Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>إضافة حدث جديد</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="نوع الحدث"
                value={eventData.eventType}
                onChange={(e) => setEventData({ ...eventData, eventType: e.target.value })}
              >
                {EVENT_TYPES.map(type => (
                  <MenuItem key={type.value} value={type.value}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <type.icon sx={{ color: type.color }} />
                      {type.label}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="العنوان"
                value={eventData.title}
                onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="date"
                label="التاريخ"
                InputLabelProps={{ shrink: true }}
                value={eventData.date}
                onChange={(e) => setEventData({ ...eventData, date: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="time"
                label="الوقت"
                InputLabelProps={{ shrink: true }}
                value={eventData.time}
                onChange={(e) => setEventData({ ...eventData, time: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="الوصف"
                value={eventData.description}
                onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="ملاحظات"
                value={eventData.notes}
                onChange={(e) => setEventData({ ...eventData, notes: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={eventData.reminder}
                  onChange={(e) => setEventData({ ...eventData, reminder: e.target.checked })}
                />
                <Typography>تفعيل التذكير</Typography>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleSaveEvent} variant="contained">
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
