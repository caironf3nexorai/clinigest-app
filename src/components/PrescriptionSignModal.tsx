import React, { useState } from 'react';
import { Lock as LockIcon, Loader2, FileText } from 'lucide-react';
import { Prescricao } from '../types/db';
import { generateSignatureHash } from '../lib/prescriptionPdf';
import { format } from 'date-fns';

interface PrescriptionSignModalProps {
    prescricao: Prescricao;
    professionalName: string;
    onClose: () => void;
    onSign: (id: string, password: string, hash: string) => Promise<void>;
    loading: boolean;
}

export const PrescriptionSignModal: React.FC<PrescriptionSignModalProps> = ({
    prescricao,
    professionalName,
    onClose,
    onSign,
    loading
}) => {
    const [signPassword, setSignPassword] = useState('');
    const [signError, setSignError] = useState('');

    const handleSign = async () => {
        setSignError('');
        if (!signPassword) {
            setSignError('Digite sua senha para assinar.');
            return;
        }

        const signatureData = {
            id: prescricao.id,
            dentista: professionalName,
            paciente: prescricao.paciente_id,
            timestamp: new Date().toISOString(),
            medicamentos: prescricao.medicamentos
        };

        const hash = await generateSignatureHash(signatureData);
        await onSign(prescricao.id, signPassword, hash);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <LockIcon className="text-green-600" size={24} />
                    Assinar Receita Digitalmente
                </h3>

                <div className="space-y-4">
                    <div className="bg-slate-50 rounded-lg p-3 text-sm">
                        <p><strong>Profissional:</strong> {professionalName}</p>
                        <p><strong>Data/Hora:</strong> {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
                        <div className="mt-2 flex items-center gap-2 text-slate-500">
                            <FileText size={14} />
                            {prescricao.medicamentos.length} medicamento(s)
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                        <p>Ao assinar, o documento será bloqueado para edições e um código de validação único será gerado.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Confirme sua senha de acesso</label>
                        <input
                            type="password"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all"
                            value={signPassword}
                            onChange={e => {
                                setSignPassword(e.target.value);
                                setSignError('');
                            }}
                            placeholder="Sua senha de login"
                        />
                        {signError && <p className="text-red-500 text-xs mt-1">{signError}</p>}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSign}
                            disabled={loading}
                            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-md shadow-green-600/20 active:scale-95 transition-all flex items-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Assinar Documento'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
