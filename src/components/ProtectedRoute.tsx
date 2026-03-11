import { Navigate, Outlet } from 'react-router-dom';
import { isTokenValid, getUserRole, getToken } from '../utils/auth';
import { API_ROLE_TO_ROUTE } from '../services/authService';

interface ProtectedRouteProps {
    allowedRoles?: string[];
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
    const token = getToken();
    const isAuthenticated = isTokenValid();
    const userRole = getUserRole();

    console.log('[ProtectedRoute]', {
        hasToken: !!token,
        isAuthenticated,
        userRole,
        allowedRoles,
        match: allowedRoles ? allowedRoles.includes(userRole ?? '') : 'no role check',
    });

    // 1. Not logged in → go to login
    if (!isAuthenticated) {
        console.log('[ProtectedRoute] ❌ Not authenticated → redirecting to /admin/login');
        return <Navigate to="/admin/login" replace />;
    }

    // 2. Logged in but wrong role → redirect to their own dashboard
    if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
        const ownRoute = API_ROLE_TO_ROUTE[userRole] ?? '/admin/login';
        console.log(`[ProtectedRoute] ❌ Wrong role (${userRole} not in [${allowedRoles}]) → ${ownRoute}`);
        return <Navigate to={ownRoute} replace />;
    }

    // 3. Authorised — render the protected content
    // console.log('[ProtectedRoute] ✅ Authorised — rendering Outlet');
    return <Outlet />;
};

export default ProtectedRoute;
