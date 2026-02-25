'use client'

import { Box, Typography, Button, Paper, Stack } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', p: 3 }}>
      <Paper sx={{ p: 4, maxWidth: 500, textAlign: 'center', borderRadius: 3, border: '2px solid', borderColor: 'error.main' }}>
        <Stack spacing={2} alignItems="center">
          <ErrorOutlineIcon color="error" sx={{ fontSize: 64 }} />
          <Typography variant="h5" fontWeight="bold">حدث خطأ غير متوقع</Typography>
          <Typography variant="body2" color="text.secondary">
            نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى.
          </Typography>
          {process.env.NODE_ENV === 'development' && (
            <Typography variant="caption" color="error" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {error.message}
            </Typography>
          )}
          <Button variant="contained" onClick={reset} sx={{ borderRadius: 2 }}>
            إعادة المحاولة
          </Button>
        </Stack>
      </Paper>
    </Box>
  )
}
