import api from './api';

export type PolicyType = 'FLEET' | 'INDIVIDUAL';
export type CoverageType = 'THIRD_PARTY' | 'COMPREHENSIVE';
export type InsuranceStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface ProviderContact {
    name: string;
    phone: string;
    email: string;
}

export interface Insurance {
    _id: string;
    supplier?: { 
        _id: string; 
        name: string;
        email?: string;
        phone?: string;
    } | string;
    provider?: string;
    policyNumber?: string;
    policyType: PolicyType;
    coverageType: CoverageType;
    providerContact?: ProviderContact;
    status: InsuranceStatus;
    documents?: {
        policyDocumentUrl?: string;
    };
    country?: string;
    insuredValue?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateInsurancePayload {
    supplier: string;
    country: string;
    policyType: PolicyType;
    coverageType: CoverageType;
    insuredValue?: number;
}

export interface VehiclePolicy {
    _id: string;
    vehicle: any;
    insurance: Insurance;
    policyNumber?: string;
    startDate?: string;
    expiryDate?: string;
    insuredValue?: number;
    certificate?: string;
    status: InsuranceStatus;
    country?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateVehiclePolicyPayload {
    vehicle: string;
    insurance: string;
    policyNumber?: string;
    startDate?: string;
    expiryDate?: string;
    insuredValue?: number;
}

export interface PaginationMetadata {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: PaginationMetadata;
}

export interface InsuranceFilters {
    page?: number;
    limit?: number;
    search?: string;
    status?: InsuranceStatus;
    policyType?: PolicyType;
    coverageType?: CoverageType;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export const getAllInsurances = async (filters: InsuranceFilters = {}): Promise<PaginatedResponse<Insurance>> => {
    const response = await api.get('/api/insurance/', {
        params: filters
    });
    return response.data;
};

export const getEligibleInsurances = async (filters: InsuranceFilters = {}): Promise<PaginatedResponse<Insurance>> => {
    const response = await api.get('/api/insurance/eligible', {
        params: filters
    });
    return response.data;
};

export const getInsuranceById = async (id: string): Promise<Insurance> => {
    const response = await api.get(`/api/insurance/${id}`);
    return response.data.data;
};

export const createInsurance = async (formData: FormData): Promise<Insurance> => {
    const response = await api.post('/api/insurance/', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data.data;
};

export const updateInsurance = async (id: string, payload: Partial<CreateInsurancePayload>): Promise<Insurance> => {
    const response = await api.put(`/api/insurance/${id}`, payload);
    return response.data.data;
};

export const deleteInsurance = async (id: string): Promise<void> => {
    await api.delete(`/api/insurance/${id}`);
};

export const uploadInsuranceDocument = async (id: string, file: File): Promise<Insurance> => {
    const formData = new FormData();
    formData.append('policyDocument', file);
    const response = await api.post(`/api/insurance/${id}/upload-document`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data.data;
};

// Vehicle Policy APIs

export const getAllVehiclePolicies = async (filters: any = {}): Promise<PaginatedResponse<VehiclePolicy>> => {
    const response = await api.get('/api/vehicle-policy/', { params: filters });
    return response.data;
};

export const getVehiclePoliciesByVehicleId = async (vehicleId: string): Promise<VehiclePolicy[]> => {
    const response = await api.get(`/api/vehicle-policy/vehicle/${vehicleId}`);
    return response.data.data;
};

export const createVehiclePolicy = async (formData: FormData): Promise<VehiclePolicy> => {
    const response = await api.post('/api/vehicle-policy/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data;
};

export const updateVehiclePolicy = async (id: string, payload: Partial<CreateVehiclePolicyPayload>): Promise<VehiclePolicy> => {
    const response = await api.put(`/api/vehicle-policy/${id}`, payload);
    return response.data.data;
};

export const deleteVehiclePolicy = async (id: string): Promise<void> => {
    await api.delete(`/api/vehicle-policy/${id}`);
};

export const getVehiclePolicyById = async (id: string): Promise<VehiclePolicy> => {
    const response = await api.get(`/api/vehicle-policy/${id}`);
    return response.data.data;
};
 
