import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Loader2, ArrowRight, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const JoinClinic = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<'validating' | 'valid' | 'invalid' | 'success' | 'check_email'>('validating');
    const [inviteData, setInviteData] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState('');

    // Form for new users
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [isLoginMode, setIsLoginMode] = useState(false); // Toggle between Register/Login if needed

    useEffect(() => {
        console.log("JoinClinic mounted, token:", token);
        validateToken();
    }, [token]);

    const validateToken = async () => {
        if (!token) {
            setStatus('invalid');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('clinic_invites')
                .select('*')
                .eq('token', token)
                .eq('status', 'pending')
                .single();

            console.log("Supabase Response:", { data, error });

            if (error || !data) {
                console.error("Validation Error:", error);
                setStatus('invalid');
                setErrorMsg(error?.message || 'Convite não encontrado.');
            } else {
                setInviteData(data);
                setStatus('valid');
            }
        } catch (err: any) {
            console.error("Catch Error:", err);
            setStatus('invalid');
            setErrorMsg('Erro interno: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptInvite = async () => {
        setLoading(true);
        try {
            // Logic:
            // 1. If user is logged in, link strict.
            // 2. If user NOT logged in, create account -> Then link.

            let userId = user?.id;

            if (!user) {
                // Determine flow: Register new user
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: inviteData.email,
                    password: password,
                    options: {
                        data: {
                            username: name,
                            // Inherit owner's plan? No, employees don't have plans.
                        }
                    }
                });

                if (authError) throw authError;
                userId = authData.user?.id;
            }

            if (!userId) throw new Error("Falha ao identificar usuário.");

            // 3. Update Profile with Role and Link
            // Since we don't have a rigid 'tenant_id' column, we might rely on metadata or just RLS logic?
            // "para que ele faça parte da mesma equipe e não fique usuarios desconexos"
            // Let's add 'clinic_id' explicitly to metadata or rely on 'clinic_invites' being the source of truth if we update it to 'accepted'.

            // BETTER APPROACH: Update the User's Profile to match the role and maybe store the owner link.
            // Ideally we need a 'clinic_id' or 'owner_id' column in profiles.
            // For this MVP without altering Schema V3 too much, let's assume we update the 'role' 
            // and keep the invite record as 'accepted' to serve as the link.

            // ACTUALLY: The user asked to list them in Equipe. Equipe lists invites.
            // To list MEMBERS, Equipe needs to query profiles where... what?
            // Let's UPDATE the profile to have `owner_id` in metadata for now.

            // 2. Atomic Linkage via RPC (Bypasses RLS)
            console.log("Executing accept_clinic_invite RPC...");
            const usernameToSave = name || (user?.user_metadata?.username) || inviteData.email.split('@')[0];

            const { data: rpcData, error: rpcError } = await supabase.rpc('accept_clinic_invite', {
                invite_token: token,
                target_user_id: userId,
                new_username: usernameToSave
            });

            if (rpcError) {
                console.error("RPC Error:", rpcError);
                throw new Error("Erro ao vincular conta: " + rpcError.message);
            }

            if (rpcData && rpcData.success === false) {
                throw new Error(rpcData.error || "Falha ao processar convite.");
            }

            setStatus('success');
            setTimeout(() => {
                navigate('/');
            }, 2000);

        } catch (err: any) {
            setErrorMsg(err.message);
            // Error is shown via toast and errorMsg state
        } finally {
            setLoading(false);
        }
    };

    if (loading && status === 'validating') {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-[var(--primary)]" /></div>;
    }

    if (status === 'invalid') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Convite Inválido</h2>
                    <p className="text-slate-500 mb-6">{errorMsg}</p>
                    <Link to="/" className="text-[var(--primary)] font-bold hover:underline">Voltar ao Início</Link>
                </div>
            </div>
        );
    }

    if (status === 'check_email') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
                    <Mail className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Verifique seu E-mail</h2>
                    <p className="text-slate-500 mb-6">Enviamos um link de confirmação para <strong>{inviteData?.email}</strong>. Por favor, confirme para ativar sua conta.</p>
                    <p className="text-xs text-slate-400">Após confirmar, você poderá fazer login.</p>
                    <Link to="/login" className="block mt-4 text-[var(--primary)] font-bold hover:underline">Ir para Login</Link>
                </div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Bem-vindo à Equipe!</h2>
                    <p className="text-slate-500 mb-6">Você foi adicionado com sucesso.</p>
                    <p className="text-sm text-slate-400">Redirecionando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
            <div className="max-w-md w-full bg-[var(--surface)] p-8 rounded-xl shadow-lg border border-[var(--border)]">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-[var(--primary-light)] text-[var(--primary)] rounded-full flex items-center justify-center mx-auto mb-4">
                        <ArrowRight size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-[var(--primary)]">Convite para Equipe</h1>
                    <p className="text-[var(--text-muted)] mt-2">
                        Você foi convidado para se juntar à clínica <strong>{inviteData?.company_name || 'Clínica Parceira'}</strong> como <strong>{inviteData?.role === 'dentist' ? 'Dentista' : 'Secretária'}</strong>.
                    </p>
                </div>

                {!user ? (
                    <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700 mb-4">
                            Crie sua conta ou faça login para aceitar.
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Seu Nome</label>
                            <input
                                type="text"
                                className="w-full p-2 border rounded-lg"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Nome completo"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Senha para Acesso</label>
                            <input
                                type="password"
                                className="w-full p-2 border rounded-lg"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                            />
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                            O email será <strong>{inviteData?.email}</strong> (definido no convite).
                        </div>

                        <button
                            onClick={handleAcceptInvite}
                            disabled={loading || !password}
                            className="w-full bg-[var(--primary)] text-white py-3 rounded-lg font-bold hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 mt-4"
                        >
                            {loading ? 'Processando...' : 'Criar Conta e Aceitar'}
                        </button>

                        <div className="mt-4 text-center">
                            <Link to="/login" className="text-sm text-[var(--primary)] hover:underline">
                                Já tenho conta (Fazer Login)
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="text-center space-y-4">
                        <div className="bg-green-50 p-4 rounded-lg text-sm text-green-700">
                            Logado como <strong>{user.email}</strong>
                        </div>
                        {user.email !== inviteData?.email && (
                            <div className="bg-amber-50 p-4 rounded-lg text-xs text-amber-700">
                                Aviso: O convite foi enviado para {inviteData.email}, mas você está logado como {user.email}. Se aceitar, este usuário será vinculado.
                            </div>
                        )}
                        <button
                            onClick={handleAcceptInvite}
                            disabled={loading}
                            className="w-full bg-[var(--primary)] text-white py-3 rounded-lg font-bold hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Processando...' : 'Aceitar Convite'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
