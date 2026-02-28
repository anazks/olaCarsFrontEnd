import { KeySquare, CheckSquare, Sparkles, Navigation2, FilePlus, Settings, Menu } from 'lucide-react';

interface BranchOpStaffSidebarProps {
    isSidebarCollapsed?: boolean;
    toggleSidebar?: () => void;
}

const BranchOpStaffSidebar = ({ isSidebarCollapsed = false, toggleSidebar }: BranchOpStaffSidebarProps) => {
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

            {!isSidebarCollapsed && <div className="px-5 py-4 text-xs font-bold text-gray-500 tracking-wider">L4: OPS STAFF</div>}

            <div className="flex-1 overflow-y-auto px-3 mt-4">
                {[
                    { icon: <CheckSquare size={20} />, label: 'Daily Tasks', active: true },
                    { icon: <KeySquare size={20} />, label: 'Driver Handovers' },
                    { icon: <Sparkles size={20} />, label: 'Cleaning Schedule' },
                    { icon: <Navigation2 size={20} />, label: 'Vehicle Check-in' },
                    { icon: <FilePlus size={20} />, label: 'Log Damage' },
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

export default BranchOpStaffSidebar;
