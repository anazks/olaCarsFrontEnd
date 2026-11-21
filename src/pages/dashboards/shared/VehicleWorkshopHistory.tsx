import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Wrench, CheckCircle, Package, Settings, ArrowLeft,
    DollarSign, ClipboardList, AlertCircle, Calendar, ShieldCheck,
    Gauge, Layers, Car, RotateCcw, Shield, Clock,
    AlertTriangle, CheckCircle2
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
    workOrderNumber?: string;
    workOrderType?: string;
    odometerAtEntry?: number;
    odometerAtRelease?: number;
    priority?: string;
    status?: string;
    tasks?: any[];
    parts?: any[];
}

const cardStyle = { background: 'var(--bg-card)', borderColor: 'var(--border-main)' };
const cardClass = 'rounded-2xl border p-6';

const WORK_ORDER_TYPE_CONFIG: Record<string, { label: string; badgeClass: string; icon: any; isPreventive: boolean }> = {
    PREVENTIVE: { label: 'Preventive Maintenance', badgeClass: 'bg-[#C8E600]/10 text-[#C8E600] border-[#C8E600]/30', icon: Wrench, isPreventive: true },
    INTERVAL_MAINTENANCE: { label: 'Interval Maintenance', badgeClass: 'bg-sky-500/10 text-sky-400 border-sky-500/30', icon: Clock, isPreventive: true },
    WEAR_ITEM: { label: 'Wear & Tear Maintenance', badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30', icon: Layers, isPreventive: false },
    CORRECTIVE: { label: 'Corrective Repair', badgeClass: 'bg-orange-500/10 text-orange-400 border-orange-500/30', icon: AlertTriangle, isPreventive: false },
    PRE_ENTRY: { label: 'Pre-Entry Inspection', badgeClass: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30', icon: ClipboardList, isPreventive: false },
    ACCIDENT: { label: 'Accident Repair', badgeClass: 'bg-red-500/10 text-red-400 border-red-500/30', icon: Car, isPreventive: false },
    RETURN_INSPECTION: { label: 'Return Inspection', badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30', icon: RotateCcw, isPreventive: false },
    RECALL: { label: 'Manufacturer Recall', badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30', icon: AlertCircle, isPreventive: false },
    SAFETY_PREP: { label: 'Safety Preparation', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: Shield, isPreventive: false },
    OTHER: { label: 'Other Workshop Service', badgeClass: 'bg-slate-500/10 text-slate-400 border-slate-500/30', icon: Settings, isPreventive: false },
};

const VehicleWorkshopHistory = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

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
            const typeConfig = WORK_ORDER_TYPE_CONFIG[wo.workOrderType] || {
                label: wo.workOrderType,
                badgeClass: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
                isPreventive: false
            };

            // 1. Work Order Created Event
            events.push({
                id: `wo-create-${wo._id}`,
                type: 'work_order',
                title: `Work Order: ${wo.workOrderNumber}`,
                subtitle: `${typeConfig.label} • Priority: ${wo.priority}`,
                description: wo.faultDescription || 'No initial fault description logged',
                date: wo.createdAt,
                technician: wo.assignedTechnician?.name,
                cost: wo.actualTotalCost || wo.estimatedTotalCost,
                workOrderNumber: wo.workOrderNumber,
                workOrderType: wo.workOrderType,
                odometerAtEntry: wo.odometerAtEntry,
                odometerAtRelease: wo.odometerAtRelease,
                priority: wo.priority,
                status: wo.status,
                tasks: wo.tasks,
                parts: wo.parts,
                meta: { status: wo.status }
            });

            // 2. Tasks Completed / Done
            if (wo.tasks && Array.isArray(wo.tasks)) {
                wo.tasks.forEach((task) => {
                    events.push({
                        id: `task-${task._id}`,
                        type: 'task',
                        title: `Task: ${task.description}`,
                        subtitle: `Work Order: ${wo.workOrderNumber} • Category: ${task.category || 'General'} • Status: ${task.status}`,
                        description: task.notes,
                        date: task.completedAt || (task.notes ? wo.updatedAt : wo.createdAt),
                        technician: wo.assignedTechnician?.name,
                        cost: task.actualHours ? task.actualHours * 150 : undefined,
                        meta: { status: task.status }
                    });
                });
            }

            // 3. Parts Installed
            if (wo.parts && Array.isArray(wo.parts)) {
                wo.parts.forEach((part) => {
                    events.push({
                        id: `part-${part._id}`,
                        type: 'part',
                        title: `Part: ${part.partName}`,
                        subtitle: `Work Order: ${wo.workOrderNumber} • Part No: ${part.partNumber || '—'} • Qty: ${part.quantity} • Source: ${part.source}`,
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
                        title: `Work Order ${wo.workOrderNumber}: Status Changed to ${hist.status.replace(/_/g, ' ')}`,
                        subtitle: `Updated by ${hist.changedByRole || 'Workshop Staff'}`,
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

    // Calculate aggregated KPIs
    const totalWorkOrders = workOrders.length;
    const preventiveWorkOrders = workOrders.filter(wo =>
        wo.workOrderType === 'PREVENTIVE' || wo.workOrderType === 'INTERVAL_MAINTENANCE'
    );
    const preventiveCount = preventiveWorkOrders.length;
    const repairsCount = totalWorkOrders - preventiveCount;

    // Last Service Odometer: read from vehicle's maintenanceDetails or from latest PREVENTIVE work order with odometer
    const latestPreventiveWithOdo = [...preventiveWorkOrders]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .find(wo => wo.odometerAtEntry && wo.odometerAtEntry > 0);

    const lastServiceOdometer = (vehicle as any)?.maintenanceDetails?.lastMaintenanceOdometer ||
        latestPreventiveWithOdo?.odometerAtEntry || 0;

    const completedTasks = workOrders.reduce((sum, wo) => 
        sum + (wo.tasks?.filter(t => t.status === 'COMPLETED').length || 0), 0
    );
    const partsReplaced = workOrders.reduce((sum, wo) => 
        sum + (wo.parts?.filter(p => p.status === 'INSTALLED').length || 0), 0
    );
    const totalCost = workOrders.reduce((sum, wo) => sum + (wo.actualTotalCost || wo.estimatedTotalCost || 0), 0);

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
                            Vehicle Workshop History & Maintenance Log
                        </h1>
                        <p className="text-sm font-mono mt-0.5" style={{ color: 'var(--text-dim)' }}>
                            {vehicle.basicDetails?.make} {vehicle.basicDetails?.model} {vehicle.basicDetails?.year} • Plate: <span className="font-bold text-white">{vehicle.legalDocs?.registrationNumber || vehicle.basicDetails?.plateNumber || '—'}</span> • VIN: {vehicle.basicDetails?.vin || '—'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Dashboard - Updated with Workshop KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Work Orders & Types */}
                <div className={cardClass} style={cardStyle}>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Total Work Orders</span>
                        <ClipboardList className="text-[#C8E600]" size={18} />
                    </div>
                    <p className="text-2xl font-bold mt-2" style={{ color: 'var(--text-main)' }}>{totalWorkOrders}</p>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5 text-[10px] font-semibold" style={{ color: 'var(--text-dim)' }}>
                        <span className="text-[#C8E600] font-bold">{preventiveCount} Preventive</span>
                        <span>•</span>
                        <span className="text-orange-400 font-bold">{repairsCount} Repairs / Other</span>
                    </div>
                </div>

                {/* 2. Last Service Odometer */}
                <div className={cardClass} style={cardStyle}>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Last Service Odometer</span>
                        <Gauge className="text-emerald-400" size={18} />
                    </div>
                    <p className="text-2xl font-bold mt-2 font-mono" style={{ color: 'var(--text-main)' }}>
                        {lastServiceOdometer > 0 ? `${lastServiceOdometer.toLocaleString()} KM` : '0 KM'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/5 text-[10px] text-emerald-400 font-semibold">
                        <CheckCircle2 size={12} /> Synced via Preventive Maintenance
                    </div>
                </div>

                {/* 3. Tasks & Parts Installed */}
                <div className={cardClass} style={cardStyle}>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Tasks & Parts</span>
                        <Package className="text-blue-400" size={18} />
                    </div>
                    <p className="text-2xl font-bold mt-2" style={{ color: 'var(--text-main)' }}>
                        {completedTasks} <span className="text-sm font-normal text-dim">Tasks</span>
                    </p>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5 text-[10px] font-semibold" style={{ color: 'var(--text-dim)' }}>
                        <span className="text-blue-400 font-bold">{partsReplaced} Parts Installed</span>
                    </div>
                </div>

                {/* 4. Total Expense */}
                <div className={cardClass} style={cardStyle}>
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Total Expense</span>
                        <DollarSign className="text-amber-400" size={18} />
                    </div>
                    <p className="text-2xl font-bold mt-2 font-mono" style={{ color: 'var(--text-main)' }}>
                        KES {totalCost.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5 text-[10px] text-amber-400 font-semibold">
                        Actual & Estimated Costs
                    </div>
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
                                {type === 'work_order' && `Work Orders (${totalWorkOrders})`}
                                {type === 'task' && `Tasks Done (${completedTasks})`}
                                {type === 'part' && `Parts Installed (${partsReplaced})`}
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
                            const isWorkOrder = event.type === 'work_order';
                            const woTypeCfg = event.workOrderType ? (WORK_ORDER_TYPE_CONFIG[event.workOrderType] || { label: event.workOrderType, badgeClass: 'bg-white/10 text-white', isPreventive: false }) : null;

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
                                            <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h4 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>
                                                        {event.title}
                                                    </h4>
                                                    {woTypeCfg && (
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${woTypeCfg.badgeClass}`}>
                                                            {woTypeCfg.label}
                                                        </span>
                                                    )}
                                                    {event.priority && (
                                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                                            event.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                            event.priority === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                                            event.priority === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                                            'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                                        }`}>
                                                            {event.priority}
                                                        </span>
                                                    )}
                                                    {event.status && (
                                                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-dim">
                                                            {event.status}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
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

                                        {/* Work Order Special Card Section: Odometer & Stats */}
                                        {isWorkOrder && (
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-black/20 border border-white/5 text-xs">
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold tracking-wider text-dim block" style={{ color: 'var(--text-dim)' }}>
                                                        Odometer at Entry
                                                    </span>
                                                    <span className="font-mono font-bold text-[#C8E600]">
                                                        {event.odometerAtEntry ? `${event.odometerAtEntry.toLocaleString()} KM` : 'Not recorded'}
                                                    </span>
                                                    {woTypeCfg?.isPreventive && event.odometerAtEntry && (
                                                        <span className="text-[9px] text-emerald-400 block mt-0.5">✓ Synced Last Service Odo</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold tracking-wider text-dim block" style={{ color: 'var(--text-dim)' }}>
                                                        Tasks Included
                                                    </span>
                                                    <span className="font-semibold" style={{ color: 'var(--text-main)' }}>
                                                        {event.tasks?.length || 0} Task(s) ({event.tasks?.filter((t: any) => t.status === 'COMPLETED').length || 0} done)
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] uppercase font-bold tracking-wider text-dim block" style={{ color: 'var(--text-dim)' }}>
                                                        Parts Assigned
                                                    </span>
                                                    <span className="font-semibold" style={{ color: 'var(--text-main)' }}>
                                                        {event.parts?.length || 0} Part(s)
                                                    </span>
                                                </div>
                                            </div>
                                        )}

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
