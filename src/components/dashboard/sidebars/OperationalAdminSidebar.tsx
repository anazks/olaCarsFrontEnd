import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Car, Wrench, MapPin, Users, CalendarSync, Settings, Menu, Globe } from 'lucide-react';

interface OperationalAdminSidebarProps {
    isSidebarCollapsed?: boolean;
    toggleSidebar?: () => void;
}

const OperationalAdminSidebar = ({ isSidebarCollapsed = false, toggleSidebar }: OperationalAdminSidebarProps) => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

    const navItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Ops Overview', path: '/admin/operational-admin', exact: true },
        { icon: <Globe size={20} />, label: 'Manage Country Managers', path: '/admin/operational-admin/manage-country-managers' },
        { icon: <MapPin size={20} />, label: 'Live GPS Tracking' },
        { icon: <Car size={20} />, label: 'Fleet Inventory' },
        { icon: <Wrench size={20} />, label: 'Maintenance Hub' },
        { icon: <Users size={20} />, label: 'Driver Roster' },
        { icon: <CalendarSync size={20} />, label: 'Assignments' },
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

            {!isSidebarCollapsed && <div className="px-5 py-4 text-xs font-bold text-gray-500 tracking-wider">L2: OPS ADMIN</div>}

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
                    title={isSidebarCollapsed ? "Ops Settings" : ""}
                >
                    <Settings size={20} />
                    {!isSidebarCollapsed && <span className="text-sm font-medium">Ops Settings</span>}
                </div>
            </div>
        </aside>
    );
};

export default OperationalAdminSidebar;
