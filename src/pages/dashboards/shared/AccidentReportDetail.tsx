import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ShieldAlert, MapPin, Car, Phone, Mail, ArrowLeft,
    CheckCircle2, XCircle, Clock, Eye, AlertTriangle, 
    FileText, Camera, Users, Calendar, AlertCircle, Sparkles,
    UserCheck, ShieldCheck, Map
} from 'lucide-react';
import { 
    getAccidentReportById, 
    updateAccidentReportStatus, 
    type AccidentReport 
} from '../../../services/accidentReportService';
import { getUserRole } from '../../../utils/auth';
import { toast } from 'react-hot-toast';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const AccidentReportDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const userRole = getUserRole() || '';

    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState<AccidentReport | null>(null);
    const [reviewNotes, setReviewNotes] = useState('');
    const [updating, setUpdating] = useState(false);

    const fetchReport = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await getAccidentReportById(id);
            setReport(res.data || res); // Handle both wrapped and unwrapped response
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to fetch report details');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const handleUpdateStatus = async (status: string) => {
        if (!report) return;
        setUpdating(true);
        try {
            const res = await updateAccidentReportStatus(report._id, { status, reviewNotes });
            toast.success(`Report marked as ${status.replace('_', ' ')}`);
            setReport(res.data || res);
            setReviewNotes('');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update report');
        } finally {
            setUpdating(false);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        const styles: Record<string, string> = {
            SUBMITTED: 'bg-amber-500/10 text-amber-500 border-amber-500/25 shadow-[0_0_15px_rgba(245,158,11,0.05)]',
            UNDER_REVIEW: 'bg-blue-500/10 text-blue-500 border-blue-500/25 shadow-[0_0_15px_rgba(59,130,246,0.05)]',
            RESOLVED: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.05)]',
            CLOSED: 'bg-gray-500/10 text-gray-500 border-gray-500/25',
        };
        return (
            <span className={`px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-300 ${styles[status] || styles.SUBMITTED}`}>
                {status.replace('_', ' ')}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex-1 w-full flex flex-col bg-[#F9FAFB] dark:bg-[#030303] p-6 md:p-8 justify-center items-center min-h-screen">
                <div className="w-full max-w-[1400px] space-y-8 animate-pulse">
                    <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 bg-gray-200 dark:bg-white/5 rounded-2xl" />
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-200 dark:bg-white/5 rounded-md w-32" />
                            <div className="h-6 bg-gray-200 dark:bg-white/5 rounded-md w-64" />
                        </div>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-white/5 rounded-full w-full" />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            <div className="h-64 bg-gray-200 dark:bg-white/5 rounded-[2.5rem]" />
                            <div className="h-80 bg-gray-200 dark:bg-white/5 rounded-[2.5rem]" />
                        </div>
                        <div className="space-y-8">
                            <div className="h-96 bg-gray-200 dark:bg-white/5 rounded-[2.5rem]" />
                            <div className="h-64 bg-gray-200 dark:bg-white/5 rounded-[2.5rem]" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="flex-1 w-full flex flex-col bg-[#F9FAFB] dark:bg-[#030303] p-6 md:p-8 justify-center items-center min-h-screen">
                <div className="text-center space-y-6 max-w-md p-8 bg-white dark:bg-[#0A0A0A] border border-gray-200/50 dark:border-white/5 rounded-[2.5rem] shadow-2xl">
                    <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <AlertTriangle size={32} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Incident Dossier Missing</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">The accident record you requested could not be located on the Central Command servers.</p>
                    </div>
                    <button 
                        onClick={() => navigate('..')}
                        className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-black font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-red-500 dark:hover:bg-red-500 dark:hover:text-white transition-all shadow-lg hover:shadow-red-500/20"
                    >
                        Back to Command Center
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 w-full overflow-y-auto bg-[#F9FAFB] dark:bg-[#030303] custom-scrollbar flex flex-col min-h-screen">
            {/* Top Breadcrumb Header Bar */}
            <div className="px-6 md:px-8 py-3 bg-white dark:bg-[#0A0A0A] border-b border-gray-100 dark:border-white/[0.03]">
                <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Accident Reports', path: '../accident-reports' }, { label: report.vehicleNumber, active: true }]} />
            </div>

            {/* Premium Header Dashboard Hero */}
            <div className="px-6 md:px-8 py-8 bg-white dark:bg-[#0A0A0A] border-b border-gray-200/60 dark:border-white/[0.04] relative overflow-hidden shrink-0">
                {/* Visual Accent Layer */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

                <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div className="flex items-center gap-5">
                        <button 
                            onClick={() => navigate('..')} 
                            className="p-4 bg-gray-50 hover:bg-red-500/10 dark:bg-white/5 text-gray-400 hover:text-red-500 rounded-2xl transition-all border border-gray-200/50 dark:border-white/5 hover:border-red-500/20 shadow-sm"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                <span className="px-2.5 py-1 rounded bg-red-500/10 text-red-500 text-[8px] font-black uppercase tracking-[0.25em] border border-red-500/25 shadow-sm">
                                    Incident Command Center
                                </span>
                                <StatusBadge status={report.status} />
                            </div>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                                <ShieldAlert size={28} className="text-red-500 animate-pulse" /> 
                                {report.vehicleNumber}
                            </h1>
                            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest flex items-center gap-2">
                                <span className="font-black text-red-500/80">Case ID:</span> {report._id}
                            </p>
                        </div>
                    </div>

                    {/* Quick Stats Panel */}
                    <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/[0.02] border border-gray-200/60 dark:border-white/5 p-4 rounded-3xl shadow-sm self-stretch md:self-auto">
                        <div className="px-4 border-r border-gray-200 dark:border-white/5">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Time of Accident</p>
                            <p className="text-xs font-bold text-gray-900 dark:text-white mt-1">
                                {new Date(report.accidentDate).toLocaleDateString()}
                            </p>
                        </div>
                        <div className="px-4">
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Evidence Uploaded</p>
                            <p className="text-xs font-black text-red-500 mt-1 flex items-center gap-1.5">
                                <Camera size={14} /> {report.images?.length || 0} Images
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid Workspace */}
            <div className="p-6 md:p-8 max-w-[1400px] w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Columns (Workspace Primary Dossier) */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Incident Narrative Card */}
                    <section className="bg-white dark:bg-[#0F0F0F] border border-gray-200/70 dark:border-white/5 rounded-[2.5rem] p-6 md:p-8 space-y-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gray-500/[0.01] rounded-bl-full border-b border-l border-gray-200/30 dark:border-white/5 pointer-events-none" />
                        
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.03] pb-4">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 flex items-center gap-2">
                                <FileText size={16} className="text-red-500" /> Incident Narrative
                            </h3>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-full">
                                Official Statement
                            </span>
                        </div>

                        <div className="space-y-6">
                            {/* Visual Highlight Parameters */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-3xl bg-gray-50 dark:bg-white/[0.01] border border-gray-200/50 dark:border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                                        <Calendar size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Incident Timestamp</p>
                                        <p className="text-xs font-bold text-gray-900 dark:text-white mt-0.5">
                                            {new Date(report.accidentDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                                        <Map size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Incident Location</p>
                                        <p className="text-xs font-bold text-gray-900 dark:text-white mt-0.5 flex items-center gap-1">
                                            <MapPin size={12} className="text-red-500 shrink-0" /> {report.accidentLocation}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Descriptive Block */}
                            <div className="relative p-6 md:p-8 rounded-[2rem] bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
                                <span className="absolute -top-4 -left-2 text-7xl font-serif text-red-500/10 select-none pointer-events-none">“</span>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium italic relative z-10 pl-4 border-l-2 border-red-500/30">
                                    {report.description}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Evidence Gallery Card */}
                    <section className="bg-white dark:bg-[#0F0F0F] border border-gray-200/70 dark:border-white/5 rounded-[2.5rem] p-6 md:p-8 space-y-6 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.03] pb-4">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 flex items-center gap-2">
                                <Camera size={16} className="text-red-500" /> Evidence Scene Gallery
                            </h3>
                            {report.images && report.images.length > 0 && (
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/10">
                                    Secure Storage
                                </span>
                            )}
                        </div>

                        {report.images && report.images.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {report.images.map((img, idx) => (
                                    <div key={idx} className="group relative rounded-3xl overflow-hidden border border-gray-200/70 dark:border-white/10 shadow-sm hover:shadow-xl transition-all duration-500 aspect-[4/3] bg-black">
                                        {/* Image Asset */}
                                        <img 
                                            src={img} 
                                            alt={`Incident Scene ${idx + 1}`} 
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:opacity-90" 
                                        />
                                        
                                        {/* Premium Overlay Layer */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-6">
                                            <div className="space-y-1 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                                <p className="text-[9px] font-black text-red-500 uppercase tracking-[0.2em]">Evidence Specimen {idx + 1}</p>
                                                <h4 className="text-xs font-black text-white uppercase tracking-tight flex items-center gap-2">
                                                    <Eye size={12} className="text-white" /> View Visual Proof
                                                </h4>
                                            </div>
                                        </div>

                                        <a 
                                            href={img} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="absolute inset-0 z-20"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-16 text-center rounded-[2rem] border border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center gap-4 opacity-40">
                                <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center">
                                    <Camera size={28} className="text-gray-400" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] font-black uppercase tracking-widest text-gray-900 dark:text-white">No visual files available</p>
                                    <p className="text-[9px] text-gray-400">Driver did not upload scene photo evidence during the submission process.</p>
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                {/* Right Column (Side Workspace panel) */}
                <div className="space-y-8">
                    
                    {/* Personnel Dossier Card */}
                    <section className="bg-white dark:bg-[#0F0F0F] border border-gray-200/70 dark:border-white/5 rounded-[2.5rem] p-6 md:p-8 space-y-6 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.03] pb-4">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 flex items-center gap-2">
                                <Users size={16} className="text-red-500" /> Crew & Asset Info
                            </h3>
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                        </div>

                        <div className="space-y-6">
                            {/* Driver Badge details */}
                            <div className="flex items-center gap-4 p-5 rounded-3xl bg-gray-50 dark:bg-white/[0.01] border border-gray-200/50 dark:border-white/5 shadow-inner">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-red-500 to-amber-500 text-white flex items-center justify-center font-black text-xl shadow-lg border-2 border-white dark:border-[#0F0F0F]">
                                    {(report.driver?.personalInfo?.fullName || report.driverName || 'D')[0].toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-gray-900 dark:text-white tracking-tight">
                                        {report.driver?.personalInfo?.fullName || report.driverName}
                                    </h4>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                                        <UserCheck size={10} className="text-emerald-500" /> System Driver
                                    </p>
                                </div>
                            </div>

                            {/* Info Table details */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2.5 border-b border-gray-100 dark:border-white/[0.02]">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5"><Mail size={12} /> Email</span>
                                    <span className="text-xs font-bold text-gray-900 dark:text-white max-w-[180px] truncate">{report.driver?.personalInfo?.email || report.driverEmail || 'N/A'}</span>
                                </div>

                                <div className="flex justify-between items-center py-2.5 border-b border-gray-100 dark:border-white/[0.02]">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5"><Phone size={12} /> Contact</span>
                                    <span className="text-xs font-bold text-gray-900 dark:text-white">{report.driver?.personalInfo?.phone || report.alternativeMobile || 'N/A'}</span>
                                </div>

                                <div className="flex justify-between items-center py-2.5 border-b border-gray-100 dark:border-white/[0.02]">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5"><Car size={12} /> Fleet License</span>
                                    <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">{report.vehicleNumber}</span>
                                </div>

                                <div className="flex justify-between items-center py-2.5">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5"><MapPin size={12} /> Branch Hub</span>
                                    <span className="text-xs font-black text-red-500 uppercase tracking-tight">{typeof report.branch === 'object' ? report.branch.name : 'Central Hub'}</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Resolution Command Center Action Box */}
                    <section className="bg-white dark:bg-[#0F0F0F] border border-gray-200/70 dark:border-white/5 rounded-[2.5rem] p-6 md:p-8 space-y-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/[0.01] rounded-bl-full pointer-events-none" />

                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/[0.03] pb-4">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 flex items-center gap-2">
                                <ShieldCheck size={16} className="text-red-500" /> Resolution Center
                            </h3>
                            {report.resolvedAt && (
                                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/15">
                                    Closed Case
                                </span>
                            )}
                        </div>

                        {report.status !== 'CLOSED' && report.status !== 'RESOLVED' ? (
                            <div className="space-y-5">
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Officer Investigation Notes</label>
                                    <textarea 
                                        value={reviewNotes}
                                        onChange={(e) => setReviewNotes(e.target.value)}
                                        placeholder="Enter full resolution log details, damage evaluations, or insurance updates..."
                                        className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200/80 dark:border-white/10 rounded-2xl px-5 py-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all text-gray-900 dark:text-white resize-none min-h-[140px] shadow-inner"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        onClick={() => handleUpdateStatus('UNDER_REVIEW')}
                                        disabled={updating || report.status === 'UNDER_REVIEW'}
                                        className="py-4 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50 transition-all border border-transparent hover:border-red-500/20 shadow-sm"
                                    >
                                        {report.status === 'UNDER_REVIEW' ? 'Under Investigation' : 'Investigate'}
                                    </button>
                                    <button 
                                        onClick={() => handleUpdateStatus('RESOLVED')}
                                        disabled={updating}
                                        className="py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 transition-all shadow-md"
                                    >
                                        Resolve Case
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <div className="p-5 rounded-3xl bg-emerald-500/[0.03] border border-emerald-500/15 shadow-sm">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-3.5 flex items-center gap-1.5">
                                        <CheckCircle2 size={14} className="text-emerald-500" /> Final Resolution Logs
                                    </p>
                                    <p className="text-xs text-gray-700 dark:text-gray-300 italic leading-relaxed font-semibold pl-3 border-l-2 border-emerald-500/30">
                                        "{report.reviewNotes || "No incident investigation logs were provided for this resolution."}"
                                    </p>
                                </div>

                                {report.resolvedAt && (
                                    <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.01] border border-gray-200/50 dark:border-white/5">
                                        <Clock size={14} className="text-gray-400" />
                                        <div>
                                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Closed Timestamp</p>
                                            <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300 mt-0.5">
                                                {new Date(report.resolvedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};

export default AccidentReportDetail;
