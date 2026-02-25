'use client'

import { useMemo, useState } from 'react'
import { Box, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import {
  DataGrid,
  type DataGridProps,
  type GridDensity,
  type GridRowClassNameParams,
  type GridValidRowModel,
  type GridLocaleText
} from '@mui/x-data-grid'

/* ── Arabic locale for DataGrid ── */
const arLocale: Partial<GridLocaleText> = {
  // Root
  noRowsLabel: 'لا توجد بيانات',
  noResultsOverlayLabel: 'لم يتم العثور على نتائج',

  // Density
  toolbarDensity: 'الكثافة',
  toolbarDensityLabel: 'الكثافة',
  toolbarDensityCompact: 'مضغوط',
  toolbarDensityStandard: 'عادي',
  toolbarDensityComfortable: 'مريح',

  // Columns
  toolbarColumns: 'الأعمدة',
  toolbarColumnsLabel: 'إدارة الأعمدة',

  // Filters
  toolbarFilters: 'الفلاتر',
  toolbarFiltersLabel: 'إظهار الفلاتر',
  toolbarFiltersTooltipHide: 'إخفاء الفلاتر',
  toolbarFiltersTooltipShow: 'إظهار الفلاتر',
  toolbarFiltersTooltipActive: (count) => `${count} فلتر نشط`,

  // Quick filter
  toolbarQuickFilterPlaceholder: 'بحث...',
  toolbarQuickFilterLabel: 'بحث',
  toolbarQuickFilterDeleteIconLabel: 'مسح',

  // Export
  toolbarExport: 'تصدير',
  toolbarExportLabel: 'تصدير',
  toolbarExportCSV: 'تصدير CSV',
  toolbarExportPrint: 'طباعة',

  // Columns management
  columnsManagementSearchTitle: 'بحث',
  columnsManagementNoColumns: 'لا توجد أعمدة',
  columnsManagementShowHideAllText: 'إظهار/إخفاء الكل',
  columnsManagementReset: 'إعادة تعيين',

  // Filter panel
  filterPanelAddFilter: 'إضافة فلتر',
  filterPanelRemoveAll: 'حذف الكل',
  filterPanelDeleteIconLabel: 'حذف',
  filterPanelLogicOperator: 'عامل منطقي',
  filterPanelOperator: 'العامل',
  filterPanelOperatorAnd: 'و',
  filterPanelOperatorOr: 'أو',
  filterPanelColumns: 'العمود',
  filterPanelInputLabel: 'القيمة',
  filterPanelInputPlaceholder: 'قيمة الفلتر',

  // Filter operators
  filterOperatorContains: 'يحتوي',
  filterOperatorDoesNotContain: 'لا يحتوي',
  filterOperatorEquals: 'يساوي',
  filterOperatorDoesNotEqual: 'لا يساوي',
  filterOperatorStartsWith: 'يبدأ بـ',
  filterOperatorEndsWith: 'ينتهي بـ',
  filterOperatorIs: 'هو',
  filterOperatorNot: 'ليس',
  filterOperatorAfter: 'بعد',
  filterOperatorOnOrAfter: 'في أو بعد',
  filterOperatorBefore: 'قبل',
  filterOperatorOnOrBefore: 'في أو قبل',
  filterOperatorIsEmpty: 'فارغ',
  filterOperatorIsNotEmpty: 'غير فارغ',
  filterOperatorIsAnyOf: 'أي من',

  // Column header
  columnHeaderFiltersTooltipActive: (count) => `${count} فلتر نشط`,
  columnHeaderFiltersLabel: 'إظهار الفلاتر',
  columnHeaderSortIconLabel: 'ترتيب',

  // Rows
  footerRowSelected: (count) => `${count} صف محدد`,

  // Footer / Pagination
  footerTotalRows: 'إجمالي الصفوف:',
  footerTotalVisibleRows: (visibleCount, totalCount) => `${visibleCount} من ${totalCount}`,

  // Checkbox
  checkboxSelectionHeaderName: 'تحديد',
  checkboxSelectionSelectAllRows: 'تحديد الكل',
  checkboxSelectionUnselectAllRows: 'إلغاء تحديد الكل',
  checkboxSelectionSelectRow: 'تحديد الصف',
  checkboxSelectionUnselectRow: 'إلغاء تحديد الصف',

  // Boolean cell
  booleanCellTrueLabel: 'نعم',
  booleanCellFalseLabel: 'لا',

  // Actions
  actionsCellMore: 'المزيد',

  // Column menu
  columnMenuLabel: 'القائمة',
  columnMenuShowColumns: 'إظهار الأعمدة',
  columnMenuManageColumns: 'إدارة الأعمدة',
  columnMenuFilter: 'فلتر',
  columnMenuHideColumn: 'إخفاء العمود',
  columnMenuUnsort: 'إلغاء الترتيب',
  columnMenuSortAsc: 'ترتيب تصاعدي',
  columnMenuSortDesc: 'ترتيب تنازلي',
}

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
              <ToggleButton value="compact">مضغوط</ToggleButton>
              <ToggleButton value="standard">عادي</ToggleButton>
              <ToggleButton value="comfortable">مريح</ToggleButton>
            </ToggleButtonGroup>
          )}
        </Stack>
      )}

      <Box sx={{ width: '100%', overflowX: 'auto' }}>
        <DataGrid
          density={density}
          localeText={arLocale}
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
