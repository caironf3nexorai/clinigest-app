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

    const handleEditClick = (profile: Profile) => {
        setEditingId(profile.id);
        if (profile.valid_until) {
            setEditDate(format(parseISO(profile.valid_until), 'yyyy-MM-dd'));
        } else {
            setEditDate('');
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditDate('');
    };

    const handleSaveDate = async (profileId: string) => {
        setSaving(true);
        try {
            let updatePayload: any = {};

            if (editDate) {
                // Set end of day for the selected date
                const newDate = new Date(editDate);
                newDate.setHours(23, 59, 59, 999);
                updatePayload = { valid_until: newDate.toISOString() };
            } else {
                // Empty date = Indefinite (null)
                updatePayload = { valid_until: null };
            }

            const { error } = await supabase
                .from('profiles')
                .update(updatePayload)
                .eq('id', profileId);

            if (error) throw error;

            // Update local state
            setProfiles(profiles.map(p => p.id === profileId ? { ...p, valid_until: updatePayload.valid_until } : p));
            setEditingId(null);
        } catch (err: any) {
            console.error(err);
            alert('Erro ao salvar data: ' + err.message);
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
            // Using RPC function usually, but for now strict RLS
            // We use the supabase function we will create or just direct delete
            // Direct delete from profiles (cascade expected or manual in sql)
            // But from frontend, we need the function delete_clinic_data we planned?
            // Let's use the RPC if we added it, or just try deleting profile.
            // Since we added migration_delete_user.sql, we should use that RPC or run it now.
            // FOR NOW: Direct delete from profiles (Relies on RLS 'Admins can delete profiles')

            // Actually, let's just delete the profile row.
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

                // 3. Manually insert profile (since auto-trigger might miss metadata or we want specific validity)
                // Note: The trigger creates the profile on insert to auth.users usually.
                // We will try to UPDATE the profile that the trigger likely created.
                // Wait for a second for trigger to fire? Best effort update.

                // Let's retry update a few times or insert if missing
                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                        company_name: regName,
                        valid_until: validUntil.toISOString()
                    })
                    .eq('id', newUserId);

                if (updateError) {
                    // Try insert if update failed (maybe trigger didn't run?)
                    await supabase.from('profiles').insert({
                        id: newUserId,
                        email: regEmail,
                        company_name: regName,
                        valid_until: validUntil.toISOString()
                    });
                }

                alert(`Cliente cadastrado com sucesso!\n\nEmail: ${regEmail}\nSenha: ${regPassword}\nValidade: ${regDays} dias`);
                setShowInviteModal(false);
                setRegName('');
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
            {/* Modal de Cadastro */}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg">Novo Cliente</h3>
                            <button onClick={() => setShowInviteModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <button
                                onClick={handleCopyInvite}
                                className="w-full flex items-center justify-center gap-2 p-3 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium border border-indigo-200"
                            >
                                <Shield size={18} />
                                Copiar Link de Convite
                            </button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-slate-200" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-slate-500">Ou cadastre manualmente</span>
                                </div>
                            </div>

                            <form onSubmit={handleManualRegister} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Clínica/Empresa</label>
                                    <input
                                        type="text"
                                        required
                                        value={regName}
                                        onChange={e => setRegName(e.target.value)}
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Ex: Clínica Saúde"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Email de Login</label>
                                    <input
                                        type="email"
                                        required
                                        value={regEmail}
                                        onChange={e => setRegEmail(e.target.value)}
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="cliente@email.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Senha Provisória</label>
                                    <input
                                        type="text"
                                        required
                                        minLength={6}
                                        value={regPassword}
                                        onChange={e => setRegPassword(e.target.value)}
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Dias de Teste/Validade Inicial</label>
                                    <input
                                        type="number"
                                        required
                                        min={1}
                                        value={regDays}
                                        onChange={e => setRegDays(Number(e.target.value))}
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={regLoading}
                                    className="w-full py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium disabled:opacity-50 flex justify-center items-center gap-2"
                                >
                                    {regLoading ? <Loader2 className="animate-spin" /> : <UserPlus size={18} />}
                                    Criar Cadastro
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                        <Shield className="text-indigo-600" /> Painel Admin
                    </h1>
                    <p className="text-slate-500">Gestão de Clientes SaaS</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                    >
                        <UserPlus size={18} />
                        Novo Cliente
                    </button>
                    <div className="text-right">
                        <div className="text-sm text-slate-500">Total de Clientes</div>
                        <div className="text-2xl font-bold text-slate-900">{profiles.length}</div>
                    </div>
                </div>
            </header>

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
                                    <th className="px-6 py-4">Email (Admin)</th>
                                    <th className="px-6 py-4">Cadastro</th>
                                    <th className="px-6 py-4">Validade Assinatura</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {profiles.map(profile => (
                                    <tr key={profile.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">
                                            {profile.company_name || 'Sem nome'}
                                            {profile.is_admin && <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">ADMIN</span>}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{profile.email}</td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {format(parseISO(profile.created_at), 'dd/MM/yyyy')}
                                        </td>
                                        <td className="px-6 py-4">
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
                                                        onClick={() => handleSaveDate(profile.id)}
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
                                                        title="Alterar Validade"
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
