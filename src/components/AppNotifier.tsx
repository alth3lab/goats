'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Alert, AlertColor, Snackbar } from '@mui/material'

type NotifyOptions = {
  severity?: AlertColor
  duration?: number
}

type NotifierContextValue = {
  notify: (message: string, options?: NotifyOptions) => void
}

const NotifierContext = createContext<NotifierContextValue | null>(null)

export function AppNotifierProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [severity, setSeverity] = useState<AlertColor>('info')
  const [duration, setDuration] = useState(4000)

  const notify = useCallback((nextMessage: string, options?: NotifyOptions) => {
    setMessage(nextMessage)
    setSeverity(options?.severity || 'info')
    setDuration(options?.duration ?? 4000)
    setOpen(true)
  }, [])

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <NotifierContext.Provider value={value}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={duration}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setOpen(false)}
          severity={severity}
          variant="filled"
          sx={{ width: '100%', minWidth: 320 }}
        >
          {message}
        </Alert>
      </Snackbar>
    </NotifierContext.Provider>
  )
}

export function useNotifier() {
  const context = useContext(NotifierContext)
  if (!context) {
    throw new Error('useNotifier must be used within AppNotifierProvider')
  }
  return context
}
