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
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8">
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
                <div className="shadow-sm border p-2.5 rounded-2xl flex flex-wrap items-center gap-3 w-full xl:w-auto transition-colors"
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
                        <div className="relative flex-1 md:min-w-[300px]">
                            <input 
                                type="text" 
                                placeholder="Search ID, Driver, Plate or Fleet..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full border py-2.5 pl-10 pr-4 rounded-xl font-medium text-sm shadow-sm outline-none focus:border-brand-lime transition-all"
                                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            />
                            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50" style={{ color: 'var(--text-dim)' }} />
                        </div>

                        {type !== 'OVERDUE' && (
                            <div className="relative">
                                <select 
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="pl-4 pr-10 py-2 rounded-xl border font-bold text-sm bg-transparent outline-none appearance-none cursor-pointer transition-colors"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="" style={{ background: 'var(--bg-card)' }}>All Statuses</option>
                                    <option value="PENDING" style={{ background: 'var(--bg-card)' }}>Pending</option>
                                    <option value="PARTIAL" style={{ background: 'var(--bg-card)' }}>Partial</option>
                                    <option value="PAID" style={{ background: 'var(--bg-card)' }}>Settled</option>
                                    <option value="OVERDUE" style={{ background: 'var(--bg-card)' }}>Overdue</option>
                                </select>
                                <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
                            </div>
                        )}
                        <button className="flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                            <FileSpreadsheet size={16} /> Export
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto w-full border rounded-xl shadow-sm" style={{ borderColor: 'var(--border-main)' }}>
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead style={{ backgroundColor: 'var(--bg-input)' }}>
                            <tr className="text-[11px] font-black uppercase tracking-wider opacity-60 border-b" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                <th className="py-4 pl-4 pr-2 w-10">
                                    <input type="checkbox" className="rounded border-gray-300" />
                                </th>
                                <th className="py-4 px-3">Sl No.</th>
                                <th className="py-4 px-3">Invoice Number</th>
                                <th className="py-4 px-3">Driver Details</th>
                                <th className="py-4 px-3">Vehicle / Fleet</th>
                                <th className="py-4 px-3">Node Location</th>
                                <th className="py-4 px-3">Due Date</th>
                                {type === 'OVERDUE' && <th className="py-4 px-3 text-right">Aging Deficit</th>}
                                <th className="py-4 px-3 text-right">Gross Billed</th>
                                <th className="py-4 px-3 text-right">Net Settled</th>
                                <th className="py-4 px-3 text-right">Current Balance</th>
                                {type !== 'OVERDUE' && <th className="py-4 pr-4 pl-3 text-center">Status</th>}
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y" style={{ borderColor: 'var(--border-main)' }}>
                            {loading ? (
                                <tr>
                                    <td colSpan={type === 'OVERDUE' ? 9 : 9} className="py-24 text-center">
                                        <div className="animate-pulse font-bold text-[#C8E600] text-sm tracking-wider uppercase">Streaming live system ledgers...</div>
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {listItems.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                            <td className="py-4 pl-4 pr-2">
                                                <input type="checkbox" className="rounded border-gray-300" />
                                            </td>
                                            <td className="py-4 px-3 font-semibold text-gray-500">{(index + 1 + (pagination.page - 1) * 15).toString().padStart(2, '0')}</td>
                                            <td className="py-4 px-3 font-bold text-[#D4F12E]">{item.invoiceNumber}</td>
                                            <td className="py-4 px-3">
                                                <div className="font-bold" style={{ color: 'var(--text-main)' }}>{item.driverName}</div>
                                                <div className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.driverId?.substring(18) ? `ID: ...${item.driverId.substring(18)}` : ''}</div>
                                            </td>
                                            <td className="py-4 px-3">
                                                <div className="font-semibold" style={{ color: 'var(--text-main)' }}>{item.vehicleNumber}</div>
                                                <div className="text-[10px] font-black uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>Fleet #{item.fleetNumber}</div>
                                            </td>
                                            <td className="py-4 px-3">
                                                <div className="font-semibold" style={{ color: 'var(--text-main)' }}>{item.branch}</div>
                                                <div className="text-[10px] font-black uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.country}</div>
                                            </td>
                                            <td className="py-4 px-3 font-bold" style={{ color: 'var(--text-muted)' }}>
                                                {format(new Date(item.dueDate), 'MMMM dd, yyyy')}
                                            </td>
                                            
                                            {type === 'OVERDUE' && (
                                                <td className="py-4 px-3 text-right">
                                                    <span className="px-2.5 py-1 rounded bg-red-500/10 text-red-500 font-black text-[10px] uppercase tracking-widest">
                                                        {item.daysOverdue} Days
                                                    </span>
                                                </td>
                                            )}

                                            <td className="py-4 px-3 text-right font-medium" style={{ color: 'var(--text-muted)' }}>${item.totalAmountDue.toLocaleString()}</td>
                                            <td className="py-4 px-3 text-right font-bold text-green-500">${item.amountPaid.toLocaleString()}</td>
                                            <td className="py-4 px-3 text-right font-black">
                                                <span className={item.balance > 0 && type === 'OVERDUE' ? 'text-red-500' : ''} style={{ color: item.balance > 0 && type === 'OVERDUE' ? undefined : 'var(--text-main)' }}>
                                                    ${item.balance.toLocaleString()}
                                                </span>
                                            </td>

                                            {type !== 'OVERDUE' && (
                                                <td className="py-4 pr-4 pl-3 text-center">
                                                    <span className={`px-2.5 py-1 rounded text-[10px] font-black tracking-widest uppercase ${
                                                        item.status === 'PAID' ? 'bg-green-500/10 text-green-500' :
                                                        item.status === 'OVERDUE' ? 'bg-red-500/10 text-red-500' :
                                                        item.status === 'PARTIAL' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-gray-500/10 text-gray-500'
                                                    }`}>
                                                        • {item.status}
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

                {/* PAGINATION */}
                <div className="flex items-center justify-between pt-6 mt-6 border-t border-dashed" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-2">
                        <select className="px-3 py-1.5 rounded-lg border font-bold text-sm bg-transparent outline-none appearance-none cursor-pointer shadow-sm" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                            <option value="15" style={{ background: 'var(--bg-card)' }}>15 ˅</option>
                            <option value="50" style={{ background: 'var(--bg-card)' }}>50 ˅</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-bold">
                        <button 
                            disabled={pagination.page <= 1 || loading}
                            onClick={() => fetchPage(pagination.page - 1)}
                            className="px-2.5 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {'<'}
                        </button>
                        {[...Array(Math.min(pagination.pages, 5))].map((_, i) => {
                            const pageNum = i + 1;
                            return (
                                <button 
                                    key={pageNum}
                                    onClick={() => fetchPage(pageNum)}
                                    className={`px-2.5 py-1 rounded ${pagination.page === pageNum ? 'bg-[#D4F12E] text-black' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                                >
                                    {pageNum.toString().padStart(2, '0')}
                                </button>
                            );
                        })}
                        {pagination.pages > 5 && <span className="px-1.5">...</span>}
                        <button 
                            disabled={pagination.page >= pagination.pages || loading}
                            onClick={() => fetchPage(pagination.page + 1)}
                            className="px-2.5 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {'>'}
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default CollectionsLedgerView;
