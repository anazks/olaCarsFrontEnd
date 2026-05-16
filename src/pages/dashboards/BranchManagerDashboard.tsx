import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StatCard } from '../../components/dashboard/widgets/StatusCards';
import { Car, Users, ArrowRight, AlertTriangle, Clock, Calendar, MapPin, ChevronRight, Bell, ShieldAlert, Info, Zap } from 'lucide-react';
import { getAllVehicles } from '../../services/vehicleService';
import { getAllDrivers } from '../../services/driverService';
import { getActiveAlerts } from '../../services/alertService';
import { getAllEnquiries } from '../../services/enquiryService';
import { getBranchAccidentReports } from '../../services/accidentReportService';
import { getUser } from '../../utils/auth';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

const COLORS = ['var(--brand-lime)', '#4F46E5', '#F59E0B', '#EF4444', '#8B5CF6'];

const BranchManagerDashboard = () => {
    const { } = useTranslation();
    const navigate = useNavigate();
    const user = getUser();

    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [stats, setStats] = useState({
        totalVehicles: 0,
        availableVehicles: 0,
        totalDrivers: 0,
        activeAlerts: 0,
        totalComplaints: 0
    });
    const [vehicleStatusData, setVehicleStatusData] = useState<any[]>([]);
    const [handovers, setHandovers] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [todayAccidents, setTodayAccidents] = useState<any[]>([]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const branchId = user?.branchId;

                if (!branchId) {
                    setLoading(false);
                    return;
                }

                const [vehiclesRes, driversRes, alertsRes, enquiriesRes, accidentsRes] = await Promise.allSettled([
                    getAllVehicles({ limit: 1000, branch: branchId }),
                    getAllDrivers({ limit: 1000, branch: branchId }),
                    getActiveAlerts(),
                    getAllEnquiries({ branchId, limit: 1 }), // Just to get total if meta is provided, or fetch all
                    getBranchAccidentReports(branchId)
                ]);

                let totalV = 0;
                let availV = 0;
                let totalD = 0;
                let activeA = 0;
                let totalC = 0;
                const vDisplayCounts: Record<string, number> = { 'Available': 0, 'Rented': 0, 'Maintenance': 0, 'Pending/Other': 0 };
                let handoverList: any[] = [];

                if (vehiclesRes.status === 'fulfilled') {
                    const vehicles = vehiclesRes.value.data || [];
                    totalV = vehicles.length;

                    vehicles.forEach((v: any) => {
                        const status = v.status;
                        if (status === 'ACTIVE — AVAILABLE') {
                            availV++;
                            vDisplayCounts['Available']++;
                        }
                        else if (status === 'ACTIVE — RENTED') vDisplayCounts['Rented']++;
                        else if (status === 'ACTIVE — MAINTENANCE' || status === 'REPAIR IN PROGRESS') vDisplayCounts['Maintenance']++;
                        else vDisplayCounts['Pending/Other']++;

                        if (status === 'TRANSFER PENDING') {
                            handoverList.push({
                                id: v._id,
                                time: new Date(v.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                vehicle: `${v.basicDetails?.make || ''} ${v.basicDetails?.model || ''} (${v.basicDetails?.vin || 'N/A'})`,
                                status: 'Pending Transfer'
                            });
                        }
                    });

                    setVehicleStatusData(Object.entries(vDisplayCounts).filter(([_, count]) => count > 0).map(([name, value], idx) => ({
                        name, value, color: COLORS[idx % COLORS.length]
                    })));

                    setHandovers(handoverList.slice(0, 5));
                }

                if (driversRes.status === 'fulfilled') {
                    totalD = (driversRes.value.data || []).length;
                }

                if (alertsRes.status === 'fulfilled') {
                    const alerts = alertsRes.value || [];
                    const branchAlerts = alerts.filter((a: any) => a.vehicleId?.purchaseDetails?.branch === branchId || (a.vehicleId?.purchaseDetails?.branch as any)?._id === branchId || true);
                    activeA = branchAlerts.length;

                    // Enhanced sorting: Priority (High > Medium > Low) then Date (Newest first)
                    const priorityWeight = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };

                    const sortedAlerts = [...branchAlerts].sort((a: any, b: any) => {
                        const pA = priorityWeight[a.priority as keyof typeof priorityWeight] || 0;
                        const pB = priorityWeight[b.priority as keyof typeof priorityWeight] || 0;

                        if (pA !== pB) return pB - pA;
                        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    });

                    setTasks(sortedAlerts.slice(0, 10).map(a => ({
                        id: a._id,
                        task: a.message,
                        priority: a.priority,
                        time: new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        due: new Date(a.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                        rawDate: a.createdAt
                    })));
                }

                if (enquiriesRes.status === 'fulfilled') {
                    totalC = (enquiriesRes.value.data || []).length;
                }

                if (accidentsRes.status === 'fulfilled') {
                    const allAccidents = accidentsRes.value.data || [];
                    const todayStr = new Date().toDateString();
                    const todays = allAccidents.filter((a: any) => new Date(a.createdAt).toDateString() === todayStr);
                    setTodayAccidents(todays);
                }

                setStats({
                    totalVehicles: totalV,
                    availableVehicles: availV,
                    totalDrivers: totalD,
                    activeAlerts: activeA,
                    totalComplaints: totalC
                });

            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user?.branchId]);

    if (loading) {
        return (
            <div className="min-h-[500px] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[var(--brand-lime)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="container-responsive space-y-8 py-6">
            {/* Today's Accidents Alert Banner */}
            {todayAccidents.length > 0 && (
                <div 
                    onClick={() => navigate('/admin/branch-manager/accident-reports')}
                    className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-red-500/20 transition-all shadow-sm"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center flex-shrink-0 animate-pulse">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h3 className="text-red-500 font-bold text-lg">Urgent: New Accident Reports</h3>
                            <p className="text-sm text-red-500/80 font-medium">
                                {todayAccidents.length} accident{todayAccidents.length > 1 ? 's' : ''} reported today. Immediate attention required.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-red-500 font-bold">
                        <span className="hidden sm:inline">View Details</span>
                        <ChevronRight size={20} />
                    </div>
                </div>
            )}

            {/* Header / Greetings Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-white/5 to-transparent p-6 rounded-3xl border border-white/10 glass-dark">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 rounded bg-lime/20 text-lime text-[10px] font-bold uppercase tracking-wider">Branch Manager</span>
                        <div className="flex items-center gap-1 text-xs text-dim">
                            <MapPin size={12} className="text-lime" />
                            <span>{user?.branchName || 'Central Branch'}</span>
                        </div>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
                        Good day, <span className="text-lime">{user?.name?.split(' ')[0] || 'Manager'}</span>
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
                        Here is what's happening at your branch today.
                    </p>
                </div>
                <div className="flex items-center gap-6 md:border-l border-white/10 md:pl-6">
                    <div className="text-right">
                        <div className="flex items-center justify-end gap-2 text-lime font-bold">
                            <Clock size={16} />
                            <span className="text-lg">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex items-center justify-end gap-2 text-dim text-xs mt-1">
                            <Calendar size={14} />
                            <span>{currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <StatCard
                    superTitle="Fleet Overview"
                    title="Available / Total"
                    value={`${stats.availableVehicles} / ${stats.totalVehicles}`}
                    icon={<Car size={18} />}
                    color="rgba(200, 230, 0, 0.15)"
                />
                <StatCard
                    superTitle="Staff Management"
                    title="Active Drivers"
                    value={stats.totalDrivers.toString()}
                    icon={<Users size={18} />}
                    color="rgba(79, 70, 229, 0.15)"
                />
                <StatCard
                    superTitle="Logistics"
                    title="Pending Transfers"
                    value={handovers.length.toString()}
                    icon={<ArrowRight size={18} />}
                    color="rgba(255, 255, 255, 0.05)"
                />
                <StatCard
                    superTitle="Operational Risk"
                    title="Critical Alerts"
                    value={stats.activeAlerts.toString()}
                    icon={<AlertTriangle size={18} />}
                    color="rgba(239, 68, 68, 0.15)"
                />
                <div onClick={() => navigate('/admin/branch-manager/complaints')} className="cursor-pointer">
                    <StatCard
                        superTitle="Support Portal"
                        title="Total Complaints"
                        value={stats.totalComplaints.toString()}
                        icon={<MessageSquare size={18} />}
                        color="rgba(139, 92, 246, 0.15)"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Fleet Status Chart */}
                <div
                    className="rounded-3xl border shadow-xl overflow-hidden transition-all hover:shadow-lime/5 group"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-6 border-b flex justify-between items-center" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                        <h4 className="font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                            <div className="w-2 h-2 rounded-full bg-lime animate-pulse" />
                            Fleet Distribution
                        </h4>
                        <button className="text-[10px] uppercase font-bold text-lime hover:underline cursor-pointer">View Report</button>
                    </div>
                    <div className="p-6 h-[300px] w-full relative">
                        {vehicleStatusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={vehicleStatusData}
                                        innerRadius={70}
                                        outerRadius={95}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                        animationBegin={0}
                                        animationDuration={1500}
                                    >
                                        {vehicleStatusData.map((e, index) => <Cell key={`cell-${index}`} fill={e.color} />)}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{
                                            background: 'rgba(28, 28, 28, 0.9)',
                                            backdropFilter: 'blur(10px)',
                                            border: '1px solid var(--border-main)',
                                            borderRadius: '12px',
                                            color: 'var(--text-main)',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                        }}
                                    />
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingTop: '20px' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-xs text-dim font-bold uppercase tracking-widest">No Fleet Data</div>
                        )}
                    </div>
                </div>

                {/* Upcoming Handovers */}
                <div
                    className="rounded-3xl border shadow-xl overflow-hidden transition-all hover:shadow-white/5 lg:col-span-1"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-6 border-b flex justify-between items-center" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                        <h4 className="font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                            <ArrowRight size={16} className="text-lime" />
                            Pending Transfers
                        </h4>
                        <span className="bg-white/5 text-[10px] px-2 py-1 rounded-full font-bold">{handovers.length} Total</span>
                    </div>
                    <div className="p-2 overflow-y-auto max-h-[300px] custom-scrollbar">
                        {handovers.length > 0 ? handovers.map((h, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between p-4 hover:bg-white/5 transition-all group rounded-2xl mx-2 my-1 border border-transparent hover:border-white/10"
                            >
                                <div className="flex gap-4 items-center">
                                    <div className="text-center w-14 px-2 py-2 rounded-xl bg-lime/5 border border-lime/10 group-hover:bg-lime/20 transition-colors">
                                        <p className="text-[9px] uppercase font-bold text-lime/60">Time</p>
                                        <p className="text-xs font-bold text-lime">{h.time}</p>
                                    </div>
                                    <div>
                                        <h5 className="font-semibold text-sm w-32 md:w-40 truncate" title={h.vehicle} style={{ color: 'var(--text-main)' }}>{h.vehicle}</h5>
                                        <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{h.status}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate(`/admin/vehicles/${h.id}`)}
                                    className="p-2 rounded-full transition-all bg-transparent hover:bg-lime text-dim hover:text-brand-black cursor-pointer"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        )) : (
                            <div className="p-12 text-center flex flex-col items-center gap-2 opacity-40">
                                <Car size={32} />
                                <p className="text-xs font-bold uppercase tracking-widest">No pending transfers</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Staff Tasks / Alerts */}
                <div
                    className="rounded-3xl border shadow-xl flex flex-col overflow-hidden transition-all hover:shadow-red-500/5 lg:col-span-2"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-6 border-b flex justify-between items-center" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                        <h4 className="font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                            <Bell size={16} className="text-lime" />
                            Live Notifications
                        </h4>
                        <div className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-dim uppercase tracking-widest">Live</span>
                        </div>
                    </div>
                    <div className="p-3 space-y-2 overflow-y-auto max-h-[300px] custom-scrollbar">
                        {tasks.length > 0 ? tasks.map((task, i) => (
                            <div
                                key={i}
                                className="group relative p-4 rounded-2xl border transition-all duration-300 hover:bg-white/[0.02] cursor-pointer overflow-hidden"
                                style={{
                                    background: 'var(--bg-input)',
                                    borderColor: 'var(--border-main)',
                                }}
                            >
                                {/* Left Priority Indicator Line */}
                                <div
                                    className="absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 group-hover:w-2"
                                    style={{ background: task.priority === 'HIGH' ? '#EF4444' : task.priority === 'MEDIUM' ? '#F59E0B' : 'var(--brand-lime)' }}
                                />

                                <div className="flex gap-4">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110"
                                        style={{
                                            background: task.priority === 'HIGH' ? 'rgba(239, 68, 68, 0.1)' : task.priority === 'MEDIUM' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(200, 230, 0, 0.1)',
                                            color: task.priority === 'HIGH' ? '#EF4444' : task.priority === 'MEDIUM' ? '#F59E0B' : 'var(--brand-lime)'
                                        }}
                                    >
                                        {task.priority === 'HIGH' ? <ShieldAlert size={20} /> : task.priority === 'MEDIUM' ? <Zap size={20} /> : <Info size={20} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-bold text-[13px] leading-snug group-hover:text-lime transition-colors truncate pr-2" style={{ color: 'var(--text-main)' }}>
                                                {task.task}
                                            </span>
                                            <span className="text-[9px] font-black uppercase tracking-tighter opacity-40 whitespace-nowrap">
                                                {task.time}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="text-[8px] px-1.5 py-0.5 rounded-sm font-black uppercase tracking-widest border"
                                                    style={{
                                                        borderColor: task.priority === 'HIGH' ? '#EF444440' : task.priority === 'MEDIUM' ? '#F59E0B40' : 'var(--brand-lime)40',
                                                        color: task.priority === 'HIGH' ? '#EF4444' : task.priority === 'MEDIUM' ? '#F59E0B' : 'var(--brand-lime)'
                                                    }}
                                                >
                                                    {task.priority}
                                                </span>
                                                <span className="text-[9px] font-bold text-dim flex items-center gap-1">
                                                    <Calendar size={10} />
                                                    {task.due}
                                                </span>
                                            </div>
                                            <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-all translate-x-[-4px] group-hover:translate-x-0 text-lime" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="p-12 text-center flex flex-col items-center gap-3 opacity-30">
                                <Bell size={40} strokeWidth={1.5} />
                                <div className="space-y-1">
                                    <p className="text-xs font-black uppercase tracking-[0.2em]">All Caught Up</p>
                                    <p className="text-[10px] font-medium">No new notifications to show</p>
                                </div>
                            </div>
                        )}
                    </div>
                    {tasks.length > 0 && (
                        <div className="p-3 border-t text-center" style={{ borderColor: 'var(--border-main)' }}>
                            <button className="text-[10px] font-black uppercase tracking-widest text-dim hover:text-lime transition-colors cursor-pointer">
                                Mark all as viewed
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BranchManagerDashboard;
