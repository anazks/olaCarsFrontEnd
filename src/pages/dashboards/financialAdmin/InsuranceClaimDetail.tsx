import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ShieldAlert, 
    ArrowLeft, 
    Clock, 
    FileText, 
    CreditCard,
    Car
} from 'lucide-react';
import { getClaimById, progressClaim } from '../../../services/insuranceClaimService';
import type { InsuranceClaim, ProgressClaimPayload, ClaimStatus } from '../../../services/insuranceClaimService';
import { getVehicleById } from '../../../services/vehicleService';
import type { Vehicle } from '../../../services/vehicleService';
import { getVehiclePoliciesByVehicleId } from '../../../services/insuranceService';
import toast from 'react-hot-toast';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const STATUS_ORDER: ClaimStatus[] = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAYMENT_RECEIVED', 'CLOSED'];

const ALLOWED_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
    DRAFT: ['SUBMITTED'],
    SUBMITTED: ['UNDER_REVIEW'],
    UNDER_REVIEW: ['APPROVED', 'REJECTED'],
    APPROVED: ['PAYMENT_RECEIVED'],
    PAYMENT_RECEIVED: ['CLOSED'],
    REJECTED: ['CLOSED'],
    CLOSED: [],
};

const InsuranceClaimDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [claim, setClaim] = useState<InsuranceClaim | null>(null);
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [activePolicy, setActivePolicy] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    // Progression Form State
    const [targetStatus, setTargetStatus] = useState<ClaimStatus>('SUBMITTED');
    const [approvedAmount, setApprovedAmount] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [paymentReference, setPaymentReference] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [progressNotes, setProgressNotes] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        fetchClaimDetails();
    }, [id]);

    const fetchClaimDetails = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const claimData = await getClaimById(id);
            setClaim(claimData);
            
            // Set next logical status based on state machine rules
            const nextAllowed = ALLOWED_TRANSITIONS[claimData.status] || [];
            if (nextAllowed.length > 0) {
                setTargetStatus(nextAllowed[0]);
            }

            if (claimData.vehicleId) {
                try {
                    const vehicleIdStr = typeof claimData.vehicleId === 'object' && claimData.vehicleId !== null
                        ? (claimData.vehicleId._id || claimData.vehicleId)
                        : claimData.vehicleId;
                    const vehicleData = await getVehicleById(vehicleIdStr);
                    setVehicle(vehicleData);

                    // Fetch active vehicle policy if claim insurer details are Unknown
                    if (claimData.insurerName === 'Unknown' || claimData.policyNumber === 'Unknown') {
                        const policies = await getVehiclePoliciesByVehicleId(vehicleIdStr);
                        const active = policies.find(p => p.status === 'ACTIVE') || policies[0];
                        if (active) {
                            setActivePolicy(active);
                        }
                    }
                } catch (vErr) {
                    console.error("Failed to load vehicle or policies:", vErr);
                }
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message || 'Failed to load claim details');
        } finally {
            setLoading(false);
        }
    };

    const handleProgress = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id || !claim) return;
        
        setIsUpdating(true);
        try {
            const payload: ProgressClaimPayload = {
                targetStatus,
                notes: progressNotes
            };

            if (targetStatus === 'APPROVED') {
                if (!approvedAmount) throw new Error("Approved amount is required");
                payload.approvedAmount = Number(approvedAmount);
            }
            if (targetStatus === 'REJECTED') {
                if (!rejectionReason) throw new Error("Rejection reason is required");
                payload.rejectionReason = rejectionReason;
            }
            if (targetStatus === 'PAYMENT_RECEIVED') {
                if (!paymentReference || !paymentAmount) throw new Error("Payment details required");
                payload.paymentReference = paymentReference;
                payload.paymentAmount = Number(paymentAmount);
            }

            await progressClaim(id, payload);
            toast.success('Claim progressed successfully');
            
            // Reset form fields
            setApprovedAmount('');
            setRejectionReason('');
            setPaymentReference('');
            setPaymentAmount('');
            setProgressNotes('');
            
            fetchClaimDetails();
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message || 'Failed to update claim');
        } finally {
            setIsUpdating(false);
        }
    };

    if (loading || !claim) {
        return (
            <div className="p-8 text-center animate-pulse flex flex-col items-center gap-4">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Insurance Claim Detail', active: true }]} />

                <ShieldAlert size={32} className="animate-bounce text-dim opacity-50" />
                <span className="font-bold text-muted uppercase tracking-widest">Loading Claim Profile...</span>
            </div>
        );
    }

    // const currentStatusIndex = STATUS_ORDER.indexOf(claim.status);
    const isTerminal = claim.status === 'CLOSED';

    return (
        <div className="p-6 max-w-[1200px] mx-auto space-y-6">
            <button 
                onClick={() => navigate('/admin/financial-admin/insurance-claims')}
                className="flex items-center gap-2 text-sm font-bold opacity-60 hover:opacity-100 transition-opacity"
            >
                <ArrowLeft size={16} /> Back to Claims
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-xl font-black flex items-center gap-3 tracking-tight" style={{ color: 'var(--text-main)' }}>
                        <ShieldAlert className="text-[#D4F12E]" size={32} />
                        Claim {claim.claimNumber}
                    </h1>
                    <p className="mt-1 font-medium text-sm" style={{ color: 'var(--text-muted)' }}>
                        Filed on {new Date(claim.createdAt).toLocaleDateString()}
                    </p>
                </div>
                
                <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 font-black tracking-widest uppercase text-sm ${
                    claim.status === 'CLOSED' ? 'bg-gray-500/10 text-gray-500 border-gray-500/30' :
                    claim.status === 'APPROVED' ? 'bg-green-500/10 text-green-500 border-green-500/30' :
                    claim.status === 'REJECTED' ? 'bg-red-500/10 text-red-500 border-red-500/30' :
                    claim.status === 'PAYMENT_RECEIVED' ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' :
                    'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                }`}>
                    <Clock size={16} /> {claim.status.replace('_', ' ')}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Vehicle & Policy Information */}
                    <div className="bg-glass border rounded-2xl p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                            <FileText size={20} className="text-[#D4F12E]" />
                            Policy Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Provider</p>
                                <p className="font-medium">
                                    {claim.insurerName && claim.insurerName !== 'Unknown' 
                                        ? claim.insurerName 
                                        : (activePolicy?.insurance?.supplier && typeof activePolicy.insurance.supplier === 'object'
                                            ? activePolicy.insurance.supplier.name
                                            : activePolicy?.insurance?.provider || 'Unknown')}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Policy Number</p>
                                <p className="font-medium font-mono bg-white/5 px-2 py-1 rounded inline-block">
                                    {claim.policyNumber && claim.policyNumber !== 'Unknown' 
                                        ? claim.policyNumber 
                                        : (activePolicy?.policyNumber || activePolicy?.insurance?.policyNumber || 'Unknown')}
                                </p>
                            </div>
                            {vehicle && (
                                <div className="md:col-span-2 bg-white/5 rounded-xl p-4 flex items-center gap-4 mt-2">
                                    <div className="p-3 bg-black/20 rounded-lg"><Car className="text-[#D4F12E]" /></div>
                                    <div>
                                        <p className="font-bold text-sm">
                                            {vehicle?.basicDetails?.make || 'Unknown Make'} {vehicle?.basicDetails?.model || 'Unknown Model'} {vehicle?.basicDetails?.year ? `(${vehicle.basicDetails.year})` : ''}
                                        </p>
                                        <p className="text-xs text-gray-400 font-mono mt-1">
                                            Plate No: {vehicle?.basicDetails?.vin || 'N/A'} | REG: {vehicle?.legalDocs?.registrationNumber || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Incident Details */}
                    <div className="bg-glass border rounded-2xl p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                            <ShieldAlert size={20} className="text-[#D4F12E]" />
                            Incident Details
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Incident Date</p>
                                <p className="font-medium">{new Date(claim.incidentDate).toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Claim Amount</p>
                                <p className="font-bold text-xl text-white">${claim.claimAmount.toLocaleString()}</p>
                            </div>
                            {claim.incidentLocation && (
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Location</p>
                                    <p className="font-medium">{claim.incidentLocation}</p>
                                </div>
                            )}
                            {claim.policeReportNumber && (
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Police Report</p>
                                    <p className="font-medium font-mono">{claim.policeReportNumber}</p>
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Description</p>
                            <div className="bg-black/20 rounded-xl p-4 text-sm leading-relaxed text-gray-300">
                                {claim.incidentDescription}
                            </div>
                        </div>
                    </div>

                    {/* Resolution Details (if processed) */}
                    {(claim.approvedAmount !== undefined || claim.rejectionReason) && (
                        <div className="bg-glass border rounded-2xl p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                                <CreditCard size={20} className="text-[#D4F12E]" />
                                Resolution Details
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {claim.approvedAmount !== undefined && (
                                    <>
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Approved Amount</p>
                                            <p className="font-bold text-xl text-green-500">${claim.approvedAmount.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Net Payable (After Excess)</p>
                                            <p className="font-bold text-lg text-white">${(claim.netPayable || claim.approvedAmount).toLocaleString()}</p>
                                        </div>
                                    </>
                                )}
                                {claim.paymentReference && (
                                    <>
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Payment Reference</p>
                                            <p className="font-medium font-mono">{claim.paymentReference}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Payment Date</p>
                                            <p className="font-medium">{claim.paymentDate ? new Date(claim.paymentDate).toLocaleDateString() : 'N/A'}</p>
                                        </div>
                                    </>
                                )}
                                {claim.rejectionReason && (
                                    <div className="col-span-1 sm:col-span-2">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Rejection Reason</p>
                                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-200">
                                            {claim.rejectionReason}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column - Status Progression */}
                <div className="space-y-6">
                    {!isTerminal && (
                        <div className="bg-glass border rounded-2xl p-6 shadow-xl sticky top-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <h3 className="font-black uppercase tracking-widest text-sm mb-4" style={{ color: 'var(--text-main)' }}>Progress Claim</h3>
                            
                            <form onSubmit={handleProgress} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Next Status</label>
                                    <select 
                                        value={targetStatus}
                                        onChange={(e) => setTargetStatus(e.target.value as ClaimStatus)}
                                        className="w-full border rounded-xl px-4 py-3 text-sm font-bold focus:border-[#D4F12E] outline-none transition-colors"
                                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        {(ALLOWED_TRANSITIONS[claim.status] || []).map(s => (
                                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                                        ))}
                                    </select>
                                </div>

                                {targetStatus === 'APPROVED' && (
                                    <div className="animate-in slide-in-from-top-2">
                                        <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Approved Amount</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                            <input 
                                                type="number" 
                                                required
                                                value={approvedAmount}
                                                onChange={(e) => setApprovedAmount(e.target.value)}
                                                className="w-full border rounded-xl pl-8 pr-4 py-3 text-sm focus:border-[#D4F12E] outline-none"
                                                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {targetStatus === 'REJECTED' && (
                                    <div className="animate-in slide-in-from-top-2">
                                        <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Rejection Reason</label>
                                        <textarea 
                                            required
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            rows={3}
                                            className="w-full border rounded-xl px-4 py-3 text-sm focus:border-red-500 outline-none resize-none"
                                            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                )}

                                {targetStatus === 'PAYMENT_RECEIVED' && (
                                    <div className="space-y-4 animate-in slide-in-from-top-2">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Payment Reference</label>
                                            <input 
                                                type="text" 
                                                required
                                                value={paymentReference}
                                                onChange={(e) => setPaymentReference(e.target.value)}
                                                className="w-full border rounded-xl px-4 py-3 text-sm focus:border-[#D4F12E] outline-none"
                                                style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Actual Amount Received</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                                <input 
                                                    type="number" 
                                                    required
                                                    value={paymentAmount}
                                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                                    className="w-full border rounded-xl pl-8 pr-4 py-3 text-sm focus:border-[#D4F12E] outline-none"
                                                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Admin Notes (Optional)</label>
                                    <textarea 
                                        value={progressNotes}
                                        onChange={(e) => setProgressNotes(e.target.value)}
                                        rows={2}
                                        className="w-full border rounded-xl px-4 py-3 text-sm focus:border-[#D4F12E] outline-none resize-none"
                                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={isUpdating}
                                    className="w-full py-3.5 rounded-xl bg-[#D4F12E] text-black font-black uppercase tracking-widest text-sm hover:bg-[#c2dd2a] transition-all disabled:opacity-50 mt-4"
                                >
                                    {isUpdating ? 'Updating...' : 'Update Status'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Timeline History */}
                    <div className="bg-glass border rounded-2xl p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <h3 className="font-black uppercase tracking-widest text-sm mb-6 text-gray-400">Claim History</h3>
                        <div className="space-y-6">
                            {claim.statusHistory?.map((historyEntry, index) => (
                                <div key={index} className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <div className={`w-3 h-3 rounded-full mt-1 ${
                                            historyEntry.status === 'REJECTED' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                                            historyEntry.status === 'APPROVED' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' :
                                            'bg-[#D4F12E] shadow-[0_0_10px_rgba(212,241,46,0.3)]'
                                        }`} />
                                        {index < claim.statusHistory.length - 1 && (
                                            <div className="w-px h-full bg-white/10 my-1" />
                                        )}
                                    </div>
                                    <div className="pb-4">
                                        <p className="text-sm font-bold text-white">{historyEntry.status.replace('_', ' ')}</p>
                                        <p className="text-xs text-gray-500 mt-1">{new Date(historyEntry.timestamp).toLocaleString()}</p>
                                        {historyEntry.notes && (
                                            <p className="text-xs text-gray-400 mt-2 bg-white/5 p-2 rounded-lg inline-block">
                                                {historyEntry.notes}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InsuranceClaimDetail;
