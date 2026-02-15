'use client'

import { ReactNode, useState } from 'react'
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  SwipeableDrawer,
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
  InputAdornment,
  useMediaQuery
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
  CalendarMonth as CalendarIcon,
  ChevronLeft as CollapseIcon,
  ChevronRight as ExpandIcon
} from '@mui/icons-material'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { menuPermissions } from '@/lib/permissionMap'
import { alpha, useTheme } from '@mui/material/styles'

const expandedDrawerWidth = 260
const collapsedDrawerWidth = 86

// تعريف المجموعات
const menuGroups = [
  {
    title: 'عام',
    items: [
      { text: 'لوحة التحكم', icon: <DashboardIcon />, href: '/dashboard' },
      { text: 'بحث موحّد', icon: <SearchIcon />, href: '/dashboard/search' },
      { text: 'التقويم', icon: <CalendarIcon />, href: '/dashboard/calendar' },
    ]
  },
  {
    title: 'القطيع والإنتاج',
    items: [
      { text: 'إدارة الماعز', icon: <PetsIcon />, href: '/dashboard/goats' },
      { text: 'التكاثر', icon: <BreedingIcon />, href: '/dashboard/breeding' },
      { text: 'السجلات الصحية', icon: <HealthIcon />, href: '/dashboard/health' },
      { text: 'إدارة الحظائر', icon: <PenIcon />, href: '/dashboard/pens' },
    ]
  },
  {
    title: 'الموارد والمالية',
    items: [
      { text: 'المخزون', icon: <InventoryIcon />, href: '/dashboard/inventory' },
      { text: 'الأعلاف', icon: <FeedsIcon />, href: '/dashboard/feeds' },
      { text: 'المبيعات', icon: <SalesIcon />, href: '/dashboard/sales' },
      { text: 'المصروفات', icon: <ExpensesIcon />, href: '/dashboard/expenses' },
    ]
  },
  {
    title: 'النظام والتقارير',
    items: [
      { text: 'التقارير', icon: <ReportsIcon />, href: '/dashboard/reports' },
      { text: 'سجل النشاطات', icon: <HistoryIcon />, href: '/dashboard/activities' },
      { text: 'المستخدمين', icon: <UsersIcon />, href: '/dashboard/users' },
      { text: 'الأنواع والسلالات', icon: <TypesIcon />, href: '/dashboard/types' },
      { text: 'الإعدادات', icon: <SettingsIcon />, href: '/dashboard/settings' }
    ]
  }
]

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const pathname = usePathname()
  const router = useRouter()
  const { can, loading: authLoading } = useAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const drawerWidth = collapsed ? collapsedDrawerWidth : expandedDrawerWidth
  const mobileAppBarHeight = '88px'
  const mobileAppBarOffset = `calc(${mobileAppBarHeight} + env(safe-area-inset-top))`

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
      bgcolor: '#F2F4EF', 
      color: 'text.primary',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto',
      overflowX: 'hidden',
      borderLeft: '1px solid',
      borderColor: 'divider'
    }}>
      <Toolbar sx={{ justifyContent: 'center', py: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%', justifyContent: collapsed ? 'center' : 'space-between' }}>
          {!collapsed && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>G</Avatar>
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  إدارة الماعز
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Goat Management
                </Typography>
              </Box>
            </Stack>
          )}
          {collapsed && <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>G</Avatar>}
          <IconButton size="small" onClick={() => setCollapsed(prev => !prev)} sx={{ display: { xs: 'none', sm: 'inline-flex' }, bgcolor: 'rgba(79,122,87,0.08)' }}>
            {collapsed ? <ExpandIcon fontSize="small" /> : <CollapseIcon fontSize="small" />}
          </IconButton>
        </Stack>
      </Toolbar>
      <Divider />
      <List sx={{ px: 1, flexGrow: 1 }}>
        {menuGroups.map((group, index) => {
          const filteredItems = group.items.filter(
            (item) => authLoading || can(menuPermissions[item.href])
          )

          if (filteredItems.length === 0) return null

          return (
            <Box key={group.title} sx={{ mb: 2 }}>
              {index > 0 && <Divider sx={{ my: 1 }} />}
              <Typography
                variant="caption"
                sx={{
                  display: collapsed ? 'none' : 'block',
                  color: 'text.secondary',
                  px: 2,
                  py: 1,
                  fontWeight: 'bold',
                  fontSize: '0.75rem'
                }}
              >
                {group.title}
              </Typography>
              {filteredItems.map((item) => (
                <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    component={Link}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    sx={{
                      borderRadius: 2,
                      color: 'text.primary',
                      bgcolor: pathname === item.href ? 'rgba(79,122,87,0.10)' : 'transparent',
                      borderRight: pathname === item.href ? '4px solid #4F7A57' : '4px solid transparent',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      px: collapsed ? 1 : 2,
                      '&:hover': {
                        bgcolor: 'rgba(79,122,87,0.07)'
                      }
                    }}
                  >
                    <ListItemIcon sx={{ color: pathname === item.href ? 'primary.main' : 'text.secondary', minWidth: collapsed ? 0 : 40 }}>
                      {item.icon}
                    </ListItemIcon>
                    {!collapsed && <ListItemText primary={item.text} />}
                  </ListItemButton>
                </ListItem>
              ))}
            </Box>
          )
        })}
      </List>
      <Box sx={{ p: 2 }}>
        <Divider sx={{ mb: 2 }} />
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            color: 'text.primary',
            justifyContent: collapsed ? 'center' : 'flex-start',
            '&:hover': {
              bgcolor: 'rgba(201,106,106,0.10)'
            }
          }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: collapsed ? 0 : 40 }}>
            <LogoutIcon />
          </ListItemIcon>
          {!collapsed && <ListItemText primary="تسجيل خروج" />}
        </ListItemButton>
      </Box>
    </Box>
  )

  return (
    <Box
      sx={{
        display: 'flex',
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden'
      }}
    >
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          zIndex: (theme) => theme.zIndex.modal + 200,
          bgcolor: 'background.paper',
          color: 'text.primary',
          boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
          borderBottom: '1px solid',
          borderColor: 'divider',
          pt: { xs: 'env(safe-area-inset-top)', sm: 0 },
          pl: { xs: 'env(safe-area-inset-left)', sm: 0 },
          pr: { xs: 'env(safe-area-inset-right)', sm: 0 }
        }}
      >
        <Toolbar
          sx={{
            gap: 1,
            alignItems: 'center',
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
            py: { xs: 0.75, sm: 0 },
            minHeight: { xs: mobileAppBarHeight, sm: 64 }
          }}
        >
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              display: { xs: 'inline-flex', sm: 'none' },
              ml: 1,
              position: 'relative',
              zIndex: 1,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant={isMobile ? 'subtitle1' : 'h6'}
            noWrap={!isMobile}
            component="div"
            sx={{
              flexGrow: { xs: 1, sm: 0 },
              minWidth: 0,
              maxWidth: { xs: 'calc(100% - 52px)', sm: 'none' }
            }}
          >
            {isMobile ? 'نظام الإدارة' : 'نظام إدارة الماعز والخرفان'}
          </Typography>
          {(authLoading || can('view_search')) && (
            <Box
              sx={{
                flexGrow: 1,
                display: 'flex',
                justifyContent: 'flex-end',
                width: { xs: '100%', sm: 'auto' },
                mt: { xs: 0.5, sm: 0 },
                order: { xs: 3, sm: 0 }
              }}
            >
              <TextField
                placeholder="بحث سريع..."
                size="small"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSearch()
                }}
                sx={{ width: { xs: '100%', sm: 280 }, ml: { xs: 0, sm: 2 } }}
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
        <SwipeableDrawer
          anchor="right"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          onOpen={() => setMobileOpen(true)}
          disableDiscovery
          disableSwipeToOpen
          ModalProps={{ 
            keepMounted: true,
            disableScrollLock: true,
            container: typeof window !== 'undefined' ? document.body : undefined
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            zIndex: (t) => t.zIndex.modal + 50,
            '& .MuiDrawer-paper': {
              width: '88vw',
              maxWidth: 340,
              boxSizing: 'border-box',
              position: 'fixed',
              top: 0,
              height: '100dvh',
              paddingTop: 'env(safe-area-inset-top)',
              WebkitOverflowScrolling: 'touch',
              zIndex: (t) => t.zIndex.modal + 51
            },
            '& .MuiBackdrop-root': {
              zIndex: (t) => t.zIndex.modal + 49,
              backgroundColor: (t) => alpha(t.palette.common.black, 0.35)
            }
          }}
        >
          {drawer}
        </SwipeableDrawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            zIndex: (theme) => theme.zIndex.drawer,
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              transition: 'width .2s ease',
              zIndex: (theme) => theme.zIndex.drawer
            }
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
          maxWidth: '100%',
          minHeight: '100vh',
          bgcolor: '#F6F5F1',
          p: { xs: 1.5, sm: 3 },
          overflowX: 'hidden'
        }}
      >
        <Box sx={{ height: { xs: mobileAppBarOffset, sm: '64px' } }} />
        <Box sx={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>{children}</Box>
      </Box>
    </Box>
  )
}
