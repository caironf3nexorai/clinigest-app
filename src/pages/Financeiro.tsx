import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, startOfMonth, endOfMonth, parseISO, isAfter } from 'date-fns';
import { useFeatureFlag } from '../hooks/useFeatureFlag';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Wallet, Calendar } from 'lucide-react';
import { ptBR } from 'date-fns/locale';

export const Financeiro = () => {
    const { user } = useAuth();
    const hasFinancial = useFeatureFlag('financial_module');

    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date());

    // Metrics
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalCommissions, setTotalCommissions] = useState(0);
    const [totalExpenses, setTotalExpenses] = useState(0);
    const [transactions, setTransactions] = useState<any[]>([]);

    useEffect(() => {
        if (user) fetchFinancialData();
    }, [user, month]);

    const fetchFinancialData = async () => {
        setLoading(true);
        try {
            const start = startOfMonth(month).toISOString();
            const end = endOfMonth(month).toISOString();

            // 1. Fetch Completed Appointments (Revenue & Commissions)
            const { data: appointments, error: appError } = await supabase
                .from('consultas')
                .select('*, procedure:procedures(*)')
                .eq('status', 'completed')
                .gte('data_consulta', start)
                .lte('data_consulta', end)
                .order('data_consulta', { ascending: false });

            if (appError) throw appError;

            // 2. Fetch Expenses (Custos)
            const { data: expenses, error: expError } = await supabase
                .from('custos')
                .select('*')
                .gte('data_pagamento', start)
                .lte('data_pagamento', end);

            // Fetch Recurrent Expenses (Fixas) that might apply but don't strictly have a date match in this range?
            // Current Custos logic is basic (doesn't auto-duplicate monthly).
            // For now, we trust the 'custos' table has the entries for this month (user manually inputs or we rely on payment date).

            if (expError) throw expError;

            // Calculate Totals
            let rev = 0;
            let comm = 0;
            const trans: any[] = [];

            appointments?.forEach(app => {
                const price = app.procedure?.price || 0;
                const commission = app.recorded_commission || 0;
                rev += price;
                comm += commission;

                trans.push({
                    id: app.id,
                    type: 'revenue',
                    title: `Consulta: ${app.procedure?.name || 'Procedimento'}`,
                    date: app.data_consulta,
                    amount: price,
                    subtitle: app.paciente ? 'Paciente ID: ' + app.paciente_id : '', // Ideally fetch patient name too if needed
                    commission: commission
                });
            });

            const exp = expenses?.reduce((acc, curr) => acc + Number(curr.valor), 0) || 0;

            expenses?.forEach(e => {
                trans.push({
                    id: e.id,
                    type: 'expense',
                    title: e.titulo,
                    date: e.data_pagamento,
                    amount: Number(e.valor),
                    subtitle: e.categoria
                });
            });

            // Sort by date desc
            trans.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setTotalRevenue(rev);
            setTotalCommissions(comm);
            setTotalExpenses(exp);
            setTransactions(trans);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.value) return;
        const [y, m] = e.target.value.split('-');
        setMonth(new Date(parseInt(y), parseInt(m) - 1, 1));
    };

    if (!hasFinancial) {
        return <div className="p-8 text-center text-slate-500">Módulo Financeiro não habilitado.</div>;
    }

    const netProfit = totalRevenue - totalExpenses - totalCommissions;

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Wallet className="text-[var(--primary)]" /> Financeiro
                </h1>
                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                    <Calendar size={18} className="text-slate-400" />
                    <input
                        type="month"
                        value={`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`}
                        onChange={handleMonthChange}
                        className="bg-transparent outline-none text-sm font-medium text-slate-700"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[var(--primary)]" /></div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-xs text-slate-500 font-bold uppercase mb-1">Faturamento Bruto</p>
                            <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-1">
                                <span className="text-xs text-slate-400">R$</span> {totalRevenue.toFixed(2)}
                            </h3>
                            <div className="mt-2 text-xs text-green-600 flex items-center gap-1 font-medium bg-green-50 w-fit px-2 py-1 rounded">
                                <TrendingUp size={12} /> Receita
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-xs text-slate-500 font-bold uppercase mb-1">Despesas Operacionais</p>
                            <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-1">
                                <span className="text-xs text-slate-400">R$</span> {totalExpenses.toFixed(2)}
                            </h3>
                            <div className="mt-2 text-xs text-red-600 flex items-center gap-1 font-medium bg-red-50 w-fit px-2 py-1 rounded">
                                <TrendingDown size={12} /> Custos
                            </div>
                        </div>

                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <p className="text-xs text-slate-500 font-bold uppercase mb-1">Comissões Dentistas</p>
                            <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-1">
                                <span className="text-xs text-slate-400">R$</span> {totalCommissions.toFixed(2)}
                            </h3>
                            <div className="mt-2 text-xs text-orange-600 flex items-center gap-1 font-medium bg-orange-50 w-fit px-2 py-1 rounded">
                                <DollarSign size={12} /> Repasse
                            </div>
                        </div>

                        <div className={`bg-white p-4 rounded-xl border shadow-sm ${netProfit >= 0 ? 'border-green-200 bg-green-50/10' : 'border-red-200 bg-red-50/10'}`}>
                            <p className="text-xs text-slate-500 font-bold uppercase mb-1">Lucro Líquido (Estimado)</p>
                            <h3 className={`text-2xl font-bold flex items-center gap-1 ${netProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                <span className="text-xs opacity-60">R$</span> {netProfit.toFixed(2)}
                            </h3>
                            <p className="text-[10px] text-slate-400 mt-2">Receita - Despesas - Comissões</p>
                        </div>
                    </div>

                    {/* Transaction List */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-800">Extrato do Mês</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-3">Data</th>
                                        <th className="px-4 py-3">Descrição</th>
                                        <th className="px-4 py-3">Tipo</th>
                                        <th className="px-4 py-3 text-right">Valor</th>
                                        <th className="px-4 py-3 text-right">Comissão</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {transactions.map(t => (
                                        <tr key={`${t.type}-${t.id}`} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                                                {format(parseISO(t.date), 'dd/MM/yyyy')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-slate-900">{t.title}</div>
                                                {t.subtitle && <div className="text-xs text-slate-400">{t.subtitle}</div>}
                                            </td>
                                            <td className="px-4 py-3">
                                                {t.type === 'revenue' ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                        Entrada
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                        Saída
                                                    </span>
                                                )}
                                            </td>
                                            <td className={`px-4 py-3 text-right font-medium ${t.type === 'revenue' ? 'text-green-600' : 'text-red-600'}`}>
                                                {t.type === 'revenue' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-slate-500">
                                                {t.commission ? `R$ ${t.commission.toFixed(2)}` : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                                                Nenhuma movimentação neste mês.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
