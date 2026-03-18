import { useState, useEffect, useCallback } from 'react';
import { Car, X, Check, AlertCircle, Info, ChevronRight, ChevronLeft, DollarSign } from 'lucide-react';
import { createVehicle } from '../../../services/vehicleService';
import type { CreateVehiclePayload, PaymentMethod, VehicleCategory, FuelType, Transmission, BodyType } from '../../../services/vehicleService';
import { getVehiclePurchaseOrders } from '../../../services/purchaseOrderService';
import type { PurchaseOrder } from '../../../services/purchaseOrderService';
import { useNavigate } from 'react-router-dom';
import { getUserRole } from '../../../utils/auth';
import { getEligibleInsurances } from '../../../services/insuranceService';
import type { Insurance } from '../../../services/insuranceService';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: VehicleCategory[] = ['Sedan', 'SUV', 'Pickup', 'Van', 'Luxury', 'Commercial'];
const FUEL_TYPES: FuelType[] = ['Petrol', 'Diesel', 'Hybrid', 'Electric'];
const TRANSMISSIONS: Transmission[] = ['Automatic', 'Manual'];
const BODY_TYPES: BodyType[] = ['Hatchback', 'Saloon', 'Coupe', 'Convertible', 'Truck'];
const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'Bank Transfer', 'Finance'];

