'use client'

import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle,
  Typography, Stack, Avatar, CircularProgress,
} from '@mui/material'
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material'

const severityConfig = {
  error: { color: 'error' as const, icon: <ErrorIcon />, confirmColor: 'error' as const },
  warning: { color: 'warning' as const, icon: <WarningIcon />, confirmColor: 'warning' as const },
  info: { color: 'info' as const, icon: <InfoIcon />, confirmColor: 'primary' as const },
  success: { color: 'success' as const, icon: <SuccessIcon />, confirmColor: 'success' as const },
}

export interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string | React.ReactNode
  severity?: 'error' | 'warning' | 'info' | 'success'
  confirmText?: string
  cancelText?: string
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  severity = 'warning',
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cfg = severityConfig[severity]

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
    >
      <DialogTitle sx={{ pb: 0 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ bgcolor: `${cfg.color}.100`, color: `${cfg.color}.main`, width: 44, height: 44 }}>
            {cfg.icon}
          </Avatar>
          <Typography variant="h6" fontWeight="bold">{title}</Typography>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        {typeof message === 'string' ? (
          <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>{message}</Typography>
        ) : message}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onCancel} disabled={loading} variant="outlined" color="inherit">
          {cancelText}
        </Button>
        <Button onClick={onConfirm} disabled={loading} variant="contained" color={cfg.confirmColor}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
        >
          {loading ? 'جاري التنفيذ...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
