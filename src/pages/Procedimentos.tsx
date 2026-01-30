import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Procedure } from '../types/db';
import { Loader2, Plus, Edit, Trash2, Save, X, DollarSign } from 'lucide-react';

export const Procedimentos = () => {
    const { user } = useAuth();
    const [procedures, setProcedures] = useState<Procedure[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');

    const [labCost, setLabCost] = useState('');

    useEffect(() => {
        if (user) fetchProcedures();
    }, [user]);

    const fetchProcedures = async () => {
        try {
            const { data, error } = await supabase
                .from('procedures')
                .select('*')
                .order('name');
            if (error) throw error;
            setProcedures(data || []);
        } catch (error) {
            console.error('Error fetching procedures:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (proc?: Procedure) => {
        if (proc) {
            setEditingId(proc.id);
            setName(proc.name);
            setPrice(proc.price.toString());

            setLabCost(proc.lab_cost?.toString() || '0');
        } else {
            setEditingId(null);
            setName('');
            setPrice('');

            setLabCost('0');
        }
        setModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                user_id: user!.id,
                name,
                price: parseFloat(price) || 0,
                commission_percentage: 0,
                lab_cost: parseFloat(labCost) || 0
            };

            if (editingId) {
                const { error } = await supabase
                    .from('procedures')
                    .update(payload)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('procedures')
                    .insert(payload);
                if (error) throw error;
            }

            setModalOpen(false);
            fetchProcedures();
        } catch (error: any) {
            alert('Erro ao salvar: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir este procedimento?')) return;
        try {
            const { error } = await supabase.from('procedures').delete().eq('id', id);
            if (error) throw error;
            setProcedures(procedures.filter(p => p.id !== id));
        } catch (error) {
            console.error(error);
            alert('Erro ao excluir');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-[var(--text-main)]">Procedimentos e Serviços</h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2 rounded-lg hover:bg-[var(--primary-hover)] transition-colors"
                >
                    <Plus size={20} />
                    Novo Procedimento
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="animate-spin text-[var(--primary)]" />
                </div>
            ) : (
                <div className="bg-[var(--surface)] rounded-xl shadow-sm border border-[var(--border)] overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Nome</th>
                                <th className="px-6 py-4">Preço (R$)</th>
                                <th className="px-6 py-4">Custo Lab. (R$)</th>

                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                            {procedures.map(proc => (
                                <tr key={proc.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium">{proc.name}</td>
                                    <td className="px-6 py-4 text-green-600 font-medium">
                                        R$ {proc.price.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-red-400">
                                        R$ {proc.lab_cost?.toFixed(2) || '0.00'}
                                    </td>

                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => handleOpenModal(proc)} className="p-1 text-gray-500 hover:text-[var(--primary)]">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(proc.id)} className="p-1 text-gray-500 hover:text-red-600">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {procedures.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                                        Nenhum procedimento cadastrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg">{editingId ? 'Editar' : 'Novo'} Procedimento</h3>
                            <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nome do Procedimento</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                    placeholder="Ex: Limpeza, Canal..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Preço (R$)</label>
                                    <div className="relative">
                                        <DollarSign size={14} className="absolute left-3 top-3 text-gray-400" />
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={price}
                                            onChange={e => setPrice(e.target.value)}
                                            className="w-full pl-8 p-2 border rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Custo Lab. (R$)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={labCost}
                                        onChange={e => setLabCost(e.target.value)}
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                        placeholder="0.00"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Descontado da comissão</p>
                                </div>
                            </div>


                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium disabled:opacity-50 flex justify-center items-center gap-2 mt-4"
                            >
                                {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                                Salvar
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
