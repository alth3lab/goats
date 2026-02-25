'use client'

import { Box, Typography, Stack, Paper, Chip } from '@mui/material'
import { AutoAwesome as AiIcon, Info as InfoIcon } from '@mui/icons-material'
import AIChatPanel from '@/components/AIChatPanel'

export default function AIAssistantPage() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
        <AiIcon sx={{ fontSize: 36, color: 'primary.main' }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            المساعد الذكي
          </Typography>
          <Typography variant="body2" color="text.secondary">
            مساعدك الشخصي لإدارة المزرعة - مدعوم بـ Google Gemini AI
          </Typography>
        </Box>
        <Chip label="مجاني" color="success" size="small" sx={{ fontWeight: 600 }} />
      </Stack>

      {/* Info Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          bgcolor: 'info.50',
          border: '1px solid',
          borderColor: 'info.200',
          display: 'flex',
          gap: 1.5,
          alignItems: 'center',
        }}
      >
        <InfoIcon color="info" />
        <Typography variant="body2" color="text.secondary">
          المساعد الذكي يستطيع الوصول إلى بيانات مزرعتك لتقديم إجابات مخصصة. اسأله عن التغذية، الصحة، التكاثر، أو أي شيء يتعلق بإدارة المزرعة.
        </Typography>
      </Paper>

      {/* Chat Panel */}
      <Box sx={{ height: { xs: 'calc(100vh - 280px)', md: 'calc(100vh - 260px)' }, minHeight: 500 }}>
        <AIChatPanel />
      </Box>
    </Box>
  )
}
