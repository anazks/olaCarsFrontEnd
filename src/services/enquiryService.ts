import api from './api';

export const getAllEnquiries = async (params: any = {}) => {
    const response = await api.get('/api/enquiries/list', { params });
    return response.data;
};

export const updateEnquiryStatus = async (id: string, data: { status: string; response?: string }) => {
    const response = await api.put(`/api/enquiries/update/${id}`, data);
    return response.data;
};

export const deleteEnquiry = async (id: string) => {
    const response = await api.delete(`/api/enquiries/delete/${id}`);
    return response.data;
};
