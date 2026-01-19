import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';

export const Login = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setMessage(error.message);
            setLoading(false);
        } else {
            navigate('/');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
            <div className="max-w-md w-full bg-[var(--surface)] p-8 rounded-xl shadow-lg border border-[var(--border)]">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-[var(--primary)]">CliniGest</h1>
                    <p className="text-[var(--text-muted)] mt-2">Bem-vindo de volta! Faça login para continuar.</p>
                </div>

                {message && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                        {message}
                    </div>
                )}

                <form className="space-y-4" onSubmit={handleLogin}>
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                            type="email"
                            className="w-full p-2 rounded-lg border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
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

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[var(--primary)] text-white py-2 rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Carregando...' : 'Entrar'}
                    </button>
                </form>

                <div className="mt-4 pt-4 border-t border-[var(--border)] text-center">
                    <p className="text-sm text-[var(--text-muted)] mb-2">Não tem conta?</p>
                    <Link
                        to="/register"
                        className="text-[var(--primary)] text-sm font-medium hover:underline"
                    >
                        Criar nova conta
                    </Link>
                </div>
            </div>
        </div>
    );
};
