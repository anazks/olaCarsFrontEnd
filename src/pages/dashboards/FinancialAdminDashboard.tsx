import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, 
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, AreaChart, Area 
} from 'recharts';
import { 
    Car, Users, DollarSign, ShieldAlert, ArrowUpRight, Calendar, 
    MapPin, Building, ChevronRight, Briefcase, CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';

// Services
import { getFinancialDashboardSummary } from '../../services/dashboardService';
import { getAllBranches } from '../../services/branchService';



const FinancialAdminDashboard = () => {
    
    // State
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [branches, setBranches] = useState<any[]>([]);

    // Filter State
    const [filters, setFilters] = useState({
        country: '',
        branch: '',
        startDate: '',
        endDate: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getFinancialDashboardSummary(filters);
            setDashboardData(data);
            
            if (branches.length === 0) {
                const bRes = await getAllBranches({ limit: 100 });
                setBranches(bRes.data || []);
            }
        } catch (error) {
            console.error('Error reloading dashboard', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filters.country, filters.branch, filters.startDate, filters.endDate]);

    const handleFilterChange = (key: string, val: string) => {
        setFilters(prev => ({ ...prev, [key]: val }));
    };

    if (loading && !dashboardData) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-[#0f172a]">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#148F85]"></div>
            </div>
        );
    }

    const { stats, alerts, fleetStatus, revenueOverview, overduePayments, vehicleMovement } = dashboardData || {};

    // Donut Data format
    const donutData = [
        { name: 'Available', value: fleetStatus?.available || 0, color: '#22C55E' },
        { name: 'Maintenance', value: fleetStatus?.maintenance || 0, color: '#F97316' },
        { name: 'Rented', value: fleetStatus?.rented || 0, color: '#EAB308' },
        { name: 'Retired', value: fleetStatus?.retired || 0, color: '#94A3B8' }
    ].filter(i => i.value > 0);

    const totalVehicles = dashboardData?.totalVehicles || 0;

    return (
        <div className="p-6 md:p-8 bg-gray-50 dark:bg-[#0f172a] min-h-screen transition-colors duration-300">
            
            {/* Top Control Header */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                        <Briefcase className="text-[#148F85]" /> Executive Dashboard
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Live orchestration across operating ecosystems</p>
                </div>

                {/* Floating Filter Bar */}
                <div className="bg-white dark:bg-[#1e293b] shadow-sm dark:shadow-none dark:border dark:border-slate-700 p-2 rounded-2xl flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    
                    {/* Country Select */}
                    <div className="relative">
                        <select 
                            value={filters.country} 
                            onChange={(e) => handleFilterChange('country', e.target.value)}
                            className="pl-8 pr-6 py-2 text-sm font-semibold border-none outline-none bg-transparent text-slate-700 dark:text-slate-200 appearance-none cursor-pointer"
                        >
                            <option value="">All Countries</option>
                            <option value="India">India</option>
                            <option value="Mexico">Mexico</option>
                            <option value="Ghana">Ghana</option>
                        </select>
                        <MapPin size={15} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

                    {/* Branch Select */}
                    <div className="relative">
                        <select 
                            value={filters.branch} 
                            onChange={(e) => handleFilterChange('branch', e.target.value)}
                            className="pl-8 pr-6 py-2 text-sm font-semibold border-none outline-none bg-transparent text-slate-700 dark:text-slate-200 appearance-none cursor-pointer max-w-[150px]"
                        >
                            <option value="">All Branches</option>
                            {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                        </select>
                        <Building size={15} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

                    {/* Date */}
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 rounded-xl px-3 py-1.5">
                        <Calendar size={15} className="text-slate-500" />
                        <input 
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => handleFilterChange('startDate', e.target.value)}
                            className="bg-transparent text-xs font-bold border-none outline-none text-slate-700 dark:text-slate-200"
                        />
                        <span className="text-slate-400 text-xs">-</span>
                        <input 
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => handleFilterChange('endDate', e.target.value)}
                            className="bg-transparent text-xs font-bold border-none outline-none text-slate-700 dark:text-slate-200"
                        />
                    </div>
                </div>
            </div>

            {/* ── MAIN GRID LAYOUT ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* 1. Primary Stats Grid (Top-Left Large Box Area) */}
                <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DashboardStatCard 
                        title="Total Active Vehicles" 
                        value={(stats?.totalActiveVehicles || 0).toLocaleString()}
                        trend="+4.6%"
                        trendUp={true}
                        icon={<Car className="text-[#A3E635]" />}
                        iconBg="bg-[#ECFCCB]"
                    />
                    <DashboardStatCard 
                        title="Monthly Revenue" 
                        value={`$${((stats?.monthlyRevenue || 0) / 1000000).toFixed(2)}M`}
                        trend="+12.3%"
                        trendUp={true}
                        icon={<DollarSign className="text-green-600" />}
                        iconBg="bg-green-100"
                    />
                    <DashboardStatCard 
                        title="Outstanding Collections" 
                        value={`$${(stats?.outstandingCollections || 0).toLocaleString()}`}
                        trend="-3.8%"
                        trendUp={false}
                        icon={<Briefcase className="text-orange-600" />}
                        iconBg="bg-orange-100"
                    />
                    <DashboardStatCard 
                        title="Active Drivers" 
                        value={(stats?.activeDrivers || 0).toLocaleString()}
                        trend="+2.1%"
                        trendUp={true}
                        icon={<Users className="text-blue-600" />}
                        iconBg="bg-blue-100"
                    />
                </div>

                {/* 2. Alerts Side Panel */}
                <div className="lg:col-span-4 bg-white dark:bg-[#1e293b] rounded-3xl p-6 shadow-sm flex flex-col border border-transparent dark:border-slate-700/50">
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="text-lg font-bold dark:text-white">Priority Alerts</h3>
                        <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400"><span className="block h-1.5 w-1.5 rounded-full bg-slate-400 mb-0.5"></span><span className="block h-1.5 w-1.5 rounded-full bg-slate-400 mb-0.5"></span><span className="block h-1.5 w-1.5 rounded-full bg-slate-400"></span></button>
                    </div>

                    <div className="flex flex-col gap-3">
                        <AlertPill title="Critical" count={alerts?.CRITICAL || 0} colorClass="bg-red-600" description="Vehicle Accidents / Immediate Attention" />
                        <AlertPill title="Major" count={alerts?.MAJOR || 0} colorClass="bg-orange-500" description="Payment Overdue Escalations" />
                        <AlertPill title="Minor" count={alerts?.MINOR || 0} colorClass="bg-blue-600" description="General Maintenance Due" />
                    </div>
                </div>

                {/* ── SECONDARY ROW ── */}
                {/* 3. Secondary Mini Stats */}
                <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <MiniStatCard 
                        title="Collection Compliance" 
                        value={`${stats?.collectionCompliance || 0}%`} 
                        subtext="+2% week over week" 
                        icon={<CheckCircle className="text-emerald-600" />} 
                        color="emerald" 
                    />
                    <MiniStatCard 
                        title="Last 12 Months Revenue" 
                        value={`$${(stats?.last12MonthsRevenue || 0).toLocaleString()}`} 
                        subtext="Aggregated run-rate" 
                        icon={<DollarSign className="text-blue-600" />} 
                        color="blue" 
                    />
                    <MiniStatCard 
                        title="Outstanding Balance" 
                        value={`$${(stats?.outstandingBalance || 0).toLocaleString()}`} 
                        subtext="+11% vs previous period" 
                        icon={<Briefcase className="text-amber-600" />} 
                        color="amber" 
                    />
                </div>

                {/* 4. Operations Snapshot */}
                <div className="lg:col-span-4 bg-white dark:bg-[#1e293b] rounded-3xl p-5 shadow-sm border border-transparent dark:border-slate-700/50">
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Operations Overview</h3>
                    <div className="flex gap-2">
                        <OpBadge count={18} label="Overdue Tasks" color="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" />
                        <OpBadge count={11} label="Upcoming Tasks" color="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300" />
                        <OpBadge count={9} label="Assigned Tasks" color="bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300" />
                    </div>
                </div>

                {/* ── MIDDLE SECTION: CHARTS ── */}
                
                {/* 5. Revenue Area Chart */}
                <div className="lg:col-span-8 bg-white dark:bg-[#1e293b] rounded-3xl p-6 shadow-sm border border-transparent dark:border-slate-700/50">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-bold dark:text-white">Revenue Overview</h3>
                            <div className="flex gap-4 text-xs font-semibold text-slate-400 mt-1">
                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-300"></div> Previous Year</span>
                                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#D9F99D]"></div> Current Year</span>
                            </div>
                        </div>
                        {/* Time period buttons */}
                        <div className="flex gap-1 bg-gray-50 dark:bg-slate-800 p-1 rounded-lg">
                            {['1W', '1M', '3M', '1Y'].map(t => (
                                <button key={t} className={`px-3 py-1 text-xs font-bold rounded-md transition ${t === '1Y' ? 'bg-[#D9F99D] text-black shadow-sm' : 'text-slate-400 hover:text-slate-700 dark:hover:text-white'}`}>{t}</button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Collected</p>
                            <h4 className="text-xl font-extrabold text-[#D9F99D] dark:text-lime-400">$842,120</h4>
                            <p className="text-[10px] font-medium text-slate-400">Last 12 months</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Plan</p>
                            <h4 className="text-xl font-extrabold text-slate-800 dark:text-slate-200">$872,000</h4>
                            <p className="text-[10px] font-medium text-slate-400">Annual target</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Difference</p>
                            <h4 className="text-xl font-extrabold text-yellow-500">$29,880</h4>
                            <p className="text-[10px] font-medium text-slate-400">Remaining to target</p>
                        </div>
                    </div>

                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueOverview} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorCurr" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#A3E635" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#A3E635" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v/1000)}K`} />
                                <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} />
                                <Area type="monotone" dataKey="previousYear" stroke="#CBD5E1" fill="transparent" strokeWidth={3} />
                                <Area type="monotone" dataKey="currentYear" stroke="#A3E635" strokeWidth={4} fillOpacity={1} fill="url(#colorCurr)" dot={{ fill: '#A3E635', r: 4 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 6. Fleet Status Donut */}
                <div className="lg:col-span-4 bg-white dark:bg-[#1e293b] rounded-3xl p-6 shadow-sm border border-transparent dark:border-slate-700/50 relative overflow-hidden">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold dark:text-white">Fleet Status</h3>
                        <button className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><span className="block h-1 w-1 bg-slate-400 rounded-full mb-0.5"></span><span className="block h-1 w-1 bg-slate-400 rounded-full mb-0.5"></span><span className="block h-1 w-1 bg-slate-400 rounded-full"></span></button>
                    </div>
                    <p className="text-xs font-medium text-slate-400 mb-4">Live vehicle distribution</p>

                    <div className="h-[240px] relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={donutData} 
                                    innerRadius={70} 
                                    outerRadius={100} 
                                    paddingAngle={5} 
                                    dataKey="value" 
                                    stroke="none"
                                    cornerRadius={5}
                                >
                                    {donutData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Floating Center Labels */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-black text-slate-800 dark:text-white">{totalVehicles.toLocaleString()}</span>
                            <span className="text-xs font-semibold text-slate-400">Vehicles</span>
                        </div>

                        {/* Embedded overlay badge mimics screenshot */}
                        <div className="absolute right-0 top-8 bg-black text-white rounded-lg p-2 text-[10px]">
                            <span className="text-slate-400">Fleet Utilization</span>
                            <div className="text-sm font-bold text-lime-400">83%</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                        {donutData.map((item) => (
                            <div key={item.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                                    {item.name}
                                </div>
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-baseline gap-1">
                                    {item.value}
                                    <span className="text-[9px] font-medium text-slate-400">({Math.round((item.value/totalVehicles)*100)}%)</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── BOTTOM SECTION ── */}
                {/* 7. Tabs Section Placeholder for Summary */}
                <div className="lg:col-span-7 bg-white dark:bg-[#1e293b] rounded-3xl shadow-sm border border-transparent dark:border-slate-700/50 overflow-hidden flex flex-col">
                    <div className="border-b dark:border-slate-800 px-6 flex gap-6 pt-4">
                        {['Overview', 'Vehicles', 'Collections', 'Risk', 'Drivers'].map((tab, idx) => (
                            <div key={tab} className={`text-sm font-bold pb-3 cursor-pointer ${idx===0 ? 'text-lime-600 dark:text-lime-400 border-b-2 border-lime-500' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>{tab}</div>
                        ))}
                    </div>
                    
                    <div className="p-8 grid grid-cols-3 divide-x divide-slate-100 dark:divide-slate-800 h-full flex-1 items-center">
                        <div className="pr-4 flex flex-col justify-center">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600"><Car size={24} /></div>
                                <div>
                                    <div className="text-3xl font-extrabold dark:text-white">{totalVehicles}</div>
                                    <div className="text-xs font-semibold text-slate-400">Total Vehicles</div>
                                </div>
                            </div>
                            <ul className="space-y-1.5">
                                <li className="text-sm font-medium text-slate-700 dark:text-slate-300 flex justify-between"><span>Active</span> <b className="font-bold">{(fleetStatus?.available + fleetStatus?.rented)}</b></li>
                                <li className="text-sm font-medium text-slate-700 dark:text-slate-300 flex justify-between"><span>Assigned</span> <b className="font-bold">{fleetStatus?.rented}</b></li>
                                <li className="text-sm font-medium text-slate-700 dark:text-slate-300 flex justify-between"><span>Unassigned</span> <b className="font-bold">{fleetStatus?.available}</b></li>
                            </ul>
                        </div>

                        <div className="px-6 flex flex-col justify-center">
                            <div className="text-3xl font-extrabold text-slate-800 dark:text-white mb-1">{stats?.activeDrivers}</div>
                            <div className="text-xs font-bold text-slate-400 uppercase mb-4">Active Vehicles</div>
                            <ul className="space-y-2">
                                <li className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> On Rent</li>
                                <li className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> Maintenance</li>
                                <li className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400"><div className="w-2 h-2 rounded-full bg-purple-400"></div> Idle</li>
                            </ul>
                        </div>

                        <div className="pl-6 flex flex-col justify-center">
                            <div className="text-3xl font-extrabold text-slate-800 dark:text-white mb-1">08</div>
                            <div className="text-xs font-bold text-slate-400 uppercase mb-2">Unassigned Vehicles</div>
                            <p className="text-xs text-slate-500 leading-relaxed">Vehicles cleared from staging and available for driver assignment globally.</p>
                        </div>
                    </div>
                </div>

                {/* 8. Overdue Payments Table */}
                <div className="lg:col-span-5 bg-white dark:bg-[#1e293b] rounded-3xl p-6 shadow-sm border border-transparent dark:border-slate-700/50">
                    <h3 className="text-base font-bold mb-4 dark:text-white">Recent Overdue Payments</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 dark:border-slate-800">
                                    <th className="pb-3">Customer</th>
                                    <th className="pb-3">Vehicle</th>
                                    <th className="pb-3">Amount</th>
                                    <th className="pb-3">Due Date</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs font-medium text-slate-700 dark:text-slate-300 divide-y divide-slate-50 dark:divide-slate-800">
                                {overduePayments?.map((pay: any, i: number) => (
                                    <tr key={i}>
                                        <td className="py-3.5 pr-2 truncate max-w-[120px] font-bold text-slate-800 dark:text-slate-200">{pay.customerName}</td>
                                        <td className="py-3.5 pr-2">{pay.vehicleNumber}</td>
                                        <td className="py-3.5 pr-2 font-bold">${pay.amount?.toLocaleString()}</td>
                                        <td className="py-3.5">
                                            <div>{format(new Date(pay.dueDate), 'dd MMM yyyy')}</div>
                                            <div className="text-[10px] text-red-500 flex items-center gap-1 font-bold mt-0.5"><div className="w-1 h-1 bg-red-500 rounded-full animate-pulse"></div> {pay.daysOverdue} Days</div>
                                        </td>
                                    </tr>
                                ))}
                                {(!overduePayments || overduePayments.length === 0) && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-10 text-slate-400 font-medium italic">No pending overdue payments found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── FULL WIDTH GRAPH REPLICATING SCREENSHOT 2 ── */}
                {/* 9. Vehicles Movement Analysis */}
                <div className="lg:col-span-12 bg-white dark:bg-[#1e293b] rounded-3xl p-6 shadow-sm border border-transparent dark:border-slate-700/50 mt-2">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-extrabold tracking-wide text-slate-800 dark:text-white uppercase">Vehicles Movement Analysis</h3>
                    </div>

                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={vehicleMovement} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                <XAxis 
                                    dataKey="date" 
                                    tickFormatter={(str) => format(new Date(str), 'M/d/yyyy')} 
                                    fontSize={10} 
                                    fontFamily="monospace"
                                    angle={-45}
                                    textAnchor="end"
                                    height={50}
                                    dy={10}
                                    stroke="#94A3B8"
                                />
                                <YAxis stroke="#94A3B8" fontSize={11} axisLine={false} tickLine={false} />
                                <RechartsTooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                                <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                                
                                {/* Mimic standard Line colors seen in provided chart snippet */}
                                <Line type="monotone" dataKey="removed" stroke="#71A078" strokeWidth={4} dot={false} name="Removed" />
                                <Line type="monotone" dataKey="returned" stroke="#3B6EAD" strokeWidth={4} dot={false} name="Returned" />
                                <Line type="monotone" dataKey="sale" stroke="#EEB341" strokeWidth={4} dot={false} name="Sale" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── HELPER SUB-COMPONENTS ──

const DashboardStatCard = ({ title, value, trend, trendUp, icon, iconBg }: any) => (
    <div className="bg-white dark:bg-[#1e293b] rounded-3xl p-6 shadow-sm flex flex-col justify-between border border-transparent dark:border-slate-700/50 transition-transform hover:scale-[1.01] duration-200">
        <div className="flex justify-between items-start">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${iconBg}`}>
                {icon}
            </div>
            <div className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${trendUp ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                {trendUp ? <ArrowUpRight size={12} /> : <div className="rotate-90"><ArrowUpRight size={12} /></div>} {trend}
            </div>
        </div>
        <div className="mt-6">
            <div className="text-3xl font-black text-slate-800 dark:text-white">{value}</div>
            <div className="text-sm font-semibold text-slate-400 dark:text-slate-500 mt-1">{title}</div>
        </div>
    </div>
);

const AlertPill = ({ title, count, colorClass, description }: any) => (
    <div className={`${colorClass} text-white rounded-2xl p-4 relative flex items-center shadow-md group cursor-pointer overflow-hidden transition-transform hover:-translate-y-0.5`}>
        <div className="flex-1 z-10">
            <div className="flex items-center gap-2 font-extrabold text-lg uppercase tracking-wide">
                <ShieldAlert size={18} /> {title} ({count})
            </div>
            <div className="text-xs opacity-90 font-medium mt-1">{description}</div>
        </div>
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center z-10 backdrop-blur-sm group-hover:bg-white/30">
            <ChevronRight size={18} className="rotate-[-45deg]" />
        </div>
    </div>
);

const MiniStatCard = ({ title, value, subtext, icon, color }: any) => {
    const colors: any = {
        emerald: 'text-emerald-600 bg-emerald-50',
        blue: 'text-blue-600 bg-blue-50',
        amber: 'text-amber-600 bg-amber-50'
    };
    return (
        <div className="bg-white dark:bg-[#1e293b] rounded-3xl p-5 shadow-sm border border-transparent dark:border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-xl ${colors[color] || 'bg-gray-50'}`}>
                    {icon}
                </div>
                <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-lg">+2%</div>
            </div>
            <div className="text-2xl font-black text-slate-800 dark:text-white mb-1">{value}</div>
            <div className="text-xs font-semibold text-slate-500 mb-2 truncate">{title}</div>
            <div className="text-[10px] font-medium text-slate-400">{subtext}</div>
        </div>
    );
};

const OpBadge = ({ count, label, color }: any) => (
    <div className={`flex-1 rounded-xl p-3 flex items-center gap-3 ${color} transition-opacity hover:opacity-90 cursor-pointer`}>
        <div className="text-xl font-black leading-none">{count.toString().padStart(2, '0')}</div>
        <div className="text-[10px] font-bold leading-tight uppercase tracking-wider">{label.split(' ').join('\n')}</div>
    </div>
);

export default FinancialAdminDashboard;
