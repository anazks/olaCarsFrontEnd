import { useState, useEffect, useCallback, useRef } from 'react';
import { Car, X, Check, AlertCircle, DollarSign, Plus } from 'lucide-react';
import { createVehicle } from '../../../services/vehicleService';
import type { CreateVehiclePayload, PaymentMethod } from '../../../services/vehicleService';
import { getVehiclePurchaseOrders } from '../../../services/purchaseOrderService';
import type { PurchaseOrder } from '../../../services/purchaseOrderService';
import { useNavigate } from 'react-router-dom';
import { getAllFinanceStaff, type FinanceStaff, getNextFleetNumber, checkFleetAvailability } from '../../../services/financeStaffService';
import { getAllBranches, type Branch } from '../../../services/branchService';
import toast from 'react-hot-toast';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

// ── Shared UI Constants ──────────────────────────────────────────────────────

const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'Bank Transfer', 'Finance'];
const VEHICLE_CONDITIONS: string[] = ['New', 'Used'];

const inputStyle = { background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' };
const inputClass = 'w-full px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-lime transition-all text-sm';
const readOnlyStyle = { background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-main)', color: 'var(--text-dim)', cursor: 'not-allowed' };

const FormField = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
    <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        {children}
    </div>
);

// ── Component ─────────────────────────────────────────────────────────────────

