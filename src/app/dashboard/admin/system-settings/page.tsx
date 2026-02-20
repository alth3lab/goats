'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Box, Paper, Typography, Stack, Switch, TextField, Button,
  LinearProgress, Divider, Alert, IconButton, FormControlLabel,
} from '@mui/material'
import SettingsIcon from '@mui/icons-material/Settings'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveIcon from '@mui/icons-material/Save'
import { useAuth } from '@/lib/useAuth'
import { useRouter } from 'next/navigation'

interface Settings {
  registration_enabled: string
  maintenance_mode: string
  maintenance_message: string
  trial_days: string
  max_free_goats: string
  max_free_farms: string
  max_free_users: string
  platform_name: string
  platform_name_en: string
}

export default function SystemSettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/system-settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      const res = await fetch('/api/admin/system-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        const data = await res.json()
        setError(data.error || 'حدث خطأ أثناء الحفظ')
      }
    } catch {
      setError('خطأ في الاتصال')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!authLoading && user?.role !== 'SUPER_ADMIN') {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  if (authLoading || loading) return <LinearProgress />
  if (user?.role !== 'SUPER_ADMIN' || !settings) return null

  const update = (key: keyof Settings, value: string) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : prev)
  }

  return (
    <Box sx={{ width: '100%', maxWidth: 800 }}>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <IconButton onClick={() => router.push('/dashboard/admin')}>
            <ArrowBackIcon />
          </IconButton>
          <SettingsIcon color="primary" sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold">إعدادات النظام العامة</Typography>
            <Typography variant="body2" color="text.secondary">
              إعدادات على مستوى المنصة بالكامل
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>تم حفظ الإعدادات بنجاح</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* Platform Info */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>معلومات المنصة</Typography>
        <Stack spacing={2}>
          <TextField
            label="اسم المنصة (عربي)"
            fullWidth
            size="small"
            value={settings.platform_name}
            onChange={(e) => update('platform_name', e.target.value)}
          />
          <TextField
            label="اسم المنصة (إنجليزي)"
            fullWidth
            size="small"
            value={settings.platform_name_en}
            onChange={(e) => update('platform_name_en', e.target.value)}
          />
        </Stack>
      </Paper>

      {/* Registration & Maintenance */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>التسجيل والصيانة</Typography>
        <Stack spacing={2}>
          <FormControlLabel
            control={
              <Switch
                checked={settings.registration_enabled === 'true'}
                onChange={(e) => update('registration_enabled', e.target.checked ? 'true' : 'false')}
                color="primary"
              />
            }
            label="السماح بالتسجيل الجديد"
          />
          <Divider />
          <FormControlLabel
            control={
              <Switch
                checked={settings.maintenance_mode === 'true'}
                onChange={(e) => update('maintenance_mode', e.target.checked ? 'true' : 'false')}
                color="warning"
              />
            }
            label="وضع الصيانة"
          />
          {settings.maintenance_mode === 'true' && (
            <TextField
              label="رسالة الصيانة"
              fullWidth
              size="small"
              multiline
              rows={2}
              value={settings.maintenance_message}
              onChange={(e) => update('maintenance_message', e.target.value)}
            />
          )}
        </Stack>
      </Paper>

      {/* Free Plan Limits */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>حدود الخطة المجانية الافتراضية</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          هذه الحدود تنطبق على المستأجرين الجدد. يمكن تعديلها لكل مستأجر على حدة
        </Typography>
        <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
          <TextField
            label="فترة التجربة (أيام)"
            type="number"
            size="small"
            fullWidth
            value={settings.trial_days}
            onChange={(e) => update('trial_days', e.target.value)}
          />
          <TextField
            label="حد الحيوانات"
            type="number"
            size="small"
            fullWidth
            value={settings.max_free_goats}
            onChange={(e) => update('max_free_goats', e.target.value)}
          />
          <TextField
            label="حد المزارع"
            type="number"
            size="small"
            fullWidth
            value={settings.max_free_farms}
            onChange={(e) => update('max_free_farms', e.target.value)}
          />
          <TextField
            label="حد المستخدمين"
            type="number"
            size="small"
            fullWidth
            value={settings.max_free_users}
            onChange={(e) => update('max_free_users', e.target.value)}
          />
        </Stack>
      </Paper>

      {/* Save */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          sx={{ borderRadius: 2, px: 4 }}
        >
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </Button>
      </Box>
    </Box>
  )
}
