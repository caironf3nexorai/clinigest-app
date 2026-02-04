// Supabase Edge Function: Google OAuth Token Exchange and Refresh
// This function handles the Authorization Code flow to obtain refresh tokens
// and automatically refreshes access tokens when they expire.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Google OAuth endpoints
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { action, code, redirectUri, userId } = await req.json()

        // Get secrets from environment
        const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
        const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
        const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
            throw new Error('Google OAuth credentials not configured')
        }

        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!)

        // ACTION: Exchange authorization code for tokens
        if (action === 'exchange') {
            if (!code || !redirectUri) {
                throw new Error('Missing code or redirectUri')
            }

            // Exchange code for tokens
            const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    code,
                    client_id: GOOGLE_CLIENT_ID,
                    client_secret: GOOGLE_CLIENT_SECRET,
                    redirect_uri: redirectUri,
                    grant_type: 'authorization_code',
                }),
            })

            const tokens = await tokenResponse.json()

            if (tokens.error) {
                throw new Error(`Google OAuth error: ${tokens.error_description || tokens.error}`)
            }

            // Calculate expiry time
            const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

            // Store tokens in database (if userId provided)
            if (userId) {
                await supabase
                    .from('profiles')
                    .update({
                        google_refresh_token: tokens.refresh_token || null,
                        google_access_token: tokens.access_token,
                        google_token_expires_at: expiresAt,
                    })
                    .eq('id', userId)
            }

            return new Response(
                JSON.stringify({
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                    expires_at: expiresAt,
                    expires_in: tokens.expires_in,
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ACTION: Refresh access token using refresh token
        if (action === 'refresh') {
            if (!userId) {
                throw new Error('Missing userId for token refresh')
            }

            // Get refresh token from database
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('google_refresh_token')
                .eq('id', userId)
                .single()

            if (profileError || !profile?.google_refresh_token) {
                throw new Error('No refresh token found. Please reconnect to Google.')
            }

            // Request new access token
            const refreshResponse = await fetch(GOOGLE_TOKEN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    refresh_token: profile.google_refresh_token,
                    client_id: GOOGLE_CLIENT_ID,
                    client_secret: GOOGLE_CLIENT_SECRET,
                    grant_type: 'refresh_token',
                }),
            })

            const newTokens = await refreshResponse.json()

            if (newTokens.error) {
                // Refresh token revoked or expired - clear from database
                if (newTokens.error === 'invalid_grant') {
                    await supabase
                        .from('profiles')
                        .update({
                            google_refresh_token: null,
                            google_access_token: null,
                            google_token_expires_at: null,
                        })
                        .eq('id', userId)
                }
                throw new Error(`Token refresh failed: ${newTokens.error_description || newTokens.error}`)
            }

            // Calculate new expiry
            const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString()

            // Update database with new access token
            await supabase
                .from('profiles')
                .update({
                    google_access_token: newTokens.access_token,
                    google_token_expires_at: newExpiresAt,
                    // Note: Refresh token usually doesn't change, but update if provided
                    ...(newTokens.refresh_token && { google_refresh_token: newTokens.refresh_token }),
                })
                .eq('id', userId)

            return new Response(
                JSON.stringify({
                    access_token: newTokens.access_token,
                    expires_at: newExpiresAt,
                    expires_in: newTokens.expires_in,
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // ACTION: Get current valid token (refresh if needed)
        if (action === 'get-token') {
            if (!userId) {
                throw new Error('Missing userId')
            }

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('google_access_token, google_token_expires_at, google_refresh_token')
                .eq('id', userId)
                .single()

            if (profileError) {
                throw new Error('Profile not found')
            }

            // Check if we have a token and if it's still valid (with 5 min buffer)
            const expiresAt = profile.google_token_expires_at
            const isExpired = !expiresAt || new Date(expiresAt) < new Date(Date.now() + 5 * 60 * 1000)

            if (profile.google_access_token && !isExpired) {
                // Token is still valid
                return new Response(
                    JSON.stringify({
                        access_token: profile.google_access_token,
                        expires_at: expiresAt,
                        needs_reconnect: false,
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Token expired - try to refresh
            if (profile.google_refresh_token) {
                // Recursively call refresh action
                const refreshResponse = await fetch(GOOGLE_TOKEN_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        refresh_token: profile.google_refresh_token,
                        client_id: GOOGLE_CLIENT_ID,
                        client_secret: GOOGLE_CLIENT_SECRET,
                        grant_type: 'refresh_token',
                    }),
                })

                const newTokens = await refreshResponse.json()

                if (newTokens.error) {
                    // Clear invalid tokens
                    await supabase
                        .from('profiles')
                        .update({
                            google_refresh_token: null,
                            google_access_token: null,
                            google_token_expires_at: null,
                        })
                        .eq('id', userId)

                    return new Response(
                        JSON.stringify({
                            access_token: null,
                            needs_reconnect: true,
                            error: 'Refresh token expired. Please reconnect to Google.',
                        }),
                        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    )
                }

                const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString()

                // Update database
                await supabase
                    .from('profiles')
                    .update({
                        google_access_token: newTokens.access_token,
                        google_token_expires_at: newExpiresAt,
                    })
                    .eq('id', userId)

                return new Response(
                    JSON.stringify({
                        access_token: newTokens.access_token,
                        expires_at: newExpiresAt,
                        needs_reconnect: false,
                    }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // No refresh token available
            return new Response(
                JSON.stringify({
                    access_token: null,
                    needs_reconnect: true,
                    error: 'No valid token. Please connect to Google Calendar.',
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        throw new Error(`Unknown action: ${action}`)
    } catch (error) {
        console.error('Google OAuth Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
