import { formatDate } from '../../../../utils/dateUtils';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { 
    User, Mail, Phone, MapPin, CreditCard, DollarSign, FileText, 
    RefreshCw, Calendar, FileSpreadsheet,
    Download, CheckCircle2, AlertCircle,
    ArrowLeft, Zap, Briefcase, Filter, X,
    ChevronLeft, ChevronRight, Search, Eye,
    Car, Hash, Tag, Pencil, History, Clock, ChevronDown, Check, AlertTriangle
} from 'lucide-react';
import { getCustomerById, updateCustomer, updateCustomerWeeklyRent, assignVehicleToCustomer, type Customer } from '../../../../services/customerService';
import { driverService } from '../../../../services/driverService';
import { getAllVehicles, assignVehicleToDriver, type Vehicle } from '../../../../services/vehicleService';
import { getInvoicesByCustomer, type Invoice } from '../../../../services/invoiceService';
import { getAllCreditNotes, type CreditNote } from '../../../../services/creditNoteService';
import api from '../../../../services/api';
import Breadcrumbs from '../../../../components/dashboard/shared/Breadcrumbs';
import toast from 'react-hot-toast';


interface OlaVehicleSelectProps {
    vehicles: Vehicle[];
    selectedId: string;
    onSelect: (id: string, vehicle?: Vehicle) => void;
    selectedBranchId?: string;
    loading?: boolean;
}

