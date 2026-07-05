import { useState, useEffect } from 'react';
import { 
    FileText, Download, RefreshCw, Loader2, Calendar, Building, 
    TrendingUp, Shield, BarChart3, Users, DollarSign, Activity, 
    CheckCircle2, AlertCircle, FileSpreadsheet, ClipboardList, Briefcase, Car, Landmark
} from 'lucide-react';
import { 
    getDailyFinanceReport, 
    getDriverPerformanceReport, 
    getStaffPerformanceReport, 
    getPLReport, 
    getBalanceSheetReport, 
    getBankBalanceSheetReport,
    downloadExcelReport 
} from '../../../services/reportingService';
import { getAllBranches } from '../../../services/branchService';
import { getInvoices } from '../../../services/invoiceService';
import { getAllCustomers } from '../../../services/customerService';
import { getAllCreditNotes } from '../../../services/creditNoteService';
import { getAllSuppliers } from '../../../services/supplierService';
import { getAllBills } from '../../../services/billService';
import { getLedgerEntries } from '../../../services/ledgerService';
import * as XLSX from 'xlsx';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import api from '../../../services/api';
import toast from 'react-hot-toast';

type ReportCategory = 'financial' | 'sales' | 'operations' | 'raw';

interface ReportType {
    id: string;
    name: string;
    category: ReportCategory;
    icon: React.ReactNode;
    description: string;
    supportsPdf: boolean;
    supportsExcel: boolean;
}

