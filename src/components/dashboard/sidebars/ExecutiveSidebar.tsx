import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, CarFront, FileText, AlertTriangle, ListTodo, Calendar, ShieldCheck, TrendingUp, Settings, Shield, DollarSign, LogOut, Menu, Globe, Building2 } from 'lucide-react';
import { removeToken } from '../../../utils/auth';

interface ExecutiveSidebarProps {
    isSidebarCollapsed?: boolean;
    toggleSidebar?: () => void;
}

const ExecutiveSidebar = ({ isSidebarCollapsed = false, toggleSidebar }: ExecutiveSidebarProps) => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

    const handleLogout = () => {
        removeToken();
        navigate('/admin/login');
    };

    const navItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/admin/admin' },
        { icon: <Shield size={20} />, label: 'Operational Admins', path: '/admin/admin/manage-operational-admins' },
        { icon: <DollarSign size={20} />, label: 'Financial Admins', path: '/admin/admin/manage-financial-admins' },
        { icon: <Globe size={20} />, label: 'Country Managers', path: '/admin/admin/manage-country-managers' },
        { icon: <Building2 size={20} />, label: 'Manage Branches', path: '/admin/admin/manage-branches' },
    ];

    const monitoringItems = [
        { icon: <TrendingUp size={20} />, label: 'Collections Dashboard' },
        { icon: <ShieldCheck size={20} />, label: 'GPS & Risk Dashboard' },
    ];

    const alertItems = [
        { icon: <AlertTriangle size={20} />, label: 'View Alerts' },
        { icon: <FileText size={20} />, label: 'Task Details' },
    ];

    const taskItems = [
        { icon: <ListTodo size={20} />, label: 'Pending Tasks' },
        { icon: <FileText size={20} />, label: 'Task Details' },
    ];

    const agendaItems = [
        { icon: <CarFront size={20} />, label: 'Vehicle List' },
        { icon: <FileText size={20} />, label: 'Register Vehicle' },
        { icon: <Calendar size={20} />, label: 'Import Records' },
        { icon: <FileText size={20} />, label: 'Assignments' },
        { icon: <ShieldCheck size={20} />, label: 'Insurance & Claims' },
    ];

    const SidebarItem = ({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) => (
        <div
            onClick={onClick}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-all mb-1 ${isSidebarCollapsed ? 'justify-center' : ''}`}
            style={{
                background: active ? 'rgba(200,230,0,0.1)' : 'transparent',
                color: active ? '#C8E600' : '#9ca3af',
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            title={isSidebarCollapsed ? label : ''}
        >
            <span className={active ? 'text-lime' : 'text-gray-400'}>{icon}</span>
            {!isSidebarCollapsed && <span className="font-medium text-sm whitespace-nowrap overflow-hidden">{label}</span>}
        </div>
    );

    const SidebarSection = ({ title, items }: { title: string; items: any[] }) => (
        <div className="mb-6">
            {!isSidebarCollapsed && (
                <div className="px-4 mb-2 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h4>
                    <span className="text-gray-500 text-xs cursor-pointer">›</span>
                </div>
            )}
            <div className="space-y-1">
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

    return (
        <aside
            className="w-full h-full flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out"
            style={{ background: '#0A0A0A', borderRight: '1px solid #2A2A2A' }}
        >
            {/* Logo & Toggle */}
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

            {/* Scrollable Nav Area */}
            <div className="flex-1 overflow-y-auto py-6 custom-scrollbar px-3">
                <SidebarSection title="Staff Management" items={navItems} />
                <SidebarSection title="Monitoring" items={monitoringItems} />
                <SidebarSection title="Alert Center" items={alertItems} />
                <SidebarSection title="Tasks" items={taskItems} />
                <SidebarSection title="Agenda & Calendar" items={agendaItems} />
            </div>

            {/* Footer */}
            <div className="p-4 border-t space-y-1" style={{ borderColor: '#2A2A2A' }}>
                <div
                    className={`flex items-center gap-3 cursor-pointer text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5 ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    title={isSidebarCollapsed ? "Dashboard Settings" : ""}
                >
                    <Settings size={20} />
                    {!isSidebarCollapsed && <span className="text-sm font-medium">Dashboard Settings</span>}
                </div>
                <div
                    onClick={handleLogout}
                    className={`flex items-center gap-3 cursor-pointer text-gray-400 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-red-500/5 ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    title={isSidebarCollapsed ? "Logout" : ""}
                >
                    <LogOut size={20} />
                    {!isSidebarCollapsed && <span className="text-sm font-medium">Logout</span>}
                </div>
            </div>
        </aside>
    );
};

export default ExecutiveSidebar;