// ── Shared Input UI (Outside to prevent re-renders losing focus) ─────────────

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
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Dropdowns
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [insurances, setInsurances] = useState<Insurance[]>([]);
    const [branchName, setBranchName] = useState<string>('');

    // Form state
    const [formData, setFormData] = useState<CreateVehiclePayload>({
        purchaseDetails: {
            vendorName: '',
            purchaseDate: '',
            purchasePrice: 0,
            currency: 'USD',
            paymentMethod: 'Cash',
            branch: '',
            purchaseOrder: '',
        },
        basicDetails: {
            make: '',
            model: '',
            year: new Date().getFullYear(),
            vin: '',
            category: 'Sedan',
            fuelType: 'Petrol',
            transmission: 'Automatic',
        },
        insuranceId: '',
    });

    const fetchData = useCallback(async () => {
        try {
            const [posResponse, insData] = await Promise.all([
                getVehiclePurchaseOrders(1, 100),
                getEligibleInsurances()
            ]);
            setPurchaseOrders(posResponse.data.filter(po => po.status === 'APPROVED'));
            setInsurances(insData);
        } catch (err) {
            console.error('Failed to fetch data:', err);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ── Helpers ────────────────────────────────────────────────────────────

    const updatePurchase = (key: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            purchaseDetails: { ...prev.purchaseDetails, [key]: value },
        }));
    };

    const updateFinance = (key: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            purchaseDetails: {
                ...prev.purchaseDetails,
                financeDetails: {
                    lenderName: '',
                    loanAmount: 0,
                    termMonths: 0,
                    monthlyInstalment: 0,
                    ...prev.purchaseDetails.financeDetails,
                    [key]: value,
                },
            },
        }));
    };

    const updateBasic = (key: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            basicDetails: { ...prev.basicDetails, [key]: value },
        }));
    };

    // When PO changes, auto-fill Vendor Name, Branch, Purchase Price, and Purchase Date
    const handlePOChange = (poId: string) => {
        const selectedPO = purchaseOrders.find(p => p._id === poId);
        if (selectedPO) {
            const vendorName = typeof selectedPO.supplier === 'object' ? selectedPO.supplier.name : 'Unknown Supplier';
            const branchId = typeof selectedPO.branch === 'object' ? selectedPO.branch._id : selectedPO.branch;
            const bName = typeof selectedPO.branch === 'object' ? `${selectedPO.branch.name} — ${selectedPO.branch.city}` : 'Specified in PO';

            // Format date to YYYY-MM-DD for the input
            const poDate = selectedPO.purchaseOrderDate ? new Date(selectedPO.purchaseOrderDate).toISOString().split('T')[0] : '';

            setBranchName(bName);
            setFormData(prev => ({
                ...prev,
                purchaseDetails: {
                    ...prev.purchaseDetails,
                    purchaseOrder: poId,
                    vendorName: vendorName,
                    branch: branchId || '',
                    purchasePrice: selectedPO.totalAmount || 0,
                    purchaseDate: poDate,
                    currency: 'USD'
                }
            }));
        } else {
            setBranchName('');
            setFormData(prev => ({
                ...prev,
                purchaseDetails: {
                    ...prev.purchaseDetails,
                    purchaseOrder: poId,
                    vendorName: '',
                    branch: '',
                    purchasePrice: 0,
                    purchaseDate: '',
                    currency: 'USD'
                }
            }));
        }
    };

    // ── Validation ──────────────────────────────────────────────────────────

    const validateStep1 = (): string | null => {
        const p = formData.purchaseDetails;
        if (!p.purchaseOrder) return 'Purchase Order is required';
        if (!p.purchaseDate) return 'Purchase date is required';
        if (p.purchasePrice <= 0) return 'Purchase price must be greater than 0';
        if (!p.branch) return 'Branch is required (ensure it is set in PO)';
        if (!formData.insuranceId) return 'Insurance selection is required';

        if (p.paymentMethod === 'Finance') {
            const f = p.financeDetails;
            if (!f?.lenderName?.trim()) return 'Lender name is required for financed vehicles';
            if (!f?.loanAmount || f.loanAmount <= 0) return 'Loan amount must be greater than 0';
        }
        return null;
    };


    const validateStep2 = (): string | null => {
        const b = formData.basicDetails;
        if (!b.make.trim()) return 'Make is required';
        if (!b.model.trim()) return 'Model is required';
        if (!b.year || b.year < 1900) return 'Valid year is required';
        if (!b.vin.trim()) return 'VIN is required';
        return null;
    };

    const handleNext = async () => {
        const err = validateStep1();
        if (err) { setError(err); return; }
        setError(null);

        const role = getUserRole();
        if (role === 'countrymanager' || role === 'branchmanager') {
            // Country Manager only completes Step 1
            setLoading(true);
            try {
                await createVehicle(formData);
                setSuccess(true);
                setTimeout(() => navigate('..'), 2000);
            } catch (err: any) {
                setError(err.response?.data?.message || err.message || 'Failed to create vehicle');
            } finally {
                setLoading(false);
            }
        } else {
            setStep(2);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const err = validateStep2();
        if (err) { setError(err); return; }

        setLoading(true);
        setError(null);
        try {
            await createVehicle(formData);
            setSuccess(true);
            setTimeout(() => navigate('..'), 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to create vehicle');
        } finally {
            setLoading(false);
        }
    };

    // ── Success Screen ───────────────────────────────────────────────────────

    if (success) {
        return (
            <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center">
                    <Check size={40} />
                </div>
                <h1 className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>Vehicle Created!</h1>
                <p style={{ color: 'var(--text-dim)' }}>Redirecting to vehicle list...</p>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                        <Car size={28} style={{ color: '#C8E600' }} />
                        Add New Vehicle
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
                        {['countrymanager', 'branchmanager'].includes(getUserRole() || '')
                            ? 'Register Vehicle Purchase'
                            : `Step ${step} of 2 — ${step === 1 ? 'Purchase Details' : 'Vehicle Specifications'}`}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/admin/country-manager')}
                    className="p-2.5 rounded-xl transition-all border hover:bg-white/5 cursor-pointer"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                >
                    <X size={20} />
                </button>
            </div>

            {/* Step Indicator (Only if not CM/BM) */}
            {!['countrymanager', 'branchmanager'].includes(getUserRole() || '') && (
                <div className="flex items-center gap-3">
                    {[1, 2].map((s) => (
                        <div key={s} className="flex items-center gap-2">
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                                style={{
                                    background: step >= s ? '#C8E600' : 'var(--bg-card)',
                                    color: step >= s ? '#0A0A0A' : 'var(--text-dim)',
                                    border: step >= s ? 'none' : '1px solid var(--border-main)',
                                }}
                            >
                                {step > s ? <Check size={14} /> : s}
                            </div>
                            <span className="text-sm font-medium hidden sm:inline" style={{ color: step >= s ? 'var(--text-main)' : 'var(--text-dim)' }}>
                                {s === 1 ? 'Purchase Details' : 'Vehicle Specs'}
                            </span>
                            {s === 1 && <div className="w-12 h-px mx-2" style={{ background: step > 1 ? '#C8E600' : 'var(--border-main)' }} />}
                        </div>
                    ))}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* ─── STEP 1: Purchase Details ───────────────────────────────── */}
                {step === 1 && (
                    <div className="rounded-2xl border p-6 space-y-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 mb-2 text-[#C8E600]">
                            <DollarSign size={18} />
                            <h2 className="font-semibold uppercase tracking-wider text-xs">Purchase Information</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField label="Purchase Order" required>
                                <select
                                    required
                                    value={formData.purchaseDetails.purchaseOrder || ''}
                                    onChange={(e) => handlePOChange(e.target.value)}
                                    className={inputClass}
                                    style={inputStyle}
                                >
                                    <option value="">Select an approved PO</option>
                                    {purchaseOrders.map(po => (
                                        <option key={po._id} value={po._id}>{po.purchaseOrderNumber}</option>
                                    ))}
                                </select>
                            </FormField>

                            <FormField label="Vendor Name (from PO)">
                                <input
                                    type="text"
                                    readOnly
                                    placeholder="Auto-filled from PO"
                                    value={formData.purchaseDetails.vendorName}
                                    className={inputClass}
                                    style={readOnlyStyle}
                                />
                            </FormField>

                            <FormField label="Purchase Date (from PO)" required>
                                <input
                                    type="date"
                                    readOnly
                                    required
                                    value={formData.purchaseDetails.purchaseDate}
                                    className={inputClass}
                                    style={readOnlyStyle}
                                />
                            </FormField>

                            <FormField label="Branch (from PO)" required>
                                <input
                                    type="text"
                                    readOnly
                                    placeholder="Auto-filled from PO"
                                    value={branchName}
                                    className={inputClass}
                                    style={readOnlyStyle}
                                />
                            </FormField>

                            <FormField label="Purchase Price (USD only)" required>
                                <div className="flex gap-2">
                                    <select
                                        disabled
                                        value="USD"
                                        className="px-3 py-3 rounded-xl outline-none transition-all text-sm w-24"
                                        style={readOnlyStyle}
                                    >
                                        <option value="USD">USD</option>
                                    </select>
                                    <input
                                        type="number"
                                        readOnly
                                        placeholder="0.00"
                                        value={formData.purchaseDetails.purchasePrice || ''}
                                        className={`flex-1 ${inputClass}`}
                                        style={readOnlyStyle}
                                    />
                                </div>
                            </FormField>

                            <FormField label="Payment Method" required>
                                <select
                                    value={formData.purchaseDetails.paymentMethod}
                                    onChange={(e) => updatePurchase('paymentMethod', e.target.value)}
                                    className={inputClass}
                                    style={inputStyle}
                                >
                                    {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </FormField>

                            <FormField label="Insurance Policy" required>
                                <select
                                    required
                                    value={formData.insuranceId}
                                    onChange={(e) => setFormData({ ...formData, insuranceId: e.target.value })}
                                    className={inputClass}
                                    style={inputStyle}
                                >
                                    <option value="">Select an active insurance</option>
                                    {insurances.map(ins => (
                                        <option key={ins._id} value={ins._id}>
                                            {ins.policyNumber} — {ins.provider} ({ins.coverageType})
                                        </option>
                                    ))}
                                </select>
                            </FormField>
                        </div>

                        {/* Finance Details (conditional) */}
                        {formData.purchaseDetails.paymentMethod === 'Finance' && (
                            <div className="mt-6 p-5 rounded-xl border space-y-5" style={{ background: 'rgba(200,230,0,0.03)', borderColor: 'rgba(200,230,0,0.15)' }}>
                                <div className="flex items-center gap-2 text-[#C8E600]">
                                    <Info size={16} />
                                    <h3 className="text-xs font-semibold uppercase tracking-wider">Finance Details</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField label="Lender Name" required>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Stanbic Bank"
                                            value={formData.purchaseDetails.financeDetails?.lenderName || ''}
                                            onChange={(e) => updateFinance('lenderName', e.target.value)}
                                            className={inputClass}
                                            style={inputStyle}
                                        />
                                    </FormField>
                                    <FormField label="Loan Amount" required>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={formData.purchaseDetails.financeDetails?.loanAmount || ''}
                                            onChange={(e) => updateFinance('loanAmount', parseFloat(e.target.value) || 0)}
                                            className={inputClass}
                                            style={inputStyle}
                                        />
                                    </FormField>
                                    <FormField label="Term (Months)">
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.purchaseDetails.financeDetails?.termMonths || ''}
                                            onChange={(e) => updateFinance('termMonths', parseInt(e.target.value) || 0)}
                                            className={inputClass}
                                            style={inputStyle}
                                        />
                                    </FormField>
                                    <FormField label="Monthly Instalment">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={formData.purchaseDetails.financeDetails?.monthlyInstalment || ''}
                                            onChange={(e) => updateFinance('monthlyInstalment', parseFloat(e.target.value) || 0)}
                                            className={inputClass}
                                            style={inputStyle}
                                        />
                                    </FormField>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── STEP 2: Basic Details ──────────────────────────────────── */}
                {step === 2 && (
                    <div className="rounded-2xl border p-6 space-y-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 mb-2 text-[#C8E600]">
                            <Car size={18} />
                            <h2 className="font-semibold uppercase tracking-wider text-xs">Vehicle Specifications</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FormField label="Make" required>
                                <input type="text" required placeholder="e.g. Toyota" value={formData.basicDetails.make}
                                    onChange={(e) => updateBasic('make', e.target.value)} className={inputClass} style={inputStyle} />
                            </FormField>
                            <FormField label="Model" required>
                                <input type="text" required placeholder="e.g. Corolla" value={formData.basicDetails.model}
                                    onChange={(e) => updateBasic('model', e.target.value)} className={inputClass} style={inputStyle} />
                            </FormField>
                            <FormField label="Year" required>
                                <input type="number" required min="1900" max="2100" value={formData.basicDetails.year}
                                    onChange={(e) => updateBasic('year', parseInt(e.target.value) || 0)} className={inputClass} style={inputStyle} />
                            </FormField>
                            <FormField label="VIN" required>
                                <input type="text" required placeholder="e.g. JTDKN3DU5A0123456" value={formData.basicDetails.vin}
                                    onChange={(e) => updateBasic('vin', e.target.value.toUpperCase())} className={`${inputClass} font-mono`} style={inputStyle} />
                            </FormField>
                            <FormField label="Category" required>
                                <select value={formData.basicDetails.category} onChange={(e) => updateBasic('category', e.target.value)} className={inputClass} style={inputStyle}>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </FormField>
                            <FormField label="Fuel Type" required>
                                <select value={formData.basicDetails.fuelType} onChange={(e) => updateBasic('fuelType', e.target.value)} className={inputClass} style={inputStyle}>
                                    {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                            </FormField>
                            <FormField label="Transmission" required>
                                <select value={formData.basicDetails.transmission} onChange={(e) => updateBasic('transmission', e.target.value)} className={inputClass} style={inputStyle}>
                                    {TRANSMISSIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </FormField>
                            <FormField label="Engine Capacity (cc)">
                                <input type="number" min="0" placeholder="e.g. 1800" value={formData.basicDetails.engineCapacity || ''}
                                    onChange={(e) => updateBasic('engineCapacity', parseInt(e.target.value) || undefined)} className={inputClass} style={inputStyle} />
                            </FormField>
                            <FormField label="Colour">
                                <input type="text" placeholder="e.g. White" value={formData.basicDetails.colour || ''}
                                    onChange={(e) => updateBasic('colour', e.target.value)} className={inputClass} style={inputStyle} />
                            </FormField>
                            <FormField label="Seats">
                                <input type="number" min="1" max="60" placeholder="e.g. 5" value={formData.basicDetails.seats || ''}
                                    onChange={(e) => updateBasic('seats', parseInt(e.target.value) || undefined)} className={inputClass} style={inputStyle} />
                            </FormField>
                            <FormField label="Engine Number">
                                <input type="text" placeholder="e.g. 2NR-FKE-123456" value={formData.basicDetails.engineNumber || ''}
                                    onChange={(e) => updateBasic('engineNumber', e.target.value)} className={inputClass} style={inputStyle} />
                            </FormField>
                            <FormField label="Body Type">
                                <select value={formData.basicDetails.bodyType || ''} onChange={(e) => updateBasic('bodyType', e.target.value || undefined)} className={inputClass} style={inputStyle}>
                                    <option value="">Select body type</option>
                                    {BODY_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </FormField>
                            <FormField label="Odometer (km)">
                                <input type="number" min="0" placeholder="0" value={formData.basicDetails.odometer ?? ''}
                                    onChange={(e) => updateBasic('odometer', parseInt(e.target.value) || 0)} className={inputClass} style={inputStyle} />
                            </FormField>
                            <FormField label="GPS Serial Number">
                                <input type="text" placeholder="e.g. GPS-001-2024" value={formData.basicDetails.gpsSerialNumber || ''}
                                    onChange={(e) => updateBasic('gpsSerialNumber', e.target.value)} className={inputClass} style={inputStyle} />
                            </FormField>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="p-4 rounded-xl flex items-center gap-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                        <AlertCircle size={18} /> {error}
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center">
                    {step === 2 ? (
                        <button
                            type="button"
                            onClick={() => { setStep(1); setError(null); }}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-dim)' }}
                        >
                            <ChevronLeft size={16} /> Back
                        </button>
                    ) : (
                        <div />
                    )}

                    {step === 1 ? (
                        <button
                            type="button"
                            onClick={handleNext}
                            disabled={loading}
                            className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50"
                            style={{ background: '#C8E600', color: '#0A0A0A' }}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                                ['countrymanager', 'branchmanager'].includes(getUserRole() || '') ? 'Create Vehicle' : <>Next: Vehicle Specs <ChevronRight size={16} /></>
                            )}
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-10 py-4 rounded-2xl font-bold shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
                            style={{ background: '#C8E600', color: '#0A0A0A' }}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    Create Vehicle
                                </>
                            )}
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default CreateVehicle;
