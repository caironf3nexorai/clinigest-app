import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SubscriptionExpired = () => {
    const { signOut, user, checkSubscription, isSubscriptionValid } = useAuth();
    const [verifying, setVerifying] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (isSubscriptionValid) {
            navigate('/', { replace: true });
        }
    }, [isSubscriptionValid, navigate]);

    const handleCheck = async () => {
        setVerifying(true);
        // Artificial delay for better UX
        await new Promise(r => setTimeout(r, 1000));

        if (checkSubscription) {
            await checkSubscription();
        }

        setVerifying(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-xl text-center border border-slate-200">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock size={32} />
                </div>

                <h1 className="text-2xl font-bold text-slate-900 mb-2">Acesso Expirado</h1>
                <p className="text-slate-500 mb-6">
                    Olá, <strong>{user?.email}</strong>. Seu período de teste ou assinatura chegou ao fim.
                </p>

                <div className="bg-slate-50 p-4 rounded-lg mb-6 text-sm text-slate-600 border border-slate-200">
                    Para continuar acessando o sistema e seus dados, por favor entre em contato com o administrador para renovar sua licença.
                </div>

                <div className="space-y-3">
                    <button
                        onClick={handleCheck}
                        disabled={verifying}
                        className="btn btn-primary w-full justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {verifying ? 'Verificando...' : 'Já renovei, tentar novamente'}
                    </button>

                    <button
                        onClick={signOut}
                        disabled={verifying}
                        className="btn w-full justify-center text-slate-500 hover:bg-slate-100"
                    >
                        <LogOut size={18} className="mr-2" />
                        Sair da conta
                    </button>
                </div>
            </div>
        </div>
    );
};
