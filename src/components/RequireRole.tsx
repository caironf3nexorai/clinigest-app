import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Profile } from '../types/db';

type Role = 'clinic_owner' | 'dentist' | 'secretary';

interface RequireRoleProps {
    children: React.ReactNode;
    allowedRoles?: Role[];
    requireFinancial?: boolean;
}

export const RequireRole = ({ children, allowedRoles, requireFinancial = false }: RequireRoleProps) => {
    const { profile, loading, user } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Carregando permissões...</div>;
    }

    if (!user || !profile) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // 1. Role Check
    if (allowedRoles && allowedRoles.length > 0) {
        const userRole = profile.role || 'clinic_owner'; // Default fallback
        if (!allowedRoles.includes(userRole as Role)) {
            // Redirect Secretary/Dentist trying to access Owner pages
            return <Navigate to="/" replace />;
        }
    }

    // 2. Financial Module Check (Plan + Role)
    if (requireFinancial) {
        const hasFinancialPlan = profile.plan_config?.financial_module;
        // Secretary and Dentist are BLOCKED from Financial Module regardless of plan
        const isRoleBlocked = ['secretary', 'dentist'].includes(profile.role || '');

        if (!hasFinancialPlan || isRoleBlocked) {
            return <Navigate to="/" replace />;
        }
    }

    return <>{children}</>;
};
