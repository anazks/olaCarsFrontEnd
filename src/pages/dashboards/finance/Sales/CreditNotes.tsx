import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Plus, Search, Filter, X, FileText, RefreshCw, 
    User, DollarSign, CheckCircle2,
    Eye, ChevronLeft, ChevronRight, Calendar,
    ArrowUpDown, ArrowUp, ArrowDown, Upload, Briefcase
} from 'lucide-react';
import Breadcrumbs from '../../../../components/dashboard/shared/Breadcrumbs';
import { 
    getAllCreditNotes, 
    createCreditNote, 
    type CreditNote 
} from '../../../../services/creditNoteService';
import { getAllCustomers, type Customer } from '../../../../services/customerService';
import { getAllSuppliers, type Supplier } from '../../../../services/supplierService';
import api from '../../../../services/api';
import { getInvoicesByCustomer } from '../../../../services/invoiceService';
import BulkCreditNoteUpload from '../../shared/BulkCreditNoteUpload';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const CreditNotes = () => {
    const navigate = useNavigate();
    
    // Unified Listing
    const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    
    const getDefaultStartDate = () => {
        const year = new Date().getFullYear();
        return `${year}-01-01`;
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
    const [entityTypeFilter, setEntityTypeFilter] = useState<'ALL' | 'CUSTOMER' | 'SUPPLIER'>('ALL');
    const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
    const [endDate, setEndDate] = useState<string>(getDefaultEndDate());

    // Server-Side Pagination
    const [page, setPage] = useState<number>(1);
    const limit = 25;
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });

    // Sorting
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    
    // Target Selection Type
    const [targetType, setTargetType] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loadingSuppliers, setLoadingSuppliers] = useState<boolean>(false);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');

    // Creation State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loadingCustomers, setLoadingCustomers] = useState<boolean>(false);
    const [customerInvoices, setCustomerInvoices] = useState<any[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState<boolean>(false);
    
    // Issuance Form States
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [customReason, setCustomReason] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [creditNoteDate, setCreditNoteDate] = useState<string>(new Date().toISOString().split('T')[0]);
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

    // Fetch Credit Notes
    const fetchCreditNotes = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {
                page,
                limit,
                search: debouncedSearch || undefined,
                status: statusFilter !== 'ALL' ? statusFilter : undefined,
                targetType: entityTypeFilter !== 'ALL' ? entityTypeFilter : undefined,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                sortBy,
                sortOrder
            };

            const res = await getAllCreditNotes(params);
            if (res) {
                const dataArray = Array.isArray(res) ? res : (Array.isArray(res.data) ? res.data : []);
                setCreditNotes(dataArray);
                if (res.pagination) {
                    setPagination(res.pagination);
                }
            }
        } catch (e) {
            console.error("Sync error:", e);
            toast.error("Failed syncing credit notes.");
        } finally {
            setLoading(false);
        }
    }, [page, limit, statusFilter, entityTypeFilter, debouncedSearch, sortBy, sortOrder, startDate, endDate]);

    useEffect(() => {
        fetchCreditNotes();
    }, [fetchCreditNotes]);

    const handleExportExcel = () => {
        if (creditNotes.length === 0) {
            toast.error("No credit notes available to export.");
            return;
        }
        const toastId = toast.loading("Generating Excel file...");
        try {
            const exportData = creditNotes.map((note, idx) => ({
                "Sl No.": String(idx + 1).padStart(2, '0'),
                "CN Number": note.creditNoteNumber || 'CN-DRAFT',
                "Customer Name": note.customerId?.name || note.driverId?.personalInfo?.fullName || 'Legacy Customer',
                "Customer/Driver ID": note.customerId?.customerId || note.driverId?.driverId || 'N/A',
                "Linked Invoice": note.invoiceId?.invoiceNumber || 'N/A',
                "Issued Date": note.creditNoteDate ? new Date(note.creditNoteDate).toLocaleDateString() : (note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'N/A'),
                "Amount": note.amount || 0,
                "Reason": note.reason || 'N/A',
                "Notes": note.notes || 'N/A',
                "Status": note.status || 'APPROVED'
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Credit Notes");
            
            const keys = Object.keys(exportData[0]);
            ws["!cols"] = keys.map(key => {
                const maxLen = Math.max(
                    key.length,
                    ...exportData.map(row => String((row as any)[key] || "").length)
                );
                return { wch: maxLen + 2 };
            });

            const dateStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `credit_notes_export_${dateStr}.xlsx`);
            toast.success("Excel file downloaded successfully!", { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export Excel file.", { id: toastId });
        }
    };

    const handleExportCsv = () => {
        if (creditNotes.length === 0) {
            toast.error("No credit notes available to export.");
            return;
        }
        const toastId = toast.loading("Generating CSV file...");
        try {
            const exportData = creditNotes.map((note, idx) => ({
                "Sl No.": String(idx + 1).padStart(2, '0'),
                "CN Number": note.creditNoteNumber || 'CN-DRAFT',
                "Customer Name": note.customerId?.name || note.driverId?.personalInfo?.fullName || 'Legacy Customer',
                "Customer/Driver ID": note.customerId?.customerId || note.driverId?.driverId || 'N/A',
                "Linked Invoice": note.invoiceId?.invoiceNumber || 'N/A',
                "Issued Date": note.creditNoteDate ? new Date(note.creditNoteDate).toLocaleDateString() : (note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'N/A'),
                "Amount": note.amount || 0,
                "Reason": note.reason || 'N/A',
                "Notes": note.notes || 'N/A',
                "Status": note.status || 'APPROVED'
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const csvContent = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement("a");
            link.setAttribute("href", url);
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute("download", `credit_notes_export_${dateStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success("CSV file downloaded successfully!", { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export CSV file.", { id: toastId });
        }
    };

    const handleExportPdf = () => {
        if (creditNotes.length === 0) {
            toast.error("No credit notes available to export.");
            return;
        }
        const toastId = toast.loading("Generating PDF file...");
        try {
            const doc = new jsPDF();
            const dateStr = new Date().toISOString().split('T')[0];
            const title = "Credit Notes Report";
            
            doc.setFontSize(18);
            doc.text(title, 14, 22);
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 29);
            if (startDate || endDate) {
                doc.text(`Period: ${startDate || 'N/A'} to ${endDate || 'N/A'}`, 14, 35);
            }

            const head = [["Sl No.", "CN Number", "Customer Name", "Customer/Driver ID", "Linked Invoice", "Issued Date", "Amount", "Status"]];
            const body = creditNotes.map((note, idx) => [
                String(idx + 1).padStart(2, '0'),
                note.creditNoteNumber || 'CN-DRAFT',
                note.customerId?.name || note.driverId?.personalInfo?.fullName || 'Legacy Customer',
                note.customerId?.customerId || note.driverId?.driverId || 'N/A',
                note.invoiceId?.invoiceNumber || 'N/A',
                note.creditNoteDate ? new Date(note.creditNoteDate).toLocaleDateString() : (note.createdAt ? new Date(note.createdAt).toLocaleDateString() : 'N/A'),
                `$${(note.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                note.status || 'APPROVED'
            ]);

            autoTable(doc, {
                head,
                body,
                startY: (startDate || endDate) ? 40 : 34,
                theme: 'striped',
                headStyles: { fillColor: [200, 230, 0], textColor: [0, 0, 0] }
            });

            doc.save(`credit_notes_export_${dateStr}.pdf`);
            toast.success("PDF file downloaded successfully!", { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export PDF file.", { id: toastId });
        }
    };

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
        return () => clearTimeout(t);
    }, [searchQuery]);

    useEffect(() => {
        setPage(1);
    }, [statusFilter, debouncedSearch, sortBy, sortOrder, startDate, endDate]);

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

    // Fetch customers and suppliers for Issuance
    useEffect(() => {
        if (isCreateModalOpen) {
            if (customers.length === 0) {
                const loadCustomers = async () => {
                    setLoadingCustomers(true);
                    try {
                        const res = await getAllCustomers({ status: 'ACTIVE', limit: 300 });
                        setCustomers(res?.data || res || []);
                    } catch (err) {
                        console.error("Customer load error", err);
                    } finally {
                        setLoadingCustomers(false);
                    }
                };
                loadCustomers();
            }

            if (suppliers.length === 0) {
                const loadSuppliers = async () => {
                    setLoadingSuppliers(true);
                    try {
                        const res = await getAllSuppliers({ limit: 10000 });
                        const docs = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
                        setSuppliers(docs);
                    } catch (err) {
                        console.error('Failed loading suppliers:', err);
                    } finally {
                        setLoadingSuppliers(false);
                    }
                };
                loadSuppliers();
            }
        }
    }, [isCreateModalOpen, customers.length, suppliers.length]);

    // Specific customer's invoices for the modal
    const [invoiceSort] = useState<'date' | 'number'>('date');
    const [invoiceSortOrder] = useState<'asc' | 'desc'>('desc');
    const [invoiceSearch, setInvoiceSearch] = useState('');
    const [invoiceDateFilter, setInvoiceDateFilter] = useState('');

    useEffect(() => {
        if (selectedCustomerId) {
            const loadInvoices = async () => {
                setLoadingInvoices(true);
                try {
                    const res = await getInvoicesByCustomer(selectedCustomerId);
                    const invoices = res || [];
                    setCustomerInvoices(invoices);
                    
                    // Auto-select the first invoice if available
                    if (invoices.length > 0) {
                        const sorted = [...invoices].sort((a, b) => {
                            const dateA = new Date(a.dueDate || a.generatedAt).getTime();
                            const dateB = new Date(b.dueDate || b.generatedAt).getTime();
                            return dateB - dateA;
                        });
                        setSelectedInvoiceId(sorted[0]._id);
                    }
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoadingInvoices(false);
                }
            };
            loadInvoices();
            setInvoiceSearch('');
            setInvoiceDateFilter('');
        } else {
            setCustomerInvoices([]);
            setSelectedInvoiceId('');
        }
    }, [selectedCustomerId]);

    const sortedCustomerInvoices = useMemo(() => {
        if (!Array.isArray(customerInvoices)) return [];
        
        let filtered = [...customerInvoices];

        // 1. Search Filter
        if (invoiceSearch.trim()) {
            const q = invoiceSearch.toLowerCase();
            filtered = filtered.filter(i => i.invoiceNumber.toLowerCase().includes(q));
        }

        // 2. Date Filter
        if (invoiceDateFilter) {
            filtered = filtered.filter(i => {
                const d = new Date(i.dueDate || i.generatedAt).toISOString().split('T')[0];
                return d === invoiceDateFilter;
            });
        }

        // 3. Sorting
        return filtered.sort((a, b) => {
            if (invoiceSort === 'date') {
                const dateA = new Date(a.dueDate || a.generatedAt).getTime();
                const dateB = new Date(b.dueDate || b.generatedAt).getTime();
                return invoiceSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
            } else {
                return invoiceSortOrder === 'desc' 
                    ? b.invoiceNumber.localeCompare(a.invoiceNumber)
                    : a.invoiceNumber.localeCompare(b.invoiceNumber);
            }
        });
    }, [customerInvoices, invoiceSort, invoiceSortOrder, invoiceSearch, invoiceDateFilter]);

    const handleRowClick = (id: string) => {
        navigate(`./${id}`);
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.pages) {
            setPage(newPage);
        }
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
            pages.push(1);

            if (currentPage > 3) {
                pages.push('ellipsis-start');
            }

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

            pages.push(totalPages);
        }
        return pages;
    };

    const handleCreateCreditNote = async (e: React.FormEvent) => {
        e.preventDefault();
        const finalReason = reason === 'Custom' ? customReason.trim() : reason;
        if (targetType === 'CUSTOMER' && !selectedCustomerId) {
            toast.error("Please select a Customer.");
            return;
        }
        if (targetType === 'SUPPLIER' && !selectedSupplierId) {
            toast.error("Please select a Supplier / Vendor.");
            return;
        }
        if (!amount || !finalReason) {
            toast.error("Fill mandatory fields.");
            return;
        }
        const today = new Date().toISOString().split('T')[0];
        if (creditNoteDate < today) {
            toast.error("Credit Note date cannot be in the past.");
            return;
        }
        setSubmitting(true);
        try {
            const payload: any = {
                customerId: targetType === 'CUSTOMER' ? selectedCustomerId : undefined,
                supplierId: targetType === 'SUPPLIER' ? selectedSupplierId : undefined,
                amount: Number(amount),
                reason: finalReason,
                notes,
                creditNoteDate,
                supportingDocument: supportingDocFile || undefined
            };
            
            if (targetType === 'CUSTOMER' && selectedCustomerId) {
                const selectedCust = customers.find(c => c._id === selectedCustomerId);
                if (selectedCust?.driver?._id) {
                    payload.driverId = selectedCust.driver._id;
                }
            }
            
            const res = await createCreditNote(payload);
            if (res.success) {
                toast.success("Credit Note issued in registry!");
                await fetchCreditNotes();
                resetForm();
                setIsCreateModalOpen(false);
            }
        } catch (e) { 
            console.error(e); 
            toast.error("Failed issuing credit note.");
        } finally { 
            setSubmitting(false); 
        }
    };

    const resetForm = () => {
        setSelectedCustomerId('');
        setSelectedInvoiceId('');
        setAmount('');
        setReason('');
        setCustomReason('');
        setNotes('');
        setCreditNoteDate(new Date().toISOString().split('T')[0]);
        setSupportingDocFile(null);
    };

    const selectedInvoiceData = useMemo(() => {
        if (!selectedInvoiceId) return null;
        return customerInvoices.find(i => i._id === selectedInvoiceId) || null;
    }, [customerInvoices, selectedInvoiceId]);

    const displayedNotes = creditNotes;

    return (
        <div className="container-responsive space-y-6 pb-12">
            <Breadcrumbs 
                items={[
                    { label: 'Sales', path: '#' },
                    { label: 'Credit Notes', active: true }
                ]} 
            />

            <div className="space-y-6 animate-in fade-in duration-500">
                
                {/* Compact Header Toolbar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 flex-shrink-0 border-b border-white/5 pb-4">
                    <div>
                        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                            <FileText size={20} className="text-indigo-400" />
                            Credit Notes Ledger
                        </h1>
                        <p className="text-xs font-medium text-dim mt-0.5">Execute accounting reversals, lease adjustments, and reconcile active accounts.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button 
                            onClick={() => fetchCreditNotes()} 
                            className="flex items-center justify-center p-2 rounded-xl transition-all duration-300 hover:bg-white/10 active:scale-95"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            title="Refresh Data"
                        >
                            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        </button>
                        <button 
                            onClick={() => setIsBulkModalOpen(true)} 
                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <Upload size={14} />
                            Bulk Upload
                        </button>
                        <button
                            onClick={handleExportExcel}
                            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm hover:bg-white/5 active:scale-95"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <FileText size={14} className="text-emerald-500" /> Excel
                        </button>

                        <button
                            onClick={handleExportCsv}
                            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm hover:bg-white/5 active:scale-95"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <FileText size={14} className="text-blue-400" /> CSV
                        </button>

                        <button
                            onClick={handleExportPdf}
                            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm hover:bg-white/5 active:scale-95"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <FileText size={14} className="text-rose-500" /> PDF
                        </button>

                        <button 
                            onClick={() => setIsCreateModalOpen(true)} 
                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95"
                            style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}
                        >
                            <Plus size={14} strokeWidth={3} />
                            Issue Credit
                        </button>
                    </div>
                </div>

                {/* Dynamic Search Capsule */}
                <div className="flex flex-col md:flex-row gap-3 flex-shrink-0 select-none">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dim" size={16} style={{ color: 'var(--text-dim)' }} />
                        <input
                            type="text"
                            placeholder="Filter ledger registry by note No., customer name, or memo..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-2xl text-xs font-semibold border outline-none transition-all"
                            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>
                    <div className="flex gap-3 flex-shrink-0">
                        {/* Account Entity Type Filter */}
                        <div className="relative select-none">
                            <select
                                value={entityTypeFilter}
                                onChange={e => { setEntityTypeFilter(e.target.value as any); setPage(1); }}
                                className="px-4 py-3 border rounded-2xl text-xs font-bold outline-none cursor-pointer select-none"
                                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="ALL" style={{background: 'var(--bg-card)'}}>ALL PROFILES (CUSTOMERS & VENDORS)</option>
                                <option value="CUSTOMER" style={{background: 'var(--bg-card)'}}>CUSTOMERS ONLY</option>
                                <option value="SUPPLIER" style={{background: 'var(--bg-card)'}}>VENDORS / SUPPLIERS ONLY</option>
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div className="relative select-none">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-dim" size={14} style={{ color: 'var(--text-dim)' }} />
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="pl-10 pr-8 py-3 border rounded-2xl text-xs font-bold outline-none appearance-none cursor-pointer select-none"
                                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="ALL" style={{background: 'var(--bg-card)'}}>ALL REVERSALS</option>
                                <option value="OPEN" style={{background: 'var(--bg-card)'}}>OPEN DRAFTS</option>
                                <option value="CLOSED" style={{background: 'var(--bg-card)'}}>CLOSED / APPLIED</option>
                                <option value="VOID" style={{background: 'var(--bg-card)'}}>VOID REVERSALS</option>
                            </select>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                            <div className="flex items-center gap-2 bg-black/5 rounded-2xl px-3 py-1.5 border" style={{ borderColor: 'var(--border-main)' }}>
                                <span className="text-[10px] font-black uppercase text-dim opacity-60">From</span>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={e => {
                                        const newStart = e.target.value;
                                        setStartDate(newStart);
                                        if (endDate && newStart && newStart > endDate) {
                                            setEndDate('');
                                        }
                                    }}
                                    className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                                    style={{ color: 'var(--text-main)' }}
                                />
                            </div>
                            <div className="flex items-center gap-2 bg-black/5 rounded-2xl px-3 py-1.5 border" style={{ borderColor: 'var(--border-main)' }}>
                                <span className="text-[10px] font-black uppercase text-dim opacity-60">To</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    min={startDate || undefined}
                                    onChange={e => setEndDate(e.target.value)}
                                    className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                                    style={{ color: 'var(--text-main)' }}
                                />
                            </div>
                            {(searchQuery || statusFilter !== 'ALL' || startDate !== getDefaultStartDate() || endDate !== getDefaultEndDate()) && (
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setStatusFilter('ALL');
                                        setStartDate(getDefaultStartDate());
                                        setEndDate(getDefaultEndDate());
                                    }}
                                    className="p-2 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all duration-200 cursor-pointer"
                                    title="Reset Constraints"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Registry Data Grid Wrapper */}
                <div className="border shadow-lg rounded-[2rem] overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse text-left text-xs select-text">
                            <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                                <tr className="border-b" style={{ borderColor: 'var(--border-main)' }}>
                                    <th className="py-4 px-6 text-left w-[15%] group cursor-pointer select-none" onClick={() => handleSort('creditNoteNumber')}>
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            CN Number <SortIcon field="creditNoteNumber" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left w-[25%] group cursor-pointer select-none" onClick={() => handleSort('customerId')}>
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Customer / Supplier <SortIcon field="customerId" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left w-[15%] group cursor-pointer select-none" onClick={() => handleSort('creditNoteDate')}>
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            <Calendar size={12}/> Issued <SortIcon field="creditNoteDate" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-right w-[15%] group cursor-pointer select-none" onClick={() => handleSort('amount')}>
                                        <div className="flex items-center justify-end gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            <DollarSign size={12}/> Amount <SortIcon field="amount" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-center w-[10%] group cursor-pointer select-none" onClick={() => handleSort('status')}>
                                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Status <SortIcon field="status" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-center w-[5%] text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-medium" style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="py-20 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <RefreshCw className="animate-spin text-brand-lime" size={28} />
                                                <span className="text-xs font-black tracking-widest text-dim uppercase">Querying Credit Ledger...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : displayedNotes.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-20 text-center">
                                            <div className="text-dim space-y-1 uppercase">
                                                <FileText className="mx-auto opacity-20 mb-2" size={32} />
                                                <p className="text-xs font-black tracking-widest">No credit notes recorded</p>
                                                <p className="text-[10px] tracking-wider font-bold lowercase opacity-60">Process manual corrections via 'Issue Credit'</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    displayedNotes.map((note) => (
                                        <tr 
                                            key={note._id} 
                                            onClick={() => handleRowClick(note._id)}
                                            className="transition-colors cursor-pointer group"
                                            style={{ borderBottom: '1px solid var(--border-main)' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <td className="py-4 px-6 font-black">
                                                <div className="flex flex-col">
                                                    <span className="tracking-wide font-black uppercase" style={{ color: 'var(--text-main)' }}>{note.creditNoteNumber || 'CN-DRAFT'}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 shadow-inner">
                                                        <span className="text-indigo-400 text-[10px] font-black">
                                                            {(note.supplierId?.name || note.supplierId?.companyName || note.customerId?.name || note.driverId?.personalInfo?.fullName || 'CU').slice(0,2).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black leading-snug tracking-tight">
                                                            {note.supplierId ? (note.supplierId.name || note.supplierId.companyName || 'Vendor/Supplier') : (note.customerId?.name || note.driverId?.personalInfo?.fullName || 'Legacy Customer')}
                                                        </span>
                                                        <span className="text-[9px] font-mono font-semibold text-dim uppercase tracking-widest mt-0.5">
                                                            {note.supplierId ? (note.supplierId.supplierCode || 'Vendor') : (note.customerId?.customerId || note.driverId?.driverId || 'N/A')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 font-bold text-dim">
                                                {new Date(note.creditNoteDate || note.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 px-6 text-right font-black text-sm text-indigo-400">
                                                ${note.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <StatusBadge status={note.status} />
                                            </td>
                                            <td className="py-4 px-6 text-center" onClick={e => e.stopPropagation()}>
                                                <button 
                                                    onClick={() => handleRowClick(note._id)}
                                                    className="p-2 bg-white/5 border border-white/10 text-[#A3A3A3] hover:text-brand-lime hover:border-brand-lime/30 rounded-xl cursor-pointer shadow-inner active:scale-90 hover:scale-[1.05] transition-all duration-300 flex items-center justify-center"
                                                    title="Open Reversal Document"
                                                >
                                                    <Eye size={14} strokeWidth={2.5} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Modern Numbered Pagination */}
                    {!loading && displayedNotes.length > 0 && pagination && pagination.pages >= 1 && (
                        <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                            <p className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>
                                Page {page} of {pagination.pages}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={page === 1 || loading}
                                    className="p-2 rounded-lg border transition-all hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed"
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
                                                className={`w-9 h-9 rounded-lg text-xs font-black transition-all ${page === item ? 'shadow-lg scale-110 z-10' : 'hover:bg-black/5 opacity-70 hover:opacity-100'}`}
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
                                    className="p-2 rounded-lg border transition-all hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ================= ISSUE CREDIT NOTE MODAL ================= */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="absolute inset-0" onClick={() => { setIsCreateModalOpen(false); resetForm(); }}></div>
                    <div className="relative w-full max-w-md border shadow-2xl overflow-hidden rounded-3xl animate-in zoom-in-95 duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        
                        <div className="flex items-center justify-between p-6 border-b bg-black/20" style={{ borderColor: 'var(--border-main)' }}>
                            <div>
                                <h2 className="text-lg font-black flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                    <FileText size={20} className="text-brand-lime" /> Issue Credit Note
                                </h2>
                                <p className="text-xs text-dim">Manual ledger adjustment.</p>
                            </div>
                            <button onClick={() => { setIsCreateModalOpen(false); resetForm(); }} className="p-2 text-dim hover:text-main rounded-xl transition-all"><X size={18} /></button>
                        </div>

                        <form onSubmit={handleCreateCreditNote} className="max-h-[70vh] overflow-y-auto p-6 space-y-5 custom-scrollbar">
                            {/* Target Entity Type Toggle */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest block" style={{ color: 'var(--text-dim)' }}>1. Issue Credit Note To *</label>
                                <div className="flex items-center gap-2 p-1.5 rounded-xl border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                    <button
                                        type="button"
                                        onClick={() => { setTargetType('CUSTOMER'); setSelectedSupplierId(''); }}
                                        className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                            targetType === 'CUSTOMER' ? 'bg-brand-lime text-black shadow-md' : 'text-dim hover:text-white'
                                        }`}
                                    >
                                        Customers
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setTargetType('SUPPLIER'); setSelectedCustomerId(''); }}
                                        className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                            targetType === 'SUPPLIER' ? 'bg-brand-lime text-black shadow-md' : 'text-dim hover:text-white'
                                        }`}
                                    >
                                        Vendors / Suppliers
                                    </button>
                                </div>
                            </div>

                            {targetType === 'CUSTOMER' && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Target Customer *</label>
                                    <div className="relative">
                                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                        <select required value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full pl-10 pr-8 py-2.5 border rounded-xl text-xs font-semibold appearance-none cursor-pointer" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                            <option value="" style={{background: 'var(--bg-card)'}}>Choose Profile</option>
                                            {loadingCustomers ? (
                                                <option disabled style={{background: 'var(--bg-card)'}}>Loading customers...</option>
                                            ) : customers.map(c => <option key={c._id} value={c._id} style={{background: 'var(--bg-card)'}}>{c.name || 'Unnamed Customer'} ({c.customerId || 'N/A'})</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {targetType === 'SUPPLIER' && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Target Vendor / Supplier *</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                        <select required value={selectedSupplierId} onChange={(e) => setSelectedSupplierId(e.target.value)} className="w-full pl-10 pr-8 py-2.5 border rounded-xl text-xs font-semibold appearance-none cursor-pointer" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                            <option value="" style={{background: 'var(--bg-card)'}}>Choose Vendor</option>
                                            {loadingSuppliers ? (
                                                <option disabled style={{background: 'var(--bg-card)'}}>Loading vendors...</option>
                                            ) : suppliers.map(s => <option key={s._id} value={s._id} style={{background: 'var(--bg-card)'}}>{s.name || s.companyName || 'Unnamed Vendor'} ({s.supplierCode || 'N/A'})</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>2. Amount *</label>
                                    <div className="relative"><DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} /><input required type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full pl-9 pr-3 py-2.5 border rounded-xl text-xs font-bold outline-none" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}/></div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>3. Date *</label>
                                    <input required type="date" min={new Date().toISOString().split('T')[0]} value={creditNoteDate} onChange={e => setCreditNoteDate(e.target.value)} className="w-full px-3 py-2.5 border rounded-xl text-xs font-semibold outline-none" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}/>
                                </div>
                            </div>

                             <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>5. Reason *</label>
                                <select required value={reason} onChange={e => setReason(e.target.value)} className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold appearance-none cursor-pointer" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                    <option value="" style={{background: 'var(--bg-card)'}}>Choose Category</option>
                                    <option value="Overcharge Reversal" style={{background: 'var(--bg-card)'}}>Overcharge Reversal</option>
                                    <option value="Vehicle Downtime Adjustment" style={{background: 'var(--bg-card)'}}>Vehicle Downtime Adjustment</option>
                                    <option value="Goodwill / Rental Discount" style={{background: 'var(--bg-card)'}}>Goodwill / Rental Discount</option>
                                    <option value="Damages Dispute Refund" style={{background: 'var(--bg-card)'}}>Damages Dispute Refund</option>
                                    <option value="Administrative Correction" style={{background: 'var(--bg-card)'}}>Administrative Correction</option>
                                    <option value="Custom" style={{background: 'var(--bg-card)'}}>Custom Reason...</option>
                                </select>
                            </div>

                            {reason === 'Custom' && (
                                <div className="space-y-1.5 animate-in slide-in-from-top-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Specify Custom Reason *</label>
                                    <input 
                                        required 
                                        type="text" 
                                        value={customReason} 
                                        onChange={e => setCustomReason(e.target.value)} 
                                        placeholder="Enter custom reason..." 
                                        className="w-full px-3.5 py-2.5 border rounded-xl text-xs font-semibold outline-none" 
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            )}

                            <div className="space-y-1.5"><label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>6. Notes</label><textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-3 border rounded-xl text-xs resize-none outline-none" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}/></div>

                            {/* Supporting Document */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>7. Supporting Document (Optional)</label>
                                <div 
                                    className="border border-dashed rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 transition-all relative overflow-hidden group"
                                    style={{ 
                                        background: 'var(--bg-input)', 
                                        borderColor: supportingDocFile ? 'var(--brand-lime)' : 'var(--border-main)' 
                                    }}
                                >
                                    <input 
                                        type="file" 
                                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                        onChange={e => {
                                            const file = e.target.files?.[0] || null;
                                            setSupportingDocFile(file);
                                        }}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                                    />
                                    <FileText 
                                        size={20} 
                                        className={supportingDocFile ? "text-brand-lime animate-pulse" : "text-dim opacity-50 group-hover:opacity-80 transition-opacity"} 
                                    />
                                    <div className="text-center z-0">
                                        {supportingDocFile ? (
                                            <>
                                                <p className="text-[11px] font-bold text-white max-w-[200px] truncate">{supportingDocFile.name}</p>
                                                <p className="text-[9px] text-dim mt-0.5">{(supportingDocFile.size / 1024).toFixed(1)} KB</p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-[11px] font-semibold" style={{ color: 'var(--text-main)' }}>Click or Drag to Upload Document</p>
                                                <p className="text-[8px] text-dim mt-0.5">PDF, Images, Excel, Word (Max 5MB)</p>
                                            </>
                                        )}
                                    </div>
                                    {supportingDocFile && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setSupportingDocFile(null);
                                            }}
                                            className="mt-1 px-2.5 py-0.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[8px] font-black uppercase tracking-wider rounded-lg border border-rose-500/20 z-20 cursor-pointer relative"
                                        >
                                            Remove Document
                                        </button>
                                    )}
                                </div>
                            </div>
                        </form>

                        <div className="p-6 border-t flex gap-3" style={{ borderColor: 'var(--border-main)', background: 'rgba(0,0,0,0.1)' }}>
                            <button type="button" onClick={() => { setIsCreateModalOpen(false); resetForm(); }} className="flex-1 py-3 border font-black text-[10px] uppercase rounded-xl hover:bg-white/5 transition-all cursor-pointer" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>Cancel</button>
                            <button onClick={handleCreateCreditNote} disabled={submitting} className="flex-1 py-3 bg-brand-lime text-black rounded-xl text-[10px] font-black uppercase hover:scale-[1.03] shadow flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer">{submitting ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}{submitting ? 'Posting...' : 'Post Credit'}</button>
                        </div>
                    </div>
                </div>
            )}

            <BulkCreditNoteUpload
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                onSuccess={async () => {
                    setIsBulkModalOpen(false);
                    await fetchCreditNotes();
                }}
            />
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'PAID':
        case 'CLOSED':
        case 'APPLIED':
            return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-emerald-500/10 text-emerald-400 border-emerald-500/20 select-none">Paid</span>;
        case 'PARTIAL':
            return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-blue-500/10 text-blue-400 border-blue-500/20 select-none">Partial</span>;
        case 'OVERDUE':
            return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-rose-500/10 text-rose-400 border-rose-500/20 select-none">Overdue</span>;
        case 'CANCELLED':
        case 'VOID':
            return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-rose-500/10 text-rose-500 border-rose-500/20 select-none">Cancelled</span>;
        case 'DRAFT':
            return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-gray-500/10 text-gray-400 border-gray-500/20 select-none">Draft</span>;
        case 'PENDING':
        case 'OPEN':
        default:
            return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm bg-amber-500/10 text-amber-400 border-amber-500/20 select-none">Pending</span>;
    }
};

export default CreditNotes;
