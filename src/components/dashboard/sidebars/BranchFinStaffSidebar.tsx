import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wallet, Receipt, CreditCard, History, FileText, Settings, Menu, ChevronDown, ChevronRight, LogOut, Package, Car, Users, Calculator, BookMarked, BarChart3 } from 'lucide-react';
import { removeToken } from '../../../utils/auth';

interface BranchFinStaffSidebarProps {
    isSidebarCollapsed?: boolean;
    toggleSidebar?: () => void;
}

const BranchFinStaffSidebar = ({ isSidebarCollapsed = false, toggleSidebar }: BranchFinStaffSidebarProps) => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

    const handleLogout = () => {
        removeToken();
        navigate('/admin/login');
    };

    const navItems = [
        { icon: <Wallet size={20} />, label: 'Daily Collection' },
        { icon: <Receipt size={20} />, label: 'Invoices' },
        { icon: <CreditCard size={20} />, label: 'Payments' },
        { icon: <History size={20} />, label: 'Transaction History' },
        { icon: <FileText size={20} />, label: 'Reports' },
        { icon: <Package size={20} />, label: 'Purchase Orders', path: '/admin/branch-fin-staff/purchase-orders' },
        { icon: <Car size={20} />, label: 'Vehicles Onboarding', path: '/admin/branch-fin-staff/vehicles' },
        { icon: <Users size={20} />, label: 'Drivers', path: '/admin/branch-fin-staff/drivers' },
    ];

    const financeItems = [
        { icon: <BarChart3 size={20} />, label: 'Finance Dashboard', path: '/admin/branch-fin-staff/finance-dashboard' },
        { icon: <Calculator size={20} />, label: 'Tax Management', path: '/admin/branch-fin-staff/taxes' },
        { icon: <BookMarked size={20} />, label: 'Chart of Accounts', path: '/admin/branch-fin-staff/chart-of-accounts' },
        { icon: <FileText size={20} />, label: 'General Ledger', path: '/admin/branch-fin-staff/ledger' },
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
            <span style={{ color: active ? 'var(--brand)' : 'inherit' }}>{icon}</span>
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
                            active={item.path ? isActive(item.path) : (i === 0)} // Temp active for demo
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
                    label="Fin Overview"
                    active={true}
                    onClick={() => { }}
                />

                <div className="my-6 border-t border-dashed" style={{ borderColor: 'var(--border-main)' }} />

                <SidebarSection title="General Ledger & Tax" items={financeItems} />
                <SidebarSection title="Financial Tasks" items={navItems} />
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

export default BranchFinStaffSidebar;
