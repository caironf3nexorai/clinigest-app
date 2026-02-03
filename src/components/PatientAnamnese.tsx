import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Save, AlertCircle, Lock, Edit3 } from 'lucide-react';
import type { Anamnese } from '../types/db';

interface PatientAnamneseProps {
    patientId: string;
}

export const PatientAnamnese: React.FC<PatientAnamneseProps> = ({ patientId }) => {
    const { user, profile } = useAuth();
    const [anamnese, setAnamnese] = useState<Anamnese | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        alergias: '',
        doencas_cronicas: '',
        cirurgias_previas: '',
        medicamentos_uso: '',
        historico_familiar: '',
        observacoes: ''
    });

    // Check if user can edit (Owner/Admin only)
    const canEdit = profile?.role === 'clinic_owner' || profile?.role === 'super_admin' || user?.id === profile?.owner_id;

    useEffect(() => {
        fetchAnamnese();
    }, [patientId]);

    const fetchAnamnese = async () => {
        try {
            const { data, error } = await supabase
                .from('anamneses')
                .select('*')
                .eq('paciente_id', patientId)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setAnamnese(data);
                setFormData(data.data as any);
            }
        } catch (error) {
            console.error('Erro ao buscar anamnese:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (anamnese) {
                // Update existing
                const { error } = await supabase
                    .from('anamneses')
                    .update({
                        data: formData,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', anamnese.id);

                if (error) throw error;
            } else {
                // Create new
                const { data, error } = await supabase
                    .from('anamneses')
                    .insert({
                        paciente_id: patientId,
                        data: formData
                    })
                    .select()
                    .single();

                if (error) throw error;
                setAnamnese(data);
            }

            setIsEditing(false);
            alert('Anamnese salva com sucesso!');
            fetchAnamnese();
        } catch (error) {
            console.error('Erro ao salvar anamnese:', error);
            alert('Erro ao salvar anamnese.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-6 text-center text-slate-500">Carregando...</div>;
    }

    const isNewAnamnese = !anamnese;
    const canModify = isNewAnamnese || canEdit;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Anamnese (Histórico Clínico)</h3>
                    <p className="text-sm text-slate-500">
                        {isNewAnamnese ? 'Preencha o histórico médico do paciente' : 'Visualize ou edite o histórico médico'}
                    </p>
                </div>
                {!isNewAnamnese && !isEditing && canEdit && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-bold transition-colors"
                    >
                        <Edit3 size={16} /> Editar
                    </button>
                )}
                {!canModify && (
                    <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
                        <Lock size={14} />
                        <span>Somente o Admin/Dono pode editar</span>
                    </div>
                )}
            </div>

            {/* Form */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700">Alergias</label>
                    <textarea
                        rows={2}
                        className={`w-full p-3 border rounded-lg outline-none transition-all ${canModify && (isEditing || isNewAnamnese)
                            ? 'bg-white border-slate-300 focus:ring-2 focus:ring-blue-500'
                            : 'bg-slate-50 border-slate-200 cursor-not-allowed'
                            }`}
                        value={formData.alergias}
                        onChange={e => setFormData({ ...formData, alergias: e.target.value })}
                        placeholder="Ex: Dipirona, Lactose, Penicilina..."
                        disabled={!canModify || (!isEditing && !isNewAnamnese)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700">Doenças Crônicas</label>
                    <textarea
                        rows={2}
                        className={`w-full p-3 border rounded-lg outline-none transition-all ${canModify && (isEditing || isNewAnamnese)
                            ? 'bg-white border-slate-300 focus:ring-2 focus:ring-blue-500'
                            : 'bg-slate-50 border-slate-200 cursor-not-allowed'
                            }`}
                        value={formData.doencas_cronicas}
                        onChange={e => setFormData({ ...formData, doencas_cronicas: e.target.value })}
                        placeholder="Ex: Diabetes, Hipertensão, Asma..."
                        disabled={!canModify || (!isEditing && !isNewAnamnese)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700">Cirurgias Prévias</label>
                    <textarea
                        rows={2}
                        className={`w-full p-3 border rounded-lg outline-none transition-all ${canModify && (isEditing || isNewAnamnese)
                            ? 'bg-white border-slate-300 focus:ring-2 focus:ring-blue-500'
                            : 'bg-slate-50 border-slate-200 cursor-not-allowed'
                            }`}
                        value={formData.cirurgias_previas}
                        onChange={e => setFormData({ ...formData, cirurgias_previas: e.target.value })}
                        placeholder="Ex: Apendicectomia (2020), Cirurgia de joelho..."
                        disabled={!canModify || (!isEditing && !isNewAnamnese)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700">Medicamentos em Uso</label>
                    <textarea
                        rows={2}
                        className={`w-full p-3 border rounded-lg outline-none transition-all ${canModify && (isEditing || isNewAnamnese)
                            ? 'bg-white border-slate-300 focus:ring-2 focus:ring-blue-500'
                            : 'bg-slate-50 border-slate-200 cursor-not-allowed'
                            }`}
                        value={formData.medicamentos_uso}
                        onChange={e => setFormData({ ...formData, medicamentos_uso: e.target.value })}
                        placeholder="Ex: Losartana 50mg (1x ao dia), Metformina..."
                        disabled={!canModify || (!isEditing && !isNewAnamnese)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700">Histórico Familiar</label>
                    <textarea
                        rows={2}
                        className={`w-full p-3 border rounded-lg outline-none transition-all ${canModify && (isEditing || isNewAnamnese)
                            ? 'bg-white border-slate-300 focus:ring-2 focus:ring-blue-500'
                            : 'bg-slate-50 border-slate-200 cursor-not-allowed'
                            }`}
                        value={formData.historico_familiar}
                        onChange={e => setFormData({ ...formData, historico_familiar: e.target.value })}
                        placeholder="Ex: Pai: Diabetes, Avó: Câncer de mama..."
                        disabled={!canModify || (!isEditing && !isNewAnamnese)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2 text-slate-700">Observações Gerais</label>
                    <textarea
                        rows={3}
                        className={`w-full p-3 border rounded-lg outline-none transition-all ${canModify && (isEditing || isNewAnamnese)
                            ? 'bg-white border-slate-300 focus:ring-2 focus:ring-blue-500'
                            : 'bg-slate-50 border-slate-200 cursor-not-allowed'
                            }`}
                        value={formData.observacoes}
                        onChange={e => setFormData({ ...formData, observacoes: e.target.value })}
                        placeholder="Outras informações relevantes sobre o histórico do paciente..."
                        disabled={!canModify || (!isEditing && !isNewAnamnese)}
                    />
                </div>

                {/* Save Button */}
                {(isEditing || isNewAnamnese) && canModify && (
                    <div className="flex gap-2 pt-4 border-t border-slate-200">
                        {isEditing && (
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    setFormData(anamnese?.data as any);
                                }}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                            >
                                Cancelar
                            </button>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={16} />
                            {saving ? 'Salvando...' : 'Salvar Anamnese'}
                        </button>
                    </div>
                )}
            </div>

            {/* Info Alert */}
            <div className="flex gap-2 items-start bg-blue-50 p-4 rounded-lg text-blue-800 text-sm border border-blue-200">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div>
                    <p className="font-bold">Importante:</p>
                    <p>
                        A anamnese é um documento legal e pode ser utilizado em processos judiciais.
                        {isNewAnamnese
                            ? ' Preencha com cuidado e atenção aos detalhes.'
                            : ' Somente o Dono/Admin pode editar após criação.'}
                    </p>
                </div>
            </div>
        </div>
    );
};
