import { LayoutDashboard, Users, CalendarCheck, ClipboardList, Wallet, BellRing, Settings, Menu } from 'lucide-react';

interface BranchManagerSidebarProps {
    isSidebarCollapsed?: boolean;
    toggleSidebar?: () => void;
}

const BranchManagerSidebar = ({ isSidebarCollapsed = false, toggleSidebar }: BranchManagerSidebarProps) => {
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

            {!isSidebarCollapsed && <div className="px-5 py-4 text-xs font-bold text-gray-500 tracking-wider">L3: BRANCH MGR</div>}

            <div className="flex-1 overflow-y-auto px-3 mt-4">
                {[
                    { icon: <LayoutDashboard size={20} />, label: 'Branch Hub', active: true },
                    { icon: <Users size={20} />, label: 'Staff Roster' },
                    { icon: <CalendarCheck size={20} />, label: 'Local Fleet Avail' },
                    { icon: <ClipboardList size={20} />, label: 'Task Assignments' },
                    { icon: <Wallet size={20} />, label: 'Branch Revenue' },
                    { icon: <BellRing size={20} />, label: 'Local Alerts' },
                ].map((item, i) => (
                    <div
                        key={i}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-all mb-1 ${isSidebarCollapsed ? 'justify-center' : ''}`}
                        title={isSidebarCollapsed ? item.label : ''}
                        style={{
                            background: item.active ? 'rgba(200,230,0,0.1)' : 'transparent',
                            color: item.active ? '#C8E600' : '#9ca3af',
                        }}
                    >
                        <span>{item.icon}</span>
                        {!isSidebarCollapsed && <span className="font-medium text-sm whitespace-nowrap overflow-hidden">{item.label}</span>}
                    </div>
                ))}
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

export default BranchManagerSidebar;
