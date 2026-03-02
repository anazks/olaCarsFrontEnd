import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Map, FileCheck, Building2, TrendingUp, AlertOctagon, Settings, Menu, UserCheck, ShieldCheck } from 'lucide-react';

interface CountryManagerSidebarProps {
    isSidebarCollapsed?: boolean;
    toggleSidebar?: () => void;
}

const CountryManagerSidebar = ({ isSidebarCollapsed = false, toggleSidebar }: CountryManagerSidebarProps) => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

    const navItems = [
        { icon: <LayoutDashboard size={20} />, label: 'National Dashboard', path: '/admin/country-manager', exact: true },
        { icon: <Map size={20} />, label: 'Regional Performance', path: '/admin/country-manager/regional-performance' },
        { icon: <Building2 size={20} />, label: 'Manage Branches', path: '/admin/country-manager/manage-branches' },
        { icon: <UserCheck size={20} />, label: 'Branch Managers', path: '/admin/country-manager/manage-branch-managers' },
        { icon: <ShieldCheck size={20} />, label: 'Finance Staff', path: '/admin/country-manager/manage-finance-staff' },
        { icon: <ShieldCheck size={20} />, label: 'Ground Ops Staff', path: '/admin/country-manager/manage-operation-staff' },
        { icon: <TrendingUp size={20} />, label: 'Revenue & Growth', path: '/admin/country-manager/revenue-growth' },
        { icon: <FileCheck size={20} />, label: 'Compliance Reports', path: '/admin/country-manager/compliance-reports' },
        { icon: <AlertOctagon size={20} />, label: 'Critical Escalations', path: '/admin/country-manager/critical-escalations' },
    ];

    return (
        <aside
            className="w-full h-full flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out"
            style={{ background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-main)' }}
        >
            <div className={`h-20 flex items-center justify-between border-b ${isSidebarCollapsed ? 'px-0 justify-center' : 'px-6'}`} style={{ borderColor: 'var(--border-main)' }}>
                {!isSidebarCollapsed && (
                    <span className="text-xl font-bold tracking-wide transition-colors" style={{ color: 'var(--lime)' }}>
                        OLA <span style={{ color: 'var(--text-main)' }}>CARS</span>
                    </span>
                )}

                <button
                    onClick={toggleSidebar}
                    className={`p-2 rounded-lg transition-all cursor-pointer ${isSidebarCollapsed ? 'ml-4' : 'ml-2'}`}
                    style={{ color: 'var(--sidebar-text)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sidebar-hover)'; e.currentTarget.style.color = 'var(--lime)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-text)'; }}
                >
                    <Menu size={24} />
                </button>
            </div>

            {!isSidebarCollapsed && <div className="px-5 py-4 text-xs font-bold tracking-wider transition-colors" style={{ color: 'var(--text-main)' }}>L2: COUNTRY DIR</div>}

            <div className="flex-1 overflow-y-auto px-3 mt-4 custom-scrollbar">
                {navItems.map((item, i) => {
                    const active = item.path && item.path !== '#' ? (item.exact ? location.pathname === item.path : isActive(item.path)) : false;
                    return (
                        <div
                            key={i}
                            onClick={item.path && item.path !== '#' ? () => navigate(item.path) : undefined}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-all mb-1 ${isSidebarCollapsed ? 'justify-center' : ''}`}
                            title={isSidebarCollapsed ? item.label : ''}
                            style={{
                                background: active ? 'rgba(200,230,0,0.1)' : 'transparent',
                                color: active ? 'var(--lime)' : 'var(--sidebar-text)',
                            }}
                            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--sidebar-hover)'; }}
                            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                        >
                            <span style={{ color: active ? 'var(--lime)' : 'inherit' }}>{item.icon}</span>
                            {!isSidebarCollapsed && <span className="font-medium text-sm whitespace-nowrap overflow-hidden">{item.label}</span>}
                        </div>
                    );
                })}
            </div>

            <div className="p-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                <div
                    className={`flex items-center gap-3 cursor-pointer transition-all p-2 rounded-lg ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    style={{ color: 'var(--sidebar-text)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sidebar-hover)'; e.currentTarget.style.color = 'var(--lime)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-text)'; }}
                    title={isSidebarCollapsed ? "Settings" : ""}
                >
                    <Settings size={20} />
                    {!isSidebarCollapsed && <span className="text-sm font-medium">Settings</span>}
                </div>
            </div>
        </aside>
    );
};

export default CountryManagerSidebar;
