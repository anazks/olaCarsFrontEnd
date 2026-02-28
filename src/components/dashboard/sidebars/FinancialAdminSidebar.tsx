import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, DollarSign, PieChart, Receipt, FileText, Banknote, ShieldAlert, Settings, Menu, Globe, Building2 } from 'lucide-react';

interface FinancialAdminSidebarProps {
    isSidebarCollapsed?: boolean;
    toggleSidebar?: () => void;
}

const FinancialAdminSidebar = ({ isSidebarCollapsed = false, toggleSidebar }: FinancialAdminSidebarProps) => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

    const navItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Finance Overview', path: '/admin/financial-admin', exact: true },
        { icon: <Globe size={20} />, label: 'Manage Country Managers', path: '/admin/financial-admin/manage-country-managers' },
        { icon: <Building2 size={20} />, label: 'Manage Branches', path: '/admin/financial-admin/manage-branches' },
        { icon: <DollarSign size={20} />, label: 'Revenue Streams' },
        { icon: <PieChart size={20} />, label: 'Profit Analysis' },
        { icon: <Receipt size={20} />, label: 'Billing & Invoices' },
        { icon: <FileText size={20} />, label: 'Tax Compliance' },
        { icon: <Banknote size={20} />, label: 'Payout Registry' },
        { icon: <ShieldAlert size={20} />, label: 'Risk Audit' },
    ];

    return (
        <aside
            className="w-full h-full flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out"
            style={{ background: '#0A0A0A', borderRight: '1px solid #2A2A2A' }}
        >
            <div className={`h-20 flex items-center justify-between border-b ${isSidebarCollapsed ? 'px-0 justify-center' : 'px-6'}`} style={{ borderColor: '#2A2A2A' }}>
                {!isSidebarCollapsed && (
                    <span className="text-xl font-bold tracking-wide">
                        OLA <span style={{ color: '#C8E600' }}>CARS</span>
                    </span>
                )}

                <button
                    onClick={toggleSidebar}
                    className={`p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer ${isSidebarCollapsed ? 'ml-4' : 'ml-2'}`}
                >
                    <Menu size={24} />
                </button>
            </div>

            {!isSidebarCollapsed && <div className="px-5 py-4 text-xs font-bold text-gray-500 tracking-wider">L2: FIN ADMIN</div>}

            <div className="flex-1 overflow-y-auto px-3 mt-4">
                {navItems.map((item, i) => {
                    const active = item.path ? (item.exact ? location.pathname === item.path : isActive(item.path)) : false;
                    return (
                        <div
                            key={i}
                            onClick={item.path ? () => navigate(item.path) : undefined}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-all mb-1 ${isSidebarCollapsed ? 'justify-center' : ''}`}
                            title={isSidebarCollapsed ? item.label : ''}
                            style={{
                                background: active ? 'rgba(200,230,0,0.1)' : 'transparent',
                                color: active ? '#C8E600' : '#9ca3af',
                            }}
                        >
                            <span>{item.icon}</span>
                            {!isSidebarCollapsed && <span className="font-medium text-sm whitespace-nowrap overflow-hidden">{item.label}</span>}
                        </div>
                    );
                })}
            </div>

            <div className="p-4 border-t" style={{ borderColor: '#2A2A2A' }}>
                <div
                    className={`flex items-center gap-3 cursor-pointer text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5 ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    title={isSidebarCollapsed ? "Settings" : ""}
                >
                    <Settings size={20} />
                    {!isSidebarCollapsed && <span className="text-sm font-medium">Settings</span>}
                </div>
            </div>
        </aside>
    );
};

export default FinancialAdminSidebar;
