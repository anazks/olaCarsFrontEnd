import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, Menu, ShieldCheck, LogOut, ChevronDown, ChevronRight, Package, Car, Shield, Receipt, Wrench, UserCog } from 'lucide-react';
import { removeToken } from '../../../utils/auth';
import { useTranslation } from 'react-i18next';

interface BranchManagerSidebarProps {
    isSidebarCollapsed?: boolean;
    toggleSidebar?: () => void;
}

const BranchManagerSidebar = ({ isSidebarCollapsed = false, toggleSidebar }: BranchManagerSidebarProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

    const handleLogout = () => {
        removeToken();
        navigate('/admin/login');
    };

    const adminItems = [
        { icon: <ShieldCheck size={20} />, label: t('sidebar.items.financeStaff'), path: '/admin/branch-manager/manage-finance-staff' },
        { icon: <ShieldCheck size={20} />, label: t('sidebar.items.groundOpsStaff'), path: '/admin/branch-manager/manage-operation-staff' },
        { icon: <UserCog size={20} />, label: t('sidebar.items.workshopManagers', 'Workshop Managers'), path: '/admin/branch-manager/manage-workshop-managers' },
        { icon: <Wrench size={20} />, label: t('sidebar.items.workshopStaff'), path: '/admin/branch-manager/manage-workshop-staff' },
        { icon: <Users size={20} />, label: t('sidebar.items.suppliers'), path: '/admin/branch-manager/manage-suppliers' },
    ];

    const operationsItems = [
        { icon: <Shield size={20} />, label: t('sidebar.items.insuranceManagement'), path: '/admin/branch-manager/insurances' },
        { icon: <Package size={20} />, label: t('sidebar.items.purchaseOrders'), path: '/admin/branch-manager/purchase-orders' },
        { icon: <Receipt size={20} />, label: t('sidebar.items.purchaseBills'), path: '/admin/branch-manager/purchase-bills' },
        { icon: <Car size={20} />, label: t('sidebar.items.manageVehicles'), path: '/admin/branch-manager/vehicles' },
        { icon: <Users size={20} />, label: t('sidebar.items.drivers'), path: '/admin/branch-manager/drivers' },
    ];

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
                    label={t('sidebar.items.branchOverview')}
                    active={location.pathname === '/admin/branch-manager'}
                    onClick={() => navigate('/admin/branch-manager')}
                />

                <div className="my-6 border-t border-dashed" style={{ borderColor: 'var(--border-main)' }} />

                <SidebarSection title={t('sidebar.sections.staffManagement')} items={adminItems} />
                <SidebarSection title={t('sidebar.sections.operations', 'Operations')} items={operationsItems} />
            </div>

            <div className="p-4 border-t space-y-1" style={{ borderColor: 'var(--border-main)' }}>
                <div
                    onClick={() => navigate('profile')}
                    className={`flex items-center gap-3 cursor-pointer transition-all p-2 rounded-lg ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    style={{ color: 'var(--sidebar-text)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sidebar-hover)'; e.currentTarget.style.color = 'var(--brand-lime)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-text)'; }}
                    title={isSidebarCollapsed ? t('common.settings') : ""}
                >
                    <Settings size={20} />
                    {!isSidebarCollapsed && <span className="text-sm font-medium">{t('common.settings')}</span>}
                </div>
                <div
                    onClick={handleLogout}
                    className={`flex items-center gap-3 cursor-pointer transition-all p-2 rounded-lg ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    style={{ color: 'var(--sidebar-text)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.05)'; e.currentTarget.style.color = '#ef4444'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-text)'; }}
                    title={isSidebarCollapsed ? t('common.logout') : ""}
                >
                    <LogOut size={20} />
                    {!isSidebarCollapsed && <span className="text-sm font-medium">{t('common.logout')}</span>}
                </div>
            </div>
        </aside>
    );
};

export default BranchManagerSidebar;
