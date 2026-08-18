import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, Download, CheckCircle2, AlertCircle, TrendingUp, Eye, Car, Layers } from 'lucide-react';
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

const DriverRentPlan = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [driver, setDriver] = useState<Driver | null>(null);
    const [assignedVehicle, setAssignedVehicle] = useState<Vehicle | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('ALL');

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

    // Extract unique vehicles associated with driver's rentTracking installments
    const vehicleTabs = useMemo(() => {
        if (!driver || !driver.rentTracking) return [];
        const vehMap = new Map<string, { _id: string; label: string; isCurrent: boolean }>();

        // Current vehicle if exists
        const currentVehObj = typeof driver.currentVehicle === 'object' ? driver.currentVehicle : assignedVehicle;
        const currentVehId = currentVehObj?._id || (typeof driver.currentVehicle === 'string' ? driver.currentVehicle : null);

        if (currentVehObj) {
            const make = currentVehObj.basicDetails?.make || '';
            const model = currentVehObj.basicDetails?.model || '';
            const reg = (currentVehObj as any).registrationNumber || (currentVehObj as any).vehicleId || currentVehObj.legalDocs?.registrationNumber || currentVehObj.basicDetails?.vin || 'Current Vehicle';
            vehMap.set(currentVehObj._id, {
                _id: currentVehObj._id,
                label: `${make} ${model} (${reg})`.trim(),
                isCurrent: true,
            });
        }

        // Iterate rentTracking items
        driver.rentTracking.forEach(item => {
            if (item.vehicle) {
                const vId = typeof item.vehicle === 'object' ? item.vehicle._id : item.vehicle;
                if (vId && !vehMap.has(vId)) {
                    if (typeof item.vehicle === 'object') {
                        const make = item.vehicle.basicDetails?.make || '';
                        const model = item.vehicle.basicDetails?.model || '';
                        const reg = (item.vehicle as any).registrationNumber || (item.vehicle as any).vehicleId || item.vehicle.legalDocs?.registrationNumber || item.vehicle.basicDetails?.vin || 'Vehicle';
                        vehMap.set(vId, {
                            _id: vId,
                            label: `${make} ${model} (${reg})`.trim(),
                            isCurrent: vId === currentVehId,
                        });
                    } else {
                        vehMap.set(vId, {
                            _id: vId,
                            label: `Vehicle (${vId.substring(0, 8)}...)`,
                            isCurrent: vId === currentVehId,
                        });
                    }
                }
            }
        });

        return Array.from(vehMap.values());
    }, [driver, assignedVehicle]);

    // Set initial selected vehicle tab once loaded
    useEffect(() => {
        if (vehicleTabs.length > 1 && selectedVehicleId === 'ALL') {
            const currentTab = vehicleTabs.find(v => v.isCurrent);
            if (currentTab) {
                setSelectedVehicleId(currentTab._id);
            }
        }
    }, [vehicleTabs]);

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

    if (loading) return <div className="p-8 text-center animate-pulse font-bold text-dim uppercase tracking-widest">Loading Rent Plan...</div>;
    if (!driver) return <div className="p-8 text-center">Driver data not found</div>;

    const allRentTracking = driver.rentTracking || [];

    // Filter installments by selected vehicle tab
    const filteredRentTracking = selectedVehicleId === 'ALL'
        ? allRentTracking
        : allRentTracking.filter(item => {
            if (!item.vehicle) return true; // Include untagged if fallback
            const vId = typeof item.vehicle === 'object' ? item.vehicle._id : item.vehicle;
            return vId === selectedVehicleId;
        });

    const frequency = filteredRentTracking.length > 50 ? 'WEEKLY' : 'MONTHLY';
    const totalContractValue = filteredRentTracking.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalPaid = filteredRentTracking.reduce((sum, item) => sum + (item.amountPaid || 0), 0);
    const totalOutstanding = filteredRentTracking.reduce((sum, item) => sum + (item.balance || 0), 0);
    const periodsPaid = filteredRentTracking.filter(item => item.status === 'PAID').length;
    const totalPeriods = filteredRentTracking.length;
    const isCancelled = (driver.status as string) === 'INACTIVE' || !assignedVehicle;

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
                            {isCancelled && (
                                <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-wider">
                                    Contract Cancelled
                                </span>
                            )}
                        </div>
                        <p className="text-xs font-bold text-dim uppercase tracking-widest">
                            {driver.personalInfo.fullName} • {assignedVehicle ? `${assignedVehicle.basicDetails?.make || ''} ${assignedVehicle.basicDetails?.model || ''}` : 'Vehicle Released'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Vehicle Switcher Bar (when driver has history/plans for multiple vehicles) */}
            {vehicleTabs.length > 0 && (
                <div className="p-3 rounded-2xl bg-white/[0.02] border flex flex-col sm:flex-row sm:items-center gap-3" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider px-2 text-dim border-r shrink-0" style={{ borderColor: 'var(--border-main)' }}>
                        <Car size={16} className="text-[#C8E600]" />
                        <span>Vehicle Plans:</span>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1">
                        <button
                            type="button"
                            onClick={() => setSelectedVehicleId('ALL')}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                selectedVehicleId === 'ALL'
                                    ? 'bg-[#C8E600] text-black shadow-md'
                                    : 'bg-white/5 border text-dim hover:text-white'
                            }`}
                            style={{ borderColor: selectedVehicleId === 'ALL' ? 'transparent' : 'var(--border-main)' }}
                        >
                            <Layers size={13} />
                            <span>All Vehicles ({allRentTracking.length})</span>
                        </button>
                        {vehicleTabs.map(v => (
                            <button
                                key={v._id}
                                type="button"
                                onClick={() => setSelectedVehicleId(v._id)}
                                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                    selectedVehicleId === v._id
                                        ? 'bg-[#C8E600] text-black shadow-md'
                                        : 'bg-white/5 border text-dim hover:text-white'
                                }`}
                                style={{ borderColor: selectedVehicleId === v._id ? 'transparent' : 'var(--border-main)' }}
                            >
                                <Car size={13} />
                                <span>{v.label}</span>
                                {v.isCurrent && (
                                    <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-black/20 text-black">
                                        Active
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard label="Total Contract" value={`$${totalContractValue.toLocaleString()}`} icon={<FileText size={20} />} color="blue" />
                <SummaryCard label="Total Collected" value={`$${totalPaid.toLocaleString()}`} icon={<CheckCircle2 size={20} />} color="brand-lime" />
                <SummaryCard label="Outstanding" value={`$${totalOutstanding.toLocaleString()}`} icon={<AlertCircle size={20} />} color="orange" />
                <SummaryCard label="Completion" value={`${periodsPaid} / ${totalPeriods} ${frequency === 'WEEKLY' ? 'Wk' : 'Mo'}`} icon={<TrendingUp size={20} />} color="purple" />
            </div>

            {/* Repayment Schedule */}
            <div className="rounded-[2.5rem] border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="p-8 border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-black uppercase tracking-tighter" style={{ color: 'var(--text-main)' }}>Detailed Schedule</h2>
                        <span className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase text-dim">
                            {totalPeriods} {frequency === 'WEEKLY' ? 'Week' : 'Month'} Contract
                        </span>
                    </div>
                    <p className="text-xs font-medium text-dim">
                        {selectedVehicleId === 'ALL'
                            ? 'Full breakdown of all rent installments across all vehicles.'
                            : `Rent installment repayment schedule for selected vehicle plan.`}
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/20 text-[10px] font-black uppercase tracking-widest text-dim">
                                <th className="p-6">{frequency === 'WEEKLY' ? 'Week' : 'Month'}</th>
                                {selectedVehicleId === 'ALL' && <th className="p-6">Vehicle</th>}
                                <th className="p-6">Due Date</th>
                                <th className="p-6">Amount</th>
                                <th className="p-6">Paid</th>
                                <th className="p-6">Balance</th>
                                <th className="p-6">Status</th>
                                <th className="p-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                            {filteredRentTracking.map((item) => {
                                const periodNum = item.weekNumber;
                                const invoice = invoices.find(inv => Number(inv.weekNumber) === Number(periodNum));
                                const vehInfo = typeof item.vehicle === 'object' ? item.vehicle : null;

                                return (
                                    <tr key={periodNum} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-6 font-bold text-xs" style={{ color: 'var(--text-main)' }}>
                                            {item.weekLabel || `Period ${periodNum}`}
                                        </td>
                                        {selectedVehicleId === 'ALL' && (
                                            <td className="p-6 text-xs text-dim font-medium">
                                                {vehInfo ? `${vehInfo.basicDetails?.make || ''} ${vehInfo.basicDetails?.model || ''}` : 'Vehicle'}
                                            </td>
                                        )}
                                        <td className="p-6 text-xs font-mono text-dim">
                                            {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-'}
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