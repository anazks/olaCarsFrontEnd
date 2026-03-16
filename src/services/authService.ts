import api from './api';

/**
 * Each staff role maps to its own login endpoint.
 * Pattern: /{roleName}/login  (e.g. /branchmanager/login)
 */
export const ROLE_ENDPOINTS: Record<string, string> = {
    'admin': 'api/admin/login',
    'operationaladmin': 'api/operational-admin/login',
    'financialadmin': 'api/financial-admin/login',
    'countrymanager': 'api/country-manager/login',
    'branchmanager': 'api/branch-manager/login',
    'branchopstaff': 'api/operation-staff/login',
    'branchfinstaff': 'api/finance-staff/login',
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
};

/**
 * Maps the JWT role value (from API) back to the UI route segment.
 * e.g. 'branchmanager' → '/admin/branch-manager'
 */
export const API_ROLE_TO_ROUTE: Record<string, string> = {
    'admin': '/admin/admin',
    'operationaladmin': '/admin/operational-admin',
    'financialadmin': '/admin/financial-admin',
    'countrymanager': '/admin/country-manager',
    'branchmanager': '/admin/branch-manager',
    'branchopstaff': '/admin/branch-op-staff',
    'branchfinstaff': '/admin/branch-fin-staff',
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

export const changePassword = async (userId: string, data: any) => {
    return await api.post(`api/user/${userId}/change-password`, data);
};

export const updateUserProfile = async (data: any) => {
    return await api.put('api/user/update', data);
};
