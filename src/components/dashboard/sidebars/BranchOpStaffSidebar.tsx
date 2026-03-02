import { KeySquare, CheckSquare, Sparkles, Navigation2, FilePlus, Settings, Menu } from 'lucide-react';

interface BranchOpStaffSidebarProps {
    isSidebarCollapsed?: boolean;
    toggleSidebar?: () => void;
}

const BranchOpStaffSidebar = ({ isSidebarCollapsed = false, toggleSidebar }: BranchOpStaffSidebarProps) => {
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

            {!isSidebarCollapsed && <div className="px-5 py-4 text-xs font-bold tracking-wider transition-colors" style={{ color: 'var(--text-main)' }}>L4: OPS STAFF</div>}

            <div className="flex-1 overflow-y-auto px-3 mt-4 custom-scrollbar">
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
                            color: item.active ? 'var(--lime)' : 'var(--sidebar-text)',
                        }}
                        onMouseEnter={(e) => { if (!item.active) e.currentTarget.style.background = 'var(--sidebar-hover)'; }}
                        onMouseLeave={(e) => { if (!item.active) e.currentTarget.style.background = 'transparent'; }}
                    >
                        <span style={{ color: item.active ? 'var(--lime)' : 'inherit' }}>{item.icon}</span>
                        {!isSidebarCollapsed && <span className="font-medium text-sm whitespace-nowrap overflow-hidden">{item.label}</span>}
                    </div>
                ))}
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

export default BranchOpStaffSidebar;
