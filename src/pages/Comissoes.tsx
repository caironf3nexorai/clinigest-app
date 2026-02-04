import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DollarSign, Save, Loader2, ChevronRight, Check, User } from 'lucide-react';
import { Procedure, Profile, DentistCommission } from '../types/db';
import { useToast } from '../components/Toast';

export const Comissoes = () => {
    const { user } = useAuth();
    const toast = useToast();
    const [dentists, setDentists] = useState<Profile[]>([]); // Should fetch actual dentists
    const [procedures, setProcedures] = useState<Procedure[]>([]);
    const [commissions, setCommissions] = useState<DentistCommission[]>([]);

    // UI State
    const [selectedDentistId, setSelectedDentistId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Matrix State: Record<ProcedureId, { active: boolean, percent: number }>
    const [formState, setFormState] = useState<Record<string, { active: boolean, percent: number }>>({});

    useEffect(() => {
        if (user) loadData();
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Procedures
            const { data: procData } = await supabase.from('procedures').select('*').order('name');
            if (procData) setProcedures(procData);

            // 2. Fetch Dentists (Active Team Members linked via owner_id)
            if (user?.id) {
                const { data: dentData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('owner_id', user.id)
                    .eq('role', 'dentist');

                if (dentData) setDentists(dentData);
            }

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadCommissionsForDentist = async (dentistId: string) => {
        setSelectedDentistId(dentistId);
        setSaving(false);
        // Reset Form
        const initialForm: any = {};

        // Fetch existing commissions
        const { data } = await supabase
            .from('dentist_commissions')
            .select('*')
            .eq('dentist_id', dentistId);

        // Pre-fill with existing or Defaults
        procedures.forEach(p => {
            const existing = data?.find(c => c.procedure_id === p.id);
            if (existing) {
                initialForm[p.id] = { active: existing.active, percent: existing.commission_percentage };
            } else {
                // Default to Procedure Standard
                initialForm[p.id] = { active: false, percent: p.commission_percentage };
            }
        });

        setFormState(initialForm);
    };

    const handleSave = async () => {
        if (!selectedDentistId) return;
        setSaving(true);
        try {
            // Upsert all
            const updates = Object.entries(formState).map(([procId, val]) => ({
                dentist_id: selectedDentistId,
                procedure_id: procId,
                commission_percentage: val.percent,
                active: val.active
            }));

            // We need to upsert. Supabase allow upsert on unique constraint.
            const { error } = await supabase
                .from('dentist_commissions')
                .upsert(updates, { onConflict: 'dentist_id, procedure_id' });

            if (error) throw error;
            toast.success('Comissões atualizadas com sucesso!');
        } catch (error: any) {
            toast.error('Erro ao salvar: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleActive = (procId: string) => {
        setFormState(prev => ({
            ...prev,
            [procId]: { ...prev[procId], active: !prev[procId].active }
        }));
    };

    const updatePercent = (procId: string, val: string) => {
        setFormState(prev => ({
            ...prev,
            [procId]: { ...prev[procId], percent: parseFloat(val) || 0 }
        }));
    };

    return (
        <div className="max-w-6xl mx-auto pb-20 space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <DollarSign className="text-[var(--primary)]" /> Configurar Comissões
                </h1>
                <p className="text-slate-500">Defina porcentagens personalizadas por dentista e procedimento.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Dentist List */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-fit">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 font-bold text-slate-700">
                        Equipe de Dentistas
                    </div>
                    <div className="divide-y divide-slate-100">
                        {dentists.length === 0 ? (
                            <div className="p-4 text-sm text-slate-400 text-center">Nenhum dentista encontrado.</div>
                        ) : (
                            dentists.map(d => (
                                <button
                                    key={d.id}
                                    onClick={() => loadCommissionsForDentist(d.id)}
                                    className={`w-full text-left p-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${selectedDentistId === d.id ? 'bg-[var(--primary-light)] border-l-4 border-[var(--primary)]' : ''
                                        }`}
                                >
                                    <div>
                                        <div className="font-medium text-slate-900">{d.username || 'Dentista sem nome'}</div>
                                        <div className="text-xs text-slate-500">{d.email}</div>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-300" />
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Configuration Matrix */}
                <div className="md:col-span-2">
                    {selectedDentistId ? (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
                            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center sticky top-0 z-10">
                                <h3 className="font-bold text-slate-800">Tabela de Procedimentos</h3>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition flex items-center gap-2"
                                >
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                    Salvar Alterações
                                </button>
                            </div>

                            <div className="p-0 overflow-x-auto max-h-[600px] overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 text-left w-12">Ativo</th>
                                            <th className="px-4 py-3 text-left">Procedimento</th>
                                            <th className="px-4 py-3 text-right w-32">Comissão (%)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {procedures.map(p => {
                                            const state = formState[p.id] || { active: false, percent: 0 };
                                            return (
                                                <tr key={p.id} className={state.active ? 'bg-white' : 'bg-slate-50/50'}>
                                                    <td className="px-4 py-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={state.active}
                                                            onChange={() => toggleActive(p.id)}
                                                            className="w-4 h-4 rounded text-[var(--primary)] focus:ring-[var(--primary)]"
                                                        />
                                                    </td>
                                                    <td className={`px-4 py-3 ${!state.active && 'opacity-50'}`}>
                                                        <div className="font-medium">{p.name}</div>
                                                        <div className="text-xs text-slate-400">Padrão: {p.commission_percentage}%</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                disabled={!state.active}
                                                                value={state.percent}
                                                                onChange={(e) => updatePercent(p.id, e.target.value)}
                                                                className="w-20 p-1 border rounded text-right pr-6 focus:outline-none focus:ring-1 focus:ring-[var(--primary)] disabled:bg-slate-100"
                                                            />
                                                            <span className="absolute right-2 top-1.5 text-slate-400">%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-12 text-center text-slate-400 flex flex-col items-center">
                            <User size={48} className="mb-4 opacity-20" />
                            <p>Selecione um dentista ao lado para configurar as comissões.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
