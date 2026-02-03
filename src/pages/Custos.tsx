import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Calculator } from '../components/Calculator';
import { Plus, Calculator as CalcIcon, Trash2, Calendar, Tag, Clock, Edit, Save, ChevronLeft, ChevronRight, Check, X, AlertTriangle } from 'lucide-react';
import type { Custo } from '../types/db';
import { format, parseISO, addMonths, subMonths, startOfMonth, endOfMonth, isWithinInterval, differenceInMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Type for installment preview
interface ParcelaPreview {
    mes: string;
    data: string;
    valor: number;
}

export const Custos = () => {
    const { user } = useAuth();
    const [custos, setCustos] = useState<Custo[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCalculator, setShowCalculator] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());

    // Form State
    const [titulo, setTitulo] = useState('');
    const [categoria, setCategoria] = useState('Fixa');
    const [valor, setValor] = useState<string>('');
    const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0]);
    const [dataFinal, setDataFinal] = useState(''); // New: end date for fixed expenses
    const [dataValidade, setDataValidade] = useState('');
    const [isVariavel, setIsVariavel] = useState(false);

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingGrupoId, setEditingGrupoId] = useState<string | null>(null);

    // Modal States
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showParcelasModal, setShowParcelasModal] = useState(false);
    const [parcelas, setParcelas] = useState<ParcelaPreview[]>([]);
    const [pendingPayload, setPendingPayload] = useState<any>(null);

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<Custo | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Update confirmation
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [pendingUpdate, setPendingUpdate] = useState<any>(null);

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
            setCustos(data || []);
        } catch (error) {
            console.error('Erro ao buscar custos:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateParcelas = (startDate: string, endDate: string, valorBase: number): ParcelaPreview[] => {
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        const months = differenceInMonths(end, start) + 1;

        const result: ParcelaPreview[] = [];
        for (let i = 0; i < months; i++) {
            const parcelaDate = addMonths(start, i);
            result.push({
                mes: format(parcelaDate, 'MMM/yyyy', { locale: ptBR }).toUpperCase(),
                data: format(parcelaDate, 'yyyy-MM-dd'),
                valor: valorBase
            });
        }
        return result;
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !valor || !titulo) return;

        const valorNum = parseFloat(valor);

        // If editing existing record
        if (editingId) {
            await handleUpdate();
            return;
        }

        // If fixed expense with end date, generate installments
        if (!isVariavel && dataFinal) {
            const parcelasGeradas = generateParcelas(dataPagamento, dataFinal, valorNum);

            if (parcelasGeradas.length > 1) {
                setParcelas(parcelasGeradas);
                setPendingPayload({
                    user_id: user.id,
                    titulo,
                    categoria: 'Fixa',
                    recorrente: true,
                    data_validade: dataFinal
                });
                setShowConfirmModal(true);
                return;
            }
        }

        // Single expense (variable or fixed without end date)
        try {
            const payload = {
                user_id: user.id,
                titulo,
                categoria: isVariavel ? 'Variável' : 'Fixa',
                valor: valorNum,
                data_pagamento: dataPagamento,
                data_validade: isVariavel && dataValidade ? dataValidade : null,
                recorrente: !isVariavel
            };

            const { error } = await supabase.from('custos').insert(payload);
            if (error) throw error;

            resetForm();
            fetchCustos();
        } catch (error) {
            alert('Erro ao salvar custo');
            console.error(error);
        }
    };

    const handleConfirmSameValues = async () => {
        // User confirmed all installments have same value - create them
        if (!pendingPayload || !user) return;

        try {
            const grupoId = crypto.randomUUID();
            const totalParcelas = parcelas.length;

            const records = parcelas.map((p, index) => ({
                ...pendingPayload,
                valor: p.valor,
                data_pagamento: p.data,
                grupo_id: grupoId,
                parcela_numero: index + 1,
                total_parcelas: totalParcelas
            }));

            const { error } = await supabase.from('custos').insert(records);
            if (error) throw error;

            setShowConfirmModal(false);
            setParcelas([]);
            setPendingPayload(null);
            resetForm();
            fetchCustos();
        } catch (error) {
            alert('Erro ao criar parcelas');
            console.error(error);
        }
    };

    const handleShowCustomValues = () => {
        setShowConfirmModal(false);
        setShowParcelasModal(true);
    };

    const handleConfirmCustomValues = async () => {
        if (!pendingPayload || !user) return;

        try {
            const grupoId = crypto.randomUUID();
            const totalParcelas = parcelas.length;

            const records = parcelas.map((p, index) => ({
                ...pendingPayload,
                valor: p.valor,
                data_pagamento: p.data,
                grupo_id: grupoId,
                parcela_numero: index + 1,
                total_parcelas: totalParcelas
            }));

            const { error } = await supabase.from('custos').insert(records);
            if (error) throw error;

            setShowParcelasModal(false);
            setParcelas([]);
            setPendingPayload(null);
            resetForm();
            fetchCustos();
        } catch (error) {
            alert('Erro ao criar parcelas');
            console.error(error);
        }
    };

    const handleUpdate = async () => {
        if (!editingId || !user) return;

        const valorNum = parseFloat(valor);
        const payload = {
            titulo,
            categoria: isVariavel ? 'Variável' : 'Fixa',
            valor: valorNum,
            data_pagamento: dataPagamento,
            data_validade: isVariavel && dataValidade ? dataValidade : null,
            recorrente: !isVariavel
        };

        // Check if part of a group and value changed
        if (editingGrupoId) {
            const originalCusto = custos.find(c => c.id === editingId);
            if (originalCusto && originalCusto.valor !== valorNum) {
                setPendingUpdate({ payload, id: editingId, grupoId: editingGrupoId });
                setShowUpdateModal(true);
                return;
            }
        }

        // Just update this one
        try {
            const { error } = await supabase
                .from('custos')
                .update(payload)
                .eq('id', editingId);

            if (error) throw error;
            resetForm();
            fetchCustos();
        } catch (error) {
            alert('Erro ao atualizar custo');
            console.error(error);
        }
    };

    const handleUpdateOnlyThis = async () => {
        if (!pendingUpdate) return;

        try {
            const { error } = await supabase
                .from('custos')
                .update(pendingUpdate.payload)
                .eq('id', pendingUpdate.id);

            if (error) throw error;
            setShowUpdateModal(false);
            setPendingUpdate(null);
            resetForm();
            fetchCustos();
        } catch (error) {
            alert('Erro ao atualizar');
            console.error(error);
        }
    };

    const handleUpdateAll = async () => {
        if (!pendingUpdate) return;

        try {
            const { error } = await supabase
                .from('custos')
                .update({ valor: pendingUpdate.payload.valor })
                .eq('grupo_id', pendingUpdate.grupoId);

            if (error) throw error;
            setShowUpdateModal(false);
            setPendingUpdate(null);
            resetForm();
            fetchCustos();
        } catch (error) {
            alert('Erro ao atualizar todas');
            console.error(error);
        }
    };

    const resetForm = () => {
        setTitulo('');
        setValor('');
        setIsVariavel(false);
        setDataValidade('');
        setDataFinal('');
        setCategoria('Fixa');
        setEditingId(null);
        setEditingGrupoId(null);
        setDataPagamento(new Date().toISOString().split('T')[0]);
    };

    const handleEdit = (custo: Custo) => {
        setEditingId(custo.id);
        setEditingGrupoId(custo.grupo_id || null);
        setTitulo(custo.titulo);
        setValor(String(custo.valor));
        setCategoria(custo.categoria);
        setIsVariavel(custo.categoria === 'Variável');
        setDataPagamento(custo.data_pagamento);
        setDataValidade(custo.data_validade || '');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteClick = (custo: Custo) => {
        setDeleteTarget(custo);
        if (custo.grupo_id) {
            setShowDeleteModal(true);
        } else {
            handleDeleteSingle(custo.id);
        }
    };

    const handleDeleteSingle = async (id: string) => {
        if (!confirm('Tem certeza que deseja apagar este custo?')) return;
        try {
            await supabase.from('custos').delete().eq('id', id);
            setCustos(custos.filter(c => c.id !== id));
            if (editingId === id) resetForm();
        } catch (error) {
            console.error(error);
        }
        setShowDeleteModal(false);
        setDeleteTarget(null);
    };

    const handleDeleteAll = async () => {
        if (!deleteTarget?.grupo_id) return;
        try {
            await supabase.from('custos').delete().eq('grupo_id', deleteTarget.grupo_id);
            setCustos(custos.filter(c => c.grupo_id !== deleteTarget.grupo_id));
            if (editingId && custos.find(c => c.id === editingId)?.grupo_id === deleteTarget.grupo_id) {
                resetForm();
            }
        } catch (error) {
            console.error(error);
        }
        setShowDeleteModal(false);
        setDeleteTarget(null);
    };

    const handleCalculatorConfirm = (finalValue: number) => {
        setValor(finalValue.toFixed(2));
    };

    const handlePrevMonth = () => setCurrentDate(curr => subMonths(curr, 1));
    const handleNextMonth = () => setCurrentDate(curr => addMonths(curr, 1));

    const filteredCustos = custos.filter(custo => {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        return isWithinInterval(parseISO(custo.data_pagamento), { start, end });
    });

    const totalCustos = filteredCustos.reduce((acc, curr) => acc + Number(curr.valor), 0);

    const handleTogglePago = async (custo: Custo) => {
        try {
            const novoStatus = !custo.pago;
            const { error } = await supabase
                .from('custos')
                .update({ pago: novoStatus })
                .eq('id', custo.id);

            if (error) throw error;
            setCustos(curr => curr.map(c => c.id === custo.id ? { ...c, pago: novoStatus } : c));
        } catch (error) {
            console.error('Erro ao atualizar', error);
        }
    };

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {showCalculator && (
                <Calculator
                    onClose={() => setShowCalculator(false)}
                    onConfirm={handleCalculatorConfirm}
                    initialValue={Number(valor) || 0}
                />
            )}

            {/* Modal: Confirm Same Values */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <AlertTriangle className="text-amber-500" size={24} />
                            Confirmar Parcelas
                        </h3>
                        <p className="text-slate-600 mb-4">
                            Serão criadas <span className="font-bold text-[var(--primary)]">{parcelas.length} parcelas</span> de{' '}
                            <span className="font-bold">R$ {parseFloat(valor).toFixed(2)}</span> cada.
                        </p>
                        <p className="text-slate-600 mb-6">Todas as parcelas terão o mesmo valor?</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowConfirmModal(false); setParcelas([]); setPendingPayload(null); }}
                                className="flex-1 px-4 py-2.5 bg-slate-100 rounded-lg font-medium text-slate-700 border border-slate-200"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleShowCustomValues}
                                className="flex-1 px-4 py-2.5 bg-amber-500 rounded-lg font-medium text-white"
                            >
                                Não, ajustar
                            </button>
                            <button
                                onClick={handleConfirmSameValues}
                                className="flex-1 px-4 py-2.5 bg-emerald-600 rounded-lg font-medium text-white"
                            >
                                Sim, criar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Custom Values per Installment */}
            {showParcelasModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in max-h-[80vh] overflow-auto">
                        <h3 className="text-lg font-bold mb-4">Ajuste os valores por parcela</h3>
                        <div className="space-y-3 mb-6">
                            {parcelas.map((p, index) => (
                                <div key={index} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg">
                                    <span className="font-medium text-slate-700 w-24">{p.mes}</span>
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">R$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full pl-10 p-2 border border-slate-200 rounded-lg font-medium"
                                            value={p.valor}
                                            onChange={e => {
                                                const newParcelas = [...parcelas];
                                                newParcelas[index].valor = parseFloat(e.target.value) || 0;
                                                setParcelas(newParcelas);
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowParcelasModal(false); setParcelas([]); setPendingPayload(null); }}
                                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium text-slate-700"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmCustomValues}
                                className="flex-1 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] rounded-lg font-medium text-white"
                            >
                                Confirmar e Criar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Delete Confirmation */}
            {showDeleteModal && deleteTarget && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Trash2 className="text-red-500" size={24} />
                            Excluir Parcela
                        </h3>
                        <p className="text-slate-600 mb-6">
                            Esta parcela faz parte de um grupo de <span className="font-bold">{deleteTarget.total_parcelas} parcelas</span>.
                            Deseja excluir apenas esta ou todas?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
                                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium text-slate-700"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleDeleteSingle(deleteTarget.id)}
                                className="flex-1 px-4 py-2 bg-amber-100 hover:bg-amber-200 rounded-lg font-medium text-amber-800"
                            >
                                Apenas esta
                            </button>
                            <button
                                onClick={handleDeleteAll}
                                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-medium text-white"
                            >
                                Todas ({deleteTarget.total_parcelas})
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Update Confirmation */}
            {showUpdateModal && pendingUpdate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Edit className="text-indigo-500" size={24} />
                            Atualizar Valor
                        </h3>
                        <p className="text-slate-600 mb-6">
                            Você alterou o valor desta parcela. Deseja atualizar o valor para as outras parcelas deste grupo também?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowUpdateModal(false); setPendingUpdate(null); }}
                                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium text-slate-700"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleUpdateOnlyThis}
                                className="flex-1 px-4 py-2 bg-amber-100 hover:bg-amber-200 rounded-lg font-medium text-amber-800"
                            >
                                Apenas esta
                            </button>
                            <button
                                onClick={handleUpdateAll}
                                className="flex-1 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-medium text-white"
                            >
                                Todas
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Gestão de Custos</h1>
                    <p className="text-slate-500">Controle financeiro mensal da clínica</p>
                </div>
                <div className="bg-white px-6 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <span className="text-sm font-medium text-slate-500">Total {format(currentDate, 'MMMM', { locale: ptBR })}</span>
                    <span className="text-2xl font-bold text-slate-900">R$ {totalCustos.toFixed(2)}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-1">
                    <div className={`bg-white p-6 rounded-xl border shadow-sm sticky top-24 transition-colors ${editingId ? 'border-indigo-200 ring-2 ring-indigo-50' : 'border-slate-200'}`}>
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                            {editingId ? <Edit className="text-indigo-600" size={20} /> : <Plus className="text-[var(--primary)]" size={20} />}
                            {editingId ? 'Editar Custo' : 'Novo Custo'}
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
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        {!isVariavel && dataFinal ? 'Primeiro Vencimento' : 'Vencimento'}
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                                        value={dataPagamento}
                                        onChange={e => setDataPagamento(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Fixed expense: End date for installments */}
                            {!isVariavel && !editingId && (
                                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-xs font-bold text-blue-800 mb-1 flex items-center gap-1">
                                        <Calendar size={12} />
                                        Última Parcela (opcional)
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full p-2 bg-white border border-blue-200 rounded text-sm text-blue-900"
                                        value={dataFinal}
                                        onChange={e => setDataFinal(e.target.value)}
                                        min={dataPagamento}
                                    />
                                    <p className="text-[10px] text-blue-600 mt-1">
                                        Se preenchido, cria parcelas automáticas até esta data.
                                    </p>
                                </div>
                            )}

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
                                className={`w-full btn mt-2 flex items-center justify-center gap-2 ${editingId ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'btn-primary'}`}
                            >
                                {editingId ? <Save size={18} /> : <Plus size={18} />}
                                {editingId ? 'Salvar Alterações' : 'Adicionar Custo'}
                            </button>

                            {editingId && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="w-full py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm font-medium"
                                >
                                    Cancelar Edição
                                </button>
                            )}
                        </form>
                    </div>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Month Navigator */}
                    <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200 mb-4">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-[var(--primary)] transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <span className="font-bold text-slate-700 capitalize flex items-center gap-2">
                            <Calendar size={18} className="text-[var(--primary)]" />
                            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                        </span>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-[var(--primary)] transition-colors">
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {loading ? (
                        <p className="text-center text-slate-500 py-10">Carregando despesas...</p>
                    ) : filteredCustos.length === 0 ? (
                        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                            <Tag className="mx-auto text-slate-300 mb-2" size={48} />
                            <p className="text-slate-500 font-medium">Nenhuma despesa neste mês.</p>
                            <p className="text-sm text-slate-400">Verifique outros meses ou adicione um novo.</p>
                        </div>
                    ) : (
                        filteredCustos.map((custo) => (
                            <div key={custo.id} className={`group bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition-all flex items-center justify-between ${editingId === custo.id ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/10' : 'border-slate-200'} ${custo.pago ? 'opacity-75 bg-slate-50' : ''}`}>
                                <div className="flex items-center gap-4">
                                    {/* Payment Toggle */}
                                    <button
                                        onClick={() => handleTogglePago(custo)}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${custo.pago ? 'bg-green-100 border-green-300 text-green-600' : 'bg-white border-slate-300 text-slate-200 hover:text-green-500 hover:border-green-400'}`}
                                        title={custo.pago ? "Pago! Clique para desfazer" : "Confirmar Pagamento"}
                                    >
                                        <Check size={16} className={custo.pago ? "opacity-100" : "opacity-0 hover:opacity-100"} />
                                    </button>

                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${custo.categoria === 'Fixa'
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'bg-orange-50 text-orange-600'
                                        }`}>
                                        {custo.categoria === 'Fixa' ? 'F' : 'V'}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">
                                            {custo.titulo}
                                            {custo.parcela_numero && custo.total_parcelas && (
                                                <span className="ml-2 text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                                    {custo.parcela_numero}/{custo.total_parcelas}
                                                </span>
                                            )}
                                        </h3>
                                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-0.5">
                                            <span className="flex items-center gap-1">
                                                <Calendar size={14} />
                                                {format(parseISO(custo.data_pagamento), 'dd/MM/yyyy')}
                                            </span>
                                            {custo.data_validade && (
                                                <span className="flex items-center gap-1 text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded text-xs">
                                                    <Clock size={12} />
                                                    Expira: {format(parseISO(custo.data_validade), 'dd/MM')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 sm:gap-6">
                                    <span className="text-lg font-bold text-slate-700">
                                        R$ {Number(custo.valor).toFixed(2)}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleEdit(custo)}
                                            className="p-2 text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Editar"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(custo)}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
