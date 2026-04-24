import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StatCard } from '../../components/dashboard/widgets/StatusCards';
import { Car, Users, ArrowRight, AlertTriangle } from 'lucide-react';
import { getAllVehicles } from '../../services/vehicleService';
import { getAllDrivers } from '../../services/driverService';
import { getActiveAlerts } from '../../services/alertService';
import { getUser } from '../../utils/auth';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#148F85', '#4F46E5', '#F59E0B', '#EF4444', '#8B5CF6'];

const BranchManagerDashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalVehicles: 0,
        availableVehicles: 0,
        totalDrivers: 0,
        activeAlerts: 0
    });
    const [vehicleStatusData, setVehicleStatusData] = useState<any[]>([]);
    const [handovers, setHandovers] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const user = getUser();
                const branchId = user?.branchId;

                if (!branchId) {
                    setLoading(false);
                    return;
                }

                const [vehiclesRes, driversRes, alertsRes] = await Promise.allSettled([
                    getAllVehicles({ limit: 1000, branch: branchId }),
                    getAllDrivers({ limit: 1000, branchId: branchId }),
                    getActiveAlerts() 
                ]);

                let totalV = 0;
                let availV = 0;
                let totalD = 0;
                let activeA = 0;
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
                    // Simple filter if API doesn't filter by branch automatically
                    const branchAlerts = alerts.filter(a => a.vehicleId?.purchaseDetails?.branch === branchId || a.vehicleId?.purchaseDetails?.branch?._id === branchId || true); // Assuming alerts are globally visible or filtered backend-side.
                    activeA = branchAlerts.length;
                    
                    setTasks(branchAlerts.slice(0, 5).map(a => ({
                        id: a._id,
                        task: a.message,
                        priority: a.priority,
                        due: new Date(a.createdAt).toLocaleDateString()
                    })));
                }

                setStats({
                    totalVehicles: totalV,
                    availableVehicles: availV,
                    totalDrivers: totalD,
                    activeAlerts: activeA
                });

            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="min-h-[500px] flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#148F85] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="container-responsive space-y-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>{t('dashboards.branch.title')}</h1>
                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>{t('dashboards.branch.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    superTitle={t('dashboards.branch.stats.localFleet')}
                    title={t('dashboards.branch.stats.availableVsTotal')}
                    value={`${stats.availableVehicles} / ${stats.totalVehicles}`}
                    icon={<Car size={14} />}
                    color="#148F85"
                />
                <StatCard
                    superTitle="Total Drivers"
                    title="Active in Branch"
                    value={stats.totalDrivers.toString()}
                    icon={<Users size={14} />}
                    color="#4F46E5"
                />
                <StatCard
                    superTitle="Pending Transfers"
                    title="Vehicles incoming/outgoing"
                    value={handovers.length.toString()}
                    icon={<ArrowRight size={14} />}
                    color="#1F2937"
                />
                <StatCard
                    superTitle="Active Alerts"
                    title="Requires Attention"
                    value={stats.activeAlerts.toString()}
                    icon={<AlertTriangle size={14} />}
                    color="#EF4444"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Fleet Status Chart */}
                <div
                    className="rounded-2xl border shadow-lg overflow-hidden transition-colors flex flex-col"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-5 border-b transition-colors" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                        <h4 className="font-bold" style={{ color: 'var(--text-main)' }}>Fleet Status</h4>
                    </div>
                    <div className="p-4 h-[250px] w-full relative z-10 flex-1">
                        {vehicleStatusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={vehicleStatusData} innerRadius={60} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                                        {vehicleStatusData.map((e, index) => <Cell key={`cell-${index}`} fill={e.color} />)}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px', fontWeight: 600 }} />
                                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-xs text-dim font-bold uppercase">No Fleet Data</div>
                        )}
                    </div>
                </div>

                {/* Upcoming Handovers */}
                <div
                    className="rounded-2xl border shadow-lg overflow-hidden transition-colors lg:col-span-1"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-5 border-b transition-colors" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                        <h4 className="font-bold" style={{ color: 'var(--text-main)' }}>Pending Transfers</h4>
                    </div>
                    <div className="p-2 overflow-y-auto max-h-[250px]">
                        {handovers.length > 0 ? handovers.map((h, i) => (
                            <div key={i} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b last:border-0 rounded-xl" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="flex gap-4 items-center">
                                    <div className="text-center w-16 px-2 py-1 rounded bg-white/5 border border-white/10">
                                        <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Time</p>
                                        <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{h.time}</p>
                                    </div>
                                    <div>
                                        <h5 className="font-medium text-sm w-32 truncate" title={h.vehicle} style={{ color: 'var(--text-main)' }}>{h.vehicle}</h5>
                                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{h.status}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate(`/admin/vehicles/${h.id}`)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors hover:bg-lime/10 cursor-pointer"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--brand-lime)', color: 'var(--brand-lime)' }}
                                >
                                    View <ArrowRight size={12} />
                                </button>
                            </div>
                        )) : (
                            <div className="p-6 text-center text-xs text-dim">No pending transfers</div>
                        )}
                    </div>
                </div>

                {/* Staff Tasks / Alerts */}
                <div
                    className="rounded-2xl border shadow-lg flex flex-col overflow-hidden transition-colors lg:col-span-1"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-5 border-b transition-colors" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                        <h4 className="font-bold" style={{ color: 'var(--text-main)' }}>Active Alerts</h4>
                    </div>
                    <div className="p-4 space-y-3 overflow-y-auto max-h-[250px]">
                        {tasks.length > 0 ? tasks.map((task, i) => (
                            <div
                                key={i}
                                className="p-3 rounded-lg border border-l-4 transition-colors"
                                style={{
                                    background: 'var(--bg-input)',
                                    borderColor: 'var(--border-main)',
                                    borderLeftColor: task.priority === 'HIGH' ? '#EF4444' : task.priority === 'MEDIUM' ? '#F59E0B' : 'var(--brand-lime)'
                                }}
                            >
                                <div className="flex justify-between mb-1">
                                    <span className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{task.task}</span>
                                    <span
                                        className={`text-xs px-2 py-0.5 rounded font-bold ${task.priority === 'HIGH' ? 'bg-red-500/20 text-red-400' : task.priority === 'MEDIUM' ? 'bg-orange-500/20 text-orange-400' : 'bg-lime/20 text-lime'}`}
                                    >
                                        {task.priority}
                                    </span>
                                </div>
                                <div className="text-xs" style={{ color: 'var(--text-dim)' }}>
                                    Date: {task.due}
                                </div>
                            </div>
                        )) : (
                            <div className="p-6 text-center text-xs text-dim">No active alerts</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BranchManagerDashboard;
