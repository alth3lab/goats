'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  InputAdornment,
  Link as MuiLink,
  IconButton,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import LockIcon from '@mui/icons-material/Lock'
import PetsIcon from '@mui/icons-material/Pets'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import Link from 'next/link'
import { Suspense } from 'react'

function ResetPasswordForm() {
  const theme = useTheme()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const email = searchParams.get('email') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين')
      return
    }
    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password }),
      })

      const data = await res.json()
      if (res.ok) {
        setSuccess(true)
      } else {
        setError(data.error || 'حدث خطأ')
      }
    } catch {
      setError('خطأ في الاتصال')
    } finally {
      setLoading(false)
    }
  }

  if (!token || !email) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}11, ${theme.palette.primary.main}08)`,
        }}
      >
        <Paper sx={{ p: 4, maxWidth: 440, width: '100%', borderRadius: 3, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            رابط إعادة التعيين غير صالح أو مفقود
          </Alert>
          <MuiLink component={Link} href="/forgot-password" underline="hover">
            طلب رابط جديد
          </MuiLink>
        </Paper>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        background: `linear-gradient(135deg, ${theme.palette.primary.main}11, ${theme.palette.primary.main}08)`,
      }}
    >
      <Paper sx={{ p: 4, maxWidth: 440, width: '100%', borderRadius: 3 }}>
        <Stack alignItems="center" mb={3}>
          <PetsIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold">إعادة تعيين كلمة المرور</Typography>
          <Typography variant="body2" color="text.secondary">
            أدخل كلمة المرور الجديدة
          </Typography>
        </Stack>

        {success ? (
          <Stack alignItems="center" spacing={2}>
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 64 }} />
            <Alert severity="success">
              تم تغيير كلمة المرور بنجاح
            </Alert>
            <Button component={Link} href="/login" variant="contained" fullWidth>
              تسجيل الدخول
            </Button>
          </Stack>
        ) : (
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="كلمة المرور الجديدة"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                label="تأكيد كلمة المرور"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Button type="submit" variant="contained" fullWidth size="large" disabled={loading || !password || !confirmPassword}>
                {loading ? 'جاري التحديث...' : 'تعيين كلمة المرور'}
              </Button>
            </Stack>
          </form>
        )}
      </Paper>
    </Box>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography>جاري التحميل...</Typography>
      </Box>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}
