'use client'

import { useState } from 'react'
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
    farmName: 'مزرعة سهيل',
    phone: '',
    address: '',
    currency: 'درهم',
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
        </Box>

        <Stack direction="row" justifyContent="flex-end" mt={3}>
          <Button variant="contained" startIcon={<SaveIcon />}>
            حفظ الإعدادات
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}
