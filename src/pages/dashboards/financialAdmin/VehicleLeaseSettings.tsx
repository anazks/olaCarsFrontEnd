import { useState, useEffect } from 'react';

import { Car, Search, Save, CheckCircle2, AlertCircle, Filter, FileText } from 'lucide-react';
import { getAllVehicles, updateVehicleLeaseSettings } from '../../../services/vehicleService';
import type { Vehicle } from '../../../services/vehicleService';
import toast from 'react-hot-toast';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const VehicleLeaseSettings = () => {
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
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Vehicle Lease Settings', active: true }]} />

                <Car size={32} className="animate-bounce text-dim opacity-50" />
                <span className="font-bold text-muted uppercase tracking-widest">Loading Vehicles...</span>
            </div>
        );
    }

    return (
        <div className="container-responsive space-y-6">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Vehicle Lease Settings', active: true }]} />

            {/* Compact Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <Car size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        Vehicle Lease Settings
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">Global configuration for standard lease durations and rental rates.</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 mt-2">
                <div className="relative flex-1 md:max-w-md">
                    <input
                        type="text"
                        placeholder="Search by make, model, VIN..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full border py-2.5 pl-10 pr-4 rounded-xl font-medium text-sm shadow-sm outline-none focus:border-brand-lime transition-all"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50" style={{ color: 'var(--text-dim)' }} />
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-sm bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                        <Filter size={16} /> Filter <span className="bg-[#D4F12E] text-black text-[10px] px-1.5 py-0.5 rounded-full font-black">02</span>
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

            <div className="overflow-x-auto w-full border rounded-xl shadow-sm" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-card)' }}>
                <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead style={{ backgroundColor: 'var(--bg-input)' }}>
                        <tr className="text-[11px] font-black uppercase tracking-wider opacity-60 border-b" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                            <th className="py-4 pl-4 pr-2 w-10">
                                <input type="checkbox" className="rounded border-gray-300" />
                            </th>
                            <th className="py-4 px-3">Sl No.</th>
                            <th className="py-4 px-3">Vehicle</th>
                            <th className="py-4 px-3">Status</th>
                            <th className="py-4 px-3">Duration (Weeks)</th>
                            <th className="py-4 px-3">Weekly Rent (USD)</th>
                            <th className="py-4 pr-4 pl-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y" style={{ borderColor: 'var(--border-main)' }}>
                        {filteredVehicles.map((vehicle, index) => {
                            const isSaving = savingId === vehicle._id;
                            const editState = edits[vehicle._id] || { durationWeeks: 260, weeklyRent: 0 };
                            
                            const hasChanged = 
                                Number(editState.durationWeeks) !== (vehicle.basicDetails.leaseDurationWeeks || 260) || 
                                Number(editState.weeklyRent) !== (vehicle.basicDetails.weeklyRent || 0);

                            return (
                                <tr key={vehicle._id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                    <td className="py-4 pl-4 pr-2">
                                        <input type="checkbox" className="rounded border-gray-300" />
                                    </td>
                                    <td className="py-4 px-3 font-semibold text-gray-500">{(index + 1).toString().padStart(2, '0')}</td>
                                    <td className="py-4 px-3">
                                        <div className="font-bold" style={{ color: 'var(--text-main)' }}>{vehicle.basicDetails.make} {vehicle.basicDetails.model}</div>
                                        <div className="text-[10px] uppercase font-black tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>VIN: {vehicle.basicDetails.vin}</div>
                                    </td>
                                    <td className="py-4 px-3">
                                        <span className={`px-2.5 py-1 rounded text-[10px] font-black tracking-widest uppercase ${
                                            vehicle.status.includes('ACTIVE') ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                                        }`}>
                                            • {vehicle.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-3">
                                        <select
                                            value={editState.durationWeeks}
                                            onChange={(e) => handleEditChange(vehicle._id, 'durationWeeks', e.target.value)}
                                            className="px-3 py-1.5 rounded-lg border outline-none font-bold focus:border-brand-lime transition-all appearance-none"
                                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        >
                                            <option value="52">52 Weeks (1 Year)</option>
                                            <option value="104">104 Weeks (2 Years)</option>
                                            <option value="156">156 Weeks (3 Years)</option>
                                            <option value="208">208 Weeks (4 Years)</option>
                                            <option value="260">260 Weeks (5 Years)</option>
                                            <option value="312">312 Weeks (6 Years)</option>
                                        </select>
                                    </td>
                                    <td className="py-4 px-3">
                                        <input
                                            type="number"
                                            value={editState.weeklyRent}
                                            onChange={(e) => handleEditChange(vehicle._id, 'weeklyRent', e.target.value)}
                                            className="w-28 px-3 py-1.5 rounded-lg border outline-none font-bold focus:border-brand-lime transition-all"
                                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        />
                                    </td>
                                    <td className="py-4 pr-4 pl-3 flex justify-end">
                                        <button
                                            onClick={() => handleSave(vehicle._id)}
                                            disabled={isSaving || !hasChanged}
                                            className={`px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-1 ${
                                                hasChanged 
                                                    ? 'bg-[#D4F12E] text-black hover:scale-[1.02] active:scale-95' 
                                                    : 'bg-black/5 dark:bg-white/5 text-gray-500 cursor-not-allowed'
                                            }`}
                                        >
                                            {isSaving ? (
                                                <><div className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin"></div> Saving...</>
                                            ) : hasChanged ? (
                                                <><Save size={14} /> Save</>
                                            ) : (
                                                <><CheckCircle2 size={14} /> Saved</>
                                            )}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredVehicles.length === 0 && (
                            <tr>
                                <td colSpan={7} className="py-12 text-center text-sm font-bold opacity-50 uppercase tracking-widest">
                                    No Vehicles Found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                    <select className="px-3 py-1.5 rounded-lg border font-bold text-sm bg-transparent outline-none appearance-none cursor-pointer shadow-sm" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                        <option value="15" style={{ background: 'var(--bg-card)' }}>15 ˅</option>
                        <option value="50" style={{ background: 'var(--bg-card)' }}>50 ˅</option>
                    </select>
                </div>
                <div className="flex items-center gap-1 text-sm font-bold">
                    <button className="px-2.5 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 opacity-50 cursor-not-allowed">{'<'}</button>
                    <button className="px-2.5 py-1 rounded bg-[#D4F12E] text-black">01</button>
                    <button className="px-2.5 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5">02</button>
                    <button className="px-2.5 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5">03</button>
                    <span className="px-1.5">...</span>
                    <button className="px-2.5 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5">140</button>
                    <button className="px-2.5 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5">{'>'}</button>
                </div>
            </div>
        </div>
    );
};

export default VehicleLeaseSettings;
