import { useState, useEffect } from 'react';
import { ShieldAlert, FileText, Search, PlusCircle, ExternalLink, ChevronRight, CheckCircle2, Filter, Eye, Edit, Trash2 } from 'lucide-react';
import { getAllVehicles, editVehicle } from '../../../services/vehicleService';
import type { Vehicle, InsuranceDetails } from '../../../services/vehicleService';
import { getClaims, createClaim, progressClaim } from '../../../services/insuranceClaimService';
import type { InsuranceClaim, CreateClaimPayload, ProgressClaimPayload, ClaimStatus } from '../../../services/insuranceClaimService';
import toast from 'react-hot-toast';
import Modal from '../../../components/Modal';

const CLAIM_STATUSES: ClaimStatus[] = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAYMENT_RECEIVED', 'CLOSED'];

const InsuranceClaimsView = () => {
    const [activeTab, setActiveTab] = useState<'policies' | 'claims'>('policies');
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [claims, setClaims] = useState<InsuranceClaim[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal states
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
    const [selectedClaim, setSelectedClaim] = useState<InsuranceClaim | null>(null);

    // Insurance Single View states
    const [isInsuranceViewModalOpen, setIsInsuranceViewModalOpen] = useState(false);
    const [selectedInsuranceViewVehicle, setSelectedInsuranceViewVehicle] = useState<Vehicle | null>(null);
    const [insuranceViewTab, setInsuranceViewTab] = useState<'details' | 'claims'>('details');
    const [editingInsurance, setEditingInsurance] = useState<InsuranceDetails | null>(null);
    const [isSavingInsurance, setIsSavingInsurance] = useState(false);

    // Form states
    const [incidentDate, setIncidentDate] = useState('');
    const [incidentDescription, setIncidentDescription] = useState('');
    const [claimAmount, setClaimAmount] = useState('');
    const [workOrderId, setWorkOrderId] = useState('');
    
    // Progress Form States
    const [targetStatus, setTargetStatus] = useState<ClaimStatus>('SUBMITTED');
    const [approvedAmount, setApprovedAmount] = useState('');
    const [paymentReference, setPaymentReference] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [progressNotes, setProgressNotes] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [vehiclesRes, claimsRes] = await Promise.all([
                getAllVehicles({ limit: 500 }),
                getClaims()
            ]);
            setVehicles(vehiclesRes.data);
            setClaims(claimsRes.data || []);
        } catch (error: any) {
            toast.error(error.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClaim = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVehicle) return;

        try {
            const payload: CreateClaimPayload = {
                vehicleId: selectedVehicle._id,
                incidentDate,
                incidentDescription,
                claimAmount: Number(claimAmount),
            };
            if (workOrderId) {
                payload.workOrderId = workOrderId;
            }
            await createClaim(payload);
            toast.success('Claim created successfully');
            setIsCreateModalOpen(false);
            resetCreateForm();
            fetchData();
            setActiveTab('claims');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create claim');
        }
    };

    const handleProgressClaim = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClaim) return;

        try {
            const payload: ProgressClaimPayload = {
                targetStatus,
                notes: progressNotes
            };

            if (targetStatus === 'APPROVED') payload.approvedAmount = Number(approvedAmount);
            if (targetStatus === 'REJECTED') payload.rejectionReason = rejectionReason;
            if (targetStatus === 'PAYMENT_RECEIVED') {
                payload.paymentReference = paymentReference;
                payload.paymentAmount = Number(paymentAmount);
            }

            await progressClaim(selectedClaim._id, payload);
            toast.success('Claim status updated successfully');
            setIsProgressModalOpen(false);
            resetProgressForm();
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update claim');
        }
    };

    const resetCreateForm = () => {
        setSelectedVehicle(null);
        setIncidentDate('');
        setIncidentDescription('');
        setClaimAmount('');
        setWorkOrderId('');
    };

    const resetProgressForm = () => {
        setSelectedClaim(null);
        setTargetStatus('SUBMITTED');
        setApprovedAmount('');
        setPaymentReference('');
        setPaymentAmount('');
        setRejectionReason('');
        setProgressNotes('');
    };

    const openCreateModal = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setIsCreateModalOpen(true);
    };

    const openInsuranceSingleView = (vehicle: Vehicle) => {
        setSelectedInsuranceViewVehicle(vehicle);
        setEditingInsurance({ ...vehicle.insuranceDetails } || {
            provider: '',
            insuranceNumber: '',
            policyType: '',
            coverageType: '',
            fromDate: '',
            toDate: ''
        });
        setInsuranceViewTab('details');
        setIsInsuranceViewModalOpen(true);
    };

    const handleSaveInsurance = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInsuranceViewVehicle || !editingInsurance) return;

        try {
            setIsSavingInsurance(true);
            await editVehicle(selectedInsuranceViewVehicle._id, {
                insuranceDetails: editingInsurance
            });
            toast.success('Insurance details updated successfully');
            fetchData();
            
            // Update local state to reflect changes without closing modal
            setSelectedInsuranceViewVehicle(prev => prev ? { ...prev, insuranceDetails: editingInsurance } : null);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update insurance details');
        } finally {
            setIsSavingInsurance(false);
        }
    };

    const openProgressModal = (claim: InsuranceClaim) => {
        setSelectedClaim(claim);
        const currentIndex = CLAIM_STATUSES.indexOf(claim.status);
        if (currentIndex < CLAIM_STATUSES.length - 1) {
            setTargetStatus(CLAIM_STATUSES[currentIndex + 1]);
        }
        setIsProgressModalOpen(true);
    };

    const filteredVehicles = vehicles.filter(v => 
        (v.basicDetails.make + ' ' + v.basicDetails.model).toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.basicDetails.vin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.legalDocs?.registrationNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredClaims = claims.filter(c => 
        c.claimNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.policyNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="p-8 text-center animate-pulse flex flex-col items-center gap-4">
                <ShieldAlert size={32} className="animate-bounce text-dim opacity-50" />
                <span className="font-bold text-muted uppercase tracking-widest">Loading Records...</span>
            </div>
        );
    }

    return (
        <div className="p-6 container-responsive space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dashed pb-6" style={{ borderColor: 'var(--border-main)' }}>
                <div>
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>Insurance Claims & Policies</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        Manage vehicle insurance details and track manual claims.
                    </p>
                </div>
                <div className="flex bg-[#1A1A1A] rounded-xl p-1 shadow-inner border" style={{ borderColor: 'var(--border-main)' }}>
                    <button
                        onClick={() => setActiveTab('policies')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                            activeTab === 'policies' ? 'bg-[var(--brand-lime)] text-black shadow-sm' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Policies
                    </button>
                    <button
                        onClick={() => setActiveTab('claims')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${
                            activeTab === 'claims' ? 'bg-[var(--brand-lime)] text-black shadow-sm' : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        Claims
                    </button>
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 mt-2">
                <div className="relative flex-1 md:max-w-md">
                    <input
                        type="text"
                        placeholder="Search vehicles, IDs, claims..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full border py-2.5 pl-10 pr-4 rounded-xl font-medium text-sm shadow-sm outline-none focus:border-brand-lime transition-all"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50" style={{ color: 'var(--text-dim)' }} />
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                        <Filter size={16} /> Filter <span className="bg-[var(--brand-lime)] text-black text-[10px] px-1.5 py-0.5 rounded-full font-black">02</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                        <FileText size={16} /> Export
                    </button>
                    <select className="px-4 py-2 rounded-xl border font-bold text-sm bg-transparent outline-none appearance-none cursor-pointer" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                        <option value="active" style={{ background: 'var(--bg-card)' }}>Active</option>
                        <option value="all" style={{ background: 'var(--bg-card)' }}>All</option>
                    </select>
                </div>
            </div>

            {activeTab === 'policies' && (
                <div className="overflow-x-auto w-full border rounded-xl shadow-sm" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-card)' }}>
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead style={{ backgroundColor: 'var(--bg-input)' }}>
                            <tr className="text-[11px] font-black uppercase tracking-wider opacity-60 border-b" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                <th className="py-4 pl-4 pr-2 w-10">
                                    <input type="checkbox" className="rounded border-gray-300" />
                                </th>
                                <th className="py-4 px-3">Sl No.</th>
                                <th className="py-4 px-3">Vehicle ID</th>
                                <th className="py-4 px-3">Vehicle</th>
                                <th className="py-4 px-3">Status</th>
                                <th className="py-4 px-3">Provider</th>
                                <th className="py-4 px-3">Policy Number</th>
                                <th className="py-4 px-3">Type</th>
                                <th className="py-4 pr-4 pl-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y" style={{ borderColor: 'var(--border-main)' }}>
                            {filteredVehicles.map((vehicle, index) => {
                                const insurance = vehicle.insuranceDetails;
                                return (
                                    <tr key={vehicle._id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                        <td className="py-4 pl-4 pr-2">
                                            <input type="checkbox" className="rounded border-gray-300" />
                                        </td>
                                        <td className="py-4 px-3 font-semibold text-gray-500">{(index + 1).toString().padStart(2, '0')}</td>
                                        <td className="py-4 px-3 font-bold" style={{ color: 'var(--text-main)' }}>VH-{vehicle._id.slice(-4).toUpperCase()}</td>
                                        <td className="py-4 px-3">
                                            <div className="font-bold" style={{ color: 'var(--text-main)' }}>{vehicle.basicDetails.make} {vehicle.basicDetails.model}</div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">{vehicle.legalDocs?.registrationNumber || vehicle.basicDetails.vin}</div>
                                        </td>
                                        <td className="py-4 px-3">
                                            <span className={`px-2.5 py-1 rounded text-[10px] font-black tracking-widest uppercase ${
                                                vehicle.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500' :
                                                vehicle.status === 'INACTIVE' ? 'bg-gray-500/10 text-gray-500' :
                                                'bg-yellow-500/10 text-yellow-500'
                                            }`}>
                                                • {vehicle.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-3 font-medium opacity-80">{insurance?.provider || 'Not Set'}</td>
                                        <td className="py-4 px-3 font-medium opacity-80">{insurance?.insuranceNumber || 'Not Set'}</td>
                                        <td className="py-4 px-3 font-medium opacity-80">{insurance?.policyType || 'Not Set'}</td>
                                            <div className="flex items-center justify-end gap-2">
                                                {insurance?.certificate && (
                                                    <a href={insurance.certificate} target="_blank" rel="noreferrer" className="p-1.5 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors" title="View Certificate">
                                                        <ExternalLink size={14} />
                                                    </a>
                                                )}
                                                <button onClick={() => openInsuranceSingleView(vehicle)} className="px-3 py-1.5 rounded bg-black/5 dark:bg-white/5 font-black text-[10px] uppercase tracking-widest hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center gap-1" title="View & Edit Insurance">
                                                    <Eye size={12} /> View
                                                </button>
                                                <button onClick={() => openCreateModal(vehicle)} className="px-3 py-1.5 rounded bg-[var(--brand-lime)] text-black font-black text-[10px] uppercase tracking-widest hover:bg-[#c2dd2a] transition-colors flex items-center gap-1" title="File Claim">
                                                    <PlusCircle size={12} /> Claim
                                                </button>
                                            </div>
                                    </tr>
                                );
                            })}
                            {filteredVehicles.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center text-sm font-bold opacity-50 uppercase tracking-widest">
                                        No Vehicles Found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'claims' && (
                <div className="overflow-x-auto w-full border rounded-xl shadow-sm" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-card)' }}>
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead style={{ backgroundColor: 'var(--bg-input)' }}>
                            <tr className="text-[11px] font-black uppercase tracking-wider opacity-60 border-b" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                <th className="py-4 pl-4 pr-2 w-10">
                                    <input type="checkbox" className="rounded border-gray-300" />
                                </th>
                                <th className="py-4 px-3">Sl No.</th>
                                <th className="py-4 px-3">Claim #</th>
                                <th className="py-4 px-3">Status</th>
                                <th className="py-4 px-3">Policy Number</th>
                                <th className="py-4 px-3 text-right">Amount</th>
                                <th className="py-4 px-3 text-right">Date</th>
                                <th className="py-4 pr-4 pl-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y" style={{ borderColor: 'var(--border-main)' }}>
                            {filteredClaims.map((claim, index) => (
                                <tr key={claim._id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                    <td className="py-4 pl-4 pr-2">
                                        <input type="checkbox" className="rounded border-gray-300" />
                                    </td>
                                    <td className="py-4 px-3 font-semibold text-gray-500">{(index + 1).toString().padStart(2, '0')}</td>
                                    <td className="py-4 px-3 font-bold text-[var(--brand-lime)]">{claim.claimNumber}</td>
                                    <td className="py-4 px-3">
                                        <span className={`px-2.5 py-1 rounded text-[10px] font-black tracking-widest uppercase ${
                                            claim.status === 'CLOSED' ? 'bg-gray-500/10 text-gray-500' :
                                            claim.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' :
                                            claim.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                                            'bg-yellow-500/10 text-yellow-500'
                                        }`}>
                                            • {claim.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-3 font-medium opacity-80">{claim.policyNumber}</td>
                                    <td className="py-4 px-3 font-bold text-right">${claim.claimAmount.toLocaleString()}</td>
                                    <td className="py-4 px-3 font-medium opacity-80 text-right">{new Date(claim.incidentDate).toLocaleDateString()}</td>
                                    <td className="py-4 pr-4 pl-3 flex items-center justify-end gap-2">
                                        <button 
                                            onClick={() => openProgressModal(claim)} 
                                            disabled={claim.status === 'CLOSED'}
                                            className="px-3 py-1.5 rounded bg-blue-500/10 text-blue-500 font-black text-[10px] uppercase tracking-widest hover:bg-blue-500/20 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:grayscale"
                                            title="Update Status"
                                        >
                                            <Edit size={12} /> Update
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {filteredClaims.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="py-12 text-center text-sm font-bold opacity-50 uppercase tracking-widest">
                                        No Claims Found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            
            {/* Pagination Placeholder matching design */}
            <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                    <select className="px-3 py-1.5 rounded-lg border font-bold text-sm bg-transparent outline-none appearance-none cursor-pointer shadow-sm" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                        <option value="15" style={{ background: 'var(--bg-card)' }}>15 ˅</option>
                        <option value="50" style={{ background: 'var(--bg-card)' }}>50 ˅</option>
                    </select>
                </div>
                <div className="flex items-center gap-1 text-sm font-bold">
                    <button className="px-2.5 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 opacity-50 cursor-not-allowed">{'<'}</button>
                    <button className="px-2.5 py-1 rounded bg-[var(--brand-lime)] text-black">01</button>
                    <button className="px-2.5 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5">02</button>
                    <button className="px-2.5 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5">03</button>
                    <span className="px-1.5">...</span>
                    <button className="px-2.5 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5">140</button>
                    <button className="px-2.5 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5">{'>'}</button>
                </div>
            </div>

            {/* Create Claim Modal */}
            <Modal isOpen={isCreateModalOpen} onClose={() => { setIsCreateModalOpen(false); resetCreateForm(); }} title="File Manual Claim">
                {selectedVehicle && (
                    <form onSubmit={handleCreateClaim} className="space-y-4">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-6">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Vehicle</p>
                            <p className="font-bold text-sm">{selectedVehicle.basicDetails.make} {selectedVehicle.basicDetails.model} ({selectedVehicle.legalDocs?.registrationNumber || selectedVehicle.basicDetails.vin})</p>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Incident Date</label>
                            <input
                                type="date"
                                required
                                value={incidentDate}
                                onChange={(e) => setIncidentDate(e.target.value)}
                                className="w-full bg-[#1A1A1A] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:border-[var(--brand-lime)] outline-none transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Work Order ID (Optional)</label>
                            <input
                                type="text"
                                value={workOrderId}
                                onChange={(e) => setWorkOrderId(e.target.value)}
                                className="w-full bg-[#1A1A1A] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:border-[var(--brand-lime)] outline-none transition-colors"
                                placeholder="E.g. WO-12345"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Claim Amount</label>
                            <input
                                type="number"
                                required
                                value={claimAmount}
                                onChange={(e) => setClaimAmount(e.target.value)}
                                className="w-full bg-[#1A1A1A] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:border-[var(--brand-lime)] outline-none transition-colors"
                                placeholder="0.00"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Incident Description</label>
                            <textarea
                                required
                                value={incidentDescription}
                                onChange={(e) => setIncidentDescription(e.target.value)}
                                rows={3}
                                className="w-full bg-[#1A1A1A] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:border-[var(--brand-lime)] outline-none transition-colors resize-none"
                                placeholder="Describe the incident..."
                            />
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-3 rounded-xl border border-gray-700 font-bold text-sm hover:bg-white/5 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" className="flex-1 py-3 rounded-xl bg-[var(--brand-lime)] text-black font-black uppercase tracking-widest text-sm hover:bg-[#c2dd2a] transition-colors">
                                Submit Claim
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Progress Claim Modal */}
            <Modal isOpen={isProgressModalOpen} onClose={() => { setIsProgressModalOpen(false); resetProgressForm(); }} title="Update Claim Status">
                {selectedClaim && (
                    <form onSubmit={handleProgressClaim} className="space-y-4">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 mb-4 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Current Status</p>
                                <p className="font-bold text-sm text-[var(--brand-lime)]">{selectedClaim.status}</p>
                            </div>
                            <ChevronRight className="text-gray-600" />
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Target Status</p>
                                <select 
                                    value={targetStatus}
                                    onChange={(e) => setTargetStatus(e.target.value as ClaimStatus)}
                                    className="bg-transparent font-bold text-sm text-white outline-none appearance-none cursor-pointer"
                                >
                                    {CLAIM_STATUSES.map(s => (
                                        <option key={s} value={s} className="bg-black text-white">{s}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {targetStatus === 'APPROVED' && (
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Approved Amount</label>
                                <input
                                    type="number"
                                    required
                                    value={approvedAmount}
                                    onChange={(e) => setApprovedAmount(e.target.value)}
                                    className="w-full bg-[#1A1A1A] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:border-[var(--brand-lime)] outline-none transition-colors"
                                />
                            </div>
                        )}

                        {targetStatus === 'REJECTED' && (
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Rejection Reason</label>
                                <input
                                    type="text"
                                    required
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="w-full bg-[#1A1A1A] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:border-[var(--brand-lime)] outline-none transition-colors"
                                />
                            </div>
                        )}

                        {targetStatus === 'PAYMENT_RECEIVED' && (
                            <>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Payment Reference</label>
                                    <input
                                        type="text"
                                        required
                                        value={paymentReference}
                                        onChange={(e) => setPaymentReference(e.target.value)}
                                        className="w-full bg-[#1A1A1A] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:border-[var(--brand-lime)] outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Payment Amount</label>
                                    <input
                                        type="number"
                                        required
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        className="w-full bg-[#1A1A1A] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:border-[var(--brand-lime)] outline-none transition-colors"
                                    />
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Notes (Optional)</label>
                            <input
                                type="text"
                                value={progressNotes}
                                onChange={(e) => setProgressNotes(e.target.value)}
                                className="w-full bg-[#1A1A1A] border border-gray-800 rounded-xl px-4 py-3 text-sm focus:border-[var(--brand-lime)] outline-none transition-colors"
                            />
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setIsProgressModalOpen(false)} className="flex-1 py-3 rounded-xl border border-gray-700 font-bold text-sm hover:bg-white/5 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" className="flex-1 py-3 rounded-xl bg-[var(--brand-lime)] text-black font-black uppercase tracking-widest text-sm hover:bg-[#c2dd2a] transition-colors flex items-center justify-center gap-2">
                                <CheckCircle2 size={16} /> Confirm Update
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Insurance Single View Modal */}
            <Modal isOpen={isInsuranceViewModalOpen} onClose={() => { setIsInsuranceViewModalOpen(false); setSelectedInsuranceViewVehicle(null); }} title="Insurance Single View">
                {selectedInsuranceViewVehicle && editingInsurance && (
                    <div className="space-y-6">
                        {/* Header & Tabs */}
                        <div className="flex flex-col gap-4 border-b border-dashed border-gray-800 pb-4">
                            <div>
                                <h2 className="text-xl font-bold text-white">{selectedInsuranceViewVehicle.basicDetails.make} {selectedInsuranceViewVehicle.basicDetails.model}</h2>
                                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest mt-1">
                                    Registration: {selectedInsuranceViewVehicle.legalDocs?.registrationNumber || 'N/A'} | VIN: {selectedInsuranceViewVehicle.basicDetails.vin}
                                </p>
                            </div>
                            <div className="flex bg-[#1A1A1A] rounded-xl p-1 shadow-inner border border-gray-800">
                                <button
                                    onClick={() => setInsuranceViewTab('details')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                        insuranceViewTab === 'details' ? 'bg-[var(--brand-lime)] text-black shadow-sm' : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Policy Details
                                </button>
                                <button
                                    onClick={() => setInsuranceViewTab('claims')}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                                        insuranceViewTab === 'claims' ? 'bg-[var(--brand-lime)] text-black shadow-sm' : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    Related Claims
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${insuranceViewTab === 'claims' ? 'bg-black text-[var(--brand-lime)]' : 'bg-gray-800 text-white'}`}>
                                        {claims.filter(c => c.vehicleId === selectedInsuranceViewVehicle._id).length}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Details Tab */}
                        {insuranceViewTab === 'details' && (
                            <form onSubmit={handleSaveInsurance} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Provider Name</label>
                                        <input
                                            type="text"
                                            value={editingInsurance.provider || ''}
                                            onChange={(e) => setEditingInsurance({ ...editingInsurance, provider: e.target.value })}
                                            className="w-full bg-[#1A1A1A] border border-gray-800 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:border-[var(--brand-lime)] outline-none transition-colors"
                                            placeholder="E.g. AXA, Geico"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Policy Number</label>
                                        <input
                                            type="text"
                                            value={editingInsurance.insuranceNumber || ''}
                                            onChange={(e) => setEditingInsurance({ ...editingInsurance, insuranceNumber: e.target.value })}
                                            className="w-full bg-[#1A1A1A] border border-gray-800 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:border-[var(--brand-lime)] outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Policy Type</label>
                                        <select
                                            value={editingInsurance.policyType || 'FLEET'}
                                            onChange={(e) => setEditingInsurance({ ...editingInsurance, policyType: e.target.value })}
                                            className="w-full bg-[#1A1A1A] border border-gray-800 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:border-[var(--brand-lime)] outline-none transition-colors appearance-none"
                                        >
                                            <option value="FLEET">Fleet Policy</option>
                                            <option value="INDIVIDUAL">Individual Policy</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Coverage Type</label>
                                        <select
                                            value={editingInsurance.coverageType || 'COMPREHENSIVE'}
                                            onChange={(e) => setEditingInsurance({ ...editingInsurance, coverageType: e.target.value })}
                                            className="w-full bg-[#1A1A1A] border border-gray-800 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:border-[var(--brand-lime)] outline-none transition-colors appearance-none"
                                        >
                                            <option value="COMPREHENSIVE">Comprehensive</option>
                                            <option value="THIRD_PARTY">Third-Party Only</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={editingInsurance.fromDate ? new Date(editingInsurance.fromDate).toISOString().split('T')[0] : ''}
                                            onChange={(e) => setEditingInsurance({ ...editingInsurance, fromDate: e.target.value })}
                                            className="w-full bg-[#1A1A1A] border border-gray-800 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:border-[var(--brand-lime)] outline-none transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500 mb-1">Expiry Date (Renew)</label>
                                        <input
                                            type="date"
                                            value={editingInsurance.toDate ? new Date(editingInsurance.toDate).toISOString().split('T')[0] : ''}
                                            onChange={(e) => setEditingInsurance({ ...editingInsurance, toDate: e.target.value })}
                                            className="w-full bg-[#1A1A1A] border border-gray-800 rounded-xl px-4 py-2.5 text-sm font-bold text-[var(--brand-lime)] focus:border-[var(--brand-lime)] outline-none transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="pt-6 flex gap-3">
                                    <button type="submit" disabled={isSavingInsurance} className="flex-1 py-3 rounded-xl bg-[var(--brand-lime)] text-black font-black uppercase tracking-widest text-sm hover:bg-[#c2dd2a] transition-all flex items-center justify-center gap-2">
                                        {isSavingInsurance ? (
                                            <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div> Saving...</>
                                        ) : (
                                            <><CheckCircle2 size={16} /> Update Policy Details</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Claims Tab */}
                        {insuranceViewTab === 'claims' && (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Active & Historic Claims</h3>
                                    <button 
                                        onClick={() => openCreateModal(selectedInsuranceViewVehicle)} 
                                        className="px-4 py-2 rounded-lg bg-black/20 border border-gray-700 text-white font-bold text-xs hover:bg-black/40 transition-colors flex items-center gap-2"
                                    >
                                        <PlusCircle size={14} /> File New Claim
                                    </button>
                                </div>

                                {claims.filter(c => c.vehicleId === selectedInsuranceViewVehicle._id).length === 0 ? (
                                    <div className="py-12 text-center bg-[#1A1A1A] rounded-xl border border-gray-800">
                                        <ShieldAlert size={32} className="mx-auto text-gray-600 mb-3" />
                                        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">No claims registered for this vehicle.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {claims.filter(c => c.vehicleId === selectedInsuranceViewVehicle._id).map(claim => (
                                            <div key={claim._id} className="p-4 rounded-xl bg-[#1A1A1A] border border-gray-800 flex items-center justify-between group hover:border-gray-600 transition-colors">
                                                <div>
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <p className="font-bold text-[var(--brand-lime)]">{claim.claimNumber}</p>
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase ${
                                                            claim.status === 'CLOSED' ? 'bg-gray-500/10 text-gray-500' :
                                                            claim.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' :
                                                            claim.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                                                            'bg-yellow-500/10 text-yellow-500'
                                                        }`}>
                                                            {claim.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-400 font-medium">
                                                        {new Date(claim.incidentDate).toLocaleDateString()} • {claim.claimAmount ? `$${claim.claimAmount.toLocaleString()}` : 'No Amount'}
                                                        {claim.workOrderId && <span className="ml-2 text-blue-400 font-bold tracking-wider text-[10px]">WO: {claim.workOrderId}</span>}
                                                    </p>
                                                </div>
                                                <button 
                                                    onClick={() => openProgressModal(claim)} 
                                                    disabled={claim.status === 'CLOSED'}
                                                    className="px-3 py-1.5 rounded-lg border border-gray-700 bg-transparent text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    Proceed Claim
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default InsuranceClaimsView;
