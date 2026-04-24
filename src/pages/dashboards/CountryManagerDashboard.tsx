import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StatCard } from '../../components/dashboard/widgets/StatusCards';
import { Globe, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { getAllBranches } from '../../services/branchService';
import { getAllVehicles } from '../../services/vehicleService';
import { getLedgerEntries } from '../../services/ledgerService';
import { getActiveAlerts } from '../../services/alertService';
import { getStaffPerformance } from '../../services/staffPerformanceService';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell } from 'recharts';

const COLORS = ['#148F85', '#4F46E5', '#F59E0B', '#EF4444', '#8B5CF6'];

const CountryManagerDashboard = () => {
    const { t } = useTranslation();

    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalBranches: 0,
        fleetUtilization: 0,
        totalStaff: 0,
        totalAlerts: 0
    });
    const [branchData, setBranchData] = useState<any[]>([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                // Fetch basic data
                const [branchesRes, vehiclesRes, ledgerRes, alertsRes, staffRes] = await Promise.allSettled([
                    getAllBranches({ limit: 100 }),
                    getAllVehicles({ limit: 1000 }),
                    getLedgerEntries({ limit: 5000 }),
                    getActiveAlerts(),
                    getStaffPerformance({ type: 'all' })
                ]);

                let branches: any[] = [];
                if (branchesRes.status === 'fulfilled' && branchesRes.value?.data) {
                    branches = branchesRes.value.data;
                }

                let totalV = 0;
                let rentedV = 0;
                let branchVehicles: Record<string, number> = {};

                if (vehiclesRes.status === 'fulfilled') {
                    const vehicles = vehiclesRes.value.data || [];
                    totalV = vehicles.length;
                    vehicles.forEach((v: any) => {
                        if (v.status === 'ACTIVE — RENTED') rentedV++;
                        const bId = v.purchaseDetails?.branch?._id || v.purchaseDetails?.branch;
                        if (bId) {
                            branchVehicles[bId] = (branchVehicles[bId] || 0) + 1;
                        }
                    });
                }

                const utilization = totalV > 0 ? Math.round((rentedV / totalV) * 100) : 0;

                let branchRevenue: Record<string, number> = {};
                if (ledgerRes.status === 'fulfilled') {
                    const entries = ledgerRes.value || []; 
                    const data = Array.isArray(entries) ? entries : (entries as any).data || [];
                    data.forEach((entry: any) => {
                        const bId = entry.branchId?._id || entry.branchId;
                        if (bId && entry.accountingCode?.category?.toUpperCase() === 'INCOME') {
                            const amt = entry.amount !== undefined ? entry.amount : (entry.credit || 0);
                            branchRevenue[bId] = (branchRevenue[bId] || 0) + amt;
                        }
                    });
                }

                let branchAlerts: Record<string, number> = {};
                let totalAlerts = 0;
                if (alertsRes.status === 'fulfilled') {
                    const alerts = alertsRes.value || [];
                    totalAlerts = alerts.length;
                    alerts.forEach((a: any) => {
                        const bId = a.vehicleId?.purchaseDetails?.branch?._id || a.vehicleId?.purchaseDetails?.branch;
                        if (bId) {
                            branchAlerts[bId] = (branchAlerts[bId] || 0) + 1;
                        }
                    });
                }

                let totalStaff = 0;
                if (staffRes.status === 'fulfilled' && staffRes.value?.data) {
                    const sd = staffRes.value.data;
                    totalStaff = (sd.branchManagers?.length || 0) + (sd.financeStaff?.length || 0) + (sd.operationStaff?.length || 0);
                }

                const bData = branches.map(b => ({
                    id: b._id,
                    name: b.name,
                    vehicles: branchVehicles[b._id] || 0,
                    revenue: branchRevenue[b._id] || 0,
                    alerts: branchAlerts[b._id] || 0,
                    yieldStr: branchVehicles[b._id] ? `$${Math.round((branchRevenue[b._id] || 0) / branchVehicles[b._id])}/veh` : 'N/A'
                })).sort((a, b) => b.revenue - a.revenue);

                setBranchData(bData);
                setStats({
                    totalBranches: branches.length,
                    fleetUtilization: utilization,
                    totalStaff: totalStaff,
                    totalAlerts: totalAlerts
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
                <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-main)' }}>{t('dashboards.country.title')}</h1>
                <p className="text-sm" style={{ color: 'var(--text-dim)' }}>{t('dashboards.country.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    superTitle={t('dashboards.country.stats.totalBranches')}
                    title={t('dashboards.country.stats.activeNationwide')}
                    value={stats.totalBranches.toString()}
                    icon={<Globe size={14} />}
                    color="#4F46E5"
                />
                <StatCard
                    superTitle={t('dashboards.country.stats.nationalGoal')}
                    title={t('dashboards.country.stats.fleetUtilization')}
                    value={`${stats.fleetUtilization}%`}
                    icon={<TrendingUp size={14} />}
                    color="#148F85"
                />
                <StatCard
                    superTitle={t('dashboards.country.stats.totalStaff')}
                    title={t('dashboards.country.stats.acrossRegions')}
                    value={stats.totalStaff.toString()}
                    icon={<Users size={14} />}
                    color="#1F2937"
                />
                <StatCard
                    superTitle={t('dashboards.country.stats.complianceFlags')}
                    title={t('dashboards.country.stats.regulatoryAudits')}
                    value={stats.totalAlerts.toString()}
                    icon={<AlertCircle size={14} />}
                    color="#EF4444"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Branch Revenue Chart */}
                <div
                    className="lg:col-span-1 rounded-2xl border shadow-lg overflow-hidden transition-colors flex flex-col"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-5 border-b transition-colors" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                        <h4 className="font-bold" style={{ color: 'var(--text-main)' }}>Revenue by Branch</h4>
                    </div>
                    <div className="p-4 h-[350px] w-full">
                        {branchData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={branchData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" horizontal={false} />
                                    <XAxis type="number" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                                    <YAxis dataKey="name" type="category" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} width={80} />
                                    <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px' }} formatter={(v: any) => `$${(v || 0).toLocaleString()}`} />
                                    <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]} maxBarSize={30}>
                                        {branchData.map((_: any, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-xs text-dim font-bold uppercase">No Branch Data</div>
                        )}
                    </div>
                </div>

                {/* Branch Performance Table */}
                <div
                    className="lg:col-span-2 rounded-2xl border shadow-lg overflow-hidden transition-colors flex flex-col"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-5 border-b transition-colors" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                        <h4 className="font-bold" style={{ color: 'var(--text-main)' }}>{t('dashboards.country.performance.title')}</h4>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-xs uppercase transition-colors" style={{ background: 'var(--bg-input)', color: 'var(--text-dim)' }}>
                                    <th className="px-6 py-4">Branch</th>
                                    <th className="px-6 py-4">Vehicles</th>
                                    <th className="px-6 py-4">Revenue</th>
                                    <th className="px-6 py-4">{t('dashboards.country.performance.yield')}</th>
                                    <th className="px-6 py-4">{t('dashboards.country.performance.alerts')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                {branchData.length > 0 ? branchData.map((row, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-medium" style={{ color: 'var(--text-main)' }}>{row.name}</td>
                                        <td className="px-6 py-4" style={{ color: 'var(--text-dim)' }}>{row.vehicles}</td>
                                        <td className="px-6 py-4 font-bold" style={{ color: 'var(--text-main)' }}>${row.revenue.toLocaleString()}</td>
                                        <td className="px-6 py-4 font-bold" style={{ color: 'var(--brand-lime)' }}>{row.yieldStr}</td>
                                        <td className={`px-6 py-4 font-bold ${row.alerts > 0 ? 'text-red-400' : 'text-green-400'}`}>{row.alerts}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-dim font-bold uppercase text-xs">
                                            No Branch Performance Data
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CountryManagerDashboard;
