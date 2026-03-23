import api from './api';

export interface Agreement {
  _id: string;
  title: string;
  country: string;
  type: 'TERMS_AND_CONDITIONS' | 'PRIVACY_POLICY' | 'RETURN_POLICY' | 'OTHER';
  content: string;
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdBy: string;
  creatorRole: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgreementVersion {
  _id: string;
  agreementId: string;
  version: number;
  title: string;
  country: string;
  type: string;
  content: string;
  status: string;
  updatedBy: string;
  updaterRole: string;
  createdAt: string;
}

export interface CreateAgreementData {
  title: string;
  country: string;
  type: string;
  content: string;
  status?: string;
}

export interface UpdateAgreementData {
  title?: string;
  country?: string;
  type?: string;
  content?: string;
  status?: string;
}

const agreementService = {
  getAgreements: async (country?: string): Promise<Agreement[]> => {
    const response = await api.get('/api/agreements', {
      params: { country },
    });
    return response.data.data;
  },

  getAgreement: async (id: string): Promise<Agreement> => {
    const response = await api.get(`/api/agreements/${id}`);
    return response.data.data;
  },

  createAgreement: async (data: CreateAgreementData): Promise<Agreement> => {
    const response = await api.post('/api/agreements', data);
    return response.data.data;
  },

  updateAgreement: async (id: string, data: UpdateAgreementData): Promise<Agreement> => {
    const response = await api.put(`/api/agreements/${id}`, data);
    return response.data.data;
  },

  getAgreementHistory: async (id: string): Promise<AgreementVersion[]> => {
    const response = await api.get(`/api/agreements/${id}/versions`);
    return response.data.data;
  },

  getPlaceholders: async (): Promise<string[]> => {
    const response = await api.get('/api/agreements/placeholders');
    const data = response.data.data;
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') return Object.keys(data);
    return [];
  },

  verifySignature: async (driverId: string, agreementId: string): Promise<{ accepted: boolean }> => {
    const response = await api.get(`/api/agreements/verify/${driverId}/${agreementId}`);
    return response.data.data;
  },

  getRenderedAgreement: async (id: string): Promise<{ renderedContent: string, title: string, version: number }> => {
    const response = await api.get(`/api/agreements/${id}/render`);
    return response.data.data;
  },

  acceptAgreement: async (data: FormData | any): Promise<any> => {
    const isFormData = data instanceof FormData;
    const response = await api.post('/api/agreements/accept', data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return response.data;
  },
};

export default agreementService;
