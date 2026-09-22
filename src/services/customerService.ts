import api from './api';

export interface Customer {
    _id: string;
    customerId: string;
    driver?: {
        _id: string;
        driverId?: string;
        status?: string;
        activationDate?: string;
        deactivationDate?: string;
        activation?: {
            activatedDate?: string;
        };
        personalInfo?: {
            fullName?: string;
            email?: string;
            phone?: string;
        };
        emergencyContact?: {
            name?: string;
            relationship?: string;
            phone?: string;
        };
        weeklyRent?: number;
        currentVehicle?: {
            _id?: string;
            basicDetails?: {
                make?: string;
                model?: string;
                year?: number;
                vin?: string;
                fleetNumber?: string;
                colour?: string;
                weeklyRent?: number;
            };
            legalDocs?: {
                registrationNumber?: string;
            };
            fleet?: {
                _id?: string;
                fleetNumber?: string;
                status?: string;
            };
            plateNumber?: string;
            status?: string;
        };
        rentChangeHistory?: Array<{
            _id?: string;
            previousWeeklyRent?: number;
            newWeeklyRent: number;
            effectiveDate?: string;
            remark: string;
            vehicle?: string;
            vehicleRegistrationNumber?: string;
            vehicleModel?: string;
            fleetNumber?: string;
            vin?: string;
            changedBy?: string;
            changedByName?: string;
            changedByRole?: string;
            createdAt?: string;
        }>;
        rentTracking?: any[];
    };
    name: string;
    email?: string;
    phone?: string;
    whatsappNumber?: string;
    branch: {
        _id: string;
        name: string;
        country?: string;
        city?: string;
    };
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    cfFleetNo?: string;
    cfActiveDate?: string;
    cfVehicleNo?: string;
    cfEndDate?: string;
    cfSection?: string;
    cfWeeklyRent?: number | string;
    cfVehicleModel?: string;
    cfVinNumber?: string;
    status: 'ACTIVE' | 'INACTIVE';
    isDeleted: boolean;
    createdAt: string;
}

export interface CreateCustomerPayload {
    name: string;
    email?: string;
    phone?: string;
    whatsappNumber?: string;
    branch: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    status?: 'ACTIVE' | 'INACTIVE';
}

export const getAllCustomers = async (params: any = {}) => {
    const res = await api.get('/api/customers', { 
        params,
        headers: { 'X-Skip-Toast': 'true' } 
    });
    return res.data;
};

export const getCustomerById = async (id: string) => {
    const res = await api.get(`/api/customers/${id}`);
    return res.data;
};

export const createCustomer = async (payload: CreateCustomerPayload) => {
    const res = await api.post('/api/customers', payload);
    return res.data;
};

export const updateCustomer = async (id: string, payload: any) => {
    const res = await api.put(`/api/customers/${id}`, payload);
    return res.data;
};

export const deleteCustomer = async (id: string) => {
    const res = await api.delete(`/api/customers/${id}`);
    return res.data;
};

export interface BulkCustomerUploadResult {
    created: Array<{ row: number; id: string; customerId: string; name: string; driver?: any; vehicle?: any }>;
    errors: Array<{ row: number; message: string }>;
    warnings: Array<{ row: number; message: string }>;
}

export const bulkCreateCustomers = async (customers: any[], branch?: string): Promise<{ message: string; data: BulkCustomerUploadResult }> => {
    const response = await api.post('/api/customers/bulk', { customers, branch });
    return response.data;
};

export const updateCustomerWeeklyRent = async (id: string, payload: { weeklyRent: number; remark: string; effectiveDate?: string }) => {
    const res = await api.put(`/api/customers/${id}/weekly-rent`, payload);
    return res.data;
};
