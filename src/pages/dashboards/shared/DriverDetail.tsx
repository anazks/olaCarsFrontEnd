import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, Calendar, Building2, User, CheckCircle2, XCircle, Clock, Upload, ShieldCheck, CreditCard, PlayCircle, Ban } from 'lucide-react';
import { driverService } from '../../../services/driverService';
import type { Driver } from '../../../services/driverService';
import { getUserRole } from '../../../utils/auth';

const DriverDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [driver, setDriver] = useState<Driver | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState<string | null>(null);
    const userRole = getUserRole();

    useEffect(() => {
        if (id) fetchDriver();
    }, [id]);

    const fetchDriver = async () => {
        try {
            setLoading(true);
            const data = await driverService.getDriverById(id!);
            setDriver(data);
        } catch (error) {
            console.error('Error fetching driver:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProgress = async (action: string, data?: any) => {
        try {
            setLoading(true);
            await driverService.progressDriver(id!, action, data);
            await fetchDriver();
        } catch (error) {
            console.error('Error progressing driver:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
        const file = event.target.files?.[0];
        if (!file || !id) return;

        const formData = new FormData();
        formData.append('document', file);
        formData.append('type', type);

        try {
            setUploading(type);
            await driverService.uploadDocument(id, formData);
            await fetchDriver();
        } catch (error) {
            console.error(`Error uploading ${type}:`, error);
        } finally {
            setUploading(null);
        }
    };

    if (loading && !driver) return <div className="p-8 text-center animate-pulse font-bold text-gray-500 uppercase tracking-widest">Loading driver profile...</div>;
    if (!driver) return <div className="p-8 text-center">Driver not found</div>;

    const currentStepIndex = ['PENDING_APPLICATION', 'CREDIT_CHECK_REQUIRED', 'INTERVIEW_SCHEDULED', 'TRIAL_PERIOD', 'APPROVED'].indexOf(driver.status);

    const steps = [
        { id: 'PENDING_APPLICATION', label: 'Application', sub: 'Initial Entry' },
        { id: 'CREDIT_CHECK_REQUIRED', label: 'Credit Check', sub: 'Risk Assessment' },
        { id: 'INTERVIEW_SCHEDULED', label: 'Interview', sub: 'Vetting Process' },
        { id: 'TRIAL_PERIOD', label: 'Trial', sub: '7-Day Period' },
        { id: 'APPROVED', label: 'Onboarded', sub: 'Ready for Ops' }
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('..')} className="p-2 hover:bg-white rounded-xl border border-transparent hover:border-gray-200 transition-all group">
                        <ChevronLeft size={24} className="text-gray-400 group-hover:text-black" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>{driver.firstName} {driver.lastName}</h1>
                            <span className="px-3 py-1 text-xs font-bold rounded-full border uppercase tracking-wider" style={{ backgroundColor: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)', borderColor: 'rgba(200,230,0,0.2)' }}>
                                {driver.status.replace(/_/g, ' ')}
                            </span>
                        </div>
                        <p className="flex items-center gap-2 text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                            <FileText size={14} />
                            License: <span className="font-bold" style={{ color: 'var(--text-main)' }}>{driver.licenseNumber}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Role-based Actions */}
                    {userRole === 'countrymanager' && driver.status === 'PENDING_APPLICATION' && (
                        <button
                            onClick={() => handleProgress('SUBMIT_FOR_CREDIT_CHECK')}
                            className="px-6 py-2.5 bg-black text-white font-bold rounded-xl hover:bg-gray-900 transition-all flex items-center gap-2 shadow-lg active:scale-95"
                        >
                            <PlayCircle size={18} />
                            Start Onboarding
                        </button>
                    )}

                    {userRole === 'financialadmin' && driver.status === 'CREDIT_CHECK_REQUIRED' && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleProgress('SUBMIT_CREDIT_DECISION', { decision: 'APPROVE', score: 750 })}
                                className="px-6 py-2.5 bg-brand-lime text-black font-bold rounded-xl hover:bg-opacity-90 transition-all shadow-lg active:scale-95"
                            >
                                Approve Credit
                            </button>
                            <button
                                onClick={() => handleProgress('SUBMIT_CREDIT_DECISION', { decision: 'DECLINE' })}
                                className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg active:scale-95"
                            >
                                Decline
                            </button>
                        </div>
                    )}

                    {userRole === 'operationaladmin' && driver.status === 'INTERVIEW_SCHEDULED' && (
                        <button
                            onClick={() => handleProgress('START_TRIAL')}
                            className="px-6 py-2.5 bg-brand-lime text-black font-bold rounded-xl hover:bg-opacity-90 transition-all flex items-center gap-2"
                        >
                            <CheckCircle2 size={18} />
                            Begin Trial Period
                        </button>
                    )}

                    {userRole === 'branchmanager' && driver.status === 'TRIAL_PERIOD' && (
                        <button
                            onClick={() => handleProgress('FINAL_APPROVAL')}
                            className="px-6 py-2.5 bg-brand-lime text-black font-bold rounded-xl hover:bg-opacity-90 transition-all flex items-center gap-2"
                        >
                            <ShieldCheck size={18} />
                            Final Approval
                        </button>
                    )}

                    <button className="px-6 py-2.5 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-all flex items-center gap-2" style={{ backgroundColor: 'transparent', borderColor: 'rgba(239,68,68,0.2)' }}>
                        <Ban size={18} />
                        Disqualify
                    </button>
                </div>
            </div>

            {/* Stepper */}
            <div className="p-6 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="flex justify-between relative">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 -translate-y-1/2" style={{ backgroundColor: 'var(--border-main)' }} />
                    <div
                        className="absolute top-1/2 left-0 h-0.5 bg-brand-lime -translate-y-1/2 transition-all duration-500"
                        style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                    />
                    {steps.map((step, index) => {
                        const isCompleted = index < currentStepIndex;
                        const isCurrent = index === currentStepIndex;
                        return (
                            <div key={step.id} className="relative z-10 flex flex-col items-center">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isCompleted ? 'bg-brand-lime border-brand-lime text-black' :
                                        isCurrent ? 'bg-transparent border-brand-lime text-brand-lime shadow-lg shadow-brand-lime/20' :
                                            'bg-transparent border-gray-200 text-gray-300'
                                        }`}
                                    style={{ borderColor: !isCompleted && !isCurrent ? 'var(--border-main)' : '' }}
                                >
                                    {isCompleted ? <CheckCircle2 size={24} /> : <span className="font-bold text-sm">{index + 1}</span>}
                                </div>
                                <div className="mt-3 text-center">
                                    <div className={`text-xs font-bold uppercase tracking-wider ${isCurrent ? '' : ''}`} style={{ color: isCurrent ? 'var(--text-main)' : 'var(--text-dim)' }}>{step.label}</div>
                                    {!isCurrent && <div className="text-[10px] font-medium uppercase mt-0.5" style={{ color: 'var(--text-dim)' }}>{step.sub}</div>}
                                    {isCurrent && <div className="text-[10px] font-bold uppercase mt-0.5 animate-pulse" style={{ color: 'var(--brand-lime)' }}>In Progress</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Information Sections */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Basic Info */}
                    <div className="p-6 rounded-2xl shadow-sm border overflow-hidden relative" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-[100px] -mr-8 -mt-8" style={{ backgroundColor: 'rgba(200,230,0,0.03)' }} />
                        <div className="flex items-center gap-2 mb-6 border-b pb-4 relative z-10" style={{ borderColor: 'rgba(255,255,255,0.02)' }}>
                            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)' }}>
                                <User size={20} />
                            </div>
                            <h2 className="font-bold uppercase tracking-widest text-sm" style={{ color: 'var(--text-main)' }}>Personal Details</h2>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
                            <InfoCard label="Email Address" value={driver.email} />
                            <InfoCard label="Phone Number" value={driver.phoneNumber} />
                            <InfoCard label="Experience" value={`${driver.experienceYears} Years`} />
                            <InfoCard label="Branch" value={driver.branchId} icon={<Building2 size={14} />} />
                            <InfoCard label="Applied Date" value={new Date(driver.appliedAt).toLocaleDateString()} icon={<Calendar size={14} />} />
                            <InfoCard label="Birth Date" value="Nov 15, 1990" />
                        </div>
                    </div>

                    {/* Credit Check Status */}
                    {driver.creditCheck && (
                        <div className={`p-6 rounded-2xl shadow-sm border transition-all ${driver.creditCheck.decision === 'APPROVE' ? '' :
                            driver.creditCheck.decision === 'DECLINE' ? '' : ''
                            }`} style={{ 
                                backgroundColor: driver.creditCheck.decision === 'APPROVE' ? 'rgba(34,197,94,0.05)' : driver.creditCheck.decision === 'DECLINE' ? 'rgba(239,68,68,0.05)' : 'rgba(59,130,246,0.05)',
                                borderColor: driver.creditCheck.decision === 'APPROVE' ? 'rgba(34,197,94,0.1)' : driver.creditCheck.decision === 'DECLINE' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)'
                            }}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${driver.creditCheck.decision === 'APPROVE' ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'}`}>
                                        <CreditCard size={20} />
                                    </div>
                                    <h3 className="font-bold uppercase tracking-widest text-sm" style={{ color: 'var(--text-main)' }}>Credit Assessment</h3>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${driver.creditCheck.decision === 'APPROVE' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                    {driver.creditCheck.decision || 'PENDING'}
                                </span>
                            </div>
                            <div className="grid grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Credit Score</p>
                                    <p className="font-bold text-xl" style={{ color: 'var(--text-main)' }}>{driver.creditCheck.score || 'N/A'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Status</p>
                                    <p className="font-bold mt-1" style={{ color: 'var(--text-main)' }}>{driver.creditCheck.status}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Assessment Date</p>
                                    <p className="font-bold mt-1" style={{ color: 'var(--text-main)' }}>{driver.creditCheck.performedAt ? new Date(driver.creditCheck.performedAt).toLocaleDateString() : 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Documents Sidebar */}
                <div className="space-y-6">
                    <div className="p-6 rounded-2xl shadow-sm border h-full" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 mb-6 border-b pb-4" style={{ borderColor: 'rgba(255,255,255,0.02)' }}>
                            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)' }}>
                                <User size={20} />
                            </div>
                            <h2 className="font-bold uppercase tracking-widest text-sm" style={{ color: 'var(--text-main)' }}>Required Docs</h2>
                        </div>
                        <div className="space-y-4">
                            <DocUploadRow
                                label="Driving License"
                                status={driver.documents?.find(d => d.type === 'DRIVING_LICENSE')?.status}
                                url={driver.documents?.find(d => d.type === 'DRIVING_LICENSE')?.url}
                                uploading={uploading === 'DRIVING_LICENSE'}
                                onUpload={(e) => handleFileUpload(e, 'DRIVING_LICENSE')}
                            />
                            <DocUploadRow
                                label="Identity Card (NID/Passport)"
                                status={driver.documents?.find(d => d.type === 'ID_DOCUMENT')?.status}
                                url={driver.documents?.find(d => d.type === 'ID_DOCUMENT')?.url}
                                uploading={uploading === 'ID_DOCUMENT'}
                                onUpload={(e) => handleFileUpload(e, 'ID_DOCUMENT')}
                            />
                            <DocUploadRow
                                label="Proof of Residence"
                                status={driver.documents?.find(d => d.type === 'UTILITY_BILL')?.status}
                                url={driver.documents?.find(d => d.type === 'UTILITY_BILL')?.url}
                                uploading={uploading === 'UTILITY_BILL'}
                                onUpload={(e) => handleFileUpload(e, 'UTILITY_BILL')}
                            />
                        </div>

                        <div className="mt-8 p-4 rounded-xl border flex items-start gap-3" style={{ backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'var(--border-main)' }}>
                            <Clock size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--text-dim)' }} />
                            <p className="text-[11px] leading-relaxed font-medium" style={{ color: 'var(--text-muted)' }}>
                                Document verification takes 24-48 hours. Staff will be notified once complete.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InfoCard = ({ label, value, icon }: { label: string; value: any; icon?: React.ReactNode }) => (
    <div className="space-y-1 group">
        <label className="text-[10px] font-bold uppercase tracking-wider group-hover:text-brand-lime transition-colors" style={{ color: 'var(--text-dim)' }}>{label}</label>
        <div className="flex items-center gap-2 font-bold transition-transform group-hover:translate-x-1" style={{ color: 'var(--text-main)' }}>
            {icon && <span style={{ color: 'var(--text-dim)' }}>{icon}</span>}
            {value}
        </div>
    </div>
);

const DocUploadRow = ({ label, status, url, uploading, onUpload }: { 
    label: string; 
    status?: string; 
    url?: string; 
    uploading: boolean; 
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void 
}) => (
    <div className="p-4 border rounded-xl group hover:border-brand-lime/30 transition-all" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
        <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>{label}</span>
            {status === 'VERIFIED' ? (
                <CheckCircle2 size={16} className="text-green-500" />
            ) : status === 'REJECTED' ? (
                <XCircle size={16} className="text-red-500" />
            ) : url ? (
                <Clock size={16} className="text-yellow-500" />
            ) : null}
        </div>
        {url ? (
            <a href={url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-brand-lime uppercase hover:underline">View Document</a>
        ) : (
            <div className="relative">
                <input
                    type="file"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={onUpload}
                    disabled={uploading}
                />
                <button
                    disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 py-2 border border-dashed rounded-lg text-xs font-bold transition-all"
                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--brand-lime)'; e.currentTarget.style.color = 'var(--brand-lime)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-main)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
                >
                    {uploading ? 'Uploading...' : <><Upload size={14} /> Upload Doc</>}
                </button>
            </div>
        )}
    </div>
);

export default DriverDetail;
