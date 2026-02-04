import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Profile } from '../types/db';
import { format, parseISO, isAfter } from 'date-fns';
import { Shield, CheckCircle, XCircle, AlertTriangle, Edit, Save, X, Loader2, Trash2, UserPlus, Copy } from 'lucide-react';
import { useToast } from '../components/Toast';
import { ConfirmModal } from '../components/ConfirmModal';


export const AdminDashboard = () => {
    const { isAdmin } = useAuth();
    const toast = useToast();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDate, setEditDate] = useState('');
    const [saving, setSaving] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        type: 'delete' | 'remove-access' | null;
        profileId?: string;
        email?: string;
    }>({ isOpen: false, type: null });

    useEffect(() => {
        if (isAdmin) {
            fetchProfiles();
        }
    }, [isAdmin]);

    const fetchProfiles = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setProfiles(data || []);
        } catch (err: any) {
            console.error(err);
            setError('Erro ao carregar clientes. Verifique se você é admin.');
        } finally {
            setLoading(false);
        }
    };

    const [editName, setEditName] = useState('');
    const [editUsername, setEditUsername] = useState('');
    const [editPlanConfig, setEditPlanConfig] = useState<any>({});

    const handleEditClick = (profile: Profile) => {
        setEditingId(profile.id);
        setEditName(profile.company_name || '');
        setEditUsername(profile.username || '');
        // Default plan config if missing
        setEditPlanConfig(profile.plan_config || { financial_module: false, whatsapp_module: false, multi_calendar: true });

        if (profile.valid_until) {
            setEditDate(format(parseISO(profile.valid_until), 'yyyy-MM-dd'));
        } else {
            setEditDate('');
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditDate('');
        setEditPlanConfig({});
    };

    const handleSaveProfile = async (profileId: string) => {
        setSaving(true);
        try {
            let updatePayload: any = {
                company_name: editName,
                username: editUsername || null,
                plan_config: editPlanConfig
            };

            if (editDate) {
                // Set end of day for the selected date
                const newDate = new Date(editDate);
                newDate.setHours(23, 59, 59, 999);
                updatePayload.valid_until = newDate.toISOString();
            } else {
                // Empty date = Indefinite (null)
                updatePayload.valid_until = null;
            }

            const { error } = await supabase
                .from('profiles')
                .update(updatePayload)
                .eq('id', profileId);

            if (error) throw error;

            // Note: Admin bypasses the 15-day limit automatically because we don't check it here.

            // Update local state
            setProfiles(profiles.map(p => p.id === profileId ? {
                ...p,
                valid_until: updatePayload.valid_until,
                company_name: updatePayload.company_name,
                username: updatePayload.username,
                plan_config: updatePayload.plan_config
            } : p));
            setEditingId(null);
        } catch (err: any) {
            console.error(err);
            toast.error('Erro ao salvar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const getStatus = (validUntil: string) => {
        if (!validUntil) return <span className="text-slate-400">Vitalício/Indefinido</span>;
        const isValid = isAfter(parseISO(validUntil), new Date());
        return isValid
            ? <span className="text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><CheckCircle size={12} /> Ativo</span>
            : <span className="text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><XCircle size={12} /> Expirado</span>;
    };

    const [deletingId, setDeletingId] = useState<string | null>(null);

    const handleDeleteClick = (profileId: string) => {
        setConfirmModal({ isOpen: true, type: 'delete', profileId });
    };

    const confirmDelete = async () => {
        const profileId = confirmModal.profileId;
        if (!profileId) return;

        setConfirmModal({ isOpen: false, type: null });
        setDeletingId(profileId);

        try {
            const { error } = await supabase.rpc('delete_user_account', {
                target_user_id: profileId
            });

            if (error) throw error;

            setProfiles(profiles.filter(p => p.id !== profileId));
            toast.success('Usuário excluído com sucesso (Auth + Perfil).');
        } catch (err: any) {
            console.error(err);
            toast.error('Erro ao excluir: ' + err.message);
        } finally {
            setDeletingId(null);
        }
    };

    const [showInviteModal, setShowInviteModal] = useState(false);

    // --- ACCESS CONTROL TAB STATE ---
    const [activeTab, setActiveTab] = useState<'clinics' | 'access'>('clinics');
    const [allowedEmails, setAllowedEmails] = useState<any[]>([]);
    const [newAllowedEmail, setNewAllowedEmail] = useState('');
    const [newAllowedDesc, setNewAllowedDesc] = useState('');
    const [newAllowedPlan, setNewAllowedPlan] = useState<'simple' | 'pro'>('simple');

    useEffect(() => {
        if (isAdmin && activeTab === 'access') {
            fetchAllowedEmails();
        }
    }, [isAdmin, activeTab]);

    const fetchAllowedEmails = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('allowed_emails')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setAllowedEmails(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAllowedEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { error } = await supabase.from('allowed_emails').insert({
                email: newAllowedEmail.trim(),
                description: newAllowedDesc,
                plan: newAllowedPlan
            });
            if (error) throw error;

            const link = window.location.origin + '/register?email=' + encodeURIComponent(newAllowedEmail.trim()) + '&plan=' + newAllowedPlan;

            setNewAllowedEmail('');
            setNewAllowedDesc('');
            fetchAllowedEmails();

            // Show the link immediately
            toast.success('Parceiro autorizado com sucesso! Link copiado.');
            navigator.clipboard.writeText(link);
        } catch (err: any) {
            toast.error('Erro ao adicionar: ' + err.message);
        }
    };

    const handleRemoveAllowedEmail = (email: string) => {
        setConfirmModal({ isOpen: true, type: 'remove-access', email });
    };

    const confirmRemoveAccess = async () => {
        const email = confirmModal.email;
        if (!email) return;

        setConfirmModal({ isOpen: false, type: null });

        try {
            const { error } = await supabase.from('allowed_emails').delete().eq('email', email);
            if (error) throw error;
            fetchAllowedEmails();
            toast.success('Acesso removido.');
        } catch (err: any) {
            toast.error('Erro ao remover: ' + err.message);
        }
    };

    // Manual Registration State
    const [regName, setRegName] = useState('');
    const [regUsername, setRegUsername] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regDays, setRegDays] = useState(7);
    const [regPlan, setRegPlan] = useState<'simple' | 'pro'>('pro');
    const [regLoading, setRegLoading] = useState(false);

    const handleCopyInvite = () => {
        const url = window.location.origin + '/register';
        navigator.clipboard.writeText(url);
        toast.info('Link de cadastro copiado!');
    };

    const handleManualRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setRegLoading(true);

        try {
            // 1. Create user using raw fetch to avoid session conflict
            // Required: SUPABASE_URL and SUPABASE_ANON_KEY (Vite env vars)
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            // Prepare Plan Config
            const isSimple = regPlan === 'simple';
            const planConfig = {
                financial_module: true,
                whatsapp_module: false,
                multi_calendar: !isSimple,
                simple_mode: isSimple
            };

            const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey,
                },
                body: JSON.stringify({
                    email: regEmail,
                    password: regPassword,
                    data: {
                        company_name: regName,
                        username: regUsername,
                        plan_config: planConfig
                    }
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error(data);
                throw new Error(data.msg || data.error_description || 'Erro ao criar usuário');
            }

            const newUserId = data.user?.id || data.id;

            if (newUserId) {
                // 2. Determine validity date
                const validUntil = new Date();
                validUntil.setDate(validUntil.getDate() + Number(regDays));
                validUntil.setHours(23, 59, 59, 999);

                // 3. Manually insert/update profile (Safety net, though signup hook should handle it if trigger works)
                // We use upsert here just in case trigger didn't catch metadata correctly or we want to enforce validity
                const { error: updateError } = await supabase
                    .from('profiles')
                    .upsert({
                        id: newUserId,
                        email: regEmail,
                        company_name: regName,
                        username: regUsername,
                        valid_until: validUntil.toISOString(),
                        plan_config: planConfig
                    });

                if (updateError) console.error('Error updating profile:', updateError);

                // Add to Allowed Emails to prevent future login blocks if using triggers
                await supabase.from('allowed_emails').insert({
                    email: regEmail,
                    description: `Cadastro Manual: ${regName}`
                }).select();


                toast.success(`Cliente cadastrado com sucesso! Email: ${regEmail}`);
                setShowInviteModal(false);
                setRegName('');
                setRegUsername('');
                setRegEmail('');
                setRegPassword('');
                setRegPlan('pro');
                fetchProfiles();
            }

        } catch (err: any) {
            console.error(err);
            toast.error('Erro no cadastro Manual: ' + err.message);
        } finally {
            setRegLoading(false);
        }
    };

    return (
        <>
            <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24">
                {/* Modal Manual Registration */}
                {showInviteModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h3 className="font-bold text-lg text-slate-800">Cadastrar Nova Clínica</h3>
                                <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="overflow-y-auto p-6">
                                <form onSubmit={handleManualRegister} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium mb-1">Plano Inicial</label>
                                            <div className="flex gap-4">
                                                <label className={`flex-1 p-3 border rounded-lg cursor-pointer transition-colors ${regPlan === 'simple' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'hover:bg-slate-50'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <input type="radio" checked={regPlan === 'simple'} onChange={() => setRegPlan('simple')} className="text-indigo-600" />
                                                        <span className="font-bold text-sm">Simples</span>
                                                    </div>
                                                    <p className="text-xs mt-1 opacity-75">Básico (Agenda + Fin)</p>
                                                </label>
                                                <label className={`flex-1 p-3 border rounded-lg cursor-pointer transition-colors ${regPlan === 'pro' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'hover:bg-slate-50'}`}>
                                                    <div className="flex items-center gap-2">
                                                        <input type="radio" checked={regPlan === 'pro'} onChange={() => setRegPlan('pro')} className="text-indigo-600" />
                                                        <span className="font-bold text-sm">Pro (Clínica)</span>
                                                    </div>
                                                    <p className="text-xs mt-1 opacity-75">Completo (+Equipe)</p>
                                                </label>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1">Nome Clínica</label>
                                            <input type="text" value={regName} onChange={e => setRegName(e.target.value)} className="w-full p-2 border rounded" required />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Usuário Login</label>
                                            <input type="text" value={regUsername} onChange={e => setRegUsername(e.target.value)} className="w-full p-2 border rounded" required />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium mb-1">Email</label>
                                            <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} className="w-full p-2 border rounded" required />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium mb-1">Senha Provisória</label>
                                            <input type="text" value={regPassword} onChange={e => setRegPassword(e.target.value)} className="w-full p-2 border rounded" required minLength={6} placeholder="Mínimo 6 caracteres" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Validade (Dias)</label>
                                            <input type="number" value={regDays} onChange={e => setRegDays(Number(e.target.value))} className="w-full p-2 border rounded" required min={1} />
                                        </div>
                                    </div>

                                    <div className="pt-4 flex gap-3">
                                        <button type="button" onClick={() => setShowInviteModal(false)} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                                        <button type="submit" disabled={regLoading} className="flex-[2] bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 font-medium disabled:opacity-50">
                                            {regLoading ? 'Cadastrando...' : 'Confirmar Cadastro'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header ... */}
                {/* ... */}

                {/* Header with Tabs */}
                <header className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">Painel Administrativo</h1>
                            <p className="text-slate-500">Gestão global de clínicas e permissões</p>
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => setActiveTab('clinics')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'clinics' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Clínicas
                            </button>
                            <button
                                onClick={() => setActiveTab('access')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'access' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Lista de Acesso
                            </button>
                        </div>
                    </div>

                    {activeTab === 'clinics' && (
                        <div className="flex justify-end">
                            <button
                                onClick={() => setShowInviteModal(true)}
                                className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
                            >
                                <UserPlus size={20} />
                                Cadastrar Clínica
                            </button>
                        </div>
                    )}
                </header>

                {/* TAB: ACCESS LIST */}
                {activeTab === 'access' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                                    <Shield className="text-indigo-600" size={20} />
                                    Adicionar Parceiro Autorizado
                                </h3>
                                <button
                                    onClick={() => {
                                        const url = window.location.origin + '/register';
                                        navigator.clipboard.writeText(url);
                                        toast.info('Link de cadastro copiado!');
                                    }}
                                    className="text-sm bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2 font-medium"
                                >
                                    <Copy size={16} />
                                    Copiar Link de Cadastro
                                </button>
                            </div>
                            <form onSubmit={handleAddAllowedEmail} className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-1 w-full">
                                    <label className="block text-sm font-medium mb-1">Email do Parceiro</label>
                                    <input
                                        type="email"
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="exemplo@parceiro.com"
                                        value={newAllowedEmail}
                                        onChange={e => setNewAllowedEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="flex-1 w-full">
                                    <label className="block text-sm font-medium mb-1">Descrição / Nome</label>
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Dono da Clínica X"
                                        value={newAllowedDesc}
                                        onChange={e => setNewAllowedDesc(e.target.value)}
                                    />
                                </div>
                                <div className="flex flex-col gap-1 min-w-[150px]">
                                    <label className="block text-sm font-medium">Plano Inicial</label>
                                    <select
                                        className="p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium text-slate-700"
                                        value={newAllowedPlan}
                                        onChange={e => setNewAllowedPlan(e.target.value as 'simple' | 'pro')}
                                    >
                                        <option value="pro">Pro (Equipe)</option>
                                        <option value="simple">Simples</option>
                                    </select>
                                </div>
                                <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors md:w-auto w-full">
                                    Autorizar
                                </button>
                            </form>
                            <p className="text-xs text-slate-400 mt-2">
                                * Emails nesta lista podem criar contas livremente. Convites de funcionários (Agenda) não precisam estar aqui.
                            </p>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4">Email Autorizado</th>
                                        <th className="px-6 py-4">Descrição</th>
                                        <th className="px-6 py-4">Data Inclusão</th>
                                        <th className="px-6 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading ? (
                                        <tr><td colSpan={4} className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" /> Carregando...</td></tr>
                                    ) : allowedEmails.length === 0 ? (
                                        <tr><td colSpan={4} className="p-8 text-center text-slate-500">Nenhum email na lista VIP.</td></tr>
                                    ) : allowedEmails.map((item: any) => (
                                        <tr key={item.email} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 font-medium text-slate-700">{item.email}</td>
                                            <td className="px-6 py-4 text-slate-600">{item.description || '-'}</td>
                                            <td className="px-6 py-4 text-slate-400">{item.created_at ? format(parseISO(item.created_at), 'dd/MM/yyyy') : '-'}</td>
                                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        let url = window.location.origin + '/register?email=' + encodeURIComponent(item.email);
                                                        if (item.plan) {
                                                            url += '&plan=' + item.plan;
                                                        } else {
                                                            url += '&plan=simple';
                                                        }
                                                        navigator.clipboard.writeText(url);
                                                        toast.info('Link de convite personalizado copiado!');
                                                    }}
                                                    className="text-indigo-600 hover:bg-indigo-50 p-2 rounded transition-colors"
                                                    title="Copiar Link Personalizado"
                                                >
                                                    <Copy size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveAllowedEmail(item.email)}
                                                    className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors"
                                                    title="Remover Acesso"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div >
                )
                }


                {/* TAB: CLINICS (Existing) */}
                {
                    activeTab === 'clinics' && (
                        <>
                            {loading ? (
                                <div className="flex justify-center p-12">
                                    <Loader2 className="animate-spin text-indigo-600" size={32} />
                                </div>
                            ) : error ? (
                                <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2">
                                    <AlertTriangle /> {error}
                                </div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                                <tr>
                                                    <th className="px-6 py-4">Empresa / Clínica</th>
                                                    <th className="px-6 py-4">Módulos (Planos)</th>
                                                    <th className="px-6 py-4">Login (Usuário)</th>
                                                    <th className="px-6 py-4">Validade</th>
                                                    <th className="px-6 py-4">Status</th>
                                                    <th className="px-6 py-4 text-right">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {profiles.map(profile => (
                                                    <tr key={profile.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-6 py-4 font-medium text-slate-900">
                                                            {editingId === profile.id ? (
                                                                <input
                                                                    type="text"
                                                                    value={editName}
                                                                    onChange={e => setEditName(e.target.value)}
                                                                    className="p-1 border rounded w-full text-xs"
                                                                    placeholder="Nome Empresa"
                                                                />
                                                            ) : (
                                                                <>
                                                                    {profile.company_name || 'Sem nome'}
                                                                    {profile.is_admin && <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">ADMIN</span>}
                                                                </>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {editingId === profile.id ? (
                                                                <div className="flex flex-col gap-2 text-xs">
                                                                    <div className="font-semibold text-slate-700 mb-1">Plano:</div>
                                                                    <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-100">
                                                                        <input
                                                                            type="radio"
                                                                            name={`plan-${profile.id}`}
                                                                            checked={editPlanConfig?.simple_mode === true}
                                                                            onChange={() => setEditPlanConfig({
                                                                                financial_module: true,
                                                                                multi_calendar: false,
                                                                                whatsapp_module: false,
                                                                                simple_mode: true
                                                                            })}
                                                                            className="text-[var(--primary)] focus:ring-[var(--primary)]"
                                                                        />
                                                                        <span>
                                                                            <strong>Simples</strong> (Agenda+Custos)
                                                                        </span>
                                                                    </label>
                                                                    <label className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-slate-100">
                                                                        <input
                                                                            type="radio"
                                                                            name={`plan-${profile.id}`}
                                                                            checked={!editPlanConfig?.simple_mode}
                                                                            onChange={() => setEditPlanConfig({
                                                                                financial_module: true,
                                                                                multi_calendar: true,
                                                                                whatsapp_module: false,
                                                                                simple_mode: false
                                                                            })}
                                                                            className="text-[var(--primary)] focus:ring-[var(--primary)]"
                                                                        />
                                                                        <span>
                                                                            <strong>Pro</strong> (Tudo + Equipe)
                                                                        </span>
                                                                    </label>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col gap-1">
                                                                    {profile.plan_config?.simple_mode ? (
                                                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold w-fit">
                                                                            Simples
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] font-bold w-fit">
                                                                            Pro
                                                                        </span>
                                                                    )}

                                                                    {/* Debug/Details small view */}
                                                                    <div className="flex flex-wrap gap-1 opacity-50">
                                                                        {profile.plan_config?.financial_module && <span className="text-[9px]">Fin</span>}
                                                                        {profile.plan_config?.multi_calendar && <span className="text-[9px]">Age+</span>}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-600">
                                                            {editingId === profile.id ? (
                                                                <input
                                                                    type="text"
                                                                    value={editUsername}
                                                                    onChange={e => setEditUsername(e.target.value)}
                                                                    className="p-1 border rounded w-full text-xs"
                                                                    placeholder="usuario_login"
                                                                />
                                                            ) : (
                                                                <div className="flex flex-col">
                                                                    <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded w-fit">
                                                                        {profile.username || '-'}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400 mt-1">{profile.email}</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-500">
                                                            {editingId === profile.id ? (
                                                                <div className="flex items-center gap-2">
                                                                    <input
                                                                        type="date"
                                                                        value={editDate}
                                                                        onChange={e => setEditDate(e.target.value)}
                                                                        className="p-1 border rounded text-xs"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium text-slate-700">
                                                                        {profile.valid_until ? format(parseISO(profile.valid_until), 'dd/MM/yyyy') : '-'}
                                                                    </span>
                                                                    {profile.valid_until && (
                                                                        <span className="text-xs text-slate-400">
                                                                            {format(parseISO(profile.valid_until), 'HH:mm')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            {profile.is_admin ? (
                                                                <span className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><Shield size={12} /> Vitalício (Admin)</span>
                                                            ) : (
                                                                getStatus(profile.valid_until)
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            {editingId === profile.id ? (
                                                                <div className="flex items-center justify-end gap-2">
                                                                    <button
                                                                        onClick={() => handleSaveProfile(profile.id)}
                                                                        disabled={saving}
                                                                        className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                                                        title="Salvar"
                                                                    >
                                                                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                                    </button>
                                                                    <button
                                                                        onClick={handleCancelEdit}
                                                                        disabled={saving}
                                                                        className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                                                        title="Cancelar"
                                                                    >
                                                                        <X size={16} />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <button
                                                                        onClick={() => handleEditClick(profile)}
                                                                        className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded transition-colors"
                                                                        title="Alterar Validade e Planos"
                                                                    >
                                                                        <Edit size={16} />
                                                                    </button>
                                                                    {!profile.is_admin && (
                                                                        <button
                                                                            onClick={() => handleDeleteClick(profile.id)}
                                                                            disabled={deletingId === profile.id}
                                                                            className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors"
                                                                            title="Excluir Clínica"
                                                                        >
                                                                            {deletingId === profile.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )
                }

            </div >

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, type: null })}
                onConfirm={confirmModal.type === 'delete' ? confirmDelete : confirmRemoveAccess}
                title={confirmModal.type === 'delete' ? 'Excluir Clínica' : 'Remover Acesso'}
                message={confirmModal.type === 'delete'
                    ? 'Tem certeza que deseja excluir todos os dados desta clínica? Esta ação não pode ser desfeita.'
                    : `Remover acesso de ${confirmModal.email}? Ele não poderá criar novas contas.`
                }
                variant="danger"
                confirmText={confirmModal.type === 'delete' ? 'Excluir Tudo' : 'Remover Acesso'}
            />
        </>
    );
};
