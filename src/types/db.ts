export type PlanConfig = {
    financial_module: boolean;
    whatsapp_module: boolean;
    multi_calendar: boolean;
    simple_mode?: boolean; // New: Simplified UI for basic plans
    [key: string]: any; // Extensibility
};


export type Profile = {
    id: string; // References auth.users
    owner_id?: string; // Linked Owner for Staff
    email: string;
    company_name: string;
    username?: string;
    valid_until: string;
    is_admin?: boolean;
    created_at: string;
    plan_config: PlanConfig; // Feature Flags
    linked_calendar_id?: string; // Google Calendar ID for synchronization
    role?: 'clinic_owner' | 'dentist' | 'secretary'; // Role-based access
};

export type Procedure = {
    id: string;
    user_id: string; // Tenant Link
    name: string;
    price: number;
    commission_percentage: number;
    lab_cost: number;
    created_at: string;
};

export type Custo = {
    id: string;
    created_at: string;
    titulo: string;
    categoria: string;
    valor: number;
    data_pagamento: string;
    data_validade?: string;
    recorrente: boolean;
    pago?: boolean;
};

export type Paciente = {
    id: string;
    created_at: string;
    nome: string;
    telefone: string;
    data_nascimento?: string;
    email?: string;
    last_professional_id?: string;
};

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'no_show' | 'cancelled';

export type Consulta = {
    id: string;
    created_at: string;
    user_id?: string; // Professional (Reference to auth.users)
    owner_id?: string; // Clinic Owner
    paciente_id: string;
    paciente?: Paciente;
    data_consulta: string; // Start Time
    end_time?: string; // End Time (Future proofing for calendar)
    queixa: string; // Description/Notes
    evolucao?: string;

    // Procedure & Finance
    procedure_id?: string;
    procedure?: Procedure;
    medicamentos?: string;
    valor_consulta?: number; // Cache of price at time of booking
    payment_method?: 'money' | 'card' | 'pix' | 'warranty' | 'none';

    // Status & Commission
    status: AppointmentStatus;
    recorded_commission?: number; // Calculated at completion

    // Google Sync
    google_event_id?: string;
};

export type Integration = {
    id: string;
    user_id: string;
    provider: 'google';
    access_token: string;
    refresh_token: string;
    expires_at: number; // Timestamp
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

export interface ClinicInvite {
    id: string;
    clinic_owner_id: string;
    email: string;
    role: 'dentist' | 'secretary';
    token: string;
    status: 'pending' | 'accepted' | 'expired';
    created_at?: string;
    profiles?: { company_name: string };
    company_name?: string; // Enriched
}

export interface DentistCommission {
    id: string;
    dentist_id: string;
    procedure_id: string;
    commission_percentage: number;
    active: boolean;
}
