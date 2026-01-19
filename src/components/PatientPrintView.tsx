import React, { forwardRef } from 'react';
import type { Paciente, Consulta } from '../types/db';
import { format, parseISO, differenceInYears } from 'date-fns';
import { User, Calendar, MapPin, Phone } from 'lucide-react';

interface PatientPrintViewProps {
    paciente: Paciente;
    consultas: Consulta[];
    companyName?: string;
    companyLogo?: string;
}

export const PatientPrintView = forwardRef<HTMLDivElement, PatientPrintViewProps>(({ paciente, consultas, companyName, companyLogo }, ref) => {
    return (
        <div ref={ref} className="hidden print:block print:w-full bg-white p-8 max-w-4xl mx-auto text-black print:text-black">
            {/* Header */}
            <div className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">{companyName || 'Clínica Médica'}</h1>
                    <div className="text-sm text-slate-600 space-y-1">
                        <p>Prontuário Médico Digital</p>
                        <p>Emitido em: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                    </div>
                </div>
                <div className="text-right">
                    {companyLogo ? (
                        <div className="w-24 h-24 relative">
                            <img
                                src={companyLogo}
                                alt="Logo"
                                className="w-full h-full object-contain object-right-top"
                            />
                        </div>
                    ) : (
                        <div className="w-16 h-16 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center text-2xl font-bold text-slate-400">
                            {companyName?.[0] || 'C'}
                        </div>
                    )}
                </div>
            </div>

            {/* Patient Info */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-8 print:bg-transparent print:border-2">
                <h2 className="text-lg font-bold uppercase tracking-wide border-b border-slate-300 pb-2 mb-4 flex items-center gap-2">
                    <User size={20} /> Identificação do Paciente
                </h2>
                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                    <div>
                        <span className="block text-xs font-bold uppercase text-slate-500">Nome Completo</span>
                        <span className="text-lg font-medium">{paciente.nome}</span>
                    </div>
                    <div>
                        <span className="block text-xs font-bold uppercase text-slate-500">Idade / Nascimento</span>
                        <span className="text-lg font-medium">
                            {paciente.data_nascimento ? (
                                <>
                                    {differenceInYears(new Date(), parseISO(paciente.data_nascimento))} anos
                                    <span className="text-sm text-slate-500 ml-2">({format(parseISO(paciente.data_nascimento), 'dd/MM/yyyy')})</span>
                                </>
                            ) : '-'}
                        </span>
                    </div>
                    <div>
                        <span className="block text-xs font-bold uppercase text-slate-500">Telefone</span>
                        <span className="text-lg font-medium">{paciente.telefone || '-'}</span>
                    </div>
                    <div>
                        <span className="block text-xs font-bold uppercase text-slate-500">Data de Cadastro</span>
                        <span className="text-lg font-medium">{format(new Date(paciente.created_at), 'dd/MM/yyyy')}</span>
                    </div>
                </div>
            </div>

            {/* History */}
            <div>
                <h2 className="text-lg font-bold uppercase tracking-wide border-b border-slate-300 pb-2 mb-6 flex items-center gap-2">
                    <Calendar size={20} /> Histórico de Atendimentos
                </h2>

                {consultas.length === 0 ? (
                    <p className="text-slate-500 italic">Nenhum registro encontrado.</p>
                ) : (
                    <div className="space-y-6">
                        {consultas.map((c, index) => (
                            <div key={c.id} className="break-inside-avoid border-l-4 border-slate-300 pl-4 py-1">
                                <div className="flex justify-between items-baseline mb-2">
                                    <h3 className="font-bold text-lg">
                                        {format(parseISO(c.data_consulta), 'dd/MM/yyyy')}
                                    </h3>
                                    <span className="text-sm font-semibold bg-slate-100 px-2 py-1 rounded print:border print:border-slate-300">
                                        {c.procedimento || 'Consulta de Rotina'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-3 text-sm leading-relaxed">
                                    {c.queixa && (
                                        <div>
                                            <span className="font-bold text-slate-700 block">Queixa:</span>
                                            {c.queixa}
                                        </div>
                                    )}
                                    {c.evolucao && (
                                        <div>
                                            <span className="font-bold text-slate-700 block">Evolução:</span>
                                            {c.evolucao}
                                        </div>
                                    )}
                                    {c.medicamentos && (
                                        <div className="mt-2 pt-2 border-t border-dashed border-slate-200">
                                            <span className="font-bold text-slate-700 block">Prescrição / Medicamentos:</span>
                                            <pre className="whitespace-pre-wrap font-sans text-slate-800 bg-slate-50 p-2 rounded print:bg-transparent print:p-0">
                                                {c.medicamentos}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-16 pt-8 border-t border-slate-300 text-center text-xs text-slate-400 print:fixed print:bottom-4 print:left-0 print:w-full print:mt-0">
                <p>Documento gerado eletronicamente pelo sistema Clinic+.</p>
            </div>
        </div>
    );
});

export const printPatientRecord = () => {
    window.print();
};
