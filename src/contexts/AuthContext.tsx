import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/db';
import { isAfter, parseISO } from 'date-fns';

type AuthContextType = {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    isSubscriptionValid: boolean;
    isAdmin: boolean;
    signOut: () => Promise<void>;
    checkSubscription: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    isSubscriptionValid: true,
    isAdmin: false,
    signOut: async () => { },
    checkSubscription: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubscriptionValid, setIsSubscriptionValid] = useState(true);
    const isAdmin = !!profile?.is_admin || profile?.role === 'super_admin';

    const fetchProfile = useCallback(async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
            }

            if (data) {
                // console.log('AuthContext: Profile loaded:', data); // DEBUG
                setProfile(data);

                // Admins always have valid subscription
                if (data.is_admin) {
                    setIsSubscriptionValid(true);
                    return;
                }

                if (data.valid_until) {
                    const isValid = isAfter(parseISO(data.valid_until), new Date());
                    setIsSubscriptionValid(isValid);
                } else {
                    // No expiration date means indefinite access (valid)
                    setIsSubscriptionValid(true);
                }
            } else {
                console.log('AuthContext: No profile found for user', userId); // DEBUG
                setIsSubscriptionValid(true);
            }
        } catch (err) {
            console.error('Unexpected error fetching profile:', err);
            setIsSubscriptionValid(true);
        }
    }, []);

    useEffect(() => {
        let mounted = true;

        // Failsafe timeout: Force app to load after 2.5 seconds if stuck
        const loadTimeout = setTimeout(() => {
            if (mounted && loading) {
                console.warn("Forcing app load due to timeout");
                setLoading(false);
            }
        }, 2500);

        const initializeAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (!mounted) return;

                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    // Try to fetch profile, but resolve loading state regardless of outcome
                    await fetchProfile(session.user.id);
                }
            } catch (error) {
                console.error("Auth init error:", error);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        initializeAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            setSession(session);
            setUser(session?.user ?? null);

            if (session?.user) {
                // Background update on auth change
                fetchProfile(session.user.id);

                // Save Google Tokens if available (Auth Integration)
                if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                    // Start saving process without blocking the UI
                    import('../services/googleAuth').then(({ GoogleAuthService }) => {
                        GoogleAuthService.saveTokens(session);
                    });
                }
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            clearTimeout(loadTimeout);
            subscription.unsubscribe();
        };
    }, [fetchProfile]);

    const checkSubscription = async () => {
        if (user) {
            await fetchProfile(user.id);
        }
    };

    const signOut = async () => {
        setLoading(true);
        try {
            await supabase.auth.signOut();
            localStorage.removeItem('google_access_token'); // Clear Google Calendar Token
        } catch (error) {
            console.error("SignOut error:", error);
        }
        setProfile(null);
        setIsSubscriptionValid(true);
        setLoading(false);
    };

    return (
        <AuthContext.Provider value={{ session, user, profile, loading, isSubscriptionValid, isAdmin, signOut, checkSubscription }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
