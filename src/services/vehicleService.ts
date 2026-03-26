import api from './api';

// ── Status Types ──────────────────────────────────────────────────────────────

export type VehicleStatus =
    | 'PENDING ENTRY'
    | 'DOCUMENTS REVIEW'
    | 'INSPECTION REQUIRED'
    | 'INSPECTION FAILED'
    | 'REPAIR IN PROGRESS'
    | 'ACCOUNTING SETUP'
    | 'GPS ACTIVATION'
    | 'BRANCH MANAGER APPROVAL'
    | 'ACTIVE — AVAILABLE'
    | 'ACTIVE — RENTED'
    | 'ACTIVE — MAINTENANCE'
    | 'SUSPENDED'
    | 'TRANSFER PENDING'
    | 'TRANSFER COMPLETE'
    | 'RETIRED';

export type PaymentMethod = 'Cash' | 'Bank Transfer' | 'Finance';
export type VehicleCategory = 'Sedan' | 'SUV' | 'Pickup' | 'Van' | 'Luxury' | 'Commercial';
export type FuelType = 'Petrol' | 'Diesel' | 'Hybrid' | 'Electric';
export type Transmission = 'Automatic' | 'Manual';
export type BodyType = 'Hatchback' | 'Saloon' | 'Coupe' | 'Convertible' | 'Truck';
export type InsuranceType = 'Comprehensive' | 'Third-Party' | 'Fleet Policy';
export type DepreciationMethod = 'Straight-Line' | 'Reducing Balance';
export type InspectionCondition = 'Good' | 'Fair' | 'Poor';
export type MaintenanceType = 'Scheduled' | 'Unscheduled' | 'Emergency';
export type SuspensionReason = 'Accident' | 'Legal' | 'Police' | 'Dispute' | 'Other';
export type TransportMethod = 'Driven' | 'Flatbed' | 'Shipping';
export type RetirementReason = 'Sold' | 'Written Off' | 'End of Life' | 'Beyond Repair';

// ── Nested Interfaces ─────────────────────────────────────────────────────────

export interface FinanceDetails {
    lenderName: string;
    loanAmount: number;
    termMonths: number;
    monthlyInstalment: number;
}

export interface PurchaseDetails {
    purchaseOrder?: string;
    vendorName: string;
    purchaseDate: string;
    purchasePrice: number;
    currency: string;
    paymentMethod: PaymentMethod;
    financeDetails?: FinanceDetails;
    branch: string | { _id: string; name: string; [key: string]: any };
    purchaseReceipt?: string;
}

export interface BasicDetails {
    make: string;
    model: string;
    year: number;
    vin: string;
    category: VehicleCategory;
    fuelType: FuelType;
    transmission: Transmission;
    monthlyRent?: number;
    engineCapacity?: number;
    colour?: string;
    seats?: number;
    engineNumber?: string;
    bodyType?: BodyType;
    odometer?: number;
    gpsSerialNumber?: string;
}

export interface LegalDocs {
    registrationCertificate?: string;
    registrationNumber?: string;
    registrationExpiry?: string;
    roadTaxDisc?: string;
    roadTaxExpiry?: string;
    numberPlateFront?: string;
    numberPlateRear?: string;
    roadworthinessCertificate?: string;
    roadworthinessExpiry?: string;
    transferOfOwnership?: string;
}

export interface InsurancePolicy {
    insuranceType?: InsuranceType;
    providerName?: string;
    policyNumber?: string;
    startDate?: string;
    expiryDate?: string;
    premiumAmount?: number;
    coverageAmount?: number;
    policyDocument?: string;
    excessAmount?: number;
    namedDrivers?: string[];
    claimsHistory?: string;
}

export interface InsuranceDetails {
    plan?: string;
    insuranceNumber?: string;
    fromDate?: string;
    toDate?: string;
    certificate?: string;
}

export interface ImportationDetails {
    isImported?: boolean;
    countryOfOrigin?: string;
    shippingReference?: string;
    portOfEntry?: string;
    customsDeclarationNumber?: string;
    arrivalDate?: string;
    shippingCost?: number;
    customsDuty?: number;
    portHandling?: number;
    localTransport?: number;
    otherCharges?: number;
    customsClearanceCertificate?: string;
    importPermit?: string;
}

export interface ChecklistItem {
    name: string;
    condition: InspectionCondition;
    notes?: string;
    isMandatoryFail?: boolean;
}

export interface Inspection {
    date?: string;
    status?: string;
    checklistItems?: ChecklistItem[];
    exteriorPhotos?: string[];
    interiorPhotos?: string[];
    odometerPhoto?: string;
}

export interface AccountingSetup {
    depreciationMethod?: DepreciationMethod;
    usefulLifeYears?: number;
    residualValue?: number;
    isSetupComplete?: boolean;
}

export interface GPSConfiguration {
    isActivated?: boolean;
    geofenceZone?: string;
    speedLimitThreshold?: number;
    idleTimeAlertMins?: number;
    mileageSyncFrequencyHrs?: number;
}

export interface MaintenanceDetails {
    type?: MaintenanceType;
    estimatedCompletionDate?: string;
    assignedTo?: string;
}

