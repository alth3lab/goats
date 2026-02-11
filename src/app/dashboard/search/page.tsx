'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  TextField,
  Stack,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip
} from '@mui/material'
import { Search as SearchIcon } from '@mui/icons-material'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'

interface SearchResult {
  type: string
  title: string
  subtitle?: string
  href: string
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { can, loading: authLoading } = useAuth()
  const initialQuery = searchParams.get('q') || ''

  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const grouped = useMemo(() => {
    return results.reduce<Record<string, SearchResult[]>>((acc, item) => {
      if (!acc[item.type]) acc[item.type] = []
      acc[item.type].push(item)
      return acc
    }, {})
  }, [results])

  useEffect(() => {
    setQuery(initialQuery)
  }, [initialQuery])

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults([])
      return
    }

    setLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((res) => res.json())
      .then((data) => setResults(Array.isArray(data.results) ? data.results : []))
      .finally(() => setLoading(false))
  }, [query])

  if (!authLoading && !can('view_search')) {
    return (
      <Box>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight="bold">
            ليس لديك صلاحية لاستخدام البحث.
          </Typography>
        </Paper>
      </Box>
    )
  }

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h4" fontWeight="bold">بحث موحّد</Typography>
          <TextField
            placeholder="ابحث عن ماعز، حظيرة، سلالة، عملية بيع..."
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              router.replace(`/dashboard/search?q=${encodeURIComponent(event.target.value)}`)
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              )
            }}
            fullWidth
          />
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        {loading ? (
          <Typography align="center">جاري البحث...</Typography>
        ) : results.length === 0 ? (
          <Typography align="center">لا توجد نتائج</Typography>
        ) : (
          <Stack spacing={3}>
            {Object.entries(grouped).map(([type, items]) => (
              <Box key={type}>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                  <Typography variant="h6" fontWeight="bold">{type}</Typography>
                  <Chip label={items.length} size="small" />
                </Stack>
                <List sx={{ bgcolor: 'background.paper', borderRadius: 2, border: '1px solid #eee' }}>
                  {items.map((item, index) => (
                    <ListItem key={`${item.title}-${index}`} disablePadding divider={index !== items.length - 1}>
                      <ListItemButton onClick={() => router.push(item.href)}>
                        <ListItemText
                          primary={item.title}
                          secondary={item.subtitle}
                        />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </List>
              </Box>
            ))}
          </Stack>
        )}
      </Paper>
    </Box>
  )
}
