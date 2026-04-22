import api from './api';

/**
 * Each staff role maps to its own login endpoint.
 * Pattern: /{roleName}/login  (e.g. /branchmanager/login)
 */
export const ROLE_ENDPOINTS: Record<string, string> = {
    'admin': 'api/admin/login',
    'operationaladmin': 'api/operational-admin/login',
    'financialadmin': 'api/finance-admin/login',
    'countrymanager': 'api/country-manager/login',
    'branchmanager': 'api/branch-manager/login',
    'branchopstaff': 'api/operation-staff/login',
    'branchfinstaff': 'api/finance-staff/login',
    'workshopmanager': 'api/workshop-manager/login',
    'workshopstaff': 'api/workshop-staff/login',
};

/**
 * Endpoint mapping for refreshing tokens by role.
 * Note the difference in naming patterns (/refresh vs /refresh-token)
 */
export const REFRESH_ENDPOINTS: Record<string, string> = {
    'admin': 'api/admin/refresh',
    'operationaladmin': 'api/operational-admin/refresh',
    'financialadmin': 'api/finance-admin/refresh',
    'countrymanager': 'api/country-manager/refresh',
    'branchmanager': 'api/branch-manager/refresh',
    'branchopstaff': 'api/operation-staff/refresh-token',
    'branchfinstaff': 'api/finance-staff/refresh',
    'workshopmanager': 'api/workshop-manager/refresh-token',
    'workshopstaff': 'api/workshop-staff/refresh-token',
};


/**
 * Maps the friendly UI role key (used in dropdown & route)
 * to the API role slug (used in the endpoint and JWT).
 */
export const UI_ROLE_TO_API_ROLE: Record<string, string> = {
    'admin': 'admin',
    'operational-admin': 'operationaladmin',
    'financial-admin': 'financialadmin',
    'country-manager': 'countrymanager',
    'branch-manager': 'branchmanager',
    'branch-op-staff': 'branchopstaff',
    'branch-fin-staff': 'branchfinstaff',
    'workshop-manager': 'workshopmanager',
    'workshop-staff': 'workshopstaff',
};

/**
 * Maps the JWT role value (from API) back to the UI route segment.
 * e.g. 'branchmanager' → '/admin/branch-manager'
 */
export const API_ROLE_TO_ROUTE: Record<string, string> = {
    'admin': '/admin/admin',
    'operationaladmin': '/admin/operational-admin',
    'operationadmin': '/admin/operational-admin',
    'financialadmin': '/admin/financial-admin',
    'financeadmin': '/admin/financial-admin',
    'countrymanager': '/admin/country-manager',
    'branchmanager': '/admin/branch-manager',
    'branchopstaff': '/admin/branch-op-staff',
    'operationstaff': '/admin/branch-op-staff',
    'branchfinstaff': '/admin/branch-fin-staff',
    'financestaff': '/admin/branch-fin-staff',
    'driver': '/admin/driver',
};

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    role?: string;
    message?: string;
    [key: string]: any; // allow any extra fields
}

/**
 * Login for a given UI role (e.g. 'branch-manager').
 * Calls the role-specific endpoint and returns the raw response data.
 */
export const loginByRole = async (
    uiRole: string,
    credentials: LoginCredentials
): Promise<LoginResponse> => {
    const apiRole = UI_ROLE_TO_API_ROLE[uiRole];
    if (!apiRole) throw new Error(`Unknown role: ${uiRole}`);

    const endpoint = ROLE_ENDPOINTS[apiRole];
    const response = await api.post<LoginResponse>(endpoint, credentials);

    console.log(response, 'res');


    // Normalise: some APIs return 'token', others return 'accessToken'
    const data = response.data;
    const token = data.token || data.accessToken || data.access_token || data.jwt;

    if (!token) {
        throw new Error('No token found in the server response.');
    }

    return { ...data, token };
};

export const refreshTokens = async (apiRole: string, refreshToken: string): Promise<{ accessToken: string, refreshToken: string }> => {
    const endpoint = REFRESH_ENDPOINTS[apiRole];
    if (!endpoint) throw new Error(`No refresh endpoint for role: ${apiRole}`);

    // We use axios directly or a separate instance if possible to avoid interceptor recursion, 
    // but for now, we'll let api.ts handle the logic or provide a way to skip interceptor.
    // Actually, calling it through 'api' is fine as long as we handle it in api.ts interceptor 
    // to NOT retry the refresh call itself.
    const response = await api.post(endpoint, { refreshToken }, { 
        // @ts-ignore
        skipToast: true,
        headers: { 'X-Skip-Interceptor': 'true' } 
    });
    
    return {
        accessToken: response.data.accessToken || response.data.token,
        refreshToken: response.data.refreshToken
    };
};

export const changePassword = async (userId: string, data: any) => {

    return await api.post(`api/user/${userId}/change-password`, data);
};

export const updateUserProfile = async (data: any) => {
    return await api.put('api/user/update', data);
};

export const getProfile = async () => {
    return await api.get('api/user/profile', {
        headers: { 'X-Skip-Toast': 'true' } // Silent refresh should not show toasts
    });
};
