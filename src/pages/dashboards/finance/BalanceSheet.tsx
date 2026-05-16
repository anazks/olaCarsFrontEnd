import { useState, useEffect, useMemo } from 'react';
import { Landmark, Calendar, Download, RefreshCw, Globe, Building2, TrendingUp, ShieldAlert, PieChart, FileText } from 'lucide-react';
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

    // Accounting Metrics Helper
    const metrics = useMemo(() => {
        const assets = reportData?.assetsTotal || 0;
        const liabilities = reportData?.liabilitiesTotal || 0;
        const equity = reportData?.equityTotal || 0;

        const debtToEquity = equity !== 0 ? (liabilities / equity) : 0;
        const assetCoverage = liabilities !== 0 ? (assets / liabilities) : assets > 0 ? 100 : 0;
        const equityRatio = assets !== 0 ? (equity / assets) : 0;

        const isBalanced = Math.abs(assets - (liabilities + equity)) < 0.01;

        return { debtToEquity, assetCoverage, equityRatio, isBalanced };
    }, [reportData]);

    const formatValue = (val: number | undefined) => {
        if (val === undefined) return '$0.00';
        return val < 0 ? `-$${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
                        <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>Balance Sheet</h1>
                    </div>
                    <p className="text-sm max-w-md" style={{ color: 'var(--text-muted)' }}>
                        Comprehensive statement of financial position. Consolidated view across {filters.country || 'all countries'} {filters.branch && `and branch ${branches.find(b => b._id === filters.branch)?.name}`}.
                    </p>
                </div>
                
                <div className="flex gap-3 w-full md:w-auto">
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all shadow-sm"
                            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-muted)' }}>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-2 rounded-3xl shadow-sm"
                 style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-main)' }}>
                
                {/* Country Selector */}
                <div className="relative group flex items-center">
                    <div className="absolute left-4 transition-colors" style={{ color: 'var(--text-dim)' }}>
                        <Globe size={18} />
                    </div>
                    <select 
                        value={filters.country}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        disabled={userRole === 'countrymanager'}
                        className="w-full bg-transparent border-none pl-12 pr-4 py-4 text-sm font-bold focus:ring-0 appearance-none cursor-pointer disabled:opacity-50"
                        style={{ color: 'var(--text-main)' }}
                    >
                        <option value="" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>Global (All Countries)</option>
                        {countries.map(c => (
                            <option key={c} value={c} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>{c}</option>
                        ))}
                    </select>
                </div>

                {/* Branch Selector */}
                <div className="relative group border-y md:border-y-0 md:border-x flex items-center"
                     style={{ borderColor: 'var(--border-main)' }}>
                    <div className="absolute left-4 transition-colors" style={{ color: 'var(--text-dim)' }}>
                        <Building2 size={18} />
                    </div>
                    <select 
                        value={filters.branch}
                        onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
                        className="w-full bg-transparent border-none pl-12 pr-4 py-4 text-sm font-bold focus:ring-0 appearance-none cursor-pointer"
                        style={{ color: 'var(--text-main)' }}
                    >
                        <option value="" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>Consolidated Branches</option>
                        {filteredBranches.map(b => (
                            <option key={b._id} value={b._id} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}>{b.name} ({b.city})</option>
                        ))}
                    </select>
                </div>

                {/* Date Selector */}
                <div className="relative group flex items-center">
                    <div className="absolute left-4 transition-colors" style={{ color: 'var(--text-dim)' }}>
                        <Calendar size={18} />
                    </div>
                    <input 
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className="w-full bg-transparent border-none pl-12 pr-4 py-4 text-sm font-bold focus:ring-0 appearance-none cursor-pointer"
                        style={{ color: 'var(--text-main)' }}
                    />
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Side: Statement Sheet */}
                <div className="lg:col-span-8 space-y-8">
                    
                    <div className="rounded-3xl overflow-hidden shadow-lg transition-all duration-500"
                         style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-main)' }}>
                        
                        <div className="p-8 flex justify-between items-center border-b"
                             style={{ backgroundColor: 'var(--bg-main)', opacity: '0.95', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#C8E600]/10 flex items-center justify-center text-[#C8E600]">
                                    <FileText size={20} />
                                </div>
                                <h3 className="text-xl font-bold text-[var(--text-main)]" style={{ color: 'var(--text-main)' }}>Balance Sheet Statement</h3>
                            </div>
                            <div className="text-[10px] font-bold font-mono uppercase px-3 py-1 rounded-lg border"
                                 style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                                Standard Accrual Basis
                            </div>
                        </div>

                        <div className="p-8">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-24 space-y-4">
                                    <div className="w-10 h-10 border-4 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                                    <p className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Aggregating financial ledger balances...</p>
                                </div>
                            ) : (
                                <div className="space-y-10">
                                    
                                    {/* ASSETS */}
                                    <section>
                                        <h4 className="text-xs font-extrabold text-[#C8E600] uppercase tracking-[0.2em] pb-3 flex items-center gap-2 mb-4 border-b"
                                            style={{ borderColor: 'var(--border-main)' }}>
                                            <TrendingUp size={14} /> ASSETS
                                        </h4>
                                        
                                        <div className="space-y-1 pl-2">
                                            {!reportData?.assets || reportData.assets.length === 0 ? (
                                                <p className="text-sm italic py-2" style={{ color: 'var(--text-dim)' }}>No asset entries to display.</p>
                                            ) : (
                                                reportData.assets.map((asset, idx) => (
                                                    <div key={idx} className="flex justify-between items-center py-3 px-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/[0.03] group transition-all">
                                                        <span className="text-sm font-medium transition-colors flex items-center gap-3"
                                                              style={{ color: 'var(--text-muted)' }}>
                                                            <span className="w-1.5 h-1.5 rounded-full bg-[#C8E600]/40 group-hover:bg-[#C8E600] transition-all"></span>
                                                            {asset.name}
                                                        </span>
                                                        <span className="text-sm font-mono font-bold" style={{ color: 'var(--text-main)' }}>
                                                            {formatValue(asset.amount)}
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        
                                        {/* Asset Subtotal */}
                                        <div className="mt-4 pt-4 px-3 flex justify-between items-center border-t-2 rounded-b-xl"
                                             style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-main)', opacity: 0.9 }}>
                                            <span className="text-sm font-black uppercase" style={{ color: 'var(--text-main)' }}>Total Assets</span>
                                            <span className="text-xl font-mono font-black text-[#C8E600] underline decoration-double underline-offset-4">
                                                {formatValue(reportData?.assetsTotal)}
                                            </span>
                                        </div>
                                    </section>

                                    {/* LIABILITIES */}
                                    <section>
                                        <h4 className="text-xs font-extrabold text-rose-500 uppercase tracking-[0.2em] pb-3 flex items-center gap-2 mb-4 border-b"
                                            style={{ borderColor: 'var(--border-main)' }}>
                                            <ShieldAlert size={14} /> LIABILITIES
                                        </h4>
                                        
                                        <div className="space-y-1 pl-2">
                                            {!reportData?.liabilities || reportData.liabilities.length === 0 ? (
                                                <p className="text-sm italic py-2" style={{ color: 'var(--text-dim)' }}>No liability entries to display.</p>
                                            ) : (
                                                reportData.liabilities.map((liab, idx) => (
                                                    <div key={idx} className="flex justify-between items-center py-3 px-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/[0.03] group transition-all">
                                                        <span className="text-sm font-medium transition-colors flex items-center gap-3"
                                                              style={{ color: 'var(--text-muted)' }}>
                                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500/40 group-hover:bg-rose-500 transition-all"></span>
                                                            {liab.name}
                                                        </span>
                                                        <span className="text-sm font-mono font-bold" style={{ color: 'var(--text-main)' }}>
                                                            {formatValue(liab.amount)}
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        
                                        {/* Liability Subtotal */}
                                        <div className="mt-4 pt-4 px-3 flex justify-between items-center border-t rounded-b-xl"
                                             style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-main)', opacity: 0.8 }}>
                                            <span className="text-sm font-black uppercase" style={{ color: 'var(--text-main)' }}>Total Liabilities</span>
                                            <span className="text-lg font-mono font-bold text-rose-500">
                                                {formatValue(reportData?.liabilitiesTotal)}
                                            </span>
                                        </div>
                                    </section>

                                    {/* EQUITY */}
                                    <section>
                                        <h4 className="text-xs font-extrabold text-blue-500 uppercase tracking-[0.2em] pb-3 flex items-center gap-2 mb-4 border-b"
                                            style={{ borderColor: 'var(--border-main)' }}>
                                            <PieChart size={14} /> EQUITY
                                        </h4>
                                        
                                        <div className="space-y-1 pl-2">
                                            {!reportData?.equity || reportData.equity.length === 0 ? (
                                                <p className="text-sm italic py-2" style={{ color: 'var(--text-dim)' }}>No equity entries configured.</p>
                                            ) : (
                                                reportData.equity.map((eq, idx) => {
                                                    const isCurrentPeriod = eq.name.includes('Current Period');
                                                    return (
                                                        <div key={idx} className={`flex justify-between items-center py-3 px-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/[0.03] group transition-all border border-transparent ${isCurrentPeriod ? 'bg-blue-50/40 dark:bg-blue-500/5 italic font-semibold border-blue-500/10' : ''}`}>
                                                            <span className="text-sm font-medium transition-colors flex items-center gap-3"
                                                                  style={{ color: 'var(--text-muted)' }}>
                                                                <span className={`w-1.5 h-1.5 rounded-full transition-all ${isCurrentPeriod ? 'bg-emerald-500' : 'bg-blue-500/40 group-hover:bg-blue-500'}`}></span>
                                                                {eq.name}
                                                            </span>
                                                            <span className={`text-sm font-mono font-bold ${isCurrentPeriod ? 'text-emerald-500' : ''}`} style={!isCurrentPeriod ? { color: 'var(--text-main)' } : {}}>
                                                                {formatValue(eq.amount)}
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                        
                                        {/* Equity Subtotal */}
                                        <div className="mt-4 pt-4 px-3 flex justify-between items-center border-t rounded-b-xl"
                                             style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-main)', opacity: 0.8 }}>
                                            <span className="text-sm font-black uppercase" style={{ color: 'var(--text-main)' }}>Total Equity</span>
                                            <span className="text-lg font-mono font-bold text-blue-500">
                                                {formatValue(reportData?.equityTotal)}
                                            </span>
                                        </div>
                                    </section>

                                    {/* BALANCING TOTAL FOOTER */}
                                    <section className="pt-8 border-t-4 border-double" style={{ borderColor: 'var(--border-main)' }}>
                                        <div className="p-6 flex justify-between items-center rounded-2xl border shadow-inner bg-gradient-to-r from-transparent to-black/[0.02] dark:to-white/[0.01]"
                                             style={{ borderColor: 'var(--border-main)' }}>
                                            <div>
                                                <span className="text-sm font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>Total Liabilities & Equity</span>
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] mt-1" style={{ color: 'var(--text-dim)' }}>Balances perfectly with Total Assets</p>
                                            </div>
                                            <span className="text-xl font-mono font-black underline decoration-double decoration-[#C8E600] underline-offset-4" style={{ color: 'var(--text-main)' }}>
                                                {formatValue((reportData?.liabilitiesTotal || 0) + (reportData?.equityTotal || 0))}
                                            </span>
                                        </div>
                                    </section>

                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side: Analytical Widget Sidebar */}
                <div className="lg:col-span-4 space-y-8">
                    
                    {/* Equation Check Box */}
                    <div className="rounded-3xl p-8 relative overflow-hidden shadow-lg transition-all duration-300 border"
                         style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        
                        <h4 className="text-xs font-extrabold uppercase tracking-[0.2em] mb-6" style={{ color: 'var(--text-muted)' }}>Accounting Balance Check</h4>
                        
                        <div className="space-y-6 relative">
                            <div className="p-4 border rounded-2xl transition-colors"
                                 style={{ backgroundColor: 'var(--bg-main)', opacity: 0.95, borderColor: 'var(--border-main)' }}>
                                <p className="text-[10px] font-bold text-[#C8E600] uppercase tracking-wider mb-1">Total Assets</p>
                                <p className="text-3xl font-mono font-extrabold" style={{ color: 'var(--text-main)' }}>
                                    {formatValue(reportData?.assetsTotal)}
                                </p>
                            </div>
                            
                            <div className="flex items-center justify-center py-1 relative">
                                <div className="w-full h-px" style={{ backgroundColor: 'var(--border-main)' }} />
                                <div className="absolute w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold border shadow-sm bg-white dark:bg-dark-card"
                                     style={{ borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}>
                                    =
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 border rounded-2xl transition-colors"
                                     style={{ backgroundColor: 'var(--bg-main)', opacity: 0.95, borderColor: 'var(--border-main)' }}>
                                    <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-1">Liabilities</p>
                                    <p className="text-base font-mono font-extrabold" style={{ color: 'var(--text-main)' }}>
                                        {formatValue(reportData?.liabilitiesTotal)}
                                    </p>
                                </div>
                                <div className="p-4 border rounded-2xl transition-colors"
                                     style={{ backgroundColor: 'var(--bg-main)', opacity: 0.95, borderColor: 'var(--border-main)' }}>
                                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Equity</p>
                                    <p className="text-base font-mono font-extrabold" style={{ color: 'var(--text-main)' }}>
                                        {formatValue(reportData?.equityTotal)}
                                    </p>
                                </div>
                            </div>

                            {/* Balancing State Dynamic Card */}
                            <div className={`mt-8 p-4 rounded-2xl flex items-center gap-3 border transition-all duration-500 ${
                                metrics.isBalanced
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 animate-pulse'
                            }`}>
                                <div className={`w-2.5 h-2.5 rounded-full ${
                                    metrics.isBalanced ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                                }`} />
                                <span className="text-xs font-extrabold uppercase tracking-widest">
                                    {metrics.isBalanced ? 'Books are Balanced' : 'Imbalance Identified'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Dynamic Ratios Dashboard Widget */}
                    <div className="rounded-3xl p-8 space-y-6 shadow-lg transition-all duration-300 border"
                         style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div>
                            <h4 className="text-xs font-extrabold uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--text-muted)' }}>Key Performance Ratios</h4>
                            <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>Generated instantly from statement data</p>
                        </div>
                        
                        <div className="space-y-5 pt-2">
                            
                            {/* Leverage: Debt-to-Equity */}
                            <div className="flex flex-col gap-2 p-4 rounded-2xl border shadow-sm transition-all bg-gradient-to-br from-transparent to-black/[0.02] dark:to-white/[0.01]"
                                 style={{ borderColor: 'var(--border-main)' }}>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Debt-to-Equity</span>
                                    <span className="text-base font-mono font-extrabold" style={{ color: 'var(--text-main)' }}>
                                        {metrics.debtToEquity.toFixed(2)}
                                    </span>
                                </div>
                                <div className="h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-white/10">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${metrics.debtToEquity > 2.0 ? 'bg-rose-500' : 'bg-blue-500'}`} 
                                        style={{ width: `${Math.min(metrics.debtToEquity * 33.3, 100)}%` }} 
                                    />
                                </div>
                                <div className="flex justify-between text-[8px] font-extrabold uppercase" style={{ color: 'var(--text-dim)' }}>
                                    <span>Low Risk (&lt;1.0)</span>
                                    <span>Highly Leveraged</span>
                                </div>
                            </div>

                            {/* Solvency: Equity Ratio */}
                            <div className="flex flex-col gap-2 p-4 rounded-2xl border shadow-sm transition-all bg-gradient-to-br from-transparent to-black/[0.02] dark:to-white/[0.01]"
                                 style={{ borderColor: 'var(--border-main)' }}>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Equity Asset Ownership</span>
                                    <span className="text-base font-mono font-extrabold" style={{ color: 'var(--text-main)' }}>
                                        {(metrics.equityRatio * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-white/10">
                                    <div 
                                        className="h-full bg-[#C8E600] rounded-full transition-all duration-1000" 
                                        style={{ width: `${metrics.equityRatio * 100}%` }} 
                                    />
                                </div>
                                <p className="text-[9px] font-medium italic" style={{ color: 'var(--text-dim)' }}>Proportion of assets funded by owners</p>
                            </div>

                            {/* Security: Asset Coverage */}
                            <div className="flex flex-col gap-2 p-4 rounded-2xl border shadow-sm transition-all bg-gradient-to-br from-transparent to-black/[0.02] dark:to-white/[0.01]"
                                 style={{ borderColor: 'var(--border-main)' }}>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Asset Coverage Ratio</span>
                                    <span className="text-base font-mono font-extrabold" style={{ color: 'var(--text-main)' }}>
                                        {metrics.assetCoverage.toFixed(2)}x
                                    </span>
                                </div>
                                <div className="h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-white/10">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-1000 ${metrics.assetCoverage < 1.5 ? 'bg-rose-500' : 'bg-teal-500'}`} 
                                        style={{ width: `${Math.min(metrics.assetCoverage * 25, 100)}%` }} 
                                    />
                                </div>
                                <p className="text-[9px] font-medium italic" style={{ color: 'var(--text-dim)' }}>Ability to repay whole debt from assets</p>
                            </div>
                            
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default BalanceSheet;
