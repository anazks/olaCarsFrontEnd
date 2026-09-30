import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../../../store';
import { setCustomersData } from '../../../../store/dashboardSlice';
import { 
    Users, Search, Filter, ChevronRight, ChevronLeft, RefreshCw, 
    ArrowUpDown, ArrowUp, ArrowDown, DollarSign, FileText, UserPlus,
    X, User, Mail, Phone, MapPin, Building2, Globe, Check, Car, Clock, CheckCircle2, ChevronDown
} from 'lucide-react';
import { getAllCustomers, createCustomer, type Customer, type CreateCustomerPayload } from '../../../../services/customerService';
import type { PaginationMetadata } from '../../../../services/driverService';
import { getAllBranches, type Branch } from '../../../../services/branchService';
import { getAvailableVehicles, type Vehicle } from '../../../../services/vehicleService';
import Breadcrumbs from '../../../../components/dashboard/shared/Breadcrumbs';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const getAssignedVehiclePlate = (c: Customer): string => {
    const rawPlate = 
        c.driver?.currentVehicle?.legalDocs?.registrationNumber ||
        c.driver?.currentVehicle?.plateNumber ||
        c.driver?.currentVehicle?.basicDetails?.fleetNumber ||
        c.cfVehicleNo;

    if (!rawPlate) {
        return 'Nill';
    }

    const trimmed = String(rawPlate).trim();
    const lower = trimmed.toLowerCase();
    if (!trimmed || lower === 'n/a' || lower === 'na' || lower === 'none' || lower === 'null' || lower === 'nil' || lower === 'nill' || trimmed === '-' || trimmed === '—') {
        return 'Nill';
    }

    return trimmed;
};

/* ─────────────────────────────────────────────────────────────────────────────
   CREATE CUSTOMER MODAL
   ───────────────────────────────────────────────────────────────────────────── */


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
                                    ${selectedVehicle.basicDetails.weeklyRent}/wk
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
                                                    ${rent}/wk
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

interface CreateCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    branches: Branch[];
}

const CreateCustomerModal = ({ isOpen, onClose, onSuccess, branches }: CreateCustomerModalProps) => {
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
            await createCustomer(payload);
            toast.success(
                isDriver 
                    ? (vehicleId ? 'Customer & Driver profile created with assigned vehicle!' : 'Customer & connected Driver profile created!')
                    : 'Customer created successfully!', 
                { id: toastId }
            );
            resetForm();
            onSuccess();
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div
                className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] shadow-2xl border animate-in fade-in slide-in-from-bottom-4 duration-300 custom-scrollbar"
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
                        className="p-2 rounded-xl border transition-all hover:bg-white/10 active:scale-95"
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
                                className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 border ${status === 'ACTIVE' ? 'border-emerald-500/40' : 'border-white/10'}`}
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
                                className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 border ${isDriver ? 'border-brand-lime/50' : 'border-white/10'}`}
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
                                                className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all cursor-pointer"
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
                                                    className="w-full pl-10 pr-8 py-3 rounded-xl text-xs font-semibold border outline-none appearance-none cursor-pointer transition-all"
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
                                                className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all"
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
                                                        ${(Number(weeklyRent) * Number(durationWeeks)).toLocaleString()}
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
                                    className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2"
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
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all"
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
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all"
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
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all"
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
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border outline-none appearance-none cursor-pointer transition-all"
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
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all"
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
                                    className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all"
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
                                    className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all"
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
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all"
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
                            className="px-5 py-2.5 rounded-xl text-xs font-bold border transition-all hover:bg-white/5 disabled:opacity-50"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !name.trim() || !branch}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-black transition-all active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN CUSTOMERS PAGE
   ───────────────────────────────────────────────────────────────────────────── */

