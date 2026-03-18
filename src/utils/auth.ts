import { jwtDecode } from 'jwt-decode';

export interface DecodedToken {
    id?: string;
    email?: string;
    role: string;
    exp?: number;
    iat?: number;
    [key: string]: any; // allow any extra fields the API may send
}

export const ROLE_LEVELS: Record<string, number> = {
    'operationstaff': 1,
    'financestaff': 1,
    'workshopstaff': 1,
    'branchmanager': 2,
    'countrymanager': 3,
    'operationadmin': 4,
    'financeadmin': 4,
    'admin': 5
};

export const getToken = (): string | null => {
    return localStorage.getItem('token');
};

export const setToken = (token: string): void => {
    localStorage.setItem('token', token);
};

export const removeToken = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};

export const logout = (): void => {
    removeToken();
    // Use window.location.href for a hard redirect to clear all states
    if (window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
    }
};

export const setUser = (user: any): void => {
    localStorage.setItem('user', JSON.stringify(user));
};

export const getUser = (): any | null => {
    const user = localStorage.getItem('user');
    console.log(user, 'user');
    try {
        return user ? JSON.parse(user) : null;
    } catch (e) {
        return null;
    }
};

export const getDecodedToken = (): DecodedToken | null => {
    const token = getToken();
    if (!token) return null;

    try {
        const decoded = jwtDecode<DecodedToken>(token);
        // Debug: log decoded payload so we can see the exact role field name
        // console.log('[auth] decoded JWT payload:', decoded);
        return decoded;
    } catch (error) {
        console.error('[auth] Invalid token format:', error);
        return null;
    }
};

export const isTokenValid = (): boolean => {
    const decoded = getDecodedToken();
    if (!decoded) return false;

    // Only check expiry if the JWT actually contains an 'exp' field
    if (decoded.exp) {
        const currentTime = Date.now() / 1000; // exp is in seconds
        if (decoded.exp < currentTime) {
            console.warn('[auth] Token has expired');
            return false;
        }
    }

    // Token exists and is decodable (exp absent or still valid)
    return true;
};

export const getUserRole = (): string | null => {
    const decoded = getDecodedToken();
    // Handle both 'role' and 'roles' fields, always normalize to lowercase
    const role = decoded?.role ?? decoded?.roles ?? null;
    const normalized = typeof role === 'string' ? role.toLowerCase() : null;
    console.log('[auth] userRole from JWT:', role, '→ normalized:', normalized);
    return normalized;
};

