// Google OAuth Callback Page
// This page handles the redirect from Google OAuth and exchanges the code for tokens

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { exchangeCodeForTokens } from '../lib/googleOAuth';

export default function GoogleOAuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get('code');
            const error = searchParams.get('error');

            if (error) {
                setStatus('error');
                setErrorMessage(error === 'access_denied'
                    ? 'Acesso negado. Você precisa permitir acesso ao Google Calendar.'
                    : `Erro do Google: ${error}`
                );
                return;
            }

            if (!code) {
                setStatus('error');
                setErrorMessage('Código de autorização não encontrado.');
                return;
            }

            if (!user) {
                setStatus('error');
                setErrorMessage('Usuário não autenticado. Faça login primeiro.');
                return;
            }

            try {
                // Get the redirect URI (current origin + callback path)
                const redirectUri = `${window.location.origin}/oauth/google/callback`;

                console.log('Exchanging code for tokens...', { redirectUri, userId: user.id });

                // Exchange code for tokens via Edge Function
                const tokens = await exchangeCodeForTokens(code, redirectUri, user.id);

                console.log('Token exchange response:', tokens);

                if (tokens.access_token) {
                    // Store in localStorage for immediate use
                    localStorage.setItem('google_access_token', tokens.access_token);
                    setStatus('success');

                    // Redirect back to Agenda after 2 seconds
                    setTimeout(() => {
                        navigate('/agenda', { replace: true });
                    }, 2000);
                } else {
                    throw new Error(tokens.error || 'Tokens não retornados');
                }
            } catch (err: any) {
                console.error('Token exchange failed:', err);
                setStatus('error');
                // Show more detailed error
                const errorMsg = err.message || 'Erro ao trocar código por tokens.';
                setErrorMessage(errorMsg);
            }
        };

        // Small delay to ensure session is fully restored after redirect
        const timer = setTimeout(handleCallback, 500);
        return () => clearTimeout(timer);
    }, [searchParams, user, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center max-w-md mx-4">
                {status === 'loading' && (
                    <>
                        <Loader2 className="w-16 h-16 text-emerald-400 animate-spin mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-white mb-2">
                            Conectando ao Google Calendar...
                        </h2>
                        <p className="text-slate-300">
                            Aguarde enquanto configuramos sua integração.
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-white mb-2">
                            Conectado com sucesso!
                        </h2>
                        <p className="text-slate-300">
                            Redirecionando para a Agenda...
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-white mb-2">
                            Erro na conexão
                        </h2>
                        <p className="text-red-300 mb-4">
                            {errorMessage}
                        </p>
                        <button
                            onClick={() => navigate('/agenda', { replace: true })}
                            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                        >
                            Voltar para Agenda
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
