import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';

export const Register = () => {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [username, setUsername] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password || !companyName || !username) {
            setMessage('Por favor, preencha todos os campos.');
            return;
        }

        setLoading(true);
        setMessage('');

        // 1. Sign Up User
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    company_name: companyName,
                    username: username,
                }
            }
        });

        if (authError) {
            setMessage(authError.message);
            setLoading(false);
            return;
        }

        // 2. Create Profile (handled by Trigger, but we can explicit insert if needed)
        // With trigger, metadata username will be copied to profile if trigger supports it.
        // Assuming trigger copies raw_user_meta_data -> profile columns.

        setMessage('Cadastro realizado! Verifique seu e-mail para confirmar.');
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
            <div className="max-w-md w-full bg-[var(--surface)] p-8 rounded-xl shadow-lg border border-[var(--border)]">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-[var(--primary)]">Nova Conta</h1>
                    <p className="text-[var(--text-muted)] mt-2">Cadastre sua clínica para começar</p>
                </div>

                {message && (
                    <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes('realizado') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {message}
                    </div>
                )}

                <form className="space-y-4" onSubmit={handleSignUp}>
                    <div>
                        <label className="block text-sm font-medium mb-1">Nome da Empresa / Clínica</label>
                        <input
                            type="text"
                            className="w-full p-2 rounded-lg border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Usuário de Login</label>
                        <input
                            type="text"
                            className="w-full p-2 rounded-lg border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            placeholder="ex: clinica_saude"
                            pattern="[a-zA-Z0-9_.-]+"
                            title="Apenas letras, números, ponto, traço e underline."
                        />
                    </div>
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
                        {loading ? 'Criando conta...' : 'Cadastrar'}
                    </button>
                </form>

                <div className="mt-4 pt-4 border-t border-[var(--border)] text-center">
                    <p className="text-sm text-[var(--text-muted)] mb-2">Já tem uma conta?</p>
                    <Link
                        to="/login"
                        className="text-[var(--primary)] text-sm font-medium hover:underline"
                    >
                        Voltar para Login
                    </Link>
                </div>
            </div>
        </div>
    );
};
