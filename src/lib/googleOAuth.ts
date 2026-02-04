// Google OAuth Service - Handles token management via Supabase Edge Function
import { supabase } from './supabase';

export interface TokenResponse {
    access_token: string | null;
    refresh_token?: string;
    expires_at?: string;
    expires_in?: number;
    needs_reconnect?: boolean;
    error?: string;
}

/**
 * Exchange authorization code for tokens
 * Called after user completes Google OAuth consent
 */
export async function exchangeCodeForTokens(
    code: string,
    redirectUri: string,
    userId: string
): Promise<TokenResponse> {
    // Get Supabase URL and anon key from environment
    const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
    const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/google-oauth`;

    // Call Edge Function with anon key as Bearer token (works for public Edge Functions)
    console.log('📡 Calling Edge Function via fetch...', EDGE_FUNCTION_URL);
    const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,  // Use anon key as Bearer
            'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
            action: 'exchange',
            code,
            redirectUri,
            userId,
        }),
    });

    console.log('📥 Response status:', response.status);
    const data = await response.json();
    console.log('📥 Response data:', data);

    if (!response.ok) {
        console.error('Edge function error:', data);
        throw new Error(data.error || `HTTP ${response.status}: Failed to exchange code for tokens`);
    }

    // Check if data contains an error
    if (data?.error) {
        console.error('Edge function returned error:', data.error);
        throw new Error(data.error);
    }

    return data;
}

/**
 * Get a valid access token (auto-refreshes if needed)
 * This is the main function to call before making Google API requests
 */
export async function getValidToken(userId: string): Promise<TokenResponse> {
    const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
    const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/google-oauth`;

    const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
            action: 'get-token',
            userId,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        // Allow needs_reconnect to pass through without throwing
        if (data && data.needs_reconnect) {
            return data;
        }
        throw new Error(data.error || 'Failed to get valid token');
    }

    if (data?.error && !data?.needs_reconnect) {
        throw new Error(data.error);
    }

    return data;
}

/**
 * Manually refresh the access token
 */
export async function refreshToken(userId: string): Promise<TokenResponse> {
    const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
    const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/google-oauth`;

    const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
            action: 'refresh',
            userId,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        if (data && data.needs_reconnect) {
            return data;
        }
        throw new Error(data.error || 'Failed to refresh token');
    }

    if (data?.error && !data?.needs_reconnect) {
        throw new Error(data.error);
    }

    return data;
}

/**
 * Clear stored tokens (logout from Google)
 */
export async function clearGoogleTokens(userId: string): Promise<void> {
    await supabase
        .from('profiles')
        .update({
            google_refresh_token: null,
            google_access_token: null,
            google_token_expires_at: null,
        })
        .eq('id', userId);
}

/**
 * Build Google OAuth authorization URL for auth-code flow
 */
export function buildAuthUrl(clientId: string, redirectUri: string, scopes: string[]): string {
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: scopes.join(' '),
        access_type: 'offline', // This requests a refresh token
        prompt: 'consent', // Force consent to ensure refresh token is returned
        include_granted_scopes: 'true',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
