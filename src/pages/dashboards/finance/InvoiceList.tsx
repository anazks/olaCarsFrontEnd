import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    FileText, RefreshCw, Filter, Search, CheckCircle2,
    Clock, AlertCircle, ChevronLeft, ChevronRight, Calendar, Plus,
    ArrowUpDown, ArrowUp, ArrowDown, Trash2, Settings, FileSpreadsheet, Download
} from 'lucide-react';
import { getInvoicesRegistry, deleteAllInvoices, getInvoicesDateWise, downloadInvoiceRegistryPdf } from '../../../services/invoiceService';
import type { Invoice } from '../../../services/invoiceService';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import InvoiceSettingsModal from './InvoiceSettingsModal';
import BulkInvoiceUpload from '../shared/BulkInvoiceUpload';
import { getUserRole } from '../../../utils/auth';

const InvoiceList = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const userRole = getUserRole();

    const getRoutePrefix = () => {
        const role = getUserRole();
        switch (role) {
            case 'admin': return '/admin/admin';
            case 'financeadmin':
            case 'financialadmin': return '/admin/financial-admin';
            case 'operationadmin':
            case 'operationaladmin': return '/admin/operational-admin';
            case 'countrymanager': return '/admin/country-manager';
            case 'branchmanager': return '/admin/branch-manager';
            case 'financestaff': return '/admin/branch-fin-staff';
            case 'operationstaff': return '/admin/branch-op-staff';
            default: return '/admin/financial-admin';
        }
    };

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showBulkUpload, setShowBulkUpload] = useState(false);
    const [downloadingPdf, setDownloadingPdf] = useState(false);
    const [downloadingExcel, setDownloadingExcel] = useState(false);

    const getDefaultStartDate = () => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().substring(0, 10);
    };

    const getDefaultEndDate = () => {
        return new Date().toISOString().substring(0, 10);
    };

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const handleApplyFilters = () => {
        fetchData();
    };

    const [statusFilter, setStatusFilter] = useState('ALL');
    const [typeFilter, setTypeFilter] = useState('ALL');
    const [filterMonth, setFilterMonth] = useState<string>('');
    const [filterYear, setFilterYear] = useState<string>('2026');
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);





    const [metrics, setMetrics] = useState<{
        totalGrossBilled: number;
        totalNetSettled: number;
        totalCurrentBalance: number;
        isFilteredPeriod: boolean;
    }>({
        totalGrossBilled: 0,
        totalNetSettled: 0,
        totalCurrentBalance: 0,
        isFilteredPeriod: false,
    });

    useEffect(() => {
        if (location.state?.search) {
            setSearchQuery(location.state.search);
        }
    }, [location.state]);

    // Server Pagination
    const [page, setPage] = useState(1);
    const limit = 25;
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });

    // Sorting
    const [sortBy, setSortBy] = useState('generatedAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
        return () => clearTimeout(t);
    }, [searchQuery]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, sortBy, sortOrder, startDate, endDate, statusFilter, typeFilter, filterMonth, filterYear]);

    const handlePageChange = (pageNum: number) => {
        setPage(pageNum);
    };

    const getPageNumbers = () => {
        const totalPages = pagination.pages;
        const currentPage = page;
        const pages: (number | string)[] = [];

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always include first page
            pages.push(1);

            if (currentPage > 3) {
                pages.push('ellipsis-start');
            }

            // Determine range around current page
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            let finalStart = start;
            let finalEnd = end;
            if (currentPage <= 3) {
                finalEnd = 4;
            } else if (currentPage >= totalPages - 2) {
                finalStart = totalPages - 3;
            }

            for (let i = finalStart; i <= finalEnd; i++) {
                if (i > 1 && i < totalPages) {
                    pages.push(i);
                }
            }

            if (currentPage < totalPages - 2) {
                pages.push('ellipsis-end');
            }

            // Always include last page
            pages.push(totalPages);
        }
        return pages;
    };

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sortBy !== field) return <ArrowUpDown size={10} className="opacity-20 group-hover:opacity-100 transition-opacity" />;
        return sortOrder === 'asc' ? <ArrowUp size={10} className="text-brand-lime" /> : <ArrowDown size={10} className="text-brand-lime" />;
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const filters: any = { page, limit, sortBy, sortOrder };
            if (debouncedSearch.trim()) filters.search = debouncedSearch.trim();
            if (filterYear === 'CUSTOM') {
                if (startDate) filters.startDate = startDate;
                if (endDate) filters.endDate = endDate;
            } else {
                if (filterYear) filters.year = filterYear;
                if (filterMonth) filters.month = filterMonth;
            }
            if (!startDate && !endDate && !filterMonth && !filterYear) filters.allTime = 'true';
            if (statusFilter !== 'ALL') filters.status = statusFilter;
            if (typeFilter !== 'ALL') filters.invoiceType = typeFilter;

            const res = (filterYear === 'CUSTOM' && (startDate || endDate))
                ? await getInvoicesDateWise(filters)
                : await getInvoicesRegistry(filters);
            console.log('[InvoiceList] API Response:', res);
            if (res) {
                const data = res.data || res;
                const dataArray = Array.isArray(data) ? data : [];
                setInvoices(dataArray);

                const pag = res.pagination || {};
                setPagination({
                    total: pag.totalItems || dataArray.length,
                    pages: pag.totalPages || 1
                });

                if (res.metrics) {
                    setMetrics(res.metrics);
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load');
            toast.error('Error syncing invoices');
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, page, limit, sortBy, sortOrder, startDate, endDate, statusFilter, typeFilter, filterMonth, filterYear]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRowClick = (id: string) => {
        navigate(`./${id}`);
    };

    const handleDeleteAll = async () => {
        if (window.confirm('Are you sure you want to delete ALL invoices? This action cannot be undone.')) {
            try {
                await deleteAllInvoices();
                toast.success('All invoices deleted successfully');
                fetchData();
            } catch (err: any) {
                toast.error(err.response?.data?.message || 'Failed to delete invoices');
            }
        }
    };

    const handleDownloadPdf = async () => {
        setDownloadingPdf(true);
        const toastId = toast.loading('Generating Invoice Registry PDF report...');
        try {
            const filters: any = {
                search: debouncedSearch.trim() || undefined,
                status: statusFilter !== 'ALL' ? statusFilter : undefined,
            };
            if (filterYear === 'CUSTOM') {
                filters.startDate = startDate || undefined;
                filters.endDate = endDate || undefined;
            } else {
                filters.month = filterMonth || undefined;
                filters.year = filterYear || undefined;
            }
            if (!startDate && !endDate && !filterMonth && !filterYear) {
                filters.allTime = 'true';
            }
            const data = await downloadInvoiceRegistryPdf(filters);
            const blob = new Blob([data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `Invoice_Registry_Report_${dateStr}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success('Invoice Registry PDF downloaded!', { id: toastId });
        } catch (err: any) {
            console.error('Failed to download PDF:', err);
            toast.error(err?.response?.data?.message || err.message || 'Failed to generate PDF', { id: toastId });
        } finally {
            setDownloadingPdf(false);
        }
    };

    const handleDownloadExcel = async () => {
        setDownloadingExcel(true);
        const toastId = toast.loading('Generating Invoice Registry Excel report...');
        try {
            const filters: any = { limit: 2000, ignoreDefaultDates: 'true' };
            if (debouncedSearch.trim()) filters.search = debouncedSearch.trim();
            if (filterYear === 'CUSTOM') {
                if (startDate) filters.startDate = startDate;
                if (endDate) filters.endDate = endDate;
            } else {
                if (filterYear) filters.year = filterYear;
                if (filterMonth) filters.month = filterMonth;
            }
            if (!startDate && !endDate && !filterMonth && !filterYear) {
                filters.allTime = 'true';
            }
            if (statusFilter !== 'ALL') filters.status = statusFilter;

            const res = (filterYear === 'CUSTOM' && (startDate || endDate))
                ? await getInvoicesDateWise(filters)
                : await getInvoicesRegistry(filters);

            const exportInvoices = res?.data || invoices;

            const excelRows = exportInvoices.map((inv: any) => {
                const dateVal = inv.generatedAt || inv.entryDate || inv.date;
                const formattedDate = dateVal ? new Date(dateVal).toLocaleDateString() : 'N/A';

                let customerName = 'N/A';
                if (inv.customer) {
                    customerName = typeof inv.customer === 'object' ? (inv.customer.name || inv.customer.customerId) : inv.customer;
                } else if (inv.customerName) {
                    customerName = inv.customerName;
                }

                let vehicleStr = '-';
                if (inv.vehicle) {
                    vehicleStr = typeof inv.vehicle === 'object' ? (inv.vehicle.plateNumber || inv.vehicle.make || 'Vehicle') : inv.vehicle;
                } else if (inv.notes) {
                    vehicleStr = inv.notes;
                }

                const totalBilled = Number(inv.totalAmountDue || inv.totalAmount || inv.amount || 0);
                const taxAmount = Number(inv.taxAmount || 0);
                const amountPaid = Number(inv.amountPaid || 0);
                const balance = inv.balance !== undefined ? Number(inv.balance) : (totalBilled - amountPaid);

                return {
                    'Date': formattedDate,
                    'Invoice #': inv.invoiceNumber || inv.invoice || 'N/A',
                    'Customer': customerName,
                    'Vehicle / Info': vehicleStr,
                    'Status': (inv.status || 'PENDING').toUpperCase(),
                    'Total Billed ($)': totalBilled,
                    'Tax Amount ($)': taxAmount,
                    'Amount Paid ($)': amountPaid,
                    'Balance ($)': balance
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(excelRows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoice Registry');

            const dateStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(workbook, `Invoice_Registry_Report_${dateStr}.xlsx`);
            toast.success('Invoice Registry Excel downloaded!', { id: toastId });
        } catch (err: any) {
            console.error('Failed to download Excel:', err);
            toast.error(err?.message || 'Failed to generate Excel file', { id: toastId });
        } finally {
            setDownloadingExcel(false);
        }
    };



    return (
        <div className="container-responsive relative space-y-6 pb-12">
            <Breadcrumbs
                items={[
                    { label: 'Sales', path: '#' },
                    { label: 'Invoices', active: true }
                ]}
            />

            {/* Simple Loading Circle Overlay */}
            {loading && (
                <div className="absolute inset-0 bg-black/10 z-50 flex items-center justify-center rounded-3xl pointer-events-none">
                    <div className="bg-neutral-950/95 border border-white/5 rounded-full p-4 flex items-center justify-center shadow-2xl pointer-events-auto animate-in fade-in duration-200">
                        <RefreshCw className="animate-spin text-[#D4F12E]" size={28} />
                    </div>
                </div>
            )}

            {/* Small Dashboard Cards */}
            {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
                    {/* Card 1: Gross Billed */}
                    <div className="border shadow-md rounded-3xl p-6 flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <FileText size={16} className="opacity-60 text-main animate-pulse" style={{ color: 'var(--brand-lime)' }} />
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                                {metrics.isFilteredPeriod ? 'Gross Billed (Filtered Period)' : 'Gross Billed (Last 30 Days)'}
                            </span>
                        </div>
                        <h2 className="text-2xl font-black mt-2" style={{ color: 'var(--text-main)' }}>
                            ${metrics.totalGrossBilled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                        <p className="text-[10px] mt-2" style={{ color: 'var(--text-dim)' }}>
                            {metrics.isFilteredPeriod ? 'Filtered custom gross billed total' : 'Total amount of rental and workshop statements generated'}
                        </p>
                    </div>

                    {/* Card 2: Net Settled */}
                    <div className="border shadow-md rounded-3xl p-6 flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 size={16} className="opacity-60" style={{ color: '#10b981' }} />
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                                {metrics.isFilteredPeriod ? 'Net Settled (Filtered Period)' : 'Net Settled (Last 30 Days)'}
                            </span>
                        </div>
                        <h2 className="text-2xl font-black mt-2" style={{ color: '#10b981' }}>
                            ${metrics.totalNetSettled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                        <p className="text-[10px] mt-2" style={{ color: 'var(--text-dim)' }}>
                            {metrics.isFilteredPeriod ? 'Filtered custom total settled payments' : 'Total amount of recorded driver payments settled'}
                        </p>
                    </div>

                    {/* Card 3: Current Balance */}
                    <div className="border shadow-md rounded-3xl p-6 flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Clock size={16} className="opacity-60" style={{ color: '#f59e0b' }} />
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                                {metrics.isFilteredPeriod ? 'Current Balance (Filtered Period)' : 'Current Balance (Last 30 Days)'}
                            </span>
                        </div>
                        <h2 className="text-2xl font-black mt-2 text-orange-400" style={{ color: '#f59e0b' }}>
                            ${metrics.totalCurrentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                        <p className="text-[10px] mt-2" style={{ color: 'var(--text-dim)' }}>
                            {metrics.isFilteredPeriod ? 'Outstanding operator balance in period' : 'Outstanding operator balance from last 30 days'}
                        </p>
                    </div>
                </div>
            )}

            <div className="space-y-6 animate-in fade-in duration-500">

                {/* Uniform Compact Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0 border-b border-white/5 pb-4">
                    <div>
                        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                            <FileText size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                            Invoice Registry
                        </h1>
                        <p className="text-xs font-medium text-dim mt-0.5">Manage vehicle rental leases and record operator payments.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => setShowSettingsModal(true)}
                            className="flex items-center justify-center p-2 rounded-xl transition-all duration-300 hover:bg-white/10 active:scale-95"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            title="Automation Settings"
                        >
                            <Settings size={14} />
                        </button>

                        {userRole !== 'admin' && (
                            <button
                                onClick={handleDeleteAll}
                                className="flex items-center gap-1.5 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all duration-300 border border-rose-500/20 cursor-pointer"
                            >
                                <Trash2 size={13} strokeWidth={2.5} /> Delete All
                            </button>
                        )}

                        <button
                            onClick={handleDownloadPdf}
                            disabled={downloadingPdf}
                            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer disabled:opacity-50"
                            title="Download Invoice Registry PDF Report"
                        >
                            <FileText size={14} strokeWidth={3} />
                            {downloadingPdf ? 'PDF...' : 'Download PDF'}
                        </button>

                        <button
                            onClick={handleDownloadExcel}
                            disabled={downloadingExcel}
                            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-500/30 dark:bg-yellow-500/10 dark:hover:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30 transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer disabled:opacity-50"
                            title="Download Invoice Registry Excel Spreadsheet"
                        >
                            <FileSpreadsheet size={14} strokeWidth={3} />
                            {downloadingExcel ? 'Excel...' : 'Download Excel'}
                        </button>

                        <button
                            onClick={() => navigate('./aging-summary')}
                            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/30 transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                            title="View Accounts Receivable (AR) Aging Summary Report"
                        >
                            <Clock size={14} strokeWidth={2.5} className="text-amber-500" />
                            Aging Summary
                        </button>

                        <button
                            onClick={() => navigate(`${getRoutePrefix()}/sales/debit-notes`)}
                            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 border border-blue-500/30 transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                            title="Manage Debit Notes Ledger"
                        >
                            <FileText size={14} strokeWidth={2.5} className="text-blue-500" />
                            Debit Notes
                        </button>

                        <button
                            onClick={() => setShowBulkUpload(true)}
                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95"
                            style={{ background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--border-main)' }}
                        >
                            <Download size={14} strokeWidth={3} />
                            Bulk Upload
                        </button>


                        <button
                            onClick={() => navigate('./create')}
                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95"
                            style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}
                        >
                            <Plus size={14} strokeWidth={3} />
                            New Invoice
                        </button>

                    </div>
                </div>

                {/* Unified Search and Filters (Uniform Capsule Design) */}
                <div className="flex flex-col md:flex-row gap-3 flex-shrink-0 select-none">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={16} style={{ color: 'var(--text-dim)' }} />
                        <input
                            type="text"
                            placeholder="Search by Invoice No., Operator full name, or custom identifiers..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-2xl text-xs font-semibold border outline-none transition-all"
                            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                        <button 
                            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                            className={`px-6 py-3 rounded-2xl border flex items-center gap-2 font-bold transition-all hover:bg-white/5 bg-transparent cursor-pointer ${isFilterPanelOpen ? 'bg-white/5 border-brand-lime' : ''}`}
                            style={{ borderColor: isFilterPanelOpen ? 'var(--brand-lime)' : 'var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <Filter size={18} /> Filters
                        </button>
                    </div>
                </div>

                {/* Collapsible Filter Panel */}
                {isFilterPanelOpen && (
                    <div className="border rounded-[2rem] p-6 space-y-4 transition-all duration-300 animate-in fade-in slide-in-from-top-4 duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex flex-wrap justify-between items-center border-b border-white/5 pb-3 gap-2">
                            <div className="flex items-center gap-2">
                                <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Filter Invoices</h3>
                            </div>
                            <button 
                                type="button"
                                onClick={() => {
                                    setFilterMonth('');
                                    setFilterYear('2026');
                                    setStartDate('');
                                    setEndDate('');
                                    setStatusFilter('ALL');
                                    setTypeFilter('ALL');
                                }}
                                className="text-[10px] font-black uppercase tracking-widest text-brand-lime hover:opacity-80 transition-all bg-transparent border-none cursor-pointer"
                                style={{ color: 'var(--brand-lime)' }}
                            >
                                Clear All Filters
                            </button>
                        </div>

                        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${filterYear === 'CUSTOM' ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-4`}>
                            {/* Year Selector */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Year</label>
                                <select
                                    value={filterYear}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFilterYear(val);
                                        if (val !== 'CUSTOM') {
                                            setStartDate('');
                                            setEndDate('');
                                        } else {
                                            if (!startDate) setStartDate(getDefaultStartDate());
                                            if (!endDate) setEndDate(getDefaultEndDate());
                                        }
                                    }}
                                    className="w-full px-3 py-2.5 rounded-xl border outline-none text-xs font-medium"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="">All Years</option>
                                    <option value="2024">2024</option>
                                    <option value="2025">2025</option>
                                    <option value="2026">2026</option>
                                    <option value="2027">2027</option>
                                    <option value="CUSTOM">Custom Range</option>
                                </select>
                            </div>

                            {/* Month Selector - Shown when not CUSTOM */}
                            {filterYear !== 'CUSTOM' && (
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Month</label>
                                    <select
                                        value={filterMonth}
                                        onChange={(e) => setFilterMonth(e.target.value)}
                                        className="w-full px-3 py-2.5 rounded-xl border outline-none text-xs font-medium"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <option value="">All Months</option>
                                        <option value="1">January</option>
                                        <option value="2">February</option>
                                        <option value="3">March</option>
                                        <option value="4">April</option>
                                        <option value="5">May</option>
                                        <option value="6">June</option>
                                        <option value="7">July</option>
                                        <option value="8">August</option>
                                        <option value="9">September</option>
                                        <option value="10">October</option>
                                        <option value="11">November</option>
                                        <option value="12">December</option>
                                    </select>
                                </div>
                            )}

                            {/* Date-wise selection fields (From Date & To Date) - ONLY SHOWN WHEN filterYear === 'CUSTOM' */}
                            {filterYear === 'CUSTOM' && (
                                <>
                                    {/* From Date */}
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>From Date</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full px-3 py-2.5 rounded-xl border outline-none text-xs font-medium"
                                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        />
                                    </div>

                                    {/* To Date */}
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>To Date</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full px-3 py-2.5 rounded-xl border outline-none text-xs font-medium"
                                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                </>
                            )}

                            {/* Status Filter */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Status</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl border outline-none text-xs"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="ALL">ALL STATUSES</option>
                                    <option value="PENDING">PENDING</option>
                                    <option value="PARTIAL">PARTIAL</option>
                                    <option value="PAID">PAID</option>
                                    <option value="OVERDUE">OVERDUE</option>
                                </select>
                            </div>

                            {/* Type Filter */}
                            <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Type</label>
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl border outline-none text-xs"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="ALL">ALL TYPES</option>
                                    <option value="RENTAL">RENTAL</option>
                                    <option value="WORKSHOP">WORKSHOP</option>
                                    <option value="MANUAL">MANUAL</option>
                                    <option value="DEPOSIT">DEPOSIT</option>
                                </select>
                            </div>

                            {/* Filter Action Button */}
                            <div className="space-y-1.5 flex items-end">
                                <button
                                    onClick={handleApplyFilters}
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#D4F12E] hover:bg-lime-400 text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-lg shadow-brand-lime/10"
                                >
                                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                                    <span>Filter</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Unified Grid Canvas */}
                <div className="border shadow-lg rounded-[2rem] overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse text-left text-xs select-text">
                            <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                                <tr className="border-b" style={{ borderColor: 'var(--border-main)' }}>
                                    <th className="py-4 px-3 text-left w-10">Sl No.</th>
                                    <th className="py-4 px-6 text-left w-[12%] group cursor-pointer select-none" onClick={() => handleSort('invoiceNumber')}>
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Invoice Number <SortIcon field="invoiceNumber" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left w-[15%]">
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Description / Type
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left w-[20%] group cursor-pointer select-none" onClick={() => handleSort('customer')}>
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Customer Details <SortIcon field="customer" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-center w-[10%] group cursor-pointer select-none" onClick={() => handleSort('status')}>
                                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Status <SortIcon field="status" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-right w-[10%] group cursor-pointer select-none" onClick={() => handleSort('totalAmountDue')}>
                                        <div className="flex items-center justify-end gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Gross Billed <SortIcon field="totalAmountDue" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-right w-[10%] group cursor-pointer select-none" onClick={() => handleSort('amountPaid')}>
                                        <div className="flex items-center justify-end gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Net Settled <SortIcon field="amountPaid" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-right w-[10%] group cursor-pointer select-none" onClick={() => handleSort('balance')}>
                                        <div className="flex items-center justify-end gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Current Balance <SortIcon field="balance" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left w-[12%] group cursor-pointer select-none" onClick={() => handleSort('generatedAt')}>
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            <Calendar size={12} /> Invoice Date <SortIcon field="generatedAt" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left w-[12%] group cursor-pointer select-none" onClick={() => handleSort('dueDate')}>
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            <Calendar size={12} /> Due Date <SortIcon field="dueDate" />
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-medium" style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}>
                                {loading ? (
                                    <tr>
                                        <td colSpan={10} className="py-20 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <RefreshCw className="animate-spin text-brand-lime" size={28} />
                                                <span className="text-xs font-black tracking-widest text-dim uppercase">Decrypting Ledger...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={10} className="py-20 text-center">
                                            <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-6 inline-block">
                                                <AlertCircle className="text-rose-500 mx-auto mb-2" size={28} />
                                                <p className="text-xs font-black uppercase" style={{ color: 'var(--text-main)' }}>{error}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="py-20 text-center">
                                            <div className="text-dim space-y-1 uppercase">
                                                <FileText className="mx-auto opacity-20 mb-2" size={32} />
                                                <p className="text-xs font-black tracking-widest">No statements recorded</p>
                                                <p className="text-[10px] tracking-wider font-bold lowercase opacity-60">Try adjusting search queries or dynamic filters</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    invoices.map((invoice, index) => (
                                        <tr
                                            key={invoice._id}
                                            onClick={() => handleRowClick(invoice._id)}
                                            className="transition-colors cursor-pointer group"
                                            style={{ borderBottom: '1px solid var(--border-main)' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <td className="py-4 px-3 font-semibold text-gray-500">{(index + 1 + (page - 1) * limit).toString().padStart(2, '0')}</td>
                                            <td className="py-4 px-6 font-black">
                                                <div className="flex flex-col">
                                                    <span className="tracking-wide font-black text-brand-lime" style={{ color: 'var(--brand-lime)' }}>{invoice.invoiceNumber}</span>
                                                    <span className="text-[9px] font-black text-dim uppercase tracking-wider mt-0.5 opacity-60">ID: {invoice._id?.slice(-8)}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold truncate max-w-[150px]" style={{ color: 'var(--text-main)' }}>
                                                        {(invoice as any).description || invoice.notes || (invoice.invoiceType === 'RENTAL' ? `Rent ${invoice.weekLabel || ''}` : 'Manual Entry')}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest ${invoice.invoiceType === 'RENTAL' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}`}>
                                                            {invoice.invoiceType || 'RENTAL'}
                                                        </span>
                                                        {invoice.invoiceType === 'RENTAL' && (
                                                            <span className="text-[9px] font-black text-dim uppercase tracking-wider">{invoice.weekLabel || 'Cycle'}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center flex-shrink-0 shadow-inner">
                                                        <span className="text-brand-lime text-[10px] font-black">
                                                            {((invoice.customer as any)?.name || invoice.driver?.personalInfo?.fullName || 'CU').slice(0, 2).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black leading-snug tracking-tight" style={{ color: 'var(--text-main)' }}>
                                                            {(invoice.customer as any)?.name || invoice.driver?.personalInfo?.fullName || 'System Pool'}
                                                        </span>
                                                        <span className="text-[9px] font-mono font-semibold text-dim uppercase tracking-widest mt-0.5">
                                                            {(invoice.customer as any)?.customerId || invoice.driver?.driverId || 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <StatusBadge status={invoice.status} />
                                            </td>
                                            <td className="py-4 px-6 text-right font-black text-sm">
                                                ${invoice.totalAmountDue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-4 px-6 text-right font-bold text-emerald-400">
                                                ${invoice.amountPaid?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-4 px-6 text-right font-black text-sm">
                                                <span className={invoice.balance > 0 ? (invoice.status === 'OVERDUE' ? 'text-rose-500' : 'text-amber-400') : 'text-emerald-400'}>
                                                    ${invoice.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 font-bold text-dim">
                                                {invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : (invoice.generatedAt ? new Date(invoice.generatedAt).toLocaleDateString() : (invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : 'N/A'))}
                                            </td>
                                            <td className="py-4 px-6 font-bold text-dim">
                                                {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Modern Numbered Pagination */}
                    {!loading && invoices.length > 0 && pagination && pagination.pages >= 1 && (
                        <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                            <div className="flex items-center gap-3">
                                <p className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>
                                    Showing {invoices.length} of <span className="text-brand-lime font-black">{pagination.total.toLocaleString()}</span> total statements
                                    {(startDate || endDate) && (
                                        <span className="text-dim font-normal ml-1">
                                            ({startDate ? `From ${startDate}` : ''} {endDate ? `To ${endDate}` : ''})
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={page === 1 || loading}
                                    className="p-2 rounded-lg border transition-all hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <div className="flex items-center gap-1">
                                    {getPageNumbers().map((item, index) => {
                                        if (typeof item === 'string') {
                                            return (
                                                <span key={`ellipsis-${index}`} className="px-1 text-xs font-bold" style={{ color: 'var(--text-dim)' }}>
                                                    ...
                                                </span>
                                            );
                                        }
                                        return (
                                            <button
                                                key={item}
                                                onClick={() => handlePageChange(item)}
                                                className={`w-9 h-9 rounded-lg text-xs font-black transition-all cursor-pointer ${page === item ? 'shadow-lg scale-110 z-10' : 'hover:bg-black/5 opacity-70 hover:opacity-100'}`}
                                                style={{
                                                    background: page === item ? 'var(--brand-lime)' : 'transparent',
                                                    color: page === item ? '#000' : 'var(--text-main)',
                                                    border: page === item ? 'none' : '1px solid var(--border-main)'
                                                }}
                                            >
                                                {item}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => handlePageChange(page + 1)}
                                    disabled={page === pagination.pages || loading}
                                    className="p-2 rounded-lg border transition-all hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>



            {showSettingsModal && (
                <InvoiceSettingsModal
                    onClose={() => setShowSettingsModal(false)}
                />
            )}

            <BulkInvoiceUpload
                isOpen={showBulkUpload}
                onClose={() => setShowBulkUpload(false)}
                onSuccess={() => {
                    setShowBulkUpload(false);
                    fetchData();
                }}
            />
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'DRAFT': return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-blue-500/10 text-blue-400 border-blue-500/20 select-none">Draft</span>;
        case 'PAID': return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-emerald-500/10 text-emerald-400 border-emerald-500/20 select-none"><CheckCircle2 size={10} strokeWidth={3} /> Paid</span>;
        case 'PARTIAL': return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-yellow-500/10 text-yellow-500 border-yellow-500/20 select-none"><Clock size={10} strokeWidth={3} /> Partial</span>;
        case 'OVERDUE': return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-rose-500/10 text-rose-500 border-rose-500/20 select-none"><AlertCircle size={10} strokeWidth={3} /> Overdue</span>;
        default: return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-white/5 text-[#A3A3A3] border-white/10 select-none">Pending</span>;
    }
};

export default InvoiceList;