export interface SuspensionDetails {
    reason?: SuspensionReason;
    suspendedUntil?: string;
}

export interface TransferDetails {
    toBranch?: string;
    reason?: string;
    estimatedArrival?: string;
    transportMethod?: TransportMethod;
}

export interface RetirementDetails {
    reason?: RetirementReason;
    disposalDate?: string;
    disposalValue?: number;
}

export interface StatusHistoryEntry {
    status: VehicleStatus;
    changedAt: string;
    changedBy?: string;
    notes?: string;
}

// ── Main Vehicle Interface ────────────────────────────────────────────────────

export interface Vehicle {
    _id: string;
    purchaseDetails: PurchaseDetails;
    basicDetails: BasicDetails;
    legalDocs?: LegalDocs;
    insurancePolicy?: InsurancePolicy;
    insuranceDetails?: InsuranceDetails;
    importationDetails?: ImportationDetails;
    inspection?: Inspection;
    accountingSetup?: AccountingSetup;
    gpsConfiguration?: GPSConfiguration;
    maintenanceDetails?: MaintenanceDetails;
    suspensionDetails?: SuspensionDetails;
    transferDetails?: TransferDetails;
    retirementDetails?: RetirementDetails;
    status: VehicleStatus;
    statusHistory?: StatusHistoryEntry[];
    createdBy?: string;
    creatorRole?: string;
    createdAt: string;
    updatedAt: string;
}

// ── Payloads ──────────────────────────────────────────────────────────────────

export interface CreateVehiclePayload {
    purchaseDetails: {
        purchaseOrder?: string;
        vendorName: string;
        purchaseDate: string;
        purchasePrice: number;
        currency: string;
        paymentMethod: PaymentMethod;
        financeDetails?: FinanceDetails;
        branch: string;
    };
    basicDetails: {
        make: string;
        model: string;
        year: number;
        vin: string;
        category: VehicleCategory;
        fuelType: FuelType;
        transmission: Transmission;
        engineCapacity?: number;
        colour?: string;
        seats?: number;
        engineNumber?: string;
        bodyType?: BodyType;
        odometer?: number;
        gpsSerialNumber?: string;
    };
    insuranceId?: string;
}

export interface ProgressVehiclePayload {
    targetStatus: VehicleStatus;
    notes?: string;
    updateData?: Record<string, unknown>;
}

// ── API Functions ─────────────────────────────────────────────────────────────

export interface PaginationMetadata {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface PaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: PaginationMetadata;
}

export interface VehicleFilters {
    page?: number;
    limit?: number;
    search?: string;
    status?: VehicleStatus;
    branch?: string;
    category?: VehicleCategory;
    fuelType?: FuelType;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

// GET all vehicles
export const getAllVehicles = async (filters: VehicleFilters = {}): Promise<PaginatedResponse<Vehicle>> => {
    const response = await api.get('/api/vehicle/', {
        params: filters
    });
    return response.data;
};

// GET all available vehicles for rental
export const getAvailableVehicles = async (filters: VehicleFilters = {}): Promise<PaginatedResponse<Vehicle>> => {
    const response = await api.get('/api/vehicle/available', { params: filters });
    return response.data;
};

// POST assign vehicle to driver
export const assignVehicleToDriver = async (
    vehicleId: string, 
    driverId: string,
    leaseDetails: {
        leaseDuration: number;
        monthlyRent: number;
        notes?: string;
    }
): Promise<any> => {
    const response = await api.post(`/api/vehicle/${vehicleId}/assign/${driverId}`, leaseDetails);
    return response.data;
};

// GET single vehicle
export const getVehicleById = async (id: string): Promise<Vehicle> => {
    const response = await api.get(`/api/vehicle/${id}`);
    return response.data.data;
};

// POST create vehicle
export const createVehicle = async (payload: CreateVehiclePayload): Promise<Vehicle> => {
    const response = await api.post('/api/vehicle/', payload);
    return response.data.data;
};

// POST upload documents (multipart/form-data)
export const uploadVehicleDocuments = async (id: string, formData: FormData): Promise<Record<string, string | string[]>> => {
    console.group('--- API Call [START]: uploadVehicleDocuments ---');
    console.log('Vehicle ID:', id);
    console.log('API URL:', `/api/vehicle/${id}/upload-documents`);
    
    // Log each part of the FormData
    const formDataEntries: Record<string, any> = {};
    formData.forEach((value, key) => {
        if (value instanceof File) {
            formDataEntries[key] = {
                name: value.name,
                size: `${(value.size / 1024).toFixed(2)} KB`,
                type: value.type
            };
        } else {
            formDataEntries[key] = value;
        }
    });
    console.table(formDataEntries);
    console.groupEnd();

    // Must explicitly set Content-Type to override the base api default of 'application/json'
    const response = await api.post(`/api/vehicle/${id}/upload-documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
};

// PUT progress vehicle status
export const progressVehicle = async (id: string, payload: ProgressVehiclePayload): Promise<Vehicle> => {
    const response = await api.put(`/api/vehicle/${id}/progress`, payload);
    return response.data.data;
};
