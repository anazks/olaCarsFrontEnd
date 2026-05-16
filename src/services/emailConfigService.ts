import api from './api';

export interface EmailConfig {
    _id: string;
    email: string;
    appPassword?: string;
    purpose: 'ESCALATION' | 'GENERAL_ENQUIRY' | 'COMPLAINT' | 'OUTGOING' | 'NONE';
    label: string;
    isActive: boolean;
}

export const createEmailConfig = async (data: Partial<EmailConfig>) => {
    return await api.post('/api/email-configs/create', data);
};

export const getAllEmailConfigs = async () => {
    return await api.get('/api/email-configs/all');
};

export const updateEmailConfig = async (id: string, data: Partial<EmailConfig>) => {
    return await api.put(`/api/email-configs/${id}`, data);
};

export const deleteEmailConfig = async (id: string) => {
    return await api.delete(`/api/email-configs/${id}`);
};

export const assignEmailPurpose = async (id: string, purpose: string) => {
    return await api.put(`/api/email-configs/${id}/assign`, { purpose });
};
