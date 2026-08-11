import { Navigate, Outlet, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { isTokenValid, getUserRole, hasPermission } from '../utils/auth';
import { getUserBaseRoute } from '../utils/routeUtils';

interface ProtectedRouteProps {
    allowedRoles?: string[];
    requiredPermission?: string;
}

const ProtectedRoute = ({ allowedRoles, requiredPermission }: ProtectedRouteProps) => {
    const isAuthenticated = isTokenValid();
    const userRole = getUserRole();
    const location = useLocation();

    // 1. Not logged in → go to login with target location preserved
    if (!isAuthenticated) {
        console.log('[ProtectedRoute] ❌ Not authenticated → redirecting to /admin/login');
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    const normalizedRole = userRole ? userRole.toLowerCase() : null;

    // 2. Check Permissions (Granular)
    if (requiredPermission && !hasPermission(requiredPermission)) {
        console.log(`[ProtectedRoute] ❌ Lacks required permission: ${requiredPermission}`);
        toast.error('Page not accessible', { id: 'page-not-accessible' });
        const ownRoute = getUserBaseRoute(normalizedRole);
        return <Navigate to={ownRoute} replace />;
    }

    // 3. Check Roles (Legacy/Fallback)
    if (allowedRoles && normalizedRole && !allowedRoles.includes(normalizedRole)) {
        console.log(`[ProtectedRoute] ❌ Wrong role (${normalizedRole} not in [${allowedRoles}])`);
        toast.error('Page not accessible', { id: 'page-not-accessible' });
        const ownRoute = getUserBaseRoute(normalizedRole);
        return <Navigate to={ownRoute} replace />;
    }

    // 4. Authorised — render the protected content
    return <Outlet />;
};

export default ProtectedRoute;

