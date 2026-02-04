import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Mail, Copy, Trash2, User, Shield, Check, Loader2, Calendar } from 'lucide-react';
import { ClinicInvite, Profile } from '../types/db';
import { useToast } from '../components/Toast';
import { ConfirmModal } from '../components/ConfirmModal';

export const Equipe = () => {
    const { user } = useAuth();
    const toast = useToast();
    const [members, setMembers] = useState<Profile[]>([]);
    const [invites, setInvites] = useState<ClinicInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    // Invite Form State
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'dentist' | 'secretary'>('dentist');
    const [creatingInvite, setCreatingInvite] = useState(false);

    // Calendar Linking State
    const [editingCalendarId, setEditingCalendarId] = useState<string | null>(null);
    const [tempCalendarId, setTempCalendarId] = useState('');

    useEffect(() => {
        if (user) loadData();
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Active Members (Profiles linked to this owner)
            // This is the source of truth for "My Team"
            const { data: teamData } = await supabase
                .from('profiles')
                .select('*')
                .eq('owner_id', user?.id)
                .neq('id', user?.id) // Exclude myself
                .order('created_at', { ascending: false });

            if (teamData) setMembers(teamData);

            // 2. Fetch ONLY Pending Invites
            // Accepted invites are redundant if we show Members.
            const { data: inviteData } = await supabase
                .from('clinic_invites')
                .select('*')
                .eq('clinic_owner_id', user?.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (inviteData) setInvites(inviteData as any);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCalendar = async (memberId: string) => {
        try {
            const { error } = await supabase.from('profiles')
                .update({ linked_calendar_id: tempCalendarId || null })
                .eq('id', memberId);

            if (error) throw error;

            setMembers(members.map(m => m.id === memberId ? { ...m, linked_calendar_id: tempCalendarId } : m));
            setEditingCalendarId(null);
            toast.success('Agenda vinculada com sucesso!');
        } catch (err: any) {
            toast.error('Erro: ' + err.message);
        }
    };

    const handleCreateInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingInvite(true);
        try {
            const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

            const { data, error } = await supabase.from('clinic_invites').insert({
                clinic_owner_id: user?.id,
                email,
                role,
                token,
                status: 'pending'
            }).select().single();

            if (error) throw error;

            setInvites([data as any, ...invites]);
            setEmail('');
            toast.success('Convite criado!');

        } catch (error: any) {
            toast.error('Erro: ' + error.message);
        } finally {
            setCreatingInvite(false);
        }
    };

    const handleForceAccept = async (inviteId: string) => {
        try {
            await supabase.from('clinic_invites').update({ status: 'accepted' }).eq('id', inviteId);
            loadData();
            toast.success('Convite marcado como aceito.');
        } catch (error: any) {
            toast.error('Erro: ' + error.message);
        }
    };

    const deleteInvite = (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Revogar Convite',
            message: 'Tem certeza que deseja revogar este convite?',
            onConfirm: async () => {
                await supabase.from('clinic_invites').delete().eq('id', id);
                setInvites(invites.filter(i => i.id !== id));
                toast.success('Convite revogado.');
            }
        });
    };

    const removeMember = (memberId: string) => {
        setConfirmModal({
            isOpen: true,
            title: 'Remover Membro',
            message: 'Remover membro da equipe? O usuário perderá o vínculo com a clínica.',
            onConfirm: async () => {
                const { error } = await supabase
                    .from('profiles')
                    .update({ owner_id: null })
                    .eq('id', memberId);

                if (error) {
                    toast.error('Erro ao remover: ' + error.message);
                    return;
                }

                setMembers(members.filter(m => m.id !== memberId));
                toast.success('Membro removido.');
            }
        });
    };

    const copyLink = (token: string) => {
        const link = `${window.location.origin}/entrar/${token}`;
        navigator.clipboard.writeText(link);
        toast.success('Link copiado!');
    };

    return (
        <>
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
                <header>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <User className="text-[var(--primary)]" /> Gestão de Equipe
                    </h1>
                    <p className="text-slate-500">Gerencie sua equipe e novos convites em um só lugar.</p>
                </header>

                {/* Invite Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Mail size={18} className="text-[var(--primary)]" /> Enviar Novo Convite
                    </h3>
                    <form onSubmit={handleCreateInvite} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                placeholder="email@profissional.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Cargo</label>
                            <select
                                value={role}
                                onChange={e => setRole(e.target.value as any)}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none bg-white"
                            >
                                <option value="dentist">Dentista</option>
                                <option value="secretary">Secretária</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={creatingInvite}
                            className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium flex items-center justify-center gap-2"
                        >
                            {creatingInvite ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />} Enviar
                        </button>
                    </form>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Active Members Column */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Shield size={18} className="text-green-600" /> Membros Ativos ({members.length})
                        </h3>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            {members.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    Nenhum membro ativo na equipe.
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Membro</th>
                                            <th className="px-4 py-3 text-left">Cargo</th>
                                            <th className="px-4 py-3 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {members.map(m => (
                                            <tr key={m.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-slate-900">{m.username || 'Sem nome'}</div>
                                                    <div className="text-xs text-slate-500">{m.email}</div>
                                                    {m.company_name && <div className="text-[10px] text-slate-400">{m.company_name}</div>}

                                                    {/* Calendar Linking UI */}
                                                    <div className="mt-2">
                                                        {editingCalendarId === m.id ? (
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={tempCalendarId}
                                                                    onChange={e => setTempCalendarId(e.target.value)}
                                                                    placeholder="ID @group.calendar..."
                                                                    className="text-xs border rounded p-1 w-full max-w-[150px] outline-none focus:border-[var(--primary)]"
                                                                />
                                                                <button onClick={() => handleSaveCalendar(m.id)} className="text-green-600 hover:bg-green-50 p-1 rounded"><Check size={14} /></button>
                                                                <button onClick={() => setEditingCalendarId(null)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 text-xs text-slate-400 group cursor-pointer" onClick={() => {
                                                                setEditingCalendarId(m.id);
                                                                setTempCalendarId(m.linked_calendar_id || '');
                                                            }}>
                                                                <Calendar size={12} className={m.linked_calendar_id ? "text-green-500" : "text-slate-300"} />
                                                                {m.linked_calendar_id ? (
                                                                    <span className="text-green-600 font-medium">Agenda Vinculada</span>
                                                                ) : (
                                                                    <span className="group-hover:text-[var(--primary)] transition-colors">Vincular Agenda</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${m.role === 'dentist' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                                        }`}>
                                                        {m.role === 'dentist' ? 'Dentista' : 'Secretária'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        onClick={() => removeMember(m.id)}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition"
                                                        title="Remover da equipe"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Pending Invites Column */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <Mail size={18} className="text-amber-500" /> Convites Pendentes ({invites.length})
                        </h3>
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            {invites.length === 0 ? (
                                <div className="p-8 text-center text-slate-400">
                                    Nenhum convite pendente.
                                </div>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Email / Link</th>
                                            <th className="px-4 py-3 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {invites.map(inv => (
                                            <tr key={inv.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3">
                                                    <div className="text-slate-700 font-medium">{inv.email}</div>
                                                    <div className="flex items-center gap-1 text-slate-400 text-xs mt-1">
                                                        <span className={`px-1.5 py-0.5 rounded ${inv.role === 'dentist' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                                                            }`}>
                                                            {inv.role === 'dentist' ? 'Dentista' : 'Secretária'}
                                                        </span>
                                                        <span>•</span>
                                                        <button onClick={() => copyLink(inv.token)} className="flex items-center gap-1 hover:text-[var(--primary)] transition">
                                                            <Copy size={10} /> Link
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleForceAccept(inv.id)}
                                                            className="text-green-600 hover:bg-green-50 p-1 rounded"
                                                            title="Marcar como Aceito (Forçar)"
                                                        >
                                                            <Check size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteInvite(inv.id)}
                                                            className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                            title="Cancelar convite"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                variant="danger"
                confirmText="Confirmar"
            />
        </>
    );
};
