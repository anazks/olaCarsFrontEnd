import { Navigate, Outlet } from 'react-router-dom';
import { isTokenValid, getUserRole, hasPermission } from '../utils/auth';
import { API_ROLE_TO_ROUTE } from '../services/authService';

interface ProtectedRouteProps {
    allowedRoles?: string[];
    requiredPermission?: string;
}

const ProtectedRoute = ({ allowedRoles, requiredPermission }: ProtectedRouteProps) => {
    const isAuthenticated = isTokenValid();
    const userRole = getUserRole();

    // 1. Not logged in → go to login
    if (!isAuthenticated) {
        console.log('[ProtectedRoute] ❌ Not authenticated → redirecting to /admin/login');
        return <Navigate to="/admin/login" replace />;
    }

    // 2. Check Permissions (Granular)
    if (requiredPermission && !hasPermission(requiredPermission)) {
        console.log(`[ProtectedRoute] ❌ Lacks required permission: ${requiredPermission}`);
        const ownRoute = (userRole && API_ROLE_TO_ROUTE[userRole]) ?? '/admin/login';
        return <Navigate to={ownRoute} replace />;
    }

    // 3. Check Roles (Legacy/Fallback)
    if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
        const ownRoute = API_ROLE_TO_ROUTE[userRole] ?? '/admin/login';
        console.log(`[ProtectedRoute] ❌ Wrong role (${userRole} not in [${allowedRoles}]) → ${ownRoute}`);
        return <Navigate to={ownRoute} replace />;
    }

    // 4. Authorised — render the protected content
    return <Outlet />;
};

export default ProtectedRoute;
