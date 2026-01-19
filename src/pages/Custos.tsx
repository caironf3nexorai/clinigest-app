import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Calculator } from '../components/Calculator';
import { Plus, Calculator as CalcIcon, Trash2, Calendar, DollarSign, Tag, Clock } from 'lucide-react';
import type { Custo } from '../types/db';
import { format, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const Custos = () => {
    const { user } = useAuth();
    const [custos, setCustos] = useState<Custo[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCalculator, setShowCalculator] = useState(false);

    // Form State
    const [titulo, setTitulo] = useState('');
    const [categoria, setCategoria] = useState('Fixa');
    const [valor, setValor] = useState<string>(''); // String to handle inputs better
    const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
    const [dataValidade, setDataValidade] = useState('');
    const [isVariavel, setIsVariavel] = useState(false);

    useEffect(() => {
        fetchCustos();
    }, [user]);

    const fetchCustos = async () => {
        try {
            const { data, error } = await supabase
                .from('custos')
                .select('*')
                .order('data_pagamento', { ascending: false });

            if (error) throw error;

            // Filter locally for "Soft Delete" logic if needed, 
            // but let's show all valid ones or future expirations
            const now = new Date();
            const activeCustos = data?.filter(custo => {
                if (!custo.data_validade) return true; // No expiration = keep
                return isAfter(parseISO(custo.data_validade), now); // Keep if valid > now
            });

            setCustos(activeCustos || []);
        } catch (error) {
            console.error('Erro ao buscar custos:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !valor || !titulo) return;

        try {
            const { error } = await supabase.from('custos').insert({
                user_id: user.id,
                titulo,
                categoria: isVariavel ? 'Variável' : 'Fixa',
                valor: parseFloat(valor),
                data_pagamento: dataPagamento,
                data_validade: isVariavel && dataValidade ? dataValidade : null,
                recorrente: !isVariavel
            });

            if (error) throw error;

            // Reset Form
            setTitulo('');
            setValor('');
            setIsVariavel(false);
            setDataValidade('');
            setCategoria('Fixa');

            fetchCustos();
        } catch (error) {
            alert('Erro ao salvar custo');
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja apagar este custo?')) return;
        try {
            await supabase.from('custos').delete().eq('id', id);
            setCustos(custos.filter(c => c.id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    const handleCalculatorConfirm = (finalValue: number) => {
        setValor(finalValue.toFixed(2));
    };

    const totalCustos = custos.reduce((acc, curr) => acc + Number(curr.valor), 0);

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {showCalculator && (
                <Calculator
                    onClose={() => setShowCalculator(false)}
                    onConfirm={handleCalculatorConfirm}
                    initialValue={Number(valor) || 0}
                />
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Gestão de Custos</h1>
                    <p className="text-slate-500">Controle financeiro mensal da clínica</p>
                </div>
                <div className="bg-white px-6 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <span className="text-sm font-medium text-slate-500">Total Mensal</span>
                    <span className="text-2xl font-bold text-slate-900">R$ {totalCustos.toFixed(2)}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-24">
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Plus className="text-[var(--primary)]" size={20} />
                            Novo Custo
                        </h2>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Aluguel, Luz, Material"
                                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                    value={titulo}
                                    onChange={e => setTitulo(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                                    <select
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                                        value={isVariavel ? 'Variável' : 'Fixa'}
                                        onChange={(e) => setIsVariavel(e.target.value === 'Variável')}
                                    >
                                        <option value="Fixa">Fixa</option>
                                        <option value="Variável">Variável</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Vencimento</label>
                                    <input
                                        type="date"
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                                        value={dataPagamento}
                                        onChange={e => setDataPagamento(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {isVariavel && (
                                <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-xs font-bold text-orange-800 mb-1 flex items-center gap-1">
                                        <Clock size={12} />
                                        Expira em (Auto-delete da lista)
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full p-2 bg-white border border-orange-200 rounded text-sm text-orange-900"
                                        value={dataValidade}
                                        onChange={e => setDataValidade(e.target.value)}
                                        required={isVariavel}
                                    />
                                    <p className="text-[10px] text-orange-600 mt-1">Após esta data, o item sai da lista diária.</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Valor</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">R$</div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full pl-9 pr-12 p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[var(--primary)] outline-none font-medium"
                                        value={valor}
                                        onChange={e => setValor(e.target.value)}
                                        placeholder="0.00"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowCalculator(true)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-[var(--primary)] hover:bg-emerald-50 rounded-md transition-colors"
                                        title="Abrir Calculadora"
                                    >
                                        <CalcIcon size={18} />
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full btn btn-primary mt-2"
                            >
                                <Plus size={18} />
                                Adicionar Custo
                            </button>
                        </form>
                    </div>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2 space-y-4">
                    {loading ? (
                        <p className="text-center text-slate-500 py-10">Carregando despesas...</p>
                    ) : custos.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                            <Tag className="mx-auto text-slate-300 mb-2" size={48} />
                            <p className="text-slate-500 font-medium">Nenhuma despesa lançada.</p>
                            <p className="text-sm text-slate-400">Adicione seus custos mensais ao lado.</p>
                        </div>
                    ) : (
                        custos.map((custo) => (
                            <div key={custo.id} className="group bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${custo.categoria === 'Fixa'
                                            ? 'bg-blue-50 text-blue-600'
                                            : 'bg-orange-50 text-orange-600'
                                        }`}>
                                        {custo.categoria === 'Fixa' ? 'F' : 'V'}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{custo.titulo}</h3>
                                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-0.5">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                {format(parseISO(custo.data_pagamento), 'dd/MM/yyyy')}
                                            </span>
                                            {custo.data_validade && (
                                                <span className="flex items-center gap-1 text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded textxs">
                                                    <Clock size={12} />
                                                    Expira: {format(parseISO(custo.data_validade), 'dd/MM')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <span className="text-lg font-bold text-slate-700">
                                        R$ {Number(custo.valor).toFixed(2)}
                                    </span>
                                    <button
                                        onClick={() => handleDelete(custo.id)}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="Excluir"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