const Customers = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const customersState = useSelector((state: RootState) => state.dashboard.customers);

    const [customers, setCustomers] = useState<Customer[]>(customersState.list);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(!customersState.isLoaded);
    const [error, setError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const isFirstMount = useRef(true);

    const getDefaultStartDate = () => {
        const year = new Date().getFullYear();
        return `${year}-01-01`;
    };

    const getDefaultEndDate = () => {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    };

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [branchFilter, setBranchFilter] = useState('ALL');
    const [startDate, setStartDate] = useState(getDefaultStartDate());
    const [endDate, setEndDate] = useState(getDefaultEndDate());

    // Sorting State
    const [sortBy, setSortBy] = useState<string>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Pagination State
    const [page, setPage] = useState(1);
    const [limit] = useState(25);
    const [pagination, setPagination] = useState<PaginationMetadata | null>(customersState.pagination);

    const fetchAllFilteredCustomers = async (): Promise<Customer[]> => {
        const filters: any = { all: 'true', sortBy, sortOrder };
        if (debouncedSearch.trim()) filters.search = debouncedSearch.trim();
        if (statusFilter !== 'ALL') filters.status = statusFilter;
        if (branchFilter !== 'ALL') filters.branch = branchFilter;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

        const res = await getAllCustomers(filters);
        return res.data || [];
    };

    const handleExportExcel = async () => {
        const toastId = toast.loading("Fetching all customers for Excel export...");
        try {
            const allCustomers = await fetchAllFilteredCustomers();
            if (allCustomers.length === 0) {
                toast.error("No customers available to export.", { id: toastId });
                return;
            }

            const exportData = allCustomers.map((c, idx) => ({
                "Sl No.": String(idx + 1).padStart(2, '0'),
                "Customer ID": c.customerId || 'N/A',
                "Customer Name": c.name,
                "Assigned Vehicle Plate": getAssignedVehiclePlate(c),
                "Email": c.email || 'N/A',
                "Phone": c.phone || 'N/A',
                "WhatsApp": c.whatsappNumber || 'N/A',
                "Branch": (c.branch as any)?.name || 'N/A',
                "Address": c.address || 'N/A',
                "City": c.city || 'N/A',
                "Country": c.country || 'N/A',
                "Status": c.status || 'ACTIVE',
                "Registered Date": c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Customers");
            
            const keys = Object.keys(exportData[0]);
            ws["!cols"] = keys.map(key => {
                const maxLen = Math.max(
                    key.length,
                    ...exportData.map(row => String((row as any)[key] || "").length)
                );
                return { wch: maxLen + 2 };
            });

            const dateStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `customers_export_${dateStr}.xlsx`);
            toast.success(`Exported ${allCustomers.length} customer records to Excel!`, { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export Excel file.", { id: toastId });
        }
    };

    const handleExportCsv = async () => {
        const toastId = toast.loading("Fetching all customers for CSV export...");
        try {
            const allCustomers = await fetchAllFilteredCustomers();
            if (allCustomers.length === 0) {
                toast.error("No customers available to export.", { id: toastId });
                return;
            }

            const exportData = allCustomers.map((c, idx) => ({
                "Sl No.": String(idx + 1).padStart(2, '0'),
                "Customer ID": c.customerId || 'N/A',
                "Customer Name": c.name,
                "Assigned Vehicle Plate": getAssignedVehiclePlate(c),
                "Email": c.email || 'N/A',
                "Phone": c.phone || 'N/A',
                "WhatsApp": c.whatsappNumber || 'N/A',
                "Branch": (c.branch as any)?.name || 'N/A',
                "Address": c.address || 'N/A',
                "City": c.city || 'N/A',
                "Country": c.country || 'N/A',
                "Status": c.status || 'ACTIVE',
                "Registered Date": c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const csvContent = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement("a");
            link.setAttribute("href", url);
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute("download", `customers_export_${dateStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success(`Exported ${allCustomers.length} customer records to CSV!`, { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export CSV file.", { id: toastId });
        }
    };

    const handleExportPdf = async () => {
        const toastId = toast.loading("Fetching all customers for PDF export...");
        try {
            const allCustomers = await fetchAllFilteredCustomers();
            if (allCustomers.length === 0) {
                toast.error("No customers available to export.", { id: toastId });
                return;
            }

            const doc = new jsPDF();
            const dateStr = new Date().toISOString().split('T')[0];
            const title = "Customer Registry Report";
            
            doc.setFontSize(18);
            doc.text(title, 14, 22);
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 29);
            if (startDate || endDate) {
                doc.text(`Period: ${startDate || 'N/A'} to ${endDate || 'N/A'}`, 14, 35);
            }

            const head = [["Sl No.", "Customer ID", "Customer Name", "Plate No.", "Email", "Phone", "Branch", "Status", "Registered"]];
            const body = allCustomers.map((c, idx) => [
                String(idx + 1).padStart(2, '0'),
                c.customerId || 'N/A',
                c.name || 'N/A',
                getAssignedVehiclePlate(c),
                c.email || 'N/A',
                c.phone || 'N/A',
                (c.branch as any)?.name || 'N/A',
                c.status || 'ACTIVE',
                c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'
            ]);

            autoTable(doc, {
                head,
                body,
                startY: (startDate || endDate) ? 40 : 34,
                theme: 'striped',
                headStyles: { fillColor: [200, 230, 0], textColor: [0, 0, 0] }
            });

            doc.save(`customers_export_${dateStr}.pdf`);
            toast.success(`Exported ${allCustomers.length} customer records to PDF!`, { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export PDF file.", { id: toastId });
        }
    };

    const getPageNumbers = () => {
        const totalPages = pagination?.totalPages || 1;
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const pages: (number | string)[] = [];
        pages.push(1);

        let start = Math.max(2, page - 1);
        let end = Math.min(totalPages - 1, page + 1);

        if (page <= 3) { end = 4; }
        if (page >= totalPages - 2) { start = totalPages - 3; }

        if (start > 2) { pages.push('...'); }
        for (let i = start; i <= end; i++) { pages.push(i); }
        if (end < totalPages - 1) { pages.push('...'); }
        pages.push(totalPages);
        return pages;
    };

    // Debounce Search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
        return () => clearTimeout(t);
    }, [searchQuery]);



    useEffect(() => {
        const fetchBranchesData = async () => {
            try {
                const data = await getAllBranches();
                setBranches(Array.isArray(data) ? data : (data as any).data || []);
            } catch (error) {
                console.error('Error fetching branches:', error);
            }
        };
        fetchBranchesData();
    }, []);

    const fetchData = useCallback(async (showLoadingSpinner = true) => {
        try {
            if (showLoadingSpinner) setLoading(true);
            setError(null);
            const filters: any = { page, limit, sortBy, sortOrder };

            if (debouncedSearch.trim()) filters.search = debouncedSearch.trim();
            if (statusFilter !== 'ALL') filters.status = statusFilter;
            if (branchFilter !== 'ALL') filters.branch = branchFilter;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;

            const res = await getAllCustomers(filters);
            const customersList = res.data || [];
            setCustomers(customersList);
            setPagination(res.pagination);

            dispatch(setCustomersData({
                list: customersList,
                pagination: res.pagination
            }));
        } catch (error: any) {
            console.error('Error fetching customers:', error);
            setError(error.message || 'Failed to load customers');
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, limit, debouncedSearch, statusFilter, branchFilter, sortBy, sortOrder, startDate, endDate]);

    // Single authoritative effect — reruns any time any dep changes
    useEffect(() => {
        // First mount: serve Redux cache if still fresh
        if (isFirstMount.current) {
            isFirstMount.current = false;
            const cacheAge = Date.now() - (customersState.lastFetched || 0);
            if (customersState.isLoaded && cacheAge < 5 * 60 * 1000) {
                setCustomers(customersState.list);
                setPagination(customersState.pagination);
                return;
            }
        }
        fetchData(true);
    }, [fetchData]); // fetchData identity changes whenever any dep changes

    // When non-page filters change, reset to page 1 first
    useEffect(() => {
        setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearch, statusFilter, branchFilter, sortBy, sortOrder, startDate, endDate]);


    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sortBy !== field) return <ArrowUpDown size={10} className="opacity-20 group-hover:opacity-100 transition-opacity" />;
        return sortOrder === 'asc' ? <ArrowUp size={10} className="text-brand-lime" /> : <ArrowDown size={10} className="text-brand-lime" />;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE':
            case 'APPROVED': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'INACTIVE':
            case 'REJECTED':
            case 'SUSPENDED': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            default: return 'bg-white/5 text-dim border-white/10';
        }
    };

    return (
        <div className="container-responsive space-y-6 pb-12">
            <Breadcrumbs 
                items={[
                    { label: 'Sales', path: '#' },
                    { label: 'Customers', active: true }
                ]} 
            />

            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                    <div>
                        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                            <Users size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                            Customer Registry
                        </h1>
                        <p className="text-xs font-medium text-dim mt-0.5">Manage and view all registered customers and their financial status</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button 
                            onClick={() => fetchData(true)} 
                            className="p-2 rounded-xl border transition-all duration-300 hover:bg-white/10 active:scale-95"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        </button>

                        <button
                            onClick={() => navigate('../invoices')}
                            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm hover:bg-white/5 active:scale-95"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <FileText size={14} className="opacity-70" /> Invoices
                        </button>

                        <button
                            onClick={() => navigate('../payments-received')}
                            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm hover:bg-white/5 active:scale-95"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <DollarSign size={14} className="opacity-70" /> Payments
                        </button>

                        <button
                            onClick={handleExportExcel}
                            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm hover:bg-white/5 active:scale-95"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <FileText size={14} className="text-emerald-500" /> Excel
                        </button>

                        <button
                            onClick={handleExportCsv}
                            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm hover:bg-white/5 active:scale-95"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <FileText size={14} className="text-blue-400" /> CSV
                        </button>

                        <button
                            onClick={handleExportPdf}
                            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm hover:bg-white/5 active:scale-95"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <FileText size={14} className="text-rose-500" /> PDF
                        </button>

                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center justify-center gap-1.5 px-4 py-2 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all duration-300"
                            style={{ background: 'var(--brand-lime)' }}
                        >
                            <UserPlus size={14} /> Add Customer
                        </button>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dim" size={16} />
                            <input
                                type="text"
                                placeholder="Search by name, email, or customer ID..."
                                className="w-full pl-11 pr-4 py-3 rounded-2xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
                                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3">
                            <div className="relative flex-shrink-0">
                                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-dim" size={14} />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="pl-10 pr-8 py-3 border rounded-2xl text-xs font-bold outline-none appearance-none cursor-pointer"
                                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="ALL">ALL STATUSES</option>
                                    {['ACTIVE', 'INACTIVE'].map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="relative flex-shrink-0">
                                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-dim" size={14} />
                                <select
                                    value={branchFilter}
                                    onChange={(e) => setBranchFilter(e.target.value)}
                                    className="pl-10 pr-8 py-3 border rounded-2xl text-xs font-bold outline-none appearance-none cursor-pointer"
                                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="ALL">ALL BRANCHES</option>
                                    {branches.map(b => (
                                        <option key={b._id} value={b._id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 rounded-2xl px-3 py-1.5 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--brand-lime)' }}>Joined From</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => {
                                    const newStart = e.target.value;
                                    setStartDate(newStart);
                                    if (endDate && newStart && newStart > endDate) { setEndDate(''); }
                                }}
                                className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                                style={{ color: 'var(--text-main)' }}
                            />
                        </div>
                        <div className="flex items-center gap-2 rounded-2xl px-3 py-1.5 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--brand-lime)' }}>Joined To</span>
                            <input
                                type="date"
                                value={endDate}
                                min={startDate || undefined}
                                onChange={e => setEndDate(e.target.value)}
                                className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                                style={{ color: 'var(--text-main)' }}
                            />
                        </div>
                        {(startDate || endDate) && (
                            <button
                                onClick={() => { setStartDate(''); setEndDate(''); }}
                                className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-2xl border transition-colors hover:bg-red-500/10"
                                style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}
                            >
                                ✕ Clear Dates
                            </button>
                        )}
                    </div>
                </div>

                {/* Table Section */}
                <div className="border shadow-lg rounded-[2rem] overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse text-left text-xs select-text">
                            <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                                <tr className="border-b" style={{ borderColor: 'var(--border-main)' }}>
                                    <th className="py-4 px-6 text-left w-10">Sl No.</th>
                                    <th className="py-4 px-6 text-left group cursor-pointer select-none" onClick={() => handleSort('name')}>
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Customer Details <SortIcon field="name" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left group cursor-pointer select-none" onClick={() => handleSort('customerId')}>
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Customer ID <SortIcon field="customerId" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left">
                                        <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Assigned Vehicle Plate</div>
                                    </th>
                                    <th className="py-4 px-6 text-left">
                                        <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Contact Info</div>
                                    </th>
                                    <th className="py-4 px-6 text-left">
                                        <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Branch / Region</div>
                                    </th>
                                    <th className="py-4 px-6 text-center group cursor-pointer select-none" onClick={() => handleSort('status')}>
                                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Status <SortIcon field="status" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-center group cursor-pointer select-none" onClick={() => handleSort('createdAt')}>
                                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Registered <SortIcon field="createdAt" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-right text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-medium" style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}>
                                {loading ? (
                                    <tr>
                                        <td colSpan={9} className="py-20 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <RefreshCw className="animate-spin text-brand-lime" size={28} />
                                                <span className="text-xs font-black tracking-widest text-dim uppercase">Fetching Customers...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={9} className="py-20 text-center">
                                            <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-6 inline-block">
                                                <p className="text-xs font-black uppercase text-rose-500">{error}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : customers.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(200,230,0,0.08)', border: '1px solid rgba(200,230,0,0.2)' }}>
                                                    <Users size={28} style={{ color: 'var(--brand-lime)' }} />
                                                </div>
                                                <div className="text-dim space-y-1 uppercase">
                                                    <p className="text-xs font-black tracking-widest">No customers found</p>
                                                    <p className="text-[10px] font-semibold normal-case opacity-60">Try adjusting your filters or add a new customer</p>
                                                </div>
                                                <button
                                                    onClick={() => setIsCreateModalOpen(true)}
                                                    className="flex items-center gap-1.5 px-5 py-2.5 text-black font-black text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-all"
                                                    style={{ background: 'var(--brand-lime)' }}
                                                >
                                                    <UserPlus size={13} /> Add First Customer
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    customers.map((customer, index) => {
                                        const plate = getAssignedVehiclePlate(customer);
                                        return (
                                        <tr 
                                            key={customer._id} 
                                            onClick={() => navigate(customer._id)}
                                            className="transition-colors cursor-pointer group"
                                            style={{ borderBottom: '1px solid var(--border-main)' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <td className="py-5 px-6 font-semibold text-dim opacity-50">{(index + 1 + (page - 1) * limit).toString().padStart(2, '0')}</td>
                                            <td className="py-5 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center flex-shrink-0 shadow-inner">
                                                        <span className="text-brand-lime text-[10px] font-black">
                                                            {customer.name ? customer.name[0].toUpperCase() : 'C'}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black leading-snug tracking-tight text-white" style={{ color: 'var(--text-main)' }}>
                                                            {customer.name}
                                                        </span>
                                                        <span className="text-[9px] font-black text-dim uppercase tracking-wider mt-0.5 opacity-60">
                                                            Joined {formatDate(customer.createdAt)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 font-black text-brand-lime" style={{ color: 'var(--brand-lime)' }}>
                                                {customer.customerId || 'TEMP-ID'}
                                            </td>
                                            <td className="py-5 px-6">
                                                {plate !== 'Nill' ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold tracking-wider bg-white/5 text-white border border-white/15">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-brand-lime shadow-sm shadow-brand-lime"></span>
                                                        {plate}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-semibold italic text-dim opacity-60">
                                                        Nill
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold" style={{ color: 'var(--text-main)' }}>{customer.phone || '—'}</span>
                                                    <span className="text-[9px] text-dim lowercase mt-0.5">{customer.email || '—'}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
                                                        {customer.branch?.name || 'N/A'}
                                                    </span>
                                                    <span className="text-[9px] font-black uppercase text-dim tracking-widest mt-0.5">
                                                        {customer.branch?.city || customer.branch?.country || 'Global'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${getStatusColor(customer.status)}`}>
                                                    {customer.status}
                                                </span>
                                            </td>
                                            <td className="py-5 px-6 text-center text-dim font-bold">
                                                {formatDate(customer.createdAt)}
                                            </td>
                                            <td className="py-5 px-6 text-right">
                                                <button className="p-2 bg-white/5 border border-white/10 text-dim hover:text-brand-lime hover:border-brand-lime/30 rounded-xl transition-all duration-300">
                                                    <ChevronRight size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {!loading && customers.length > 0 && pagination && pagination.totalPages >= 1 && (
                        <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                            <p className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>
                                Showing {customers.length} of {pagination.total} customers
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(page - 1)}
                                    disabled={page === 1 || loading}
                                    className="p-2 rounded-lg border border-white/10 text-dim hover:text-white disabled:opacity-20 transition-all cursor-pointer"
                                    style={{ borderColor: 'var(--border-main)' }}
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <div className="flex items-center gap-1">
                                    {getPageNumbers().map((p, index) => {
                                        if (p === '...') {
                                            return (
                                                <span key={`ell-${index}`} className="px-2 text-dim text-xs font-black select-none">
                                                    ...
                                                </span>
                                            );
                                        }
                                        return (
                                            <button
                                                key={p}
                                                onClick={() => setPage(Number(p))}
                                                className={`w-9 h-9 rounded-lg text-xs font-black transition-all cursor-pointer ${page === p ? 'bg-brand-lime text-black shadow-lg scale-110' : 'text-dim hover:bg-white/5 border border-white/5'}`}
                                            >
                                                {p}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => setPage(page + 1)}
                                    disabled={page === pagination.totalPages || loading}
                                    className="p-2 rounded-lg border border-white/10 text-dim hover:text-white disabled:opacity-20 transition-all cursor-pointer"
                                    style={{ borderColor: 'var(--border-main)' }}
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Customer Modal */}
            <CreateCustomerModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => fetchData(true)}
                branches={branches}
            />
        </div>
    );
};

export default Customers;