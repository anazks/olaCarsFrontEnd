import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { isTokenValid, getUserRole } from '../utils/auth';
import { resolveTargetRouteForRole, getUserBaseRoute, ALL_ROLE_PREFIXES } from '../utils/routeUtils';

/**
 * CrossRoleRouteGuard:
 * Listens to location changes when a logged-in user visits a route.
 * If they visit a route prefixed with another role (e.g. /admin/financial-admin/purchase-orders/123 when user is branchmanager),
 * it automatically converts the path to their own active role prefix (/admin/branch-manager/purchase-orders/123).
 */
const CrossRoleRouteGuard = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isTokenValid()) return;

    const userRole = getUserRole();
    const baseRoute = getUserBaseRoute(userRole);
    if (baseRoute === '/admin/login') return;

    const currentPath = location.pathname;

    // Check if current route starts with a role prefix that belongs to ANOTHER role
    const isOtherRolePrefix = ALL_ROLE_PREFIXES.some(prefix =>
      prefix !== baseRoute && (currentPath === prefix || currentPath.startsWith(prefix + '/'))
    );

    if (isOtherRolePrefix) {
      const fullTarget = currentPath + (location.search || '') + (location.hash || '');
      const adaptedRoute = resolveTargetRouteForRole(fullTarget, userRole);
      if (adaptedRoute !== currentPath) {
        console.log(`[CrossRoleRouteGuard] Adapting cross-role route ${currentPath} → ${adaptedRoute}`);
        navigate(adaptedRoute, { replace: true });
      }
    }
  }, [location.pathname, location.search, location.hash, navigate]);

  return <>{children}</>;
};

export default CrossRoleRouteGuard;
