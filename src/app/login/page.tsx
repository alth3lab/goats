'use client'

import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  InputAdornment,
  IconButton
} from '@mui/material'
import {
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  Lock as LockIcon,
  Pets as PetsIcon
} from '@mui/icons-material'
import { useState } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 2
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 4,
          borderRadius: 4,
          maxWidth: 420,
          width: '100%',
          bgcolor: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Stack spacing={3} alignItems="center">
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: '#2e7d32',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}
          >
            <PetsIcon sx={{ fontSize: 40 }} />
          </Box>
          <Box textAlign="center">
            <Typography variant="h4" fontWeight="bold">
              نظام إدارة الماعز
            </Typography>
            <Typography variant="body2" color="text.secondary">
              تسجيل الدخول إلى لوحة التحكم
            </Typography>
          </Box>

          <TextField
            fullWidth
            label="اسم المستخدم أو البريد"
            placeholder="admin@example.com"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="كلمة المرور"
            type={showPassword ? 'text' : 'password'}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Button
            component={Link}
            href="/dashboard"
            variant="contained"
            fullWidth
            size="large"
            sx={{
              bgcolor: '#2e7d32',
              py: 1.5,
              fontSize: '1.1rem',
              '&:hover': { bgcolor: '#1b5e20' }
            }}
          >
            دخول
          </Button>

          <Typography variant="caption" color="text.secondary">
            بالضغط على دخول، أنت توافق على شروط الاستخدام
          </Typography>
        </Stack>
      </Paper>
    </Box>
  )
}
