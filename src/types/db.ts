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
    is_admin?: boolean;
    created_at: string;
};

export type Attachment = {
    id: string;
    created_at: string;
    user_id: string;
    patient_id: string;
    file_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
};
