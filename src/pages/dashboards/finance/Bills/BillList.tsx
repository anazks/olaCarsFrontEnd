import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Receipt,
    Search,
    Filter,
    ChevronLeft,
    ChevronRight,
    Clock,
    CheckCircle,
    AlertCircle,
    Calendar,
    ArrowUpRight,
    Plus,
    Eye,
    RefreshCw,
    FileText,
    Upload
} from 'lucide-react';
import * as billService from '../../../../services/billService';
import Breadcrumbs from '../../../../components/dashboard/shared/Breadcrumbs';
import CreateBillModal from './CreateBillModal';
import BulkBillUpload from '../../shared/BulkBillUpload';
import DateRangeReportModal from '../../shared/DateRangeReportModal';
import { downloadExcelReport } from '../../../../services/reportingService';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

const BillList = () => {
    const navigate = useNavigate();

    // Local state for bills table
    const [bills, setBills] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    const handleDownloadReport = async (start: string, end: string) => {
        await downloadExcelReport('purchase-bills', {
            startDate: start,
            endDate: end
        });
    };

    const fetchAllFilteredBills = async () => {
        return await billService.getAllBills({
            search: debouncedSearch,
            status: filterStatus !== 'ALL' ? filterStatus : undefined,
            month: filterMonth,
            year: filterYear,
            fromDate: filterFromDate,
            toDate: filterToDate
        });
    };

    const handleExportExcel = async () => {
        const toastId = toast.loading("Fetching all filtered bills for Excel export...");
        try {
            const res = await fetchAllFilteredBills();
            const allBills = res.data || [];
            if (allBills.length === 0) {
                toast.error("No bills available to export for the selected filters.", { id: toastId });
                return;
            }

            const getSupplierName = (supplier: any) => (typeof supplier === 'object' && supplier ? supplier.name : supplier) || 'N/A';

            const exportData = allBills.map((bill, idx) => ({
                "Sl No.": String(idx + 1).padStart(2, '0'),
                "Bill Number": bill.billNumber || 'N/A',
                "Status": bill.status || 'N/A',
                "Vendor": getSupplierName(bill.supplier),
                "Bill Date": bill.billDate ? new Date(bill.billDate).toLocaleDateString() : 'N/A',
                "Due Date": bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : 'N/A',
                "Total Amount ($)": bill.totalAmount || 0,
                "Amount Paid ($)": bill.amountPaid || 0,
                "Balance Due ($)": bill.balanceDue || 0
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Bills");
            
            const keys = Object.keys(exportData[0]);
            ws["!cols"] = keys.map(key => {
                const maxLen = Math.max(
                    key.length,
                    ...exportData.map(row => String((row as any)[key] || "").length)
                );
                return { wch: maxLen + 2 };
            });

            const dateStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `bills_export_all_${dateStr}.xlsx`);
            toast.success(`Exported all ${allBills.length} bills successfully!`, { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export Excel file.", { id: toastId });
        }
    };

    const handleExportCsv = async () => {
        const toastId = toast.loading("Fetching all filtered bills for CSV export...");
        try {
            const res = await fetchAllFilteredBills();
            const allBills = res.data || [];
            if (allBills.length === 0) {
                toast.error("No bills available to export for the selected filters.", { id: toastId });
                return;
            }

            const getSupplierName = (supplier: any) => (typeof supplier === 'object' && supplier ? supplier.name : supplier) || 'N/A';

            const exportData = allBills.map((bill, idx) => ({
                "Sl No.": String(idx + 1).padStart(2, '0'),
                "Bill Number": bill.billNumber || 'N/A',
                "Status": bill.status || 'N/A',
                "Vendor": getSupplierName(bill.supplier),
                "Bill Date": bill.billDate ? new Date(bill.billDate).toLocaleDateString() : 'N/A',
                "Due Date": bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : 'N/A',
                "Total Amount ($)": bill.totalAmount || 0,
                "Amount Paid ($)": bill.amountPaid || 0,
                "Balance Due ($)": bill.balanceDue || 0
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const csvContent = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement("a");
            link.setAttribute("href", url);
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute("download", `bills_export_all_${dateStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success(`Exported all ${allBills.length} bills successfully!`, { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export CSV file.", { id: toastId });
        }
    };

    const handleExportPdf = async () => {
        const toastId = toast.loading("Generating PDF with all bills & KPI summary...");
        try {
            const res = await fetchAllFilteredBills();
            const allBills = res.data || [];
            if (allBills.length === 0) {
                toast.error("No bills available to export for the selected filters.", { id: toastId });
                return;
            }

            const kpiMetrics: any = res.metrics || metrics;
            const grossBilled = kpiMetrics.totalGrossBilled ?? kpiMetrics.totalBilled ?? 0;
            const netSettled = kpiMetrics.totalNetSettled ?? 0;
            const currentBalance = kpiMetrics.totalCurrentBalance ?? kpiMetrics.totalBalanceDue ?? 0;

            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const dateStr = new Date().toISOString().split('T')[0];
            
            // Header Title
            doc.setFontSize(18);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 41, 59);
            doc.text("PURCHASE BILLS REGISTRY", 14, 16);
            
            // Subtitle & period info
            doc.setFontSize(8.5);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 116, 139);
            const periodText = (filterFromDate || filterToDate) 
                ? `Filter Period: ${filterFromDate || 'Start'} to ${filterToDate || 'Current'}`
                : 'Filter Period: All Time';
            const statusText = filterStatus !== 'ALL' ? `  |  Status: ${filterStatus}` : '';
            doc.text(`${periodText}${statusText}  |  Generated on: ${new Date().toLocaleString()}  |  Total Bills: ${allBills.length}`, 14, 23);

            // KPI Summary Table
            autoTable(doc, {
                startY: 27,
                head: [["TOTAL BILLS", "GROSS BILLED (FILTERED)", "NET SETTLED (FILTERED)", "CURRENT BALANCE DUE"]],
                body: [[
                    String(allBills.length),
                    `$${grossBilled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    `$${netSettled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    `$${currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                ]],
                theme: 'grid',
                headStyles: { 
                    fillColor: [30, 41, 59], 
                    textColor: [255, 255, 255], 
                    fontSize: 8, 
                    fontStyle: 'bold',
                    halign: 'center'
                },
                bodyStyles: { 
                    fontSize: 10, 
                    fontStyle: 'bold', 
                    textColor: [15, 23, 42],
                    halign: 'center',
                    cellPadding: 3
                },
                columnStyles: {
                    0: { halign: 'center' },
                    1: { textColor: [16, 185, 129] }, // Green
                    2: { textColor: [37, 99, 235] },  // Blue
                    3: { textColor: [234, 88, 12] }   // Amber / Orange
                },
                margin: { left: 14, right: 14 }
            });

            const summaryEndPos = (doc as any).lastAutoTable?.finalY || 45;

            // Details Table
            const head = [["#", "Bill Number", "Status", "Vendor", "Bill Date", "Due Date", "Total Amount", "Amount Paid", "Balance Due"]];
            const body = allBills.map((bill, idx) => [
                String(idx + 1),
                bill.billNumber || 'N/A',
                bill.status || 'N/A',
                (typeof bill.supplier === 'object' && bill.supplier ? bill.supplier.name : bill.supplier) || 'N/A',
                bill.billDate ? new Date(bill.billDate).toLocaleDateString() : 'N/A',
                bill.dueDate ? new Date(bill.dueDate).toLocaleDateString() : 'N/A',
                `$${(bill.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                `$${(bill.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                `$${(bill.balanceDue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            ]);

            autoTable(doc, {
                head,
                body,
                startY: summaryEndPos + 6,
                theme: 'striped',
                headStyles: { 
                    fillColor: [200, 230, 0], 
                    textColor: [0, 0, 0],
                    fontStyle: 'bold',
                    fontSize: 8
                },
                bodyStyles: {
                    fontSize: 8,
                    textColor: [30, 41, 59]
                },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },
                    1: { fontStyle: 'bold' },
                    6: { halign: 'right' },
                    7: { halign: 'right' },
                    8: { halign: 'right', fontStyle: 'bold' }
                },
                margin: { left: 14, right: 14 }
            });

            doc.save(`bills_report_all_${dateStr}.pdf`);
            toast.success(`Exported all ${allBills.length} bills PDF with KPI summary!`, { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export PDF file.", { id: toastId });
        }
    };

    const getDefaultStartDate = () => {
        const y = new Date().getFullYear();
        return `${y}-01-01`;
    };

    const getDefaultEndDate = () => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    // Filters states
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [filterMonth, setFilterMonth] = useState<string>('');
    const [filterYear, setFilterYear] = useState<string>('');
    const [filterFromDate, setFilterFromDate] = useState<string>(getDefaultStartDate());
    const [filterToDate, setFilterToDate] = useState<string>(getDefaultEndDate());

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [totalRecords, setTotalRecords] = useState(0);

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

    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 350);
        return () => clearTimeout(timer);
    }, [search]);

    // Reset pagination to page 1 if search or other filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, filterStatus, filterMonth, filterYear, filterFromDate, filterToDate]);

    useEffect(() => {
        fetchBills();
    }, [currentPage, pageSize, debouncedSearch, filterStatus, filterMonth, filterYear, filterFromDate, filterToDate]);

    const fetchBills = async () => {
        setRefreshing(true);
        try {
            const res = await billService.getAllBills({
                page: currentPage,
                limit: pageSize,
                search: debouncedSearch,
                status: filterStatus !== 'ALL' ? filterStatus : undefined,
                month: filterMonth,
                year: filterYear,
                fromDate: filterFromDate,
                toDate: filterToDate
            });
            setBills(res.data || []);
            if (res.pagination) {
                setTotalRecords(res.pagination.totalItems);
            } else {
                setTotalRecords(res.data?.length || 0);
            }

            if (res.metrics) {
                setMetrics({
                    totalGrossBilled: res.metrics.totalGrossBilled ?? res.metrics.totalBilled ?? 0,
                    totalNetSettled: res.metrics.totalNetSettled ?? 0,
                    totalCurrentBalance: res.metrics.totalCurrentBalance ?? res.metrics.totalBalanceDue ?? 0,
                    isFilteredPeriod: !!res.metrics.isFilteredPeriod
                });
            }

        } catch (err: any) {
            console.error('Failed to fetch bills:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const statusColors: any = {
        OPEN: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', icon: <Clock size={12} /> },
        PARTIALLY_PAID: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6', icon: <ArrowUpRight size={12} /> },
        PAID: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', icon: <CheckCircle size={12} /> },
        VOID: { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b', icon: <AlertCircle size={12} /> }
    };

    // Reset page to 1 when search changes
    const handleSearchChange = (value: string) => {
        setSearch(value);
    };

    const totalPages = Math.ceil(totalRecords / pageSize) || 1;

    const startIndex = (currentPage - 1) * pageSize;
    const paginatedBills = bills;

    const handlePageChange = (pageNum: number) => {
        if (pageNum >= 1 && pageNum <= totalPages) {
            setCurrentPage(pageNum);
        }
    };

    const getPageNumbers = () => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const pages: (number | string)[] = [];
        pages.push(1);

        let start = Math.max(2, currentPage - 1);
        let end = Math.min(totalPages - 1, currentPage + 1);

        if (currentPage <= 3) { end = 4; }
        if (currentPage >= totalPages - 2) { start = totalPages - 3; }

        if (start > 2) { pages.push('...'); }
        for (let i = start; i <= end; i++) { pages.push(i); }
        if (end < totalPages - 1) { pages.push('...'); }
        pages.push(totalPages);
        return pages;
    };

    return (
        <div className="space-y-6">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '/admin/financial-admin' }, { label: 'Bills', active: true }]} />

            {/* Small Dashboard KPI Cards */}
            {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
                    {/* Card 1: Gross Billed */}
                    <div className="border shadow-md rounded-3xl p-6 flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <FileText size={16} className="opacity-60 text-main animate-pulse" style={{ color: 'var(--brand-lime)' }} />
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                                {metrics.isFilteredPeriod ? 'Gross Billed (Filtered Period)' : 'Gross Billed (All Time)'}
                            </span>
                        </div>
                        <h2 className="text-2xl font-black mt-2" style={{ color: 'var(--text-main)' }}>
                            ${metrics.totalGrossBilled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                        <p className="text-[10px] mt-2" style={{ color: 'var(--text-dim)' }}>
                            {metrics.isFilteredPeriod ? 'Filtered custom gross purchase bills total' : 'Total gross amount of purchase bills generated'}
                        </p>
                    </div>

                    {/* Card 2: Net Settled */}
                    <div className="border shadow-md rounded-3xl p-6 flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle size={16} className="opacity-60" style={{ color: '#10b981' }} />
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                                {metrics.isFilteredPeriod ? 'Net Settled (Filtered Period)' : 'Net Settled (All Time)'}
                            </span>
                        </div>
                        <h2 className="text-2xl font-black mt-2" style={{ color: '#10b981' }}>
                            ${metrics.totalNetSettled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                        <p className="text-[10px] mt-2" style={{ color: 'var(--text-dim)' }}>
                            {metrics.isFilteredPeriod ? 'Filtered custom total supplier disbursements settled' : 'Total amount paid towards vendor bills'}
                        </p>
                    </div>

                    {/* Card 3: Current Balance */}
                    <div className="border shadow-md rounded-3xl p-6 flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <Clock size={16} className="opacity-60" style={{ color: '#f59e0b' }} />
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                                {metrics.isFilteredPeriod ? 'Current Balance (Filtered Period)' : 'Current Balance (All Time)'}
                            </span>
                        </div>
                        <h2 className="text-2xl font-black mt-2 text-orange-400" style={{ color: '#f59e0b' }}>
                            ${metrics.totalCurrentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                        <p className="text-[10px] mt-2" style={{ color: 'var(--text-dim)' }}>
                            {metrics.isFilteredPeriod ? 'Outstanding vendor liability in period' : 'Total outstanding accounts payable balance'}
                        </p>
                    </div>
                </div>
            )}

            {/* Collapsible Filter Panel */}
            {isFilterPanelOpen && (
                <div className="border rounded-[2rem] p-6 space-y-4 transition-all duration-300 animate-in fade-in slide-in-from-top-4 duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex justify-between items-center border-b border-white/5 pb-3">
                        <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Filter Bills</h3>
                        <button
                            type="button"
                            onClick={() => {
                                setFilterStatus('ALL');
                                setFilterMonth('');
                                setFilterYear('');
                                setFilterFromDate(getDefaultStartDate());
                                setFilterToDate(getDefaultEndDate());
                            }}
                            className="text-[10px] font-black uppercase tracking-widest text-brand-lime hover:opacity-80 transition-all bg-transparent border-none cursor-pointer"
                            style={{ color: '#C8E600' }}
                        >
                            Reset Filters
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                        {/* Status Selector */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Status</label>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border outline-none text-xs font-bold"
                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="PAID">Paid</option>
                                <option value="OPEN">Open / Unpaid</option>
                                <option value="PARTIALLY_PAID">Partially Paid</option>
                                <option value="DRAFT">Draft</option>
                                <option value="VOID">Void</option>
                            </select>
                        </div>

                        {/* Month Selector */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Month</label>
                            <select
                                value={filterMonth}
                                onChange={(e) => setFilterMonth(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border outline-none text-xs"
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

                        {/* Year Selector */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Year</label>
                            <select
                                value={filterYear}
                                onChange={(e) => setFilterYear(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border outline-none text-xs"
                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="">All Years</option>
                                <option value="2025">2025</option>
                                <option value="2026">2026</option>
                                <option value="2027">2027</option>
                            </select>
                        </div>

                        {/* From Date */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>From Date</label>
                            <input
                                type="date"
                                value={filterFromDate}
                                onChange={(e) => setFilterFromDate(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border outline-none text-xs"
                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>

                        {/* To Date */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>To Date</label>
                            <input
                                type="date"
                                value={filterToDate}
                                onChange={(e) => setFilterToDate(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border outline-none text-xs"
                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>Purchase Bills</h1>
                    <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Manage, verify, and track your vendor bills</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchBills}
                        className="flex items-center justify-center p-2.5 rounded-xl border transition-all hover:bg-white/5 active:scale-95 cursor-pointer bg-transparent"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        title="Refresh bills list"
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl text-[11px] font-bold transition-all border outline-none hover:bg-white/5 active:scale-95 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <FileText size={14} className="text-emerald-500" /> Excel
                    </button>

                    <button
                        onClick={handleExportCsv}
                        className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl text-[11px] font-bold transition-all border outline-none hover:bg-white/5 active:scale-95 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <FileText size={14} className="text-blue-400" /> CSV
                    </button>

                    <button
                        onClick={handleExportPdf}
                        className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl text-[11px] font-bold transition-all border outline-none hover:bg-white/5 active:scale-95 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <FileText size={14} className="text-rose-500" /> PDF
                    </button>

                    <button
                        onClick={() => setIsReportModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wide transition-all border border-white/10 hover:bg-white/5 active:scale-95 cursor-pointer"
                        style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}
                    >
                        Download Report
                    </button>
                    <button
                        onClick={() => setIsBulkUploadOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-[11px] font-bold transition-all border outline-none hover:bg-white/5 active:scale-95 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <Upload size={14} className="text-[#C8E600]" /> Bulk Upload
                    </button>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold transition-all hover:scale-[1.03] active:scale-95 shadow-lg cursor-pointer"
                        style={{ background: '#C8E600', color: '#111', border: 'none' }}
                    >
                        <Plus size={16} /> Create Bill
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-main" size={18} />
                    <input
                        type="text"
                        placeholder="Search by bill number, supplier, or notes..."
                        value={search}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-2xl border outline-none transition-all focus:ring-2 focus:ring-[#C8E600]/50"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={pageSize}
                        onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="px-4 py-3 rounded-2xl border font-bold outline-none cursor-pointer text-xs"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <option value={5}>5 per page</option>
                        <option value={10}>10 per page</option>
                        <option value={20}>20 per page</option>
                        <option value={50}>50 per page</option>
                    </select>
                    <button
                        onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                        className={`px-6 py-3 rounded-2xl border flex items-center gap-2 font-bold transition-all hover:bg-white/5 bg-transparent cursor-pointer ${isFilterPanelOpen ? 'bg-white/5 border-brand-lime' : ''}`}
                        style={{ borderColor: isFilterPanelOpen ? '#C8E600' : 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <Filter size={18} /> Filters
                    </button>
                </div>
            </div>

            {/* Main Table / Loader Container */}
            <div className="border shadow-lg rounded-[2rem] overflow-hidden"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <div className="w-10 h-10 border-4 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                            <p style={{ color: 'var(--text-dim)' }}>Loading bills...</p>
                        </div>
                    ) : totalRecords === 0 ? (
                        <div className="py-20 text-center">
                            <Receipt size={48} className="mx-auto mb-4 opacity-10 text-main" />
                            <p className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>No bills found</p>
                            <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>Try adjusting your search or filters</p>
                        </div>
                    ) : (
                        <table className="w-full border-collapse text-left text-xs select-text">
                            <thead>
                                <tr className="border-b" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                                    <th className="py-4 px-4 font-bold text-center w-12">SL</th>
                                    <th className="py-4 px-5 font-bold uppercase tracking-wider">Bill Number</th>
                                    <th className="py-4 px-5 font-bold uppercase tracking-wider">Supplier</th>
                                    <th className="py-4 px-5 font-bold uppercase tracking-wider">Bill Date</th>
                                    <th className="py-4 px-5 font-bold uppercase tracking-wider">Due Date</th>
                                    <th className="py-4 px-5 font-bold uppercase tracking-wider text-right">Total Amount</th>
                                    <th className="py-4 px-5 font-bold uppercase tracking-wider text-right">Balance Due</th>
                                    <th className="py-4 px-5 font-bold uppercase tracking-wider text-center">Status</th>
                                    <th className="py-4 px-5 font-bold uppercase tracking-wider text-center w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-medium" style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}>
                                {paginatedBills.map((bill, index) => {
                                    const s = statusColors[bill.status] || statusColors.OPEN;
                                    const supplierName = typeof bill.supplier === 'object' && bill.supplier
                                        ? bill.supplier.name
                                        : 'Unresolved Supplier';

                                    return (
                                        <tr
                                            key={bill._id}
                                            onClick={() => navigate(`${bill._id}`)}
                                            className="transition-colors cursor-pointer hover:bg-white/[0.02]"
                                            style={{ borderBottom: '1px solid var(--border-main)' }}
                                        >
                                            <td className="py-4 px-4 text-center text-gray-500 font-semibold">
                                                {String(startIndex + index + 1).padStart(2, '0')}
                                            </td>
                                            <td className="py-4 px-5 font-black text-sm">
                                                <div>{bill.billNumber}</div>
                                            </td>
                                            <td className="py-4 px-5">
                                                <div className="font-bold">{supplierName}</div>
                                            </td>
                                            <td className="py-4 px-5">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={12} className="opacity-40" />
                                                    {bill.billDate ? new Date(bill.billDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                                </div>
                                            </td>
                                            <td className="py-4 px-5">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={12} className="opacity-40" />
                                                    {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                                </div>
                                            </td>
                                            <td className="py-4 px-5 text-right font-black text-sm">
                                                ${(bill.totalAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-4 px-5 text-right font-black text-sm text-[#C8E600]">
                                                ${(bill.balanceDue ?? bill.balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-4 px-5 text-center">
                                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border"
                                                    style={{ background: s.bg, color: s.text, borderColor: s.text + '33' }}>
                                                    {s.icon} {(bill.status || 'OPEN').replace('_', ' ')}
                                                </div>
                                            </td>
                                            <td className="py-4 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => navigate(`${bill._id}`)}
                                                    className="p-2 bg-white/5 border border-white/10 text-dim hover:text-[#C8E600] hover:border-[#C8E600]/30 rounded-xl cursor-pointer hover:scale-[1.05] active:scale-95 transition-all duration-300 flex items-center justify-center mx-auto"
                                                    title="View Details"
                                                >
                                                    <Eye size={14} strokeWidth={2.5} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination footer */}
                {!loading && totalRecords > 0 && totalPages > 1 && (
                    <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors"
                        style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                        <p className="text-xs font-bold text-dim">
                            Showing {paginatedBills.length} of {totalRecords} bills
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1 || loading}
                                className="p-2 rounded-lg border transition-all hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-transparent"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <ChevronLeft size={18} />
                            </button>

                            <div className="flex items-center gap-1">
                                {getPageNumbers().map((p, index) => {
                                    if (p === '...') {
                                        return (
                                            <span key={`ell-${index}`} className="px-2 text-dim text-xs font-black select-none">
                                                ...
                                            </span>
                                        );
                                    }
                                    return (
                                        <button
                                            key={p}
                                            onClick={() => handlePageChange(Number(p))}
                                            className={`w-9 h-9 rounded-lg text-xs font-black transition-all cursor-pointer ${currentPage === p ? 'shadow-lg scale-110 z-10' : 'hover:bg-black/5 opacity-70 hover:opacity-100'}`}
                                            style={{
                                                background: currentPage === p ? '#C8E600' : 'transparent',
                                                color: currentPage === p ? '#000' : 'var(--text-main)',
                                                border: currentPage === p ? 'none' : '1px solid var(--border-main)'
                                            }}
                                        >
                                            {p}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages || loading}
                                className="p-2 rounded-lg border transition-all hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer bg-transparent"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <CreateBillModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={fetchBills}
            />
            <BulkBillUpload
                isOpen={isBulkUploadOpen}
                onClose={() => setIsBulkUploadOpen(false)}
                onSuccess={() => {
                    setIsBulkUploadOpen(false);
                    fetchBills();
                }}
            />
            <DateRangeReportModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                onDownload={handleDownloadReport}
                title="Purchase Bills Report"
            />
        </div>
    );
};

export default BillList;
