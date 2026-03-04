export type Role = 'admin' | 'events' | 'users' | 'analytics' | 'forms' | 'all';

export interface UserPermissions
{
  canAccessDashboard: boolean;
  canAccessEvents: boolean;
  canAccessUsers: boolean;
  canAccessAnalytics: boolean;
  canAccessForms: boolean;
}

/**
 * Check if user has a specific role or 'all' role
 */
export function hasRole(userRoles: string[] | undefined, requiredRole: Role): boolean
{
  if (!userRoles || userRoles.length === 0)
  {
    return false;
  }

  // 'admin' and 'all' roles have access to everything
  if (userRoles.includes('all'))
  {
    return true;
  }

  // Check if user has the specific required role
  return userRoles.includes(requiredRole);
}

/**
 * Get all permissions for a user based on their roles
 */
export function getUserPermissions(userRoles: string[] | undefined): UserPermissions
{
  const hasAdminOrAll = userRoles?.includes('admin') || userRoles?.includes('all');

  return {
    canAccessDashboard: hasAdminOrAll || userRoles?.includes('admin') || false,
    canAccessEvents: hasAdminOrAll || userRoles?.includes('events') || false,
    canAccessUsers: hasAdminOrAll || userRoles?.includes('users') || false,
    canAccessAnalytics: hasAdminOrAll || userRoles?.includes('analytics') || false,
    canAccessForms: hasAdminOrAll || userRoles?.includes('forms') || false,
  };
}
