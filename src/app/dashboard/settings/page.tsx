'use client'

import { useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Stack,
  Switch,
  FormControlLabel
} from '@mui/material'
import { Settings as SettingsIcon, Save as SaveIcon } from '@mui/icons-material'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    farmName: 'مزرعة سهيل',
    phone: '',
    address: '',
    currency: 'ريال سعودي',
    notifications: true
  })

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <SettingsIcon color="primary" />
          <Typography variant="h4" fontWeight="bold">الإعدادات</Typography>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="اسم المزرعة"
              value={settings.farmName}
              onChange={(e) => setSettings({ ...settings, farmName: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="الهاتف"
              value={settings.phone}
              onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="العنوان"
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="العملة"
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.notifications}
                  onChange={(e) => setSettings({ ...settings, notifications: e.target.checked })}
                />
              }
              label="تفعيل الإشعارات"
            />
          </Grid>
        </Grid>

        <Stack direction="row" justifyContent="flex-end" mt={3}>
          <Button variant="contained" startIcon={<SaveIcon />}>
            حفظ الإعدادات
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}
