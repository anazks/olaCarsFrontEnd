import { useState, useEffect, useMemo } from 'react';
import { 
     Calendar, MapPin, Building, ChevronLeft, ChevronRight, 
    Search, Filter, FilterX, Clock, ShieldAlert, FileSpreadsheet, 
} from 'lucide-react';
import { format, startOfMonth } from 'date-fns';

// Services
import { 
    getCollectionsList, 
    type CollectionListItem 
} from '../../../services/collectionService';
import { getAllBranches } from '../../../services/branchService';
import { useTheme } from '../../../context/ThemeContext';

interface CollectionsLedgerViewProps {
    type: 'OVERDUE' | 'UPCOMING' | 'GENERAL';
}

const CollectionsLedgerView = ({ type }: CollectionsLedgerViewProps) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Map metadata based on props
    const meta = useMemo(() => {
        switch (type) {
            case 'OVERDUE':
                return {
                    title: 'Overdue Payments',
                    desc: 'Interactive aging ledgers of all past-due account balances requiring action.',
                    icon: <ShieldAlert className="text-red-500" />,
                    listType: 'OVERDUE',
                    colorClass: 'text-red-500'
                };
            case 'UPCOMING':
                return {
                    title: 'Upcoming Payments',
                    desc: 'Chronological projection grid of near-future payment inflows.',
                    icon: <Clock className="text-blue-400" />,
                    listType: 'UPCOMING',
                    colorClass: 'text-blue-400'
                };
            default:
                return {
                    title: 'Invoices Ledger',
                    desc: 'Consolidated master ledger of all system-wide collections invoices.',
                    icon: <FileSpreadsheet className="text-[#C8E600]" />,
                    listType: 'GENERAL',
                    colorClass: 'text-[#C8E600]'
                };
        }
    }, [type]);

    // Lists & Paging
    const [listItems, setListItems] = useState<CollectionListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Filter state
    const [allBranches, setAllBranches] = useState<any[]>([]);
    const [filters, setFilters] = useState({
        country: '',
        branch: '',
        startDate: type === 'GENERAL' ? format(startOfMonth(new Date()), 'yyyy-MM-dd') : '',
        endDate: type === 'GENERAL' ? format(new Date(), 'yyyy-MM-dd') : ''
    });

    // 1. Setup Lookups
    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const res = await getAllBranches({ limit: 1000 });
                setAllBranches(res.data || []);
            } catch (e) {
                console.error(e);
            }
        };
        fetchBranches();
    }, []);

    // Nested cascading filters
    const availableCountries = useMemo(() => {
        const c = allBranches.map(b => b.country).filter(Boolean);
        return Array.from(new Set(c)).sort();
    }, [allBranches]);

    const filteredBranches = useMemo(() => {
        if (!filters.country) return allBranches;
        return allBranches.filter(b => b.country === filters.country);
    }, [filters.country, allBranches]);

    useEffect(() => {
        if (filters.branch && !filteredBranches.some(b => b._id === filters.branch)) {
            setFilters(p => ({ ...p, branch: '' }));
        }
    }, [filters.country, filteredBranches]);

    // Debounced search trigger
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
        return () => clearTimeout(t);
    }, [searchQuery]);

    // 2. Paginated Data Fetch
    const fetchPage = async (pageNumber = 1) => {
        setLoading(true);
        try {
            const query = {
                ...filters,
                search: debouncedSearch,
                status: statusFilter,
                page: pageNumber,
                limit: 15,
                listType: meta.listType
            };
            const data = await getCollectionsList(query);
            setListItems(data.items || []);
            setPagination({
                page: data.pagination.page,
                total: data.pagination.total,
                pages: data.pagination.pages
            });
        } catch (err) {
            console.error('Ledger fetch fail', err);
        } finally {
            setLoading(false);
        }
    };

    // Core lifecycle listener
    useEffect(() => {
        fetchPage(1);
    }, [type, filters.country, filters.branch, filters.startDate, filters.endDate, debouncedSearch, statusFilter]);

    const updateFilter = (key: string, val: string) => {
        setFilters(p => ({ ...p, [key]: val }));
    };

    return (
        <div className="p-6 md:p-8 min-h-screen transition-colors duration-300" style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}>
            
            {/* HEADER & DESCRIPTION */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
                        {meta.icon} {meta.title}
                    </h1>
                    <p className="font-medium" style={{ color: 'var(--text-dim)' }}>{meta.desc}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#C8E600] animate-pulse" />
                        <p className="text-xs font-bold text-[#C8E600]">
                            {type === 'GENERAL' ? (
                                filters.startDate || filters.endDate 
                                    ? `Span: ${filters.startDate ? format(new Date(filters.startDate), 'MMM dd, yyyy') : 'Genesis'} - ${filters.endDate ? format(new Date(filters.endDate), 'MMM dd, yyyy') : 'Today'}`
                                    : 'Span: All-Time Dataset'
                            ) : (
                                type === 'OVERDUE' ? 'Span: Historical Aging Lifetime' : 'Span: Future Inflow Projections'
                            )}
                        </p>
                    </div>
                </div>

                {/* REUSABLE FILTER WRAPPER */}
                <div className="shadow-sm border p-2 rounded-2xl flex flex-wrap items-center gap-3 w-full lg:w-auto transition-colors"
                     style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    
                    {/* Country */}
                    <div className="relative">
                        <select value={filters.country} 
                                onChange={(e) => updateFilter('country', e.target.value)}
                                className="pl-8 pr-6 py-2 text-sm font-semibold border-none outline-none bg-transparent appearance-none cursor-pointer transition-colors"
                                style={{ color: 'var(--text-main)' }}>
                            <option value="" style={{ background: 'var(--bg-card)' }}>All Countries</option>
                            {availableCountries.map(c => <option key={c} value={c} style={{ background: 'var(--bg-card)' }}>{c}</option>)}
                        </select>
                        <MapPin size={15} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                    </div>

                    <div className="h-6 w-px hidden sm:block" style={{ background: 'var(--border-main)' }} />

                    {/* Branch */}
                    <div className="relative">
                        <select value={filters.branch} 
                                onChange={(e) => updateFilter('branch', e.target.value)}
                                className="pl-8 pr-6 py-2 text-sm font-semibold border-none outline-none bg-transparent appearance-none cursor-pointer max-w-[160px] transition-colors"
                                style={{ color: 'var(--text-main)' }}>
                            <option value="" style={{ background: 'var(--bg-card)' }}>All Branches</option>
                            {filteredBranches.map(b => <option key={b._id} value={b._id} style={{ background: 'var(--bg-card)' }}>{b.name}</option>)}
                        </select>
                        <Building size={15} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                    </div>

                    {/* Hide specific dates boundary for specialty list defaults unless desired */}
                    {type === 'GENERAL' && (
                        <>
                            <div className="h-6 w-px hidden sm:block" style={{ background: 'var(--border-main)' }} />
                            <div className="flex items-center gap-2 rounded-xl px-3 py-1.5 border transition-colors" 
                                 style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                <Calendar size={15} className="opacity-60" />
                                <input type="date" value={filters.startDate} 
                                       onChange={(e) => updateFilter('startDate', e.target.value)}
                                       className="bg-transparent text-xs font-bold border-none outline-none"
                                       style={{ colorScheme: isDark ? 'dark' : 'light', color: 'var(--text-main)' }} />
                                <span className="text-xs opacity-50">-</span>
                                <input type="date" value={filters.endDate} 
                                       onChange={(e) => updateFilter('endDate', e.target.value)}
                                       className="bg-transparent text-xs font-bold border-none outline-none"
                                       style={{ colorScheme: isDark ? 'dark' : 'light', color: 'var(--text-main)' }} />
                                {(filters.startDate || filters.endDate) && (
                                    <button onClick={() => setFilters(p => ({ ...p, startDate: '', endDate: '' }))} className="text-red-500 ml-1"><FilterX size={14}/></button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* MAIN DATA TABLE WRAPPER */}
            <div className="rounded-3xl p-6 border shadow-sm transition-colors flex-1 flex flex-col"
                 style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                
                {/* GRID CONTROLS: IN-TABLE SEARCH AND FILTERS */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        {meta.title} Ledger
                        <span className="text-[11px] font-bold bg-white/5 border px-2 py-0.5 rounded-full" style={{ borderColor: 'var(--border-main)' }}>
                            {pagination.total} Total
                        </span>
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1 md:w-[280px]">
                            <input 
                                type="text" 
                                placeholder="Search ID, Driver, Plate or Fleet..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border outline-none focus:ring-1 focus:ring-[#C8E600] transition-all"
                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            />
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                        </div>

                        {/* Status Filter */}
                        {type !== 'OVERDUE' && (
                            <div className="relative">
                                <select 
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="pl-8 pr-8 py-2 text-sm font-semibold rounded-xl border appearance-none cursor-pointer outline-none transition-colors"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="">All Statuses</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="PARTIAL">Partial</option>
                                    <option value="PAID">Settled</option>
                                    <option value="OVERDUE">Overdue</option>
                                </select>
                                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
                            </div>
                        )}
                    </div>
                </div>

                {/* TABLE GRID */}
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-[10px] font-black tracking-wider uppercase border-b opacity-60" style={{ borderColor: 'var(--border-main)' }}>
                                <th className="pb-4 pl-2">Invoice Number</th>
                                <th className="pb-4">Driver Details</th>
                                <th className="pb-4">Vehicle / Fleet</th>
                                <th className="pb-4">Node Location</th>
                                <th className="pb-4">Due Date</th>
                                {type === 'OVERDUE' && <th className="pb-4 text-right">Aging Deficit</th>}
                                <th className="pb-4 text-right">Gross Billed</th>
                                <th className="pb-4 text-right">Net Settled</th>
                                <th className="pb-4 text-right pr-2">Current Balance</th>
                                {type !== 'OVERDUE' && <th className="pb-4 text-center">Status</th>}
                            </tr>
                        </thead>
                        <tbody className="text-xs divide-y divide-gray-800" style={{ borderColor: 'var(--border-main)' }}>
                            {loading ? (
                                <tr>
                                    <td colSpan={type === 'OVERDUE' ? 9 : 9} className="py-24 text-center">
                                        <div className="animate-pulse font-bold text-[#C8E600] text-sm tracking-wider uppercase">Streaming live system ledgers...</div>
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {listItems.map((item) => (
                                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="py-4 font-black text-[#C8E600] pl-2 group-hover:translate-x-0.5 transition-transform">{item.invoiceNumber}</td>
                                            <td className="py-4 font-bold text-white">
                                                {item.driverName}
                                                <div className="text-[10px] font-medium opacity-40 mt-0.5">{item.driverId?.substring(18) ? `ID: ...${item.driverId.substring(18)}` : ''}</div>
                                            </td>
                                            <td className="py-4">
                                                <span className="font-semibold">{item.vehicleNumber}</span>
                                                <div className="text-[10px] opacity-50 font-bold">Fleet #{item.fleetNumber}</div>
                                            </td>
                                            <td className="py-4">
                                                <span className="font-semibold">{item.branch}</span>
                                                <div className="text-[10px] opacity-50 font-black uppercase">{item.country}</div>
                                            </td>
                                            <td className="py-4 font-bold opacity-80">
                                                {format(new Date(item.dueDate), 'MMMM dd, yyyy')}
                                            </td>
                                            
                                            {type === 'OVERDUE' && (
                                                <td className="py-4 text-right">
                                                    <span className="px-2.5 py-0.5 rounded bg-red-500/10 text-red-500 font-black text-[10px]">
                                                        {item.daysOverdue} Days
                                                    </span>
                                                </td>
                                            )}

                                            <td className="py-4 text-right font-medium opacity-60">${item.totalAmountDue.toLocaleString()}</td>
                                            <td className="py-4 text-right font-bold text-emerald-400">${item.amountPaid.toLocaleString()}</td>
                                            <td className="py-4 text-right font-black text-white pr-2">
                                                <span className={item.balance > 0 && type === 'OVERDUE' ? 'text-red-500' : 'text-white'}>
                                                    ${item.balance.toLocaleString()}
                                                </span>
                                            </td>

                                            {type !== 'OVERDUE' && (
                                                <td className="py-4 text-center">
                                                    <span className={`px-2.5 py-0.5 rounded text-[9px] font-black tracking-wide uppercase ${
                                                        item.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500' :
                                                        item.status === 'OVERDUE' ? 'bg-red-500/10 text-red-500' :
                                                        item.status === 'PARTIAL' ? 'bg-amber-500/10 text-amber-500' : 'bg-gray-700/50 text-gray-300'
                                                    }`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {listItems.length === 0 && (
                                        <tr>
                                            <td colSpan={10} className="py-24 text-center text-gray-500 italic font-medium">
                                                Zero records found. Refine date bounds or relax search inputs.
                                            </td>
                                        </tr>
                                    )}
                                </>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* PAGINATION CONTROL STRIP */}
                {pagination.pages > 1 && (
                    <div className="flex items-center justify-between mt-auto pt-6 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <p className="text-xs font-medium opacity-50">Showing row interval. Net population: <span className="font-bold">{pagination.total}</span> lines</p>
                        
                        <div className="flex items-center gap-2">
                            <button 
                                disabled={pagination.page <= 1 || loading}
                                onClick={() => fetchPage(pagination.page - 1)}
                                className="p-2 rounded-xl border disabled:opacity-25 cursor-pointer transition-all hover:bg-white/5"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-xs font-bold bg-white/5 border px-4 py-2 rounded-xl" style={{ borderColor: 'var(--border-main)' }}>
                                Page {pagination.page} of {pagination.pages}
                            </span>
                            <button 
                                disabled={pagination.page >= pagination.pages || loading}
                                onClick={() => fetchPage(pagination.page + 1)}
                                className="p-2 rounded-xl border disabled:opacity-25 cursor-pointer transition-all hover:bg-white/5"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default CollectionsLedgerView;
