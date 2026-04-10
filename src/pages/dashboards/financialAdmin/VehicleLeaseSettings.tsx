import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Car, Search, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { getAllVehicles, updateVehicleLeaseSettings } from '../../../services/vehicleService';
import type { Vehicle } from '../../../services/vehicleService';
import toast from 'react-hot-toast';

const VehicleLeaseSettings = () => {
    const { t } = useTranslation();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [savingId, setSavingId] = useState<string | null>(null);

    // Local state to manage edits before saving
    const [edits, setEdits] = useState<Record<string, { durationWeeks: number; weeklyRent: number }>>({});

    useEffect(() => {
        fetchVehicles();
    }, []);

    const fetchVehicles = async () => {
        try {
            setLoading(true);
            const response = await getAllVehicles({ limit: 500 });
            setVehicles(response.data);
            
            // Initialize edits map
            const initialEdits: Record<string, { durationWeeks: number; weeklyRent: number }> = {};
            response.data.forEach(v => {
                initialEdits[v._id] = {
                    durationWeeks: v.basicDetails.leaseDurationWeeks || 260,
                    weeklyRent: v.basicDetails.weeklyRent || 0,
                };
            });
            setEdits(initialEdits);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to fetch vehicles');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (id: string) => {
        const edit = edits[id];
        if (!edit) return;

        try {
            setSavingId(id);
            const payload = {
                durationWeeks: Number(edit.durationWeeks),
                weeklyRent: Number(edit.weeklyRent),
            };
            console.log('[DEBUG] updateVehicleLeaseSettings - Payload:', payload);

            await updateVehicleLeaseSettings(id, payload);
            toast.success('Lease settings updated successfully');
            
            // Update local vehicle state to match edits
            setVehicles(prev => prev.map(v => {
                if (v._id === id) {
                    return {
                        ...v,
                        basicDetails: {
                            ...v.basicDetails,
                            leaseDurationWeeks: Number(edit.durationWeeks),
                            weeklyRent: Number(edit.weeklyRent)
                        }
                    };
                }
                return v;
            }));
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update lease settings');
        } finally {
            setSavingId(null);
        }
    };

    const handleEditChange = (id: string, field: 'durationWeeks' | 'weeklyRent', value: string) => {
        setEdits(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }));
    };

    const filteredVehicles = vehicles.filter(v => 
        (v.basicDetails.make + ' ' + v.basicDetails.model).toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.basicDetails.vin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.legalDocs?.registrationNumber || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="p-8 text-center animate-pulse flex flex-col items-center gap-4">
                <Car size={32} className="animate-bounce text-dim opacity-50" />
                <span className="font-bold text-muted uppercase tracking-widest">Loading Vehicles...</span>
            </div>
        );
    }

    return (
        <div className="p-6 container-responsive space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-dashed pb-6" style={{ borderColor: 'var(--border-main)' }}>
                <div>
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>Vehicle Lease Settings</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        Manage standard lease durations and weekly rent rates globally. These will map directly to driver assignment contracts.
                    </p>
                </div>
            </div>

            <div className="relative">
                <input
                    type="text"
                    placeholder="Search by make, model, VIN or registration..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border p-4 pl-12 rounded-2xl font-bold shadow-sm outline-none focus:border-brand-lime transition-all"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                />
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" style={{ color: 'var(--text-dim)' }} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredVehicles.map(vehicle => {
                    const isSaving = savingId === vehicle._id;
                    const editState = edits[vehicle._id] || { durationWeeks: 260, weeklyRent: 0 };
                    
                    const hasChanged = 
                        Number(editState.durationWeeks) !== (vehicle.basicDetails.leaseDurationWeeks || 260) || 
                        Number(editState.weeklyRent) !== (vehicle.basicDetails.weeklyRent || 0);

                    return (
                        <div key={vehicle._id} className="p-6 rounded-2xl border transition-all hover:shadow-md" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-start justify-between mb-4 pb-4 border-b border-dashed" style={{ borderColor: 'var(--border-main)' }}>
                                <div>
                                    <h3 className="font-bold text-lg leading-tight" style={{ color: 'var(--text-main)' }}>
                                        {vehicle.basicDetails.make} {vehicle.basicDetails.model}
                                    </h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-widest bg-black/5 text-dim">
                                            {vehicle.basicDetails.year}
                                        </span>
                                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">
                                            VIN: {vehicle.basicDetails.vin}
                                        </span>
                                    </div>
                                </div>
                                <div className={`px-2 py-1 rounded text-[9px] font-black tracking-widest uppercase ${
                                    vehicle.status.includes('ACTIVE') ? 'bg-brand-lime/20 text-brand-lime' : 'bg-yellow-500/10 text-yellow-500'
                                }`}>
                                    {vehicle.status}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-70">Duration (Weeks)</label>
                                    <select
                                        value={editState.durationWeeks}
                                        onChange={(e) => handleEditChange(vehicle._id, 'durationWeeks', e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border outline-none font-bold focus:border-brand-lime transition-all appearance-none"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <option value="52">52 Weeks (1 Year)</option>
                                        <option value="104">104 Weeks (2 Years)</option>
                                        <option value="156">156 Weeks (3 Years)</option>
                                        <option value="208">208 Weeks (4 Years)</option>
                                        <option value="260">260 Weeks (5 Years)</option>
                                        <option value="312">312 Weeks (6 Years)</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest opacity-70">Weekly Rent (USD)</label>
                                    <input
                                        type="number"
                                        value={editState.weeklyRent}
                                        onChange={(e) => handleEditChange(vehicle._id, 'weeklyRent', e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border outline-none font-bold focus:border-brand-lime transition-all"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => handleSave(vehicle._id)}
                                disabled={isSaving || !hasChanged}
                                className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${
                                    hasChanged 
                                        ? 'bg-brand-lime text-black hover:scale-[1.02] shadow-xl active:scale-95' 
                                        : 'bg-black/5 text-dim cursor-not-allowed opacity-50 grayscale'
                                }`}
                            >
                                {isSaving ? (
                                    <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div> Saving...</>
                                ) : hasChanged ? (
                                    <><Save size={16} /> Save Changes</>
                                ) : (
                                    <><CheckCircle2 size={16} /> Up to date</>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            {filteredVehicles.length === 0 && (
                <div className="py-20 text-center flex flex-col items-center rounded-2xl border border-dashed" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                    <AlertCircle size={48} className="mb-4 text-dim opacity-50" />
                    <p className="font-bold uppercase tracking-widest text-sm text-dim">No Vehicles Found</p>
                </div>
            )}
        </div>
    );
};

export default VehicleLeaseSettings;
