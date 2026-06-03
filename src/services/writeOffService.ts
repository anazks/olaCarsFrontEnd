import api from './api';

export interface InventoryPart {
  _id: string;
  partName: string;
  partNumber: string;
  category: string;
  description?: string;
  unit: string;
  unitCost: number;
  quantityOnHand: number;
  quantityReserved: number;
  reorderLevel: number;
  branchId: string;
  supplierId?: string;
  lastRestockedAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WriteOff {
  _id: string;
  requestNumber: string;
  part: InventoryPart;
  quantity: number;
  unitCost: number;
  amountLoss: number;
  reason: string;
  documents?: string[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  branch: string;
  requestedBy: string;
  requestedByRole: string;
  approvedBy?: string;
  approvedByRole?: string;
  rejectionNote?: string;
  approvalNote?: string;
  createdAt: string;
  updatedAt: string;
}

export const getWriteOffs = async (params: { status?: string; search?: string } = {}): Promise<WriteOff[]> => {
  const response = await api.get('/api/write-offs', { params });
  return response.data.data || response.data;
};

export const approveWriteOff = async (id: string, approvalNote?: string): Promise<WriteOff> => {
  const response = await api.put(`/api/write-offs/${id}/approve`, { approvalNote });
  return response.data.data || response.data;
};

export const rejectWriteOff = async (id: string, rejectionNote: string): Promise<WriteOff> => {
  const response = await api.put(`/api/write-offs/${id}/reject`, { rejectionNote });
  return response.data.data || response.data;
};
