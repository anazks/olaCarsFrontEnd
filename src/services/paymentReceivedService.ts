import api from './api';

export const bulkUploadPayments = async (payload: { rows: any[] }) => {
    const response = await api.post('/api/payments-received/bulk-upload', payload);
    return response.data;
};
