import api from './api';
import type { Branch } from './branchService';

export interface Driver {
    _id: string;
    id?: string;
    driverId?: string;
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
        consentForm?: string;
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
        generatedS3Key?: string;
        signedS3Key?: string;
    };
    assignedVehicle?: string | any;
    currentVehicle?: string;
    rejection?: {
        reason: string;
        notes?: string;
        date?: string;
    };
    approvedBy?: {
        id: string;
        name: string;
        role: string;
    };
    approvedAt?: string;
    medicalFitness: {
        isRequired: boolean;
        status?: 'PENDING' | 'COMPLETED' | 'FAILED';
        certificate?: string;
    };
    activation?: {
        checklistDocument?: string;
        credentialsSent?: boolean;
        gpsMonitoringActive?: boolean;
        activatedDate?: string;
    };
    status: 'DRAFT' | 'PENDING REVIEW' | 'VERIFICATION' | 'CREDIT CHECK' | 'MANAGER REVIEW' | 'APPROVED' | 'CONTRACT PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
    branch: string | Branch;
    experienceYears?: number;
    performance?: {
        avgSpeed: number;
        totalDistance: number;
        drivingScore: number;
        fuelEfficiency: number;
        safetyEvents: {
            braking: number;
            speeding: number;
            acceleration: number;
        };
        lastUpdated: string;
    };
    rentTracking?: Array<{
        weekNumber: number;
        weekLabel: string;
        amount: number;
        carryOver?: number;
        totalDue?: number;
        amountPaid?: number;
        balance?: number;
        status: 'PAID' | 'PARTIAL' | 'PENDING';
        paidAt?: string;
        dueDate?: string;
        payments?: Array<{
            amount: number;
            paidAt: string;
            paymentMethod?: string;
            transactionId?: string;
            note?: string;
        }>;
    }>;
    additionalPayments?: Array<{
        _id: string;
        type: 'DEPOSIT' | 'ADMIN_FEE' | 'PENALTY' | 'OTHER';
        label: string;
        amount: number;
        dueDate: string;
        status: 'PENDING' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED';
        amountPaid: number;
        balance: number;
        paidAt?: string;
        payments: Array<{
            amount: number;
            paidAt: string;
            paymentMethod?: string;
            transactionId?: string;
            note?: string;
        }>;
        relatedVehicle?: string;
        notes?: string;
    }>;
    appliedAt: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface PaginationMetadata {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: PaginationMetadata;
}

export interface DriverFilters {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    branch?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    startDate?: string;
    endDate?: string;
}

export interface BulkUploadResult {
    created: Array<{ row: number; id: string; name: string }>;
    errors: Array<{ row: number; message: string }>;
}

export interface DataMigrationResult {
    created: Array<{ row: number; driverId: string; driverDbId: string; vehicleId: string; name: string; vehicleNumber: string }>;
    errors: Array<{ row: number; message: string }>;
}

// GET all drivers with filters
export const getAllDrivers = async (filters: DriverFilters = {}): Promise<PaginatedResponse<Driver>> => {
    const response = await api.get('/api/driver', { params: filters });
    return response.data;
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

export const markRentAsPaid = async (id: string, paymentData: any): Promise<Driver> => {
    const response = await api.put(`/api/driver/${id}/rent/pay`, paymentData);
    return response.data.data;
};

export const deleteDriver = async (id: string): Promise<void> => {
    await api.delete(`/api/driver/${id}`);
};

export const payAdditionalPayment = async (
    driverId: string,
    paymentId: string,
    data: { amount: number; paymentMethod: string; note?: string }
): Promise<Driver> => {
    const response = await api.post(`/api/driver/${driverId}/additional-payments/${paymentId}/pay`, data);
    return response.data.data;
};

export const bulkCreateDrivers = async (drivers: any[], branch?: string): Promise<{ message: string; data: BulkUploadResult }> => {
    const payload: any = { drivers };
    if (branch) payload.branch = branch;
    const response = await api.post('/api/driver/bulk', payload);
    return response.data;
};

export const dataMigrateDrivers = async (
    drivers: any[], branch?: string, handlingStaff?: string, fleetNumber?: string
): Promise<{ message: string; data: DataMigrationResult }> => {
    const payload: any = { drivers };
    if (branch) payload.branch = branch;
    if (handlingStaff) payload.handlingStaff = handlingStaff;
    if (fleetNumber) payload.fleetNumber = fleetNumber;
    const response = await api.post('/api/driver/data-migration', payload);
    return response.data;
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
    markRentAsPaid,
    deleteDriver,
    bulkCreateDrivers,
    dataMigrateDrivers,
    payAdditionalPayment
};

export default driverService;
