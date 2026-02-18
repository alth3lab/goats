'use client'

import { Box, Typography, Button, Paper, Stack } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import { useRouter } from 'next/navigation'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', p: 3 }}>
      <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center', borderRadius: 3, border: '2px solid', borderColor: 'error.main' }}>
        <Stack spacing={2} alignItems="center">
          <ErrorOutlineIcon color="error" sx={{ fontSize: 64 }} />
          <Typography variant="h5" fontWeight="bold">حدث خطأ في هذه الصفحة</Typography>
          <Typography variant="body2" color="text.secondary">
            نعتذر عن هذا الخطأ. يمكنك المحاولة مرة أخرى أو العودة للوحة التحكم.
          </Typography>
          {process.env.NODE_ENV === 'development' && (
            <Typography variant="caption" color="error" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {error.message}
            </Typography>
          )}
          <Stack direction="row" spacing={2}>
            <Button variant="contained" onClick={reset} sx={{ borderRadius: 2 }}>
              إعادة المحاولة
            </Button>
            <Button variant="outlined" onClick={() => router.push('/dashboard')} sx={{ borderRadius: 2 }}>
              العودة للوحة التحكم
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  )
}
