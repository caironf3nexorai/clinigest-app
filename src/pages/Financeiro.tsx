import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, startOfMonth, endOfMonth, parseISO, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Wallet, TrendingUp, DollarSign, Calendar, ArrowLeft, ArrowRight, CreditCard, Banknote, QrCode, ShieldCheck, FileText, Download, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

export const Financeiro = () => {
    const { user, profile } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);

    // Stats
    const [stats, setStats] = useState({
        receitaTotal: 0,
        ticketMedio: 0,
        qtdVendas: 0,
        receitaPrevista: 0,
        totalDespesas: 0,
        lucroLiquido: 0
    });

    // Breakdown
    const [paymentData, setPaymentData] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);

    useEffect(() => {
        fetchFinancialData();
    }, [user, currentDate]);

    const fetchFinancialData = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const startStr = format(startOfMonth(currentDate), 'yyyy-MM-dd');
            const endStr = format(endOfMonth(currentDate), 'yyyy-MM-dd');

            // 1. Fetch COMPLETED consultations for this month
            const { data: allConsultas, error: consultError } = await supabase
                .from('consultas')
                .select(`
                    *,
                    paciente:pacientes(nome),
                    procedure:procedures(name)
                `)
                .gte('data_consulta', startStr)
                .lte('data_consulta', endStr + 'T23:59:59')
                .order('data_consulta', { ascending: false });

            if (consultError) throw consultError;

            // 2. Fetch EXPENSES
            const { data: expenses, error: expError } = await supabase
                .from('custos')
                .select('*')
                .gte('data_pagamento', startStr)
                .lte('data_pagamento', endStr);

            if (expError) throw expError;

            // --- CALCULATIONS ---

            // Revenue (Completed)
            const completed = allConsultas?.filter(c => c.status === 'completed') || [];
            const receitaTotal = completed.reduce((acc, c) => acc + (c.valor_consulta || 0), 0);
            const qtdVendas = completed.length;
            const ticketMedio = qtdVendas > 0 ? receitaTotal / qtdVendas : 0;

            // Expected Revenue (Scheduled/Confirmed/Completed)
            // Note: Total potential revenue for the month
            const activeConsultas = allConsultas?.filter(c => c.status !== 'cancelled' && c.status !== 'no_show') || [];
            const receitaPrevista = activeConsultas.reduce((acc, c) => acc + (c.valor_consulta || 0), 0);

            // Expenses
            const totalDespesas = expenses?.reduce((acc, e) => acc + Number(e.valor), 0) || 0;

            // Net Profit
            const lucroLiquido = receitaTotal - totalDespesas;

            // Payment Breakdown
            const byType: Record<string, number> = {
                money: 0,
                card: 0,
                pix: 0,
                warranty: 0,
                none: 0
            };

            completed.forEach(c => {
                const method = c.payment_method || 'none';
                byType[method] = (byType[method] || 0) + (c.valor_consulta || 0);
            });

            const chartData = [
                { name: 'Dinheiro', value: byType.money, color: '#10b981' }, // Emerald
                { name: 'Pix', value: byType.pix, color: '#0ea5e9' }, // Sky
                { name: 'Cartão', value: byType.card, color: '#8b5cf6' }, // Violet
                { name: 'Garantia', value: byType.warranty, color: '#f59e0b' }, // Amber
                { name: 'Não Inf.', value: byType.none, color: '#94a3b8' }, // Slate
            ].filter(d => d.value > 0);

            setStats({ receitaTotal, ticketMedio, qtdVendas, receitaPrevista, totalDespesas, lucroLiquido });
            setPaymentData(chartData);
            setTransactions(completed);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleMonthChange = (direction: 'next' | 'prev') => {
        const newDate = direction === 'next'
            ? addMonths(currentDate, 1)
            : subMonths(currentDate, 1);
        setCurrentDate(newDate);
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const getPaymentLabel = (method: string) => {
        switch (method) {
            case 'money': return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-bold"><Banknote size={12} /> Dinheiro</span>;
            case 'card': return <span className="flex items-center gap-1 text-violet-600 bg-violet-50 px-2 py-1 rounded text-xs font-bold"><CreditCard size={12} /> Cartão</span>;
            case 'pix': return <span className="flex items-center gap-1 text-sky-600 bg-sky-50 px-2 py-1 rounded text-xs font-bold"><QrCode size={12} /> Pix</span>;
            case 'warranty': return <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded text-xs font-bold"><ShieldCheck size={12} /> Garantia</span>;
            default: return <span className="text-slate-400 text-xs">Não Informado</span>;
        }
    };

    // Permission Check
    const role = profile?.role || 'clinic_owner';
    const isOwner = role === 'clinic_owner' || role === 'super_admin';
    const hasAccess = isOwner || profile?.plan_config?.simple_mode === true;

    if (!hasAccess) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-center">
                <ShieldCheck size={48} className="text-slate-300 mb-4" />
                <h2 className="text-xl font-bold text-slate-700">Acesso Restrito</h2>
                <p className="text-slate-500">Apenas Gestores têm acesso ao módulo financeiro detalhado.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Wallet className="text-[var(--primary)]" /> Faturamento
                    </h1>
                    <p className="text-slate-500">Gestão detalhada de vendas e receitas.</p>
                </div>

                {/* Month Selector */}
                <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                    <button onClick={() => handleMonthChange('prev')} className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-2 px-2 min-w-[160px] justify-center text-slate-800 font-bold capitalize">
                        <Calendar size={18} className="text-emerald-600" />
                        {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                    </div>
                    <button onClick={() => handleMonthChange('next')} className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors">
                        <ArrowRight size={20} />
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-transform hover:-translate-y-1">
                    <div className="flex justify-between items-start mb-2 opacity-75">
                        <span className="text-sm font-medium text-slate-500">Receita Realizada</span>
                        <TrendingUp size={18} className="text-emerald-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900">{loading ? '...' : formatCurrency(stats.receitaTotal)}</h2>
                    <p className="text-xs text-slate-400 mt-1">Total recebido em caixa (Completed)</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-transform hover:-translate-y-1">
                    <div className="flex justify-between items-start mb-2 opacity-75">
                        <span className="text-sm font-medium text-slate-500">Despesas Totais</span>
                        <TrendingDown size={18} className="text-rose-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">{loading ? '...' : formatCurrency(stats.totalDespesas)}</h2>
                    <p className="text-xs text-slate-400 mt-1">Custos operacionais do mês</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-transform hover:-translate-y-1">
                    <div className="flex justify-between items-start mb-2 opacity-75">
                        <span className="text-sm font-medium text-slate-500">Lucro Líquido</span>
                        <DollarSign size={18} className={stats.lucroLiquido >= 0 ? "text-blue-500" : "text-orange-500"} />
                    </div>
                    <h2 className={`text-2xl font-bold ${stats.lucroLiquido >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {loading ? '...' : formatCurrency(stats.lucroLiquido)}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Receita Real - Despesas</p>
                </div>

                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-start mb-2 opacity-75">
                        <span className="text-sm font-medium text-slate-500">Ticket Médio</span>
                        <FileText size={18} className="text-indigo-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-700">{loading ? '...' : formatCurrency(stats.ticketMedio)}</h2>
                    <p className="text-xs text-slate-400 mt-1">{stats.qtdVendas} Vendas Realizadas</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chart Section */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-1">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <PieChart className="text-slate-400" size={20} /> Formas de Pagamento
                    </h3>
                    <div className="h-64">
                        {loading ? (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm">Carregando...</div>
                        ) : paymentData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={paymentData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {paymentData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(value) => formatCurrency(Number(value))} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sem dados de pagamento</div>
                        )}
                    </div>
                </div>

                {/* Transaction List */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Vendas do Mês (Realizadas)</h3>
                        <button className="text-xs text-indigo-600 font-bold hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                            <Download size={14} /> Exportar
                        </button>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Data</th>
                                    <th className="px-6 py-3">Paciente</th>
                                    <th className="px-6 py-3">Procedimento</th>
                                    <th className="px-6 py-3">Pagamento</th>
                                    <th className="px-6 py-3 text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">Carregando...</td></tr>
                                ) : transactions.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhuma venda registrada neste mês.</td></tr>
                                ) : (
                                    transactions.map(t => (
                                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4 text-slate-600">
                                                {format(parseISO(t.data_consulta), 'dd/MM/yyyy HH:mm')}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-800">
                                                {t.paciente?.nome || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 max-w-[200px] truncate">
                                                {t.procedure?.name || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                {getPaymentLabel(t.payment_method)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-700">
                                                {formatCurrency(t.valor_consulta || 0)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