export const ReportsPage = () => {
    const [selectedReport, setSelectedReport] = useState<string>('pl');
    const [loading, setLoading] = useState<boolean>(false);
    const [exporting, setExporting] = useState<boolean>(false);
    const [branches, setBranches] = useState<any[]>([]);
    const [reportData, setReportData] = useState<any>(null);

    const getReportList = (data: any): any[] => {
        if (!data) return [];
        if (Array.isArray(data)) return data;
        if (data.data && Array.isArray(data.data)) return data.data;
        return [];
    };

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
        endDate: getToday(),
        bankAccount: ''
    });

    const reportTypes: ReportType[] = [
        // 1. Financial Intelligence
        { 
            id: 'pl', 
            name: 'Profit & Loss (P&L)', 
            category: 'financial', 
            icon: <TrendingUp size={15} />, 
            description: 'Income statement summarizing revenues, costs, and expenses.',
            supportsPdf: true,
            supportsExcel: true 
        },
        { 
            id: 'balance-sheet', 
            name: 'Balance Sheet', 
            category: 'financial', 
            icon: <Shield size={15} />, 
            description: 'Financial snapshot of assets, liabilities, and equity.',
            supportsPdf: true,
            supportsExcel: true 
        },
        { 
            id: 'bank-balance-sheet', 
            name: 'Bank Balance Sheet', 
            category: 'financial', 
            icon: <Landmark size={15} />, 
            description: 'Liquid positions showing Cash/Bank transactions and running balances.',
            supportsPdf: false,
            supportsExcel: true 
        },
        { 
            id: 'daily-finance', 
            name: 'Daily Finance Report', 
            category: 'financial', 
            icon: <DollarSign size={15} />, 
            description: 'Day-by-day cash flow ledger of income and expenses.',
            supportsPdf: true,
            supportsExcel: true 
        },
        { 
            id: 'ledger-report', 
            name: 'General Ledger Report', 
            category: 'financial', 
            icon: <ClipboardList size={15} />, 
            description: 'Aggregated journal entry transactions and postings.',
            supportsPdf: true,
            supportsExcel: true 
        },
        { 
            id: 'bills-report', 
            name: 'Bills Report', 
            category: 'financial', 
            icon: <FileText size={15} />, 
            description: 'Record of all vendor bills, payouts, and balances.',
            supportsPdf: true,
            supportsExcel: true 
        },

        // 2. Sales & Receivables
        { 
            id: 'invoices-report', 
            name: 'Invoice Report', 
            category: 'sales', 
            icon: <FileSpreadsheet size={15} />, 
            description: 'Registry of customer invoices, payments, and overdue balances.',
            supportsPdf: true,
            supportsExcel: true 
        },
        { 
            id: 'payments-received-report', 
            name: 'Payments Received', 
            category: 'sales', 
            icon: <DollarSign size={15} />, 
            description: 'Inflow receipts collected from customers and drivers.',
            supportsPdf: true,
            supportsExcel: true 
        },
        { 
            id: 'customer-report', 
            name: 'Customer Directory', 
            category: 'sales', 
            icon: <Users size={15} />, 
            description: 'List of registered customers, contact coordinates, and status.',
            supportsPdf: true,
            supportsExcel: true 
        },
        { 
            id: 'credit-notes-report', 
            name: 'Credit Notes', 
            category: 'sales', 
            icon: <FileText size={15} />, 
            description: 'Adjustments and refunds issued to customer invoices.',
            supportsPdf: true,
            supportsExcel: true 
        },

        // 3. Assets & Operations
        { 
            id: 'driver-performance', 
            name: 'Driver Performance', 
            category: 'operations', 
            icon: <Activity size={15} />, 
            description: 'Overview of speed, driving score, and rent balance of active drivers.',
            supportsPdf: true,
            supportsExcel: true 
        },
        /* { 
            id: 'staff-performance', 
            name: 'Staff Onboarding', 
            category: 'operations', 
            icon: <Users size={15} />, 
            description: 'Metrics on driver/vehicle onboarding times and task completions.',
            supportsPdf: true,
            supportsExcel: true 
        }, */
        { 
            id: 'vehicle-report', 
            name: 'Vehicle Inventory', 
            category: 'operations', 
            icon: <Car size={15} />, 
            description: 'Current fleet registry status, plate details, and assignments.',
            supportsPdf: true,
            supportsExcel: true 
        },
        { 
            id: 'vendor-report', 
            name: 'Vendor Directory', 
            category: 'operations', 
            icon: <Briefcase size={15} />, 
            description: 'Directory of registered vendors, contractors, and suppliers.',
            supportsPdf: true,
            supportsExcel: true 
        },

        // 4. Raw Data Exports
        { 
            id: 'expenses', 
            name: 'Operational Expenses (Raw)', 
            category: 'raw', 
            icon: <BarChart3 size={15} />, 
            description: 'Detailed list of all operational expenses.',
            supportsPdf: false,
            supportsExcel: true 
        },
        { 
            id: 'purchase-orders', 
            name: 'Purchase Orders (Raw)', 
            category: 'raw', 
            icon: <FileText size={15} />, 
            description: 'Tracked procurement requests and approval flows.',
            supportsPdf: false,
            supportsExcel: true 
        },
        { 
            id: 'purchase-bills', 
            name: 'Purchase Bills (Raw)', 
            category: 'raw', 
            icon: <FileText size={15} />, 
            description: 'Supplier invoices generated against procurement.',
            supportsPdf: false,
            supportsExcel: true 
        },
        { 
            id: 'vendor-payments', 
            name: 'Vendor Payments (Raw)', 
            category: 'raw', 
            icon: <DollarSign size={15} />, 
            description: 'Disbursals made to suppliers and contractors.',
            supportsPdf: false,
            supportsExcel: true 
        }
    ];

    // Load branches
    useEffect(() => {
        const loadBranches = async () => {
            try {
                const res = await getAllBranches();
                setBranches(res.data || []);
            } catch (err) {
                console.error("Failed to load branches:", err);
            }
        };
        loadBranches();
    }, []);

    const [bankAccountsList, setBankAccountsList] = useState<any[]>([]);

    // Load bank accounts
    useEffect(() => {
        const loadBankAccounts = async () => {
            try {
                const { getAllBankAccounts } = await import('../../../services/bankAccountService');
                const res = await getAllBankAccounts({ limit: 100 });
                setBankAccountsList(res.data || []);
            } catch (err) {
                console.error("Failed to load bank accounts for reports:", err);
            }
        };
        loadBankAccounts();
    }, []);

    // Load report details
    const loadReportData = async () => {
        const currentReport = reportTypes.find(r => r.id === selectedReport);
        if (currentReport?.category === 'raw') {
            setReportData(null);
            return;
        }

        setLoading(true);
        setReportData(null);
        try {
            let res: any;
            const queryFilters = {
                ...filters,
                limit: 1000 
            };

            if (selectedReport === 'pl') {
                res = await getPLReport(filters);
            } else if (selectedReport === 'balance-sheet') {
                res = await getBalanceSheetReport(filters);
            } else if (selectedReport === 'bank-balance-sheet') {
                res = await getBankBalanceSheetReport(filters);
            } else if (selectedReport === 'daily-finance') {
                res = await getDailyFinanceReport(filters);
            } else if (selectedReport === 'driver-performance') {
                res = await getDriverPerformanceReport(filters);
            } else if (selectedReport === 'staff-performance') {
                res = await getStaffPerformanceReport(filters);
            } else if (selectedReport === 'invoices-report') {
                res = await getInvoices(queryFilters);
            } else if (selectedReport === 'payments-received-report') {
                res = await api.get('/api/payments-received', { params: queryFilters });
            } else if (selectedReport === 'ledger-report') {
                res = await getLedgerEntries(queryFilters);
            } else if (selectedReport === 'customer-report') {
                res = await getAllCustomers(queryFilters);
            } else if (selectedReport === 'credit-notes-report') {
                res = await getAllCreditNotes(queryFilters);
            } else if (selectedReport === 'vehicle-report') {
                res = await api.get('/api/vehicle/', { params: queryFilters });
            } else if (selectedReport === 'vendor-report') {
                res = await getAllSuppliers(queryFilters);
            } else if (selectedReport === 'bills-report') {
                res = await getAllBills(queryFilters);
            }
            setReportData(res?.data || res);
        } catch (err: any) {
            console.error("Failed to fetch report details:", err);
            toast.error("Failed to fetch report preview.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const runDiag = async () => {
            try {
                await api.get('/api/reporting/diag');
            } catch (e) {
                console.error("Diag check failed:", e);
            }
        };
        runDiag();
    }, []);

    useEffect(() => {
        loadReportData();
    }, [selectedReport, filters.branch, filters.startDate, filters.endDate, filters.bankAccount]);

    // Build standard export dataset dynamically
    const buildExportRows = () => {
        if (!reportData) return [];
        let rows: any[] = [];
        
        if (selectedReport === 'pl') {
            const revTotal = reportData.revenueTotal || reportData.grossRevenue || 0;
            const expTotal = reportData.expensesTotal || reportData.totalExpenses || 0;
            rows.push({ "Type": "REVENUE", "Account": "Total Inflows", "Balance": revTotal });
            reportData.revenues?.forEach((r: any) => {
                rows.push({ "Type": "REVENUE DETAIL", "Account": `${r.name} (${r.code})`, "Balance": r.amount });
            });
            rows.push({ "Type": "EXPENSE", "Account": "Total Outflows", "Balance": expTotal });
            reportData.expenses?.forEach((e: any) => {
                rows.push({ "Type": "EXPENSE DETAIL", "Account": `${e.name} (${e.code})`, "Balance": e.amount });
            });
            rows.push({ "Type": "NET SUMMARY", "Account": "Net Surplus / Profit", "Balance": reportData.netProfit || 0 });
        
        } else if (selectedReport === 'balance-sheet') {
            rows.push({ "Classification": "ASSETS TOTAL", "Account Name": "Aggregate Assets", "Balance": reportData.assetsTotal || 0 });
            reportData.assets?.forEach((a: any) => {
                rows.push({ "Classification": "ASSETS DETAIL", "Account Name": `${a.name} (${a.code})`, "Balance": a.amount });
            });
            rows.push({ "Classification": "LIABILITIES TOTAL", "Account Name": "Aggregate Liabilities", "Balance": reportData.liabilitiesTotal || 0 });
            reportData.liabilities?.forEach((l: any) => {
                rows.push({ "Classification": "LIABILITIES DETAIL", "Account Name": `${l.name} (${l.code})`, "Balance": l.amount });
            });
            rows.push({ "Classification": "EQUITY TOTAL", "Account Name": "Aggregate Equity", "Balance": reportData.equityTotal || 0 });
            reportData.equity?.forEach((eq: any) => {
                rows.push({ "Classification": "EQUITY DETAIL", "Account Name": `${eq.name} (${eq.code})`, "Balance": eq.amount });
            });

        } else if (selectedReport === 'bank-balance-sheet') {
            if (reportData.reportType === 'single-account') {
                rows.push({
                    "Date": "Starting Balance",
                    "Reference": "",
                    "Description": "Beginning Balance",
                    "Type": "",
                    "Amount": "",
                    "Running Balance": reportData.startingBalance || 0
                });
                reportData.transactions?.forEach((tx: any) => {
                    rows.push({
                        "Date": tx.date ? new Date(tx.date).toISOString().split('T')[0] : "",
                        "Reference": tx.reference || "",
                        "Description": tx.description || "",
                        "Type": tx.type || "",
                        "Amount": tx.amount || 0,
                        "Running Balance": tx.runningBalance || 0
                    });
                });
                rows.push({
                    "Date": "Ending Balance",
                    "Reference": "",
                    "Description": "Closing Balance",
                    "Type": "",
                    "Amount": "",
                    "Running Balance": reportData.endingBalance || 0
                });
            } else {
                rows.push({ "Type": "CASH ACCOUNTS TOTAL", "Account": "Total Cash Inflows/Outflows", "Code/Number": "", "Balance": reportData.cashTotal || 0 });
                reportData.cashAccounts?.forEach((a: any) => {
                    rows.push({ "Type": "CASH ACCOUNT", "Account": a.name, "Code/Number": `${a.code} / ${a.number}`, "Balance": a.balance });
                });
                rows.push({ "Type": "BANK ACCOUNTS TOTAL", "Account": "Total Bank Inflows/Outflows", "Code/Number": "", "Balance": reportData.bankTotal || 0 });
                reportData.bankAccounts?.forEach((b: any) => {
                    rows.push({ "Type": "BANK ACCOUNT", "Account": b.name, "Code/Number": `${b.code} / ${b.number}`, "Balance": b.balance });
                });
                rows.push({ "Type": "GRAND TOTAL", "Account": "Total Liquidity", "Code/Number": "", "Balance": reportData.grandTotal || 0 });
            }

        } else if (selectedReport === 'daily-finance') {
            rows = getReportList(reportData).map((d: any) => ({
                "Date": d.date,
                "Inflows (Income)": d.income || 0,
                "Outflows (Expenses)": d.expenses || 0,
                "Net Flow": (d.income || 0) - (d.expenses || 0)
            }));

        } else if (selectedReport === 'ledger-report') {
            rows = getReportList(reportData).map((row: any) => ({
                "Date": row.entryDate ? new Date(row.entryDate).toISOString().split('T')[0] : "",
                "Entry No": row.transactionId || (row.manualJournal ? "MJ" : (row.voucher ? "VCH" : "")),
                "Account Code": row.accountingCode?.code || "",
                "Account Name": row.accountingCode?.name || "",
                "Debit": row.type === 'DEBIT' ? row.amount : 0,
                "Credit": row.type === 'CREDIT' ? row.amount : 0,
                "Narration": row.description || ""
            }));

        } else if (selectedReport === 'bills-report') {
            rows = getReportList(reportData).map((row: any) => ({
                "Bill Number": row.billNumber || "",
                "Supplier": row.supplier?.name || "",
                "Bill Date": row.billDate ? new Date(row.billDate).toISOString().split('T')[0] : "",
                "Due Date": row.dueDate ? new Date(row.dueDate).toISOString().split('T')[0] : "",
                "Total Amount": row.totalAmount || 0,
                "Balance Due": row.balanceDue || 0,
                "Status": row.status || ""
            }));

        } else if (selectedReport === 'invoices-report') {
            rows = getReportList(reportData).map((row: any) => ({
                "Invoice Number": row.invoiceNumber || "",
                "Customer Name": row.customer?.name || row.driverId?.personalInfo?.fullName || "",
                "Invoice Date": row.invoiceDate ? new Date(row.invoiceDate).toISOString().split('T')[0] : "",
                "Due Date": row.dueDate ? new Date(row.dueDate).toISOString().split('T')[0] : "",
                "Total Amount": row.totalAmountDue || 0,
                "Amount Paid": row.amountPaid || 0,
                "Remaining Balance": row.balance || 0,
                "Status": row.status || ""
            }));

        } else if (selectedReport === 'payments-received-report') {
            rows = getReportList(reportData).map((row: any) => ({
                "Payment ID": row.paymentNumber || "",
                "Transaction Date": row.paymentDate ? new Date(row.paymentDate).toISOString().split('T')[0] : "",
                "Driver / Customer": row.driverId?.personalInfo?.fullName || row.customerId?.name || "",
                "Amount Collected": row.amountReceived || 0,
                "Method": row.paymentMethod || "",
                "Reference No": row.referenceNumber || ""
            }));

        } else if (selectedReport === 'customer-report') {
            rows = getReportList(reportData).map((row: any) => ({
                "Customer ID": typeof row.customerId === 'object' && row.customerId !== null ? row.customerId.customerId || row.customerId._id : row.customerId || "",
                "Name": row.name || "",
                "Contact Person": row.contactPerson || "",
                "Email Address": row.email || "",
                "Phone Line": row.phone || "",
                "Status": row.isActive ? "ACTIVE" : "INACTIVE"
            }));

        } else if (selectedReport === 'credit-notes-report') {
            rows = getReportList(reportData).map((row: any) => ({
                "Credit Note Number": row.creditNoteNumber || "",
                "Party Name": row.customerId?.name || row.driverId?.personalInfo?.fullName || "",
                "Issue Date": row.creditNoteDate ? new Date(row.creditNoteDate).toISOString().split('T')[0] : "",
                "Refund Amount": row.amount || 0,
                "Reason": row.reason || "",
                "Status": row.status || ""
                }));

        } else if (selectedReport === 'driver-performance') {
            rows = getReportList(reportData).map((row: any) => ({
                "Driver Name": row.name || "",
                "Driving Score": row.drivingScore || 0,
                "Average Speed (km/h)": row.avgSpeed || 0,
                "Total Distance (km)": row.totalDistance || 0,
                "Fuel Efficiency (km/l)": row.fuelEfficiency || 0,
                "Lease Rent Status": row.rentStatus || "",
                "Unpaid Rent Balance": row.rentBalance || 0
            }));

        } else if (selectedReport === 'staff-performance') {
            rows = getReportList(reportData).map((row: any) => ({
                "Staff Member": row.name || "",
                "System Role": row.role || "",
                "Tasks Completed": row.tasksCompleted || 0,
                "Total Assigned Tasks": row.totalTasks || 0,
                "Completion Rate (%)": row.taskCompletionRate || 0,
                "Targets Met": row.targetsMet || 0
            }));

        } else if (selectedReport === 'vehicle-report') {
            rows = getReportList(reportData).map((row: any) => ({
                "Fleet Number": row.basicDetails?.fleetNumber || "",
                "Plate Number": row.basicDetails?.plateNumber || "",
                "Make & Model": `${row.basicDetails?.make || ""} ${row.basicDetails?.model || ""}`,
                "Manufacture Year": row.basicDetails?.year || "",
                "Fuel Configuration": row.basicDetails?.fuelType || "",
                "Assignment Status": row.status || "",
                "Assigned Driver": row.driverId?.personalInfo?.fullName || "Unassigned"
            }));

        } else if (selectedReport === 'vendor-report') {
            rows = getReportList(reportData).map((row: any) => ({
                "Vendor Number": row.vendorNumber || "",
                "Company Name": row.companyName || row.name || "",
                "Display Name": row.displayName || "",
                "Email Address": row.email || "",
                "Contact Phone": row.phone || "",
                "Category": row.category || "",
                "Status": row.isActive ? "ACTIVE" : "INACTIVE"
            }));
        }

        return rows;
    };

    // Advanced Print PDF engine for all tables
    const handleExportPdf = async () => {
        // If P&L or Balance Sheet, use high-fidelity backend PDF generator
        if (selectedReport === 'pl' || selectedReport === 'balance-sheet') {
            setExporting(true);
            const toastId = toast.loading("Generating PDF Report...");
            try {
                const query = {
                    ...filters,
                    reportType: selectedReport === 'pl' ? 'PL' : 'BS'
                };
                const res = await api.get('/api/reporting/export/pdf', { params: query, responseType: 'blob' });
                const blob = new Blob([res.data], { type: 'application/pdf' });
                const url = window.URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = url;
                const dateStr = new Date().toISOString().split('T')[0];
                const title = selectedReport === 'pl' ? 'income_statement' : 'balance_sheet';
                link.setAttribute('download', `${title}_report_${dateStr}.pdf`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                toast.success("PDF report downloaded successfully!", { id: toastId });
            } catch (err: any) {
                console.error("PDF generation failed:", err);
                toast.error("Failed to generate PDF report.", { id: toastId });
            } finally {
                setExporting(false);
            }
            return;
        }

        // For other tables, open a beautiful, high-fidelity browser print interface
        const tableContainer = document.getElementById('report-preview-table-container');
        if (!tableContainer) {
            toast.error("Preview data not ready to print.");
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error("Please allow popups to generate PDFs.");
            return;
        }

        const branchText = filters.branch ? branches.find(b => b._id === filters.branch)?.name || "Selected Branch" : "Consolidated (All Branches)";
        const tableHtml = tableContainer.innerHTML;

        printWindow.document.write(`
            <html>
                <head>
                    <title>${activeReport?.name}</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                            color: #111827;
                            padding: 40px;
                            margin: 0;
                        }
                        .header {
                            margin-bottom: 25px;
                            border-bottom: 2px solid #e5e7eb;
                            padding-bottom: 15px;
                        }
                        .header h1 {
                            margin: 0;
                            font-size: 22px;
                            font-weight: 800;
                            text-transform: uppercase;
                            color: #111827;
                        }
                        .header p {
                            margin: 4px 0 0 0;
                            font-size: 12px;
                            color: #4b5563;
                        }
                        .meta {
                            display: flex;
                            justify-content: space-between;
                            margin-top: 15px;
                            font-size: 11px;
                            color: #6b7280;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                            font-size: 11px;
                        }
                        th {
                            background-color: #f9fafb;
                            color: #374151;
                            font-weight: 700;
                            text-transform: uppercase;
                            font-size: 9px;
                            letter-spacing: 0.5px;
                            border-bottom: 2px solid #e5e7eb;
                            padding: 10px 8px;
                            text-align: left;
                        }
                        td {
                            padding: 8px;
                            border-bottom: 1px solid #f3f4f6;
                            color: #1f2937;
                        }
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                        .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
                        /* Print layout adaptations */
                        @media print {
                            html, body {
                                height: auto !important;
                                overflow: visible !important;
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                            }
                            body { 
                                padding: 0; 
                                margin: 0;
                            }
                            @page { 
                                margin: 1.5cm; 
                            }
                            table {
                                page-break-inside: auto;
                            }
                            tr {
                                page-break-inside: avoid !important;
                                break-inside: avoid !important;
                            }
                            thead {
                                display: table-header-group !important;
                            }
                            h1, h2, h3, h4, h5, h6 {
                                page-break-after: avoid !important;
                                break-after: avoid !important;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>OLA CARS &bull; ${activeReport?.name}</h1>
                        <div class="meta">
                            <div><strong>Scope:</strong> ${branchText}</div>
                            <div><strong>Date Range:</strong> ${filters.startDate} to ${filters.endDate}</div>
                            <div><strong>Export Date:</strong> ${new Date().toLocaleString()}</div>
                        </div>
                    </div>
                    ${tableHtml}
                </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 300);
    };

    // Client-side Excel Export
    const handleExportExcel = async () => {
        setExporting(true);
        const toastId = toast.loading("Generating Excel Spreadsheet...");
        try {
            if (activeReport?.category === 'raw') {
                await downloadExcelReport(selectedReport, filters);
                toast.success("Excel sheet downloaded successfully!", { id: toastId });
                setExporting(false);
                return;
            }

            const exportRows = buildExportRows();
            if (exportRows.length === 0) {
                toast.error("No preview data available to export.", { id: toastId });
                setExporting(false);
                return;
            }

            const ws = XLSX.utils.json_to_sheet(exportRows);
            const wb = XLSX.utils.book_new();

            // Set column widths
            const keys = Object.keys(exportRows[0]);
            ws["!cols"] = keys.map(key => {
                const maxLen = Math.max(
                    key.length,
                    ...exportRows.map(row => String(row[key] || "").length)
                );
                return { wch: maxLen + 2 };
            });

            XLSX.utils.book_append_sheet(wb, ws, "Report Data");
            const dateStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `${selectedReport}_report_${dateStr}.xlsx`);

            toast.success("Excel sheet downloaded successfully!", { id: toastId });
        } catch (err) {
            console.error("Excel generation failed:", err);
            toast.error("Failed to generate Excel report.", { id: toastId });
        } finally {
            setExporting(false);
        }
    };

    // Client-side CSV Export using XLSX sheet utility
    const handleExportCsv = async () => {
        setExporting(true);
        const toastId = toast.loading("Generating CSV Data Stream...");
        try {
            const exportRows = buildExportRows();
            if (exportRows.length === 0) {
                toast.error("No preview data available to export.", { id: toastId });
                setExporting(false);
                return;
            }

            const ws = XLSX.utils.json_to_sheet(exportRows);
            const csvContent = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement("a");
            link.setAttribute("href", url);
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute("download", `${selectedReport}_report_${dateStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success("CSV report downloaded successfully!", { id: toastId });
        } catch (err) {
            console.error("CSV generation failed:", err);
            toast.error("Failed to generate CSV report.", { id: toastId });
        } finally {
            setExporting(false);
        }
    };

    const formatCurrency = (val: number) => {
        return '$' + (Number(val) || 0).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const activeReport = reportTypes.find(r => r.id === selectedReport);

    // Group reports by category
    const financialReports = reportTypes.filter(r => r.category === 'financial');
    const salesReports = reportTypes.filter(r => r.category === 'sales');
    const operationsReports = reportTypes.filter(r => r.category === 'operations');
    const rawReports = reportTypes.filter(r => r.category === 'raw');

    return (
        <div className="container-responsive space-y-6 pb-12 animate-in fade-in duration-500">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Reports Command Center', active: true }]} />

            {/* Premium Header - Glassmorphic Block */}
            <div className="relative overflow-hidden rounded-3xl border border-[var(--border-main)] p-6 md:p-8 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[var(--bg-card)]" 
                 style={{ backdropFilter: 'blur(20px)' }}>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-brand-lime animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-lime">Live Connected Database</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider bg-gradient-to-r from-[var(--text-main)] via-[var(--text-main)]/90 to-brand-lime bg-clip-text text-transparent">
                        Reports & Intelligence
                    </h1>
                    <p className="text-xs font-semibold text-dim">
                        Analyze operations, track financial indices, and generate high-fidelity audits.
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={loadReportData}
                        disabled={loading}
                        className="p-3 rounded-2xl border border-[var(--border-main)] hover:bg-[var(--sidebar-hover)] transition-all text-dim hover:text-main cursor-pointer active:scale-95 flex items-center justify-center shadow-lg bg-[var(--bg-input)]"
                        title="Sync Live Data"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin text-brand-lime' : ''} />
                    </button>
                </div>
                {/* Glow Element */}
                <div className="absolute right-0 bottom-0 w-48 h-48 bg-brand-lime/5 rounded-full blur-[100px] pointer-events-none" />
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                
                {/* Left Sidebar - Reports Selector & Filters */}
                <div className="xl:col-span-1 space-y-6">
                    {/* Filters Deck */}
                    <div className="rounded-3xl border border-[var(--border-main)] p-6 space-y-5 shadow-xl" style={{ backgroundColor: 'var(--bg-card)' }}>
                        <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-3">
                            <h2 className="text-xs font-black uppercase tracking-widest text-main flex items-center gap-2">
                                <Building size={14} className="text-brand-lime" /> Data Scoping
                            </h2>
                        </div>
                        
                        {/* Branch Filter */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-dim">Branch Context</label>
                            <select
                                value={filters.branch}
                                onChange={(e) => setFilters(prev => ({ ...prev, branch: e.target.value }))}
                                className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-main)] text-xs bg-[var(--bg-input)] hover:bg-[var(--sidebar-hover)] outline-none cursor-pointer transition-all"
                                style={{ color: 'var(--text-main)' }}
                            >
                                <option value="" className="bg-[var(--bg-card)]">Consolidated (All Branches)</option>
                                {branches.map((b) => (
                                    <option key={b._id} value={b._id} className="bg-[var(--bg-card)]">{b.name} ({b.country})</option>
                                ))}
                            </select>
                        </div>

                        {/* Date Range Filters */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-dim">From Date</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={filters.startDate}
                                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-main)] text-xs bg-[var(--bg-input)] outline-none hover:bg-[var(--sidebar-hover)] focus:border-brand-lime/30 transition-all"
                                    style={{ color: 'var(--text-main)' }}
                                />
                                <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-dim">To Date</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={filters.endDate}
                                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-main)] text-xs bg-[var(--bg-input)] outline-none hover:bg-[var(--sidebar-hover)] focus:border-brand-lime/30 transition-all"
                                    style={{ color: 'var(--text-main)' }}
                                />
                                <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" />
                            </div>
                        </div>

                        {selectedReport === 'bank-balance-sheet' && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-dim">Bank Account</label>
                                <select
                                    value={filters.bankAccount}
                                    onChange={(e) => setFilters(prev => ({ ...prev, bankAccount: e.target.value }))}
                                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-main)] text-xs bg-[var(--bg-input)] hover:bg-[var(--sidebar-hover)] outline-none cursor-pointer transition-all"
                                    style={{ color: 'var(--text-main)' }}
                                >
                                    <option value="" className="bg-[var(--bg-card)]">All Accounts (Grouped)</option>
                                    {bankAccountsList.map((acc) => (
                                        <option key={acc._id} value={acc._id} className="bg-[var(--bg-card)]">
                                            {acc.accountName || acc.bankName} ({acc.accountNumber})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Report Type List */}
                    <div className="rounded-3xl border border-[var(--border-main)] p-5 space-y-6 shadow-xl relative overflow-y-auto max-h-[580px] custom-scrollbar" style={{ backgroundColor: 'var(--bg-card)' }}>
                        
                        {/* Financial Statements */}
                        <div className="space-y-3">
                            <span className="text-[9px] font-black uppercase tracking-widest text-brand-lime/80 px-1">Financial Intelligence</span>
                            <div className="flex flex-col gap-1">
                                {financialReports.map((r) => (
                                    <button
                                        key={r.id}
                                        onClick={() => setSelectedReport(r.id)}
                                        className={`w-full text-left px-3.5 py-2.5 rounded-2xl flex items-center gap-3 transition-all cursor-pointer border
                                            ${selectedReport === r.id 
                                                ? 'bg-brand-lime/10 border-brand-lime/30 text-brand-lime font-black shadow-lg shadow-brand-lime/[0.02]' 
                                                : 'border-transparent text-dim hover:text-main hover:bg-[var(--sidebar-hover)]'
                                            }
                                        `}
                                    >
                                        <div className={`p-2 rounded-xl transition-all ${selectedReport === r.id ? 'bg-brand-lime/20 text-brand-lime' : 'bg-[var(--bg-input)] text-dim'}`}>
                                            {r.icon}
                                        </div>
                                        <span className="text-[11px] font-bold tracking-wide uppercase truncate">{r.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sales & Receivables */}
                        <div className="space-y-3">
                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-500/85 px-1">Sales & Receivables</span>
                            <div className="flex flex-col gap-1">
                                {salesReports.map((r) => (
                                    <button
                                        key={r.id}
                                        onClick={() => setSelectedReport(r.id)}
                                        className={`w-full text-left px-3.5 py-2.5 rounded-2xl flex items-center gap-3 transition-all cursor-pointer border
                                            ${selectedReport === r.id 
                                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-black' 
                                                : 'border-transparent text-dim hover:text-main hover:bg-[var(--sidebar-hover)]'
                                            }
                                        `}
                                    >
                                        <div className={`p-2 rounded-xl transition-all ${selectedReport === r.id ? 'bg-amber-500/20 text-amber-400' : 'bg-[var(--bg-input)] text-dim'}`}>
                                            {r.icon}
                                        </div>
                                        <span className="text-[11px] font-bold tracking-wide uppercase truncate">{r.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Assets & Operations */}
                        <div className="space-y-3">
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#0EA5E9]/85 px-1">Assets & Operations</span>
                            <div className="flex flex-col gap-1">
                                {operationsReports.map((r) => (
                                    <button
                                        key={r.id}
                                        onClick={() => setSelectedReport(r.id)}
                                        className={`w-full text-left px-3.5 py-2.5 rounded-2xl flex items-center gap-3 transition-all cursor-pointer border
                                            ${selectedReport === r.id 
                                                ? 'bg-[#0EA5E9]/10 border-[#0EA5E9]/30 text-[#0EA5E9] font-black' 
                                                : 'border-transparent text-dim hover:text-main hover:bg-[var(--sidebar-hover)]'
                                            }
                                        `}
                                    >
                                        <div className={`p-2 rounded-xl transition-all ${selectedReport === r.id ? 'bg-[#0EA5E9]/20 text-[#0EA5E9]' : 'bg-[var(--bg-input)] text-dim'}`}>
                                            {r.icon}
                                        </div>
                                        <span className="text-[11px] font-bold tracking-wide uppercase truncate">{r.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Raw Data Exports */}
                        <div className="space-y-3">
                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/85 px-1">Raw Ledger Streams</span>
                            <div className="flex flex-col gap-1">
                                {rawReports.map((r) => (
                                    <button
                                        key={r.id}
                                        onClick={() => setSelectedReport(r.id)}
                                        className={`w-full text-left px-3.5 py-2.5 rounded-2xl flex items-center gap-3 transition-all cursor-pointer border
                                            ${selectedReport === r.id 
                                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-black' 
                                                : 'border-transparent text-dim hover:text-main hover:bg-[var(--sidebar-hover)]'
                                            }
                                        `}
                                    >
                                        <div className={`p-2 rounded-xl transition-all ${selectedReport === r.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[var(--bg-input)] text-dim'}`}>
                                            {r.icon}
                                        </div>
                                        <span className="text-[11px] font-bold tracking-wide uppercase truncate">{r.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Right Panel - Report Preview & Actions */}
                <div className="xl:col-span-3 flex flex-col gap-6">
                    {/* Glassmorphic Container for Preview */}
                    <div className="rounded-3xl border border-[var(--border-main)] p-6 flex flex-col h-[670px] shadow-2xl relative overflow-hidden" 
                         style={{ backgroundColor: 'var(--bg-card)' }}>
                        
                        {/* Decorative Background Blur */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/[0.01] rounded-full blur-[80px] pointer-events-none" />

                        {/* Preview Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-main)] pb-5 mb-6">
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-dim flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-brand-lime" /> Data Preview Screen
                                </span>
                                <h2 className="text-xl font-black uppercase tracking-wider text-main mt-1">{activeReport?.name}</h2>
                            </div>
                            
                            {/* Actions bar (PDF, Excel, CSV) */}
                            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                {activeReport?.supportsPdf && (
                                    <button
                                        onClick={handleExportPdf}
                                        disabled={loading || exporting}
                                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[var(--border-main)] text-[10px] font-black uppercase tracking-wider hover:bg-[var(--sidebar-hover)] disabled:opacity-50 cursor-pointer active:scale-95 transition-all text-main"
                                    >
                                        <Download size={12} className="text-rose-500" /> PDF
                                    </button>
                                )}
                                {activeReport?.supportsExcel && (
                                    <button
                                        onClick={handleExportExcel}
                                        disabled={loading || exporting}
                                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[var(--border-main)] text-[10px] font-black uppercase tracking-wider hover:bg-[var(--sidebar-hover)] disabled:opacity-50 cursor-pointer active:scale-95 transition-all text-main"
                                    >
                                        <Download size={12} className="text-emerald-500" /> Excel
                                    </button>
                                )}
                                {activeReport?.supportsExcel && (
                                    <button
                                        onClick={handleExportCsv}
                                        disabled={loading || exporting}
                                        className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-[var(--border-main)] text-[10px] font-black uppercase tracking-wider hover:bg-[var(--sidebar-hover)] disabled:opacity-50 cursor-pointer active:scale-95 transition-all text-main"
                                    >
                                        <Download size={12} className="text-sky-500" /> CSV
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Preview Screen Body - Configured Scroll Boundaries */}
                        <div className="flex-1 flex flex-col justify-start relative z-10 overflow-hidden">
                            {loading ? (
                                <div className="h-full flex flex-col items-center justify-center gap-3">
                                    <Loader2 className="animate-spin text-brand-lime" size={36} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-dim animate-pulse">Aggregating records...</span>
                                </div>
                            ) : activeReport?.category === 'raw' ? (
                                <div className="text-center py-16 space-y-5 max-w-md mx-auto my-auto">
                                    <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-500/10">
                                        <Download size={36} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-base font-black uppercase tracking-wider text-main">Raw Operational Export</h3>
                                        <p className="text-xs text-dim leading-relaxed">
                                            This report represents a comprehensive data dump of individual transactions and logs. To inspect this collection, please export the sheet directly.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleExportExcel}
                                        disabled={exporting}
                                        className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-brand-lime text-black hover:bg-lime-400 text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg hover:shadow-brand-lime/10 active:scale-95 transition-all"
                                    >
                                        Download Excel SpreadSheet
                                    </button>
                                </div>
                            ) : reportData ? (
                                /* Converted Wrapper with Fixed max height and dedicated scrollbar */
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4" id="report-preview-table-container">
                                    
                                    {/* 1. Preview Profit & Loss */}
                                    {selectedReport === 'pl' && (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div className="border border-[var(--border-main)] rounded-2xl p-5" style={{ background: 'linear-gradient(to bottom right, rgba(16,185,129,0.03), rgba(0,0,0,0))' }}>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-dim">Total Revenue</span>
                                                    <h3 className="text-2xl font-black text-emerald-400 mt-1">{formatCurrency(reportData.revenueTotal || reportData.grossRevenue || 0)}</h3>
                                                </div>
                                                <div className="border border-[var(--border-main)] rounded-2xl p-5" style={{ background: 'linear-gradient(to bottom right, rgba(244,63,94,0.03), rgba(0,0,0,0))' }}>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-dim">Operating Expenses</span>
                                                    <h3 className="text-2xl font-black text-rose-400 mt-1">{formatCurrency(reportData.expensesTotal || reportData.totalExpenses || 0)}</h3>
                                                </div>
                                                <div className="border border-[var(--border-main)] rounded-2xl p-5" style={{ background: 'linear-gradient(to bottom right, rgba(212,241,46,0.03), rgba(0,0,0,0))' }}>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-dim">Net Profit Margin</span>
                                                    {(() => {
                                                        const rev = reportData.revenueTotal || reportData.grossRevenue || 0;
                                                        const net = reportData.netProfit || 0;
                                                        const margin = rev > 0 ? (net / rev) * 100 : 0;
                                                        return (
                                                            <div className="flex items-baseline gap-2 mt-1">
                                                                <h3 className="text-2xl font-black text-brand-lime">{margin.toFixed(1)}%</h3>
                                                                <span className="text-[9px] font-bold text-dim uppercase">Surplus Ratio</span>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            {/* Detailed P&L Statements Table */}
                                            <div className="border border-[var(--border-main)] rounded-2xl overflow-hidden shadow-inner" style={{ background: 'var(--bg-card)' }}>
                                                <div className="p-4 border-b border-[var(--border-main)] flex items-center justify-between" style={{ background: 'var(--bg-input)' }}>
                                                    <h3 className="text-xs font-black uppercase tracking-widest text-main flex items-center gap-2">
                                                        <TrendingUp size={14} className="text-brand-lime" /> Accounts Summary
                                                    </h3>
                                                </div>
                                                <div className="p-5 space-y-4">
                                                    <div className="flex justify-between border-b border-[var(--border-main)] pb-2 text-[10px] font-black uppercase tracking-widest text-dim">
                                                        <span>Account Classification</span>
                                                        <span>Aggregated Balance</span>
                                                    </div>
                                                    
                                                    {/* Revenues */}
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-xs font-black text-emerald-400">
                                                            <span className="uppercase tracking-wide">Revenue (Inflows)</span>
                                                            <span>{formatCurrency(reportData.revenueTotal || reportData.grossRevenue || 0)}</span>
                                                        </div>
                                                        {reportData.revenues?.map((item: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between text-xs text-dim pl-4 hover:text-white transition-colors">
                                                                <span>{item.name} <span className="text-[10px] text-dim/50 ml-1">#{item.code}</span></span>
                                                                <span className="font-mono">{formatCurrency(item.amount)}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Expenses */}
                                                    <div className="space-y-2 pt-2 border-t border-[var(--border-main)]">
                                                        <div className="flex justify-between text-xs font-black text-rose-400">
                                                            <span className="uppercase tracking-wide">Operating Expenses (Outflows)</span>
                                                            <span>{formatCurrency(reportData.expensesTotal || reportData.totalExpenses || 0)}</span>
                                                        </div>
                                                        {reportData.expenses?.map((item: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between text-xs text-dim pl-4 hover:text-white transition-colors">
                                                                <span>{item.name} <span className="text-[10px] text-dim/50 ml-1">#{item.code}</span></span>
                                                                <span className="font-mono">{formatCurrency(item.amount)}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Net Profit Summary Row */}
                                                    <div className="flex justify-between border-t border-[var(--border-main)] pt-4 text-xs font-black uppercase tracking-widest" style={{ background: 'var(--bg-card)' }}>
                                                        <span>Net Surplus / Earnings</span>
                                                        <span className={`font-mono text-sm px-2.5 py-1 rounded-xl ${
                                                            (reportData.netProfit || 0) >= 0 ? 'text-emerald-400 bg-emerald-500/5' : 'text-rose-400 bg-rose-500/5'
                                                        }`}>
                                                            {formatCurrency(reportData.netProfit || 0)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 2. Preview Balance Sheet */}
                                    {selectedReport === 'balance-sheet' && (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div className="border border-[var(--border-main)] rounded-2xl p-5" style={{ background: 'linear-gradient(to bottom right, rgba(16,185,129,0.03), rgba(0,0,0,0))' }}>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-dim">Total Assets</span>
                                                    <h3 className="text-2xl font-black text-emerald-400 mt-1">{formatCurrency(reportData.assetsTotal || 0)}</h3>
                                                </div>
                                                <div className="border border-[var(--border-main)] rounded-2xl p-5" style={{ background: 'linear-gradient(to bottom right, rgba(239,68,68,0.03), rgba(0,0,0,0))' }}>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-dim">Total Liabilities</span>
                                                    <h3 className="text-2xl font-black text-rose-400 mt-1">{formatCurrency(reportData.liabilitiesTotal || 0)}</h3>
                                                </div>
                                                <div className="border border-[var(--border-main)] rounded-2xl p-5" style={{ background: 'linear-gradient(to bottom right, rgba(56,189,248,0.03), rgba(0,0,0,0))' }}>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-dim">Total Equity</span>
                                                    <h3 className="text-2xl font-black text-sky-400 mt-1">{formatCurrency(reportData.equityTotal || 0)}</h3>
                                                </div>
                                            </div>

                                            {/* Balanced Check */}
                                            {reportData.assetsTotal === (reportData.liabilitiesTotal + reportData.equityTotal) ? (
                                                <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-[11px] font-bold text-emerald-400">
                                                    <CheckCircle2 size={16} /> Ledger Balanced (Assets = Liabilities + Equity)
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-[11px] font-bold text-rose-400">
                                                    <AlertCircle size={16} /> Asset & Equity imbalance detected.
                                                </div>
                                            )}

                                            {/* Details Sheet */}
                                            <div className="border border-[var(--border-main)] rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)' }}>
                                                <div className="p-5 space-y-4">
                                                    
                                                    {/* Assets */}
                                                    <div className="space-y-3">
                                                        <div className="flex justify-between text-xs font-black text-emerald-400 uppercase tracking-wider border-b border-[var(--border-main)] pb-2">
                                                            <span>Assets</span>
                                                            <span>{formatCurrency(reportData.assetsTotal || 0)}</span>
                                                        </div>
                                                        
                                                        {(() => {
                                                            const classifyAsset = (a: any) => {
                                                                const cat = (a.category || "").toLowerCase();
                                                                const type = (a.accountType || "").toLowerCase();
                                                                const name = (a.name || "").toLowerCase();
                                                                if (type === 'cash' || name.includes('cash') || name.includes('caja') || name.includes('petty')) {
                                                                    return 'cash';
                                                                }
                                                                if (type === 'bank' || name.includes('bank') || name.includes('banco') || name.includes('bct')) {
                                                                    return 'bank';
                                                                }
                                                                if (type.includes('receivable') || cat.includes('receivable') || name.includes('receivable') || name.includes('por cobrar')) {
                                                                    return 'ar';
                                                                }
                                                                if (type === 'other asset' || cat === 'other asset') {
                                                                    return 'other_asset';
                                                                }
                                                                if (type === 'fixed asset' || cat === 'fixed asset') {
                                                                    return 'fixed';
                                                                }
                                                                return 'other';
                                                            };

                                                            const assets = reportData.assets || [];
                                                            const cashAccounts = assets.filter((a: any) => classifyAsset(a) === 'cash');
                                                            const bankAccounts = assets.filter((a: any) => classifyAsset(a) === 'bank');
                                                            const arAccounts = assets.filter((a: any) => classifyAsset(a) === 'ar');
                                                            const fixedAccounts = assets.filter((a: any) => classifyAsset(a) === 'fixed');
                                                            const otherAccounts = assets.filter((a: any) => classifyAsset(a) === 'other');
                                                            const otherAssetAccounts = assets.filter((a: any) => classifyAsset(a) === 'other_asset');

                                                            const cashTotal = cashAccounts.reduce((sum: number, a: any) => sum + a.amount, 0);
                                                            const bankTotal = bankAccounts.reduce((sum: number, a: any) => sum + a.amount, 0);
                                                            const cashAndEquivalentsTotal = cashTotal + bankTotal;
                                                            const arTotal = arAccounts.reduce((sum: number, a: any) => sum + a.amount, 0);
                                                            const otherTotal = otherAccounts.reduce((sum: number, a: any) => sum + a.amount, 0);
                                                            const currentAssetsTotal = cashAndEquivalentsTotal + arTotal + otherTotal;
                                                            const fixedTotal = fixedAccounts.reduce((sum: number, a: any) => sum + a.amount, 0);
                                                            const otherAssetTotal = otherAssetAccounts.reduce((sum: number, a: any) => sum + a.amount, 0);

                                                            return (
                                                                <div className="space-y-4 pl-2">
                                                                    <div className="space-y-2">
                                                                        <div className="text-xs font-bold text-main uppercase tracking-wide">Current Assets</div>
                                                                        
                                                                        {/* Cash and Cash Equivalents */}
                                                                        <div className="pl-3 space-y-2">
                                                                            <div className="text-[11px] font-bold text-dim uppercase tracking-wider">Cash and Cash Equivalents</div>
                                                                            
                                                                            {/* Cash Subcategory */}
                                                                            <div className="pl-3 space-y-1">
                                                                                <div className="text-[10px] font-bold text-dim/60 uppercase tracking-wider italic">Cash</div>
                                                                                {cashAccounts.map((item: any, idx: number) => (
                                                                                    <div key={idx} className="flex justify-between text-xs text-dim pl-2 hover:text-white transition-colors">
                                                                                        <span>{item.name} <span className="text-[10px] text-dim/50 ml-1">#{item.code}</span></span>
                                                                                        <span className="font-mono">{formatCurrency(item.amount)}</span>
                                                                                    </div>
                                                                                ))}
                                                                                {cashAccounts.length > 0 && (
                                                                                    <div className="flex justify-between text-xs font-bold pt-1 border-t border-[var(--border-main)]/30 pl-2 pr-2">
                                                                                        <span className="text-dim/80 italic">Total for Cash</span>
                                                                                        <span className="font-mono text-dim">{formatCurrency(cashTotal)}</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            {/* Bank Subcategory */}
                                                                            <div className="pl-3 space-y-1 mt-2">
                                                                                <div className="text-[10px] font-bold text-dim/60 uppercase tracking-wider italic">Bank</div>
                                                                                {bankAccounts.map((item: any, idx: number) => (
                                                                                    <div key={idx} className="flex justify-between text-xs text-dim pl-2 hover:text-white transition-colors">
                                                                                        <span>{item.name} <span className="text-[10px] text-dim/50 ml-1">#{item.code}</span></span>
                                                                                        <span className="font-mono">{formatCurrency(item.amount)}</span>
                                                                                    </div>
                                                                                ))}
                                                                                {bankAccounts.length > 0 && (
                                                                                    <div className="flex justify-between text-xs font-bold pt-1 border-t border-[var(--border-main)]/30 pl-2 pr-2">
                                                                                        <span className="text-dim/80 italic">Total for Bank</span>
                                                                                        <span className="font-mono text-dim">{formatCurrency(bankTotal)}</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            {/* Total Cash and Cash Equivalents */}
                                                                            <div className="flex justify-between text-xs font-black uppercase pt-1.5 border-t border-[var(--border-main)]/50 mt-2 pl-2" style={{ color: 'var(--text-main)' }}>
                                                                                <span>Total for Cash and Cash Equivalents</span>
                                                                                <span className="font-mono">{formatCurrency(cashAndEquivalentsTotal)}</span>
                                                                            </div>
                                                                        </div>

                                                                        {/* Accounts Receivable */}
                                                                        <div className="pl-3 space-y-1 mt-3">
                                                                            <div className="text-[11px] font-bold text-dim uppercase tracking-wider">Accounts Receivable</div>
                                                                            {arAccounts.map((item: any, idx: number) => (
                                                                                <div key={idx} className="flex justify-between text-xs text-dim pl-2 hover:text-white transition-colors">
                                                                                    <span>{item.name} <span className="text-[10px] text-dim/50 ml-1">#{item.code}</span></span>
                                                                                    <span className="font-mono">{formatCurrency(item.amount)}</span>
                                                                                </div>
                                                                            ))}
                                                                            {arAccounts.length > 0 && (
                                                                                <div className="flex justify-between text-xs font-bold pt-1.5 border-t border-[var(--border-main)]/50 pl-2" style={{ color: 'var(--text-main)' }}>
                                                                                    <span>Total for Accounts Receivable</span>
                                                                                    <span className="font-mono">{formatCurrency(arTotal)}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Other Current Assets */}
                                                                        <div className="pl-3 space-y-1 mt-3">
                                                                            <div className="text-[11px] font-bold text-dim uppercase tracking-wider">Other current asset</div>
                                                                            {otherAccounts.map((item: any, idx: number) => (
                                                                                <div key={idx} className="flex justify-between text-xs text-dim pl-2 hover:text-white transition-colors">
                                                                                    <span>{item.name} <span className="text-[10px] text-dim/50 ml-1">#{item.code}</span></span>
                                                                                    <span className="font-mono">{formatCurrency(item.amount)}</span>
                                                                                </div>
                                                                            ))}
                                                                            {otherAccounts.length > 0 && (
                                                                                <div className="flex justify-between text-xs font-bold pt-1.5 border-t border-[var(--border-main)]/50 pl-2" style={{ color: 'var(--text-main)' }}>
                                                                                    <span>Total for Other current assets</span>
                                                                                    <span className="font-mono">{formatCurrency(otherTotal)}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Total Current Assets */}
                                                                        <div className="flex justify-between text-xs font-black uppercase pt-2 border-t border-[var(--border-main)] pl-2" style={{ color: 'var(--text-main)' }}>
                                                                            <span>Total for Current Assets</span>
                                                                            <span className="font-mono">{formatCurrency(currentAssetsTotal)}</span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Non-Current Assets / Fixed Assets */}
                                                                    <div className="space-y-2 mt-4 pt-3 border-t border-[var(--border-main)]/30">
                                                                        <div className="text-xs font-bold text-main uppercase tracking-wide">Non Current Assets</div>
                                                                        <div className="pl-3 space-y-1">
                                                                            <div className="text-[11px] font-bold text-dim uppercase tracking-wider">Fixed Assets</div>
                                                                            {fixedAccounts.map((item: any, idx: number) => (
                                                                                <div key={idx} className="flex justify-between text-xs text-dim pl-2 hover:text-white transition-colors">
                                                                                    <span>{item.name} <span className="text-[10px] text-dim/50 ml-1">#{item.code}</span></span>
                                                                                    <span className="font-mono">{formatCurrency(item.amount)}</span>
                                                                                </div>
                                                                            ))}
                                                                            {fixedAccounts.length > 0 && (
                                                                                <div className="flex justify-between text-xs font-bold pt-1.5 border-t border-[var(--border-main)]/50 pl-2" style={{ color: 'var(--text-main)' }}>
                                                                                    <span>Total for Fixed Assets</span>
                                                                                    <span className="font-mono">{formatCurrency(fixedTotal)}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {otherAssetAccounts.length > 0 && (
                                                                            <div className="pl-3 space-y-1 mt-2">
                                                                                <div className="text-[11px] font-bold text-dim uppercase tracking-wider">Other Assets</div>
                                                                                {otherAssetAccounts.map((item: any, idx: number) => (
                                                                                    <div key={idx} className="flex justify-between text-xs text-dim pl-2 hover:text-white transition-colors">
                                                                                        <span>{item.name} <span className="text-[10px] text-dim/50 ml-1">#{item.code}</span></span>
                                                                                        <span className="font-mono">{formatCurrency(item.amount)}</span>
                                                                                    </div>
                                                                                ))}
                                                                                <div className="flex justify-between text-xs font-bold pt-1.5 border-t border-[var(--border-main)]/50 pl-2" style={{ color: 'var(--text-main)' }}>
                                                                                    <span>Total for Other Assets</span>
                                                                                    <span className="font-mono">{formatCurrency(otherAssetTotal)}</span>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        <div className="flex justify-between text-xs font-black uppercase pt-2 border-t border-[var(--border-main)] pl-2" style={{ color: 'var(--text-main)' }}>
                                                                            <span>Total for Non Current Assets</span>
                                                                            <span className="font-mono">{formatCurrency(fixedTotal + otherAssetTotal)}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>

                                                    {/* Liabilities */}
                                                    <div className="space-y-2 pt-2 border-t border-[var(--border-main)]">
                                                        <div className="flex justify-between text-xs font-black text-rose-400 uppercase tracking-wider">
                                                            <span>Liabilities</span>
                                                            <span>{formatCurrency(reportData.liabilitiesTotal || 0)}</span>
                                                        </div>
                                                        {reportData.liabilities?.map((item: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between text-xs text-dim pl-4 hover:text-white transition-colors">
                                                                <span>{item.name} <span className="text-[10px] text-dim/50 ml-1">#{item.code}</span></span>
                                                                <span className="font-mono">{formatCurrency(item.amount)}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Equity */}
                                                    <div className="space-y-2 pt-2 border-t border-[var(--border-main)]">
                                                        <div className="flex justify-between text-xs font-black text-sky-400 uppercase tracking-wider">
                                                            <span>Equity</span>
                                                            <span>{formatCurrency(reportData.equityTotal || 0)}</span>
                                                        </div>
                                                        {reportData.equity?.map((item: any, idx: number) => (
                                                            <div key={idx} className="flex justify-between text-xs text-dim pl-4 hover:text-white transition-colors">
                                                                <span>{item.name} <span className="text-[10px] text-dim/50 ml-1">#{item.code}</span></span>
                                                                <span className="font-mono">{formatCurrency(item.amount)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 2b. Preview Bank Balance Sheet */}
                                    {selectedReport === 'bank-balance-sheet' && reportData && (
                                        <div className="space-y-6">
                                            {reportData.reportType === 'single-account' ? (
                                                <div className="space-y-6">
                                                    {/* Single Account Summary Cards */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                        <div className="border border-[var(--border-main)] rounded-2xl p-5" style={{ background: 'linear-gradient(to bottom right, rgba(16,185,129,0.03), rgba(0,0,0,0))' }}>
                                                            <span className="text-[10px] font-black uppercase tracking-wider text-dim">Starting Balance</span>
                                                            <h3 className="text-2xl font-black text-emerald-400 mt-1">{formatCurrency(reportData.startingBalance)}</h3>
                                                        </div>
                                                        <div className="border border-[var(--border-main)] rounded-2xl p-5" style={{ background: 'linear-gradient(to bottom right, rgba(212,241,46,0.03), rgba(0,0,0,0))' }}>
                                                            <span className="text-[10px] font-black uppercase tracking-wider text-dim">Ending Balance</span>
                                                            <h3 className="text-2xl font-black text-brand-lime mt-1">{formatCurrency(reportData.endingBalance)}</h3>
                                                        </div>
                                                        <div className="border border-[var(--border-main)] rounded-2xl p-5" style={{ background: 'linear-gradient(to bottom right, rgba(56,189,248,0.03), rgba(0,0,0,0))' }}>
                                                            <span className="text-[10px] font-black uppercase tracking-wider text-dim">Transactions Count</span>
                                                            <h3 className="text-2xl font-black text-sky-400 mt-1">{reportData.transactions?.length || 0}</h3>
                                                        </div>
                                                    </div>

                                                    {/* Transaction Details Table */}
                                                    <table className="w-full text-left border-collapse" id="report-preview-table">
                                                        <thead className="sticky top-0 bg-[var(--bg-card)] z-20 shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                                                            <tr className="border-b border-[var(--border-main)]" style={{ background: 'var(--bg-input)' }}>
                                                                <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Date</th>
                                                                <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Reference ID</th>
                                                                <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Description</th>
                                                                <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-center">Type</th>
                                                                <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-right">Amount</th>
                                                                <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-right">Running Balance</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr className="border-b border-[var(--border-main)] italic text-xs text-dim">
                                                                <td className="p-4" colSpan={5}>Beginning/Starting Balance</td>
                                                                <td className="p-4 text-right font-mono font-bold">{formatCurrency(reportData.startingBalance)}</td>
                                                            </tr>
                                                            {reportData.transactions?.map((tx: any, idx: number) => (
                                                                <tr key={idx} className="border-b border-[var(--border-main)] hover:bg-[var(--sidebar-hover)] text-xs text-main transition-colors">
                                                                    <td className="p-4">{tx.date ? new Date(tx.date).toISOString().split('T')[0] : "N/A"}</td>
                                                                    <td className="p-4 font-mono font-bold">{tx.reference || "—"}</td>
                                                                    <td className="p-4">{tx.description || "—"}</td>
                                                                    <td className="p-4 text-center">
                                                                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wide ${
                                                                            tx.type === 'DEBIT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                                                        }`}>{tx.type}</span>
                                                                    </td>
                                                                    <td className={`p-4 text-right font-mono font-bold ${tx.type === 'DEBIT' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                        {tx.type === 'DEBIT' ? '+' : '-'}{formatCurrency(tx.amount)}
                                                                    </td>
                                                                    <td className="p-4 text-right font-mono font-bold text-main">{formatCurrency(tx.runningBalance)}</td>
                                                                </tr>
                                                            ))}
                                                            {reportData.transactions?.length === 0 && (
                                                                <tr>
                                                                    <td colSpan={6} className="p-8 text-center text-xs text-dim font-bold">No Transactions Found for the selected period.</td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    {/* All Accounts Summary Cards */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                        <div className="border border-[var(--border-main)] rounded-2xl p-5" style={{ background: 'linear-gradient(to bottom right, rgba(16,185,129,0.03), rgba(0,0,0,0))' }}>
                                                            <span className="text-[10px] font-black uppercase tracking-wider text-dim">Total Cash Balance</span>
                                                            <h3 className="text-2xl font-black text-emerald-400 mt-1">{formatCurrency(reportData.cashTotal || 0)}</h3>
                                                        </div>
                                                        <div className="border border-[var(--border-main)] rounded-2xl p-5" style={{ background: 'linear-gradient(to bottom right, rgba(56,189,248,0.03), rgba(0,0,0,0))' }}>
                                                            <span className="text-[10px] font-black uppercase tracking-wider text-dim">Total Bank Balance</span>
                                                            <h3 className="text-2xl font-black text-sky-400 mt-1">{formatCurrency(reportData.bankTotal || 0)}</h3>
                                                        </div>
                                                        <div className="border border-[var(--border-main)] rounded-2xl p-5" style={{ background: 'linear-gradient(to bottom right, rgba(212,241,46,0.03), rgba(0,0,0,0))' }}>
                                                            <span className="text-[10px] font-black uppercase tracking-wider text-dim">Grand Total Liquidity</span>
                                                            <h3 className="text-2xl font-black text-brand-lime mt-1">{formatCurrency(reportData.grandTotal || 0)}</h3>
                                                        </div>
                                                    </div>

                                                    {/* Cash Accounts List */}
                                                    <div className="border border-[var(--border-main)] rounded-2xl overflow-hidden shadow-inner">
                                                        <div className="p-4 border-b border-[var(--border-main)] bg-[var(--bg-input)] flex justify-between items-center">
                                                            <span className="text-xs font-black uppercase tracking-wider text-emerald-400">Cash Accounts</span>
                                                            <span className="text-xs font-black text-emerald-400 font-mono">{formatCurrency(reportData.cashTotal || 0)}</span>
                                                        </div>
                                                        <div className="p-4 space-y-2">
                                                            {reportData.cashAccounts?.map((item: any, idx: number) => (
                                                                <div key={idx} className="flex justify-between items-center text-xs text-dim py-1 pl-2 hover:text-white transition-colors">
                                                                    <span>{item.name} <span className="text-[10px] text-dim/50 ml-1">#{item.code} ({item.number})</span></span>
                                                                    <span className="font-mono font-bold text-main">{formatCurrency(item.balance)}</span>
                                                                </div>
                                                            ))}
                                                            {(!reportData.cashAccounts || reportData.cashAccounts.length === 0) && (
                                                                <div className="text-center py-4 text-xs text-dim">No cash accounts found.</div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Bank Accounts List */}
                                                    <div className="border border-[var(--border-main)] rounded-2xl overflow-hidden shadow-inner">
                                                        <div className="p-4 border-b border-[var(--border-main)] bg-[var(--bg-input)] flex justify-between items-center">
                                                            <span className="text-xs font-black uppercase tracking-wider text-sky-400">Bank Accounts</span>
                                                            <span className="text-xs font-black text-sky-400 font-mono">{formatCurrency(reportData.bankTotal || 0)}</span>
                                                        </div>
                                                        <div className="p-4 space-y-2">
                                                            {reportData.bankAccounts?.map((item: any, idx: number) => (
                                                                <div key={idx} className="flex justify-between items-center text-xs text-dim py-1 pl-2 hover:text-white transition-colors">
                                                                    <span>{item.name} <span className="text-[10px] text-dim/50 ml-1">#{item.code} ({item.number})</span></span>
                                                                    <span className="font-mono font-bold text-main">{formatCurrency(item.balance)}</span>
                                                                </div>
                                                            ))}
                                                            {(!reportData.bankAccounts || reportData.bankAccounts.length === 0) && (
                                                                <div className="text-center py-4 text-xs text-dim">No bank accounts found.</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* 3. Preview Daily Finance */}
                                    {selectedReport === 'daily-finance' && (
                                        <table className="w-full text-left border-collapse" id="report-preview-table">
                                            <thead className="sticky top-0 bg-[var(--bg-card)] z-20 shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                                                <tr className="border-b border-[var(--border-main)]" style={{ background: 'var(--bg-input)' }}>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Transaction Date</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-right">Income / Inflows</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-right">Expense / Outflows</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-right">Net Flow</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(reportData || []).map((row: any, idx: number) => {
                                                    const net = (row.income || 0) - (row.expenses || 0);
                                                    return (
                                                        <tr key={idx} className="border-b border-[var(--border-main)] hover:bg-[var(--sidebar-hover)] text-xs text-main transition-colors">
                                                            <td className="p-4 font-semibold">{row.date}</td>
                                                            <td className="p-4 text-emerald-400 font-bold text-right font-mono">{formatCurrency(row.income)}</td>
                                                            <td className="p-4 text-rose-400 font-bold text-right font-mono">{formatCurrency(row.expenses)}</td>
                                                            <td className={`p-4 font-bold text-right font-mono ${net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(net)}</td>
                                                        </tr>
                                                    );
                                                })}
                                                {(reportData || []).length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="p-8 text-center text-xs text-dim font-bold">No Daily Financial Logs Found.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    )}

                                    {/* 4. Preview General Ledger */}
                                    {selectedReport === 'ledger-report' && (
                                        <table className="w-full text-left border-collapse" id="report-preview-table">
                                            <thead className="sticky top-0 bg-[var(--bg-card)] z-20 shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                                                <tr className="border-b border-[var(--border-main)]" style={{ background: 'var(--bg-input)' }}>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Date</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Entry Number</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Account</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-right font-mono">Debit</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-right font-mono">Credit</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Description</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {getReportList(reportData).map((row: any, idx: number) => (
                                                    <tr key={idx} className="border-b border-[var(--border-main)] hover:bg-[var(--sidebar-hover)] text-xs text-main transition-colors">
                                                        <td className="p-4">{row.entryDate ? new Date(row.entryDate).toISOString().split('T')[0] : "N/A"}</td>
                                                        <td className="p-4 font-bold">{row.transactionId || (row.manualJournal ? "Manual Journal" : (row.voucher ? "Voucher" : "N/A"))}</td>
                                                        <td className="p-4">{row.accountingCode?.name || "N/A"} <span className="text-[10px] text-dim/50">({row.accountingCode?.code || ""})</span></td>
                                                        <td className="p-4 text-right text-emerald-400 font-bold font-mono">{row.type === 'DEBIT' ? formatCurrency(row.amount) : "-"}</td>
                                                        <td className="p-4 text-right text-rose-400 font-bold font-mono">{row.type === 'CREDIT' ? formatCurrency(row.amount) : "-"}</td>
                                                        <td className="p-4 opacity-75 max-w-[200px] truncate">{row.description || "-"}</td>
                                                    </tr>
                                                ))}
                                                {getReportList(reportData).length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="p-8 text-center text-xs text-dim font-bold">No Ledger Entries Found.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    )}

                                    {/* 5. Preview Bills */}
                                    {selectedReport === 'bills-report' && (
                                        <table className="w-full text-left border-collapse" id="report-preview-table">
                                            <thead className="sticky top-0 bg-[var(--bg-card)] z-20 shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                                                <tr className="border-b border-[var(--border-main)]" style={{ background: 'var(--bg-input)' }}>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Bill Number</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Vendor / Supplier</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Bill Date</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-right font-mono">Total Amount</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-right font-mono">Balance Due</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {getReportList(reportData).map((row: any, idx: number) => (
                                                    <tr key={idx} className="border-b border-[var(--border-main)] hover:bg-[var(--sidebar-hover)] text-xs text-main transition-colors">
                                                        <td className="p-4 font-bold">{row.billNumber}</td>
                                                        <td className="p-4 font-semibold">{row.supplier?.name || "N/A"}</td>
                                                        <td className="p-4">{row.billDate ? new Date(row.billDate).toISOString().split('T')[0] : "N/A"}</td>
                                                        <td className="p-4 text-right font-bold font-mono">{formatCurrency(row.totalAmount)}</td>
                                                        <td className="p-4 text-right text-rose-400 font-bold font-mono">{formatCurrency(row.balanceDue)}</td>
                                                        <td className="p-4 text-center">
                                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wide ${
                                                                row.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' :
                                                                row.status === 'VOID' ? 'bg-dim/10 text-dim' : 'bg-rose-500/10 text-rose-400'
                                                            }`}>{row.status}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {getReportList(reportData).length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="p-8 text-center text-xs text-dim font-bold">No Purchase Bills Found.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    )}

                                    {/* 6. Preview Invoices */}
                                    {selectedReport === 'invoices-report' && (
                                        <table className="w-full text-left border-collapse" id="report-preview-table">
                                            <thead className="sticky top-0 bg-[var(--bg-card)] z-20 shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                                                <tr className="border-b border-[var(--border-main)]" style={{ background: 'var(--bg-input)' }}>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Invoice Number</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Customer / Driver</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Issue Date</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-right font-mono">Total Due</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-right font-mono">Amount Paid</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-right font-mono">Balance</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {getReportList(reportData).map((row: any, idx: number) => (
                                                    <tr key={idx} className="border-b border-[var(--border-main)] hover:bg-[var(--sidebar-hover)] text-xs text-main transition-colors">
                                                        <td className="p-4 font-bold">{row.invoiceNumber}</td>
                                                        <td className="p-4 font-semibold">{row.customer?.name || row.driverId?.personalInfo?.fullName || "Unresolved Party"}</td>
                                                        <td className="p-4">{row.invoiceDate ? new Date(row.invoiceDate).toISOString().split('T')[0] : "N/A"}</td>
                                                        <td className="p-4 text-right font-bold font-mono">{formatCurrency(row.totalAmountDue)}</td>
                                                        <td className="p-4 text-right text-emerald-400 font-bold font-mono">{formatCurrency(row.amountPaid)}</td>
                                                        <td className="p-4 text-right text-rose-400 font-bold font-mono">{formatCurrency(row.balance)}</td>
                                                        <td className="p-4 text-center">
                                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wide ${
                                                                row.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400' :
                                                                row.status === 'OVERDUE' ? 'bg-rose-500/10 text-rose-400 animate-pulse' : 'bg-amber-500/10 text-amber-400'
                                                            }`}>{row.status}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {getReportList(reportData).length === 0 && (
                                                    <tr>
                                                        <td colSpan={7} className="p-8 text-center text-xs text-dim font-bold">No Invoices Found.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    )}

                                    {/* 7. Preview Payments Received */}
                                    {selectedReport === 'payments-received-report' && (
                                        <table className="w-full text-left border-collapse" id="report-preview-table">
                                            <thead className="sticky top-0 bg-[var(--bg-card)] z-20 shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                                                <tr className="border-b border-[var(--border-main)]" style={{ background: 'var(--bg-input)' }}>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Payment ID</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Date Received</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Payer Detail</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-right font-mono">Amount Collected</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Payment Method</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Reference Code</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {getReportList(reportData).map((row: any, idx: number) => (
                                                    <tr key={idx} className="border-b border-[var(--border-main)] hover:bg-[var(--sidebar-hover)] text-xs text-main transition-colors">
                                                        <td className="p-4 font-bold">{row.paymentNumber || "N/A"}</td>
                                                        <td className="p-4">{row.paymentDate ? new Date(row.paymentDate).toISOString().split('T')[0] : "N/A"}</td>
                                                        <td className="p-4 font-semibold">{row.driverId?.personalInfo?.fullName || row.customerId?.name || "N/A"}</td>
                                                        <td className="p-4 text-right text-emerald-400 font-bold font-mono">{formatCurrency(row.amountReceived)}</td>
                                                        <td className="p-4 font-semibold uppercase text-[10px] text-dim">{row.paymentMethod}</td>
                                                        <td className="p-4 font-mono text-dim">{row.referenceNumber || "-"}</td>
                                                    </tr>
                                                ))}
                                                {getReportList(reportData).length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="p-8 text-center text-xs text-dim font-bold">No Inflow Payments Logged.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    )}

                                    {/* 8. Preview Customers */}
                                    {selectedReport === 'customer-report' && (
                                        <table className="w-full text-left border-collapse" id="report-preview-table">
                                            <thead className="sticky top-0 bg-[var(--bg-card)] z-20 shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                                                <tr className="border-b border-[var(--border-main)]" style={{ background: 'var(--bg-input)' }}>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Customer ID</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Customer Name</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Contact Person</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Email</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Phone</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {getReportList(reportData).map((row: any, idx: number) => (
                                                    <tr key={idx} className="border-b border-[var(--border-main)] hover:bg-[var(--sidebar-hover)] text-xs text-main transition-colors">
                                                        <td className="p-4 font-mono">{typeof row.customerId === 'object' && row.customerId !== null ? row.customerId.customerId || row.customerId._id : row.customerId || "N/A"}</td>
                                                        <td className="p-4 font-bold">{row.name}</td>
                                                        <td className="p-4">{row.contactPerson || "-"}</td>
                                                        <td className="p-4">{row.email || "-"}</td>
                                                        <td className="p-4">{row.phone || "-"}</td>
                                                        <td className="p-4 text-center">
                                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${row.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-dim/10 text-dim'}`}>
                                                                {row.isActive ? "ACTIVE" : "INACTIVE"}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {getReportList(reportData).length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="p-8 text-center text-xs text-dim font-bold">No Customers Registered.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    )}

                                    {/* 9. Preview Credit Notes */}
                                    {selectedReport === 'credit-notes-report' && (
                                        <table className="w-full text-left border-collapse" id="report-preview-table">
                                            <thead className="sticky top-0 bg-[var(--bg-card)] z-20 shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                                                <tr className="border-b border-[var(--border-main)]" style={{ background: 'var(--bg-input)' }}>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Credit Note Number</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Credited Party</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Date Issued</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-right font-mono">Amount</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Reason</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {getReportList(reportData).map((row: any, idx: number) => (
                                                    <tr key={idx} className="border-b border-[var(--border-main)] hover:bg-[var(--sidebar-hover)] text-xs text-main transition-colors">
                                                        <td className="p-4 font-bold">{row.creditNoteNumber}</td>
                                                        <td className="p-4 font-semibold">{row.customerId?.name || row.driverId?.personalInfo?.fullName || "N/A"}</td>
                                                        <td className="p-4">{row.creditNoteDate ? new Date(row.creditNoteDate).toISOString().split('T')[0] : "N/A"}</td>
                                                        <td className="p-4 text-right text-emerald-400 font-bold font-mono">{formatCurrency(row.amount)}</td>
                                                        <td className="p-4 opacity-75 max-w-[150px] truncate">{row.reason}</td>
                                                        <td className="p-4 text-center">
                                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black tracking-wide ${
                                                                row.status === 'VOID' ? 'bg-dim/10 text-dim' : 'bg-emerald-500/10 text-emerald-400'
                                                            }`}>{row.status}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {getReportList(reportData).length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="p-8 text-center text-xs text-dim font-bold">No Credit Notes Issued.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    )}

                                    {/* 10. Preview Driver Performance */}
                                    {selectedReport === 'driver-performance' && (
                                        <table className="w-full text-left border-collapse" id="report-preview-table">
                                            <thead className="sticky top-0 bg-[var(--bg-card)] z-20 shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                                                <tr className="border-b border-[var(--border-main)]" style={{ background: 'var(--bg-input)' }}>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Driver Name</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-center">Driving Score</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-center">Avg Speed</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-center">Total Distance</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-center">Fuel Eff.</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-right">Rent Balance</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(reportData || []).map((row: any, idx: number) => (
                                                    <tr key={idx} className="border-b border-[var(--border-main)] hover:bg-[var(--sidebar-hover)] text-xs text-main transition-colors">
                                                        <td className="p-4 font-semibold">{row.name}</td>
                                                        <td className="p-4 text-center font-bold">
                                                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold ${
                                                                (row.drivingScore || 0) >= 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
                                                                (row.drivingScore || 0) >= 60 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/10' : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                                                            }`}>
                                                                {row.drivingScore || 'Unscored'}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-center opacity-80">{row.avgSpeed ? `${row.avgSpeed} km/h` : 'N/A'}</td>
                                                        <td className="p-4 text-center font-mono opacity-80">{row.totalDistance ? `${row.totalDistance.toLocaleString()} km` : 'N/A'}</td>
                                                        <td className="p-4 text-center opacity-80">{row.fuelEfficiency ? `${row.fuelEfficiency} km/l` : 'N/A'}</td>
                                                        <td className="p-4 text-right text-rose-400 font-bold font-mono">{formatCurrency(row.rentBalance)}</td>
                                                    </tr>
                                                ))}
                                                {(reportData || []).length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="p-8 text-center text-xs text-dim font-bold">No Driver Performance Metrics Found.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    )}

                                    {/* 11. Preview Staff Performance */}
                                    {selectedReport === 'staff-performance' && (
                                        <table className="w-full text-left border-collapse" id="report-preview-table">
                                            <thead className="sticky top-0 bg-[var(--bg-card)] z-20 shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                                                <tr className="border-b border-[var(--border-main)]" style={{ background: 'var(--bg-input)' }}>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Staff Member</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Role / Title</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-center">Tasks Done</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-center">Total Tasks</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-center">Completion Rate</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-center">Targets Met</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(reportData || []).map((row: any, idx: number) => (
                                                    <tr key={idx} className="border-b border-[var(--border-main)] hover:bg-[var(--sidebar-hover)] text-xs text-main transition-colors">
                                                        <td className="p-4 font-semibold">{row.name}</td>
                                                        <td className="p-4 font-bold uppercase tracking-wider text-[9px] text-dim">{row.role}</td>
                                                        <td className="p-4 text-center">{row.tasksCompleted}</td>
                                                        <td className="p-4 text-center">{row.totalTasks}</td>
                                                        <td className="p-4 text-center font-bold text-brand-lime font-mono">{row.taskCompletionRate}%</td>
                                                        <td className="p-4 text-center">
                                                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/10">
                                                                {row.targetsMet} / {row.activeTargets}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {(reportData || []).length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="p-8 text-center text-xs text-dim font-bold">No Staff Onboarding Performance Metrics Found.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    )}

                                    {/* 12. Preview Vehicle Report */}
                                    {selectedReport === 'vehicle-report' && (
                                        <table className="w-full text-left border-collapse" id="report-preview-table">
                                            <thead className="sticky top-0 bg-[var(--bg-card)] z-20 shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                                                <tr className="border-b border-[var(--border-main)]" style={{ background: 'var(--bg-input)' }}>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Fleet No.</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Plate Number</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Make & Model</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Year</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Fuel Type</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-center">Assignment</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Assigned Driver</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {getReportList(reportData).map((row: any, idx: number) => (
                                                    <tr key={idx} className="border-b border-[var(--border-main)] hover:bg-[var(--sidebar-hover)] text-xs text-main transition-colors">
                                                        <td className="p-4 font-bold">{row.basicDetails?.fleetNumber || "N/A"}</td>
                                                        <td className="p-4 font-mono font-bold text-brand-lime">{row.basicDetails?.plateNumber}</td>
                                                        <td className="p-4 font-semibold">{row.basicDetails?.make} {row.basicDetails?.model}</td>
                                                        <td className="p-4">{row.basicDetails?.year}</td>
                                                        <td className="p-4 uppercase text-[10px] text-dim">{row.basicDetails?.fuelType}</td>
                                                        <td className="p-4 text-center">
                                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${
                                                                row.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                                            }`}>{row.status}</span>
                                                        </td>
                                                        <td className="p-4 font-semibold">{row.driverId?.personalInfo?.fullName || "Unassigned"}</td>
                                                    </tr>
                                                ))}
                                                {getReportList(reportData).length === 0 && (
                                                    <tr>
                                                        <td colSpan={7} className="p-8 text-center text-xs text-dim font-bold">No Vehicles Found in Fleet.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    )}

                                    {/* 13. Preview Vendor / Suppliers */}
                                    {selectedReport === 'vendor-report' && (
                                        <table className="w-full text-left border-collapse" id="report-preview-table">
                                            <thead className="sticky top-0 bg-[var(--bg-card)] z-20 shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
                                                <tr className="border-b border-[var(--border-main)]" style={{ background: 'var(--bg-input)' }}>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Vendor Number</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Vendor Name</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Email</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Phone</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider">Category</th>
                                                    <th className="p-4 text-[10px] font-black uppercase text-dim tracking-wider text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {getReportList(reportData).map((row: any, idx: number) => (
                                                    <tr key={idx} className="border-b border-[var(--border-main)] hover:bg-[var(--sidebar-hover)] text-xs text-main transition-colors">
                                                        <td className="p-4 font-mono font-bold">{row.vendorNumber || "N/A"}</td>
                                                        <td className="p-4 font-bold">{row.companyName || row.name}</td>
                                                        <td className="p-4">{row.email || "-"}</td>
                                                        <td className="p-4 font-mono">{row.phone || "-"}</td>
                                                        <td className="p-4 font-bold uppercase text-[9px] text-dim">{row.category}</td>
                                                        <td className="p-4 text-center">
                                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${row.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-dim/10 text-dim'}`}>
                                                                {row.isActive ? "ACTIVE" : "INACTIVE"}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {getReportList(reportData).length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="p-8 text-center text-xs text-dim font-bold">No Suppliers / Vendors Registered.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    )}

                                </div>
                            ) : (
                                <div className="h-[300px] flex flex-col items-center justify-center text-xs text-dim font-bold uppercase tracking-widest gap-2">
                                    <AlertCircle size={20} />
                                    No Report Preview Data Generated.
                                </div>
                            )}
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};
export default ReportsPage;
