'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { Box, CircularProgress, Typography, Stack } from '@mui/material'

/**
 * صفحة إدارة الإبل
 * إذا المزرعة الحالية من نوع CAMEL، يتم التوجيه مباشرة لصفحة إدارة الحيوانات
 * إذا لا، نعرض رسالة تطلب التبديل لمزرعة إبل
 */
export default function CamelsPage() {
  const router = useRouter()
  const { farm, farms, switchFarm, loading } = useAuth()

  useEffect(() => {
    if (!loading && farm?.farmType === 'CAMEL') {
      router.replace('/dashboard/goats')
    }
  }, [farm, loading, router])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  // If current farm is CAMEL, redirect is happening
  if (farm?.farmType === 'CAMEL') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  // Find camel farms
  const camelFarms = farms?.filter((f: any) => f.farmType === 'CAMEL') || []

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3} alignItems="center" sx={{ mt: 8 }}>
        <Typography variant="h4" fontWeight="bold">🐪 إدارة الإبل</Typography>
        {camelFarms.length > 0 ? (
          <>
            <Typography variant="body1" color="text.secondary">
              المزرعة الحالية ليست مزرعة إبل. اختر مزرعة إبل من القائمة:
            </Typography>
            <Stack spacing={1}>
              {camelFarms.map((f: any) => (
                <Box
                  key={f.id}
                  onClick={() => switchFarm(f.id).then(() => router.replace('/dashboard/goats'))}
                  sx={{
                    p: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' },
                    textAlign: 'center',
                    minWidth: 200,
                  }}
                >
                  <Typography fontWeight="bold">{f.nameAr || f.name}</Typography>
                </Box>
              ))}
            </Stack>
          </>
        ) : (
          <Typography variant="body1" color="text.secondary">
            لا توجد مزرعة إبل. أنشئ مزرعة جديدة من نوع &quot;إبل&quot; من صفحة المزارع.
          </Typography>
        )}
      </Stack>
    </Box>
  )
}
