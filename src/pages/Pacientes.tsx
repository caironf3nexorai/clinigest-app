import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Phone, Calendar, ArrowLeft, FileText, Activity, Pill, DollarSign, Clock, Stethoscope, Trash2, Edit, MessageCircle, Paperclip, Printer, User, X, Shield } from 'lucide-react';
import type { Paciente, Consulta } from '../types/db';
import { format, parseISO, differenceInYears } from 'date-fns';
import { PatientAttachments } from '../components/PatientAttachments';
import { PatientPrintView, printPatientRecord } from '../components/PatientPrintView';

export const Pacientes = () => {
    const { user, profile } = useAuth(); // Destructure profile

    // View State: 'list' | 'details'
    const [view, setView] = useState<'list' | 'details'>('list');
    const [activeTab, setActiveTab] = useState<'history' | 'attachments'>('history');
    const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);

    // Data State
    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [consultas, setConsultas] = useState<Consulta[]>([]);
    const [teamNames, setTeamNames] = useState<Record<string, string>>({}); // ID -> Username
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Patient Form State (Create & Edit)
    const [showNewPatientForm, setShowNewPatientForm] = useState(false);
    const [isEditingPaciente, setIsEditingPaciente] = useState(false);
    const [editingPacienteId, setEditingPacienteId] = useState<string | null>(null);
    const [novoPaciente, setNovoPaciente] = useState({ nome: '', telefone: '', data_nascimento: '' });

    // Consultation Form State
    const [novaConsulta, setNovaConsulta] = useState({
        queixa: '',
        evolucao: '',
        procedimento: '',
        medicamentos: '',
        valor_consulta: '',
        data_consulta: new Date().toISOString().split('T')[0],
        payment_method: 'none'
    });

    useEffect(() => {
        if (user) {
            fetchPacientes();
            fetchTeamNames();
        }
    }, [user]);

    // ...

    const fetchTeamNames = async () => {
        try {
            // Fetch profiles to map IDs to Names
            // RLS should allow visible profiles (Team)
            const { data } = await supabase.from('profiles').select('id, username');
            if (data) {
                const map: Record<string, string> = {};
                data.forEach((p: any) => {
                    map[p.id] = p.username || 'Sem Nome';
                });
                setTeamNames(map);
            }
        } catch (err) {
            console.error('Error fetching team names:', err);
        }
    };

    useEffect(() => {
        if (selectedPaciente) fetchConsultas(selectedPaciente.id);
    }, [selectedPaciente]);

    const fetchPacientes = async () => {
        try {
            const { data, error } = await supabase
                .from('pacientes')
                .select('*')
                // RLS filters this automatically, but explicitly:
                // .or(`owner_id.eq.${user?.id},owner_id.eq.${profile?.owner_id}`)
                // Trusting RLS here for simplicity
                .order('nome');
            if (error) throw error;
            setPacientes(data || []);
        } catch (error) {
            console.error('Erro ao buscar pacientes:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchConsultas = async (pacienteId: string) => {
        try {
            const { data, error } = await supabase
                .from('consultas')
                .select('*')
                .eq('paciente_id', pacienteId)
                .order('data_consulta', { ascending: false });
            if (error) throw error;
            setConsultas(data || []);
        } catch (error) {
            console.error('Erro ao buscar consultas:', error);
        }
    };

    // --- Patient Actions ---

    const handleSavePaciente = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        try {
            if (isEditingPaciente && editingPacienteId) {
                // UPDATE
                const { data, error } = await supabase.from('pacientes').update({
                    ...novoPaciente,
                    data_nascimento: novoPaciente.data_nascimento || null
                }).eq('id', editingPacienteId).select().single();

                if (error) throw error;

                setPacientes(pacientes.map(p => p.id === editingPacienteId ? data : p));
                alert('Paciente atualizado com sucesso!');
            } else {
                // CREATE
                const { data, error } = await supabase.from('pacientes').insert({
                    user_id: user.id,
                    owner_id: profile?.owner_id || user.id, // Assign to Clinic Owner (or self if owner)
                    ...novoPaciente,
                    data_nascimento: novoPaciente.data_nascimento || null
                }).select().single();

                if (error) throw error;

                setPacientes([...pacientes, data]);
                handleSelectPaciente(data); // Auto select new patient
            }

            resetPacienteForm();
        } catch (error) {
            alert('Erro ao salvar paciente');
            console.error(error);
        }
    };

    const handleDeletePaciente = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Tem certeza? Isso apagará o paciente e TODO o histórico de consultas dele.')) return;

        try {
            const { error } = await supabase.from('pacientes').delete().eq('id', id);
            if (error) throw error;
            setPacientes(pacientes.filter(p => p.id !== id));
        } catch (error) {
            console.error(error);
            alert('Erro ao excluir paciente.');
        }
    };

    const handleEditPacienteClick = (e: React.MouseEvent, paciente: Paciente) => {
        e.stopPropagation();
        setNovoPaciente({
            nome: paciente.nome,
            telefone: paciente.telefone || '',
            data_nascimento: paciente.data_nascimento ? paciente.data_nascimento.split('T')[0] : ''
        });
        setEditingPacienteId(paciente.id);
        setIsEditingPaciente(true);
        setShowNewPatientForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetPacienteForm = () => {
        setNovoPaciente({ nome: '', telefone: '', data_nascimento: '' });
        setShowNewPatientForm(false);
        setIsEditingPaciente(false);
        setEditingPacienteId(null);
    };

    // --- Consultation Actions ---

    const handleCreateConsulta = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !selectedPaciente) return;

        try {
            // Fix timezone issue by appending current time if simple date is provided, 
            // or just use the date string as is if the DB column is date. 
            // Since it is timestamptz, '2025-01-20' -> '2025-01-20 00:00:00+00'.
            // To ensure it is recorded as the intended local date, we can append a time like 12:00
            // but the safest for "Date of Consultation" is usually handling it as a simple date column.
            // Since we can't change the column type easily now without migration, lets append 'T12:00:00'
            // to force it to be mid-day so timezone shifts don't change the day.
            const dataConsultaSafe = novaConsulta.data_consulta ? `${novaConsulta.data_consulta}T12:00:00` : new Date().toISOString();

            const { data, error } = await supabase.from('consultas').insert({
                user_id: user.id,
                owner_id: profile?.owner_id || user.id, // THE FIX
                paciente_id: selectedPaciente.id,
                ...novaConsulta,
                data_consulta: dataConsultaSafe,
                valor_consulta: novaConsulta.valor_consulta ? parseFloat(novaConsulta.valor_consulta) : 0,
                payment_method: novaConsulta.payment_method === 'none' ? null : novaConsulta.payment_method,
                status: 'completed'
            }).select().single();

            if (error) throw error;

            setConsultas([data, ...consultas]);
            // Reset form
            setNovaConsulta({
                queixa: '',
                evolucao: '',
                procedimento: '',
                medicamentos: '',
                valor_consulta: '',
                data_consulta: new Date().toISOString().split('T')[0],
                payment_method: 'none'
            });
            alert('Atendimento registrado com sucesso!');
        } catch (error) {
            alert('Erro ao salvar consulta');
            console.error(error);
        }
    };

    const handleDeleteConsulta = async (id: string) => {
        if (!confirm('Apagar este registro de atendimento?')) return;
        try {
            await supabase.from('consultas').delete().eq('id', id);
            setConsultas(consultas.filter(c => c.id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    const handleSelectPaciente = (paciente: Paciente) => {
        setSelectedPaciente(paciente);
        setView('details');
        resetPacienteForm();
    };

    const handleBackToList = () => {
        setSelectedPaciente(null);
        setView('list');
    };

    const filteredPacientes = pacientes.filter(p =>
        p.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const openWhatsApp = (e: React.MouseEvent, telefone: string) => {
        e.stopPropagation();
        const cleanPhone = telefone.replace(/\D/g, '');
        if (cleanPhone) {
            window.open(`https://wa.me/55${cleanPhone}`, '_blank');
        } else {
            alert('Número de telefone inválido.');
        }
    };

    // --- RENDER ---

    if (view === 'list') {
        return (
            <div className="max-w-5xl mx-auto space-y-6 pb-20 print:hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Pacientes</h1>
                        <p className="text-slate-500">Gestão de prontuários e atendimentos</p>
                    </div>
                    <button
                        onClick={() => {
                            resetPacienteForm();
                            setShowNewPatientForm(!showNewPatientForm);
                        }}
                        className={`btn ${showNewPatientForm ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' : 'btn-primary'}`}
                    >
                        {showNewPatientForm ? <div className="flex items-center gap-2">Cancelar</div> : <div className="flex items-center gap-2"><Plus size={20} /> Novo Paciente</div>}
                    </button>
                </div>

                {/* New/Edit Patient Form (Collapsible) */}
                {showNewPatientForm && (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-4">
                        <h3 className="font-bold mb-4">{isEditingPaciente ? 'Editar Paciente' : 'Cadastro de Paciente'}</h3>
                        <form onSubmit={handleSavePaciente} className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium mb-1">Nome Completo</label>
                                <input
                                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    value={novoPaciente.nome}
                                    onChange={e => setNovoPaciente({ ...novoPaciente, nome: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="w-full md:w-48">
                                <label className="block text-sm font-medium mb-1">Telefone</label>
                                <input
                                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    value={novoPaciente.telefone}
                                    onChange={e => setNovoPaciente({ ...novoPaciente, telefone: e.target.value })}
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                            <div className="w-full md:w-40">
                                <label className="block text-sm font-medium mb-1">D. Nascimento</label>
                                <input
                                    type="date"
                                    className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                    value={novoPaciente.data_nascimento}
                                    onChange={e => setNovoPaciente({ ...novoPaciente, data_nascimento: e.target.value })}
                                />
                            </div>
                            <button type="submit" className="btn btn-primary w-full md:w-auto">
                                {isEditingPaciente ? 'Atualizar' : 'Salvar'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Search & List */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar paciente por nome..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {loading ? (
                            <div className="p-8 text-center text-slate-500">Carregando...</div>
                        ) : filteredPacientes.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">
                                {searchTerm ? 'Nenhum paciente encontrado.' : 'Nenhum paciente cadastrado.'}
                            </div>
                        ) : (
                            filteredPacientes.map(paciente => (
                                <div
                                    key={paciente.id}
                                    onClick={() => handleSelectPaciente(paciente)}
                                    className="p-4 hover:bg-slate-50 cursor-pointer flex items-center justify-between group transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-[var(--primary-light)] text-[var(--primary)] rounded-full flex items-center justify-center font-bold">
                                            {paciente.nome.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 group-hover:text-[var(--primary)] transition-colors">{paciente.nome}</h3>

                                            {/* Registered By */}
                                            <div className="text-xs text-slate-400 flex items-center gap-1 mb-1">
                                                <User size={10} />
                                                <span>Profissional: {teamNames[paciente.last_professional_id || ''] || teamNames[paciente.user_id || ''] || '...'}</span>
                                            </div>

                                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                                {paciente.telefone && (
                                                    <span className="flex items-center gap-1"><Phone size={12} /> {paciente.telefone}</span>
                                                )}
                                                {paciente.data_nascimento && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar size={12} />
                                                        {differenceInYears(new Date(), parseISO(paciente.data_nascimento))} anos
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {paciente.telefone && (
                                            <button
                                                onClick={(e) => openWhatsApp(e, paciente.telefone)}
                                                className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                title="Enviar WhatsApp"
                                            >
                                                <MessageCircle size={16} />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => handleEditPacienteClick(e, paciente)}
                                            className="p-2 text-slate-400 hover:text-[var(--primary)] hover:bg-[var(--primary-light)] rounded-lg transition-colors"
                                            title="Editar"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => handleDeletePaciente(e, paciente.id)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <div className="text-slate-300 pl-2">
                                            ➤
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- DETAILS VIEW (PRONTUÁRIO) ---

    if (view === 'details' && selectedPaciente) {
        return (
            <>
                <div className="max-w-6xl mx-auto pb-20 print:hidden">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleBackToList}
                                className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors shrink-0"
                            >
                                <ArrowLeft size={24} />
                            </button>
                            <div className="min-w-0">
                                <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex flex-wrap items-center gap-2">
                                    <span className="truncate">{selectedPaciente.nome}</span>
                                    <span className="text-xs md:text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-full shrink-0">
                                        Prontuário
                                    </span>
                                </h1>
                                <p className="text-slate-500 flex flex-wrap items-center gap-3 text-sm mt-1">
                                    {selectedPaciente.telefone && (
                                        <span className="flex items-center gap-2">
                                            <span className="flex items-center gap-1">
                                                <Phone size={12} /> {selectedPaciente.telefone}
                                            </span>
                                            <button
                                                onClick={(e) => openWhatsApp(e, selectedPaciente.telefone)}
                                                className="text-green-600 hover:text-green-700 hover:underline flex items-center gap-1 text-xs font-semibold"
                                            >
                                                <MessageCircle size={12} /> Chamar no Zap
                                            </button>
                                        </span>
                                    )}
                                    {selectedPaciente.data_nascimento && <span><Calendar size={12} className="inline mr-1" />{differenceInYears(new Date(), parseISO(selectedPaciente.data_nascimento))} anos ({format(parseISO(selectedPaciente.data_nascimento), 'dd/MM/yyyy')})</span>}
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <button
                                onClick={printPatientRecord}
                                className="btn bg-slate-800 text-white hover:bg-slate-900 flex items-center justify-center gap-2 w-full md:w-auto"
                            >
                                <Printer size={18} />
                                Imprimir / Gerar PDF
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left: New Consultation Form */}
                        <div className="lg:col-span-1">
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-24">
                                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-[var(--primary)]">
                                    <Stethoscope size={20} />
                                    Novo Atendimento
                                </h2>
                                <form onSubmit={handleCreateConsulta} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Data</label>
                                        <input
                                            type="date"
                                            className="w-full p-2 bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                            value={novaConsulta.data_consulta}
                                            onChange={e => setNovaConsulta({ ...novaConsulta, data_consulta: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Queixa Principal</label>
                                        <textarea
                                            rows={2}
                                            className="w-full p-2 bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                            value={novaConsulta.queixa}
                                            onChange={e => setNovaConsulta({ ...novaConsulta, queixa: e.target.value })}
                                            placeholder="Dor, desconforto, checkup..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Evolução Clínica</label>
                                        <textarea
                                            rows={3}
                                            className="w-full p-2 bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                            value={novaConsulta.evolucao}
                                            onChange={e => setNovaConsulta({ ...novaConsulta, evolucao: e.target.value })}
                                            placeholder="Detalhes do exame clínico..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Procedimento Realizado</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                            value={novaConsulta.procedimento}
                                            onChange={e => setNovaConsulta({ ...novaConsulta, procedimento: e.target.value })}
                                            placeholder="Ex: Limpeza, Consulta, Exame"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Medicamentos / Prescrição</label>
                                        <textarea
                                            rows={2}
                                            className="w-full p-2 bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                            value={novaConsulta.medicamentos}
                                            onChange={e => setNovaConsulta({ ...novaConsulta, medicamentos: e.target.value })}
                                            placeholder="Dipirona 500mg..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Valor Cobrado (R$)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="w-full p-2 bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                            value={novaConsulta.valor_consulta}
                                            onChange={e => setNovaConsulta({ ...novaConsulta, valor_consulta: e.target.value })}
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Forma de Pagamento</label>
                                        <select
                                            className="w-full p-2 bg-slate-50 border rounded-lg outline-none focus:ring-2 focus:ring-[var(--primary)]"
                                            value={novaConsulta.payment_method}
                                            onChange={e => setNovaConsulta({ ...novaConsulta, payment_method: e.target.value })}
                                        >
                                            <option value="none">Selecione...</option>
                                            <option value="money">Dinheiro</option>
                                            <option value="card">Cartão de Crédito/Débito</option>
                                            <option value="pix">Pix</option>
                                            <option value="warranty">Garantia (Retorno)</option>
                                        </select>
                                    </div>

                                    <button type="submit" className="btn btn-primary w-full">
                                        Salvar Atendimento
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Right: History Timeline & Attachments */}
                        <div className="lg:col-span-2">
                            {/* Tabs */}
                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg mb-6 w-fit">
                                <button
                                    onClick={() => setActiveTab('history')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'history'
                                        ? 'bg-white text-[var(--primary)] shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Clock size={16} /> Histórico Clínico
                                    </div>
                                </button>
                                <button
                                    onClick={() => setActiveTab('attachments')}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'attachments'
                                        ? 'bg-white text-[var(--primary)] shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Paperclip size={16} /> Anexos
                                    </div>
                                </button>
                            </div>

                            {activeTab === 'attachments' ? (
                                <PatientAttachments patientId={selectedPaciente.id} />
                            ) : (
                                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                    {consultas.length === 0 ? (
                                        <div className="text-center py-10 pl-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                            <FileText className="mx-auto text-slate-300 mb-2" size={32} />
                                            <p className="text-slate-500">Nenhum atendimento registrado.</p>
                                        </div>
                                    ) : (
                                        consultas.map((consulta) => {
                                            const isNoShow = consulta.status === 'no_show';
                                            return (
                                                <div key={consulta.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                    {/* Icon on Timeline */}
                                                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border border-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${isNoShow ? 'bg-red-100 text-red-500' : 'bg-slate-100 group-[.is-active]:bg-[var(--primary-light)] text-slate-500 group-[.is-active]:text-[var(--primary)]'
                                                        }`}>
                                                        {isNoShow ? <X size={18} /> : <Activity size={18} />}
                                                    </div>

                                                    {/* Card */}
                                                    <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-5 rounded-xl border shadow-sm hover:shadow-md transition-shadow ${isNoShow ? 'border-red-100 bg-red-50/50' : 'border-slate-200'}`}>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <time className="font-bold text-slate-900 flex items-center gap-2">
                                                                {format(parseISO(consulta.data_consulta), 'dd/MM/yyyy')}
                                                                {isNoShow && (
                                                                    <span className="text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-600 px-2 py-0.5 rounded border border-red-200">
                                                                        Faltou
                                                                    </span>
                                                                )}
                                                            </time>
                                                            <div className="flex items-center gap-2">
                                                                {consulta.valor_consulta && consulta.valor_consulta > 0 && !isNoShow && (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                                            <DollarSign size={10} />
                                                                            R$ {consulta.valor_consulta}
                                                                        </span>
                                                                        {/* Payment Method Badge */}
                                                                        {consulta.payment_method && consulta.payment_method !== 'none' && (
                                                                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                                                {consulta.payment_method === 'money' ? 'Dinheiro' :
                                                                                    consulta.payment_method === 'card' ? 'Cartão' :
                                                                                        consulta.payment_method === 'pix' ? 'Pix' :
                                                                                            consulta.payment_method === 'warranty' ? 'Garantia' : consulta.payment_method}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                <button
                                                                    onClick={() => handleDeleteConsulta(consulta.id)}
                                                                    className="text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                                                                    title="Excluir Atendimento"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Professional Name */}
                                                        <div className="text-xs text-slate-400 mb-3 flex items-center gap-1">
                                                            <User size={12} />
                                                            <span>Dentista: <span className="font-medium text-slate-600">{teamNames[consulta.user_id || ''] || 'Desconhecido'}</span></span>
                                                        </div>

                                                        <div className="space-y-2 text-sm">
                                                            {isNoShow ? (
                                                                <div className="text-slate-500 italic flex items-center gap-2">
                                                                    <Shield size={14} className="text-slate-400" />
                                                                    Paciente não compareceu a este agendamento.
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    {consulta.procedimento && (
                                                                        <div className="font-semibold text-[var(--primary)]">
                                                                            {consulta.procedimento}
                                                                        </div>
                                                                    )}

                                                                    {consulta.queixa && (
                                                                        <div>
                                                                            <span className="text-slate-400 text-xs uppercase tracking-wider font-bold">Queixa:</span>
                                                                            <p className="text-slate-700">{consulta.queixa}</p>
                                                                        </div>
                                                                    )}

                                                                    {consulta.evolucao && (
                                                                        <div>
                                                                            <span className="text-slate-400 text-xs uppercase tracking-wider font-bold">Evolução:</span>
                                                                            <p className="text-slate-600 italic">"{consulta.evolucao}"</p>
                                                                        </div>
                                                                    )}

                                                                    {consulta.medicamentos && (
                                                                        <div className="bg-slate-50 p-2 rounded-lg mt-2 border border-slate-100">
                                                                            <span className="text-slate-400 text-xs uppercase tracking-wider font-bold flex items-center gap-1 mb-1">
                                                                                <Pill size={12} /> Prescrição:
                                                                            </span>
                                                                            <p className="text-slate-700 font-medium">{consulta.medicamentos}</p>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <PatientPrintView
                    paciente={selectedPaciente}
                    consultas={consultas}
                    companyName={user?.user_metadata?.company_name}
                />
            </>
        );
    }

    return <div>Carregando...</div>;
};
