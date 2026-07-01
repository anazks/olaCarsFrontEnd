export interface AggregatedExecutiveData {
    financeTotals: any[];
    vehicleData: any[];
    driverData: any[];
    staffData: any[];
    rentTrendData: any[];
    poTrendData: any[];
    kpiData: {
        totalActiveVehicles: number;
        monthlyRevenue: number;
        outstandingCollections: number;
        activeDrivers: number;
        collectionCompliance: number;
        last12MonthRevenue: number;
        outstandingBalance: number;
        activeAlerts: number;
        alertsDetailed: {
            critical: any[];
            major: any[];
            minor: any[];
        };
        tasks: {
            overdue: number;
            upcoming: number;
            assigned: number;
        };
    };
}

export const aggregateExecutiveData = (
    ledgerRes: PromiseSettledResult<any>,
    driverRes: PromiseSettledResult<any>,
    vehicleRes: PromiseSettledResult<any>,
    poRes: PromiseSettledResult<any>,
    staffRes: PromiseSettledResult<any>,
    alertRes: PromiseSettledResult<any>,
    taskRes: PromiseSettledResult<any>,
    invoiceRes: PromiseSettledResult<any>,
    startD: Date,
    endD: Date,
    kpiData: any
): Omit<AggregatedExecutiveData, 'branches'> => {
    const diffDays = (endD.getTime() - startD.getTime()) / (1000 * 3600 * 24);
    const groupByDay = diffDays <= 60;

    const COLORS = {
        green: '#22c55e', blue: '#3b82f6', red: '#ef4444',
        yellow: '#eab308', teal: '#14b8a6', purple: '#8b5cf6',
        orange: '#f97316', indigo: '#6366f1', pink: '#ec4899'
    };

    // KPI Calculations
    let newKpi = { ...kpiData };

    if (alertRes.status === 'fulfilled') {
        const allAlerts = alertRes.value || [];
        // Filter alerts by date range
        const alerts = allAlerts.filter((a: any) => {
            const alertDate = new Date(a.createdAt);
            return alertDate >= startD && alertDate <= endD;
        });
        newKpi.activeAlerts = alerts.length;
        newKpi.alertsDetailed = {
            critical: alerts.filter((a: any) => a.priority === 'HIGH'),
            major: alerts.filter((a: any) => a.priority === 'MEDIUM'),
            minor: alerts.filter((a: any) => a.priority === 'LOW')
        };
    }

    if (taskRes.status === 'fulfilled') {
        const tasks = taskRes.value.data || [];
        let overdue = 0, upcoming = 0, assigned = 0;
        const now = new Date();

        tasks.forEach((t: any) => {
            if (t.status !== 'COMPLETED' && t.status !== 'CANCELLED') {
                if (t.dueDate) {
                    const dd = new Date(t.dueDate);
                    if (dd >= startD && dd <= endD) {
                        assigned++;
                        if (dd < now) overdue++;
                        else upcoming++;
                    }
                } else {
                    const cd = new Date(t.createdAt);
                    if (cd >= startD && cd <= endD) {
                        assigned++;
                        upcoming++;
                    }
                }
            }
        });
        newKpi.tasks = { overdue, upcoming, assigned };
    }

    let periodRev = 0;
    let pendingInvoicesBalance = 0;
    if (invoiceRes && invoiceRes.status === 'fulfilled') {
        const invoiceValue = invoiceRes.value;
        const invoices = Array.isArray(invoiceValue)
            ? invoiceValue
            : (invoiceValue && Array.isArray(invoiceValue.data) ? invoiceValue.data : []);

        invoices.forEach((inv: any) => {
            if (inv.status === 'PAID') {
                const payDate = new Date(inv.paidAt || inv.updatedAt || inv.createdAt || inv.dueDate);
                if (!isNaN(payDate.getTime())) {
                    if (payDate >= startD && payDate <= endD) {
                        periodRev += inv.totalAmountDue || inv.amountPaid || 0;
                    }
                }
            } else if (inv.status === 'PENDING' || inv.status === 'PARTIAL' || inv.status === 'OVERDUE') {
                if (inv.dueDate) {
                    const dueDate = new Date(inv.dueDate);
                    if (!isNaN(dueDate.getTime())) {
                        if (dueDate >= startD && dueDate <= endD) {
                            pendingInvoicesBalance += inv.balance || 0;
                        }
                    }
                }
            }
        });
    }
    newKpi.monthlyRevenue = periodRev;
    newKpi.last12MonthRevenue = periodRev;
    newKpi.outstandingCollections = pendingInvoicesBalance;
    newKpi.outstandingBalance = pendingInvoicesBalance;

    if (driverRes.status === 'fulfilled') {
        const drivers = driverRes.value.data || [];
        let activeDriversCount = 0;
        let totalOverdue = 0;
        let totalPending = 0;
        let totalDuePeriod = 0;
        let totalPaidPeriod = 0;

        drivers.forEach((d: any) => {
            if (d.status === 'ACTIVE') activeDriversCount++;

            const rt = d.rentTracking || [];
            rt.forEach((week: any) => {
                const wd = new Date(week.dueDate || week.startDate || new Date());
                if (wd >= startD && wd <= endD) {
                    const amtDue = week.totalDue || 0;
                    const amtPaid = week.amountPaid || 0;
                    const bal = week.balance || 0;

                    totalDuePeriod += amtDue;
                    totalPaidPeriod += amtPaid;

                    if (week.status !== 'PAID') {
                        const isOverdue = new Date(week.dueDate || '') < new Date();
                        if (isOverdue) totalOverdue += bal;
                        else totalPending += bal;
                    }
                }
            });
        });

        newKpi.activeDrivers = driverRes.value.pagination?.total !== undefined
            ? driverRes.value.pagination.total
            : activeDriversCount;
        newKpi.collectionCompliance = totalDuePeriod > 0 ? (totalPaidPeriod / totalDuePeriod) * 100 : 0;
    }

    if (vehicleRes.status === 'fulfilled') {
        const vecs = vehicleRes.value.data || [];
        let activeVecs = 0;
        vecs.forEach((v: any) => {
            if (v.status === 'ACTIVE — RENTED' || v.status === 'ACTIVE — AVAILABLE' || v.status === 'W. GROUP ACTIVE') {
                activeVecs++;
            }
        });
        newKpi.totalActiveVehicles = vehicleRes.value.pagination?.total !== undefined
            ? vehicleRes.value.pagination.total
            : activeVecs;
    }

    let finalFinanceTotals: any[] = [];
    let finalVehicleData: any[] = [];
    let finalDriverData: any[] = [];
    let finalStaffData: any[] = [];
    let finalRentTrendData: any[] = [];
    let finalPoTrendData: any[] = [];

    // 1. Finance Aggregation
    if (ledgerRes.status === 'fulfilled') {
        const ledgerValue = ledgerRes.value;
        const ledgerData = Array.isArray(ledgerValue)
            ? ledgerValue
            : (ledgerValue && Array.isArray(ledgerValue.data) ? ledgerValue.data : []);

        // Aggregate category totals
        let totalIncome = periodRev;
        let totalExpense = 0;
        let totalAssets = 0;
        let totalLiability = 0;

        ledgerData.forEach((entry: any) => {
            const d = new Date(entry.entryDate || entry.date || entry.createdAt);
            if (isNaN(d.getTime())) return;
            if (d < startD || d > endD) return;

            const cat = entry.accountingCode?.category?.toUpperCase();
            let amt = entry.amount !== undefined ? entry.amount : (entry.debit || entry.credit || 0);
            let isDebit = entry.amount !== undefined ? entry.type === 'DEBIT' : ((entry.debit || 0) > 0);

            if (cat === 'INCOME') {
                // Skip income entries - now calculated from invoices
            } else if (cat === 'EXPENSE') {
                totalExpense += isDebit ? amt : -amt;
            } else if (cat === 'ASSET') {
                totalAssets += isDebit ? amt : -amt;
            } else if (cat === 'LIABILITY') {
                totalLiability += isDebit ? -amt : amt;
            }
        });

        finalFinanceTotals = [
            { name: 'Income', amount: Math.max(0, totalIncome), fill: '#22c55e' },
            { name: 'Expense', amount: Math.max(0, totalExpense), fill: '#ef4444' },
            { name: 'Assets', amount: Math.max(0, totalAssets), fill: '#3b82f6' },
            { name: 'Liability', amount: Math.max(0, totalLiability), fill: '#f59e0b' }
        ];
    }

    // 2. Fleet & Driver Aggregation
    if (driverRes.status === 'fulfilled') {
        const drivers = driverRes.value.data || [];
        const statusCounts = { PAID: 0, PARTIAL: 0, PENDING: 0, OVERDUE: 0 };
        const scoreCounts = { 'Unscored': 0, '<60': 0, '60-80': 0, '80+': 0 };
        const rentMap = new Map<string, { period: string; Paid: number; Pending: number; Overdue: number }>();

        drivers.forEach((d: any) => {
            // Fleet Collections logic
            const rt = d.rentTracking || [];
            const periodRt = rt.filter((week: any) => {
                const wd = new Date(week.dueDate || week.startDate || new Date());
                return wd >= startD && wd <= endD;
            });

            if (periodRt.length > 0) {
                const pending = periodRt.filter((x: any) => x.status !== 'PAID').sort((a: any, b: any) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime());
                if (pending.length > 0) {
                    const isOverdue = new Date(pending[0].dueDate || '') < new Date();
                    if (isOverdue) statusCounts.OVERDUE++;
                    else statusCounts.PENDING++;
                } else {
                    statusCounts.PAID++;
                }
            }

            // Rent trend logic
            rt.forEach((week: any) => {
                const wd = new Date(week.dueDate || week.startDate || week.paidAt || new Date());
                // Ignore date filters for rent trend to display historical records
                // if (wd < startD || wd > endD) return;
                
                const pKey = groupByDay 
                    ? wd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    : wd.toLocaleDateString(undefined, { year: '2-digit', month: 'short' });
                
                const curr = rentMap.get(pKey) || { period: pKey, Paid: 0, Pending: 0, Overdue: 0 };
                const amtPaid = week.amountPaid || 0;
                const bal = week.balance || 0;
                if (week.status === 'PAID') {
                    curr.Paid += amtPaid;
                } else {
                    const isOverdue = new Date(week.dueDate || '') < new Date();
                    if (isOverdue) curr.Overdue += bal;
                    else curr.Pending += bal;
                }
                rentMap.set(pKey, curr);
            });

            // Score Logic
            const s = d.performance?.drivingScore || 0;
            if (s === 0) scoreCounts.Unscored++;
            else if (s < 60) scoreCounts['<60']++;
            else if (s < 80) scoreCounts['60-80']++;
            else scoreCounts['80+']++;
        });

        finalDriverData = [
            { name: 'Unscored', Drivers: scoreCounts.Unscored, fill: COLORS.teal },
            { name: '<60', Drivers: scoreCounts['<60'], fill: COLORS.red },
            { name: '60-80', Drivers: scoreCounts['60-80'], fill: COLORS.yellow },
            { name: '80+', Drivers: scoreCounts['80+'], fill: COLORS.green }
        ].filter(d => d.Drivers > 0);

        finalRentTrendData = Array.from(rentMap.values()).sort((a, b) => {
            if (groupByDay) {
                const da = new Date(`${a.period} ${new Date().getFullYear()}`);
                const db = new Date(`${b.period} ${new Date().getFullYear()}`);
                return da.getTime() - db.getTime();
            }
            return new Date(`01 ${a.period}`).getTime() - new Date(`01 ${b.period}`).getTime();
        });
    }

    // 3. Vehicle Analytics
    if (vehicleRes.status === 'fulfilled') {
        const vecs = vehicleRes.value.data || [];
        const vDisplayCounts = { Active: 0, Maintenance: 0, Available: 0, Suspended: 0, Other: 0 };

        vecs.forEach((v: any) => {
            const status = v.status;
            if (status === 'ACTIVE — RENTED' || status === 'W. GROUP ACTIVE') vDisplayCounts.Active++;
            else if (status === 'ACTIVE — MAINTENANCE' || status === 'REPAIR IN PROGRESS') vDisplayCounts.Maintenance++;
            else if (status === 'ACTIVE — AVAILABLE') vDisplayCounts.Available++;
            else if (status === 'SUSPENDED' || status === 'RETIRED') vDisplayCounts.Suspended++;
            else vDisplayCounts.Other++;
        });

        finalVehicleData = [
            { name: 'Active', count: vDisplayCounts.Active, fill: COLORS.green },
            { name: 'Maintenance', count: vDisplayCounts.Maintenance, fill: COLORS.orange },
            { name: 'Available', count: vDisplayCounts.Available, fill: COLORS.blue },
            { name: 'Suspended', count: vDisplayCounts.Suspended, fill: COLORS.red },
            { name: 'Pipeline', count: vDisplayCounts.Other, fill: COLORS.purple }
        ].filter(d => d.count > 0);
    }

    // 4. Purchase Order Analytics
    if (poRes.status === 'fulfilled') {
        const pos = poRes.value.data || [];
        let approved = 0, waiting = 0, rejected = 0;
        const poMap = new Map<string, { period: string; Approved: number; Pending: number; Rejected: number }>();

        pos.forEach((p: any) => {
            if (p.status === 'APPROVED') approved++;
            else if (p.status === 'REJECTED') rejected++;
            else waiting++;

            const pd = new Date(p.createdAt || p.purchaseOrderDate || new Date());
            if (pd < startD || pd > endD) return;
            
            const pKey = groupByDay 
                ? pd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                : pd.toLocaleDateString(undefined, { year: '2-digit', month: 'short' });
                
            const curr = poMap.get(pKey) || { period: pKey, Approved: 0, Pending: 0, Rejected: 0 };
            const amt = p.totalAmount || 1;
            if (p.status === 'APPROVED') curr.Approved += amt;
            else if (p.status === 'REJECTED') curr.Rejected += amt;
            else curr.Pending += amt;
            poMap.set(pKey, curr);
        });

        finalPoTrendData = Array.from(poMap.values()).sort((a, b) => {
            if (groupByDay) {
                const da = new Date(`${a.period} ${new Date().getFullYear()}`);
                const db = new Date(`${b.period} ${new Date().getFullYear()}`);
                return da.getTime() - db.getTime();
            }
            return new Date(`01 ${a.period}`).getTime() - new Date(`01 ${b.period}`).getTime();
        });
    }

    // 5. Staff Analytics
    if (staffRes.status === 'fulfilled') {
        const sd = staffRes.value.data;
        finalStaffData = [
            { name: 'Branch Mgrs', count: sd.branchManagers?.length || 0, fill: COLORS.indigo },
            { name: 'Finance Staff', count: sd.financeStaff?.length || 0, fill: COLORS.pink },
            { name: 'Operation Staff', count: sd.operationStaff?.length || 0, fill: COLORS.teal },
            { name: 'Country Mgrs', count: sd.countryManagers?.length || 0, fill: COLORS.yellow },
            { name: 'Global Admins', count: sd.globalAdmins?.length || 0, fill: COLORS.green }
        ];
    }

    return {
        financeTotals: finalFinanceTotals,
        vehicleData: finalVehicleData,
        driverData: finalDriverData,
        staffData: finalStaffData,
        rentTrendData: finalRentTrendData,
        poTrendData: finalPoTrendData,
        kpiData: newKpi
    };
};
