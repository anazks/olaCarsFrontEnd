import { useEffect, useRef, useCallback } from 'react';
import { getToken, getDecodedToken, getRefreshToken, setToken, setRefreshToken, setUser } from '../utils/auth';
import { getProfile, REFRESH_ENDPOINTS } from '../services/authService';
import axios from 'axios';

/**
 * Activity-aware auth refresh hook.
 * - Tracks user activity (mouse, keyboard, clicks, scroll, touch)
 * - Proactively refreshes the access token BEFORE it expires when the user is active
 * - Silently refreshes the user profile to keep permissions up to date
 * - Only logs out if the user is truly idle AND the refresh token is also expired
 */
export const useAuthRefresh = (profileRefreshMs: number = 300000) => { // Profile refresh every 5 min
    const lastActivityRef = useRef<number>(Date.now());
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const profileTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Track user activity
    const onActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
    }, []);

    // Proactively refresh the access token before it expires
    const scheduleTokenRefresh = useCallback(() => {
        // Clear any existing timer
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }

        const token = getToken();
        if (!token) return;

        const decoded = getDecodedToken();
        if (!decoded?.exp) return;

        const now = Date.now() / 1000;
        const timeUntilExpiry = decoded.exp - now;

        // Refresh 5 minutes before expiry (or immediately if less than 5 min left)
        const refreshIn = Math.max((timeUntilExpiry - 300) * 1000, 0);

        console.log(`[AuthRefresh] Token expires in ${Math.round(timeUntilExpiry / 60)}min. Scheduling refresh in ${Math.round(refreshIn / 60000)}min.`);

        refreshTimerRef.current = setTimeout(async () => {
            // Only refresh if user has been active in the last 30 minutes
            const idleTime = Date.now() - lastActivityRef.current;
            const IDLE_THRESHOLD = 30 * 60 * 1000; // 30 minutes

            if (idleTime > IDLE_THRESHOLD) {
                console.log('[AuthRefresh] User idle, skipping proactive refresh');
                return;
            }

            const refreshToken = getRefreshToken();
            const apiRole = localStorage.getItem('apiRole');

            if (!refreshToken || !apiRole) {
                console.warn('[AuthRefresh] No refresh token or apiRole, cannot refresh');
                return;
            }

            const endpoint = REFRESH_ENDPOINTS[apiRole];
            if (!endpoint) {
                console.warn(`[AuthRefresh] No refresh endpoint for role: ${apiRole}`);
                return;
            }

            try {
                console.log('[AuthRefresh] Proactively refreshing token...');
                const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
                const res = await axios.post(`${baseURL}/${endpoint}`, { refreshToken });

                const { accessToken, refreshToken: newRefreshToken } = res.data;

                if (accessToken) {
                    setToken(accessToken);
                    console.log('[AuthRefresh] ✅ Token refreshed proactively');
                }
                if (newRefreshToken) {
                    setRefreshToken(newRefreshToken);
                }

                // Schedule the next refresh based on the new token
                scheduleTokenRefresh();
            } catch (error) {
                console.error('[AuthRefresh] Proactive refresh failed:', error);
                // Don't logout - the interceptor will handle it on the next API call
            }
        }, refreshIn);
    }, []);

    // Refresh user profile silently
    const refreshProfile = useCallback(async () => {
        const token = getToken();
        if (!token) return;

        try {
            const response = await getProfile();
            if (response.data?.success && response.data?.user) {
                setUser(response.data.user);
                console.log('[AuthRefresh] Profile refreshed silently');
            }
        } catch (error) {
            // Silently fail - the interceptor will handle token refresh if needed
            console.error('[AuthRefresh] Profile refresh failed (non-fatal):', error);
        }
    }, []);

    useEffect(() => {
        // Activity event listeners
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
        events.forEach(event => window.addEventListener(event, onActivity, { passive: true }));

        // Schedule proactive token refresh
        scheduleTokenRefresh();

        // Initial profile refresh
        refreshProfile();

        // Periodic profile refresh
        profileTimerRef.current = setInterval(refreshProfile, profileRefreshMs);

        return () => {
            events.forEach(event => window.removeEventListener(event, onActivity));
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
            if (profileTimerRef.current) clearInterval(profileTimerRef.current);
        };
    }, [onActivity, scheduleTokenRefresh, refreshProfile, profileRefreshMs]);
};
