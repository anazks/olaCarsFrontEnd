import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText,
    RefreshCw,
    Search,
    ChevronDown,
    ChevronRight,
    ArrowUpDown,
    Download,
    FileSpreadsheet,
    Calendar,
    SlidersHorizontal,
    ArrowLeft,
    Clock,
    DollarSign,
    Users,
    AlertTriangle,
    Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getInvoicesRegistry, type Invoice } from '../../../services/invoiceService';
import { getAllCustomers, type Customer } from '../../../services/customerService';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

// Bucket Range Config Interface
export interface AgingBucketConfig {
    b1Min: number; // e.g. 1
    b1Max: number; // e.g. 5
    b2Min: number; // e.g. 6
    b2Max: number; // e.g. 10
    b3Min: number; // e.g. 11
    b3Max: number; // e.g. 30
    b4Min: number; // e.g. 31
    b4Max: number; // e.g. 50
    b5Min: number; // e.g. 51+
}

const DEFAULT_BUCKETS: AgingBucketConfig = {
    b1Min: 1,
    b1Max: 5,
    b2Min: 6,
    b2Max: 10,
    b3Min: 11,
    b3Max: 30,
    b4Min: 31,
    b4Max: 50,
    b5Min: 51
};

interface CustomerAgingSummary {
    customerKey: string;
    customerName: string;
    customerId: string;
    email?: string;
    phone?: string;
    current: number;
    b1: number;
    b2: number;
    b3: number;
    b4: number;
    b5: number;
    total: number;
    invoiceCount: number;
    invoices: (Invoice & { daysOverdue: number })[];
}

