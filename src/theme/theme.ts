'use client'

import { createTheme } from '@mui/material/styles'
import { arSA } from '@mui/material/locale'

export const theme = createTheme(
  {
    direction: 'rtl',
    palette: {
      primary: {
        main: '#2e7d32',
        light: '#60ad5e',
        dark: '#005005',
      },
      secondary: {
        main: '#f57c00',
        light: '#ffad42',
        dark: '#bb4d00',
      },
      background: {
        default: '#f5f5f5',
        paper: '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Cairo", "Roboto", "Helvetica", "Arial", sans-serif',
    },
    components: {
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
          fullWidth: true,
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          },
        },
      },
    },
  },
  arSA
)
