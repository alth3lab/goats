'use client'

import { useMemo, useState } from 'react'
import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import {
  DataGrid,
  type DataGridProps,
  type GridDensity,
  type GridRowClassNameParams,
  type GridValidRowModel
} from '@mui/x-data-grid'

interface AppDataGridProps extends Omit<DataGridProps, 'density'> {
  title?: string
  defaultDensity?: GridDensity
  showDensityToggle?: boolean
}

export function AppDataGrid({
  title,
  defaultDensity = 'comfortable',
  showDensityToggle = true,
  sx,
  getRowClassName,
  ...props
}: AppDataGridProps) {
  const [density, setDensity] = useState<GridDensity>(defaultDensity)

  const resolvedRowClassName = useMemo(() => {
    return (params: GridRowClassNameParams<GridValidRowModel>) => {
      const zebraClass = params.indexRelativeToCurrentPage % 2 === 1 ? 'app-zebra-row' : ''
      const custom = getRowClassName ? getRowClassName(params) : ''
      return `${zebraClass} ${custom}`.trim()
    }
  }, [getRowClassName])

  return (
    <Box sx={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>
      {(title || showDensityToggle) && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', sm: 'center' }}
          spacing={1}
          sx={{ mb: 1.5 }}
        >
          <Typography variant="subtitle2" color="text.secondary">{title || ''}</Typography>
          {showDensityToggle && (
            <ToggleButtonGroup
              size="small"
              exclusive
              value={density}
              onChange={(_, next: GridDensity | null) => {
                if (next) setDensity(next)
              }}
              sx={{
                alignSelf: { xs: 'flex-start', sm: 'auto' },
                '& .MuiToggleButton-root': {
                  borderColor: 'divider',
                  px: 1.25,
                  textTransform: 'none'
                }
              }}
            >
              <ToggleButton value="compact">Compact</ToggleButton>
              <ToggleButton value="standard">Standard</ToggleButton>
              <ToggleButton value="comfortable">Comfortable</ToggleButton>
            </ToggleButtonGroup>
          )}
        </Stack>
      )}

      <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <DataGrid
          density={density}
          disableRowSelectionOnClick
          getRowClassName={resolvedRowClassName}
          pageSizeOptions={[10, 25, 50, 100]}
          sx={{
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            minWidth: { xs: 700, md: 0 },
            '& .MuiDataGrid-columnHeaders': {
              bgcolor: '#F8F9F7'
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 700
            },
            '& .MuiDataGrid-row:hover': {
              bgcolor: 'rgba(79,122,87,0.05)'
            },
            '& .app-zebra-row': {
              bgcolor: '#FCFDFC'
            },
            '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
              outline: '2px solid rgba(79,122,87,0.25)',
              outlineOffset: -1
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid',
              borderColor: 'divider'
            },
            '& .MuiTablePagination-toolbar': {
              minHeight: 52
            },
            ...sx
          }}
          {...props}
        />
      </Box>
    </Box>
  )
}
