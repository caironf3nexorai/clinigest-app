import React from 'react';
import { AlertTriangle, Trash2, Info, HelpCircle, X } from 'lucide-react';

export interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    icon?: 'trash' | 'alert' | 'info' | 'question';
}

const iconMap = {
    trash: Trash2,
    alert: AlertTriangle,
    info: Info,
    question: HelpCircle,
};

const variantStyles = {
    danger: {
        icon: 'text-red-500',
        button: 'bg-red-500 text-white',
    },
    warning: {
        icon: 'text-amber-500',
        button: 'bg-amber-500 text-white',
    },
    info: {
        icon: 'text-blue-500',
        button: 'bg-blue-500 text-white',
    },
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'danger',
    icon = 'alert',
}) => {
    if (!isOpen) return null;

    const IconComponent = iconMap[icon];
    const styles = variantStyles[variant];

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-full bg-slate-100 ${styles.icon}`}>
                        <IconComponent size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
                        <p className="text-slate-600 text-sm">{message}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-slate-100 rounded-lg font-medium text-slate-700 border border-slate-200"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={`flex-1 px-4 py-2.5 rounded-lg font-medium ${styles.button}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
