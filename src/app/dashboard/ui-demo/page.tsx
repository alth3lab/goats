'use client'

import { Box, Button, Stack, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import type { GridColDef, GridRenderCellParams } from '@mui/x-data-grid'
import { AppCard } from '@/components/ui/AppCard'
import { AppDataGrid } from '@/components/ui/AppDataGrid'
import { StatusChip } from '@/components/ui/StatusChip'

type DemoRow = {
  id: number
  tagId: string
  goatStatus: 'ACTIVE' | 'SOLD' | 'DECEASED' | 'QUARANTINE'
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID'
  weight: number
}

const rows: DemoRow[] = [
  { id: 1, tagId: 'G-1001', goatStatus: 'ACTIVE', paymentStatus: 'PAID', weight: 46 },
  { id: 2, tagId: 'G-1002', goatStatus: 'QUARANTINE', paymentStatus: 'PARTIAL', weight: 39 },
  { id: 3, tagId: 'G-1003', goatStatus: 'SOLD', paymentStatus: 'PAID', weight: 51 },
  { id: 4, tagId: 'G-1004', goatStatus: 'DECEASED', paymentStatus: 'PENDING', weight: 42 }
]

const columns: GridColDef<DemoRow>[] = [
  { field: 'tagId', headerName: 'رقم التاج', minWidth: 140, flex: 1 },
  {
    field: 'goatStatus',
    headerName: 'حالة الحيوان',
    minWidth: 170,
    flex: 1,
    renderCell: (params: GridRenderCellParams<DemoRow, DemoRow['goatStatus']>) => (
      <StatusChip status={params.value || 'ACTIVE'} lang="ar" />
    )
  },
  {
    field: 'paymentStatus',
    headerName: 'حالة الدفع',
    minWidth: 160,
    flex: 1,
    renderCell: (params: GridRenderCellParams<DemoRow, DemoRow['paymentStatus']>) => (
      <StatusChip status={params.value || 'PENDING'} lang="ar" />
    )
  },
  { field: 'weight', headerName: 'الوزن (كجم)', minWidth: 140, flex: 0.8 }
]

export default function UiDemoPage() {
  return (
    <Box sx={{ width: '100%', overflowX: 'hidden' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={1.5} sx={{ mb: 2 }}>
        <Typography variant="h3">Farm Minimal Light</Typography>
        <Button variant="contained" startIcon={<AddIcon />} sx={{ width: { xs: '100%', md: 'auto' } }}>
          إضافة سجل
        </Button>
      </Stack>

      <AppCard title="سجلات تجريبية" subtitle="مثال موحّد للجدول والبطاقات والـ chips">
        <AppDataGrid
          title="Goat Records"
          autoHeight
          rows={rows}
          columns={columns}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10, page: 0 }
            }
          }}
        />
      </AppCard>
    </Box>
  )
}
