import api from './api';

export interface AccidentReport {
    _id: string;
    driver: {
        _id: string;
        personalInfo?: {
            fullName: string;
            email: string;
            phone: string;
        };
    };
    driverName: string;
    driverEmail: string;
    vehicleNumber: string;
    branch: {
        _id: string;
        name: string;
        city?: string;
        country?: string;
    };
    alternativeMobile: string;
    alternativeEmail?: string;
    accidentLocation: string;
    accidentDate: string;
    description: string;
    images: string[];
    status: 'SUBMITTED' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';
    reviewNotes?: string;
    reviewedBy?: string;
    resolvedAt?: string;
    createdAt: string;
}

export const getAllAccidentReports = async (params?: { status?: string; branchId?: string; page?: number; limit?: number }) => {
    const { data } = await api.get('/api/accident-reports/all', { params });
    return data;
};

export const getBranchAccidentReports = async (branchId: string, params?: { status?: string; page?: number; limit?: number }) => {
    const { data } = await api.get(`/api/accident-reports/branch/${branchId}`, { params });
    return data;
};

export const getAccidentReportById = async (id: string) => {
    const { data } = await api.get(`/api/accident-reports/${id}`);
    return data;
};

export const updateAccidentReportStatus = async (id: string, payload: { status: string; reviewNotes?: string }) => {
    const { data } = await api.put(`/api/accident-reports/${id}/status`, payload);
    return data;
};
