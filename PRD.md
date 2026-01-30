# Documento de Requisitos do Produto (PRD) - Sistema de Gestão de Clínica

## 1. Visão Geral
O projeto é um sistema web de gestão para clínicas ou consultórios (SaaS), desenvolvido em React com Vite. O objetivo é fornecer uma plataforma eficiente para que profissionais de saúde gerenciem agendamentos, pacientes e custos financeiros, além de incluir funcionalidades administrativas e verificação de status de assinatura.

## 2. Atores
- **Administrador**: Possui acesso privilegiado ao sistema através do (`AdminDashboard`), podendo gerenciar usuários (clínicas/profissionais) e configurações globais.
- **Profissional de Saúde (Usuário)**: Utiliza a plataforma para operar sua clínica, gerenciar agenda, pacientes e visualizar indicadores financeiros.

## 3. Requisitos Funcionais

### 3.1. Autenticação e Controle de Acesso
- **Login e Registro**:
  - Suporte a autenticação por e-mail e senha (`Login.tsx`, `Register.tsx`).
  - Integração com Google OAuth (`@react-oauth/google`).
- **Controle de Assinatura**:
  - Bloqueio de acesso para assinaturas expiradas com redirecionamento para tela informativa (`SubscriptionExpired.tsx`).

### 3.2. Agenda e Compromissos (`Agenda.tsx`)
- Interface de calendário interativa utilizando `react-big-calendar`.
- Funcionalidades esperadas:
  - Visualização de horários livres e ocupados.
  - Agendamento de consultas.
  - Edição e gestão de status de consultas (confirmado, cancelado, realizado).

### 3.3. Gestão de Pacientes (`Pacientes.tsx`)
- Cadastro de novos pacientes com dados pessoais e de contato.
- Listagem e visualização de pacientes cadastrados.
- Histórico de atendimentos (implícito no contexto de clínica).

### 3.4. Gestão Financeira (`Custos.tsx`)
- Lançamento de despesas e custos da clínica.
- Categorização de lançamentos.
- Visualização simples de saídas.

### 3.5. Dashboards e Relatórios
- **Dashboard do Usuário (`Dashboard.tsx`)**:
  - Apresentação de métricas operacionais e financeiras usando gráficos (`recharts`).
  - Resumo de agendamentos do dia.
- **Dashboard Administrativo (`AdminDashboard.tsx`)**:
  - Visão macro do sistema para administradores.
  - Métricas de adesão e uso da plataforma.

### 3.6. Configurações (`Configuracoes.tsx`)
- Gerenciamento de perfil do usuário.
- Configurações da clínica/consultório no sistema.

## 4. Requisitos Não-Funcionais
- **Usabilidade**: Interface limpa, responsiva e moderna construída com Tailwind CSS.
- **Confiabilidade**: Persistência de dados segura utilizando Supabase.
- **Performance**: Aplicação SPA otimizada com Vite e React 19.

## 5. Stack Tecnológica
- **Linguagem**: TypeScript.
- **Framework Frontend**: React 19.
- **Build Tool**: Vite.
- **Estilização**: Tailwind CSS.
- **Roteamento**: React Router DOM.
- **Backend/Banco de Dados**: Supabase (Autenticação e DB).
- **Bibliotecas Principais**:
  - `axios`: Requisições HTTP.
  - `date-fns`: Manipulação de datas.
  - `recharts`: Visualização de dados.
  - `lucide-react`: Ícones.
  - `react-big-calendar`: Componente de calendário.
