import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';

export const Register = () => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    // Step 1: Account
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [username, setUsername] = useState('');

    // Step 2: Plan
    const [plan, setPlan] = useState<'simple' | 'pro'>('pro'); // Default to Pro

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password || !companyName || !username) {
            setMessage('Por favor, preencha todos os campos.');
            return;
        }
        setStep(2);
        setMessage('');
    };

    const handleSignUp = async () => {
        setLoading(true);
        setMessage('');

        // Prepare Metadata based on Plan
        const isSimple = plan === 'simple';
        const planConfig = {
            financial_module: true, // Both have access to basic finance, but Simple hides complex parts
            whatsapp_module: false,
            multi_calendar: !isSimple,
            simple_mode: isSimple
            // Pro enables commissions, multi-cal, teams (controlled by !simple_mode)
        };

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    company_name: companyName,
                    username: username,
                    plan_config: planConfig
                }
            }
        });

        if (authError) {
            setMessage(authError.message);
            setLoading(false);
            return;
        }

        setMessage('Cadastro realizado! Verifique seu e-mail para confirmar.');
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
            <div className="max-w-md w-full bg-[var(--surface)] p-8 rounded-xl shadow-lg border border-[var(--border)]">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-[var(--primary)]">Nova Conta</h1>
                    <p className="text-[var(--text-muted)] mt-2">
                        {step === 1 ? 'Dados da Clínica' : 'Escolha seu Modelo de Gestão'}
                    </p>
                </div>

                {message && (
                    <div className={`mb-4 p-3 rounded-lg text-sm ${message.includes('realizado') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                        {message}
                    </div>
                )}

                {step === 1 ? (
                    <form className="space-y-4" onSubmit={handleNext}>
                        <div>
                            <label className="block text-sm font-medium mb-1">Nome da Empresa / Clínica</label>
                            <input
                                type="text"
                                className="w-full p-2 rounded-lg border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Usuário de Login</label>
                            <input
                                type="text"
                                className="w-full p-2 rounded-lg border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                placeholder="ex: clinica_saude"
                                pattern="[a-zA-Z0-9_.-]+"
                                title="Apenas letras, números, ponto, traço e underline."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <input
                                type="email"
                                className="w-full p-2 rounded-lg border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Senha</label>
                            <input
                                type="password"
                                className="w-full p-2 rounded-lg border border-[var(--border)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-[var(--primary)] text-white py-2 rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors"
                        >
                            Próximo: Escolher Plano
                        </button>
                    </form>
                ) : (
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <label className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${plan === 'simple' ? 'border-[var(--primary)] bg-[var(--primary-light)]' : 'border-slate-200 hover:border-slate-300'}`}>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="radio"
                                        name="plan"
                                        value="simple"
                                        checked={plan === 'simple'}
                                        onChange={() => setPlan('simple')}
                                        className="w-5 h-5 text-[var(--primary)] focus:ring-[var(--primary)]"
                                    />
                                    <div>
                                        <span className="font-bold block text-slate-800">Consultório Simples</span>
                                        <span className="text-sm text-slate-500">Ideal para profissionais individuais. Interface limpa, agenda ágil sem complexidade.</span>
                                    </div>
                                </div>
                            </label>

                            <label className={`block p-4 rounded-xl border-2 cursor-pointer transition-all ${plan === 'pro' ? 'border-[var(--primary)] bg-[var(--primary-light)]' : 'border-slate-200 hover:border-slate-300'}`}>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="radio"
                                        name="plan"
                                        value="pro"
                                        checked={plan === 'pro'}
                                        onChange={() => setPlan('pro')}
                                        className="w-5 h-5 text-[var(--primary)] focus:ring-[var(--primary)]"
                                    />
                                    <div>
                                        <span className="font-bold block text-slate-800">Modelo Clínica (Pro)</span>
                                        <span className="text-sm text-slate-500">Para equipes. Gestão de comissões, múltiplos dentistas, controle financeiro avançado.</span>
                                    </div>
                                </div>
                            </label>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 py-2 rounded-lg font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                            >
                                Voltar
                            </button>
                            <button
                                onClick={handleSignUp}
                                disabled={loading}
                                className="flex-[2] bg-[var(--primary)] text-white py-2 rounded-lg font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Criando conta...' : 'Finalizar Cadastro'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="mt-4 pt-4 border-t border-[var(--border)] text-center">
                    <p className="text-sm text-[var(--text-muted)] mb-2">Já tem uma conta?</p>
                    <Link
                        to="/login"
                        className="text-[var(--primary)] text-sm font-medium hover:underline"
                    >
                        Voltar para Login
                    </Link>
                </div>
            </div>
        </div>
    );
};
