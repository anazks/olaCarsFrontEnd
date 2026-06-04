import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
    FileText, 
    ArrowLeft, 
    Clock, 
    User, 
    Tag, 
    CreditCard, 
    Info, 
    Receipt, 
    Repeat,
    ArrowRight,
    AlertTriangle
} from 'lucide-react';
import { getLedgerEntryById, getLedgerEntries } from '../../../services/ledgerService';
import type { LedgerEntry } from '../../../services/ledgerService';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    'INCOME': { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' }, // Green
    'EXPENSE': { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' }, // Red
    'ASSET': { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6', border: 'rgba(59,130,246,0.3)' }, // Blue
    'LIABILITY': { bg: 'rgba(249,115,22,0.1)', text: '#f97316', border: 'rgba(249,115,22,0.3)' }, // Orange
    'EQUITY': { bg: 'rgba(168,85,247,0.1)', text: '#a855f7', border: 'rgba(168,85,247,0.3)' }, // Purple
};

const LedgerEntryDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [entry, setEntry] = useState<LedgerEntry | null>(null);
    const [relatedEntries, setRelatedEntries] = useState<LedgerEntry[]>([]);
    const [driverDetails, setDriverDetails] = useState<any | null>(null);
    const [invoiceDetails, setInvoiceDetails] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setLoading(true);
            try {
                // 1. Fetch the main ledger entry
                const fetchedEntry = await getLedgerEntryById(id);
                setEntry(fetchedEntry);

                // 2. Determine base transaction to fetch double-entries
                const filters: any = {};
                let baseDocType = null;
                let refId = null;

                const entryAny = fetchedEntry as any;
                if (entryAny.transaction) {
                    filters.transaction = entryAny.transaction._id;
                    baseDocType = entryAny.transaction.referenceModel;
                    refId = fetchedEntry.referenceId || entryAny.transaction.referenceId;
                } else if (entryAny.manualJournal) {
                    filters.manualJournal = typeof entryAny.manualJournal === 'string' ? entryAny.manualJournal : entryAny.manualJournal._id;
                } else if (entryAny.voucher) {
                    filters.voucher = typeof entryAny.voucher === 'string' ? entryAny.voucher : entryAny.voucher._id;
                } else if (fetchedEntry.referenceId) {
                    filters.search = fetchedEntry.referenceId;
                    refId = fetchedEntry.referenceId;
                }
                
                // Fetch related double entry lines
                if (Object.keys(filters).length > 0) {
                    const relatedRes = await getLedgerEntries(filters);
                    const sortedRelated = Array.isArray(relatedRes.data) ? [...relatedRes.data].sort((a, b) => {
                        if (a.type === b.type) return 0;
                        return a.type === 'DEBIT' ? -1 : 1;
                    }) : [];
                    setRelatedEntries(sortedRelated);
                }

                // 3. Check if it's related to rent/invoice to get driver details
                const invoiceRegex = /((?:INV|MAN|WRK)-\w+(?:-\w+)*)/i;
                let foundInvoiceId = null;
                
                if (baseDocType === 'Invoice' && refId) {
                    // Try to search invoice by reference ID
                    foundInvoiceId = refId;
                } else {
                    const match = fetchedEntry.description.match(invoiceRegex);
                    if (match) foundInvoiceId = match[0];
                }

                if (foundInvoiceId) {
                    try {
                        const { getInvoices } = await import('../../../services/invoiceService');
                        const invRes = await getInvoices({ search: foundInvoiceId });
                        if (invRes.data && invRes.data.length > 0) {
                            const exactInvoice = invRes.data.find(i => i.invoiceNumber === foundInvoiceId) || invRes.data[0];
                            setInvoiceDetails(exactInvoice);
                            
                            // If invoice has a driver, try to fetch driver profile
                            if (exactInvoice.driver) {
                                const drvId = typeof exactInvoice.driver === 'string' ? exactInvoice.driver : exactInvoice.driver._id;
                                if (drvId) {
                                    const { getDriverById } = await import('../../../services/driverService');
                                    const drvProfile = await getDriverById(drvId);
                                    setDriverDetails(drvProfile);
                                }
                            }
                        }
                    } catch (e) {
                        console.error("Failed to fetch related invoice/driver", e);
                    }
                }

            } catch (err: any) {
                setError(err.response?.data?.message || err.message || 'Failed to fetch ledger entry details');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !entry) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
                <AlertTriangle size={48} className="text-red-500" />
                <h2 className="text-xl font-bold">Error Loading Entry</h2>
                <p className="text-white/60">{error || 'Entry not found'}</p>
                <button onClick={() => navigate(-1)} className="px-4 py-2 mt-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all font-semibold">
                    Go Back
                </button>
            </div>
        );
    }

    const entryDateStr = entry.entryDate || entry.date;
    const dateObj = new Date(entryDateStr);
    const formattedDate = !isNaN(dateObj.getTime()) 
        ? `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
        : entryDateStr;

    const style = CATEGORY_STYLES[entry.accountingCode?.category] || { bg: 'transparent', text: 'var(--text-main)', border: 'transparent' };
    
    const debitVal = entry.amount !== undefined ? (entry.type === 'DEBIT' ? entry.amount : 0) : (entry.debit || 0);
    const creditVal = entry.amount !== undefined ? (entry.type === 'CREDIT' ? entry.amount : 0) : (entry.credit || 0);
    const displayAmount = Math.max(debitVal, creditVal);

    const sourceDocType = (entry as any).transaction ? 'Payment Transaction' : (entry as any).manualJournal ? 'Manual Journal' : (entry as any).voucher ? 'Voucher' : 'System Entry';

    return (
        <div className="container-responsive space-y-6 animate-fade-in pb-20">
            <Breadcrumbs 
                items={[
                    { label: 'Finance', path: '/admin/financial-admin/finance-dashboard' },
                    { label: 'General Ledger', path: '../ledger' },
                    { label: 'Entry Details', active: true }
                ]} 
            />

            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
                <div>
                    <button 
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-brand-lime hover:text-brand-lime/80 transition-colors mb-4 group"
                        style={{ color: 'var(--brand-lime)' }}
                    >
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Ledger
                    </button>
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
                        <FileText size={28} style={{ color: 'var(--brand-lime)' }} />
                        Transaction Record
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold border ml-2" style={{ background: style.bg, color: style.text, borderColor: style.border }}>
                            {entry.type}
                        </span>
                    </h1>
                </div>
                <div className="text-right">
                    <div className="text-xs font-semibold text-white/50 mb-1">Transaction Value</div>
                    <div className={`text-3xl font-mono font-bold ${entry.type === 'CREDIT' ? 'text-green-400' : 'text-red-400'}`}>
                        {displayAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            {/* Bento Grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
                
                {/* Main Details Card */}
                <div className="col-span-1 md:col-span-2 xl:col-span-3 space-y-6">
                    
                    {/* Primary Info */}
                    <div className="p-6 rounded-2xl border border-white/5 bg-card">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-white/50 mb-6 flex items-center gap-2">
                            <Info size={16} /> Base Details
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                            <div>
                                <p className="text-xs font-semibold text-white/40 mb-1">Description</p>
                                <p className="font-medium text-white">{entry.description}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-white/40 mb-1 flex items-center gap-1"><Clock size={12}/> Time of Entry</p>
                                <p className="font-mono text-sm">{formattedDate}</p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-white/40 mb-1 flex items-center gap-1"><Tag size={12}/> Accounting Code</p>
                                <div className="flex flex-col">
                                    <span className="font-mono font-bold">{entry.accountingCode?.code}</span>
                                    <span className="text-sm text-white/80">{entry.accountingCode?.name}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-white/40 mb-1">Category</p>
                                <span className="inline-block px-2.5 py-1 rounded text-[10px] font-bold border" style={{ background: style.bg, color: style.text, borderColor: style.border }}>
                                    {entry.accountingCode?.category}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Double Entry Breakdown */}
                    <div className="p-6 rounded-2xl border border-white/5 bg-card overflow-hidden">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-white/50 mb-6 flex items-center gap-2">
                            <Repeat size={16} /> Double-Entry Breakdown
                        </h3>
                        {relatedEntries.length === 0 ? (
                            <p className="text-sm text-white/50 italic">No related double entries found for this transaction.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b border-white/10">
                                        <tr>
                                            <th className="pb-3 font-semibold text-white/50">Ledger Account</th>
                                            <th className="pb-3 font-semibold text-white/50 text-right">Debit</th>
                                            <th className="pb-3 font-semibold text-white/50 text-right">Credit</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {relatedEntries.map(rel => {
                                            const isSelf = rel._id === entry._id;
                                            const relDebit = rel.amount !== undefined ? (rel.type === 'DEBIT' ? rel.amount : 0) : (rel.debit || 0);
                                            const relCredit = rel.amount !== undefined ? (rel.type === 'CREDIT' ? rel.amount : 0) : (rel.credit || 0);
                                            return (
                                                <tr key={rel._id} className={`border-b border-white/5 last:border-0 ${isSelf ? 'bg-brand-lime/5' : ''}`}>
                                                    <td className="py-4">
                                                        <div className="flex items-center gap-2">
                                                            {isSelf && <ArrowRight size={14} className="text-brand-lime" />}
                                                            <div className="flex flex-col">
                                                                <span className={`font-mono font-bold ${isSelf ? 'text-white' : 'text-white/80'}`}>{rel.accountingCode?.code}</span>
                                                                <span className="text-xs text-white/50">{rel.accountingCode?.name}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 text-right">
                                                        {relDebit > 0 ? <span className="font-mono font-bold text-red-400">{relDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> : '-'}
                                                    </td>
                                                    <td className="py-4 text-right">
                                                        {relCredit > 0 ? <span className="font-mono font-bold text-green-400">{relCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="bg-white/5">
                                            <td className="py-3 px-4 font-bold text-white/60 uppercase tracking-widest text-xs">Total</td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-red-400">
                                                {relatedEntries.reduce((sum, e) => sum + (e.amount !== undefined ? (e.type === 'DEBIT' ? e.amount : 0) : (e.debit || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-green-400">
                                                {relatedEntries.reduce((sum, e) => sum + (e.amount !== undefined ? (e.type === 'CREDIT' ? e.amount : 0) : (e.credit || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Column */}
                <div className="col-span-1 space-y-6">
                    
                    {/* Source Document Details */}
                    <div className="p-6 rounded-2xl border border-white/5 bg-card">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-white/50 mb-6 flex items-center gap-2">
                            <FileText size={16} /> Source Origin
                        </h3>
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                <span className="text-white/60">Source Type</span>
                                <span className="font-bold">{sourceDocType}</span>
                            </div>
                            
                            {(entry as any).transaction && typeof (entry as any).transaction === 'object' && (
                                <>
                                    <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                        <span className="text-white/60">Payment Method</span>
                                        <div className="flex items-center gap-1.5 font-mono">
                                            <CreditCard size={14} className="text-white/40" />
                                            {(entry as any).transaction.paymentMethod || 'N/A'}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                        <span className="text-white/60">Trx Status</span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10">
                                            {(entry as any).transaction.status || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pb-3 border-b border-white/5">
                                        <span className="text-white/60">Trx Category</span>
                                        <span className="font-medium">{(entry as any).transaction.transactionCategory || 'N/A'}</span>
                                    </div>
                                </>
                            )}

                            {(entry.referenceId || invoiceDetails?.invoiceNumber) && (
                                <div className="pt-2">
                                    <span className="text-white/60 block mb-1">Reference Document</span>
                                    <button 
                                        onClick={() => invoiceDetails ? navigate(`../invoices/${invoiceDetails._id}`) : null}
                                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${invoiceDetails ? 'hover:bg-brand-lime/10 cursor-pointer' : 'cursor-default opacity-80'}`}
                                        style={{ borderColor: 'var(--brand-lime)', color: 'var(--brand-lime)' }}
                                    >
                                        <Receipt size={14} /> 
                                        {invoiceDetails ? `View Invoice ${invoiceDetails.invoiceNumber}` : entry.referenceId}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Driver / Rent Details */}
                    {driverDetails && (
                        <div className="p-6 rounded-2xl border border-brand-lime/20 bg-brand-lime/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-lime/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
                            <h3 className="text-sm font-bold uppercase tracking-widest text-brand-lime mb-6 flex items-center gap-2" style={{ color: 'var(--brand-lime)' }}>
                                <User size={16} /> Driver Profile Link
                            </h3>
                            
                            <div className="flex flex-col items-center text-center gap-3 relative z-10">
                                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border-2 border-brand-lime/30">
                                    {driverDetails.profilePicture ? (
                                        <img src={driverDetails.profilePicture} alt={driverDetails.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={24} className="text-white/50" />
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">{driverDetails.name}</h4>
                                    <p className="text-xs font-mono text-white/50 mt-1">{driverDetails.contactNumber}</p>
                                </div>
                                <button 
                                    onClick={() => {
                                        const basePath = location.pathname.split('/ledger/')[0];
                                        navigate(`${basePath}/drivers/${driverDetails._id}`);
                                    }}
                                    className="mt-2 w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest bg-brand-lime text-black hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_15px_rgba(200,230,0,0.3)]"
                                >
                                    View Full Profile
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Audit Trail */}
                    <div className="p-6 rounded-2xl border border-white/5 bg-card">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-white/50 mb-6 flex items-center gap-2">
                            <User size={16} /> Audit Trail
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <span className="text-xs text-white/40 block mb-1">Created By</span>
                                <div className="font-medium text-sm">
                                    {entry.createdBy && typeof entry.createdBy === 'object' ? entry.createdBy.name || entry.createdBy.email : entry.createdBy || 'SYSTEM'}
                                </div>
                            </div>
                            <div>
                                <span className="text-xs text-white/40 block mb-1">Creator Role</span>
                                <div className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-white/10 uppercase tracking-wider">
                                    {entry.creatorRole || 'SYSTEM'}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default LedgerEntryDetailPage;
