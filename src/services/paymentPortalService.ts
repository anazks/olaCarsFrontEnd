import api from './api';

export interface SupportingDoc {
  _id?: string;
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
  uploadedAt?: string;
}

export interface StatusHistoryItem {
  _id?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  actionBy: string | { _id: string; fullName: string; email: string };
  actionByName: string;
  actionRole?: string;
  timestamp: string;
  remarks?: string;
}

export interface PaymentPortalEntry {
  _id: string;
  entryNumber: string;
  vendor: string | { _id: string; name: string; companyName?: string; vendorNumber?: string; email?: string; phone?: string };
  vendorName?: string;
  amount: number;
  currency: string;
  debitAccount: string | { _id: string; code: string; name: string; category: string; accountType?: string };
  creditAccount: string | { _id: string; code: string; name: string; category: string; accountType?: string };
  paymentDate: string;
  referenceNumber?: string;
  description?: string;
  supportingDocuments: SupportingDoc[];
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  createdBy: string | { _id: string; fullName: string; email: string };
  creatorName?: string;
  creatorEmail?: string;
  reviewedBy?: string | { _id: string; fullName: string; email: string };
  reviewerName?: string;
  reviewedAt?: string;
  rejectionRemark?: string;
  approvalNotes?: string;
  revisionCount: number;
  statusHistory: StatusHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface FinanceAdminAccessItem {
  _id: string;
  fullName: string;
  email: string;
  adminStatus: string;
  isMpinSet: boolean;
  mpin?: string | null;
  hasEntryAccess: boolean;
  hasApprovalAccess: boolean;
  portalStatus: 'ACTIVE' | 'LOCKED' | 'NOT_CONFIGURED' | 'SUSPENDED';
  failedAttempts: number;
  lastMpinLoginAt?: string | null;
  setAt?: string | null;
}

export interface PortalVendor {
  _id: string;
  name: string;
  companyName?: string;
  vendorNumber?: string;
  email?: string;
  phone?: string;
  category?: string;
}

export interface PortalAccount {
  _id: string;
  code: string;
  name: string;
  category: string;
  accountType?: string;
}

export interface PortalAccountsResponse {
  allAccounts: PortalAccount[];
  debitAccounts: PortalAccount[];
  creditAccounts: PortalAccount[];
}

export interface MpinStatusResponse {
  isMpinSet: boolean;
  hasEntryAccess: boolean;
  hasApprovalAccess: boolean;
  status: string;
  isLocked?: boolean;
  lockUntil?: string;
}

const PORTAL_TOKEN_KEY = 'payment_portal_token';

export const getPortalToken = (): string | null => {
  return sessionStorage.getItem(PORTAL_TOKEN_KEY);
};

export const setPortalToken = (token: string): void => {
  sessionStorage.setItem(PORTAL_TOKEN_KEY, token);
};

export const clearPortalToken = (): void => {
  sessionStorage.removeItem(PORTAL_TOKEN_KEY);
  localStorage.removeItem(PORTAL_TOKEN_KEY);
};

export const isPortalUnlocked = (): boolean => {
  return !!sessionStorage.getItem(PORTAL_TOKEN_KEY);
};

const portalHeaders = () => {
  const token = getPortalToken();
  return token ? { 'x-portal-token': token } : {};
};

// ── Auth & MPIN ──
export const getMpinStatus = async (): Promise<MpinStatusResponse> => {
  const res = await api.get('/api/payment-portal/auth/status');
  return res.data.data;
};

export const verifyMpin = async (mpin: string): Promise<{ portalToken: string; user: any }> => {
  const res = await api.post('/api/payment-portal/auth/verify-mpin', { mpin });
  if (res.data?.portalToken) {
    setPortalToken(res.data.portalToken);
  }
  return res.data;
};

// ── Admin Provisioning ──
export const getFinanceAdminsWithAccess = async (): Promise<FinanceAdminAccessItem[]> => {
  const res = await api.get('/api/payment-portal/admin/finance-admins');
  return res.data.data;
};

export const setOrUpdateMpin = async (data: {
  financeAdminId: string;
  mpin: string;
  hasEntryAccess?: boolean;
  hasApprovalAccess?: boolean;
}): Promise<any> => {
  const res = await api.post('/api/payment-portal/admin/set-mpin', data);
  return res.data;
};

export const updatePermissions = async (
  financeAdminId: string,
  data: { hasEntryAccess?: boolean; hasApprovalAccess?: boolean; status?: string }
): Promise<any> => {
  const res = await api.patch(`/api/payment-portal/admin/permissions/${financeAdminId}`, data);
  return res.data;
};

export const unlockFinanceAdmin = async (financeAdminId: string): Promise<any> => {
  const res = await api.post(`/api/payment-portal/admin/unlock/${financeAdminId}`);
  return res.data;
};

// ── Master Lookups ──
export const getPortalVendors = async (): Promise<PortalVendor[]> => {
  const res = await api.get('/api/payment-portal/lookups/vendors', {
    headers: portalHeaders(),
  });
  return res.data.data;
};

export const getPortalAccounts = async (): Promise<PortalAccountsResponse> => {
  const res = await api.get('/api/payment-portal/lookups/accounts', {
    headers: portalHeaders(),
  });
  return res.data.data;
};

// ── Payment Entries (Maker) ──
export const getPaymentEntries = async (params?: {
  status?: string;
  vendor?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  onlyMine?: boolean;
  page?: number;
  limit?: number;
}): Promise<{ entries: PaymentPortalEntry[]; total: number; page: number; totalPages: number }> => {
  const res = await api.get('/api/payment-portal/entries', {
    params,
    headers: portalHeaders(),
  });
  return res.data;
};

export const getPaymentEntryById = async (id: string): Promise<PaymentPortalEntry> => {
  const res = await api.get(`/api/payment-portal/entries/${id}`, {
    headers: portalHeaders(),
  });
  return res.data.data;
};

export const createPaymentEntry = async (formData: FormData): Promise<PaymentPortalEntry> => {
  const res = await api.post('/api/payment-portal/entries', formData, {
    headers: {
      ...portalHeaders(),
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data.data;
};

export const updateAndResubmitPaymentEntry = async (
  id: string,
  formData: FormData
): Promise<PaymentPortalEntry> => {
  const res = await api.put(`/api/payment-portal/entries/${id}`, formData, {
    headers: {
      ...portalHeaders(),
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data.data;
};

export const deletePaymentEntry = async (id: string): Promise<any> => {
  const res = await api.delete(`/api/payment-portal/entries/${id}`, {
    headers: portalHeaders(),
  });
  return res.data;
};

// ── Approvals (Checker) ──
export const getPendingApprovals = async (params?: any): Promise<{
  entries: PaymentPortalEntry[];
  total: number;
  page: number;
  totalPages: number;
}> => {
  const res = await api.get('/api/payment-portal/approvals/pending', {
    params,
    headers: portalHeaders(),
  });
  return res.data;
};

export const approvePaymentEntry = async (
  id: string,
  notes?: string
): Promise<PaymentPortalEntry> => {
  const res = await api.post(
    `/api/payment-portal/approvals/${id}/approve`,
    { notes },
    { headers: portalHeaders() }
  );
  return res.data.data;
};

export const rejectPaymentEntry = async (
  id: string,
  remark: string
): Promise<PaymentPortalEntry> => {
  const res = await api.post(
    `/api/payment-portal/approvals/${id}/reject`,
    { remark },
    { headers: portalHeaders() }
  );
  return res.data.data;
};
