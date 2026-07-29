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
    ArrowLeft,
    Clock,
    Users,
    Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getInvoicesRegistry, type Invoice } from '../../../services/invoiceService';
import { getAllCustomers, type Customer } from '../../../services/customerService';
import { getAllDebitNotes, type DebitNote } from '../../../services/debitNoteService';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

export interface DynamicAgingInterval {
    key: string;
    label: string;
    shortLabel: string;
    minDays: number;
    maxDays: number | null;
}

const getDaysOverdue = (dueDateStr?: string, asOfDateStr?: string): number => {
    if (!dueDateStr || !asOfDateStr) return 0;
    const dueClean = String(dueDateStr).split('T')[0];
    const asOfClean = String(asOfDateStr).split('T')[0];

    const dueParts = dueClean.split('-').map(Number);
    const asOfParts = asOfClean.split('-').map(Number);

    if (dueParts.length !== 3 || asOfParts.length !== 3) return 0;

    const due = new Date(dueParts[0], dueParts[1] - 1, dueParts[2]);
    const asOf = new Date(asOfParts[0], asOfParts[1] - 1, asOfParts[2]);

    const diffTime = asOf.getTime() - due.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

interface CustomerAgingSummary {
    customerKey: string;
    customerName: string;
    customerId: string;
    email?: string;
    phone?: string;
    current: number;
    buckets: Record<string, number>;
    invoiceTotal: number;
    depositDue: number;
    total: number;
    invoiceCount: number;
    debitNoteCount: number;
    invoices: (Invoice & { daysOverdue: number })[];
    debitNotes: (DebitNote & { daysOverdue: number })[];
}

export const InvoiceAgingSummary: React.FC = () => {
    const navigate = useNavigate();

    // Data States
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [debitNotes, setDebitNotes] = useState<DebitNote[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter & Config States
    const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedCustomer, setSelectedCustomer] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [docTypeFilter, setDocTypeFilter] = useState<'ALL' | 'INVOICES' | 'DEBIT_NOTES'>('ALL');
    const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

    // Aging Intervals States
    const [numIntervals, setNumIntervals] = useState<number>(4);
    const [intervalValue, setIntervalValue] = useState<number>(7);
    const [intervalUnit, setIntervalUnit] = useState<'Days' | 'Weeks' | 'Months'>('Days');

    const [tempNumIntervals, setTempNumIntervals] = useState<number>(4);
    const [tempIntervalValue, setTempIntervalValue] = useState<number>(7);
    const [tempIntervalUnit, setTempIntervalUnit] = useState<'Days' | 'Weeks' | 'Months'>('Days');

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
            const [invRes, custRes, dnRes] = await Promise.all([
                getInvoicesRegistry({ status: 'UNPAID', allTime: 'true', limit: 100000, ignoreDefaultDates: 'true' }),
                getAllCustomers({ limit: 10000 }),
                getAllDebitNotes({ limit: 100000 })
            ]);

            setInvoices(invRes.data || []);
            setCustomers(Array.isArray(custRes) ? custRes : (custRes as any)?.data || []);
            setDebitNotes(dnRes.data || []);
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

    // Active Dynamic Aging Intervals
    const activeIntervals = useMemo<DynamicAgingInterval[]>(() => {
        const effectiveDays = intervalUnit === 'Weeks'
            ? intervalValue * 7
            : (intervalUnit === 'Months' ? intervalValue * 30 : intervalValue);

        const list: DynamicAgingInterval[] = [];

        for (let i = 0; i < numIntervals; i++) {
            const minDays = i * effectiveDays + 1;
            const maxDays = (i + 1) * effectiveDays;
            list.push({
                key: `b_${i}`,
                label: `${minDays} – ${maxDays} Days`,
                shortLabel: `${minDays}-${maxDays}d`,
                minDays,
                maxDays
            });
        }

        // Plus / Overdue+ bucket
        const plusMin = numIntervals * effectiveDays + 1;
        list.push({
            key: `b_plus`,
            label: `${plusMin}+ Days`,
            shortLabel: `${plusMin}+d`,
            minDays: plusMin,
            maxDays: null
        });

        return list;
    }, [numIntervals, intervalValue, intervalUnit]);

    // Process Combined Receivable Items (Invoices + Debit Notes)
    const combinedReceivableItems = useMemo(() => {
        const items: {
            id: string;
            type: 'INVOICE' | 'DEBIT_NOTE';
            number: string;
            customerKey: string;
            customerName: string;
            customerId: string;
            email?: string;
            phone?: string;
            dueDateStr: string;
            daysOverdue: number;
            balance: number;
            category: 'DEPOSIT' | 'RENT' | 'OTHERS';
            status: string;
            rawItem: any;
        }[] = [];

        // 1. Invoices
        const activeInvoices = invoices.filter(inv => {
            if (inv.status === 'CANCELLED') return false;
            const bal = inv.balance ?? (inv.totalAmountDue - inv.amountPaid);
            return bal > 0.001;
        });

        activeInvoices.forEach(inv => {
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

            const dueStr = inv.dueDate || inv.generatedAt || inv.createdAt;
            const daysOverdue = getDaysOverdue(dueStr, asOfDate);
            const bal = inv.balance ?? (inv.totalAmountDue - inv.amountPaid);

            const typeStr = (inv.invoiceType || (inv as any).type || '').toUpperCase();
            const notesStr = (inv.notes || '').toLowerCase();
            const lineItemNames = (inv.lineItems || []).map(i => `${i.name || ''} ${i.description || ''}`.toLowerCase()).join(' ');

            let category: 'DEPOSIT' | 'RENT' | 'OTHERS' = 'RENT';
            if (typeStr === 'DEPOSIT' || notesStr.includes('deposit') || notesStr.includes('fianza') || lineItemNames.includes('deposit') || lineItemNames.includes('fianza')) {
                category = 'DEPOSIT';
            } else if (typeStr === 'RENTAL' || typeStr === 'RENT' || typeStr === 'VEHICLE_RENT' || notesStr.includes('rent') || notesStr.includes('alquiler') || notesStr.includes('cuota') || lineItemNames.includes('rent') || lineItemNames.includes('alquiler')) {
                category = 'RENT';
            } else if (typeStr === 'WORKSHOP' || notesStr.includes('workshop') || notesStr.includes('maintenance') || lineItemNames.includes('workshop') || lineItemNames.includes('repair')) {
                category = 'OTHERS';
            }

            items.push({
                id: inv._id,
                type: 'INVOICE',
                number: inv.invoiceNumber,
                customerKey: custKey,
                customerName: custName,
                customerId: custId,
                email,
                phone,
                dueDateStr: dueStr || '',
                daysOverdue,
                balance: bal,
                category,
                status: inv.status,
                rawItem: inv
            });
        });

        // 2. Debit Notes
        const activeDebitNotes = debitNotes.filter(dn => {
            if (dn.status === 'CANCELLED' || dn.status === 'VOID' || dn.status === 'CLOSED' || dn.status === 'PAID') return false;
            const bal = dn.balance !== undefined ? dn.balance : (dn.amount || 0);
            return bal > 0.001;
        });

        activeDebitNotes.forEach(dn => {
            let custName = 'Unassigned Customer / Vendor';
            let custId = '—';
            let custKey = 'unassigned';
            let email = '';
            let phone = '';

            if (dn.customerId && typeof dn.customerId === 'object') {
                custName = dn.customerId.name || 'Unknown Customer';
                custId = dn.customerId.customerId || dn.customerId._id || '—';
                custKey = dn.customerId._id || custId;
                email = dn.customerId.email || '';
                phone = dn.customerId.phone || '';
            } else if (typeof dn.customerId === 'string' && dn.customerId) {
                custKey = dn.customerId;
                const custIdStr = dn.customerId as string;
                const found = customers.find(c => c._id === custIdStr);
                if (found) {
                    custName = found.name;
                    custId = found.customerId || found._id;
                    email = found.email || '';
                    phone = found.phone || '';
                }
            } else if (dn.supplierId && typeof dn.supplierId === 'object') {
                custName = dn.supplierId.name || dn.supplierId.companyName || 'Supplier';
                custId = dn.supplierId.supplierCode || dn.supplierId._id || '—';
                custKey = dn.supplierId._id || custId;
            } else if (dn.driverId && typeof dn.driverId === 'object') {
                custName = dn.driverId.personalInfo?.fullName || 'Driver';
                custId = dn.driverId.driverId || dn.driverId._id || '—';
                custKey = dn.driverId._id || custId;
            }

            const dueStr = dn.debitNoteDate || dn.createdAt;
            const daysOverdue = getDaysOverdue(dueStr, asOfDate);
            const bal = dn.balance !== undefined ? dn.balance : (dn.amount || 0);

            const isDepositNote = (dn.isDeposit === true) || 
                (dn.debitNoteNumber && /^DP/i.test(String(dn.debitNoteNumber).trim()));
            const dnCategory: 'DEPOSIT' | 'RENT' | 'OTHERS' = isDepositNote ? 'DEPOSIT' : 'OTHERS';

            items.push({
                id: dn._id,
                type: 'DEBIT_NOTE',
                number: dn.debitNoteNumber,
                customerKey: custKey,
                customerName: custName,
                customerId: custId,
                email,
                phone,
                dueDateStr: dueStr,
                daysOverdue,
                balance: bal,
                category: dnCategory,
                status: dn.status || 'OPEN',
                rawItem: dn
            });
        });

        if (docTypeFilter === 'INVOICES') {
            return items.filter(i => i.type === 'INVOICE');
        }
        if (docTypeFilter === 'DEBIT_NOTES') {
            return items.filter(i => i.type === 'DEBIT_NOTE');
        }
        return items;
    }, [invoices, debitNotes, customers, asOfDate, docTypeFilter]);

    // Process Aging Summaries from Combined Receivables
    const agingData = useMemo(() => {
        const map: Record<string, CustomerAgingSummary> = {};

        combinedReceivableItems.forEach(item => {
            const custKey = item.customerKey;

            if (!map[custKey]) {
                const initialBuckets: Record<string, number> = {};
                activeIntervals.forEach(int => { initialBuckets[int.key] = 0; });

                map[custKey] = {
                    customerKey: custKey,
                    customerName: item.customerName,
                    customerId: item.customerId,
                    email: item.email,
                    phone: item.phone,
                    current: 0,
                    buckets: initialBuckets,
                    invoiceTotal: 0,
                    depositDue: 0,
                    total: 0,
                    invoiceCount: 0,
                    debitNoteCount: 0,
                    invoices: [],
                    debitNotes: []
                };
            }

            const bal = item.balance;
            const daysOverdue = item.daysOverdue;

            // Categorize into dynamic buckets (Current vs Overdue Buckets)
            if (daysOverdue <= 0) {
                map[custKey].current += bal;
            } else {
                let assigned = false;
                for (const int of activeIntervals) {
                    if (int.maxDays !== null) {
                        if (daysOverdue >= int.minDays && daysOverdue <= int.maxDays) {
                            map[custKey].buckets[int.key] += bal;
                            assigned = true;
                            break;
                        }
                    } else {
                        if (daysOverdue >= int.minDays) {
                            map[custKey].buckets[int.key] += bal;
                            assigned = true;
                            break;
                        }
                    }
                }
                if (!assigned && activeIntervals.length > 0) {
                    map[custKey].buckets[activeIntervals[0].key] += bal;
                }
            }

            if (item.category === 'DEPOSIT') {
                map[custKey].depositDue += bal;
            }
            if (item.type === 'INVOICE') {
                map[custKey].invoiceTotal += bal;
                map[custKey].invoiceCount += 1;
                map[custKey].invoices.push({ ...item.rawItem, daysOverdue });
            } else {
                map[custKey].debitNoteCount += 1;
                map[custKey].debitNotes.push({ ...item.rawItem, daysOverdue });
            }

            map[custKey].total += bal;
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
            let valA: any = (a as any)[sortField];
            let valB: any = (b as any)[sortField];

            if (String(sortField).startsWith('b_')) {
                valA = a.buckets[String(sortField)] || 0;
                valB = b.buckets[String(sortField)] || 0;
            }

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
    }, [combinedReceivableItems, selectedCustomer, searchQuery, activeIntervals, sortField, sortOrder]);

    // Grand Totals
    const totals = useMemo(() => {
        const initialBucketTotals: Record<string, number> = {};
        activeIntervals.forEach(int => { initialBucketTotals[int.key] = 0; });

        const result = {
            current: 0,
            buckets: initialBucketTotals,
            depositDue: 0,
            total: 0,
            invoices: 0,
            debitNotes: 0
        };

        agingData.forEach(curr => {
            result.current += curr.current;
            result.depositDue += curr.depositDue;
            result.total += curr.total;
            result.invoices += curr.invoiceCount;
            result.debitNotes += curr.debitNoteCount;
            activeIntervals.forEach(int => {
                result.buckets[int.key] = (result.buckets[int.key] || 0) + (curr.buckets[int.key] || 0);
            });
        });

        return result;
    }, [agingData, activeIntervals]);

    // KPI Metrics calculation matching exact dashboard spec (Combined Invoices + Debit Notes)
    const kpiMetrics = useMemo(() => {
        const asOf = new Date(asOfDate);
        asOf.setHours(23, 59, 59, 999);

        let totalOutstanding = 0;
        let totalOverdueBalance = 0;
        let totalWeightedDays = 0;
        let oldestDays = 0;

        let depositDue = 0;
        let rentDue = 0;
        let othersDue = 0;

        const customerMaxDays: Record<string, { maxDays: number; totalBal: number; isOverdue: boolean }> = {};

        combinedReceivableItems.forEach(item => {
            const bal = item.balance;
            totalOutstanding += bal;

            const daysOverdue = item.daysOverdue;

            if (daysOverdue > 0) {
                totalOverdueBalance += bal;
                totalWeightedDays += bal * daysOverdue;
                if (daysOverdue > oldestDays) {
                    oldestDays = daysOverdue;
                }
            }

            if (item.category === 'DEPOSIT') depositDue += bal;
            else if (item.category === 'RENT') rentDue += bal;
            else othersDue += bal;

            const custKey = item.customerKey;

            if (!customerMaxDays[custKey]) {
                customerMaxDays[custKey] = { maxDays: daysOverdue, totalBal: bal, isOverdue: daysOverdue > 0 };
            } else {
                customerMaxDays[custKey].totalBal += bal;
                if (daysOverdue > customerMaxDays[custKey].maxDays) {
                    customerMaxDays[custKey].maxDays = daysOverdue;
                }
                if (daysOverdue > 0) customerMaxDays[custKey].isOverdue = true;
            }
        });

        const customersInArrearsList = Object.values(customerMaxDays).filter(c => c.isOverdue);
        const customersInArrearsCount = customersInArrearsList.length;

        const weightedAvgDaysOverdue = totalOverdueBalance > 0
            ? (totalWeightedDays / totalOverdueBalance).toFixed(1)
            : '0.0';

        const totalForPct = totalOutstanding || 1;
        const depositPct = ((depositDue / totalForPct) * 100).toFixed(1);
        const rentPct = ((rentDue / totalForPct) * 100).toFixed(1);
        const othersPct = ((othersDue / totalForPct) * 100).toFixed(1);

        const avgPerCustomer = customersInArrearsCount > 0
            ? totalOutstanding / customersInArrearsCount
            : (agingData.length > 0 ? totalOutstanding / agingData.length : 0);

        const sortedBalances = Object.values(customerMaxDays)
            .map(c => c.totalBal)
            .sort((a, b) => b - a);

        const top70Count = Math.min(70, sortedBalances.length);
        const top70Sum = sortedBalances.slice(0, top70Count).reduce((acc, v) => acc + v, 0);
        const top70Pct = totalOutstanding > 0 ? ((top70Sum / totalOutstanding) * 100).toFixed(1) : '0.0';

        let currentBucketDrivers = 0;
        let reminderBucketDrivers = 0;
        let urgentBucketDrivers = 0;

        Object.values(customerMaxDays).forEach(c => {
            if (c.maxDays >= 1 && c.maxDays <= 7) currentBucketDrivers++;
            else if (c.maxDays >= 8 && c.maxDays <= 28) reminderBucketDrivers++;
            else if (c.maxDays >= 29) urgentBucketDrivers++;
            else currentBucketDrivers++;
        });

        return {
            totalOutstanding,
            openLinesCount: combinedReceivableItems.length,
            customersInArrearsCount,
            weightedAvgDaysOverdue,
            oldestDays,
            depositDue,
            depositPct,
            rentDue,
            rentPct,
            othersDue,
            othersPct,
            avgPerCustomer,
            top70Pct,
            top70Count,
            currentBucketDrivers,
            reminderBucketDrivers,
            urgentBucketDrivers
        };
    }, [combinedReceivableItems, asOfDate, agingData]);

    // Ageing Matrix Calculation (Balance Due & Item Count per bucket & category)
    const ageingMatrix = useMemo(() => {
        const rows = activeIntervals.map(int => ({
            key: int.key,
            label: int.label,
            shortLabel: int.shortLabel,
            depositBalance: 0,
            rentBalance: 0,
            othersBalance: 0,
            totalBalance: 0,
            pctShare: 0,
            depositCount: 0,
            rentCount: 0,
            othersCount: 0,
            totalCount: 0
        }));

        let grandTotal = 0;

        combinedReceivableItems.forEach(item => {
            const bal = item.balance;
            const days = item.daysOverdue;
            const cat = item.category; // 'DEPOSIT' | 'RENT' | 'OTHERS'

            let bucketIndex = -1;
            for (let i = 0; i < activeIntervals.length; i++) {
                const int = activeIntervals[i];
                if (i === 0) {
                    if (int.maxDays !== null && days <= int.maxDays) {
                        bucketIndex = i;
                        break;
                    }
                } else if (int.maxDays !== null) {
                    if (days >= int.minDays && days <= int.maxDays) {
                        bucketIndex = i;
                        break;
                    }
                } else {
                    if (days >= int.minDays) {
                        bucketIndex = i;
                        break;
                    }
                }
            }

            if (bucketIndex === -1 && activeIntervals.length > 0) {
                bucketIndex = 0;
            }

            if (bucketIndex >= 0 && bucketIndex < rows.length) {
                const r = rows[bucketIndex];
                grandTotal += bal;
                r.totalBalance += bal;
                r.totalCount += 1;

                if (cat === 'DEPOSIT') {
                    r.depositBalance += bal;
                    r.depositCount += 1;
                } else if (cat === 'RENT') {
                    r.rentBalance += bal;
                    r.rentCount += 1;
                } else {
                    r.othersBalance += bal;
                    r.othersCount += 1;
                }
            }
        });

        rows.forEach(r => {
            r.pctShare = grandTotal > 0 ? (r.totalBalance / grandTotal) * 100 : 0;
        });

        return {
            rows,
            grandTotalBalance: grandTotal,
            grandTotalCount: combinedReceivableItems.length
        };
    }, [combinedReceivableItems, activeIntervals]);

    // Handlers
    const handleSort = (field: keyof CustomerAgingSummary) => {
        if (sortField === field) {
            setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const handleSaveIntervals = (e: React.FormEvent) => {
        e.preventDefault();
        setNumIntervals(tempNumIntervals);
        setIntervalValue(tempIntervalValue);
        setIntervalUnit(tempIntervalUnit);
        setShowConfigModal(false);
        toast.success(`Aging buckets set to ${tempNumIntervals} X ${tempIntervalValue} ${tempIntervalUnit}`);
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
            const rows = agingData.map((c, idx) => {
                const rowObj: Record<string, any> = {
                    'Sl No.': String(idx + 1).padStart(2, '0'),
                    'Customer Code': c.customerId,
                    'Customer Name': c.customerName,
                    'Current / Not Due ($)': c.current
                };

                activeIntervals.forEach(int => {
                    rowObj[`${int.label} ($)`] = c.buckets[int.key] || 0;
                });

                rowObj['Deposit Due ($)'] = c.depositDue;
                rowObj['Total Outstanding ($)'] = c.total;
                rowObj['Unpaid Invoices'] = c.invoiceCount;
                rowObj['Debit Notes'] = c.debitNoteCount;
                return rowObj;
            });

            // Totals row
            const totalObj: Record<string, any> = {
                'Sl No.': '',
                'Customer Code': 'TOTAL',
                'Customer Name': 'GRAND TOTALS',
                'Current / Not Due ($)': totals.current
            };

            activeIntervals.forEach(int => {
                totalObj[`${int.label} ($)`] = totals.buckets[int.key] || 0;
            });

            totalObj['Deposit Due ($)'] = totals.depositDue;
            totalObj['Total Outstanding ($)'] = totals.total;
            totalObj['Unpaid Invoices'] = totals.invoices;
            totalObj['Debit Notes'] = totals.debitNotes;

            rows.push(totalObj);

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
            const rows = agingData.map((c, idx) => {
                const rowObj: Record<string, any> = {
                    'Sl No.': String(idx + 1).padStart(2, '0'),
                    'Customer Code': c.customerId,
                    'Customer Name': c.customerName,
                    'Current / Not Due ($)': c.current
                };

                activeIntervals.forEach(int => {
                    rowObj[`${int.label} ($)`] = c.buckets[int.key] || 0;
                });

                rowObj['Deposit Due ($)'] = c.depositDue;
                rowObj['Total Outstanding ($)'] = c.total;
                return rowObj;
            });

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
            const pageWidth = doc.internal.pageSize.getWidth();

            // Header Title
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42); // slate-900
            doc.text('Accounts Receivable (AR) Aging Summary Report', 14, 14);

            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139); // slate-500
            doc.text(`As of Date: ${asOfDate} | Aging Buckets: ${numIntervals} X ${intervalValue} ${intervalUnit} | Source: ${docTypeFilter}`, 14, 20);

            let currentY = 24;

            // 1. TOP KPIS SUMMARY TABLE
            const kpiHead1 = ['TOTAL OUTSTANDING', 'CUSTOMERS IN ARREARS', 'WEIGHTED AVG OVERDUE', 'OLDEST OVERDUE'];
            const kpiBody1 = [
                `$${kpiMetrics.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                `${kpiMetrics.customersInArrearsCount} drivers`,
                `${kpiMetrics.weightedAvgDaysOverdue} days`,
                `${kpiMetrics.oldestDays} days`
            ];
            const kpiHead2 = ['DEPOSIT DUE', 'RENT DUE', 'OTHERS DUE', 'AVG / CUSTOMER'];
            const kpiBody2 = [
                `$${kpiMetrics.depositDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${kpiMetrics.depositPct}%)`,
                `$${kpiMetrics.rentDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${kpiMetrics.rentPct}%)`,
                `$${kpiMetrics.othersDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${kpiMetrics.othersPct}%)`,
                `$${kpiMetrics.avgPerCustomer.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            ];

            autoTable(doc, {
                startY: currentY,
                head: [kpiHead1],
                body: [kpiBody1, kpiHead2, kpiBody2],
                theme: 'grid',
                headStyles: { fillColor: [13, 71, 161], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5, halign: 'center' },
                bodyStyles: { fontSize: 7.5, fontStyle: 'bold', halign: 'center' },
                styles: { cellPadding: 1.8 }
            });

            currentY = (doc as any).lastAutoTable.finalY + 5;

            // 2. AGEING MATRIX SECTION (SIDE-BY-SIDE TABLES)
            doc.setFontSize(9.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(13, 71, 161);
            doc.text('AGEING MATRIX ANALYSIS', 14, currentY);
            currentY += 3;

            // Left Matrix Table: Balance Due
            const matrixBalHead = [['Bucket', 'Deposit', 'Rent', 'Others', 'Total (USD)', '% Share']];
            const matrixBalBody = ageingMatrix.rows.map(r => [
                r.shortLabel || r.label,
                r.depositBalance > 0 ? `$${r.depositBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
                r.rentBalance > 0 ? `$${r.rentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
                r.othersBalance > 0 ? `$${r.othersBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—',
                `$${r.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                `${r.pctShare.toFixed(1)}%`
            ]);

            autoTable(doc, {
                startY: currentY,
                tableWidth: 133,
                margin: { left: 14 },
                head: matrixBalHead,
                body: matrixBalBody,
                theme: 'striped',
                headStyles: { fillColor: [21, 101, 192], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
                styles: { fontSize: 7, cellPadding: 1.6 },
                columnStyles: {
                    0: { fontStyle: 'bold' },
                    1: { halign: 'right' },
                    2: { halign: 'right' },
                    3: { halign: 'right' },
                    4: { halign: 'right', fontStyle: 'bold' },
                    5: { halign: 'right' }
                }
            });
            const leftFinalY = (doc as any).lastAutoTable.finalY;

            // Right Matrix Table: Item Count
            const matrixCntHead = [['Bucket', 'Deposit', 'Rent', 'Others', 'Total Items']];
            const matrixCntBody = ageingMatrix.rows.map(r => [
                r.shortLabel || r.label,
                r.depositCount > 0 ? String(r.depositCount) : '—',
                r.rentCount > 0 ? String(r.rentCount) : '—',
                r.othersCount > 0 ? String(r.othersCount) : '—',
                String(r.totalCount)
            ]);

            autoTable(doc, {
                startY: currentY,
                tableWidth: 133,
                margin: { left: 150 },
                head: matrixCntHead,
                body: matrixCntBody,
                theme: 'striped',
                headStyles: { fillColor: [21, 101, 192], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
                styles: { fontSize: 7, cellPadding: 1.6 },
                columnStyles: {
                    0: { fontStyle: 'bold' },
                    1: { halign: 'right' },
                    2: { halign: 'right' },
                    3: { halign: 'right' },
                    4: { halign: 'right', fontStyle: 'bold' }
                }
            });
            const rightFinalY = (doc as any).lastAutoTable.finalY;

            currentY = Math.max(leftFinalY, rightFinalY) + 5;

            // 3. DETAILED CUSTOMER AGING SUMMARY TABLE
            doc.setFontSize(9.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(13, 71, 161);
            doc.text('CUSTOMER AGING SUMMARY BREAKDOWN', 14, currentY);
            currentY += 3;

            const head = [[
                'Customer Code',
                'Customer Name',
                'Current',
                ...activeIntervals.map(int => int.label),
                'Deposit Due',
                'Total Balance'
            ]];

            const body = agingData.map(c => [
                c.customerId,
                c.customerName,
                `$${c.current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                ...activeIntervals.map(int => `$${(c.buckets[int.key] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`),
                `$${c.depositDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                `$${c.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            ]);

            const totalsRow = [
                'TOTALS',
                `Grand Total (${agingData.length} Customers)`,
                `$${totals.current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                ...activeIntervals.map(int => `$${(totals.buckets[int.key] || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`),
                `$${totals.depositDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                `$${totals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            ];

            autoTable(doc, {
                startY: currentY,
                head,
                body: [...body, totalsRow],
                theme: 'striped',
                headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7 },
                styles: { fontSize: 6.8, cellPadding: 1.5 },
                columnStyles: {
                    0: { fontStyle: 'bold' },
                    2: { halign: 'right' },
                    3: { halign: 'right' },
                    4: { halign: 'right' },
                    5: { halign: 'right' },
                    6: { halign: 'right' },
                    7: { halign: 'right', fontStyle: 'bold' }
                }
            });

            // Page numbers in footer
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(148, 163, 184);
                doc.text(
                    `Page ${i} of ${pageCount} — AR Aging Summary Report — Generated on ${new Date().toLocaleString()}`,
                    pageWidth / 2,
                    doc.internal.pageSize.getHeight() - 6,
                    { align: 'center' }
                );
            }

            doc.save(`AR_Aging_Summary_${asOfDate}.pdf`);
            toast.success('PDF exported successfully!', { id: toastId });
        } catch (err: any) {
            console.error(err);
            toast.error('Failed to export PDF file', { id: toastId });
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
                        onClick={() => {
                            setTempNumIntervals(numIntervals);
                            setTempIntervalValue(intervalValue);
                            setTempIntervalUnit(intervalUnit);
                            setShowConfigModal(true);
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border active:scale-95 cursor-pointer"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        title="Configure Aging Intervals"
                    >
                        <Calendar size={15} className="text-dim" />
                        <span>Aging Intervals : <strong className="text-[var(--text-main)] font-black">{numIntervals} X {intervalValue} {intervalUnit}</strong></span>
                        <ChevronDown size={14} className="text-dim" />
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

            {/* Top KPI Metrics Cards - 3 Row Dashboard Specification */}
            <div className="space-y-3">
                {/* Row 1 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Card 1: TOTAL OUTSTANDING */}
                    <div className="p-4 rounded-2xl shadow-md text-white flex flex-col justify-between min-h-[105px]" style={{ background: '#0D47A1' }}>
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-white/80">TOTAL OUTSTANDING (USD)</div>
                        <div className="text-2xl font-black tracking-tight my-1">
                            ${kpiMetrics.totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] font-medium text-white/70">Across {kpiMetrics.openLinesCount} open lines</div>
                    </div>

                    {/* Card 2: CUSTOMERS IN ARREARS */}
                    <div className="p-4 rounded-2xl shadow-md text-white flex flex-col justify-between min-h-[105px]" style={{ background: '#1565C0' }}>
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-white/80">CUSTOMERS IN ARREARS</div>
                        <div className="text-2xl font-black tracking-tight my-1">{kpiMetrics.customersInArrearsCount}</div>
                        <div className="text-[11px] font-medium text-white/70">Unique drivers with overdue balance</div>
                    </div>

                    {/* Card 3: WEIGHTED AVG DAYS OVERDUE */}
                    <div className="p-4 rounded-2xl shadow-md text-white flex flex-col justify-between min-h-[105px]" style={{ background: '#005B52' }}>
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-white/80">WEIGHTED AVG DAYS OVERDUE</div>
                        <div className="text-2xl font-black tracking-tight my-1">{kpiMetrics.weightedAvgDaysOverdue}</div>
                        <div className="text-[11px] font-medium text-white/70">Balance-weighted average age</div>
                    </div>

                    {/* Card 4: OLDEST OUTSTANDING (DAYS) */}
                    <div className="p-4 rounded-2xl shadow-md text-white flex flex-col justify-between min-h-[105px]" style={{ background: '#B71C1C' }}>
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-white/80">OLDEST OUTSTANDING (DAYS)</div>
                        <div className="text-2xl font-black tracking-tight my-1">{kpiMetrics.oldestDays}</div>
                        <div className="text-[11px] font-medium text-white/70">Longest running overdue item</div>
                    </div>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Card 5: DEPOSIT DUE */}
                    <div className="p-4 rounded-2xl shadow-md text-white flex flex-col justify-between min-h-[105px]" style={{ background: '#1565C0' }}>
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-white/80">DEPOSIT DUE (USD)</div>
                        <div className="text-2xl font-black tracking-tight my-1">
                            ${kpiMetrics.depositDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] font-medium text-white/70">{kpiMetrics.depositPct}% of total</div>
                    </div>

                    {/* Card 6: RENT DUE */}
                    <div className="p-4 rounded-2xl shadow-md text-white flex flex-col justify-between min-h-[105px]" style={{ background: '#1B5E20' }}>
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-white/80">RENT DUE (USD)</div>
                        <div className="text-2xl font-black tracking-tight my-1">
                            ${kpiMetrics.rentDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] font-medium text-white/70">{kpiMetrics.rentPct}% of total</div>
                    </div>

                    {/* Card 7: OTHERS DUE */}
                    <div className="p-4 rounded-2xl shadow-md text-white flex flex-col justify-between min-h-[105px]" style={{ background: '#E65100' }}>
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-white/80">OTHERS DUE (USD)</div>
                        <div className="text-2xl font-black tracking-tight my-1">
                            ${kpiMetrics.othersDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] font-medium text-white/70">{kpiMetrics.othersPct}% of total</div>
                    </div>

                    {/* Card 8: AVG OUTSTANDING / CUSTOMER */}
                    <div className="p-4 rounded-2xl shadow-md text-white flex flex-col justify-between min-h-[105px]" style={{ background: '#512DA8' }}>
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-white/80">AVG OUTSTANDING / CUSTOMER</div>
                        <div className="text-2xl font-black tracking-tight my-1">
                            ${kpiMetrics.avgPerCustomer.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[11px] font-medium text-white/70">Top-70 = {kpiMetrics.top70Pct}% of book</div>
                    </div>
                </div>

                {/* Row 3: Segmented Row Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 rounded-2xl overflow-hidden shadow-sm gap-0.5 sm:gap-1 bg-black/20 p-1">
                    {/* Segment 1: CURRENT */}
                    <div className="p-3 text-white flex flex-col items-center justify-center rounded-xl" style={{ background: '#1B5E20' }}>
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-white/90">CURRENT (1-7 DAYS)</div>
                        <div className="text-xl font-black text-white mt-1">{kpiMetrics.currentBucketDrivers} drivers</div>
                    </div>

                    {/* Segment 2: REMINDER */}
                    <div className="p-3 text-white flex flex-col items-center justify-center rounded-xl" style={{ background: '#0D47A1' }}>
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-white/90">REMINDER (8-28 DAYS)</div>
                        <div className="text-xl font-black text-white mt-1">{kpiMetrics.reminderBucketDrivers} drivers</div>
                    </div>

                    {/* Segment 3: URGENT */}
                    <div className="p-3 text-white flex flex-col items-center justify-center rounded-xl" style={{ background: '#B71C1C' }}>
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-white/90 flex items-center gap-1">
                            <span>🚨</span> URGENT (29+ DAYS)
                        </div>
                        <div className="text-xl font-black text-white mt-1">{kpiMetrics.urgentBucketDrivers} drivers</div>
                    </div>

                    {/* Segment 4: TOP-70 CONCENTRATION */}
                    <div className="p-3 text-white flex flex-col items-center justify-center rounded-xl" style={{ background: '#E65100' }}>
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-white/90">TOP-70 CONCENTRATION</div>
                        <div className="text-xl font-black text-white mt-1">{kpiMetrics.top70Pct}%</div>
                    </div>
                </div>
            </div>

            {/* Ageing Matrix Section — Balance Due & Item Count side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left Card: AGEING MATRIX — BALANCE DUE (USD) */}
                <div className="rounded-2xl border overflow-hidden shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="px-4 py-3 bg-gradient-to-r from-[#0D47A1] to-[#1565C0] text-white flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-white/80 animate-pulse"></span>
                            • AGEING MATRIX — BALANCE DUE (USD)
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="border-b uppercase font-bold text-[10px]" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}>
                                <tr>
                                    <th className="py-2.5 px-3">Bucket</th>
                                    <th className="py-2.5 px-3 text-right">Deposit</th>
                                    <th className="py-2.5 px-3 text-right">Rent</th>
                                    <th className="py-2.5 px-3 text-right">Others</th>
                                    <th className="py-2.5 px-3 text-right font-black">Total (USD)</th>
                                    <th className="py-2.5 px-3 text-right">% Share</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y font-mono text-xs" style={{ borderColor: 'var(--border-main)' }}>
                                {ageingMatrix.rows.map((r, idx) => {
                                    const pillColors = [
                                        'bg-blue-500/10 text-blue-400 border-blue-500/20',
                                        'bg-sky-500/10 text-sky-400 border-sky-500/20',
                                        'bg-amber-500/10 text-amber-400 border-amber-500/20',
                                        'bg-orange-500/10 text-orange-400 border-orange-500/20',
                                        'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                    ];
                                    const pillColor = pillColors[idx % pillColors.length];

                                    return (
                                        <tr key={r.key} className="hover:bg-white/5 transition-colors">
                                            <td className="py-2.5 px-3 font-sans">
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${pillColor}`}>
                                                    {r.shortLabel || r.label}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-bold text-blue-400">
                                                {r.depositBalance > 0 ? `$${r.depositBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                                                {r.rentBalance > 0 ? `$${r.rentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-bold text-orange-400">
                                                {r.othersBalance > 0 ? `$${r.othersBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-black text-white">
                                                ${r.totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-2.5 px-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <div className="w-12 bg-white/10 h-1.5 rounded-full overflow-hidden hidden sm:block">
                                                        <div className="bg-blue-400 h-full rounded-full" style={{ width: `${Math.min(100, r.pctShare)}%` }}></div>
                                                    </div>
                                                    <span className="font-bold text-dim text-[11px]">{r.pctShare.toFixed(1)}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Card: AGEING MATRIX — ITEM COUNT */}
                <div className="rounded-2xl border overflow-hidden shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="px-4 py-3 bg-gradient-to-r from-[#0D47A1] to-[#1565C0] text-white flex items-center justify-between">
                        <div className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-white/80 animate-pulse"></span>
                            • AGEING MATRIX — ITEM COUNT
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="border-b uppercase font-bold text-[10px]" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}>
                                <tr>
                                    <th className="py-2.5 px-3">Bucket</th>
                                    <th className="py-2.5 px-3 text-right">Deposit</th>
                                    <th className="py-2.5 px-3 text-right">Rent</th>
                                    <th className="py-2.5 px-3 text-right">Others</th>
                                    <th className="py-2.5 px-3 text-right font-black">Total Items</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y font-mono text-xs" style={{ borderColor: 'var(--border-main)' }}>
                                {ageingMatrix.rows.map((r, idx) => {
                                    const pillColors = [
                                        'bg-blue-500/10 text-blue-400 border-blue-500/20',
                                        'bg-sky-500/10 text-sky-400 border-sky-500/20',
                                        'bg-amber-500/10 text-amber-400 border-amber-500/20',
                                        'bg-orange-500/10 text-orange-400 border-orange-500/20',
                                        'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                    ];
                                    const pillColor = pillColors[idx % pillColors.length];

                                    return (
                                        <tr key={r.key} className="hover:bg-white/5 transition-colors">
                                            <td className="py-2.5 px-3 font-sans">
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${pillColor}`}>
                                                    {r.shortLabel || r.label}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-bold text-blue-400">
                                                {r.depositCount > 0 ? r.depositCount : '—'}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                                                {r.rentCount > 0 ? r.rentCount : '—'}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-bold text-orange-400">
                                                {r.othersCount > 0 ? r.othersCount : '—'}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-black text-white">
                                                {r.totalCount}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
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

                    {/* Document Source Filter (Combined / Invoices / Debit Notes) */}
                    <div className="flex items-center gap-2">
                        <FileText size={15} className="text-amber-400" />
                        <span className="text-xs font-bold text-dim">Source:</span>
                        <select
                            value={docTypeFilter}
                            onChange={e => setDocTypeFilter(e.target.value as any)}
                            className="bg-transparent border rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-[#C8E600] cursor-pointer"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <option value="ALL">Combined (Invoices & Debit Notes)</option>
                            <option value="INVOICES">Invoices Only</option>
                            <option value="DEBIT_NOTES">Debit Notes Only</option>
                        </select>
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
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-dim px-3 py-1.5 rounded-xl border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                    <span className="text-amber-500 font-mono">Ranges:</span>
                    <span>Current</span> |
                    {activeIntervals.map((int, idx) => (
                        <React.Fragment key={int.key}>
                            <span>{int.shortLabel}</span>
                            {idx < activeIntervals.length - 1 && ' | '}
                        </React.Fragment>
                    ))}
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
                                {activeIntervals.map(int => (
                                    <th key={int.key} className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort(int.key as any)}>
                                        <div className={`flex items-center justify-end gap-1 ${int.maxDays === null ? 'text-rose-400' : ''}`}>
                                            {int.label}
                                            <ArrowUpDown size={12} />
                                        </div>
                                    </th>
                                ))}
                                <th className="py-3 px-4 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('depositDue')}>
                                    <div className="flex items-center justify-end gap-1 text-amber-400">
                                        Deposit Due
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
                                    <td colSpan={5 + activeIntervals.length} className="py-12 text-center text-dim">
                                        <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-brand-lime" />
                                        Loading aging summary calculations...
                                    </td>
                                </tr>
                            ) : agingData.length === 0 ? (
                                <tr>
                                    <td colSpan={5 + activeIntervals.length} className="py-12 text-center text-dim font-bold">
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
                                                        ID: {row.customerId} • {row.invoiceCount} invoice(s) • {row.debitNoteCount} debit note(s)
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-400">
                                                    {row.current > 0 ? `$${row.current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                                </td>
                                                {activeIntervals.map((int, idx) => {
                                                    const amt = row.buckets[int.key] || 0;
                                                    const colorClasses = ['text-emerald-400', 'text-amber-400', 'text-orange-400', 'text-rose-400', 'text-red-500'];
                                                    const colorClass = colorClasses[idx % colorClasses.length];
                                                    return (
                                                        <td key={int.key} className={`py-3.5 px-4 text-right font-mono font-bold ${colorClass}`}>
                                                            {amt > 0 ? `$${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                                        </td>
                                                    );
                                                })}
                                                <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400">
                                                    {row.depositDue > 0 ? `$${row.depositDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono font-black text-sm" style={{ color: 'var(--brand-lime)' }}>
                                                    ${row.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                            </tr>

                                            {/* Expanded Detailed Invoice & Debit Note List */}
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={5 + activeIntervals.length} className="p-4 bg-black/20 border-y space-y-4" style={{ borderColor: 'var(--border-main)' }}>
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
                                                                        {row.invoices.length === 0 ? (
                                                                            <tr>
                                                                                <td colSpan={9} className="py-4 text-center text-dim font-bold">No open invoices for this customer.</td>
                                                                            </tr>
                                                                        ) : (
                                                                            row.invoices.map(inv => (
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
                                                                            ))
                                                                        )}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>

                                                        {/* Debit Notes Deposit Breakdown */}
                                                        {row.debitNotes && row.debitNotes.length > 0 && (
                                                            <div className="space-y-3 pl-6 pr-2 pt-2">
                                                                <div className="flex items-center justify-between">
                                                                    <h4 className="text-xs font-bold tracking-wide uppercase text-dim flex items-center gap-2">
                                                                        <FileText size={14} className="text-amber-400" />
                                                                        Deposit Debit Notes Breakdown for {row.customerName}
                                                                    </h4>
                                                                    <span className="text-[11px] text-dim">
                                                                        Showing {row.debitNotes.length} debit note(s)
                                                                    </span>
                                                                </div>

                                                                <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}>
                                                                    <table className="w-full text-left text-xs">
                                                                        <thead className="border-b uppercase font-bold text-[10px]" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}>
                                                                            <tr>
                                                                                <th className="py-2.5 px-3">DN Number</th>
                                                                                <th className="py-2.5 px-3">Date</th>
                                                                                <th className="py-2.5 px-3">Reason</th>
                                                                                <th className="py-2.5 px-3 text-right">Amount ($)</th>
                                                                                <th className="py-2.5 px-3 text-right">Paid ($)</th>
                                                                                <th className="py-2.5 px-3 text-right">Deposit Balance ($)</th>
                                                                                <th className="py-2.5 px-3 text-center">Status</th>
                                                                                <th className="py-2.5 px-3 text-right">Action</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                                                            {row.debitNotes.map(dn => (
                                                                                <tr key={dn._id} className="hover:bg-white/5 transition-colors">
                                                                                    <td className="py-2 px-3 font-bold font-mono text-amber-400">
                                                                                        {dn.debitNoteNumber}
                                                                                    </td>
                                                                                    <td className="py-2 px-3 text-dim font-mono">
                                                                                        {dn.debitNoteDate ? new Date(dn.debitNoteDate).toLocaleDateString() : '—'}
                                                                                    </td>
                                                                                    <td className="py-2 px-3 text-dim font-medium">
                                                                                        {dn.reason || 'Deposit Charge'}
                                                                                    </td>
                                                                                    <td className="py-2 px-3 text-right font-mono">
                                                                                        ${(dn.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                    </td>
                                                                                    <td className="py-2 px-3 text-right font-mono text-emerald-400">
                                                                                        ${(dn.amountPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                    </td>
                                                                                    <td className="py-2 px-3 text-right font-mono font-bold text-amber-400">
                                                                                        ${(dn.balance !== undefined ? dn.balance : (dn.amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                    </td>
                                                                                    <td className="py-2 px-3 text-center">
                                                                                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                                                            {dn.status || 'OPEN'}
                                                                                        </span>
                                                                                    </td>
                                                                                    <td className="py-2 px-3 text-right">
                                                                                        <button
                                                                                            onClick={(e) => { e.stopPropagation(); navigate(`/admin/finance/sales/debit-notes/${dn._id}`); }}
                                                                                            className="p-1 rounded hover:bg-white/10 text-amber-400 transition-all"
                                                                                            title="View Debit Note Detail"
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
                                                        )}
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
                                    {activeIntervals.map((int, idx) => {
                                        const amt = totals.buckets[int.key] || 0;
                                        const colorClasses = ['text-emerald-400', 'text-amber-400', 'text-orange-400', 'text-rose-400', 'text-red-500'];
                                        const colorClass = colorClasses[idx % colorClasses.length];
                                        return (
                                            <td key={int.key} className={`py-4 px-4 text-right ${colorClass}`}>
                                                ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        );
                                    })}
                                    <td className="py-4 px-4 text-right text-amber-400 font-black">
                                        ${totals.depositDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            {/* Aging Intervals Config Popover Modal */}
            {showConfigModal && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                    <div className="relative w-full max-w-xs rounded-2xl border shadow-2xl p-5 space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-main)' }}>
                            <h3 className="text-sm font-bold tracking-wide" style={{ color: 'var(--text-main)' }}>Aging Intervals</h3>
                            <button
                                onClick={() => setShowConfigModal(false)}
                                className="text-dim hover:text-white transition-colors cursor-pointer text-xs font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveIntervals} className="space-y-4">
                            {/* Select Number of Intervals */}
                            <div className="space-y-1">
                                <select
                                    value={tempNumIntervals}
                                    onChange={e => setTempNumIntervals(Number(e.target.value))}
                                    className="w-full bg-transparent border rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#C8E600] cursor-pointer"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value={3} className="bg-[var(--bg-card)]">3</option>
                                    <option value={4} className="bg-[var(--bg-card)]">4</option>
                                    <option value={5} className="bg-[var(--bg-card)]">5</option>
                                    <option value={6} className="bg-[var(--bg-card)]">6</option>
                                </select>
                            </div>

                            {/* Intervals of */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-dim block">Intervals of</label>
                                <div className="flex items-center rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                                    <input
                                        type="number"
                                        min={1}
                                        max={365}
                                        value={tempIntervalValue}
                                        onChange={e => setTempIntervalValue(Math.max(1, Number(e.target.value)))}
                                        className="w-full bg-transparent px-3 py-2 text-sm font-bold outline-none border-r"
                                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        required
                                    />
                                    <select
                                        value={tempIntervalUnit}
                                        onChange={e => setTempIntervalUnit(e.target.value as any)}
                                        className="bg-transparent px-3 py-2 text-sm font-bold outline-none cursor-pointer"
                                        style={{ color: 'var(--text-main)' }}
                                    >
                                        <option value="Days" className="bg-[var(--bg-card)]">Days</option>
                                        <option value="Weeks" className="bg-[var(--bg-card)]">Weeks</option>
                                        <option value="Months" className="bg-[var(--bg-card)]">Months</option>
                                    </select>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl font-bold text-xs text-white bg-[#10B981] hover:bg-[#059669] transition-all cursor-pointer shadow-md"
                                >
                                    Apply
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowConfigModal(false)}
                                    className="px-4 py-2 rounded-xl border text-xs font-bold text-dim hover:text-white transition-all cursor-pointer"
                                    style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}
                                >
                                    Cancel
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
