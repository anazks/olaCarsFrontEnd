import api from './api';

export interface ScrapItem {
    _id: string;
    partName: string;
    partNumber?: string;
    quantity: number;
    description?: string;
    status: 'PENDING_DISPOSAL' | 'DISPOSED' | 'RECYCLED' | 'PENDING_SALE_APPROVAL' | 'REJECTED';
    type: 'Valuable' | 'Non Valuable';
    scrappedBy: string;
    scrappedDate: string;
    currentAmount?: number;
    buyerName?: string;
    saleApproved?: boolean;
    rejectionNote?: string;
    createdAt: string;
    updatedAt: string;
}

export const getScrapItems = async (params: { status?: string; search?: string; type?: string } = {}) => {
    const response = await api.get('/api/scrap', { params });
    return response.data.data || response.data;
};

export const updateScrapItem = async (id: string, data: { currentAmount?: number; buyerName?: string; status?: 'PENDING_DISPOSAL' | 'DISPOSED' | 'RECYCLED' | 'PENDING_SALE_APPROVAL' | 'REJECTED'; saleApproved?: boolean; rejectionNote?: string }) => {
    const response = await api.put(`/api/scrap/${id}`, data);
    return response.data.data || response.data;
};

export const deleteScrapItem = async (id: string) => {
    const response = await api.delete(`/api/scrap/${id}`);
    return response.data;
};