const OlaVehicleSelect = ({ vehicles, selectedId, onSelect, selectedBranchId, loading }: OlaVehicleSelectProps) => {
    const [assignedAlert, setAssignedAlert] = useState<{ plate: string; driverName: string } | null>(null);
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

    const getDriverName = (driver: any): string => {
        if (!driver) return '';
        if (typeof driver === 'string') return driver;
        const pInfo = driver.personalInfo;
        const name = pInfo?.fullName || driver.name || driver.fullName || '';
        const code = driver.driverId ? ` (${driver.driverId})` : '';
        return (name ? `${name}${code}` : (driver.driverId ? `Driver ${driver.driverId}` : '')).trim();
    };

    const filteredVehicles = vehicles.filter(v => {
        if (!search.trim()) return true;
        const rawTerm = search.toLowerCase();
        const cleanTerm = rawTerm.replace(/[\s-_]/g, '');
        const rawPlate = (v.legalDocs?.registrationNumber || (v as any).plateNumber || v.basicDetails?.plateNumber || '').toLowerCase();
        const cleanPlate = rawPlate.replace(/[\s-_]/g, '');
        const make = (v.basicDetails?.make || '').toLowerCase();
        const model = (v.basicDetails?.model || '').toLowerCase();
        const fleetNo = (v.basicDetails?.fleetNumber || '').toLowerCase();
        const vin = (v.basicDetails?.vin || '').toLowerCase();
        return rawPlate.includes(rawTerm) || cleanPlate.includes(cleanTerm) || make.includes(rawTerm) || model.includes(rawTerm) || fleetNo.includes(rawTerm) || vin.includes(rawTerm);
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
                                {selectedVehicle.legalDocs?.registrationNumber || (selectedVehicle as any).plateNumber || selectedVehicle.basicDetails?.plateNumber || 'No Plate'}
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
                                {loading ? 'Loading fleet vehicles...' : 'Select an available vehicle (Optional)...'}
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
                        background: 'var(--bg-card)', 
                        borderColor: 'var(--border-main)',
                        boxShadow: '0 20px 40px -15px rgba(0,0,0,0.5)'
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
                                className="w-full pl-9 pr-7 py-2 rounded-xl text-xs font-semibold border outline-none focus:border-brand-lime transition-all" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
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
                                const plate = v.legalDocs?.registrationNumber || (v as any).plateNumber || v.basicDetails?.plateNumber || 'No Plate';
                                const make = v.basicDetails?.make || '';
                                const model = v.basicDetails?.model || '';
                                const year = v.basicDetails?.year ? `(${v.basicDetails.year})` : '';
                                const fleet = v.basicDetails?.fleetNumber ? `Fleet #${v.basicDetails.fleetNumber}` : '';
                                const rent = v.basicDetails?.weeklyRent;
                                const vBranchId = (v.purchaseDetails?.branch as any)?._id || v.purchaseDetails?.branch;
                                const isBranchMatch = selectedBranchId && String(vBranchId) === String(selectedBranchId);

                                const isAssigned = !!(v.currentDriver || v.status === 'ACTIVE — RENTED' || (v.status as string) === 'ACTIVE - RENTED');
                                const assignedDriverName = getDriverName(v.currentDriver) || 'another driver';

                                const handleItemClick = () => {
                                    if (isAssigned) {
                                        setAssignedAlert({ plate, driverName: assignedDriverName });
                                        toast.error(
                                            `This vehicle is already assigned with the driver (${assignedDriverName}), please cancel it to assign it to a new driver.`,
                                            { duration: 7000, icon: '⚠️' }
                                        );
                                        return;
                                    }
                                    onSelect(v._id, v);
                                    setIsOpen(false);
                                };

                                return (
                                    <div
                                        key={v._id}
                                        onClick={handleItemClick}
                                        className={`px-3 py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-3 text-xs ${
                                            isSelected 
                                                ? 'bg-brand-lime/15 text-white border border-brand-lime/40 shadow-sm' 
                                                : isAssigned
                                                    ? 'hover:bg-rose-500/[0.08] border border-rose-500/10 bg-rose-500/[0.03] opacity-80 hover:opacity-100'
                                                    : 'hover:bg-white/5 border border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <span className={`px-2 py-0.5 rounded font-mono font-black text-[11px] tracking-wider border flex-shrink-0 ${
                                                isSelected 
                                                    ? 'bg-brand-lime text-black border-brand-lime' 
                                                    : isAssigned
                                                        ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                                                        : 'bg-white/5 text-neutral-200 border-white/10'
                                            }`}>
                                                {plate}
                                            </span>

                                            <div className="min-w-0 flex-1 truncate">
                                                <span className={`font-bold truncate ${isAssigned ? 'text-neutral-300' : 'text-white'}`}>
                                                    {make} {model}
                                                </span>
                                                <span className="text-[10px] text-neutral-400 ml-1.5 truncate">
                                                    {year} {fleet ? `• ${fleet}` : ''}
                                                </span>
                                            </div>

                                            {isAssigned ? (
                                                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 flex-shrink-0 flex items-center gap-1" title={`Assigned to ${assignedDriverName}`}>
                                                    <AlertTriangle size={10} />
                                                    Assigned: {assignedDriverName}
                                                </span>
                                            ) : (
                                                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                                                    Available
                                                </span>
                                            )}

                                            {isBranchMatch && (
                                                <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex-shrink-0">
                                                    This Branch
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            {rent ? (
                                                <span className={`font-black text-xs ${isAssigned ? 'text-neutral-500 line-through' : 'text-brand-lime'}`}>
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
                                {loading ? 'Loading vehicles...' : `No vehicles found matching "${search}"`}
                            </div>
                        )}
                    </div>

                    <div className="p-2.5 border-t border-white/10 flex items-center justify-between text-[10px] font-semibold text-neutral-400" style={{ background: 'rgba(255,255,255,0.01)' }}>
                        <span>{vehicles.length} fleet vehicles ({vehicles.filter(v => !v.currentDriver && v.status !== 'ACTIVE — RENTED' && (v.status as string) !== 'ACTIVE - RENTED').length} available)</span>
                        <span className="text-brand-lime font-mono">Ola Fleet</span>
                    </div>
                </div>
            )}

            {assignedAlert && (
                <div 
                    className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150"
                    onClick={(e) => { e.stopPropagation(); setAssignedAlert(null); }}
                >
                    <div 
                        className="w-full max-w-md rounded-3xl p-6 border shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
                        style={{ 
                            background: '#12161f', 
                            borderColor: 'rgba(239, 68, 68, 0.4)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 35px rgba(239, 68, 68, 0.2)' 
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="text-base font-black text-white">Vehicle Already Assigned</h3>
                                <p className="text-xs text-neutral-400 font-mono font-bold mt-0.5">{assignedAlert.plate}</p>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold leading-relaxed text-rose-200">
                            This vehicle is already assigned with the driver <span className="font-black text-white underline underline-offset-2">({assignedAlert.driverName})</span>, please cancel it to assign it to a new driver.
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setAssignedAlert(null)}
                                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 transition-all border border-rose-500/30"
                            >
                                Understood
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const CustomerDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    const getBasePath = (pathname: string) => {
        const m = pathname.match(/^(\/admin\/[^/]+)/);
        return m ? m[1] : '';
    };
    const basePath = getBasePath(location.pathname);

    const [searchParams] = useSearchParams();
    const tabParam = searchParams.get('tab');

    const [customer, setCustomer] = useState<Customer | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
    const [debitNotes, setDebitNotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'vehicle_history' | 'emi' | 'invoices' | 'payments' | 'credit_notes' | 'debit_notes' | 'statements'>(
        (tabParam as any) || 'overview'
    );

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) {
            setActiveTab(tab as any);
        }
    }, [searchParams]);
    const [sortBy, setSortBy] = useState<'date' | 'status'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');

    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['PAID', 'UNPAID', 'PARTIALLY_PAID', 'OVERDUE']);

    const handleStatusToggle = (status: string) => {
        setSelectedStatuses(prev => 
            prev.includes(status) 
                ? prev.filter(s => s !== status) 
                : [...prev, status]
        );
    };

    const fetchData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            // Fetch customer first — this is the critical call
            const customerData = await getCustomerById(id);
            const resolvedCustomer = customerData.data || customerData;
            setCustomer(resolvedCustomer);

            // Use the actual customer _id for related data queries
            const customerId = resolvedCustomer._id || id;

            // Fetch related data in parallel, but don't let one failure block the rest
            const [invoicesResult, creditNotesResult, paymentsResult, debitNotesResult] = await Promise.allSettled([
                getInvoicesByCustomer(customerId),
                getAllCreditNotes({ customerId }),
                api.get('/api/payments-received', { params: { customerId, limit: 10000 } }),
                api.get('/api/debit-notes', { params: { customerId, limit: 10000 }, headers: { 'X-Skip-Toast': 'true' } })
            ]);

            setInvoices(invoicesResult.status === 'fulfilled' ? invoicesResult.value : []);
            setCreditNotes(creditNotesResult.status === 'fulfilled' ? (creditNotesResult.value?.data || []) : []);
            setPayments(paymentsResult.status === 'fulfilled' ? (paymentsResult.value?.data?.data || paymentsResult.value?.data || []) : []);
            setDebitNotes(debitNotesResult.status === 'fulfilled' ? (debitNotesResult.value?.data?.data || debitNotesResult.value?.data || []) : []);
        } catch (error) {
            console.error('Error fetching customer detail data:', error);
            toast.error('Failed to load customer details');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const [isEditingName, setIsEditingName] = useState(false);
    const [editedName, setEditedName] = useState('');
    const [isSavingName, setIsSavingName] = useState(false);

    const handleSaveName = async () => {
        if (!customer || !editedName.trim()) return;
        if (editedName.trim() === customer.name) {
            setIsEditingName(false);
            return;
        }
        setIsSavingName(true);
        const toastId = toast.loading('Updating name...');
        try {
            const res = await updateCustomer(customer._id, { name: editedName.trim() });
            toast.success('Name updated successfully!', { id: toastId });
            setIsEditingName(false);
            if (res?.data) {
                setCustomer(res.data);
            } else {
                await fetchData();
            }
        } catch (err: any) {
            console.error('Failed to update customer name:', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to update name', { id: toastId });
        } finally {
            setIsSavingName(false);
        }
    };

    // ── Customer & Driver Status / Contract Management ──
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [cancelNotes, setCancelNotes] = useState('');
    const [cancelEndDate, setCancelEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [cancelTarget, setCancelTarget] = useState<'CUSTOMER' | 'DRIVER'>('CUSTOMER');
    const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

    // ── Assign Vehicle State (Modal matching Customer Creation flow) ──
    const [isAssignVehicleModalOpen, setIsAssignVehicleModalOpen] = useState(false);
    const [assignVehicleId, setAssignVehicleId] = useState('');
    const [assignStartDate, setAssignStartDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [assignDurationWeeks, setAssignDurationWeeks] = useState<number>(60);
    const [assignWeeklyRent, setAssignWeeklyRent] = useState<string | number>('');
    const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);

    const openAssignVehicleModal = async () => {
        setAssignVehicleId('');
        setAssignStartDate(new Date().toISOString().split('T')[0]);
        setAssignDurationWeeks(60);
        setAssignWeeklyRent('');
        setIsAssignVehicleModalOpen(true);
        setLoadingVehicles(true);
        try {
            const res = await getAllVehicles({ limit: 2000 });
            const list = Array.isArray(res) ? res : ((res as any)?.data || []);
            setAvailableVehicles(list);
        } catch (err: any) {
            console.error('Failed to load fleet vehicles:', err);
            toast.error('Failed to load fleet vehicles');
        } finally {
            setLoadingVehicles(false);
        }
    };

    const handleAssignVehicleSelect = (vId: string, vehicle?: Vehicle) => {
        setAssignVehicleId(vId);
        if (!vId) {
            setAssignWeeklyRent('');
            return;
        }
        const selected = vehicle || availableVehicles.find(v => v._id === vId);
        if (selected?.basicDetails?.weeklyRent) {
            setAssignWeeklyRent(selected.basicDetails.weeklyRent);
        }
        if (!assignStartDate) {
            setAssignStartDate(new Date().toISOString().split('T')[0]);
        }
    };

    const handleConfirmAssignVehicle = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!customer) return;
        if (!assignVehicleId) {
            toast.error('Please select an available vehicle.');
            return;
        }
        if (!assignStartDate) {
            toast.error('Start date is required.');
            return;
        }
        if (assignWeeklyRent === '' || isNaN(Number(assignWeeklyRent)) || Number(assignWeeklyRent) <= 0) {
            toast.error('Please enter a valid weekly rent.');
            return;
        }

        setIsSubmittingAssign(true);
        const toastId = toast.loading('Assigning vehicle to customer...');
        try {
            await assignVehicleToCustomer(customer._id, {
                vehicleId: assignVehicleId,
                startDate: assignStartDate,
                durationWeeks: Number(assignDurationWeeks),
                weeklyRent: Number(assignWeeklyRent)
            });
            toast.success('Vehicle assigned & contract created successfully!', { id: toastId });
            setIsAssignVehicleModalOpen(false);
            await fetchData();
        } catch (err: any) {
            console.error('Failed to assign vehicle:', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to assign vehicle', { id: toastId });
        } finally {
            setIsSubmittingAssign(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!customer) return;
        if (customer.status === 'INACTIVE') {
            const toastId = toast.loading('Activating customer...');
            try {
                await updateCustomer(customer._id, { status: 'ACTIVE' });
                toast.success('Customer status updated to ACTIVE', { id: toastId });
                fetchData();
            } catch (err: any) {
                console.error('Failed to update customer status:', err);
                toast.error(err.message || 'Failed to update status', { id: toastId });
            }
            return;
        }

        // Deactivating Customer:
        // Check if customer is assigned with any vehicle or linked driver
        const isAssignedVehicle = Boolean(
            customer.driver?.currentVehicle || 
            (customer.driver as any)?.assignedVehicle ||
            (customer.cfVehicleNo && !['nill', 'nil', 'na', 'n/a', 'none', '-', '—', ''].includes(String(customer.cfVehicleNo).trim().toLowerCase()))
        );

        if (customer.driver || isAssignedVehicle) {
            setCancelTarget('CUSTOMER');
            setCancelEndDate(new Date().toISOString().split('T')[0]);
            setCancelNotes('');
            setIsCancelModalOpen(true);
        } else {
            const toastId = toast.loading('Deactivating customer...');
            try {
                await updateCustomer(customer._id, { status: 'INACTIVE' });
                toast.success('Customer status updated to INACTIVE', { id: toastId });
                fetchData();
            } catch (err: any) {
                console.error('Failed to update customer status:', err);
                toast.error(err.message || 'Failed to update status', { id: toastId });
            }
        }
    };

    const handleConfirmCancelContract = async () => {
        if (!cancelEndDate) {
            toast.error('Please select a contract end date');
            return;
        }
        const todayStr = new Date().toISOString().split('T')[0];
        if (cancelEndDate > todayStr) {
            toast.error('Contract end date cannot be in the future. Please select today or a past date.');
            return;
        }

        setIsSubmittingCancel(true);
        const actionLabel = cancelTarget === 'CUSTOMER' ? 'customer & cancelling contract' : 'driver contract';
        const toastId = toast.loading(`Deactivating ${actionLabel}...`);
        try {
            if (customer?.driver?._id) {
                await driverService.cancelContract(
                    customer.driver._id, 
                    cancelNotes || (cancelTarget === 'CUSTOMER' ? 'Deactivated from customer profile' : 'Driver contract cancelled'),
                    cancelEndDate
                );
            }
            if (customer?._id) {
                await updateCustomer(customer._id, { status: 'INACTIVE' });
            }
            toast.success(
                cancelTarget === 'CUSTOMER'
                    ? 'Customer deactivated and contract cancelled successfully'
                    : 'Driver deactivated and contract cancelled successfully',
                { id: toastId }
            );
            setIsCancelModalOpen(false);
            setCancelNotes('');
            await fetchData();
        } catch (err: any) {
            console.error('Failed to cancel contract:', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to cancel contract', { id: toastId });
        } finally {
            setIsSubmittingCancel(false);
        }
    };

    // ── Driver Reactivation & Vehicle Assignment State ──
    const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
    const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
    const [loadingVehicles, setLoadingVehicles] = useState(false);
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
    const [activationDate, setActivationDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
    const [frequency, setFrequency] = useState<'MONTHLY' | 'WEEKLY'>('WEEKLY');
    const [durationWeeks, setDurationWeeks] = useState<number>(24);
    const [durationMonths, setDurationMonths] = useState<number>(6);
    const [weeklyRent, setWeeklyRent] = useState<number>(0);
    const [monthlyRent, setMonthlyRent] = useState<number>(0);
    const [depositAmount, setDepositAmount] = useState<number>(0);
    const [activationNotes, setActivationNotes] = useState<string>('');
    const [isSubmittingActivation, setIsSubmittingActivation] = useState(false);
    const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');

    const openActivateModal = async () => {
        setIsActivateModalOpen(true);
        setLoadingVehicles(true);
        setSelectedVehicleId('');
        setActivationDate(new Date().toISOString().split('T')[0]);
        setDepositAmount(0);
        setActivationNotes('');
        setVehicleSearchQuery('');
        try {
            const res = await getAllVehicles({ limit: 2000 });
            const list = Array.isArray(res) ? res : ((res as any)?.data || []);
            setAvailableVehicles(list);
        } catch (err: any) {
            console.error('Failed to load available vehicles:', err);
            toast.error('Failed to load available vehicles');
        } finally {
            setLoadingVehicles(false);
        }
    };

    const handleSelectVehicle = (v: Vehicle) => {
        setSelectedVehicleId(v._id);
        const sellingValue = v.basicDetails?.sellingValue || 0;
        const defaultWeekly = (v as any).basicDetails?.weeklyRent || (sellingValue > 0 && durationWeeks > 0 ? Math.ceil(sellingValue / durationWeeks) : 150);
        const defaultMonthly = (v as any).basicDetails?.monthlyRent || (sellingValue > 0 && durationMonths > 0 ? Math.ceil(sellingValue / durationMonths) : defaultWeekly * 4);
        setWeeklyRent(defaultWeekly);
        setMonthlyRent(defaultMonthly);
    };

    const filteredAvailableVehicles = useMemo(() => {
        if (!vehicleSearchQuery.trim()) return availableVehicles;
        const q = vehicleSearchQuery.toLowerCase();
        return availableVehicles.filter(v => 
            (v.basicDetails?.make || '').toLowerCase().includes(q) ||
            (v.basicDetails?.model || '').toLowerCase().includes(q) ||
            (v.legalDocs?.registrationNumber || (v as any).plateNumber || '').toLowerCase().includes(q) ||
            (v.basicDetails?.vin || '').toLowerCase().includes(q) ||
            (v.basicDetails?.fleetNumber || '').toLowerCase().includes(q)
        );
    }, [availableVehicles, vehicleSearchQuery]);

    // Calculate repayment preview dates based on activationDate and frequency
    const repaymentPreview = useMemo(() => {
        if (!activationDate) return [];
        const baseDate = new Date(activationDate);
        if (isNaN(baseDate.getTime())) return [];

        const count = frequency === 'WEEKLY' ? Math.min(durationWeeks || 24, 6) : Math.min(durationMonths || 6, 6);
        const amount = frequency === 'WEEKLY' ? weeklyRent : monthlyRent;
        const items = [];

        let nextDueDate = new Date(baseDate);
        if (frequency === 'WEEKLY') {
            const currentDay = nextDueDate.getDay();
            const daysUntilTarget = (3 - currentDay + 7) % 7;
            const offset = daysUntilTarget === 0 ? 7 : daysUntilTarget;
            nextDueDate.setDate(nextDueDate.getDate() + offset);
        } else {
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
            nextDueDate.setDate(1);
        }

        for (let i = 0; i < count; i++) {
            const dueDate = new Date(nextDueDate);
            if (frequency === 'WEEKLY') {
                dueDate.setDate(nextDueDate.getDate() + (i * 7));
            } else {
                dueDate.setMonth(nextDueDate.getMonth() + i);
                dueDate.setDate(1);
            }
            items.push({
                period: i + 1,
                label: frequency === 'WEEKLY'
                    ? `Week ${i + 1} (${formatDate(dueDate)})`
                    : `Month ${i + 1} (${formatDate(dueDate)})`,
                dueDate: formatDate(dueDate),
                amount
            });
        }
        return items;
    }, [activationDate, frequency, weeklyRent, monthlyRent, durationWeeks, durationMonths]);

    const handleConfirmActivation = async () => {
        if (!customer?.driver?._id) return;
        if (!selectedVehicleId) {
            toast.error('Please select an available vehicle.');
            return;
        }
        const effRent = frequency === 'WEEKLY' ? weeklyRent : monthlyRent;
        if (!effRent || effRent <= 0) {
            toast.error('Please enter a valid rental amount.');
            return;
        }

        setIsSubmittingActivation(true);
        const toastId = toast.loading('Activating driver & assigning vehicle...');
        try {
            await assignVehicleToDriver(selectedVehicleId, customer.driver._id, {
                durationMonths: frequency === 'MONTHLY' ? Number(durationMonths) : Math.ceil(Number(durationWeeks) / 4),
                durationWeeks: frequency === 'WEEKLY' ? Number(durationWeeks) : Number(durationMonths) * 4,
                monthlyRent: frequency === 'MONTHLY' ? Number(monthlyRent) : Number(weeklyRent) * 4,
                weeklyRent: frequency === 'WEEKLY' ? Number(weeklyRent) : Math.ceil(Number(monthlyRent) / 4),
                frequency,
                depositAmount: Number(depositAmount) || 0,
                notes: activationNotes || `Reactivated from customer profile on ${activationDate}`,
                activationDate: activationDate
            });
            toast.success('Driver activated, vehicle assigned & repayment plan generated!', { id: toastId });
            setIsActivateModalOpen(false);
            await fetchData();
        } catch (err: any) {
            console.error('Failed to activate driver:', err);
            toast.error(err.response?.data?.message || err.message || 'Failed to activate driver', { id: toastId });
        } finally {
            setIsSubmittingActivation(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-brand-lime border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-black uppercase tracking-widest text-dim animate-pulse">Loading Customer Profile...</p>
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="container-responsive py-20 text-center space-y-6">
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-12 max-w-md mx-auto shadow-2xl">
                    <AlertCircle className="text-rose-500 mx-auto mb-4" size={48} />
                    <h3 className="text-xl font-black uppercase tracking-tighter text-white">Profile Not Found</h3>
                    <p className="text-xs font-medium text-dim mt-2 mb-8">The customer record you are looking for does not exist or has been archived.</p>
                    <button onClick={() => navigate('..')} className="w-full py-3 bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all text-white">
                        Return to Registry
                    </button>
                </div>
            </div>
        );
    }

    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.totalAmountDue || 0), 0);
    const totalPaymentsReceived = payments.reduce((sum, p) => p.status === 'VOID' ? sum : sum + (p.amountReceived || 0), 0);
    const totalApplied = payments.reduce((sum, p) => {
        if (p.status === 'VOID') return sum;
        const applied = p.invoices?.reduce((invSum: number, inv: any) => invSum + (inv.amountApplied || 0), 0) || 0;
        return sum + applied;
    }, 0);
    const prepaymentBalance = Math.max(0, totalPaymentsReceived - totalApplied);
    const outstandingBalance = invoices.reduce((sum, inv) => sum + (inv.balance || 0), 0);

    const handleExportStatement = () => {
        if (!customer) return;
        setIsExportModalOpen(false);
        const toastId = toast.loading("Generating Statement CSV...");

        try {
            const escapeCSV = (val: any) => {
                if (val === null || val === undefined) return '';
                const str = String(val);
                if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            // Build Header metadata
            const metadataRows = [
                ['CUSTOMER STATEMENT OF ACCOUNT', ''],
                ['Customer Name', customer.name],
                ['Customer ID', customer.customerId || 'TEMP-ID'],
                ['Email', customer.email || 'N/A'],
                ['Phone', customer.phone || 'N/A'],
                ['Registered Date', formatDate(customer.createdAt)],
                ['Account Status', customer.status || 'N/A'],
                ['Outstanding Balance', `$${outstandingBalance.toFixed(2)}`],
                ['Prepayment Credit Balance', `$${prepaymentBalance.toFixed(2)}`],
                ['', ''], // Empty row spacer
            ];

            // Build Transactions Header
            const headers = [
                'Date',
                'Transaction Type',
                'Reference Number',
                'Details / Description',
                'Debit (Charges) ($)',
                'Credit (Payments/Notes) ($)',
                'Running Balance ($)',
                'Status'
            ];

            // Consolidate all transactions: Invoices, Payments, Credit Notes
            interface TransactionItem {
                date: Date;
                type: 'Invoice' | 'Payment' | 'Credit Note';
                refNumber: string;
                description: string;
                debit: number;
                credit: number;
                status: string;
            }

            const txList: TransactionItem[] = [];

            // Parse filters
            const fromDateLimit = fromDate ? new Date(fromDate) : null;
            if (fromDateLimit) fromDateLimit.setHours(0, 0, 0, 0);

            const toDateLimit = toDate ? new Date(toDate) : null;
            if (toDateLimit) toDateLimit.setHours(23, 59, 59, 999);

            const allowedStatuses = selectedStatuses.map(s => s.toUpperCase());

            // Add Invoices
            invoices.forEach(inv => {
                const date = new Date(inv.dueDate || inv.generatedAt || new Date());
                if (fromDateLimit && date < fromDateLimit) return;
                if (toDateLimit && date > toDateLimit) return;
                if (allowedStatuses.length > 0 && !allowedStatuses.includes((inv.status || '').toUpperCase())) return;

                txList.push({
                    date,
                    type: 'Invoice',
                    refNumber: inv.invoiceNumber || '—',
                    description: inv.weekLabel ? `Rental Charge: ${inv.weekLabel}` : 'Rental Charge',
                    debit: inv.totalAmountDue || 0,
                    credit: 0,
                    status: inv.status || '—'
                });
            });

            // Add Payments
            payments.forEach(pmt => {
                if (pmt.status === 'VOID') return; // Ignore voided payments in financial statements
                const date = new Date(pmt.paymentDate || new Date());
                if (fromDateLimit && date < fromDateLimit) return;
                if (toDateLimit && date > toDateLimit) return;

                txList.push({
                    date,
                    type: 'Payment',
                    refNumber: pmt.paymentNumber || '—',
                    description: `Payment Received via ${pmt.paymentMethod || 'Other'}`,
                    debit: 0,
                    credit: pmt.amountReceived || 0,
                    status: pmt.status || '—'
                });
            });

            // Add Credit Notes
            creditNotes.forEach(cn => {
                const date = new Date(cn.creditNoteDate || new Date());
                if (fromDateLimit && date < fromDateLimit) return;
                if (toDateLimit && date > toDateLimit) return;

                txList.push({
                    date,
                    type: 'Credit Note',
                    refNumber: cn.creditNoteNumber || '—',
                    description: cn.reason ? `Credit Note: ${cn.reason}` : 'Credit Note Issued',
                    debit: 0,
                    credit: cn.amount || 0,
                    status: cn.status || '—'
                });
            });

            // Sort transactions chronologically to calculate running balances
            txList.sort((a, b) => a.date.getTime() - b.date.getTime());

            // Compute running balance
            let runningBalance = 0;
            txList.forEach(tx => {
                runningBalance += tx.debit - tx.credit;
                (tx as any).runningBalance = runningBalance;
            });

            // Now apply selected sorting options for final export list
            txList.sort((a, b) => {
                if (sortBy === 'status') {
                    const statusA = a.status || '';
                    const statusB = b.status || '';
                    const cmp = statusA.localeCompare(statusB);
                    if (cmp !== 0) {
                        return sortOrder === 'asc' ? cmp : -cmp;
                    }
                }
                
                const timeA = a.date.getTime();
                const timeB = b.date.getTime();
                return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
            });

            // Map to transaction rows for CSV
            const transactionRows = txList.map(tx => {
                return [
                    formatDate(tx.date),
                    tx.type,
                    tx.refNumber,
                    tx.description,
                    tx.debit > 0 ? tx.debit.toFixed(2) : '0.00',
                    tx.credit > 0 ? tx.credit.toFixed(2) : '0.00',
                    ((tx as any).runningBalance || 0).toFixed(2),
                    tx.status
                ];
            });

            // Combine everything into CSV format
            const csvRows = [
                ...metadataRows.map(row => row.map(escapeCSV).join(',')),
                headers.map(escapeCSV).join(','),
                ...transactionRows.map(row => row.map(escapeCSV).join(','))
            ];

            const csvContent = csvRows.join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            const safeName = customer.name.toLowerCase().replace(/\s+/g, '_');
            const dateStr = new Date().toISOString().split('T')[0];
            const filename = `${safeName}_statement_${dateStr}.csv`;

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("Statement CSV downloaded successfully!", { id: toastId });
        } catch (error) {
            console.error("Failed to generate statement CSV:", error);
            toast.error("Failed to export statement", { id: toastId });
        }
    };

    const handleDownloadPdf = async () => {
        setIsExportModalOpen(false);
        const toastId = toast.loading("Generating statement PDF from backend...");
        try {
            const params = { 
                sortBy, 
                sortOrder,
                fromDate: fromDate || undefined,
                toDate: toDate || undefined,
                statuses: selectedStatuses.join(',')
            };
            const res = await api.get(`/api/customers/${id}/statement/pdf`, { params, responseType: 'blob' }).catch(async () => {
                // Fallback to driver statement if customer endpoint isn't fully routed yet
                if (customer.driver?._id) {
                    return await api.get(`/api/driver/${customer.driver._id}/statement/pdf`, { params, responseType: 'blob' });
                }
                throw new Error("Statement PDF not available for non-driver customers yet.");
            });
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            
            // Download PDF file
            const link = document.createElement('a');
            link.href = url;
            const safeName = customer.name.toLowerCase().replace(/\s+/g, '_') || 'customer';
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `${safeName}_statement_${dateStr}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            toast.success("PDF statement downloaded successfully!", { id: toastId });
        } catch (err: any) {
            console.error("Failed to generate PDF:", err);
            toast.error(err.message || "Failed generating statement PDF document.", { id: toastId });
        }
    };

    const customerDriver = customer?.driver as any;
    const isCustomerDriver = Boolean(customer?.isDriver || customerDriver);
    const customerVehicle = customerDriver?.currentVehicle;
    const activeAssignment = customerDriver?.assignmentHistory?.find((a: any) => a.status === 'ACTIVE');
    const hasAssignedVehicle = isCustomerDriver && Boolean(
        (customerVehicle && (customerVehicle.legalDocs?.registrationNumber || customerVehicle.plateNumber || customerVehicle.basicDetails?.plateNumber) && customerVehicle.status !== 'INACTIVE') ||
        (activeAssignment && activeAssignment.status === 'ACTIVE') ||
        (customer?.cfVehicleNo && !['nill', 'nil', 'na', 'n/a', 'none', '-', '—', ''].includes(String(customer.cfVehicleNo).trim().toLowerCase()) && customerDriver?.status === 'ACTIVE')
    );

    return (
        <div className="container-responsive space-y-6 pb-20 animate-in fade-in duration-500">
            <Breadcrumbs 
                items={[
                    { label: 'Sales', path: `${basePath}/customers` },
                    { label: 'Customers', path: `${basePath}/customers` },
                    { label: customer.name, active: true }
                ]} 
            />

            {/* Header Section (Aligned with VehicleDetail style) */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="p-2 rounded-xl border transition-all hover:bg-white/5 cursor-pointer" 
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        {isEditingName ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={editedName}
                                    onChange={(e) => setEditedName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveName();
                                        if (e.key === 'Escape') setIsEditingName(false);
                                    }}
                                    autoFocus
                                    className="text-lg font-bold tracking-tight px-3 py-1 rounded-xl border outline-none focus:border-brand-lime"
                                    style={{ background: 'var(--bg-input, rgba(255,255,255,0.05))', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                                <button
                                    onClick={handleSaveName}
                                    disabled={isSavingName}
                                    className="p-1.5 rounded-lg bg-brand-lime text-black hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                                    title="Save Name"
                                >
                                    <CheckCircle2 size={16} />
                                </button>
                                <button
                                    onClick={() => setIsEditingName(false)}
                                    disabled={isSavingName}
                                    className="p-1.5 rounded-lg border hover:bg-white/5 transition-all cursor-pointer"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                                    title="Cancel"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
                                    {customer.name}
                                </h1>
                                <button 
                                    onClick={() => {
                                        setEditedName(customer.name);
                                        setIsEditingName(true);
                                    }}
                                    title="Edit Customer Name"
                                    className="p-1.5 rounded-lg border transition-all hover:bg-white/10 active:scale-95 cursor-pointer text-dim hover:text-white"
                                    style={{ borderColor: 'var(--border-main)' }}
                                >
                                    <Pencil size={14} />
                                </button>
                            </div>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-mono font-bold text-brand-lime" style={{ color: 'var(--brand-lime)' }}>{customer.customerId || 'TEMP-ID'}</span>
                            <span className="w-1 h-1 rounded-full bg-white/20" />
                            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                                Registered {formatDate(customer.createdAt)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button 
                        onClick={() => fetchData()}
                        className="p-2 rounded-xl border transition-all duration-300 hover:bg-white/10 active:scale-95 shadow-sm"
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    </button>

                    {isCustomerDriver && !hasAssignedVehicle && (
                        <button 
                            type="button"
                            onClick={openAssignVehicleModal}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm active:scale-95 border cursor-pointer bg-lime-500/15 hover:bg-lime-500/25 text-lime-800 border-lime-500/30 dark:bg-brand-lime/10 dark:hover:bg-brand-lime/20 dark:text-brand-lime dark:border-brand-lime/30"
                        >
                            <Car size={14} className="text-lime-700 dark:text-brand-lime" /> Assign Vehicle
                        </button>
                    )}

                    <button 
                        onClick={handleToggleStatus}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm active:scale-95 border cursor-pointer ${
                            customer.status === 'ACTIVE' 
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border-rose-500/20' 
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/20'
                        }`}
                    >
                        <Zap size={14} /> {customer.status === 'ACTIVE' ? 'Deactivate Customer' : 'Activate Customer'}
                    </button>

                    {customer.driver && (
                        <button 
                            onClick={() => {
                                if (customer.driver?.status === 'ACTIVE') {
                                    setIsCancelModalOpen(true);
                                } else {
                                    openActivateModal();
                                }
                            }}
                            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm active:scale-95 border cursor-pointer ${
                                customer.driver.status === 'ACTIVE' 
                                    ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border-rose-500/20' 
                                    : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/20'
                            }`}
                        >
                            <User size={14} /> {customer.driver.status === 'ACTIVE' ? 'Deactivate Driver' : 'Activate Driver'}
                        </button>
                    )}

                    <button 
                        onClick={() => { setExportFormat('csv'); setIsExportModalOpen(true); }}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm hover:bg-white/5 active:scale-95 cursor-pointer"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <Download size={14} className="opacity-70" /> Export CSV
                    </button>

                    <button 
                        onClick={() => { setExportFormat('pdf'); setIsExportModalOpen(true); }}
                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-black font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl cursor-pointer"
                        style={{ background: 'var(--brand-lime)' }}
                    >
                        <FileText size={14} /> Export PDF
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <QuickStatCard 
                    label="Customer Status" 
                    value={customer.status} 
                    icon={<Zap size={16} />} 
                    color={customer.status === 'ACTIVE' ? 'emerald' : 'rose'} 
                />
                <QuickStatCard 
                    label="Branch" 
                    value={customer.branch?.name || 'N/A'} 
                    icon={<Briefcase size={16} />} 
                />
            </div>

            {/* Tab Navigation (Aligned with VehicleDetail style) */}
            <div className="flex items-center gap-1 p-1.5 rounded-2xl border bg-black/20 overflow-x-auto no-scrollbar" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}>
                {[
                    { id: 'overview', label: 'Overview', icon: <User size={14} /> },
                    ...(isCustomerDriver ? [{ 
                        id: 'vehicle_history', 
                        label: 'Vehicle History', 
                        icon: <Car size={14} />,
                        badge: (customerDriver?.assignmentHistory?.length || (hasAssignedVehicle ? 1 : 0)) ? `${customerDriver?.assignmentHistory?.length || 1}` : undefined
                    }] : []),
                    { id: 'emi', label: 'EMI / Rent Plan', icon: <Calendar size={14} /> },
                    { id: 'invoices', label: 'Payables (Invoices)', icon: <FileText size={14} /> },
                    { id: 'payments', label: 'Payments Received', icon: <DollarSign size={14} /> },
                    { id: 'credit_notes', label: 'Credit Notes', icon: <FileSpreadsheet size={14} /> },
                    { id: 'debit_notes', label: 'Debit Notes', icon: <FileText size={14} /> },
                    { id: 'statements', label: 'Statements', icon: <FileText size={14} /> },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                            activeTab === tab.id 
                                ? 'bg-brand-lime text-black shadow-lg scale-[1.02] z-10' 
                                : 'text-dim hover:text-white hover:bg-white/5'
                        }`}
                        style={activeTab === tab.id ? { background: 'var(--brand-lime)' } : { color: 'var(--text-dim)' }}
                    >
                        {tab.icon}
                        {tab.label}
                        {(tab as any).badge !== undefined && (
                            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                                activeTab === tab.id ? 'bg-black/20 text-black' : 'bg-brand-lime/10 text-brand-lime border border-brand-lime/20'
                            }`}>
                                {(tab as any).badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content Section */}
            <div className="min-h-[400px]">
                {activeTab === 'overview' && (
                    <OverviewTab 
                        customer={customer} 
                        prepaymentBalance={prepaymentBalance}
                        totalPaymentsReceived={totalPaymentsReceived}
                        totalApplied={totalApplied}
                        totalInvoiced={totalInvoiced}
                        onRefresh={fetchData}
                    />
                )}
                {activeTab === 'vehicle_history' && isCustomerDriver && (
                    <VehicleHistoryTab customer={customer} />
                )}
                {activeTab === 'emi' && <EMITab customer={customer} invoices={invoices} />}
                {activeTab === 'invoices' && <InvoicesTab invoices={invoices} navigate={navigate} basePath={basePath} />}
                {activeTab === 'payments' && <PaymentsTab payments={payments} />}
                {activeTab === 'credit_notes' && <CreditNotesTab creditNotes={creditNotes} navigate={navigate} basePath={basePath} />}
                {activeTab === 'debit_notes' && <DebitNotesTab debitNotes={debitNotes} navigate={navigate} basePath={basePath} />}
                {activeTab === 'statements' && <StatementsTab invoices={invoices} payments={payments} creditNotes={creditNotes} customerId={id || ''} />}
            </div>

            {isExportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-all">
                    <div className="w-full max-w-md p-8 rounded-[2rem] border shadow-2xl relative animate-in zoom-in-95 duration-200" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between pb-4 mb-6 border-b" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-2">
                                <FileText className="text-brand-lime" size={20} />
                                <h3 className="text-sm font-black uppercase tracking-widest text-white">Export Statement {exportFormat.toUpperCase()}</h3>
                            </div>
                            <button onClick={() => setIsExportModalOpen(false)} className="text-dim hover:text-white transition-all text-xs font-bold">&times;</button>
                        </div>

                        <div className="space-y-6">
                            {/* Date filters */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dim">From Date</label>
                                    <input 
                                        type="date" 
                                        value={fromDate}
                                        onChange={(e) => setFromDate(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl text-xs font-bold outline-none border focus:border-brand-lime transition-all"
                                        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dim">To Date</label>
                                    <input 
                                        type="date" 
                                        value={toDate}
                                        onChange={(e) => setToDate(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl text-xs font-bold outline-none border focus:border-brand-lime transition-all"
                                        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>

                            {/* Status filters */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dim block mb-1">Invoice Statuses</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['PAID', 'UNPAID', 'PARTIALLY_PAID', 'OVERDUE'].map((status) => (
                                        <label key={status} className="flex items-center gap-2 cursor-pointer select-none">
                                            <input 
                                                type="checkbox"
                                                checked={selectedStatuses.includes(status)}
                                                onChange={() => handleStatusToggle(status)}
                                                className="rounded border-gray-300 text-brand-lime focus:ring-brand-lime"
                                            />
                                            <span className="text-[10px] font-bold tracking-wider text-dim hover:text-white transition-all uppercase">{status.replace('_', ' ')}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Sorting options */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dim">Sort By</label>
                                    <select 
                                        value={sortBy} 
                                        onChange={(e) => setSortBy(e.target.value as 'date' | 'status')}
                                        className="w-full px-4 py-2.5 rounded-xl text-xs font-bold outline-none border hover:bg-white/5 cursor-pointer"
                                        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <option value="date" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Date</option>
                                        <option value="status" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Invoice Status</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dim">Sort Order</label>
                                    <select 
                                        value={sortOrder} 
                                        onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                                        className="w-full px-4 py-2.5 rounded-xl text-xs font-bold outline-none border hover:bg-white/5 cursor-pointer"
                                        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <option value="desc" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Newest First</option>
                                        <option value="asc" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>Oldest First</option>
                                    </select>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                <button 
                                    onClick={() => setIsExportModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/5 transition-all border border-white/10"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={exportFormat === 'pdf' ? handleDownloadPdf : handleExportStatement}
                                    className="px-6 py-2.5 rounded-xl text-black font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                                    style={{ background: 'var(--brand-lime)' }}
                                >
                                    Export {exportFormat.toUpperCase()}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Contract & Deactivate Driver Modal */}
            {isCancelModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 transition-all">
                    <div className="w-full max-w-lg p-6 sm:p-8 rounded-[2rem] border shadow-2xl relative animate-in zoom-in-95 duration-200" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between pb-4 mb-6 border-b" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                    <AlertCircle size={22} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-white">
                                        {cancelTarget === 'CUSTOMER' ? 'Deactivate Customer & Cancel Contract' : 'Deactivate Driver & Cancel Contract'}
                                    </h3>
                                    <p className="text-[11px] font-medium text-dim mt-0.5">
                                        {customer.name} {customer.driver?.driverId ? `(${customer.driver.driverId})` : ''}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsCancelModalOpen(false)} className="text-dim hover:text-white transition-all text-sm font-bold cursor-pointer">&times;</button>
                        </div>

                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 space-y-2">
                                <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <AlertCircle size={14} /> Contract Termination Effects:
                                </p>
                                <ul className="text-xs space-y-1.5 text-dim list-disc list-inside">
                                    {customer.driver?.currentVehicle || customer.cfVehicleNo ? (
                                        <li>
                                            Current vehicle <span className="font-bold text-white font-mono">({(customer.driver?.currentVehicle as any)?.legalDocs?.registrationNumber || (customer.driver?.currentVehicle as any)?.plateNumber || customer.cfVehicleNo || 'Assigned'})</span> will be unassigned & returned to <span className="text-emerald-400 font-bold">ACTIVE — AVAILABLE</span> status.
                                        </li>
                                    ) : (
                                        <li>Vehicle assignment will be cleared.</li>
                                    )}
                                    <li>
                                        Pending weekly rental invoices due after <span className="font-bold text-rose-300 font-mono">{cancelEndDate || 'selected end date'}</span> will be <span className="text-rose-400 font-bold">CANCELLED</span>.
                                    </li>
                                    <li>
                                        Future unpaid rent installments on repayment schedule will be terminated (balance set to $0).
                                    </li>
                                    <li>
                                        Status will be set to <span className="text-rose-400 font-bold">INACTIVE</span>.
                                    </li>
                                </ul>
                            </div>

                            {/* Contract End Date Field */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dim flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <Calendar size={12} className="text-brand-lime" />
                                        Contract End Date <span className="text-rose-500">*</span>
                                    </span>
                                    <span className="text-[9px] text-amber-400 font-medium">Future dates disabled</span>
                                </label>
                                <input
                                    type="date"
                                    value={cancelEndDate}
                                    max={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setCancelEndDate(e.target.value)}
                                    required
                                    className="w-full px-4 py-2.5 rounded-xl text-xs font-semibold outline-none border focus:border-rose-500 transition-all cursor-pointer"
                                    style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                                <p className="text-[10px] text-neutral-400">
                                    Select the effective contract cancellation date (today or in the past). Repayments past this date will be cleared.
                                </p>
                            </div>

                            {/* Cancellation Notes / Reason */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dim">Cancellation Notes / Reason</label>
                                <textarea
                                    rows={3}
                                    value={cancelNotes}
                                    onChange={(e) => setCancelNotes(e.target.value)}
                                    placeholder="Enter reason for deactivation or contract termination notes..."
                                    className="w-full px-4 py-2.5 rounded-xl text-xs font-medium outline-none border focus:border-rose-500 transition-all resize-none"
                                    style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsCancelModalOpen(false)}
                                    disabled={isSubmittingCancel}
                                    className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border cursor-pointer hover:opacity-80" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)', background: 'var(--bg-input)' }}
                                >
                                    Keep Active
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmCancelContract}
                                    disabled={isSubmittingCancel || !cancelEndDate}
                                    className="px-6 py-2.5 rounded-xl text-white font-black text-[10px] uppercase tracking-widest bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all shadow-xl cursor-pointer disabled:opacity-50"
                                >
                                    {isSubmittingCancel ? 'Processing...' : 'Confirm Deactivation & Cancel Contract'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

{/* Assign Vehicle Modal (Ola Theme matching Customer Creation) */}
            {isAssignVehicleModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all overflow-y-auto">
                    <div 
                        className="w-full max-w-xl p-6 sm:p-8 rounded-[2rem] border shadow-2xl relative animate-in zoom-in-95 duration-200 space-y-6"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', boxShadow: '0 25px 60px -15px rgba(0,0,0,0.5)' }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-brand-lime/10 text-brand-lime border border-brand-lime/20 flex-shrink-0">
                                    <Car size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-black uppercase tracking-wider font-mono" style={{ color: 'var(--text-main)' }}>
                                            VEHICLE ASSIGNMENT
                                        </h3>
                                        <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-white/5 text-dim border border-white/10">
                                            DIRECT ASSIGN
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-neutral-400 mt-0.5">
                                        Assign fleet car to <span className="font-bold" style={{ color: 'var(--text-main)' }}>{customer.name}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-semibold text-brand-lime hidden sm:inline-block">
                                    {loadingVehicles ? 'Loading fleet...' : `${availableVehicles.length} available vehicles in fleet`}
                                </span>
                                <button 
                                    type="button"
                                    onClick={() => setIsAssignVehicleModalOpen(false)} 
                                    className="transition-all text-xl font-bold cursor-pointer hover:opacity-80" style={{ color: 'var(--text-dim)' }}
                                >
                                    &times;
                                </button>
                            </div>
                        </div>

                        {/* Select Vehicle Dropdown */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                    Select Vehicle (Ola Theme Dropdown)
                                </label>
                                <OlaVehicleSelect
                                    vehicles={availableVehicles}
                                    selectedId={assignVehicleId}
                                    onSelect={handleAssignVehicleSelect}
                                    selectedBranchId={(customer.branch as any)?._id || customer.branch}
                                    loading={loadingVehicles}
                                />
                            </div>

                            {/* 3-Column details row when vehicle picked */}
                            {assignVehicleId && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                        {/* Start Date */}
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                                Start Date <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="date"
                                                value={assignStartDate}
                                                onChange={e => setAssignStartDate(e.target.value)}
                                                required
                                                className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all cursor-pointer focus:ring-2 focus:ring-brand-lime/20"
                                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                            />
                                        </div>

                                        {/* Duration Weeks */}
                                        <div>
                                            <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                                Duration (Weeks) <span className="text-rose-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <Clock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-brand-lime" />
                                                <select
                                                    value={assignDurationWeeks}
                                                    onChange={e => setAssignDurationWeeks(Number(e.target.value))}
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
                                                    <option value={16}>16 Weeks (~4 Months)</option>
                                                    <option value={20}>20 Weeks (~5 Months)</option>
                                                    <option value={24}>24 Weeks (~6 Months)</option>
                                                    <option value={36}>36 Weeks (~9 Months)</option>
                                                    <option value={48}>48 Weeks (~11 Months)</option>
                                                    <option value={52}>52 Weeks (1 Year)</option>
                                                    <option value={60}>60 Weeks (~14 Months)</option>
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
                                                Weekly Rent ($) <span className="text-rose-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-lime font-bold text-xs">$</span>
                                                <input
                                                    type="number"
                                                    value={assignWeeklyRent}
                                                    onChange={e => setAssignWeeklyRent(e.target.value)}
                                                    placeholder="0.00"
                                                    min="0"
                                                    step="0.01"
                                                    required
                                                    className="w-full pl-8 pr-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
                                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Schedule & Total summary card matching user screenshot */}
                                    {assignWeeklyRent !== '' && Number(assignWeeklyRent) > 0 && (
                                        <div className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2" style={{ background: 'var(--bg-input)', borderColor: 'rgba(200,230,0,0.3)' }}>
                                            <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                                                Schedule: <span className="font-mono text-lime-700 dark:text-brand-lime font-bold">{assignDurationWeeks} weekly installments</span>
                                            </span>
                                            <span className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>
                                                ESTIMATED TOTAL: <span className="font-mono text-sm text-lime-700 dark:text-brand-lime font-black">${((Number(assignWeeklyRent) || 0) * assignDurationWeeks).toLocaleString()}</span>
                                            </span>
                                        </div>
                                    )}

                                    <p className="text-[11px] text-neutral-400">
                                        A connected driver profile will be created and assigned this vehicle for {assignDurationWeeks} weeks starting {assignStartDate}.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Modal Actions */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                            <button
                                type="button"
                                onClick={() => setIsAssignVehicleModalOpen(false)}
                                disabled={isSubmittingAssign}
                                className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border cursor-pointer hover:opacity-80" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)', background: 'var(--bg-input)' }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmAssignVehicle}
                                disabled={isSubmittingAssign || !assignVehicleId}
                                className="px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-xl cursor-pointer disabled:opacity-50 hover:opacity-90" style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}
                            >
                                {isSubmittingAssign ? 'Assigning Vehicle...' : 'Confirm Vehicle Assignment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Activate Driver & Assign Vehicle Modal */}
            {isActivateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 transition-all overflow-y-auto">
                    <div className="w-full max-w-2xl my-8 p-6 sm:p-8 rounded-[2rem] border shadow-2xl relative animate-in zoom-in-95 duration-200" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between pb-4 mb-6 border-b" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <Car size={22} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Activate Driver & Assign Vehicle</h3>
                                    <p className="text-[11px] font-medium text-dim mt-0.5">
                                        Assign an available car & generate repayment schedule for <span className="text-white font-bold">{customer.driver?.personalInfo?.fullName || customer.name}</span>
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsActivateModalOpen(false)} className="text-dim hover:text-white transition-all text-sm font-bold cursor-pointer">&times;</button>
                        </div>

                        <div className="space-y-6">
                            {/* 1. Activation Date & Vehicle Selection */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dim flex items-center gap-1.5">
                                        <Calendar size={12} /> Activation Date (Contract Start)
                                    </label>
                                    <input
                                        type="date"
                                        value={activationDate}
                                        onChange={(e) => setActivationDate(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl text-xs font-bold outline-none border focus:border-brand-lime transition-all"
                                        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                    <span className="text-[9px] text-dim block">Repayment installments will be calibrated from this date.</span>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dim flex items-center gap-1.5">
                                        <Search size={12} /> Filter Available Cars
                                    </label>
                                    <input
                                        type="text"
                                        value={vehicleSearchQuery}
                                        onChange={(e) => setVehicleSearchQuery(e.target.value)}
                                        placeholder="Search by make, model, plate..."
                                        className="w-full px-4 py-2.5 rounded-xl text-xs font-medium outline-none border focus:border-brand-lime transition-all"
                                        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>

                            {/* Vehicle List */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dim">
                                        Select Vehicle ({filteredAvailableVehicles.length} available)
                                    </label>
                                    {selectedVehicleId && (
                                        <span className="text-[10px] font-black text-brand-lime uppercase tracking-wider">Vehicle Selected</span>
                                    )}
                                </div>

                                {loadingVehicles ? (
                                    <div className="p-8 text-center text-xs text-dim animate-pulse">Loading available fleet...</div>
                                ) : filteredAvailableVehicles.length === 0 ? (
                                    <div className="p-6 rounded-xl border border-dashed text-center text-xs text-dim" style={{ borderColor: 'var(--border-main)' }}>
                                        No available vehicles found matching your search.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                                        {filteredAvailableVehicles.map(v => {
                                            const isSelected = selectedVehicleId === v._id;
                                            const plate = (v as any).plateNumber || v.legalDocs?.registrationNumber || 'No Plate';
                                            const fleet = v.basicDetails?.fleetNumber ? `Fleet #${v.basicDetails.fleetNumber}` : '';
                                            return (
                                                <div
                                                    key={v._id}
                                                    onClick={() => handleSelectVehicle(v)}
                                                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                                        isSelected 
                                                            ? 'border-brand-lime bg-brand-lime/10 shadow-md' 
                                                            : 'hover:bg-white/5 border-transparent'
                                                    }`}
                                                    style={!isSelected ? { borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.02)' } : {}}
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-bold truncate text-white">
                                                            {v.basicDetails?.make} {v.basicDetails?.model} {v.basicDetails?.year ? `(${v.basicDetails.year})` : ''}
                                                        </p>
                                                        <p className="text-[10px] font-mono text-dim mt-0.5 flex items-center gap-1.5">
                                                            <span className="font-bold text-brand-lime">{plate}</span>
                                                            {fleet && <span>• {fleet}</span>}
                                                        </p>
                                                    </div>
                                                    <div className="text-right ml-2">
                                                        <span className="text-xs font-black text-white">
                                                            ${(v.basicDetails?.sellingValue || 0).toLocaleString()}
                                                        </span>
                                                        <span className="text-[9px] block text-dim">Value</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* 2. Rent Terms */}
                            <div className="p-4 rounded-2xl border space-y-4" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-dim">Billing Frequency</label>
                                        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}>
                                            <button
                                                type="button"
                                                onClick={() => setFrequency('WEEKLY')}
                                                className={`py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                    frequency === 'WEEKLY' ? 'bg-brand-lime text-black' : 'text-dim hover:text-white'
                                                }`}
                                            >
                                                Weekly
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFrequency('MONTHLY')}
                                                className={`py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                                    frequency === 'MONTHLY' ? 'bg-brand-lime text-black' : 'text-dim hover:text-white'
                                                }`}
                                            >
                                                Monthly
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-dim">
                                            {frequency === 'WEEKLY' ? 'Duration (Weeks)' : 'Duration (Months)'}
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={frequency === 'WEEKLY' ? durationWeeks : durationMonths}
                                            onChange={(e) => {
                                                const val = Math.max(1, Number(e.target.value));
                                                if (frequency === 'WEEKLY') setDurationWeeks(val);
                                                else setDurationMonths(val);
                                            }}
                                            className="w-full px-4 py-2 rounded-xl text-xs font-bold outline-none border focus:border-brand-lime"
                                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-dim">
                                            {frequency === 'WEEKLY' ? 'Weekly Rent ($)' : 'Monthly Rent ($)'}
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={frequency === 'WEEKLY' ? weeklyRent : monthlyRent}
                                            onChange={(e) => {
                                                const val = Math.max(0, Number(e.target.value));
                                                if (frequency === 'WEEKLY') setWeeklyRent(val);
                                                else setMonthlyRent(val);
                                            }}
                                            className="w-full px-4 py-2 rounded-xl text-xs font-bold outline-none border focus:border-brand-lime"
                                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-dim">Security Deposit ($)</label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={depositAmount}
                                            onChange={(e) => setDepositAmount(Math.max(0, Number(e.target.value)))}
                                            placeholder="Optional down payment / deposit"
                                            className="w-full px-4 py-2 rounded-xl text-xs font-bold outline-none border focus:border-brand-lime"
                                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-dim">Agreement / Assignment Notes</label>
                                        <input
                                            type="text"
                                            value={activationNotes}
                                            onChange={(e) => setActivationNotes(e.target.value)}
                                            placeholder="Optional notes or remarks"
                                            className="w-full px-4 py-2 rounded-xl text-xs font-medium outline-none border focus:border-brand-lime"
                                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 3. Live Repayment Plan Preview */}
                            {repaymentPreview.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-dim flex items-center gap-1.5">
                                            <History size={12} className="text-brand-lime" /> Repayment Plan Preview (From {formatDate(activationDate)})
                                        </label>
                                        <span className="text-[9px] font-mono text-dim">Next {repaymentPreview.length} Installments</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {repaymentPreview.map(item => (
                                            <div
                                                key={item.period}
                                                className="p-2.5 rounded-xl border text-xs"
                                                style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}
                                            >
                                                <span className="text-[9px] font-black uppercase text-dim block truncate">{item.label}</span>
                                                <div className="flex items-center justify-between mt-1">
                                                    <span className="font-bold text-white">${item.amount}</span>
                                                    <span className="text-[9px] text-emerald-400 font-medium">{item.dueDate}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsActivateModalOpen(false)}
                                    disabled={isSubmittingActivation}
                                    className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/5 transition-all border border-white/10 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmActivation}
                                    disabled={isSubmittingActivation || !selectedVehicleId}
                                    className="px-6 py-2.5 rounded-xl text-black font-black text-[10px] uppercase tracking-widest bg-brand-lime hover:scale-105 active:scale-95 transition-all shadow-xl cursor-pointer disabled:opacity-50 disabled:hover:scale-100"
                                >
                                    {isSubmittingActivation ? 'Activating & Assigning...' : 'Activate Driver & Confirm Assignment'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENTS (TABS)
   ───────────────────────────────────────────────────────────────────────────── */

const OverviewTab = ({ 
    customer, 
    prepaymentBalance, 
    totalPaymentsReceived, 
    totalApplied,
    totalInvoiced,
    onRefresh
}: { 
    customer: Customer;
    prepaymentBalance: number;
    totalPaymentsReceived: number;
    totalApplied: number;
    totalInvoiced: number;
    onRefresh?: () => void;
}) => {
    const isDriver = !!customer.driver;
    const driver = customer.driver as any;
    const vehicle = driver?.currentVehicle;
    const activeAssignment = driver?.assignmentHistory?.find((a: any) => a.status === 'ACTIVE')
        || (driver?.assignmentHistory && driver.assignmentHistory.length > 0
            ? driver.assignmentHistory[driver.assignmentHistory.length - 1]
            : null);

    const hasAssignedVehicle = Boolean(
        (vehicle && (vehicle.legalDocs?.registrationNumber || vehicle.plateNumber || vehicle.basicDetails?.plateNumber) && vehicle.status !== 'INACTIVE') ||
        (activeAssignment && activeAssignment.status === 'ACTIVE') ||
        (customer.cfVehicleNo && !['nill', 'nil', 'na', 'n/a', 'none', '-', '—', ''].includes(String(customer.cfVehicleNo).trim().toLowerCase()) && driver?.status === 'ACTIVE')
    );

    // 1. Vehicle Plate Number
    const plateNumber = hasAssignedVehicle 
        ? (vehicle?.legalDocs?.registrationNumber || vehicle?.plateNumber || activeAssignment?.plateNumber || customer.cfVehicleNo || '—') 
        : '—';

    // 2. Vehicle Model
    const make = vehicle?.basicDetails?.make || '';
    const model = vehicle?.basicDetails?.model || '';
    const year = vehicle?.basicDetails?.year ? `(${vehicle.basicDetails.year})` : '';
    const vehicleModel = [make, model, year].filter(Boolean).join(' ').trim() 
        || activeAssignment?.vehicleModel 
        || (vehicle ? 'Model Unspecified' : 'No Vehicle Assigned');

    // 3. VIN Number
    const vinNumber = vehicle?.basicDetails?.vin || vehicle?.vin || '—';

    // 4. Active Date
    const rawActiveDate = (hasAssignedVehicle && activeAssignment?.status === 'ACTIVE' ? activeAssignment.startDate : null)
        || driver?.activationDate 
        || driver?.activation?.activatedDate 
        || customer.cfActiveDate;
    const activeDateFormatted = rawActiveDate 
        ? formatDate(rawActiveDate) 
        : '—';

    // 5. End Date
    const isCurrentlyActive = (driver?.status === 'ACTIVE' || customer.status === 'ACTIVE') && hasAssignedVehicle;
    const rawEndDate = isCurrentlyActive
        ? (activeAssignment?.endDate && new Date(activeAssignment.endDate) > new Date() ? activeAssignment.endDate : null)
        : (activeAssignment?.endDate || driver?.deactivationDate || customer.cfEndDate);

    const endDateFormatted = rawEndDate 
        ? formatDate(rawEndDate) 
        : (isCurrentlyActive ? 'Ongoing / Active' : (rawActiveDate ? 'Ongoing / Active' : '—'));

    // 6. Fleet Number (if assigned)
    const fleetNo = vehicle?.basicDetails?.fleetNumber || vehicle?.fleet?.fleetNumber || (vehicle as any)?.fleetNumber || activeAssignment?.fleetNumber || customer.cfFleetNo;

    // 7. Weekly Rent
    const activeTrackingRent = driver?.rentTracking?.find((t: any) => t.amount && Number(t.amount) > 0)?.amount;
    const vehicleSellingPrice = vehicle ? (vehicle.basicDetails?.sellingValue || vehicle.purchaseDetails?.purchasePrice || 0) : 0;
    const vehicleDurationWeeks = vehicle?.basicDetails?.leaseDurationWeeks || 260;
    const calculatedVehicleWeeklyRent = vehicleSellingPrice > 0 && vehicleDurationWeeks > 0 
        ? Math.ceil(vehicleSellingPrice / vehicleDurationWeeks) 
        : null;

    const rawWeeklyRent = driver?.weeklyRent ?? 
        vehicle?.basicDetails?.weeklyRent ?? 
        activeTrackingRent ?? 
        (driver?.rentTracking && driver.rentTracking.length > 0 ? driver.rentTracking[0]?.amount : null) ??
        customer.cfWeeklyRent ??
        calculatedVehicleWeeklyRent;
    const weeklyRentFormatted = rawWeeklyRent !== null && rawWeeklyRent !== undefined && !isNaN(Number(rawWeeklyRent)) && Number(rawWeeklyRent) > 0
        ? `$${Number(rawWeeklyRent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : '—';

    // Modal state for changing weekly rent
    const [isRentModalOpen, setIsRentModalOpen] = useState(false);
    const [newRentAmount, setNewRentAmount] = useState('');
    const [rentRemark, setRentRemark] = useState('');
    const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
    const [isUpdatingRent, setIsUpdatingRent] = useState(false);

    const handleRentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(newRentAmount);
        if (isNaN(amt) || amt <= 0) {
            toast.error("Please enter a valid weekly rent amount greater than 0");
            return;
        }
        if (!rentRemark.trim()) {
            toast.error("Please provide a remark/reason for the rent adjustment");
            return;
        }

        setIsUpdatingRent(true);
        const toastId = toast.loading("Updating weekly rent...");
        try {
            await updateCustomerWeeklyRent(customer._id, {
                weeklyRent: amt,
                remark: rentRemark.trim(),
                effectiveDate: effectiveDate || undefined
            });
            toast.success("Weekly rent updated successfully!", { id: toastId });
            setIsRentModalOpen(false);
            setRentRemark('');
            if (onRefresh) onRefresh();
        } catch (err: any) {
            console.error("Failed to update weekly rent:", err);
            toast.error(err?.response?.data?.message || err.message || "Failed to update weekly rent", { id: toastId });
        } finally {
            setIsUpdatingRent(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-2 duration-300">
                {/* Personal Details */}
                <SectionCard title="Contact Information" icon={<Phone size={18} />}>
                    <div className="space-y-4 pt-2">
                        <InfoRow label="Email Address" value={customer.email} icon={<Mail size={14} />} />
                        <InfoRow label="Phone Number" value={customer.phone} icon={<Phone size={14} />} />
                        <InfoRow label="WhatsApp" value={customer.whatsappNumber || 'N/A'} icon={<Phone size={14} />} />
                        <InfoRow label="Address" value={customer.address ? `${customer.address}, ${customer.city || ''}, ${customer.state || ''}, ${customer.country || ''}` : 'N/A'} icon={<MapPin size={14} />} />
                    </div>
                </SectionCard>

                {/* Double-Entry Ledger Summary Card */}
                <SectionCard title="Balance Reconciliation" icon={<CreditCard size={18} />}>
                    <div className="space-y-4 pt-2">
                        <InfoRow label="Total Invoiced" value={`$${totalInvoiced.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                        <InfoRow label="Total Payments Applied" value={`$${totalApplied.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} />
                        <div className="pt-4 flex items-center justify-between border-t" style={{ borderColor: 'var(--border-main)' }}>
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Prepayment Credit (Extra)</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${prepaymentBalance > 0 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-white/5 text-dim border-white/10'}`}>
                                ${prepaymentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </SectionCard>

                {/* Emergency & Driver details */}
                <SectionCard title="Driver Association" icon={<User size={18} />}>
                    <div className="space-y-4 pt-2">
                        {isDriver ? (
                            <>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Driver ID</p>
                                        <p className="text-xs font-mono font-bold text-white">{driver.driverId || 'TEMP-ID'}</p>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                        driver.status === 'ACTIVE' 
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    }`}>
                                        {driver.status || 'ACTIVE'}
                                    </span>
                                </div>
                                <div className="space-y-1 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Assigned Vehicle</p>
                                    <p className={`text-xs font-bold ${hasAssignedVehicle ? 'text-brand-lime' : 'text-neutral-400'}`}>
                                        {hasAssignedVehicle ? vehicleModel : 'No Vehicle Assigned'}
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Weekly Rent</p>
                                        <p className="text-xs font-black text-emerald-400">
                                            {weeklyRentFormatted !== '—' ? `${weeklyRentFormatted}/wk` : '—'}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Emergency Contact</p>
                                        <p className="text-xs font-bold truncate" style={{ color: 'var(--text-main)' }}>{driver.emergencyContact?.name || 'N/A'}</p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <p className="text-xs font-medium text-dim">This customer is not registered as a driver and has no vehicle assignments.</p>
                        )}
                    </div>
                </SectionCard>
            </div>

            {/* Vehicle & Assignment Details Overview (Only Shown if Customer is a Driver AND Vehicle is Assigned) */}
            {isDriver && hasAssignedVehicle && (
                <div className="p-6 rounded-[2rem] border shadow-xl animate-in slide-in-from-bottom-2 duration-300 space-y-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b gap-3" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-brand-lime/10 text-brand-lime shrink-0" style={{ color: 'var(--brand-lime)' }}>
                                <Car size={20} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-white">
                                    Assigned Vehicle & Contract Lifecycle
                                </h3>
                                <p className="text-[10px] font-medium text-dim mt-0.5">
                                    Vehicle specifications, weekly rental rate, active license plate, identification, and contract dates
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Button on left side of fleet tag */}
                            <button
                                onClick={() => {
                                    setNewRentAmount(rawWeeklyRent ? String(rawWeeklyRent) : '');
                                    setRentRemark('');
                                    setEffectiveDate(new Date().toISOString().split('T')[0]);
                                    setIsRentModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-brand-lime hover:bg-brand-lime/90 text-black shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                                title="Change Weekly Rent"
                            >
                                <Pencil size={12} /> Change Rent
                            </button>

                            {fleetNo ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-brand-lime/10 text-brand-lime border border-brand-lime/20" style={{ color: 'var(--brand-lime)' }}>
                                    <Hash size={12} /> Fleet #{fleetNo}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-white/5 text-dim border border-white/10">
                                    <Hash size={12} /> Fleet: Not Assigned
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                        {/* 1. Vehicle Plate Number */}
                        <div className="p-4 rounded-2xl border flex flex-col justify-between space-y-2.5" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                            <span className="text-[9px] font-black uppercase tracking-widest text-dim flex items-center gap-1.5">
                                <CreditCard size={12} className="text-brand-lime" /> Plate Number
                            </span>
                            <div>
                                <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-mono font-black tracking-wider bg-white/10 text-white border border-white/20">
                                    {plateNumber}
                                </span>
                            </div>
                        </div>

                        {/* 2. Vehicle Model */}
                        <div className="p-4 rounded-2xl border flex flex-col justify-between space-y-2.5" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                            <span className="text-[9px] font-black uppercase tracking-widest text-dim flex items-center gap-1.5">
                                <Car size={12} className="text-brand-lime" /> Vehicle Model
                            </span>
                            <p className="text-xs font-bold text-white truncate" title={vehicleModel}>
                                {vehicleModel}
                            </p>
                        </div>

                        {/* 3. VIN Number */}
                        <div className="p-4 rounded-2xl border flex flex-col justify-between space-y-2.5" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                            <span className="text-[9px] font-black uppercase tracking-widest text-dim flex items-center gap-1.5">
                                <Tag size={12} className="text-brand-lime" /> VIN Number
                            </span>
                            <p className="text-xs font-mono font-bold text-white truncate" title={vinNumber}>
                                {vinNumber}
                            </p>
                        </div>

                        {/* 4. Weekly Rent */}
                        <div className="p-4 rounded-2xl border flex flex-col justify-between space-y-2.5" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                            <span className="text-[9px] font-black uppercase tracking-widest text-dim flex items-center gap-1.5">
                                <DollarSign size={12} className="text-emerald-400" /> Weekly Rent
                            </span>
                            <p className="text-xs font-black text-emerald-400">
                                {weeklyRentFormatted}
                            </p>
                        </div>

                        {/* 5. Active Date */}
                        <div className="p-4 rounded-2xl border flex flex-col justify-between space-y-2.5" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                            <span className="text-[9px] font-black uppercase tracking-widest text-dim flex items-center gap-1.5">
                                <Calendar size={12} className="text-emerald-400" /> Active Date
                            </span>
                            <p className="text-xs font-bold text-emerald-400">
                                {activeDateFormatted}
                            </p>
                        </div>

                        {/* 6. End Date */}
                        <div className="p-4 rounded-2xl border flex flex-col justify-between space-y-2.5" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                            <span className="text-[9px] font-black uppercase tracking-widest text-dim flex items-center gap-1.5">
                                <Calendar size={12} className="text-amber-400" /> End Date
                            </span>
                            <p className="text-xs font-bold text-amber-400">
                                {endDateFormatted}
                            </p>
                        </div>

                        {/* 7. Fleet Number */}
                        <div className="p-4 rounded-2xl border flex flex-col justify-between space-y-2.5" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                            <span className="text-[9px] font-black uppercase tracking-widest text-dim flex items-center gap-1.5">
                                <Hash size={12} className="text-brand-lime" /> Fleet Number
                            </span>
                            <p className="text-xs font-bold text-white">
                                {fleetNo ? `#${fleetNo}` : 'Not Assigned'}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Vehicle Assignment & Contract Lifecycle History Section */}
            {(() => {
                if (!isDriver) return null;
                const rawHistory: any[] = Array.isArray(driver?.assignmentHistory) ? [...driver.assignmentHistory] : [];
                const hasActiveInHistory = rawHistory.some((h: any) => h.status === 'ACTIVE' && (!h.endDate || new Date(h.endDate) > new Date()));

                if (!hasActiveInHistory && hasAssignedVehicle) {
                    rawHistory.unshift({
                        _id: 'current-active-assignment',
                        vehicle: vehicle,
                        plateNumber: plateNumber !== '—' ? plateNumber : (vehicle?.legalDocs?.registrationNumber || vehicle?.basicDetails?.plateNumber || customer.cfVehicleNo || 'Active Vehicle'),
                        fleetNumber: fleetNo || vehicle?.basicDetails?.fleetNumber || customer.cfFleetNo || '',
                        vehicleModel: vehicleModel !== 'No Vehicle Assigned' ? vehicleModel : (vehicle?.basicDetails ? `${vehicle.basicDetails.make || ''} ${vehicle.basicDetails.model || ''}`.trim() : (customer.cfVehicleModel || 'Active Vehicle')),
                        weeklyRent: rawWeeklyRent ? Number(rawWeeklyRent) : (driver?.weeklyRent || vehicle?.basicDetails?.weeklyRent),
                        startDate: rawActiveDate ? new Date(rawActiveDate) : (driver?.activationDate || driver?.createdAt || customer.createdAt || new Date()),
                        endDate: null,
                        status: 'ACTIVE',
                        cancelNotes: 'Current Active Assignment'
                    });
                }
                const displayedHistory = rawHistory;

                if (displayedHistory.length === 0) return null;

                return (
                    <div className="p-6 rounded-[2rem] border shadow-xl animate-in slide-in-from-bottom-2 duration-300 space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-lime-500/10 text-lime-400">
                                    <Car size={18} />
                                </div>
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-widest text-white">
                                        Vehicle Assignment & Contract Lifecycle History
                                    </h3>
                                    <p className="text-[10px] font-medium text-dim mt-0.5">
                                        Historical records of all vehicle assignments, activation periods, deactivations, and contract status
                                    </p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-dim px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                                {displayedHistory.length} {displayedHistory.length === 1 ? 'Period' : 'Periods'}
                            </span>
                        </div>

                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead>
                                    <tr className="border-b text-[9px] font-black uppercase tracking-widest" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                                        <th className="pb-3 px-3">Status</th>
                                        <th className="pb-3 px-3">Vehicle Model</th>
                                        <th className="pb-3 px-3">Plate & Fleet</th>
                                        <th className="pb-3 px-3">Weekly Rent</th>
                                        <th className="pb-3 px-3">Start Date</th>
                                        <th className="pb-3 px-3">End Date</th>
                                        <th className="pb-3 px-3">Duration</th>
                                        <th className="pb-3 px-3">Deactivation Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-xs font-medium" style={{ borderColor: 'var(--border-main)' }}>
                                    {displayedHistory.map((item: any, index: number) => {
                                    const isCurrent = item.status === 'ACTIVE' && (!item.endDate || new Date(item.endDate) > new Date());
                                    const start = item.startDate ? new Date(item.startDate) : null;
                                    const end = item.endDate ? new Date(item.endDate) : null;
                                    
                                    let durationLabel = 'Ongoing';
                                    if (start) {
                                        const endDateCalc = end || new Date();
                                        const diffMs = endDateCalc.getTime() - start.getTime();
                                        const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
                                        const weeks = Math.floor(diffDays / 7);
                                        const remDays = diffDays % 7;
                                        durationLabel = weeks > 0 ? `${weeks}w ${remDays}d` : `${diffDays}d`;
                                    }

                                    const vObj = typeof item.vehicle === 'object' && item.vehicle ? item.vehicle : null;
                                    const plate = item.plateNumber || vObj?.legalDocs?.registrationNumber || vObj?.basicDetails?.plateNumber || '—';
                                    const fleet = item.fleetNumber || vObj?.basicDetails?.fleetNumber || vObj?.fleet?.fleetNumber;
                                    const model = item.vehicleModel || (vObj?.basicDetails ? `${vObj.basicDetails.make || ''} ${vObj.basicDetails.model || ''}`.trim() : '') || '—';

                                    return (
                                        <tr key={item._id || index} className="hover:bg-white/[0.02] transition-all">
                                            <td className="py-3 px-3">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                                    isCurrent 
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                        : item.status === 'CANCELLED' 
                                                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                                            : 'bg-white/5 text-gray-400 border-white/10'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-emerald-400 animate-pulse' : item.status === 'CANCELLED' ? 'bg-rose-400' : 'bg-gray-400'}`} />
                                                    {isCurrent ? 'ACTIVE' : item.status || 'COMPLETED'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className="text-white font-bold text-[11px] truncate max-w-[200px] inline-block" title={model}>
                                                    {model}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono font-bold text-white text-[11px] bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/10">
                                                        {plate}
                                                    </span>
                                                    {fleet && (
                                                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                            #{fleet}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className="font-bold text-emerald-400 font-mono text-[11px]">
                                                    {item.weeklyRent ? `${Number(item.weeklyRent).toFixed(2)}` : '—'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-dim font-mono text-[11px]">
                                                {start ? formatDate(start) : '—'}
                                            </td>
                                            <td className="py-3 px-3 font-mono text-[11px]">
                                                {end ? (
                                                    <span className="text-amber-400">{formatDate(end)}</span>
                                                ) : (
                                                    <span className="text-emerald-400 font-bold">Ongoing / Active</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-dim font-mono text-[11px]">
                                                {durationLabel}
                                            </td>
                                            <td className="py-3 px-3 text-dim text-[11px] max-w-[220px] truncate" title={item.cancelNotes || ''}>
                                                {item.cancelNotes || '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
                );
            })()}

            {/* Weekly Rent Adjustment History Section (Only shown when records exist) */}
            {isDriver && driver.rentChangeHistory && driver.rentChangeHistory.length > 0 && (
                <div className="p-6 rounded-[2rem] border shadow-xl animate-in slide-in-from-bottom-2 duration-300 space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                                <History size={18} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-widest text-white">
                                    Weekly Rent Adjustment History
                                </h3>
                                <p className="text-[10px] font-medium text-dim mt-0.5">
                                    Audit trail of rental rate modifications, changed by user details, and scenario remarks
                                </p>
                            </div>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-dim px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                            {driver.rentChangeHistory.length} {driver.rentChangeHistory.length === 1 ? 'Record' : 'Records'}
                        </span>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="border-b text-[9px] font-black uppercase tracking-widest" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                                    <th className="pb-3 px-3">Date & Time</th>
                                    <th className="pb-3 px-3">Vehicle</th>
                                    <th className="pb-3 px-3">Adjustment</th>
                                    <th className="pb-3 px-3">Effective Date</th>
                                    <th className="pb-3 px-3">Changed By</th>
                                    <th className="pb-3 px-3">Scenario / Remark</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-xs font-medium" style={{ borderColor: 'var(--border-main)' }}>
                                {driver.rentChangeHistory.map((hist: any, index: number) => {
                                    const prev = Number(hist.previousWeeklyRent) || 0;
                                    const next = Number(hist.newWeeklyRent) || 0;
                                    const diff = next - prev;
                                    return (
                                        <tr key={hist._id || index} className="hover:bg-white/[0.02] transition-all">
                                            <td className="py-3 px-3 text-dim font-mono text-[11px]">
                                                {hist.createdAt ? new Date(hist.createdAt).toLocaleString() : '—'}
                                            </td>
                                            <td className="py-3 px-3">
                                                {(() => {
                                                    const plate = hist.vehicleRegistrationNumber || vehicle?.legalDocs?.registrationNumber || vehicle?.basicDetails?.registrationNumber || customer.cfVehicleNo;
                                                    const model = hist.vehicleModel || (vehicle?.basicDetails?.make ? `${vehicle.basicDetails.make} ${vehicle.basicDetails.model || ''}` : '') || customer.cfVehicleModel;
                                                    const fleet = hist.fleetNumber || fleetNo;
                                                    const vinNumber = hist.vin || vehicle?.basicDetails?.vin || customer.cfVinNumber;

                                                    if (!plate && !model && !fleet) {
                                                        return <span className="text-dim italic text-[11px]">Unassigned / Asset N/A</span>;
                                                    }

                                                    return (
                                                        <div className="flex flex-col gap-0.5 max-w-[200px]">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="font-black text-white flex items-center gap-1 text-[11.5px] bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/10">
                                                                    <Car size={12} className="text-brand-lime shrink-0" />
                                                                    {plate || 'No Plate'}
                                                                </span>
                                                                {fleet && (
                                                                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                                        #{fleet}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {model && (
                                                                <span className="text-[10.5px] font-bold text-gray-300 truncate" title={model}>
                                                                    {model}
                                                                </span>
                                                            )}
                                                            {vinNumber && (
                                                                <span className="text-[9px] font-mono text-dim tracking-tight truncate" title={`VIN: ${vinNumber}`}>
                                                                    VIN: {vinNumber}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="py-3 px-3 font-bold">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-dim line-through">${prev.toFixed(2)}</span>
                                                    <span className="text-dim">→</span>
                                                    <span className="text-emerald-400 font-black">${next.toFixed(2)}</span>
                                                    {prev > 0 && (
                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                                            diff > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                                        }`}>
                                                            {diff > 0 ? `+${diff.toFixed(2)}` : `${diff.toFixed(2)}`}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-white font-medium">
                                                {hist.effectiveDate ? formatDate(hist.effectiveDate) : '—'}
                                            </td>
                                            <td className="py-3 px-3">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-white">{hist.changedByName || 'Staff'}</span>
                                                    {hist.changedByRole && (
                                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-white/5 text-dim border border-white/10">
                                                            {hist.changedByRole}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-dim italic max-w-xs truncate" title={hist.remark}>
                                                "{hist.remark}"
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Change Weekly Rent Modal */}
            {isRentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-lg p-6 sm:p-8 rounded-[2rem] border shadow-2xl relative animate-in zoom-in-95 duration-200 space-y-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-brand-lime/10 text-brand-lime" style={{ color: 'var(--brand-lime)' }}>
                                    <DollarSign size={20} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Adjust Weekly Rent</h3>
                                    <p className="text-[10px] font-medium text-dim mt-0.5">Update future weekly rental rates and record audit remark</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsRentModalOpen(false)} 
                                className="p-2 rounded-xl text-dim hover:text-white hover:bg-white/5 transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Current vs New preview */}
                        <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-dim block mb-1">Current Rate</span>
                                <span className="text-sm font-black text-white">{weeklyRentFormatted}</span>
                            </div>
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-dim block mb-1">New Rate</span>
                                <span className="text-sm font-black text-emerald-400">
                                    {newRentAmount && !isNaN(Number(newRentAmount)) && Number(newRentAmount) > 0 ? `$${Number(newRentAmount).toFixed(2)} / wk` : '—'}
                                </span>
                            </div>
                        </div>

                        <form onSubmit={handleRentSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dim">
                                    New Weekly Rent Amount ($) <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim text-xs font-bold">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="1"
                                        required
                                        placeholder="e.g. 280.00"
                                        value={newRentAmount}
                                        onChange={(e) => setNewRentAmount(e.target.value)}
                                        className="w-full pl-8 pr-4 py-3 rounded-xl text-xs font-bold outline-none border focus:border-brand-lime transition-all"
                                        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dim">
                                    Effective From Date
                                </label>
                                <input
                                    type="date"
                                    value={effectiveDate}
                                    onChange={(e) => setEffectiveDate(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl text-xs font-bold outline-none border focus:border-brand-lime transition-all"
                                    style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                                <span className="text-[9px] text-dim block italic">
                                    * Future installments starting from this date will be updated. Historical/paid installments remain unchanged.
                                </span>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-dim">
                                    Remark / Reason for Change <span className="text-rose-500">*</span>
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Provide mandatory reason (e.g. contract renewal, rate revision addendum)..."
                                    value={rentRemark}
                                    onChange={(e) => setRentRemark(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl text-xs font-bold outline-none border focus:border-brand-lime transition-all resize-none"
                                    style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                <button
                                    type="button"
                                    onClick={() => setIsRentModalOpen(false)}
                                    className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/5 transition-all border border-white/10"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdatingRent}
                                    className="px-6 py-2.5 rounded-xl text-black font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                                    style={{ background: 'var(--brand-lime)' }}
                                >
                                    {isUpdatingRent ? (
                                        <>
                                            <RefreshCw size={14} className="animate-spin" /> Updating...
                                        </>
                                    ) : (
                                        'Confirm & Apply'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Extra Payment Tally Alert */}
            {prepaymentBalance > 0 ? (
                <div className="p-5 rounded-[2rem] border flex items-start gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ background: 'rgba(200, 230, 0, 0.04)', borderColor: 'rgba(200, 230, 0, 0.2)' }}>
                    <div className="w-10 h-10 rounded-xl bg-brand-lime/10 flex items-center justify-center shrink-0 border border-brand-lime/20">
                        <CheckCircle2 className="text-brand-lime" size={18} />
                    </div>
                    <div className="space-y-1">
                        <h4 className="text-xs font-black uppercase tracking-widest text-brand-lime">Extra Prepayment Advance Detected</h4>
                        <p className="text-[10px] font-semibold text-white/90 leading-relaxed" style={{ color: 'var(--text-main)' }}>
                            Tally Complete: The total payment received from this customer (${totalPaymentsReceived.toLocaleString(undefined, { minimumFractionDigits: 2 })}) exceeds the total amounts applied to their invoices (${totalApplied.toLocaleString(undefined, { minimumFractionDigits: 2 })}).
                        </p>
                        <p className="text-[11px] font-black text-[#C8E600] mt-1.5">
                            Current Customer Prepayment Credit Balance (Extra): ${prepaymentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                        <span className="text-[9px] font-bold text-dim block italic mt-1">
                            * This advance balance is stored securely as a prepayment credit and is automatically applied to future invoices generated for this customer.
                        </span>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

function VehicleHistoryTab({ customer }: { customer: Customer }) {
    const driver = customer.driver as any;
    const vehicle = driver?.currentVehicle as any;

    const hasAssignedVehicle = Boolean(
        (vehicle && (vehicle.legalDocs?.registrationNumber || vehicle.plateNumber || vehicle.basicDetails?.plateNumber) && vehicle.status !== 'INACTIVE') ||
        (customer.cfVehicleNo && !['nill', 'nil', 'na', 'n/a', 'none', '-', '—', ''].includes(String(customer.cfVehicleNo).trim().toLowerCase()) && driver?.status === 'ACTIVE')
    );

    const rawHistory: any[] = Array.isArray(driver?.assignmentHistory) ? [...driver.assignmentHistory] : [];
    const hasActiveInHistory = rawHistory.some((h: any) => h.status === 'ACTIVE' && (!h.endDate || new Date(h.endDate) > new Date()));

    if (!hasActiveInHistory && hasAssignedVehicle) {
        const plateNumber = vehicle?.legalDocs?.registrationNumber || vehicle?.plateNumber || vehicle?.basicDetails?.plateNumber || customer.cfVehicleNo || 'Assigned';
        const fleetNo = vehicle?.basicDetails?.fleetNumber || customer.cfFleetNo || '';
        const vehicleModel = vehicle?.basicDetails
            ? `${vehicle.basicDetails.make || ''} ${vehicle.basicDetails.model || ''}`.trim()
            : (customer.cfVehicleModel || 'Active Vehicle');
        const weeklyRent = customer.cfWeeklyRent !== undefined && customer.cfWeeklyRent !== null && customer.cfWeeklyRent !== ''
            ? Number(customer.cfWeeklyRent)
            : (driver?.weeklyRent || vehicle?.basicDetails?.weeklyRent);
        const startDate = customer.cfActiveDate || driver?.activationDate || driver?.createdAt || customer.createdAt || new Date();

        rawHistory.unshift({
            _id: 'current-active-assignment',
            vehicle: vehicle,
            plateNumber,
            fleetNumber: fleetNo,
            vehicleModel,
            weeklyRent,
            startDate,
            endDate: null,
            status: 'ACTIVE',
            cancelNotes: 'Current Active Assignment'
        });
    }

    const history = rawHistory;
    const activeEntry = history.find((h: any) => h.status === 'ACTIVE' && (!h.endDate || new Date(h.endDate) > new Date()));

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Quick Stats Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl border shadow-lg space-y-1" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-dim">Current Vehicle</p>
                    <p className="text-sm font-bold text-white flex items-center gap-2">
                        {activeEntry ? (
                            <>
                                <span className="text-brand-lime">{activeEntry.vehicleModel || 'Assigned'}</span>
                                <span className="font-mono text-xs text-dim">({activeEntry.plateNumber})</span>
                            </>
                        ) : (
                            <span className="text-neutral-400">None Active</span>
                        )}
                    </p>
                </div>
                <div className="p-5 rounded-2xl border shadow-lg space-y-1" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-dim">Total Assignments</p>
                    <p className="text-sm font-black text-white">{history.length} {history.length === 1 ? 'Period' : 'Periods'}</p>
                </div>
                <div className="p-5 rounded-2xl border shadow-lg space-y-1" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-dim">Driver Profile</p>
                    <p className="text-sm font-mono font-bold text-brand-lime">{driver?.driverId || 'LINKED'}</p>
                </div>
            </div>

            {/* Complete Assignment Table */}
            <div className="p-6 rounded-[2rem] border shadow-xl space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-lime-500/10 text-lime-400">
                            <Car size={18} />
                        </div>
                        <div>
                            <h3 className="text-xs font-black uppercase tracking-widest text-white">
                                Complete Vehicle Assignment & Lifecycle Audit Trail
                            </h3>
                            <p className="text-[10px] font-medium text-dim mt-0.5">
                                Chronological log of all assigned vehicles, registration plates, active terms, and deactivation details
                            </p>
                        </div>
                    </div>
                </div>

                {history.length > 0 ? (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="border-b text-[9px] font-black uppercase tracking-widest" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                                    <th className="pb-3 px-3">Status</th>
                                    <th className="pb-3 px-3">Vehicle Model</th>
                                    <th className="pb-3 px-3">Plate & Fleet</th>
                                    <th className="pb-3 px-3">Weekly Rent</th>
                                    <th className="pb-3 px-3">Start Date</th>
                                    <th className="pb-3 px-3">End Date</th>
                                    <th className="pb-3 px-3">Duration</th>
                                    <th className="pb-3 px-3">Deactivation Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-xs font-medium" style={{ borderColor: 'var(--border-main)' }}>
                                {history.map((item: any, index: number) => {
                                    const isCurrent = item.status === 'ACTIVE' && (!item.endDate || new Date(item.endDate) > new Date());
                                    const start = item.startDate ? new Date(item.startDate) : null;
                                    const end = item.endDate ? new Date(item.endDate) : null;
                                    
                                    let durationLabel = 'Ongoing';
                                    if (start) {
                                        const endDateCalc = end || new Date();
                                        const diffMs = endDateCalc.getTime() - start.getTime();
                                        const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
                                        const weeks = Math.floor(diffDays / 7);
                                        const remDays = diffDays % 7;
                                        durationLabel = weeks > 0 ? `${weeks}w ${remDays}d` : `${diffDays}d`;
                                    }

                                    const vObj = typeof item.vehicle === 'object' && item.vehicle ? item.vehicle : null;
                                    const plate = item.plateNumber || vObj?.legalDocs?.registrationNumber || vObj?.basicDetails?.plateNumber || '—';
                                    const fleet = item.fleetNumber || vObj?.basicDetails?.fleetNumber || vObj?.fleet?.fleetNumber;
                                    const model = item.vehicleModel || (vObj?.basicDetails ? `${vObj.basicDetails.make || ''} ${vObj.basicDetails.model || ''}`.trim() : '') || '—';

                                    return (
                                        <tr key={item._id || index} className="hover:bg-white/[0.02] transition-all">
                                            <td className="py-3 px-3">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                                    isCurrent 
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                        : item.status === 'CANCELLED' 
                                                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                                                            : 'bg-white/5 text-gray-400 border-white/10'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isCurrent ? 'bg-emerald-400 animate-pulse' : item.status === 'CANCELLED' ? 'bg-rose-400' : 'bg-gray-400'}`} />
                                                    {isCurrent ? 'ACTIVE' : item.status || 'COMPLETED'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className="text-white font-bold text-[11px] truncate max-w-[220px] inline-block" title={model}>
                                                    {model}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-mono font-bold text-white text-[11px] bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/10">
                                                        {plate}
                                                    </span>
                                                    {fleet && (
                                                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                            #{fleet}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className="font-bold text-emerald-400 font-mono text-[11px]">
                                                    {item.weeklyRent ? `${Number(item.weeklyRent).toFixed(2)}` : '—'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-dim font-mono text-[11px]">
                                                {start ? formatDate(start) : '—'}
                                            </td>
                                            <td className="py-3 px-3 font-mono text-[11px]">
                                                {end ? (
                                                    <span className="text-amber-400">{formatDate(end)}</span>
                                                ) : (
                                                    <span className="text-emerald-400 font-bold">Ongoing / Active</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-dim font-mono text-[11px]">
                                                {durationLabel}
                                            </td>
                                            <td className="py-3 px-3 text-dim text-[11px] max-w-[220px] truncate" title={item.cancelNotes || ''}>
                                                {item.cancelNotes || '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="py-12 text-center space-y-2">
                        <div className="w-12 h-12 mx-auto rounded-full bg-white/5 flex items-center justify-center text-dim">
                            <Car size={24} />
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-white">No Vehicle Assignment History</h4>
                        <p className="text-[11px] font-medium text-dim max-w-sm mx-auto">
                            There are no past or present vehicle assignments logged for this driver profile.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

const EMITab = ({ customer, invoices }: { customer: Customer, invoices: Invoice[] }) => {
    const rentTracking = customer.driver?.rentTracking || [];
    const totalContract = rentTracking.reduce((s: number, i: any) => s + i.amount, 0);
    const totalPaid = invoices.reduce((s: number, i: Invoice) => s + (i.amountPaid || 0), 0);
    const balance = invoices.reduce((s: number, i: Invoice) => s + (i.balance || 0), 0);

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard label="Contract Value" value={`$${totalContract.toLocaleString()}`} icon={<FileText size={20} />} />
                <SummaryCard label="Amount Collected" value={`$${totalPaid.toLocaleString()}`} icon={<CheckCircle2 size={20} />} color="emerald" />
                <SummaryCard label="Active Balance" value={`$${balance.toLocaleString()}`} icon={<AlertCircle size={20} />} color="rose" />
            </div>

            <div className="rounded-[2rem] border overflow-hidden shadow-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b" style={{ borderColor: 'var(--border-main)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Cycle</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Due Date</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Amount</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Collected</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                            {rentTracking.length === 0 ? (
                                <tr><td colSpan={5} className="p-20 text-center text-xs font-bold" style={{ color: 'var(--text-dim)' }}>No repayment plan generated for this customer yet.</td></tr>
                            ) : (
                                rentTracking.map((item: any, idx: number) => {
                                    const invoice = invoices.find(inv => inv.weekNumber === item.weekNumber);
                                    return (
                                        <tr key={idx} className="hover:bg-white/[0.02] transition-all" style={{ borderBottom: '1px solid var(--border-main)' }}>
                                            <td className="px-6 py-4 flex items-center gap-3">
                                                <div className="w-7 h-7 rounded bg-black/40 flex items-center justify-center text-[10px] font-black" style={{ color: 'var(--text-main)' }}>{item.weekNumber}</div>
                                                <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{item.weekLabel}</span>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>{item.dueDate ? formatDate(item.dueDate) : '—'}</td>
                                            <td className="px-6 py-4 text-right text-xs font-black" style={{ color: 'var(--text-main)' }}>${item.amount.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right text-xs font-bold text-brand-lime" style={{ color: 'var(--brand-lime)' }}>${(invoice?.amountPaid || 0).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                                                    item.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                                    item.status === 'PARTIAL' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                                                    'bg-white/5 text-dim border-white/10'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const formatPeriod = (inv: Invoice) => {
    if (!inv.weekLabel) return '—';
    const match = inv.weekLabel.match(/^(Week|Month)\s+(\d+)\s*-\s*(.*)$/i);
    if (match && inv.dueDate) {
        const type = match[1];
        const num = match[2];
        const d = new Date(inv.dueDate);
        if (!isNaN(d.getTime())) {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${type} ${num} - ${day}/${month}/${year}`;
        }
    }
    if (inv.dueDate) {
        const d = new Date(inv.dueDate);
        if (!isNaN(d.getTime())) {
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            if (inv.weekLabel.startsWith('Manual Invoice')) {
                return `Manual Invoice - ${day}/${month}/${year}`;
            }
            if (inv.weekLabel.startsWith('Bulk Invoice')) {
                return `Bulk Invoice - ${day}/${month}/${year}`;
            }
        }
    }
    return inv.weekLabel;
};

const InvoicesTab = ({ invoices, navigate, basePath }: { invoices: Invoice[]; navigate: any; basePath: string }) => {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const limit = 10;

    // Reset page when search constraints modify
    useEffect(() => {
        setPage(1);
    }, [search]);

    const filtered = useMemo(() => {
        return invoices.filter(inv => {
            const num = (inv.invoiceNumber || '').toLowerCase();
            const week = (inv.weekLabel || '').toLowerCase();
            const status = (inv.status || '').toLowerCase();
            const query = search.toLowerCase();
            return num.includes(query) || week.includes(query) || status.includes(query);
        }).sort((a, b) => {
            const dateA = new Date(a.dueDate || a.generatedAt || a.createdAt || 0).getTime();
            const dateB = new Date(b.dueDate || b.generatedAt || b.createdAt || 0).getTime();
            return dateB - dateA;
        });
    }, [invoices, search]);

    const paginated = useMemo(() => {
        const start = (page - 1) * limit;
        return filtered.slice(start, start + limit);
    }, [filtered, page]);

    const totalPages = Math.ceil(filtered.length / limit) || 1;

    return (
        <div className="space-y-4">
            {/* Search Input */}
            <div className="relative max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" size={14} style={{ color: 'var(--text-dim)' }} />
                <input
                    type="text"
                    placeholder="Search invoice number, period or status..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-xl outline-none text-xs font-semibold focus:border-brand-lime/30 transition-all"
                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                />
                {search && (
                    <button 
                        onClick={() => setSearch('')} 
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 hover:text-white transition-colors text-xs font-bold bg-transparent border-none cursor-pointer"
                        style={{ color: 'var(--text-dim)' }}
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="rounded-[2rem] border overflow-hidden animate-in fade-in duration-300 shadow-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b" style={{ borderColor: 'var(--border-main)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Invoice #</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Period</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Total Due</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Balance</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Status</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                            {paginated.length === 0 ? (
                                <tr><td colSpan={6} className="p-16 text-center text-xs font-bold" style={{ color: 'var(--text-dim)' }}>No invoices found matching criteria.</td></tr>
                            ) : (
                                paginated.map((inv) => (
                                    <tr key={inv._id} className="hover:bg-white/[0.02] transition-all" style={{ borderBottom: '1px solid var(--border-main)' }}>
                                        <td className="px-6 py-4 font-black text-xs text-brand-lime cursor-pointer hover:underline" onClick={() => navigate(`${basePath}/invoices/${inv._id}`)} style={{ color: 'var(--brand-lime)' }}>{inv.invoiceNumber}</td>
                                        <td className="px-6 py-4 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>{formatPeriod(inv)}</td>
                                        <td className="px-6 py-4 text-right text-xs font-black" style={{ color: 'var(--text-main)' }}>${inv.totalAmountDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="px-6 py-4 text-right text-xs font-bold text-rose-400" style={{ color: 'var(--status-failed)' }}>${inv.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                                                inv.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                                inv.status === 'PARTIAL' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                                                'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                            }`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); navigate(`${basePath}/invoices/${inv._id}`); }}
                                                className="p-1.5 rounded-lg hover:bg-white/10 text-brand-lime transition-all cursor-pointer inline-flex items-center justify-center"
                                                title="View Invoice Detail"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center px-6 py-3 border rounded-2xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <span className="text-[10px] font-bold" style={{ color: 'var(--text-dim)' }}>
                        Showing {Math.min(filtered.length, (page - 1) * limit + 1)}-{Math.min(filtered.length, page * limit)} of {filtered.length} Invoices
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="p-1.5 border rounded-xl hover:bg-[var(--sidebar-hover)] active:scale-95 transition-all disabled:opacity-30 text-[var(--text-main)] cursor-pointer flex items-center justify-center"
                            style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs font-black px-3 py-1 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl" style={{ color: 'var(--text-main)' }}>
                            {page} / {totalPages}
                        </span>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="p-1.5 border rounded-xl hover:bg-[var(--sidebar-hover)] active:scale-95 transition-all disabled:opacity-30 text-[var(--text-main)] cursor-pointer flex items-center justify-center"
                            style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const PaymentsTab = ({ payments }: { payments: any[] }) => {
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const limit = 10;

    // Reset page when search constraints modify
    useEffect(() => {
        setPage(1);
    }, [search]);

    const filtered = useMemo(() => {
        return payments.filter(pmt => {
            const num = (pmt.paymentNumber || '').toLowerCase();
            const method = (pmt.paymentMethod || '').toLowerCase();
            const status = (pmt.status || '').toLowerCase();
            const query = search.toLowerCase();
            return num.includes(query) || method.includes(query) || status.includes(query);
        }).sort((a, b) => {
            return new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime();
        });
    }, [payments, search]);

    const paginated = useMemo(() => {
        const start = (page - 1) * limit;
        return filtered.slice(start, start + limit);
    }, [filtered, page]);

    const totalPages = Math.ceil(filtered.length / limit) || 1;

    return (
        <div className="space-y-4">
            {/* Search Input */}
            <div className="relative max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" size={14} style={{ color: 'var(--text-dim)' }} />
                <input
                    type="text"
                    placeholder="Search payment receipt, method or status..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-xl outline-none text-xs font-semibold focus:border-brand-lime/30 transition-all"
                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                />
                {search && (
                    <button 
                        onClick={() => setSearch('')} 
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 hover:text-white transition-colors text-xs font-bold bg-transparent border-none cursor-pointer"
                        style={{ color: 'var(--text-dim)' }}
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="rounded-[2rem] border overflow-hidden animate-in fade-in duration-300 shadow-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b" style={{ borderColor: 'var(--border-main)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>PR #</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Date</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Method</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Total Received</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Amount Applied</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Prepayment Extra</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                            {paginated.length === 0 ? (
                                <tr><td colSpan={7} className="p-16 text-center text-xs font-bold" style={{ color: 'var(--text-dim)' }}>No payments found matching criteria.</td></tr>
                            ) : (
                                paginated.map((pmt) => {
                                    const applied = pmt.invoices?.reduce((s: number, i: any) => s + (i.amountApplied || 0), 0) || 0;
                                    const extra = Math.max(0, pmt.amountReceived - applied);
                                    return (
                                        <tr key={pmt._id} className="hover:bg-white/[0.02] transition-all" style={{ borderBottom: '1px solid var(--border-main)' }}>
                                            <td className="px-6 py-4 font-black text-xs" style={{ color: 'var(--text-main)' }}>{pmt.paymentNumber}</td>
                                            <td className="px-6 py-4 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>{formatDate(pmt.paymentDate)}</td>
                                            <td className="px-6 py-4 text-xs font-bold text-brand-lime uppercase" style={{ color: 'var(--brand-lime)' }}>{pmt.paymentMethod}</td>
                                            <td className="px-6 py-4 text-right text-xs font-black text-emerald-400" style={{ color: 'var(--status-active)' }}>+ ${pmt.amountReceived.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="px-6 py-4 text-right text-xs font-bold text-white">${applied.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className={`px-6 py-4 text-right text-xs font-black ${extra > 0 ? 'text-[#C8E600]' : 'text-dim'}`}>
                                                {extra > 0 ? `$${extra.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest">
                                                    {pmt.status}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center px-6 py-3 border rounded-2xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <span className="text-[10px] font-bold" style={{ color: 'var(--text-dim)' }}>
                        Showing {Math.min(filtered.length, (page - 1) * limit + 1)}-{Math.min(filtered.length, page * limit)} of {filtered.length} Payments
                    </span>
                    <div className="flex items-center gap-1.5">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="p-1.5 border rounded-xl hover:bg-[var(--sidebar-hover)] active:scale-95 transition-all disabled:opacity-30 text-[var(--text-main)] cursor-pointer flex items-center justify-center"
                            style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs font-black px-3 py-1 bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl" style={{ color: 'var(--text-main)' }}>
                            {page} / {totalPages}
                        </span>
                        <button
                            disabled={page === totalPages}
                            onClick={() => setPage(p => p + 1)}
                            className="p-1.5 border rounded-xl hover:bg-[var(--sidebar-hover)] active:scale-95 transition-all disabled:opacity-30 text-[var(--text-main)] cursor-pointer flex items-center justify-center"
                            style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

function StatementsTab({ invoices, payments, creditNotes, customerId }: { invoices: Invoice[]; payments: any[]; creditNotes: any[]; customerId: string }) {
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');
    const [downloading, setDownloading] = useState(false);
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [dlFrom, setDlFrom] = useState('');
    const [dlTo, setDlTo] = useState('');

    const fmtDate = (d: Date) => {
        const day = String(d.getDate()).padStart(2, '0');
        const mon = String(d.getMonth() + 1).padStart(2, '0');
        return `${day}/${mon}/${d.getFullYear()}`;
    };

    const viewStart = filterFrom ? (() => { const d = new Date(filterFrom); d.setHours(0,0,0,0); return d; })() : null;
    const viewEnd = filterTo ? (() => { const d = new Date(filterTo); d.setHours(23,59,59,999); return d; })() : null;

    const validPayments = payments.filter(p => p.status !== 'VOID');

    const filterStart = viewStart || new Date(0);
    const invoicesBefore = viewStart ? invoices.filter(inv => {
        const d = new Date(inv.dueDate || inv.generatedAt || inv.createdAt || 0);
        return d < filterStart;
    }) : [];
    const paymentsBefore = viewStart ? validPayments.filter(pmt => {
        const d = new Date(pmt.paymentDate || pmt.createdAt || 0);
        return d < filterStart;
    }) : [];
    const creditNotesBefore = viewStart ? creditNotes.filter(cn => {
        const d = new Date(cn.creditNoteDate || cn.createdAt || 0);
        return d < filterStart;
    }) : [];
    const totalInvoicedBefore = invoicesBefore.reduce((sum, inv) => sum + (inv.totalAmountDue || 0), 0);
    const totalPaidBefore = paymentsBefore.reduce((sum, pmt) => sum + (pmt.amountReceived || 0), 0);
    const totalCreditNotesBefore = creditNotesBefore.reduce((sum, cn) => sum + (cn.amount || 0), 0);
    const openingBalance = totalInvoicedBefore - totalPaidBefore - totalCreditNotesBefore;

    interface StatementRow {
        date: Date;
        type: 'opening' | 'invoice' | 'payment' | 'credit_note';
        transactionLabel: string;
        detailLine1: string;
        detailLine2: string;
        amount: number;
        payment: number;
        balance: number;
        sortKey: number;
    }

    const rows: StatementRow[] = [];

    const isInRange = (d: Date) => {
        if (viewStart && d < viewStart) return false;
        if (viewEnd && d > viewEnd) return false;
        return true;
    };

    invoices.forEach(inv => {
        const d = new Date(inv.dueDate || inv.generatedAt || inv.createdAt || 0);
        if (!isInRange(d)) return;
        rows.push({
            date: d, type: 'invoice', transactionLabel: 'Invoice',
            detailLine1: `${inv.invoiceNumber} - due on ${fmtDate(d)}`,
            detailLine2: '',
            amount: inv.totalAmountDue || 0, payment: 0, balance: 0,
            sortKey: d.getTime()
        });
    });

    validPayments.forEach(pmt => {
        const d = new Date(pmt.paymentDate || pmt.createdAt || 0);
        if (!isInRange(d)) return;
        
        if (pmt.invoices && pmt.invoices.length > 0) {
            const detailsArray = pmt.invoices.map((invApp: any) => 
                `$${(invApp.amountApplied || 0).toFixed(2)} to ${invApp.invoiceNumber || 'INV'}`
            );
            
            const totalApplied = pmt.invoices.reduce((sum: number, inv: any) => sum + (inv.amountApplied || 0), 0);
            const excess = (pmt.amountReceived || 0) - totalApplied;
            
            if (excess > 0.01) {
                detailsArray.push(`$${excess.toFixed(2)} prepayment credit`);
            }
            
            rows.push({
                date: d,
                type: 'payment',
                transactionLabel: 'Payment Received',
                detailLine1: pmt.paymentNumber || pmt.referenceNumber || '—',
                detailLine2: `Applied: ${detailsArray.join(", ")}`,
                amount: 0,
                payment: pmt.amountReceived || 0,
                balance: 0,
                sortKey: d.getTime() + 1
            });
        } else {
            rows.push({
                date: d,
                type: 'payment',
                transactionLabel: 'Payment Received',
                detailLine1: pmt.paymentNumber || pmt.referenceNumber || '—',
                detailLine2: `$${(pmt.amountReceived || 0).toFixed(2)} received via ${pmt.paymentMethod || 'Other'}`,
                amount: 0,
                payment: pmt.amountReceived || 0,
                balance: 0,
                sortKey: d.getTime() + 1
            });
        }
    });

    creditNotes.forEach(cn => {
        const d = new Date(cn.creditNoteDate || cn.createdAt || 0);
        if (!isInRange(d)) return;
        rows.push({
            date: d, type: 'credit_note', transactionLabel: 'Credit Note',
            detailLine1: cn.creditNoteNumber || '—',
            detailLine2: cn.reason ? `Reason: ${cn.reason}` : 'Credit Note Issued',
            amount: 0, payment: cn.amount || 0, balance: 0,
            sortKey: d.getTime() + 1
        });
    });

    rows.sort((a, b) => a.sortKey - b.sortKey);

    let runningBal = openingBalance;
    rows.forEach(row => {
        runningBal += row.amount - row.payment;
        row.balance = runningBal;
    });

    const closingBalance = rows.length > 0 ? rows[rows.length - 1].balance : openingBalance;
    const displayRows = [...rows].reverse();

    const handleDownloadPdf = async () => {
        setDownloading(true);
        setShowDownloadModal(false);
        const toastId = toast.loading('Generating statement PDF...');
        try {
            const params: any = {};
            if (dlFrom) params.fromDate = dlFrom;
            if (dlTo) params.toDate = dlTo;
            const res = await api.get(`/api/customers/${customerId}/statement/monthly-pdf`, {
                params, responseType: 'blob'
            });
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute('download', `statement_${dateStr}.pdf`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success('Statement PDF downloaded!', { id: toastId });
        } catch (err: any) {
            console.error('Failed to download statement PDF:', err);
            toast.error(err?.response?.data?.message || 'Failed to generate statement PDF', { id: toastId });
        } finally {
            setDownloading(false);
        }
    };

    const hasFilter = filterFrom || filterTo;

    return (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
            {/* Filter Bar + Download */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <Filter size={14} style={{ color: 'var(--text-dim)' }} />
                    <div className="space-y-0.5">
                        <label className="text-[9px] font-black uppercase tracking-widest block" style={{ color: 'var(--text-dim)' }}>From</label>
                        <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold outline-none border focus:border-brand-lime transition-all"
                            style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>
                    <div className="space-y-0.5">
                        <label className="text-[9px] font-black uppercase tracking-widest block" style={{ color: 'var(--text-dim)' }}>To</label>
                        <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold outline-none border focus:border-brand-lime transition-all"
                            style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>
                    {hasFilter && (
                        <button onClick={() => { setFilterFrom(''); setFilterTo(''); }}
                            className="p-1.5 rounded-lg border transition-all hover:bg-white/5 active:scale-95 cursor-pointer mt-3"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                            title="Clear filters"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                <button onClick={() => { setDlFrom(filterFrom); setDlTo(filterTo); setShowDownloadModal(true); }}
                    disabled={downloading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-black font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: 'var(--brand-lime)' }}
                >
                    <Download size={14} />
                    {downloading ? 'Generating...' : 'Download PDF'}
                </button>
            </div>

            {/* Statement Table */}
            <div className="rounded-[2rem] border overflow-hidden shadow-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b" style={{ borderColor: 'var(--border-main)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Date</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Transactions</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Details</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Amount</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Payments</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                            {/* Balance Due at top */}
                            <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-main)' }}>
                                <td colSpan={4}></td>
                                <td className="px-6 py-4 text-right text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>
                                    Balance Due
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-black" style={{ color: closingBalance > 0 ? '#EF4444' : '#10B981' }}>
                                    $ {closingBalance.toFixed(2)}
                                </td>
                            </tr>

                            {displayRows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-xs font-bold" style={{ color: 'var(--text-dim)' }}>
                                        No transactions found{hasFilter ? ' for the selected date range' : ''}.
                                    </td>
                                </tr>
                            ) : (
                                displayRows.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-white/[0.02] transition-all" style={{ borderBottom: '1px solid var(--border-main)' }}>
                                        <td className="px-6 py-4 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>{fmtDate(row.date)}</td>
                                        <td className="px-6 py-4 text-xs font-bold" style={{ color: row.type === 'invoice' ? 'var(--text-main)' : 'var(--brand-lime)' }}>
                                            {row.transactionLabel}
                                        </td>
                                        <td className="px-6 py-4 whitespace-normal max-w-[280px]">
                                            <div className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{row.detailLine1}</div>
                                            {row.detailLine2 && (
                                                <div className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--text-dim)' }}>{row.detailLine2}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs font-black" style={{ color: 'var(--text-main)' }}>
                                            {row.amount > 0 ? row.amount.toFixed(2) : ''}
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs font-black text-emerald-400">
                                            {row.payment > 0 ? row.payment.toFixed(2) : ''}
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs font-black" style={{ color: 'var(--text-main)' }}>
                                            {row.balance.toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            )}

                            {/* Opening Balance Row at the bottom of the table when date filtered */}
                            {viewStart && (
                                <tr style={{ borderBottom: '1px solid var(--border-main)', backgroundColor: 'rgba(200, 230, 0, 0.03)' }}>
                                    <td className="px-6 py-4 text-xs font-bold" style={{ color: 'var(--text-dim)' }}>{fmtDate(viewStart)}</td>
                                    <td className="px-6 py-4 text-xs font-black" style={{ color: 'var(--text-main)' }}>***Opening Balance***</td>
                                    <td className="px-6 py-4"></td>
                                    <td className="px-6 py-4 text-right text-xs font-black" style={{ color: 'var(--text-main)' }}>
                                        {openingBalance > 0 ? openingBalance.toFixed(2) : ''}
                                    </td>
                                    <td className="px-6 py-4"></td>
                                    <td className="px-6 py-4 text-right text-xs font-black" style={{ color: 'var(--text-main)' }}>
                                        {openingBalance.toFixed(2)}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Download Modal with separate date filters */}
            {showDownloadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-all">
                    <div className="w-full max-w-md p-8 rounded-[2rem] border shadow-2xl relative animate-in zoom-in-95 duration-200" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between pb-4 mb-6 border-b" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-2">
                                <FileText className="text-brand-lime" size={20} style={{ color: 'var(--brand-lime)' }} />
                                <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Download Statement PDF</h3>
                            </div>
                            <button onClick={() => setShowDownloadModal(false)} className="text-dim hover:text-white transition-all text-lg font-bold cursor-pointer" style={{ color: 'var(--text-dim)' }}>&times;</button>
                        </div>

                        <div className="space-y-5">
                            <p className="text-[11px] font-medium leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                                Select a date range for the PDF statement. Leave empty to download the full statement with all transactions.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>From Date</label>
                                    <input type="date" value={dlFrom} onChange={e => setDlFrom(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl text-xs font-bold outline-none border focus:border-brand-lime transition-all"
                                        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>To Date</label>
                                    <input type="date" value={dlTo} onChange={e => setDlTo(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl text-xs font-bold outline-none border focus:border-brand-lime transition-all"
                                        style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                <button onClick={() => setShowDownloadModal(false)}
                                    className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-all border cursor-pointer"
                                    style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}
                                >Cancel</button>
                                <button onClick={handleDownloadPdf}
                                    className="px-6 py-2.5 rounded-xl text-black font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl cursor-pointer"
                                    style={{ background: 'var(--brand-lime)' }}
                                >Download PDF</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const CreditNotesTab = ({ creditNotes, navigate, basePath }: { creditNotes: CreditNote[]; navigate: any; basePath: string }) => (
    <div className="rounded-[2rem] border overflow-hidden animate-in slide-in-from-bottom-2 duration-300 shadow-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--border-main)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Note #</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Date</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Reason</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Amount</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Status</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                    {creditNotes.length === 0 ? (
                        <tr><td colSpan={6} className="p-20 text-center text-xs font-bold" style={{ color: 'var(--text-dim)' }}>No credit notes issued for this customer.</td></tr>
                    ) : (
                        creditNotes.map((cn) => (
                            <tr key={cn._id} className="hover:bg-white/[0.02] transition-all" style={{ borderBottom: '1px solid var(--border-main)' }}>
                                <td className="px-6 py-4 font-black text-xs text-brand-lime cursor-pointer hover:underline" onClick={() => navigate(`${basePath}/credit-notes/${cn._id}`)} style={{ color: 'var(--brand-lime)' }}>{cn.creditNoteNumber}</td>
                                <td className="px-6 py-4 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>{formatDate(cn.creditNoteDate)}</td>
                                <td className="px-6 py-4 text-xs font-bold italic truncate max-w-[200px]" style={{ color: 'var(--text-dim)' }}>{cn.reason}</td>
                                <td className="px-6 py-4 text-right text-xs font-black text-indigo-400">− ${cn.amount.toLocaleString()}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                                        cn.status === 'APPLIED' || cn.status === 'CLOSED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                                        cn.status === 'OPEN' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 
                                        'bg-white/5 text-dim border-white/10'
                                    }`}>
                                        {cn.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); navigate(`${basePath}/credit-notes/${cn._id}`); }}
                                        className="p-1.5 rounded-lg hover:bg-white/10 text-brand-lime transition-all cursor-pointer inline-flex items-center justify-center"
                                        title="View Credit Note Detail"
                                    >
                                        <Eye size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

const DebitNotesTab = ({ debitNotes, navigate, basePath }: { debitNotes: any[]; navigate: any; basePath: string }) => (
    <div className="rounded-[2rem] border overflow-hidden animate-in slide-in-from-bottom-2 duration-300 shadow-lg" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
        <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--border-main)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Debit Note #</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Date</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Reason</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Amount ($)</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Paid ($)</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Balance ($)</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Status</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                    {debitNotes.length === 0 ? (
                        <tr><td colSpan={8} className="p-20 text-center text-xs font-bold" style={{ color: 'var(--text-dim)' }}>No debit notes issued for this customer.</td></tr>
                    ) : (
                        debitNotes.map((dn) => (
                            <tr key={dn._id} className="hover:bg-white/[0.02] transition-all" style={{ borderBottom: '1px solid var(--border-main)' }}>
                                <td className="px-6 py-4 font-black text-xs text-brand-lime cursor-pointer hover:underline" onClick={() => navigate(`${basePath}/debit-notes/${dn._id}`)} style={{ color: 'var(--brand-lime)' }}>{dn.debitNoteNumber}</td>
                                <td className="px-6 py-4 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>{dn.debitNoteDate ? formatDate(dn.debitNoteDate) : 'N/A'}</td>
                                <td className="px-6 py-4 text-xs font-bold italic truncate max-w-[200px]" style={{ color: 'var(--text-dim)' }}>{dn.reason}</td>
                                <td className="px-6 py-4 text-right text-xs font-black text-amber-400">${(dn.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                <td className="px-6 py-4 text-right text-xs font-bold text-emerald-400">${(dn.amountPaid !== undefined ? dn.amountPaid : (dn.status === 'PAID' ? dn.amount : 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                <td className="px-6 py-4 text-right text-xs font-black text-rose-400">${(dn.balance !== undefined ? dn.balance : (dn.status === 'PAID' ? 0 : dn.amount)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                        dn.status === 'PAID' || dn.status === 'CLOSED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                        dn.status === 'PARTIAL' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                        dn.status === 'OVERDUE' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                        dn.status === 'CANCELLED' || dn.status === 'VOID' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                                        dn.status === 'DRAFT' ? 'bg-gray-500/10 text-gray-400 border border-gray-500/20' :
                                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    }`}>
                                        {dn.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); navigate(`${basePath}/debit-notes/${dn._id}`); }}
                                        className="p-1.5 rounded-lg hover:bg-white/10 text-brand-lime transition-all cursor-pointer inline-flex items-center justify-center"
                                        title="View Debit Note Detail"
                                    >
                                        <Eye size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   UI HELPERS
   ───────────────────────────────────────────────────────────────────────────── */

const SectionCard = ({ title, icon, children }: any) => (
    <div className="p-6 rounded-[1.8rem] border shadow-xl flex flex-col" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
        <div className="flex items-center gap-2 pb-4 mb-4 border-b" style={{ borderColor: 'var(--border-main)' }}>
            <div className="p-2 rounded-xl bg-brand-lime/10 text-brand-lime" style={{ color: 'var(--brand-lime)' }}>{icon}</div>
            <h3 className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>{title}</h3>
        </div>
        {children}
    </div>
);

const InfoRow = ({ label, value, icon }: any) => (
    <div className="space-y-1">
        <p className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}>
            {icon} {label}
        </p>
        <p className="text-xs font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>{value || '—'}</p>
    </div>
);

const SummaryCard = ({ label, value, icon, color = 'brand-lime' }: any) => (
    <div className="p-6 rounded-[2rem] border shadow-xl relative overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
        <div className={`p-2 rounded-xl w-fit mb-4 ${color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' : color === 'rose' ? 'bg-rose-500/10 text-rose-500' : 'bg-brand-lime/10 text-brand-lime'}`}>
            {icon}
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: 'var(--text-dim)' }}>{label}</p>
        <p className="text-2xl font-black tracking-tighter" style={{ color: 'var(--text-main)' }}>{value}</p>
    </div>
);

const QuickStatCard = ({ label, value, icon, color }: any) => (
    <div className="p-4 rounded-2xl border shadow-sm flex items-center gap-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
        <div className={`p-2.5 rounded-xl ${color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' : color === 'rose' ? 'bg-rose-500/10 text-rose-500' : 'bg-white/5 text-dim'}`}>
            {icon}
        </div>
        <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>{label}</span>
            <span className={`text-xs font-black uppercase ${color === 'emerald' ? 'text-emerald-500' : color === 'rose' ? 'text-rose-500' : ''}`} style={!color ? { color: 'var(--text-main)' } : {}}>
                {value}
            </span>
        </div>
    </div>
);

export default CustomerDetail;
