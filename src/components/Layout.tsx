import { Link, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, Wallet, Users, Settings, LogOut, Calendar as CalendarIcon, Shield, DollarSign, Briefcase, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const SidebarItem = ({ to, icon: Icon, label, active, onClick }: any) => {
    const Component = to ? Link : 'button';
    return (
        <Component
            to={to}
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors w-full text-left ${active
                ? 'bg-[var(--primary)] text-white'
                : 'text-[var(--text-muted)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)]'
                }`}
        >
            <Icon size={20} />
            <span className="font-medium">{label}</span>
        </Component>
    );
};

export const Layout = () => {
    const location = useLocation();
    const { signOut, user, profile, isAdmin } = useAuth();

    // 1. Roles & Permissions
    const role = profile?.role || 'clinic_owner';
    const isSuperAdmin = role === 'super_admin';
    const isOwner = role === 'clinic_owner' || isSuperAdmin;

    // 2. Plan Configuration
    // Super Admin overrides Simple Mode (sees everything)
    const planSimpleMode = profile?.plan_config?.simple_mode === true;
    const isSimpleMode = planSimpleMode && !isSuperAdmin;

    // Base Menu
    const navItems = [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/agenda', icon: CalendarIcon, label: 'Agenda' },
        { to: '/pacientes', icon: Users, label: 'Pacientes' },
    ];

    // Owner / Super Admin Menu Logic
    if (isOwner) {
        // [PRO ONLY] Financeiro (Full Dashboard)
        if (!isSimpleMode) {
            navItems.splice(1, 0, { to: '/financeiro', icon: Wallet, label: 'Financeiro' });
        }

        // [ALL PLANS] Despesas
        navItems.push({ to: '/custos', icon: DollarSign, label: 'Despesas' });

        // [PRO ONLY] Advanced Settings & Teams
        if (!isSimpleMode) {
            navItems.push({ to: '/procedimentos', icon: Settings, label: 'Serviços' });
            navItems.push({ to: '/comissoes', icon: FileText, label: 'Comissões' });
            navItems.push({ to: '/equipe', icon: Briefcase, label: 'Equipe' });
        }
    }

    // Filter out if Simple Mode hides specific things? (Already handled by Role mostly)

    return (
        <div className="flex min-h-screen bg-[var(--background)]">
            {/* Sidebar */}
            <aside className="fixed top-0 left-0 h-full w-64 bg-[var(--surface)] border-r border-[var(--border)] p-4 flex flex-col z-10 hidden md:flex print:hidden">
                <div className="mb-8 flex items-center gap-3 px-2">
                    {user?.user_metadata?.company_logo ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-slate-200 shrink-0">
                            <img
                                src={user.user_metadata.company_logo}
                                alt="Logo"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ) : (
                        <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center text-white font-bold shrink-0">
                            {user?.user_metadata?.company_name?.[0]?.toUpperCase() || 'C'}
                        </div>
                    )}
                    <span className="text-lg font-bold tracking-tight text-[var(--text-main)] truncate" title={user?.user_metadata?.company_name || 'Clinic+'}>
                        {user?.user_metadata?.company_name || 'Clinic+'}
                    </span>
                </div>

                <div className="mb-4 px-2 flex-1 overflow-y-auto">
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Menu ({role === 'clinic_owner' ? 'Dono' : role === 'secretary' ? 'Sec' : 'Dr.'})</p>
                    <nav className="space-y-1">
                        {navItems.map((item) => (
                            <SidebarItem
                                key={item.to}
                                {...item}
                                active={location.pathname === item.to}
                            />
                        ))}
                        {user && isAdmin && (
                            <SidebarItem
                                to="/admin"
                                icon={Shield}
                                label="Painel Admin"
                                active={location.pathname === '/admin'}
                                className="text-indigo-600 hover:bg-indigo-50"
                            />
                        )}
                    </nav>
                </div>

                <div className="mt-auto pt-4 border-t border-[var(--border)]">
                    <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 px-2">Conta</p>
                    <nav className="space-y-1">
                        <SidebarItem
                            to="/configuracoes"
                            icon={Settings}
                            label="Configurações"
                            active={location.pathname === '/configuracoes'}
                        />
                        <SidebarItem
                            icon={LogOut}
                            label="Sair"
                            onClick={signOut}
                        />
                    </nav>
                </div>
            </aside>

            {/* Mobile Header (Visible only on small screens) */}
            <header className="md:hidden fixed top-0 w-full bg-[var(--surface)] border-b border-[var(--border)] h-[var(--header-height)] flex items-center justify-between px-4 z-10 print:hidden">
                <span className="font-bold text-lg">Clinic+</span>
                <button onClick={signOut} className="text-[var(--text-muted)]">
                    <LogOut size={20} />
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 overflow-auto">
                <div className="container">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 w-full bg-[var(--surface)] border-t border-[var(--border)] flex justify-around p-3 z-10 print:hidden">
                {navItems.map((item) => (
                    <Link
                        key={item.to}
                        to={item.to}
                        className={`flex flex-col items-center gap-1 ${location.pathname === item.to ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'
                            }`}
                    >
                        <item.icon size={20} />
                        <span className="text-[10px]">{item.label}</span>
                    </Link>
                ))}
                <Link
                    to="/configuracoes"
                    className={`flex flex-col items-center gap-1 ${location.pathname === '/configuracoes' ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'
                        }`}
                >
                    <Settings size={20} />
                    <span className="text-[10px]">Config</span>
                </Link>
                {user && isAdmin && (
                    <Link
                        to="/admin"
                        className={`flex flex-col items-center gap-1 ${location.pathname === '/admin' ? 'text-indigo-600' : 'text-[var(--text-muted)]'}`}
                    >
                        <Shield size={20} />
                        <span className="text-[10px]">Admin</span>
                    </Link>
                )}
            </nav>
        </div>
    );
};

