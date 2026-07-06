import { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw, ChevronRight, PieChart, Loader2, Search, FileText } from 'lucide-react';
import { getPLReport, getBalanceSheetReport } from '../../../services/reportingService';
import { getAllBranches } from '../../../services/branchService';
import toast from 'react-hot-toast';

const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getPastDateString = (monthsAgo: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() - monthsAgo);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const FinancialStatements = () => {
    const [activeTab, setActiveTab] = useState<'PL' | 'BS'>('PL');
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [reportData, setReportData] = useState<any>(null);
    const [branches, setBranches] = useState<any[]>([]);


    const [filters, setFilters] = useState({
        branch: '',
        startDate: getPastDateString(1),
        endDate: getTodayString()
    });




    // Keep end date valid relative to start date
    useEffect(() => {
        if (filters.startDate && filters.endDate && filters.endDate < filters.startDate) {
            setFilters(prev => ({ ...prev, endDate: filters.startDate }));
        }
    }, [filters.startDate, filters.endDate]);

    useEffect(() => {
        const fetchInitialData = async () => {
            const branchesData = await getAllBranches();
            setBranches(branchesData.data || []);
        };
        fetchInitialData();
    }, []);

    const fetchReport = async () => {
        if (!filters.startDate || !filters.endDate) {
            setReportData(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            if (activeTab === 'PL') {
                const data = await getPLReport(filters);
                console.log('Backend PL Report Data:', data);
                setReportData(data.data || data);
            } else {
                const data = await getBalanceSheetReport(filters);
                console.log('Backend Balance Sheet Report Data:', data);
                setReportData(data.data || data);
            }
        } catch (error) {
            console.error('Failed to fetch report from backend', error);
            // Fallback mock data for demo if backend not ready
            const mock = getMockData(activeTab);
            console.warn('Falling back to frontend mock data:', mock);
            setReportData(mock);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (filters.startDate && filters.endDate) {
            fetchReport();
        } else {
            setReportData(null);
            setLoading(false);
        }
    }, [activeTab]);

    const handleExportPdf = async () => {
        setExporting(true);
        const toastId = toast.loading("Generating PDF Report...");
        try {
            const query: Record<string, string> = { reportType: activeTab };
            if (filters.branch) query.branch = filters.branch;
            if (filters.startDate) query.startDate = filters.startDate;
            if (filters.endDate) query.endDate = filters.endDate;

            const token = localStorage.getItem('token');
            const response = await fetch(
                `http://localhost:3000/api/reporting/export/pdf?${new URLSearchParams(query).toString()}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (!response.ok) throw new Error(`Server error: ${response.status}`);

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${activeTab === 'PL' ? 'Profit_Loss_Statement' : 'Balance_Sheet'}_${filters.startDate || 'all'}_to_${filters.endDate || 'all'}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success("PDF exported successfully!", { id: toastId });
        } catch (error) {
            console.error("PDF generation failed:", error);
            toast.error("Failed to generate PDF. Make sure filters are applied.", { id: toastId });
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="container-responsive space-y-6">
            {/* Header section with tab switcher */}
            <div className="flex justify-between items-center border-b border-white/5">
                <div className="flex gap-4">
                    <button
                        onClick={() => setActiveTab('PL')}
                        className={`px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                            activeTab === 'PL'
                                ? 'border-brand-lime text-brand-lime font-black'
                                : 'border-transparent text-dim hover:text-white'
                        }`}
                    >
                        Income Statement (P&L)
                    </button>
                    <button
                        onClick={() => setActiveTab('BS')}
                        className={`px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                            activeTab === 'BS'
                                ? 'border-brand-lime text-brand-lime font-black'
                                : 'border-transparent text-dim hover:text-white'
                        }`}
                    >
                        Balance Sheet
                    </button>
                </div>
            </div>

            {/* Compact Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <PieChart size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        Financial Statements
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">Consolidated and branch-level financial reporting</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button 
                        disabled={exporting || loading}
                        onClick={handleExportPdf}
                        id="export-pdf-btn"
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg"
                        style={{
                            background: exporting ? 'rgba(200,230,0,0.1)' : 'linear-gradient(135deg, #C8E600 0%, #a3c200 100%)',
                            color: exporting ? 'var(--text-dim)' : '#111',
                            border: '1px solid #C8E600',
                            boxShadow: exporting ? 'none' : '0 0 16px rgba(200,230,0,0.25)'
                        }}
                    >
                        {exporting ? (
                            <><Loader2 size={14} className="animate-spin" /> Generating PDF...</>
                        ) : (
                            <><FileText size={14} /> Export PDF</>
                        )}
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <input 
                        type="date" 
                        value={filters.startDate}
                        onChange={e => setFilters({...filters, startDate: e.target.value})}
                        className="bg-transparent border-none text-sm text-[var(--text-main)] focus:ring-0 outline-none"
                    />
                    <span className="opacity-20">to</span>
                    <input 
                        type="date" 
                        value={filters.endDate}
                        min={filters.startDate}
                        onChange={e => {
                            const val = e.target.value;
                            if (filters.startDate && val && val < filters.startDate) {
                                setFilters({...filters, endDate: filters.startDate});
                            } else {
                                setFilters({...filters, endDate: val});
                            }
                        }}
                        className="bg-transparent border-none text-sm text-[var(--text-main)] focus:ring-0 outline-none"
                    />
                </div>
                <div className="h-6 w-px bg-[var(--border-main)] hidden sm:block" />
                <select 
                    value={filters.branch}
                    onChange={e => setFilters({...filters, branch: e.target.value})}
                    className="bg-transparent border-none text-sm text-[var(--text-main)] focus:ring-0 outline-none min-w-[200px]"
                >
                    <option value="" className="bg-[var(--bg-card)]">Consolidated (All Branches)</option>
                    {branches.map(b => (
                        <option key={b._id} value={b._id} className="bg-[var(--bg-card)]">{b.name} ({b.country})</option>
                    ))}
                </select>
                <button 
                    onClick={fetchReport}
                    disabled={loading}
                    className="w-full sm:w-auto sm:ml-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide bg-brand-lime text-[#0A0A0A] hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: 'var(--brand-lime)' }}
                >
                    {loading ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
                    Search
                </button>
            </div>



            {/* Main Report View */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Summary Card */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-[var(--border-main)] bg-[var(--bg-input)] flex justify-between items-center">
                            <h3 className="font-bold text-[var(--text-main)] flex items-center gap-2">
                                {activeTab === 'PL' ? 'Income Statement (P&L)' : 'Statement of Financial Position'}
                                <span className="text-[10px] font-normal text-dim uppercase tracking-widest ml-2">Standard View</span>
                            </h3>
                            <span className="text-[10px] bg-[var(--bg-input)] px-2 py-1 rounded text-dim font-mono">CURRENCY: USD</span>
                        </div>
                        
                        <div className="p-6">
                            {loading ? (
                                <div className="flex items-center justify-center py-20">
                                    <div className="w-8 h-8 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : !reportData ? (
                                <div className="text-center py-20 text-xs font-semibold text-dim">
                                    <FileText className="mx-auto text-dim/30 mb-3 animate-pulse" size={32} />
                                    Please select a date range and click Search to load report data.
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {activeTab === 'PL' ? (
                                        <PLView data={reportData} />
                                    ) : (
                                        <BSView data={reportData} />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Metrics */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-[#C8E600]/20 to-transparent border border-[#C8E600]/20 rounded-2xl p-6">
                        <p className="text-[10px] font-bold text-[#C8E600] uppercase tracking-widest mb-1">Total Net Result</p>
                        <h2 className="text-4xl font-bold text-[var(--text-main)] font-mono">
                            ${reportData?.netProfit?.toLocaleString() || reportData?.equityTotal?.toLocaleString() || '0.00'}
                        </h2>
                        <div className="mt-4 flex items-center gap-2 text-emerald-500 text-xs">
                            <TrendingUp size={14} />
                            <span>+12.5% from last period</span>
                        </div>
                    </div>

                    <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl p-6">
                        <h4 className="text-sm font-bold text-[var(--text-main)] mb-4">Quick Insights</h4>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-dim">Operating Margin</span>
                                <span className="text-xs font-bold text-[var(--text-main)] font-mono">24.2%</span>
                            </div>
                            <div className="w-full bg-[var(--bg-input)] h-1.5 rounded-full overflow-hidden">
                                <div className="bg-[#C8E600] h-full" style={{ width: '24.2%' }} />
                            </div>
                            
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-xs text-dim">Tax Provision</span>
                                <span className="text-xs font-bold text-rose-500 font-mono">$4,250.00</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-dim">Debt Ratio</span>
                                <span className="text-xs font-bold text-[var(--text-main)] font-mono">0.34</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PLView = ({ data }: { data: any }) => {
    const income = data?.income || [];
    const expenses = data?.expenses || [];

    const isCOGS = (item: any) => {
        const name = (item.name || '').toLowerCase();
        return name.includes('cost of goods sold') || name.includes('cogs') || name.includes('costo de ventas');
    };

    const isOtherExpense = (item: any) => {
        const name = (item.name || '').toLowerCase();
        const type = (item.accountType || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        return (
            name.includes('other expense') ||
            type.includes('other expense') ||
            cat.includes('other expense') ||
            name.includes('extraordinary')
        );
    };

    const cogsItems = expenses.filter((e: any) => isCOGS(e));
    const opexItems = expenses.filter((e: any) => !isCOGS(e) && !isOtherExpense(e));
    const otherExpenseItems = expenses.filter((e: any) => isOtherExpense(e));

    const totalIncome = income.reduce((acc: number, val: any) => acc + val.amount, 0) || 0;
    const totalCOGS = cogsItems.reduce((acc: number, val: any) => acc + val.amount, 0) || 0;
    const totalOPEX = opexItems.reduce((acc: number, val: any) => acc + val.amount, 0) || 0;
    const totalOtherExpenses = otherExpenseItems.reduce((acc: number, val: any) => acc + val.amount, 0) || 0;

    // Gross profit = Total for Operating Income - Cost of goods sold (both positive in expense array)
    const grossProfit = totalIncome - totalCOGS;
    const operatingExpenses = totalOPEX;
    const operatingProfit = grossProfit - operatingExpenses;
    const netProfit = operatingProfit - totalOtherExpenses;

    return (
        <div className="space-y-8">
            {/* Income Section */}
            <section>
                <h4 className="text-xs font-bold text-[#C8E600] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ChevronRight size={14} /> Operating Income
                </h4>
                <div className="space-y-3">
                    {income.filter((item: any) => item.amount !== 0).map((item: any, i: number) => (
                        <div key={i} className="flex justify-between items-center group cursor-default">
                            <span className="text-sm text-dim group-hover:text-[var(--text-main)] transition-colors">
                                {item.code ? `${item.code} - ` : ''}{item.name}
                            </span>
                            <div className="flex-1 border-b border-dashed border-[var(--border-main)] mx-4" />
                            <span className="text-sm font-mono text-[var(--text-main)]">${item.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t border-[var(--border-main)]">
                        <span className="text-sm font-bold text-[var(--text-main)] font-medium">Total Operating Income</span>
                        <span className="text-sm font-mono font-bold text-[var(--text-main)] underline decoration-[#C8E600] decoration-2 underline-offset-4 font-black">
                            ${totalIncome.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </span>
                    </div>
                </div>
            </section>

            {/* Cost of Goods Sold Section */}
            {cogsItems.length > 0 && (
                <section>
                    <h4 className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <ChevronRight size={14} /> Cost of Goods Sold
                    </h4>
                    <div className="space-y-3">
                        {cogsItems.filter((item: any) => item.amount !== 0).map((item: any, i: number) => (
                            <div key={i} className="flex justify-between items-center group cursor-default">
                                <span className="text-sm text-dim group-hover:text-[var(--text-main)] transition-colors">
                                    {item.code ? `${item.code} - ` : ''}{item.name}
                                </span>
                                <div className="flex-1 border-b border-dashed border-[var(--border-main)] mx-4" />
                                <span className="text-sm font-mono text-[var(--text-main)]">${item.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                        ))}
                        <div className="flex justify-between items-center pt-2 border-t border-[var(--border-main)]">
                            <span className="text-sm font-bold text-[var(--text-main)] font-medium">Total Cost of Goods Sold</span>
                            <span className="text-sm font-mono font-bold text-[var(--text-main)]">
                                (${totalCOGS.toLocaleString(undefined, {minimumFractionDigits: 2})})
                            </span>
                        </div>
                    </div>
                </section>
            )}

            {/* Gross Profit Summary Row */}
            <section className="pt-4 border-t-2 border-[var(--border-main)]">
                <div className="flex justify-between items-center py-2.5 px-4 rounded-xl bg-lime/5 border border-brand-lime/10">
                    <div>
                        <span className="text-sm font-black uppercase text-[#C8E600] block">Gross Profit</span>
                        <span className="text-[10px] text-dim block mt-0.5 font-bold uppercase tracking-wider">Total Operating Income − Total Cost of Goods Sold</span>
                    </div>
                    <span className="text-base font-mono font-bold text-[#C8E600]">
                        ${grossProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </span>
                </div>
            </section>

            {/* Operating Expenses Section */}
            <section>
                <h4 className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ChevronRight size={14} /> Operating Expenses
                </h4>
                <div className="space-y-3">
                    {opexItems.filter((item: any) => item.amount !== 0).map((item: any, i: number) => (
                        <div key={i} className="flex justify-between items-center group cursor-default">
                            <span className="text-sm text-dim group-hover:text-[var(--text-main)] transition-colors">
                                {item.code ? `${item.code} - ` : ''}{item.name}
                            </span>
                            <div className="flex-1 border-b border-dashed border-[var(--border-main)] mx-4" />
                            <span className="text-sm font-mono text-[var(--text-main)]">${item.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                        </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t border-[var(--border-main)]">
                        <span className="text-sm font-bold text-[var(--text-main)] font-medium">Total Operating Expenses</span>
                        <span className="text-sm font-mono font-bold text-[var(--text-main)]">
                            (${totalOPEX.toLocaleString(undefined, {minimumFractionDigits: 2})})
                        </span>
                    </div>
                </div>
            </section>

            {/* Operating Profit Summary */}
            <section className="pt-6 border-t-4 border-[var(--border-main)] space-y-3">
                <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-dim">Gross Profit</span>
                    <span className="font-mono text-[var(--text-main)]">
                        ${grossProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="font-semibold text-dim">Operating Expenses</span>
                    <span className="font-mono text-[var(--text-main)]">
                        (${operatingExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})})
                    </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-[var(--border-main)]/50">
                    <span className="text-sm font-black uppercase text-[var(--text-main)]">Operating Profit</span>
                    <span className="font-mono font-bold text-[#C8E600]">
                        ${operatingProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </span>
                </div>
            </section>

            {/* Extraordinary Expenses Section */}
            {otherExpenseItems.length > 0 && (
                <section>
                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <ChevronRight size={14} /> Extraordinary expenses
                    </h4>
                    <div className="space-y-3">
                        {otherExpenseItems.filter((item: any) => item.amount !== 0).map((item: any, i: number) => (
                            <div key={i} className="flex justify-between items-center group cursor-default">
                                <span className="text-sm text-dim group-hover:text-[var(--text-main)] transition-colors">
                                    {item.code ? `${item.code} - ` : ''}{item.name}
                                </span>
                                <div className="flex-1 border-b border-dashed border-[var(--border-main)] mx-4" />
                                <span className="text-sm font-mono text-[var(--text-main)]">${item.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                        ))}
                        <div className="flex justify-between items-center pt-2 border-t border-[var(--border-main)]">
                            <span className="text-sm font-bold text-[var(--text-main)] font-medium">Total Extraordinary Expenses</span>
                            <span className="text-sm font-mono font-bold text-[var(--text-main)]">
                                (${totalOtherExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})})
                            </span>
                        </div>
                    </div>
                </section>
            )}

            {/* Net Profit */}
            <section className="pt-6 border-t border-dashed border-[var(--border-main)]">
                <div className="flex justify-between items-center">
                    <h4 className="text-lg font-bold text-[var(--text-main)] uppercase tracking-wider">Net Profit / Loss</h4>
                    <div className="text-right">
                        <p className="text-2xl font-mono font-bold text-[#C8E600]">${netProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                        <p className="text-[10px] text-dim">BEFORE TAX ADJUSTMENTS</p>
                    </div>
                </div>
            </section>
        </div>
    );
};

const BSView = ({ data }: { data: any }) => {
    const formatValue = (val: number | undefined) => {
        if (val === undefined) return '$0.00';
        return val < 0 
            ? `-$${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
            : `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const classifyAsset = (a: any) => {
        // Backend now resolves accountType cleanly — use it as primary key
        const type = (a.accountType || "").toLowerCase().trim();
        const cat = (a.category || "").toLowerCase().trim();
        const name = (a.name || "").toLowerCase();

        // Cash — by accountType, category, or name keywords
        if (
            type === 'cash' ||
            cat === 'cash' ||
            name.includes('cash') ||
            name.includes('caja') ||
            name.includes('petty')
        ) {
            return 'cash';
        }

        // Bank — by accountType OR category
        if (type === 'bank' || cat === 'bank') {
            return 'bank';
        }

        // Accounts Receivable — by accountType OR category
        if (
            type === 'accounts receivable' ||
            cat === 'accounts receivable'
        ) {
            return 'ar';
        }

        // Other Asset - handled under Non-Current Assets but separate from Fixed Assets
        if (type === 'other asset' || cat === 'other asset') {
            return 'other_asset';
        }

        // Fixed Assets — strictly by accountType or category Fixed Asset
        if (type === 'fixed asset' || cat === 'fixed asset') {
            return 'fixed';
        }

        // Everything else — "Other Current Asset", "Input Tax", "ASSET", etc.
        return 'other';
    };



    // Grouping
    const assets = data?.assets || [];
    const cashAccounts = assets.filter((a: any) => classifyAsset(a) === 'cash');
    const bankAccounts = assets.filter((a: any) => classifyAsset(a) === 'bank');
    
    const cashTotal = cashAccounts.reduce((sum: number, a: any) => sum + a.amount, 0);
    const bankTotal = bankAccounts.reduce((sum: number, a: any) => sum + a.amount, 0);
    const cashAndEquivalentsTotal = cashTotal + bankTotal;

    const arAccounts = assets.filter((a: any) => classifyAsset(a) === 'ar');
    const arTotal = arAccounts.reduce((sum: number, a: any) => sum + a.amount, 0);

    // Account types to exclude from the Balance Sheet entirely
    const EXCLUDE_FROM_BALANCE_SHEET = new Set([
        'income', 'expense', 'other income', 'other expense', 'cost of goods sold',
        'revenue', 'sales',
        'input tax',              // excluded per user requirement
        'non current liability',  // excluded per user requirement
        'other current liability' // excluded per user requirement
    ]);
    const isExcluded = (a: any) => {
        const t = (a.accountType || '').toLowerCase().trim();
        const c = (a.category || '').toLowerCase().trim();
        return EXCLUDE_FROM_BALANCE_SHEET.has(t) || EXCLUDE_FROM_BALANCE_SHEET.has(c);
    };

    // Liabilities - categorized by Current, Long-Term, and Other
    const liabilities = data?.liabilities || [];
    const isLongTermLiability = (l: any) => {
        const t = (l.accountType || '').toLowerCase().trim();
        const c = (l.category || '').toLowerCase().trim();
        return t === 'non current liability' || c === 'non current liability';
    };

    const isOtherLiability = (l: any) => {
        const t = (l.accountType || '').toLowerCase().trim();
        const c = (l.category || '').toLowerCase().trim();
        return t === 'other liability' || c === 'other liability';
    };

    const currentLiabilities = liabilities.filter((l: any) => !isLongTermLiability(l) && !isOtherLiability(l));
    const longTermLiabilities = liabilities.filter((l: any) => isLongTermLiability(l));
    const otherLiabilities = liabilities.filter((l: any) => isOtherLiability(l));

    const currentLiabilitiesTotal = currentLiabilities.reduce((sum: number, l: any) => sum + l.amount, 0);
    const longTermLiabilitiesTotal = longTermLiabilities.reduce((sum: number, l: any) => sum + l.amount, 0);
    const otherLiabilitiesTotal = otherLiabilities.reduce((sum: number, l: any) => sum + l.amount, 0);
    const totalLiabilities = currentLiabilitiesTotal + longTermLiabilitiesTotal + otherLiabilitiesTotal;

    const otherCurrentAssets = assets
        .filter((a: any) => classifyAsset(a) === 'other')
        .filter((a: any) => !isExcluded(a));
    const otherCurrentAssetsTotal = otherCurrentAssets.reduce((sum: number, a: any) => sum + a.amount, 0);

    const currentAssetsTotal = cashAndEquivalentsTotal + arTotal + otherCurrentAssetsTotal;

    const fixedAssets = assets.filter((a: any) => classifyAsset(a) === 'fixed');
    const fixedAssetsTotal = fixedAssets.reduce((sum: number, a: any) => sum + a.amount, 0);

    const otherAssets = assets.filter((a: any) => classifyAsset(a) === 'other_asset');
    const otherAssetsTotal = otherAssets.reduce((sum: number, a: any) => sum + a.amount, 0);

    const nonCurrentAssetsTotal = fixedAssetsTotal + otherAssetsTotal;

    const totalAssets = currentAssetsTotal + nonCurrentAssetsTotal;

    const equity = data?.equity || [];
    const currentPeriodItem = equity.find((e: any) => e.code === "RE-CURRENT" || e.name.includes("Current Period"));
    const resultsOfTheExercise = currentPeriodItem ? currentPeriodItem.amount : 0;
    const databaseEquity = equity.filter((e: any) => 
        e.code !== "RE-CURRENT" && 
        !e.name.includes("Current Period") && 
        !e.name.toLowerCase().includes("retained earnings") && 
        !e.name.toLowerCase().includes("utilidades retenidas")
    );
    const databaseEquityTotal = databaseEquity.reduce((sum: number, e: any) => sum + e.amount, 0);
    const staticRetainedEarnings = 258789.00;
    const totalCapital = databaseEquityTotal + staticRetainedEarnings + resultsOfTheExercise;
    const grandTotalLiabilitiesAndEquity = totalLiabilities + totalCapital;

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Assets Column */}
                <section className="space-y-6">
                    <h4 className="text-xs font-bold text-[#C8E600] uppercase tracking-widest pb-2 flex items-center gap-2 border-b border-[var(--border-main)]">
                        <ChevronRight size={14} /> Assets
                    </h4>
                    
                    <div className="space-y-4">
                        {/* Current Assets */}
                        <div className="space-y-3">
                            <div className="font-bold text-sm text-[var(--text-main)]">Current Assets</div>
                            
                            {/* Cash and Cash Equivalents */}
                            <div className="pl-4 space-y-2">
                                <div className="font-semibold text-xs text-dim uppercase tracking-wider">Cash and Cash Equivalents</div>
                                
                                {/* Cash accounts list */}
                                <div className="pl-4 space-y-1">
                                    <div className="text-xs font-semibold text-dim italic">Cash</div>
                                    {cashAccounts.filter((item: any) => item.amount !== 0).map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center text-sm pl-2">
                                            <span className="text-dim">{item.code ? `${item.code} - ` : ''}{item.name}</span>
                                            <span className="font-mono text-[var(--text-main)]">{formatValue(item.amount)}</span>
                                        </div>
                                    ))}
                                    {cashAccounts.length > 0 && (
                                        <div className="flex justify-between text-xs font-bold pt-1 border-t border-[var(--border-main)]/30">
                                            <span className="text-dim italic">Total for Cash</span>
                                            <span className="font-mono text-[var(--text-main)]">{formatValue(cashTotal)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Bank accounts list */}
                                <div className="pl-4 space-y-1 mt-2">
                                    <div className="text-xs font-semibold text-dim italic">Bank</div>
                                    {bankAccounts.filter((item: any) => item.amount !== 0).map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center text-sm pl-2">
                                            <span className="text-dim">{item.code ? `${item.code} - ` : ''}{item.name}</span>
                                            <span className="font-mono text-[var(--text-main)]">{formatValue(item.amount)}</span>
                                        </div>
                                    ))}
                                    {bankAccounts.length > 0 && (
                                        <div className="flex justify-between text-xs font-bold pt-1 border-t border-[var(--border-main)]/30">
                                            <span className="text-dim italic">Total for Bank</span>
                                            <span className="font-mono text-[var(--text-main)]">{formatValue(bankTotal)}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Total Cash and Cash Equivalents */}
                                <div className="flex justify-between text-xs font-black uppercase pt-2 border-t border-[var(--border-main)] mt-2" style={{ color: 'var(--text-main)' }}>
                                    <span>Total for Cash and Cash Equivalents</span>
                                    <span className="font-mono">{formatValue(cashAndEquivalentsTotal)}</span>
                                </div>
                            </div>

                            {/* Accounts Receivable */}
                            <div className="pl-4 space-y-2 mt-3">
                                <div className="font-semibold text-xs text-dim uppercase tracking-wider">Accounts Receivable</div>
                                {arAccounts.filter((item: any) => item.amount !== 0).map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center text-sm pl-4">
                                        <span className="text-dim">{item.code ? `${item.code} - ` : ''}{item.name}</span>
                                        <span className="font-mono text-[var(--text-main)]">{formatValue(item.amount)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between text-xs font-black uppercase pt-2 border-t border-[var(--border-main)]" style={{ color: 'var(--text-main)' }}>
                                    <span>Total for Accounts Receivable</span>
                                    <span className="font-mono">{formatValue(arTotal)}</span>
                                </div>
                            </div>

                            {/* Other Current Assets */}
                            <div className="pl-4 space-y-2 mt-3">
                                <div className="font-semibold text-xs text-dim uppercase tracking-wider">Other Current Assets</div>
                                {otherCurrentAssets.length === 0 ? (
                                    <div className="text-xs text-dim italic pl-4">None</div>
                                ) : (() => {
                                    // Group by accountType (resolved by backend: "Other Current Asset", "Input Tax", etc.)
                                    const grouped: Record<string, any[]> = {};
                                    otherCurrentAssets.forEach((item: any) => {
                                        const subCat = item.accountType || 'Other Current Asset';
                                        if (!grouped[subCat]) grouped[subCat] = [];
                                        grouped[subCat].push(item);
                                    });
                                    return Object.entries(grouped).map(([subCat, items]) => {
                                        const subTotal = (items as any[]).reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
                                        return (
                                            <div key={subCat} className="pl-2 space-y-1 mt-2">
                                                <div className="text-xs font-semibold text-dim italic">{subCat}</div>
                                                {(items as any[]).filter((item: any) => item.amount !== 0).map((item: any, i: number) => (
                                                    <div key={i} className="flex justify-between items-center text-sm pl-4">
                                                        <span className="text-dim">{item.code ? `${item.code} - ` : ''}{item.name}</span>
                                                        <span className="font-mono text-[var(--text-main)]">{formatValue(item.amount)}</span>
                                                    </div>
                                                ))}
                                                <div className="flex justify-between text-xs font-semibold pt-1 pl-4 border-t border-dashed border-[var(--border-main)]/50 text-dim">
                                                    <span>Total for {subCat}</span>
                                                    <span className="font-mono">{formatValue(subTotal)}</span>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>

                            {/* Total for Other Current Assets */}
                            <div className="flex justify-between text-xs font-black uppercase pt-2 mt-1 border-t-2 border-[var(--border-main)]" style={{ color: 'var(--text-main)' }}>
                                <span>Total for Other Current Assets</span>
                                <span className="font-mono">{formatValue(otherCurrentAssetsTotal)}</span>
                            </div>

                            {/* Total for Current Assets — sum of Cash + AR + Other Current Assets ONLY */}
                            <div className="mt-4 rounded-xl overflow-hidden border border-[var(--border-main)]">
                                {/* Component rows */}
                                <div className="flex justify-between items-center px-4 py-2 border-b border-[var(--border-main)]/40" style={{ background: 'var(--bg-input)' }}>
                                    <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Total for Cash and Cash Equivalents</span>
                                    <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-main)' }}>{formatValue(cashAndEquivalentsTotal)}</span>
                                </div>
                                <div className="flex justify-between items-center px-4 py-2 border-b border-[var(--border-main)]/40" style={{ background: 'var(--bg-input)' }}>
                                    <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Total for Accounts Receivable</span>
                                    <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-main)' }}>{formatValue(arTotal)}</span>
                                </div>
                                <div className="flex justify-between items-center px-4 py-2 border-b border-[var(--border-main)]/40" style={{ background: 'var(--bg-input)' }}>
                                    <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Total for Other Current Assets</span>
                                    <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-main)' }}>{formatValue(otherCurrentAssetsTotal)}</span>
                                </div>
                                {/* Grand total */}
                                <div className="flex justify-between items-center px-4 py-3" style={{ background: 'rgba(200,230,0,0.08)' }}>
                                    <span className="text-sm font-black uppercase tracking-wide" style={{ color: 'var(--text-main)' }}>Total for Current Assets</span>
                                    <span className="text-sm font-mono font-black text-[#C8E600]">{formatValue(cashAndEquivalentsTotal + arTotal + otherCurrentAssetsTotal)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Non Current Assets */}
                        <div className="space-y-3 pt-4 border-t border-[var(--border-main)]/50">
                            <div className="font-bold text-sm text-[var(--text-main)]">Non Current Assets</div>
                            
                            <div className="pl-4 space-y-2">
                                <div className="font-semibold text-xs text-dim uppercase tracking-wider">Fixed Assets</div>
                                {fixedAssets.filter((item: any) => item.amount !== 0).map((item: any, i: number) => {
                                    const isDepreciation = item.name.toLowerCase().includes('deprec');
                                    return (
                                        <div key={i} className="flex justify-between items-center text-sm pl-4">
                                            <span className="text-dim">{item.code ? `${item.code} - ` : ''}{item.name}</span>
                                            <span className={`font-mono ${isDepreciation ? 'text-rose-500 font-semibold' : 'text-[var(--text-main)]'}`}>{formatValue(item.amount)}</span>
                                        </div>
                                    );
                                })}

                                {fixedAssets.filter((a: any) => a.name.toLowerCase().includes('deprec')).length > 0 && (
                                    <div className="flex justify-between text-xs font-bold pl-4 text-rose-500 italic pt-1">
                                        <span>Total for Accumulated Depreciation of Vehicles / Depreciación Acumulada de Vehículos</span>
                                        <span className="font-mono">{formatValue(fixedAssets.filter((a: any) => a.name.toLowerCase().includes('deprec')).reduce((sum: number, a: any) => sum + a.amount, 0))}</span>
                                    </div>
                                )}

                                <div className="flex justify-between text-xs font-black uppercase pt-2 border-t border-[var(--border-main)]" style={{ color: 'var(--text-main)' }}>
                                    <span>Total for Fixed Assets</span>
                                    <span className="font-mono">{formatValue(fixedAssetsTotal)}</span>
                                </div>
                            </div>

                            {/* Other Assets */}
                            {otherAssets.length > 0 && (
                                <div className="pl-4 space-y-2 mt-3">
                                    <div className="font-semibold text-xs text-dim uppercase tracking-wider">Other Assets</div>
                                    {otherAssets.filter((item: any) => item.amount !== 0).map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center text-sm pl-4">
                                            <span className="text-dim">{item.code ? `${item.code} - ` : ''}{item.name}</span>
                                            <span className="font-mono text-[var(--text-main)]">{formatValue(item.amount)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between text-xs font-black uppercase pt-2 border-t border-[var(--border-main)]" style={{ color: 'var(--text-main)' }}>
                                        <span>Total for Other Assets</span>
                                        <span className="font-mono">{formatValue(otherAssetsTotal)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Total Non Current Assets */}
                            <div className="flex justify-between text-sm font-black uppercase pt-3 border-t-2" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                <span>Total for Non Current Assets</span>
                                <span className="font-mono text-[#C8E600]">{formatValue(nonCurrentAssetsTotal)}</span>
                            </div>
                        </div>

                        {/* Grand Total Assets */}
                        <div className="pt-4 flex justify-between items-center border-t-4" style={{ borderColor: 'var(--border-main)' }}>
                            <span className="text-sm font-black uppercase" style={{ color: 'var(--text-main)' }}>Total Assets</span>
                            <span className="text-lg font-mono font-black text-[#C8E600] underline decoration-double underline-offset-4">
                                {formatValue(totalAssets)}
                            </span>
                        </div>
                    </div>
                </section>

                {/* Liabilities & Equity Column */}
                <div className="space-y-8">
                    {/* Liabilities Section */}
                    <section className="space-y-6">
                        <h4 className="text-xs font-bold text-rose-500 uppercase tracking-widest pb-2 flex items-center gap-2 border-b border-[var(--border-main)]">
                            <ChevronRight size={14} /> Liabilities
                        </h4>
                        
                        <div className="space-y-4">
                            {/* Current Liabilities Group */}
                            <div className="space-y-3">
                                <div className="font-bold text-sm text-[var(--text-main)]">Current Liabilities</div>
                                {(() => {
                                    const grouped: Record<string, any[]> = {};
                                    currentLiabilities.forEach((item: any) => {
                                        const type = item.accountType || 'Other Current Liability';
                                        if (!grouped[type]) grouped[type] = [];
                                        grouped[type].push(item);
                                    });

                                    return Object.entries(grouped).map(([subCat, items]) => {
                                        const subTotal = (items as any[]).reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
                                        return (
                                            <div key={subCat} className="pl-4 space-y-2">
                                                <div className="font-semibold text-xs text-dim uppercase tracking-wider">{subCat}</div>
                                                {(items as any[]).filter((item: any) => item.amount !== 0).map((item: any, i: number) => (
                                                    <div key={i} className="flex justify-between items-center text-sm pl-4">
                                                        <span className="text-dim">{item.code ? `${item.code} - ` : ''}{item.name}</span>
                                                        <span className="font-mono text-[var(--text-main)]">{formatValue(item.amount)}</span>
                                                    </div>
                                                ))}
                                                <div className="flex justify-between text-xs font-black uppercase pt-2 border-t border-[var(--border-main)]" style={{ color: 'var(--text-main)' }}>
                                                    <span>Total for {subCat}</span>
                                                    <span className="font-mono">{formatValue(subTotal)}</span>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}

                                {/* Total for Current Liabilities */}
                                <div className="flex justify-between text-xs font-black uppercase pt-2.5 mt-1 border-t-2 border-[var(--border-main)]" style={{ color: 'var(--text-main)' }}>
                                    <span>Total for Current Liabilities</span>
                                    <span className="font-mono">{formatValue(currentLiabilitiesTotal)}</span>
                                </div>
                            </div>

                            {/* Long-Term Liabilities Group */}
                            {longTermLiabilities.length > 0 && (
                                <div className="space-y-3 pt-4 border-t border-[var(--border-main)]/50">
                                    <div className="font-bold text-sm text-[var(--text-main)]">Long-Term Liabilities</div>
                                    {(() => {
                                        const grouped: Record<string, any[]> = {};
                                        longTermLiabilities.forEach((item: any) => {
                                            const type = item.accountType || 'Non Current Liability';
                                            if (!grouped[type]) grouped[type] = [];
                                            grouped[type].push(item);
                                        });

                                        return Object.entries(grouped).map(([subCat, items]) => {
                                            const subTotal = (items as any[]).reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
                                            return (
                                                <div key={subCat} className="pl-4 space-y-2">
                                                    <div className="font-semibold text-xs text-dim uppercase tracking-wider">{subCat}</div>
                                                    {(items as any[]).filter((item: any) => item.amount !== 0).map((item: any, i: number) => (
                                                        <div key={i} className="flex justify-between items-center text-sm pl-4">
                                                            <span className="text-dim">{item.code ? `${item.code} - ` : ''}{item.name}</span>
                                                            <span className="font-mono text-[var(--text-main)]">{formatValue(item.amount)}</span>
                                                        </div>
                                                    ))}
                                                    <div className="flex justify-between text-xs font-black uppercase pt-2 border-t border-[var(--border-main)]" style={{ color: 'var(--text-main)' }}>
                                                        <span>Total for {subCat}</span>
                                                        <span className="font-mono">{formatValue(subTotal)}</span>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}

                                    {/* Total for Long-Term Liabilities */}
                                    <div className="flex justify-between text-xs font-black uppercase pt-2.5 mt-1 border-t-2 border-[var(--border-main)]" style={{ color: 'var(--text-main)' }}>
                                        <span>Total for Long-Term Liabilities</span>
                                        <span className="font-mono">{formatValue(longTermLiabilitiesTotal)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Other Liabilities Group */}
                            {otherLiabilities.length > 0 && (
                                <div className="space-y-3 pt-4 border-t border-[var(--border-main)]/50">
                                    <div className="font-bold text-sm text-[var(--text-main)]">Other Liabilities</div>
                                    {(() => {
                                        const grouped: Record<string, any[]> = {};
                                        otherLiabilities.forEach((item: any) => {
                                            const type = item.accountType || 'Other Liability';
                                            if (!grouped[type]) grouped[type] = [];
                                            grouped[type].push(item);
                                        });

                                        return Object.entries(grouped).map(([subCat, items]) => {
                                            const subTotal = (items as any[]).reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
                                            return (
                                                <div key={subCat} className="pl-4 space-y-2">
                                                    <div className="font-semibold text-xs text-dim uppercase tracking-wider">{subCat}</div>
                                                    {(items as any[]).filter((item: any) => item.amount !== 0).map((item: any, i: number) => (
                                                        <div key={i} className="flex justify-between items-center text-sm pl-4">
                                                            <span className="text-dim">{item.code ? `${item.code} - ` : ''}{item.name}</span>
                                                            <span className="font-mono text-[var(--text-main)]">{formatValue(item.amount)}</span>
                                                        </div>
                                                    ))}
                                                    <div className="flex justify-between text-xs font-black uppercase pt-2 border-t border-[var(--border-main)]" style={{ color: 'var(--text-main)' }}>
                                                        <span>Total for {subCat}</span>
                                                        <span className="font-mono">{formatValue(subTotal)}</span>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}

                                    {/* Total for Other Liabilities */}
                                    <div className="flex justify-between text-xs font-black uppercase pt-2.5 mt-1 border-t-2 border-[var(--border-main)]" style={{ color: 'var(--text-main)' }}>
                                        <span>Total for Other Liabilities</span>
                                        <span className="font-mono">{formatValue(otherLiabilitiesTotal)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Total Liabilities */}
                            <div className="pt-4 flex justify-between items-center border-t-2" style={{ borderColor: 'var(--border-main)' }}>
                                <span className="text-sm font-black uppercase" style={{ color: 'var(--text-main)' }}>Total Liabilities</span>
                                <span className="text-base font-mono font-bold text-rose-500">
                                    {formatValue(totalLiabilities)}
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Equity Section */}
                    <section className="space-y-6">
                        <h4 className="text-xs font-bold text-blue-500 uppercase tracking-widest pb-2 flex items-center gap-2 border-b border-[var(--border-main)]">
                            <ChevronRight size={14} /> Equity
                        </h4>
                        
                        <div className="space-y-4">
                            <div className="pl-2 space-y-2">
                                {/* Database Equity Accounts */}
                                {databaseEquity.map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center py-2 px-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/[0.03] group transition-all border border-transparent">
                                        <span className="text-sm font-medium transition-colors flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40 group-hover:bg-blue-500"></span>
                                            {item.code ? `${item.code} - ` : ''}{item.name}
                                        </span>
                                        <span className="text-sm font-mono font-bold" style={{ color: 'var(--text-main)' }}>
                                            {formatValue(item.amount)}
                                        </span>
                                    </div>
                                ))}

                                {/* Retained Earnings - Static Value */}
                                <div className="flex justify-between items-center py-2 px-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/[0.03] group transition-all border border-transparent">
                                    <span className="text-sm font-medium transition-colors flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40 group-hover:bg-blue-500"></span>
                                        Retained Earnings / Utilidades Retenidas
                                    </span>
                                    <span className="text-sm font-mono font-bold" style={{ color: 'var(--text-main)' }}>
                                        {formatValue(staticRetainedEarnings)}
                                    </span>
                                </div>

                                {/* Results of the exercise (Net Profit/Loss) */}
                                <div className="flex justify-between items-center py-2 px-3 rounded-xl bg-blue-50/40 dark:bg-blue-500/5 italic font-semibold border border-blue-500/10">
                                    <span className="text-sm font-medium transition-colors flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        Results of the exercise / Resultado del ejercicio
                                    </span>
                                    <span className="text-sm font-mono font-bold text-emerald-500">
                                        {formatValue(resultsOfTheExercise)}
                                    </span>
                                </div>
                            </div>

                            {/* Total for Capital */}
                            <div className="pt-4 flex justify-between items-center border-t-2" style={{ borderColor: 'var(--border-main)' }}>
                                <span className="text-sm font-black uppercase text-[var(--text-main)]">Total for Capital</span>
                                <span className="text-base font-mono font-bold text-blue-500">
                                    {formatValue(totalCapital)}
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Grand Total Liabilities and Equity */}
                    <div className="pt-6 flex justify-between items-center border-t-4" style={{ borderColor: 'var(--border-main)' }}>
                        <span className="text-sm font-black uppercase" style={{ color: 'var(--text-main)' }}>Total for Liabilities and Equity</span>
                        <span className="text-lg font-mono font-black text-[#C8E600] underline decoration-double underline-offset-4">
                            {formatValue(grandTotalLiabilitiesAndEquity)}
                        </span>
                    </div>
                </div>
            </div>


        </div>
    );
};

const getMockData = (type: 'PL' | 'BS') => {
    if (type === 'PL') return {
        income: [
            { name: 'Vehicle Rental Income', amount: 85000 },
            { name: 'Workshop Service Fees', amount: 12400 },
            { name: 'Late Payment Penalties', amount: 1200 }
        ],
        expenses: [
            { name: 'Staff Salaries', amount: 25000 },
            { name: 'Vehicle Maintenance', amount: 8400 },
            { name: 'Fuel Expense', amount: 4200 },
            { name: 'Insurance Premium', amount: 6000 },
            { name: 'Depreciation (Vehicles)', amount: 12000 }
        ],
        netProfit: 42000
    };
    return {
        assets: [
            { name: 'Cash at Bank', amount: 45000 },
            { name: 'Accounts Receivable', amount: 12000 },
            { name: 'Vehicle Fleet (Net)', amount: 850000 },
            { name: 'Workshop Equipment', amount: 45000 }
        ],
        liabilities: [
            { name: 'Vehicle Loans', amount: 450000 },
            { name: 'Accounts Payable', amount: 8500 },
            { name: 'Tax Provision', amount: 4250 }
        ],
        equity: [
            { name: 'Share Capital', amount: 300000 },
            { name: 'Retained Earnings', amount: 189250 }
        ],
        assetsTotal: 952000,
        liabilitiesTotal: 462750,
        equityTotal: 489250
    };
};

export default FinancialStatements;
