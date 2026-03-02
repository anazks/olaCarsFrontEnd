import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Clock, ClipboardList, Wallet, BellRing, Settings, Menu, ShieldCheck, LogOut } from 'lucide-react';
import { removeToken } from '../../../utils/auth';

interface BranchManagerSidebarProps {
    isSidebarCollapsed?: boolean;
    toggleSidebar?: () => void;
}

const BranchManagerSidebar = ({ isSidebarCollapsed = false, toggleSidebar }: BranchManagerSidebarProps) => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

    const handleLogout = () => {
        removeToken();
        navigate('/admin/login');
    };

    const navItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Branch Overview', path: '/admin/branch-manager', exact: true },
        { icon: <Users size={20} />, label: 'My Team', path: '/admin/branch-manager/team' },
        { icon: <ShieldCheck size={20} />, label: 'Finance Staff', path: '/admin/branch-manager/manage-finance-staff' },
        { icon: <ShieldCheck size={20} />, label: 'Ground Ops Staff', path: '/admin/branch-manager/manage-operation-staff' },
        { icon: <Clock size={20} />, label: 'Shift Schedule' },
        { icon: <ClipboardList size={20} />, label: 'Task Assignments' },
        { icon: <Wallet size={20} />, label: 'Branch Revenue' },
        { icon: <BellRing size={20} />, label: 'Local Alerts' },
    ];

    const SidebarItem = ({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) => (
        <div
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-all mb-1 ${isSidebarCollapsed ? 'justify-center' : ''}`}
            style={{
                background: active ? 'rgba(200,230,0,0.1)' : 'transparent',
                color: active ? 'var(--lime)' : 'var(--sidebar-text)',
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--sidebar-hover)'; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            title={isSidebarCollapsed ? label : ''}
        >
            <span style={{ color: active ? 'var(--lime)' : 'inherit' }}>{icon}</span>
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

            {!isSidebarCollapsed && <div className="px-5 py-4 text-xs font-bold tracking-wider transition-colors" style={{ color: 'var(--text-main)' }}>L3: BRANCH MGR</div>}

            <div className="flex-1 overflow-y-auto px-3 mt-4 custom-scrollbar">
                {navItems.map((item, i) => (
                    <SidebarItem
                        key={i}
                        icon={item.icon}
                        label={item.label}
                        active={item.path ? isActive(item.path) : false}
                        onClick={item.path ? () => navigate(item.path) : undefined}
                    />
                ))}
            </div>

            <div className="p-4 border-t space-y-1" style={{ borderColor: 'var(--border-main)' }}>
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

export default BranchManagerSidebar;
