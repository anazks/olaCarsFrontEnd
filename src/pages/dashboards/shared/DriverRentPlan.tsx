import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, Download, CheckCircle2, AlertCircle, TrendingUp, Eye } from 'lucide-react';
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



    useEffect(() => {
        if (id) fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const driverData = await getDriverById(id!);
            setDriver(driverData);

            if (driverData.currentVehicle) {
                const vehicleData = await getVehicleById(driverData.currentVehicle);
                setAssignedVehicle(vehicleData);
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
    if (!driver || !assignedVehicle) return <div className="p-8 text-center">Driver or Vehicle data not found</div>;

    const rentTracking = driver.rentTracking || [];
    const frequency = rentTracking.length > 50 ? 'WEEKLY' : 'MONTHLY'; // Heuristic if frequency not in model
    const totalContractValue = rentTracking.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
    const totalOutstanding = invoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);
    const periodsPaid = invoices.filter(inv => inv.status === 'PAID').length;
    const totalPeriods = rentTracking.length;

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-8" style={{ background: 'var(--bg-main)' }}>
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Driver Rent Plan', active: true }]} />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-3 rounded-2xl bg-white/5 border border-white/10 text-dim hover:text-white transition-all"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-lg font-black uppercase tracking-tighter" style={{ color: 'var(--text-main)' }}>Rent Repayment Plan</h1>
                        <p className="text-xs font-bold text-dim uppercase tracking-widest">
                            {driver.personalInfo.fullName} • {assignedVehicle.basicDetails.make} {assignedVehicle.basicDetails.model}
                        </p>
                    </div>
                </div>
            </div>

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
                    <p className="text-xs font-medium text-dim">Full breakdown of all {frequency.toLowerCase()} rent installments and payment status.</p>
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
                            {rentTracking.map((item) => {
                                const periodNum = item.weekNumber;
                                const invoice = invoices.find(inv => Number(inv.weekNumber) === Number(periodNum));

                                return (
                                    <ScheduleRow
                                        key={periodNum}
                                        period={periodNum}
                                        label={item.weekLabel}
                                        invoice={invoice}
                                        baseAmount={item.amount}
                                        onDownload={() => invoice && handleDownloadInvoice(invoice)}
                                        onView={() => invoice && navigate(`../invoices/${invoice._id}`)}
                                    />
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

const ScheduleRow = ({ period, label, invoice, baseAmount, onDownload, onView }: any) => {
    const status = invoice?.status || 'PENDING';
    const totalDue = invoice?.totalAmountDue || baseAmount;
    const paid = invoice?.amountPaid || 0;
    const balance = invoice?.balance ?? (totalDue - paid);
    const dueDate = invoice?.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'TBD';

    return (
        <tr className="group transition-all hover:bg-white/[0.02]">
            <td className="p-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center text-[10px] font-black" style={{ color: 'var(--text-main)' }}>
                        {period}
                    </div>
                    <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{label}</span>
                </div>
            </td>
            <td className="p-6 text-xs font-medium text-dim">{dueDate}</td>
            <td className="p-6 text-xs font-black" style={{ color: 'var(--text-main)' }}>${totalDue.toLocaleString()}</td>
            <td className="p-6 text-xs font-bold text-brand-lime">${paid.toLocaleString()}</td>
            <td className="p-6 text-xs font-bold text-orange-400">${balance.toLocaleString()}</td>
            <td className="p-6">
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ${status === 'PAID' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                        status === 'PARTIAL' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                        status === 'OVERDUE' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-white/5 text-dim border-white/10'
                    }`}>
                    {status}
                </span>
            </td>
            <td className="p-6 text-right">
                {invoice ? (
                    <div className="flex items-center gap-2 justify-end">
                        <button
                            onClick={onView}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-all border border-blue-500/20"
                            title={`View ${invoice.invoiceNumber}`}
                        >
                            <Eye size={13} />
                            {invoice.invoiceNumber}
                        </button>
                        <button
                            onClick={onDownload}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-dim hover:text-white transition-all border border-white/5"
                            title="Download PDF"
                        >
                            <Download size={13} />
                        </button>
                    </div>
                ) : (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-dim/50">Not Generated</span>
                )}
            </td>
        </tr>
    );
};

export default DriverRentPlan;