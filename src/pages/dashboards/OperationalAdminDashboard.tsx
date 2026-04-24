import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Settings, Wrench as Tool, CheckCircle2 } from 'lucide-react';
import { StatCard, AlertCard } from '../../components/dashboard/widgets/StatusCards';
import { getAllVehicles } from '../../services/vehicleService';
import { getActiveAlerts } from '../../services/alertService';

const OperationalAdminDashboard = () => {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalFleet: 0,
        activeOnRoad: 0,
        inMaintenance: 0,
        criticalVor: 0
    });
    const [liveOps, setLiveOps] = useState<any[]>([]);
    const [maintenanceStats, setMaintenanceStats] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [vehiclesRes, alertsRes] = await Promise.allSettled([
                    getAllVehicles({ limit: 1000 }),
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

                // 1. Compute Stats
                const totalFleet = vehicles.length;
                let activeOnRoad = 0;
                let inMaintenance = 0;
                let criticalVor = 0;

                vehicles.forEach(v => {
                    const status = v.status;
                    if (status === 'ACTIVE — RENTED') activeOnRoad++;
                    else if (status === 'ACTIVE — MAINTENANCE' || status === 'REPAIR IN PROGRESS') inMaintenance++;
                    else if (status === 'RETIRED' || status === 'SUSPENDED') criticalVor++;
                });

                setStats({
                    totalFleet,
                    activeOnRoad,
                    inMaintenance,
                    criticalVor
                });

                // 2. Live Ops Table (Sample of Vehicles)
                setLiveOps(vehicles.slice(0, 10).map(v => ({
                    v: `${v.basicDetails?.vin?.slice(-6) || 'N/A'} (${v.basicDetails?.model || 'N/A'})`,
                    d: v.currentDriver?.fullName || 'Unassigned',
                    s: v.status.split(' — ')[1] || v.status,
                    sColor: v.status.includes('RENTED') ? 'text-green-400' : 
                            v.status.includes('MAINTENANCE') ? 'text-orange-400' : 'text-dim',
                    e: '-' 
                })));

                // 3. Maintenance Breakdown
                const maintenanceTypes = {
                    'ROUTINE': 0,
                    'TYRE': 0,
                    'ENGINE': 0,
                    'BODY': 0
                };

                alerts.forEach(a => {
                    if (a.type === 'MAINTENANCE') {
                        const msg = (a.message || '').toUpperCase();
                        if (msg.includes('TYRE')) maintenanceTypes.TYRE++;
                        else if (msg.includes('ENGINE')) maintenanceTypes.ENGINE++;
                        else if (msg.includes('BODY')) maintenanceTypes.BODY++;
                        else maintenanceTypes.ROUTINE++;
                    }
                });

                setMaintenanceStats([
                    { title: 'Routine Servicing', count: maintenanceTypes.ROUTINE, icon: <Settings size={18} className="text-blue-400" />, time: 'Ongoing' },
                    { title: 'Tyre Replacements', count: maintenanceTypes.TYRE, icon: <CheckCircle2 size={18} className="text-green-400" />, time: 'Scheduled' },
                    { title: 'Engine Diagnostics', count: maintenanceTypes.ENGINE, icon: <Tool size={18} className="text-orange-400" />, time: 'Pending' },
                    { title: 'Body Repair', count: maintenanceTypes.BODY, icon: <AlertTriangle size={18} className="text-red-400" />, time: 'Awaiting parts' },
                ]);

            } catch (error) {
                console.error("Operational Dashboard Data Fetch Error:", error);
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>{t('dashboards.operational.title')}</h1>
                    <p className="text-sm" style={{ color: 'var(--text-dim)' }}>{t('dashboards.operational.subtitle')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    superTitle="Fleet Total"
                    title={t('dashboards.operational.stats.activeFleet')}
                    value={stats.totalFleet.toString()}
                    color="#4F46E5"
                />
                <StatCard
                    superTitle="Live Operations"
                    title="Vehicles Rented"
                    value={stats.activeOnRoad.toString()}
                    color="#148F85"
                />
                <StatCard
                    superTitle="Workshop Status"
                    title="Under Repair"
                    value={stats.inMaintenance.toString()}
                    color="#F59E0B"
                />
                <AlertCard
                    title="Critical VOR"
                    count={stats.criticalVor}
                    desc="Vehicle Off Road"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Live Status Table */}
                <div
                    className="rounded-2xl border shadow-lg overflow-hidden transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-5 border-b flex justify-between items-center transition-colors" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                        <h4 className="font-bold" style={{ color: 'var(--text-main)' }}>{t('dashboards.operational.liveOps.title')}</h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm relative">
                            <thead>
                                <tr className="text-xs uppercase transition-colors" style={{ background: 'var(--bg-input)', color: 'var(--text-dim)' }}>
                                    <th className="px-6 py-4">{t('dashboards.operational.liveOps.table.vehicle')}</th>
                                    <th className="px-6 py-4">{t('dashboards.operational.liveOps.table.driver')}</th>
                                    <th className="px-6 py-4">{t('dashboards.operational.liveOps.table.status')}</th>
                                    <th className="px-6 py-4">{t('dashboards.operational.liveOps.table.eta')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                {liveOps.map((row, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-medium" style={{ color: 'var(--text-main)' }}>{row.v}</td>
                                        <td className="px-6 py-4" style={{ color: 'var(--text-dim)' }}>{row.d}</td>
                                        <td className={`px-6 py-4 font-bold ${row.sColor}`}>{row.s}</td>
                                        <td className="px-6 py-4" style={{ color: 'var(--text-dim)' }}>{row.e}</td>
                                    </tr>
                                ))}
                                {liveOps.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-dim text-xs uppercase font-bold">No live operations data</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Maintenance Quick Stats */}
                <div
                    className="rounded-2xl border p-5 shadow-lg flex flex-col transition-colors"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <h4 className="font-bold mb-4" style={{ color: 'var(--text-main)' }}>Maintenance Backlog</h4>

                    <div className="space-y-3 flex-1 overflow-y-auto pr-2 max-h-[400px]">
                        {maintenanceStats.map((q, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group"
                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                            >
                                <div className="flex gap-4 items-center">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center border group-hover:bg-lime/10 group-hover:border-lime/30 transition-colors"
                                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                                    >
                                        {q.icon}
                                    </div>
                                    <div>
                                        <h5 className="font-medium text-sm" style={{ color: 'var(--text-main)' }}>{q.title}</h5>
                                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{q.time}</p>
                                    </div>
                                </div>
                                <div
                                    className="text-xl font-bold bg-white/5 w-10 h-10 flex items-center justify-center rounded-lg border border-white/10 group-hover:border-lime/30 group-hover:text-lime transition-all"
                                    style={{ color: 'var(--text-main)' }}
                                >
                                    {q.count}
                                </div>
                            </div>
                        ))}
                        {maintenanceStats.length === 0 && <div className="text-center py-8 text-dim text-xs uppercase font-bold">No maintenance data</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OperationalAdminDashboard;
