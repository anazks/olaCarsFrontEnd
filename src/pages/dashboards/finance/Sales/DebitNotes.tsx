import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Plus, Search, X, FileText, RefreshCw, 
    User, DollarSign, CheckCircle2,
    Eye, ChevronLeft, ChevronRight, Calendar,
    Upload, FileSpreadsheet
} from 'lucide-react';
import Breadcrumbs from '../../../../components/dashboard/shared/Breadcrumbs';
import { 
    getAllDebitNotes, 
    createDebitNote, 
    type DebitNote 
} from '../../../../services/debitNoteService';
import { getAllCustomers, type Customer } from '../../../../services/customerService';
import { getInvoicesByCustomer } from '../../../../services/invoiceService';
import BulkDebitNoteUpload from '../../shared/BulkDebitNoteUpload';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getUserRole } from '../../../../utils/auth';

const DebitNotes = () => {
    const navigate = useNavigate();
    
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
    
    // Listing State
    const [debitNotes, setDebitNotes] = useState<DebitNote[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    
    const getDefaultStartDate = () => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    const getDefaultEndDate = () => {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    };

    // Filters
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
    const [endDate, setEndDate] = useState<string>(getDefaultEndDate());

    // Server-Side Pagination
    const [page, setPage] = useState<number>(1);
    const limit = 25;
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });

    // Sorting
    const sortBy = 'createdAt';
    const sortOrder = 'desc';
    
    // Creation Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loadingCustomers, setLoadingCustomers] = useState<boolean>(false);
    const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState<boolean>(false);
    
    // Form States
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
    const [modalCustomerSearch, setModalCustomerSearch] = useState<string>('');
    const [modalInvoiceSearch, setModalInvoiceSearch] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [customReason, setCustomReason] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [debitNoteDate, setDebitNoteDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [supportingDocFile, setSupportingDocFile] = useState<File | null>(null);

    // Debounce search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setPage(1);
        }, 400);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Fetch Debit Notes
    const fetchDebitNotes = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {
                page,
                limit,
                sortBy,
                sortOrder
            };
            if (debouncedSearch) params.search = debouncedSearch;
            if (statusFilter !== 'ALL') params.status = statusFilter;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;

            const res = await getAllDebitNotes(params);
            if (res.success) {
                setDebitNotes(res.data || []);
                if (res.pagination) {
                    setPagination({
                        total: res.pagination.total || 0,
                        pages: res.pagination.pages || 1
                    });
                }
            }
        } catch (err: any) {
            console.error('Failed fetching debit notes:', err);
            toast.error('Failed to fetch Debit Notes.');
        } finally {
            setLoading(false);
        }
    }, [page, limit, debouncedSearch, statusFilter, startDate, endDate, sortBy, sortOrder]);

    useEffect(() => {
        fetchDebitNotes();
    }, [fetchDebitNotes]);

    // Fetch Customers for issuance modal
    useEffect(() => {
        if (isCreateModalOpen && customers.length === 0) {
            const loadCustomers = async () => {
                setLoadingCustomers(true);
                try {
                    const res = await getAllCustomers({ limit: 10000 });
                    const docs = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
                    setCustomers(docs);
                } catch (err) {
                    console.error('Failed loading customers:', err);
                } finally {
                    setLoadingCustomers(false);
                }
            };
            loadCustomers();
        }
    }, [isCreateModalOpen, customers.length]);

    // Filter customers based on search input in modal
    const filteredCustomers = useMemo(() => {
        if (!modalCustomerSearch.trim()) return customers;
        const q = modalCustomerSearch.toLowerCase().trim();
        return customers.filter(c => 
            (c.name && c.name.toLowerCase().includes(q)) ||
            (c.customerId && c.customerId.toLowerCase().includes(q)) ||
            (c.phone && c.phone.includes(q)) ||
            (c.email && c.email.toLowerCase().includes(q))
        );
    }, [customers, modalCustomerSearch]);

    const selectedCustomer = useMemo(() => {
        return customers.find(c => c._id === selectedCustomerId);
    }, [customers, selectedCustomerId]);

    // Filter customer invoices based on search input in modal
    const filteredCustomerInvoices = useMemo(() => {
        if (!modalInvoiceSearch.trim()) return customerInvoices;
        const q = modalInvoiceSearch.toLowerCase().trim();
        return customerInvoices.filter(inv =>
            (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(q)) ||
            (inv.status && inv.status.toLowerCase().includes(q)) ||
            (inv.weekLabel && inv.weekLabel.toLowerCase().includes(q)) ||
            (inv.balance !== undefined && String(inv.balance).includes(q)) ||
            (inv.totalAmountDue !== undefined && String(inv.totalAmountDue).includes(q))
        );
    }, [customerInvoices, modalInvoiceSearch]);

    const selectedInvoiceData = useMemo(() => {
        return customerInvoices.find(inv => inv._id === selectedInvoiceId);
    }, [customerInvoices, selectedInvoiceId]);

    // Fetch customer invoices when customer selection changes
    useEffect(() => {
        if (selectedCustomerId) {
            const loadInvoices = async () => {
                setLoadingInvoices(true);
                try {
                    const res = await getInvoicesByCustomer(selectedCustomerId);
                    const invList = Array.isArray(res) ? res : ((res as any)?.data || []);
                    setCustomerInvoices(invList);
                } catch (err) {
                    console.error('Failed to fetch customer invoices:', err);
                } finally {
                    setLoadingInvoices(false);
                }
            };
            loadInvoices();
        } else {
            setCustomerInvoices([]);
            setSelectedInvoiceId('');
        }
    }, [selectedCustomerId]);

    // Handle Create Debit Note Submit
    const handleCreateDebitNote = async (e: React.FormEvent) => {
        e.preventDefault();
        const finalReason = reason === 'Other' ? customReason : reason;
        if (!selectedCustomerId || !amount || !finalReason) {
            toast.error('Please fill in all mandatory fields.');
            return;
        }

        setSubmitting(true);
        const toastId = toast.loading('Posting Debit Note...');

        try {
            const payload: any = {
                customerId: selectedCustomerId,
                invoiceId: selectedInvoiceId || undefined,
                amount: parseFloat(amount),
                reason: finalReason,
                notes,
                debitNoteDate
            };
            if (supportingDocFile) {
                payload.supportingDocument = supportingDocFile;
            }

            const res = await createDebitNote(payload);
            if (res.success) {
                toast.success('Debit Note issued successfully!', { id: toastId });
                setIsCreateModalOpen(false);
                resetForm();
                fetchDebitNotes();
            }
        } catch (err: any) {
            console.error('Failed to post Debit Note:', err);
            toast.error(err.response?.data?.message || 'Failed to issue Debit Note.', { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setSelectedCustomerId('');
        setSelectedInvoiceId('');
        setModalCustomerSearch('');
        setModalInvoiceSearch('');
        setAmount('');
        setReason('');
        setCustomReason('');
        setNotes('');
        setSupportingDocFile(null);
        setDebitNoteDate(new Date().toISOString().split('T')[0]);
    };

    // Calculate Summary Metrics
    const metrics = useMemo(() => {
        const totalAmount = debitNotes.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const openCount = debitNotes.filter(dn => dn.status === 'OPEN').length;
        const appliedCount = debitNotes.filter(dn => dn.status === 'CLOSED' || dn.status === 'APPLIED').length;
        return { totalAmount, openCount, appliedCount, totalCount: debitNotes.length };
    }, [debitNotes]);

    // Export Handlers
    const handleExportExcel = () => {
        if (debitNotes.length === 0) {
            toast.error("No debit notes available to export.");
            return;
        }
        const exportData = debitNotes.map((note, idx) => ({
            "Sl No.": idx + 1,
            "DN Number": note.debitNoteNumber || 'N/A',
            "Customer / Driver": note.customerId?.name || note.driverId?.personalInfo?.fullName || 'N/A',
            "Linked Invoice": note.invoiceId?.invoiceNumber || 'N/A',
            "Issue Date": note.debitNoteDate ? new Date(note.debitNoteDate).toLocaleDateString() : 'N/A',
            "Amount ($)": note.amount || 0,
            "Reason": note.reason || 'N/A',
            "Notes": note.notes || 'N/A',
            "Status": note.status || 'OPEN'
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Debit Notes");
        XLSX.writeFile(wb, `debit_notes_ledger_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success("Debit Notes Excel file downloaded successfully!");
    };

    const handleExportPdf = () => {
        if (debitNotes.length === 0) {
            toast.error("No debit notes available to export.");
            return;
        }
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text("Debit Notes Ledger Report", 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

        const tableData = debitNotes.map((note, idx) => [
            String(idx + 1),
            note.debitNoteNumber || 'N/A',
            note.customerId?.name || note.driverId?.personalInfo?.fullName || 'N/A',
            note.invoiceId?.invoiceNumber || 'N/A',
            note.debitNoteDate ? new Date(note.debitNoteDate).toLocaleDateString() : 'N/A',
            `$${(note.amount || 0).toLocaleString()}`,
            note.reason || 'N/A',
            note.status || 'OPEN'
        ]);

        autoTable(doc, {
            startY: 28,
            head: [['#', 'DN Number', 'Customer/Driver', 'Invoice', 'Date', 'Amount', 'Reason', 'Status']],
            body: tableData,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [212, 241, 46], textColor: [0, 0, 0] }
        });

        doc.save(`debit_notes_report_${new Date().toISOString().split('T')[0]}.pdf`);
        toast.success("Debit Notes PDF report generated!");
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header & Breadcrumbs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <Breadcrumbs items={[{ label: 'Sales', path: `${getRoutePrefix()}/invoices` }, { label: 'Debit Notes', active: true }]} />
                    <h1 className="text-2xl font-black tracking-tight mt-1" style={{ color: 'var(--text-main)' }}>Debit Notes Ledger</h1>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-dim)' }}>Manage customer debit adjustments, additional charges, and invoice billing increases.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsBulkModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all hover:bg-white/10 cursor-pointer shadow-sm"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-card)' }}
                    >
                        <Upload size={14} /> Bulk Upload
                    </button>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-brand-lime text-black rounded-xl text-xs font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer"
                        style={{ background: 'var(--brand-lime)' }}
                    >
                        <Plus size={16} /> Post Debit Note
                    </button>
                </div>
            </div>

            {/* Metric KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl border shadow-sm transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-dim">Total Debit Notes</span>
                        <FileText size={18} className="text-brand-lime" />
                    </div>
                    <p className="text-2xl font-black mt-2" style={{ color: 'var(--text-main)' }}>{metrics.totalCount}</p>
                    <p className="text-[10px] font-bold mt-1 text-dim">Issued in ledger</p>
                </div>

                <div className="p-5 rounded-2xl border shadow-sm transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-dim">Total Debited Value</span>
                        <DollarSign size={18} className="text-amber-400" />
                    </div>
                    <p className="text-2xl font-black mt-2 text-amber-400">${metrics.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] font-bold mt-1 text-dim">Gross debit value</p>
                </div>

                <div className="p-5 rounded-2xl border shadow-sm transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-dim">Open / Pending</span>
                        <RefreshCw size={18} className="text-blue-400" />
                    </div>
                    <p className="text-2xl font-black mt-2 text-blue-400">{metrics.openCount}</p>
                    <p className="text-[10px] font-bold mt-1 text-dim">Ready to apply</p>
                </div>

                <div className="p-5 rounded-2xl border shadow-sm transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-dim">Applied / Closed</span>
                        <CheckCircle2 size={18} className="text-emerald-400" />
                    </div>
                    <p className="text-2xl font-black mt-2 text-emerald-400">{metrics.appliedCount}</p>
                    <p className="text-[10px] font-bold mt-1 text-dim">Applied to invoice balances</p>
                </div>
            </div>

            {/* Filter Matrix & Interactive Table */}
            <div className="p-6 rounded-3xl border shadow-sm space-y-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                {/* Search & Filters Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <input
                            type="text"
                            placeholder="Search DN #, Customer, Driver, Reason..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-xs font-semibold outline-none focus:border-brand-lime transition-all"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="px-3.5 py-2.5 border rounded-xl text-xs font-bold outline-none cursor-pointer"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="OPEN">Open</option>
                            <option value="CLOSED">Applied / Closed</option>
                            <option value="VOID">Voided</option>
                        </select>

                        {/* Date Range Inputs */}
                        <div className="flex items-center gap-2 border px-3 py-1.5 rounded-xl" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                            <Calendar size={14} className="text-dim" />
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => { setStartDate(e.target.value); setPage(1); }} 
                                className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                                style={{ color: 'var(--text-main)' }}
                            />
                            <span className="text-xs text-dim">to</span>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={(e) => { setEndDate(e.target.value); setPage(1); }} 
                                className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                                style={{ color: 'var(--text-main)' }}
                            />
                        </div>

                        {/* Exports */}
                        <button 
                            onClick={handleExportExcel}
                            className="flex items-center gap-2 px-3.5 py-2.5 border rounded-xl text-xs font-bold transition-all hover:bg-white/10 cursor-pointer"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            title="Export Excel"
                        >
                            <FileSpreadsheet size={14} className="text-emerald-500" /> Excel
                        </button>
                        <button 
                            onClick={handleExportPdf}
                            className="flex items-center gap-2 px-3.5 py-2.5 border rounded-xl text-xs font-bold transition-all hover:bg-white/10 cursor-pointer"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            title="Export PDF"
                        >
                            <FileText size={14} className="text-rose-400" /> PDF
                        </button>
                    </div>
                </div>

                {/* Ledger Data Table */}
                <div className="overflow-x-auto border rounded-2xl shadow-sm" style={{ borderColor: 'var(--border-main)' }}>
                    <table className="w-full text-left text-xs border-collapse">
                        <thead style={{ background: 'var(--bg-input)' }}>
                            <tr className="border-b uppercase text-[10px] font-black tracking-wider text-dim" style={{ borderColor: 'var(--border-main)' }}>
                                <th className="p-4 w-12">#</th>
                                <th className="p-4">Debit Note #</th>
                                <th className="p-4">Customer / Driver</th>
                                <th className="p-4">Linked Invoice</th>
                                <th className="p-4">Issue Date</th>
                                <th className="p-4 text-right">Amount ($)</th>
                                <th className="p-4">Reason</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="p-12 text-center">
                                        <div className="flex items-center justify-center gap-2 text-brand-lime font-bold">
                                            <RefreshCw size={16} className="animate-spin" /> Loading Debit Notes Ledger...
                                        </div>
                                    </td>
                                </tr>
                            ) : debitNotes.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="p-12 text-center text-dim font-bold uppercase tracking-wider">
                                        No Debit Notes found matching filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                debitNotes.map((dn, idx) => (
                                    <tr key={dn._id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4 text-dim font-semibold">{(page - 1) * limit + idx + 1}</td>
                                        <td className="p-4 font-black text-brand-lime cursor-pointer hover:underline" onClick={() => navigate(`${getRoutePrefix()}/sales/debit-notes/${dn._id}`)}>
                                            {dn.debitNoteNumber}
                                        </td>
                                        <td className="p-4 font-bold" style={{ color: 'var(--text-main)' }}>
                                            {dn.customerId?.name || dn.driverId?.personalInfo?.fullName || 'N/A'}
                                        </td>
                                        <td className="p-4 font-semibold text-blue-400">
                                            {dn.invoiceId?.invoiceNumber ? (
                                                <span className="cursor-pointer hover:underline" onClick={() => navigate(`${getRoutePrefix()}/invoices/${dn.invoiceId?._id}`)}>
                                                    {dn.invoiceId.invoiceNumber}
                                                </span>
                                            ) : (
                                                <span className="text-dim italic">Unlinked</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-dim">
                                            {dn.debitNoteDate ? new Date(dn.debitNoteDate).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="p-4 text-right font-black text-amber-400">
                                            ${(dn.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="p-4 font-semibold" style={{ color: 'var(--text-main)' }}>
                                            {dn.reason}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                dn.status === 'CLOSED' || dn.status === 'APPLIED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                dn.status === 'OPEN' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                            }`}>
                                                {dn.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button 
                                                onClick={() => navigate(`${getRoutePrefix()}/sales/debit-notes/${dn._id}`)}
                                                className="p-1.5 rounded-lg border hover:bg-white/10 transition-all cursor-pointer text-dim hover:text-white"
                                                style={{ borderColor: 'var(--border-main)' }}
                                                title="View Details"
                                            >
                                                <Eye size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Server-Side Pagination Bar */}
                {pagination.pages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-dim">Page {page} of {pagination.pages} ({pagination.total} total)</span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1.5 border rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                                disabled={page === pagination.pages}
                                className="px-3 py-1.5 border rounded-xl text-xs font-bold disabled:opacity-40 cursor-pointer"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Post Debit Note Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
                    <div className="relative w-full max-w-xl flex flex-col rounded-[2rem] shadow-2xl border animate-in fade-in duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: 'var(--border-main)' }}>
                            <div>
                                <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Issue Debit Note</h2>
                                <p className="text-[10px] font-semibold mt-0.5 text-dim">Increase customer invoice balance due or add debit adjustment</p>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-2 rounded-xl border hover:bg-white/10 text-dim" style={{ borderColor: 'var(--border-main)' }}>
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateDebitNote} className="p-8 space-y-5">
                            {/* Customer Select with Live Search */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-dim">Select Customer *</label>
                                    {customers.length > 0 && (
                                        <span className="text-[10px] font-bold text-dim">
                                            {filteredCustomers.length} of {customers.length} customers
                                        </span>
                                    )}
                                </div>

                                {/* Customer Search Box */}
                                <div className="relative mb-2">
                                    <input
                                        type="text"
                                        placeholder="Search customer by name, ID, phone, email..."
                                        value={modalCustomerSearch}
                                        onChange={(e) => setModalCustomerSearch(e.target.value)}
                                        className="w-full pl-9 pr-8 py-2 border rounded-xl text-xs font-semibold outline-none focus:border-brand-lime"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
                                    {modalCustomerSearch && (
                                        <button 
                                            type="button" 
                                            onClick={() => setModalCustomerSearch('')} 
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-white cursor-pointer"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>

                                {/* Customer Dropdown Select */}
                                <select
                                    required
                                    value={selectedCustomerId}
                                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                                    disabled={loadingCustomers}
                                    className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold outline-none cursor-pointer disabled:opacity-50"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="">-- Choose Customer --</option>
                                    {loadingCustomers ? (
                                        <option disabled>Loading customers ledger...</option>
                                    ) : filteredCustomers.length === 0 ? (
                                        <option disabled>No customers match "{modalCustomerSearch}"</option>
                                    ) : (
                                        filteredCustomers.map(c => (
                                            <option key={c._id} value={c._id}>
                                                {c.name || 'Unnamed Customer'} {c.customerId ? `(${c.customerId})` : ''} {c.phone ? `— ${c.phone}` : ''}
                                            </option>
                                        ))
                                    )}
                                </select>

                                {/* Selected Customer Highlight Card */}
                                {selectedCustomer && (
                                    <div className="mt-2.5 p-3 rounded-xl border bg-brand-lime/10 border-brand-lime/20 flex items-center justify-between text-xs animate-in fade-in">
                                        <div className="flex items-center gap-2">
                                            <User size={14} className="text-brand-lime" />
                                            <span className="font-bold" style={{ color: 'var(--text-main)' }}>
                                                Selected: {selectedCustomer.name} {selectedCustomer.customerId ? `(${selectedCustomer.customerId})` : ''}
                                            </span>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => { setSelectedCustomerId(''); setCustomerInvoices([]); }}
                                            className="text-[10px] font-bold text-rose-400 hover:underline cursor-pointer"
                                        >
                                            Clear Selection
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Linked Invoice Select with Live Search */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-dim">Target Invoice (Optional - Auto Increases Balance)</label>
                                    {loadingInvoices ? (
                                        <span className="text-[10px] text-brand-lime font-bold">Loading invoices...</span>
                                    ) : customerInvoices.length > 0 && (
                                        <span className="text-[10px] font-bold text-dim">
                                            {filteredCustomerInvoices.length} of {customerInvoices.length} invoices
                                        </span>
                                    )}
                                </div>

                                {/* Invoice Search Box */}
                                {selectedCustomerId && customerInvoices.length > 0 && (
                                    <div className="relative mb-2">
                                        <input
                                            type="text"
                                            placeholder="Search invoice number, status, amount..."
                                            value={modalInvoiceSearch}
                                            onChange={(e) => setModalInvoiceSearch(e.target.value)}
                                            className="w-full pl-9 pr-8 py-2 border rounded-xl text-xs font-semibold outline-none focus:border-brand-lime"
                                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        />
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
                                        {modalInvoiceSearch && (
                                            <button 
                                                type="button" 
                                                onClick={() => setModalInvoiceSearch('')} 
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-white cursor-pointer"
                                            >
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Invoice Dropdown Select */}
                                <select
                                    value={selectedInvoiceId}
                                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                                    disabled={!selectedCustomerId || loadingInvoices}
                                    className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold outline-none cursor-pointer disabled:opacity-50"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="">-- Standalone (Apply Later) --</option>
                                    {filteredCustomerInvoices.length === 0 && modalInvoiceSearch ? (
                                        <option disabled>No invoices match "{modalInvoiceSearch}"</option>
                                    ) : (
                                        filteredCustomerInvoices.map(inv => (
                                            <option key={inv._id} value={inv._id}>
                                                {inv.invoiceNumber} — Balance: ${inv.balance} (Due: ${inv.totalAmountDue}) — Status: {inv.status}
                                            </option>
                                        ))
                                    )}
                                </select>
                                {selectedCustomerId && customerInvoices.length === 0 && !loadingInvoices && (
                                    <p className="text-[10px] text-dim mt-1">No invoices found for this customer.</p>
                                )}

                                {/* Selected Invoice Highlight Card */}
                                {selectedInvoiceData && (
                                    <div className="mt-2.5 p-3 rounded-xl border bg-blue-500/10 border-blue-500/20 flex items-center justify-between text-xs animate-in fade-in">
                                        <div className="flex items-center gap-2">
                                            <FileText size={14} className="text-blue-400" />
                                            <span className="font-bold" style={{ color: 'var(--text-main)' }}>
                                                Target: {selectedInvoiceData.invoiceNumber} — Current Balance: ${selectedInvoiceData.balance} (Total Due: ${selectedInvoiceData.totalAmountDue})
                                            </span>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => setSelectedInvoiceId('')}
                                            className="text-[10px] font-bold text-rose-400 hover:underline cursor-pointer"
                                        >
                                            Unlink
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Amount & Date */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5 text-dim">Debit Amount ($) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        required
                                        placeholder="0.00"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-bold outline-none"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5 text-dim">Debit Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={debitNoteDate}
                                        onChange={(e) => setDebitNoteDate(e.target.value)}
                                        className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-bold outline-none cursor-pointer"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5 text-dim">Reason for Debit *</label>
                                <select
                                    required
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold outline-none cursor-pointer mb-2"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="">-- Select Reason --</option>
                                    <option value="Late Fee / Penalty">Late Fee / Penalty</option>
                                    <option value="Underbilled Invoice Correction">Underbilled Invoice Correction</option>
                                    <option value="Additional Service Fee">Additional Service Fee</option>
                                    <option value="Damage / Repair Charge">Damage / Repair Charge</option>
                                    <option value="Other">Other Custom Reason</option>
                                </select>
                                {reason === 'Other' && (
                                    <input
                                        type="text"
                                        required
                                        placeholder="Specify custom reason..."
                                        value={customReason}
                                        onChange={(e) => setCustomReason(e.target.value)}
                                        className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold outline-none"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                )}
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5 text-dim">Notes / Remark</label>
                                <textarea
                                    rows={2}
                                    placeholder="Add optional notes or descriptions..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold outline-none resize-none"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            {/* Supporting File */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5 text-dim">Supporting Document (Optional)</label>
                                <input
                                    type="file"
                                    onChange={(e) => setSupportingDocFile(e.target.files?.[0] || null)}
                                    className="w-full text-xs text-dim file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-brand-lime file:text-black cursor-pointer"
                                />
                            </div>

                            {/* Submit */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-5 py-2.5 border rounded-xl text-xs font-bold cursor-pointer" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-lime text-black rounded-xl text-xs font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg cursor-pointer disabled:opacity-50"
                                    style={{ background: 'var(--brand-lime)' }}
                                >
                                    {submitting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                    <span>{submitting ? 'Posting...' : 'Issue Debit Note'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal */}
            <BulkDebitNoteUpload
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                onSuccess={fetchDebitNotes}
            />
        </div>
    );
};

export default DebitNotes;
