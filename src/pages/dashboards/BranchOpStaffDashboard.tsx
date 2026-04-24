import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StatCard } from '../../components/dashboard/widgets/StatusCards';
import { ClipboardCheck, Key, Droplets, AlertTriangle, Play, CheckCircle } from 'lucide-react';
import { getAllVehicles } from '../../services/vehicleService';
import { getActiveAlerts } from '../../services/alertService';
import { getUser } from '../../utils/auth';

const BranchOpStaffDashboard = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        pendingHandovers: 0,
        inWash: 0,
        reportedDamages: 0,
        myTasks: 0
    });
    const [tasks, setTasks] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const user = getUser();
                const branchId = user?.branchId;

                if (!branchId) {
                    setLoading(false);
                    return;
                }

                const [vehiclesRes, alertsRes] = await Promise.allSettled([
                    getAllVehicles({ branch: branchId, limit: 1000 }),
                    getActiveAlerts()
                ]);

                let vehicles: any[] = [];
                if (vehiclesRes.status === 'fulfilled') {
                    vehicles = vehiclesRes.value.data || [];
                }

                let alerts: any[] = [];
                if (alertsRes.status === 'fulfilled') {
                    alerts = alertsRes.value || [];
                }

                let handovers = 0;
                let wash = 0;
                let damages = 0;

                vehicles.forEach(v => {
                    if (v.status === 'TRANSFER PENDING') handovers++;
                    if (v.status === 'CLEANING') wash++;
                });

                const myTasksList: any[] = [];
                alerts.forEach(a => {
                    if (a.type === 'MAINTENANCE' || a.type === 'OTHER') {
                        damages++;
                        myTasksList.push({
                            task: a.message,
                            status: a.status === 'RESOLVED' ? 'complete' : 'pending'
                        });
                    }
                });

                setStats({
                    pendingHandovers: handovers,
                    inWash: wash,
                    reportedDamages: damages,
                    myTasks: myTasksList.length
                });

                setTasks(myTasksList.slice(0, 10));

            } catch (error) {
                console.error("Branch Ops Dashboard Fetch Error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
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
                <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>{t('dashboards.branchOp.title')}</h1>
                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>{t('dashboards.branchOp.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    superTitle="Pending Tasks"
                    title="Active Alerts"
                    value={stats.myTasks.toString()}
                    icon={<ClipboardCheck size={14} />}
                    color="#4F46E5"
                />
                <StatCard
                    superTitle="Handovers"
                    title="Key Management"
                    value={stats.pendingHandovers.toString()}
                    icon={<Key size={14} />}
                    color="#F59E0B"
                />
                <StatCard
                    superTitle="Cleaning Bay"
                    title="Vehicles in Wash"
                    value={stats.inWash.toString()}
                    icon={<Droplets size={14} />}
                    color="#148F85"
                />
                <StatCard
                    superTitle="Maintenance"
                    title="Issues Reported"
                    value={stats.reportedDamages.toString()}
                    icon={<AlertTriangle size={14} />}
                    color="#EF4444"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Checklist Section */}
                <div
                    className="rounded-2xl border shadow-lg overflow-hidden transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-5 border-b flex justify-between items-center transition-colors" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                        <h4 className="font-bold" style={{ color: 'var(--text-main)' }}>Active Operations Queue</h4>
                    </div>
                    <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
                        {tasks.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer hover:bg-white/5" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                {item.status === 'complete' ? (
                                    <CheckCircle size={20} className="text-green-400" />
                                ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-dashed border-white/20" />
                                )}
                                <span className={`text-sm ${item.status === 'complete' ? 'line-through' : ''}`} style={{ color: item.status === 'complete' ? 'var(--text-dim)' : 'var(--text-main)' }}>
                                    {item.task}
                                </span>
                            </div>
                        ))}
                        {tasks.length === 0 && <div className="text-center py-8 text-dim text-xs uppercase font-bold">No active tasks</div>}
                    </div>
                </div>

                {/* Quick Actions */}
                <div
                    className="rounded-2xl border p-5 shadow-lg flex flex-col transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <h4 className="font-bold mb-6" style={{ color: 'var(--text-main)' }}>Quick Actions</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                        <button className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed transition-all hover:border-lime group cursor-pointer" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                            <div className="w-12 h-12 rounded-full bg-lime/10 flex items-center justify-center text-lime group-hover:scale-110 transition-transform">
                                <Play size={24} />
                            </div>
                            <span className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>Start Handover</span>
                        </button>
                        <button className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed transition-all hover:border-blue-400 group cursor-pointer" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                            <div className="w-12 h-12 rounded-full bg-blue-400/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                                <ClipboardCheck size={24} />
                            </div>
                            <span className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>Process Check-in</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BranchOpStaffDashboard;
