import { useState, useEffect } from 'react';
import OlaLoader from '../../../components/common/OlaLoader';
import { 
    Activity, RefreshCw, 
    List, Plus, Calendar, 
    TrendingUp, ShieldAlert, ChevronDown, 
    Percent, Layers, PieChart as PieIcon, Coins,
    Building2
} from 'lucide-react';
import { getLedgerEntries } from '../../../services/ledgerService';
import type { LedgerEntry } from '../../../services/ledgerService';
import { getInvoices } from '../../../services/invoiceService';
import type { Invoice } from '../../../services/invoiceService';
import { getAllBills } from '../../../services/billService';
import type { Bill } from '../../../services/billService';
import { getAllExpenses } from '../../../services/expenseService';
import type { Expense } from '../../../services/expenseService';
import { useNavigate } from 'react-router-dom';
import { 
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
    Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { getTasks, updateTaskStatus } from '../../../services/taskService';
import type { StaffTask } from '../../../services/taskService';
import { getUser, getUserRole } from '../../../utils/auth';
import { toast } from 'react-hot-toast';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const FinanceDashboard = () => {
    // Basic States
    const [tasks, setTasks] = useState<StaffTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const user = getUser();
    const userRole = getUserRole();

    // Zoho Toggles
    // @ts-ignore
    const [currency, setCurrency] = useState<'INR' | 'USD'>('USD');
    // @ts-ignore
    const [dataMode, setDataMode] = useState<'LIVE' | 'DEMO'>('LIVE');
    const [accountingBasis, setAccountingBasis] = useState<'ACCRUAL' | 'CASH'>('ACCRUAL');
    const [fiscalYearRange, setFiscalYearRange] = useState<string>('This Fiscal Year');

    // Aggregate values
    const [liveData, setLiveData] = useState({
        invoices: [] as Invoice[],
        bills: [] as Bill[],
        expenses: [] as Expense[],
        ledger: [] as LedgerEntry[],
    });

    const getCurrencySymbol = () => '$';

    const formatCurrency = (value: number) => {
        return getCurrencySymbol() + ' ' + value.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    const fetchDashboardData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Safe aggregation: catch individual failures so the UI never crashes
            const [ledgerRes, taskRes, invoiceRes, billRes, expenseRes] = await Promise.all([
                getLedgerEntries().catch(() => ({ data: [] as LedgerEntry[] })),
                getTasks({ assignedTo: user?.id || user?._id }).catch(() => [] as StaffTask[]),
                getInvoices({ limit: 1000 }).catch(() => ({ data: [] as Invoice[] })),
                getAllBills({ limit: 1000 }).catch(() => ({ data: [] as Bill[] })),
                getAllExpenses({ limit: 1000 }).catch(() => ({ data: [] as Expense[] }))
            ]);

            const resolvedLedger = Array.isArray(ledgerRes) ? ledgerRes : (ledgerRes && 'data' in ledgerRes && Array.isArray(ledgerRes.data) ? ledgerRes.data : []);
            const resolvedTasks = Array.isArray(taskRes) ? taskRes : (taskRes && 'data' in taskRes && Array.isArray(taskRes.data) ? taskRes.data : []);
            const resolvedInvoices = (invoiceRes && Array.isArray(invoiceRes.data)) ? invoiceRes.data : [];
            
            // Extract Bills from response which has standard { success: true, data: Bill[] }
            let resolvedBills: Bill[] = [];
            if (billRes && 'data' in billRes && Array.isArray(billRes.data)) {
                resolvedBills = billRes.data;
            } else if (Array.isArray(billRes)) {
                resolvedBills = billRes;
            }

            // Extract Expenses from response which has standard { success: true, data: Expense[] }
            let resolvedExpenses: Expense[] = [];
            if (expenseRes && 'data' in expenseRes && Array.isArray(expenseRes.data)) {
                resolvedExpenses = expenseRes.data;
            } else if (Array.isArray(expenseRes)) {
                resolvedExpenses = expenseRes;
            }

            setLiveData({
                invoices: resolvedInvoices,
                bills: resolvedBills,
                expenses: resolvedExpenses,
                ledger: resolvedLedger
            });

            setTasks(resolvedTasks.slice(0, 5));

            if (resolvedInvoices.length > 0 || resolvedBills.length > 0 || resolvedExpenses.length > 0) {
                // If there's active live data, suggest turning on Live mode
                setDataMode('LIVE');
            }

        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch financial data from API.');
        } finally {
            setLoading(false);
        }
    };

    const handleTaskUpdate = async (taskId: string, newStatus: string) => {
        try {
            let feedback = '';
            if (newStatus === 'COMPLETED') {
                feedback = window.prompt('Mission Feedback (Optional):') || '';
            }
            await updateTaskStatus(taskId, newStatus, feedback);
            toast.success('Mission status synchronized');
            fetchDashboardData();
        } catch (err) {
            toast.error('Synchronization failed');
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // ==========================================
    // DEMO DATASET (Mirrors Zoho Screenshots Precisely)
    // ==========================================
    // @ts-ignore
    const demoData = {
        receivables: {
            totalUnpaid: 99100.00,
            current: 0.00,
            overdue: 99100.00,
        },
        payables: {
            totalUnpaid: 800.00,
            current: 800.00,
            overdue: 0.00,
        },
        incomeExpenseAccrual: {
            income: 190000.00,
            expense: 1410.00,
            monthly: [
                { month: 'Apr 2026', income: 0, expense: 0 },
                { month: 'May 2026', income: 190000, expense: 1410 },
                { month: 'Jun 2026', income: 0, expense: 0 },
                { month: 'Jul 2026', income: 0, expense: 0 },
                { month: 'Aug 2026', income: 0, expense: 0 },
                { month: 'Sep 2026', income: 0, expense: 0 },
                { month: 'Oct 2026', income: 0, expense: 0 },
                { month: 'Nov 2026', income: 0, expense: 0 },
                { month: 'Dec 2026', income: 0, expense: 0 },
                { month: 'Jan 2027', income: 0, expense: 0 },
                { month: 'Feb 2027', income: 0, expense: 0 },
                { month: 'Mar 2027', income: 0, expense: 0 },
            ]
        },
        incomeExpenseCash: {
            income: 101320.00,
            expense: 24800.00,
            monthly: [
                { month: 'Apr 2026', income: 0, expense: 0 },
                { month: 'May 2026', income: 101320, expense: 24800 },
                { month: 'Jun 2026', income: 0, expense: 0 },
                { month: 'Jul 2026', income: 0, expense: 0 },
                { month: 'Aug 2026', income: 0, expense: 0 },
                { month: 'Sep 2026', income: 0, expense: 0 },
                { month: 'Oct 2026', income: 0, expense: 0 },
                { month: 'Nov 2026', income: 0, expense: 0 },
                { month: 'Dec 2026', income: 0, expense: 0 },
                { month: 'Jan 2027', income: 0, expense: 0 },
                { month: 'Feb 2027', income: 0, expense: 0 },
                { month: 'Mar 2027', income: 0, expense: 0 },
            ]
        },
        topExpenses: [
            { name: 'Labor', value: 1200.00 },
            { name: 'Cost of Goods Sold', value: 200.00 },
            { name: 'Job Costing', value: 10.00 }
        ],
        cashFlow: {
            startCash: 0.00,
            incoming: 101320.00,
            outgoing: 24800.00,
            endCash: 76520.00,
            monthly: [
                { month: 'Apr 2026', cash: 0 },
                { month: 'May 2026', cash: 76520 },
                { month: 'Jun 2026', cash: 76520 },
                { month: 'Jul 2026', cash: 76520 },
                { month: 'Aug 2026', cash: 76520 },
                { month: 'Sep 2026', cash: 76520 },
                { month: 'Oct 2026', cash: 76520 },
                { month: 'Nov 2026', cash: 76520 },
                { month: 'Dec 2026', cash: 76520 },
                { month: 'Jan 2027', cash: 76520 },
                { month: 'Feb 2027', cash: 76520 },
                { month: 'Mar 2027', cash: 76520 }
            ]
        },
        profitMargin: [
            { month: 'Apr 2026', margin: 0 },
            { month: 'May 2026', margin: 99.25 },
            { month: 'Jun 2026', margin: 80.00 },
            { month: 'Jul 2026', margin: 85.00 },
            { month: 'Aug 2026', margin: 91.00 },
            { month: 'Sep 2026', margin: 88.50 },
            { month: 'Oct 2026', margin: 92.00 },
            { month: 'Nov 2026', margin: 89.00 },
            { month: 'Dec 2026', margin: 94.00 },
            { month: 'Jan 2027', margin: 90.00 },
            { month: 'Feb 2027', margin: 95.00 },
            { month: 'Mar 2027', margin: 93.50 }
        ],
        aging: [
            { name: '1-15 Days', amount: 10000.00, color: '#3B82F6' },
            { name: '16-30 Days', amount: 20000.00, color: '#8B5CF6' },
            { name: '31-45 Days', amount: 30000.00, color: '#EC4899' },
            { name: '45+ Days', amount: 39100.00, color: '#EF4444' }
        ],
        taxLiability: [
            { name: 'GST Output (Collected)', tax: 18000.00, color: '#10B981' },
            { name: 'GST Input (Claimed)', tax: 1200.00, color: '#EF4444' }
        ],
        projections: [
            { month: 'May 2026', actual: 76520, projected: 76520 },
            { month: 'Jun 2026', projected: 85400 },
            { month: 'Jul 2026', projected: 98120 },
            { month: 'Aug 2026', projected: 124500 }
        ],
        revenueStreams: [
            { name: 'Rental Agreements', value: 140000.00 },
            { name: 'Workshop Maintenance', value: 30000.00 },
            { name: 'Late Fees / Extensions', value: 15000.00 },
            { name: 'Fleet Upgrades', value: 5000.00 }
        ],
        opexCapex: [
            { name: 'OpEx (Operational)', value: 1410.00 },
            { name: 'CapEx (Fleet Invest)', value: 25000.00 }
        ]
    };

    // ==========================================
    // DYNAMIC LIVE DATA COMPUTATIONS
    // ==========================================
    const getLiveDataCalculated = () => {
        const now = new Date();

        // 1. Receivables
        let recTotal = 0;
        let recCurrent = 0;
        let recOverdue = 0;
        liveData.invoices.forEach(inv => {
            const unpaid = inv.balance !== undefined ? inv.balance : (inv.totalAmountDue - inv.amountPaid);
            if (unpaid <= 0) return;
            recTotal += unpaid;
            const isOverdue = inv.status === 'OVERDUE' || new Date(inv.dueDate) < now;
            if (isOverdue) recOverdue += unpaid;
            else recCurrent += unpaid;
        });

        // 2. Payables
        let payTotal = 0;
        let payCurrent = 0;
        let payOverdue = 0;
        liveData.bills.forEach(b => {
            const unpaid = b.balanceDue !== undefined ? b.balanceDue : (b.totalAmount - b.amountPaid);
            if (unpaid <= 0) return;
            payTotal += unpaid;
            const isOverdue = b.status === 'VOID' ? false : (new Date(b.dueDate) < now);
            if (isOverdue) payOverdue += unpaid;
            else payCurrent += unpaid;
        });

        // 3. Accrual Basis totals
        let accrualIncome = 0;
        let accrualExpense = 0;
        const monthAccrualMap = new Map<string, { month: string; income: number; expense: number }>();

        // Accrual Income = Total of generated invoices
        liveData.invoices.forEach(inv => {
            accrualIncome += inv.totalAmountDue || 0;
            const date = new Date(inv.generatedAt || inv.dueDate);
            if (isNaN(date.getTime())) return;
            const mKey = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
            const curr = monthAccrualMap.get(mKey) || { month: mKey, income: 0, expense: 0 };
            curr.income += inv.totalAmountDue || 0;
            monthAccrualMap.set(mKey, curr);
        });

        // Accrual Expense = Total of vendor bills + immediate expenses
        liveData.bills.forEach(b => {
            accrualExpense += b.totalAmount || 0;
            const date = new Date(b.billDate || b.createdAt);
            if (isNaN(date.getTime())) return;
            const mKey = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
            const curr = monthAccrualMap.get(mKey) || { month: mKey, income: 0, expense: 0 };
            curr.expense += b.totalAmount || 0;
            monthAccrualMap.set(mKey, curr);
        });

        liveData.expenses.forEach(e => {
            accrualExpense += e.amount || 0;
            const date = new Date(e.expenseDate || e.createdAt);
            if (isNaN(date.getTime())) return;
            const mKey = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
            const curr = monthAccrualMap.get(mKey) || { month: mKey, income: 0, expense: 0 };
            curr.expense += e.amount || 0;
            monthAccrualMap.set(mKey, curr);
        });

        // 4. Cash Basis totals
        let cashIncome = 0;
        let cashExpense = 0;
        const monthCashMap = new Map<string, { month: string; income: number; expense: number }>();

        // Cash Income = Invoices actually collected
        liveData.invoices.forEach(inv => {
            cashIncome += inv.amountPaid || 0;
            inv.payments?.forEach(pmt => {
                const pDate = new Date(pmt.paidAt);
                if (isNaN(pDate.getTime())) return;
                const mKey = pDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
                const curr = monthCashMap.get(mKey) || { month: mKey, income: 0, expense: 0 };
                curr.income += pmt.amount || 0;
                monthCashMap.set(mKey, curr);
            });
        });

        // Cash Expense = Bills actually settled + immediate expenses paid
        liveData.bills.forEach(b => {
            cashExpense += b.amountPaid || 0;
            const bDate = new Date(b.updatedAt || b.createdAt);
            if (b.amountPaid > 0 && !isNaN(bDate.getTime())) {
                const mKey = bDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
                const curr = monthCashMap.get(mKey) || { month: mKey, income: 0, expense: 0 };
                curr.expense += b.amountPaid;
                monthCashMap.set(mKey, curr);
            }
        });

        liveData.expenses.forEach(e => {
            cashExpense += e.amount || 0;
            const date = new Date(e.expenseDate || e.createdAt);
            if (isNaN(date.getTime())) return;
            const mKey = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
            const curr = monthCashMap.get(mKey) || { month: mKey, income: 0, expense: 0 };
            curr.expense += e.amount || 0;
            monthCashMap.set(mKey, curr);
        });

        // 5. Top Expense accounts
        const expMap = new Map<string, number>();
        liveData.expenses.forEach(e => {
            const accName = e.expenseAccount?.name || 'General Operations';
            expMap.set(accName, (expMap.get(accName) || 0) + e.amount);
        });
        liveData.bills.forEach(b => {
            b.items?.forEach(item => {
                const name = typeof item.accountId === 'object' && item.accountId ? (item.accountId.name || 'Vendor Cost') : 'Supplier Inbound';
                expMap.set(name, (expMap.get(name) || 0) + (item.quantity * item.unitPrice));
            });
        });

        const liveTopExpenses = Array.from(expMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        if (liveTopExpenses.length === 0) {
            liveTopExpenses.push({ name: 'Operational Logistics', value: accrualExpense });
        }

        // 6. Cash Flow Monthly
        let runningCash = 0;
        const sortedMonths = Array.from(new Set([...monthCashMap.keys(), ...monthAccrualMap.keys()]))
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        const liveCashFlowMonthly = sortedMonths.map(m => {
            const cItem = monthCashMap.get(m) || { income: 0, expense: 0 };
            runningCash += (cItem.income - cItem.expense);
            return { month: m, cash: runningCash };
        });

        const liveAccrualMonthly = sortedMonths.map(m => {
            const item = monthAccrualMap.get(m) || { income: 0, expense: 0 };
            return { month: m, income: item.income, expense: item.expense };
        });

        const liveCashMonthly = sortedMonths.map(m => {
            const item = monthCashMap.get(m) || { income: 0, expense: 0 };
            return { month: m, income: item.income, expense: item.expense };
        });

        const finalAccrualMonthly = liveAccrualMonthly.length > 0 ? liveAccrualMonthly : [{ month: 'No Data', income: 0, expense: 0 }];
        const finalCashMonthly = liveCashMonthly.length > 0 ? liveCashMonthly : [{ month: 'No Data', income: 0, expense: 0 }];
        const finalCashFlowMonthly = liveCashFlowMonthly.length > 0 ? liveCashFlowMonthly : [{ month: 'No Data', cash: 0 }];

        // =====================================
        // NEW DYNAMIC ANALYTICS CALCULATIONS
        // =====================================

        // 1. Operating Profit Margin Trends
        const profitMargin = sortedMonths.map(m => {
            const accItem = monthAccrualMap.get(m) || { income: 0, expense: 0 };
            const cashItem = monthCashMap.get(m) || { income: 0, expense: 0 };
            const basisIncome = accountingBasis === 'ACCRUAL' ? accItem.income : cashItem.income;
            const basisExpense = accountingBasis === 'ACCRUAL' ? accItem.expense : cashItem.expense;
            const margin = basisIncome > 0 ? Math.round(((basisIncome - basisExpense) / basisIncome) * 10000) / 100 : 0;
            return { month: m, margin };
        });
        if (profitMargin.length === 0) {
            profitMargin.push({ month: 'No Data', margin: 0 });
        }

        // 2. Invoice Payment Aging
        let age1_15 = 0;
        let age16_30 = 0;
        let age31_45 = 0;
        let age45Plus = 0;
        liveData.invoices.forEach(inv => {
            const unpaid = inv.balance !== undefined ? inv.balance : (inv.totalAmountDue - inv.amountPaid);
            if (unpaid <= 0) return;
            const dueMs = new Date(inv.dueDate).getTime();
            const daysOverdue = Math.floor((now.getTime() - dueMs) / (1000 * 60 * 60 * 24));
            if (daysOverdue <= 0) return;
            if (daysOverdue <= 15) age1_15 += unpaid;
            else if (daysOverdue <= 30) age16_30 += unpaid;
            else if (daysOverdue <= 45) age31_45 += unpaid;
            else age45Plus += unpaid;
        });
        const aging = [
            { range: '1-15 Days', amount: age1_15 },
            { range: '16-30 Days', amount: age16_30 },
            { range: '31-45 Days', amount: age31_45 },
            { range: '45+ Days', amount: age45Plus }
        ];

        // 3. GST & Tax Liability
        let cgstOut = 0, sgstOut = 0, igstOut = 0;
        let cgstIn = 0, sgstIn = 0, igstIn = 0;
        liveData.invoices.forEach(inv => {
            const tax = inv.taxAmount || 0;
            cgstOut += tax * 0.4;
            sgstOut += tax * 0.4;
            igstOut += tax * 0.2;
        });
        liveData.bills.forEach(b => {
            const tax = (b as any).taxAmount || 0;
            cgstIn += tax * 0.4;
            sgstIn += tax * 0.4;
            igstIn += tax * 0.2;
        });
        if (cgstOut === 0 && sgstOut === 0) {
            liveData.invoices.forEach(inv => {
                const base = inv.subtotal || inv.totalAmountDue || 0;
                cgstOut += base * 0.09;
                sgstOut += base * 0.09;
            });
        }
        if (cgstIn === 0 && sgstIn === 0) {
            liveData.bills.forEach(b => {
                const base = b.totalAmount || 0;
                cgstIn += base * 0.09;
                sgstIn += base * 0.09;
            });
        }
        const taxLiability = [
            { name: 'CGST', input: Math.round(cgstIn), output: Math.round(cgstOut) },
            { name: 'SGST', input: Math.round(sgstIn), output: Math.round(sgstOut) },
            { name: 'IGST', input: Math.round(igstIn), output: Math.round(igstOut) },
        ];

        // 4. 3-Month Projections
        const projMonths = [];
        for (let i = 1; i <= 3; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() + i);
            projMonths.push(d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' }));
        }
        let m1Inc = 0, m1Exp = 0;
        let m2Inc = 0, m2Exp = 0;
        let m3Inc = 0, m3Exp = 0;
        const nowMs = now.getTime();
        liveData.invoices.forEach(inv => {
            const unpaid = inv.balance !== undefined ? inv.balance : (inv.totalAmountDue - inv.amountPaid);
            if (unpaid <= 0) return;
            const dueMs = new Date(inv.dueDate).getTime();
            const diffDays = (dueMs - nowMs) / (1000 * 60 * 60 * 24);
            if (diffDays <= 30) m1Inc += unpaid;
            else if (diffDays <= 60) m2Inc += unpaid;
            else if (diffDays <= 90) m3Inc += unpaid;
        });
        liveData.bills.forEach(b => {
            const unpaid = b.balanceDue !== undefined ? b.balanceDue : (b.totalAmount - b.amountPaid);
            if (unpaid <= 0) return;
            const dueMs = new Date(b.dueDate).getTime();
            const diffDays = (dueMs - nowMs) / (1000 * 60 * 60 * 24);
            if (diffDays <= 30) m1Exp += unpaid;
            else if (diffDays <= 60) m2Exp += unpaid;
            else if (diffDays <= 90) m3Exp += unpaid;
        });
        const m1Cash = runningCash + m1Inc - m1Exp;
        const m2Cash = m1Cash + m2Inc - m2Exp;
        const m3Cash = m2Cash + m3Inc - m3Exp;
        const projections = [
            { month: projMonths[0], projected: Math.max(0, Math.round(m1Cash)) },
            { month: projMonths[1], projected: Math.max(0, Math.round(m2Cash)) },
            { month: projMonths[2], projected: Math.max(0, Math.round(m3Cash)) },
        ];

        // 5. Revenue breakups
        let rental = 0, maint = 0, late = 0, upgrades = 0;
        liveData.invoices.forEach(inv => {
            const amt = inv.totalAmountDue || 0;
            if (inv.invoiceType === 'MANUAL' && inv.lineItems && inv.lineItems.length > 0) {
                inv.lineItems.forEach(item => {
                    const name = (item.name || '').toLowerCase();
                    const val = (item.unitPrice || 0) * (item.qty || 1);
                    if (name.includes('rent') || name.includes('lease') || name.includes('hire')) rental += val;
                    else if (name.includes('maint') || name.includes('repair') || name.includes('brake') || name.includes('tire') || name.includes('wash')) maint += val;
                    else if (name.includes('late') || name.includes('fine') || name.includes('penalty') || name.includes('charge')) late += val;
                    else if (name.includes('upgrade') || name.includes('fleet') || name.includes('model')) upgrades += val;
                    else rental += val;
                });
            } else {
                rental += amt;
            }
        });
        const revenueStreams = [
            { name: 'Rental Agreements', value: Math.round(rental) },
            { name: 'Maintenance Services', value: Math.round(maint) },
            { name: 'Late Charges', value: Math.round(late) },
            { name: 'Fleet Upgrades', value: Math.round(upgrades) }
        ];

        // 6. OpEx vs CapEx Ratio
        let opex = 0, capex = 0;
        liveData.expenses.forEach(e => opex += e.amount || 0);
        liveData.bills.forEach(b => {
            const desc = (b.notes || (b as any).description || '').toLowerCase();
            if (desc.includes('acquisition') || desc.includes('purchase') || desc.includes('vehicle') || desc.includes('capital') || desc.includes('fleet')) {
                capex += b.totalAmount || 0;
            } else {
                opex += b.totalAmount || 0;
            }
        });
        const opexCapex = [
            { name: 'OpEx (Operational)', value: Math.round(opex) },
            { name: 'CapEx (Fleet Invest)', value: Math.round(capex) }
        ];

        return {
            receivables: {
                totalUnpaid: recTotal,
                current: recCurrent,
                overdue: recOverdue,
            },
            payables: {
                totalUnpaid: payTotal,
                current: payCurrent,
                overdue: payOverdue,
            },
            accrual: {
                income: accrualIncome,
                expense: accrualExpense,
                monthly: finalAccrualMonthly
            },
            cash: {
                income: cashIncome,
                expense: cashExpense,
                monthly: finalCashMonthly
            },
            topExpenses: liveTopExpenses,
            cashFlow: {
                startCash: 0,
                incoming: cashIncome,
                outgoing: cashExpense,
                endCash: runningCash,
                monthly: finalCashFlowMonthly
            },
            profitMargin,
            aging,
            taxLiability,
            projections,
            revenueStreams,
            opexCapex
        };
    };

    if (loading) {
        return <OlaLoader fullScreen size="lg" />;
    }

    const currentDataset = getLiveDataCalculated();

    const currentIncome = accountingBasis === 'ACCRUAL' ? currentDataset.accrual.income : currentDataset.cash.income;
    const currentExpense = accountingBasis === 'ACCRUAL' ? currentDataset.accrual.expense : currentDataset.cash.expense;
    const currentMonthlyData = accountingBasis === 'ACCRUAL' ? currentDataset.accrual.monthly : currentDataset.cash.monthly;

    return (
        <div className="container-responsive space-y-6 pb-12 animate-in fade-in duration-700">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Finance Command Center', active: true }]} />

            {/* Premium Header Control Deck */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 border-b border-white/5 pb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5" style={{ color: 'var(--text-main)' }}>
                        <Coins size={24} className="text-brand-lime animate-pulse" style={{ color: 'var(--brand-lime)' }} />
                        Unified Finance Command
                    </h1>
                    <p className="text-xs font-semibold text-dim mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest text-[9px]">OVERSIGHT</span>
                        Real-time institutional liquidity, tax sheets, and double-entry accounting records.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    {/* Refresh */}
                    <button
                        onClick={fetchDashboardData}
                        className="flex items-center justify-center p-2.5 rounded-xl border transition-all hover:bg-white/5 active:scale-90"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                        title="Re-synchronize Live Databases"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>

                    {/* Record Payment */}
                    <button
                        onClick={() => navigate('../payments-received')}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide bg-brand-lime text-[#0A0A0A] transition-all hover:scale-105 active:scale-95 shadow-lg shadow-brand-lime/10"
                        style={{ backgroundColor: 'var(--brand-lime)' }}
                    >
                        <Plus size={14} strokeWidth={3} /> Record Payment
                    </button>
                </div>
            </div>

            {/* Error Message banner */}
            {error && (
                <div className="flex items-center gap-3.5 p-4 rounded-xl text-xs font-semibold" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
                    <ShieldAlert size={18} /> {error}
                </div>
            )}

            {/* ========================================================
                1. RECEIVABLES & PAYABLES CARDS (ENHANCED VISUAL LAYOUT)
                ======================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Enhanced Total Receivables */}
                <div className="rounded-2xl border p-6 flex flex-col justify-between group transition-all hover:border-white/10" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-dim">Total Receivables</h3>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-1 w-full md:w-1/2">
                            <p className="text-[10px] font-bold text-dim uppercase tracking-wider">Total Unpaid Invoices</p>
                            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4" style={{ color: 'var(--text-main)' }}>
                                {formatCurrency(currentDataset.receivables.totalUnpaid)}
                            </h2>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between text-xs font-bold text-dim">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                                        <span>Current:</span>
                                    </div>
                                    <span className="font-bold text-emerald-400">{formatCurrency(currentDataset.receivables.current)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-bold text-dim">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block animate-pulse" />
                                        <span>Overdue:</span>
                                    </div>
                                    <span className="font-bold text-orange-400">{formatCurrency(currentDataset.receivables.overdue)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-[140px] w-full md:w-1/2 flex justify-center relative">
                            {currentDataset.receivables.totalUnpaid === 0 ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-dim text-xs opacity-50">
                                    <PieIcon size={32} className="mb-2 opacity-50" />
                                    <span>No Receivables</span>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Current', value: currentDataset.receivables.current || 0.001 },
                                                { name: 'Overdue', value: currentDataset.receivables.overdue }
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={60}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            <Cell fill="#10B981" />
                                            <Cell fill="#F97316" />
                                        </Pie>
                                        <Tooltip 
                                            formatter={(val: any) => formatCurrency(Number(val) === 0.001 ? 0 : Number(val))}
                                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '8px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>

                {/* Enhanced Total Payables */}
                <div className="rounded-2xl border p-6 flex flex-col justify-between group transition-all hover:border-white/10" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-dim">Total Payables</h3>
                        </div>
                        <button 
                            onClick={() => navigate('../purchase-bills')}
                            className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-brand-lime bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg hover:bg-brand-lime hover:text-black transition-all"
                        >
                            <Plus size={10} strokeWidth={3} /> New
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-1 w-full md:w-1/2">
                            <p className="text-[10px] font-bold text-dim uppercase tracking-wider">Total Unpaid Bills</p>
                            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4" style={{ color: 'var(--text-main)' }}>
                                {formatCurrency(currentDataset.payables.totalUnpaid)}
                            </h2>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between text-xs font-bold text-dim">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                                        <span>Current:</span>
                                    </div>
                                    <span className="font-bold text-blue-400">{formatCurrency(currentDataset.payables.current)}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs font-bold text-dim">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block animate-pulse" />
                                        <span>Overdue:</span>
                                    </div>
                                    <span className="font-bold text-rose-400">{formatCurrency(currentDataset.payables.overdue)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-[140px] w-full md:w-1/2 flex justify-center relative">
                            {currentDataset.payables.totalUnpaid === 0 ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-dim text-xs opacity-50">
                                    <PieIcon size={32} className="mb-2 opacity-50" />
                                    <span>No Payables</span>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Current', value: currentDataset.payables.current || 0.001 },
                                                { name: 'Overdue', value: currentDataset.payables.overdue }
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={60}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            <Cell fill="#3B82F6" />
                                            <Cell fill="#F43F5E" />
                                        </Pie>
                                        <Tooltip 
                                            formatter={(val: any) => formatCurrency(Number(val) === 0.001 ? 0 : Number(val))}
                                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '8px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ========================================================
                2. INCOME & EXPENSE (WITH CASH/ACCRUAL TOGGLE BASIS)
                ======================================================== */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Accrual / Cash Income Chart */}
                <div className="xl:col-span-2 rounded-2xl border p-6 flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                        <div className="space-y-1">
                            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                <Layers size={14} className="text-brand-lime" />
                                Income and Expense
                            </h3>
                            <p className="text-[10px] text-dim font-medium italic">Double-entry ledger mapping on {accountingBasis.toLowerCase()} accounting base.</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            {/* Year selector */}
                            <div className="relative">
                                <select 
                                    value={fiscalYearRange}
                                    onChange={(e) => setFiscalYearRange(e.target.value)}
                                    className="pl-3 pr-8 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider outline-none cursor-pointer appearance-none"
                                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="This Fiscal Year">This Fiscal Year</option>
                                    <option value="Previous Fiscal Year">Prev Fiscal Year</option>
                                    <option value="This Quarter">This Quarter</option>
                                </select>
                                <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60 pointer-events-none" />
                            </div>

                            <div className="flex rounded-lg p-0.5 border" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                <button
                                    onClick={() => {
                                        setAccountingBasis('ACCRUAL');
                                        toast.success('Accrual base active: showing all bills & invoice dues');
                                    }}
                                    className="px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all"
                                    style={accountingBasis === 'ACCRUAL' ? { background: 'rgba(200,230,0,0.15)', color: 'var(--brand-lime)' } : { color: 'var(--text-dim)' }}
                                >
                                    Accrual
                                </button>
                                <button
                                    onClick={() => {
                                        setAccountingBasis('CASH');
                                        toast.success('Cash base active: showing actual currency cash flow');
                                    }}
                                    className="px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all"
                                    style={accountingBasis === 'CASH' ? { background: 'rgba(200,230,0,0.15)', color: 'var(--brand-lime)' } : { color: 'var(--text-dim)' }}
                                >
                                    Cash
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-b border-white/5 pb-6 mb-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded inline-block" style={{ backgroundColor: 'rgb(212, 241, 46)' }} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-dim">Total Income</span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
                                {formatCurrency(currentIncome)}
                            </h2>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded inline-block" style={{ backgroundColor: 'rgba(212, 241, 46, 0.4)' }} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-dim">Total Expenses</span>
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
                                {formatCurrency(currentExpense)}
                            </h2>
                        </div>
                    </div>

                    {/* Bar Chart */}
                    <div style={{ width: '100%', height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={currentMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(Number(value))} />
                                <Tooltip 
                                    cursor={{ fill: 'rgba(255,255,255,0.01)' }}
                                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', fontSize: 11 }}
                                    formatter={(value: any) => formatCurrency(Number(value))}
                                />
                                <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                                <Bar name="Income" dataKey="income" fill="rgb(212, 241, 46)" radius={[4, 4, 0, 0]} maxBarSize={20} />
                                <Bar name="Expense" dataKey="expense" fill="rgba(212, 241, 46, 0.4)" radius={[4, 4, 0, 0]} maxBarSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <p className="text-[9px] font-bold text-dim italic mt-6 text-center opacity-40">
                        * Income and expense values displayed are exclusive of municipal corporate taxes.
                    </p>
                </div>

                {/* ========================================================
                    3. TOP EXPENSES (DONUT REPRESENTATION)
                    ======================================================== */}
                <div className="rounded-2xl border p-6 flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                            <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Top Expenses</h3>
                        </div>
                        <div className="relative">
                            <select 
                                className="pl-3 pr-8 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider outline-none cursor-pointer appearance-none"
                                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="This Fiscal Year">This Fiscal Year</option>
                                <option value="This Quarter">This Quarter</option>
                            </select>
                            <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60 pointer-events-none" />
                        </div>
                    </div>

                    {/* Enhanced Bar Chart container (Reduced Size) */}
                    <div className="py-4 flex-grow flex items-center justify-center" style={{ minHeight: 160, maxHeight: 160 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[...currentDataset.topExpenses].sort((a,b)=>b.value-a.value).slice(0, 5)} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
                                <XAxis type="number" stroke="var(--text-dim)" fontSize={8} tickLine={false} axisLine={false} tickFormatter={(val) => formatCurrency(val)} />
                                <YAxis type="category" dataKey="name" stroke="var(--text-dim)" fontSize={8} tickLine={false} axisLine={false} width={80} />
                                <Tooltip 
                                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', fontSize: 11 }}
                                    formatter={(value: any) => formatCurrency(Number(value))} 
                                />
                                <Bar dataKey="value" fill="rgb(212, 241, 46)" radius={[0, 4, 4, 0]} barSize={16} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ========================================================
                4. CASH FLOW AREA CHART (ZOHO BASIS STRUCTURE)
                ======================================================== */}
            <div className="rounded-2xl border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-brand-lime rounded-full" />
                        <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Cash Flow</h3>
                    </div>
                    <div className="relative">
                        <select 
                            className="pl-3 pr-8 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider outline-none cursor-pointer appearance-none"
                            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <option value="This Fiscal Year">This Fiscal Year</option>
                        </select>
                        <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-60 pointer-events-none" />
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    {/* Bar Chart */}
                    <div className="xl:col-span-3" style={{ width: '100%', height: 260 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={currentDataset.cashFlow.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(Number(value))} />
                                <Tooltip 
                                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', fontSize: 11 }}
                                    itemStyle={{ color: 'rgb(212, 241, 46)', fontWeight: 'bold' }}
                                    formatter={(value: any) => [formatCurrency(Number(value)), 'Cash Balance']}
                                />
                                <Bar dataKey="cash" fill="rgb(212, 241, 46)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Right side stats list */}
                    <div className="flex flex-col justify-center space-y-5 border-t xl:border-t-0 xl:border-l border-white/5 pt-6 xl:pt-0 xl:pl-8">
                        {/* Cash on start */}
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded bg-gray-500 inline-block" />
                                <span className="text-[10px] font-bold text-dim uppercase tracking-wider">Cash as on 01/04/2026</span>
                            </div>
                            <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>
                                {formatCurrency(currentDataset.cashFlow.startCash)}
                            </h3>
                        </div>

                        {/* Incoming */}
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block animate-pulse" />
                                <span className="text-[10px] font-bold text-dim uppercase tracking-wider">Incoming ( + )</span>
                            </div>
                            <h3 className="text-lg font-bold text-emerald-400">
                                {formatCurrency(currentDataset.cashFlow.incoming)}
                            </h3>
                        </div>

                        {/* Outgoing */}
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded bg-red-500 inline-block" />
                                <span className="text-[10px] font-bold text-dim uppercase tracking-wider">Outgoing ( - )</span>
                            </div>
                            <h3 className="text-lg font-bold text-red-400">
                                {formatCurrency(currentDataset.cashFlow.outgoing)}
                            </h3>
                        </div>

                        {/* Net end cash */}
                        <div className="space-y-1 pt-3 border-t border-white/5">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded bg-brand-lime inline-block" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-brand-lime">Cash as on 31/03/2027 ( = )</span>
                            </div>
                            <h3 className="text-xl font-bold text-brand-lime">
                                {formatCurrency(currentDataset.cashFlow.endCash)}
                            </h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* ========================================================
                5. ADDITIONAL PREMIUM ANALYTICAL CHARTS (WOW VALUE DECK)
                ======================================================== */}
            <div>
                <div className="flex items-center gap-2.5 mb-6">
                    <TrendingUp size={18} className="text-brand-lime" />
                    <h2 className="text-sm font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-main)' }}>
                        Institutional Finance Analytics Deck
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {/* Chart A: Operating Profit Margin Ratio */}
                    <div className="rounded-2xl border p-6 flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 mb-6">
                            <Percent size={14} className="text-brand-lime" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-dim">Operating Profit Margin</h4>
                        </div>
                        <div style={{ width: '100%', height: 160 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={currentDataset.profitMargin} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                    <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={8} tickLine={false} axisLine={false} />
                                    <YAxis stroke="var(--text-dim)" fontSize={8} tickLine={false} axisLine={false} />
                                    <Tooltip 
                                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', fontSize: 11 }}
                                        formatter={(value: any) => `${value}%`} 
                                    />
                                    <Line type="linear" dataKey="margin" stroke="rgb(212, 241, 46)" strokeWidth={3} dot={{ r: 3, strokeWidth: 2, fill: 'var(--bg-card)' }} activeDot={{ r: 5 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs">
                            <span className="text-dim font-bold">Annual Avg Margin</span>
                            <span className="font-black text-brand-lime">
                                {(currentDataset.profitMargin.reduce((acc, c) => acc + c.margin, 0) / currentDataset.profitMargin.length).toFixed(2)}%
                            </span>
                        </div>
                    </div>

                    {/* Chart B: Overdue Aging Stacked Metrics */}
                    <div className="rounded-2xl border p-6 flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 mb-6">
                            <Calendar size={14} className="text-orange-500" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-dim">Invoice Payment Aging</h4>
                        </div>
                        <div style={{ width: '100%', height: 160 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={currentDataset.aging} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                    <XAxis dataKey="range" stroke="var(--text-dim)" fontSize={8} tickLine={false} axisLine={false} />
                                    <YAxis stroke="var(--text-dim)" fontSize={8} tickLine={false} axisLine={false} />
                                    <Tooltip 
                                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', fontSize: 11 }}
                                        formatter={(value: any) => formatCurrency(Number(value))} 
                                    />
                                    <Bar dataKey="amount" fill="rgb(212, 241, 46)" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs">
                            <span className="text-dim font-bold">Heaviest Overdue Tier</span>
                            <span className="font-black text-red-400">
                                {[...currentDataset.aging].sort((a,b) => b.amount - a.amount)[0]?.range || 'None'}
                            </span>
                        </div>
                    </div>

                    {/* Chart C: GST Liability Output vs Input */}
                    <div className="rounded-2xl border p-6 flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 mb-6">
                            <Building2 size={14} className="text-blue-500" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-dim">GST & Tax Liability Summary</h4>
                        </div>
                        <div style={{ width: '100%', height: 160 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={currentDataset.taxLiability} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                    <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={8} tickLine={false} axisLine={false} />
                                    <YAxis stroke="var(--text-dim)" fontSize={8} tickLine={false} axisLine={false} />
                                    <Tooltip 
                                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', fontSize: 11 }}
                                        formatter={(value: any) => formatCurrency(Number(value))} 
                                    />
                                    <Bar dataKey="output" fill="rgb(212, 241, 46)" name="Output Tax" radius={[4, 4, 0, 0]} maxBarSize={20} />
                                    <Bar dataKey="input" fill="#0EA5E9" name="Input Tax" radius={[4, 4, 0, 0]} maxBarSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs">
                            <span className="text-dim font-bold">Net GST Payable</span>
                            <span className="font-black text-brand-lime">
                                {formatCurrency(currentDataset.taxLiability.reduce((acc, c) => acc + (c.output - c.input), 0))}
                            </span>
                        </div>
                    </div>

                    {/* Chart D: Cash flow Projection & Forecast */}
                    <div className="rounded-2xl border p-6 flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 mb-6">
                            <TrendingUp size={14} className="text-brand-lime" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-dim">Cash Flow Projections (3M)</h4>
                        </div>
                        <div style={{ width: '100%', height: 160 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={currentDataset.projections} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                    <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={8} tickLine={false} axisLine={false} />
                                    <YAxis stroke="var(--text-dim)" fontSize={8} tickLine={false} axisLine={false} />
                                    <Tooltip 
                                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', fontSize: 11 }}
                                        formatter={(value: any) => formatCurrency(Number(value))} 
                                    />
                                    <Line type="linear" dataKey="projected" stroke="rgb(212, 241, 46)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'var(--bg-card)' }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs">
                            <span className="text-dim font-bold">Projected Cash Balance</span>
                            <span className="font-black text-emerald-400">
                                {formatCurrency(currentDataset.projections[currentDataset.projections.length - 1]?.projected || 0)}
                            </span>
                        </div>
                    </div>

                    {/* Chart E: Revenue Streams breakdown */}
                    <div className="rounded-2xl border p-6 flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 mb-6">
                            <PieIcon size={14} className="text-brand-lime" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-dim">Revenue Breakup by Source</h4>
                        </div>
                        <div style={{ width: '100%', height: 160 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={currentDataset.revenueStreams} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                    <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={8} tickLine={false} axisLine={false} />
                                    <Tooltip 
                                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', fontSize: 11 }}
                                        formatter={(value: any) => formatCurrency(Number(value))} 
                                    />
                                    <Bar dataKey="value" fill="rgb(212, 241, 46)" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs">
                            <span className="text-dim font-bold">Primary Revenue</span>
                            <span className="font-black text-brand-lime">
                                {[...currentDataset.revenueStreams].sort((a,b) => b.value - a.value)[0]?.name || 'None'}
                            </span>
                        </div>
                    </div>

                    {/* Chart F: OpEx vs CapEx Efficiency Ratio */}
                    <div className="rounded-2xl border p-6 flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 mb-6">
                            <Layers size={14} className="text-pink-500" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-dim">OpEx vs CapEx Budgeting</h4>
                        </div>
                        <div style={{ width: '100%', height: 160 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={currentDataset.opexCapex} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                    <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={8} tickLine={false} axisLine={false} />
                                    <YAxis stroke="var(--text-dim)" fontSize={8} tickLine={false} axisLine={false} />
                                    <Tooltip 
                                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: '12px', fontSize: 11 }}
                                        formatter={(value: any) => formatCurrency(Number(value))} 
                                    />
                                    <Bar dataKey="value" fill="rgb(212, 241, 46)" radius={[4, 4, 0, 0]} maxBarSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-xs">
                            <span className="text-dim font-bold">CapEx Allocation</span>
                            <span className="font-black text-purple-400">
                                {(() => {
                                    const opexVal = currentDataset.opexCapex[0]?.value || 0;
                                    const capexVal = currentDataset.opexCapex[1]?.value || 0;
                                    return (opexVal + capexVal) > 0 ? ((capexVal / (opexVal + capexVal)) * 100).toFixed(1) + '%' : '0.0%';
                                })()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Deck: Assigned Tasks & Recent Transactions */}
            <div className={`grid grid-cols-1 ${userRole !== 'admin' ? 'xl:grid-cols-3' : ''} gap-6`}>
                {/* Global Transaction Ledger */}
                <div className={`${userRole !== 'admin' ? 'xl:col-span-2' : ''} rounded-2xl border overflow-hidden flex flex-col justify-between`} style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-brand-lime rounded-full" />
                            <h3 className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-main)' }}>Global Transaction Ledger</h3>
                        </div>
                        <button 
                            onClick={() => navigate('../ledger')} 
                            className="text-[9px] font-black uppercase tracking-widest text-brand-lime hover:opacity-75 transition-all px-3 py-1.5 bg-brand-lime/5 rounded-lg border border-brand-lime/10"
                        >
                            Ledger Book →
                        </button>
                    </div>
                    
                    <div className="overflow-x-auto flex-grow">
                        {loading ? (
                            <div className="py-20 flex justify-center">
                                <OlaLoader size="sm" />
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="border-b" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-dim">Transaction Date</th>
                                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-dim">Entry Description</th>
                                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-dim">Fiscal Mapping</th>
                                        <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-dim text-right">Settlement</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                    {liveData.ledger.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-dim font-bold text-xs uppercase tracking-wider">
                                                No recent ledger entries found
                                            </td>
                                        </tr>
                                    ) : (
                                        liveData.ledger.slice(0, 10).map((entry) => {
                                            const entryDateStr = entry.entryDate || entry.date;
                                            const dateObj = new Date(entryDateStr);
                                            const formattedDate = !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString() : entryDateStr;
                                            const amount = (entry.amount !== undefined && entry.amount !== null) ? entry.amount : ((entry.credit || 0) > 0 ? (entry.credit || 0) : (entry.debit || 0));
                                            const isDebit = (entry.amount !== undefined && entry.amount !== null) ? (entry.type === 'DEBIT') : ((entry.debit || 0) > 0);

                                            return (
                                                <tr 
                                                    key={entry._id} 
                                                    className="hover:bg-white/[0.05] transition-colors cursor-pointer"
                                                    onClick={() => navigate(`../ledger/${entry._id}`)}
                                                >
                                                    <td className="px-6 py-4 font-medium" style={{ color: 'var(--text-main)' }}>{formattedDate}</td>
                                                    <td className="px-6 py-4 text-dim max-w-xs truncate font-medium">{entry.description}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] text-dim">
                                                                {entry.accountingCode?.code}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-dim">{entry.accountingCode?.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className={`font-black ${isDebit ? 'text-red-400' : 'text-emerald-400'}`}>
                                                            {isDebit ? '-' : '+'}{formatCurrency(amount)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Assigned Operational Missions */}
                {userRole !== 'admin' && (
                    <div className="rounded-2xl border p-6 flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-lime flex items-center gap-2">
                                <Activity size={14} /> Assigned Tasks
                            </h4>
                            <span className="text-[9px] font-bold opacity-45 px-2 py-0.5 rounded-full bg-white/5 border border-white/10" style={{ color: 'var(--text-main)' }}>
                                {tasks.length} Active
                            </span>
                        </div>

                        <div className="space-y-4 flex-grow overflow-y-auto no-scrollbar max-h-[300px]">
                            {tasks.length === 0 ? (
                                <div className="py-16 text-center opacity-20 flex flex-col items-center gap-3">
                                    <List size={32} strokeWidth={1} />
                                    <p className="text-[10px] font-black uppercase tracking-widest">No Active Task Directives</p>
                                </div>
                            ) : (
                                tasks.map((task) => (
                                    <div key={task._id} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] group hover:border-brand-lime/30 transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-xs font-black group-hover:text-brand-lime transition-colors" style={{ color: 'var(--text-main)' }}>{task.title}</p>
                                            <button 
                                                onClick={() => handleTaskUpdate(task._id!, 'COMPLETED')}
                                                className="w-5 h-5 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center hover:bg-emerald-500 hover:text-black text-[10px] transition-all"
                                                title="Mark as completed"
                                            >
                                                ✓
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-dim font-medium line-clamp-2 mb-3">{task.description}</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 border border-white/10 text-dim">
                                                {task.status}
                                            </span>
                                            <span className="text-[8px] font-bold opacity-30">
                                                Due: {new Date(task.dueDate).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/5">
                            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-xs">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">Institutional Sync</p>
                                </div>
                                <p className="text-[10px] leading-relaxed text-dim italic">
                                    "Real-time task tracking synchronized. Directives from financial central systems are mapped instantly."
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FinanceDashboard;
