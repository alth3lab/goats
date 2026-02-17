export const menuPermissions: Record<string, string | undefined> = {
  '/dashboard': undefined,
  '/dashboard/goats': 'view_goats',
  '/dashboard/pens': 'view_pens',
  '/dashboard/health': 'view_health',
  '/dashboard/breeding': 'view_breeding',
  '/dashboard/sales': 'view_sales',
  '/dashboard/types': 'view_types',
  '/dashboard/users': 'view_users',
  '/dashboard/expenses': 'view_expenses',
  '/dashboard/reports': 'view_reports',
  '/dashboard/activities': 'view_activities',
  '/dashboard/search': 'view_search',
  '/dashboard/settings': 'view_settings',
  '/dashboard/admin': '__super_admin__',
  '/dashboard/billing': undefined,
  '/dashboard/farms': undefined,
  '/dashboard/team': undefined,
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
