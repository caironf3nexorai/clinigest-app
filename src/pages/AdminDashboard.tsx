import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Profile } from '../types/db';
import { format, parseISO, isAfter } from 'date-fns';
import { Shield, CheckCircle, XCircle, AlertTriangle, Edit, Save, X, Loader2, Trash2, UserPlus } from 'lucide-react';


export const AdminDashboard = () => {
    const { isAdmin } = useAuth();
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDate, setEditDate] = useState('');
    const [saving, setSaving] = useState(false);

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
            alert('Erro ao salvar: ' + err.message);
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

    const handleDeleteClick = async (profileId: string) => {
        if (!window.confirm('Tem certeza que deseja excluir todos os dados desta clínica? Esta ação não pode ser desfeita.')) {
            return;
        }

        setDeletingId(profileId);
        try {
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', profileId);

            if (error) throw error;

            setProfiles(profiles.filter(p => p.id !== profileId));
        } catch (err: any) {
            console.error(err);
            alert('Erro ao excluir: ' + err.message);
        } finally {
            setDeletingId(null);
        }
    };

    const [showInviteModal, setShowInviteModal] = useState(false);

    // Manual Registration State
    const [regName, setRegName] = useState('');
    const [regUsername, setRegUsername] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regDays, setRegDays] = useState(7);
    const [regLoading, setRegLoading] = useState(false);

    const handleCopyInvite = () => {
        const url = window.location.origin + '/register';
        navigator.clipboard.writeText(url);
        alert('Link de cadastro copiado: ' + url);
    };

    const handleManualRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setRegLoading(true);

        try {
            // 1. Create user using raw fetch to avoid session conflict
            // Required: SUPABASE_URL and SUPABASE_ANON_KEY (Vite env vars)
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
                        username: regUsername
                    }
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.msg || data.error_description || 'Erro ao criar usuário');
            }

            const newUserId = data.user?.id || data.id;

            if (newUserId) {
                // 2. Determine validity date
                const validUntil = new Date();
                validUntil.setDate(validUntil.getDate() + Number(regDays));
                validUntil.setHours(23, 59, 59, 999);

                // 3. Manually insert/update profile
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                        company_name: regName,
                        username: regUsername,
                        valid_until: validUntil.toISOString()
                    })
                    .eq('id', newUserId);

                if (updateError) {
                    await supabase.from('profiles').insert({
                        id: newUserId,
                        email: regEmail,
                        company_name: regName,
                        username: regUsername,
                        valid_until: validUntil.toISOString()
                    });
                }

                alert(`Cliente cadastrado com sucesso!\n\nEmail: ${regEmail}\nUsuário: ${regUsername}\nSenha: ${regPassword}\nValidade: ${regDays} dias`);
                setShowInviteModal(false);
                setRegName('');
                setRegUsername('');
                setRegEmail('');
                setRegPassword('');
                fetchProfiles(); // Refresh list
            }

        } catch (err: any) {
            console.error(err);
            alert('Erro no cadastro: ' + err.message);
        } finally {
            setRegLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24">
            {/* Modal ... */}
            {/* ... */}

            {/* Header ... */}
            {/* ... */}

            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* ... */}
            </header>

            {/* Loading/Error ... */}

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

        </div>
    );
};
