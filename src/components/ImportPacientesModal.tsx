import React, { useState, useRef } from 'react';
import { X, Download, UploadCloud, AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, Info } from 'lucide-react';
import { downloadPatientImportTemplate, parseExcelFile } from '../lib/excelImport';
import { processPatientImport, ImportResult } from '../lib/importService';
import { useAuth } from '../contexts/AuthContext';

interface ImportPacientesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function ImportPacientesModal({ isOpen, onClose, onSuccess }: ImportPacientesModalProps) {
    const { user, profile } = useAuth();
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (validateFile(droppedFile)) {
            setFile(droppedFile);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile && validateFile(selectedFile)) {
            setFile(selectedFile);
        }
    };

    const validateFile = (file: File) => {
        setError(null);
        if (!file.name.match(/\.(xlsx|xls)$/)) {
            setError('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
            return false;
        }
        return true;
    };

    const handleImport = async () => {
        if (!file || !user || !profile) return;

        setIsLoading(true);
        setError(null);

        try {
            const patients = await parseExcelFile(file);

            if (patients.length === 0) {
                setError("O arquivo parece estar vazio ou não possui os dados nas colunas corretas.");
                setIsLoading(false);
                return;
            }

            const ownerId = profile.role === 'clinic_owner' ? profile.id : profile.owner_id;

            if (!ownerId) throw new Error("ID da clínica não encontrado.");

            const importResult = await processPatientImport(patients, ownerId, user.id);
            setResult(importResult);

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erro ao processar o arquivo. Verifique se o formato está correto.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if (result && (result.sucesso > 0 || result.atualizados > 0)) {
            onSuccess();
        }
        setFile(null);
        setResult(null);
        setError(null);
        setIsLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Importar Pacientes</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            Cadastre múltiplos pacientes de uma vez usando uma planilha Excel
                        </p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    {result ? (
                        <div className="space-y-6">
                            <div className="flex flex-col items-center justify-center text-center space-y-4 py-6">
                                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Importação Concluída</h3>
                                    <p className="text-gray-500 mt-1">
                                        O processamento do seu arquivo foi finalizado.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-bold text-emerald-600">{result.sucesso}</span>
                                    <span className="text-sm font-medium text-emerald-800 mt-1">Novos Inseridos</span>
                                </div>
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col items-center justify-center">
                                    <span className="text-3xl font-bold text-blue-600">{result.atualizados}</span>
                                    <span className="text-sm font-medium text-blue-800 mt-1">Atualizados</span>
                                </div>
                            </div>

                            {result.falhas.length > 0 && (
                                <div className="mt-8">
                                    <div className="flex items-center gap-2 mb-4">
                                        <AlertCircle className="w-5 h-5 text-red-500" />
                                        <h4 className="font-semibold text-gray-900 text-lg">
                                            {result.falhas.length} linha(s) com erros
                                        </h4>
                                    </div>
                                    <div className="bg-red-50 border border-red-100 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-red-700 uppercase bg-red-100/50 sticky top-0">
                                                <tr>
                                                    <th className="px-4 py-3">Linha</th>
                                                    <th className="px-4 py-3">Nome / Telefone</th>
                                                    <th className="px-4 py-3">Motivo</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {result.falhas.map((falha, idx) => (
                                                    <tr key={idx} className="border-b border-red-100 last:border-0 hover:bg-red-100/30">
                                                        <td className="px-4 py-3 font-medium text-red-900">{falha.rowNumber}</td>
                                                        <td className="px-4 py-3 text-red-800">
                                                            <div className="font-medium truncate max-w-[150px]">{falha.nome}</div>
                                                            <div className="text-xs opacity-80 truncate max-w-[150px]">{falha.telefone}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-red-800">{falha.motivo}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Step 1 */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">1</div>
                                    <h3 className="text-lg font-semibold text-gray-900">Baixe a Planilha Modelo</h3>
                                </div>
                                <div className="pl-11">
                                    <p className="text-sm text-gray-600 mb-4">
                                        Para garantir que seus pacientes sejam importados corretamente, utilize nosso modelo de planilha e preencha com os dados do seu sistema antigo.
                                    </p>
                                    <button
                                        onClick={downloadPatientImportTemplate}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-medium text-sm shadow-sm"
                                    >
                                        <FileSpreadsheet className="w-5 h-5 text-green-600" />
                                        Baixar Modelo Excel (.xlsx)
                                        <Download className="w-4 h-4 ml-2 text-gray-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">2</div>
                                    <h3 className="text-lg font-semibold text-gray-900">Faça o Upload da Planilha</h3>
                                </div>
                                <div className="pl-11">
                                    <div
                                        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${isDragging
                                            ? 'border-indigo-500 bg-indigo-50'
                                            : file
                                                ? 'border-green-500 bg-green-50'
                                                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                                            }`}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileSelect}
                                            accept=".xlsx, .xls"
                                            className="hidden"
                                        />

                                        {file ? (
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                                    <FileSpreadsheet className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-green-800">{file.name}</p>
                                                    <p className="text-xs text-green-600 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                                                </div>
                                                <p className="text-sm text-gray-500 mt-2 hover:text-indigo-600 hover:underline">
                                                    Clique para trocar o arquivo
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center">
                                                    <UploadCloud className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-700">Clique para selecionar</p>
                                                    <p className="text-sm text-gray-500 mt-1">ou arraste e solte o arquivo aqui</p>
                                                </div>
                                                <p className="text-xs text-gray-400 mt-2">Apenas Excel (.xlsx ou .xls)</p>
                                            </div>
                                        )}
                                    </div>

                                    {error && (
                                        <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl border border-red-100">
                                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                            <p>{error}</p>
                                        </div>
                                    )}

                                    {/* Info Alert */}
                                    <div className="mt-6 flex gap-3 text-sm text-indigo-800 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">
                                        <Info className="w-5 h-5 flex-shrink-0 text-indigo-500" />
                                        <p>
                                            Pacientes com <strong>telefones idênticos</strong> a cadastros existentes serão apenas <strong>atualizados</strong> e não duplicados.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 rounded-b-2xl">
                    <button
                        onClick={handleClose}
                        className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm disabled:opacity-50"
                        disabled={isLoading}
                    >
                        {result ? 'Fechar' : 'Cancelar'}
                    </button>
                    {!result && (
                        <button
                            onClick={handleImport}
                            disabled={!file || isLoading}
                            className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                <>
                                    <UploadCloud className="w-4 h-4" />
                                    Importar Dados
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
