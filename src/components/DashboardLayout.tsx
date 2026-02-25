'use client'

import { ReactNode, useState, useEffect } from 'react'
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
  Chip,
  Backdrop,
  CircularProgress,
  Badge,
  Tooltip,
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
  NotificationsActive as NotifIcon,
  SmartToy as AiIcon,
} from '@mui/icons-material'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { menuPermissions } from '@/lib/permissionMap'
import { alpha, useTheme } from '@mui/material/styles'

const expandedDrawerWidth = 260
const collapsedDrawerWidth = 86

// Farm type labels
const farmTypeLabels: Record<string, { herd: string; animal: string; icon: string }> = {
  SHEEP: { herd: 'إدارة الأغنام', animal: 'أغنام', icon: '🐑' },
  CAMEL: { herd: 'إدارة الإبل', animal: 'إبل', icon: '🐪' },
  MIXED: { herd: 'إدارة الحيوانات', animal: 'حيوانات', icon: '🐾' },
}

// تعريف المجموعات - dynamic based on farm type
const getMenuGroups = (farmType?: string) => {
  const labels = farmTypeLabels[farmType || 'SHEEP'] || farmTypeLabels.SHEEP
  return [
  {
    title: 'عام',
    items: [
      { text: 'لوحة التحكم', icon: <DashboardIcon />, href: '/dashboard' },
      { text: 'بحث موحّد', icon: <SearchIcon />, href: '/dashboard/search' },
      { text: 'المساعد الذكي', icon: <AiIcon />, href: '/dashboard/ai' },
      { text: 'التقويم', icon: <CalendarIcon />, href: '/dashboard/calendar' },
    ]
  },
  {
    title: 'القطيع والإنتاج',
    items: [
      { text: labels.herd, icon: <PetsIcon />, href: '/dashboard/goats' },
      { text: 'التكاثر', icon: <BreedingIcon />, href: '/dashboard/breeding' },
      { text: 'السجلات الصحية', icon: <HealthIcon />, href: '/dashboard/health' },
      { text: 'إدارة الحظائر', icon: <PenIcon />, href: '/dashboard/pens' },
    ]
  },
  {
    title: 'الموارد والمالية',
    items: [
      { text: 'الملاك', icon: <UsersIcon />, href: '/dashboard/owners' },
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
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [farmMenuAnchor, setFarmMenuAnchor] = useState<null | HTMLElement>(null)
  const [alertCount, setAlertCount] = useState(0)
  const pathname = usePathname()
  const router = useRouter()
  const { user, can, loading: authLoading, farm, farms, switchFarm, switching } = useAuth()
  const [farmSearch, setFarmSearch] = useState('')
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'))
  const drawerWidth = collapsed ? collapsedDrawerWidth : expandedDrawerWidth

  const menuGroups = getMenuGroups(farm?.farmType)
  const labels = farmTypeLabels[farm?.farmType || 'SHEEP'] || farmTypeLabels.SHEEP

  // Fetch alert count for badge
  useEffect(() => {
    fetch('/api/alerts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAlertCount(data.filter((a: { severity: string }) => a.severity === 'error' || a.severity === 'warning').length)
        }
      })
      .catch(() => {})
  }, [farm?.id])

  // Global auth guard: redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

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
              <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: '1.3rem' }}>{labels.icon}</Avatar>
              <Box>
                <Typography variant="h6" fontWeight="bold" noWrap>
                  {farm?.name || labels.herd}
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
                    {labels.herd}
                  </Typography>
                )}
              </Box>
            </Stack>
          )}
          {collapsed && <Avatar sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontSize: '1.3rem' }}>{labels.icon}</Avatar>}
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
          zIndex: (theme) => theme.zIndex.drawer + 1,
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
            flexWrap: 'nowrap',
            minHeight: 64
          }}
        >
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              display: { xs: 'inline-flex', lg: 'none' },
              ml: 1,
              flexShrink: 0,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="subtitle1"
            noWrap
            component="div"
            sx={{
              flexShrink: 0,
              fontWeight: 'bold',
              display: { xs: 'block', lg: 'none' }
            }}
          >
            وبر وصوف
          </Typography>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{
              flexShrink: 0,
              fontWeight: 'bold',
              display: { xs: 'none', lg: 'block' }
            }}
          >
            {`وبر وصوف — ${labels.herd}`}
          </Typography>
          {(authLoading || can('view_search')) && (
            <Box
              sx={{
                flexGrow: 1,
                display: 'flex',
                justifyContent: 'flex-end'
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
                sx={{ width: { xs: 180, sm: 240, md: 300 }, ml: 1 }}
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
          {/* Notification Bell */}
          <Tooltip title={alertCount > 0 ? `${alertCount} تنبيه عاجل` : 'لا توجد تنبيهات'}>
            <IconButton
              component={Link}
              href="/dashboard"
              sx={{
                ml: 1,
                flexShrink: 0,
                color: alertCount > 0 ? 'warning.main' : 'text.secondary',
              }}
            >
              <Badge
                badgeContent={alertCount}
                color="error"
                max={99}
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.65rem',
                    minWidth: 18,
                    height: 18,
                  }
                }}
              >
                <NotifIcon />
              </Badge>
            </IconButton>
          </Tooltip>
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
            '& .MuiDrawer-paper': {
              width: { xs: '88vw', sm: '72vw', md: '62vw' },
              maxWidth: 360,
              boxSizing: 'border-box',
              position: 'fixed',
              top: '64px',
              height: 'calc(100dvh - 64px)',
              WebkitOverflowScrolling: 'touch',
            },
            '& .MuiBackdrop-root': {
              top: '64px',
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
        <Box sx={{ height: '64px' }} />
        <Box sx={{ width: '100%', maxWidth: '100%', overflowX: 'hidden' }}>{children}</Box>
      </Box>

      {/* Farm Switch Menu */}
      <Menu
        anchorEl={farmMenuAnchor}
        open={Boolean(farmMenuAnchor)}
        onClose={() => { setFarmMenuAnchor(null); setFarmSearch('') }}
        slotProps={{ paper: { sx: { maxHeight: 480, minWidth: 300 } } }}
      >
        {/* Search field for SUPER_ADMIN with many farms */}
        {user?.role === 'SUPER_ADMIN' && farms.length > 5 && (
          <Box sx={{ px: 2, py: 1, position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}>
            <TextField
              placeholder="بحث في المزارع..."
              size="small"
              fullWidth
              value={farmSearch}
              onChange={(e) => setFarmSearch(e.target.value)}
              autoFocus
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
        {(() => {
          const searchTerm = farmSearch.trim().toLowerCase()
          const filteredFarms = searchTerm
            ? farms.filter(f => 
                (f.nameAr || '').toLowerCase().includes(searchTerm) || 
                f.name.toLowerCase().includes(searchTerm) ||
                (f.tenantName || '').toLowerCase().includes(searchTerm)
              )
            : farms

          const getFarmTypeIcon = (type?: string) => {
            const t = farmTypeLabels[type || 'SHEEP'] || farmTypeLabels.SHEEP
            return t.icon
          }

          // Group farms by tenant for SUPER_ADMIN
          if (user?.role === 'SUPER_ADMIN' && filteredFarms.some(f => f.tenantName)) {
            const grouped = filteredFarms.reduce<Record<string, typeof farms>>((acc, f) => {
              const key = f.tenantName || 'غير محدد'
              if (!acc[key]) acc[key] = []
              acc[key].push(f)
              return acc
            }, {})
            const items = Object.entries(grouped).map(([tenantName, tenantFarms]) => [
              <ListSubheader key={`header-${tenantName}`} sx={{ fontWeight: 'bold', lineHeight: '32px', bgcolor: 'grey.100' }}>
                {tenantName}
              </ListSubheader>,
              ...tenantFarms.map((f) => (
                <MenuItem
                  key={f.id}
                  selected={f.id === farm?.id}
                  onClick={() => {
                    setFarmMenuAnchor(null)
                    setFarmSearch('')
                    if (f.id !== farm?.id) switchFarm(f.id)
                  }}
                  sx={{ pr: 4, gap: 1 }}
                >
                  <Typography sx={{ fontSize: '1.2rem', minWidth: 28, textAlign: 'center' }}>{getFarmTypeIcon(f.farmType)}</Typography>
                  <ListItemText>{f.nameAr || f.name}</ListItemText>
                  <Chip label={farmTypeLabels[f.farmType || 'SHEEP']?.animal || 'أغنام'} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
                </MenuItem>
              ))
            ]).flat()
            if (items.length === 0 && searchTerm) {
              return <MenuItem disabled><ListItemText>لا توجد نتائج</ListItemText></MenuItem>
            }
            return items
          }
          // Regular users - flat list
          const items = filteredFarms.map((f) => (
            <MenuItem
              key={f.id}
              selected={f.id === farm?.id}
              onClick={() => {
                setFarmMenuAnchor(null)
                setFarmSearch('')
                if (f.id !== farm?.id) switchFarm(f.id)
              }}
              sx={{ gap: 1 }}
            >
              <Typography sx={{ fontSize: '1.2rem', minWidth: 28, textAlign: 'center' }}>{getFarmTypeIcon(f.farmType)}</Typography>
              <ListItemText>{f.nameAr || f.name}</ListItemText>
              <Chip label={farmTypeLabels[f.farmType || 'SHEEP']?.animal || 'أغنام'} size="small" variant="outlined" sx={{ fontSize: '0.7rem', height: 22 }} />
            </MenuItem>
          ))
          if (items.length === 0 && searchTerm) {
            return <MenuItem disabled><ListItemText>لا توجد نتائج</ListItemText></MenuItem>
          }
          return items
        })()}
      </Menu>

      {/* Loading overlay during farm switch */}
      <Backdrop open={switching} sx={{ zIndex: (theme) => theme.zIndex.modal + 300, bgcolor: 'rgba(255,255,255,0.85)' }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress color="primary" />
          <Typography variant="body1" fontWeight="bold" color="text.primary">جاري تبديل المزرعة...</Typography>
        </Stack>
      </Backdrop>
    </Box>
  )
}
