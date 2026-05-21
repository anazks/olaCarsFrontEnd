import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Wrench, CheckCircle, Package, Settings, ArrowLeft,
    DollarSign, ClipboardList, AlertCircle, Calendar, ShieldCheck
} from 'lucide-react';
import { getVehicleById } from '../../../services/vehicleService';
import { getWorkOrdersForVehicle } from '../../../services/workOrderService';
import type { Vehicle } from '../../../services/vehicleService';
import type { WorkOrder } from '../../../services/workOrderService';

interface TimelineEvent {
    id: string;
    type: 'work_order' | 'task' | 'part' | 'status_change';
    title: string;
    subtitle?: string;
    description?: string;
    date: string;
    technician?: string;
    cost?: number;
    meta?: any;
}

const cardStyle = { background: 'var(--bg-card)', borderColor: 'var(--border-main)' };
const cardClass = 'rounded-2xl border p-6';

const VehicleWorkshopHistory = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Filters
    const [filterType, setFilterType] = useState<'all' | 'work_order' | 'task' | 'part' | 'status_change'>('all');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const [vData, woData] = await Promise.all([
                    getVehicleById(id),
                    getWorkOrdersForVehicle(id)
                ]);
                setVehicle(vData);
                setWorkOrders(woData || []);
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Failed to load workshop history');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleBack = () => {
        navigate(-1);
    };

    // Parse Work Orders into detailed Timeline Events
    const getTimelineEvents = (): TimelineEvent[] => {
        const events: TimelineEvent[] = [];

        workOrders.forEach((wo) => {
            // 1. Work Order Created Event
            events.push({
                id: `wo-create-${wo._id}`,
                type: 'work_order',
                title: `Work Order Opened: ${wo.workOrderNumber}`,
                subtitle: `${wo.workOrderType} • Priority: ${wo.priority}`,
                description: wo.faultDescription,
                date: wo.createdAt,
                technician: wo.assignedTechnician?.name,
                cost: wo.actualTotalCost || wo.estimatedTotalCost,
                meta: { status: wo.status }
            });

            // 2. Tasks Completed / Done
            if (wo.tasks && Array.isArray(wo.tasks)) {
                wo.tasks.forEach((task) => {
                    events.push({
                        id: `task-${task._id}`,
                        type: 'task',
                        title: `Task: ${task.description}`,
                        subtitle: `Category: ${task.category || 'General'} • Status: ${task.status}`,
                        description: task.notes,
                        date: task.completedAt || task.notes ? wo.updatedAt : wo.createdAt,
                        technician: wo.assignedTechnician?.name,
                        cost: task.actualHours ? task.actualHours * 150 : undefined, // Sample labor rate calculation
                        meta: { status: task.status }
                    });
                });
            }

            // 3. Parts Installed / Reinstalled
            if (wo.parts && Array.isArray(wo.parts)) {
                wo.parts.forEach((part) => {
                    events.push({
                        id: `part-${part._id}`,
                        type: 'part',
                        title: `Part Installed: ${part.partName}`,
                        subtitle: `Part No: ${part.partNumber || '—'} • Qty: ${part.quantity} • Source: ${part.source}`,
                        description: `Status: ${part.status}`,
                        date: part.receivedDate || wo.updatedAt,
                        technician: wo.assignedTechnician?.name,
                        cost: part.totalCost,
                        meta: { status: part.status }
                    });
                });
            }

            // 4. Status History Transitions
            if (wo.statusHistory && Array.isArray(wo.statusHistory)) {
                wo.statusHistory.forEach((hist) => {
                    events.push({
                        id: `hist-${hist._id}`,
                        type: 'status_change',
                        title: `Status Updated to ${hist.status.replace(/_/g, ' ')}`,
                        subtitle: `Updated by ${hist.changedByRole}`,
                        description: hist.notes,
                        date: hist.timestamp,
                        meta: { status: hist.status }
                    });
                });
            }
        });

        // Filter events
        const filtered = filterType === 'all' 
            ? events 
            : events.filter(e => e.type === filterType);

        // Sort events
        return filtered.sort((a, b) => {
            const timeA = new Date(a.date).getTime();
            const timeB = new Date(b.date).getTime();
            return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        });
    };

    // Calculate aggregated stats
    const totalWorkOrders = workOrders.length;
    const completedTasks = workOrders.reduce((sum, wo) => 
        sum + (wo.tasks?.filter(t => t.status === 'COMPLETED').length || 0), 0
    );
    const partsReplaced = workOrders.reduce((sum, wo) => 
        sum + (wo.parts?.filter(p => p.status === 'INSTALLED').length || 0), 0
    );
    const totalCost = workOrders.reduce((sum, wo) => sum + (wo.actualTotalCost || 0), 0);

    const timelineEvents = getTimelineEvents();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime"></div>
            </div>
        );
    }

    if (error || !vehicle) {
        return (
            <div className="container-responsive p-6">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={handleBack} className="p-2 rounded-xl border transition-all hover:bg-white/5 cursor-pointer" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Error Loading History</h1>
                </div>
                <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-400 text-sm">
                    {error || 'Vehicle not found'}
                </div>
            </div>
        );
    }

    const eventIcons = {
        work_order: <Wrench size={14} className="text-[#C8E600]" />,
        task: <CheckCircle size={14} className="text-emerald-400" />,
        part: <Package size={14} className="text-blue-400" />,
        status_change: <Settings size={14} className="text-amber-400" />
    };

    const eventColorClasses = {
        work_order: 'bg-[#C8E600]/10 border-[#C8E600]/20 text-[#C8E600]',
        task: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        part: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
        status_change: 'bg-amber-500/10 border-amber-500/20 text-amber-400'
    };

    return (
        <div className="container-responsive space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={handleBack} className="p-2 rounded-xl border transition-all hover:bg-white/5 cursor-pointer" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>
                            Workshop History
                        </h1>
                        <p className="text-sm font-mono mt-0.5" style={{ color: 'var(--text-dim)' }}>
                            {vehicle.basicDetails?.make} {vehicle.basicDetails?.model} {vehicle.basicDetails?.year} • {t('management.vehicles.vehicleDetail.labels.vin')}: {vehicle.basicDetails?.vin || '—'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={cardClass} style={cardStyle}>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Total Work Orders</span>
                        <ClipboardList className="text-[#C8E600]" size={18} />
                    </div>
                    <p className="text-2xl font-bold mt-2" style={{ color: 'var(--text-main)' }}>{totalWorkOrders}</p>
                </div>
                <div className={cardClass} style={cardStyle}>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Completed Tasks</span>
                        <CheckCircle className="text-emerald-400" size={18} />
                    </div>
                    <p className="text-2xl font-bold mt-2" style={{ color: 'var(--text-main)' }}>{completedTasks}</p>
                </div>
                <div className={cardClass} style={cardStyle}>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Installed Parts</span>
                        <Package className="text-blue-400" size={18} />
                    </div>
                    <p className="text-2xl font-bold mt-2" style={{ color: 'var(--text-main)' }}>{partsReplaced}</p>
                </div>
                <div className={cardClass} style={cardStyle}>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Total Expense</span>
                        <DollarSign className="text-amber-400" size={18} />
                    </div>
                    <p className="text-2xl font-bold mt-2" style={{ color: 'var(--text-main)' }}>KES {totalCost.toLocaleString()}</p>
                </div>
            </div>

            {/* Main Timeline Control Panel */}
            <div className={cardClass} style={cardStyle}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-white/5 pb-4">
                    <div className="flex flex-wrap gap-2">
                        {(['all', 'work_order', 'task', 'part', 'status_change'] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                    filterType === type 
                                        ? 'bg-[#C8E600] text-black border-[#C8E600]' 
                                        : 'hover:bg-white/5 text-dim border-transparent'
                                }`}
                            >
                                {type === 'all' && 'All History'}
                                {type === 'work_order' && 'Work Orders'}
                                {type === 'task' && 'Tasks Done'}
                                {type === 'part' && 'Parts Installed'}
                                {type === 'status_change' && 'Status Logs'}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold hover:bg-white/5 transition-all cursor-pointer"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <Calendar size={14} />
                            {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
                        </button>
                    </div>
                </div>

                {/* Timeline Render */}
                {timelineEvents.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                        <AlertCircle className="mx-auto text-dim" size={32} style={{ color: 'var(--text-dim)' }} />
                        <p className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>No events found matching current criteria.</p>
                    </div>
                ) : (
                    <div className="relative pl-6 sm:pl-8 border-l border-white/5 space-y-8 py-2 ml-4">
                        {timelineEvents.map((event) => {
                            return (
                                <div key={event.id} className="relative group">
                                    {/* Line Bullet Node */}
                                    <div className={`absolute -left-10 sm:-left-12 top-1.5 w-8 h-8 rounded-full border flex items-center justify-center shrink-0 z-10 transition-transform group-hover:scale-115 ${eventColorClasses[event.type]}`}>
                                        {eventIcons[event.type]}
                                    </div>

                                    {/* Timeline Item Container */}
                                    <div 
                                        className="rounded-2xl border p-5 space-y-3 hover:border-white/10 transition-all" 
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                    >
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                            <div>
                                                <h4 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>
                                                    {event.title}
                                                </h4>
                                                <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                                                    {event.subtitle}
                                                </p>
                                            </div>
                                            <div className="text-right sm:text-right shrink-0 flex items-center gap-2 sm:flex-col sm:gap-0">
                                                <span className="text-[10px] font-bold block" style={{ color: 'var(--text-dim)' }}>
                                                    {new Date(event.date).toLocaleString()}
                                                </span>
                                                {event.cost !== undefined && event.cost > 0 && (
                                                    <span className="text-xs font-bold text-lime mt-0.5 block">
                                                        KES {event.cost.toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {event.description && (
                                            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                                                {event.description}
                                            </p>
                                        )}

                                        {event.technician && (
                                            <div className="flex items-center gap-1.5 pt-2 border-t border-white/5 text-[10px] font-bold text-dim" style={{ color: 'var(--text-dim)' }}>
                                                <ShieldCheck size={12} className="text-lime" /> Assigned Tech: {event.technician}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default VehicleWorkshopHistory;
