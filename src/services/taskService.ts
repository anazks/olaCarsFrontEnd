import api from './api';

export interface StaffTask {
    _id?: string;
    title: string;
    description: string;
    assignedTo: string;
    assignedToRole: string;
    assignedToRoleModel: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    dueDate: string;
    notes?: string;
}

export const delegateTask = async (taskData: StaffTask) => {
    const response = await api.post('/api/staff-performance/tasks', taskData);
    return response.data;
};

export const updateTaskStatus = async (taskId: string, status: string) => {
    const response = await api.patch(`/api/staff-performance/tasks/${taskId}/status`, { status });
    return response.data;
};

export const getTasks = async (filters: any) => {
    const response = await api.get('/api/staff-performance/tasks', { params: filters });
    return response.data;
};
