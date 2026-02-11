'use client'

import { ReactNode, useState } from 'react'
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Stack,
  TextField,
  InputAdornment
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Pets as PetsIcon,
  LocalHospital as HealthIcon,
  FavoriteBorder as BreedingIcon,
  ShoppingCart as SalesIcon,
  Category as TypesIcon,
  People as UsersIcon,
  Receipt as ExpensesIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  HomeWork as PenIcon,
  History as HistoryIcon,
  Search as SearchIcon,
  Inventory as InventoryIcon,
  Grass as FeedsIcon,
  CalendarMonth as CalendarIcon
} from '@mui/icons-material'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { menuPermissions } from '@/lib/permissionMap'

const drawerWidth = 260

const menuItems = [
  { text: 'لوحة التحكم', icon: <DashboardIcon />, href: '/dashboard' },
  { text: 'بحث موحّد', icon: <SearchIcon />, href: '/dashboard/search' },
  { text: 'إدارة الماعز', icon: <PetsIcon />, href: '/dashboard/goats' },
  { text: 'إدارة الحظائر', icon: <PenIcon />, href: '/dashboard/pens' },
  { text: 'السجلات الصحية', icon: <HealthIcon />, href: '/dashboard/health' },
  { text: 'التكاثر', icon: <BreedingIcon />, href: '/dashboard/breeding' },
  { text: 'المبيعات', icon: <SalesIcon />, href: '/dashboard/sales' },
  { text: 'المخزون', icon: <InventoryIcon />, href: '/dashboard/inventory' },
  { text: 'الأعلاف', icon: <FeedsIcon />, href: '/dashboard/feeds' },
  { text: 'التقويم', icon: <CalendarIcon />, href: '/dashboard/calendar' },
  { text: 'الأنواع والسلالات', icon: <TypesIcon />, href: '/dashboard/types' },
  { text: 'المستخدمين والصلاحيات', icon: <UsersIcon />, href: '/dashboard/users' },
  { text: 'المصروفات', icon: <ExpensesIcon />, href: '/dashboard/expenses' },
  { text: 'التقارير', icon: <ReportsIcon />, href: '/dashboard/reports' },
  { text: 'سجل النشاطات', icon: <HistoryIcon />, href: '/dashboard/activities' },
  { text: 'الإعدادات', icon: <SettingsIcon />, href: '/dashboard/settings' }
]

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const pathname = usePathname()
  const router = useRouter()
  const { can, loading: authLoading } = useAuth()

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const handleSearch = () => {
    const value = searchValue.trim()
    if (!value) return
    router.push(`/dashboard/search?q=${encodeURIComponent(value)}`)
  }

  const drawer = (
    <Box sx={{ 
      height: '100%', 
      bgcolor: '#1e1e2f', 
      color: 'white',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Toolbar sx={{ justifyContent: 'center', py: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Avatar sx={{ bgcolor: '#2e7d32' }}>G</Avatar>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              إدارة الماعز
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              Goat Management
            </Typography>
          </Box>
        </Stack>
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <List sx={{ px: 1, flex: 1, overflow: 'auto' }}>
        {menuItems
          .filter((item) => authLoading || can(menuPermissions[item.href]))
          .map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              component={Link}
              href={item.href}
              sx={{
                borderRadius: 2,
                color: 'white',
                bgcolor: pathname === item.href ? 'rgba(255,255,255,0.15)' : 'transparent',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Box sx={{ p: 2 }}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 2 }} />
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            color: 'white',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.1)'
            }
          }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="تسجيل خروج" />
        </ListItemButton>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mr: { sm: `${drawerWidth}px` },
          bgcolor: 'white',
          color: 'text.primary',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            نظام إدارة الماعز والخرفان
          </Typography>
          {(authLoading || can('view_search')) && (
            <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end' }}>
              <TextField
                placeholder="بحث سريع..."
                size="small"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSearch()
                }}
                sx={{ width: { xs: '100%', sm: 280 }, ml: 2 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  )
                }}
              />
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mr: { sm: `${drawerWidth}px` },
          minHeight: '100vh',
          bgcolor: '#f5f6fa',
          p: 3
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  )
}
