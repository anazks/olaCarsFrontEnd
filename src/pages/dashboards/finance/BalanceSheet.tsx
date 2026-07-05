import { useState, useEffect, useMemo } from 'react';
import { Landmark, Calendar, Download, RefreshCw, Globe, Building2, TrendingUp, ShieldAlert, PieChart, FileText } from 'lucide-react';
import { getBalanceSheetReport } from '../../../services/reportingService';
import type { BalanceSheetReport } from '../../../services/reportingService';
import { getAllBranches } from '../../../services/branchService';
import type { Branch } from '../../../services/branchService';
import { getUser, getUserRole } from '../../../utils/auth';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const BalanceSheet = () => {
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState<BalanceSheetReport | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [countries, setCountries] = useState<string[]>([]);

    const user = getUser();
    const userRole = getUserRole();

    const [filters, setFilters] = useState({
        country: userRole === 'countrymanager' ? user?.country || '' : '',
        branch: '',
        endDate: ''
    });

    const [diagData, setDiagData] = useState<any>(null);

    useEffect(() => {
        const fetchDiag = async () => {
            try {
                const res = await fetch('http://localhost:3000/diag-test');
                const data = await res.json();
                setDiagData(data.bgAccountDetails || data);
            } catch (err) {
                console.error("Failed to fetch public diag:", err);
            }
        };
        fetchDiag();
    }, []);


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
        if (!filters.endDate) {
            setReportData(null);
            return;
        }
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
        if (filters.endDate) {
            fetchReport();
        } else {
            setReportData(null);
        }
    }, [filters.country, filters.branch, filters.endDate]);

    const handleCountryChange = (country: string) => {
        setFilters({ ...filters, country, branch: '', endDate: filters.endDate });
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

    const groupedData = useMemo(() => {
        const classifyAsset = (a: any) => {
            const cat = (a.category || "").toLowerCase();
            const type = (a.accountType || "").toLowerCase();
            const name = (a.name || "").toLowerCase();
            if (type === 'cash' || name.includes('cash') || name.includes('caja') || name.includes('petty')) {
                return 'cash';
            }
            if (type === 'bank') {
                return 'bank';
            }
            if (type === 'accounts receivable') {
                return 'ar';
            }
            if (type === 'other asset' || cat === 'other asset') {
                return 'other_asset';
            }
            if (type === 'fixed asset' || cat === 'fixed asset') {
                return 'fixed';
            }
            if (cat === 'asset') {
                return 'other';
            }
            return 'other';
        };
        const classifyLiability = (l: any) => {
            const cat = (l.category || "").toLowerCase();
            const type = (l.accountType || "").toLowerCase();
            const name = (l.name || "").toLowerCase();
            if (type.includes('payable') || cat.includes('payable') || name.includes('payable') || name.includes('por pagar')) {
                return 'ap';
            }
            if (type.includes('non current') || type.includes('long term') || cat.includes('non current') || name.includes('loan') || name.includes('prestamo')) {
                return 'noncurrent';
            }
            return 'other';
        };

        const assets = reportData?.assets || [];
        const cashAccounts = assets.filter((a: any) => classifyAsset(a) === 'cash');
        const bankAccounts = assets.filter((a: any) => classifyAsset(a) === 'bank');

        const cashTotal = cashAccounts.reduce((sum: number, a: any) => sum + a.amount, 0);
        const bankTotal = bankAccounts.reduce((sum: number, a: any) => sum + a.amount, 0);
        const cashAndEquivalentsTotal = cashTotal + bankTotal;

        const arAccounts = assets.filter((a: any) => classifyAsset(a) === 'ar');
        const arTotal = arAccounts.reduce((sum: number, a: any) => sum + a.amount, 0);

        const otherCurrentAssets = assets.filter((a: any) => classifyAsset(a) === 'other');
        const otherCurrentAssetsTotal = otherCurrentAssets.reduce((sum: number, a: any) => sum + a.amount, 0);

        const currentAssetsTotal = cashAndEquivalentsTotal + arTotal + otherCurrentAssetsTotal;

        const fixedAssets = assets.filter((a: any) => classifyAsset(a) === 'fixed');
        const fixedAssetsTotal = fixedAssets.reduce((sum: number, a: any) => sum + a.amount, 0);

        const otherAssets = assets.filter((a: any) => classifyAsset(a) === 'other_asset');
        const otherAssetsTotal = otherAssets.reduce((sum: number, a: any) => sum + a.amount, 0);

        const nonCurrentAssetsTotal = fixedAssetsTotal + otherAssetsTotal;

        const totalAssets = currentAssetsTotal + nonCurrentAssetsTotal;

        const liabilities = reportData?.liabilities || [];
        const apAccounts = liabilities.filter((l: any) => classifyLiability(l) === 'ap');
        const apTotal = apAccounts.reduce((sum: number, l: any) => sum + l.amount, 0);

        const otherCurrentLiabilities = liabilities.filter((l: any) => classifyLiability(l) === 'other');
        const otherCurrentLiabilitiesTotal = otherCurrentLiabilities.reduce((sum: number, l: any) => sum + l.amount, 0);

        const currentLiabilitiesTotal = apTotal + otherCurrentLiabilitiesTotal;

        const nonCurrentLiabilities = liabilities.filter((l: any) => classifyLiability(l) === 'noncurrent');
        const nonCurrentLiabilitiesTotal = nonCurrentLiabilities.reduce((sum: number, l: any) => sum + l.amount, 0);

        const totalLiabilities = currentLiabilitiesTotal + nonCurrentLiabilitiesTotal;

        const equity = reportData?.equity || [];
        const equityTotal = equity.reduce((sum: number, e: any) => sum + e.amount, 0);

        return {
            cashAccounts,
            bankAccounts,
            cashTotal,
            bankTotal,
            cashAndEquivalentsTotal,
            arAccounts,
            arTotal,
            otherCurrentAssets,
            otherCurrentAssetsTotal,
            currentAssetsTotal,
            fixedAssets,
            fixedAssetsTotal,
            nonCurrentAssetsTotal,
            totalAssets,
            apAccounts,
            apTotal,
            otherCurrentLiabilities,
            otherCurrentLiabilitiesTotal,
            currentLiabilitiesTotal,
            nonCurrentLiabilities,
            nonCurrentLiabilitiesTotal,
            totalLiabilities,
            equity,
            equityTotal
        };
    }, [reportData]);

    const formatValue = (val: number | undefined) => {
        if (val === undefined) return '$0.00';
        return val < 0 ? `-$${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="container-responsive space-y-6 pb-12 animate-in fade-in duration-700">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Balance Sheet', active: true }]} />

            {/* Compact Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <Landmark size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        Balance Sheet
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">
                        Comprehensive statement of financial position across {filters.country || 'all countries'}.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all shadow-sm hover:bg-white/5"
                        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-dim)' }}>
                        <Download size={14} /> Export
                    </button>
                    <button
                        onClick={fetchReport}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-brand-lime text-[#0A0A0A] hover:scale-105 active:scale-95 transition-all"
                        style={{ backgroundColor: 'var(--brand-lime)' }}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
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
                            ) : !reportData ? (
                                <div className="text-center py-24 text-xs font-semibold text-dim">
                                    <FileText className="mx-auto text-dim/30 mb-3 animate-pulse" size={32} />
                                    Please select an end date and click Refresh to generate the report.
                                </div>
                            ) : (
                                <div className="space-y-10">

                                    {/* ASSETS */}
                                    <section>
                                        <h4 className="text-xs font-extrabold text-[#C8E600] uppercase tracking-[0.2em] pb-3 flex items-center gap-2 mb-4 border-b"
                                            style={{ borderColor: 'var(--border-main)' }}>
                                            <TrendingUp size={14} /> ASSETS
                                        </h4>

                                        <div className="space-y-4">
                                            {/* Current Assets */}
                                            <div className="space-y-3 pl-2">
                                                <div className="font-bold text-sm text-[var(--text-main)]">Current Assets</div>

                                                {/* Cash and Cash Equivalents */}
                                                <div className="pl-4 space-y-2">
                                                    <div className="font-semibold text-xs text-dim uppercase tracking-wider">Cash and Cash Equivalents</div>

                                                    {/* Cash accounts list */}
                                                    <div className="pl-4 space-y-1">
                                                        <div className="text-xs font-semibold text-dim italic">Cash</div>
                                                        {groupedData.cashAccounts.map((item: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between items-center py-2 px-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/[0.03] transition-all">
                                                                <span className="text-sm text-[var(--text-muted)]">{item.name}</span>
                                                                <span className="text-sm font-mono font-bold" style={{ color: 'var(--text-main)' }}>{formatValue(item.amount)}</span>
                                                            </div>
                                                        ))}
                                                        {groupedData.cashAccounts.length > 0 && (
                                                            <div className="flex justify-between text-xs font-bold pt-1 border-t border-[var(--border-main)]/30 pl-3 pr-3">
                                                                <span className="text-dim italic">Total for Cash</span>
                                                                <span className="font-mono text-[var(--text-main)]">{formatValue(groupedData.cashTotal)}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Bank accounts list */}
                                                    <div className="pl-4 space-y-1 mt-2">
                                                        <div className="text-xs font-semibold text-dim italic">Bank</div>
                                                        {groupedData.bankAccounts.map((item: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between items-center py-2 px-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/[0.03] transition-all">
                                                                <span className="text-sm text-[var(--text-muted)]">{item.name}</span>
                                                                <span className="text-sm font-mono font-bold" style={{ color: 'var(--text-main)' }}>{formatValue(item.amount)}</span>
                                                            </div>
                                                        ))}
                                                        {groupedData.bankAccounts.length > 0 && (
                                                            <div className="flex justify-between text-xs font-bold pt-1 border-t border-[var(--border-main)]/30 pl-3 pr-3">
                                                                <span className="text-dim italic">Total for Bank</span>
                                                                <span className="font-mono text-[var(--text-main)]">{formatValue(groupedData.bankTotal)}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Total Cash and Cash Equivalents */}
                                                    <div className="flex justify-between text-xs font-black uppercase pt-2 border-t border-[var(--border-main)] mt-2 pl-3 pr-3" style={{ color: 'var(--text-main)' }}>
                                                        <span>Total for Cash and Cash Equivalents</span>
                                                        <span className="font-mono">{formatValue(groupedData.cashAndEquivalentsTotal)}</span>
                                                    </div>
                                                </div>

                                                {/* Accounts Receivable */}
                                                <div className="pl-4 space-y-2 mt-3">
                                                    <div className="font-semibold text-xs text-dim uppercase tracking-wider">Accounts Receivable</div>
                                                    {groupedData.arAccounts.map((item: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between items-center py-2 px-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/[0.03] transition-all">
                                                            <span className="text-sm text-[var(--text-muted)]">{item.name}</span>
                                                            <span className="text-sm font-mono font-bold" style={{ color: 'var(--text-main)' }}>{formatValue(item.amount)}</span>
                                                        </div>
                                                    ))}
                                                    <div className="flex justify-between text-xs font-black uppercase pt-2 border-t border-[var(--border-main)] pl-3 pr-3" style={{ color: 'var(--text-main)' }}>
                                                        <span>Total for Accounts Receivable</span>
                                                        <span className="font-mono">{formatValue(groupedData.arTotal)}</span>
                                                    </div>
                                                </div>

                                                {/* Other Current Assets */}
                                                <div className="pl-4 space-y-2 mt-3">
                                                    <div className="font-semibold text-xs text-dim uppercase tracking-wider">Other current asset</div>
                                                    {groupedData.otherCurrentAssets.map((item: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between items-center py-2 px-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/[0.03] transition-all">
                                                            <span className="text-sm text-[var(--text-muted)]">{item.name}</span>
                                                            <span className="text-sm font-mono font-bold" style={{ color: 'var(--text-main)' }}>{formatValue(item.amount)}</span>
                                                        </div>
                                                    ))}
                                                    <div className="flex justify-between text-xs font-black uppercase pt-2 border-t border-[var(--border-main)] pl-3 pr-3" style={{ color: 'var(--text-main)' }}>
                                                        <span>Total for Other current assets</span>
                                                        <span className="font-mono">{formatValue(groupedData.otherCurrentAssetsTotal)}</span>
                                                    </div>
                                                </div>

                                                {/* Total Current Assets */}
                                                <div className="flex justify-between text-sm font-black uppercase pt-3 border-t-2 pl-3 pr-3" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                                    <span>Total for Current Assets</span>
                                                    <span className="font-mono text-[#C8E600]">{formatValue(groupedData.currentAssetsTotal)}</span>
                                                </div>
                                            </div>

                                            {/* Non Current Assets */}
                                            <div className="space-y-3 pt-4 border-t border-[var(--border-main)]/50 pl-2">
                                                <div className="font-bold text-sm text-[var(--text-main)]">Non Current Assets</div>

                                                <div className="pl-4 space-y-2">
                                                    <div className="font-semibold text-xs text-dim uppercase tracking-wider">Fixed Assets</div>
                                                    {groupedData.fixedAssets.map((item: any, idx: number) => {
                                                        const isDepreciation = item.name.toLowerCase().includes('deprec');
                                                        return (
                                                            <div key={idx} className="flex justify-between items-center py-2 px-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/[0.03] transition-all">
                                                                <span className="text-sm text-[var(--text-muted)]">{item.name}</span>
                                                                <span className={`text-sm font-mono font-bold ${isDepreciation ? 'text-rose-500 font-semibold' : 'text-[var(--text-main)]'}`}>{formatValue(item.amount)}</span>
                                                            </div>
                                                        );
                                                    })}

                                                    {groupedData.fixedAssets.filter((a: any) => a.name.toLowerCase().includes('deprec')).length > 0 && (
                                                        <div className="flex justify-between text-xs font-bold pl-4 text-rose-500 italic pt-1 pr-3">
                                                            <span>Total for Accumulated Depreciation of Vehicles / Depreciación Acumulada de Vehículos</span>
                                                            <span className="font-mono">{formatValue(groupedData.fixedAssets.filter((a: any) => a.name.toLowerCase().includes('deprec')).reduce((sum: number, a: any) => sum + a.amount, 0))}</span>
                                                        </div>
                                                    )}

                                                    <div className="flex justify-between text-xs font-black uppercase pt-2 border-t border-[var(--border-main)] pl-3 pr-3" style={{ color: 'var(--text-main)' }}>
                                                        <span>Total for Fixed Assets</span>
                                                        <span className="font-mono">{formatValue(groupedData.fixedAssetsTotal)}</span>
                                                    </div>
                                                </div>

                                                {/* Total Non Current Assets */}
                                                <div className="flex justify-between text-sm font-black uppercase pt-3 border-t-2 pl-3 pr-3" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                                    <span>Total for Non Current Assets</span>
                                                    <span className="font-mono text-[#C8E600]">{formatValue(groupedData.nonCurrentAssetsTotal)}</span>
                                                </div>
                                            </div>

                                            {/* Grand Total Assets */}
                                            <div className="mt-4 pt-4 px-3 flex justify-between items-center border-t-2 rounded-b-xl"
                                                style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-main)', opacity: 0.9 }}>
                                                <span className="text-sm font-black uppercase" style={{ color: 'var(--text-main)' }}>Total Assets</span>
                                                <span className="text-xl font-mono font-black text-[#C8E600] underline decoration-double underline-offset-4">
                                                    {formatValue(groupedData.totalAssets)}
                                                </span>
                                            </div>
                                        </div>
                                    </section>

                                    {/* LIABILITIES */}
                                    <section>
                                        <h4 className="text-xs font-extrabold text-rose-500 uppercase tracking-[0.2em] pb-3 flex items-center gap-2 mb-4 border-b"
                                            style={{ borderColor: 'var(--border-main)' }}>
                                            <ShieldAlert size={14} /> LIABILITIES
                                        </h4>

                                        <div className="space-y-4">
                                            {/* Accounts Payable */}
                                            <div className="pl-4 space-y-2">
                                                <div className="font-semibold text-xs text-dim uppercase tracking-wider">Accounts Payable</div>
                                                {groupedData.apAccounts.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center py-2 px-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/[0.03] transition-all">
                                                        <span className="text-sm text-[var(--text-muted)]">{item.name}</span>
                                                        <span className="text-sm font-mono font-bold" style={{ color: 'var(--text-main)' }}>{formatValue(item.amount)}</span>
                                                    </div>
                                                ))}
                                                <div className="flex justify-between text-xs font-black uppercase pt-2 border-t border-[var(--border-main)] pl-3 pr-3" style={{ color: 'var(--text-main)' }}>
                                                    <span>Total for Accounts Payable</span>
                                                    <span className="font-mono">{formatValue(groupedData.apTotal)}</span>
                                                </div>
                                            </div>

                                            {/* Other Current Liabilities */}
                                            <div className="pl-4 space-y-2 mt-3">
                                                <div className="font-semibold text-xs text-dim uppercase tracking-wider">Other Current Liabilities</div>
                                                {groupedData.otherCurrentLiabilities.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center py-2 px-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/[0.03] transition-all">
                                                        <span className="text-sm text-[var(--text-muted)]">{item.name}</span>
                                                        <span className="text-sm font-mono font-bold" style={{ color: 'var(--text-main)' }}>{formatValue(item.amount)}</span>
                                                    </div>
                                                ))}
                                                <div className="flex justify-between text-xs font-black uppercase pt-2 border-t border-[var(--border-main)] pl-3 pr-3" style={{ color: 'var(--text-main)' }}>
                                                    <span>Total for Other Current Liabilities</span>
                                                    <span className="font-mono">{formatValue(groupedData.otherCurrentLiabilitiesTotal)}</span>
                                                </div>
                                            </div>

                                            {/* Non Current Liabilities */}
                                            {groupedData.nonCurrentLiabilities.length > 0 && (
                                                <div className="pl-4 space-y-2 mt-3">
                                                    <div className="font-semibold text-xs text-dim uppercase tracking-wider">Non Current Liabilities</div>
                                                    {groupedData.nonCurrentLiabilities.map((item: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between items-center py-2 px-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/[0.03] transition-all">
                                                            <span className="text-sm text-[var(--text-muted)]">{item.name}</span>
                                                            <span className="text-sm font-mono font-bold" style={{ color: 'var(--text-main)' }}>{formatValue(item.amount)}</span>
                                                        </div>
                                                    ))}
                                                    <div className="flex justify-between text-xs font-black uppercase pt-2 border-t border-[var(--border-main)] pl-3 pr-3" style={{ color: 'var(--text-main)' }}>
                                                        <span>Total for Non Current Liabilities</span>
                                                        <span className="font-mono">{formatValue(groupedData.nonCurrentLiabilitiesTotal)}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Total Liabilities */}
                                            <div className="mt-4 pt-4 px-3 flex justify-between items-center border-t rounded-b-xl"
                                                style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-main)', opacity: 0.8 }}>
                                                <span className="text-sm font-black uppercase" style={{ color: 'var(--text-main)' }}>Total Liabilities</span>
                                                <span className="text-lg font-mono font-bold text-rose-500">
                                                    {formatValue(groupedData.totalLiabilities)}
                                                </span>
                                            </div>
                                        </div>
                                    </section>

                                    {/* EQUITY */}
                                    <section>
                                        <h4 className="text-xs font-extrabold text-blue-500 uppercase tracking-[0.2em] pb-3 flex items-center gap-2 mb-4 border-b"
                                            style={{ borderColor: 'var(--border-main)' }}>
                                            <PieChart size={14} /> EQUITY
                                        </h4>

                                        <div className="space-y-1 pl-2">
                                            {groupedData.equity.map((eq: any, idx: number) => {
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
                                            })}
                                        </div>

                                        {/* Equity Subtotal */}
                                        <div className="mt-4 pt-4 px-3 flex justify-between items-center border-t rounded-b-xl"
                                            style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-main)', opacity: 0.8 }}>
                                            <span className="text-sm font-black uppercase" style={{ color: 'var(--text-main)' }}>Total Equity</span>
                                            <span className="text-lg font-mono font-bold text-blue-500">
                                                {formatValue(groupedData.equityTotal)}
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
                                                {formatValue(groupedData.totalLiabilities + groupedData.equityTotal)}
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
                            <div className={`mt-8 p-4 rounded-2xl flex items-center gap-3 border transition-all duration-500 ${metrics.isBalanced
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 animate-pulse'
                                }`}>
                                <div className={`w-2.5 h-2.5 rounded-full ${metrics.isBalanced ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
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
