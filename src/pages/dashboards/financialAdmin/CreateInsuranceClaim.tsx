import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
    ShieldAlert, 
    ArrowLeft, 
    CheckCircle2, 
    Car
} from 'lucide-react';
import { createClaim } from '../../../services/insuranceClaimService';
import type { CreateClaimPayload } from '../../../services/insuranceClaimService';
import { getAllVehicles, getVehicleById } from '../../../services/vehicleService';
import type { Vehicle } from '../../../services/vehicleService';
import toast from 'react-hot-toast';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const CreateInsuranceClaim = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const preselectedVehicleId = searchParams.get('vehicleId');
    
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form states
    const [vehicleId, setVehicleId] = useState(preselectedVehicleId || '');
    const [incidentDate, setIncidentDate] = useState('');
    const [incidentDescription, setIncidentDescription] = useState('');
    const [claimAmount, setClaimAmount] = useState('');
    const [workOrderId, setWorkOrderId] = useState('');

    useEffect(() => {
        fetchVehicles();
    }, []);

    useEffect(() => {
        if (vehicleId) {
            const v = vehicles.find(v => v._id === vehicleId);
            if (v) setSelectedVehicle(v);
            else if (preselectedVehicleId && !vehicles.length) {
                // Fetch specific vehicle if preselected and not in list
                getVehicleById(vehicleId).then(setSelectedVehicle).catch(console.error);
            }
        } else {
            setSelectedVehicle(null);
        }
    }, [vehicleId, vehicles]);

    const fetchVehicles = async () => {
        try {
            setLoading(true);
            const vehiclesRes = await getAllVehicles({ limit: 1000 });
            setVehicles(vehiclesRes.data || []);
        } catch (error: any) {
            toast.error('Failed to load vehicles');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateClaim = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vehicleId) {
            toast.error("Please select a vehicle");
            return;
        }

        try {
            setIsSubmitting(true);
            const payload: CreateClaimPayload = {
                vehicleId,
                incidentDate,
                incidentDescription,
                claimAmount: Number(claimAmount),
            };
            if (workOrderId) {
                payload.workOrderId = workOrderId;
            }
            const claim = await createClaim(payload);
            toast.success('Claim created successfully');
            navigate(`/admin/financial-admin/insurance-claims/${claim._id}`);
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message || 'Failed to create claim');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-[800px] mx-auto space-y-6">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Create Insurance Claim', active: true }]} />

            <button 
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-sm font-bold opacity-60 hover:opacity-100 transition-opacity"
            >
                <ArrowLeft size={16} /> Back
            </button>

            <div className="border-b border-white/10 pb-6">
                <h1 className="text-xl font-black flex items-center gap-3 tracking-tight" style={{ color: 'var(--text-main)' }}>
                    <ShieldAlert className="text-[#D4F12E]" size={32} />
                    File Manual Claim
                </h1>
                <p className="mt-1 font-medium text-sm" style={{ color: 'var(--text-muted)' }}>
                    Create a new insurance claim manually. The system will auto-populate the master policy details based on the selected vehicle.
                </p>
            </div>

            <form onSubmit={handleCreateClaim} className="bg-glass border rounded-2xl p-6 space-y-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                {loading && !vehicles.length ? (
                    <div className="text-center py-4 text-sm font-bold text-gray-500 animate-pulse">Loading data...</div>
                ) : (
                    <>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Select Vehicle</label>
                            <select
                                required
                                value={vehicleId}
                                onChange={(e) => setVehicleId(e.target.value)}
                                className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-sm font-bold focus:border-[#D4F12E] outline-none transition-colors"
                            >
                                <option value="">-- Select a Vehicle --</option>
                                {vehicles.map(v => (
                                    <option key={v._id} value={v._id}>
                                        {v.basicDetails.make} {v.basicDetails.model} ({v.legalDocs?.registrationNumber || v.basicDetails.vin})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedVehicle && (
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
                                <div className="p-3 bg-black/20 rounded-lg"><Car className="text-[#D4F12E]" /></div>
                                <div>
                                    <p className="font-bold text-sm text-white">{selectedVehicle?.basicDetails?.make || 'Unknown Make'} {selectedVehicle?.basicDetails?.model || 'Unknown Model'}</p>
                                    <p className="text-xs text-gray-400 font-mono mt-1">Plate No: {selectedVehicle?.basicDetails?.vin || 'N/A'} | REG: {selectedVehicle?.legalDocs?.registrationNumber || 'N/A'}</p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Incident Date</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={incidentDate}
                                    onChange={(e) => setIncidentDate(e.target.value)}
                                    className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-sm font-bold focus:border-[#D4F12E] outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Work Order ID (Optional)</label>
                                <input
                                    type="text"
                                    value={workOrderId}
                                    onChange={(e) => setWorkOrderId(e.target.value)}
                                    placeholder="E.g. WO-12345"
                                    className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-sm font-bold focus:border-[#D4F12E] outline-none transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Estimated Claim Amount</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                                <input
                                    type="number"
                                    required
                                    value={claimAmount}
                                    onChange={(e) => setClaimAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-black border border-gray-800 rounded-xl pl-8 pr-4 py-3 text-sm font-bold focus:border-[#D4F12E] outline-none transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Incident Description</label>
                            <textarea
                                required
                                rows={4}
                                value={incidentDescription}
                                onChange={(e) => setIncidentDescription(e.target.value)}
                                placeholder="Describe the incident in detail..."
                                className="w-full bg-black border border-gray-800 rounded-xl px-4 py-3 text-sm font-bold focus:border-[#D4F12E] outline-none transition-colors resize-none"
                            />
                        </div>

                        <div className="pt-4 flex gap-4">
                            <button 
                                type="button" 
                                onClick={() => navigate(-1)} 
                                className="flex-1 py-3.5 rounded-xl border border-gray-700 font-bold text-sm hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                disabled={isSubmitting || !vehicleId}
                                className="flex-1 py-3.5 rounded-xl bg-[#D4F12E] text-black font-black uppercase tracking-widest text-sm hover:bg-[#c2dd2a] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {isSubmitting ? 'Filing Claim...' : <><CheckCircle2 size={16} /> Submit Claim</>}
                            </button>
                        </div>
                    </>
                )}
            </form>
        </div>
    );
};

export default CreateInsuranceClaim;
