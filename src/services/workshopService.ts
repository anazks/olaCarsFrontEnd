import api from './api';

export interface Workshop {
  _id: string;
  name: string;
  code: string;
  branchId: string | { _id: string; name: string };
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  createdBy?: string;
  isDeleted?: boolean;
}

export const getAllWorkshops = async (): Promise<{ data: Workshop[] }> => {
  try {
    const response = await api.get('/api/workshop');
    return {
      data: response.data?.data || response.data || [],
    };
  } catch (error) {
    console.error('Error fetching workshops:', error);
    throw error;
  }
};

export const getWorkshopById = async (id: string): Promise<Workshop> => {
  try {
    const response = await api.get(`/api/workshop/${id}`);
    return response.data?.data || response.data;
  } catch (error) {
    console.error('Error fetching workshop:', error);
    throw error;
  }
};
