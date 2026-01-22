import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard, Custos, Pacientes, Login, Register, Configuracoes, SubscriptionExpired, Agenda, AdminDashboard } from './pages';
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
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            <RedirectIfAuthenticated>
              <Login />
            </RedirectIfAuthenticated>
          } />

          <Route path="/register" element={
            <RedirectIfAuthenticated>
              <Register />
            </RedirectIfAuthenticated>
          } />

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
            <Route path="custos" element={<Custos />} />
            <Route path="pacientes" element={<Pacientes />} />
            <Route path="agenda" element={<Agenda />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="admin" element={
              <RequireAdmin>
                <AdminDashboard />
              </RequireAdmin>
            } />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
