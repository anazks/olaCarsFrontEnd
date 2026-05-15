import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, CheckCircle, X } from 'lucide-react';
import InsuranceSelectorModal from './InsuranceSelectorModal';
import { uploadVehicleDocuments, progressVehicle, getVehicleById } from '../../../services/vehicleService';
import type { Vehicle } from '../../../services/vehicleService';
import { createVehiclePolicy, type Insurance, type VehiclePolicy } from '../../../services/insuranceService';

const inputStyle = { background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' };
const inputClass = 'w-full px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-lime transition-all text-sm';

const toFullUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = (import.meta.env.VITE_S3_BASE_URL || '').replace(/^"|"$/g, '').replace(/\/$/, '');
    path = path.replace(/^\//, '');
    return `${baseUrl}/${path}`;
};

interface InsuranceManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicle: Vehicle;
    eligibleInsurances: Insurance[];
    currentPolicies: VehiclePolicy[];
    onSuccess: () => void;
}

export default function InsuranceManagementModal({ isOpen, onClose, vehicle, eligibleInsurances, onSuccess }: InsuranceManagementModalProps) {
    const { t } = useTranslation();

    // Manage state locally
    const [insuranceId, setInsuranceId] = useState<string>('');
    const [insuranceNumber, setInsuranceNumber] = useState<string>('');
    const [fromDate, setFromDate] = useState<string>('');
    const [toDate, setToDate] = useState<string>('');
    const [insuranceCertificate, setInsuranceCertificate] = useState<File | null>(null);
    const [insuredValue, setInsuredValue] = useState(0);

    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    React.useEffect(() => {
        if (isOpen) {
            setInsuranceId('');
            setInsuranceNumber('');
            setFromDate('');
            setToDate('');
            setInsuredValue(0);
            setInsuranceCertificate(null);
            setError(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setLoading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('vehicle', vehicle._id);
            formData.append('insurance', insuranceId || '');
            formData.append('policyNumber', insuranceNumber);
            formData.append('startDate', fromDate);
            formData.append('expiryDate', toDate);
            formData.append('insuredValue', insuredValue.toString());
            // Need a country for policy. Use a default if needed or get from user context.
            // But we can just use the vehicle branch country, for simplicity we use 'Global' here.
            formData.append('country', 'Global');

            if (insuranceCertificate) {
                formData.append('certificate', insuranceCertificate);
            }

            console.log('[DEBUG] InsuranceManagementModal - Saving Vehicle Policy:', Array.from(formData.entries()));

            await createVehiclePolicy(formData);
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to link insurance policy');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all" style={{ background: 'rgba(0,0,0,0.8)' }}>
            <div className="w-full max-w-3xl rounded-3xl border flex flex-col max-h-[90vh] shadow-2xl" style={{ background: 'var(--bg-main)', borderColor: 'var(--border-main)' }}>
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3 text-lg font-bold" style={{ color: 'var(--text-main)' }}>
                        <Shield size={24} style={{ color: '#C8E600' }} />
                        {t('management.vehicles.vehicleDetail.insuranceManagement', 'Insurance Management')}
                    </div>
                    <button onClick={onClose} disabled={loading} className="p-2 rounded-full transition-colors opacity-70 hover:opacity-100 hover:bg-white/10" style={{ color: 'var(--text-main)' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto" style={{ flex: 1 }}>
                    <p className="text-sm mb-6 pb-6 border-b" style={{ color: 'var(--text-dim)', borderColor: 'var(--border-main)' }}>
                        {t('management.vehicles.vehicleDetail.insuranceManagementDesc')}
                    </p>

                    {error && (
                        <div className="p-4 rounded-xl mb-6 text-sm flex items-center gap-3 bg-red-500/10 text-red-500 border border-red-500/20">
                            <Shield size={18} /> {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Form Left Side */}
                        <div className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                    {t('management.vehicles.vehicleDetail.labels.selectPlan')}
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsSelectorOpen(true)}
                                    className={`flex items-center justify-between ${inputClass}`}
                                    style={{ ...inputStyle, textAlign: 'left' }}
                                >
                                    {insuranceId ? (() => {
                                        const ins = eligibleInsurances.find(i => i._id === insuranceId);
                                        const displayName = ins ? (typeof ins.supplier === 'object' ? ins.supplier?.name : ins.provider) : '';
                                        return ins ? `${displayName} — ${ins.policyNumber}` : t('management.vehicles.vehicleDetail.labels.selectPlanPlaceholder');
                                    })() : (
                                        <span style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.labels.selectPlanPlaceholder')}</span>
                                    )}
                                    <Shield size={16} style={{ color: 'var(--text-dim)' }} />
                                </button>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                    {t('management.vehicles.vehicleDetail.labels.policyNumber', 'Policy Number')}
                                </label>
                                <input
                                    type="text"
                                    value={insuranceNumber}
                                    onChange={e => setInsuranceNumber(e.target.value)}
                                    className={inputClass}
                                    style={inputStyle}
                                    placeholder="Enter policy number"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                    Insured Value ($)
                                </label>
                                <input
                                    type="number"
                                    value={insuredValue}
                                    onChange={e => setInsuredValue(Number(e.target.value))}
                                    className={inputClass}
                                    style={inputStyle}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.labels.validFrom')}</label>
                                    <input
                                        type="date"
                                        value={fromDate}
                                        onChange={e => setFromDate(e.target.value)}
                                        className={inputClass}
                                        style={inputStyle}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.vehicleDetail.labels.validTo')}</label>
                                    <input
                                        type="date"
                                        value={toDate}
                                        onChange={e => setToDate(e.target.value)}
                                        className={inputClass}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Form Right Side */}
                        <div className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                    Insurance Certificate
                                </label>
                                <div className="p-6 rounded-2xl border border-dashed flex flex-col items-center justify-center gap-4 text-center min-h-[268px]" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}>
                                    {insuranceCertificate ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <Shield className="text-lime" size={32} />
                                            <p className="text-sm font-bold mt-2" style={{ color: 'var(--text-main)' }}>Ready to Upload</p>
                                            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{insuranceCertificate.name}</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Shield className="opacity-20 flex-shrink-0" size={40} style={{ color: 'var(--text-dim)' }} />
                                            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>No certificate uploaded yet</p>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        id="modalInsuranceCertificate"
                                        className="hidden"
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (file) setInsuranceCertificate(file);
                                        }}
                                    />
                                    <label htmlFor="modalInsuranceCertificate" className="px-5 py-2.5 rounded-xl text-lime text-xs font-bold cursor-pointer transition-all mt-2" style={{ background: 'rgba(200,230,0,0.1)' }}>
                                        {insuranceCertificate ? 'Upload Different File' : 'Select Certificate File'}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t flex items-center justify-end gap-3 rounded-b-3xl" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}>
                    <button onClick={onClose} disabled={loading} className="px-6 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer border hover:opacity-70" style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}>
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 min-w-[140px] px-8 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer disabled:opacity-50"
                        style={{ background: '#C8E600', color: '#0A0A0A' }}
                    >
                        {loading ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : t('management.vehicles.vehicleDetail.actions.saveInsurance')}
                    </button>
                </div>
            </div>

            {/* Child Modal Selection */}
            {isSelectorOpen && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center">
                    <InsuranceSelectorModal
                        isOpen={isSelectorOpen}
                        onClose={() => setIsSelectorOpen(false)}
                        insurances={eligibleInsurances}
                        selectedId={insuranceId}
                        onSelect={(ins) => {
                            setInsuranceId(ins._id);
                            if (ins.insuredValue !== undefined) {
                                setInsuredValue(ins.insuredValue);
                            }
                            setIsSelectorOpen(false);
                        }}
                    />
                </div>
            )}
        </div>
    );
}
