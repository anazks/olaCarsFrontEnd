import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, Calendar, Building2, User, CheckCircle2, XCircle, Phone, Clock, Upload, ShieldCheck, PlayCircle, Ban, AlertCircle, FileCheck, Car, Tag, Download, Printer, CreditCard, History, ChevronDown, ChevronUp } from 'lucide-react';
import { getDriverById, progressDriver, uploadDriverDocument, updateDriver } from '../../../services/driverService';
import type { Driver } from '../../../services/driverService';
import { getVehicleById } from '../../../services/vehicleService';
import type { Vehicle } from '../../../services/vehicleService';
import { getInvoicesByDriver } from '../../../services/invoiceService';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import { getUser, getUserRole } from '../../../utils/auth';
import HasPermission from '../../../components/HasPermission';

const DriverDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate()
    const [driver, setDriver] = useState<Driver | null>(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [reviewNotes, setReviewNotes] = useState<string>('');
    const [rejectionReason, setRejectionReason] = useState<string>('OTHER');
    const [assignedVehicle, setAssignedVehicle] = useState<Vehicle | null>(null);
    const [loadingVehicle, setLoadingVehicle] = useState(false);
    const [contractPreviewHTML, setContractPreviewHTML] = useState<string | null>(null);
    const [invoices, setInvoices] = useState<any[]>([]);

    const [expandedPayments, setExpandedPayments] = useState<Record<string, boolean>>({});
    const [isDocsExpanded, setIsDocsExpanded] = useState(false);
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

            try {
                const invoiceData = await getInvoicesByDriver(id!);
                setInvoices(invoiceData);
            } catch (invErr) {
                console.error('Error fetching driver invoices:', invErr);
            }

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

    const handleUpdatePersonalInfo = async (email: string, phone: string) => {
        try {
            setLoading(true);
            await updateDriver(id!, {
                personalInfo: {
                    ...driver?.personalInfo,
                    email,
                    phone
                }
            });
            await fetchDriver();
        } catch (error: any) {
            console.error('Error updating driver:', error);
            setActionError(error.response?.data?.message || 'Failed to update personal info');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateCreditCheck = async (data: any) => {
        try {
            setLoading(true);
            await updateDriver(id!, {
                creditCheck: {
                    ...(driver?.creditCheck || {}),
                    ...data
                }
            });
            await fetchDriver();
        } catch (error: any) {
            console.error('Error updating credit check:', error);
            setActionError(error.response?.data?.message || 'Failed to update credit check');
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
            return driver.creditCheck?.decision !== 'DECLINED';
        }
        if (driver.status === 'APPROVED') {
            return true; // Now allows direct activation
        }
        return true;
    };

    const RenderActionCenter = () => {
        if (driver.status === 'ACTIVE' && driver.currentVehicle) return null;

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
                reqs.push({ label: 'Credit Assessment', met: !!driver.creditCheck?.decision });
            } else if (driver.status === 'APPROVED') {
                reqs.push({ label: 'Policy Approved', met: true });
            }

            if (reqs.length === 0) return null;

            return (
                <div className="flex flex-wrap gap-2 mt-2 py-1.5 border-t border-white/5">
                    {reqs.map((r, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                            {r.met ? <CheckCircle2 size={10} className="text-brand-lime" /> : <AlertCircle size={10} className="text-yellow-500" />}
                            <span className={`text-[10px] font-bold uppercase tracking-tight ${r.met ? 'text-brand-lime' : 'text-dim'}`}>{r.label}</span>
                        </div>
                    ))}
                </div>
            );
        };

        return (
            <div className="p-4 rounded-xl border shadow-sm relative overflow-hidden transition-all duration-500" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-lime/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-brand-lime/10 text-brand-lime">
                                <Clock size={14} />
                            </div>
                            <div>
                                <h2 className="text-[12px] font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>
                                    Current Stage: {driver.status.replace(/_/g, ' ')}
                                </h2>
                                <p className="text-[10px] font-bold text-dim uppercase tracking-wider">Complete the tasks below to progress the application.</p>
                            </div>
                        </div>
                        {renderRequirements()}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {/* Status-Specific Actions */}
                        {driver.status === 'DRAFT' && isStaff && (
                            <HasPermission permission="DRIVER_ONBOARD">
                                <button
                                    onClick={() => handleProgress('PENDING REVIEW', { notes: 'Automated: Draft submission' })}
                                    disabled={!canProgress()}
                                    className={`px-2.5 py-1 rounded-lg font-black uppercase tracking-wider text-[10px] transition-all flex items-center gap-2 shadow-md active:scale-95 ${canProgress() ? 'bg-brand-lime text-black hover:scale-105' : 'bg-white/5 text-dim cursor-not-allowed grayscale'}`}
                                >
                                    <PlayCircle size={10} />
                                    Submit for Review
                                </button>
                            </HasPermission>
                        )}

                        {driver.status === 'PENDING REVIEW' && (
                            <HasPermission permission="DRIVER_ONBOARD">
                                <button
                                    onClick={() => handleProgress('VERIFICATION', { notes: 'Finance/Manager Review Completed' })}
                                    disabled={!canProgress()}
                                    className={`px-2.5 py-1 rounded-lg font-black uppercase tracking-wider text-[10px] transition-all flex items-center gap-2 shadow-md active:scale-95 ${canProgress() ? 'bg-brand-lime text-black hover:scale-105' : 'bg-white/5 text-dim cursor-not-allowed grayscale'}`}
                                >
                                    <ShieldCheck size={10} />
                                    Complete Verification
                                </button>
                            </HasPermission>
                        )}

                        {driver.status === 'VERIFICATION' && (
                            <HasPermission permission="DRIVER_ONBOARD">
                                <button
                                    onClick={() => {
                                        handleProgress('CREDIT CHECK', {
                                            updateData: {
                                                creditCheck: { score: 700 } // Default score for auto-approval
                                            },
                                            notes: 'Triggering auto-credit assessment'
                                        });
                                    }}
                                    disabled={!canProgress()}
                                    className={`px-2.5 py-1 rounded-lg font-black uppercase tracking-wider text-[10px] transition-all flex items-center gap-2 shadow-md active:scale-95 ${canProgress() ? 'bg-brand-lime text-black hover:scale-105' : 'bg-white/5 text-dim cursor-not-allowed grayscale'}`}
                                >
                                    <FileCheck size={10} />
                                    Start Credit Assessment
                                </button>
                            </HasPermission>
                        )}

                        {driver.status === 'CREDIT CHECK' && (
                            <div className="px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-2">
                                <Clock size={10} className="text-yellow-500 animate-spin" />
                                <span className="text-[10px] font-black text-yellow-500 uppercase">Assessment in Progress</span>
                            </div>
                        )}

                        {(driver.status === 'CREDIT CHECK' || driver.status === 'MANAGER REVIEW') && (
                            <div className="flex gap-2">
                                <HasPermission permission="DRIVER_ONBOARD">
                                    <button
                                        onClick={() => handleProgress('APPROVED', {
                                            updateData: {
                                                approvedBy: { id: currentUser?._id, name: currentUser?.fullName, role: userRole },
                                                approvedAt: new Date().toISOString()
                                            },
                                            notes: 'Manager Final Approval'
                                        })}
                                        disabled={driver.status === 'MANAGER REVIEW' && !reviewNotes}
                                        className="px-2.5 py-1 bg-brand-lime text-black rounded-lg font-black uppercase tracking-wider text-[10px] hover:scale-105 transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                                    >
                                        <CheckCircle2 size={10} />
                                        Approve
                                    </button>
                                </HasPermission>

                                <HasPermission permission="DRIVER_ONBOARD">
                                    <button
                                        onClick={() => handleProgress('REJECTED', {
                                            updateData: { rejection: { reason: rejectionReason, notes: reviewNotes } }
                                        })}
                                        className="px-2.5 py-1 bg-red-600 text-white rounded-lg font-black uppercase tracking-wider text-[10px] hover:bg-red-700 transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                                    >
                                        <XCircle size={10} />
                                        Reject
                                    </button>
                                </HasPermission>
                            </div>
                        )}

                        {driver.status === 'APPROVED' && (
                            <HasPermission permission="DRIVER_ONBOARD">
                                <button
                                    onClick={() => handleProgress('ACTIVE', { notes: 'Activated after Policy Approval' })}
                                    className="px-2.5 py-1 bg-brand-lime text-black rounded-lg font-black uppercase tracking-wider text-[10px] hover:scale-105 transition-all shadow-md active:scale-95 flex items-center gap-2"
                                >
                                    <CheckCircle2 size={10} />
                                    Activate Application
                                </button>
                            </HasPermission>
                        )}



                        {driver.status === 'ACTIVE' && !driver.currentVehicle && (
                            <HasPermission permission="DRIVER_ASSIGN_VEHICLE">
                                <button
                                    onClick={() => navigate('assign-vehicle')}
                                    className="px-2.5 py-1 bg-black dark:bg-white text-white dark:text-black rounded-lg font-black uppercase tracking-wider text-[10px] hover:scale-105 transition-all shadow-md active:scale-95 flex items-center gap-2"
                                >
                                    <Car size={10} />
                                    Assign Vehicle
                                </button>
                            </HasPermission>
                        )}

                        {/* Helpful Status Messages */}
                        {(driver.status === 'CREDIT CHECK' || driver.status === 'MANAGER REVIEW') && (
                            <div className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2">
                                <Clock size={10} className="text-blue-500" />
                                <span className="text-[10px] font-black text-blue-500 uppercase">Awaiting Approval</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const CompactInfo = ({ label, value, icon }: { label: string; value: any; icon?: React.ReactNode }) => (
        <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider opacity-40">{label}</span>
            <span className="text-[13px] font-bold truncate flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                {icon && <span className="opacity-60">{icon}</span>}
                {value || 'N/A'}
            </span>
        </div>
    );

    return (
        <div className="p-6 container-responsive space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-3 rounded-2xl border transition-all hover:bg-black/5 dark:hover:bg-white/5 group"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        <ChevronLeft size={24} className="group-hover:scale-110 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-[22px] font-bold" style={{ color: 'var(--text-main)' }}>{driver.personalInfo?.fullName}</h1>
                            <div className="flex flex-col">
                                <span className="px-3 py-1 text-sm font-bold rounded-full border uppercase tracking-wider w-fit" style={{ backgroundColor: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)', borderColor: 'rgba(200,230,0,0.2)' }}>
                                    {driver.status.replace(/_/g, ' ')}
                                </span>
                                {driver.approvedBy && (
                                    <span className="text-[12px] mt-1 opacity-60 font-medium">
                                        Approved by {driver.approvedBy.name} ({driver.approvedBy.role})
                                    </span>
                                )}
                            </div>
                        </div>
                        <p className="flex items-center gap-2 text-base mt-1" style={{ color: 'var(--text-muted)' }}>
                            <FileText size={14} />
                            License: <span className="font-bold" style={{ color: 'var(--text-main)' }}>{driver.drivingLicense?.licenseNumber || 'N/A'}</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!(driver.status === 'ACTIVE' && driver.currentVehicle) && (
                        <HasPermission permission="DRIVER_DELETE">
                            <button
                                onClick={() => handleProgress('REJECTED', { rejection: { reason: 'OTHER', notes: 'Manually disqualified' } })}
                                className="px-6 py-2.5 font-bold rounded-xl transition-all flex items-center gap-2 border hover:bg-red-500/10 active:scale-95"
                                style={{ backgroundColor: 'transparent', borderColor: 'rgba(239,68,68,0.2)', color: 'var(--brand-danger, #ef4444)' }}
                            >
                                <Ban size={18} />
                                Disqualify
                            </button>
                        </HasPermission>
                    )}
                </div>
            </div>

            {/* Error Message */}
            {actionError && (
                <div className="p-4 rounded-xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-2" style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' }}>
                    <XCircle size={20} className="text-red-500 shrink-0" />
                    <div>
                        <h4 className="text-base font-bold text-red-500 uppercase tracking-wide">Action Failed</h4>
                        <p className="text-sm text-red-400 mt-1">{actionError}</p>
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
                                        {isCompleted ? <CheckCircle2 size={24} /> : <span className="font-bold text-base">{index + 1}</span>}
                                    </div>
                                    <div className="mt-3 text-center">
                                        <div className={`text-sm font-bold uppercase tracking-wider ${isCurrent ? 'text-brand-lime' : ''}`} style={{ color: isCurrent ? 'var(--brand-lime)' : 'var(--text-dim)' }}>{step.label}</div>
                                        {!isCurrent && <div className="text-[12px] font-medium uppercase mt-0.5" style={{ color: 'var(--text-dim)' }}>{step.sub}</div>}
                                        {isCurrent && <div className="text-[12px] font-bold uppercase mt-0.5 animate-pulse" style={{ color: 'var(--brand-lime)' }}>In Progress</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Stage Action Center */}
            <RenderActionCenter />

            <div className="space-y-8">
                {/* Information Sections */}
                <div className="space-y-8">

                    {/* Basic Info */}
                    {/* Combined Profile, Contacts & Background Check Bento Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Column 1 & 2: Driver Profile & Contacts */}
                        <div className="lg:col-span-2 p-4 rounded-xl shadow-sm border overflow-hidden relative" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            {/* Background glow decoration */}
                            <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-[100px] -mr-12 -mt-12 opacity-30 pointer-events-none" style={{ backgroundColor: 'rgba(200,230,0,0.03)' }} />

                            {/* Card Header */}
                            <div className="flex items-center justify-between gap-3 mb-4 border-b pb-2 relative z-10" style={{ borderColor: 'rgba(255,255,255,0.02)' }}>
                                <div className="flex items-center gap-2.5">
                                    <div className="p-2 rounded-lg bg-brand-lime/10 text-brand-lime">
                                        <User size={14} />
                                    </div>
                                    <div>
                                        <h2 className="font-black uppercase tracking-widest text-[12px]" style={{ color: 'var(--text-main)' }}>Driver Profile & Contacts</h2>
                                        <p className="text-[10px] font-bold text-dim uppercase tracking-wider">Personal & Emergency Details</p>
                                    </div>
                                </div>
                                {driver.personalInfo?.photograph && (
                                    <div className="relative group">
                                        <img src={driver.personalInfo.photograph.startsWith('http') ? driver.personalInfo.photograph : `${import.meta.env.VITE_S3_BASE_URL || import.meta.env.VITE_API_BASE_URL || ''}/${driver.personalInfo.photograph}`} alt="Driver" className="w-8 h-8 rounded-full object-cover border border-brand-lime/20 group-hover:border-brand-lime transition-all duration-300 shadow-sm" />
                                    </div>
                                )}
                            </div>

                            {/* Three-Column Bento Layout */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
                                {/* Column 1: Contact & Personal Info */}
                                <div className="space-y-3 pr-0 md:pr-4 border-r-0 md:border-r border-white/5">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="text-[11px] font-black uppercase tracking-widest text-brand-lime">Personal Details</div>
                                        <HasPermission permission="DRIVER_EDIT">
                                            <button
                                                onClick={() => {
                                                    const email = prompt("Enter Email Address", driver.personalInfo?.email || "");
                                                    if (email !== null) {
                                                        const phone = prompt("Enter Phone Number", driver.personalInfo?.phone || "");
                                                        if (phone !== null) {
                                                            handleUpdatePersonalInfo(email, phone);
                                                        }
                                                    }
                                                }}
                                                className="text-[10px] font-black uppercase tracking-widest text-brand-lime hover:underline"
                                            >
                                                Edit
                                            </button>
                                        </HasPermission>
                                    </div>
                                    <CompactInfo label="Email Address" value={driver.personalInfo?.email} />
                                    <CompactInfo label="Phone Number" value={driver.personalInfo?.phone} />
                                    <CompactInfo label="WhatsApp" value={driver.personalInfo?.whatsappNumber || 'N/A'} />
                                    <CompactInfo label="Birth Date" value={driver.personalInfo?.dateOfBirth ? new Date(driver.personalInfo.dateOfBirth).toLocaleDateString() : 'N/A'} />
                                </div>

                                {/* Column 2: Application & ID */}
                                <div className="space-y-3 pr-0 md:pr-4 border-r-0 md:border-r border-white/5">
                                    <div className="text-[11px] font-black uppercase tracking-widest text-brand-lime mb-1">Application & ID</div>
                                    <CompactInfo label="Branch" value={typeof driver.branch === 'object' ? driver.branch.name : driver.branch} icon={<Building2 size={10} />} />
                                    <CompactInfo label="Applied Date" value={new Date(driver.createdAt || driver.appliedAt).toLocaleDateString()} icon={<Calendar size={10} />} />
                                    <CompactInfo label="Nationality" value={driver.personalInfo?.nationality || 'N/A'} />
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] font-black uppercase tracking-wider opacity-40">Identity Documentation</span>
                                        <span className="text-[13px] font-bold text-white">
                                            {driver.identityDocs?.idType || 'ID'}: <span className="font-medium text-dim">{driver.identityDocs?.idNumber || 'N/A'}</span>
                                        </span>
                                    </div>
                                </div>

                                {/* Column 3: Emergency Contact */}
                                <div className="space-y-3 bg-red-500/[0.02] p-3 rounded-lg border border-red-500/10 flex flex-col justify-between">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="text-[11px] font-black uppercase tracking-widest text-red-400">Emergency Contact</div>
                                            <HasPermission permission="DRIVER_EDIT">
                                                <button
                                                    onClick={() => {
                                                        const name = prompt("Enter Emergency Contact Name", driver.emergencyContact?.name || "");
                                                        if (name !== null) {
                                                            const phone = prompt("Enter Emergency Contact Phone", driver.emergencyContact?.phone || "");
                                                            if (phone !== null) {
                                                                handleUpdateEmergencyContact(name, phone);
                                                            }
                                                        }
                                                    }}
                                                    className="text-[10px] font-black uppercase tracking-widest text-brand-lime hover:underline"
                                                >
                                                    Edit
                                                </button>
                                            </HasPermission>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                                            <CompactInfo
                                                label="Contact Name"
                                                value={driver.emergencyContact?.name ? driver.emergencyContact.name : <span className="text-red-500 flex items-center gap-1"><XCircle size={10} /> Missing</span>}
                                                icon={<User size={10} />}
                                            />
                                            <CompactInfo
                                                label="Contact Phone"
                                                value={driver.emergencyContact?.phone ? driver.emergencyContact.phone : <span className="text-red-500 flex items-center gap-1"><XCircle size={10} /> Missing</span>}
                                                icon={<Phone size={10} />}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-bold text-dim leading-normal flex items-center gap-1.5 border-t border-white/5 pt-1.5">
                                        <ShieldCheck size={10} className="text-red-400 shrink-0" />
                                        <span>Used for safety events.</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Column 3: Background Check */}
                        <div className="lg:col-span-1 p-4 rounded-xl shadow-sm border overflow-hidden relative flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                            <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-[80px] -mr-8 -mt-8 opacity-30 pointer-events-none" style={{ backgroundColor: 'rgba(59,130,246,0.03)' }} />
                            
                            <div className="space-y-4">
                                {/* Card Header */}
                                <div className="flex items-center justify-between gap-3 border-b pb-2" style={{ borderColor: 'rgba(255,255,255,0.02)' }}>
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                            <ShieldCheck size={14} />
                                        </div>
                                        <div>
                                            <h2 className="font-black uppercase tracking-widest text-[12px]" style={{ color: 'var(--text-main)' }}>Background Check</h2>
                                            <p className="text-[10px] font-bold text-dim uppercase tracking-wider">Verification Status</p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                        driver.backgroundCheck?.status === 'CLEARED' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                        driver.backgroundCheck?.status === 'FAILED' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                        'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                                    }`}>
                                        {driver.backgroundCheck?.status || 'PENDING'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
                                    <CompactInfo 
                                        label="Last Checked Date" 
                                        value={driver.backgroundCheck?.performedAt ? new Date(driver.backgroundCheck.performedAt).toLocaleDateString() : 'N/A'} 
                                        icon={<Calendar size={10} />}
                                    />
                                    <CompactInfo 
                                        label="Check Validity" 
                                        value={driver.backgroundCheck?.status === 'CLEARED' ? 'Cleared & Valid' : 'Needs Verification'} 
                                        icon={<ShieldCheck size={10} />}
                                    />
                                </div>
                            </div>

                            <div className="text-[10px] font-bold text-dim leading-normal flex items-center gap-1.5 border-t border-white/5 pt-2 mt-4">
                                <Clock size={10} className="text-blue-400 shrink-0" />
                                <span>Subject to periodic verification.</span>
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
                                <h2 className="font-bold uppercase tracking-widest text-base" style={{ color: 'var(--text-main)' }}>Verification Panel</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold uppercase tracking-wider opacity-50">Driving License Verification</h3>
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
                                                <p className="font-bold text-base">{driver.drivingLicense?.licenseNumber || 'N/A'}</p>
                                                <p className="text-[12px] opacity-60 font-medium italic">Status: {driver.drivingLicense?.verificationStatus}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleVerifyField('drivingLicense.verificationStatus', 'VERIFIED')}
                                                    className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${driver.drivingLicense?.verificationStatus === 'VERIFIED' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                >
                                                    Mark Verified
                                                </button>
                                                <button
                                                    onClick={() => handleVerifyField('drivingLicense.verificationStatus', 'REJECTED')}
                                                    className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${driver.drivingLicense?.verificationStatus === 'REJECTED' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                >
                                                    Fail
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold uppercase tracking-wider opacity-50">Background Check Verification</h3>
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
                                                <p className="font-bold text-base">{driver.backgroundCheck?.status || 'PENDING'}</p>
                                                <p className="text-[12px] opacity-60 font-medium italic">
                                                    {driver.backgroundCheck?.issuedDate ? `Issued: ${new Date(driver.backgroundCheck.issuedDate).toLocaleDateString()}` : 'Date Not Recorded'}
                                                </p>
                                            </div>

                                            <div className="flex gap-2 shrink-0">
                                                <button
                                                    onClick={() => handleVerifyField('backgroundCheck.status', 'CLEARED')}
                                                    className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${driver.backgroundCheck?.status === 'CLEARED' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                >
                                                    Clear
                                                </button>
                                                <button
                                                    onClick={() => handleVerifyField('backgroundCheck.status', 'FAILED')}
                                                    className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${driver.backgroundCheck?.status === 'FAILED' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                                >
                                                    Fail
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                                            <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-black border border-white/10 rounded-lg text-[12px] font-bold text-white cursor-pointer hover:bg-gray-900 transition-all">
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
                                <h2 className="font-bold uppercase tracking-widest text-base" style={{ color: 'var(--text-main)' }}>Experian Credit Check Result</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl border bg-black/5" style={{ borderColor: 'var(--border-main)' }}>
                                        <p className="text-[12px] font-black uppercase tracking-widest text-dim mb-1">Experian Score</p>
                                        <div className="flex items-center gap-4">
                                            <div className="px-4 py-2 rounded-xl bg-brand-lime/10 border border-brand-lime/20">
                                                <p className="text-[12px] font-black text-brand-lime uppercase tracking-widest">Policy: Auto-Approve Enabled</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (driver.status === 'VERIFICATION') {
                                                        handleProgress('CREDIT CHECK', {
                                                            updateData: { creditCheck: { score: 700, decision: 'AUTO_APPROVED' } },
                                                            notes: 'Auto-credit assessment triggered'
                                                        });
                                                    } else {
                                                        // Update both score and decision to override any previous "DECLINED" state
                                                        handleUpdateCreditCheck({ score: 700, decision: 'AUTO_APPROVED' });
                                                    }
                                                }}
                                                className="px-3 py-1 bg-brand-lime text-black text-[12px] font-black uppercase rounded-lg hover:scale-105 active:scale-95 transition-all"
                                            >
                                                {driver.status === 'VERIFICATION' ? 'Start Assessment' : 'Refresh Assessment'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 pt-2">
                                        <label className="flex items-center gap-2 px-3 py-2 bg-black border border-white/10 rounded-lg text-[12px] font-bold text-white cursor-pointer hover:bg-gray-900 transition-all w-fit">
                                            <Upload size={12} className={uploading === 'consentForm' ? 'animate-bounce' : ''} />
                                            {uploading === 'consentForm' ? 'Uploading...' : driver.creditCheck?.consentForm ? 'Update Consent Form' : 'Upload Consent Form'}
                                            <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, 'consentForm')} />
                                        </label>

                                        <div className="flex flex-col gap-2 p-3 rounded-xl border bg-black/5" style={{ borderColor: 'var(--border-main)' }}>
                                            <p className="text-[12px] font-black uppercase tracking-widest text-dim">Manual Decision (Testing)</p>
                                            <div className="flex flex-wrap gap-2">
                                                {['AUTO_APPROVED', 'MANUAL_REVIEW', 'DECLINED'].map(decision => (
                                                    <button
                                                        key={decision}
                                                        onClick={() => handleVerifyField('creditCheck.decision', decision)}
                                                        className={`px-2 py-1 rounded-md text-[11px] font-black uppercase border transition-all ${driver.creditCheck?.decision === decision ? 'bg-brand-lime border-brand-lime text-black' : 'border-white/10 text-dim hover:border-white/30'}`}
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
                                            <span className="text-[12px] font-black uppercase">Fraud Alert: {driver.creditCheck?.fraudAlert ? 'ON' : 'OFF'}</span>
                                        </button>

                                        {driver.creditCheck?.fraudAlert && (
                                            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-100 italic">
                                                <AlertCircle size={14} className="text-red-600" />
                                                <span className="text-[12px] font-bold text-red-600">FRAUD ALERT DETECTED</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col justify-center p-6 rounded-2xl border bg-brand-lime/5 border-brand-lime/20">
                                    <p className="text-sm font-bold uppercase tracking-widest text-brand-lime mb-2">Policy Outcome</p>
                                    {driver.creditCheck?.decision ? (
                                        <>
                                            <p className="text-[26px] font-black">{driver.creditCheck.decision.replace(/_/g, ' ')}</p>
                                            <p className="text-sm opacity-60 mt-2">Based on auto-approval policy</p>
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
                                <h2 className="font-bold uppercase tracking-widest text-base" style={{ color: 'var(--text-main)' }}>Manager Evaluation</h2>
                            </div>

                            <div className="space-y-4">
                                <label className="text-sm font-bold uppercase tracking-wider opacity-50 block">Review / Rejection Notes</label>
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
                                            className="bg-black/5 border p-2 rounded-lg text-sm font-bold outline-none"
                                            style={{ borderColor: 'var(--border-main)' }}
                                        >
                                            <option value="CREDIT DECLINED">Credit Declined</option>
                                            <option value="FAILED VERIFICATION">Failed Verification</option>
                                            <option value="DOCUMENT FRAUD">Document Fraud</option>
                                            <option value="OTHER">Other Reason</option>
                                        </select>
                                        <p className="text-[12px] opacity-50 font-medium italic">Select reason only if declining</p>
                                    </div>
                                )}
                                {driver.rejection && (
                                    <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700">
                                        <p className="text-sm font-black uppercase mb-1">Rejection Reason: {driver.rejection.reason}</p>
                                        <p className="text-base">{driver.rejection.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}


                </div>
            </div>

            {/* Assigned Vehicle & Contract Bento Card */}
            {loadingVehicle ? (
                <div className="p-4 rounded-xl border animate-pulse" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-gray-200" style={{ backgroundColor: 'var(--bg-input)' }} />
                        <div className="h-4 w-32 bg-gray-200 rounded" style={{ backgroundColor: 'var(--bg-input)' }} />
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-10 bg-gray-200 rounded" style={{ backgroundColor: 'var(--bg-input)' }} />)}
                    </div>
                </div>
            ) : assignedVehicle ? (() => {
                const sellingPrice = assignedVehicle.basicDetails?.sellingValue || assignedVehicle.purchaseDetails?.purchasePrice || 0;
                const depositPayment = driver.additionalPayments?.find(
                    p => p.type === 'DEPOSIT' && p.relatedVehicle === assignedVehicle._id
                );
                const depositAmount = depositPayment ? depositPayment.amount : 0;
                const effectiveCost = Math.max(0, sellingPrice - depositAmount);

                const isWeekly = driver.rentTracking && driver.rentTracking.length > 0
                    ? driver.rentTracking[0].weekLabel?.toLowerCase().includes('week')
                    : false;

                const duration = driver.rentTracking && driver.rentTracking.length > 0
                    ? driver.rentTracking.length
                    : (isWeekly ? (assignedVehicle.basicDetails?.leaseDurationWeeks || 260) : (assignedVehicle.basicDetails?.leaseDurationMonths || 60));

                const rent = driver.rentTracking && driver.rentTracking.length > 0
                    ? driver.rentTracking[0].amount
                    : (duration > 0 ? Math.ceil(effectiveCost / duration) : 0);

                const totalContractValue = Math.round(rent * duration);
                const contractYears = Math.round((isWeekly ? (duration / 52) : (duration / 12)) * 10) / 10;

                // Calculate KPI metrics
                const totalInvoices = invoices.length;
                const totalPaid = invoices.reduce((sum, inv) => sum + (inv.amountPaid || 0), 0);
                const totalOverdue = invoices.filter(inv => inv.status === 'OVERDUE').reduce((sum, inv) => sum + (inv.balance || 0), 0);

                return (
                    <div className="p-4 rounded-xl border shadow-sm relative overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'rgba(200, 230, 0, 0.1)' }}>
                        {/* Decorative background glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-lime/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />

                        {/* Section Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 border-b pb-3 relative z-10" style={{ borderColor: 'rgba(255,255,255,0.02)' }}>
                            {/* Left: Title & Subtitle */}
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-lg bg-brand-lime/10 text-brand-lime">
                                    <Car size={14} />
                                </div>
                                <div>
                                    <h2 className="font-black uppercase tracking-widest text-[12px]" style={{ color: 'var(--text-main)' }}>Assigned Vehicle & Contract</h2>
                                    <p className="text-[10px] font-bold text-dim uppercase tracking-wider">Physical Asset & Rent Terms</p>
                                </div>
                            </div>

                            {/* Right: KPIs and Action Controls */}
                            <div className="flex flex-wrap items-center gap-4 sm:justify-end w-full sm:w-auto">
                                {/* KPI Panel */}
                                <div className="flex items-center gap-4 px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/5">
                                    <div className="text-center px-1">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-dim mb-0.5">Invoices</p>
                                        <p className="text-sm font-black text-white">{totalInvoices}</p>
                                    </div>
                                    <div className="w-px h-6 bg-white/10 shrink-0" />
                                    <div className="text-center px-1">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-dim mb-0.5">Total Paid</p>
                                        <p className="text-sm font-black text-brand-lime">${totalPaid.toLocaleString()}</p>
                                    </div>
                                    <div className="w-px h-6 bg-white/10 shrink-0" />
                                    <div className="text-center px-1">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-dim mb-0.5">Overdue</p>
                                        <p className={`text-sm font-black ${totalOverdue > 0 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                                            ${totalOverdue.toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2">
                                    <div className="px-2 py-0.5 rounded-full bg-brand-lime/10 text-brand-lime text-[10px] font-black uppercase tracking-wider border border-brand-lime/20 shadow-sm animate-pulse">
                                        Active Rental
                                    </div>
                                    <button
                                        onClick={() => navigate(`/admin/${getUserRole()?.replace(' ', '-').toLowerCase()}/vehicles/${assignedVehicle._id}`)}
                                        className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-brand-lime/30 text-white text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        View Vehicle
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Main Split Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 relative z-10">
                            {/* Left: Physical Vehicle Details */}
                            <div className="lg:col-span-5 space-y-3">
                                <div className="p-3 rounded-xl bg-white/[0.01] border border-white/5 flex gap-3 items-center">
                                    <div className="w-16 h-16 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                                        {assignedVehicle.purchaseDetails?.purchaseReceipt ? (
                                            <img
                                                src={assignedVehicle.purchaseDetails.purchaseReceipt.startsWith('http') ? assignedVehicle.purchaseDetails.purchaseReceipt : `${import.meta.env.VITE_S3_BASE_URL || import.meta.env.VITE_API_BASE_URL || ''}/${assignedVehicle.purchaseDetails.purchaseReceipt}`}
                                                alt="Vehicle"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <Car size={24} className="text-dim opacity-30" />
                                        )}
                                    </div>
                                    <div className="space-y-1 flex-grow">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-brand-lime">Asset Details</div>
                                        <h3 className="text-sm font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                                            {assignedVehicle.basicDetails.make} {assignedVehicle.basicDetails.model}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 font-bold text-dim">
                                                Reg: {assignedVehicle.legalDocs?.registrationNumber || 'N/A'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2.5 rounded-lg bg-white/[0.01] border border-white/5">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-dim mb-0.5">Make / Model</p>
                                        <p className="text-sm font-bold truncate text-white">{assignedVehicle.basicDetails.make} {assignedVehicle.basicDetails.model}</p>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-white/[0.01] border border-white/5">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-dim mb-0.5">Registration</p>
                                        <p className="text-sm font-bold truncate text-white">{assignedVehicle.legalDocs?.registrationNumber || 'N/A'}</p>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-white/[0.01] border border-white/5">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-dim mb-0.5">Plate No</p>
                                        <p className="text-sm font-bold truncate text-white">{assignedVehicle.basicDetails.vin}</p>
                                    </div>
                                    <div className="p-2.5 rounded-lg bg-white/[0.01] border border-white/5">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-dim mb-0.5">Color / Year</p>
                                        <p className="text-sm font-bold truncate text-white">{assignedVehicle.basicDetails.colour || 'N/A'} ({assignedVehicle.basicDetails.year || 'N/A'})</p>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Lease Contract Financial Terms */}
                            <div className="lg:col-span-7 flex flex-col justify-between gap-4">
                                {driver.status === 'ACTIVE' ? (
                                    <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 relative h-full flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 rounded-md bg-brand-lime/10 text-brand-lime">
                                                        <CreditCard size={12} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black uppercase tracking-widest text-[12px]" style={{ color: 'var(--text-main)' }}>Contract Pricing Plan</h3>
                                                        <p className="text-[9.5px] font-bold text-dim uppercase tracking-wider">{isWeekly ? 'Weekly' : 'Monthly'} Rent Model</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="px-2 py-0.5 rounded-full text-[9.5px] font-black uppercase tracking-wider border border-blue-500/20 bg-blue-500/10 text-blue-400">
                                                        {contractYears} Year Term
                                                    </div>
                                                    <button
                                                        onClick={() => navigate('rent-plan')}
                                                        className="px-2.5 py-1 rounded-lg bg-brand-lime text-black text-[9.5px] font-black uppercase tracking-wider"
                                                    >
                                                        View Plan
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 mb-3">
                                                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-dim mb-0.5">Selling Price</p>
                                                    <p className="text-base font-black tracking-tight text-white">
                                                        {assignedVehicle.purchaseDetails?.currency || '$'}{sellingPrice.toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-dim mb-0.5">Down Payment</p>
                                                    <p className="text-base font-black tracking-tight text-blue-400">
                                                        {assignedVehicle.purchaseDetails?.currency || '$'}{depositAmount.toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="p-2.5 rounded-lg bg-brand-lime/5 border border-brand-lime/10">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-brand-lime/60 mb-0.5">{isWeekly ? 'Weekly Rent' : 'Monthly Rent'}</p>
                                                    <p className="text-base font-black tracking-tight text-brand-lime">
                                                        ${rent.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 mb-3">
                                                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-dim mb-0.5">Duration</p>
                                                    <p className="text-sm font-black tracking-tight text-white">
                                                        {duration} {isWeekly ? 'Weeks' : 'Months'}
                                                    </p>
                                                </div>
                                                <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-dim mb-0.5">Total Lease Value</p>
                                                    <p className="text-sm font-black tracking-tight text-white">
                                                        ${totalContractValue.toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* <div className="p-2.5 rounded-lg bg-black/20 border border-white/5 mt-auto">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-dim mb-1.5">Rent Calculation Formula</p>
                                            <div className="flex items-center gap-1 flex-wrap text-[10px] font-bold text-white">
                                                <span className="text-dim">(</span>
                                                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                                                    ${sellingPrice.toLocaleString()}
                                                    <span className="text-[8px] opacity-40 ml-1 font-normal">Price</span>
                                                </span>
                                                <span className="text-dim">-</span>
                                                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-blue-400">
                                                    ${depositAmount.toLocaleString()}
                                                    <span className="text-[8px] opacity-40 ml-1 font-normal text-blue-400">Deposit</span>
                                                </span>
                                                <span className="text-dim">) ÷</span>
                                                <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
                                                    {duration}
                                                    <span className="text-[8px] opacity-40 ml-1 font-normal">{isWeekly ? 'Wk' : 'Mo'}</span>
                                                </span>
                                                <span className="text-dim">=</span>
                                                <span className="px-1.5 py-0.5 rounded bg-brand-lime/10 border border-brand-lime/20 text-brand-lime font-black">
                                                    ${rent.toLocaleString()} / {isWeekly ? 'wk' : 'mo'}
                                                </span>
                                            </div>
                                        </div> */}
                                        
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 relative h-full flex flex-col items-center justify-center text-center py-6">
                                        <CreditCard size={20} className="text-dim opacity-30 mb-2" />
                                        <h3 className="font-bold text-sm text-white mb-0.5">Contract Pending Activation</h3>
                                        <p className="text-[12px] text-dim max-w-[220px]">Rent details and pricing breakdown will become visible once the driver is activated.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                                    {/* Additional Payments Section (Deposits, Fees, etc.) */}
            {driver.additionalPayments && driver.additionalPayments.length > 0 && (
                <div className="p-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center justify-between mb-3 border-b pb-2 relative z-10" style={{ borderColor: 'rgba(255,255,255,0.02)' }}>
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-brand-lime/10 text-brand-lime">
                                <History size={14} />
                            </div>
                            <h2 className="font-black uppercase tracking-widest text-[12px]" style={{ color: 'var(--text-main)' }}>Additional Payments & Deposits</h2>
                        </div>
                    </div>

                    <div className="space-y-4 relative z-10">
                        {driver.additionalPayments.map((payment) => {
                            const isExpanded = !!expandedPayments[payment._id];

                            // Find matching live invoice from backend invoices array
                            const liveInvoice = invoices.find(inv =>
                                (payment.invoiceRef && inv._id === payment.invoiceRef) ||
                                (payment.invoiceNumber && inv.invoiceNumber === payment.invoiceNumber)
                            );

                            const status = liveInvoice ? liveInvoice.status : payment.status;
                            const amount = liveInvoice ? (liveInvoice.totalAmountDue || liveInvoice.baseAmount) : payment.amount;
                            const balance = liveInvoice ? liveInvoice.balance : payment.balance;
                            const paymentsList = liveInvoice ? liveInvoice.payments : payment.payments;
                            const notes = liveInvoice ? (liveInvoice.notes || payment.notes) : payment.notes;
                            const paidAt = liveInvoice ? liveInvoice.paidAt : payment.paidAt;
                            const amountPaid = liveInvoice ? liveInvoice.amountPaid : (payment.amountPaid || 0);

                            return (
                                <div
                                    key={payment._id}
                                    className="rounded-xl border overflow-hidden transition-all duration-200"
                                    style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                >
                                    {/* Header / Clickable Toggle */}
                                    <div
                                        onClick={() => setExpandedPayments(prev => ({ ...prev, [payment._id]: !prev[payment._id] }))}
                                        className="p-2.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1.5 rounded-md ${status === 'PAID' ? 'bg-green-500/20 text-green-500' : 'bg-brand-lime/20 text-brand-lime'}`}>
                                                <Tag size={12} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-50">{payment.type}</p>
                                                    {payment.invoiceNumber && (
                                                        <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-bold text-dim">
                                                            {payment.invoiceNumber}
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{payment.label}</h3>
                                                <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Due: {new Date(payment.dueDate).toLocaleDateString()}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
                                            <div className="grid grid-cols-2 md:flex gap-4">
                                                <div className="text-center md:text-left">
                                                    <p className="text-[10px] font-bold uppercase tracking-tighter opacity-50">Amount</p>
                                                    <p className="font-black text-sm" style={{ color: 'var(--text-main)' }}>${amount.toLocaleString()}</p>
                                                </div>
                                                <div className="text-center md:text-left">
                                                    <p className="text-[10px] font-bold uppercase tracking-tighter opacity-50">Balance</p>
                                                    <p className="font-black text-sm" style={{ color: balance > 0 ? 'var(--brand-lime)' : 'var(--text-main)' }}>${balance.toLocaleString()}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-start">
                                                <div className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${status === 'PAID' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                    status === 'PARTIAL' ? 'bg-brand-lime/10 text-brand-lime border-brand-lime/20' :
                                                        status === 'OVERDUE' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                            'bg-white/5 text-dim border-white/10'
                                                    }`}>
                                                    {status}
                                                </div>
                                                <div className="text-dim opacity-75">
                                                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Section (Payment Breakdown & Details) */}
                                    {isExpanded && (
                                        <div className="border-t p-2.5 bg-white/[0.01]" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                                {/* Left details */}
                                                <div className="space-y-1.5">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-dim">Payment Details</p>
                                                    {notes && (
                                                        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                                                            <span className="font-semibold text-dim">Notes:</span> {notes}
                                                        </p>
                                                    )}
                                                    {paidAt && (
                                                        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                                                            <span className="font-semibold text-dim">Last Payment Date:</span> {new Date(paidAt).toLocaleDateString()}
                                                        </p>
                                                    )}
                                                    <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                                                        <span className="font-semibold text-dim">Total Paid:</span> ${amountPaid.toLocaleString()}
                                                    </p>
                                                </div>

                                                {/* Right details / Invoice action */}
                                                <div className="flex flex-col justify-between items-start md:items-end">
                                                    <div className="space-y-1 md:text-right">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-dim">Invoice Association</p>
                                                        {payment.invoiceNumber ? (
                                                            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                                                                Linked Invoice: <span className="font-bold text-white">{payment.invoiceNumber}</span>
                                                            </p>
                                                        ) : (
                                                            <p className="text-[12px] text-dim italic">No direct invoice linked</p>
                                                        )}
                                                    </div>
                                                    {payment.invoiceRef && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/admin/${getUserRole()?.replace(' ', '-').toLowerCase()}/invoices/${payment.invoiceRef}`);
                                                            }}
                                                            className="mt-3 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[12px] font-black uppercase tracking-wider text-white transition-all flex items-center gap-1.5"
                                                        >
                                                            <FileText size={12} /> View Invoice
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Transaction History Breakdown */}
                                            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
                                                <p className="text-[12px] font-black uppercase tracking-widest text-dim mb-2">Payment History Breakdown</p>
                                                {!paymentsList || paymentsList.length === 0 ? (
                                                    <p className="text-sm text-dim italic py-2">No payments recorded yet.</p>
                                                ) : (
                                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                                        {paymentsList.map((p: any, index: number) => (
                                                            <div key={index} className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex items-center justify-between text-sm">
                                                                <div className="space-y-1">
                                                                    <p className="font-bold" style={{ color: 'var(--text-main)' }}>
                                                                        ${p.amount.toLocaleString()} ({p.paymentMethod || 'Cash'})
                                                                    </p>
                                                                    {p.note && <p className="text-[12px] text-dim">{p.note}</p>}
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-[12px] text-dim">{new Date(p.paidAt).toLocaleString()}</p>
                                                                    {p.transactionId && (
                                                                        <p className="text-[11px] font-mono text-brand-lime">TXID: {p.transactionId}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
                    </div>
                );
            })() : null}



            {/* Documents Section */}
            <div className="space-y-4">
                <div className="p-4 rounded-xl shadow-sm border h-full transition-all duration-300" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div 
                        onClick={() => setIsDocsExpanded(!isDocsExpanded)}
                        className={`flex items-center justify-between cursor-pointer select-none group transition-all duration-200 ${isDocsExpanded ? 'mb-3 border-b pb-2' : ''}`}
                        style={{ borderColor: 'rgba(255,255,255,0.02)' }}
                    >
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-brand-lime/10 text-brand-lime group-hover:scale-105 transition-transform duration-200">
                                <FileText size={14} />
                            </div>
                            <div className="flex items-center gap-2">
                                <h2 className="font-black uppercase tracking-widest text-[12px]" style={{ color: 'var(--text-main)' }}>Required Documents</h2>
                                <div className="text-dim opacity-60 group-hover:text-brand-lime group-hover:opacity-100 transition-all duration-200">
                                    {isDocsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </div>
                            </div>
                        </div>

                        <div onClick={(e) => e.stopPropagation()}>
                            <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-lime/10 border border-brand-lime/20 cursor-pointer hover:bg-brand-lime/20 transition-all">
                                <Upload size={10} className={uploading === 'bulk' ? 'animate-bounce text-brand-lime' : 'text-brand-lime'} />
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
                    </div>

                    {isDocsExpanded && (
                        <div>
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

                            <div className="mt-4 p-2.5 rounded-lg border flex items-start gap-2" style={{ backgroundColor: 'rgba(255,255,255,0.01)', borderColor: 'var(--border-main)' }}>
                                <Clock size={12} className="shrink-0 mt-0.5" style={{ color: 'var(--text-dim)' }} />
                                <p className="text-[11px] leading-relaxed font-medium" style={{ color: 'var(--text-muted)' }}>
                                    Document verification takes 24-48 hours. Staff will be notified once complete.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Contract Preview Modal */}
            {contractPreviewHTML && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-main)' }}>
                        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-3">
                                <FileText className="text-brand-lime" size={24} />
                                <h2 className="text-[22px] font-bold" style={{ color: 'var(--text-main)' }}>Contract Preview</h2>
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
        <div className="p-2.5 border rounded-lg group hover:border-brand-lime/30 transition-all flex flex-col h-full" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>{label}</span>
                {status === 'VERIFIED' ? (
                    <CheckCircle2 size={12} className="text-green-500" />
                ) : status === 'REJECTED' ? (
                    <XCircle size={12} className="text-red-500" />
                ) : url ? (
                    <CheckCircle2 size={12} className="text-brand-lime" />
                ) : null}
            </div>

            <div className="flex-grow flex flex-col justify-end">
                {fileUrl ? (
                    <div className="space-y-2">
                        <div className="w-full aspect-[16/10] rounded-md overflow-hidden border" style={{ borderColor: 'var(--border-main)' }}>
                            {fileUrl.match(/\.(pdf)$/i) ? (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50/5 text-gray-400 gap-1.5">
                                    <FileText size={24} />
                                    <span className="text-[11px] uppercase tracking-widest font-bold">PDF Document</span>
                                </div>
                            ) : (
                                <img src={fileUrl} alt={label} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                            )}
                        </div>
                        <div className="flex items-center justify-between mt-auto pt-1.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                            <a href={fileUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-brand-lime uppercase hover:underline">View File</a>
                            <label className="cursor-pointer group/upload">
                                <input type="file" className="hidden" onChange={onUpload} disabled={uploading} />
                                <Upload size={10} className="text-gray-400 group-hover/upload:text-brand-lime transition-colors" />
                            </label>
                        </div>
                    </div>
                ) : (
                    <div className="relative mt-auto h-full min-h-[90px]">
                        <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={onUpload}
                            disabled={uploading}
                        />
                        <button
                            disabled={uploading}
                            className="w-full h-full flex flex-col items-center justify-center gap-1.5 py-3 border-2 border-dashed rounded-lg text-[12px] font-bold transition-all relative overflow-hidden"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--brand-lime)'; e.currentTarget.style.color = 'var(--brand-lime)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-main)'; e.currentTarget.style.color = 'var(--text-dim)'; }}
                        >
                            {uploading ? (
                                <span className="animate-pulse">Uploading...</span>
                            ) : (
                                <>
                                    <div className="p-2 rounded-full" style={{ backgroundColor: 'rgba(200,230,0,0.05)' }}>
                                        <Upload size={14} className="text-brand-lime" />
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
