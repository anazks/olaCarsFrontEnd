import { API_ROLE_TO_ROUTE } from '../services/authService';

/**
 * All known role route prefixes across the application.
 */
export const ALL_ROLE_PREFIXES: string[] = [
  '/admin/admin',
  '/admin/operational-admin',
  '/admin/financial-admin',
  '/admin/country-manager',
  '/admin/branch-manager',
  '/admin/branch-op-staff',
  '/admin/branch-fin-staff',
  '/admin/driver',
];

/**
 * Maps a JWT or API user role to its base dashboard route.
 * e.g., 'financialadmin' | 'financeadmin' -> '/admin/financial-admin'
 */
export const getUserBaseRoute = (userRole: string | null): string => {
  if (!userRole) return '/admin/login';
  const route = API_ROLE_TO_ROUTE[userRole.toLowerCase()];
  return route || '/admin/login';
};

/**
 * Normalizes and converts any target path (which may contain another role's prefix or no prefix at all)
 * into a path prefixed with the current user's active role.
 * 
 * Examples:
 * targetPath: '/admin/financial-admin/purchase-orders/66f123'
 * userRole: 'branchmanager' (base route: '/admin/branch-manager')
 * Output: '/admin/branch-manager/purchase-orders/66f123'
 * 
 * targetPath: '/purchase-orders/66f123'
 * userRole: 'admin' (base route: '/admin/admin')
 * Output: '/admin/admin/purchase-orders/66f123'
 */
export const resolveTargetRouteForRole = (targetPath: string, userRole: string | null): string => {
  const baseRoute = getUserBaseRoute(userRole);
  if (baseRoute === '/admin/login') return '/admin/login';

  if (!targetPath || targetPath === '/' || targetPath === '/admin/login') {
    return baseRoute;
  }

  // If targetPath is already prefixed with the user's base route, return as is
  if (targetPath.startsWith(baseRoute + '/') || targetPath === baseRoute) {
    return targetPath;
  }

  let subpath = targetPath;
  // Check if targetPath starts with any existing role prefix
  for (const prefix of ALL_ROLE_PREFIXES) {
    if (targetPath === prefix) {
      return baseRoute;
    }
    if (targetPath.startsWith(prefix + '/')) {
      subpath = targetPath.slice(prefix.length);
      break;
    }
  }

  // Ensure subpath starts with a single slash
  if (!subpath.startsWith('/')) {
    subpath = '/' + subpath;
  }

  return `${baseRoute}${subpath}`;
};
