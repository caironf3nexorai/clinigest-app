import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';

export const Login = () => {
    const [loading, setLoading] = useState(false);
    const [loginInput, setLoginInput] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            let emailToUse = loginInput.trim();

            // If input doesn't look like an email, try to find the username
            if (!emailToUse.includes('@')) {
                const { data: emailData, error: lookupError } = await supabase
                    .rpc('get_email_by_username', { uname: emailToUse });

                if (lookupError || !emailData) {
                    throw new Error('Usuário não encontrado. Verifique se digitou corretamente.');
                }
                emailToUse = emailData as string;
            }

            const { error } = await supabase.auth.signInWithPassword({
                email: emailToUse,
                password,
            });

            if (error) {
                throw error;
            } else {
                navigate('/');
            }
        } catch (err: any) {
            setMessage(err.message || 'Erro ao realizar login');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4 relative overflow-hidden">
            {/* Background Image Watermark */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center"
                style={{ backgroundImage: "url('/login-bg.png')" }}
            >
                {/* Overlay to make it subtle/watermark-like */}
                <div className="absolute inset-0 bg-white/85 backdrop-blur-[1px]"></div>
            </div>

            <div className="max-w-md w-full bg-[var(--surface)] p-8 rounded-xl shadow-lg border border-[var(--border)] relative z-10">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-[var(--primary)]">Clinic+</h1>
                    <p className="text-[var(--text-muted)] mt-2">Bem-vindo de volta! Faça login para continuar.</p>
                </div>

                {message && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                        {message}
                    </div>
                )}

                {/* Google Login Disabled by User Preference
                <button
                    onClick={async () => {
                        await supabase.auth.signInWithOAuth({
                            provider: 'google',
                            options: {
                                queryParams: {
                                    access_type: 'offline',
                                    prompt: 'consent',
                                },
                                scopes: 'https://www.googleapis.com/auth/calendar'
                            }
                        });
                    }}
                    type="button"
                    className="w-full mb-4 bg-white text-gray-700 border border-gray-300 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                    </svg>
                    Entrar com Google
                </button>

                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[var(--border)]"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-[var(--surface)] text-[var(--text-muted)]">Ou continue com email</span>
                    </div>
                </div>
                */}

                <form className="space-y-4" onSubmit={handleLogin}>
                    <div>
                        <label className="block text-sm font-medium mb-1">Email ou Usuário</label>
                        <input
                            type="text"
                            className="w-full p-2 rounded-lg border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            value={loginInput}
                            onChange={(e) => setLoginInput(e.target.value)}
                            required
                            placeholder="seu@email.com ou usuario"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Senha</label>
                        <input
                            type="password"
                            className="w-full p-2 rounded-lg border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex justify-end pt-1">
                        <Link to="/forgot-password" className="text-xs text-[var(--primary)] hover:underline">
                            Esqueceu a senha?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[var(--primary)] text-white p-3 rounded-lg font-bold hover:brightness-110 transition-all shadow-lg shadow-[var(--primary)]/20 disabled:opacity-50"
                    >
                        {loading ? 'Entrando...' : 'Entrar na Plataforma'}
                    </button>
                </form>

                {/* Public Registration Disabled
                <div className="mt-4 pt-4 border-t border-[var(--border)] text-center">
                    <p className="text-sm text-[var(--text-muted)] mb-2">Não tem conta?</p>
                    <Link
                        to="/register"
                        className="text-[var(--primary)] text-sm font-medium hover:underline"
                    >
                        Criar nova conta
                    </Link>
                </div>
                */}
            </div>
        </div>
    );
};
