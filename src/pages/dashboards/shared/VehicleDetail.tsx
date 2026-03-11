import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Car, ArrowLeft, AlertTriangle, Upload, CheckCircle, XCircle,
    FileText, Shield, ClipboardCheck, Calculator, Satellite, UserCheck,
    Zap, Wrench, Ban, ArrowRightLeft, Trash2, Clock, Send
} from 'lucide-react';
import { getVehicleById, progressVehicle, uploadVehicleDocuments } from '../../../services/vehicleService';
import { getUserRole } from '../../../utils/auth';
import type { Vehicle, VehicleStatus, ChecklistItem, InspectionCondition, VehicleCategory, FuelType, Transmission, BodyType } from '../../../services/vehicleService';

// ── Status config ─────────────────────────────────────────────────────────────
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
};

const PIPELINE: VehicleStatus[] = [
    'PENDING ENTRY', 'DOCUMENTS REVIEW', 'INSURANCE VERIFICATION', 'INSPECTION REQUIRED',
    'ACCOUNTING SETUP', 'GPS ACTIVATION', 'BRANCH MANAGER APPROVAL', 'ACTIVE — AVAILABLE',
];

const CHECKLIST_NAMES = [
    'Engine Oil Level', 'Coolant Level', 'Brake Fluid', 'Power Steering Fluid',
    'Windshield Washer Fluid', 'Battery Condition', 'Air Filter', 'Tire Condition (Front Left)',
    'Tire Condition (Front Right)', 'Tire Condition (Rear Left)', 'Tire Condition (Rear Right)',
    'Spare Tire', 'Headlights', 'Tail Lights', 'Brake Lights', 'Turn Signals',
    'Windshield Wipers', 'Horn', 'Seat Belts', 'Mirrors', 'AC System',
    'Exhaust System', 'Suspension',
];

const DOC_FIELDS = [
    { key: 'purchaseReceipt', label: 'Purchase Receipt' },
    { key: 'registrationCertificate', label: 'Registration Certificate' },
    { key: 'roadTaxDisc', label: 'Road Tax Disc' },
    { key: 'numberPlateFront', label: 'Number Plate (Front)' },
    { key: 'numberPlateRear', label: 'Number Plate (Rear)' },
    { key: 'roadworthinessCertificate', label: 'Roadworthiness Certificate' },
    { key: 'transferOfOwnership', label: 'Transfer of Ownership' },
    { key: 'policyDocument', label: 'Insurance Policy Doc' },
    { key: 'customsClearanceCertificate', label: 'Customs Clearance' },
    { key: 'importPermit', label: 'Import Permit' },
    { key: 'odometerPhoto', label: 'Odometer Photo' },
];

const CATEGORIES: VehicleCategory[] = ['Sedan', 'SUV', 'Pickup', 'Van', 'Luxury', 'Commercial'];
const FUEL_TYPES: FuelType[] = ['Petrol', 'Diesel', 'Hybrid', 'Electric'];
const TRANSMISSIONS: Transmission[] = ['Automatic', 'Manual'];
const BODY_TYPES: BodyType[] = ['Hatchback', 'Saloon', 'Coupe', 'Convertible', 'Truck'];

// ── Shared UI ─────────────────────────────────────────────────────────────────
const inputStyle = { background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' };
const inputClass = 'w-full px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-lime transition-all text-sm';
const cardClass = 'rounded-2xl border p-6 space-y-5';
const cardStyle = { background: 'var(--bg-card)', borderColor: 'var(--border-main)' };

const SectionHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <div className="flex items-center gap-2 text-[#C8E600]">
        {icon}<h3 className="font-semibold uppercase tracking-wider text-xs">{title}</h3>
    </div>
);

