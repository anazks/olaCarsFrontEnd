import { KeySquare, CheckSquare, Sparkles, Navigation2, FilePlus, Settings } from 'lucide-react';

const BranchOpStaffSidebar = () => {
    return (
        <aside className="w-64 h-full flex flex-col flex-shrink-0" style={{ background: '#0A0A0A', borderRight: '1px solid #2A2A2A' }}>
            <div className="h-20 flex items-center px-6 border-b" style={{ borderColor: '#2A2A2A' }}>
                <span className="text-xl font-bold tracking-wide">OLA <span style={{ color: '#C8E600' }}>CARS</span></span>
            </div>

            <div className="px-5 py-4 text-xs font-bold text-gray-500 tracking-wider">L4: OPS STAFF</div>

            <div className="flex-1 overflow-y-auto px-3">
                {[
                    { icon: <CheckSquare size={20} />, label: 'Daily Tasks', active: true },
                    { icon: <KeySquare size={20} />, label: 'Driver Handovers' },
                    { icon: <Sparkles size={20} />, label: 'Cleaning Schedule' },
                    { icon: <Navigation2 size={20} />, label: 'Vehicle Check-in' },
                    { icon: <FilePlus size={20} />, label: 'Log Damage' },
                ].map((item, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-colors mb-1"
                        style={{
                            background: item.active ? 'rgba(200,230,0,0.1)' : 'transparent',
                            color: item.active ? '#C8E600' : '#9ca3af',
                        }}
                    >
                        <span>{item.icon}</span>
                        <span className="font-medium text-sm">{item.label}</span>
                    </div>
                ))}
            </div>

            <div className="p-4 border-t" style={{ borderColor: '#2A2A2A' }}>
                <div className="flex items-center gap-3 cursor-pointer text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
                    <Settings size={20} />
                    <span className="text-sm font-medium">Settings</span>
                </div>
            </div>
        </aside>
    );
};

export default BranchOpStaffSidebar;
