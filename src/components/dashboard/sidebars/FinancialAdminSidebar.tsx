import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, FileText, ShieldCheck, Settings, Menu, Globe, Building2, UserCheck, Users, ChevronDown, ChevronRight, LogOut, Package, Car, Calculator, BookMarked, BarChart3, Wrench, UserCog } from 'lucide-react';
import { removeToken } from '../../../utils/auth';
import { useTranslation } from 'react-i18next';
import HasPermission from '../../../components/HasPermission';

interface FinancialAdminSidebarProps {
    isSidebarCollapsed?: boolean;
    toggleSidebar?: () => void;
}

const FinancialAdminSidebar = ({ isSidebarCollapsed = false, toggleSidebar }: FinancialAdminSidebarProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

    const handleLogout = () => {
        removeToken();
        navigate('/admin/login');
    };

    const adminItems = [
        { icon: <Globe size={20} />, label: t('sidebar.items.manageCountryManagers'), path: '/admin/financial-admin/manage-country-managers', permission: 'STAFF_VIEW' },
        { icon: <Building2 size={20} />, label: t('sidebar.items.manageBranches'), path: '/admin/financial-admin/manage-branches', permission: 'BRANCH_VIEW' },
        { icon: <UserCheck size={20} />, label: t('sidebar.items.branchManagers'), path: '/admin/financial-admin/manage-branch-managers', permission: 'STAFF_VIEW' },
        { icon: <ShieldCheck size={20} />, label: t('sidebar.items.financeStaff'), path: '/admin/financial-admin/manage-finance-staff', permission: 'STAFF_VIEW' },
        { icon: <ShieldCheck size={20} />, label: t('sidebar.items.groundOpsStaff'), path: '/admin/financial-admin/manage-operation-staff', permission: 'STAFF_VIEW' },
        { icon: <UserCog size={20} />, label: t('sidebar.items.workshopManagers', 'Workshop Managers'), path: '/admin/financial-admin/manage-workshop-managers', permission: 'STAFF_VIEW' },
        { icon: <Wrench size={20} />, label: t('sidebar.items.workshopStaff'), path: '/admin/financial-admin/manage-workshop-staff', permission: 'STAFF_VIEW' },
        { icon: <Users size={20} />, label: t('sidebar.items.suppliers'), path: '/admin/financial-admin/manage-suppliers', permission: 'SUPPLIER_VIEW' },
    ];

    const operationsItems = [
        { icon: <Package size={20} />, label: t('sidebar.items.purchaseOrders'), path: '/admin/financial-admin/purchase-orders', permission: 'PURCHASE_ORDER_VIEW' },
        { icon: <Car size={20} />, label: t('sidebar.items.manageVehicles'), path: '/admin/financial-admin/vehicles', permission: 'VEHICLE_VIEW' },
        { icon: <Car size={20} />, label: 'Vehicle Lease Settings', path: '/admin/financial-admin/vehicle-lease-settings', permission: 'LEASE_VIEW' },
        { icon: <Users size={20} />, label: t('sidebar.items.drivers'), path: '/admin/financial-admin/drivers', permission: 'DRIVER_VIEW' },
        { icon: <BarChart3 size={20} />, label: 'Fleet Performance', path: '/admin/financial-admin/driver-performance', permission: 'STAFF_PERFORMANCE_VIEW' },
    ];

    const financeItems = [
        { icon: <BarChart3 size={20} />, label: t('sidebar.items.financeDashboard'), path: '/admin/financial-admin/finance-dashboard', permission: 'REPORTS_VIEW' },
        { icon: <Calculator size={20} />, label: t('sidebar.items.taxManagement'), path: '/admin/financial-admin/taxes', permission: 'TAX_VIEW' },
        { icon: <BookMarked size={20} />, label: t('sidebar.items.chartOfAccounts'), path: '/admin/financial-admin/chart-of-accounts', permission: 'ACCOUNTING_CODE_VIEW' },
        { icon: <FileText size={20} />, label: t('sidebar.items.generalLedger'), path: '/admin/financial-admin/ledger', permission: 'LEDGER_VIEW' },
        { icon: <Receipt size={20} />, label: t('sidebar.items.purchaseBills'), path: '/admin/financial-admin/purchase-bills', permission: 'SERVICE_BILL_VIEW' },
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
                        <HasPermission key={i} permission={item.permission} mode="hide">
                            <SidebarItem
                                icon={item.icon}
                                label={item.label}
                                active={item.path ? isActive(item.path) : false}
                                onClick={item.path ? () => navigate(item.path) : undefined}
                            />
                        </HasPermission>
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
                    label={t('sidebar.items.financeOverview')}
                    active={location.pathname === '/admin/financial-admin'}
                    onClick={() => navigate('/admin/financial-admin')}
                />

                <div className="my-6 border-t border-dashed" style={{ borderColor: 'var(--border-main)' }} />

                <SidebarSection title={t('sidebar.sections.staffManagement')} items={adminItems} />
                <SidebarSection title={t('sidebar.sections.operations', 'Operations')} items={operationsItems} />
                <SidebarSection title={t('sidebar.sections.finance')} items={financeItems} />
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

export default FinancialAdminSidebar;