const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => (
    <div>
        <p className="text-[10px] uppercase font-bold tracking-wider mb-0.5" style={{ color: 'var(--text-dim)' }}>{label}</p>
        <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>{value ?? '—'}</p>
    </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const VehicleDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const userRole = getUserRole();
    const canApprove = userRole === 'branchmanager' || userRole === 'countrymanager';

    // Vehicle Spec form state (for PENDING ENTRY)
    const [specData, setSpecData] = useState({
        make: '',
        model: '',
        year: new Date().getFullYear(),
        vin: '',
        category: 'Sedan' as VehicleCategory,
        fuelType: 'Petrol' as FuelType,
        transmission: 'Automatic' as Transmission,
        engineCapacity: 0,
        colour: '',
        seats: 5,
        engineNumber: '',
        bodyType: '' as BodyType,
        odometer: 0,
        gpsSerialNumber: '',
    });

    // Stage-specific form state
    const [legalDocs, setLegalDocs] = useState<Record<string, string>>({});
    const [insurance, setInsurance] = useState<Record<string, any>>({});
    const [importation, setImportation] = useState<Record<string, any>>({ isImported: false });
    const [checklist, setChecklist] = useState<ChecklistItem[]>(
        CHECKLIST_NAMES.map(name => ({ name, condition: 'Good' as InspectionCondition, notes: '', isMandatoryFail: true }))
    );
    const [accounting, setAccounting] = useState({ depreciationMethod: 'Straight-Line', usefulLifeYears: 5, residualValue: 0, isSetupComplete: true });
    const [gps, setGps] = useState({ isActivated: true, geofenceZone: '', speedLimitThreshold: 120, idleTimeAlertMins: 30, mileageSyncFrequencyHrs: 1 });
    const [maintenance, _setMaintenance] = useState({ type: 'Scheduled', estimatedCompletionDate: '' });
    const [suspension, _setSuspension] = useState({ reason: 'Accident', suspendedUntil: '' });
    const [transfer, _setTransfer] = useState({ toBranch: '', reason: '', estimatedArrival: '', transportMethod: 'Driven' });
    const [retirement, _setRetirement] = useState({ reason: 'Sold', disposalDate: '', disposalValue: 0 });

    // Upload state
    const [uploadFiles, setUploadFiles] = useState<Record<string, File | File[]>>({});
    const [uploadLoading, setUploadLoading] = useState(false);
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const extPhotoRef = useRef<HTMLInputElement | null>(null);
    const intPhotoRef = useRef<HTMLInputElement | null>(null);

    const fetchVehicle = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const data = await getVehicleById(id);
            setVehicle(data);

            // Sync spec data if vehicle already has some (to pre-fill if partially filled)
            if (data.basicDetails) {
                setSpecData({
                    make: data.basicDetails.make || '',
                    model: data.basicDetails.model || '',
                    year: data.basicDetails.year || new Date().getFullYear(),
                    vin: data.basicDetails.vin || '',
                    category: data.basicDetails.category || 'Sedan',
                    fuelType: data.basicDetails.fuelType || 'Petrol',
                    transmission: data.basicDetails.transmission || 'Automatic',
                    engineCapacity: data.basicDetails.engineCapacity || 0,
                    colour: data.basicDetails.colour || '',
                    seats: data.basicDetails.seats || 5,
                    engineNumber: data.basicDetails.engineNumber || '',
                    bodyType: data.basicDetails.bodyType || '' as BodyType,
                    odometer: data.basicDetails.odometer || 0,
                    gpsSerialNumber: data.basicDetails.gpsSerialNumber || '',
                });
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load vehicle');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchVehicle(); }, [fetchVehicle]);

    // ── Actions ────────────────────────────────────────────────────────────
    const handleProgress = async (targetStatus: VehicleStatus, updateData?: Record<string, any>) => {
        if (!id) return;
        setActionLoading(true); setActionError(null); setActionSuccess(null);
        try {
            const payload: any = { targetStatus, notes: notes || undefined };
            if (updateData) payload.updateData = updateData;
            const updatedVehicle = await progressVehicle(id, payload);

            // Handle Inspection logic specifically
            if (targetStatus === 'INSPECTION REQUIRED') {
                if (updatedVehicle.inspection?.status === 'Passed') {
                    setActionSuccess('Inspection verified and passed!');
                } else if (updatedVehicle.status === 'INSPECTION FAILED') {
                    setActionError('Inspection Failed: Critical issues were marked as Poor.');
                } else {
                    setActionSuccess(`Vehicle progressed to "${targetStatus}"`);
                }
            } else {
                setActionSuccess(`Vehicle progressed to "${targetStatus}"`);
            }

            setNotes('');
            setVehicle(updatedVehicle); // Direct update for faster UI response
        } catch (err: any) {
            setActionError(err.response?.data?.message || 'Action failed');
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!id) return;
        const fd = new FormData();
        let hasFiles = false;
        Object.entries(uploadFiles).forEach(([key, val]) => {
            if (Array.isArray(val)) { val.forEach(f => fd.append(key, f)); hasFiles = true; }
            else if (val) { fd.append(key, val); hasFiles = true; }
        });
        if (!hasFiles) { setActionError('Please select at least one file'); return; }
        setUploadLoading(true); setActionError(null);
        try {
            await uploadVehicleDocuments(id, fd);
            setActionSuccess('Documents uploaded successfully!');
            setUploadFiles({});
            await fetchVehicle();
        } catch (err: any) {
            setActionError(err.response?.data?.message || 'Upload failed');
        } finally {
            setUploadLoading(false);
        }
    };

    // ── Loading / Error states ─────────────────────────────────────────────
    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="w-10 h-10 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
        </div>
    );
    if (error || !vehicle) return (
        <div className="max-w-4xl mx-auto py-20 text-center space-y-4">
            <AlertTriangle size={48} className="mx-auto text-red-500 opacity-60" />
            <p className="text-lg font-medium" style={{ color: 'var(--text-main)' }}>{error || 'Vehicle not found'}</p>
            <button onClick={() => navigate('..')} className="px-6 py-2 rounded-xl text-sm font-medium cursor-pointer" style={{ background: '#C8E600', color: '#0A0A0A' }}>Back to List</button>
        </div>
    );

    const s = STATUS_STYLES[vehicle.status] || STATUS_STYLES['PENDING ENTRY'];
    const currentIdx = PIPELINE.indexOf(vehicle.status);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('..')} className="p-2 rounded-xl border transition-all hover:bg-white/5 cursor-pointer" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
                            {vehicle.basicDetails.make} {vehicle.basicDetails.model} {vehicle.basicDetails.year}
                        </h1>
                        <p className="text-sm font-mono mt-0.5" style={{ color: 'var(--text-dim)' }}>VIN: {vehicle.basicDetails.vin}</p>
                    </div>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border" style={{ background: s.bg, color: s.text, borderColor: s.border }}>
                    {vehicle.status}
                </div>
            </div>

            {/* Pipeline Progress */}
            <div className={cardClass} style={cardStyle}>
                <SectionHeader icon={<Zap size={16} />} title="Onboarding Pipeline" />
                <div className="flex items-center gap-1 overflow-x-auto pb-2">
                    {PIPELINE.map((st, i) => {
                        const done = currentIdx >= 0 && i <= currentIdx;
                        const active = vehicle.status === st;
                        return (
                            <div key={st} className="flex items-center gap-1 min-w-0">
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${active ? 'ring-2 ring-[#C8E600]' : ''}`}
                                    style={{ background: done ? 'rgba(200,230,0,0.15)' : 'var(--bg-sidebar)', color: done ? '#C8E600' : 'var(--text-dim)' }}>
                                    {done && i < currentIdx ? <CheckCircle size={12} /> : null}
                                    {st.replace('ACTIVE — ', '')}
                                </div>
                                {i < PIPELINE.length - 1 && <div className="w-4 h-px flex-shrink-0" style={{ background: done ? '#C8E600' : 'var(--border-main)' }} />}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Vehicle Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={cardClass} style={cardStyle}>
                    <SectionHeader icon={<Car size={16} />} title="Vehicle Details" />
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <InfoRow label="Make" value={vehicle.basicDetails.make} />
                        <InfoRow label="Model" value={vehicle.basicDetails.model} />
                        <InfoRow label="Year" value={vehicle.basicDetails.year} />
                        <InfoRow label="Category" value={vehicle.basicDetails.category} />
                        <InfoRow label="Fuel" value={vehicle.basicDetails.fuelType} />
                        <InfoRow label="Transmission" value={vehicle.basicDetails.transmission} />
                        <InfoRow label="Colour" value={vehicle.basicDetails.colour} />
                        <InfoRow label="Seats" value={vehicle.basicDetails.seats} />
                        <InfoRow label="Body" value={vehicle.basicDetails.bodyType} />
                        <InfoRow label="Engine #" value={vehicle.basicDetails.engineNumber} />
                        <InfoRow label="Odometer" value={vehicle.basicDetails.odometer ? `${vehicle.basicDetails.odometer} km` : undefined} />
                        <InfoRow label="GPS Serial" value={vehicle.basicDetails.gpsSerialNumber} />
                    </div>
                </div>
                <div className={cardClass} style={cardStyle}>
                    <SectionHeader icon={<FileText size={16} />} title="Purchase Details" />
                    <div className="grid grid-cols-2 gap-4">
                        <InfoRow label="Vendor" value={vehicle.purchaseDetails.vendorName} />
                        <InfoRow label="Date" value={vehicle.purchaseDetails.purchaseDate ? new Date(vehicle.purchaseDetails.purchaseDate).toLocaleDateString() : undefined} />
                        <InfoRow label="Price" value={`${vehicle.purchaseDetails.currency} ${vehicle.purchaseDetails.purchasePrice.toLocaleString()}`} />
                        <InfoRow label="Payment" value={vehicle.purchaseDetails.paymentMethod} />
                    </div>
                </div>
            </div>

            {/* ── STAGE ACTIONS ─────────────────────────────────────────────── */}
            {/* PENDING ENTRY Actions */}
            {vehicle.status === 'PENDING ENTRY' && (
                <div className="space-y-6">
                    {/* Step 1: Vehicle Specifications */}
                    {(!vehicle.basicDetails?.make || !vehicle.basicDetails?.vin) ? (
                        <div className={cardClass} style={cardStyle}>
                            <SectionHeader icon={<Car size={16} />} title="Step 1: Vehicle Specifications" />
                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Enter the vehicle's basic details to start the onboarding process.</p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-dim)' }}>Make *</label>
                                    <input type="text" placeholder="e.g. Toyota" value={specData.make} onChange={e => setSpecData(p => ({ ...p, make: e.target.value }))} className={inputClass} style={inputStyle} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-dim)' }}>Model *</label>
                                    <input type="text" placeholder="e.g. Corolla" value={specData.model} onChange={e => setSpecData(p => ({ ...p, model: e.target.value }))} className={inputClass} style={inputStyle} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-dim)' }}>Year *</label>
                                    <input type="number" min="1900" max="2100" value={specData.year} onChange={e => setSpecData(p => ({ ...p, year: parseInt(e.target.value) || 0 }))} className={inputClass} style={inputStyle} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-dim)' }}>VIN *</label>
                                    <input type="text" placeholder="JTDKN..." value={specData.vin} onChange={e => setSpecData(p => ({ ...p, vin: e.target.value.toUpperCase() }))} className={`${inputClass} font-mono`} style={inputStyle} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-dim)' }}>Category</label>
                                    <select value={specData.category} onChange={e => setSpecData(p => ({ ...p, category: e.target.value as VehicleCategory }))} className={inputClass} style={inputStyle}>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-dim)' }}>Fuel Type</label>
                                    <select value={specData.fuelType} onChange={e => setSpecData(p => ({ ...p, fuelType: e.target.value as FuelType }))} className={inputClass} style={inputStyle}>
                                        {FUEL_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-dim)' }}>Transmission</label>
                                    <select value={specData.transmission} onChange={e => setSpecData(p => ({ ...p, transmission: e.target.value as Transmission }))} className={inputClass} style={inputStyle}>
                                        {TRANSMISSIONS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-dim)' }}>Body Type</label>
                                    <select value={specData.bodyType} onChange={e => setSpecData(p => ({ ...p, bodyType: e.target.value as BodyType }))} className={inputClass} style={inputStyle}>
                                        <option value="">Select Type</option>
                                        {BODY_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-dim)' }}>Engine (cc)</label>
                                    <input type="number" value={specData.engineCapacity} onChange={e => setSpecData(p => ({ ...p, engineCapacity: parseInt(e.target.value) || 0 }))} className={inputClass} style={inputStyle} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-dim)' }}>Colour</label>
                                    <input type="text" value={specData.colour} onChange={e => setSpecData(p => ({ ...p, colour: e.target.value }))} className={inputClass} style={inputStyle} />
                                </div>
                            </div>

                            <button
                                onClick={() => handleProgress('PENDING ENTRY', { basicDetails: specData })}
                                disabled={actionLoading}
                                className="mt-4 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50"
                                style={{ background: '#C8E600', color: '#0A0A0A' }}
                            >
                                {actionLoading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : 'Save Specifications'}
                            </button>
                        </div>
                    ) : (
                        /* Step 2: Document Upload */
                        <div className={cardClass} style={cardStyle}>
                            <SectionHeader icon={<Upload size={16} />} title="Step 2: Upload Documents" />
                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Upload all required documents before submitting for review.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {DOC_FIELDS.map(df => (
                                    <div key={df.key} className="p-3 rounded-xl border flex items-center justify-between gap-3" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}>
                                        <span className="text-xs font-medium" style={{ color: 'var(--text-main)' }}>{df.label}</span>
                                        <div className="flex items-center gap-2">
                                            {(uploadFiles[df.key] as File)?.name && <span className="text-[10px] text-green-500 truncate max-w-[100px]">{(uploadFiles[df.key] as File).name}</span>}
                                            <input type="file" ref={el => { fileInputRefs.current[df.key] = el; }} className="hidden" onChange={e => { if (e.target.files?.[0]) setUploadFiles(prev => ({ ...prev, [df.key]: e.target.files![0] })); }} />
                                            <button type="button" onClick={() => fileInputRefs.current[df.key]?.click()} className="px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer" style={{ background: 'rgba(200,230,0,0.1)', color: '#C8E600', border: '1px solid rgba(200,230,0,0.2)' }}>
                                                Choose
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {/* Multi-file: Exterior & Interior */}
                                {['exteriorPhotos', 'interiorPhotos'].map(key => (
                                    <div key={key} className="p-3 rounded-xl border flex items-center justify-between gap-3" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}>
                                        <span className="text-xs font-medium" style={{ color: 'var(--text-main)' }}>{key === 'exteriorPhotos' ? 'Exterior Photos' : 'Interior Photos'}</span>
                                        <div className="flex items-center gap-2">
                                            {Array.isArray(uploadFiles[key]) && <span className="text-[10px] text-green-500">{(uploadFiles[key] as File[]).length} files</span>}
                                            <input type="file" multiple ref={key === 'exteriorPhotos' ? extPhotoRef : intPhotoRef} className="hidden"
                                                onChange={e => { if (e.target.files) setUploadFiles(prev => ({ ...prev, [key]: Array.from(e.target.files!) })); }} />
                                            <button type="button" onClick={() => (key === 'exteriorPhotos' ? extPhotoRef : intPhotoRef).current?.click()} className="px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer" style={{ background: 'rgba(200,230,0,0.1)', color: '#C8E600', border: '1px solid rgba(200,230,0,0.2)' }}>
                                                Choose
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-3">
                                <button onClick={handleUpload} disabled={uploadLoading} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50" style={{ background: 'var(--bg-sidebar)', color: 'var(--text-main)', border: '1px solid var(--border-main)' }}>
                                    {uploadLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Upload size={16} /> Upload All</>}
                                </button>
                                <button onClick={() => setVehicle(p => p ? ({ ...p, basicDetails: { ...p.basicDetails, vin: '' } } as any) : null)} className="px-6 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer" style={{ color: 'var(--text-dim)', background: 'transparent' }}>
                                    Back to Specs
                                </button>
                            </div>

                            <div className="border-t pt-5" style={{ borderColor: 'var(--border-main)' }}>
                                <SectionHeader icon={<Send size={16} />} title="Submit for Documents Review" />
                                <div className="flex flex-col gap-3 mt-3">
                                    <textarea placeholder="Final notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputClass} style={inputStyle} />
                                    <button onClick={() => handleProgress('DOCUMENTS REVIEW')} disabled={actionLoading} className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50" style={{ background: '#3b82f6', color: '#fff' }}>
                                        {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send size={16} /> Submit for Review</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* DOCUMENTS REVIEW */}
            {vehicle.status === 'DOCUMENTS REVIEW' && (
                <div className={cardClass} style={cardStyle}>
                    <SectionHeader icon={<FileText size={16} />} title="Legal Documents Review" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { k: 'registrationNumber', l: 'Registration Number', ph: 'GR-1234-24' },
                            { k: 'registrationExpiry', l: 'Registration Expiry', t: 'date' },
                            { k: 'roadTaxExpiry', l: 'Road Tax Expiry', t: 'date' },
                            { k: 'roadworthinessExpiry', l: 'Roadworthiness Expiry', t: 'date' },
                        ].map(f => (
                            <div key={f.k} className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{f.l}</label>
                                <input type={f.t || 'text'} placeholder={f.ph} value={legalDocs[f.k] || ''} onChange={e => setLegalDocs(p => ({ ...p, [f.k]: e.target.value }))} className={inputClass} style={inputStyle} />
                            </div>
                        ))}
                    </div>
                    <textarea placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${inputClass} mt-2`} style={inputStyle} />
                    <button onClick={() => handleProgress('INSURANCE VERIFICATION', { legalDocs })} disabled={actionLoading} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50" style={{ background: '#C8E600', color: '#0A0A0A' }}>
                        {actionLoading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><CheckCircle size={16} /> Approve Documents</>}
                    </button>
                </div>
            )}

            {/* INSURANCE VERIFICATION */}
            {vehicle.status === 'INSURANCE VERIFICATION' && (
                <div className={cardClass} style={cardStyle}>
                    <SectionHeader icon={<Shield size={16} />} title="Insurance Verification" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { k: 'insuranceType', l: 'Insurance Type', opts: ['Comprehensive', 'Third-Party', 'Fleet Policy'] },
                            { k: 'providerName', l: 'Provider', ph: 'Star Assurance' },
                            { k: 'policyNumber', l: 'Policy Number', ph: 'POL-2024-00123' },
                            { k: 'startDate', l: 'Start Date', t: 'date' },
                            { k: 'expiryDate', l: 'Expiry Date', t: 'date' },
                            { k: 'premiumAmount', l: 'Premium', t: 'number' },
                            { k: 'coverageAmount', l: 'Coverage', t: 'number' },
                            { k: 'excessAmount', l: 'Excess', t: 'number' },
                        ].map(f => (
                            <div key={f.k} className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{f.l} {['insuranceType', 'providerName', 'policyNumber', 'startDate', 'expiryDate'].includes(f.k) && <span className="text-red-500">*</span>}</label>
                                {f.opts ? (
                                    <select value={insurance[f.k] || f.opts[0]} onChange={e => setInsurance(p => ({ ...p, [f.k]: e.target.value }))} className={inputClass} style={inputStyle}>
                                        {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                ) : (
                                    <input type={f.t || 'text'} placeholder={f.ph} value={insurance[f.k] || ''} onChange={e => setInsurance(p => ({ ...p, [f.k]: f.t === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))} className={inputClass} style={inputStyle} />
                                )}
                            </div>
                        ))}
                    </div>
                    {/* Importation toggle */}
                    <div className="flex items-center gap-3 mt-4">
                        <input type="checkbox" checked={!!importation.isImported} onChange={e => setImportation(p => ({ ...p, isImported: e.target.checked }))} className="accent-[#C8E600]" />
                        <span className="text-sm" style={{ color: 'var(--text-main)' }}>This vehicle was imported</span>
                    </div>
                    {importation.isImported && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 rounded-xl border" style={{ borderColor: 'rgba(200,230,0,0.15)', background: 'rgba(200,230,0,0.03)' }}>
                            {[
                                { k: 'countryOfOrigin', l: 'Country of Origin' }, { k: 'shippingReference', l: 'Shipping Reference' },
                                { k: 'portOfEntry', l: 'Port of Entry' }, { k: 'customsDeclarationNumber', l: 'Customs Declaration #' },
                                { k: 'arrivalDate', l: 'Arrival Date', t: 'date' }, { k: 'shippingCost', l: 'Shipping Cost', t: 'number' },
                                { k: 'customsDuty', l: 'Customs Duty', t: 'number' }, { k: 'portHandling', l: 'Port Handling', t: 'number' },
                            ].map(f => (
                                <div key={f.k} className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{f.l}</label>
                                    <input type={f.t || 'text'} value={importation[f.k] || ''} onChange={e => setImportation(p => ({ ...p, [f.k]: f.t === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))} className={inputClass} style={inputStyle} />
                                </div>
                            ))}
                        </div>
                    )}
                    <textarea placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${inputClass} mt-2`} style={inputStyle} />
                    <button onClick={() => handleProgress('INSPECTION REQUIRED', { insurancePolicy: { insuranceType: insurance.insuranceType || 'Comprehensive', ...insurance }, ...(importation.isImported ? { importationDetails: importation } : {}) })} disabled={actionLoading} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50" style={{ background: '#C8E600', color: '#0A0A0A' }}>
                        {actionLoading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><CheckCircle size={16} /> Verify Insurance</>}
                    </button>
                </div>
            )}

            {/* INSPECTION REQUIRED */}
            {vehicle.status === 'INSPECTION REQUIRED' && (
                <div className={cardClass} style={cardStyle}>
                    {vehicle.inspection?.status === 'Passed' ? (
                        <div className="flex flex-col items-center gap-6 py-8 text-center">
                            <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center">
                                <CheckCircle size={32} />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>Inspection Passed</h3>
                                <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--text-dim)' }}>
                                    The technical inspection has been completed and verified successfully. 
                                    You can now proceed to set up the accounting details for this vehicle.
                                </p>
                            </div>
                            <button 
                                onClick={() => handleProgress('ACCOUNTING SETUP')} 
                                disabled={actionLoading} 
                                className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50 transition-all hover:scale-105" 
                                style={{ background: '#C8E600', color: '#0A0A0A' }}
                            >
                                {actionLoading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><ArrowLeft className="rotate-180" size={16} /> Proceed to Accounting Setup</>}
                            </button>
                        </div>
                    ) : (
                        <>
                            <SectionHeader icon={<ClipboardCheck size={16} />} title="Vehicle Inspection (23 Items)" />
                            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                                {checklist.map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: 'var(--border-main)', background: item.condition === 'Poor' ? 'rgba(239,68,68,0.05)' : 'var(--bg-sidebar)' }}>
                                        <span className="text-xs font-medium flex-1" style={{ color: 'var(--text-main)' }}>{item.name}</span>
                                        <select value={item.condition} onChange={e => { const c = [...checklist]; c[i] = { ...c[i], condition: e.target.value as InspectionCondition }; setChecklist(c); }}
                                            className="px-3 py-1.5 rounded-lg text-xs outline-none" style={{ ...inputStyle, width: '90px' }}>
                                            {['Good', 'Fair', 'Poor'].map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                        <input placeholder="Notes" value={item.notes || ''} onChange={e => { const c = [...checklist]; c[i] = { ...c[i], notes: e.target.value }; setChecklist(c); }}
                                            className="px-3 py-1.5 rounded-lg text-xs outline-none w-32" style={inputStyle} />
                                    </div>
                                ))}
                            </div>
                            <textarea placeholder="Notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${inputClass} mt-2`} style={inputStyle} />
                            <button onClick={() => handleProgress('INSPECTION REQUIRED', { inspection: { date: new Date().toISOString(), checklistItems: checklist } })} disabled={actionLoading} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50" style={{ background: '#C8E600', color: '#0A0A0A' }}>
                                {actionLoading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><ClipboardCheck size={16} /> Submit Inspection</>}
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* INSPECTION FAILED */}
            {vehicle.status === 'INSPECTION FAILED' && (
                <div className={cardClass} style={cardStyle}>
                    <SectionHeader icon={<XCircle size={16} />} title="Inspection Failed — Send for Repair" />
                    <textarea placeholder="Describe the repair needed..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={inputClass} style={inputStyle} />
                    <button onClick={() => handleProgress('REPAIR IN PROGRESS')} disabled={actionLoading} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50" style={{ background: '#f97316', color: '#fff' }}>
                        {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Wrench size={16} /> Send to Workshop / Repair</>}
                    </button>
                </div>
            )}

            {/* REPAIR IN PROGRESS */}
            {vehicle.status === 'REPAIR IN PROGRESS' && (
                <div className={cardClass} style={cardStyle}>
                    <SectionHeader icon={<Wrench size={16} />} title="Repair Complete — Re-Inspect" />
                    <textarea placeholder="Repair notes..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={inputClass} style={inputStyle} />
                    <button onClick={() => handleProgress('INSPECTION REQUIRED')} disabled={actionLoading} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50" style={{ background: '#C8E600', color: '#0A0A0A' }}>
                        {actionLoading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><ClipboardCheck size={16} /> Re-Inspect Vehicle</>}
                    </button>
                </div>
            )}

            {/* ACCOUNTING SETUP */}
            {vehicle.status === 'ACCOUNTING SETUP' && (
                <div className={cardClass} style={cardStyle}>
                    <SectionHeader icon={<Calculator size={16} />} title="Accounting Setup" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Depreciation Method</label>
                            <select value={accounting.depreciationMethod} onChange={e => setAccounting(p => ({ ...p, depreciationMethod: e.target.value }))} className={inputClass} style={inputStyle}>
                                <option value="Straight-Line">Straight-Line</option><option value="Reducing Balance">Reducing Balance</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Useful Life (Years)</label>
                            <input type="number" min="1" value={accounting.usefulLifeYears} onChange={e => setAccounting(p => ({ ...p, usefulLifeYears: parseInt(e.target.value) || 0 }))} className={inputClass} style={inputStyle} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Residual Value</label>
                            <input type="number" min="0" value={accounting.residualValue} onChange={e => setAccounting(p => ({ ...p, residualValue: parseFloat(e.target.value) || 0 }))} className={inputClass} style={inputStyle} />
                        </div>
                    </div>
                    <button onClick={() => handleProgress('GPS ACTIVATION', { accountingSetup: accounting })} disabled={actionLoading} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50" style={{ background: '#C8E600', color: '#0A0A0A' }}>
                        {actionLoading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><Calculator size={16} /> Save Accounting Setup</>}
                    </button>
                </div>
            )}

            {/* GPS ACTIVATION */}
            {vehicle.status === 'GPS ACTIVATION' && (
                <div className={cardClass} style={cardStyle}>
                    <SectionHeader icon={<Satellite size={16} />} title="GPS Configuration" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Geofence Zone</label>
                            <input type="text" placeholder="e.g. Accra Metro" value={gps.geofenceZone} onChange={e => setGps(p => ({ ...p, geofenceZone: e.target.value }))} className={inputClass} style={inputStyle} /></div>
                        <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Speed Limit (km/h)</label>
                            <input type="number" value={gps.speedLimitThreshold} onChange={e => setGps(p => ({ ...p, speedLimitThreshold: parseInt(e.target.value) || 0 }))} className={inputClass} style={inputStyle} /></div>
                        <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Idle Alert (mins)</label>
                            <input type="number" value={gps.idleTimeAlertMins} onChange={e => setGps(p => ({ ...p, idleTimeAlertMins: parseInt(e.target.value) || 0 }))} className={inputClass} style={inputStyle} /></div>
                        <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Mileage Sync (hrs)</label>
                            <input type="number" value={gps.mileageSyncFrequencyHrs} onChange={e => setGps(p => ({ ...p, mileageSyncFrequencyHrs: parseInt(e.target.value) || 0 }))} className={inputClass} style={inputStyle} /></div>
                    </div>
                    <button onClick={() => handleProgress('BRANCH MANAGER APPROVAL', { gpsConfiguration: gps })} disabled={actionLoading} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50" style={{ background: '#C8E600', color: '#0A0A0A' }}>
                        {actionLoading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><Satellite size={16} /> Activate GPS</>}
                    </button>
                </div>
            )}

            {/* BRANCH MANAGER APPROVAL */}
            {vehicle.status === 'BRANCH MANAGER APPROVAL' && (
                <div className={cardClass} style={cardStyle}>
                    <SectionHeader icon={<UserCheck size={16} />} title="Branch Manager Approval" />
                    {canApprove ? (
                        <>
                            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Review all stages above and approve this vehicle for the active fleet.</p>
                            <textarea placeholder="Approval notes..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputClass} style={inputStyle} />
                            <button onClick={() => handleProgress('ACTIVE — AVAILABLE')} disabled={actionLoading} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50" style={{ background: '#22c55e', color: '#fff' }}>
                                {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><UserCheck size={16} /> Approve &amp; Proceed</>}
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-4 py-4 text-center">
                            <Clock size={40} className="text-[#f59e0b] opacity-60" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>Waiting for Authority Approval</p>
                                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Only Branch Manager or Country Manager can approve this vehicle.</p>
                            </div>
                            <button disabled className="px-6 py-3 rounded-xl text-sm font-bold opacity-50 cursor-not-allowed" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                                Approval Pending
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ACTIVE — AVAILABLE: Fleet Actions */}
            {vehicle.status === 'ACTIVE — AVAILABLE' && (
                <div className={cardClass} style={cardStyle}>
                    <SectionHeader icon={<Zap size={16} />} title="Fleet Actions" />
                    <div className="flex items-center gap-2 mb-2">
                        <button onClick={() => handleProgress('ACTIVE — AVAILABLE')} className="px-4 py-2 rounded-lg text-xs font-bold cursor-pointer" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                            ✓ Active
                        </button>
                    </div>
                    <textarea placeholder="Notes for action..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputClass} style={inputStyle} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <button onClick={() => handleProgress('ACTIVE — MAINTENANCE', { maintenanceDetails: maintenance })} disabled={actionLoading}
                            className="flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold cursor-pointer border transition-all hover:scale-105" style={{ borderColor: 'rgba(249,115,22,0.3)', color: '#f97316', background: 'rgba(249,115,22,0.05)' }}>
                            <Wrench size={14} /> Pull for Maintenance
                        </button>
                        <button onClick={() => handleProgress('SUSPENDED', { suspensionDetails: suspension })} disabled={actionLoading}
                            className="flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold cursor-pointer border transition-all hover:scale-105" style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444', background: 'rgba(239,68,68,0.05)' }}>
                            <Ban size={14} /> Suspend Vehicle
                        </button>
                        <button onClick={() => { if (transfer.toBranch) handleProgress('TRANSFER PENDING', { transferDetails: transfer }); else setActionError('Select a destination branch'); }} disabled={actionLoading}
                            className="flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold cursor-pointer border transition-all hover:scale-105" style={{ borderColor: 'rgba(59,130,246,0.3)', color: '#3b82f6', background: 'rgba(59,130,246,0.05)' }}>
                            <ArrowRightLeft size={14} /> Transfer
                        </button>
                        <button onClick={() => handleProgress('RETIRED', { retirementDetails: retirement })} disabled={actionLoading}
                            className="flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold cursor-pointer border transition-all hover:scale-105" style={{ borderColor: 'rgba(107,114,128,0.3)', color: '#6b7280', background: 'rgba(107,114,128,0.05)' }}>
                            <Trash2 size={14} /> Retire
                        </button>
                    </div>
                </div>
            )}

            {/* SUSPENDED / MAINTENANCE — Return to Available */}
            {(vehicle.status === 'SUSPENDED' || vehicle.status === 'ACTIVE — MAINTENANCE') && (
                <div className={cardClass} style={cardStyle}>
                    <SectionHeader icon={vehicle.status === 'SUSPENDED' ? <Ban size={16} /> : <Wrench size={16} />} title={vehicle.status === 'SUSPENDED' ? 'Vehicle Suspended' : 'In Maintenance'} />
                    <textarea placeholder="Notes..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputClass} style={inputStyle} />
                    <button onClick={() => handleProgress('ACTIVE — AVAILABLE')} disabled={actionLoading} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50" style={{ background: '#22c55e', color: '#fff' }}>
                        {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><CheckCircle size={16} /> Return to Available</>}
                    </button>
                </div>
            )}

            {/* TRANSFER PENDING / COMPLETE */}
            {vehicle.status === 'TRANSFER PENDING' && (
                <div className={cardClass} style={cardStyle}>
                    <SectionHeader icon={<ArrowRightLeft size={16} />} title="Transfer Pending — Mark Received" />
                    <textarea placeholder="Notes..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputClass} style={inputStyle} />
                    <button onClick={() => handleProgress('TRANSFER COMPLETE')} disabled={actionLoading} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50" style={{ background: '#C8E600', color: '#0A0A0A' }}>
                        {actionLoading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><CheckCircle size={16} /> Mark Received</>}
                    </button>
                </div>
            )}
            {vehicle.status === 'TRANSFER COMPLETE' && (
                <div className={cardClass} style={cardStyle}>
                    <SectionHeader icon={<ArrowRightLeft size={16} />} title="Transfer Complete — Activate" />
                    <button onClick={() => handleProgress('ACTIVE — AVAILABLE')} disabled={actionLoading} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50" style={{ background: '#22c55e', color: '#fff' }}>
                        {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><CheckCircle size={16} /> Activate at New Branch</>}
                    </button>
                </div>
            )}

            {/* Action feedback */}
            {actionError && (
                <div className="p-4 rounded-xl flex items-center gap-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertTriangle size={18} /> {actionError}
                </div>
            )}
            {actionSuccess && (
                <div className="p-4 rounded-xl flex items-center gap-3 text-sm" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e' }}>
                    <CheckCircle size={18} /> {actionSuccess}
                </div>
            )}

            {/* Status History */}
            {vehicle.statusHistory && vehicle.statusHistory.length > 0 && (
                <div className={cardClass} style={cardStyle}>
                    <SectionHeader icon={<Clock size={16} />} title="Status History" />
                    <div className="space-y-3">
                        {vehicle.statusHistory.slice().reverse().map((h, i) => {
                            const hs = STATUS_STYLES[h.status] || STATUS_STYLES['PENDING ENTRY'];
                            return (
                                <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-sidebar)' }}>
                                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: hs.text }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-bold" style={{ color: hs.text }}>{h.status}</span>
                                            <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{new Date(h.changedAt).toLocaleString()}</span>
                                        </div>
                                        {h.notes && <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{h.notes}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default VehicleDetail;
