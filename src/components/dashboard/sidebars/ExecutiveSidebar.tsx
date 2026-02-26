import { LayoutDashboard, CarFront, FileText, AlertTriangle, ListTodo, Calendar, ShieldCheck, TrendingUp, Settings } from 'lucide-react';

const navItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Executive Dashboard', active: true },
    { icon: <TrendingUp size={20} />, label: 'Collections Dashboard' },
    { icon: <ShieldCheck size={20} />, label: 'GPS & Risk Dashboard' },
];

const alertItems = [
    { icon: <AlertTriangle size={20} />, label: 'View alerts' },
    { icon: <FileText size={20} />, label: 'Task details' },
];

const taskItems = [
    { icon: <ListTodo size={20} />, label: 'Pending Tasks' },
    { icon: <FileText size={20} />, label: 'Task details' },
];

const agendaItems = [
    { icon: <CarFront size={20} />, label: 'Vehicle List' },
    { icon: <FileText size={20} />, label: 'Register Vehicle' },
    { icon: <Calendar size={20} />, label: 'Import Records' },
    { icon: <FileText size={20} />, label: 'Assignments' },
    { icon: <ShieldCheck size={20} />, label: 'Insurance & Claims' },
];

const SidebarItem = ({ icon, label, active = false }: { icon: React.ReactNode; label: string; active?: boolean }) => (
    <div
        className="flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer transition-colors mb-1"
        style={{
            background: active ? 'rgba(200,230,0,0.1)' : 'transparent',
            color: active ? '#C8E600' : '#9ca3af',
        }}
    >
        <span className={active ? 'text-lime' : 'text-gray-400'}>{icon}</span>
        <span className="font-medium text-sm">{label}</span>
    </div>
);

const SidebarSection = ({ title, items }: { title: string; items: any[] }) => (
    <div className="mb-6">
        <div className="px-4 mb-2 flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h4>
            <span className="text-gray-500 text-xs cursor-pointer">›</span>
        </div>
        <div className="space-y-1">
            {items.map((item, i) => (
                <SidebarItem key={i} {...item} />
            ))}
        </div>
    </div>
);

const ExecutiveSidebar = () => {
    return (
        <aside
            className="w-64 h-full flex flex-col flex-shrink-0"
            style={{ background: '#0A0A0A', borderRight: '1px solid #2A2A2A' }}
        >
            {/* Logo */}
            <div className="h-20 flex items-center px-6 border-b" style={{ borderColor: '#2A2A2A' }}>
                <span className="text-xl font-bold tracking-wide">
                    OLA <span style={{ color: '#C8E600' }}>CARS</span>
                </span>
            </div>

            {/* Scrollable Nav Area */}
            <div className="flex-1 overflow-y-auto py-6 custom-scrollbar px-3">
                <SidebarSection title="Operations Management" items={navItems} />
                <SidebarSection title="Alert Center" items={alertItems} />
                <SidebarSection title="Tasks" items={taskItems} />
                <SidebarSection title="Agenda & Calendar" items={agendaItems} />
            </div>

            {/* Footer Profile/Settings */}
            <div className="p-4 border-t" style={{ borderColor: '#2A2A2A' }}>
                <div className="flex items-center gap-3 cursor-pointer text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
                    <Settings size={20} />
                    <span className="text-sm font-medium">Dashboard Settings</span>
                </div>
            </div>
        </aside>
    );
};

export default ExecutiveSidebar;
