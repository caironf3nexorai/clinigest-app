import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Save, Lock, User, AlertCircle, CheckCircle, Upload, Loader2, X, Store } from 'lucide-react';

export const Configuracoes = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const logoInputRef = useRef<HTMLInputElement>(null);

    // Profile State
    const [companyName, setCompanyName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [lastChange, setLastChange] = useState<string | null>(null);

    // Password State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    useEffect(() => {
        if (user) {
            loadProfileData();
        }
    }, [user]);

    const loadProfileData = async () => {
        // Fetch from public.profiles to get the true state and username
        const { data, error } = await supabase
            .from('profiles')
            .select('company_name, username, email, company_logo, last_name_change')
            .eq('id', user?.id)
            .single();

        if (data) {
            setCompanyName(data.company_name || '');
            setUsername(data.username || '');
            setEmail(data.email || user?.email || '');
            setLogoUrl(data.company_logo || '');
            setLastChange(data.last_name_change);
        } else {
            // Fallback to session metadata if profile fetch fails
            setCompanyName(user?.user_metadata?.company_name || '');
            setEmail(user?.email || '');
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !user) return;

        const file = e.target.files[0];
        if (file.size > 2 * 1024 * 1024) { // 2MB
            setMessage({ type: 'error', text: 'A logo deve ter no máximo 2MB.' });
            return;
        }

        setUploadingLogo(true);
        setMessage(null);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `logo-${Date.now()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            // Upload
            const { error: uploadError } = await supabase.storage
                .from('company-logos')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data } = supabase.storage.from('company-logos').getPublicUrl(filePath);
            setLogoUrl(data.publicUrl);

            // User needs to save to create permanence or we can update just the logo here
            // But we want 'handleUpdateProfile' logic.
            setMessage({ type: 'success', text: 'Logo carregado. Clique em "Salvar Alterações" para confirmar.' });

        } catch (error: any) {
            console.error(error);
            setMessage({ type: 'error', text: 'Erro no upload do logo: ' + error.message });
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        setMessage(null);

        try {
            // 1. Check 15-day limit if name or username changed
            const { data: currentProfile } = await supabase.from('profiles').select('company_name, username, last_name_change').eq('id', user.id).single();

            const isNameChanged = companyName !== currentProfile?.company_name;
            const isUserChanged = username !== currentProfile?.username;

            if (isNameChanged || isUserChanged) {
                if (currentProfile?.last_name_change) {
                    const lastDate = new Date(currentProfile.last_name_change);
                    const now = new Date();
                    const diffDays = Math.ceil((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

                    if (diffDays < 15) {
                        throw new Error(`Você só pode alterar o nome/usuário a cada 15 dias. Próxima alteração disponível em ${15 - diffDays} dias.`);
                    }
                }
            }

            // 2. Update public.profiles (Source of Truth)
            const updates: any = {
                company_name: companyName,
                username: username, // Ensure uniqueness handled by DB constraint
                company_logo: logoUrl
            };

            if (isNameChanged || isUserChanged) {
                updates.last_name_change = new Date().toISOString();
            }

            const { error: profileError } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (profileError) {
                if (profileError.message.includes('unique')) throw new Error('Este nome de usuário já está em uso.');
                throw profileError;
            }

            // 3. Sync with Auth Metadata (for session availability)
            const { error: authError } = await supabase.auth.updateUser({
                email: email !== user.email ? email : undefined,
                data: {
                    company_name: companyName,
                    company_logo: logoUrl,
                    username: username
                }
            });

            if (authError) throw authError;

            setMessage({
                type: 'success',
                text: email !== user.email
                    ? 'Perfil atualizado! Verifique seu novo e-mail para confirmar a troca.'
                    : 'Perfil e Login atualizados com sucesso.'
            });

            // Refresh data
            loadProfileData();

            // Force reload if name changed to reflect everywhere instantly
            if (isNameChanged) {
                setTimeout(() => window.location.reload(), 1500);
            }

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
        <div className="max-w-2xl mx-auto pb-20">
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Configurações</h1>

            {message && (
                <div className={`p-4 rounded-lg mb-6 flex items-start gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.type === 'success' ? <CheckCircle className="shrink-0 mt-0.5" size={18} /> : <AlertCircle className="shrink-0 mt-0.5" size={18} />}
                    <p className="text-sm font-medium">{message.text}</p>
                </div>
            )}

            <div className="space-y-8">
                {/* Profile Settings */}
                <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
                        <User size={20} className="text-slate-400" />
                        Perfil da Empresa
                    </h2>

                    <div className="mb-8">
                        <label className="block text-sm font-medium mb-3 text-slate-700">Logotipo da Clínica</label>
                        <div className="flex items-start gap-6">
                            <div className="w-24 h-24 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden relative group">
                                {logoUrl ? (
                                    <>
                                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                                        <button
                                            type="button"
                                            onClick={() => setLogoUrl('')}
                                            className="absolute inset-0 bg-slate-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                            title="Remover Logo"
                                        >
                                            <X size={20} />
                                        </button>
                                    </>
                                ) : (
                                    <Store className="text-slate-300" size={32} />
                                )}

                                {uploadingLogo && (
                                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
                                        <Loader2 className="animate-spin text-[var(--primary)]" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <input
                                    type="file"
                                    ref={logoInputRef}
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                    accept="image/png, image/jpeg, image/jpg"
                                />
                                <button
                                    type="button"
                                    onClick={() => logoInputRef.current?.click()}
                                    className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 mb-2"
                                    disabled={uploadingLogo}
                                >
                                    <Upload size={16} />
                                    {logoUrl ? 'Alterar Logo' : 'Carregar Logo'}
                                </button>
                                <p className="text-xs text-slate-500 max-w-[200px]">
                                    Recomendado: Imagem quadrada (500x500px), PNG ou JPG. Máx 2MB.
                                </p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Nome de Usuário (Login)</label>
                            <input
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                placeholder="usuario_login"
                                pattern="[a-zA-Z0-9_.-]+"
                                title="Apenas letras, números, ponto, traço e underline."
                            />
                            <p className="text-xs text-slate-400 mt-1">
                                {lastChange
                                    ? `Última alteração: ${new Date(lastChange).toLocaleDateString()}. Próxima disponível em: ${new Date(new Date(lastChange).getTime() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString()}`
                                    : 'Atenção: A cada 15 dias você poderá alterar seu usuário e nome da clínica.'}
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Nome da Empresa / Clínica</label>
                            <input
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                                value={companyName}
                                onChange={e => setCompanyName(e.target.value)}
                                placeholder="Ex: Clínica Saúde Total"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">E-mail de Acesso</label>
                            <input
                                type="email"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                            />
                            <p className="text-xs text-slate-400 mt-1">Alterar o e-mail exigirá uma nova confirmação.</p>
                        </div>
                        <div className="pt-4 flex justify-end">
                            <button type="submit" disabled={loading} className="btn btn-primary flex items-center gap-2">
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                Salvar Alterações
                            </button>
                        </div>
                    </form>
                </section>

                {/* Password Settings */}
                <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
                        <Lock size={20} className="text-slate-400" />
                        Segurança
                    </h2>
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Senha Atual</label>
                            <input
                                type="password"
                                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                placeholder="Digite sua senha atual para confirmar"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nova Senha</label>
                                <input
                                    type="password"
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Confirmar Nova Senha</label>
                                <input
                                    type="password"
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all"
                                    value={confirmNewPassword}
                                    onChange={e => setConfirmNewPassword(e.target.value)}
                                    placeholder="Repita a nova senha"
                                />
                            </div>
                        </div>
                        <div className="pt-4 flex justify-end">
                            <button type="submit" disabled={loading || !newPassword || !currentPassword} className="btn bg-slate-800 text-white hover:bg-slate-900 flex items-center gap-2">
                                {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                Atualizar Senha
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    );
};
