import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireRole } from './components/RequireRole';
import { Dashboard, Custos, Pacientes, Login, Register, Configuracoes, SubscriptionExpired, Agenda, AdminDashboard, Procedimentos, Financeiro, Equipe, Comissoes, JoinClinic } from './pages';
import { ForgotPassword } from './pages/ForgotPassword';
import { ToastProvider } from './components/Toast';

import { AuthProvider, useAuth } from './contexts/AuthContext';

// Components to protect routes
const RequireAuth = ({ children, ignoreSubscription = false }: { children: React.ReactNode, ignoreSubscription?: boolean }) => {
  const { session, loading, isSubscriptionValid } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!ignoreSubscription && !isSubscriptionValid) {
    return <Navigate to="/subscription-expired" replace />;
  }

  return children;
};

const RequireAdmin = ({ children }: { children: React.ReactNode }) => {
  const { session, loading, isAdmin } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;

  if (!session || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Redirect to dashboard if already logged in
const RequireFeatureFlag = ({ flag, children }: { flag: string, children: React.ReactNode }) => {
  const { profile, loading } = useAuth();
  if (loading) return <div>Checking Permissions...</div>;
  if (!profile?.plan_config?.[flag]) {
    return <Navigate to="/" replace />;
  }
  return children;
};

// Redirect to dashboard if already logged in
const RedirectIfAuthenticated = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (session) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={
              <RedirectIfAuthenticated>
                <Login />
              </RedirectIfAuthenticated>
            } />

            <Route path="/forgot-password" element={
              <RedirectIfAuthenticated>
                <ForgotPassword />
              </RedirectIfAuthenticated>
            } />

            {/* ... existing routes ... */}

            <Route path="/register" element={
              <RedirectIfAuthenticated>
                <Register />
              </RedirectIfAuthenticated>
            } />

            <Route path="/entrar/:token" element={<JoinClinic />} />

            <Route path="/subscription-expired" element={
              <RequireAuth ignoreSubscription={true}>
                <SubscriptionExpired />
              </RequireAuth>
            } />

            <Route path="/" element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }>
              <Route index element={<Dashboard />} />
              <Route path="custos" element={
                <RequireRole allowedRoles={['clinic_owner']}>
                  <Custos />
                </RequireRole>
              } />
              <Route path="financeiro" element={
                <RequireRole allowedRoles={['clinic_owner']}>
                  <Financeiro />
                </RequireRole>
              } />
              <Route path="procedimentos" element={
                <RequireRole allowedRoles={['clinic_owner']}>
                  <Procedimentos />
                </RequireRole>
              } />
              <Route path="comissoes" element={
                <RequireRole allowedRoles={['clinic_owner']}>
                  <Comissoes />
                </RequireRole>
              } />
              <Route path="equipe" element={
                <RequireRole allowedRoles={['clinic_owner']}>
                  <Equipe />
                </RequireRole>
              } />
              <Route path="pacientes" element={<Pacientes />} />
              <Route path="agenda" element={<Agenda />} />
              <Route path="configuracoes" element={<Configuracoes />} />
              <Route path="procedimentos" element={<Procedimentos />} />
              <Route path="admin" element={
                <RequireAdmin>
                  <AdminDashboard />
                </RequireAdmin>
              } />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
