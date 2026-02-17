'use client'

import { useEffect, useState, useRef } from 'react'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material'
import {
  Settings as SettingsIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Warning as WarningIcon,
} from '@mui/icons-material'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    farmName: '',
    phone: '',
    address: '',
    currency: 'درهم',
    notifications: true,
    alertPenCapacityPercent: 90,
    alertDeathCount: 3,
    alertDeathWindowDays: 30,
    alertBreedingOverdueDays: 150,
  })
  const [saving, setSaving] = useState(false)
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })
  const [backupLoading, setBackupLoading] = useState(false)
  const [restoreLoading, setRestoreLoading] = useState(false)
  const [restoreConfirm, setRestoreConfirm] = useState(false)
  const [restoreFile, setRestoreFile] = useState<File | null>(null)
  const [restoreStats, setRestoreStats] = useState<Record<string, number> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) =>
        setSettings({
          farmName: data.farmName || '',
          phone: data.phone || '',
          address: data.address || '',
          currency: data.currency || 'درهم',
          notifications: Boolean(data.notifications),
          alertPenCapacityPercent: data.alertPenCapacityPercent ?? 90,
          alertDeathCount: data.alertDeathCount ?? 3,
          alertDeathWindowDays: data.alertDeathWindowDays ?? 30,
          alertBreedingOverdueDays: data.alertBreedingOverdueDays ?? 150,
        })
      )
      .catch(() => undefined)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const resp = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!resp.ok) throw new Error()
      setSnackbar({ open: true, message: 'تم حفظ الإعدادات بنجاح', severity: 'success' })
    } catch {
      setSnackbar({ open: true, message: 'فشل في حفظ الإعدادات', severity: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleBackup = async () => {
    setBackupLoading(true)
    try {
      const resp = await fetch('/api/settings/backup')
      if (!resp.ok) throw new Error()
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `goats-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setSnackbar({ open: true, message: 'تم تحميل النسخة الاحتياطية بنجاح', severity: 'success' })
    } catch {
      setSnackbar({ open: true, message: 'فشل في إنشاء النسخة الاحتياطية', severity: 'error' })
    } finally {
      setBackupLoading(false)
    }
  }

  const handleRestoreClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    try {
      const text = await file.text()
      const backup = JSON.parse(text)
      if (!backup.version || !backup.data) {
        setSnackbar({ open: true, message: 'ملف النسخة الاحتياطية غير صالح', severity: 'error' })
        return
      }
      setRestoreFile(file)
      setRestoreStats(backup.stats || null)
      setRestoreConfirm(true)
    } catch {
      setSnackbar({ open: true, message: 'خطأ في قراءة الملف - تأكد أنه ملف JSON صالح', severity: 'error' })
    }
  }

  const handleRestoreConfirm = async () => {
    if (!restoreFile) return
    setRestoreConfirm(false)
    setRestoreLoading(true)
    try {
      const text = await restoreFile.text()
      const resp = await fetch('/api/settings/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: text,
      })
      const result = await resp.json()
      if (!resp.ok) throw new Error(result.error || 'فشل في الاستعادة')
      setSnackbar({ open: true, message: 'تمت استعادة النسخة الاحتياطية بنجاح', severity: 'success' })
      // Reload settings
      const settingsResp = await fetch('/api/settings')
      if (settingsResp.ok) {
        const data = await settingsResp.json()
        setSettings({
          farmName: data.farmName || '',
          phone: data.phone || '',
          address: data.address || '',
          currency: data.currency || 'درهم',
          notifications: Boolean(data.notifications),
          alertPenCapacityPercent: data.alertPenCapacityPercent ?? 90,
          alertDeathCount: data.alertDeathCount ?? 3,
          alertDeathWindowDays: data.alertDeathWindowDays ?? 30,
          alertBreedingOverdueDays: data.alertBreedingOverdueDays ?? 150,
        })
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : 'فشل في استعادة النسخة الاحتياطية',
        severity: 'error',
      })
    } finally {
      setRestoreLoading(false)
      setRestoreFile(null)
      setRestoreStats(null)
    }
  }

  const statLabels: Record<string, string> = {
    goatTypes: 'أنواع الحيوانات',
    breeds: 'السلالات',
    pens: 'الحظائر',
    goats: 'الحيوانات',
    healthRecords: 'السجلات الصحية',
    vaccinationProtocols: 'بروتوكولات التطعيم',
    breedings: 'التلقيحات',
    births: 'الولادات',
    feedingRecords: 'سجلات التغذية',
    sales: 'المبيعات',
    payments: 'الدفعات',
    expenses: 'المصروفات',
    inventoryItems: 'عناصر المخزون',
    inventoryTransactions: 'حركات المخزون',
    feedTypes: 'أنواع الأعلاف',
    feedStocks: 'مخزون الأعلاف',
    feedingSchedules: 'جداول التغذية',
    dailyFeedConsumptions: 'استهلاك الأعلاف اليومي',
    calendarEvents: 'أحداث التقويم',
    appSettings: 'الإعدادات',
  }

  return (
    <Box sx={{ width: '100%', overflowX: 'hidden' }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <SettingsIcon color="primary" />
          <Typography variant="h4" fontWeight="bold">
            الإعدادات
          </Typography>
        </Stack>
      </Paper>

      {/* Section 1: Farm Info */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          معلومات المزرعة
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 3,
          }}
        >
          <Box>
            <TextField
              label="اسم المزرعة"
              value={settings.farmName}
              onChange={(e) => setSettings({ ...settings, farmName: e.target.value })}
              fullWidth
            />
          </Box>
          <Box>
            <TextField
              label="الهاتف"
              value={settings.phone}
              onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              fullWidth
            />
          </Box>
          <Box sx={{ gridColumn: { xs: '1 / -1', md: '1 / -1' } }}>
            <TextField
              label="العنوان"
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              fullWidth
            />
          </Box>
          <Box>
            <TextField
              label="العملة"
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              fullWidth
            />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifications}
                  onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                />
              }
              label="تفعيل الإشعارات"
            />
          </Box>
        </Box>
      </Paper>

      {/* Section 2: Alert Settings */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          إعدادات التنبيهات
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 3,
          }}
        >
          <Box>
            <TextField
              label="سعة الحظيرة (نسبة تنبيه %)"
              type="number"
              value={settings.alertPenCapacityPercent}
              onChange={(e) => setSettings({ ...settings, alertPenCapacityPercent: Number(e.target.value) })}
              fullWidth
              slotProps={{ htmlInput: { min: 50, max: 100 } }}
            />
          </Box>
          <Box>
            <TextField
              label="حد النفوق المتكرر"
              type="number"
              value={settings.alertDeathCount}
              onChange={(e) => setSettings({ ...settings, alertDeathCount: Number(e.target.value) })}
              fullWidth
              slotProps={{ htmlInput: { min: 1 } }}
            />
          </Box>
          <Box>
            <TextField
              label="فترة النفوق (يوم)"
              type="number"
              value={settings.alertDeathWindowDays}
              onChange={(e) => setSettings({ ...settings, alertDeathWindowDays: Number(e.target.value) })}
              fullWidth
              slotProps={{ htmlInput: { min: 1 } }}
            />
          </Box>
          <Box>
            <TextField
              label="تأخر التلقيح (يوم)"
              type="number"
              value={settings.alertBreedingOverdueDays}
              onChange={(e) => setSettings({ ...settings, alertBreedingOverdueDays: Number(e.target.value) })}
              fullWidth
              slotProps={{ htmlInput: { min: 30 } }}
            />
          </Box>
        </Box>

        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="flex-end" mt={3}>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
            sx={{ width: { xs: '100%', md: 'auto' } }}
          >
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </Button>
        </Stack>
      </Paper>

      {/* Section 3: Backup & Restore */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          النسخ الاحتياطي والاستعادة
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Alert severity="info" sx={{ mb: 3 }}>
          يمكنك تصدير جميع بيانات المزرعة كملف JSON واستعادتها لاحقاً. يشمل النسخ الاحتياطي: الحيوانات،
          السجلات الصحية، التلقيحات، المبيعات، المصروفات، المخزون، الأعلاف، التقويم، والإعدادات.
        </Alert>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Button
            variant="contained"
            color="primary"
            startIcon={backupLoading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
            onClick={handleBackup}
            disabled={backupLoading || restoreLoading}
            sx={{ width: { xs: '100%', md: 'auto' } }}
          >
            {backupLoading ? 'جاري التصدير...' : 'تصدير نسخة احتياطية'}
          </Button>

          <Button
            variant="outlined"
            color="warning"
            startIcon={restoreLoading ? <CircularProgress size={20} color="inherit" /> : <UploadIcon />}
            onClick={handleRestoreClick}
            disabled={backupLoading || restoreLoading}
            sx={{ width: { xs: '100%', md: 'auto' } }}
          >
            {restoreLoading ? 'جاري الاستعادة...' : 'استعادة من نسخة احتياطية'}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </Stack>
      </Paper>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreConfirm} onClose={() => setRestoreConfirm(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          تأكيد الاستعادة
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            <strong>تحذير:</strong> ستؤدي الاستعادة إلى حذف جميع البيانات الحالية واستبدالها بالبيانات من النسخة
            الاحتياطية. هذه العملية لا يمكن التراجع عنها.
          </DialogContentText>
          {restoreStats && (
            <Box sx={{ bgcolor: 'action.hover', borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                محتويات النسخة الاحتياطية:
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 0.5,
                }}
              >
                {Object.entries(restoreStats)
                  .filter(([, count]) => count > 0)
                  .map(([key, count]) => (
                    <Typography key={key} variant="body2">
                      {statLabels[key] || key}: <strong>{count}</strong>
                    </Typography>
                  ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreConfirm(false)}>إلغاء</Button>
          <Button onClick={handleRestoreConfirm} color="warning" variant="contained">
            تأكيد الاستعادة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
