import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, Calendar, Building2, User, CheckCircle2, XCircle, Phone, Clock, Upload, ShieldCheck, PlayCircle, Ban, Image as ImageIcon, AlertTriangle, AlertCircle, FileCheck, FileSignature } from 'lucide-react';
import { getDriverById, progressDriver, uploadDriverDocument, updateDriver } from '../../../services/driverService';
import type { Driver } from '../../../services/driverService';
import { getUserRole } from '../../../utils/auth';

const DriverDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [driver, setDriver] = useState<Driver | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [creditScore, setCreditScore] = useState<number>(0);
    const [fraudAlert, setFraudAlert] = useState<boolean>(false);
    const [reviewNotes, setReviewNotes] = useState<string>('');
    const [rejectionReason, setRejectionReason] = useState<string>('OTHER');
    const [activationChecks, setActivationChecks] = useState({
        credentialsSent: false,
        gpsMonitoringActive: false
    });
    const userRole = getUserRole();
    const isManager = ['branchmanager', 'countrymanager', 'admin', 'financeadmin', 'operationadmin'].includes(userRole || '');
    const isStaff = userRole === 'financestaff' || userRole === 'operationstaff' || isManager;

    useEffect(() => {
        if (id) fetchDriver();
    }, [id]);

    const fetchDriver = async () => {
        try {
            setLoading(true);
            const data = await getDriverById(id!);
            setDriver(data);
            if (data.creditCheck?.score) setCreditScore(data.creditCheck.score);
            if (data.creditCheck?.fraudAlert) setFraudAlert(data.creditCheck.fraudAlert);
            if (data.creditCheck?.reviewNotes) setReviewNotes(data.creditCheck.reviewNotes);
            console.log(data, "data");

        } catch (error) {
            console.error('Error fetching driver:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProgress = async (action: string, data?: any) => {
        try {
            setLoading(true);
            setActionError(null);
            await progressDriver(id!, action, data);
            await fetchDriver();
        } catch (error: any) {
            console.error('Error progressing driver:', error);
            // Extract meaningful error message from the backend response
            const errorMessage = error.response?.data?.message || error.message || 'An error occurred while transitioning status.';
            setActionError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        const file = event.target.files?.[0];
        if (!file || !id) return;

        const formData = new FormData();
        // The backend expects specific field names for Multer: 
        // photograph, idFrontImage, idBackImage, licenseFront, licenseBack, 
        // backgroundCheckDocument, addressProofDocument, medicalCertificate, etc.
        formData.append(fieldName, file);

        try {
            setUploading(fieldName);
            await uploadDriverDocument(id, formData);
            await fetchDriver();
        } catch (error) {
            console.error(`Error uploading ${fieldName}:`, error);
        } finally {
            setUploading(null);
        }
    };

    const handleUpdateEmergencyContact = async (name: string, phone: string) => {
        try {
            setLoading(true);
            await updateDriver(id!, {
                emergencyContact: { name, phone }
            });
            await fetchDriver();
        } catch (error: any) {
            console.error('Error updating driver:', error);
            setActionError(error.response?.data?.message || 'Failed to update emergency contact');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyField = async (fieldPath: string, value: any) => {
        try {
            setLoading(true);
            const updateObject: any = {};
            const parts = fieldPath.split('.');
            if (parts.length === 2) {
                const updatedGroup = { 
                    ...(driver![parts[0] as keyof Driver] as any), 
                    [parts[1]]: value 
                };
                
                // Auto-set dates based on the guide
                if (fieldPath === 'drivingLicense.verificationStatus' && value === 'VERIFIED') {
                    updatedGroup.verifiedDate = new Date().toISOString().split('T')[0];
                }
                if (fieldPath === 'backgroundCheck.status' && value === 'CLEARED') {
                    updatedGroup.issuedDate = new Date().toISOString().split('T')[0];
                }
                
                updateObject[parts[0]] = updatedGroup;
            } else {
                updateObject[fieldPath] = value;
            }

            await updateDriver(id!, updateObject);
            await fetchDriver();
        } catch (error: any) {
            console.error('Error verifying field:', error);
            setActionError(error.response?.data?.message || 'Update failed');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !driver) return <div className="p-8 text-center animate-pulse font-bold text-gray-500 uppercase tracking-widest">Loading driver profile...</div>;
    if (!driver) return <div className="p-8 text-center">Driver not found</div>;

    const currentStepIndex = ['DRAFT', 'PENDING REVIEW', 'VERIFICATION', 'CREDIT CHECK', 'MANAGER REVIEW', 'APPROVED', 'CONTRACT PENDING', 'ACTIVE'].indexOf(driver.status);

    const steps = [
        { id: 'DRAFT', label: 'Draft', sub: 'Initial Entry' },
        { id: 'PENDING REVIEW', label: 'Pending', sub: 'Awaiting Review' },
        { id: 'VERIFICATION', label: 'Verification', sub: 'Docs Check' },
        { id: 'CREDIT CHECK', label: 'Credit Check', sub: 'Risk Assessment' },
        { id: 'APPROVED', label: 'Approved', sub: 'Ready for Ops' }
    ];

    // Find the mapped index for the visual stepper
    let visualStepIndex = steps.findIndex(s => s.id === driver.status);
    if (visualStepIndex === -1 && currentStepIndex > 0) {
        // Fallback for statuses not explicitly in visual stepper
        visualStepIndex = steps.length - 1;
    }

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
                            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>{driver.personalInfo?.fullName}</h1>
                            <span className="px-3 py-1 text-xs font-bold rounded-full border uppercase tracking-wider" style={{ backgroundColor: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)', borderColor: 'rgba(200,230,0,0.2)' }}>
                                {driver.status.replace(/_/g, ' ')}
                            </span>
                        </div>
                        <p className="flex items-center gap-2 text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                            <FileText size={14} />
                            License: <span className="font-bold" style={{ color: 'var(--text-main)' }}>{driver.drivingLicense?.licenseNumber || 'N/A'}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Role-based Actions */}
                    {isStaff && driver.status === 'DRAFT' && (
                        <button
                            onClick={() => handleProgress('PENDING REVIEW', { notes: 'All documents collected and uploaded.' })}
                            className="px-6 py-2.5 bg-brand-lime text-black font-bold rounded-xl hover:bg-opacity-90 transition-all flex items-center gap-2 shadow-lg active:scale-95"
                        >
                            <PlayCircle size={18} />
                            Submit for Review
                        </button>
                    )}

                    {isStaff && driver.status === 'PENDING REVIEW' && (
                        <button
                            onClick={() => handleProgress('VERIFICATION', { notes: 'License and background checks reviewed.' })}
                            disabled={driver.drivingLicense?.verificationStatus !== 'VERIFIED'}
                            className={`px-6 py-2.5 font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg active:scale-95 ${driver.drivingLicense?.verificationStatus === 'VERIFIED' ? 'bg-brand-lime text-black hover:bg-opacity-90' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                        >
                            <ShieldCheck size={18} />
                            Complete Verification
                        </button>
                    )}

                    {isStaff && driver.status === 'VERIFICATION' && (
                        <button
                            onClick={() => handleProgress('CREDIT CHECK', { 
                                updateData: { 
                                    creditCheck: { 
                                        score: creditScore,
                                        fraudAlert: fraudAlert
                                    } 
                                },
                                notes: 'Experian credit check completed.' 
                            })}
                            disabled={!creditScore}
                            className={`px-6 py-2.5 font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg active:scale-95 ${creditScore ? 'bg-black text-white hover:bg-gray-900' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                        >
                            <PlayCircle size={18} />
                            Submit Credit Result
                        </button>
                    )}

                    {isStaff && driver.status === 'CREDIT CHECK' && (
                        <div className="flex gap-2">
                            {driver.creditCheck?.decision === 'AUTO_APPROVED' && (
                                <button
                                    onClick={() => handleProgress('APPROVED', { notes: 'Auto-approved based on credit score.' })}
                                    className="px-6 py-2.5 bg-brand-lime text-black font-bold rounded-xl hover:bg-opacity-90 transition-all flex items-center gap-2 shadow-lg active:scale-95"
                                >
                                    <CheckCircle2 size={18} />
                                    Advance to Approved
                                </button>
                            )}
                            {driver.creditCheck?.decision === 'MANUAL_REVIEW' && (
                                <button
                                    onClick={() => handleProgress('MANAGER REVIEW', { notes: 'Borderline score submitted for manager review.' })}
                                    className="px-6 py-2.5 bg-yellow-500 text-white font-bold rounded-xl hover:bg-yellow-600 transition-all flex items-center gap-2 shadow-lg active:scale-95"
                                >
                                    <AlertTriangle size={18} />
                                    Submit for Manager Review
                                </button>
                            )}
                            {driver.creditCheck?.decision === 'DECLINED' && (
                                <button
                                    onClick={() => handleProgress('REJECTED', { 
                                        updateData: { rejection: { reason: 'CREDIT DECLINED', notes: 'Declined due to low credit score.' } } 
                                    })}
                                    className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all flex items-center gap-2 shadow-lg active:scale-95"
                                >
                                    <XCircle size={18} />
                                    Reject Application
                                </button>
                            )}
                        </div>
                    )}

                    {isManager && driver.status === 'MANAGER REVIEW' && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleProgress('APPROVED', { 
                                    updateData: { creditCheck: { reviewNotes: reviewNotes } },
                                    notes: 'Approved after manager review.'
                                })}
                                disabled={!reviewNotes}
                                className={`px-6 py-2.5 font-bold rounded-xl transition-all shadow-lg active:scale-95 ${reviewNotes ? 'bg-brand-lime text-black hover:bg-opacity-90' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                            >
                                Approve Driver
                            </button>
                            <button
                                onClick={() => handleProgress('REJECTED', { 
                                    updateData: { rejection: { reason: rejectionReason, notes: reviewNotes } }
                                })}
                                className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg active:scale-95"
                            >
                                Decline Driver
                            </button>
                        </div>
                    )}

                    {isStaff && driver.status === 'APPROVED' && (
                        <button
                            onClick={() => handleProgress('CONTRACT PENDING', { notes: 'Contract issued to driver.' })}
                            className="px-6 py-2.5 bg-black text-white font-bold rounded-xl hover:bg-gray-900 transition-all flex items-center gap-2"
                        >
                            <FileSignature size={18} />
                            Issue Contract
                        </button>
                    )}

                    {isManager && driver.status === 'CONTRACT PENDING' && (
                        <button
                            onClick={() => handleProgress('ACTIVE', { 
                                updateData: { 
                                    activation: { 
                                        credentialsSent: activationChecks.credentialsSent, 
                                        gpsMonitoringActive: activationChecks.gpsMonitoringActive 
                                    } 
                                },
                                notes: 'Driver activated.'
                            })}
                            disabled={!activationChecks.credentialsSent || !activationChecks.gpsMonitoringActive}
                            className={`px-6 py-2.5 font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg ${activationChecks.credentialsSent && activationChecks.gpsMonitoringActive ? 'bg-brand-lime text-black hover:bg-opacity-90 transition-all' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                        >
                            <ShieldCheck size={18} />
                            Activate Driver
                        </button>
                    )}

                    <button
                        onClick={() => handleProgress('REJECTED', { rejection: { reason: 'OTHER', notes: 'Manually disqualified' } })}
                        className="px-6 py-2.5 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-all flex items-center gap-2" style={{ backgroundColor: 'transparent', borderColor: 'rgba(239,68,68,0.2)' }}>
                        <Ban size={18} />
                        Disqualify
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {actionError && (
                <div className="p-4 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-2" style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }}>
                    <XCircle size={20} className="text-red-500 shrink-0" />
                    <div>
                        <h4 className="text-sm font-bold text-red-500 uppercase tracking-wide">Action Failed</h4>
                        <p className="text-xs text-red-400 mt-1">{actionError}</p>
                    </div>
                </div>
            )}

            {/* Stepper */}
            <div className="p-6 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="flex justify-between relative">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 -translate-y-1/2" style={{ backgroundColor: 'var(--border-main)' }} />
                    <div
                        className="absolute top-1/2 left-0 h-0.5 bg-brand-lime -translate-y-1/2 transition-all duration-500"
                        style={{ width: `${(Math.max(0, visualStepIndex) / (steps.length - 1)) * 100}%` }}
                    />
                    {steps.map((step, index) => {
                        const isCompleted = index < visualStepIndex;
                        const isCurrent = index === visualStepIndex;
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
                                    <div className={`text-xs font-bold uppercase tracking-wider ${isCurrent ? 'text-brand-lime' : ''}`} style={{ color: isCurrent ? 'var(--brand-lime)' : 'var(--text-dim)' }}>{step.label}</div>
                                    {!isCurrent && <div className="text-[10px] font-medium uppercase mt-0.5" style={{ color: 'var(--text-dim)' }}>{step.sub}</div>}
                                    {isCurrent && <div className="text-[10px] font-bold uppercase mt-0.5 animate-pulse" style={{ color: 'var(--brand-lime)' }}>In Progress</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-8">
                {/* Information Sections */}
                <div className="space-y-8">
                    {/* Basic Info */}
                    <div className="p-6 rounded-2xl shadow-sm border overflow-hidden relative" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-[100px] -mr-8 -mt-8" style={{ backgroundColor: 'rgba(200,230,0,0.03)' }} />
                        <div className="flex items-center justify-between gap-2 mb-6 border-b pb-4 relative z-10" style={{ borderColor: 'rgba(255,255,255,0.02)' }}>
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)' }}>
                                    <User size={20} />
                                </div>
                                <h2 className="font-bold uppercase tracking-widest text-sm" style={{ color: 'var(--text-main)' }}>Personal Details</h2>
                            </div>
                            {driver.personalInfo?.photograph && (
                                <div className="relative group">
                                    <img src={driver.personalInfo.photograph.startsWith('http') ? driver.personalInfo.photograph : `${import.meta.env.VITE_S3_BASE_URL || import.meta.env.VITE_API_BASE_URL || ''}/${driver.personalInfo.photograph}`} alt="Driver" className="w-12 h-12 rounded-full object-cover border-2 border-brand-lime" />
                                    <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                        <ImageIcon size={16} className="text-white" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-8">
                            <InfoCard label="Email Address" value={driver.personalInfo?.email} />
                            <InfoCard label="Phone Number" value={driver.personalInfo?.phone} />
                            <InfoCard label="Branch" value={typeof driver.branch === 'object' ? driver.branch.name : driver.branch} icon={<Building2 size={14} />} />
                            <InfoCard label="Applied Date" value={new Date(driver.createdAt || driver.appliedAt).toLocaleDateString()} icon={<Calendar size={14} />} />
                            <InfoCard label="Birth Date" value={driver.personalInfo?.dateOfBirth ? new Date(driver.personalInfo.dateOfBirth).toLocaleDateString() : 'N/A'} />
                            <InfoCard label="Nationality" value={driver.personalInfo?.nationality || 'N/A'} />
                            <InfoCard label="WhatsApp" value={driver.personalInfo?.whatsappNumber || 'N/A'} />
                            <InfoCard label="ID Type" value={driver.identityDocs?.idType || 'N/A'} />
                            <InfoCard label="ID Number" value={driver.identityDocs?.idNumber || 'N/A'} />
                        </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="p-6 rounded-2xl shadow-sm border overflow-hidden relative" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between gap-2 mb-6 border-b pb-4 relative z-10" style={{ borderColor: 'rgba(255,255,255,0.02)' }}>
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--brand-danger, #ef4444)' }}>
                                    <ShieldCheck size={20} />
                                </div>
                                <h2 className="font-bold uppercase tracking-widest text-sm" style={{ color: 'var(--text-main)' }}>Emergency Contact</h2>
                            </div>
                            {(userRole === 'financestaff' || userRole === 'branchmanager') && (
                                <button
                                    onClick={() => {
                                        const name = prompt("Enter Emergency Contact Name", driver.personalInfo?.fullName || "");
                                        if (name !== null) {
                                            const phone = prompt("Enter Emergency Contact Phone", driver.personalInfo?.phone || "");
                                            if (phone !== null) {
                                                handleUpdateEmergencyContact(name, phone);
                                            }
                                        }
                                    }}
                                    className="text-xs font-bold uppercase tracking-wider text-brand-lime hover:underline"
                                >
                                    Edit Contact
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <InfoCard
                                label="Contact Name"
                                value={driver.emergencyContact?.name ? driver.emergencyContact.name : <span className="text-red-500 flex items-center gap-1"><XCircle size={14} /> Missing</span>}
                                icon={<User size={14} />}
                            />
                            <InfoCard
                                label="Contact Phone"
                                value={driver.emergencyContact?.phone ? driver.emergencyContact.phone : <span className="text-red-500 flex items-center gap-1"><XCircle size={14} /> Missing</span>}
                                icon={<Phone size={14} />}
                            />
                        </div>
                    </div>

                    {/* Additional Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Driving License */}
                        <div className="p-6 rounded-xl border" style={{ backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'var(--border-main)' }}>
                            <h3 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                                <FileText size={14} className="text-brand-lime" />
                                Driving License
                            </h3>
                            <div className="space-y-3">
                                <InfoCard label="Categories" value={driver.drivingLicense?.categories?.join(', ') || 'None'} />
                                <InfoCard label="Verification" value={driver.drivingLicense?.verificationStatus} />
                            </div>
                        </div>

                        {/* Background Check */}
                        <div className="p-6 rounded-xl border" style={{ backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'var(--border-main)' }}>
                            <h3 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                                <ShieldCheck size={14} className="text-brand-lime" />
                                Background Check
                            </h3>
                            <div className="space-y-3">
                                <InfoCard label="Status" value={driver.backgroundCheck?.status} />
                                <InfoCard label="Last Check" value={driver.backgroundCheck?.performedAt ? new Date(driver.backgroundCheck.performedAt).toLocaleDateString() : 'N/A'} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Workflow Specific Panels */}
                <div className="space-y-6">
                    {/* License Verification Panel (PENDING REVIEW / VERIFICATION Stage) */}
                    {(driver.status === 'PENDING REVIEW' || driver.status === 'VERIFICATION') && (
                        <div className="p-6 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-2 mb-6 border-b pb-4" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--brand-danger, #ef4444)' }}>
                                    <ShieldCheck size={20} />
                                </div>
                                <h2 className="font-bold uppercase tracking-widest text-sm" style={{ color: 'var(--text-main)' }}>Verification Panel</h2>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wider opacity-50">Driving License Verification</h3>
                                    <div className="flex gap-4 p-4 rounded-xl border bg-black/5" style={{ borderColor: 'var(--border-main)' }}>
                                        {driver.drivingLicense?.frontImage && (
                                            <div className="w-16 h-16 rounded-lg overflow-hidden border shrink-0 bg-white">
                                                <img 
                                                    src={driver.drivingLicense.frontImage.startsWith('http') ? driver.drivingLicense.frontImage : `${import.meta.env.VITE_S3_BASE_URL || import.meta.env.VITE_API_BASE_URL || ''}/${driver.drivingLicense.frontImage}`} 
                                                    alt="License" 
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <p className="font-bold text-sm">{driver.drivingLicense?.licenseNumber || 'N/A'}</p>
                                                <p className="text-[10px] opacity-60 font-medium italic">Status: {driver.drivingLicense?.verificationStatus}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleVerifyField('drivingLicense.verificationStatus', 'VERIFIED')}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${driver.drivingLicense?.verificationStatus === 'VERIFIED' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                >
                                                    Mark Verified
                                                </button>
                                                <button 
                                                    onClick={() => handleVerifyField('drivingLicense.verificationStatus', 'REJECTED')}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${driver.drivingLicense?.verificationStatus === 'REJECTED' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                >
                                                    Fail
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-wider opacity-50">Background Check Verification</h3>
                                    <div className="p-4 rounded-xl border bg-black/5 space-y-4" style={{ borderColor: 'var(--border-main)' }}>
                                        <div className="flex items-center gap-4">
                                            {driver.backgroundCheck?.document && (
                                                <div className="w-16 h-16 rounded-lg overflow-hidden border shrink-0 bg-white">
                                                    <img 
                                                        src={driver.backgroundCheck.document.startsWith('http') ? driver.backgroundCheck.document : `${import.meta.env.VITE_S3_BASE_URL || import.meta.env.VITE_API_BASE_URL || ''}/${driver.backgroundCheck.document}`} 
                                                        alt="Background" 
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <p className="font-bold text-sm">{driver.backgroundCheck?.status || 'PENDING'}</p>
                                                <p className="text-[10px] opacity-60 font-medium italic">
                                                    {driver.backgroundCheck?.issuedDate ? `Issued: ${new Date(driver.backgroundCheck.issuedDate).toLocaleDateString()}` : 'Date Not Recorded'}
                                                </p>
                                            </div>
                                            
                                            <div className="flex gap-2 shrink-0">
                                                <button 
                                                    onClick={() => handleVerifyField('backgroundCheck.status', 'CLEARED')}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${driver.backgroundCheck?.status === 'CLEARED' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                >
                                                    Clear
                                                </button>
                                                <button 
                                                    onClick={() => handleVerifyField('backgroundCheck.status', 'FAILED')}
                                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${driver.backgroundCheck?.status === 'FAILED' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                >
                                                    Fail
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                            <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-black border border-white/10 rounded-lg text-[10px] font-bold text-white cursor-pointer hover:bg-gray-900 transition-all">
                                                <Upload size={12} className={uploading === 'backgroundCheckDocument' ? 'animate-bounce' : ''} />
                                                {uploading === 'backgroundCheckDocument' ? 'Uploading...' : driver.backgroundCheck?.document ? 'Update Document' : 'Upload Scan'}
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*,.pdf"
                                                    onChange={(e) => handleFileUpload(e, 'backgroundCheckDocument')}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Credit Check Entry Panel (VERIFICATION Stage) */}
                    {driver.status === 'VERIFICATION' && (
                        <div className="p-6 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-2 mb-6 border-b pb-4" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(0,0,0,0.1)', color: 'var(--text-main)' }}>
                                    <AlertCircle size={20} />
                                </div>
                                <h2 className="font-bold uppercase tracking-widest text-sm" style={{ color: 'var(--text-main)' }}>Experian Credit Check Result</h2>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="text-xs font-bold uppercase tracking-wider opacity-50 block">Experian Score (300-850)</label>
                                    <input 
                                        type="number" 
                                        value={creditScore || ''} 
                                        onChange={(e) => setCreditScore(parseInt(e.target.value) || 0)}
                                        className="w-full bg-black/5 border p-3 rounded-xl font-bold outline-none focus:border-brand-lime transition-all"
                                        style={{ borderColor: 'var(--border-main)' }}
                                        placeholder="Enter score..."
                                    />
                                    
                                    <div className="grid grid-cols-1 gap-3 pt-2">
                                        <label className="flex items-center gap-2 px-3 py-2 bg-black border border-white/10 rounded-lg text-[10px] font-bold text-white cursor-pointer hover:bg-gray-900 transition-all w-fit">
                                            <Upload size={12} className={uploading === 'consentForm' ? 'animate-bounce' : ''} />
                                            {uploading === 'consentForm' ? 'Uploading...' : driver.creditCheck?.reportS3Key ? 'Update Consent Form' : 'Upload Consent Form'}
                                            <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'consentForm')} />
                                        </label>

                                        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100">
                                            <input 
                                                type="checkbox" 
                                                id="fraudAlert" 
                                                checked={fraudAlert} 
                                                onChange={(e) => setFraudAlert(e.target.checked)}
                                                className="w-4 h-4 accent-red-600"
                                            />
                                            <label htmlFor="fraudAlert" className="text-[10px] font-bold text-red-600 cursor-pointer">Flag as Potential Fraud Alert</label>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-center p-6 rounded-2xl border bg-brand-lime/5 border-brand-lime/20">
                                    <p className="text-xs font-bold uppercase tracking-widest text-brand-lime mb-2">Policy Outcome</p>
                                    {creditScore ? (
                                        <>
                                            <p className="text-2xl font-black">
                                                {creditScore >= 650 ? 'AUTO APPROVED' : 
                                                 creditScore >= 500 ? 'MANUAL REVIEW' : 'DECLINED'}
                                            </p>
                                            <p className="text-xs opacity-60 mt-2">Based on system score brackets</p>
                                        </>
                                    ) : (
                                        <p className="font-bold opacity-40 italic">Waiting for score input...</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Manager Review Notes Panel (MANAGER REVIEW Stage or Manual Review needed) */}
                    {(driver.status === 'MANAGER REVIEW' || driver.status === 'REJECTED' || (driver.status === 'CREDIT CHECK' && driver.creditCheck?.decision === 'MANUAL_REVIEW')) && (
                        <div className="p-6 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-2 mb-6 border-b pb-4" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--brand-danger)' }}>
                                    <AlertTriangle size={20} />
                                </div>
                                <h2 className="font-bold uppercase tracking-widest text-sm" style={{ color: 'var(--text-main)' }}>Manager Evaluation</h2>
                            </div>
                            
                            <div className="space-y-4">
                                <label className="text-xs font-bold uppercase tracking-wider opacity-50 block">Review / Rejection Notes</label>
                                <textarea 
                                    value={reviewNotes} 
                                    onChange={(e) => setReviewNotes(e.target.value)}
                                    className="w-full bg-black/5 border p-4 rounded-2xl font-medium outline-none focus:border-brand-lime transition-all min-h-[120px]"
                                    style={{ borderColor: 'var(--border-main)' }}
                                    placeholder="Enter your evaluation reasons or rejection grounds..."
                                />
                                {driver.status === 'MANAGER REVIEW' && (
                                    <div className="flex items-center gap-4">
                                        <select 
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            className="bg-black/5 border p-2 rounded-lg text-xs font-bold outline-none"
                                            style={{ borderColor: 'var(--border-main)' }}
                                        >
                                            <option value="CREDIT DECLINED">Credit Declined</option>
                                            <option value="FAILED VERIFICATION">Failed Verification</option>
                                            <option value="DOCUMENT FRAUD">Document Fraud</option>
                                            <option value="OTHER">Other Reason</option>
                                        </select>
                                        <p className="text-[10px] opacity-50 font-medium italic">Select reason only if declining</p>
                                    </div>
                                )}
                                {driver.rejection && (
                                    <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700">
                                        <p className="text-xs font-black uppercase mb-1">Rejection Reason: {driver.rejection.reason}</p>
                                        <p className="text-sm">{driver.rejection.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Activation Checklist (CONTRACT PENDING Stage) */}
                    {driver.status === 'CONTRACT PENDING' && (
                        <div className="p-6 rounded-2xl shadow-sm border transition-all" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-2 mb-6 border-b pb-4" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--brand-lime-subtle, rgba(200,230,0,0.1))', color: 'var(--brand-lime)' }}>
                                    <FileCheck size={20} />
                                </div>
                                <h2 className="font-bold uppercase tracking-widest text-sm" style={{ color: 'var(--text-main)' }}>Final Activation Checklist</h2>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-4 rounded-2xl border bg-black/5 transition-all" style={{ borderColor: activationChecks.credentialsSent ? 'var(--brand-lime)' : 'var(--border-main)' }}>
                                    <input 
                                        type="checkbox" 
                                        id="credSent" 
                                        checked={activationChecks.credentialsSent} 
                                        onChange={(e) => setActivationChecks(prev => ({ ...prev, credentialsSent: e.target.checked }))}
                                        className="w-5 h-5 accent-brand-lime"
                                    />
                                    <label htmlFor="credSent" className="font-bold cursor-pointer">Login Credentials Sent to Driver</label>
                                </div>
                                <div className="flex items-center gap-3 p-4 rounded-2xl border bg-black/5 transition-all" style={{ borderColor: activationChecks.gpsMonitoringActive ? 'var(--brand-lime)' : 'var(--border-main)' }}>
                                    <input 
                                        type="checkbox" 
                                        id="gpsActive" 
                                        checked={activationChecks.gpsMonitoringActive} 
                                        onChange={(e) => setActivationChecks(prev => ({ ...prev, gpsMonitoringActive: e.target.checked }))}
                                        className="w-5 h-5 accent-brand-lime"
                                    />
                                    <label htmlFor="gpsActive" className="font-bold cursor-pointer">GPS Monitoring System Activated</label>
                                </div>

                                {/* Contract Uploads in Activation Panel */}
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <label className="flex items-center justify-center gap-2 px-3 py-3 bg-black border border-white/10 rounded-xl text-[10px] font-bold text-white cursor-pointer hover:bg-gray-900 transition-all">
                                        <Upload size={14} className={uploading === 'contractPDF' ? 'animate-bounce' : ''} />
                                        {uploading === 'contractPDF' ? 'Uploading...' : driver.contract?.pdfS3Key ? 'Update Contract PDF' : 'Upload Contract PDF'}
                                        <input type="file" className="hidden" accept=".pdf" onChange={(e) => handleFileUpload(e, 'contractPDF')} />
                                    </label>
                                    <label className="flex items-center justify-center gap-2 px-3 py-3 bg-black border border-white/10 rounded-xl text-[10px] font-bold text-white cursor-pointer hover:bg-gray-900 transition-all">
                                        <Upload size={14} className={uploading === 'signedContract' ? 'animate-bounce' : ''} />
                                        {uploading === 'signedContract' ? 'Uploading...' : driver.contract?.signedS3Key ? 'Update Signed Copy' : 'Upload Signed Copy'}
                                        <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'signedContract')} />
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Documents Section */}
                <div className="space-y-6">
                    <div className="p-6 rounded-2xl shadow-sm border h-full" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 mb-6 border-b pb-4" style={{ borderColor: 'rgba(255,255,255,0.02)' }}>
                            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)' }}>
                                <FileText size={20} />
                            </div>
                            <h2 className="font-bold uppercase tracking-widest text-sm" style={{ color: 'var(--text-main)' }}>Required Documents</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <DocUploadRow
                                label="Photograph"
                                status="PENDING"
                                url={driver.personalInfo?.photograph}
                                uploading={uploading === 'photograph'}
                                onUpload={(e) => handleFileUpload(e, 'photograph')}
                            />
                            <DocUploadRow
                                label="License Front"
                                status={driver.drivingLicense?.verificationStatus}
                                url={driver.drivingLicense?.frontImage}
                                uploading={uploading === 'licenseFront'}
                                onUpload={(e) => handleFileUpload(e, 'licenseFront')}
                            />
                            <DocUploadRow
                                label="License Back"
                                status={driver.drivingLicense?.verificationStatus}
                                url={driver.drivingLicense?.backImage}
                                uploading={uploading === 'licenseBack'}
                                onUpload={(e) => handleFileUpload(e, 'licenseBack')}
                            />
                            <DocUploadRow
                                label="ID Front"
                                status="PENDING"
                                url={driver.identityDocs?.idFrontImage}
                                fieldName="idFrontImage"
                                uploading={uploading === 'idFrontImage'}
                                onUpload={(e) => handleFileUpload(e, 'idFrontImage')}
                            />
                            <DocUploadRow
                                label="ID Back"
                                status="PENDING"
                                url={driver.identityDocs?.idBackImage}
                                fieldName="idBackImage"
                                uploading={uploading === 'idBackImage'}
                                onUpload={(e) => handleFileUpload(e, 'idBackImage')}
                            />
                            <DocUploadRow
                                label="Address Proof"
                                status="PENDING"
                                url={driver.addressProof?.document}
                                fieldName="addressProofDocument"
                                uploading={uploading === 'addressProofDocument'}
                                onUpload={(e) => handleFileUpload(e, 'addressProofDocument')}
                            />
                            <DocUploadRow
                                label="Medical Cert"
                                status={driver.medicalFitness?.isRequired ? "REQUIRED" : undefined}
                                url={driver.medicalFitness?.certificate}
                                fieldName="medicalCertificate"
                                uploading={uploading === 'medicalCertificate'}
                                onUpload={(e) => handleFileUpload(e, 'medicalCertificate')}
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
            {value || 'N/A'}
        </div>
    </div>
);

const DocUploadRow = ({ label, status, url, uploading, onUpload, fieldName }: {
    label: string;
    status?: string;
    url?: string | null;
    uploading: boolean;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    fieldName?: string;
}) => {
    const defaultBaseUrl = import.meta.env.VITE_S3_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';
    const fileUrl = url ? (url.startsWith('http') ? url : `${defaultBaseUrl.replace(/\/$/, '')}/${url}`) : null;

    return (
        <div className="p-4 border rounded-xl group hover:border-brand-lime/30 transition-all flex flex-col h-full" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
            <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>{label}</span>
                {status === 'VERIFIED' ? (
                    <CheckCircle2 size={16} className="text-green-500" />
                ) : status === 'REJECTED' ? (
                    <XCircle size={16} className="text-red-500" />
                ) : url ? (
                    <CheckCircle2 size={16} className="text-brand-lime" />
                ) : null}
            </div>

            <div className="flex-grow flex flex-col justify-end">
                {fileUrl ? (
                    <div className="space-y-4">
                        <div className="w-full aspect-[4/3] rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border-main)' }}>
                            {fileUrl.match(/\.(pdf)$/i) ? (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50/5 text-gray-400 gap-2">
                                    <FileText size={32} />
                                    <span className="text-xs uppercase tracking-widest font-bold">PDF Document</span>
                                </div>
                            ) : (
                                <img src={fileUrl} alt={label} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                            )}
                        </div>
                        <div className="flex items-center justify-between mt-auto pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                            <a href={fileUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-brand-lime uppercase hover:underline">View File</a>
                            <label className="cursor-pointer group/upload">
                                <input type="file" className="hidden" onChange={onUpload} disabled={uploading} />
                                <Upload size={14} className="text-gray-400 group-hover/upload:text-brand-lime transition-colors" />
                            </label>
                        </div>
                    </div>
                ) : (
                    <div className="relative mt-auto h-full min-h-[120px]">
                        <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={onUpload}
                            disabled={uploading}
                        />
                        <button
                            disabled={uploading}
                            className="w-full h-full flex flex-col items-center justify-center gap-3 py-6 border-2 border-dashed rounded-lg text-xs font-bold transition-all relative overflow-hidden"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--brand-lime)'; e.currentTarget.style.color = 'var(--brand-lime)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-main)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
                        >
                            {uploading ? (
                                <span className="animate-pulse">Uploading...</span>
                            ) : (
                                <>
                                    <div className="p-3 rounded-full" style={{ backgroundColor: 'rgba(200,230,0,0.05)' }}>
                                        <Upload size={20} className="text-brand-lime" />
                                    </div>
                                    <span>Upload {fieldName || 'Doc'}</span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DriverDetail;
