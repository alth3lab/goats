'use client'

import { useState } from 'react'
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
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import EmailIcon from '@mui/icons-material/Email'
import PetsIcon from '@mui/icons-material/Pets'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const theme = useTheme()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
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
          <Typography variant="h5" fontWeight="bold">نسيت كلمة المرور</Typography>
          <Typography variant="body2" color="text.secondary">
            أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين
          </Typography>
        </Stack>

        {success ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            إذا كان البريد مسجلاً، سيتم إرسال رابط إعادة التعيين. تحقق من بريدك.
          </Alert>
        ) : (
          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="البريد الإلكتروني"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <Button type="submit" variant="contained" fullWidth size="large" disabled={loading || !email}>
                {loading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
              </Button>
            </Stack>
          </form>
        )}

        <Stack direction="row" justifyContent="center" mt={3}>
          <MuiLink component={Link} href="/login" underline="hover" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <ArrowBackIcon fontSize="small" />
            العودة لتسجيل الدخول
          </MuiLink>
        </Stack>
      </Paper>
    </Box>
  )
}
