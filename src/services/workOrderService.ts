import api from './api';

export interface WorkOrderTask {
    _id: string;
    description: string;
    category?: 'Mechanical' | 'Electrical' | 'Body' | 'Tyres' | 'Fluids' | 'Other';
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
    assignedTo?: string;
    estimatedHours?: number;
    actualHours?: number;
    completedAt?: string;
    notes?: string;
}

export interface WorkOrderPart {
    _id: string;
    partName: string;
    partNumber?: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
    source: 'IN_STOCK' | 'ORDERED' | 'EXTERNAL_VENDOR';
    status: 'REQUESTED' | 'RESERVED' | 'RECEIVED' | 'INSTALLED' | 'RETURNED';
    receivedDate?: string;
    installedBy?: string;
}

export interface LabourLogEntry {
    _id: string;
    technicianId: string;
    action: 'CLOCK_IN' | 'CLOCK_OUT' | 'PAUSE' | 'RESUME';
    timestamp: string;
    taskReference?: string;
    notes?: string;
}

export interface StatusHistoryEntry {
    _id: string;
    status: string;
    changedBy: string;
    changedByRole: string;
    timestamp: string;
    notes?: string;
}

export interface WorkOrder {
    _id: string;
    workOrderNumber: string;
    workOrderType: 'PREVENTIVE' | 'CORRECTIVE' | 'PRE_ENTRY' | 'ACCIDENT' | 'RETURN_INSPECTION' | 'RECALL' | 'SAFETY_PREP' | 'WEAR_ITEM';
    status: string;
    vehicleId: any;
    branchId: any;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    slaDeadline?: string;
    faultDescription: string;
    assignedTechnician?: any;
    supervisedBy?: any;
    odometerAtEntry?: number;
    odometerAtRelease?: number;
    estimatedLabourHours: number;
    actualLabourHours: number;
    estimatedPartsCost: number;
    actualPartsCost: number;
    estimatedTotalCost: number;
    actualTotalCost: number;
    tasks: WorkOrderTask[];
    parts: WorkOrderPart[];
    labourLog: LabourLogEntry[];
    statusHistory: StatusHistoryEntry[];
    releasedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export const getWorkOrdersForVehicle = async (vehicleId: string): Promise<WorkOrder[]> => {
    const response = await api.get('/api/work-orders', {
        params: { vehicleId }
    });
    // The backend returns { success: true, data: [...] }
    return response.data.data;
};
