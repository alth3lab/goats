'use client'

import { Card, CardContent, Stack, Typography } from '@mui/material'
import type { ReactNode } from 'react'

interface AppCardProps {
  title?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  contentSx?: object
}

export function AppCard({ title, subtitle, action, children, contentSx }: AppCardProps) {
  return (
    <Card
      sx={{
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 1px 2px rgba(15,23,42,.05)'
      }}
    >
      {(title || action) && (
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ px: 2.5, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Stack spacing={0.25}>
            {title ? <Typography variant="subtitle1" fontWeight={700}>{title}</Typography> : null}
            {subtitle ? <Typography variant="body2" color="text.secondary">{subtitle}</Typography> : null}
          </Stack>
          {action}
        </Stack>
      )}
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 }, ...contentSx }}>{children}</CardContent>
    </Card>
  )
}
