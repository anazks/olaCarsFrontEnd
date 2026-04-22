import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
    ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, 
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, AreaChart, Area 
} from 'recharts';
import { Car, Users, DollarSign, Briefcase, ShoppingCart, Activity, RefreshCw } from 'lucide-react';
import { getLedgerEntries } from '../../services/ledgerService';
import { getAllDrivers } from '../../services/driverService';
import { getAllVehicles } from '../../services/vehicleService';
import { getAllPurchaseOrders } from '../../services/purchaseOrderService';
import { getStaffPerformance } from '../../services/staffPerformanceService';
import { getAllBranches } from '../../services/branchService';

const COLORS = {
    green: '#22c55e', blue: '#3b82f6', red: '#ef4444', 
    yellow: '#eab308', teal: '#14b8a6', purple: '#8b5cf6',
    orange: '#f97316', indigo: '#6366f1', pink: '#ec4899'
};

const ExecutiveDashboard = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [financeData, setFinanceData] = useState<any[]>([]); 
    const [fleetData, setFleetData] = useState<any[]>([]);
    const [vehicleData, setVehicleData] = useState<any[]>([]); 
    const [driverData, setDriverData] = useState<any[]>([]);
    const [poData, setPoData] = useState<any[]>([]);
    const [staffData, setStaffData] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    
    // Global Filters
    const [globalBranch, setGlobalBranch] = useState<string>('all');
    const [globalSort, setGlobalSort] = useState<string>('desc');
    const [globalStartDate, setGlobalStartDate] = useState<string>('');
    const [globalEndDate, setGlobalEndDate] = useState<string>('');

    const fetchData = async () => {
        setLoading(true);
        try {
            if (branches.length === 0) {
                try {
                    const brRes = await getAllBranches({ limit: 100 });
                    if (brRes.data) setBranches(brRes.data);
                } catch (e) {
                    console.error("Failed to load branches", e);
                }
            }

            const baseFilters: any = {};
            if (globalBranch !== 'all') baseFilters.branch = globalBranch;
            if (globalStartDate) baseFilters.startDate = globalStartDate;
            if (globalEndDate) baseFilters.endDate = globalEndDate;
            baseFilters.sortOrder = globalSort;
            baseFilters.sortBy = 'createdAt';

            const [ledgerRes, driverRes, vehicleRes, poRes, staffRes] = await Promise.allSettled([
                getLedgerEntries(baseFilters),
                getAllDrivers({ limit: 1000, ...baseFilters }),
                getAllVehicles({ limit: 1000, ...baseFilters }),
                getAllPurchaseOrders({ limit: 500, ...baseFilters }),
                getStaffPerformance({ type: 'all', ...baseFilters })
            ]);

            // 1. Finance Aggregation
            if (ledgerRes.status === 'fulfilled') {
                const ledgerData = Array.isArray(ledgerRes.value) ? ledgerRes.value : [];
                const monthMap = new Map<string, { month: string; profit: number; income: number; expense: number }>();
                
                ledgerData.forEach((entry: any) => {
                    const d = new Date(entry.entryDate || entry.date);
                    if (isNaN(d.getTime())) return;
                    
                    const mKey = d.toLocaleDateString(undefined, { year: '2-digit', month: 'short' });
                    const cat = entry.accountingCode?.category?.toUpperCase();
                    let amt = entry.amount !== undefined ? entry.amount : (entry.debit || entry.credit || 0);
                    let isDebit = entry.amount !== undefined ? entry.type === 'DEBIT' : ((entry.debit || 0) > 0);
                    
                    let incomeToAdd = 0;
                    let expenseToAdd = 0;

                    if (cat === 'INCOME') {
                        incomeToAdd = isDebit ? -amt : amt; 
                    } else if (cat === 'EXPENSE' || cat === 'ASSET') {
                        expenseToAdd = isDebit ? amt : -amt; 
                    } else {
                        if (isDebit) expenseToAdd = amt;
                        else incomeToAdd = amt;
                    }

                    const curr = monthMap.get(mKey) || { month: mKey, profit: 0, income: 0, expense: 0 };
                    curr.income += incomeToAdd;
                    curr.expense += expenseToAdd;
                    curr.profit = curr.income - curr.expense;
                    monthMap.set(mKey, curr);
                });

                const cData = Array.from(monthMap.values()).sort((a,b) => new Date(`01 ${a.month}`).getTime() - new Date(`01 ${b.month}`).getTime());
                setFinanceData(cData);
            }

            // 2. Fleet & Driver Aggregation
            if (driverRes.status === 'fulfilled') {
                const drivers = driverRes.value.data || [];
                const statusCounts = { PAID: 0, PARTIAL: 0, PENDING: 0, OVERDUE: 0 };
                const scoreCounts = { 'Unscored': 0, '<60': 0, '60-80': 0, '80+': 0 };

                drivers.forEach(d => {
                    // Fleet Collections logic
                    const rt = d.rentTracking || [];
                    const pending = rt.filter(x => x.status !== 'PAID').sort((a,b) => new Date(a.dueDate||'').getTime() - new Date(b.dueDate||'').getTime());
                    if (pending.length > 0) {
                        const isOverdue = new Date(pending[0].dueDate||'') < new Date();
                        if(isOverdue) statusCounts.OVERDUE++;
                        else statusCounts.PENDING++;
                    } else if (rt.length > 0) {
                        statusCounts.PAID++;
                    } else {
                        statusCounts.PENDING++; // Drivers with no rent tracking initialized
                    }

                    // Score Logic
                    const s = d.performance?.drivingScore || 0;
                    if (s === 0) scoreCounts.Unscored++;
                    else if (s < 60) scoreCounts['<60']++;
                    else if (s < 80) scoreCounts['60-80']++;
                    else scoreCounts['80+']++;
                });

                setFleetData([
                    { name: 'Paid', value: statusCounts.PAID, color: COLORS.green },
                    { name: 'Pending', value: statusCounts.PENDING, color: COLORS.blue },
                    { name: 'Overdue', value: statusCounts.OVERDUE, color: COLORS.red }
                ].filter(d => d.value > 0));

                setDriverData([
                    { name: 'Unscored', Drivers: scoreCounts.Unscored, fill: COLORS.teal },
                    { name: '<60', Drivers: scoreCounts['<60'], fill: COLORS.red },
                    { name: '60-80', Drivers: scoreCounts['60-80'], fill: COLORS.yellow },
                    { name: '80+', Drivers: scoreCounts['80+'], fill: COLORS.green }
                ].filter(d => d.Drivers > 0));
            }

            // 3. Vehicle Analytics
            if (vehicleRes.status === 'fulfilled') {
                const vecs = vehicleRes.value.data || [];
                const vDisplayCounts = { Active: 0, Maintenance: 0, Available: 0, Suspended: 0, Other: 0 };
                
                vecs.forEach(v => {
                    const status = v.status;
                    if (status === 'ACTIVE — RENTED') vDisplayCounts.Active++;
                    else if (status === 'ACTIVE — MAINTENANCE' || status === 'REPAIR IN PROGRESS') vDisplayCounts.Maintenance++;
                    else if (status === 'ACTIVE — AVAILABLE') vDisplayCounts.Available++;
                    else if (status === 'SUSPENDED' || status === 'RETIRED') vDisplayCounts.Suspended++;
                    else vDisplayCounts.Other++;
                });

                setVehicleData([
                    { name: 'Active', count: vDisplayCounts.Active, fill: COLORS.green },
                    { name: 'Maintenance', count: vDisplayCounts.Maintenance, fill: COLORS.orange },
                    { name: 'Available', count: vDisplayCounts.Available, fill: COLORS.blue },
                    { name: 'Suspended', count: vDisplayCounts.Suspended, fill: COLORS.red },
                    { name: 'Pipeline', count: vDisplayCounts.Other, fill: COLORS.purple }
                ].filter(d => d.count > 0));
            }

            // 4. Purchase Order Analytics
            if (poRes.status === 'fulfilled') {
                const pos = poRes.value.data || [];
                let approved = 0, waiting = 0, rejected = 0;
                pos.forEach(p => {
                    if (p.status === 'APPROVED') approved++;
                    else if (p.status === 'REJECTED') rejected++;
                    else waiting++; // WAITING or others
                });
                setPoData([
                    { name: 'Waiting', value: waiting, color: COLORS.yellow },
                    { name: 'Approved', value: approved, color: COLORS.green },
                    { name: 'Rejected', value: rejected, color: COLORS.red }
                ].filter(d => d.value > 0));
            }

            // 5. Staff Analytics
            if (staffRes.status === 'fulfilled') {
                const sd = staffRes.value.data;
                setStaffData([
                    { name: 'Branch Mgrs', count: sd.branchManagers?.length || 0, fill: COLORS.indigo },
                    { name: 'Finance Staff', count: sd.financeStaff?.length || 0, fill: COLORS.pink },
                    { name: 'Operation Staff', count: sd.operationStaff?.length || 0, fill: COLORS.teal },
                    { name: 'Country Mgrs', count: sd.countryManagers?.length || 0, fill: COLORS.yellow },
                    { name: 'Global Admins', count: sd.globalAdmins?.length || 0, fill: COLORS.green }
                ].filter(x => x.count > 0));
            }

        } catch (e) {
            console.error('Failed fetching data', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // ─── Render Components ──────────────────────────────────────────

    return (
        <div className="container-responsive space-y-6">
            
            {/* Header & Master Filters */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b pb-6" style={{ borderColor: 'var(--border-main)' }}>
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter" style={{ color: 'var(--text-main)' }}>
                        <Activity className="inline mr-3 mb-1" style={{ color: '#148F85' }} /> 
                        Executive Control Center
                    </h1>
                    <p className="text-sm font-medium mt-1" style={{ color: 'var(--text-dim)' }}>
                        Real-time master aggregation across all operating domains
                    </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    {/* Branch Filter */}
                    {branches.length > 0 && (
                        <select
                            value={globalBranch}
                            onChange={(e) => setGlobalBranch(e.target.value)}
                            className="px-4 py-2 border rounded-xl text-sm outline-none transition-all cursor-pointer font-bold"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <option value="all">All Branches</option>
                            {branches.map(b => (
                                <option key={b._id} value={b._id}>{b.name}</option>
                            ))}
                        </select>
                    )}

                    {/* Date Filters */}
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={globalStartDate}
                            onChange={(e) => setGlobalStartDate(e.target.value)}
                            className="px-4 py-2 border rounded-xl text-sm outline-none transition-all font-bold"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                        <span className="text-xs font-black uppercase tracking-widest opacity-40">to</span>
                        <input
                            type="date"
                            value={globalEndDate}
                            onChange={(e) => setGlobalEndDate(e.target.value)}
                            className="px-4 py-2 border rounded-xl text-sm outline-none transition-all font-bold"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>

                    {/* Sort Order */}
                    <select
                        value={globalSort}
                        onChange={(e) => setGlobalSort(e.target.value)}
                        className="px-4 py-2 border rounded-xl text-sm outline-none transition-all cursor-pointer font-bold"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <option value="desc">Newest First</option>
                        <option value="asc">Oldest First</option>
                    </select>

                    <button 
                        onClick={fetchData} 
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-lime text-black rounded-lg text-sm font-bold transition-all hover:bg-lime/90 disabled:opacity-50 cursor-pointer"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {t('dashboards.common.refreshData')}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="min-h-[500px] flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-[#148F85] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

                    {/* 1. Finance (Clickable) */}
                    <div 
                        onClick={() => navigate('finance-dashboard')}
                        className="rounded-3xl border p-6 flex flex-col shadow-sm cursor-pointer hover:border-[#148F85] hover:shadow-[#148F85]/10 group transition-all duration-300 relative overflow-hidden" 
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#148F85]/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-[#148F85]/20 transition-all" />
                        <div className="flex items-center gap-3 mb-4 relative z-10">
                            <div className="p-2.5 rounded-xl bg-[#148F85]/10 text-[#148F85]">
                                <DollarSign size={20} className="group-hover:scale-110 transition-transform" />
                            </div>
                            <h2 className="text-sm font-black uppercase tracking-wider text-dim group-hover:text-[#148F85] transition-colors">Finance Analytics</h2>
                        </div>
                        <div className="h-[220px] w-full relative z-10">
                            {financeData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={financeData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#148F85" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#148F85" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} />
                                        <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                                        <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                                        <RechartsTooltip contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px' }} />
                                        <Area type="monotone" dataKey="profit" stroke="#148F85" strokeWidth={3} fillOpacity={1} fill="url(#colorProfit)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-dim font-bold uppercase">No Financial Data</div>
                            )}
                        </div>
                    </div>

                    {/* 2. Fleet Performance (Clickable) */}
                    <div 
                        onClick={() => navigate('driver-performance')}
                        className="rounded-3xl border p-6 flex flex-col shadow-sm cursor-pointer hover:border-blue-500 hover:shadow-blue-500/10 group transition-all duration-300 relative overflow-hidden" 
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/20 transition-all" />
                        <div className="flex items-center gap-3 mb-4 relative z-10">
                            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                                <Users size={20} className="group-hover:scale-110 transition-transform" />
                            </div>
                            <h2 className="text-sm font-black uppercase tracking-wider text-dim group-hover:text-blue-500 transition-colors">Fleet Payables</h2>
                        </div>
                        <div className="h-[220px] w-full relative z-10">
                            {fleetData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={fleetData} innerRadius={60} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                                            {fleetData.map((e, index) => <Cell key={`cell-${index}`} fill={e.color} />)}
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

                    {/* 3. Driver Analytics */}
                    <div className="rounded-3xl border p-6 flex flex-col shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-500">
                                <Activity size={20} />
                            </div>
                            <h2 className="text-sm font-black uppercase tracking-wider text-dim">Driving Apptitude</h2>
                        </div>
                        <div className="h-[220px] w-full">
                            {driverData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={driverData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} />
                                        <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} dy={5} />
                                        <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                        <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px' }} />
                                        <Bar dataKey="Drivers" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                            {driverData.map((e, index) => <Cell key={`cell-${index}`} fill={e.fill} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-dim font-bold uppercase">No Drive Score Data</div>
                            )}
                        </div>
                    </div>

                    {/* 4. Vehicle Analytics */}
                    <div className="rounded-3xl border p-6 flex flex-col shadow-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                                <Car size={20} />
                            </div>
                            <h2 className="text-sm font-black uppercase tracking-wider text-dim">Vehicle Asset Distribution</h2>
                        </div>
                        <div className="h-[220px] w-full">
                            {vehicleData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={vehicleData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" vertical={false} />
                                        <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} dy={5} />
                                        <YAxis stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                        <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px' }} />
                                        <Bar dataKey="count" name="Vehicles" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                            {vehicleData.map((e, index) => <Cell key={`cell-${index}`} fill={e.fill} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-dim font-bold uppercase">No Vehicle Data</div>
                            )}
                        </div>
                    </div>

                    {/* 5. Purchase Order Analytics (Clickable) */}
                    <div 
                        onClick={() => navigate('purchase-orders')}
                        className="rounded-3xl border p-6 flex flex-col shadow-sm cursor-pointer hover:border-yellow-500 hover:shadow-yellow-500/10 group transition-all duration-300 relative overflow-hidden" 
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-yellow-500/20 transition-all" />
                        <div className="flex items-center gap-3 mb-4 relative z-10">
                            <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-500">
                                <ShoppingCart size={20} className="group-hover:scale-110 transition-transform" />
                            </div>
                            <h2 className="text-sm font-black uppercase tracking-wider text-dim group-hover:text-yellow-500 transition-colors">PO Tracking</h2>
                        </div>
                        <div className="h-[220px] w-full relative z-10">
                            {poData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={poData} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none" label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`} labelLine={false}>
                                            {poData.map((e, index) => <Cell key={`cell-${index}`} fill={e.color} />)}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px', fontWeight: 600 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-dim font-bold uppercase">No PO Data</div>
                            )}
                        </div>
                    </div>

                    {/* 6. Staff Analytics (Clickable) */}
                    <div 
                        onClick={() => navigate('staff-performance')}
                        className="rounded-3xl border p-6 flex flex-col shadow-sm cursor-pointer hover:border-orange-500 hover:shadow-orange-500/10 group transition-all duration-300 relative overflow-hidden" 
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-orange-500/20 transition-all" />
                        <div className="flex items-center gap-3 mb-4 relative z-10">
                            <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
                                <Briefcase size={20} className="group-hover:scale-110 transition-transform" />
                            </div>
                            <h2 className="text-sm font-black uppercase tracking-wider text-dim group-hover:text-orange-500 transition-colors">Staff Operations</h2>
                        </div>
                        <div className="h-[220px] w-full relative z-10">
                            {staffData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={staffData} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-main)" horizontal={false} />
                                        <XAxis type="number" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                                        <YAxis dataKey="name" type="category" stroke="var(--text-dim)" fontSize={10} tickLine={false} axisLine={false} />
                                        <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '8px', color: 'var(--text-main)', fontSize: '12px' }} />
                                        <Bar dataKey="count" name="Staff" radius={[0, 4, 4, 0]} maxBarSize={20}>
                                            {staffData.map((e, index) => <Cell key={`cell-${index}`} fill={e.fill} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-dim font-bold uppercase">No Staff Data</div>
                            )}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

export default ExecutiveDashboard;
