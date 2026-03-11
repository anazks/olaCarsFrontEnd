import api from './api';

export interface SystemSetting {
    success: boolean;
    key: string;
    value: any;
}

export interface SystemSettingsList {
    success: boolean;
    data: {
        key: string;
        value: any;
    }[];
}

const systemSettingsService = {
    /**
     * Get the PO approval threshold
     */
    getPOThreshold: async (): Promise<number> => {
        try {
            const response = await api.get('/api/system-settings/po-threshold');
            // Based on frontend_api_docs.md, response is { success, key, value }
            return response.data.value;
        } catch (error) {
            console.error('Error fetching PO threshold:', error);
            throw error;
        }
    },

    /**
     * Update the PO approval threshold (Admin only)
     */
    updatePOThreshold: async (value: number): Promise<boolean> => {
        try {
            const response = await api.put('/api/system-settings/po-threshold', { value });
            return response.data.success;
        } catch (error) {
            console.error('Error updating PO threshold:', error);
            throw error;
        }
    }
};

export default systemSettingsService;
