import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Image, Trash2, Upload, Download, File, X, Loader2 } from 'lucide-react';
import type { Attachment } from '../types/db';
import { format } from 'date-fns';

interface PatientAttachmentsProps {
    patientId: string;
}

export const PatientAttachments: React.FC<PatientAttachmentsProps> = ({ patientId }) => {
    const { user } = useAuth();
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user && patientId) {
            fetchAttachments();
        }
    }, [user, patientId]);

    const fetchAttachments = async () => {
        try {
            const { data, error } = await supabase
                .from('patient_attachments')
                .select('*')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAttachments(data || []);
        } catch (error) {
            console.error('Error fetching attachments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !user) return;

        const file = e.target.files[0];
        const fileSizeLimit = 5 * 1024 * 1024; // 5MB

        if (file.size > fileSizeLimit) {
            alert('Arquivo muito grande. O limite é 5MB.');
            return;
        }

        setUploading(true);

        try {
            // 1. Upload to Storage
            // Path structure: user_id/patient_id/timestamp-filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            const filePath = `${user.id}/${patientId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('medical-files')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Insert into Database
            const { data, error: dbError } = await supabase
                .from('patient_attachments')
                .insert({
                    user_id: user.id,
                    patient_id: patientId,
                    file_name: file.name,
                    file_path: filePath,
                    file_type: file.type,
                    file_size: file.size
                })
                .select()
                .single();

            if (dbError) throw dbError;

            setAttachments([data, ...attachments]);
        } catch (error: any) {
            console.error('Upload error:', error);
            alert('Erro ao fazer upload: ' + error.message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (attachment: Attachment) => {
        if (!confirm(`Excluir o arquivo "${attachment.file_name}"?`)) return;

        try {
            // 1. Delete from Storage
            const { error: storageError } = await supabase.storage
                .from('medical-files')
                .remove([attachment.file_path]);

            if (storageError) {
                console.warn('Storage delete error (might be already gone):', storageError);
            }

            // 2. Delete from Database
            const { error: dbError } = await supabase
                .from('patient_attachments')
                .delete()
                .eq('id', attachment.id);

            if (dbError) throw dbError;

            setAttachments(attachments.filter(a => a.id !== attachment.id));
        } catch (error) {
            console.error('Delete error:', error);
            alert('Erro ao excluir arquivo');
        }
    };

    const handleDownload = async (attachment: Attachment) => {
        try {
            const { data, error } = await supabase.storage
                .from('medical-files')
                .createSignedUrl(attachment.file_path, 60 * 60); // 1 hour link

            if (error) throw error;

            window.open(data.signedUrl, '_blank');
        } catch (error) {
            console.error('Download error:', error);
            alert('Erro ao abrir arquivo');
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return <Image className="text-purple-500" />;
        if (type.includes('pdf')) return <FileText className="text-red-500" />;
        return <File className="text-slate-400" />;
    };

    return (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800">
                    <File className="text-slate-400" />
                    Anexos e Exames
                </h2>
                <div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="btn btn-primary text-sm py-2"
                    >
                        {uploading ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <Upload size={18} />
                        )}
                        <span className="hidden sm:inline ml-2">
                            {uploading ? 'Enviando...' : 'Novo Anexo'}
                        </span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10 text-slate-400">Carregando arquivos...</div>
            ) : attachments.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-xl">
                    <div className="w-12 h-12 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Upload size={24} />
                    </div>
                    <p className="text-slate-500 font-medium">Nenhum arquivo anexado</p>
                    <p className="text-sm text-slate-400 mt-1">Envie exames, fotos ou documentos deste paciente.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {attachments.map((file) => (
                        <div key={file.id} className="group relative bg-slate-50 border border-slate-100 rounded-xl p-3 hover:shadow-md transition-shadow flex items-start gap-3">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shrink-0 border border-slate-100">
                                {getFileIcon(file.file_type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-slate-900 truncate text-sm" title={file.file_name}>
                                    {file.file_name}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                    <span>{formatFileSize(file.file_size)}</span>
                                    <span>•</span>
                                    <span>{format(new Date(file.created_at), 'dd/MM/yy')}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleDownload(file)}
                                    className="p-1.5 text-slate-400 hover:text-[var(--primary)] hover:bg-white rounded-lg transition-colors"
                                    title="Visualizar/Baixar"
                                >
                                    <Download size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(file)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                                    title="Excluir"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
