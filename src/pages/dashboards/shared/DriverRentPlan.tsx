import { formatDate } from '../../../utils/dateUtils';
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, Download, CheckCircle2, AlertCircle, TrendingUp, Eye, Car } from 'lucide-react';
import { getDriverById } from '../../../services/driverService';
import type { Driver } from '../../../services/driverService';
import { getInvoicesByDriver } from '../../../services/invoiceService';
import type { Invoice } from '../../../services/invoiceService';
import { getVehicleById } from '../../../services/vehicleService';
import type { Vehicle } from '../../../services/vehicleService';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import { generateInvoiceHTML } from '../../../utils/invoicePDFTemplate';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

interface AssignmentPlanTab {
    id: string; // Unique tab identifier (assignment._id or synthetic key)
    assignmentId?: string;
    vehicleId?: string;
    label: string;
    plateNumber?: string;
    fleetNumber?: string;
    isCurrent: boolean;
    status: 'ACTIVE' | 'CANCELLED' | 'COMPLETED';
    startDate?: Date | null;
    endDate?: Date | null;
    periodLabel: string;
    installmentCount: number;
}

/**
 * Matches a rent installment strictly to its corresponding assignment tab.
 */
const findMatchingTab = (item: any, tabs: AssignmentPlanTab[]): AssignmentPlanTab | undefined => {
    if (!tabs || tabs.length === 0) return undefined;

    // 1. Direct match by assignmentId if tagged
    if (item.assignmentId) {
        const itemAssId = String(item.assignmentId);
        const match = tabs.find(t => t.assignmentId && String(t.assignmentId) === itemAssId);
        if (match) return match;
    }

    const itemVehId = item.vehicle 
        ? String(typeof item.vehicle === 'object' ? item.vehicle._id : item.vehicle)
        : null;

    // Filter candidate tabs matching the vehicle
    const candidates = itemVehId
        ? tabs.filter(t => t.vehicleId === itemVehId)
        : tabs;

    if (candidates.length === 0) {
        return tabs.length === 1 ? tabs[0] : undefined;
    }

    if (candidates.length === 1) {
        return candidates[0];
    }

    // Multiple candidates for the same vehicle (e.g. unassigned then reassigned same vehicle):
    // A. If installment is marked CANCELLED, match a non-active / cancelled tab
    if (item.status === 'CANCELLED') {
        const cancelledTab = candidates.find(t => t.status === 'CANCELLED' || !t.isCurrent);
        if (cancelledTab) return cancelledTab;
    }

    // B. Match by date range against assignment period
    if (item.dueDate) {
        const itemTime = new Date(item.dueDate).getTime();
        for (const cand of candidates) {
            const start = cand.startDate ? cand.startDate.getTime() : 0;
            const end = cand.endDate ? cand.endDate.getTime() : Infinity;
            if (itemTime >= start && itemTime <= end) {
                return cand;
            }
        }
    }

    // C. Default fallback: if one is active and item is not cancelled, match active
    const activeCand = candidates.find(t => t.isCurrent);
    if (activeCand && item.status !== 'CANCELLED') {
        return activeCand;
    }

    return candidates[0];
};

