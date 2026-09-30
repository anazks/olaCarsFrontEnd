import { useState, useEffect, useRef } from 'react';
import { 
    X, User, Mail, Phone, MapPin, Building2, Globe, Check, RefreshCw, UserPlus, Car, Search, ChevronDown, Clock, CheckCircle2 
} from 'lucide-react';
import { createCustomer, type Customer, type CreateCustomerPayload } from '../../services/customerService';
import { type Branch } from '../../services/branchService';
import { getAvailableVehicles, type Vehicle } from '../../services/vehicleService';
import toast from 'react-hot-toast';


interface OlaVehicleSelectProps {
    vehicles: Vehicle[];
    selectedId: string;
    onSelect: (id: string, vehicle?: Vehicle) => void;
    selectedBranchId?: string;
    loading?: boolean;
}

const OlaVehicleSelect = ({ vehicles, selectedId, onSelect, selectedBranchId, loading }: OlaVehicleSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedVehicle = vehicles.find(v => v._id === selectedId);

    const filteredVehicles = vehicles.filter(v => {
        if (!search.trim()) return true;
        const term = search.toLowerCase();
        const plate = (v.legalDocs?.registrationNumber || v.plateNumber || v.basicDetails?.plateNumber || '').toLowerCase();
        const make = (v.basicDetails?.make || '').toLowerCase();
        const model = (v.basicDetails?.model || '').toLowerCase();
        const fleetNo = (v.basicDetails?.fleetNumber || '').toLowerCase();
        const vin = (v.basicDetails?.vin || '').toLowerCase();
        return plate.includes(term) || make.includes(term) || model.includes(term) || fleetNo.includes(term) || vin.includes(term);
    });

    const sortedVehicles = [...filteredVehicles].sort((a, b) => {
        if (!selectedBranchId) return 0;
        const aBranch = (a.purchaseDetails?.branch as any)?._id || a.purchaseDetails?.branch;
        const bBranch = (b.purchaseDetails?.branch as any)?._id || b.purchaseDetails?.branch;
        const aMatch = String(aBranch) === String(selectedBranchId);
        const bMatch = String(bBranch) === String(selectedBranchId);
        if (aMatch && !bMatch) return -1;
        if (!aMatch && bMatch) return 1;
        return 0;
    });

    return (
        <div className="relative" ref={dropdownRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                    isOpen 
                        ? 'border-brand-lime ring-2 ring-brand-lime/20 bg-black/40' 
                        : selectedVehicle 
                            ? 'border-brand-lime/50 bg-brand-lime/[0.04] hover:border-brand-lime' 
                            : 'hover:border-white/20 hover:bg-white/[0.02]'
                }`}
                style={{ 
                    background: selectedVehicle ? undefined : 'var(--bg-input)', 
                    borderColor: selectedVehicle && !isOpen ? 'rgba(200,230,0,0.45)' : undefined 
                }}
            >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div 
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
                        style={{ 
                            background: selectedVehicle ? 'rgba(200,230,0,0.18)' : 'rgba(255,255,255,0.05)', 
                            color: selectedVehicle ? 'var(--brand-lime)' : 'var(--text-dim)' 
                        }}
                    >
                        <Car size={16} />
                    </div>

                    {selectedVehicle ? (
                        <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-mono font-black tracking-wider bg-white/10 text-white border border-brand-lime/30 flex-shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-lime shadow-sm shadow-brand-lime"></span>
                                {selectedVehicle.legalDocs?.registrationNumber || selectedVehicle.plateNumber || selectedVehicle.basicDetails?.plateNumber || 'No Plate'}
                            </span>
                            <span className="font-bold text-xs truncate" style={{ color: 'var(--text-main)' }}>
                                {selectedVehicle.basicDetails?.make} {selectedVehicle.basicDetails?.model} {selectedVehicle.basicDetails?.year ? `(${selectedVehicle.basicDetails.year})` : ''}
                            </span>
                            {selectedVehicle.basicDetails?.weeklyRent ? (
                                <span className="text-[11px] font-black text-brand-lime sm:ml-auto flex-shrink-0">
                                    $${selectedVehicle.basicDetails.weeklyRent}/wk
                                </span>
                            ) : null}
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold" style={{ color: 'var(--text-dim)' }}>
                                {loading ? 'Loading available vehicles...' : 'Select an available vehicle (Optional)...'}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {selectedVehicle && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelect('', undefined);
                            }}
                            className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                            title="Unassign vehicle"
                        >
                            <X size={14} />
                        </button>
                    )}
                    <ChevronDown size={16} className={`text-dim transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-lime' : ''}`} />
                </div>
            </div>

            {isOpen && (
                <div 
                    className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                    style={{ 
                        background: '#0d1117', 
                        borderColor: 'rgba(200,230,0,0.3)',
                        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.8), 0 0 25px -5px rgba(200,230,0,0.1)'
                    }}
                >
                    <div className="p-3 border-b border-white/10" style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-brand-lime" />
                            <input
                                type="text"
                                placeholder="Search plate, model, fleet #..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onClick={e => e.stopPropagation()}
                                autoFocus
                                className="w-full pl-9 pr-7 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 outline-none focus:border-brand-lime transition-all text-white placeholder:text-neutral-500"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setSearch(''); }}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                        <div
                            onClick={() => {
                                onSelect('', undefined);
                                setIsOpen(false);
                            }}
                            className={`px-3 py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between text-xs font-bold ${
                                !selectedId 
                                    ? 'bg-brand-lime/10 text-brand-lime border border-brand-lime/30' 
                                    : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-500"></span>
                                No vehicle assigned (Assign later)
                            </span>
                            {!selectedId && <Check size={14} className="text-brand-lime" />}
                        </div>

                        {sortedVehicles.length > 0 ? (
                            sortedVehicles.map(v => {
                                const isSelected = v._id === selectedId;
                                const plate = v.legalDocs?.registrationNumber || v.plateNumber || v.basicDetails?.plateNumber || 'No Plate';
                                const make = v.basicDetails?.make || '';
                                const model = v.basicDetails?.model || '';
                                const year = v.basicDetails?.year ? `(${v.basicDetails.year})` : '';
                                const fleet = v.basicDetails?.fleetNumber ? `Fleet #${v.basicDetails.fleetNumber}` : '';
                                const rent = v.basicDetails?.weeklyRent;
                                const vBranchId = (v.purchaseDetails?.branch as any)?._id || v.purchaseDetails?.branch;
                                const isBranchMatch = selectedBranchId && String(vBranchId) === String(selectedBranchId);

                                return (
                                    <div
                                        key={v._id}
                                        onClick={() => {
                                            onSelect(v._id, v);
                                            setIsOpen(false);
                                        }}
                                        className={`px-3 py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 text-xs ${
                                            isSelected 
                                                ? 'bg-brand-lime/15 text-white border border-brand-lime/40 shadow-sm' 
                                                : 'hover:bg-white/5 border border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <span className={`px-2 py-0.5 rounded font-mono font-black text-[11px] tracking-wider border flex-shrink-0 ${
                                                isSelected 
                                                    ? 'bg-brand-lime text-black border-brand-lime' 
                                                    : 'bg-white/5 text-neutral-200 border-white/10'
                                            }`}>
                                                {plate}
                                            </span>

                                            <div className="min-w-0 flex-1 truncate">
                                                <span className="font-bold text-white truncate">
                                                    {make} {model}
                                                </span>
                                                <span className="text-[10px] text-neutral-400 ml-1.5 truncate">
                                                    {year} {fleet ? `• ${fleet}` : ''}
                                                </span>
                                            </div>

                                            {isBranchMatch && (
                                                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                                                    This Branch
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {rent ? (
                                                <span className="font-black text-brand-lime text-xs">
                                                    $${rent}/wk
                                                </span>
                                            ) : null}
                                            {isSelected && <CheckCircle2 size={14} className="text-brand-lime" />}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-4 text-center text-dim text-xs">
                                {loading ? 'Loading vehicles...' : `No available vehicles found matching "${search}"`}
                            </div>
                        )}
                    </div>

                    <div className="p-2.5 border-t border-white/10 flex items-center justify-between text-[10px] font-semibold text-neutral-400" style={{ background: 'rgba(255,255,255,0.01)' }}>
                        <span>{vehicles.length} available in fleet</span>
                        <span className="text-brand-lime font-mono">Ola Fleet</span>
                    </div>
                </div>
            )}
        </div>
    );
};

interface QuickAddCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newCustomer?: Customer) => void;
    branches: Branch[];
}

export const QuickAddCustomerModal = ({ isOpen, onClose, onSuccess, branches }: QuickAddCustomerModalProps) => {
    const [submitting, setSubmitting] = useState(false);

    // Form fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [branch, setBranch] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [country, setCountry] = useState('');
    const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

    // Driver & Vehicle assignment fields
    const [isDriver, setIsDriver] = useState(false);
    const [vehicleId, setVehicleId] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [durationWeeks, setDurationWeeks] = useState<number>(60);
    const [weeklyRent, setWeeklyRent] = useState<string | number>('');
    const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
    const [loadingVehicles, setLoadingVehicles] = useState(false);

    // Fetch all available vehicles when driver toggle is enabled
    useEffect(() => {
        if (!isOpen || !isDriver) return;
        let isMounted = true;
        setLoadingVehicles(true);
        getAvailableVehicles({ limit: 200 })
            .then(res => {
                if (isMounted) {
                    const list = Array.isArray(res) 
                        ? res 
                        : (Array.isArray((res as any)?.data) ? (res as any).data : []);
                    setAvailableVehicles(list);
                }
            })
            .catch(err => {
                console.error('Failed to fetch available vehicles:', err);
                if (isMounted) setAvailableVehicles([]);
            })
            .finally(() => {
                if (isMounted) setLoadingVehicles(false);
            });
        return () => { isMounted = false; };
    }, [isOpen, isDriver]);

    const handleVehicleSelect = (vId: string, vehicle?: Vehicle) => {
        setVehicleId(vId);
        if (!vId) {
            setWeeklyRent('');
            return;
        }
        const selected = vehicle || availableVehicles.find(v => v._id === vId);
        if (selected?.basicDetails?.weeklyRent) {
            setWeeklyRent(selected.basicDetails.weeklyRent);
        }
        if (!startDate) {
            setStartDate(new Date().toISOString().split('T')[0]);
        }
    };

    const resetForm = () => {
        setName(''); setEmail(''); setPhone(''); setWhatsappNumber('');
        setBranch(''); setAddress(''); setCity(''); setState('');
        setCountry(''); setStatus('ACTIVE');
        setIsDriver(false);
        setVehicleId('');
        setStartDate(new Date().toISOString().split('T')[0]);
        setDurationWeeks(60);
        setWeeklyRent('');
        setAvailableVehicles([]);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { toast.error('Customer name is required'); return; }
        if (!branch) { toast.error('Please select a branch'); return; }

        if (isDriver && vehicleId && !startDate) {
            toast.error('Start date is required when assigning a vehicle');
            return;
        }

        setSubmitting(true);
        const toastId = toast.loading('Creating customer...');
        try {
            const payload: CreateCustomerPayload = {
                name: name.trim(),
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                whatsappNumber: whatsappNumber.trim() || undefined,
                branch,
                address: address.trim() || undefined,
                city: city.trim() || undefined,
                state: state.trim() || undefined,
                country: country.trim() || undefined,
                status,
                isDriver,
                vehicleId: isDriver && vehicleId ? vehicleId : undefined,
                startDate: isDriver && startDate ? startDate : undefined,
                durationWeeks: isDriver && vehicleId ? Number(durationWeeks) : undefined,
                weeklyRent: isDriver && weeklyRent !== '' && !isNaN(Number(weeklyRent)) ? Number(weeklyRent) : undefined,
            };
            const res = await createCustomer(payload);
            toast.success(
                isDriver 
                    ? (vehicleId ? 'Customer & Driver profile created with assigned vehicle!' : 'Customer & connected Driver profile created!')
                    : 'Customer created successfully!', 
                { id: toastId }
            );
            resetForm();
            const newCustomer = res.data || res;
            onSuccess(newCustomer);
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to create customer', { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div
                className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] shadow-2xl border animate-in zoom-in-95 duration-200 custom-scrollbar"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
            >
                {/* Modal Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-5 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200,230,0,0.12)', border: '1px solid rgba(200,230,0,0.25)' }}>
                            <UserPlus size={16} style={{ color: 'var(--brand-lime)' }} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>New Customer</h2>
                            <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--text-dim)' }}>Fill in the details to register a new customer</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-xl border transition-all hover:bg-white/10 active:scale-95 cursor-pointer"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6">

                    {/* Dual Toggle Banner: Status & Driver Profile */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Initial Status Toggle */}
                        <div className="flex items-center justify-between p-4 rounded-2xl border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Initial Status</p>
                                <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--text-main)' }}>
                                    {status === 'ACTIVE' ? 'Active' : 'Inactive'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setStatus(s => s === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
                                className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 border cursor-pointer ${status === 'ACTIVE' ? 'border-emerald-500/40' : 'border-white/10'}`}
                                style={{ background: status === 'ACTIVE' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)' }}
                            >
                                <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center ${status === 'ACTIVE' ? 'left-6 bg-emerald-500' : 'left-0.5 bg-white/20'}`}>
                                    {status === 'ACTIVE' && <Check size={10} className="text-white" />}
                                </span>
                            </button>
                        </div>

                        {/* Customer is a Driver Toggle */}
                        <div 
                            className="flex items-center justify-between p-4 rounded-2xl border transition-all duration-300"
                            style={{ 
                                background: isDriver ? 'rgba(200,230,0,0.05)' : 'rgba(255,255,255,0.02)', 
                                borderColor: isDriver ? 'rgba(200,230,0,0.35)' : 'var(--border-main)' 
                            }}
                        >
                            <div className="flex items-center gap-2.5">
                                <div 
                                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300"
                                    style={{ 
                                        background: isDriver ? 'rgba(200,230,0,0.18)' : 'rgba(255,255,255,0.05)', 
                                        color: isDriver ? 'var(--brand-lime)' : 'var(--text-dim)' 
                                    }}
                                >
                                    <Car size={14} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: isDriver ? 'var(--brand-lime)' : 'var(--text-dim)' }}>
                                        Is a Driver?
                                    </p>
                                    <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--text-main)' }}>
                                        {isDriver ? 'Create Driver Profile' : 'Customer Only'}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    const next = !isDriver;
                                    setIsDriver(next);
                                    if (!next) {
                                        setVehicleId('');
                                        setWeeklyRent('');
                                    }
                                }}
                                className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 border cursor-pointer ${isDriver ? 'border-brand-lime/50' : 'border-white/10'}`}
                                style={{ background: isDriver ? 'rgba(200,230,0,0.25)' : 'rgba(255,255,255,0.05)' }}
                            >
                                <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center ${isDriver ? 'left-6 bg-brand-lime text-black' : 'left-0.5 bg-white/20'}`}>
                                    {isDriver && <Check size={10} className="text-black font-black" />}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Optional Vehicle Assignment Section in Ola Theme */}
                    {isDriver && (
                        <div 
                            className="p-5 rounded-2xl border space-y-4 animate-in fade-in slide-in-from-top-2 duration-300" 
                            style={{ 
                                background: 'rgba(200,230,0,0.02)', 
                                borderColor: 'rgba(200,230,0,0.25)' 
                            }}
                        >
                            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'rgba(200,230,0,0.15)' }}>
                                <div className="flex items-center gap-2">
                                    <Car size={15} style={{ color: 'var(--brand-lime)' }} />
                                    <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>
                                        Vehicle Assignment
                                    </p>
                                    <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-white/5 text-dim border border-white/10">
                                        Optional
                                    </span>
                                </div>
                                <span className="text-[10px] font-semibold text-brand-lime">
                                    {loadingVehicles ? 'Loading fleet...' : `${availableVehicles.length} available vehicles in fleet`}
                                </span>
                            </div>

                            <div className="space-y-4">
                                {/* Ola Theme Vehicle Dropdown */}
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                        Select Vehicle (Ola Theme Dropdown)
                                    </label>
                                    <OlaVehicleSelect
                                        vehicles={availableVehicles}
                                        selectedId={vehicleId}
                                        onSelect={handleVehicleSelect}
                                        selectedBranchId={branch}
                                        loading={loadingVehicles}
                                    />
                                </div>

                                {/* Vehicle Assignment Details (shown when a vehicle is picked) */}
                                {vehicleId && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                        {/* Start Date */}
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                                Start Date <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={e => setStartDate(e.target.value)}
                                                required={!!vehicleId}
                                                className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all cursor-pointer focus:ring-2 focus:ring-brand-lime/20"
                                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                            />
                                        </div>

                                        {/* Lease Duration (Weeks) Dropdown */}
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                                Duration (Weeks) <span className="text-rose-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <Clock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-brand-lime" />
                                                <select
                                                    value={durationWeeks}
                                                    onChange={e => setDurationWeeks(Number(e.target.value))}
                                                    className="w-full pl-10 pr-8 py-3 rounded-xl text-xs font-semibold border outline-none appearance-none cursor-pointer transition-all focus:ring-2 focus:ring-brand-lime/20"
                                                    style={{ 
                                                        background: 'var(--bg-input)', 
                                                        borderColor: 'var(--border-main)', 
                                                        color: 'var(--text-main)' 
                                                    }}
                                                >
                                                    <option value={4}>4 Weeks (~1 Month)</option>
                                                    <option value={8}>8 Weeks (~2 Months)</option>
                                                    <option value={12}>12 Weeks (~3 Months)</option>
                                                    <option value={24}>24 Weeks (~6 Months)</option>
                                                    <option value={36}>36 Weeks (~9 Months)</option>
                                                    <option value={52}>52 Weeks (1 Year)</option>
                                                    <option value={60}>60 Weeks (~14 Mos - Standard)</option>
                                                    <option value={104}>104 Weeks (2 Years)</option>
                                                    <option value={156}>156 Weeks (3 Years)</option>
                                                    <option value={208}>208 Weeks (4 Years)</option>
                                                    <option value={260}>260 Weeks (5 Years)</option>
                                                </select>
                                                <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
                                            </div>
                                        </div>

                                        {/* Weekly Rent */}
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                                Weekly Rent ($)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="e.g. 250"
                                                value={weeklyRent}
                                                onChange={e => setWeeklyRent(e.target.value)}
                                                className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
                                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                            />
                                        </div>

                                        {/* Rent & Installments Summary Banner */}
                                        {weeklyRent && durationWeeks ? (
                                            <div className="sm:col-span-3 p-3 rounded-xl border flex items-center justify-between text-xs" style={{ background: 'rgba(200,230,0,0.03)', borderColor: 'rgba(200,230,0,0.2)' }}>
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-brand-lime animate-pulse"></span>
                                                    <span className="font-bold text-neutral-300">Schedule:</span>
                                                    <span className="font-mono font-bold text-white">{durationWeeks} weekly installments</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] uppercase font-bold text-dim mr-2">Estimated Total:</span>
                                                    <span className="font-black text-brand-lime text-xs">
                                                        $${(Number(weeklyRent) * Number(durationWeeks)).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                )}
                            </div>

                            <p className="text-[10px] font-semibold text-dim pt-1">
                                {vehicleId 
                                    ? `A connected driver profile will be created and assigned this vehicle for ${durationWeeks} weeks starting ${startDate}.` 
                                    : 'A connected driver profile will be created. You can assign a vehicle now or at any time in the future.'}
                            </p>
                        </div>
                    )}

                    {/* ── Section: Identity ── */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                            <User size={12} /> Identity
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="sm:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                    Full Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Mohammed Al-Rashid"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Section: Contact ── */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                            <Mail size={12} /> Contact Information
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>Email Address</label>
                                <div className="relative">
                                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                                    <input
                                        type="email"
                                        placeholder="customer@example.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>Phone Number</label>
                                <div className="relative">
                                    <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                                    <input
                                        type="tel"
                                        placeholder="+971 50 000 0000"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>WhatsApp Number</label>
                                <div className="relative">
                                    <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                                    <input
                                        type="tel"
                                        placeholder="+971 50 000 0000"
                                        value={whatsappNumber}
                                        onChange={e => setWhatsappNumber(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Section: Branch & Location ── */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                            <Building2 size={12} /> Branch & Location
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="sm:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                    Assigned Branch <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                                    <select
                                        value={branch}
                                        onChange={e => setBranch(e.target.value)}
                                        required
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border outline-none appearance-none cursor-pointer transition-all focus:ring-2 focus:ring-brand-lime/20"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: branch ? 'var(--text-main)' : 'var(--text-dim)' }}
                                    >
                                        <option value="">Select a branch...</option>
                                        {branches.map(b => (
                                            <option key={b._id} value={b._id}>{b.name} — {b.city || b.country}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="sm:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>Street Address</label>
                                <div className="relative">
                                    <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                                    <input
                                        type="text"
                                        placeholder="123 Sheikh Zayed Road"
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>City</label>
                                <input
                                    type="text"
                                    placeholder="Dubai"
                                    value={city}
                                    onChange={e => setCity(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>State / Emirate</label>
                                <input
                                    type="text"
                                    placeholder="Dubai"
                                    value={state}
                                    onChange={e => setState(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>Country</label>
                                <div className="relative">
                                    <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                                    <input
                                        type="text"
                                        placeholder="United Arab Emirates"
                                        value={country}
                                        onChange={e => setCountry(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Actions ── */}
                    <div className="flex items-center justify-end gap-3 pt-2 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={submitting}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold border transition-all hover:bg-white/5 disabled:opacity-50 cursor-pointer"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !name.trim() || !branch}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-black transition-all active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            style={{ background: 'var(--brand-lime)' }}
                        >
                            {submitting ? (
                                <><RefreshCw size={13} className="animate-spin" /> Creating...</>
                            ) : (
                                <><UserPlus size={13} /> Create Customer</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default QuickAddCustomerModal;
