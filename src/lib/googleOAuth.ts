// Google OAuth Service - Handles token management via Supabase Edge Function
import { supabase } from './supabase';

const EDGE_FUNCTION_URL = (import.meta as any).env.VITE_SUPABASE_URL + '/functions/v1/google-oauth';

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
    // Wait for session to be available (may not be ready immediately after redirect)
    let session = null;
    for (let i = 0; i < 5; i++) {
        const { data } = await supabase.auth.getSession();
        session = data.session;
        if (session?.access_token) break;
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Use anon key as fallback if session not available
    const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
    const authHeader = session?.access_token
        ? `Bearer ${session.access_token}`
        : `Bearer ${SUPABASE_ANON_KEY}`;

    const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
            'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
            action: 'exchange',
            code,
            redirectUri,
            userId,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Failed to exchange code for tokens');
    }

    return data;
}

/**
 * Get a valid access token (auto-refreshes if needed)
 * This is the main function to call before making Google API requests
 */
export async function getValidToken(userId: string): Promise<TokenResponse> {
    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
            action: 'get-token',
            userId,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Failed to get valid token');
    }

    return data;
}

/**
 * Manually refresh the access token
 */
export async function refreshToken(userId: string): Promise<TokenResponse> {
    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
            action: 'refresh',
            userId,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Failed to refresh token');
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
