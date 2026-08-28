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
    },

    /**
     * Get whether the driver payment mailing system is enabled
     */
    getDriverPaymentEmailsEnabled: async (): Promise<boolean> => {
        try {
            const response = await api.get('/api/system-settings/driver_payment_emails_enabled');
            return response.data.value === true || response.data.value === 'true';
        } catch (error) {
            console.error('Error fetching driver payment emails setting:', error);
            throw error;
        }
    },

    /**
     * Update the driver payment mailing system status (Admin only)
     */
    updateDriverPaymentEmailsEnabled: async (value: boolean): Promise<boolean> => {
        try {
            const response = await api.put('/api/system-settings/driver_payment_emails_enabled', { value });
            return response.data.success;
        } catch (error) {
            console.error('Error updating driver payment emails setting:', error);
            throw error;
        }
    },

    /**
     * Get whether the invoice cron job is suspended
     */
    getInvoiceCronSuspended: async (): Promise<boolean> => {
        try {
            const response = await api.get('/api/system-settings/invoice_cron_suspended');
            return response.data.value === true || response.data.value === 'true';
        } catch (error) {
            console.error('Error fetching invoice cron suspended setting:', error);
            throw error;
        }
    },

    /**
     * Update the invoice cron suspended status (Admin only)
     */
    updateInvoiceCronSuspended: async (value: boolean): Promise<boolean> => {
        try {
            const response = await api.put('/api/system-settings/invoice_cron_suspended', { value });
            return response.data.success;
        } catch (error) {
            console.error('Error updating invoice cron suspended setting:', error);
            throw error;
        }
    },

    /**
     * Get whether the asset depreciation cron job is suspended
     */
    getDepreciationCronSuspended: async (): Promise<boolean> => {
        try {
            const response = await api.get('/api/system-settings/depreciation_cron_suspended');
            return response.data.value === true || response.data.value === 'true';
        } catch (error) {
            console.error('Error fetching depreciation cron suspended setting:', error);
            throw error;
        }
    },

    /**
     * Update the asset depreciation cron suspended status (Admin only)
     */
    updateDepreciationCronSuspended: async (value: boolean): Promise<boolean> => {
        try {
            const response = await api.put('/api/system-settings/depreciation_cron_suspended', { value });
            return response.data.success;
        } catch (error) {
            console.error('Error updating depreciation cron suspended setting:', error);
            throw error;
        }
    }
};

export default systemSettingsService;
