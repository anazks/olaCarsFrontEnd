import api from './api';
import type { Branch } from './branchService';

export interface Driver {
    _id: string;
    id?: string;
    personalInfo: {
        fullName: string;
        email: string;
        phone: string;
        whatsappNumber?: string;
        dateOfBirth: string;
        nationality?: string;
        photograph?: string;
    };
    emergencyContact?: {
        name: string;
        phone: string;
        relationship?: string;
    };
    drivingLicense: {
        licenseNumber?: string;
        expiryDate?: string;
        categories: string[];
        frontImage?: string;
        backImage?: string;
        verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
        verifiedDate?: string;
    };
    identityDocs?: {
        idType?: 'National ID' | 'Passport';
        idNumber?: string;
        idFrontImage?: string;
        idBackImage?: string;
    };
    addressProof?: {
        document?: string;
    };
    backgroundCheck: {
        status: 'PENDING' | 'UPLOADED' | 'CLEARED' | 'FAILED' | 'NOT PROVIDED';
        document?: string;
        issuedDate?: string;
        performedAt?: string;
        notes?: string;
    };
    creditCheck?: {
        score?: number;
        rating?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'VERY POOR' | 'FRAUD';
        decision?: 'AUTO_APPROVED' | 'MANUAL_REVIEW' | 'DECLINED';
        fraudAlert?: boolean;
        reviewNotes?: string;
        resultDate?: string;
        reportS3Key?: string;
    };
    contract?: {
        issuedDate?: string;
        signedDate?: string;
        pdfS3Key?: string;
        signedS3Key?: string;
    };
    rejection?: {
        reason: string;
        notes?: string;
        date?: string;
    };
    medicalFitness: {
        isRequired: boolean;
        status?: 'PENDING' | 'COMPLETED' | 'FAILED';
        certificate?: string;
    };
    activation: {
        credentialsSent: boolean;
        gpsMonitoringActive: boolean;
        activatedDate?: string;
    };
    status: 'DRAFT' | 'PENDING REVIEW' | 'VERIFICATION' | 'CREDIT CHECK' | 'MANAGER REVIEW' | 'APPROVED' | 'CONTRACT PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
    branch: string | Branch;
    experienceYears?: number;
    appliedAt: string;
    createdAt?: string;
    updatedAt?: string;
}

export const getAllDrivers = async (filters?: any): Promise<Driver[]> => {
    const response = await api.get('/api/driver', { params: filters });
    return response.data.data;
};

export const getDriverById = async (id: string): Promise<Driver> => {
    const response = await api.get(`/api/driver/${id}`);
    return response.data.data;
};

export const createDriver = async (driverData: any): Promise<Driver> => {
    const response = await api.post('/api/driver', driverData);
    return response.data.data;
};

export const updateDriver = async (id: string, updateData: any): Promise<Driver> => {
    const response = await api.put(`/api/driver/${id}`, updateData);
    return response.data.data;
};

export const progressDriver = async (id: string, targetStatus: string, data?: any): Promise<Driver> => {
    console.log(id, targetStatus, data);
    const response = await api.put(`/api/driver/${id}/progress`, { targetStatus, ...data });
    return response.data.data;
};

export const uploadDriverDocument = async (id: string, formData: FormData): Promise<any> => {
    const response = await api.post(`/api/driver/${id}/upload-documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data.data;
};

export const deleteDriver = async (id: string): Promise<void> => {
    await api.delete(`/api/driver/${id}`);
};

// Also export as a default object for backward compatibility if needed, 
// though individual exports are preferred now.
export const driverService = {
    getAllDrivers,
    getDriverById,
    createDriver,
    updateDriver,
    progressDriver,
    uploadDocument: uploadDriverDocument,
    deleteDriver
};

export default driverService;
