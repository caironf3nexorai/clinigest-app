import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

export const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password',
            });

            if (error) throw error;
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Erro ao enviar email de recuperação.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-slate-200">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-800">Recuperar Senha</h1>
                    <p className="text-slate-500 mt-2">
                        Digite seu email para receber o link de redefinição.
                    </p>
                </div>

                {success ? (
                    <div className="text-center py-6">
                        <div className="mx-auto w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle size={24} />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-2">Email Enviado!</h3>
                        <p className="text-slate-600 mb-6">
                            Verifique sua caixa de entrada (e spam) para redefinir sua senha.
                        </p>
                        <Link to="/login" className="btn btn-primary w-full block">
                            Voltar para Login
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleReset} className="space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium mb-1 text-slate-700">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !email}
                            className="w-full bg-indigo-600 text-white py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Enviar Email'}
                        </button>

                        <div className="pt-4 text-center">
                            <Link
                                to="/login"
                                className="text-sm text-slate-600 hover:text-indigo-600 flex items-center justify-center gap-1 transition-colors"
                            >
                                <ArrowLeft size={16} />
                                Voltar para Login
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};
