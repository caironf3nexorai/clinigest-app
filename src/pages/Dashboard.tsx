import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Wallet, TrendingUp, Users, ArrowUpRight, ArrowDownRight, DollarSign, Calendar, Shield, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, format, eachDayOfInterval, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
    const { user, profile } = useAuth();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [stats, setStats] = useState({
        investimento: 0,
        faturamento_real: 0, // Realized (Completed)
        faturamento_previsto: 0, // Scheduled
        caixa_dia: 0, // Today's Realized
        atendimentos: 0,
        lucro: 0
    });

    const [chartData, setChartData] = useState<any[]>([]);
    const [attendanceData, setAttendanceData] = useState<any[]>([]);
    const [recentPatients, setRecentPatients] = useState<any[]>([]);
    const [noShowList, setNoShowList] = useState<any[]>([]);
    const [showNoShowModal, setShowNoShowModal] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, [user, selectedDate]);

    const fetchDashboardData = async () => {
        if (!user) return;

        try {
            const today = new Date();
            const currentMonthStart = startOfMonth(selectedDate);

            const startStr = format(currentMonthStart, 'yyyy-MM-dd');
            const endStr = format(endOfMonth(selectedDate), 'yyyy-MM-dd');
            const todayStr = format(today, 'yyyy-MM-dd');

            // 1. Fetch Data
            const [custosResponse, consultasResponse, pacientesResponse] = await Promise.all([
                supabase.from('custos').select('*'),
                supabase.from('consultas').select('*, paciente:pacientes(nome)'),
                supabase.from('pacientes').select('*').order('created_at', { ascending: false }).limit(5)
            ]);

            if (custosResponse.error) throw custosResponse.error;
            if (consultasResponse.error) throw consultasResponse.error;
            if (pacientesResponse.error) throw pacientesResponse.error;

            const custosData = custosResponse.data || [];
            const consultasData = consultasResponse.data || [];

            // 2. Filter for Current Month & Today
            const monthCustos = custosData.filter(c => c.data_pagamento >= startStr && c.data_pagamento <= endStr);
            const monthConsultas = consultasData.filter(c => c.data_consulta.startsWith(startStr.substring(0, 7))); // Simple YYYY-MM match

            // 3. Calculate Totals
            const totalCustos = monthCustos.reduce((acc, curr) => acc + Number(curr.valor), 0);

            // Monthly Realized (Status = Completed)
            const totalFaturadoReal = monthConsultas
                .filter(c => c.status === 'completed')
                .reduce((acc, curr) => acc + Number(curr.valor_consulta || 0), 0);

            // Monthly Predicted (All active statuses)
            const totalFaturadoPrevisto = monthConsultas
                .filter(c => c.status !== 'cancelled' && c.status !== 'no_show')
                .reduce((acc, curr) => acc + Number(curr.valor_consulta || 0), 0);

            // Daily Cash (Today + Completed)
            const caixaDia = consultasData
                .filter(c => c.data_consulta.startsWith(todayStr) && c.status === 'completed')
                .reduce((acc, curr) => acc + Number(curr.valor_consulta || 0), 0);

            setStats({
                investimento: totalCustos,
                faturamento_real: totalFaturadoReal,
                faturamento_previsto: totalFaturadoPrevisto,
                caixa_dia: caixaDia,
                atendimentos: monthConsultas.filter(c => c.status === 'completed').length,
                lucro: totalFaturadoReal - totalCustos
            });

            setRecentPatients(pacientesResponse.data || []);

            // 4. Prepare Chart Data (Day by Day)
            const days = eachDayOfInterval({ start: parseISO(startStr), end: parseISO(endStr) });
            const chart = days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayRevenue = monthConsultas
                    .filter(c => c.data_consulta.startsWith(dateStr) && c.status === 'completed')
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

            // NO-SHOW ANALYTICS (Attendance Data)
            const attendedCount = monthConsultas.filter(c => c.status === 'completed').length;
            const noShowFiltered = monthConsultas.filter(c => c.status === 'no_show');
            const noShowCount = noShowFiltered.length;

            setNoShowList(noShowFiltered);
            setAttendanceData([
                { name: 'Compareceram', value: attendedCount, color: '#10b981' }, // Emerald-500
                { name: 'Faltaram', value: noShowCount, color: '#f43f5e' }       // Rose-500
            ]);

        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    // 5. Privacy Logic
    const role = profile?.role || 'secretary'; // Default to restrictive
    const isOwner = role === 'clinic_owner' || role === 'super_admin';
    const isSecretary = role === 'secretary';

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                    <p className="text-slate-500">
                        {isSecretary ? 'Painel Operacional' : 'Visão Geral da Clínica'}
                    </p>
                </div>
                {isOwner && (
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full md:w-auto">
                        {/* Month Picker */}
                        <div className="flex items-center justify-between flex-1 md:flex-none gap-2 bg-white rounded-lg p-1 border border-slate-200 shadow-sm order-2 md:order-1">
                            <button onClick={() => setSelectedDate(prev => subMonths(prev, 1))} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600 transition-colors"><ChevronLeft size={20} /></button>
                            <span className="text-sm font-bold text-slate-700 capitalize min-w-[120px] text-center leading-none pb-0.5 select-none">{format(selectedDate, 'MMMM yyyy', { locale: ptBR })}</span>
                            <button onClick={() => setSelectedDate(prev => addMonths(prev, 1))} className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600 transition-colors"><ChevronRight size={20} /></button>
                        </div>

                        <Link to="/financeiro" className="text-sm bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg border border-indigo-100 font-medium hover:bg-indigo-100 transition-colors h-9 flex items-center justify-center flex-1 md:flex-none whitespace-nowrap order-1 md:order-2">
                            Ver Faturamento
                        </Link>
                    </div>
                )}
            </div>

            {/* NÍVEL 1: OPERACIONAL (Visível para Todos) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Caixa Do Dia */}
                <Link to={isOwner ? "/financeiro" : "#"} className={isOwner ? "block" : "cursor-default block"}>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md group">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg group-hover:bg-emerald-200 transition-colors"><DollarSign size={20} /></div>
                            <span className="flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wide">Hoje</span>
                        </div>
                        <p className="text-slate-500 text-sm font-medium">Caixa Diário</p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : formatCurrency(stats.caixa_dia)}</h3>
                        <p className="text-xs text-slate-400 mt-1">Realizado hoje</p>
                    </div>
                </Link>

                {/* 2. Atendimentos (Nova Card para dar volume ao Dashboard Operacional) */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-transform hover:-translate-y-1">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Users size={20} /></div>
                    </div>
                    <p className="text-slate-500 text-sm font-medium">Atendimentos</p>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : stats.atendimentos}</h3>
                    <p className="text-xs text-slate-400 mt-1">Finalizados este mês</p>
                </div>

                {/* NÍVEL 2: ESTRATÉGICO (Blindado - Só Dono) */}
                {isOwner && (
                    <>
                        {/* 3. Faturamento Mês */}
                        <Link to="/financeiro" className="block">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md cursor-pointer group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100 transition-colors"><TrendingUp size={20} /></div>
                                    <span className="flex items-center text-xs font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-full">Mensal</span>
                                </div>
                                <p className="text-slate-500 text-sm font-medium">Receita Realizada</p>
                                <h3 className="text-2xl font-bold text-slate-900 mt-1">{loading ? '...' : formatCurrency(stats.faturamento_real)}</h3>
                                <div className="flex items-center gap-1 mt-1">
                                    <span className="text-xs text-slate-400">Previsto: </span>
                                    <span className="text-xs font-medium text-slate-600">{formatCurrency(stats.faturamento_previsto)}</span>
                                </div>
                            </div>
                        </Link>

                        {/* 4. Lucro */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-transform hover:-translate-y-1">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`p-2 rounded-lg ${stats.lucro >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}><ArrowUpRight size={20} /></div>
                            </div>
                            <p className="text-slate-500 text-sm font-medium">Saldo Líquido</p>
                            <h3 className={`text-2xl font-bold mt-1 ${stats.lucro >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{loading ? '...' : formatCurrency(stats.lucro)}</h3>
                            <p className="text-xs text-slate-400 mt-1">Receita Real - Despesas</p>
                        </div>
                    </>
                )}
            </div>

            {/* Chart & List */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Financial Chart (Protected) */}
                <div className="lg:col-span-2 space-y-8">
                    {/* AREA CHART - FLUXO FINANCEIRO */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-900 mb-6">
                            {isOwner ? 'Fluxo Financeiro Diário' : 'Fluxo de Atendimentos'}
                        </h3>

                        {isOwner ? (
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
                                            formatter={(value: any) => [`R$ ${value}`, '']}
                                        />
                                        <Area type="monotone" dataKey="receita" name="Receita" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorReceita)" />
                                        <Area type="monotone" dataKey="despesa" name="Despesa" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorDespesa)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[300px] w-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-lg">
                                <Shield size={48} className="mb-2 opacity-50" />
                                <p className="text-sm font-medium">Visualização restrita à Administração</p>
                            </div>
                        )}
                    </div>

                    {/* PIE CHART - ATTENDANCE (NO-SHOW) */}
                    {isOwner && (
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-slate-900 leading-none">Taxa de Faltas</h3>
                                    <span className="text-xs text-slate-500 font-normal">Mês Atual</span>
                                </div>
                                {noShowList.length > 0 && (
                                    <button
                                        onClick={() => setShowNoShowModal(true)}
                                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                                    >
                                        Ver Lista
                                    </button>
                                )}
                            </div>
                            <div className="h-[250px] w-full flex items-center justify-center">
                                {attendanceData.reduce((acc, curr) => acc + curr.value, 0) === 0 ? (
                                    <div className="text-center text-slate-400">
                                        <Users size={48} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">Sem dados suficientes neste mês</p>
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={attendanceData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {attendanceData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Recent Patients (Public to Staff) */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
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

            {/* No Show Modal Details */}
            {showNoShowModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowNoShowModal(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-red-50">
                            <h3 className="font-bold text-lg text-red-900">Pacientes que Faltaram</h3>
                            <button onClick={() => setShowNoShowModal(false)}><X className="text-red-400 hover:text-red-600" /></button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
                            {noShowList.length === 0 ? (
                                <p className="text-center text-slate-500 py-4">Nenhuma falta registrada.</p>
                            ) : (
                                noShowList.map((item: any) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100 hover:border-red-200 transition-colors shadow-sm">
                                        <div>
                                            <p className="font-bold text-slate-800">{item.paciente?.nome || 'Paciente Desconhecido'}</p>
                                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                                <Calendar size={12} />
                                                {format(parseISO(item.data_consulta), "dd/MM/yyyy 'às' HH:mm")}
                                            </p>
                                        </div>
                                        <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 uppercase">Faltou</span>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-3 bg-slate-50 border-t border-slate-100 text-right">
                            <button
                                onClick={() => setShowNoShowModal(false)}
                                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 text-slate-700"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
