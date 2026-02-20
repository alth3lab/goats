'use client'

import { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
  Link as MuiLink,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material'
import { Agriculture as FarmIcon } from '@mui/icons-material'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [form, setForm] = useState({
    farmName: '',
    fullName: '',
    email: '',
    username: '',
    password: '',
    phone: '',
    farmType: 'SHEEP',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'فشل في إنشاء الحساب')
        return
      }

      router.push('/dashboard')
    } catch {
      setError('حدث خطأ في الاتصال')
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
        bgcolor: '#F6F5F1',
        p: 2,
      }}
    >
      <Card sx={{ maxWidth: 480, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={1} alignItems="center" sx={{ mb: 3 }}>
            <FarmIcon sx={{ fontSize: 48, color: 'primary.main' }} />
            <Typography variant="h5" fontWeight="bold">
              إنشاء حساب جديد
            </Typography>
            <Typography variant="body2" color="text.secondary">
              أنشئ مزرعتك وابدأ إدارة قطيعك
            </Typography>
          </Stack>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label="اسم المزرعة"
                value={form.farmName}
                onChange={(e) => setForm({ ...form, farmName: e.target.value })}
                required
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>نوع المزرعة</InputLabel>
                <Select
                  value={form.farmType}
                  label="نوع المزرعة"
                  onChange={(e) => setForm({ ...form, farmType: e.target.value })}
                >
                  <MenuItem value="SHEEP">أغنام</MenuItem>
                  <MenuItem value="CAMEL">إبل</MenuItem>
                  <MenuItem value="MIXED">مختلط</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="الاسم الكامل"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="البريد الإلكتروني"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="اسم المستخدم"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="كلمة المرور"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                fullWidth
                helperText="6 أحرف على الأقل"
              />
              <TextField
                label="رقم الهاتف (اختياري)"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                fullWidth
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                fullWidth
              >
                {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
              </Button>
            </Stack>
          </form>

          <Typography variant="body2" align="center" sx={{ mt: 3 }}>
            لديك حساب بالفعل؟{' '}
            <MuiLink component={Link} href="/login">
              تسجيل الدخول
            </MuiLink>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
