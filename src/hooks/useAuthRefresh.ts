import { useEffect, useRef, useCallback } from 'react';
import { getToken, getDecodedToken, getRefreshToken, setToken, setRefreshToken, setUser } from '../utils/auth';
import { getProfile, REFRESH_ENDPOINTS } from '../services/authService';
import axios from 'axios';
import toast from 'react-hot-toast';

/**
 * Activity-aware auth refresh hook.
 * - Tracks user activity (mouse, keyboard, clicks, scroll, touch)
 * - Proactively refreshes the access token BEFORE it expires when the user is active
 * - Silently refreshes the user profile to keep permissions up to date
 * - Only logs out if the user is truly idle AND the refresh token is also expired
 */

// Module-level lock shared across all instances to prevent race conditions
// between proactive refresh and interceptor refresh
let isRefreshingGlobal = false;
let refreshPromiseGlobal: Promise<{ accessToken: string; refreshToken: string }> | null = null;

/**
 * Centralized refresh function. Ensures only one refresh request is in-flight at a time.
 * If a refresh is already in progress, returns the existing promise.
 */
export const performTokenRefresh = async (): Promise<{ accessToken: string; refreshToken: string } | null> => {
    // If a refresh is already in-flight, piggyback on it
    if (isRefreshingGlobal && refreshPromiseGlobal) {
        console.log('[AuthRefresh] Refresh already in-flight, waiting for it...');
        return refreshPromiseGlobal;
    }

    const refreshToken = getRefreshToken();
    const apiRole = localStorage.getItem('apiRole');

    if (!refreshToken || !apiRole) {
        console.warn('[AuthRefresh] No refresh token or apiRole, cannot refresh');
        return null;
    }

    const endpoint = REFRESH_ENDPOINTS[apiRole];
    if (!endpoint) {
        console.warn(`[AuthRefresh] No refresh endpoint for role: ${apiRole}`);
        return null;
    }

    isRefreshingGlobal = true;

    refreshPromiseGlobal = (async () => {
        try {
            console.log('[AuthRefresh] Sending refresh request...');
            const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
            const res = await axios.post(`${baseURL}/${endpoint}`, { refreshToken });

            const { accessToken, refreshToken: newRefreshToken } = res.data;

            if (accessToken) {
                setToken(accessToken);
            }
            if (newRefreshToken) {
                setRefreshToken(newRefreshToken);
            }

            toast.success('Session secured: Token refreshed automatically', { id: 'token-refresh' });
            console.log('[AuthRefresh] ✅ Tokens refreshed successfully');
            return { accessToken, refreshToken: newRefreshToken };
        } catch (error) {
            console.error('[AuthRefresh] Token refresh failed:', error);
            throw error;
        } finally {
            isRefreshingGlobal = false;
            refreshPromiseGlobal = null;
        }
    })();

    return refreshPromiseGlobal;
};

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

        // If token is already expired on load, refresh immediately
        if (timeUntilExpiry <= 0) {
            console.log('[AuthRefresh] Token already expired on load, triggering immediate refresh');
            performTokenRefresh().then(() => {
                scheduleTokenRefresh();
            }).catch(err => {
                console.error('[AuthRefresh] Immediate refresh failed:', err);
            });
            return;
        }

        // If iat is present, determine lifetime. Otherwise fallback to 15m (900s).
        const lifetime = decoded.iat ? (decoded.exp - decoded.iat) : 900;
        // Schedule proactive refresh at 75% of token lifetime
        const refreshAtSeconds = lifetime * 0.75;
        const timeElapsed = now - (decoded.iat || (decoded.exp - 900));
        const refreshIn = Math.max((refreshAtSeconds - timeElapsed) * 1000, 5000); // minimum 5 seconds

        console.log(`[AuthRefresh] Token lifetime=${lifetime}s, expires in ${Math.round(timeUntilExpiry)}s. Scheduling refresh in ${Math.round(refreshIn / 1000)}s.`);

        refreshTimerRef.current = setTimeout(async () => {
            // Only refresh if user has been active in the last 30 minutes
            const idleTime = Date.now() - lastActivityRef.current;
            const IDLE_THRESHOLD = 30 * 60 * 1000; // 30 minutes

            if (idleTime > IDLE_THRESHOLD) {
                console.log('[AuthRefresh] User idle, skipping proactive refresh');
                return;
            }

            // Check if the current token in localStorage is already newer/fresh
            // (the interceptor may have already refreshed it)
            const currentToken = getToken();
            if (!currentToken) return;

            const currentDecoded = getDecodedToken();
            if (!currentDecoded?.exp) return;

            const currentNow = Date.now() / 1000;
            const currentLifetime = currentDecoded.iat ? (currentDecoded.exp - currentDecoded.iat) : 900;
            const currentRemaining = currentDecoded.exp - currentNow;

            // If remaining time is more than 50% of lifetime, it was already refreshed
            if (currentRemaining > currentLifetime * 0.5) {
                console.log(`[AuthRefresh] Token was already refreshed (${Math.round(currentRemaining)}s left), rescheduling.`);
                scheduleTokenRefresh();
                return;
            }

            try {
                console.log('[AuthRefresh] Proactively refreshing token...');
                await performTokenRefresh();

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