const CreateVehicle = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Data handling
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [financeStaff, setFinanceStaff] = useState<FinanceStaff[]>([]);
    
    // Loading states
    const [branchesLoading, setBranchesLoading] = useState(false);
    const [posLoading, setPosLoading] = useState(false);
    const [staffLoading, setStaffLoading] = useState(false);
    const [nextFleetLoading, setNextFleetLoading] = useState(false);

    // Selection states
    const [selectedStaffObj, setSelectedStaffObj] = useState<FinanceStaff | null>(null);
    const [isAddingNewFleet, setIsAddingNewFleet] = useState(false);
    const [fleetError, setFleetError] = useState<string | null>(null);
    const [isCheckingFleet, setIsCheckingFleet] = useState(false);
    const fleetInputRef = useRef<HTMLInputElement>(null);

    // Form state
    const [formData, setFormData] = useState<Partial<CreateVehiclePayload>>({
        purchaseDetails: {
            vendorName: '',
            purchaseDate: new Date().toISOString().split('T')[0],
            purchasePrice: 0,
            currency: 'USD',
            paymentMethod: 'Cash',
            branch: '',
            purchaseOrder: '',
        },
        handlingStaff: '',
        basicDetails: {
            fleetNumber: '',
            condition: 'New'
        } as any
    });

    const hasSelectedPO = Boolean(formData.purchaseDetails?.purchaseOrder);

    const fetchInitialData = useCallback(async () => {
        setBranchesLoading(true);
        try {
            const res = await getAllBranches({ status: 'ACTIVE', limit: 500 });
            setBranches(res.data || []);
        } catch (err) {
            console.error('Failed to fetch branches:', err);
        } finally {
            setBranchesLoading(false);
        }
    }, []);

    // Fleet number uniqueness check
    useEffect(() => {
        const fleetNum = formData.basicDetails?.fleetNumber;
        if (!fleetNum || !isAddingNewFleet) {
            setFleetError(null);
            return;
        }

        const timer = setTimeout(async () => {
            setIsCheckingFleet(true);
            try {
                const res = await checkFleetAvailability(fleetNum);
                if (!res.available && res.staffId !== formData.handlingStaff) {
                    setFleetError(`Fleet ${fleetNum} is already assigned to ${res.assignedTo}`);
                } else {
                    setFleetError(null);
                }
            } catch (err) {
                console.error('Fleet check failed:', err);
            } finally {
                setIsCheckingFleet(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [formData.basicDetails?.fleetNumber, isAddingNewFleet, formData.handlingStaff]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    // ── Handlers ────────────────────────────────────────────────────────────

    const handleBranchChange = async (branchId: string) => {
        // Reset dependent fields
        setFormData(prev => ({
            ...prev,
            purchaseDetails: {
                ...prev.purchaseDetails!,
                branch: branchId,
                purchaseOrder: '',
                vendorName: '',
                purchasePrice: 0,
                purchaseDate: new Date().toISOString().split('T')[0],
            },
            handlingStaff: '',
            basicDetails: { ...prev.basicDetails, fleetNumber: '' } as any
        }));
        setSelectedStaffObj(null);
        setPurchaseOrders([]);
        setFinanceStaff([]);

        if (!branchId) return;

        // Fetch POs for this branch
        setPosLoading(true);
        try {
            const posResponse = await getVehiclePurchaseOrders(1, 100, branchId);
            const posData = (posResponse as any).data || posResponse;
            setPurchaseOrders(Array.isArray(posData) ? posData.filter((po: any) => po.status === 'APPROVED') : []);
        } catch (err) {
            console.error('Failed to fetch POs:', err);
        } finally {
            setPosLoading(false);
        }

        // Fetch Staff for this branch
        setStaffLoading(true);
        try {
            const staffRes = await getAllFinanceStaff({ branchId: branchId, limit: 200 });
            setFinanceStaff(staffRes.data || []);
        } catch (err) {
            console.error('Failed to fetch staff:', err);
        } finally {
            setStaffLoading(false);
        }
    };

    const handlePOChange = (poId: string) => {
        const selectedPO = purchaseOrders.find(p => p._id === poId);
        if (selectedPO) {
            const vendorName = typeof selectedPO.supplier === 'object' ? selectedPO.supplier.name : 'Unknown Supplier';
            const branchId = typeof selectedPO.branch === 'object' ? selectedPO.branch._id : selectedPO.branch;
            const poDate = selectedPO.purchaseOrderDate ? new Date(selectedPO.purchaseOrderDate).toISOString().split('T')[0] : '';

            setFormData(prev => ({
                ...prev,
                purchaseDetails: {
                    ...prev.purchaseDetails!,
                    purchaseOrder: poId,
                    vendorName,
                    branch: branchId || prev.purchaseDetails?.branch || '',
                    purchasePrice: selectedPO.totalAmount || 0,
                    purchaseDate: poDate || new Date().toISOString().split('T')[0],
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                purchaseDetails: {
                    ...prev.purchaseDetails!,
                    purchaseOrder: '',
                    branch: prev.purchaseDetails?.branch || '',
                    purchaseDate: prev.purchaseDetails?.purchaseDate || new Date().toISOString().split('T')[0],
                }
            }));
        }
    };

    const updatePurchase = (key: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            purchaseDetails: { ...prev.purchaseDetails!, [key]: value },
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const p = formData.purchaseDetails;
        if (!p?.branch) { setError('Branch is required'); return; }
        if (!formData.handlingStaff) { setError('Handling Staff is required'); return; }
        if (p?.purchasePrice === undefined || p?.purchasePrice === null || Number(p.purchasePrice) < 0) {
            setError('Valid purchase price is required');
            return;
        }
        if (!p?.purchaseDate) {
            setError('Purchase date is required');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const payload: CreateVehiclePayload = {
                ...formData as CreateVehiclePayload,
                purchaseDetails: {
                    ...formData.purchaseDetails!,
                    purchaseOrder: p.purchaseOrder?.trim() ? p.purchaseOrder.trim() : undefined,
                    vendorName: p.vendorName?.trim() || 'Direct Acquisition',
                    purchasePrice: Number(p.purchasePrice) || 0,
                    purchaseDate: p.purchaseDate || new Date().toISOString().split('T')[0],
                }
            };

            await createVehicle(payload);
            setSuccess(true);
            setTimeout(() => navigate('../pending-vehicles'), 1500);
        } catch (err: any) {
            const serverMsg = err.response?.data?.message;
            const errType = err.response?.data?.errorType;
            
            if (errType === 'DUPLICATE_FLEET') {
                toast.error(serverMsg || 'Fleet number already in use');
                setFleetError(serverMsg);
                setIsAddingNewFleet(true);
                setTimeout(() => {
                    fleetInputRef.current?.focus();
                }, 100);
            } else {
                setError(serverMsg || err.message || 'Failed to create vehicle');
            }
        } finally {
            setLoading(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    if (success) {
        return (
            <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-20 text-center space-y-4">
                <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Vehicles', path: '../vehicles' }, { label: 'Create New Vehicle', active: true }]} />

                <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center">
                    <Check size={40} />
                </div>
                <h1 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>Vehicle Created!</h1>
                <p style={{ color: 'var(--text-dim)' }}>Redirecting to pending vehicles...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Vehicles', path: '../vehicles' }, { label: 'Create New Vehicle', active: true }]} />

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-lg font-bold flex items-center gap-2.5" style={{ color: 'var(--text-main)' }}>
                        <Car size={26} style={{ color: 'var(--brand-lime)' }} />
                        Create New Vehicle
                    </h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-dim)' }}>
                        Enter purchase details directly or link an approved Purchase Order
                    </p>
                </div>
                <button
                    onClick={() => navigate('../pending-vehicles')}
                    className="p-2.5 rounded-xl transition-all border hover:bg-white/5 cursor-pointer"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                >
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="rounded-2xl border p-6 space-y-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--brand-lime)' }}>
                        <DollarSign size={18} />
                        <h2 className="font-semibold uppercase tracking-wider text-xs">Purchase Information</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField label="Branch" required>
                            <select
                                required
                                value={formData.purchaseDetails?.branch || ''}
                                onChange={(e) => handleBranchChange(e.target.value)}
                                className={inputClass}
                                style={inputStyle}
                                disabled={branchesLoading}
                            >
                                <option value="">{branchesLoading ? 'Loading branches...' : 'Select a branch'}</option>
                                {branches.map(b => (
                                    <option key={b._id} value={b._id}>{b.name} — {b.city}</option>
                                ))}
                            </select>
                        </FormField>

                        <FormField label="Purchase Order (Optional)">
                            <div className="space-y-1.5">
                                <select
                                    value={formData.purchaseDetails?.purchaseOrder || ''}
                                    onChange={(e) => handlePOChange(e.target.value)}
                                    className={inputClass}
                                    style={inputStyle}
                                    disabled={posLoading || !formData.purchaseDetails?.branch}
                                >
                                    <option value="">
                                        {!formData.purchaseDetails?.branch 
                                            ? 'Select a branch first' 
                                            : posLoading 
                                                ? 'Loading POs...' 
                                                : 'None (Create without PO)'}
                                    </option>
                                    {purchaseOrders.map(po => (
                                        <option key={po._id} value={po._id}>
                                            {po.purchaseOrderNumber} {typeof po.supplier === 'object' && (po.supplier as any)?.name ? `(${(po.supplier as any).name})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {hasSelectedPO ? (
                                    <div className="flex items-center gap-1.5 text-xs font-medium px-1" style={{ color: 'var(--brand-lime)' }}>
                                        <Check size={13} /> Linked to Purchase Order. Vendor and pricing details are auto-filled.
                                    </div>
                                ) : formData.purchaseDetails?.branch ? (
                                    <div className="text-[11px] text-dim px-1">
                                        Optional: Select an approved PO to auto-fill, or proceed without PO.
                                    </div>
                                ) : null}
                            </div>
                        </FormField>

                        <FormField label="Handling Staff (Finance)" required>
                            <select
                                required
                                value={formData.handlingStaff || ''}
                                onChange={async (e) => {
                                    const sId = e.target.value;
                                    const s = financeStaff.find(st => st._id === sId) || null;
                                    setSelectedStaffObj(s);
                                    
                                    let fleetToAssign = '';
                                    
                                    if (sId) {
                                        if (s?.fleetNumbers && s.fleetNumbers.length > 0) {
                                            fleetToAssign = s.fleetNumbers[0];
                                            setIsAddingNewFleet(false);
                                        } else {
                                            setIsAddingNewFleet(true);
                                            setNextFleetLoading(true);
                                            try {
                                                const suggested = await getNextFleetNumber();
                                                fleetToAssign = suggested;
                                            } catch (err) {
                                                console.error('Failed to fetch next fleet number:', err);
                                            } finally {
                                                setNextFleetLoading(false);
                                            }
                                        }
                                    }

                                    setFormData(prev => ({
                                        ...prev,
                                        handlingStaff: sId,
                                        basicDetails: {
                                            ...prev.basicDetails,
                                            fleetNumber: fleetToAssign
                                        } as any
                                    }));
                                }}
                                className={inputClass}
                                style={inputStyle}
                                disabled={staffLoading || !formData.purchaseDetails?.branch}
                            >
                                <option value="">
                                    {!formData.purchaseDetails?.branch 
                                        ? 'Select a branch first' 
                                        : staffLoading 
                                            ? 'Loading Staff...' 
                                            : financeStaff.length === 0 
                                                ? 'No finance staff found' 
                                                : 'Select Handling Staff'}
                                </option>
                                {financeStaff.map(s => (
                                    <option key={s._id} value={s._id}>
                                        {s.fullName} {(s.fleetNumbers && s.fleetNumbers.length > 0) ? `(Fleets: ${s.fleetNumbers.join(', ')})` : '(No Fleet Assigned)'}
                                    </option>
                                ))}
                            </select>
                        </FormField>

                        <FormField label="Assign Fleet Number" required={!!formData.handlingStaff}>
                            {(!isAddingNewFleet && selectedStaffObj?.fleetNumbers && selectedStaffObj.fleetNumbers.length > 0) ? (
                                <div className="space-y-2">
                                    <select
                                        value={formData.basicDetails?.fleetNumber || ''}
                                        onChange={(e) => setFormData(prev => ({
                                            ...prev,
                                            basicDetails: { ...prev.basicDetails, fleetNumber: e.target.value } as any
                                        }))}
                                        className={inputClass}
                                        style={inputStyle}
                                        required={!!formData.handlingStaff}
                                    >
                                        <option value="">Select an existing fleet number</option>
                                        {selectedStaffObj.fleetNumbers.map((fn, idx) => (
                                            <option key={idx} value={fn}>{fn}</option>
                                        ))}
                                    </select>
                                    <button 
                                        type="button"
                                        onClick={async () => {
                                            setIsAddingNewFleet(true);
                                            setNextFleetLoading(true);
                                            setFormData(prev => ({
                                                ...prev,
                                                basicDetails: { ...prev.basicDetails, fleetNumber: '' } as any
                                            }));
                                            try {
                                                const suggested = await getNextFleetNumber();
                                                setFormData(prev => ({
                                                    ...prev,
                                                    basicDetails: { ...prev.basicDetails, fleetNumber: suggested } as any
                                                }));
                                            } catch (err) {
                                                console.error('Failed to fetch next fleet number:', err);
                                            } finally {
                                                setNextFleetLoading(false);
                                            }
                                        }}
                                        className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 hover:opacity-70 transition-opacity"
                                        style={{ color: 'var(--brand-lime)' }}
                                    >
                                        <Plus size={10} /> Add New Fleet Number
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder={nextFleetLoading ? "Fetching next number..." : "Enter new fleet number"}
                                            required={!!formData.handlingStaff}
                                            readOnly={nextFleetLoading}
                                            value={formData.basicDetails?.fleetNumber || ''}
                                            onChange={(e) => setFormData(prev => ({
                                                ...prev,
                                                basicDetails: { ...prev.basicDetails, fleetNumber: e.target.value } as any
                                            }))}
                                            ref={fleetInputRef}
                                            className={inputClass}
                                            style={nextFleetLoading ? readOnlyStyle : inputStyle}
                                        />
                                        {(nextFleetLoading || isCheckingFleet) && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <div className="w-3 h-3 border-2 border-lime border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--brand-lime)', borderTopColor: 'transparent' }} />
                                            </div>
                                        )}
                                    </div>
                                    {fleetError && (
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 animate-pulse uppercase tracking-wider px-1">
                                            <AlertCircle size={10} /> {fleetError}
                                        </div>
                                    )}
                                    {selectedStaffObj?.fleetNumbers && selectedStaffObj.fleetNumbers.length > 0 && (
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                setIsAddingNewFleet(false);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    basicDetails: { ...prev.basicDetails, fleetNumber: selectedStaffObj.fleetNumbers![0] } as any
                                                }));
                                            }}
                                            className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 hover:opacity-70 transition-opacity"
                                            style={{ color: 'var(--text-dim)' }}
                                        >
                                            Select from existing fleets
                                        </button>
                                    )}
                                    {isAddingNewFleet && (
                                        <div className="text-[9px] uppercase tracking-widest opacity-50 px-1" style={{ color: 'var(--text-main)' }}>
                                            Manual Type Field (Adding new fleet to staff)
                                        </div>
                                    )}
                                </div>
                            )}
                        </FormField>

                        <FormField label={hasSelectedPO ? "Vendor Name (from PO)" : "Vendor Name"}>
                            <input
                                type="text"
                                readOnly={hasSelectedPO}
                                placeholder={hasSelectedPO ? "Auto-filled from PO" : "Enter vendor or supplier name"}
                                value={formData.purchaseDetails?.vendorName || ''}
                                onChange={(e) => updatePurchase('vendorName', e.target.value)}
                                className={inputClass}
                                style={hasSelectedPO ? readOnlyStyle : inputStyle}
                            />
                        </FormField>

                        <FormField label={hasSelectedPO ? "Purchase Date (from PO)" : "Purchase Date"} required>
                            <input
                                type="date"
                                readOnly={hasSelectedPO}
                                required
                                value={formData.purchaseDetails?.purchaseDate || ''}
                                onChange={(e) => updatePurchase('purchaseDate', e.target.value)}
                                className={inputClass}
                                style={hasSelectedPO ? readOnlyStyle : inputStyle}
                            />
                        </FormField>

                        <FormField label={hasSelectedPO ? "Purchase Price (USD) (from PO)" : "Purchase Price (USD)"} required>
                            <div className="flex gap-2">
                                <div className="px-4 py-3 rounded-xl border flex items-center text-sm" style={readOnlyStyle}>USD</div>
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    required
                                    readOnly={hasSelectedPO}
                                    placeholder="0.00"
                                    value={formData.purchaseDetails?.purchasePrice !== undefined ? formData.purchaseDetails.purchasePrice : ''}
                                    onChange={(e) => updatePurchase('purchasePrice', e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                                    className={`flex-1 ${inputClass}`}
                                    style={hasSelectedPO ? readOnlyStyle : inputStyle}
                                />
                            </div>
                        </FormField>

                        <FormField label="Payment Method" required>
                            <select
                                required
                                value={formData.purchaseDetails?.paymentMethod || 'Cash'}
                                onChange={(e) => updatePurchase('paymentMethod', e.target.value)}
                                className={inputClass}
                                style={inputStyle}
                            >
                                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </FormField>

                        <FormField label="Vehicle Condition" required>
                            <select
                                required
                                value={formData.basicDetails?.condition || 'New'}
                                onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    basicDetails: { ...prev.basicDetails, condition: e.target.value } as any
                                }))}
                                className={inputClass}
                                style={inputStyle}
                            >
                                {VEHICLE_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </FormField>
                    </div>
                </div>

                {error && (
                    <div className="p-4 rounded-xl flex items-center gap-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                        <AlertCircle size={18} /> {error}
                    </div>
                )}

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={loading || !!fleetError}
                        className="flex items-center gap-2 px-10 py-4 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                        style={{ background: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                    >
                        {loading ? 'Creating...' : 'Create Vehicle'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateVehicle;
