import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Car, Search, CheckCircle2, ShieldCheck, Route as RouteIcon, Tag } from 'lucide-react';
import { getDriverById } from '../../../services/driverService';
import { getAvailableVehicles, assignVehicleToDriver } from '../../../services/vehicleService';
import type { Driver } from '../../../services/driverService';
import type { Vehicle } from '../../../services/vehicleService';

const DriverVehicleAssignment = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [driver, setDriver] = useState<Driver | null>(null);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
    const [assigning, setAssigning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [leaseDetails, setLeaseDetails] = useState({
        leaseDuration: '',
        monthlyRent: '',
        notes: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                setLoading(true);
                // 1. Fetch the driver
                const driverData = await getDriverById(id);
                setDriver(driverData);

                // 2. Fetch active and available vehicles
                // We use type assertion since getAvailableVehicles returns PaginatedResponse
                const response = await getAvailableVehicles({ 
                    limit: 100 // load a large batch for assignment
                });
                
                // If the backend returns paginated data, it has a .data property
                const vehiclesList = response.data || [];
                setVehicles(vehiclesList);

            } catch (err: any) {
                console.error("Error fetching assignment data:", err);
                setError(err.response?.data?.message || 'Failed to load assignment data.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    const handleAssign = async () => {
        if (!id || !selectedVehicleId) return;
        
        try {
            setAssigning(true);
            setError(null);
            
            // Advance the driver to CONTRACT PENDING and assign the vehicle
            await assignVehicleToDriver(selectedVehicleId, id, {
                leaseDuration: Number(leaseDetails.leaseDuration),
                monthlyRent: Number(leaseDetails.monthlyRent),
                notes: leaseDetails.notes
            });
            
            // Navigate back to the driver detail page
            navigate('..');
        } catch (err: any) {
            console.error("Error assigning vehicle:", err);
            setError(err.response?.data?.message || 'Failed to assign vehicle.');
            setAssigning(false);
        }
    };

    const filteredVehicles = vehicles.filter(v => 
        (v.basicDetails.make + ' ' + v.basicDetails.model).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.legalDocs?.registrationNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.basicDetails.vin.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="p-8 text-center animate-pulse flex flex-col items-center gap-4">
                <Car size={32} className="animate-bounce" style={{ color: 'var(--text-dim)', opacity: 0.5 }} />
                <span className="font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Loading Assignment Data...</span>
            </div>
        );
    }

    if (!driver) {
        return <div className="p-8 text-center font-bold text-red-500">Driver not found</div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 border-b pb-6" style={{ borderColor: 'var(--border-main)' }}>
                <button onClick={() => navigate('..')} className="p-2 hover:opacity-70 rounded-xl border border-transparent transition-all group">
                    <ChevronLeft size={24} style={{ color: 'var(--text-main)' }} />
                </button>
                <div>
                    <h1 className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>Assign Vehicle</h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        Select an available vehicle to assign to <span className="font-bold" style={{ color: 'var(--text-main)' }}>{driver.personalInfo.fullName}</span>
                    </p>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl border flex items-start gap-3 bg-red-500/10 border-red-500/20 text-red-500">
                    <ShieldCheck size={20} className="shrink-0" />
                    <div>
                        <p className="font-bold text-sm uppercase tracking-wider">Assignment Failed</p>
                        <p className="text-xs mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Search Bar */}
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search by make, model, VIN or registration..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border p-4 pl-12 rounded-2xl font-bold shadow-sm outline-none focus:border-brand-lime transition-all"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                />
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
            </div>

            {/* Vehicles Grid */}
            {filteredVehicles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredVehicles.map((vehicle) => {
                        const isSelected = selectedVehicleId === vehicle._id;
                        
                        return (
                            <div 
                                key={vehicle._id}
                                onClick={() => setSelectedVehicleId(vehicle._id)}
                                className={`cursor-pointer rounded-2xl border p-5 transition-all relative overflow-hidden group ${
                                    isSelected 
                                    ? 'border-brand-lime shadow-lg scale-[1.02] bg-brand-lime/5' 
                                    : 'hover:border-brand-lime hover:shadow-md'
                                }`}
                                style={{ backgroundColor: isSelected ? '' : 'var(--bg-card)', borderColor: isSelected ? 'var(--brand-lime)' : 'var(--border-main)' }}
                            >
                                {isSelected && (
                                    <div className="absolute top-0 right-0 p-3 bg-brand-lime rounded-bl-2xl">
                                        <CheckCircle2 size={16} className="text-black" />
                                    </div>
                                )}
                                
                                <div className="w-full aspect-video rounded-xl mb-4 flex items-center justify-center overflow-hidden border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                    <Car size={32} style={{ color: 'var(--text-dim)', opacity: 0.3 }} />
                                </div>
                                
                                <div className="space-y-2">
                                    <h3 className="font-bold text-lg leading-tight" style={{ color: 'var(--text-main)' }}>
                                        {vehicle.basicDetails.make} {vehicle.basicDetails.model}
                                    </h3>
                                    
                                    <div className="grid grid-cols-2 gap-2 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                                        <p className="flex items-center gap-1"><Tag size={12} className="opacity-70" /> {vehicle.basicDetails.year}</p>
                                        <p className="flex items-center gap-1 truncate"><ShieldCheck size={12} className="opacity-70" /> {vehicle.legalDocs?.registrationNumber || 'No Reg'}</p>
                                    </div>
                                    <div className="pt-3 mt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] uppercase font-bold tracking-wider truncate opacity-70">VIN: {vehicle.basicDetails.vin}</p>
                                            {vehicle.basicDetails.monthlyRent ? (
                                                <p className="text-xs font-black text-brand-lime">${vehicle.basicDetails.monthlyRent.toLocaleString()}/mo</p>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="py-20 text-center flex flex-col items-center rounded-2xl border border-dashed" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                    <Car size={48} className="mb-4" style={{ color: 'var(--text-dim)', opacity: 0.5 }} />
                    <p className="font-bold uppercase tracking-widest text-sm" style={{ color: 'var(--text-dim)' }}>No Available Vehicles Found</p>
                    {searchQuery && <p className="text-xs mt-2 font-medium" style={{ color: 'var(--text-muted)' }}>Try adjusting your search query</p>}
                </div>
            )}

            {/* Action Bar */}
            {selectedVehicleId && (
                <div className="fixed bottom-0 left-0 right-0 border-t p-6 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] z-50 animate-in slide-in-from-bottom-5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="max-w-7xl mx-auto space-y-6">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-brand-lime/20 text-brand-lime flex items-center justify-center">
                                    <RouteIcon size={28} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-dim">Selected Vehicle</p>
                                    <p className="font-black text-xl">
                                        {vehicles.find(v => v._id === selectedVehicleId)?.basicDetails.make} {vehicles.find(v => v._id === selectedVehicleId)?.basicDetails.model}
                                    </p>
                                </div>
                            </div>

                            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dim">Lease Duration (Months)</label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 12"
                                        value={leaseDetails.leaseDuration}
                                        onChange={(e) => setLeaseDetails({ ...leaseDetails, leaseDuration: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-lime/50 transition-all font-bold"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dim">Monthly Rent (USD)</label>
                                    <input
                                        type="number"
                                        placeholder="e.g. 1500"
                                        value={leaseDetails.monthlyRent}
                                        onChange={(e) => setLeaseDetails({ ...leaseDetails, monthlyRent: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-lime/50 transition-all font-bold"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dim">Optional Notes</label>
                                    <input
                                        type="text"
                                        placeholder="Additional terms..."
                                        value={leaseDetails.notes}
                                        onChange={(e) => setLeaseDetails({ ...leaseDetails, notes: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-lime/50 transition-all"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>
                            
                            <div className="flex gap-3 w-full lg:w-auto">
                                <button 
                                    onClick={() => setSelectedVehicleId(null)}
                                    className="flex-1 lg:flex-none px-6 py-3 rounded-xl font-bold hover:bg-white/5 transition-all uppercase tracking-wider text-xs border"
                                    style={{ color: 'var(--text-dim)', borderColor: 'var(--border-main)' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleAssign}
                                    disabled={assigning || !leaseDetails.leaseDuration || !leaseDetails.monthlyRent}
                                    className="flex-1 lg:flex-none px-8 py-3 rounded-xl font-black bg-brand-lime text-black hover:scale-[1.02] active:scale-95 shadow-xl shadow-brand-lime/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed uppercase tracking-wider text-xs"
                                >
                                    {assigning ? (
                                        <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div> Processing...</>
                                    ) : (
                                        <><CheckCircle2 size={18} /> Confirm Assignment</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Bottom spacer so action bar doesn't overlap content */}
            {selectedVehicleId && <div className="h-24"></div>}
        </div>
    );
};

export default DriverVehicleAssignment;
