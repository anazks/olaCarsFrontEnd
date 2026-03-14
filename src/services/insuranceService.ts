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
    provider: string;
    policyNumber: string;
    policyType: PolicyType;
    coverageType: CoverageType;
    startDate: string;
    expiryDate: string;
    insuredValue: number;
    providerContact: ProviderContact;
    status: InsuranceStatus;
    policyDocument?: string;
    vehicles?: string[];
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateInsurancePayload {
    provider: string;
    policyNumber: string;
    policyType: PolicyType;
    coverageType: CoverageType;
    startDate: string;
    expiryDate: string;
    insuredValue: number;
    providerContact: ProviderContact;
}

export const getAllInsurances = async (): Promise<Insurance[]> => {

    const response = await api.get('/api/insurance/');
    console.log(response, 'response');
    return response.data.data;
};

export const getEligibleInsurances = async (): Promise<Insurance[]> => {
    const response = await api.get('/api/insurance/eligible');
    return response.data.data;
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
