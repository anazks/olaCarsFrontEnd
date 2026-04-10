import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, Calendar, Building2, User, CheckCircle2, XCircle, Phone, Clock, Upload, ShieldCheck, PlayCircle, Ban, Image as ImageIcon, AlertCircle, FileCheck, Car, Tag, Download, Printer, TrendingUp, Gauge, Zap, CreditCard, History } from 'lucide-react';
import { getDriverById, progressDriver, uploadDriverDocument, updateDriver, markRentAsPaid } from '../../../services/driverService';
import type { Driver } from '../../../services/driverService';
import { getVehicleById } from '../../../services/vehicleService';
import type { Vehicle } from '../../../services/vehicleService';
import agreementService from '../../../services/agreementService';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import { getUser, getUserRole } from '../../../utils/auth';

const DriverDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [driver, setDriver] = useState<Driver | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [reviewNotes, setReviewNotes] = useState<string>('');
    const [rejectionReason, setRejectionReason] = useState<string>('OTHER');
    const [assignedVehicle, setAssignedVehicle] = useState<Vehicle | null>(null);
    const [loadingVehicle, setLoadingVehicle] = useState(false);
    const [contractPreviewHTML, setContractPreviewHTML] = useState<string | null>(null);
    const [rentActiveTab, setRentActiveTab] = useState<'upcoming' | 'history'>('upcoming');
    const [paymentAmounts, setPaymentAmounts] = useState<Record<number, string>>({});
    const [expandedWeek, setExpandedWeek] = useState<number | null>(null);
    const currentUser = getUser();
    const userRole = getUserRole();
    const isManager = ['branchmanager', 'countrymanager', 'admin', 'financeadmin', 'operationadmin'].includes(userRole || '');
    const isFinanceStaff = userRole === 'financestaff';
    const isOpsStaff = userRole === 'operationstaff';
    const isStaff = isFinanceStaff || isOpsStaff || isManager;

    useEffect(() => {
        if (id) fetchDriver();
    }, [id]);

    const fetchDriver = async () => {
        try {
            setLoading(true);
            const data = await getDriverById(id!);
            setDriver(data);
            if (data.creditCheck?.reviewNotes) setReviewNotes(data.creditCheck.reviewNotes);

            if (data.currentVehicle) {
                try {
                    setLoadingVehicle(true);
                    const vehicleData = await getVehicleById(data.currentVehicle);
                    setAssignedVehicle(vehicleData);
                } catch (vError) {
                    console.error('Error fetching assigned vehicle:', vError);
                } finally {
                    setLoadingVehicle(false);
                }
            } else {
                setAssignedVehicle(null);
            }

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


    const handlePrintContract = () => {
        if (!contractPreviewHTML) return;
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Print Contract</title>
                        <style>
                            body { font-family: serif; line-height: 1.6; color: #111; padding: 40px; }
                            h1, h2, h3 { font-family: sans-serif; margin-top: 1.5em; margin-bottom: 0.5em; }
                            table { width: 100%; border-collapse: collapse; margin: 1em 0; }
                            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
                            @media print {
                                body { padding: 0; }
                            }
                        </style>
                    </head>
                    <body>${contractPreviewHTML}</body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    };

    const handleDownloadContract = async () => {
        if (!contractPreviewHTML) return;
        const toastId = toast.loading('Downloading Contract...');
        try {
            const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
            const container = document.createElement('div');
            container.style.width = '550pt';
            container.style.padding = '40pt';
            container.style.color = '#111';
            container.style.fontFamily = 'serif';
            container.style.lineHeight = '1.6';
            container.innerHTML = contractPreviewHTML;

            const style = document.createElement('style');
            style.innerHTML = `
                h1, h2, h3 { font-family: sans-serif; margin-top: 1.5em; margin-bottom: 0.5em; color: #111; }
                p { margin-bottom: 1em; }
                table { width: 100%; border-collapse: collapse; margin: 1em 0; }
                th, td { border: 1pt solid #eee; padding: 8pt; text-align: left; }
            `;
            container.appendChild(style);
            document.body.appendChild(container);

            await doc.html(container, { x: 20, y: 20, width: 550, windowWidth: 800 });
            doc.save(`Driver_Contract_${driver?.personalInfo?.fullName?.replace(/\s+/g, '_') || 'Preview'}.pdf`);
            document.body.removeChild(container);
            toast.success('Download complete', { id: toastId });
        } catch (error: any) {
            toast.error('Failed to download', { id: toastId });
        }
    };

    const confirmAndIssueContract = async () => {
        if (!contractPreviewHTML) return;
        const toastId = toast.loading('Generating & Uploading Contract...');
        try {
            setLoading(true);
            const fileName = `Driver_Contract_${driver?.personalInfo?.fullName.replace(/\s+/g, '_')}`;

            const doc = new jsPDF({
                unit: 'pt',
                format: 'a4',
                orientation: 'portrait'
            });

            const container = document.createElement('div');
            container.style.width = '550pt';
            container.style.padding = '40pt';
            container.style.color = '#111';
            container.style.fontFamily = 'serif';
            container.style.lineHeight = '1.6';
            container.innerHTML = contractPreviewHTML;

            const style = document.createElement('style');
            style.innerHTML = `
                h1, h2, h3 { font-family: sans-serif; margin-top: 1.5em; margin-bottom: 0.5em; color: #111; }
                p { margin-bottom: 1em; }
                table { width: 100%; border-collapse: collapse; margin: 1em 0; }
                th, td { border: 1pt solid #eee; padding: 8pt; text-align: left; }
            `;
            container.appendChild(style);
            document.body.appendChild(container);

            await doc.html(container, {
                x: 20,
                y: 20,
                width: 550,
                windowWidth: 800
            });

            const pdfBlob = doc.output('blob');
            document.body.removeChild(container);

            const formData = new FormData();
            formData.append('contractPDF', pdfBlob, `${fileName}.pdf`);
            await uploadDriverDocument(id!, formData);

            await handleProgress('CONTRACT PENDING', { notes: 'Automated: Contract generated and issued' });

            toast.success('Contract generated and uploaded successfully', { id: toastId });
            setContractPreviewHTML(null);
        } catch (error: any) {
            console.error('Contract generation failed:', error);
            toast.error(error.message || 'Failed to generate contract', { id: toastId });
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

    const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !id) return;

        const formData = new FormData();
        const fields = [
            'photograph',
            'licenseFront',
            'licenseBack',
            'idFrontImage',
            'idBackImage',
            'addressProofDocument',
            'medicalCertificate',
            'consentForm'
        ];

        fields.forEach(field => formData.append(field, file));

        try {
            setUploading('bulk');
            const toastId = toast.loading('Bulk uploading documents...');
            await uploadDriverDocument(id, formData);
            await fetchDriver();
            toast.success('Bulk upload successful (Testing)', { id: toastId });
        } catch (error) {
            console.error('Bulk upload failed:', error);
            toast.error('Bulk upload failed');
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

    const handlePartialPayment = async (weekNumber: number, payAmount: number) => {
        if (!payAmount || payAmount <= 0) {
            toast.error('Enter a valid payment amount');
            return;
        }
        const toastId = toast.loading(`Recording $${payAmount.toLocaleString()} for Week ${weekNumber}...`);
        try {
            setLoading(true);
            await markRentAsPaid(id!, { weekNumber, amount: payAmount, paymentMethod: 'Cash' });
            toast.success(`Payment of $${payAmount.toLocaleString()} recorded for Week ${weekNumber}`, { id: toastId });
            setPaymentAmounts(prev => ({ ...prev, [weekNumber]: '' }));
            await fetchDriver();
        } catch (error: any) {
            console.error('Error recording payment:', error);
            toast.error(error.response?.data?.message || 'Failed to record payment', { id: toastId });
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

    const statusList = ['DRAFT', 'PENDING REVIEW', 'VERIFICATION', 'CREDIT CHECK', 'MANAGER REVIEW', 'APPROVED', 'ACTIVE', 'REJECTED'];
    const currentStepIndex = statusList.indexOf(driver.status);

    const steps = [
        { id: 'DRAFT', label: 'Draft', sub: 'Initial Entry' },
        { id: 'PENDING REVIEW', label: 'Pending', sub: 'Awaiting Review' },
        { id: 'VERIFICATION', label: 'Verification', sub: 'Docs Check' },
        { id: 'CREDIT CHECK', label: 'Credit Check', sub: 'Risk Assessment' },
        { id: 'APPROVED', label: 'Approved', sub: 'Policy Pass' },
        { id: 'ACTIVE', label: 'Active', sub: 'Ready' }
    ];

    // Find the mapped index for the visual stepper
    let visualStepIndex = steps.findIndex(s => s.id === driver.status);
    if (driver.status === 'MANAGER REVIEW') visualStepIndex = 3; // Treat as part of Credit Check stage
    if (visualStepIndex === -1 && currentStepIndex > 0) {
        // Fallback for statuses not explicitly in visual stepper
        visualStepIndex = steps.length - 1;
    }

    const canProgress = () => {
        if (!driver) return false;
        if (driver.status === 'DRAFT') {
            return !!(driver.personalInfo?.fullName && driver.personalInfo?.email && driver.personalInfo?.phone && driver.drivingLicense?.licenseNumber && driver.drivingLicense?.frontImage && driver.drivingLicense?.backImage && driver.identityDocs?.idFrontImage && driver.identityDocs?.idBackImage && driver.emergencyContact?.name && driver.emergencyContact?.phone);
        }
        if (driver.status === 'PENDING REVIEW') {
            return driver.drivingLicense?.verificationStatus === 'VERIFIED' && !!driver.backgroundCheck?.document && driver.backgroundCheck?.status !== 'NOT PROVIDED';
        }
        if (driver.status === 'VERIFICATION') {
            return !!driver.creditCheck?.consentForm;
        }
        if (driver.status === 'CREDIT CHECK' || driver.status === 'MANAGER REVIEW') {
            return !!driver.creditCheck?.score && driver.creditCheck?.decision !== 'DECLINED';
        }
        if (driver.status === 'APPROVED') {
            return true; // Now allows direct activation
        }
        return true;
    };

    const RenderActionCenter = () => {

        const renderRequirements = () => {
            const reqs = [];
            if (driver.status === 'DRAFT') {
                reqs.push({ label: 'Basic Info', met: !!(driver.personalInfo?.fullName && driver.personalInfo?.email && driver.personalInfo?.phone) });
                reqs.push({ label: 'ID Docs', met: !!(driver.identityDocs?.idFrontImage && driver.identityDocs?.idBackImage) });
                reqs.push({ label: 'License Docs', met: !!(driver.drivingLicense?.frontImage && driver.drivingLicense?.backImage && driver.drivingLicense?.licenseNumber) });
                reqs.push({ label: 'Emergency Contact', met: !!(driver.emergencyContact?.name && driver.emergencyContact?.phone) });
            } else if (driver.status === 'PENDING REVIEW') {
                reqs.push({ label: 'License Verified', met: driver.drivingLicense?.verificationStatus === 'VERIFIED' });
                reqs.push({ label: 'BG Check Uploaded', met: !!driver.backgroundCheck?.document });
            } else if (driver.status === 'VERIFICATION') {
                reqs.push({ label: 'Consent Form', met: !!driver.creditCheck?.consentForm });
            } else if (driver.status === 'CREDIT CHECK' || driver.status === 'MANAGER REVIEW') {
                reqs.push({ label: 'Credit Score Recorded', met: !!driver.creditCheck?.score });
            } else if (driver.status === 'APPROVED') {
                reqs.push({ label: 'Policy Approved', met: true });
            }

            if (reqs.length === 0) return null;

            return (
                <div className="flex flex-wrap gap-4 mt-4 py-3 border-t border-white/5">
                    {reqs.map((r, i) => (
                        <div key={i} className="flex items-center gap-2">
                            {r.met ? <CheckCircle2 size={14} className="text-brand-lime" /> : <AlertCircle size={14} className="text-yellow-500" />}
                            <span className={`text-[10px] font-bold uppercase tracking-tight ${r.met ? 'text-brand-lime' : 'text-dim'}`}>{r.label}</span>
                        </div>
                    ))}
                </div>
            );
        };

        return (
            <div className="p-8 rounded-[2rem] border shadow-2xl relative overflow-hidden transition-all duration-500 hover:shadow-brand-lime/5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-lime/5 rounded-full blur-3xl -mr-32 -mt-32 animate-pulse" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-2xl bg-brand-lime/10 text-brand-lime">
                                <Clock size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tighter" style={{ color: 'var(--text-main)' }}>
                                    Current Stage: {driver.status.replace(/_/g, ' ')}
                                </h2>
                                <p className="text-xs font-medium opacity-60">Complete the tasks below to progress the application.</p>
                            </div>
                        </div>
                        {renderRequirements()}
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {/* Status-Specific Actions */}
                        {driver.status === 'DRAFT' && isStaff && (
                            <button
                                onClick={() => handleProgress('PENDING REVIEW', { notes: 'Automated: Draft submission' })}
                                disabled={!canProgress()}
                                className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center gap-3 shadow-xl active:scale-95 ${canProgress() ? 'bg-brand-lime text-black hover:scale-105' : 'bg-white/5 text-dim cursor-not-allowed grayscale'}`}
                            >
                                <PlayCircle size={20} />
                                Submit for Review
                            </button>
                        )}

                        {driver.status === 'PENDING REVIEW' && (isFinanceStaff || userRole === 'countrymanager' || userRole === 'branchmanager') && (
                            <button
                                onClick={() => handleProgress('VERIFICATION', { notes: 'Finance/Manager Review Completed' })}
                                disabled={!canProgress()}
                                className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center gap-3 shadow-xl active:scale-95 ${canProgress() ? 'bg-brand-lime text-black' : 'bg-white/5 text-dim cursor-not-allowed'}`}
                            >
                                <ShieldCheck size={20} />
                                Complete Verification
                            </button>
                        )}

                        {driver.status === 'VERIFICATION' && (isFinanceStaff || userRole === 'countrymanager') && (
                            <button
                                onClick={() => {
                                    const input = document.getElementById('test-score-input') as HTMLInputElement;
                                    const val = parseInt(input?.value);
                                    handleProgress('CREDIT CHECK', {
                                        updateData: {
                                            creditCheck: !isNaN(val) ? { score: val } : {}
                                        },
                                        notes: 'Triggering credit assessment'
                                    });
                                }}
                                disabled={!canProgress()}
                                className={`px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center gap-3 shadow-xl active:scale-95 ${canProgress() ? 'bg-brand-lime text-black hover:scale-105' : 'bg-white/5 text-dim cursor-not-allowed grayscale'}`}
                            >
                                <FileCheck size={20} />
                                Start Credit Assessment
                            </button>
                        )}

                        {driver.status === 'CREDIT CHECK' && (isFinanceStaff || userRole === 'countrymanager') && (
                            <div className="px-6 py-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center gap-3">
                                <Clock size={20} className="text-yellow-500 animate-spin" />
                                <span className="text-xs font-black text-yellow-500 uppercase">System Assessment in Progress</span>
                            </div>
                        )}

                        {(driver.status === 'CREDIT CHECK' || driver.status === 'MANAGER REVIEW') && isManager && (
                            <div className="flex gap-4">
                                <button
                                    onClick={() => handleProgress('APPROVED', {
                                        updateData: {
                                            approvedBy: { id: currentUser?._id, name: currentUser?.fullName, role: userRole },
                                            approvedAt: new Date().toISOString()
                                        },
                                        notes: 'Manager Final Approval'
                                    })}
                                    disabled={driver.status === 'MANAGER REVIEW' && !reviewNotes}
                                    className="px-8 py-4 bg-brand-lime text-black rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-all shadow-xl active:scale-95 flex items-center gap-2"
                                >
                                    <CheckCircle2 size={20} />
                                    Approve Application
                                </button>
                                <button
                                    onClick={() => handleProgress('REJECTED', {
                                        updateData: { rejection: { reason: rejectionReason, notes: reviewNotes } }
                                    })}
                                    className="px-8 py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-red-700 transition-all shadow-xl active:scale-95 flex items-center gap-2"
                                >
                                    <XCircle size={20} />
                                    Reject
                                </button>
                            </div>
                        )}

                        {driver.status === 'APPROVED' && isStaff && (
                            <button
                                onClick={() => handleProgress('ACTIVE', { notes: 'Activated after Policy Approval' })}
                                className="px-8 py-4 bg-brand-lime text-black rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-all shadow-xl active:scale-95 flex items-center gap-3"
                            >
                                <CheckCircle2 size={20} />
                                Activate Application
                            </button>
                        )}



                        {driver.status === 'ACTIVE' && isStaff && !driver.currentVehicle && (
                            <button
                                onClick={() => navigate('assign-vehicle')}
                                className="px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 transition-all shadow-xl active:scale-95 flex items-center gap-3"
                            >
                                <Car size={20} />
                                Assign Vehicle
                            </button>
                        )}

                        {/* Helpful Status Messages */}
                        {(isFinanceStaff || userRole === 'countrymanager') && (driver.status === 'CREDIT CHECK' || driver.status === 'MANAGER REVIEW') && (
                            <div className="px-6 py-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-3">
                                <Clock size={20} className="text-blue-500" />
                                <span className="text-xs font-black text-blue-500 uppercase">Awaiting Manager Approval</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 container-responsive space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('..')}
                        className="p-3 rounded-2xl border transition-all hover:bg-black/5 dark:hover:bg-white/5 group"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        <ChevronLeft size={24} className="group-hover:scale-110 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>{driver.personalInfo?.fullName}</h1>
                            <div className="flex flex-col">
                                <span className="px-3 py-1 text-xs font-bold rounded-full border uppercase tracking-wider w-fit" style={{ backgroundColor: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)', borderColor: 'rgba(200,230,0,0.2)' }}>
                                    {driver.status.replace(/_/g, ' ')}
                                </span>
                                {driver.approvedBy && (
                                    <span className="text-[10px] mt-1 opacity-60 font-medium">
                                        Approved by {driver.approvedBy.name} ({driver.approvedBy.role})
                                    </span>
                                )}
                            </div>
                        </div>
                        <p className="flex items-center gap-2 text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                            <FileText size={14} />
                            License: <span className="font-bold" style={{ color: 'var(--text-main)' }}>{driver.drivingLicense?.licenseNumber || 'N/A'}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => handleProgress('REJECTED', { rejection: { reason: 'OTHER', notes: 'Manually disqualified' } })}
                        className="px-6 py-2.5 font-bold rounded-xl transition-all flex items-center gap-2 border hover:bg-red-500/10 active:scale-95"
                        style={{ backgroundColor: 'transparent', borderColor: 'rgba(239,68,68,0.2)', color: 'var(--brand-danger, #ef4444)' }}
                    >
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

            {currentStepIndex !== -1 && !['REJECTED', 'ACTIVE', 'SUSPENDED'].includes(driver.status) && (
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
            )}

            {/* Stage Action Center */}
            <RenderActionCenter />

            {/* Assigned Vehicle Section */}
            {loadingVehicle ? (
                <div className="p-6 rounded-2xl border animate-pulse" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-gray-200" style={{ backgroundColor: 'var(--bg-input)' }} />
                        <div className="h-4 w-48 bg-gray-200 rounded" style={{ backgroundColor: 'var(--bg-input)' }} />
                    </div>
                    <div className="grid grid-cols-4 gap-8">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-gray-200 rounded" style={{ backgroundColor: 'var(--bg-input)' }} />)}
                    </div>
                </div>
            ) : assignedVehicle ? (
                <div className="p-6 rounded-2xl shadow-sm border overflow-hidden relative" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--brand-lime-subtle, rgba(200,230,0,0.1))' }}>
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-bl-[100px] -mr-12 -mt-12" style={{ backgroundColor: 'rgba(200,230,0,0.05)' }} />
                    <div className="flex items-center justify-between mb-6 border-b pb-4 relative z-10" style={{ borderColor: 'rgba(255,255,255,0.02)' }}>
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)' }}>
                                <Car size={20} />
                            </div>
                            <h2 className="font-bold uppercase tracking-widest text-sm" style={{ color: 'var(--text-main)' }}>Assigned Vehicle</h2>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-brand-lime/10 text-brand-lime text-[10px] font-black uppercase tracking-tighter shadow-sm border border-brand-lime/20 animate-pulse">
                            Active Rental
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                        <div className="flex gap-4 items-start">
                            <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200 shrink-0" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                {assignedVehicle.purchaseDetails?.purchaseReceipt ? (
                                    <img
                                        src={assignedVehicle.purchaseDetails.purchaseReceipt.startsWith('http') ? assignedVehicle.purchaseDetails.purchaseReceipt : `${import.meta.env.VITE_S3_BASE_URL || import.meta.env.VITE_API_BASE_URL || ''}/${assignedVehicle.purchaseDetails.purchaseReceipt}`}
                                        alt="Vehicle"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <Car size={24} style={{ color: 'var(--text-dim)', opacity: 0.3 }} />
                                )}
                            </div>
                            <InfoCard
                                label="Vehicle Model"
                                value={`${assignedVehicle.basicDetails.make} ${assignedVehicle.basicDetails.model}`}
                                icon={<Tag size={14} />}
                            />
                        </div>
                        <InfoCard label="Registration" value={assignedVehicle.legalDocs?.registrationNumber || 'N/A'} />
                        <InfoCard label="VIN Number" value={assignedVehicle.basicDetails.vin} />
                        <InfoCard
                            label="Weekly Rent"
                            value={assignedVehicle.basicDetails.weeklyRent ? `$${assignedVehicle.basicDetails.weeklyRent.toLocaleString()}` : 'N/A'}
                            icon={<FileText size={14} />}
                        />
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={() => navigate(`/admin/${getUserRole()?.replace(' ', '-').toLowerCase()}/vehicles/${assignedVehicle._id}`)}
                            className="text-xs font-bold text-brand-lime uppercase hover:underline flex items-center gap-1"
                        >
                            View Vehicle Details <ChevronLeft size={14} className="rotate-180" />
                        </button>
                    </div>
                </div>
            ) : null}

            {/* Performance & Rent Tracking Section */}
            {driver.status === 'ACTIVE' && assignedVehicle && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Performance Metrics */}
                    <div className="xl:col-span-2 p-8 rounded-3xl border shadow-sm relative overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-lime/5 rounded-full blur-3xl -mr-32 -mt-32" />
                        
                        <div className="flex items-center justify-between mb-8 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-brand-lime/10 text-brand-lime">
                                    <Gauge size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black uppercase tracking-tighter" style={{ color: 'var(--text-main)' }}>Driver Performance</h2>
                                    <p className="text-xs font-medium opacity-60">Real-time telematics & driving behavior</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-black/20 rounded-xl border border-white/5">
                                <History size={14} className="text-dim" />
                                <span className="text-[10px] font-bold uppercase text-dim">Last Sync: {driver.performance?.lastUpdated ? new Date(driver.performance.lastUpdated).toLocaleTimeString() : 'Just now'}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
                            <PerformanceCard 
                                label="Avg Speed" 
                                value={`${driver.performance?.avgSpeed || 0} km/h`} 
                                icon={<Zap size={20} />} 
                                color="text-brand-lime" 
                                trend="+2.4%"
                            />
                            <PerformanceCard 
                                label="Total Distance" 
                                value={`${(driver.performance?.totalDistance || 0).toLocaleString()} km`} 
                                icon={<TrendingUp size={20} />} 
                                color="text-blue-500" 
                            />
                            <PerformanceCard 
                                label="Driving Score" 
                                value={`${driver.performance?.drivingScore || 100}/100`} 
                                icon={<ShieldCheck size={20} />} 
                                color="text-green-500" 
                                sub="Excellent"
                            />
                            <PerformanceCard 
                                label="Fuel Efficiency" 
                                value={`${driver.performance?.fuelEfficiency || 0} km/L`} 
                                icon={<Gauge size={20} />} 
                                color="text-yellow-500" 
                            />
                        </div>

                        {/* Safety Events */}
                        <div className="mt-8 pt-8 border-t border-white/5 relative z-10">
                            <h3 className="text-xs font-black uppercase tracking-widest text-dim mb-6">Safety Incident Alerts</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <SafetyBadge label="Harsh Braking" count={driver.performance?.safetyEvents?.braking || 0} color="red" />
                                <SafetyBadge label="Speeding Violations" count={driver.performance?.safetyEvents?.speeding || 0} color="orange" />
                                <SafetyBadge label="Rapid Acceleration" count={driver.performance?.safetyEvents?.acceleration || 0} color="yellow" />
                            </div>
                        </div>
                    </div>

                    {/* Rent Payments */}
                    <div className="p-8 rounded-3xl border shadow-sm relative overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 rounded-2xl bg-brand-lime/10 text-brand-lime">
                                <CreditCard size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tighter" style={{ color: 'var(--text-main)' }}>Weekly Rent</h2>
                                <p className="text-xs font-medium opacity-60">Payment status & history</p>
                            </div>
                        </div>
                        {/* Rent Analytics & Summary */}
                        {driver.rentTracking && driver.rentTracking.length > 0 && (
                            <>
                                <div className="mb-8 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                                        {(() => {
                                            const pendingRaw = [...driver.rentTracking]
                                                .filter(r => r.status === 'PENDING' || r.status === 'PARTIAL')
                                                .sort((a, b) => {
                                                    if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                                                    return a.weekNumber - b.weekNumber;
                                                });
                                            
                                            // Deduplicate pending weeks
                                            const pending = pendingRaw.reduce((acc: any[], current) => {
                                                if (!acc.find(item => item.weekNumber === current.weekNumber)) {
                                                    acc.push(current);
                                                }
                                                return acc;
                                            }, []);
                                            
                                            // Deduplicate the entire tracking list for accurate summary metrics
                                            const deduplicatedTracking = driver.rentTracking.reduce((acc: any[], current) => {
                                                const existing = acc.find(item => item.weekNumber === current.weekNumber);
                                                if (!existing) acc.push(current);
                                                else if ((current.amountPaid || 0) > (existing.amountPaid || 0)) {
                                                    const idx = acc.indexOf(existing);
                                                    acc[idx] = current;
                                                }
                                                return acc;
                                            }, []);

                                            const totalBalance = deduplicatedTracking.reduce((acc, curr) => {
                                                const baseInstallment = curr.amount || 0;
                                                const paid = curr.amountPaid || 0;
                                                return acc + Math.max(0, baseInstallment - paid);
                                            }, 0);

                                            const overdueBalance = deduplicatedTracking
                                                .filter(r => r.status !== 'PAID' && r.dueDate && new Date(r.dueDate) < new Date())
                                                .reduce((acc, curr) => {
                                                    const baseInstallment = curr.amount || 0;
                                                    const paid = curr.amountPaid || 0;
                                                    return acc + Math.max(0, baseInstallment - paid);
                                                }, 0);
                                            
                                            const next = pending[0];
                                            
                                            return (
                                                <>
                                                    <div className="p-5 rounded-3xl bg-brand-lime/5 border border-brand-lime/20 shadow-sm relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 w-24 h-24 bg-brand-lime/10 rounded-full blur-2xl -mr-12 -mt-12" />
                                                        <p className="text-[10px] font-black uppercase text-brand-lime/60 mb-2 flex items-center gap-1.5">
                                                            <AlertCircle size={10} /> Total Outstanding
                                                        </p>
                                                        <div className="flex items-end justify-between">
                                                            <p className="text-3xl font-black tracking-tighter" style={{ color: 'var(--text-main)' }}>
                                                                ${totalBalance.toLocaleString()}
                                                            </p>
                                                            {overdueBalance > 0 && (
                                                                <div className="px-2 py-1 rounded-lg bg-red-500/10 text-red-500 text-[9px] font-black uppercase border border-red-500/20">
                                                                    ${overdueBalance.toLocaleString()} Overdue
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="p-5 rounded-3xl bg-blue-500/5 border border-blue-500/20 shadow-sm relative overflow-hidden">
                                                        <p className="text-[10px] font-black uppercase text-blue-500/60 mb-2">Next Payment Due</p>
                                                        {next ? (
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="text-2xl font-black tracking-tighter" style={{ color: 'var(--text-main)' }}>
                                                                        {next.dueDate ? new Date(next.dueDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }) : `Week ${next.weekNumber}`}
                                                                    </p>
                                                                    <p className="text-[10px] font-bold text-dim">{next.dueDate ? new Date(next.dueDate).getFullYear() : ''}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-xl font-black text-blue-500">${(next.balance || next.totalDue || next.amount).toLocaleString()}</p>
                                                                    <p className="text-[8px] font-black uppercase text-dim">Week {next.weekNumber}</p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm font-bold text-dim py-2">No pending payments</p>
                                                        )}
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>
                                {/* Rent Payment Reminder */}
                                {driver.rentTracking && driver.status === 'ACTIVE' && (() => {
                                    const overdue = driver.rentTracking.filter(r => r.status !== 'PAID' && r.dueDate && new Date(r.dueDate) < new Date());
                                    const upcoming = driver.rentTracking.filter(r => r.status !== 'PAID' && r.dueDate && new Date(r.dueDate) >= new Date()).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
                                    const nextDue = upcoming[0];
                                    if (overdue.length > 0) {
                                        return (
                                            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                                                <div className="w-12 h-12 rounded-xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-500/20">
                                                    <AlertCircle size={24} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-red-500">Urgent Reminder</p>
                                                    <p className="text-sm font-black text-white">Payment is Overdue by {overdue.length} week(s). Total Debt: ${overdue.reduce((acc, curr) => acc + (curr.balance || curr.amount), 0).toLocaleString()}</p>
                                                </div>
                                            </div>
                                        );
                                    }
                                    if (nextDue) {
                                        const daysUntil = Math.ceil((new Date(nextDue.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                        if (daysUntil <= 3) {
                                            return (
                                                <div className="mb-6 p-4 rounded-2xl bg-brand-lime/10 border border-brand-lime/20 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                                                    <div className="w-12 h-12 rounded-xl bg-brand-lime text-black flex items-center justify-center shrink-0 shadow-lg shadow-brand-lime/20">
                                                        <Zap size={24} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-lime">Upcoming Payment</p>
                                                        <p className="text-sm font-black text-white">Week {nextDue.weekNumber} is due in {daysUntil === 0 ? 'Today' : `${daysUntil} days`}. Amount: ${nextDue.totalDue.toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            );
                                        }
                                    }
                                    return null;
                                })()}
                                {/* Tabs */}
                                <div className="flex gap-2 mb-6 p-1 rounded-2xl bg-black/20 border border-white/5 w-fit">
                                    <button 
                                        onClick={() => setRentActiveTab('upcoming')}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${rentActiveTab === 'upcoming' ? 'bg-brand-lime text-black' : 'text-dim hover:text-white'}`}
                                    >
                                        Upcoming
                                    </button>
                                    <button 
                                        onClick={() => setRentActiveTab('history')}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${rentActiveTab === 'history' ? 'bg-brand-lime text-black' : 'text-dim hover:text-white'}`}
                                    >
                                        History
                                    </button>
                                </div>
                                <div className="space-y-4 pr-2 custom-scrollbar max-h-[150px] overflow-y-auto">
                                    {(() => {
                                        const baseListRaw = driver.rentTracking?.filter(r => {
                                            if (rentActiveTab === 'upcoming') return r.status === 'PENDING' || r.status === 'PARTIAL';
                                            return r.status === 'PAID';
                                        }) || [];

                                        // Deduplicate by weekNumber (keep the one with most payment or just the first one found)
                                        const deduplicated = baseListRaw.reduce((acc: any[], current) => {
                                            const existing = acc.find(item => item.weekNumber === current.weekNumber);
                                            if (!existing) {
                                                acc.push(current);
                                            } else if ((current.amountPaid || 0) > (existing.amountPaid || 0)) {
                                                // If we find a duplicate with more payment, swap it
                                                const idx = acc.indexOf(existing);
                                                acc[idx] = current;
                                            }
                                            return acc;
                                        }, []);

                                        const baseList = deduplicated.sort((a, b) => {
                                            if (rentActiveTab === 'upcoming') {
                                                if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                                                return a.weekNumber - b.weekNumber;
                                            } else {
                                                if (a.dueDate && b.dueDate) return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
                                                return b.weekNumber - a.weekNumber;
                                            }
                                        });

                                        const displayList = rentActiveTab === 'upcoming' ? baseList.slice(0, 2) : baseList;
                                        return (
                                            <>
                                                {displayList.map((rent, idx) => {
                                                    const today = new Date();
                                                    const rentDate = rent.dueDate ? new Date(rent.dueDate) : today;
                                                    const isOverdue = rent.status !== 'PAID' && rentDate < today;
                                                    const totalDue = rent.totalDue || rent.amount;
                                                    const paid = rent.amountPaid || 0;
                                                    const remaining = rent.balance ?? (totalDue - paid);
                                                    const progressPct = totalDue > 0 ? Math.min(100, (paid / totalDue) * 100) : 0;
                                                    const isExpanded = expandedWeek === rent.weekNumber;
                                                    return (
                                                        <div key={idx} className={`rounded-2xl border transition-all ${isOverdue ? 'bg-red-500/5 border-red-500/30' : rent.status === 'PAID' ? 'bg-brand-lime/5 border-brand-lime/10' : 'bg-black/10 border-white/5'}`}>
                                                            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedWeek(isExpanded ? null : rent.weekNumber)}>
                                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${rent.status === 'PAID' ? 'bg-brand-lime/20 text-brand-lime' : rent.status === 'PARTIAL' ? 'bg-yellow-500/20 text-yellow-400' : isOverdue ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-dim'}`}>
                                                                        {rent.weekNumber}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                            <p className="text-sm font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>{rent.weekLabel || `Week ${rent.weekNumber}`}</p>
                                                                            {isOverdue && <span className="text-[8px] font-black text-red-500 uppercase bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 animate-pulse">OVERDUE</span>}
                                                                            {rent.status === 'PARTIAL' && <span className="text-[8px] font-black text-yellow-400 uppercase bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">PARTIAL</span>}
                                                                            {(rent.carryOver || 0) > 0 && <span className="text-[8px] font-black text-orange-400 uppercase bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">+${rent.carryOver?.toLocaleString()} DEBT CARRYOVER</span>}
                                                                            {rentActiveTab === 'upcoming' && idx === 0 && <span className="text-[8px] font-black text-brand-lime uppercase bg-brand-lime/10 px-1.5 py-0.5 rounded border border-brand-lime/20">CURRENT DUE</span>}
                                                                            {rentActiveTab === 'upcoming' && idx === 1 && <span className="text-[8px] font-black text-dim uppercase bg-white/5 px-1.5 py-0.5 rounded border border-white/10">UPCOMING NEXT</span>}
                                                                        </div>
                                                                        <div className="flex items-center gap-4 mt-1">
                                                                            <p className="text-[10px] font-bold text-dim">
                                                                                Due: {rent.dueDate ? new Date(rent.dueDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : 'N/A'}
                                                                            </p>
                                                                            <p className="text-[10px] font-black text-brand-lime opacity-80">
                                                                                Total Owed: ${totalDue.toLocaleString()}
                                                                            </p>
                                                                        </div>
                                                                        {isExpanded && (rent.carryOver || 0) > 0 && (
                                                                            <div className="mt-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/10 text-[10px]">
                                                                                <div className="flex justify-between items-center opacity-70">
                                                                                    <span>Standard Weekly Rent:</span>
                                                                                    <span className="font-bold">${rent.amount.toLocaleString()}</span>
                                                                                </div>
                                                                                <div className="flex justify-between items-center text-orange-400 mt-1">
                                                                                    <span>Previous Unpaid Balance:</span>
                                                                                    <span className="font-bold">+${rent.carryOver.toLocaleString()}</span>
                                                                                </div>
                                                                                <div className="flex justify-between items-center border-t border-orange-500/20 mt-2 pt-2 text-white">
                                                                                    <span className="font-black uppercase tracking-widest">Total Weekly Payment:</span>
                                                                                    <span className="font-black text-xs">${totalDue.toLocaleString()}</span>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                        {rent.status !== 'PAID' && (
                                                                            <div className="mt-2 w-full">
                                                                                <div className="flex justify-between text-[9px] font-bold mb-1">
                                                                                    <span className="text-dim">Paid: ${paid.toLocaleString()}</span>
                                                                                    <span className={remaining > 0 ? 'text-orange-400' : 'text-brand-lime'}>Remaining: ${remaining.toLocaleString()}</span>
                                                                                </div>
                                                                                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                                                                                    <div className={`h-full rounded-full transition-all duration-500 ${progressPct >= 100 ? 'bg-brand-lime' : progressPct > 0 ? 'bg-yellow-400' : 'bg-white/5'}`} style={{ width: `${progressPct}%` }} />
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="shrink-0 ml-4">
                                                                    {rent.status === 'PAID' ? (
                                                                        <div className="flex flex-col items-end">
                                                                            <span className="text-[10px] font-black text-brand-lime uppercase flex items-center gap-1">
                                                                                <CheckCircle2 size={12} /> PAID
                                                                            </span>
                                                                            {rent.paidAt && <span className="text-[9px] text-dim font-medium">{new Date(rent.paidAt).toLocaleDateString()}</span>}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                                            <input 
                                                                                type="number"
                                                                                placeholder="Amount"
                                                                                value={paymentAmounts[rent.weekNumber] || ''}
                                                                                onChange={(e) => setPaymentAmounts(prev => ({ ...prev, [rent.weekNumber]: e.target.value }))}
                                                                                className="w-24 px-2 py-1.5 text-xs font-bold rounded-lg border outline-none focus:border-brand-lime transition-all"
                                                                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                                                            />
                                                                            <button 
                                                                                onClick={() => handlePartialPayment(rent.weekNumber, Number(paymentAmounts[rent.weekNumber] || remaining))}
                                                                                className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-xl hover:scale-105 active:scale-95 transition-all ${isOverdue ? 'bg-red-500 text-white' : 'bg-brand-lime text-black'}`}
                                                                            >
                                                                                Pay
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {isExpanded && rent.payments && rent.payments.length > 0 && (
                                                                <div className="px-4 pb-4 pt-0">
                                                                    <div className="border-t pt-3 space-y-2" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                                                        <p className="text-[9px] font-black uppercase tracking-widest text-dim flex items-center gap-1"><History size={10} /> Payment History ({rent.payments.length})</p>
                                                                        {rent.payments.map((p, pIdx) => (
                                                                            <div key={pIdx} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="w-6 h-6 rounded-full bg-brand-lime/10 text-brand-lime flex items-center justify-center text-[9px] font-bold">{pIdx + 1}</div>
                                                                                    <div>
                                                                                        <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>${p.amount.toLocaleString()}</p>
                                                                                        <p className="text-[9px] text-dim">{p.paymentMethod || 'Cash'}</p>
                                                                                    </div>
                                                                                </div>
                                                                                <span className="text-[9px] text-dim font-medium">{new Date(p.paidAt).toLocaleDateString()}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                {displayList.length === 0 && (
                                                    <div className="py-12 text-center">
                                                        <AlertCircle size={32} className="mx-auto text-dim opacity-20 mb-4" />
                                                        <p className="text-xs font-bold text-dim uppercase">No {rentActiveTab} payments</p>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </>
                        )}

                    </div>
                </div>
            )}

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

                    {/* Credit Check Entry Panel (VERIFICATION or CREDIT CHECK Stage) */}
                    {(driver.status === 'VERIFICATION' || driver.status === 'CREDIT CHECK') && (
                        <div className="p-6 rounded-2xl shadow-sm border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-2 mb-6 border-b pb-4" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(0,0,0,0.1)', color: 'var(--text-main)' }}>
                                    <AlertCircle size={20} />
                                </div>
                                <h2 className="font-bold uppercase tracking-widest text-sm" style={{ color: 'var(--text-main)' }}>Experian Credit Check Result</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl border bg-black/5" style={{ borderColor: 'var(--border-main)' }}>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-dim mb-1">Experian Score</p>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="number"
                                                id="test-score-input"
                                                defaultValue={driver.creditCheck?.score}
                                                className="text-2xl font-black bg-transparent outline-none border-b-2 border-brand-lime/20 focus:border-brand-lime transition-all w-24 px-2"
                                                style={{ color: 'var(--text-main)' }}
                                                placeholder="---"
                                            />
                                            <button
                                                onClick={() => {
                                                    const input = document.getElementById('test-score-input') as HTMLInputElement;
                                                    const val = parseInt(input.value);
                                                    if (!isNaN(val)) {
                                                        if (driver.status === 'VERIFICATION') {
                                                            handleProgress('CREDIT CHECK', {
                                                                updateData: { creditCheck: { score: val } },
                                                                notes: 'Manual score entry triggered assessment'
                                                            });
                                                        } else {
                                                            handleVerifyField('creditCheck.score', val);
                                                        }
                                                    } else {
                                                        toast.error('Enter a valid score');
                                                    }
                                                }}
                                                className="px-3 py-1 bg-brand-lime text-black text-[10px] font-black uppercase rounded-lg hover:scale-105 active:scale-95 transition-all"
                                            >
                                                {driver.status === 'VERIFICATION' ? 'Submit & Process' : 'Update Score'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 pt-2">
                                        <label className="flex items-center gap-2 px-3 py-2 bg-black border border-white/10 rounded-lg text-[10px] font-bold text-white cursor-pointer hover:bg-gray-900 transition-all w-fit">
                                            <Upload size={12} className={uploading === 'consentForm' ? 'animate-bounce' : ''} />
                                            {uploading === 'consentForm' ? 'Uploading...' : driver.creditCheck?.consentForm ? 'Update Consent Form' : 'Upload Consent Form'}
                                            <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'consentForm')} />
                                        </label>

                                        <div className="flex flex-col gap-2 p-3 rounded-xl border bg-black/5" style={{ borderColor: 'var(--border-main)' }}>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-dim">Manual Decision (Testing)</p>
                                            <div className="flex flex-wrap gap-2">
                                                {['AUTO_APPROVED', 'MANUAL_REVIEW', 'DECLINED'].map(decision => (
                                                    <button
                                                        key={decision}
                                                        onClick={() => handleVerifyField('creditCheck.decision', decision)}
                                                        className={`px-2 py-1 rounded-md text-[9px] font-black uppercase border transition-all ${driver.creditCheck?.decision === decision ? 'bg-brand-lime border-brand-lime text-black' : 'border-white/10 text-dim hover:border-white/30'}`}
                                                    >
                                                        {decision.replace('_', ' ')}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleVerifyField('creditCheck.fraudAlert', !driver.creditCheck?.fraudAlert)}
                                            className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${driver.creditCheck?.fraudAlert ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-black/5 border-white/10 text-dim'}`}
                                        >
                                            <AlertCircle size={14} />
                                            <span className="text-[10px] font-black uppercase">Fraud Alert: {driver.creditCheck?.fraudAlert ? 'ON' : 'OFF'}</span>
                                        </button>

                                        {driver.creditCheck?.fraudAlert && (
                                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 italic">
                                                <AlertCircle size={14} className="text-red-600" />
                                                <span className="text-[10px] font-bold text-red-600">FRAUD ALERT DETECTED</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col justify-center p-6 rounded-2xl border bg-brand-lime/5 border-brand-lime/20">
                                    <p className="text-xs font-bold uppercase tracking-widest text-brand-lime mb-2">Policy Outcome</p>
                                    {driver.creditCheck?.decision ? (
                                        <>
                                            <p className="text-2xl font-black">{driver.creditCheck.decision.replace(/_/g, ' ')}</p>
                                            <p className="text-xs opacity-60 mt-2">Based on system score brackets</p>
                                        </>
                                    ) : (
                                        <p className="font-bold opacity-40 italic">Waiting for system assessment...</p>
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
                                    <AlertCircle size={20} />
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


                </div>

                {/* Documents Section */}
                <div className="space-y-6">
                    <div className="p-6 rounded-2xl shadow-sm border h-full" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between mb-6 border-b pb-4" style={{ borderColor: 'rgba(255,255,255,0.02)' }}>
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)' }}>
                                    <FileText size={20} />
                                </div>
                                <h2 className="font-bold uppercase tracking-widest text-sm" style={{ color: 'var(--text-main)' }}>Required Documents</h2>
                            </div>


                            <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-lime/10 border border-brand-lime/20 cursor-pointer hover:bg-brand-lime/20 transition-all">
                                <Upload size={14} className={uploading === 'bulk' ? 'animate-bounce text-brand-lime' : 'text-brand-lime'} />
                                <span className="text-[10px] font-black uppercase tracking-widest text-brand-lime">
                                    {uploading === 'bulk' ? 'Uploading All...' : 'Bulk Upload (Testing)'}
                                </span>
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={handleBulkUpload}
                                    disabled={!!uploading}
                                />
                            </label>
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

            {/* Contract Preview Modal */}
            {contractPreviewHTML && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-main)' }}>
                        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-3">
                                <FileText className="text-brand-lime" size={24} />
                                <h2 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>Contract Preview</h2>
                            </div>
                            <button onClick={() => setContractPreviewHTML(null)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                                <XCircle size={24} style={{ color: 'var(--text-dim)' }} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 bg-white text-black prose max-w-none">
                            <div dangerouslySetInnerHTML={{ __html: contractPreviewHTML }} />
                        </div>
                        <div className="p-6 border-t flex justify-between gap-4" style={{ backgroundColor: 'rgba(0,0,0,0.2)', borderColor: 'var(--border-main)' }}>
                            <div className="flex gap-4">
                                <button onClick={handlePrintContract} className="px-6 py-3 border rounded-xl font-bold flex items-center gap-2 hover:bg-white/5 transition-all" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                    <Printer size={18} />
                                    Print
                                </button>
                                <button onClick={handleDownloadContract} className="px-6 py-3 border rounded-xl font-bold flex items-center gap-2 hover:bg-white/5 transition-all" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                    <Download size={18} />
                                    Download PDF
                                </button>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setContractPreviewHTML(null)} className="px-6 py-3 rounded-xl font-bold transition-all hover:bg-white/5" style={{ color: 'var(--text-main)' }}>
                                    Cancel
                                </button>
                                <button onClick={confirmAndIssueContract} className="px-8 py-3 bg-brand-lime text-black rounded-xl font-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                                    <CheckCircle2 size={18} />
                                    Confirm & Issue
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
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

const PerformanceCard = ({ label, value, icon, color, sub, trend }: { label: string; value: string; icon: React.ReactNode; color: string; sub?: string; trend?: string }) => (
    <div className="p-5 rounded-2xl bg-black/10 border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between group">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-2 rounded-xl bg-white/5 ${color} group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            {trend && <span className="text-[9px] font-black text-brand-lime bg-brand-lime/10 px-2 py-0.5 rounded-full">{trend}</span>}
        </div>
        <div className="space-y-1">
            <p className="text-[10px] font-black uppercase text-dim tracking-widest">{label}</p>
            <p className="text-xl font-black truncate" style={{ color: 'var(--text-main)' }}>{value}</p>
            {sub && <p className="text-[9px] font-bold text-brand-lime uppercase">{sub}</p>}
        </div>
    </div>
);

const SafetyBadge = ({ label, count, color }: { label: string; count: number; color: 'red' | 'orange' | 'yellow' }) => {
    const colors = {
        red: 'bg-red-500/10 text-red-500 border-red-500/20',
        orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
        yellow: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
    };
    return (
        <div className={`flex items-center justify-between p-4 rounded-xl border ${colors[color]}`}>
            <span className="text-[10px] font-black uppercase tracking-tight">{label}</span>
            <span className="text-sm font-black">{count}</span>
        </div>
    );
};

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
