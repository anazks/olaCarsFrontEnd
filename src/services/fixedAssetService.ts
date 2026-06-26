import api from './api';

export type FixedAssetStatus = 'Draft' | 'Pending' | 'Active' | 'Inactive';
export type DepreciationInterval = 'Monthly' | 'Yearly';

export interface FixedAssetType {
    _id: string;
    name: string;
    description?: string;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

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
    fixedAssetType?: string | FixedAssetType;
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

export const getAllFixedAssets = async (params: { status?: string; search?: string; page?: number; limit?: number } = {}): Promise<any> => {
    const response = await api.get('/api/fixed-assets', { params });
    if (params.page || params.limit) {
        return response.data;
    }
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

// Fixed Asset Type APIs
export const getFixedAssetTypes = async (params: { isActive?: boolean | string } = {}): Promise<FixedAssetType[]> => {
    const response = await api.get('/api/fixed-asset-types', { params });
    return response.data.data;
};

export const createFixedAssetType = async (payload: { name: string; description?: string; isActive?: boolean }): Promise<FixedAssetType> => {
    const response = await api.post('/api/fixed-asset-types', payload);
    return response.data.data;
};

export const updateFixedAssetType = async (id: string, payload: { name?: string; description?: string; isActive?: boolean }): Promise<FixedAssetType> => {
    const response = await api.put(`/api/fixed-asset-types/${id}`, payload);
    return response.data.data;
};

export const deleteFixedAssetType = async (id: string): Promise<void> => {
    await api.delete(`/api/fixed-asset-types/${id}`);
};

export interface BulkUploadFixedAssetResponse {
    success: boolean;
    message: string;
    data: {
        created: FixedAsset[];
        duplicates: Array<{ row: number; code: string; name: string }>;
        errors: Array<{ row: number; reason: string; code?: string; name?: string }>;
    };
}

export const bulkUploadFixedAssets = async (assets: any[]): Promise<BulkUploadFixedAssetResponse> => {
    const response = await api.post('/api/fixed-assets/bulk', { assets });
    return response.data;
};
