import { useState, useEffect, useMemo } from 'react';
import { Landmark, Calendar, Download, RefreshCw, Globe, Building2, TrendingUp, ShieldAlert, PieChart } from 'lucide-react';
import { getBalanceSheetReport } from '../../../services/reportingService';
import type { BalanceSheetReport } from '../../../services/reportingService';
import { getAllBranches } from '../../../services/branchService';
import type { Branch } from '../../../services/branchService';
import { getUser, getUserRole } from '../../../utils/auth';

const BalanceSheet = () => {
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState<BalanceSheetReport | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [countries, setCountries] = useState<string[]>([]);
    
    const user = getUser();
    const userRole = getUserRole();

    const [filters, setFilters] = useState({
        country: userRole === 'countrymanager' ? user?.country || '' : '',
        branch: '',
        endDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const response = await getAllBranches({ limit: 1000 });
                const allBranches = response.data || [];
                setBranches(allBranches);
                
                // Extract unique countries
                const uniqueCountries = Array.from(new Set(allBranches.map(b => b.country)));
                setCountries(uniqueCountries);
            } catch (error) {
                console.error('Failed to fetch branches', error);
            }
        };
        fetchBranches();
    }, []);

    const filteredBranches = useMemo(() => {
        if (!filters.country) return branches;
        return branches.filter(b => b.country === filters.country);
    }, [branches, filters.country]);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const data = await getBalanceSheetReport(filters);
            setReportData(data);
        } catch (error) {
            console.error('Failed to fetch balance sheet', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [filters.country, filters.branch, filters.endDate]);

    const handleCountryChange = (country: string) => {
        setFilters({ ...filters, country, branch: '' });
    };

    return (
        <div className="container-responsive space-y-6 pb-12 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#C8E600] to-[#98B000] text-[#0A0A0A] shadow-[0_0_20px_rgba(200,230,0,0.2)]">
                            <Landmark size={24} />
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Balance Sheet</h1>
                    </div>
                    <p className="text-sm text-white/40 max-w-md">
                        Comprehensive statement of financial position. Consolidated view across {filters.country || 'all countries'} {filters.branch && `and branch ${branches.find(b => b._id === filters.branch)?.name}`}.
                    </p>
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-all">
                        <Download size={18} /> Export
                    </button>
                    <button 
                        onClick={fetchReport}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold bg-[#C8E600] text-[#0A0A0A] hover:shadow-[0_0_25px_rgba(200,230,0,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            {/* Filter Hub */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-2 bg-white/5 border border-white/10 rounded-[2rem] backdrop-blur-xl">
                {/* Country Selector */}
                <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#C8E600] transition-colors">
                        <Globe size={18} />
                    </div>
                    <select 
                        value={filters.country}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        disabled={userRole === 'countrymanager'}
                        className="w-full bg-transparent border-none pl-12 pr-4 py-4 text-sm font-bold text-white focus:ring-0 appearance-none cursor-pointer disabled:opacity-50"
                    >
                        <option value="" className="bg-[#1A1A1A]">Global (All Countries)</option>
                        {countries.map(c => (
                            <option key={c} value={c} className="bg-[#1A1A1A]">{c}</option>
                        ))}
                    </select>
                </div>

                {/* Branch Selector */}
                <div className="relative group border-y md:border-y-0 md:border-x border-white/10">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#C8E600] transition-colors">
                        <Building2 size={18} />
                    </div>
                    <select 
                        value={filters.branch}
                        onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
                        className="w-full bg-transparent border-none pl-12 pr-4 py-4 text-sm font-bold text-white focus:ring-0 appearance-none cursor-pointer"
                    >
                        <option value="" className="bg-[#1A1A1A]">Consolidated Branches</option>
                        {filteredBranches.map(b => (
                            <option key={b._id} value={b._id} className="bg-[#1A1A1A]">{b.name} ({b.city})</option>
                        ))}
                    </select>
                </div>

                {/* Date Selector */}
                <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#C8E600] transition-colors">
                        <Calendar size={18} />
                    </div>
                    <input 
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className="w-full bg-transparent border-none pl-12 pr-4 py-4 text-sm font-bold text-white focus:ring-0 appearance-none cursor-pointer"
                        style={{ colorScheme: 'dark' }}
                    />
                </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Side: Financial Data */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Assets Card */}
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden group hover:border-[#C8E600]/30 transition-all duration-500">
                        <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#C8E600]/10 flex items-center justify-center text-[#C8E600]">
                                    <TrendingUp size={20} />
                                </div>
                                <h3 className="text-xl font-bold text-white">Assets</h3>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-1">Total Assets</p>
                                <p className="text-2xl font-mono font-bold text-[#C8E600]">${reportData?.assetsTotal?.toLocaleString() || '0'}</p>
                            </div>
                        </div>
                        <div className="p-8">
                            <div className="space-y-4">
                                {loading ? (
                                    <div className="flex justify-center py-12">
                                        <div className="w-8 h-8 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : !reportData?.assets || reportData.assets.length === 0 ? (
                                    <p className="text-white/20 italic text-center py-4">No assets recorded for this period</p>
                                ) : (
                                    reportData.assets.map((asset, idx) => (
                                        <div key={idx} className="flex justify-between items-center group/item p-4 rounded-2xl hover:bg-white/5 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#C8E600]" />
                                                <span className="text-white/60 group-hover/item:text-white transition-colors">{asset.name}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="h-px w-24 bg-white/5 hidden sm:block" />
                                                <span className="text-sm font-mono font-bold text-white">${asset.amount.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Liabilities & Equity Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Liabilities */}
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden hover:border-rose-500/30 transition-all duration-500">
                            <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                                <h3 className="text-lg font-bold text-white flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                                        <ShieldAlert size={16} />
                                    </div>
                                    Liabilities
                                </h3>
                            </div>
                            <div className="p-6 space-y-4">
                                {loading ? (
                                    <div className="h-20 animate-pulse bg-white/5 rounded-xl" />
                                ) : (
                                    reportData?.liabilities?.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <span className="text-white/40">{item.name}</span>
                                            <span className="font-mono text-white">${item.amount.toLocaleString()}</span>
                                        </div>
                                    ))
                                )}
                                <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                                    <span className="font-bold text-white/60">Total</span>
                                    <span className="text-lg font-mono font-bold text-rose-500">${reportData?.liabilitiesTotal?.toLocaleString() || '0'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Equity */}
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden hover:border-blue-500/30 transition-all duration-500">
                            <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                                <h3 className="text-lg font-bold text-white flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                                        <PieChart size={16} />
                                    </div>
                                    Equity
                                </h3>
                            </div>
                            <div className="p-6 space-y-4">
                                {loading ? (
                                    <div className="h-20 animate-pulse bg-white/5 rounded-xl" />
                                ) : (
                                    reportData?.equity?.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <span className="text-white/40">{item.name}</span>
                                            <span className="font-mono text-white">${item.amount.toLocaleString()}</span>
                                        </div>
                                    ))
                                )}
                                <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                                    <span className="font-bold text-white/60">Total</span>
                                    <span className="text-lg font-mono font-bold text-blue-500">${reportData?.equityTotal?.toLocaleString() || '0'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Right Side: Insights & Equation */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Equation Check */}
                    <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C8E600]/10 blur-[100px]" />
                        
                        <h4 className="text-sm font-bold text-white/40 uppercase tracking-[0.2em] mb-8">Accounting Equation</h4>
                        
                        <div className="space-y-6">
                            <div>
                                <p className="text-[10px] font-bold text-[#C8E600] uppercase mb-2">Total Assets</p>
                                <p className="text-4xl font-mono font-bold text-white">${reportData?.assetsTotal?.toLocaleString() || '0'}</p>
                            </div>
                            
                            <div className="w-full h-px bg-white/10 flex items-center justify-center">
                                <div className="px-3 bg-[#0A0A0A] text-2xl font-bold text-white/20">=</div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-rose-500 uppercase mb-1">Liabilities</p>
                                    <p className="text-lg font-mono font-bold text-white">${reportData?.liabilitiesTotal?.toLocaleString() || '0'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-blue-500 uppercase mb-1">Equity</p>
                                    <p className="text-lg font-mono font-bold text-white">${reportData?.equityTotal?.toLocaleString() || '0'}</p>
                                </div>
                            </div>

                            <div className={`mt-8 p-4 rounded-2xl flex items-center gap-3 ${
                                reportData && Math.abs((reportData.assetsTotal || 0) - ((reportData.liabilitiesTotal || 0) + (reportData.equityTotal || 0))) < 0.01
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            }`}>
                                <div className={`w-2 h-2 rounded-full animate-pulse ${
                                    reportData && Math.abs((reportData.assetsTotal || 0) - ((reportData.liabilitiesTotal || 0) + (reportData.equityTotal || 0))) < 0.01
                                    ? 'bg-emerald-500'
                                    : 'bg-rose-500'
                                }`} />
                                <span className="text-xs font-bold uppercase tracking-wider">
                                    {reportData && Math.abs((reportData.assetsTotal || 0) - ((reportData.liabilitiesTotal || 0) + (reportData.equityTotal || 0))) < 0.01
                                    ? 'Books are Balanced'
                                    : 'Imbalance Detected'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Metrics */}
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6">
                        <h4 className="text-sm font-bold text-white/60">Quick Metrics</h4>
                        
                        <div className="space-y-4">
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] text-white/40 uppercase">Debt-to-Equity</p>
                                    <p className="text-xl font-mono font-bold text-white">
                                        {(reportData?.equityTotal ? reportData.liabilitiesTotal / reportData.equityTotal : 0).toFixed(2)}
                                    </p>
                                </div>
                                <div className="w-16 h-8 bg-white/5 rounded overflow-hidden">
                                    <div className="h-full bg-rose-500/50" style={{ width: '65%' }} />
                                </div>
                            </div>

                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] text-white/40 uppercase">Liquidity Ratio</p>
                                    <p className="text-xl font-mono font-bold text-white">1.84</p>
                                </div>
                                <div className="w-16 h-8 bg-white/5 rounded overflow-hidden">
                                    <div className="h-full bg-emerald-500/50" style={{ width: '80%' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BalanceSheet;
