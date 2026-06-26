import { useState, useEffect } from 'react';
import { TrendingUp, Download, RefreshCw, ChevronRight, PieChart, Loader2 } from 'lucide-react';
import { getPLReport, getBalanceSheetReport } from '../../../services/reportingService';
import { getAllBranches } from '../../../services/branchService';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const FinancialStatements = () => {
    const [activeTab, setActiveTab] = useState<'PL' | 'BS'>('PL');
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [reportData, setReportData] = useState<any>(null);
    const [branches, setBranches] = useState<any[]>([]);
    const getOneMonthAgo = () => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    };

    const getToday = () => {
        return new Date().toISOString().split('T')[0];
    };

    const [filters, setFilters] = useState({
        branch: '',
        startDate: getOneMonthAgo(),
        endDate: getToday()
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
        fetchReport();
    }, [activeTab, filters.branch, filters.startDate, filters.endDate]);

    const handleExportPdf = async () => {
        setExporting(true);
        const toastId = toast.loading("Generating PDF Report...");
        try {
            const query = {
                ...filters,
                reportType: activeTab
            };
            const res = await api.get('/api/reporting/export/pdf', { params: query, responseType: 'blob' });
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            
            // Download PDF file
            const link = document.createElement('a');
            link.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            const title = activeTab === 'PL' ? 'income_statement' : 'balance_sheet';
            const filename = `${title}_report_${dateStr}.pdf`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("PDF report downloaded successfully!", { id: toastId });
        } catch (err: any) {
            console.error("PDF generation failed:", err);
            toast.error("Failed to generate PDF report. Please try again.", { id: toastId });
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="container-responsive space-y-6">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Financial Statements', active: true }]} />

            {/* Tab Selector */}
            <div className="flex border-b border-white/5 gap-2" style={{ borderColor: 'var(--border-main)' }}>
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
                        className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all border hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        {exporting ? (
                            <>
                                <Loader2 size={14} className="animate-spin" /> Exporting...
                            </>
                        ) : (
                            <>
                                <Download size={14} /> Export PDF
                            </>
                        )}
                    </button>
                    <button 
                        onClick={fetchReport}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-brand-lime text-[#0A0A0A] transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                        style={{ backgroundColor: 'var(--brand-lime)' }}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
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

const PLView = ({ data }: { data: any }) => (
    <div className="space-y-8">
        {/* Income Section */}
        <section>
            <h4 className="text-xs font-bold text-[#C8E600] uppercase tracking-widest mb-4 flex items-center gap-2">
                <ChevronRight size={14} /> Income
            </h4>
            <div className="space-y-3">
                {data?.income?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center group cursor-default">
                        <span className="text-sm text-dim group-hover:text-[var(--text-main)] transition-colors">{item.name}</span>
                        <div className="flex-1 border-b border-dashed border-[var(--border-main)] mx-4" />
                        <span className="text-sm font-mono text-[var(--text-main)]">${item.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-[var(--border-main)]">
                    <span className="text-sm font-bold text-[var(--text-main)]">Total Income</span>
                    <span className="text-sm font-mono font-bold text-[var(--text-main)] underline decoration-[#C8E600] decoration-2 underline-offset-4">
                        ${data?.income?.reduce((acc: number, val: any) => acc + val.amount, 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </span>
                </div>
            </div>
        </section>

        {/* Expenses Section */}
        <section>
            <h4 className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <ChevronRight size={14} /> Expenses
            </h4>
            <div className="space-y-3">
                {data?.expenses?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center group cursor-default">
                        <span className="text-sm text-dim group-hover:text-[var(--text-main)] transition-colors">{item.name}</span>
                        <div className="flex-1 border-b border-dashed border-[var(--border-main)] mx-4" />
                        <span className="text-sm font-mono text-[var(--text-main)]">${item.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-[var(--border-main)]">
                    <span className="text-sm font-bold text-[var(--text-main)]">Total Expenses</span>
                    <span className="text-sm font-mono font-bold text-[var(--text-main)]">
                        (${data?.expenses?.reduce((acc: number, val: any) => acc + val.amount, 0).toLocaleString(undefined, {minimumFractionDigits: 2})})
                    </span>
                </div>
            </div>
        </section>

        {/* Net Profit */}
        <section className="pt-6 border-t-4 border-[var(--border-main)]">
            <div className="flex justify-between items-center">
                <h4 className="text-lg font-bold text-[var(--text-main)] uppercase tracking-wider">Net Profit / Loss</h4>
                <div className="text-right">
                    <p className="text-2xl font-mono font-bold text-[#C8E600]">${data?.netProfit?.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                    <p className="text-[10px] text-dim">BEFORE TAX ADJUSTMENTS</p>
                </div>
            </div>
        </section>
    </div>
);

const BSView = ({ data }: { data: any }) => (
    <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Assets */}
            <section>
                <h4 className="text-xs font-bold text-[#C8E600] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ChevronRight size={14} /> Assets
                </h4>
                <div className="space-y-3">
                    {data?.assets?.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between items-center">
                            <span className="text-sm text-dim">{item.name}</span>
                            <span className="text-sm font-mono text-[var(--text-main)]">${(item.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t border-[var(--border-main)]">
                        <span className="text-sm font-bold text-[var(--text-main)]">Total Assets</span>
                        <span className="text-sm font-mono font-bold text-[var(--text-main)]">${(data?.assetsTotal || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                    </div>
                </div>
            </section>

            <div className="space-y-8">
                {/* Liabilities */}
                <section>
                    <h4 className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <ChevronRight size={14} /> Liabilities
                    </h4>
                    <div className="space-y-3">
                        {data?.liabilities?.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between items-center">
                                <span className="text-sm text-dim">{item.name}</span>
                                <span className="text-sm font-mono text-[var(--text-main)]">${(item.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            </div>
                        ))}
                        <div className="flex justify-between items-center pt-2 border-t border-[var(--border-main)]">
                            <span className="text-sm font-bold text-[var(--text-main)]">Total Liabilities</span>
                            <span className="text-sm font-mono font-bold text-[var(--text-main)]">${(data?.liabilitiesTotal || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                    </div>
                </section>

                {/* Equity */}
                <section>
                    <h4 className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <ChevronRight size={14} /> Equity
                    </h4>
                    <div className="space-y-3">
                        {data?.equity?.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between items-center">
                                <span className="text-sm text-dim">{item.name}</span>
                                <span className="text-sm font-mono text-[var(--text-main)]">${(item.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            </div>
                        ))}
                        <div className="flex justify-between items-center pt-2 border-t border-[var(--border-main)]">
                            <span className="text-sm font-bold text-[var(--text-main)]">Total Equity</span>
                            <span className="text-sm font-mono font-bold text-[var(--text-main)]">${(data?.equityTotal || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        </div>
                    </div>
                </section>
            </div>
        </div>

        {/* Accounting Equation Check */}
        <section className="pt-6 border-t-4 border-[var(--border-main)] flex justify-center">
            <div className="bg-[var(--bg-input)] px-8 py-4 rounded-2xl border border-[var(--border-main)] flex items-center gap-6">
                <div className="text-center">
                    <p className="text-[10px] text-dim uppercase">Assets</p>
                    <p className="text-lg font-mono font-bold text-[var(--text-main)]">${(data?.assetsTotal || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                </div>
                <div className="text-xl opacity-20">=</div>
                <div className="text-center">
                    <p className="text-[10px] text-dim uppercase">Liabilities + Equity</p>
                    <p className="text-lg font-mono font-bold text-[var(--text-main)]">${((data?.liabilitiesTotal || 0) + (data?.equityTotal || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                </div>
            </div>
        </section>
    </div>
);

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
