import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Prescricao, Medicamento, Paciente } from '../types/db';
import { generateSignatureHash, printPrescription } from '../lib/prescriptionPdf';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    FileText, Plus, Trash2, Edit, Check, X, Printer,
    AlertCircle, Pill, Clock, Calendar, Lock as LockIcon
} from 'lucide-react';
import { PrescriptionSignModal } from './PrescriptionSignModal';

interface PatientPrescriptionsProps {
    paciente: Paciente;
}

const emptyMedicamento: Medicamento = {
    nome: '',
    dosagem: '',
    via: 'Oral',
    frequencia: '',
    duracao: '',
    observacoes: ''
};

export const PatientPrescriptions: React.FC<PatientPrescriptionsProps> = ({ paciente }) => {
    const { user, profile } = useAuth();
    const canManagePrescriptions = !profile?.role || profile.role === 'clinic_owner' || profile.role === 'dentist' || profile.is_admin;
    // Secretary only views/prints
    const [prescricoes, setPrescricoes] = useState<Prescricao[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [showSignModal, setShowSignModal] = useState(false);
    const [signingId, setSigningId] = useState<string | null>(null);

    // Form state
    const [medicamentos, setMedicamentos] = useState<Medicamento[]>([{ ...emptyMedicamento }]);
    const [observacoesGerais, setObservacoesGerais] = useState('');

    // Profile data for signature
    const [profileData, setProfileData] = useState<{
        nome: string;
        cro: string;
        especialidade: string;
        endereco: string;
        telefone: string;
        clinicaNome: string;
        clinicaCidade: string;
        clinicaLogo: string;
    } | null>(null);

    useEffect(() => {
        fetchPrescricoes();
        fetchProfileData();
    }, [paciente.id]);

    const fetchPrescricoes = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('prescricoes')
            .select('*')
            .eq('paciente_id', paciente.id)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setPrescricoes(data);
        }
        setLoading(false);
    };

    const fetchProfileData = async () => {
        if (!user) return;

        const { data: profileDataDB } = await supabase
            .from('profiles')
            .select('username, company_name, company_city, company_logo, cro, specialty, professional_address, professional_phone')
            .eq('id', user.id)
            .single();

        // Get owner profile for clinic info if user is team member
        const { data: ownerProfile } = await supabase
            .from('profiles')
            .select('company_name, company_city, company_logo')
            .eq('id', user.user_metadata?.owner_id || user.id)
            .single();

        if (profileDataDB) {
            setProfileData({
                nome: profileDataDB.username || user.email?.split('@')[0] || 'Profissional',
                cro: profileDataDB.cro || '',
                especialidade: profileDataDB.specialty || '',
                endereco: profileDataDB.professional_address || '', // Use professional address
                telefone: profileDataDB.professional_phone || '',
                clinicaNome: ownerProfile?.company_name || profileDataDB.company_name || '',
                clinicaCidade: ownerProfile?.company_city || profileDataDB.company_city || '',
                clinicaLogo: ownerProfile?.company_logo || profileDataDB.company_logo || ''
            });
        }
    };

    const handleAddMedicamento = () => {
        setMedicamentos([...medicamentos, { ...emptyMedicamento }]);
    };

    const handleRemoveMedicamento = (index: number) => {
        if (medicamentos.length > 1) {
            setMedicamentos(medicamentos.filter((_, i) => i !== index));
        }
    };

    const handleMedicamentoChange = (index: number, field: keyof Medicamento, value: string) => {
        const updated = [...medicamentos];
        updated[index] = { ...updated[index], [field]: value };
        setMedicamentos(updated);
    };

    const resetForm = () => {
        setMedicamentos([{ ...emptyMedicamento }]);
        setObservacoesGerais('');
        setEditingId(null);
        setShowForm(false);
    };

    const handleEdit = (prescricao: Prescricao) => {
        if (prescricao.assinado_em) return; // Can't edit signed prescriptions

        setMedicamentos(prescricao.medicamentos);
        setObservacoesGerais(prescricao.observacoes_gerais || '');
        setEditingId(prescricao.id);
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!user || !profileData) return;
        if (medicamentos.some(m => !m.nome || !m.dosagem)) {
            return; // Validation
        }

        setSaving(true);
        const ownerId = user.user_metadata?.owner_id || user.id;

        const prescricaoData = {
            paciente_id: paciente.id,
            dentista_id: user.id,
            medicamentos,
            observacoes_gerais: observacoesGerais || null,
            dentista_nome: profileData.nome,
            dentista_cro: profileData.cro || null,
            dentista_especialidade: profileData.especialidade || null,
            dentista_endereco: profileData.endereco || null,
            dentista_telefone: profileData.telefone || null,
            clinica_nome: profileData.clinicaNome || null,
            clinica_cidade: profileData.clinicaCidade || null,
            clinica_logo_url: profileData.clinicaLogo || null,
            owner_id: ownerId
        };

        let error;
        if (editingId) {
            ({ error } = await supabase
                .from('prescricoes')
                .update(prescricaoData)
                .eq('id', editingId));
        } else {
            ({ error } = await supabase
                .from('prescricoes')
                .insert(prescricaoData));
        }

        if (!error) {
            fetchPrescricoes();
            resetForm();
        }
        setSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Excluir esta receita?')) return;

        await supabase.from('prescricoes').delete().eq('id', id);
        fetchPrescricoes();
    };

    const openSignModal = (prescricao: Prescricao) => {
        setSigningId(prescricao.id);
        setShowSignModal(true);
    };

    const handleSign = async (id: string, password: string, hash: string) => {
        setLoading(true);
        // Verify password (re-auth)
        const { error: authError } = await supabase.auth.signInWithPassword({
            email: user?.email || '',
            password: password
        });

        if (authError) {
            setLoading(false);
            alert('Senha incorreta. Não foi possível assinar o documento.');
            return;
        }

        const { error } = await supabase
            .from('prescricoes')
            .update({
                assinatura_hash: hash,
                assinado_em: new Date().toISOString(),
                tipo_assinatura: 'simples'
            })
            .eq('id', id);

        if (error) {
            console.error('Error signing prescription:', error);
            alert('Erro ao assinar receita');
        } else {
            setShowSignModal(false);
            setSigningId(null);
            fetchPrescricoes();
        }
        setLoading(false);
    };

    const handlePrint = (prescricao: Prescricao) => {
        printPrescription(prescricao, paciente.nome);
    };

    if (loading && !signingId) { // Only show full loading if not in signing process
        return (
            <div className="flex items-center justify-center py-10 text-slate-500">
                <Clock className="animate-spin mr-2" size={20} />
                Carregando receitas...
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <FileText className="text-cyan-600" size={20} />
                    Receituário
                </h3>
                {!showForm && canManagePrescriptions && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm font-medium"
                    >
                        <Plus size={18} />
                        Nova Receita
                    </button>
                )}
            </div>

            {/* Form */}
            {showForm && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                    <h4 className="font-bold text-slate-700 flex items-center gap-2">
                        <Pill className="text-cyan-600" size={18} />
                        {editingId ? 'Editar Receita' : 'Nova Receita'}
                    </h4>

                    {/* Medicamentos */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-slate-700">Medicamentos:</label>

                        {medicamentos.map((med, idx) => (
                            <div key={idx} className="bg-white rounded-lg border border-slate-200 p-3 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold text-cyan-600">Medicamento {idx + 1}</span>
                                    {medicamentos.length > 1 && (
                                        <button
                                            onClick={() => handleRemoveMedicamento(idx)}
                                            className="text-red-500 hover:text-red-700 p-1"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <input
                                        type="text"
                                        placeholder="Nome do medicamento *"
                                        value={med.nome}
                                        onChange={(e) => handleMedicamentoChange(idx, 'nome', e.target.value)}
                                        className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                                        required
                                    />
                                    <input
                                        type="text"
                                        placeholder="Dosagem (ex: 500mg) *"
                                        value={med.dosagem}
                                        onChange={(e) => handleMedicamentoChange(idx, 'dosagem', e.target.value)}
                                        className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <select
                                        value={med.via}
                                        onChange={(e) => handleMedicamentoChange(idx, 'via', e.target.value)}
                                        className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                                    >
                                        <option value="Oral">Oral</option>
                                        <option value="Tópico">Tópico</option>
                                        <option value="Sublingual">Sublingual</option>
                                        <option value="Injetável">Injetável</option>
                                        <option value="Bochecho">Bochecho</option>
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="Frequência (8/8h)"
                                        value={med.frequencia}
                                        onChange={(e) => handleMedicamentoChange(idx, 'frequencia', e.target.value)}
                                        className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Duração (7 dias)"
                                        value={med.duracao}
                                        onChange={(e) => handleMedicamentoChange(idx, 'duracao', e.target.value)}
                                        className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                                    />
                                </div>

                                <input
                                    type="text"
                                    placeholder="Observações (opcional)"
                                    value={med.observacoes}
                                    onChange={(e) => handleMedicamentoChange(idx, 'observacoes', e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none text-sm"
                                />
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={handleAddMedicamento}
                            className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-cyan-500 hover:text-cyan-600 transition-colors text-sm font-medium"
                        >
                            + Adicionar Medicamento
                        </button>
                    </div>

                    {/* Observações Gerais */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Observações Gerais (opcional):
                        </label>
                        <textarea
                            value={observacoesGerais}
                            onChange={(e) => setObservacoesGerais(e.target.value)}
                            placeholder="Instruções adicionais para o paciente..."
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 outline-none text-sm min-h-[80px]"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={handleSave}
                            disabled={saving || medicamentos.some(m => !m.nome || !m.dosagem)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                        >
                            <Check size={18} />
                            {saving ? 'Salvando...' : 'Salvar Rascunho'}
                        </button>
                        <button
                            onClick={resetForm}
                            className="px-4 py-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* List */}
            {prescricoes.length === 0 && !showForm ? (
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <FileText className="mx-auto text-slate-300 mb-2" size={48} />
                    <p className="text-slate-500">Nenhuma receita registrada.</p>
                    <p className="text-sm text-slate-400">Clique em "Nova Receita" para começar.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {prescricoes.map((prescricao) => (
                        <div
                            key={prescricao.id}
                            className={`bg-white rounded-xl border p-4 ${prescricao.assinado_em
                                ? 'border-green-200 bg-green-50/30'
                                : 'border-slate-200'
                                }`}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <FileText size={16} className="text-cyan-600" />
                                        <span className="font-bold text-slate-800">
                                            Receita - {format(parseISO(prescricao.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                                        </span>
                                        {prescricao.assinado_em ? (
                                            <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                                <LockIcon size={12} /> Assinada
                                            </span>
                                        ) : (
                                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                                Rascunho
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500">
                                        {prescricao.medicamentos.length} medicamento(s) |
                                        Por: {prescricao.dentista_nome}
                                    </p>
                                    {prescricao.assinado_em && prescricao.assinatura_hash && (
                                        <p className="text-xs text-green-600 mt-1 font-mono">
                                            Código: {prescricao.assinatura_hash}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    {prescricao.assinado_em ? (
                                        <button
                                            onClick={() => handlePrint(prescricao)}
                                            className="flex items-center gap-1 px-3 py-2 bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-200 transition-colors text-sm font-medium min-h-[44px]"
                                        >
                                            <Printer size={16} />
                                            Imprimir
                                        </button>
                                    ) : canManagePrescriptions ? (
                                        <>
                                            <button
                                                onClick={() => handleEdit(prescricao)}
                                                className="flex items-center gap-1 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium min-h-[44px]"
                                            >
                                                <Edit size={16} />
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => openSignModal(prescricao)}
                                                className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium min-h-[44px]"
                                            >
                                                <Check size={16} />
                                                Assinar
                                            </button>
                                            <button
                                                onClick={() => handleDelete(prescricao.id)}
                                                className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium min-h-[44px]"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Sign Modal */}
            {showSignModal && signingId && (
                <PrescriptionSignModal
                    prescricao={prescricoes.find(p => p.id === signingId)!}
                    professionalName={profileData?.nome || ''}
                    onClose={() => {
                        setShowSignModal(false);
                        setSigningId(null);
                    }}
                    onSign={handleSign}
                    loading={loading}
                />
            )}
        </div>
    );
};

export default PatientPrescriptions;
