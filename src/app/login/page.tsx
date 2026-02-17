'use client'

import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  InputAdornment,
  IconButton,
  Alert,
  Link as MuiLink
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import {
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  Lock as LockIcon,
  Pets as PetsIcon
} from '@mui/icons-material'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const theme = useTheme()
  const [showPassword, setShowPassword] = useState(false)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'تعذر تسجيل الدخول')
        return
      }

      router.push('/dashboard')
    } catch {
      setError('تعذر تسجيل الدخول')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
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
              bgcolor: 'primary.main',
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
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
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
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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

          {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}

          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleLogin}
            disabled={loading}
            sx={{
              py: 1.5,
              fontSize: '1.1rem'
            }}
          >
            {loading ? 'جاري الدخول...' : 'دخول'}
          </Button>

          <Typography variant="caption" color="text.secondary">
            بالضغط على دخول، أنت توافق على شروط الاستخدام
          </Typography>

          <Typography variant="body2" align="center">
            ليس لديك حساب؟{' '}
            <MuiLink component={Link} href="/register">
              إنشاء حساب جديد
            </MuiLink>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  )
}
