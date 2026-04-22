import { useEffect } from 'react';
import { getToken, isTokenValid, setUser } from '../utils/auth';
import { getProfile } from '../services/authService';

/**
 * A hook that automatically refreshes the user's profile and permissions
 * in the background to ensure UI consistency without requiring re-login.
 */
export const useAuthRefresh = (intervalMs: number = 300000) => { // Default 5 minutes
    useEffect(() => {
        const refresh = async () => {
            const token = getToken();
            if (token && isTokenValid()) {
                try {
                    const response = await getProfile();
                    if (response.data?.success && response.data?.user) {
                        setUser(response.data.user);
                        console.log('[AuthRefresh] Profile refreshed silently');
                    }
                } catch (error) {
                    console.error('[AuthRefresh] Failed to refresh profile:', error);
                }
            }
        };

        // Initial refresh on load
        refresh();

        // Setup interval
        const interval = setInterval(refresh, intervalMs);

        return () => clearInterval(interval);
    }, [intervalMs]);
};
