import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Wallet, TrendingUp, Users, ArrowUpRight, ArrowDownRight, DollarSign, Calendar } from 'lucide-react';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, format, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        investimento: 0,
        faturamento: 0,
        atendimentos: 0,
        lucro: 0
    });
    const [chartData, setChartData] = useState<any[]>([]);
    const [recentPatients, setRecentPatients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, [user]);

    const fetchDashboardData = async () => {
        if (!user) return;

        try {
            const today = new Date();
            const start = startOfMonth(today);
            const end = endOfMonth(today);

            // 1. Fetch Data
            const [custosResponse, consultasResponse, pacientesResponse] = await Promise.all([
                supabase.from('custos').select('*'),
                supabase.from('consultas').select('*'),
                supabase.from('pacientes').select('*').order('created_at', { ascending: false }).limit(5)
            ]);

            if (custosResponse.error) throw custosResponse.error;
            if (consultasResponse.error) throw consultasResponse.error;
            if (pacientesResponse.error) throw pacientesResponse.error;

            const custosData = custosResponse.data || [];
            const consultasData = consultasResponse.data || [];

            // 2. Filter for Current Month
            const monthCustos = custosData.filter(c =>
                isWithinInterval(parseISO(c.data_pagamento), { start, end })
            );

            const monthConsultas = consultasData.filter(c =>
                isWithinInterval(parseISO(c.data_consulta), { start, end })
            );

            // 3. Calculate Totals
            const totalCustos = monthCustos.reduce((acc, curr) => acc + Number(curr.valor), 0);
            const totalFaturamento = monthConsultas.reduce((acc, curr) => acc + Number(curr.valor_consulta || 0), 0);

            setStats({
                investimento: totalCustos,
                faturamento: totalFaturamento,
                atendimentos: monthConsultas.length,
                lucro: totalFaturamento - totalCustos
            });

            setRecentPatients(pacientesResponse.data || []);

            // 4. Prepare Chart Data (Day by Day)
            const days = eachDayOfInterval({ start, end });
            const chart = days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayRevenue = monthConsultas
                    .filter(c => c.data_consulta.startsWith(dateStr))
                    .reduce((acc, c) => acc + Number(c.valor_consulta || 0), 0);

                const dayCost = monthCustos
                    .filter(c => c.data_pagamento === dateStr)
                    .reduce((acc, c) => acc + Number(c.valor), 0);

                return {
                    name: format(day, 'dd'),
                    receita: dayRevenue,
                    despesa: dayCost
                };
            });
            setChartData(chart);

        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    return (
        <div className="space-y-8 pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                    <p className="text-slate-500">Resumo financeiro de {format(new Date(), 'MMMM', { locale: ptBR })}</p>
                </div>
                <div className="text-sm bg-white border border-slate-200 px-3 py-1 rounded-lg text-slate-500 capitalize">
                    {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
                </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-transform hover:-translate-y-1">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><TrendingUp size={20} /></div>
                        <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><ArrowUpRight size={12} className="mr-1" />Receita</span>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Faturamento</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : formatCurrency(stats.faturamento)}</h3>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-transform hover:-translate-y-1">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><Wallet size={20} /></div>
                        <span className="flex items-center text-xs font-medium text-rose-600 bg-rose-50 px-2 py-1 rounded-full"><ArrowDownRight size={12} className="mr-1" />Despesa</span>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Investimento</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : formatCurrency(stats.investimento)}</h3>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-transform hover:-translate-y-1">
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-2 rounded-lg ${stats.lucro >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}><DollarSign size={20} /></div>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Saldo Líquido</p>
                    <h3 className={`text-2xl font-bold mt-1 ${stats.lucro >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{loading ? '...' : formatCurrency(stats.lucro)}</h3>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-transform hover:-translate-y-1">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-slate-100 text-slate-600 rounded-lg"><Users size={20} /></div>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Atendimentos</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : stats.atendimentos}</h3>
                </div>
            </div>

            {/* Chart & List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Financial Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6">Fluxo Financeiro Diário</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(value) => `R$${value}`} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: number) => [`R$ ${value}`, '']}
                                />
                                <Area type="monotone" dataKey="receita" name="Receita" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorReceita)" />
                                <Area type="monotone" dataKey="despesa" name="Despesa" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorDespesa)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Patients */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-900">Últimos Pacientes</h3>
                        <Link to="/pacientes" className="text-xs font-medium text-[var(--primary)] hover:underline">Ver todos</Link>
                    </div>
                    <div className="space-y-4">
                        {recentPatients.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-4">Nenhum paciente recente.</p>
                        ) : (
                            recentPatients.map(paciente => (
                                <div key={paciente.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                                    <div className="w-10 h-10 bg-[var(--primary-light)] text-[var(--primary)] rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                                        {paciente.nome.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-slate-900 text-sm truncate">{paciente.nome}</h4>
                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                            <Calendar size={10} />
                                            Cadastrado em {format(parseISO(paciente.created_at), 'dd/MM')}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-100">
                        <Link to="/pacientes" className="w-full btn bg-slate-100 text-slate-600 hover:bg-slate-200 justify-center">
                            Novo Paciente
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
