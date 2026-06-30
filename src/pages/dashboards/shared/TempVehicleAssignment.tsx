import { useState, useEffect, useCallback } from 'react';
import { 
    Car, 
    User, 
    RefreshCw, 
    AlertTriangle, 
    CheckCircle, 
    Search, 
    X, 
    Link2, 
    Unlink, 
    ArrowRight,
    Sparkles,
    Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getAllVehicles, editVehicle, type Vehicle } from '../../../services/vehicleService';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const TempVehicleAssignment = () => {
    // State
    const [maintenanceVehicles, setMaintenanceVehicles] = useState<Vehicle[]>([]);
    const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
    const [tempAssignments, setTempAssignments] = useState<Vehicle[]>([]);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingAvailable, setLoadingAvailable] = useState(false);
    const [availableSearch, setAvailableSearch] = useState('');
    const [maintenanceSearch, setMaintenanceSearch] = useState('');
    const [filterTab, setFilterTab] = useState<'ALL' | 'UNASSIGNED' | 'ASSIGNED'>('ALL');
    const [error, setError] = useState<string | null>(null);
    const [assigning, setAssigning] = useState(false);

    // Fetch temp assignments (vehicles that act as temporary replacements)
    const fetchTempAssignments = useCallback(async () => {
        try {
            const response = await getAllVehicles({
                tempDriver: 'exists' as any,
                limit: 100
            });
            if (response.success) {
                setTempAssignments(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch temp assignments:', err);
        }
    }, []);

    // Fetch maintenance vehicles
    const fetchMaintenanceVehicles = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch vehicles in maintenance status
            const response = await getAllVehicles({ 
                status: 'ACTIVE — MAINTENANCE',
                limit: 100
            });
            if (response.success) {
                setMaintenanceVehicles(response.data);
                // Sync selected vehicle if it was already selected
                if (selectedVehicle) {
                    const updated = response.data.find(v => v._id === selectedVehicle._id);
                    setSelectedVehicle(updated || null);
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch maintenance vehicles');
        } finally {
            setLoading(false);
        }
    }, [selectedVehicle]);

    // Fetch available vehicles for temp assignment
    const fetchAvailableVehicles = useCallback(async (searchQuery = '') => {
        setLoadingAvailable(true);
        try {
            const response = await getAllVehicles({
                status: 'ACTIVE — AVAILABLE',
                search: searchQuery,
                limit: 25
            });
            if (response.success) {
                setAvailableVehicles(response.data);
            }
        } catch (err) {
            console.error('Failed to fetch available vehicles:', err);
        } finally {
            setLoadingAvailable(false);
        }
    }, []);

    // Helper: Find temporary vehicle assigned to a driver
    const getTempVehicleForDriver = useCallback((driverId: string | undefined) => {
        if (!driverId) return null;
        return tempAssignments.find(v => {
            const tempDrvId = typeof v.tempDriver === 'object' ? v.tempDriver?._id : v.tempDriver;
            return tempDrvId === driverId;
        });
    }, [tempAssignments]);

    // Initial load
    useEffect(() => {
        fetchMaintenanceVehicles();
        fetchAvailableVehicles();
        fetchTempAssignments();
    }, []);

    // Debounce available vehicles search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchAvailableVehicles(availableSearch);
        }, 300);
        return () => clearTimeout(timer);
    }, [availableSearch, fetchAvailableVehicles]);

    // Handle Assign temp driver to available vehicle
    const handleAssignTempVehicle = async (availableVehicleId: string) => {
        if (!selectedVehicle || !selectedVehicle.currentDriver) return;
        setAssigning(true);
        try {
            const driverId = selectedVehicle.currentDriver._id;
            await editVehicle(availableVehicleId, {
                tempDriver: driverId
            });
            toast.success('Temporary driver assigned successfully');
            
            // Reload all
            await fetchMaintenanceVehicles();
            await fetchAvailableVehicles(availableSearch);
            await fetchTempAssignments();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Failed to assign temporary driver');
        } finally {
            setAssigning(false);
        }
    };

    // Handle Unassign temp driver from available vehicle
    const handleUnassignTempVehicle = async (tempVehicleId: string) => {
        setAssigning(true);
        try {
            await editVehicle(tempVehicleId, {
                tempDriver: null as any
            });
            toast.success('Temporary driver unassigned successfully');
            
            // Reload all
            await fetchMaintenanceVehicles();
            await fetchAvailableVehicles(availableSearch);
            await fetchTempAssignments();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Failed to unassign temporary driver');
        } finally {
            setAssigning(false);
        }
    };

    // Filtered list of maintenance vehicles
    const filteredMaintenanceVehicles = maintenanceVehicles.filter(v => {
        const matchesSearch = 
            v.basicDetails?.make?.toLowerCase().includes(maintenanceSearch.toLowerCase()) ||
            v.basicDetails?.model?.toLowerCase().includes(maintenanceSearch.toLowerCase()) ||
            (v.legalDocs?.registrationNumber || '').toLowerCase().includes(maintenanceSearch.toLowerCase()) ||
            (v.currentDriver?.personalInfo?.fullName || '').toLowerCase().includes(maintenanceSearch.toLowerCase());

        if (!matchesSearch) return false;

        const tempVehicle = getTempVehicleForDriver(v.currentDriver?._id);
        const hasTempVehicle = !!tempVehicle;

        if (filterTab === 'UNASSIGNED') return !hasTempVehicle;
        if (filterTab === 'ASSIGNED') return hasTempVehicle;
        return true;
    });

    // Counts for stats cards
    const totalInMaintenance = maintenanceVehicles.length;
    const assignedTempCount = tempAssignments.length;
    const awaitingAssignmentCount = maintenanceVehicles.filter(
        v => !!v.currentDriver && !getTempVehicleForDriver(v.currentDriver?._id)
    ).length;

    return (
        <div className="container-responsive space-y-8 p-6 lg:p-8 animate-in fade-in duration-500">
            <Breadcrumbs items={[
                { label: 'Dashboard', path: '#' }, 
                { label: 'Vehicles', path: '../vehicles' }, 
                { label: 'Temporary Assignment', active: true }
            ]} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-white/5 pb-6">
                <div>
                    <h1 className="text-2xl font-black tracking-tight flex items-center gap-2.5" style={{ color: 'var(--text-main)' }}>
                        <div className="w-10 h-10 rounded-2xl bg-brand-lime/10 flex items-center justify-center border border-brand-lime/20 shadow-[0_0_20px_rgba(200,230,0,0.1)]">
                            <Sparkles size={20} className="text-brand-lime animate-pulse" style={{ color: 'var(--brand-lime)' }} />
                        </div>
                        Temporary Assignment Hub
                    </h1>
                    <p className="text-xs font-medium text-dim mt-2 max-w-xl">
                        Seamlessly allocate active available backup vehicles to drivers whose primary vehicles are currently grounded in active maintenance.
                    </p>
                </div>
                <button
                    onClick={() => {
                        fetchMaintenanceVehicles();
                        fetchAvailableVehicles(availableSearch);
                        fetchTempAssignments();
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-300 hover:bg-white/10 active:scale-95 border font-black text-xs uppercase tracking-widest"
                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                >
                    <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                    Refresh Hub
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stat 1 */}
                <div className="relative overflow-hidden p-6 rounded-3xl border shadow-xl flex items-center justify-between gap-4 transition-all hover:scale-[1.02] duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-dim">In Maintenance</span>
                        <h3 className="text-3xl font-black tracking-tight text-main">{totalInMaintenance}</h3>
                        <p className="text-[10px] text-dim opacity-70">Grounded active fleet</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.05)]">
                        <Car size={20} />
                    </div>
                </div>

                {/* Stat 2 */}
                <div className="relative overflow-hidden p-6 rounded-3xl border shadow-xl flex items-center justify-between gap-4 transition-all hover:scale-[1.02] duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-dim">Awaiting Backup</span>
                        <h3 className="text-3xl font-black tracking-tight text-amber-500">{awaitingAssignmentCount}</h3>
                        <p className="text-[10px] text-dim opacity-70">Drivers requiring temp vehicles</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.05)]">
                        <User size={20} />
                    </div>
                </div>

                {/* Stat 3 */}
                <div className="relative overflow-hidden p-6 rounded-3xl border shadow-xl flex items-center justify-between gap-4 transition-all hover:scale-[1.02] duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-dim">Active Backups</span>
                        <h3 className="text-3xl font-black tracking-tight text-brand-lime" style={{ color: 'var(--brand-lime)' }}>{assignedTempCount}</h3>
                        <p className="text-[10px] text-dim opacity-70">Assigned temporary cars</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-brand-lime/10 text-brand-lime border border-brand-lime/20 flex items-center justify-center shadow-[0_0_15px_rgba(200,230,0,0.05)]">
                        <Link2 size={20} />
                    </div>
                </div>
            </div>

            {/* Error message */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-2xl text-sm font-semibold shadow-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Unified Search & Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5 p-4 rounded-3xl border border-white/5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="relative w-full md:w-96 group">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim group-focus-within:text-brand-lime transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by make, model, plate, or driver name..."
                        value={maintenanceSearch}
                        onChange={(e) => setMaintenanceSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl outline-none text-xs font-semibold transition-all duration-300 placeholder:opacity-50"
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
                    {(['ALL', 'UNASSIGNED', 'ASSIGNED'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setFilterTab(tab)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 border ${filterTab === tab ? 'bg-brand-lime text-black border-brand-lime' : 'hover:bg-white/5 border-white/5 text-dim'}`}
                            style={{ background: filterTab === tab ? 'var(--brand-lime)' : undefined }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Side: Maintenance Vehicles List */}
                <div className="lg:col-span-7 space-y-4">
                    <h2 className="text-xs font-black uppercase tracking-widest pl-1" style={{ color: 'var(--text-dim)' }}>
                        Maintenance Fleet ({filteredMaintenanceVehicles.length})
                    </h2>
                    
                    <div className="rounded-3xl border shadow-xl overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        {loading && filteredMaintenanceVehicles.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24">
                                <div className="w-10 h-10 border-4 border-brand-lime/20 border-t-brand-lime rounded-full animate-spin mb-4" />
                                <p className="text-xs font-bold text-dim">Loading maintenance fleet...</p>
                            </div>
                        ) : filteredMaintenanceVehicles.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-center px-4">
                                <Car size={36} className="opacity-20 mb-3 text-dim" />
                                <h3 className="text-sm font-bold text-main">No Vehicles Match Criteria</h3>
                                <p className="text-xs text-dim mt-1 max-w-sm">
                                    Try modifying your search or changing the filter settings.
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scrollbar">
                                {filteredMaintenanceVehicles.map((vehicle) => {
                                    const hasDriver = !!vehicle.currentDriver;
                                    const tempVehicle = getTempVehicleForDriver(vehicle.currentDriver?._id);
                                    const hasTempVehicle = !!tempVehicle;
                                    const isSelected = selectedVehicle?._id === vehicle._id;
                                    
                                    return (
                                        <div
                                            key={vehicle._id}
                                            onClick={() => setSelectedVehicle(vehicle)}
                                            className={`p-4 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${isSelected ? 'bg-white/5 border-l-4 border-brand-lime' : 'hover:bg-white/5'}`}
                                            style={{ borderLeftColor: isSelected ? 'var(--brand-lime)' : undefined }}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 bg-white/5 relative" style={{ borderColor: 'var(--border-main)' }}>
                                                    <Car size={20} className="text-orange-500" style={{ color: '#f97316' }} />
                                                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-orange-500 border-2 border-black animate-ping" />
                                                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-orange-500 border-2 border-black" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-main flex items-center gap-2">
                                                        {vehicle.basicDetails.make} {vehicle.basicDetails.model}
                                                        <span className="text-[10px] font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10 text-dim">
                                                            {vehicle.legalDocs?.registrationNumber || 'N/A'}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] font-mono text-dim mt-1">
                                                        VIN: {vehicle.basicDetails.vin || 'N/A'}
                                                    </div>
                                                    
                                                    {/* Driver assignment details */}
                                                    <div className="flex items-center gap-2 mt-3 p-2 rounded-xl bg-white/5 border border-white/5">
                                                        <User size={12} className="text-dim opacity-70" />
                                                        {hasDriver ? (
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-black text-brand-lime" style={{ color: 'var(--brand-lime)' }}>
                                                                    {vehicle.currentDriver?.personalInfo?.fullName}
                                                                </span>
                                                                <span className="text-[8px] text-dim font-mono">
                                                                    ID: {vehicle.currentDriver?.driverId || 'N/A'}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-red-500 opacity-80">
                                                                No Driver Assigned (cannot assign temp vehicle)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Temp Vehicle Badge / Unassign Status */}
                                            <div className="flex items-center gap-3 self-end md:self-center">
                                                {hasTempVehicle ? (
                                                    <div className="flex flex-col items-end">
                                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-lime-500/10 text-lime-500 border border-lime-500/20">
                                                            <Check size={10} /> Backup Active
                                                        </div>
                                                        <span className="text-[9px] font-mono text-dim mt-1 font-bold">
                                                            {tempVehicle.basicDetails?.make} ({tempVehicle.legalDocs?.registrationNumber || '—'})
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-white/5 border border-white/5 text-dim">
                                                        Needs Backup
                                                    </span>
                                                )}
                                                <ArrowRight size={14} className="text-dim opacity-40 hidden md:block" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: Drill-down Assignment Panel */}
                <div className="lg:col-span-5 space-y-4">
                    <h2 className="text-xs font-black uppercase tracking-widest pl-1" style={{ color: 'var(--text-dim)' }}>
                        Assignment Settings
                    </h2>

                    <div className="rounded-3xl border shadow-xl p-5 space-y-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        {!selectedVehicle ? (
                            <div className="flex flex-col items-center justify-center py-28 text-center text-dim">
                                <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center border border-white/10 mb-4 animate-bounce">
                                    <Link2 size={24} className="opacity-40" />
                                </div>
                                <p className="text-sm font-bold text-main">No Vehicle Selected</p>
                                <p className="text-xs max-w-xs mt-1.5 text-dim">
                                    Please select a maintenance vehicle from the left pane to manage its backup assignment.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Selected Vehicle Details */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-500 border border-orange-500/20">
                                                IN WORKSHOP
                                            </span>
                                            <h3 className="text-base font-black mt-3 text-main">
                                                {selectedVehicle.basicDetails.make} {selectedVehicle.basicDetails.model}
                                            </h3>
                                            <p className="text-xs font-mono text-dim mt-1">
                                                Plate No: {selectedVehicle.legalDocs?.registrationNumber || 'N/A'}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => setSelectedVehicle(null)}
                                            className="p-1.5 rounded-lg hover:bg-white/5 text-dim hover:text-main transition-colors border border-transparent hover:border-white/5"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>

                                    {/* Driver Card */}
                                    <div className="p-4 rounded-2xl border bg-white/5 space-y-3" style={{ borderColor: 'var(--border-main)' }}>
                                        <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                                            <User size={14} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                                            <span className="text-xs font-black text-main uppercase tracking-wider">Assigned Driver</span>
                                        </div>
                                        {selectedVehicle.currentDriver ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-brand-lime/10 text-brand-lime border border-brand-lime/20 flex items-center justify-center text-xs font-black">
                                                        {selectedVehicle.currentDriver.personalInfo?.fullName?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-bold text-main">{selectedVehicle.currentDriver.personalInfo?.fullName}</div>
                                                        <div className="text-[10px] font-mono text-dim mt-0.5">ID: {selectedVehicle.currentDriver.driverId || 'N/A'}</div>
                                                    </div>
                                                </div>
                                                <div className="text-[11px] text-dim pl-1 pt-1 border-t border-white/5">
                                                    Phone: {selectedVehicle.currentDriver.personalInfo?.phone || 'N/A'}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-red-500 font-bold">
                                                A backup vehicle can only be assigned to a driver. Please assign a driver to this vehicle first.
                                            </p>
                                        )}
                                    </div>

                                    {/* Current Temp Vehicle assignment details */}
                                    {(() => {
                                        const tempVehicle = getTempVehicleForDriver(selectedVehicle.currentDriver?._id);
                                        if (!tempVehicle) return null;
                                        return (
                                            <div className="p-4 rounded-2xl border border-lime-500/30 bg-lime-500/5 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle size={14} className="text-lime-500 animate-pulse" />
                                                        <span className="text-xs font-black text-main">Current Backup Vehicle</span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleUnassignTempVehicle(tempVehicle._id)}
                                                        disabled={assigning}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20 transition-all hover:bg-red-500 hover:text-black active:scale-95 disabled:opacity-50"
                                                    >
                                                        <Unlink size={10} /> Unassign
                                                    </button>
                                                </div>
                                                <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                                                    <div className="text-xs font-bold text-main">{tempVehicle.basicDetails?.make} {tempVehicle.basicDetails?.model}</div>
                                                    <div className="text-[10px] font-mono text-dim">Registration: {tempVehicle.legalDocs?.registrationNumber || 'N/A'}</div>
                                                    <div className="text-[10px] font-mono text-dim">Year: {tempVehicle.basicDetails?.year || '—'}</div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Available replacement selector */}
                                {selectedVehicle.currentDriver && !getTempVehicleForDriver(selectedVehicle.currentDriver?._id) && (
                                    <div className="space-y-4 pt-5 border-t border-white/5 animate-in fade-in duration-300">
                                        <div className="flex flex-col gap-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-dim">
                                                Select Backup Replacement Vehicle
                                            </label>
                                            <p className="text-[10px] text-dim opacity-70">
                                                Search and allocate an active backup car for the driver.
                                            </p>
                                        </div>

                                        {/* Search bar */}
                                        <div className="relative group">
                                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim group-focus-within:text-brand-lime transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="Filter backup vehicles by make, model, plate..."
                                                value={availableSearch}
                                                onChange={(e) => setAvailableSearch(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2.5 rounded-xl outline-none text-xs font-semibold transition-all duration-300 placeholder:opacity-50"
                                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                            />
                                        </div>

                                        {/* Available list */}
                                        <div className="rounded-2xl border max-h-[220px] overflow-y-auto custom-scrollbar divide-y divide-white/5 bg-white/5" style={{ borderColor: 'var(--border-main)' }}>
                                            {loadingAvailable && availableVehicles.length === 0 ? (
                                                <div className="flex items-center justify-center py-8">
                                                    <div className="w-6 h-6 border-2 border-brand-lime/20 border-t-brand-lime rounded-full animate-spin" />
                                                </div>
                                            ) : availableVehicles.length === 0 ? (
                                                <p className="text-xs text-center py-8 text-dim">No active available vehicles found.</p>
                                            ) : (
                                                availableVehicles.map((car) => {
                                                    const isCurrentlyAssignedAsTemp = !!car.tempDriver;
                                                    
                                                    return (
                                                        <div 
                                                            key={car._id}
                                                            className={`p-3 transition-colors flex items-center justify-between gap-3 ${isCurrentlyAssignedAsTemp ? 'opacity-40 select-none' : 'hover:bg-white/5'}`}
                                                        >
                                                            <div className="min-w-0">
                                                                <div className="text-xs font-black text-main truncate">
                                                                    {car.basicDetails.make} {car.basicDetails.model} ({car.basicDetails.year})
                                                                </div>
                                                                <div className="text-[10px] font-mono text-dim mt-0.5">
                                                                    Plate: {car.legalDocs?.registrationNumber || 'N/A'}
                                                                </div>
                                                            </div>

                                                            {isCurrentlyAssignedAsTemp ? (
                                                                <span className="text-[8px] font-black uppercase text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                                                                    In Use
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleAssignTempVehicle(car._id)}
                                                                    disabled={assigning}
                                                                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider text-black hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                                                    style={{ background: 'var(--brand-lime)' }}
                                                                >
                                                                    Assign
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default TempVehicleAssignment;
