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
  useMediaQuery,
  Menu,
  MenuItem,
  ListSubheader,
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
  ChevronRight as ExpandIcon,
  Agriculture as FarmIcon,
  SwapHoriz as SwitchIcon,
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
      { text: 'إدارة الإبل', icon: <PetsIcon />, href: '/dashboard/camels' },
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
      { text: 'فريق العمل', icon: <UsersIcon />, href: '/dashboard/team' },
      { text: 'المزارع', icon: <FarmIcon />, href: '/dashboard/farms' },
      { text: 'الاشتراك', icon: <SettingsIcon />, href: '/dashboard/billing' },
      { text: 'الأنواع والسلالات', icon: <TypesIcon />, href: '/dashboard/types' },
      { text: 'الإعدادات', icon: <SettingsIcon />, href: '/dashboard/settings' },
      { text: 'إدارة النظام', icon: <SettingsIcon />, href: '/dashboard/admin' }
    ]
  }
]

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [farmMenuAnchor, setFarmMenuAnchor] = useState<null | HTMLElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { user, can, loading: authLoading, farm, farms, switchFarm } = useAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'))
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
                <Typography variant="h6" fontWeight="bold" noWrap>
                  {farm?.name || 'إدارة المواشي'}
                </Typography>
                {farms.length > 1 && (
                  <Typography 
                    variant="caption" 
                    color="primary" 
                    sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                    onClick={(e) => setFarmMenuAnchor(e.currentTarget)}
                  >
                    <SwitchIcon sx={{ fontSize: 12, mr: 0.5 }} />
                    تبديل المزرعة
                  </Typography>
                )}
                {farms.length <= 1 && (
                  <Typography variant="caption" color="text.secondary">
                    Livestock Management
                  </Typography>
                )}
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
            (item) => {
              if (authLoading) return true
              const perm = menuPermissions[item.href]
              return can(perm)
            }
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
          width: isDesktop ? `calc(100% - ${drawerWidth}px)` : '100%',
          ml: isDesktop ? `${drawerWidth}px` : 0,
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
            {isMobile ? 'نظام الإدارة' : 'نظام إدارة المواشي'}
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
        sx={{ width: isDesktop ? drawerWidth : 0, flexShrink: 0 }}
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
            display: { xs: 'block', lg: 'none' },
            zIndex: (t) => t.zIndex.modal + 50,
            '& .MuiDrawer-paper': {
              width: { xs: '88vw', sm: '72vw', md: '62vw' },
              maxWidth: 360,
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
            display: { xs: 'none', lg: 'block' },
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
          width: isDesktop ? `calc(100% - ${drawerWidth}px)` : '100%',
          maxWidth: '100%',
          minHeight: '100vh',
          bgcolor: '#F6F5F1',
          p: { xs: 1.25, sm: 2, md: 2.5, lg: 3 },
          overflowX: 'hidden'
        }}
      >
        <Box sx={{ height: { xs: mobileAppBarOffset, sm: '64px', lg: '64px' } }} />
        <Box sx={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>{children}</Box>
      </Box>

      {/* Farm Switch Menu */}
      <Menu
        anchorEl={farmMenuAnchor}
        open={Boolean(farmMenuAnchor)}
        onClose={() => setFarmMenuAnchor(null)}
        slotProps={{ paper: { sx: { maxHeight: 400, minWidth: 280 } } }}
      >
        {(() => {
          // Group farms by tenant for SUPER_ADMIN
          if (user?.role === 'SUPER_ADMIN' && farms.some(f => f.tenantName)) {
            const grouped = farms.reduce<Record<string, typeof farms>>((acc, f) => {
              const key = f.tenantName || 'غير محدد'
              if (!acc[key]) acc[key] = []
              acc[key].push(f)
              return acc
            }, {})
            return Object.entries(grouped).map(([tenantName, tenantFarms]) => [
              <ListSubheader key={`header-${tenantName}`} sx={{ fontWeight: 'bold', lineHeight: '32px', bgcolor: 'grey.100' }}>
                {tenantName}
              </ListSubheader>,
              ...tenantFarms.map((f) => (
                <MenuItem
                  key={f.id}
                  selected={f.id === farm?.id}
                  onClick={() => {
                    setFarmMenuAnchor(null)
                    if (f.id !== farm?.id) switchFarm(f.id)
                  }}
                  sx={{ pr: 4 }}
                >
                  <ListItemIcon><FarmIcon fontSize="small" /></ListItemIcon>
                  <ListItemText>{f.nameAr || f.name}</ListItemText>
                </MenuItem>
              ))
            ]).flat()
          }
          // Regular users - flat list
          return farms.map((f) => (
            <MenuItem
              key={f.id}
              selected={f.id === farm?.id}
              onClick={() => {
                setFarmMenuAnchor(null)
                if (f.id !== farm?.id) switchFarm(f.id)
              }}
            >
              <ListItemIcon><FarmIcon fontSize="small" /></ListItemIcon>
              <ListItemText>{f.nameAr || f.name}</ListItemText>
            </MenuItem>
          ))
        })()}
      </Menu>
    </Box>
  )
}
