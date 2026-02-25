'use client'

import { alpha, createTheme, type Shadows } from '@mui/material/styles'
import { arSA } from '@mui/material/locale'
import '@mui/x-data-grid/themeAugmentation'

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides {
    soft: true
    danger: true
  }
}

const fontFamily = [
  'Tajawal',
  'Cairo',
  'Noto Kufi Arabic',
  'Inter',
  'system-ui',
  '-apple-system',
  'Segoe UI',
  'Roboto',
  'Helvetica',
  'Arial',
  'sans-serif'
].join(', ')

const subtleShadows = [
  'none',
  '0 1px 2px rgba(15, 23, 42, 0.05)',
  '0 1px 3px rgba(15, 23, 42, 0.06)',
  '0 2px 6px rgba(15, 23, 42, 0.06)',
  '0 4px 12px rgba(15, 23, 42, 0.07)',
  ...Array(20).fill('0 4px 14px rgba(15, 23, 42, 0.08)')
] as unknown as Shadows

export const theme = createTheme(
  {
    direction: 'rtl',
    palette: {
      mode: 'light',
      primary: {
        main: '#4F7A57',
        light: '#78A582',
        dark: '#3A5E42',
        contrastText: '#ffffff'
      },
      secondary: {
        main: '#2F3A45',
        light: '#4C5966',
        dark: '#1F2933',
        contrastText: '#ffffff'
      },
      success: {
        main: '#5E9E72',
        light: '#DFF3E7',
        dark: '#3F7A53'
      },
      warning: {
        main: '#C98A3D',
        light: '#FFF2DF',
        dark: '#9D6A2D'
      },
      error: {
        main: '#C96A6A',
        light: '#FDEAEA',
        dark: '#A34B4B'
      },
      background: {
        default: '#F6F5F1',
        paper: '#FFFFFF'
      },
      divider: '#E6E8E6',
      text: {
        primary: '#223028',
        secondary: '#5B645D'
      }
    },
    spacing: 8,
    shape: {
      borderRadius: 12
    },
    shadows: subtleShadows,
    typography: {
      fontFamily,
      h1: { fontSize: '2.25rem', fontWeight: 700, lineHeight: 1.35 },
      h2: { fontSize: '1.875rem', fontWeight: 700, lineHeight: 1.35 },
      h3: { fontSize: '1.5rem', fontWeight: 650, lineHeight: 1.4 },
      subtitle1: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.75 },
      subtitle2: { fontSize: '0.925rem', fontWeight: 600, lineHeight: 1.7 },
      body1: { fontSize: '1rem', lineHeight: 1.85 },
      body2: { fontSize: '0.92rem', lineHeight: 1.8 },
      caption: { fontSize: '0.78rem', lineHeight: 1.7 }
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: '#F6F5F1'
          }
        }
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true
        },
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 12,
            minHeight: 42,
            fontWeight: 700,
            paddingInline: 16,
            transition: 'all .18s ease'
          },
          contained: {
            boxShadow: '0 1px 2px rgba(15,23,42,.08)',
            '&:hover': {
              boxShadow: '0 2px 8px rgba(15,23,42,.12)'
            }
          },
          outlined: {
            borderColor: '#CED4CF',
            '&:hover': {
              borderColor: '#4F7A57',
              backgroundColor: alpha('#4F7A57', 0.04)
            }
          }
        },
        variants: [
          {
            props: { variant: 'soft' },
            style: {
              backgroundColor: alpha('#4F7A57', 0.1),
              color: '#3A5E42',
              '&:hover': {
                backgroundColor: alpha('#4F7A57', 0.16),
                boxShadow: '0 2px 8px rgba(79,122,87,.16)'
              }
            }
          },
          {
            props: { variant: 'danger' },
            style: {
              backgroundColor: '#FDEAEA',
              color: '#A34B4B',
              '&:hover': {
                backgroundColor: '#F9DCDC',
                boxShadow: '0 2px 8px rgba(201,106,106,.16)'
              }
            }
          }
        ]
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
          fullWidth: true,
          size: 'small'
        }
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: '#fff',
            borderRadius: 12,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#D9DED9'
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#B8C2BA'
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#4F7A57',
              boxShadow: `0 0 0 3px ${alpha('#4F7A57', 0.12)}`
            }
          }
        }
      },
      MuiFormHelperText: {
        styleOverrides: {
          root: {
            marginInlineStart: 2
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: '1px solid #E6E8E6'
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: '1px solid #E6E8E6',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)'
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 999,
            fontWeight: 600
          }
        }
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 3,
            borderRadius: 3,
            backgroundColor: '#4F7A57'
          }
        }
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: '#FFFFFF',
            color: '#223028',
            borderBottom: '1px solid #E6E8E6',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)'
          }
        }
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: '#F2F4EF',
            borderLeft: '1px solid #E6E8E6'
          }
        }
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: '#2F3A45',
            fontSize: '0.78rem'
          }
        }
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 14,
            border: '1px solid #E6E8E6',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)'
          }
        }
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: '1px solid #E6E8E6'
          }
        }
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: '#F8F9F7'
          }
        }
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottomColor: '#ECEFEC'
          },
          head: {
            fontWeight: 700,
            color: '#3D4A41'
          }
        }
      },
      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: '1px solid #E6E8E6',
            borderRadius: 12,
            backgroundColor: '#fff'
          },
          columnHeaders: {
            backgroundColor: '#F8F9F7',
            borderBottom: '1px solid #E6E8E6'
          },
          row: {
            '&:nth-of-type(even)': {
              backgroundColor: '#FCFDFC'
            },
            '&:hover': {
              backgroundColor: alpha('#4F7A57', 0.05)
            }
          },
          cell: {
            borderBottom: '1px solid #F0F2EF',
            '&:focus, &:focus-within': {
              outline: `2px solid ${alpha('#4F7A57', 0.25)}`,
              outlineOffset: -1
            }
          },
          columnHeader: {
            '&:focus, &:focus-within': {
              outline: `2px solid ${alpha('#4F7A57', 0.25)}`,
              outlineOffset: -1
            }
          },
          footerContainer: {
            borderTop: '1px solid #E6E8E6'
          }
        }
      },
      MuiPaginationItem: {
        styleOverrides: {
          root: {
            borderRadius: 8
          }
        }
      },
      MuiTablePagination: {
        defaultProps: {
          labelRowsPerPage: 'صفوف في الصفحة:',
          labelDisplayedRows: ({ from, to, count }: { from: number; to: number; count: number }) =>
            `${from}–${to} من ${count !== -1 ? count : `أكثر من ${to}`}`,
        }
      }
    }
  },
  arSA
)
