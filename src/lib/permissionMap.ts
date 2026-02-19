export const menuPermissions: Record<string, string | undefined> = {
  '/dashboard': undefined,
  '/dashboard/goats': 'view_goats',
  '/dashboard/camels': 'view_camels',
  '/dashboard/pens': 'view_pens',
  '/dashboard/health': 'view_health',
  '/dashboard/breeding': 'view_breeding',
  '/dashboard/sales': 'view_sales',
  '/dashboard/types': 'view_types',
  '/dashboard/users': '__owner_admin__',
  '/dashboard/expenses': 'view_expenses',
  '/dashboard/reports': 'view_reports',
  '/dashboard/activities': 'view_activities',
  '/dashboard/search': 'view_search',
  '/dashboard/settings': '__owner_admin__',
  '/dashboard/calendar': 'view_calendar',
  '/dashboard/inventory': 'view_inventory',
  '/dashboard/feeds': 'view_feeds',
  '/dashboard/admin': '__super_admin__',
  '/dashboard/billing': '__owner__',
  '/dashboard/farms': '__owner__',
  '/dashboard/team': '__owner__',
}

export const actionPermissions = {
  addUser: 'add_user',
  manageUserPermissions: 'manage_permissions',
  addType: 'add_type',
  editType: 'edit_type',
  deleteType: 'delete_type',
  addBreed: 'add_breed',
  editBreed: 'edit_breed',
  deleteBreed: 'delete_breed'
}