const DriverRentPlan = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [driver, setDriver] = useState<Driver | null>(null);
    const [assignedVehicle, setAssignedVehicle] = useState<Vehicle | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTabId, setSelectedTabId] = useState<string>('');

    useEffect(() => {
        if (id) fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const driverData = await getDriverById(id!);
            setDriver(driverData);

            const vehicleRef = driverData.currentVehicle || (driverData as any).previousVehicle;
            if (vehicleRef) {
                try {
                    const vId = typeof vehicleRef === 'object' ? vehicleRef._id : vehicleRef;
                    const vehicleData = await getVehicleById(vId);
                    setAssignedVehicle(vehicleData);
                } catch (vErr) {
                    if (typeof vehicleRef === 'object') setAssignedVehicle(vehicleRef);
                }
            }

            const fetchedInvoices = await getInvoicesByDriver(id!);
            setInvoices(fetchedInvoices);
        } catch (error) {
            console.error('Error fetching rent plan data:', error);
            toast.error('Failed to load rent plan');
        } finally {
            setLoading(false);
        }
    };

    // Extract individual assignment tabs so each vehicle assignment cycle is treated as its own plan
    const assignmentTabs = useMemo(() => {
        if (!driver) return [];
        const tabs: AssignmentPlanTab[] = [];
        const seenIds = new Set<string>();

        // 1. Process assignments from driver.assignmentHistory
        if (Array.isArray(driver.assignmentHistory) && driver.assignmentHistory.length > 0) {
            driver.assignmentHistory.forEach((hist: any, index: number) => {
                const aId = hist._id ? String(hist._id) : `assign-${index}`;
                if (seenIds.has(aId)) return;
                seenIds.add(aId);

                const vObj = typeof hist.vehicle === 'object' && hist.vehicle ? hist.vehicle : null;
                const vId = vObj?._id || (typeof hist.vehicle === 'string' ? hist.vehicle : null);
                const isHistActive = hist.status === 'ACTIVE' && (!hist.endDate || new Date(hist.endDate) > new Date());
                
                const plate = hist.plateNumber || vObj?.legalDocs?.registrationNumber || vObj?.basicDetails?.plateNumber || '';
                const fleet = hist.fleetNumber || vObj?.basicDetails?.fleetNumber || '';
                const model = hist.vehicleModel || (vObj?.basicDetails ? `${vObj.basicDetails.make || ''} ${vObj.basicDetails.model || ''}`.trim() : '') || 'Vehicle';
                const fleetLabel = fleet ? `#${fleet} • ` : '';
                const label = plate ? `${fleetLabel}${model} (${plate})` : `${fleetLabel}${model}`;

                const sDate = hist.startDate ? new Date(hist.startDate) : (hist.assignedDate ? new Date(hist.assignedDate) : null);
                const eDate = hist.endDate ? new Date(hist.endDate) : (hist.unassignedDate ? new Date(hist.unassignedDate) : null);

                let periodLabel = '';
                if (sDate) {
                    const sStr = formatDate(sDate);
                    if (isHistActive || !eDate) {
                        periodLabel = `${sStr} – Ongoing`;
                    } else {
                        periodLabel = `${sStr} – ${formatDate(eDate)}`;
                    }
                } else if (isHistActive) {
                    periodLabel = 'Active Contract';
                } else {
                    periodLabel = 'Past Contract';
                }

                tabs.push({
                    id: aId,
                    assignmentId: hist._id ? String(hist._id) : undefined,
                    vehicleId: vId ? String(vId) : undefined,
                    label: label.trim(),
                    fleetNumber: fleet,
                    plateNumber: plate,
                    isCurrent: isHistActive,
                    status: (hist.status as any) || (isHistActive ? 'ACTIVE' : 'COMPLETED'),
                    startDate: sDate,
                    endDate: eDate,
                    periodLabel,
                    installmentCount: 0,
                });
            });
        }

        // 2. Current / Assigned vehicle fallback if not covered in assignmentHistory
        const currentVehObj = typeof driver.currentVehicle === 'object' && driver.currentVehicle ? driver.currentVehicle : assignedVehicle;
        const currentVehId = currentVehObj?._id || (typeof driver.currentVehicle === 'string' ? driver.currentVehicle : null);

        const hasActiveTab = tabs.some(t => t.isCurrent);
        if (currentVehId && !hasActiveTab) {
            const make = currentVehObj?.basicDetails?.make || '';
            const model = currentVehObj?.basicDetails?.model || '';
            const plate = (currentVehObj as any)?.plateNumber || (currentVehObj as any)?.registrationNumber || currentVehObj?.legalDocs?.registrationNumber || '';
            const fleet = currentVehObj?.basicDetails?.fleetNumber || (currentVehObj as any)?.fleetNumber || '';
            const fleetLabel = fleet ? `#${fleet} • ` : '';
            const modelLabel = [make, model].filter(Boolean).join(' ') || 'Current Vehicle';
            const fullLabel = plate ? `${fleetLabel}${modelLabel} (${plate})` : `${fleetLabel}${modelLabel}`;
            const sDate = driver.activationDate ? new Date(driver.activationDate) : (driver.activation?.activatedDate ? new Date(driver.activation.activatedDate) : null);

            tabs.unshift({
                id: `active-curr-${currentVehId}`,
                assignmentId: undefined,
                vehicleId: String(currentVehId),
                label: fullLabel.trim(),
                fleetNumber: fleet,
                plateNumber: plate,
                isCurrent: true,
                status: 'ACTIVE',
                startDate: sDate,
                endDate: null,
                periodLabel: sDate ? `${formatDate(sDate)} – Ongoing` : 'Active Contract',
                installmentCount: 0,
            });
        }

        // 3. Fallback for orphan installments with vehicleId not matching any tab
        if (Array.isArray(driver.rentTracking)) {
            const knownVehIds = new Set(tabs.map(t => t.vehicleId).filter(Boolean));
            driver.rentTracking.forEach(item => {
                const vId = typeof item.vehicle === 'object' && item.vehicle ? item.vehicle._id : item.vehicle;
                const vIdStr = vId ? String(vId) : null;
                if (vIdStr && !knownVehIds.has(vIdStr)) {
                    knownVehIds.add(vIdStr);
                    const vObj = typeof item.vehicle === 'object' ? item.vehicle : null;
                    const make = vObj?.basicDetails?.make || '';
                    const model = vObj?.basicDetails?.model || '';
                    const reg = (vObj as any)?.registrationNumber || vObj?.legalDocs?.registrationNumber || '';
                    const label = (make || model) ? `${make} ${model} (${reg || 'Vehicle'})`.trim() : `Vehicle (${vIdStr.substring(0, 8)}...)`;

                    tabs.push({
                        id: `legacy-${vIdStr}`,
                        vehicleId: vIdStr,
                        label,
                        isCurrent: false,
                        status: 'COMPLETED',
                        periodLabel: 'Past Plan',
                        installmentCount: 0,
                    });
                }
            });
        }

        // 4. Count installments per tab strictly using matching logic
        if (Array.isArray(driver.rentTracking)) {
            driver.rentTracking.forEach(item => {
                const matched = findMatchingTab(item, tabs);
                if (matched) {
                    matched.installmentCount += 1;
                }
            });
        }

        // Sort: Active first, then newest startDate first
        tabs.sort((a, b) => {
            if (a.isCurrent && !b.isCurrent) return -1;
            if (!a.isCurrent && b.isCurrent) return 1;
            const timeA = a.startDate ? a.startDate.getTime() : 0;
            const timeB = b.startDate ? b.startDate.getTime() : 0;
            return timeB - timeA;
        });

        return tabs;
    }, [driver, assignedVehicle]);

    // Ensure selectedTabId defaults to the first sorted tab (Active/Newest)
    useEffect(() => {
        if (assignmentTabs.length > 0) {
            if (!selectedTabId || !assignmentTabs.some(t => t.id === selectedTabId)) {
                setSelectedTabId(assignmentTabs[0].id);
            }
        }
    }, [assignmentTabs, selectedTabId]);

    const handleDownloadInvoice = async (invoice: Invoice) => {
        const toastId = toast.loading('Generating Invoice PDF...');
        try {
            const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
            const container = document.createElement('div');
            container.innerHTML = generateInvoiceHTML(invoice, driver, assignedVehicle);
            container.style.width = '550pt';
            container.style.background = 'white';
            document.body.appendChild(container);

            await doc.html(container, {
                callback: function (doc) {
                    doc.save(`Invoice_Month_${invoice.weekNumber}.pdf`);
                    document.body.removeChild(container);
                    toast.success('Invoice Downloaded', { id: toastId });
                },
                x: 0, y: 0, width: 550, windowWidth: 800
            });
        } catch (error) {
            toast.error('Failed to generate PDF', { id: toastId });
        }
    };

    const allRentTracking = driver?.rentTracking || [];
    const selectedTab = assignmentTabs.find(t => t.id === selectedTabId) || assignmentTabs[0];

    // Filter installments strictly to the selected assignment plan (must be called before any early return)
    const filteredRentTracking = useMemo(() => {
        if (!selectedTab) return allRentTracking;
        return allRentTracking.filter(item => {
            const matched = findMatchingTab(item, assignmentTabs);
            return matched?.id === selectedTab.id;
        }).sort((a, b) => (a.weekNumber || 0) - (b.weekNumber || 0));
    }, [allRentTracking, selectedTab, assignmentTabs]);

    if (loading) return <div className="p-8 text-center animate-pulse font-bold text-dim uppercase tracking-widest">Loading Rent Plan...</div>;
    if (!driver) return <div className="p-8 text-center">Driver data not found</div>;

    const frequency = filteredRentTracking.length > 50 ? 'WEEKLY' : 'MONTHLY';
    const totalContractValue = filteredRentTracking.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalPaid = filteredRentTracking.reduce((sum, item) => sum + (item.amountPaid || 0), 0);
    const totalOutstanding = filteredRentTracking.reduce((sum, item) => sum + (item.balance || 0), 0);
    const periodsPaid = filteredRentTracking.filter(item => item.status === 'PAID').length;
    const totalPeriods = filteredRentTracking.length;

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-8" style={{ background: 'var(--bg-main)' }}>
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Driver Rent Plan', active: true }]} />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-3 rounded-2xl bg-white/5 border border-white/10 text-dim hover:text-white transition-all cursor-pointer"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-lg font-black uppercase tracking-tighter" style={{ color: 'var(--text-main)' }}>Rent Repayment Plan</h1>
                            {selectedTab && !selectedTab.isCurrent && (
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                    selectedTab.status === 'CANCELLED' 
                                        ? 'bg-red-500/10 border border-red-500/20 text-red-400' 
                                        : 'bg-white/10 border border-white/20 text-dim'
                                }`}>
                                    {selectedTab.status === 'CANCELLED' ? 'Past Plan (Cancelled)' : 'Past Vehicle Plan'}
                                </span>
                            )}
                            {selectedTab && selectedTab.isCurrent && (
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                                    Active Contract
                                </span>
                            )}
                        </div>
                        <p className="text-xs font-bold text-dim uppercase tracking-widest">
                            {driver.personalInfo.fullName} • {selectedTab?.label || (assignedVehicle ? `${assignedVehicle.basicDetails?.make || ''} ${assignedVehicle.basicDetails?.model || ''}` : 'Vehicle Plan')} • {selectedTab?.periodLabel || ''}
                        </p>
                    </div>
                </div>
            </div>

            {/* Assignment-based Plans Switcher (Each assignment treated individually) */}
            {assignmentTabs.length > 0 && (
                <div className="p-3 rounded-2xl bg-white/[0.02] border flex flex-col sm:flex-row sm:items-center gap-3" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider px-2 text-dim border-r shrink-0" style={{ borderColor: 'var(--border-main)' }}>
                        <Car size={16} className="text-[#C8E600]" />
                        <span>Plans:</span>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1">
                        {assignmentTabs.map(v => {
                            const isSelected = selectedTab?.id === v.id;
                            return (
                                <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => setSelectedTabId(v.id)}
                                    className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                        isSelected
                                            ? 'bg-[#C8E600] text-black shadow-lg font-black scale-102'
                                            : 'bg-white/5 border text-dim hover:text-white hover:bg-white/10'
                                    }`}
                                    style={{ borderColor: isSelected ? 'transparent' : 'var(--border-main)' }}
                                >
                                    <Car size={14} className={isSelected ? 'text-black' : 'text-[#C8E600]'} />
                                    <div className="flex flex-col text-left">
                                        <div className="flex items-center gap-2">
                                            <span>{v.label}</span>
                                            {v.isCurrent ? (
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                    isSelected ? 'bg-black text-[#C8E600]' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                }`}>
                                                    Active
                                                </span>
                                            ) : v.status === 'CANCELLED' ? (
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                    isSelected ? 'bg-red-950 text-red-300' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                }`}>
                                                    Cancelled
                                                </span>
                                            ) : (
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                    isSelected ? 'bg-black/20 text-black' : 'bg-white/10 text-dim'
                                                }`}>
                                                    Past
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-[10px] font-mono ${isSelected ? 'text-black/80 font-semibold' : 'text-dim'}`}>
                                            {v.periodLabel}
                                        </span>
                                    </div>
                                    {v.installmentCount > 0 && (
                                        <span className={`px-2 py-1 rounded text-[10px] font-mono font-bold shrink-0 ml-1 ${
                                            isSelected ? 'bg-black/15 text-black' : 'bg-white/10 text-dim'
                                        }`}>
                                            {v.installmentCount} {v.installmentCount === 1 ? 'Wk' : 'Wks'}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Summary Cards for Selected Vehicle Plan */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard label="Total Contract" value={`$${totalContractValue.toLocaleString()}`} icon={<FileText size={20} />} color="blue" />
                <SummaryCard label="Total Collected" value={`$${totalPaid.toLocaleString()}`} icon={<CheckCircle2 size={20} />} color="brand-lime" />
                <SummaryCard label="Outstanding" value={`$${totalOutstanding.toLocaleString()}`} icon={<AlertCircle size={20} />} color="orange" />
                <SummaryCard label="Completion" value={`${periodsPaid} / ${totalPeriods} ${frequency === 'WEEKLY' ? 'Wk' : 'Mo'}`} icon={<TrendingUp size={20} />} color="purple" />
            </div>

            {/* Repayment Schedule Table */}
            <div className="rounded-[2.5rem] border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="p-8 border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-black uppercase tracking-tighter" style={{ color: 'var(--text-main)' }}>Detailed Schedule</h2>
                        <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase text-dim">
                            {totalPeriods} {frequency === 'WEEKLY' ? 'Week' : 'Month'} Contract
                        </span>
                    </div>
                    <p className="text-xs font-medium text-dim">
                        Rent installment repayment schedule for {selectedTab?.label || 'the selected plan'} ({selectedTab?.periodLabel || ''}).
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/20 text-[10px] font-black uppercase tracking-widest text-dim">
                                <th className="p-6">{frequency === 'WEEKLY' ? 'Week' : 'Month'}</th>
                                <th className="p-6">Due Date</th>
                                <th className="p-6">Amount</th>
                                <th className="p-6">Paid</th>
                                <th className="p-6">Balance</th>
                                <th className="p-6">Status</th>
                                <th className="p-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                            {filteredRentTracking.map((item, index) => {
                                const periodNum = item.weekNumber || (index + 1);
                                const itemVehId = item.vehicle ? String((item.vehicle as any)._id || item.vehicle) : selectedTab?.vehicleId;
                                const displayWeekNum = (periodNum > filteredRentTracking.length) ? index + 1 : periodNum;
                                const displayWeekLabel = item.weekLabel 
                                    ? item.weekLabel.replace(/^(Week\s*)\d+/i, `$1${displayWeekNum}`) 
                                    : `Week ${displayWeekNum}`;

                                const invoice = invoices.find(inv => {
                                    const invVehId = inv.vehicle ? String((inv.vehicle as any)._id || inv.vehicle) : null;
                                    const matchVeh = !invVehId || !itemVehId || invVehId === itemVehId;
                                    const invWeek = Number(inv.weekNumber);
                                    const invDate = (inv as any).issueDate || inv.invoiceDate || inv.createdAt;
                                    const matchPeriod = selectedTab?.startDate && invDate 
                                        ? new Date(invDate) >= selectedTab.startDate && (!selectedTab.endDate || new Date(invDate) <= selectedTab.endDate)
                                        : true;
                                    return matchVeh && (invWeek === Number(periodNum) || invWeek === displayWeekNum) && matchPeriod;
                                });

                                return (
                                    <tr key={item._id || `${periodNum}-${index}`} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-6 font-bold text-xs" style={{ color: 'var(--text-main)' }}>
                                            {displayWeekLabel}
                                        </td>
                                        <td className="p-6 text-xs font-mono text-dim">
                                            {item.dueDate ? formatDate(item.dueDate) : '-'}
                                        </td>
                                        <td className="p-6 text-xs font-mono font-bold text-white">
                                            ${(item.amount || 0).toLocaleString()}
                                        </td>
                                        <td className="p-6 text-xs font-mono text-emerald-400 font-bold">
                                            ${(item.amountPaid || 0).toLocaleString()}
                                        </td>
                                        <td className="p-6 text-xs font-mono text-amber-400 font-bold">
                                            ${(item.balance !== undefined ? item.balance : item.amount - (item.amountPaid || 0)).toLocaleString()}
                                        </td>
                                        <td className="p-6">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                                                item.status === 'PAID'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                    : item.status === 'PARTIAL'
                                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                    : item.status === 'CANCELLED'
                                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                            }`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            {invoice ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => navigate(`../invoices/${invoice._id}`)}
                                                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-dim hover:text-white transition-all cursor-pointer"
                                                        title="View Invoice"
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadInvoice(invoice)}
                                                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-dim hover:text-white transition-all cursor-pointer"
                                                        title="Download Invoice PDF"
                                                    >
                                                        <Download size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-dim font-mono">No Invoice</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const SummaryCard = ({ label, value, icon, color }: any) => (
    <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 shadow-sm">
        <div className={`p-2 rounded-xl bg-${color}/10 text-${color} w-fit mb-4`}>
            {icon}
        </div>
        <p className="text-[10px] font-black uppercase text-dim tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black" style={{ color: 'var(--text-main)' }}>{value}</p>
    </div>
);

export default DriverRentPlan;