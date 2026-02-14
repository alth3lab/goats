'use client'

import { useEffect, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Switch,
  FormControlLabel
} from '@mui/material'
import { Settings as SettingsIcon, Save as SaveIcon } from '@mui/icons-material'

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
    alertBreedingOverdueDays: 150
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings({
        farmName: data.farmName || '',
        phone: data.phone || '',
        address: data.address || '',
        currency: data.currency || 'درهم',
        notifications: Boolean(data.notifications),
        alertPenCapacityPercent: data.alertPenCapacityPercent ?? 90,
        alertDeathCount: data.alertDeathCount ?? 3,
        alertDeathWindowDays: data.alertDeathWindowDays ?? 30,
        alertBreedingOverdueDays: data.alertBreedingOverdueDays ?? 150
      }))
      .catch(() => undefined)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ width: '100%', overflowX: 'hidden' }}>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <SettingsIcon color="primary" />
          <Typography variant="h4" fontWeight="bold">الإعدادات</Typography>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 3
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
          <Box>
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
          <Box>
            <TextField
              label="سعة الحظيرة (نسبة تنبيه)"
              type="number"
              value={settings.alertPenCapacityPercent}
              onChange={(e) => setSettings({ ...settings, alertPenCapacityPercent: Number(e.target.value) })}
              fullWidth
            />
          </Box>
          <Box>
            <TextField
              label="حد النفوق المتكرر"
              type="number"
              value={settings.alertDeathCount}
              onChange={(e) => setSettings({ ...settings, alertDeathCount: Number(e.target.value) })}
              fullWidth
            />
          </Box>
          <Box>
            <TextField
              label="فترة النفوق (يوم)"
              type="number"
              value={settings.alertDeathWindowDays}
              onChange={(e) => setSettings({ ...settings, alertDeathWindowDays: Number(e.target.value) })}
              fullWidth
            />
          </Box>
          <Box>
            <TextField
              label="تأخر التلقيح (يوم)"
              type="number"
              value={settings.alertBreedingOverdueDays}
              onChange={(e) => setSettings({ ...settings, alertBreedingOverdueDays: Number(e.target.value) })}
              fullWidth
            />
          </Box>
        </Box>

        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="flex-end" mt={3}>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving} sx={{ width: { xs: '100%', md: 'auto' } }}>
            {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}
