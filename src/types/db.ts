export type Custo = {
    id: string;
    created_at: string;
    titulo: string;
    categoria: string;
    valor: number;
    data_pagamento: string;
    data_validade?: string; // Para a lógica de expiração
    recorrente: boolean;
};

export type Paciente = {
    id: string;
    created_at: string;
    nome: string;
    telefone: string;
    data_nascimento?: string;
};

export type Consulta = {
    id: string;
    created_at: string;
    paciente_id: string;
    paciente?: Paciente; // Join
    data_consulta: string;
    queixa: string;
    evolucao: string;
    procedimento?: string;
    medicamentos?: string;
    valor_consulta?: number;
};

export type Profile = {
    id: string;
    email: string;
    company_name: string;
    valid_until: string;
    created_at: string;
};
