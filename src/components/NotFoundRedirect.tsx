import { Navigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { isTokenValid, getUserRole } from '../utils/auth';
import { resolveTargetRouteForRole, getUserBaseRoute } from '../utils/routeUtils';

/**
 * NotFoundRedirect:
 * Handled when a route is not matched by any explicit route handler.
 * - If unauthenticated: redirects to /admin/login preserving location state
 * - If authenticated: attempts to resolve path to user's role prefix
 *   - If adapted path differs from current path: navigates to adapted path
 *   - If adapted path is already current path: displays "Page not accessible" toast and redirects to base dashboard
 */
const NotFoundRedirect = () => {
  const isAuthenticated = isTokenValid();
  const userRole = getUserRole();
  const location = useLocation();

  if (!isAuthenticated) {
    console.log('[NotFoundRedirect] Unauthenticated request for', location.pathname, '→ preserving location in login redirect');
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  const baseRoute = getUserBaseRoute(userRole);
  const fullTarget = location.pathname + (location.search || '') + (location.hash || '');
  const adaptedRoute = resolveTargetRouteForRole(fullTarget, userRole);

  if (adaptedRoute !== location.pathname) {
    console.log(`[NotFoundRedirect] Resolving short/generic link ${location.pathname} → ${adaptedRoute}`);
    return <Navigate to={adaptedRoute} replace />;
  }

  // Route genuinely doesn't exist under user's role
  console.log(`[NotFoundRedirect] Route inaccessible: ${location.pathname} → redirecting to ${baseRoute}`);
  toast.error("Page not accessible", { id: "page-not-accessible" });
  return <Navigate to={baseRoute} replace />;
};

export default NotFoundRedirect;
