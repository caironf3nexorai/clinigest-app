import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Profile } from '../types/db';
import { format, parseISO, isAfter } from 'date-fns';
import { Shield, CheckCircle, XCircle, AlertTriangle, Edit, Save, X, Loader2 } from 'lucide-react';

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

    if (!isAdmin) {
        return (
            <div className="p-8 text-center text-red-600">
                <Shield className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <h1 className="text-2xl font-bold">Acesso Negado</h1>
                <p>Esta área é restrita para administradores.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                        <Shield className="text-indigo-600" /> Painel Admin
                    </h1>
                    <p className="text-slate-500">Gestão de Clientes SaaS</p>
                </div>
                <div className="text-right">
                    <div className="text-sm text-slate-500">Total de Clientes</div>
                    <div className="text-2xl font-bold text-slate-900">{profiles.length}</div>
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
                                                <button
                                                    onClick={() => handleEditClick(profile)}
                                                    className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded transition-colors"
                                                    title="Alterar Validade"
                                                >
                                                    <Edit size={16} />
                                                </button>
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
