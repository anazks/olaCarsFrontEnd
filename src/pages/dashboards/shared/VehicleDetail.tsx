import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Car, ArrowLeft, AlertTriangle, Upload, CheckCircle, XCircle,
    FileText, Shield, ClipboardCheck, Calculator, Satellite, UserCheck,
    Zap, Wrench, Ban, ArrowRightLeft, Trash2, Clock, Send
} from 'lucide-react';
import { getVehicleById, progressVehicle, uploadVehicleDocuments } from '../../../services/vehicleService';
import { getEligibleInsurances } from '../../../services/insuranceService';
import { getUserRole } from '../../../utils/auth';
import type { Vehicle, VehicleStatus, ChecklistItem, InspectionCondition, VehicleCategory, FuelType, Transmission, BodyType } from '../../../services/vehicleService';
import type { Insurance } from '../../../services/insuranceService';
import InsuranceSelectorModal from './InsuranceSelectorModal';
import InsuranceManagementModal from './InsuranceManagementModal';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    'PENDING ENTRY': { bg: 'rgba(245,158,11,0.1)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
    'DOCUMENTS REVIEW': { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
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
    'PENDING ENTRY', 'DOCUMENTS REVIEW', 'INSPECTION REQUIRED',
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
    { key: 'customsClearanceCertificate', label: 'Customs Clearance' },
    { key: 'importPermit', label: 'Import Permit' },
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
    <div className="flex items-center gap-2" style={{ color: 'var(--brand-lime)' }}>
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
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [isInsuranceManagerOpen, setIsInsuranceManagerOpen] = useState(false);
    const userRole = getUserRole();
    const canApprove = userRole === 'branchmanager' || userRole === 'countrymanager';

    const S3_BASE = (import.meta.env.VITE_S3_BASE_URL || '').replace(/['"]/g, '').replace(/\/$/, '');
    const toFullUrl = (path?: string) => {
        if (!path) return undefined;
        if (path.startsWith('http')) return path;
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `${S3_BASE}/${cleanPath}`;
    };

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
    const [isInsuranceModalOpen, setIsInsuranceModalOpen] = useState(false);
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
    const [eligibleInsurances, setEligibleInsurances] = useState<Insurance[]>([]);
    const [uploadLoading, setUploadLoading] = useState(false);
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const extPhotoRef = useRef<HTMLInputElement | null>(null);
    const intPhotoRef = useRef<HTMLInputElement | null>(null);

    const fetchEligibleInsurances = useCallback(async () => {
        try {
            const response = await getEligibleInsurances();
            // Handle both plain array and paginated response
            const data = (response as any).data || response;
            setEligibleInsurances(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch eligible insurances:', err);
        }
    }, []);

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

            // Sync insurance details if they exist
            if (data.insuranceDetails) {
                setInsurance({
                    insuranceId: data.insuranceDetails.plan || '',
                    insuranceNumber: data.insuranceDetails.insuranceNumber || '',
                    fromDate: data.insuranceDetails.fromDate || '',
                    toDate: data.insuranceDetails.toDate || '',
                });
            } else if (data.insurancePolicy) {
                // Fallback for transition period
                setInsurance({
                    insuranceId: '', // We don't have the plan ID yet
                    insuranceNumber: data.insurancePolicy.policyNumber || '',
                    fromDate: data.insurancePolicy.startDate || '',
                    toDate: data.insurancePolicy.expiryDate || '',
                });
            }
            // Sync inspection checklist if it exists
            if (data.inspection?.checklistItems && data.inspection.checklistItems.length > 0) {
                setChecklist(data.inspection.checklistItems);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load vehicle');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { 
        fetchVehicle(); 
        fetchEligibleInsurances();
    }, [fetchVehicle, fetchEligibleInsurances]);

    const getStatusTranslation = (status: string) => {
        return t(`management.vehicles.statusLabels.${status}`, status);
    };

    // ── Actions ────────────────────────────────────────────────────────────
    const handleProgress = async (targetStatus: VehicleStatus, updateData?: Record<string, any>) => {
        console.log(`[ACTION] handleProgress: Initiated for "${targetStatus}"`);
        if (!id) { console.error('handleProgress failed: ID is missing'); return; }
        setActionLoading(true); setActionError(null); setActionSuccess(null);
        try {
            // Check if there are pending uploads and we are submitting for review
            if (targetStatus === 'DOCUMENTS REVIEW' && Object.keys(uploadFiles).length > 0) {
                console.log('Pending documents found. Uploading before progress...');
                await handleUpload();
            }
            const payload: any = { targetStatus, notes: notes || undefined };
            if (updateData) payload.updateData = updateData;
            
            console.log('--- Status Progress Payload ---');
            console.log('Vehicle ID:', id);
            console.log('Payload:', payload);

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
        console.log('[ACTION] handleUpload: Initiated');
        if (!id) { console.error('handleUpload failed: ID is missing'); return; }
        const fd = new FormData();
        let hasFiles = false;
        Object.entries(uploadFiles).forEach(([key, val]) => {
            if (Array.isArray(val)) { val.forEach(f => fd.append(key, f)); hasFiles = true; }
            else if (val) { fd.append(key, val); hasFiles = true; }
        });
        if (!hasFiles) { setActionError('Please select at least one file'); return; }
        
        console.group('--- Document Upload: Preparing Payload ---');
        console.log('Vehicle ID:', id);
        for (const [key, val] of Object.entries(uploadFiles)) {
            if (Array.isArray(val)) {
                console.log(`Field [${key}]: ${val.length} files`, val.map(f => (f as File).name));
            } else if (val) {
                console.log(`Field [${key}]: 1 file`, (val as File).name);
            }
        }
        console.groupEnd();

        setUploadLoading(true); setActionError(null);
        try {
            console.log('--- EXECUTING API CALL: uploadVehicleDocuments ---');
            console.log('Vehicle ID:', id);
            // Verify fd contents one last time
            for (let [key, value] of (fd as any).entries()) {
                console.log(`FormData Entry -> ${key}:`, value instanceof File ? value.name : value);
            }
            
            const uploadedDocs = await uploadVehicleDocuments(id, fd);
            console.log('--- API CALL SUCCESS: uploadVehicleDocuments ---', uploadedDocs);
            setActionSuccess('Documents uploaded successfully!');
            setUploadFiles({});
            await fetchVehicle();
            return uploadedDocs;
        } catch (err: any) {
            setActionError(err.response?.data?.message || 'Upload failed');
            return null;
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
            <p className="text-lg font-medium" style={{ color: 'var(--text-main)' }}>{error || t('management.vehicles.empty.noVehicles')}</p>
            <button onClick={() => navigate('..')} className="px-6 py-2 rounded-xl text-sm font-medium cursor-pointer" style={{ background: '#C8E600', color: '#0A0A0A' }}>
                {t('management.vehicles.vehicleDetail.actions.backToList')}
            </button>
        </div>
    );

    const s = STATUS_STYLES[vehicle.status] || STATUS_STYLES['PENDING ENTRY'];
    const currentIdx = PIPELINE.indexOf(vehicle.status);

    return (
        <div className="container-responsive space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('..')} className="p-2 rounded-xl border transition-all hover:bg-white/5 cursor-pointer" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
                            {vehicle.basicDetails?.make || 'New'} {vehicle.basicDetails?.model || 'Vehicle'} {vehicle.basicDetails?.year || ''}
                        </h1>
                        <p className="text-sm font-mono mt-0.5" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.labels.vin')}: {vehicle.basicDetails?.vin || '—'}</p>
                    </div>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border" style={{ background: s.bg, color: s.text, borderColor: s.border }}>
                    {getStatusTranslation(vehicle.status)}
                </div>
            </div>

            {/* Pipeline Progress - Only show if NOT active/rented */}
            {!(vehicle.status === 'ACTIVE — AVAILABLE' || vehicle.status === 'ACTIVE — RENTED') && (
                <div className={cardClass} style={cardStyle}>
                    <SectionHeader icon={<Zap size={16} />} title={t('management.vehicles.vehicleDetail.onboardingPipeline')} />
                    <div className="flex items-center justify-between gap-1 overflow-x-auto pb-2 min-w-max md:min-w-0">
                        {PIPELINE.map((st, i) => {
                            const done = currentIdx >= 0 && i <= currentIdx;
                            const active = vehicle.status === st;
                            return (
                                <div key={st} className={`flex items-center gap-1 ${i < PIPELINE.length - 1 ? 'flex-1' : ''}`}>
                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${active ? 'ring-2 ring-[#C8E600]' : ''}`}
                                        style={{ background: done ? 'rgba(200,230,0,0.15)' : 'var(--bg-sidebar)', color: done ? '#C8E600' : 'var(--text-dim)' }}>
                                        {done && i < currentIdx ? <CheckCircle size={12} /> : null}
                                        {getStatusTranslation(st).replace('Active — ', '').replace('ACTIVE — ', '')}
                                    </div>
                                    {i < PIPELINE.length - 1 && <div className="flex-1 h-px min-w-[20px]" style={{ background: done ? '#C8E600' : 'var(--border-main)' }} />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Vehicle Details & Purchase Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 3xl:grid-cols-4 4xl:grid-cols-5 uw:grid-cols-6 gap-6">
                <div className={`${cardClass} lg:col-span-2 3xl:col-span-3 4xl:col-span-4 uw:col-span-5`} style={cardStyle}>
                    <SectionHeader icon={<Car size={16} />} title={t('management.vehicles.vehicleDetail.vehicleOverview')} />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                        <InfoRow label={t('management.vehicles.vehicleDetail.labels.make')} value={vehicle.basicDetails?.make || '—'} />
                        <InfoRow label={t('management.vehicles.vehicleDetail.labels.model')} value={vehicle.basicDetails?.model || '—'} />
                        <InfoRow label={t('management.vehicles.vehicleDetail.labels.year')} value={vehicle.basicDetails?.year || '—'} />
                        <InfoRow label={t('management.vehicles.vehicleDetail.labels.vin')} value={vehicle.basicDetails?.vin || '—'} />
                        <InfoRow label={t('management.vehicles.vehicleDetail.labels.category')} value={vehicle.basicDetails?.category ? t(`management.vehicles.categories.${vehicle.basicDetails.category}`, vehicle.basicDetails.category) : '—'} />
                        <InfoRow label={t('management.vehicles.vehicleDetail.labels.fuel')} value={vehicle.basicDetails?.fuelType ? t(`management.vehicles.fuelTypes.${vehicle.basicDetails.fuelType}`, vehicle.basicDetails.fuelType) : '—'} />
                        <InfoRow label={t('management.vehicles.vehicleDetail.labels.transmission')} value={vehicle.basicDetails?.transmission ? t(`management.vehicles.transmissions.${vehicle.basicDetails.transmission}`, vehicle.basicDetails.transmission) : '—'} />
                        <InfoRow label={t('management.vehicles.vehicleDetail.labels.colour')} value={vehicle.basicDetails?.colour || '—'} />
                        <InfoRow label={t('management.vehicles.vehicleDetail.labels.seats')} value={vehicle.basicDetails?.seats || '—'} />
                        <InfoRow label={t('management.vehicles.vehicleDetail.labels.body')} value={vehicle.basicDetails?.bodyType ? t(`management.vehicles.bodyTypes.${vehicle.basicDetails.bodyType}`, vehicle.basicDetails.bodyType) : '—'} />
                        <InfoRow label={t('management.vehicles.vehicleDetail.labels.engineNumber')} value={vehicle.basicDetails?.engineNumber || '—'} />
                        <InfoRow label={t('management.vehicles.vehicleDetail.labels.odometer')} value={vehicle.basicDetails?.odometer ? `${vehicle.basicDetails.odometer.toLocaleString()} ${t('common.units.km')}` : `0 ${t('common.units.km')}`} />
                        <InfoRow label={t('management.vehicles.vehicleDetail.labels.gpsSerial')} value={vehicle.basicDetails?.gpsSerialNumber || '—'} />
                        <InfoRow label={t('management.vehicles.vehicleDetail.labels.monthlyRent')} value={vehicle.basicDetails?.monthlyRent ? `${t('common.currency.usd')}${vehicle.basicDetails.monthlyRent.toLocaleString()}` : '—'} />
                    </div>
                </div>
                <div className={cardClass} style={cardStyle}>
                    <SectionHeader icon={<FileText size={16} />} title={t('management.vehicles.vehicleDetail.purchaseInformation')} />
                    <div className="space-y-4">
                        <InfoRow label={t('management.vehicles.vehicleDetail.labels.vendor')} value={vehicle.purchaseDetails.vendorName} />
                        <InfoRow label={t('management.vehicles.vehicleDetail.labels.purchaseDate')} value={vehicle.purchaseDetails.purchaseDate ? new Date(vehicle.purchaseDetails.purchaseDate).toLocaleDateString() : undefined} />
                        <div className="grid grid-cols-2 gap-4">
                            <InfoRow label={t('management.vehicles.vehicleDetail.labels.price')} value={`${vehicle.purchaseDetails.currency} ${vehicle.purchaseDetails.purchasePrice.toLocaleString()}`} />
                            <InfoRow label={t('management.vehicles.vehicleDetail.labels.method')} value={vehicle.purchaseDetails.paymentMethod} />
                        </div>
                        {vehicle.purchaseDetails.branch && typeof vehicle.purchaseDetails.branch !== 'string' && (
                            <InfoRow label={t('management.vehicles.vehicleDetail.labels.assignedBranch')} value={vehicle.purchaseDetails.branch.name} />
                        )}
                    </div>
                </div>
            </div>

            {/* Comprehensive Details for Onboarded Vehicles */}
            {(vehicle.status === 'ACTIVE — AVAILABLE' || vehicle.status === 'ACTIVE — RENTED') && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4 4xl:grid-cols-5 uw:grid-cols-6 gap-6">
                    {/* Legal Documents */}
                    <div className={cardClass} style={cardStyle}>
                        <SectionHeader icon={<Shield size={16} />} title={t('management.vehicles.vehicleDetail.legalDocuments')} />
                        <div className="grid grid-cols-2 gap-4">
                            <InfoRow label={t('management.vehicles.vehicleDetail.labels.regNumber')} value={vehicle.legalDocs?.registrationNumber} />
                            <InfoRow label={t('management.vehicles.vehicleDetail.labels.regExpiry')} value={vehicle.legalDocs?.registrationExpiry ? new Date(vehicle.legalDocs.registrationExpiry).toLocaleDateString() : '—'} />
                            <InfoRow label={t('management.vehicles.vehicleDetail.labels.roadTaxExpiry')} value={vehicle.legalDocs?.roadTaxExpiry ? new Date(vehicle.legalDocs.roadTaxExpiry).toLocaleDateString() : '—'} />
                            <InfoRow label={t('management.vehicles.vehicleDetail.labels.roadworthiness')} value={vehicle.legalDocs?.roadworthinessExpiry ? new Date(vehicle.legalDocs.roadworthinessExpiry).toLocaleDateString() : '—'} />
                        </div>
                    </div>

                    {/* Insurance Policy */}
                    <div className={cardClass} style={cardStyle}>
                        <SectionHeader icon={<Shield size={16} />} title={t('management.vehicles.vehicleDetail.insurancePolicy')} />
                        <div className="space-y-4">
                            <div className="flex justify-between items-start">
                                <InfoRow 
                                    label={t('management.vehicles.vehicleDetail.labels.provider')} 
                                    value={(() => {
                                        const plan = eligibleInsurances.find(i => i._id === vehicle.insuranceDetails?.plan);
                                        return plan?.provider || (vehicle.insurancePolicy as any)?.providerName || '—';
                                    })()} 
                                />
                                <div className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: vehicle.insuranceDetails?.insuranceNumber ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: vehicle.insuranceDetails?.insuranceNumber ? '#22c55e' : '#ef4444' }}>
                                    {vehicle.insuranceDetails?.insuranceNumber ? t('management.vehicles.statusLabels.ACTIVE') : 'MISSING'}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <InfoRow label={t('management.vehicles.vehicleDetail.labels.policyNumber')} value={vehicle.insuranceDetails?.insuranceNumber || '—'} />
                                <InfoRow 
                                    label={t('management.vehicles.vehicleDetail.labels.type')} 
                                    value={(() => {
                                        const plan = eligibleInsurances.find(i => i._id === vehicle.insuranceDetails?.plan);
                                        return plan?.policyType || '—';
                                    })()} 
                                />
                                <InfoRow label={t('management.vehicles.vehicleDetail.labels.validFrom')} value={vehicle.insuranceDetails?.fromDate ? new Date(vehicle.insuranceDetails.fromDate).toLocaleDateString() : '—'} />
                                <InfoRow label={t('management.vehicles.vehicleDetail.labels.validTo')} value={vehicle.insuranceDetails?.toDate ? new Date(vehicle.insuranceDetails.toDate).toLocaleDateString() : '—'} />
                            </div>
                            {vehicle.insuranceDetails?.certificate && (
                                <a 
                                    href={toFullUrl(vehicle.insuranceDetails.certificate)} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-[10px] text-lime font-bold mt-2 hover:underline flex items-center gap-1"
                                >
                                    <FileText size={10} /> View Insurance Certificate
                                </a>
                            )}
                            {((vehicle.status as string).startsWith('ACTIVE') || (vehicle.status as string) === 'GPS ACTIVATION') && (
                                <button 
                                    onClick={() => setIsInsuranceManagerOpen(true)}
                                    className="mt-5 w-full py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                    style={{ background: 'rgba(200,230,0,0.1)', color: '#C8E600', border: '1px solid rgba(200,230,0,0.2)' }}
                                >
                                    {vehicle.insuranceDetails?.plan ? t('management.vehicles.vehicleDetail.actions.saveInsurance', 'Update Insurance') : t('management.vehicles.vehicleDetail.actions.saveInsurance', 'Add Insurance')}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* GPS Configuration */}
                    <div className={cardClass} style={cardStyle}>
                        <SectionHeader icon={<Satellite size={16} />} title={t('management.vehicles.vehicleDetail.gpsTracking')} />
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${vehicle.gpsConfiguration?.isActivated ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-main)' }}>{vehicle.gpsConfiguration?.isActivated ? t('management.vehicles.vehicleDetail.gpsConfiguration') : t('management.common.status.disabled')}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <InfoRow label={t('management.vehicles.vehicleDetail.labels.geofenceZone')} value={vehicle.gpsConfiguration?.geofenceZone || t('common.all')} />
                                <InfoRow label={t('management.vehicles.vehicleDetail.labels.speedLimit')} value={vehicle.gpsConfiguration?.speedLimitThreshold ? `${vehicle.gpsConfiguration.speedLimitThreshold} ${t('common.units.kmh')}` : '—'} />
                                <InfoRow label={t('management.vehicles.vehicleDetail.labels.idleAlert')} value={vehicle.gpsConfiguration?.idleTimeAlertMins ? `${vehicle.gpsConfiguration.idleTimeAlertMins} mins` : '—'} />
                                <InfoRow label={t('management.vehicles.vehicleDetail.labels.syncFreq')} value={vehicle.gpsConfiguration?.mileageSyncFrequencyHrs ? `${vehicle.gpsConfiguration.mileageSyncFrequencyHrs} ${t('common.units.hrs')}` : '—'} />
                            </div>
                        </div>
                    </div>

                    {/* Accounting Setup */}
                    <div className={cardClass} style={cardStyle}>
                        <SectionHeader icon={<Calculator size={16} />} title={t('management.vehicles.vehicleDetail.accountingValuation')} />
                        <div className="grid grid-cols-2 gap-4">
                            <InfoRow label={t('management.vehicles.vehicleDetail.labels.depreciation')} value={vehicle.accountingSetup?.depreciationMethod} />
                            <InfoRow label={t('management.vehicles.vehicleDetail.labels.usefulLife')} value={vehicle.accountingSetup?.usefulLifeYears ? `${vehicle.accountingSetup.usefulLifeYears} years` : '—'} />
                            <InfoRow label={t('management.vehicles.vehicleDetail.labels.residualValue')} value={vehicle.accountingSetup?.residualValue ? `${t('common.currency.usd')}${vehicle.accountingSetup.residualValue.toLocaleString()}` : '—'} />
                            <InfoRow label={t('management.vehicles.vehicleDetail.labels.setupStatus')} value={vehicle.accountingSetup?.isSetupComplete ? t('management.common.status.enabled') : t('management.common.status.disabled')} />
                        </div>
                    </div>

                    {/* Inspection Summary */}
                    <div className={cardClass} style={cardStyle}>
                        <SectionHeader icon={<ClipboardCheck size={16} />} title={t('management.vehicles.vehicleDetail.lastInspection')} />
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <InfoRow label={t('management.vehicles.vehicleDetail.labels.result')} value={vehicle.inspection?.status || t('management.vehicles.vehicleDetail.inspectionPassed')} />
                                <InfoRow label={t('management.vehicles.vehicleDetail.labels.date')} value={vehicle.inspection?.date ? new Date(vehicle.inspection.date).toLocaleDateString() : '—'} />
                            </div>
                            <div className="pt-2 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="flex items-center justify-between text-[10px] font-bold uppercase mb-2" style={{ color: 'var(--text-dim)' }}>
                                    <span>{t('management.vehicles.vehicleDetail.labels.highlights')}</span>
                                    <span className="text-green-500">{t('management.vehicles.vehicleDetail.vehicleInspection', { count: 23 })}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    {vehicle.inspection?.checklistItems?.slice(0, 4).map((item, i) => (
                                        <div key={i} className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-main)' }}>
                                            <div className="w-1 h-1 rounded-full bg-green-500" />
                                            <span className="truncate">{t(`management.vehicles.checklist.${item.name}`, item.name)}</span>
                                        </div>
                                    ))}
                                    {vehicle.inspection?.checklistItems && vehicle.inspection.checklistItems.length > 4 && (
                                        <div className="text-[9px] font-bold" style={{ color: 'var(--brand-lime)' }}>
                                            + {vehicle.inspection.checklistItems.length - 4} {t('common.viewAll')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className={cardClass} style={cardStyle}>
                        <SectionHeader icon={<Clock size={16} />} title={t('management.vehicles.vehicleDetail.onboardingMeta')} />
                        <div className="grid grid-cols-2 gap-4">
                            <InfoRow label={t('management.vehicles.vehicleDetail.labels.onboardedBy')} value={vehicle.creatorRole?.replace(/([A-Z])/g, ' $1')} />
                            <InfoRow label={t('management.vehicles.vehicleDetail.labels.createdDate')} value={vehicle.createdAt ? new Date(vehicle.createdAt).toLocaleDateString() : '—'} />
                            <InfoRow label={t('management.vehicles.vehicleDetail.labels.lastUpdate')} value={vehicle.updatedAt ? new Date(vehicle.updatedAt).toLocaleDateString() : '—'} />
                            <InfoRow label={t('management.vehicles.vehicleDetail.labels.imports')} value={vehicle.importationDetails?.isImported ? t('common.yes') : t('common.no')} />
                        </div>
                    </div>
                </div>
            )}

            {/* ── STAGE ACTIONS ─────────────────────────────────────────────── */}
            {/* PENDING ENTRY Actions */}
            {vehicle.status === 'PENDING ENTRY' && (
                <div className="space-y-6">
                    {/* Step 1: Vehicle Specifications */}
                    {(!vehicle.basicDetails?.make || !vehicle.basicDetails?.vin) ? (
                        <div className={cardClass} style={cardStyle}>
                            <SectionHeader icon={<Car size={16} />} title={t('management.vehicles.vehicleDetail.step1')} />
                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.step1Desc')}</p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.labels.make')} *</label>
                                    <input type="text" placeholder="e.g. Toyota" value={specData.make} onChange={e => setSpecData(p => ({ ...p, make: e.target.value }))} className={inputClass} style={inputStyle} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.labels.model')} *</label>
                                    <input type="text" placeholder="e.g. Corolla" value={specData.model} onChange={e => setSpecData(p => ({ ...p, model: e.target.value }))} className={inputClass} style={inputStyle} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.labels.year')} *</label>
                                    <input type="number" min="1900" max="2100" value={specData.year} onChange={e => setSpecData(p => ({ ...p, year: parseInt(e.target.value) || 0 }))} className={inputClass} style={inputStyle} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.labels.vin')} *</label>
                                    <input type="text" placeholder="JTDKN..." value={specData.vin} onChange={e => setSpecData(p => ({ ...p, vin: e.target.value.toUpperCase() }))} className={`${inputClass} font-mono`} style={inputStyle} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.labels.category')}</label>
                                    <select value={specData.category} onChange={e => setSpecData(p => ({ ...p, category: e.target.value as VehicleCategory }))} className={inputClass} style={inputStyle}>
                                        {CATEGORIES.map(c => <option key={c} value={c}>{t(`management.vehicles.categories.${c}`, c)}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.labels.fuel')}</label>
                                    <select value={specData.fuelType} onChange={e => setSpecData(p => ({ ...p, fuelType: e.target.value as FuelType }))} className={inputClass} style={inputStyle}>
                                        {FUEL_TYPES.map(f => <option key={f} value={f}>{t(`management.vehicles.fuelTypes.${f}`, f)}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.labels.transmission')}</label>
                                    <select value={specData.transmission} onChange={e => setSpecData(p => ({ ...p, transmission: e.target.value as Transmission }))} className={inputClass} style={inputStyle}>
                                        {TRANSMISSIONS.map(tOption => <option key={tOption} value={tOption}>{t(`management.vehicles.transmissions.${tOption}`, tOption)}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.labels.body')}</label>
                                    <select value={specData.bodyType} onChange={e => setSpecData(p => ({ ...p, bodyType: e.target.value as BodyType }))} className={inputClass} style={inputStyle}>
                                        <option value="">{t('common.search')}</option>
                                        {BODY_TYPES.map(b => <option key={b} value={b}>{t(`management.vehicles.bodyTypes.${b}`, b)}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.labels.engineCapacity')}</label>
                                    <input type="number" value={specData.engineCapacity} onChange={e => setSpecData(p => ({ ...p, engineCapacity: parseInt(e.target.value) || 0 }))} className={inputClass} style={inputStyle} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.labels.colour')}</label>
                                    <input type="text" value={specData.colour} onChange={e => setSpecData(p => ({ ...p, colour: e.target.value }))} className={inputClass} style={inputStyle} />
                                </div>
                            </div>

                            <button
                                onClick={() => handleProgress('PENDING ENTRY', { basicDetails: specData })}
                                disabled={actionLoading}
                                className="mt-4 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50"
                                style={{ background: '#C8E600', color: '#0A0A0A' }}
                            >
                                {actionLoading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : t('management.vehicles.vehicleDetail.actions.saveSpecs')}
                            </button>
                        </div>
                    ) : (
                        /* Step 2: Document Upload */
                        <div className={cardClass} style={cardStyle}>
                            <SectionHeader icon={<Upload size={16} />} title={t('management.vehicles.vehicleDetail.step2')} />
                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.step2Desc')}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 3xl:grid-cols-3 4xl:grid-cols-4 uw:grid-cols-5 gap-4">
                                {DOC_FIELDS.map(df => (
                                    <div key={df.key} className="p-3 rounded-xl border flex items-center justify-between gap-3" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}>
                                        <span className="text-xs font-medium" style={{ color: 'var(--text-main)' }}>{t(`management.vehicles.documents.${df.key}`, df.label)}</span>
                                        <div className="flex items-center gap-2">
                                            {(uploadFiles[df.key] as File)?.name && <span className="text-[10px] text-green-500 truncate max-w-[100px]">{(uploadFiles[df.key] as File).name}</span>}
                                            <input type="file" ref={el => { fileInputRefs.current[df.key] = el; }} className="hidden" 
                                                onChange={e => { 
                                                    if (e.target.files?.[0]) {
                                                        const file = e.target.files[0];
                                                        setUploadFiles(prev => {
                                                            const next = { ...prev, [df.key]: file };
                                                            // TEST AUTO-FILL: Fill all empty doc fields with this file
                                                            DOC_FIELDS.forEach(f => { if (!next[f.key]) next[f.key] = file; });
                                                            return next;
                                                        });
                                                    } 
                                                }} 
                                            />
                                            <button type="button" onClick={() => fileInputRefs.current[df.key]?.click()} className="px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer" style={{ background: 'rgba(200,230,0,0.1)', color: '#C8E600', border: '1px solid rgba(200,230,0,0.2)' }}>
                                                {t('common.search').split('...')[0]}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-3">
                                <button onClick={handleUpload} disabled={uploadLoading} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50" style={{ background: 'var(--bg-sidebar)', color: 'var(--text-main)', border: '1px solid var(--border-main)' }}>
                                    {uploadLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Upload size={16} /> {t('management.vehicles.vehicleDetail.actions.uploadAll')}</>}
                                </button>
                                
                                {/* TEST BUTTON: Auto-fill all fields with the first selected file */}
                                <button 
                                    type="button"
                                    onClick={() => {
                                        const firstVal = Object.values(uploadFiles).find(v => v && (v instanceof File || (Array.isArray(v) && v.length > 0)));
                                        if (!firstVal) { alert('Please select at least one file first.'); return; }
                                        const fileToUse = Array.isArray(firstVal) ? firstVal[0] : firstVal;
                                        const autoFilled: any = {};
                                        DOC_FIELDS.forEach(df => autoFilled[df.key] = fileToUse);
                                        setUploadFiles(autoFilled);
                                        console.log('TEST: Auto-filled all fields with:', (fileToUse as File).name);
                                    }}
                                    className="px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer border border-dashed border-lime/30 text-lime bg-lime/5 hover:bg-lime/10"
                                >
                                    {t('management.vehicles.vehicleDetail.actions.fillAll')}
                                </button>

                                <button onClick={() => setVehicle(p => p ? ({ ...p, basicDetails: { ...p.basicDetails!, vin: '' } } as any) : null)} className="px-6 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer" style={{ color: 'var(--text-dim)', background: 'transparent' }}>
                                    {t('management.vehicles.vehicleDetail.actions.backToSpecs')}
                                </button>
                            </div>

                            <div className="border-t pt-5" style={{ borderColor: 'var(--border-main)' }}>
                                <SectionHeader icon={<Send size={16} />} title={t('management.vehicles.vehicleDetail.actions.submitForReview')} />
                                <div className="flex flex-col gap-3 mt-3">
                                    <textarea placeholder={t('management.purchaseOrders.filters.anyUsage')} value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputClass} style={inputStyle} />
                                    <button onClick={() => handleProgress('DOCUMENTS REVIEW')} disabled={actionLoading} className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50" style={{ background: '#3b82f6', color: '#fff' }}>
                                        {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send size={16} /> {t('management.vehicles.vehicleDetail.actions.submitForReview')}</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* DOCUMENTS REVIEW */}
            {vehicle.status === 'DOCUMENTS REVIEW' && (() => {
                return (
                <div className={cardClass} style={cardStyle}>
                    <SectionHeader icon={<ClipboardCheck size={16} />} title="Documents Review" />
                    <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Review the uploaded documents for accuracy and completeness.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4 4xl:grid-cols-5 uw:grid-cols-6 gap-4 mt-4">
                        {DOC_FIELDS.map(df => {
                            const rawUrl = df.key === 'purchaseReceipt' 
                                ? vehicle.purchaseDetails?.purchaseReceipt 
                                : df.key === 'odometerPhoto' 
                                    ? vehicle.inspection?.odometerPhoto 
                                    : df.key === 'customsClearanceCertificate' || df.key === 'importPermit'
                                        ? (vehicle.importationDetails as any)?.[df.key]
                                        : (vehicle.legalDocs as any)?.[df.key];
                            const docUrl = toFullUrl(rawUrl);

                            return (
                                <div key={df.key} className="p-3 rounded-xl border flex items-center justify-between gap-3" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-medium truncate" style={{ color: 'var(--text-main)' }}>{df.label}</span>
                                        {docUrl ? (
                                            <a href={docUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-lime font-bold mt-1 hover:underline flex items-center gap-1">
                                                <FileText size={10} /> View Document
                                            </a>
                                        ) : (
                                            <span className="text-[10px] text-red-500 font-bold mt-1 flex items-center gap-1">
                                                <XCircle size={10} /> Not Uploaded
                                            </span>
                                        )}
                                    </div>
                                    {docUrl && <CheckCircle size={14} className="text-green-500 flex-shrink-0" />}
                                </div>
                            );
                        })}
                    </div>

                    {/* Importation details (moved from Insurance stage) */}
                    <div className="mt-6 pt-6 border-t space-y-4" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" checked={!!importation.isImported} onChange={e => setImportation(p => ({ ...p, isImported: e.target.checked }))} className="accent-[#C8E600]" />
                            <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>This vehicle was imported</span>
                        </div>

                        {importation.isImported && (
                            <div className="grid grid-cols-1 md:grid-cols-2 3xl:grid-cols-3 4xl:grid-cols-4 uw:grid-cols-5 gap-4 p-4 rounded-xl border" style={{ borderColor: 'rgba(200,230,0,0.15)', background: 'rgba(200,230,0,0.03)' }}>
                                {[
                                    { k: 'countryOfOrigin', l: t('management.vehicles.vehicleDetail.labels.countryOfOrigin') }, { k: 'shippingReference', l: t('management.vehicles.vehicleDetail.labels.shippingReference') },
                                    { k: 'portOfEntry', l: t('management.vehicles.vehicleDetail.labels.portOfEntry') }, { k: 'customsDeclarationNumber', l: t('management.vehicles.vehicleDetail.labels.customsDeclaration') },
                                    { k: 'arrivalDate', l: t('management.vehicles.vehicleDetail.labels.arrivalDate'), t: 'date' }, { k: 'shippingCost', l: t('management.vehicles.vehicleDetail.labels.shippingCost'), t: 'number' },
                                    { k: 'customsDuty', l: t('management.vehicles.vehicleDetail.labels.customsDuty'), t: 'number' }, { k: 'portHandling', l: t('management.vehicles.vehicleDetail.labels.portHandling'), t: 'number' },
                                ].map(f => (
                                    <div key={f.k} className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{f.l}</label>
                                        <input type={f.t || 'text'} value={importation[f.k] || ''} onChange={e => setImportation(p => ({ ...p, [f.k]: f.t === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))} className={inputClass} style={inputStyle} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-4 mt-6 pt-6 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        {canApprove ? (
                            <>
                                <textarea placeholder="Review notes (reason for rejection or approval comments)..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputClass} style={inputStyle} />
                                <div className="flex gap-3">
                                    <button onClick={() => handleProgress('INSPECTION REQUIRED', { ...(importation.isImported ? { importationDetails: importation } : {}) })} disabled={actionLoading} className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50" style={{ background: '#22c55e', color: '#fff' }}>
                                        {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><CheckCircle size={16} /> {t('management.vehicles.vehicleDetail.actions.approveProceedInspection')}</>}
                                    </button>
                                    <button onClick={() => handleProgress('PENDING ENTRY')} disabled={actionLoading} className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>
                                        {actionLoading ? <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" /> : <><XCircle size={16} /> Reject & Request Re-upload</>}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500">
                                <Clock size={20} />
                                <div className="text-sm">
                                    <p className="font-bold">Awaiting Manager Review</p>
                                    <p className="text-xs opacity-80">Only a Branch or Country Manager can approve documents for this vehicle.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                );
            })()}




            {vehicle.status === 'INSPECTION REQUIRED' && (() => {
                const odometerCount = (vehicle?.inspection?.odometerPhoto || uploadFiles.odometerPhoto) ? 1 : 0;
                const totalExterior = (vehicle?.inspection?.exteriorPhotos?.length || 0) + (Array.isArray(uploadFiles.exteriorPhotos) ? uploadFiles.exteriorPhotos.length : 0);
                const totalInterior = (vehicle?.inspection?.interiorPhotos?.length || 0) + (Array.isArray(uploadFiles.interiorPhotos) ? uploadFiles.interiorPhotos.length : 0);
                const totalPhotos = totalExterior + totalInterior + odometerCount;

                const PhotoPreview = ({ url, label }: { url: string; label: string }) => {
                    const fullUrl = toFullUrl(url);
                    const isPdf = url.toLowerCase().endsWith('.pdf');
                    return (
                        <div className="aspect-square rounded-lg border overflow-hidden relative group" style={{ borderColor: 'var(--border-main)' }}>
                            {isPdf ? (
                                <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-red-500/5 text-red-500">
                                    <FileText size={20} />
                                    <span className="text-[8px] font-bold mt-1 uppercase">PDF</span>
                                </div>
                            ) : (
                                <img src={fullUrl} alt={label} className="w-full h-full object-cover" />
                            )}
                            <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-bold gap-1">
                                <FileText size={10} /> View
                            </a>
                        </div>
                    );
                };

                return (
                    <div className={cardClass} style={cardStyle}>
                        <div className="flex justify-between items-center mb-4">
                            <SectionHeader icon={<ClipboardCheck size={16} />} title="Vehicle Inspection (23 Items)" />
                            {vehicle.inspection?.status === 'Passed' && (
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-green-500/10 text-green-500 border border-green-500/20">
                                    <CheckCircle size={12} /> Passed
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
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
                        
                        <textarea placeholder="Overall inspection notes..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${inputClass} mt-2`} style={inputStyle} />

                        {/* Technical Photos Section */}
                        <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--border-main)' }}>
                            <SectionHeader icon={<Upload size={16} />} title={`Technical Photos (${totalPhotos} / Min 6)`} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                {/* Exterior Photos */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Exterior Photos</label>
                                        <input type="file" ref={extPhotoRef} className="hidden" multiple accept="image/*" onChange={e => {
                                            const files = Array.from(e.target.files || []);
                                            setUploadFiles(p => ({ ...p, exteriorPhotos: [...(Array.isArray(p.exteriorPhotos) ? p.exteriorPhotos : []), ...files] }));
                                        }} />
                                        <button onClick={() => extPhotoRef.current?.click()} className="text-[10px] text-lime font-bold hover:underline">+ Add Photos</button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(vehicle.inspection?.exteriorPhotos || []).map((url, i) => (
                                            <PhotoPreview key={i} url={url} label={`Exterior ${i}`} />
                                        ))}
                                        {(Array.isArray(uploadFiles.exteriorPhotos) ? uploadFiles.exteriorPhotos : []).map((file, i) => (
                                            <div key={`new-${i}`} className="aspect-square rounded-lg border border-dashed overflow-hidden relative" style={{ borderColor: 'var(--brand-lime)', background: 'rgba(200,230,0,0.05)' }}>
                                                <div className="w-full h-full flex items-center justify-center text-[8px] text-center p-1" style={{ color: 'var(--text-dim)' }}>{file.name}</div>
                                                <button onClick={() => setUploadFiles(p => ({ ...p, exteriorPhotos: (p.exteriorPhotos as File[]).filter((_, idx) => idx !== i) }))} className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full"><XCircle size={10} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Interior Photos */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Interior Photos</label>
                                        <input type="file" ref={intPhotoRef} className="hidden" multiple accept="image/*" onChange={e => {
                                            const files = Array.from(e.target.files || []);
                                            setUploadFiles(p => ({ ...p, interiorPhotos: [...(Array.isArray(p.interiorPhotos) ? p.interiorPhotos : []), ...files] }));
                                        }} />
                                        <button onClick={() => intPhotoRef.current?.click()} className="text-[10px] text-lime font-bold hover:underline">+ Add Photos</button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(vehicle.inspection?.interiorPhotos || []).map((url, i) => (
                                            <PhotoPreview key={i} url={url} label={`Interior ${i}`} />
                                        ))}
                                        {(Array.isArray(uploadFiles.interiorPhotos) ? uploadFiles.interiorPhotos : []).map((file, i) => (
                                            <div key={`new-${i}`} className="aspect-square rounded-lg border border-dashed overflow-hidden relative" style={{ borderColor: 'var(--brand-lime)', background: 'rgba(200,230,0,0.05)' }}>
                                                <div className="w-full h-full flex items-center justify-center text-[8px] text-center p-1" style={{ color: 'var(--text-dim)' }}>{file.name}</div>
                                                <button onClick={() => setUploadFiles(p => ({ ...p, interiorPhotos: (p.interiorPhotos as File[]).filter((_, idx) => idx !== i) }))} className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full"><XCircle size={10} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Odometer Photo */}
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Odometer Photo *</label>
                                        <input type="file" ref={el => { if (fileInputRefs.current) fileInputRefs.current['odometerPhoto'] = el; }} className="hidden" accept="image/*" onChange={e => {
                                            if (e.target.files?.[0]) {
                                                setUploadFiles(p => ({ ...p, odometerPhoto: e.target.files![0] }));
                                            }
                                        }} />
                                        <button onClick={() => fileInputRefs.current['odometerPhoto']?.click()} className="text-[10px] text-lime font-bold hover:underline">
                                            {uploadFiles.odometerPhoto || vehicle.inspection?.odometerPhoto ? 'Change Photo' : '+ Add Photo'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {vehicle.inspection?.odometerPhoto && (
                                            <PhotoPreview url={vehicle.inspection.odometerPhoto} label="Odometer" />
                                        )}
                                        {uploadFiles.odometerPhoto && !(uploadFiles.odometerPhoto instanceof Array) && (
                                            <div className="aspect-square rounded-lg border border-dashed overflow-hidden relative" style={{ borderColor: 'var(--brand-lime)', background: 'rgba(200,230,0,0.05)' }}>
                                                <div className="w-full h-full flex items-center justify-center text-[8px] text-center p-1" style={{ color: 'var(--text-dim)' }}>{(uploadFiles.odometerPhoto as File).name}</div>
                                                <button onClick={() => setUploadFiles(p => { const n = { ...p }; delete n.odometerPhoto; return n; })} className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full"><XCircle size={10} /></button>
                                            </div>
                                        )}
                                    </div>
                                    {!uploadFiles.odometerPhoto && !vehicle.inspection?.odometerPhoto && (
                                        <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 mt-1">
                                            <AlertTriangle size={10} /> Odometer photo is required before proceeding
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 mt-6 pt-6 border-t" style={{ borderColor: 'var(--border-main)' }}>
                            <button 
                                onClick={async () => {
                                    let photoData = {};
                                    if (uploadFiles.exteriorPhotos || uploadFiles.interiorPhotos || uploadFiles.odometerPhoto) {
                                        const uploaded = await handleUpload();
                                        if (uploaded) {
                                            photoData = { 
                                                exteriorPhotos: uploaded.exteriorPhotos, 
                                                interiorPhotos: uploaded.interiorPhotos,
                                                odometerPhoto: uploaded.odometerPhoto
                                            };
                                        }
                                    }
                                    const inspectionPayload = { ...vehicle?.inspection, checklistItems: checklist, ...photoData };
                                    console.group('--- [DEBUG] Save Progress Payload ---');
                                    console.log('Target Status: INSPECTION REQUIRED');
                                    console.log('Inspection Data:', inspectionPayload);
                                    console.log('Checklist Count:', checklist.length);
                                    console.groupEnd();
                                    
                                    await handleProgress('INSPECTION REQUIRED', { 
                                        inspection: inspectionPayload 
                                    });
                                }} 
                                disabled={actionLoading || uploadLoading} 
                                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-sm font-bold transition-all cursor-pointer border"
                                style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)', color: 'var(--text-main)' }}
                            >
                                {(actionLoading || uploadLoading) ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><ClipboardCheck size={16} /> Save Progress</>}
                            </button>

                            <div className="flex-1 flex flex-col gap-2">
                                <button 
                                    onClick={async () => {
                                        let photoData = {};
                                        // Validation: Odometer photo is mandatory
                                        if (!uploadFiles.odometerPhoto && !vehicle?.inspection?.odometerPhoto) {
                                            setActionError('Odometer photo is required before proceeding to accounting.');
                                            return;
                                        }

                                        if (uploadFiles.exteriorPhotos || uploadFiles.interiorPhotos || uploadFiles.odometerPhoto) {
                                            const uploaded = await handleUpload();
                                            if (uploaded) {
                                                photoData = { 
                                                    exteriorPhotos: uploaded.exteriorPhotos, 
                                                    interiorPhotos: uploaded.interiorPhotos,
                                                    odometerPhoto: uploaded.odometerPhoto
                                                };
                                            }
                                        }
                                        const inspectionPayload = { ...vehicle?.inspection, checklistItems: checklist, ...photoData };
                                        console.group('--- [DEBUG] Submit & Proceed Payload ---');
                                        console.log('Target Status: ACCOUNTING SETUP');
                                        console.log('Inspection Data:', inspectionPayload);
                                        console.groupEnd();
                                        
                                        await handleProgress('ACCOUNTING SETUP', {
                                            inspection: inspectionPayload
                                        });
                                    }} 
                                    disabled={actionLoading} 
                                    className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50 text-black" 
                                    style={{ background: '#C8E600' }}
                                >
                                    {actionLoading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><ArrowLeft className="rotate-180" size={16} /> Submit & Proceed to Accounting</>}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* INSPECTION FAILED */}
            {vehicle.status === 'INSPECTION FAILED' && (
                <div className={cardClass} style={cardStyle}>
                    <SectionHeader icon={<XCircle size={16} />} title={t('management.vehicles.vehicleDetail.inspectionFailedTitle')} />
                    <textarea placeholder={t('management.vehicles.vehicleDetail.repairNotesPlaceholder')} value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={inputClass} style={inputStyle} />
                    <button onClick={() => handleProgress('REPAIR IN PROGRESS')} disabled={actionLoading} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50" style={{ background: '#f97316', color: '#fff' }}>
                        {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Wrench size={16} /> {t('management.vehicles.vehicleDetail.actions.sendToRepair')}</>}
                    </button>
                </div>
            )}

            {/* REPAIR IN PROGRESS */}
            {vehicle.status === 'REPAIR IN PROGRESS' && (
                <div className={cardClass} style={cardStyle}>
                    <SectionHeader icon={<Wrench size={16} />} title={t('management.vehicles.vehicleDetail.repairCompleteTitle')} />
                    <textarea placeholder={t('common.notes')} value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={inputClass} style={inputStyle} />
                    <button onClick={() => handleProgress('INSPECTION REQUIRED')} disabled={actionLoading} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50" style={{ background: '#C8E600', color: '#0A0A0A' }}>
                        {actionLoading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><ClipboardCheck size={16} /> {t('management.vehicles.vehicleDetail.actions.reInspect')}</>}
                    </button>
                </div>
            )}

            {/* ACCOUNTING SETUP */}
            {vehicle.status === 'ACCOUNTING SETUP' && (
                <div className={cardClass} style={cardStyle}>
                    <SectionHeader icon={<Calculator size={16} />} title={t('management.vehicles.vehicleDetail.accountingSetup')} />
                    <div className="grid grid-cols-1 md:grid-cols-2 3xl:grid-cols-3 4xl:grid-cols-4 uw:grid-cols-5 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.labels.depreciation')}</label>
                            <select value={accounting.depreciationMethod} onChange={e => setAccounting(p => ({ ...p, depreciationMethod: e.target.value }))} className={inputClass} style={inputStyle}>
                                <option value="Straight-Line">Straight-Line</option><option value="Reducing Balance">Reducing Balance</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.labels.usefulLife')}</label>
                            <input type="number" min="1" value={accounting.usefulLifeYears} onChange={e => setAccounting(p => ({ ...p, usefulLifeYears: parseInt(e.target.value) || 0 }))} className={inputClass} style={inputStyle} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.labels.residualValue')}</label>
                            <input type="number" min="0" value={accounting.residualValue} onChange={e => setAccounting(p => ({ ...p, residualValue: parseFloat(e.target.value) || 0 }))} className={inputClass} style={inputStyle} />
                        </div>
                    </div>
                    <button onClick={() => handleProgress('GPS ACTIVATION', { accountingSetup: accounting })} disabled={actionLoading} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50" style={{ background: '#C8E600', color: '#0A0A0A' }}>
                        {actionLoading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><Calculator size={16} /> {t('management.vehicles.vehicleDetail.actions.saveAccounting')}</>}
                    </button>
                </div>
            )}

            {/* GPS ACTIVATION */}
            {vehicle.status === 'GPS ACTIVATION' && (
                <div className={cardClass} style={cardStyle}>
                    <SectionHeader icon={<Satellite size={16} />} title={t('management.vehicles.vehicleDetail.gpsConfiguration')} />
                    <div className="grid grid-cols-1 md:grid-cols-2 3xl:grid-cols-3 4xl:grid-cols-4 uw:grid-cols-5 gap-4">
                        <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.labels.geofenceZone')}</label>
                            <input type="text" placeholder="e.g. Accra Metro" value={gps.geofenceZone} onChange={e => setGps(p => ({ ...p, geofenceZone: e.target.value }))} className={inputClass} style={inputStyle} /></div>
                        <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.labels.speedLimit')} (km/h)</label>
                            <input type="number" value={gps.speedLimitThreshold} onChange={e => setGps(p => ({ ...p, speedLimitThreshold: parseInt(e.target.value) || 0 }))} className={inputClass} style={inputStyle} /></div>
                        <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.labels.idleAlert')} (mins)</label>
                            <input type="number" value={gps.idleTimeAlertMins} onChange={e => setGps(p => ({ ...p, idleTimeAlertMins: parseInt(e.target.value) || 0 }))} className={inputClass} style={inputStyle} /></div>
                        <div className="space-y-1.5"><label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.labels.syncFreq')}</label>
                            <input type="number" value={gps.mileageSyncFrequencyHrs} onChange={e => setGps(p => ({ ...p, mileageSyncFrequencyHrs: parseInt(e.target.value) || 0 }))} className={inputClass} style={inputStyle} /></div>
                    </div>
                    <button onClick={() => handleProgress('BRANCH MANAGER APPROVAL', { gpsConfiguration: gps })} disabled={actionLoading} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50" style={{ background: '#C8E600', color: '#0A0A0A' }}>
                        {actionLoading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><Satellite size={16} /> {t('management.vehicles.vehicleDetail.actions.activateGps')}</>}
                    </button>
                </div>
            )}

            {/* BRANCH MANAGER APPROVAL */}
            {vehicle.status === 'BRANCH MANAGER APPROVAL' && (
                <div className={cardClass} style={cardStyle}>
                    <SectionHeader icon={<UserCheck size={16} />} title={t('management.vehicles.vehicleDetail.branchManagerApproval')} />
                    {canApprove ? (
                        <>
                            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.messages.waitingAuthorityDesc')}</p>
                            <textarea placeholder={t('management.vehicles.vehicleDetail.approvalNotesPlaceholder')} value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputClass} style={inputStyle} />
                            <button onClick={() => handleProgress('ACTIVE — AVAILABLE')} disabled={actionLoading} className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50" style={{ background: '#22c55e', color: '#fff' }}>
                                {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><UserCheck size={16} /> {t('management.vehicles.vehicleDetail.actions.approveProceed')}</>}
                            </button>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-4 py-4 text-center">
                            <Clock size={40} className="text-[#f59e0b] opacity-60" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>{t('management.vehicles.vehicleDetail.messages.waitingAuthority')}</p>
                                <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.messages.waitingAuthorityDesc')}</p>
                            </div>
                            <button disabled className="px-6 py-3 rounded-xl text-sm font-bold opacity-50 cursor-not-allowed" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>
                                {t('management.vehicles.vehicleDetail.actions.approvalPending')}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* ACTIVE — AVAILABLE: Fleet Actions */}
            {vehicle.status === 'ACTIVE — AVAILABLE' && (
                <div className={cardClass} style={cardStyle}>
                    <SectionHeader icon={<Zap size={16} />} title={t('management.vehicles.vehicleDetail.fleetActions')} />
                    <div className="flex items-center gap-2 mb-2">
                        <button onClick={() => handleProgress('ACTIVE — AVAILABLE')} className="px-4 py-2 rounded-lg text-xs font-bold cursor-pointer" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                            ✓ {t('management.vehicles.statusLabels.ACTIVE')}
                        </button>
                    </div>
                    <textarea placeholder={t('common.notes')} value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputClass} style={inputStyle} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <button onClick={() => handleProgress('ACTIVE — MAINTENANCE', { maintenanceDetails: maintenance })} disabled={actionLoading}
                            className="flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold cursor-pointer border transition-all hover:scale-105" style={{ borderColor: 'rgba(249,115,22,0.3)', color: '#f97316', background: 'rgba(249,115,22,0.05)' }}>
                            <Wrench size={14} /> {t('management.vehicles.vehicleDetail.actions.pullMaintenance')}
                        </button>
                        <button onClick={() => handleProgress('SUSPENDED', { suspensionDetails: suspension })} disabled={actionLoading}
                            className="flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold cursor-pointer border transition-all hover:scale-105" style={{ borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444', background: 'rgba(239,68,68,0.05)' }}>
                            <Ban size={14} /> {t('management.vehicles.vehicleDetail.actions.suspendVehicle')}
                        </button>
                        <button onClick={() => { if (transfer.toBranch) handleProgress('TRANSFER PENDING', { transferDetails: transfer }); else setActionError('Select a destination branch'); }} disabled={actionLoading}
                            className="flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold cursor-pointer border transition-all hover:scale-105" style={{ borderColor: 'rgba(59,130,246,0.3)', color: '#3b82f6', background: 'rgba(59,130,246,0.05)' }}>
                            <ArrowRightLeft size={14} /> {t('management.vehicles.vehicleDetail.actions.transfer')}
                        </button>
                        <button onClick={() => handleProgress('RETIRED', { retirementDetails: retirement })} disabled={actionLoading}
                            className="flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold cursor-pointer border transition-all hover:scale-105" style={{ borderColor: 'rgba(107,114,128,0.3)', color: '#6b7280', background: 'rgba(107,114,128,0.05)' }}>
                            <Trash2 size={14} /> {t('management.vehicles.vehicleDetail.actions.retire')}
                        </button>
                    </div>
                </div>
            )}

            {/* Fleet Actions (For Active/Rented/Other) */}
            {(vehicle.status.startsWith('ACTIVE') || vehicle.status === 'SUSPENDED' || vehicle.status === 'ACTIVE — MAINTENANCE' || vehicle.status === 'TRANSFER PENDING' || vehicle.status === 'TRANSFER COMPLETE' || vehicle.status === 'RETIRED') && (
                <div className={cardClass} style={cardStyle}>
                    <SectionHeader icon={<Zap size={16} />} title={t('management.vehicles.vehicleDetail.fleetActions')} />
                    <div className="flex flex-wrap gap-3 mt-4">
                        {vehicle.status === 'SUSPENDED' && (
                            <button onClick={() => handleProgress('ACTIVE — AVAILABLE')} disabled={actionLoading} className="px-6 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50" style={{ background: '#22c55e', color: '#fff' }}>
                                {t('management.vehicles.vehicleDetail.vehicleSuspended')}
                            </button>
                        )}
                        {vehicle.status === 'ACTIVE — MAINTENANCE' && (
                            <button onClick={() => handleProgress('ACTIVE — AVAILABLE')} disabled={actionLoading} className="px-6 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50" style={{ background: '#C8E600', color: '#0A0A0A' }}>
                                {t('management.vehicles.vehicleDetail.actions.returnToAvailable')}
                            </button>
                        )}
                        {vehicle.status === 'TRANSFER PENDING' && (
                            <button onClick={() => handleProgress('TRANSFER COMPLETE')} disabled={actionLoading} className="px-6 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50" style={{ background: '#3b82f6', color: '#fff' }}>
                                {t('management.vehicles.vehicleDetail.transferPending')}
                            </button>
                        )}
                        {vehicle.status === 'TRANSFER COMPLETE' && (
                            <button onClick={() => handleProgress('ACTIVE — AVAILABLE')} disabled={actionLoading} className="px-6 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50" style={{ background: '#C8E600', color: '#0A0A0A' }}>
                                {t('management.vehicles.vehicleDetail.transferComplete')}
                            </button>
                        )}
                        
                        {/* If inspection passed but accounting/gps missing */}
                        {vehicle.status === 'ACTIVE — AVAILABLE' && !vehicle.accountingSetup?.isSetupComplete && (
                            <button onClick={() => handleProgress('ACCOUNTING SETUP')} className="px-6 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer" style={{ background: 'rgba(200,230,0,0.1)', color: '#C8E600', border: '1px solid rgba(200,230,0,0.2)' }}>
                                {t('management.vehicles.vehicleDetail.actions.proceedAccounting')}
                            </button>
                        )}
                    </div>
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
                    <SectionHeader icon={<Clock size={16} />} title={t('management.vehicles.vehicleDetail.statusHistory')} />
                    <VehicleStatusHistory history={vehicle.statusHistory} />
                </div>
            )}

            <InsuranceSelectorModal
                isOpen={isInsuranceModalOpen}
                onClose={() => setIsInsuranceModalOpen(false)}
                insurances={eligibleInsurances}
                selectedId={insurance.insuranceId}
                onSelect={(ins) => {
                    setInsurance(prev => ({ ...prev, insuranceId: ins._id }));
                    setIsInsuranceModalOpen(false);
                }}
            />

            <InsuranceManagementModal
                isOpen={isInsuranceManagerOpen}
                onClose={() => setIsInsuranceManagerOpen(false)}
                vehicle={vehicle}
                eligibleInsurances={eligibleInsurances}
                onSuccess={() => {
                    fetchVehicle();
                    setActionSuccess('Insurance tracking details updated successfully');
                    setTimeout(() => setActionSuccess(null), 3000);
                }}
            />
        </div>
    );
};

const VehicleStatusHistory = ({ history }: { history?: any[] }) => {
    const { t } = useTranslation();
    if (!history?.length) return <p className="text-xs italic mt-4" style={{ color: 'var(--text-dim)' }}>{t('management.audit.empty')}</p>;
    
    return (
        <div className="mt-4 space-y-4">
            {(history || []).slice().reverse().map((h: any, i: number) => (
                <div key={i} className="flex gap-3 relative">
                    {i < history.length - 1 && <div className="absolute left-1.5 top-4 bottom-[-16px] w-[1px]" style={{ background: 'var(--border-main)' }} />}
                    <div className="w-3 h-3 rounded-full mt-1 border-2 border-brand" style={{ background: 'var(--bg-main)', borderColor: '#C8E600' }} />
                    <div className="flex-1 pb-4">
                        <div className="flex justify-between items-start">
                            <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                                {t('management.vehicles.vehicleDetail.history.statusUpdated')} <span style={{ color: '#C8E600' }}>{t(`management.vehicles.statusLabels.${h.status}`, h.status) as string}</span>
                            </p>
                            <span className="text-[10px]" style={{ color: 'var(--text-dim)' }}>{new Date(h.changedAt || h.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.history.updatedBy')}: {h.updatedByRole || h.changedBy}</p>
                        {h.notes && <p className="text-[10px] mt-2 p-2 rounded bg-opacity-30 italic" style={{ background: 'var(--bg-sidebar)', color: 'var(--text-dim)' }}>"{h.notes}"</p>}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default VehicleDetail;
