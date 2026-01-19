import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Save, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';

export const Configuracoes = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Profile State
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');

    // Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    useEffect(() => {
        if (user) {
            setCompanyName(user.user_metadata?.company_name || '');
            setEmail(user.email || '');
        }
    }, [user]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const updates: any = {
                data: { company_name: companyName }
            };

            // Only include email if it changed (triggers confirmation flow)
            if (email !== user?.email) {
                updates.email = email;
            }

            const { error } = await supabase.auth.updateUser(updates);

            if (error) throw error;

            setMessage({
                type: 'success',
                text: email !== user?.email
                    ? 'Perfil atualizado! Verifique seu novo e-mail para confirmar a alteração.'
                    : 'Perfil atualizado com sucesso.'
            });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        if (newPassword !== confirmNewPassword) {
            setMessage({ type: 'error', text: 'As novas senhas não coincidem.' });
            setLoading(false);
            return;
        }

        try {
            // 1. Verify old password by trying to sign in
            if (user?.email) {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: user.email,
                    password: currentPassword
                });

                if (signInError) {
                    throw new Error('A senha atual está incorreta.');
                }
            }

            // 2. Update to new password
            const { error } = await supabase.auth.updateUser({ password: newPassword });

            if (error) throw error;

            setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');

        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-10">
            <h1 className="text-2xl font-bold mb-6">Configurações da Conta</h1>

            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <p>{message.text}</p>
                </div>
            )}

            {/* Profile Section */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <User className="text-[var(--primary)]" size={24} />
                    <h2 className="text-lg font-bold text-slate-900">Dados do Perfil</h2>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Empresa</label>
                            <input
                                type="text"
                                className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                            <input
                                type="email"
                                className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <p className="text-xs text-slate-500 mt-1">Alterar o e-mail exigirá nova confirmação.</p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary"
                        >
                            <Save size={18} />
                            Salvar Alterações
                        </button>
                    </div>
                </form>
            </div>

            {/* Password Section */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <Lock className="text-[var(--primary)]" size={24} />
                    <h2 className="text-lg font-bold text-slate-900">Segurança - Alterar Senha</h2>
                </div>

                <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Senha Atual</label>
                        <input
                            type="password"
                            placeholder="Digite sua senha atual"
                            className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                    </div>

                    <div className="pt-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nova Senha</label>
                        <input
                            type="password"
                            placeholder="Mínimo 6 caracteres"
                            className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar Nova Senha</label>
                        <input
                            type="password"
                            placeholder="Repita a nova senha"
                            className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-[var(--primary)] outline-none transition-all"
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                        />
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={loading || !currentPassword || !newPassword}
                            className="btn bg-slate-800 text-white hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={18} />
                            Atualizar Senha
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