export const InvoiceAgingSummary: React.FC = () => {
    const navigate = useNavigate();

    // Data States
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter & Config States
    const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedCustomer, setSelectedCustomer] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [bucketConfig, setBucketConfig] = useState<AgingBucketConfig>(DEFAULT_BUCKETS);
    const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
    const [tempConfig, setTempConfig] = useState<AgingBucketConfig>(DEFAULT_BUCKETS);

    // Table Expansion & Sorting
    const [expandedCustomerKey, setExpandedCustomerKey] = useState<string | null>(null);
    const [sortField, setSortField] = useState<keyof CustomerAgingSummary>('total');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Exporting States
    const [exportingExcel, setExportingExcel] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);

    // Load Data
    const fetchData = async () => {
        setLoading(true);
        try {
            const [invRes, custRes] = await Promise.all([
                getInvoicesRegistry({ limit: 10000, ignoreDefaultDates: 'true' }),
                getAllCustomers({ limit: 1000 })
            ]);

            setInvoices(invRes.data || []);
            setCustomers(Array.isArray(custRes) ? custRes : (custRes as any)?.data || []);
        } catch (err: any) {
            console.error('Failed to load aging report data:', err);
            toast.error(err?.message || 'Failed to load invoices');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Process Aging Summaries
    const agingData = useMemo(() => {
        const asOf = new Date(asOfDate);
        asOf.setHours(23, 59, 59, 999);

        // Filter active unpaid/partially paid invoices with balance > 0
        const activeInvoices = invoices.filter(inv => {
            if (inv.status === 'CANCELLED') return false;
            const bal = inv.balance ?? (inv.totalAmountDue - inv.amountPaid);
            return bal > 0.001;
        });

        const map: Record<string, CustomerAgingSummary> = {};

        activeInvoices.forEach(inv => {
            // Customer identification
            let custName = 'Unassigned / Cash Sales';
            let custId = '—';
            let custKey = 'unassigned';
            let email = '';
            let phone = '';

            if (inv.customer && typeof inv.customer === 'object') {
                custName = inv.customer.name || 'Unknown Customer';
                custId = inv.customer.customerId || inv.customer._id || '—';
                custKey = inv.customer._id || custId;
                email = inv.customer.email || '';
                phone = inv.customer.phone || '';
            } else if (inv.driver && typeof inv.driver === 'object') {
                custName = inv.driver.personalInfo?.fullName || inv.driver.name || 'Driver Customer';
                custId = inv.driver.driverId || inv.driver._id || '—';
                custKey = inv.driver._id || custId;
                email = inv.driver.personalInfo?.email || '';
                phone = inv.driver.personalInfo?.phone || '';
            } else if (typeof inv.customer === 'string' && inv.customer) {
                custKey = inv.customer;
                const found = customers.find(c => c._id === inv.customer);
                if (found) {
                    custName = found.name;
                    custId = found.customerId || found._id;
                    email = found.email || '';
                    phone = found.phone || '';
                }
            }

            if (!map[custKey]) {
                map[custKey] = {
                    customerKey: custKey,
                    customerName: custName,
                    customerId: custId,
                    email,
                    phone,
                    current: 0,
                    b1: 0,
                    b2: 0,
                    b3: 0,
                    b4: 0,
                    b5: 0,
                    total: 0,
                    invoiceCount: 0,
                    invoices: []
                };
            }

            // Calculate days past due from dueDate or generatedAt
            const due = new Date(inv.dueDate || inv.generatedAt || inv.createdAt || Date.now());
            due.setHours(0, 0, 0, 0);

            const diffTime = asOf.getTime() - due.getTime();
            const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            const bal = inv.balance ?? (inv.totalAmountDue - inv.amountPaid);

            // Categorize into buckets
            if (daysOverdue <= 0) {
                map[custKey].current += bal;
            } else if (daysOverdue >= bucketConfig.b1Min && daysOverdue <= bucketConfig.b1Max) {
                map[custKey].b1 += bal;
            } else if (daysOverdue >= bucketConfig.b2Min && daysOverdue <= bucketConfig.b2Max) {
                map[custKey].b2 += bal;
            } else if (daysOverdue >= bucketConfig.b3Min && daysOverdue <= bucketConfig.b3Max) {
                map[custKey].b3 += bal;
            } else if (daysOverdue >= bucketConfig.b4Min && daysOverdue <= bucketConfig.b4Max) {
                map[custKey].b4 += bal;
            } else if (daysOverdue >= bucketConfig.b5Min) {
                map[custKey].b5 += bal;
            } else {
                map[custKey].b1 += bal; // fallback
            }

            map[custKey].total += bal;
            map[custKey].invoiceCount += 1;
            map[custKey].invoices.push({
                ...inv,
                daysOverdue
            });
        });

        let list = Object.values(map);

        // Customer Dropdown filter
        if (selectedCustomer !== 'ALL') {
            list = list.filter(item => item.customerKey === selectedCustomer);
        }

        // Search Query filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(item =>
                item.customerName.toLowerCase().includes(q) ||
                item.customerId.toLowerCase().includes(q)
            );
        }

        // Sorting
        list.sort((a, b) => {
            const valA = a[sortField];
            const valB = b[sortField];

            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortOrder === 'asc'
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);
            }

            const numA = Number(valA || 0);
            const numB = Number(valB || 0);
            return sortOrder === 'asc' ? numA - numB : numB - numA;
        });

        return list;
    }, [invoices, customers, asOfDate, selectedCustomer, searchQuery, bucketConfig, sortField, sortOrder]);

    // Grand Totals
    const totals = useMemo(() => {
        return agingData.reduce(
            (acc, curr) => {
                acc.current += curr.current;
                acc.b1 += curr.b1;
                acc.b2 += curr.b2;
                acc.b3 += curr.b3;
                acc.b4 += curr.b4;
                acc.b5 += curr.b5;
                acc.total += curr.total;
                acc.invoices += curr.invoiceCount;
                return acc;
            },
            { current: 0, b1: 0, b2: 0, b3: 0, b4: 0, b5: 0, total: 0, invoices: 0 }
        );
    }, [agingData]);

    const overdueTotal = totals.b1 + totals.b2 + totals.b3 + totals.b4 + totals.b5;

    // Handlers
    const handleSort = (field: keyof CustomerAgingSummary) => {
        if (sortField === field) {
            setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const handleSaveBuckets = (e: React.FormEvent) => {
        e.preventDefault();
        setBucketConfig(tempConfig);
        setShowConfigModal(false);
        toast.success('Aging buckets updated successfully');
    };

    // Excel Export
    const handleExportExcel = () => {
        if (agingData.length === 0) {
            toast.error('No aging data available to export');
            return;
        }
        setExportingExcel(true);
        const toastId = toast.loading('Exporting Excel report...');
        try {
            const rows = agingData.map((c, idx) => ({
                'Sl No.': String(idx + 1).padStart(2, '0'),
                'Customer Code': c.customerId,
                'Customer Name': c.customerName,
                'Current / Not Due ($)': c.current,
                [`${bucketConfig.b1Min}-${bucketConfig.b1Max} Days ($)`]: c.b1,
                [`${bucketConfig.b2Min}-${bucketConfig.b2Max} Days ($)`]: c.b2,
                [`${bucketConfig.b3Min}-${bucketConfig.b3Max} Days ($)`]: c.b3,
                [`${bucketConfig.b4Min}-${bucketConfig.b4Max} Days ($)`]: c.b4,
                [`${bucketConfig.b5Min}+ Days ($)`]: c.b5,
                'Total Outstanding ($)': c.total,
                'Unpaid Invoices': c.invoiceCount
            }));

            // Totals row
            rows.push({
                'Sl No.': '',
                'Customer Code': 'TOTAL',
                'Customer Name': 'GRAND TOTALS',
                'Current / Not Due ($)': totals.current,
                [`${bucketConfig.b1Min}-${bucketConfig.b1Max} Days ($)`]: totals.b1,
                [`${bucketConfig.b2Min}-${bucketConfig.b2Max} Days ($)`]: totals.b2,
                [`${bucketConfig.b3Min}-${bucketConfig.b3Max} Days ($)`]: totals.b3,
                [`${bucketConfig.b4Min}-${bucketConfig.b4Max} Days ($)`]: totals.b4,
                [`${bucketConfig.b5Min}+ Days ($)`]: totals.b5,
                'Total Outstanding ($)': totals.total,
                'Unpaid Invoices': totals.invoices
            });

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Aging Summary');

            XLSX.writeFile(wb, `AR_Aging_Summary_${asOfDate}.xlsx`);
            toast.success('Excel exported successfully!', { id: toastId });
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to export Excel file', { id: toastId });
        } finally {
            setExportingExcel(false);
        }
    };

    // CSV Export
    const handleExportCsv = () => {
        if (agingData.length === 0) {
            toast.error('No aging data available to export');
            return;
        }
        const toastId = toast.loading('Exporting CSV report...');
        try {
            const rows = agingData.map((c, idx) => ({
                'Sl No.': String(idx + 1).padStart(2, '0'),
                'Customer Code': c.customerId,
                'Customer Name': c.customerName,
                'Current / Not Due ($)': c.current,
                [`${bucketConfig.b1Min}-${bucketConfig.b1Max} Days ($)`]: c.b1,
                [`${bucketConfig.b2Min}-${bucketConfig.b2Max} Days ($)`]: c.b2,
                [`${bucketConfig.b3Min}-${bucketConfig.b3Max} Days ($)`]: c.b3,
                [`${bucketConfig.b4Min}-${bucketConfig.b4Max} Days ($)`]: c.b4,
                [`${bucketConfig.b5Min}+ Days ($)`]: c.b5,
                'Total Outstanding ($)': c.total
            }));

            const ws = XLSX.utils.json_to_sheet(rows);
            const csvContent = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `AR_Aging_Summary_${asOfDate}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success('CSV exported successfully!', { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error('Failed to export CSV file', { id: toastId });
        }
    };

    // PDF Export
    const handleExportPdf = () => {
        if (agingData.length === 0) {
            toast.error('No aging data available to export');
            return;
        }
        setExportingPdf(true);
        const toastId = toast.loading('Generating PDF report...');
        try {
            const doc = new jsPDF('landscape');
            doc.setFontSize(16);
            doc.text('Accounts Receivable (AR) Aging Summary Report', 14, 18);
            doc.setFontSize(9);
            doc.text(`As of Date: ${asOfDate} | Generated on: ${new Date().toLocaleDateString()}`, 14, 25);

            const head = [[
                'Customer Code',
                'Customer Name',
                'Current',
                `${bucketConfig.b1Min}-${bucketConfig.b1Max} Days`,
                `${bucketConfig.b2Min}-${bucketConfig.b2Max} Days`,
                `${bucketConfig.b3Min}-${bucketConfig.b3Max} Days`,
                `${bucketConfig.b4Min}-${bucketConfig.b4Max} Days`,
                `${bucketConfig.b5Min}+ Days`,
                'Total Balance'
            ]];

            const body = agingData.map(c => [
                c.customerId,
                c.customerName,
                `$${c.current.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                `$${c.b1.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                `$${c.b2.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                `$${c.b3.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                `$${c.b4.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                `$${c.b5.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                `$${c.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
            ]);

            // Add totals row
            body.push([
                'TOTAL',
                'GRAND TOTALS',
                `$${totals.current.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                `$${totals.b1.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                `$${totals.b2.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                `$${totals.b3.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                `$${totals.b4.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                `$${totals.b5.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                `$${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
            ]);

            autoTable(doc, {
                head,
                body,
                startY: 30,
                theme: 'striped',
                headStyles: { fillColor: [200, 230, 0], textColor: [0, 0, 0] },
                styles: { fontSize: 8 }
            });

            doc.save(`AR_Aging_Summary_${asOfDate}.pdf`);
            toast.success('PDF downloaded successfully!', { id: toastId });
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to generate PDF', { id: toastId });
        } finally {
            setExportingPdf(false);
        }
    };

    return (
        <div className="container-responsive relative space-y-6 pb-12">
            <Breadcrumbs
                items={[
                    { label: 'Sales', path: '#' },
                    { label: 'Invoices', path: '/admin/financial-admin/invoices' },
                    { label: 'Aging Summary', active: true }
                ]}
            />

            {/* Header Title Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <Clock className="text-amber-500" size={22} />
                        Accounts Receivable (AR) Aging Summary
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">
                        Categorize unpaid invoice balances by days past due as of selected cutoff date.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => navigate('/admin/financial-admin/invoices')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border active:scale-95 cursor-pointer"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <ArrowLeft size={14} /> Back to Invoices
                    </button>

                    <button
                        onClick={() => { setTempConfig(bucketConfig); setShowConfigModal(true); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border active:scale-95 cursor-pointer"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        title="Configure Days Ranges"
                    >
                        <SlidersHorizontal size={14} className="text-amber-500" />
                        Configure Ranges
                    </button>

                    <button
                        onClick={fetchData}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border active:scale-95 cursor-pointer"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>

                    <button
                        onClick={handleExportExcel}
                        disabled={exportingExcel}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                        <FileSpreadsheet size={14} />
                        Excel
                    </button>

                    <button
                        onClick={handleExportCsv}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 transition-all cursor-pointer"
                    >
                        <Download size={14} />
                        CSV
                    </button>

                    <button
                        onClick={handleExportPdf}
                        disabled={exportingPdf}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                        <FileText size={14} />
                        PDF
                    </button>
                </div>
            </div>

            {/* Top KPI Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl border space-y-1.5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center justify-between text-dim text-xs font-bold">
                        <span>Total AR Outstanding</span>
                        <DollarSign size={16} className="text-emerald-500" />
                    </div>
                    <div className="text-2xl font-black" style={{ color: 'var(--brand-lime)' }}>
                        ${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-[11px] text-dim">{totals.invoices} unpaid invoice(s)</p>
                </div>

                <div className="p-4 rounded-2xl border space-y-1.5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center justify-between text-dim text-xs font-bold">
                        <span>Total Overdue AR</span>
                        <AlertTriangle size={16} className="text-rose-500" />
                    </div>
                    <div className="text-2xl font-black text-rose-500">
                        ${overdueTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-[11px] text-dim">
                        {totals.total > 0 ? ((overdueTotal / totals.total) * 100).toFixed(1) : 0}% of total AR
                    </p>
                </div>

                <div className="p-4 rounded-2xl border space-y-1.5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center justify-between text-dim text-xs font-bold">
                        <span>Current / Not Due</span>
                        <Clock size={16} className="text-blue-400" />
                    </div>
                    <div className="text-2xl font-black text-blue-400">
                        ${totals.current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-[11px] text-dim">Due in future dates</p>
                </div>

                <div className="p-4 rounded-2xl border space-y-1.5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center justify-between text-dim text-xs font-bold">
                        <span>Active Customers</span>
                        <Users size={16} className="text-amber-500" />
                    </div>
                    <div className="text-2xl font-black" style={{ color: 'var(--text-main)' }}>
                        {agingData.length}
                    </div>
                    <p className="text-[11px] text-dim">Customers with open balance</p>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="p-4 rounded-2xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="flex flex-wrap items-center gap-3 flex-1">
                    {/* As of Date Filter */}
                    <div className="flex items-center gap-2">
                        <Calendar size={15} className="text-dim" />
                        <span className="text-xs font-bold text-dim">As of Date:</span>
                        <input
                            type="date"
                            value={asOfDate}
                            onChange={e => setAsOfDate(e.target.value)}
                            className="bg-transparent border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-[#C8E600]"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>

                    {/* Customer Filter Dropdown */}
                    <div className="flex items-center gap-2 min-w-[200px]">
                        <Users size={15} className="text-dim" />
                        <span className="text-xs font-bold text-dim">Customer:</span>
                        <select
                            value={selectedCustomer}
                            onChange={e => setSelectedCustomer(e.target.value)}
                            className="flex-1 bg-transparent border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-[#C8E600]"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <option value="ALL">All Customers ({customers.length})</option>
                            {customers.map(c => (
                                <option key={c._id} value={c._id}>
                                    {c.name} ({c.customerId || '—'})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Search Input */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
                        <input
                            type="text"
                            placeholder="Search customer name or ID..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent border rounded-xl pl-9 pr-3 py-1.5 text-xs font-bold outline-none focus:border-[#C8E600]"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>
                </div>

                {/* Active Bucket Range Indicator */}
                <div className="flex items-center gap-2 text-[11px] font-bold text-dim px-3 py-1.5 rounded-xl border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                    <span className="text-amber-500 font-mono">Ranges:</span>
                    <span>Current</span> |
                    <span>{bucketConfig.b1Min}-{bucketConfig.b1Max}d</span> |
                    <span>{bucketConfig.b2Min}-{bucketConfig.b2Max}d</span> |
                    <span>{bucketConfig.b3Min}-{bucketConfig.b3Max}d</span> |
                    <span>{bucketConfig.b4Min}-{bucketConfig.b4Max}d</span> |
                    <span>{bucketConfig.b5Min}+d</span>
                </div>
            </div>

            {/* Aging Summary Table */}
            <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 z-10 font-bold border-b uppercase tracking-wider" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}>
                            <tr>
                                <th className="py-3 px-4 w-10 text-center"></th>
                                <th className="py-3 px-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('customerName')}>
                                    <div className="flex items-center gap-1">
                                        Customer Name & ID
                                        <ArrowUpDown size={12} />
                                    </div>
                                </th>
                                <th className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('current')}>
                                    <div className="flex items-center justify-end gap-1">
                                        Current
                                        <ArrowUpDown size={12} />
                                    </div>
                                </th>
                                <th className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('b1')}>
                                    <div className="flex items-center justify-end gap-1">
                                        {bucketConfig.b1Min} – {bucketConfig.b1Max} Days
                                        <ArrowUpDown size={12} />
                                    </div>
                                </th>
                                <th className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('b2')}>
                                    <div className="flex items-center justify-end gap-1">
                                        {bucketConfig.b2Min} – {bucketConfig.b2Max} Days
                                        <ArrowUpDown size={12} />
                                    </div>
                                </th>
                                <th className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('b3')}>
                                    <div className="flex items-center justify-end gap-1">
                                        {bucketConfig.b3Min} – {bucketConfig.b3Max} Days
                                        <ArrowUpDown size={12} />
                                    </div>
                                </th>
                                <th className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('b4')}>
                                    <div className="flex items-center justify-end gap-1">
                                        {bucketConfig.b4Min} – {bucketConfig.b4Max} Days
                                        <ArrowUpDown size={12} />
                                    </div>
                                </th>
                                <th className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('b5')}>
                                    <div className="flex items-center justify-end gap-1 text-rose-400">
                                        {bucketConfig.b5Min}+ Days
                                        <ArrowUpDown size={12} />
                                    </div>
                                </th>
                                <th className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('total')}>
                                    <div className="flex items-center justify-end gap-1" style={{ color: 'var(--brand-lime)' }}>
                                        Total Balance
                                        <ArrowUpDown size={12} />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y font-medium" style={{ borderColor: 'var(--border-main)' }}>
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center text-dim">
                                        <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-brand-lime" />
                                        Loading aging summary calculations...
                                    </td>
                                </tr>
                            ) : agingData.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center text-dim font-bold">
                                        No outstanding customer invoices found for the selected criteria.
                                    </td>
                                </tr>
                            ) : (
                                agingData.map((row) => {
                                    const isExpanded = expandedCustomerKey === row.customerKey;
                                    return (
                                        <React.Fragment key={row.customerKey}>
                                            <tr
                                                onClick={() => setExpandedCustomerKey(isExpanded ? null : row.customerKey)}
                                                className="hover:bg-white/5 transition-colors cursor-pointer"
                                                style={{ background: isExpanded ? 'rgba(200, 230, 0, 0.04)' : 'transparent' }}
                                            >
                                                <td className="py-3.5 px-4 text-center">
                                                    {isExpanded ? (
                                                        <ChevronDown size={16} className="text-brand-lime" />
                                                    ) : (
                                                        <ChevronRight size={16} className="text-dim" />
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <div className="font-bold text-main" style={{ color: 'var(--text-main)' }}>
                                                        {row.customerName}
                                                    </div>
                                                    <div className="text-[10px] font-mono text-dim">
                                                        ID: {row.customerId} • {row.invoiceCount} unpaid invoice(s)
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-400">
                                                    {row.current > 0 ? `$${row.current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                                                    {row.b1 > 0 ? `$${row.b1.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400">
                                                    {row.b2 > 0 ? `$${row.b2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono font-bold text-orange-400">
                                                    {row.b3 > 0 ? `$${row.b3.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-400">
                                                    {row.b4 > 0 ? `$${row.b4.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono font-bold text-red-500">
                                                    {row.b5 > 0 ? `$${row.b5.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono font-black text-sm" style={{ color: 'var(--brand-lime)' }}>
                                                    ${row.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                            </tr>

                                            {/* Expanded Detailed Invoice List */}
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={9} className="p-4 bg-black/20 border-y" style={{ borderColor: 'var(--border-main)' }}>
                                                        <div className="space-y-3 pl-6 pr-2">
                                                            <div className="flex items-center justify-between">
                                                                <h4 className="text-xs font-bold tracking-wide uppercase text-dim flex items-center gap-2">
                                                                    <FileText size={14} className="text-brand-lime" />
                                                                    Open Invoices Breakdown for {row.customerName}
                                                                </h4>
                                                                <span className="text-[11px] text-dim">
                                                                    Showing {row.invoices.length} invoice(s)
                                                                </span>
                                                            </div>

                                                            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}>
                                                                <table className="w-full text-left text-xs">
                                                                    <thead className="border-b uppercase font-bold text-[10px]" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}>
                                                                        <tr>
                                                                            <th className="py-2.5 px-3">Invoice No</th>
                                                                            <th className="py-2.5 px-3">Type</th>
                                                                            <th className="py-2.5 px-3">Due Date</th>
                                                                            <th className="py-2.5 px-3 text-center">Days Overdue</th>
                                                                            <th className="py-2.5 px-3 text-right">Billed ($)</th>
                                                                            <th className="py-2.5 px-3 text-right">Paid ($)</th>
                                                                            <th className="py-2.5 px-3 text-right">Balance ($)</th>
                                                                            <th className="py-2.5 px-3 text-center">Status</th>
                                                                            <th className="py-2.5 px-3 text-right">Action</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                                                        {row.invoices.map(inv => (
                                                                            <tr key={inv._id} className="hover:bg-white/5 transition-colors">
                                                                                <td className="py-2 px-3 font-bold font-mono text-brand-lime" style={{ color: 'var(--brand-lime)' }}>
                                                                                    {inv.invoiceNumber}
                                                                                </td>
                                                                                <td className="py-2 px-3 font-semibold uppercase text-[10px]">
                                                                                    {inv.invoiceType}
                                                                                </td>
                                                                                <td className="py-2 px-3 text-dim font-mono">
                                                                                    {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}
                                                                                </td>
                                                                                <td className="py-2 px-3 text-center font-bold">
                                                                                    {inv.daysOverdue <= 0 ? (
                                                                                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                                                            Not Due ({Math.abs(inv.daysOverdue)}d left)
                                                                                        </span>
                                                                                    ) : (
                                                                                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                                                                            +{inv.daysOverdue} Days Overdue
                                                                                        </span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="py-2 px-3 text-right font-mono">
                                                                                    ${(inv.totalAmountDue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                </td>
                                                                                <td className="py-2 px-3 text-right font-mono text-emerald-400">
                                                                                    ${(inv.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                </td>
                                                                                <td className="py-2 px-3 text-right font-mono font-bold" style={{ color: 'var(--brand-lime)' }}>
                                                                                    ${(inv.balance ?? (inv.totalAmountDue - inv.amountPaid)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                </td>
                                                                                <td className="py-2 px-3 text-center">
                                                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${inv.status === 'OVERDUE' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                                                                                        {inv.status}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="py-2 px-3 text-right">
                                                                                    <button
                                                                                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/financial-admin/invoices/${inv._id}`); }}
                                                                                        className="p-1 rounded hover:bg-white/10 text-brand-lime transition-all"
                                                                                        title="View Invoice Detail"
                                                                                    >
                                                                                        <Eye size={14} />
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </tbody>

                        {/* Grand Totals Footer */}
                        {agingData.length > 0 && (
                            <tfoot className="border-t-2 font-bold font-mono text-xs uppercase" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                <tr>
                                    <td colSpan={2} className="py-4 px-4 font-black" style={{ color: 'var(--text-main)' }}>
                                        GRAND TOTALS ({agingData.length} CUSTOMERS)
                                    </td>
                                    <td className="py-4 px-4 text-right text-blue-400">
                                        ${totals.current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-4 px-4 text-right text-emerald-400">
                                        ${totals.b1.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-4 px-4 text-right text-amber-400">
                                        ${totals.b2.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-4 px-4 text-right text-orange-400">
                                        ${totals.b3.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-4 px-4 text-right text-rose-400">
                                        ${totals.b4.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-4 px-4 text-right text-red-500">
                                        ${totals.b5.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="py-4 px-4 text-right text-sm font-black" style={{ color: 'var(--brand-lime)' }}>
                                        ${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Configure Aging Buckets Modal */}
            {showConfigModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl border p-6 space-y-6 shadow-2xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-main)' }}>
                            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                <SlidersHorizontal size={18} className="text-amber-500" />
                                Configure Aging Bucket Ranges
                            </h3>
                            <button
                                onClick={() => setShowConfigModal(false)}
                                className="p-1 rounded-lg hover:bg-white/10 text-dim"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveBuckets} className="space-y-4 text-xs font-bold">
                            <p className="text-dim font-normal text-[11px]">
                                Customize the days past due boundaries for your AR Aging Summary columns.
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-dim block mb-1">Bucket 1 Min Days</label>
                                    <input
                                        type="number"
                                        value={tempConfig.b1Min}
                                        onChange={e => setTempConfig({ ...tempConfig, b1Min: Number(e.target.value) })}
                                        className="w-full bg-transparent border rounded-xl px-3 py-2 outline-none focus:border-[#C8E600]"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-dim block mb-1">Bucket 1 Max Days</label>
                                    <input
                                        type="number"
                                        value={tempConfig.b1Max}
                                        onChange={e => setTempConfig({ ...tempConfig, b1Max: Number(e.target.value) })}
                                        className="w-full bg-transparent border rounded-xl px-3 py-2 outline-none focus:border-[#C8E600]"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-dim block mb-1">Bucket 2 Min Days</label>
                                    <input
                                        type="number"
                                        value={tempConfig.b2Min}
                                        onChange={e => setTempConfig({ ...tempConfig, b2Min: Number(e.target.value) })}
                                        className="w-full bg-transparent border rounded-xl px-3 py-2 outline-none focus:border-[#C8E600]"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-dim block mb-1">Bucket 2 Max Days</label>
                                    <input
                                        type="number"
                                        value={tempConfig.b2Max}
                                        onChange={e => setTempConfig({ ...tempConfig, b2Max: Number(e.target.value) })}
                                        className="w-full bg-transparent border rounded-xl px-3 py-2 outline-none focus:border-[#C8E600]"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-dim block mb-1">Bucket 3 Min Days</label>
                                    <input
                                        type="number"
                                        value={tempConfig.b3Min}
                                        onChange={e => setTempConfig({ ...tempConfig, b3Min: Number(e.target.value) })}
                                        className="w-full bg-transparent border rounded-xl px-3 py-2 outline-none focus:border-[#C8E600]"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-dim block mb-1">Bucket 3 Max Days</label>
                                    <input
                                        type="number"
                                        value={tempConfig.b3Max}
                                        onChange={e => setTempConfig({ ...tempConfig, b3Max: Number(e.target.value) })}
                                        className="w-full bg-transparent border rounded-xl px-3 py-2 outline-none focus:border-[#C8E600]"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-dim block mb-1">Bucket 4 Min Days</label>
                                    <input
                                        type="number"
                                        value={tempConfig.b4Min}
                                        onChange={e => setTempConfig({ ...tempConfig, b4Min: Number(e.target.value) })}
                                        className="w-full bg-transparent border rounded-xl px-3 py-2 outline-none focus:border-[#C8E600]"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-dim block mb-1">Bucket 4 Max Days</label>
                                    <input
                                        type="number"
                                        value={tempConfig.b4Max}
                                        onChange={e => setTempConfig({ ...tempConfig, b4Max: Number(e.target.value) })}
                                        className="w-full bg-transparent border rounded-xl px-3 py-2 outline-none focus:border-[#C8E600]"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-dim block mb-1">Bucket 5 Min Days (Overdue +)</label>
                                <input
                                    type="number"
                                    value={tempConfig.b5Min}
                                    onChange={e => setTempConfig({ ...tempConfig, b5Min: Number(e.target.value) })}
                                    className="w-full bg-transparent border rounded-xl px-3 py-2 outline-none focus:border-[#C8E600]"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    required
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowConfigModal(false)}
                                    className="px-4 py-2 rounded-xl border text-dim hover:text-white"
                                    style={{ borderColor: 'var(--border-main)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-xl font-black text-black"
                                    style={{ background: 'var(--brand-lime)' }}
                                >
                                    Apply Ranges
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceAgingSummary;
