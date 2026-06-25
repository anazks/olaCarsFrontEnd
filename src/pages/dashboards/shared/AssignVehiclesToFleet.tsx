import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Car, Loader2, Plus, Minus, Check, AlertTriangle, Sparkles } from 'lucide-react';
import { getFleetById, type Fleet } from '../../../services/fleetService';
import { getAllVehicles, editVehicle, type Vehicle } from '../../../services/vehicleService';
import { getUserRole } from '../../../utils/auth';

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    'PENDING ENTRY': { bg: 'rgba(245,158,11,0.1)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
    'DOCUMENTS REVIEW': { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
    'INSURANCE VERIFICATION': { bg: 'rgba(139,92,246,0.1)', text: '#8b5cf6', border: 'rgba(139,92,246,0.3)' },
    'INSPECTION REQUIRED': { bg: 'rgba(236,72,153,0.1)', text: '#ec4899', border: 'rgba(236,72,153,0.3)' },
    'INSPECTION FAILED': { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
    'REPAIR IN PROGRESS': { bg: 'rgba(249,115,22,0.1)', text: '#f97316', border: 'rgba(249,115,22,0.3)' },
    'ACCOUNTING SETUP': { bg: 'rgba(20,184,166,0.1)', text: '#14b8a6', border: 'rgba(20,184,166,0.3)' },
    'GPS ACTIVATION': { bg: 'rgba(6,182,212,0.1)', text: '#06b6d4', border: 'rgba(6,182,212,0.3)' },
    'BRANCH MANAGER APPROVAL': { bg: 'rgba(168,85,247,0.1)', text: '#a855f7', border: 'rgba(168,85,247,0.3)' },
    'ACTIVE — AVAILABLE': { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' },
    'ACTIVE — RENTED': { bg: 'rgba(34,197,94,0.1)', text: '#16a34a', border: 'rgba(34,197,94,0.3)' },
    'ACTIVE — MAINTENANCE': { bg: 'rgba(249,115,22,0.1)', text: '#f97316', border: 'rgba(249,115,22,0.3)' },
    'SUSPENDED': { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
    'TRANSFER PENDING': { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
    'TRANSFER COMPLETE': { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' },
    'RETIRED': { bg: 'rgba(107,114,128,0.1)', text: '#6b7280', border: 'rgba(107,114,128,0.3)' },
    'PRE-BOOKED': { bg: 'rgba(14,165,233,0.1)', text: '#0ea5e9', border: 'rgba(14,165,233,0.3)' },
    'W. GROUP ACTIVE': { bg: 'rgba(132,204,22,0.1)', text: '#84cc16', border: 'rgba(132,204,22,0.3)' },
};

const StatusBadge = ({ status }: { status: string }) => {
    const style = STATUS_STYLES[status] || STATUS_STYLES['PENDING ENTRY'];
    return (
        <div className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all duration-300"
            style={{ background: style.bg, color: style.text, borderColor: style.border }}>
            {status}
        </div>
    );
};

export default function AssignVehiclesToFleet() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const userRole = getUserRole()?.toLowerCase() || '';

    // States
    const [fleet, setFleet] = useState<Fleet | null>(null);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loadingFleet, setLoadingFleet] = useState(true);
    const [loadingVehicles, setLoadingVehicles] = useState(false);
    const [updatingVehicleId, setUpdatingVehicleId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Navigation Tab
    const [activeTab, setActiveTab] = useState<'assigned' | 'search'>('assigned');

    // Search / Filter States for Tab 2
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [unassignedOnly, setUnassignedOnly] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalVehicles, setTotalVehicles] = useState(0);

    // Confirmation Modal for Reassigning from other fleet
    const [confirmModal, setConfirmModal] = useState<{
        vehicle: Vehicle;
        targetFleetId: string;
        targetFleetNumber: string;
        currentFleetNumber: string;
    } | null>(null);

    // Fetch Fleet Data
    const fetchFleetData = useCallback(async () => {
        if (!id) return;
        try {
            setLoadingFleet(true);
            const res = await getFleetById(id);
            if (res.success) {
                setFleet(res.data);
            } else {
                setError('Failed to fetch fleet details.');
            }
        } catch (err: any) {
            console.error('Error fetching fleet:', err);
            setError(err.message || 'Error occurred while loading fleet details.');
        } finally {
            setLoadingFleet(false);
        }
    }, [id]);

    // Fetch Vehicles (for assignment search tab)
    const fetchVehiclesList = useCallback(async () => {
        if (activeTab !== 'search') return;
        try {
            setLoadingVehicles(true);
            const res = await getAllVehicles({
                page,
                limit: 10,
                search: searchQuery,
                status: statusFilter as any,
                category: categoryFilter as any
            });

            if (res.success) {
                // If unassignedOnly is active, filter frontend side
                let filtered = res.data;
                if (unassignedOnly) {
                    filtered = res.data.filter(v => !v.handlingStaff && (!v.basicDetails?.fleetNumber || v.basicDetails.fleetNumber === ''));
                }
                setVehicles(filtered);
                setTotalPages(res.pagination.totalPages);
                setTotalVehicles(res.pagination.total);
            } else {
                setError('Failed to fetch vehicles list.');
            }
        } catch (err: any) {
            console.error('Error fetching vehicles:', err);
            setError(err.message || 'Error occurred while fetching vehicles.');
        } finally {
            setLoadingVehicles(false);
        }
    }, [activeTab, page, searchQuery, categoryFilter, statusFilter, unassignedOnly]);

    useEffect(() => {
        fetchFleetData();
    }, [fetchFleetData]);

    useEffect(() => {
        fetchVehiclesList();
    }, [fetchVehiclesList]);

    // Toast triggers helper
    const triggerToast = (type: 'success' | 'error', msg: string) => {
        if (type === 'success') {
            setSuccessMessage(msg);
            setTimeout(() => setSuccessMessage(null), 4000);
        } else {
            setError(msg);
            setTimeout(() => setError(null), 5000);
        }
    };

    // Assign vehicle function
    const handleAssignVehicle = async (vehicle: Vehicle) => {
        if (!fleet) return;

        // Check if vehicle is already assigned to a fleet
        // Note: Check both model-level `fleet` reference and basicDetails.fleetNumber
        const currentVehicleFleetNumber = vehicle.basicDetails?.fleetNumber;
        const currentVehicleFleetId = (vehicle as any).fleet?._id || (vehicle as any).fleet;

        if (currentVehicleFleetId && currentVehicleFleetId !== fleet._id) {
            // Trigger confirmation dialog
            setConfirmModal({
                vehicle,
                targetFleetId: fleet._id,
                targetFleetNumber: fleet.fleetNumber,
                currentFleetNumber: currentVehicleFleetNumber || 'another'
            });
            return;
        }

        await executeAssignment(vehicle._id, fleet._id, fleet.fleetNumber);
    };

    const executeAssignment = async (vehicleId: string, fleetId: string | null, fleetNumber: string) => {
        try {
            setUpdatingVehicleId(vehicleId);
            setConfirmModal(null);

            // Build payload
            const payload: any = {
                fleet: fleetId,
                basicDetails: {
                    fleetNumber: fleetNumber
                },
                handlingStaff: fleetId ? (fleet?.assignedStaff?._id || fleet?.assignedStaff) : null,
                handlingStaffModel: fleetId ? fleet?.assignedStaffModel : null
            };

            await editVehicle(vehicleId, payload);
            triggerToast('success', fleetId ? `Vehicle successfully assigned to fleet #${fleetNumber}!` : 'Vehicle successfully removed from fleet.');
            
            // Refresh states
            await fetchFleetData();
            if (activeTab === 'search') {
                await fetchVehiclesList();
            }
        } catch (err: any) {
            console.error('Assignment error:', err);
            triggerToast('error', err.message || 'Failed to update vehicle assignment.');
        } finally {
            setUpdatingVehicleId(null);
        }
    };

    // Unassign vehicle function
    const handleUnassignVehicle = async (vehicleId: string) => {
        await executeAssignment(vehicleId, null, '');
    };

    if (loadingFleet && !fleet) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-[var(--brand-lime)]" />
                <p className="text-gray-400 text-sm">Loading Fleet details...</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header / Navigation */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(`/admin/${userRole}/fleet`)}
                        className="p-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[var(--border-main)] text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                            <span>Assign Vehicles</span>
                            <Sparkles className="w-5 h-5 text-[var(--brand-lime)]" />
                        </h1>
                        <p className="text-xs text-gray-400">Manage vehicles in fleet registry</p>
                    </div>
                </div>
            </div>

            {/* Alert Messages */}
            {successMessage && (
                <div className="p-4 rounded-xl border border-green-500/30 bg-green-500/10 text-green-400 text-sm flex items-center gap-2 animate-fadeIn">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{successMessage}</span>
                </div>
            )}
            {error && (
                <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm flex items-center gap-2 animate-fadeIn">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Fleet Summary Card */}
            {fleet && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-2xl border border-[var(--border-main)] bg-[rgba(30,30,30,0.4)] backdrop-blur-md">
                    <div>
                        <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Fleet Number</div>
                        <div className="text-3xl font-black text-white mt-1 flex items-center gap-2">
                            <span className="text-[var(--brand-lime)] font-mono">#{fleet.fleetNumber}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest font-black ${fleet.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                {fleet.status}
                            </span>
                        </div>
                        {fleet.description && (
                            <p className="text-gray-400 text-xs mt-2 italic">"{fleet.description}"</p>
                        )}
                    </div>
                    <div>
                        <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Assigned Staff</div>
                        <div className="mt-1 flex items-start gap-2">
                            <div className="p-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[var(--border-main)] mt-0.5">
                                <Car className="w-4 h-4 text-gray-400" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white">
                                    {fleet.assignedStaff?.fullName || 'No staff assigned'}
                                </div>
                                <div className="text-xs text-gray-400">
                                    {fleet.assignedStaff?.email || 'N/A'} • {fleet.assignedStaffModel}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col justify-between">
                        <div>
                            <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total Cars Assigned</div>
                            <div className="text-3xl font-black text-white mt-1">
                                {fleet.vehicles?.length || 0} <span className="text-xs text-gray-400 font-normal">vehicles</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Tabs Container */}
            <div className="space-y-4">
                {/* Tabs */}
                <div className="flex border-b border-[var(--border-main)]">
                    <button
                        onClick={() => setActiveTab('assigned')}
                        className={`px-6 py-3 font-bold text-sm border-b-2 transition duration-200 flex items-center gap-2 ${activeTab === 'assigned' ? 'border-[var(--brand-lime)] text-[var(--brand-lime)]' : 'border-transparent text-gray-400 hover:text-white'}`}
                    >
                        <span>Assigned Vehicles</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.05)] text-gray-300">
                            {fleet?.vehicles?.length || 0}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('search')}
                        className={`px-6 py-3 font-bold text-sm border-b-2 transition duration-200 flex items-center gap-2 ${activeTab === 'search' ? 'border-[var(--brand-lime)] text-[var(--brand-lime)]' : 'border-transparent text-gray-400 hover:text-white'}`}
                    >
                        <span>Assign More Vehicles</span>
                    </button>
                </div>

                {/* Tab Content 1: Assigned Vehicles */}
                {activeTab === 'assigned' && (
                    <div className="rounded-2xl border border-[var(--border-main)] bg-[rgba(20,20,20,0.2)] overflow-hidden">
                        {(!fleet?.vehicles || fleet.vehicles.length === 0) ? (
                            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                                <Car className="w-12 h-12 text-gray-600 stroke-[1.5]" />
                                <h3 className="font-bold text-white text-base">No vehicles assigned to this fleet</h3>
                                <p className="text-gray-400 text-xs max-w-sm">Use the "Assign More Vehicles" tab to add vehicles to this fleet registry.</p>
                                <button
                                    onClick={() => setActiveTab('search')}
                                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--brand-lime)] text-black hover:opacity-90 active:scale-95 transition"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Browse Vehicle Registry</span>
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[var(--border-main)] bg-[rgba(255,255,255,0.02)]">
                                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-400">Vehicle</th>
                                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-400">VIN & Registration</th>
                                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-400">Status</th>
                                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-400">Driver</th>
                                            <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-main)]">
                                        {fleet.vehicles.map((v) => (
                                            <tr key={v._id} className="hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[var(--border-main)] text-gray-400">
                                                            <Car className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-white">
                                                                {v.basicDetails?.make || 'Unknown'} {v.basicDetails?.model || ''}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {v.basicDetails?.year || 'N/A'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="text-xs font-mono text-white tracking-wide">
                                                        VIN: {v.basicDetails?.vin || 'N/A'}
                                                    </div>
                                                    <div className="text-xs text-gray-400 mt-0.5">
                                                        Reg: {(v as any).legalDocs?.registrationNumber || 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <StatusBadge status={v.status} />
                                                </td>
                                                <td className="p-4 text-xs text-gray-300">
                                                    {(v as any).currentDriver?.personalInfo?.fullName ? (
                                                        <span className="font-bold text-white">{(v as any).currentDriver.personalInfo.fullName}</span>
                                                    ) : (
                                                        <span className="text-gray-500">Unassigned</span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <button
                                                        onClick={() => handleUnassignVehicle(v._id)}
                                                        disabled={updatingVehicleId === v._id}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-95 transition disabled:opacity-50"
                                                    >
                                                        {updatingVehicleId === v._id ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <Minus className="w-3.5 h-3.5" />
                                                        )}
                                                        <span>Remove</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Tab Content 2: Assign More Vehicles (Search/Filter Registry) */}
                {activeTab === 'search' && (
                    <div className="space-y-4">
                        {/* Search & Filters Controls */}
                        <div className="p-4 rounded-2xl border border-[var(--border-main)] bg-[rgba(30,30,30,0.2)] grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            {/* Search box */}
                            <div className="space-y-1.5">
                                <label className="text-xs text-gray-400 font-bold uppercase">Search Vehicle</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setPage(1);
                                        }}
                                        placeholder="Make, model, VIN, reg..."
                                        className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-[var(--border-main)] bg-[rgba(255,255,255,0.02)] text-white focus:outline-none focus:border-[var(--brand-lime)] transition"
                                    />
                                </div>
                            </div>

                            {/* Category Filter */}
                            <div className="space-y-1.5">
                                <label className="text-xs text-gray-400 font-bold uppercase">Category</label>
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => {
                                        setCategoryFilter(e.target.value);
                                        setPage(1);
                                    }}
                                    className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-main)] bg-[rgba(30,30,30,0.9)] text-white focus:outline-none focus:border-[var(--brand-lime)] transition"
                                >
                                    <option value="">All Categories</option>
                                    <option value="Sedan">Sedan</option>
                                    <option value="SUV">SUV</option>
                                    <option value="Pickup">Pickup</option>
                                    <option value="Van">Van</option>
                                    <option value="Luxury">Luxury</option>
                                    <option value="Commercial">Commercial</option>
                                    <option value="MUV">MUV</option>
                                </select>
                            </div>

                            {/* Status Filter */}
                            <div className="space-y-1.5">
                                <label className="text-xs text-gray-400 font-bold uppercase">Status</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => {
                                        setStatusFilter(e.target.value);
                                        setPage(1);
                                    }}
                                    className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border-main)] bg-[rgba(30,30,30,0.9)] text-white focus:outline-none focus:border-[var(--brand-lime)] transition"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="ACTIVE — AVAILABLE">Active — Available</option>
                                    <option value="ACTIVE — RENTED">Active — Rented</option>
                                    <option value="ACTIVE — MAINTENANCE">Active — Maintenance</option>
                                    <option value="PENDING ENTRY">Pending Entry</option>
                                    <option value="DOCUMENTS REVIEW">Documents Review</option>
                                    <option value="INSPECTION REQUIRED">Inspection Required</option>
                                    <option value="GPS ACTIVATION">GPS Activation</option>
                                    <option value="SUSPENDED">Suspended</option>
                                </select>
                            </div>

                            {/* Unassigned Only Toggle */}
                            <div className="flex items-center h-10 pl-1">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={unassignedOnly}
                                        onChange={(e) => {
                                            setUnassignedOnly(e.target.checked);
                                            setPage(1);
                                        }}
                                        className="rounded border-[var(--border-main)] bg-[rgba(255,255,255,0.02)] text-[var(--brand-lime)] focus:ring-[var(--brand-lime)] focus:ring-offset-0 focus:ring-1 w-4 h-4"
                                    />
                                    <span className="text-xs text-gray-300 font-bold uppercase">Unassigned Only</span>
                                </label>
                            </div>
                        </div>

                        {/* Vehicles List Table */}
                        <div className="rounded-2xl border border-[var(--border-main)] bg-[rgba(20,20,20,0.2)] overflow-hidden">
                            {loadingVehicles ? (
                                <div className="p-12 text-center flex flex-col items-center justify-center gap-3 min-h-[300px]">
                                    <Loader2 className="w-8 h-8 animate-spin text-[var(--brand-lime)]" />
                                    <p className="text-gray-400 text-sm">Searching vehicle registry...</p>
                                </div>
                            ) : vehicles.length === 0 ? (
                                <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                                    <Car className="w-12 h-12 text-gray-600 stroke-[1.5]" />
                                    <h3 className="font-bold text-white text-base">No vehicles found</h3>
                                    <p className="text-gray-400 text-xs max-w-sm">Try adjusting your filters or search terms.</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-[var(--border-main)] bg-[rgba(255,255,255,0.02)]">
                                                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-400">Vehicle</th>
                                                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-400">VIN & Registration</th>
                                                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-400">Status</th>
                                                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-400">Current Assignment</th>
                                                <th className="p-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border-main)]">
                                            {vehicles.map((v) => {
                                                const isThisFleet = v.basicDetails?.fleetNumber === fleet?.fleetNumber || (v as any).fleet?._id === fleet?._id;
                                                const hasOtherFleet = v.basicDetails?.fleetNumber && v.basicDetails.fleetNumber !== '' && !isThisFleet;
                                                
                                                return (
                                                    <tr key={v._id} className="hover:bg-[rgba(255,255,255,0.01)] transition-colors">
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[var(--border-main)] text-gray-400">
                                                                    <Car className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-bold text-white">
                                                                        {v.basicDetails?.make || 'Unknown'} {v.basicDetails?.model || ''}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {v.basicDetails?.year || 'N/A'} • {v.basicDetails?.category || 'N/A'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="text-xs font-mono text-white tracking-wide">
                                                                VIN: {v.basicDetails?.vin || 'N/A'}
                                                            </div>
                                                            <div className="text-xs text-gray-400 mt-0.5">
                                                                Reg: {v.legalDocs?.registrationNumber || 'N/A'}
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <StatusBadge status={v.status} />
                                                        </td>
                                                        <td className="p-4">
                                                            {isThisFleet ? (
                                                                <span className="text-xs text-[var(--brand-lime)] font-bold flex items-center gap-1">
                                                                    <Check className="w-3.5 h-3.5" />
                                                                    <span>This Fleet (#{fleet?.fleetNumber})</span>
                                                                </span>
                                                            ) : hasOtherFleet ? (
                                                                <span className="text-xs text-amber-400 font-medium">
                                                                    Fleet #{v.basicDetails?.fleetNumber}
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs text-gray-500">Unassigned</span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            {isThisFleet ? (
                                                                <button
                                                                    onClick={() => handleUnassignVehicle(v._id)}
                                                                    disabled={updatingVehicleId === v._id}
                                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition disabled:opacity-50"
                                                                >
                                                                    <Minus className="w-3.5 h-3.5" />
                                                                    <span>Remove</span>
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleAssignVehicle(v)}
                                                                    disabled={updatingVehicleId === v._id}
                                                                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition disabled:opacity-50 ${hasOtherFleet ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30' : 'bg-[var(--brand-lime)] text-black hover:opacity-90 active:scale-95'}`}
                                                                >
                                                                    {updatingVehicleId === v._id ? (
                                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                    ) : (
                                                                        <Plus className="w-3.5 h-3.5" />
                                                                    )}
                                                                    <span>{hasOtherFleet ? 'Move Here' : 'Assign'}</span>
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border-main)] bg-[rgba(30,30,30,0.2)]">
                                <div className="text-xs text-gray-400">
                                    Showing <span className="font-bold text-white">{vehicles.length}</span> of <span className="font-bold text-white">{totalVehicles}</span> vehicles
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[var(--border-main)] text-gray-300 hover:text-white disabled:opacity-40 disabled:hover:text-gray-300 transition"
                                    >
                                        Previous
                                    </button>
                                    <div className="text-xs text-white self-center font-mono">
                                        {page} / {totalPages}
                                    </div>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[var(--border-main)] text-gray-300 hover:text-white disabled:opacity-40 disabled:hover:text-gray-300 transition"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Reassignment Confirmation Modal */}
            {confirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="w-full max-w-md p-6 rounded-2xl border border-[var(--border-main)] bg-[rgba(30,30,30,0.95)] shadow-2xl space-y-4">
                        <div className="flex items-center gap-3 text-amber-400">
                            <AlertTriangle className="w-6 h-6 shrink-0" />
                            <h3 className="text-lg font-black text-white">Reassign Vehicle?</h3>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed">
                            The vehicle <strong className="text-white">{confirmModal.vehicle.basicDetails?.make} {confirmModal.vehicle.basicDetails?.model}</strong> (VIN: {confirmModal.vehicle.basicDetails?.vin}) is currently assigned to <span className="text-amber-400 font-bold">Fleet #{confirmModal.currentFleetNumber}</span>.
                        </p>
                        <p className="text-xs text-gray-400">
                            Assigning it here will remove it from Fleet #{confirmModal.currentFleetNumber} and add it to Fleet #{confirmModal.targetFleetNumber}.
                        </p>
                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="px-4 py-2 text-xs font-bold rounded-xl border border-[var(--border-main)] text-gray-300 hover:text-white transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => executeAssignment(confirmModal.vehicle._id, confirmModal.targetFleetId, confirmModal.targetFleetNumber)}
                                className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-500 text-black hover:opacity-90 transition active:scale-95"
                            >
                                Confirm Reassign
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
