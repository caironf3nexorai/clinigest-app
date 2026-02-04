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
    // Use supabase.functions.invoke for proper authentication
    const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: {
            action: 'exchange',
            code,
            redirectUri,
            userId,
        },
    });

    if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to exchange code for tokens');
    }

    return data;
}

/**
 * Get a valid access token (auto-refreshes if needed)
 * This is the main function to call before making Google API requests
 */
export async function getValidToken(userId: string): Promise<TokenResponse> {
    const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: {
            action: 'get-token',
            userId,
        },
    });

    if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to get valid token');
    }

    return data;
}

/**
 * Manually refresh the access token
 */
export async function refreshToken(userId: string): Promise<TokenResponse> {
    const { data, error } = await supabase.functions.invoke('google-oauth', {
        body: {
            action: 'refresh',
            userId,
        },
    });

    if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to refresh token');
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
