import { useState, useEffect } from 'react';
import { TrendingUp, Landmark, Calendar, Download, RefreshCw, ChevronRight, PieChart } from 'lucide-react';
import { getPLReport, getBalanceSheetReport } from '../../../services/reportingService';
import { getAllBranches } from '../../../services/branchService';

const FinancialStatements = () => {
    const [activeTab, setActiveTab] = useState<'PL' | 'BS'>('PL');
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState<any>(null);
    const [branches, setBranches] = useState<any[]>([]);
    
    const [filters, setFilters] = useState({
        branch: '',
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

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
                setReportData(data);
            } else {
                const data = await getBalanceSheetReport(filters);
                setReportData(data);
            }
        } catch (error) {
            console.error('Failed to fetch report', error);
            // Fallback mock data for demo if backend not ready
            setReportData(getMockData(activeTab));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [activeTab, filters.branch, filters.startDate, filters.endDate]);

    return (
        <div className="container-responsive space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3 text-[var(--text-main)]">
                        <PieChart size={28} className="text-[var(--brand-lime)]" />
                        Financial Statements
                    </h1>
                    <p className="text-sm mt-1 text-dim">Consolidated and branch-level financial reporting</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--bg-input)] border border-[var(--border-main)] text-dim hover:bg-[var(--bg-card)] hover:text-[var(--text-main)] transition-all">
                        <Download size={16} /> Export PDF
                    </button>
                    <button onClick={fetchReport} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--brand-lime)] text-[#0A0A0A] hover:shadow-[0_0_20px_rgba(200,230,0,0.2)] transition-all">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Calendar size={18} className="text-dim" />
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
                        onChange={e => setFilters({...filters, endDate: e.target.value})}
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

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-[var(--bg-input)] rounded-xl w-fit">
                <button 
                    onClick={() => setActiveTab('PL')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'PL' ? 'bg-[var(--brand-lime)] text-[#0A0A0A]' : 'text-dim hover:text-[var(--text-main)]'}`}
                >
                    <TrendingUp size={16} /> Profit & Loss
                </button>
                <button 
                    onClick={() => setActiveTab('BS')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'BS' ? 'bg-[var(--brand-lime)] text-[#0A0A0A]' : 'text-dim hover:text-[var(--text-main)]'}`}
                >
                    <Landmark size={16} /> Balance Sheet
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
                                    <div className="w-8 h-8 border-2 border-[var(--brand-lime)] border-t-transparent rounded-full animate-spin" />
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
                    <div className="bg-gradient-to-br from-[var(--brand-lime)]/20 to-transparent border border-[var(--brand-lime)]/20 rounded-2xl p-6">
                        <p className="text-[10px] font-bold text-[var(--brand-lime)] uppercase tracking-widest mb-1">Total Net Result</p>
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
                                <div className="bg-[var(--brand-lime)] h-full" style={{ width: '24.2%' }} />
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
            <h4 className="text-xs font-bold text-[var(--brand-lime)] uppercase tracking-widest mb-4 flex items-center gap-2">
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
                    <span className="text-sm font-mono font-bold text-[var(--text-main)] underline decoration-[var(--brand-lime)] decoration-2 underline-offset-4">
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
                    <p className="text-2xl font-mono font-bold text-[var(--brand-lime)]">${data?.netProfit?.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
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
                <h4 className="text-xs font-bold text-[var(--brand-lime)] uppercase tracking-widest mb-4 flex items-center gap-2">
                    <ChevronRight size={14} /> Assets
                </h4>
                <div className="space-y-3">
                    {data?.assets?.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between items-center">
                            <span className="text-sm text-dim">{item.name}</span>
                            <span className="text-sm font-mono text-[var(--text-main)]">${item.amount.toLocaleString()}</span>
                        </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t border-[var(--border-main)]">
                        <span className="text-sm font-bold text-[var(--text-main)]">Total Assets</span>
                        <span className="text-sm font-mono font-bold text-[var(--text-main)]">${data?.assetsTotal?.toLocaleString()}</span>
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
                                <span className="text-sm font-mono text-[var(--text-main)]">${item.amount.toLocaleString()}</span>
                            </div>
                        ))}
                        <div className="flex justify-between items-center pt-2 border-t border-[var(--border-main)]">
                            <span className="text-sm font-bold text-[var(--text-main)]">Total Liabilities</span>
                            <span className="text-sm font-mono font-bold text-[var(--text-main)]">${data?.liabilitiesTotal?.toLocaleString()}</span>
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
                                <span className="text-sm font-mono text-[var(--text-main)]">${item.amount.toLocaleString()}</span>
                            </div>
                        ))}
                        <div className="flex justify-between items-center pt-2 border-t border-[var(--border-main)]">
                            <span className="text-sm font-bold text-[var(--text-main)]">Total Equity</span>
                            <span className="text-sm font-mono font-bold text-[var(--text-main)]">${data?.equityTotal?.toLocaleString()}</span>
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
                    <p className="text-lg font-mono font-bold text-[var(--text-main)]">${data?.assetsTotal?.toLocaleString()}</p>
                </div>
                <div className="text-xl opacity-20">=</div>
                <div className="text-center">
                    <p className="text-[10px] text-dim uppercase">Liabilities + Equity</p>
                    <p className="text-lg font-mono font-bold text-[var(--text-main)]">${(data?.liabilitiesTotal + data?.equityTotal)?.toLocaleString()}</p>
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
