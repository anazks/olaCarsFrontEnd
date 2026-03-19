import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, DollarSign, PieChart, Receipt, FileText, Banknote, ShieldAlert, ShieldCheck, Settings, Menu, Globe, Building2, UserCheck, Users, ChevronDown, ChevronRight, LogOut, Package, Car, Calculator, BookMarked, BarChart3, Wrench } from 'lucide-react';
import { removeToken } from '../../../utils/auth';

interface FinancialAdminSidebarProps {
    isSidebarCollapsed?: boolean;
    toggleSidebar?: () => void;
}

const FinancialAdminSidebar = ({ isSidebarCollapsed = false, toggleSidebar }: FinancialAdminSidebarProps) => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

    const handleLogout = () => {
        removeToken();
        navigate('/admin/login');
    };

    const navItems = [
        { icon: <Globe size={20} />, label: 'Manage Country Managers', path: '/admin/financial-admin/manage-country-managers' },
        { icon: <Building2 size={20} />, label: 'Manage Branches', path: '/admin/financial-admin/manage-branches' },
        { icon: <UserCheck size={20} />, label: 'Branch Managers', path: '/admin/financial-admin/manage-branch-managers' },
        { icon: <ShieldCheck size={20} />, label: 'Finance Staff', path: '/admin/financial-admin/manage-finance-staff' },
        { icon: <ShieldCheck size={20} />, label: 'Ground Ops Staff', path: '/admin/financial-admin/manage-operation-staff' },
        { icon: <Wrench size={20} />, label: 'Workshop Staff', path: '/admin/financial-admin/manage-workshop-staff' },
        { icon: <Users size={20} />, label: 'Suppliers', path: '/admin/financial-admin/manage-suppliers' },
        { icon: <Package size={20} />, label: 'Purchase Orders', path: '/admin/financial-admin/purchase-orders' },
        { icon: <Car size={20} />, label: 'Manage Vehicles', path: '/admin/financial-admin/vehicles' },
        { icon: <Users size={20} />, label: 'Drivers', path: '/admin/financial-admin/drivers' },
    ];

    const financeItems = [
        { icon: <BarChart3 size={20} />, label: 'Finance Dashboard', path: '/admin/financial-admin/finance-dashboard' },
        { icon: <Calculator size={20} />, label: 'Tax Management', path: '/admin/financial-admin/taxes' },
        { icon: <BookMarked size={20} />, label: 'Chart of Accounts', path: '/admin/financial-admin/chart-of-accounts' },
        { icon: <FileText size={20} />, label: 'General Ledger', path: '/admin/financial-admin/ledger' },
        { icon: <Receipt size={20} />, label: 'Purchase Bills', path: '/admin/financial-admin/purchase-bills' },
        { icon: <DollarSign size={20} />, label: 'Revenue Streams' },
        { icon: <PieChart size={20} />, label: 'Profit Analysis' },
        { icon: <Receipt size={20} />, label: 'Billing & Invoices' },
        { icon: <FileText size={20} />, label: 'Tax Compliance' },
        { icon: <Banknote size={20} />, label: 'Payout Registry' },
        { icon: <ShieldAlert size={20} />, label: 'Risk Audit' },
    ];

    const SidebarItem = ({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) => (
        <div
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-all mb-1 ${isSidebarCollapsed ? 'justify-center' : ''}`}
            style={{
                background: active ? 'rgba(200,230,0,0.1)' : 'transparent',
                color: active ? 'var(--brand-lime)' : 'var(--sidebar-text)',
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--sidebar-hover)'; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            title={isSidebarCollapsed ? label : ''}
        >
            <span style={{ color: active ? 'var(--brand-lime)' : 'inherit' }}>{icon}</span>
            {!isSidebarCollapsed && <span className="font-medium text-sm whitespace-nowrap overflow-hidden">{label}</span>}
        </div>
    );

    const SidebarSection = ({ title, items }: { title: string; items: any[] }) => {
        const [isOpen, setIsOpen] = useState(true);

        return (
            <div className="mb-4">
                {!isSidebarCollapsed && (
                    <div
                        onClick={() => setIsOpen(!isOpen)}
                        className="px-4 py-2 mb-1 flex items-center justify-between cursor-pointer group hover:bg-black/5 rounded-lg transition-all"
                    >
                        <h4 className="text-[11px] font-bold uppercase tracking-wider transition-colors" style={{ color: 'var(--text-dim)' }}>{title}</h4>
                        <span style={{ color: 'var(--text-dim)' }} className="transition-transform duration-200">
                            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                    </div>
                )}
                <div className={`space-y-1 overflow-hidden transition-all duration-300 ${isOpen || isSidebarCollapsed ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    {items.map((item, i) => (
                        <SidebarItem
                            key={i}
                            icon={item.icon}
                            label={item.label}
                            active={item.path ? isActive(item.path) : false}
                            onClick={item.path ? () => navigate(item.path) : undefined}
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <aside
            className="w-full h-full flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out"
            style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-main)' }}
        >
            <div className={`h-20 flex items-center justify-between border-b ${isSidebarCollapsed ? 'px-0 justify-center' : 'px-6'}`} style={{ borderColor: 'var(--border-main)' }}>
                {!isSidebarCollapsed && (
                    <span className="text-xl font-bold tracking-wide transition-colors" style={{ color: 'var(--brand-lime)' }}>
                        OLA <span style={{ color: 'var(--text-main)' }}>CARS</span>
                    </span>
                )}

                <button
                    onClick={toggleSidebar}
                    className={`p-2 rounded-lg transition-all cursor-pointer ${isSidebarCollapsed ? 'ml-4' : 'ml-2'}`}
                    style={{ color: 'var(--sidebar-text)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sidebar-hover)'; e.currentTarget.style.color = 'var(--brand-lime)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-text)'; }}
                >
                    <Menu size={24} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 mt-4 custom-scrollbar overflow-x-hidden">
                <SidebarItem
                    icon={<LayoutDashboard size={20} />}
                    label="Finance Overview"
                    active={location.pathname === '/admin/financial-admin'}
                    onClick={() => navigate('/admin/financial-admin')}
                />

                <div className="my-6 border-t border-dashed" style={{ borderColor: 'var(--border-main)' }} />

                <SidebarSection title="Staff Management" items={navItems} />
                <SidebarSection title="Finance Operations" items={financeItems} />
            </div>

            <div className="p-4 border-t space-y-1" style={{ borderColor: 'var(--border-main)' }}>
                <div
                    onClick={() => navigate('profile')}
                    className={`flex items-center gap-3 cursor-pointer transition-all p-2 rounded-lg ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    style={{ color: 'var(--sidebar-text)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sidebar-hover)'; e.currentTarget.style.color = 'var(--brand-lime)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-text)'; }}
                    title={isSidebarCollapsed ? "Settings" : ""}
                >
                    <Settings size={20} />
                    {!isSidebarCollapsed && <span className="text-sm font-medium">Settings</span>}
                </div>
                <div
                    onClick={handleLogout}
                    className={`flex items-center gap-3 cursor-pointer transition-all p-2 rounded-lg ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    style={{ color: 'var(--sidebar-text)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.05)'; e.currentTarget.style.color = '#ef4444'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-text)'; }}
                    title={isSidebarCollapsed ? "Logout" : ""}
                >
                    <LogOut size={20} />
                    {!isSidebarCollapsed && <span className="text-sm font-medium">Logout</span>}
                </div>
            </div>
        </aside>
    );
};

export default FinancialAdminSidebar;
