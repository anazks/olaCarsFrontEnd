import api from './api';

export type FixedAssetStatus = 'Draft' | 'Pending' | 'Active' | 'Inactive';
export type DepreciationInterval = 'Monthly' | 'Yearly';

export interface DepreciationScheduleEntry {
    _id?: string;
    periodIndex: number;
    periodDate: string;
    depreciationAmount: number;
    accumulatedDepreciation: number;
    bookValue: number;
    status: 'Pending' | 'Posted';
    ledgerEntry?: string;
    postedDate?: string;
}

export interface FixedAsset {
    _id: string;
    name: string;
    code: string;
    purchaseDate: string;
    purchasePrice: number;
    residualValue: number;
    usefulLifeYears: number;
    location?: string;
    purchaseQuantity?: number;
    serialNumber?: string;
    currentQuantity?: number;
    currentValue?: number;
    disposalValue?: number;
    warrantyExpirationDate?: string;
    fixedAssetType?: string;
    computationType?: string;
    depreciationStartDate?: string;
    assetLife?: number;
    assetLifeUnit?: 'Months' | 'Years';
    notes?: string;
    description?: string;
    depreciationMethod: 'Straight-Line';
    depreciationInterval: DepreciationInterval;
    status: FixedAssetStatus;
    fixedAssetAccount: string | { _id: string; code: string; name: string };
    accumulatedDepreciationAccount: string | { _id: string; code: string; name: string };
    depreciationExpenseAccount: string | { _id: string; code: string; name: string };
    originalBill?: string | { _id: string; billNumber: string };
    originalPO?: string | { _id: string; purchaseOrderNumber: string };
    linkedVehicle?: string | {
        _id: string;
        basicDetails?: { make?: string; model?: string; year?: number };
        legalDocs?: { registrationNumber?: string };
    };
    depreciationSchedule: DepreciationScheduleEntry[];
    createdBy: string;
    creatorRole: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateFixedAssetPayload {
    name: string;
    code?: string;
    purchaseDate: string;
    purchasePrice: number;
    residualValue?: number;
    usefulLifeYears: number;
    location?: string;
    purchaseQuantity?: number;
    serialNumber?: string;
    currentQuantity?: number;
    currentValue?: number;
    disposalValue?: number;
    warrantyExpirationDate?: string;
    fixedAssetType?: string;
    computationType?: string;
    depreciationStartDate?: string;
    assetLife?: number;
    assetLifeUnit?: 'Months' | 'Years';
    notes?: string;
    depreciationMethod: 'Straight-Line';
    depreciationInterval: DepreciationInterval;
    status?: FixedAssetStatus;
    fixedAssetAccount: string;
    accumulatedDepreciationAccount: string;
    depreciationExpenseAccount: string;
    linkedVehicle?: string;
    originalBill?: string;
}

export interface DepreciationPreviewPayload {
    purchasePrice: number;
    residualValue: number;
    usefulLifeYears: number;
    depreciationInterval: DepreciationInterval;
    purchaseDate: string;
    purchaseValue?: number;
    disposalValue?: number;
    depreciationStartDate?: string;
    assetLife?: number;
    assetLifeUnit?: 'Months' | 'Years';
}

export const getAllFixedAssets = async (params: { status?: string; search?: string } = {}): Promise<FixedAsset[]> => {
    const response = await api.get('/api/fixed-assets', { params });
    return response.data.data;
};

export const getFixedAssetById = async (id: string): Promise<FixedAsset> => {
    const response = await api.get(`/api/fixed-assets/${id}`);
    return response.data.data;
};

export const createFixedAsset = async (payload: CreateFixedAssetPayload): Promise<FixedAsset> => {
    const response = await api.post('/api/fixed-assets', payload);
    return response.data.data;
};

export const updateFixedAsset = async (id: string, payload: Partial<CreateFixedAssetPayload> & { status?: FixedAssetStatus }): Promise<FixedAsset> => {
    const response = await api.put(`/api/fixed-assets/${id}`, payload);
    return response.data.data;
};

export const deleteFixedAsset = async (id: string): Promise<void> => {
    await api.delete(`/api/fixed-assets/${id}`);
};

export const calculateDepreciationPreview = async (payload: DepreciationPreviewPayload): Promise<DepreciationScheduleEntry[]> => {
    const response = await api.post('/api/fixed-assets/calculate-depreciation-schedule', payload);
    return response.data.data;
};

export const postDepreciationEntry = async (id: string, periodIndex: number): Promise<FixedAsset> => {
    const response = await api.post(`/api/fixed-assets/${id}/post-depreciation`, { periodIndex });
    return response.data.data;
};
