import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ShieldAlert, MapPin, Car, Phone, Mail, ArrowLeft,
    CheckCircle2, Clock, Eye, AlertTriangle, 
    FileText, Camera, Users, Calendar,
    UserCheck, ShieldCheck, Map
} from 'lucide-react';
import { 
    getAccidentReportById, 
    updateAccidentReportStatus, 
    type AccidentReport 
} from '../../../services/accidentReportService';
import { toast } from 'react-hot-toast';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const resolveImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const cleanPath = url.startsWith('/') ? url.slice(1) : url;
    const s3Base = (import.meta.env.VITE_S3_BASE_URL || '').replace(/['"]/g, '').replace(/\/$/, '');
    const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/['"]/g, '').replace(/\/$/, '');
    const base = s3Base || apiBase;
    return `${base}/${cleanPath}`;
};

const AccidentReportDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

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
            <div className="flex-1 w-full flex flex-col p-6 md:p-8 justify-center items-center min-h-screen" style={{ backgroundColor: 'var(--bg-main)' }}>
                <div className="w-full max-w-[1400px] space-y-8 animate-pulse">
                    <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 rounded-xl" style={{ backgroundColor: 'var(--bg-card)' }} />
                        <div className="space-y-2">
                            <div className="h-4 rounded-md w-32" style={{ backgroundColor: 'var(--bg-card)' }} />
                            <div className="h-6 rounded-md w-64" style={{ backgroundColor: 'var(--bg-card)' }} />
                        </div>
                    </div>
                    <div className="h-2 rounded-full w-full" style={{ backgroundColor: 'var(--bg-card)' }} />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                            <div className="h-64 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)' }} />
                            <div className="h-80 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)' }} />
                        </div>
                        <div className="space-y-8">
                            <div className="h-96 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)' }} />
                            <div className="h-64 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)' }} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="flex-1 w-full flex flex-col p-6 md:p-8 justify-center items-center min-h-screen" style={{ backgroundColor: 'var(--bg-main)' }}>
                <div className="text-center space-y-6 max-w-md p-8 border rounded-2xl shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <AlertTriangle size={32} />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>Incident Dossier Missing</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">The accident record you requested could not be located on the Central Command servers.</p>
                    </div>
                    <button 
                        onClick={() => navigate('..')}
                        className="w-full py-4 text-black font-black text-xs uppercase tracking-widest rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-lg hover:shadow-red-500/20"
                        style={{ backgroundColor: 'var(--brand-lime)' }}
                    >
                        Back to Command Center
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div 
            className="flex-1 w-full overflow-y-auto custom-scrollbar flex flex-col min-h-screen"
            style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}
        >
            {/* Top Breadcrumb Header Bar */}
            <div 
                className="px-6 md:px-8 py-3 border-b"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
            >
                <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Accident Reports', path: '../accident-reports' }, { label: report.vehicleNumber, active: true }]} />
            </div>

            {/* Premium Header Dashboard Hero */}
            <div 
                className="px-6 md:px-8 py-8 border-b relative overflow-hidden shrink-0"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
            >
                {/* Visual Accent Layer */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

                <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                    <div className="flex items-center gap-5">
                        <button 
                            onClick={() => navigate(-1)} 
                            className="p-3.5 rounded-xl transition-all border hover:bg-red-500/10 hover:text-red-500"
                            style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                        >
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                <span className="px-2.5 py-1 rounded bg-red-500/10 text-red-500 text-[8px] font-black uppercase tracking-[0.25em] border border-red-500/25 shadow-sm">
                                    Incident Command Center
                                </span>
                                <StatusBadge status={report.status} />
                            </div>
                            <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                                <ShieldAlert size={24} className="text-red-500 animate-pulse" /> 
                                {report.vehicleNumber}
                            </h1>
                            <p className="text-[10px] font-bold mt-1 uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                                <span className="font-black text-red-500/80">Case ID:</span> {report._id}
                            </p>
                        </div>
                    </div>

                    {/* Quick Stats Panel */}
                    <div 
                        className="flex items-center gap-4 border p-4 rounded-2xl shadow-sm self-stretch md:self-auto"
                        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="px-4 border-r" style={{ borderColor: 'var(--border-main)' }}>
                            <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Time of Accident</p>
                            <p className="text-xs font-bold mt-1" style={{ color: 'var(--text-main)' }}>
                                {new Date(report.accidentDate).toLocaleDateString()}
                            </p>
                        </div>
                        <div className="px-4">
                            <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Evidence Uploaded</p>
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
                    <section 
                        className="border rounded-2xl p-6 md:p-8 space-y-6 shadow-sm transition-all duration-300 relative overflow-hidden"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gray-500/[0.01] rounded-bl-full border-b border-l pointer-events-none" style={{ borderColor: 'var(--border-main)' }} />
                        
                        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border-main)' }}>
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                                <FileText size={16} className="text-red-500" /> Incident Narrative
                            </h3>
                            <span 
                                className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border"
                                style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                            >
                                Official Statement
                            </span>
                        </div>

                        <div className="space-y-6">
                            {/* Visual Highlight Parameters */}
                            <div 
                                className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 rounded-xl border"
                                style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                                        <Calendar size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Incident Timestamp</p>
                                        <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--text-main)' }}>
                                            {new Date(report.accidentDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center">
                                        <Map size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Incident Location</p>
                                        <p className="text-xs font-bold mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-main)' }}>
                                            <MapPin size={12} className="text-red-500 shrink-0" /> {report.accidentLocation}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Descriptive Block */}
                            <div 
                                className="relative p-6 md:p-8 rounded-xl border"
                                style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}
                            >
                                <span className="absolute -top-4 -left-2 text-7xl font-serif text-red-500/10 select-none pointer-events-none">“</span>
                                <p 
                                    className="text-sm leading-relaxed font-medium italic relative z-10 pl-4 border-l-2"
                                    style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}
                                >
                                    {report.description}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Evidence Gallery Card */}
                    <section 
                        className="border rounded-2xl p-6 md:p-8 space-y-6 shadow-sm transition-all duration-300"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border-main)' }}>
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
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
                                    <div 
                                        key={idx} 
                                        className="group relative rounded-2xl overflow-hidden border shadow-sm hover:shadow-xl transition-all duration-500 aspect-[4/3] bg-black"
                                        style={{ borderColor: 'var(--border-main)' }}
                                    >
                                        {/* Image Asset */}
                                        <img 
                                            src={resolveImageUrl(img)} 
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
                                            href={resolveImageUrl(img)} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="absolute inset-0 z-20"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div 
                                className="p-16 text-center rounded-xl border border-dashed flex flex-col items-center justify-center gap-4 opacity-40"
                                style={{ borderColor: 'var(--border-main)' }}
                            >
                                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-main)' }}>
                                    <Camera size={28} className="text-gray-400" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>No visual files available</p>
                                    <p className="text-[9px]" style={{ color: 'var(--text-dim)' }}>Driver did not upload scene photo evidence during the submission process.</p>
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                {/* Right Column (Side Workspace panel) */}
                <div className="space-y-8">
                    
                    {/* Personnel Dossier Card */}
                    <section 
                        className="border rounded-2xl p-6 md:p-8 space-y-6 shadow-sm transition-all duration-300"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border-main)' }}>
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                                <Users size={16} className="text-red-500" /> Crew & Asset Info
                            </h3>
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                        </div>

                        <div className="space-y-6">
                            {/* Driver Badge details */}
                            <div 
                                className="flex items-center gap-4 p-5 rounded-xl border"
                                style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}
                            >
                                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-red-500 to-amber-500 text-white flex items-center justify-center font-black text-lg shadow-lg border-2" style={{ borderColor: 'var(--border-main)' }}>
                                    {(report.driver?.personalInfo?.fullName || report.driverName || 'D')[0].toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="text-sm font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                                        {report.driver?.personalInfo?.fullName || report.driverName}
                                    </h4>
                                    <p className="text-[9px] font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-dim)' }}>
                                        <UserCheck size={10} className="text-emerald-500" /> System Driver
                                    </p>
                                </div>
                            </div>

                            {/* Info Table details */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2.5 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                    <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}><Mail size={12} /> Email</span>
                                    <span className="text-xs font-bold max-w-[180px] truncate" style={{ color: 'var(--text-main)' }}>{report.driver?.personalInfo?.email || report.driverEmail || 'N/A'}</span>
                                </div>

                                <div className="flex justify-between items-center py-2.5 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                    <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}><Phone size={12} /> Contact</span>
                                    <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{report.driver?.personalInfo?.phone || report.alternativeMobile || 'N/A'}</span>
                                </div>

                                <div className="flex justify-between items-center py-2.5 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                    <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}><Car size={12} /> Fleet License</span>
                                    <span className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>{report.vehicleNumber}</span>
                                </div>

                                <div className="flex justify-between items-center py-2.5">
                                    <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5" style={{ color: 'var(--text-dim)' }}><MapPin size={12} /> Branch Hub</span>
                                    <span className="text-xs font-black text-red-500 uppercase tracking-tight">{typeof report.branch === 'object' ? report.branch.name : 'Central Hub'}</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Resolution Command Center Action Box */}
                    <section 
                        className="border rounded-2xl p-6 md:p-8 space-y-6 shadow-sm transition-all duration-300 relative overflow-hidden"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/[0.01] rounded-bl-full pointer-events-none" />

                        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border-main)' }}>
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
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
                                    <label className="text-[8px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Officer Investigation Notes</label>
                                    <textarea 
                                        value={reviewNotes}
                                        onChange={(e) => setReviewNotes(e.target.value)}
                                        placeholder="Enter full resolution log details, damage evaluations, or insurance updates..."
                                        className="w-full border rounded-xl px-5 py-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all resize-none min-h-[140px] shadow-inner animate-all"
                                        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        onClick={() => handleUpdateStatus('UNDER_REVIEW')}
                                        disabled={updating || report.status === 'UNDER_REVIEW'}
                                        className="py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50"
                                        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        {report.status === 'UNDER_REVIEW' ? 'Under Review' : 'Investigate'}
                                    </button>
                                    <button 
                                        onClick={() => handleUpdateStatus('RESOLVED')}
                                        disabled={updating}
                                        className="py-3 px-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 transition-all shadow-md"
                                    >
                                        Resolve Case
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-5">
                                <div 
                                    className="p-5 rounded-xl border"
                                    style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}
                                >
                                    <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-3.5 flex items-center gap-1.5">
                                        <CheckCircle2 size={14} className="text-emerald-500" /> Final Resolution Logs
                                    </p>
                                    <p className="text-xs italic leading-relaxed font-semibold pl-3 border-l-2" style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}>
                                        "{report.reviewNotes || "No incident investigation logs were provided for this resolution."}"
                                    </p>
                                </div>

                                {report.resolvedAt && (
                                    <div 
                                        className="flex items-center gap-2.5 p-4 rounded-xl border"
                                        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}
                                    >
                                        <Clock size={14} className="text-gray-400" />
                                        <div>
                                            <p className="text-[8px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Closed Timestamp</p>
                                            <p className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--text-main)' }}>
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
