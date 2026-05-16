import { useState, useEffect, useMemo } from 'react';
import { 
    ShieldAlert, Search, MapPin, Calendar, Car, Phone, Mail, 
    CheckCircle2, XCircle, Clock, Eye, AlertTriangle, RefreshCw,
    ChevronRight, Filter, Download, MoreHorizontal, FileText, Camera, Users, ArrowLeft
} from 'lucide-react';
import { 
    getAllAccidentReports, 
    getBranchAccidentReports, 
    updateAccidentReportStatus, 
    type AccidentReport 
} from '../../../services/accidentReportService';
import { getUserRole, getUser } from '../../../utils/auth';
import { toast } from 'react-hot-toast';

const AccidentReports = () => {
    const userRole = getUserRole() || '';
    const user = getUser();

    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState<AccidentReport[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedReport, setSelectedReport] = useState<AccidentReport | null>(null);
    const [reviewNotes, setReviewNotes] = useState('');
    const [updating, setUpdating] = useState(false);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [viewMode, setViewMode] = useState<'LIST' | 'DETAILS'>('LIST');

    const isBranchManager = ['branchmanager', 'operationstaff', 'financestaff'].includes(userRole.toLowerCase());

    const fetchReports = async () => {
        setLoading(true);
        try {
            if (isBranchManager && user?.branchId) {
                const res = await getBranchAccidentReports(user.branchId, { limit: 100 });
                setReports(res.data || []);
            } else {
                const res = await getAllAccidentReports({ limit: 100 });
                setReports(res.data || []);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to fetch reports');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, [userRole, user?.branchId]);

    const handleUpdateStatus = async (status: string) => {
        if (!selectedReport) return;
        setUpdating(true);
        try {
            const res = await updateAccidentReportStatus(selectedReport._id, { status, reviewNotes });
            toast.success(`Report marked as ${status.replace('_', ' ')}`);
            setSelectedReport(res.data);
            setReports(prev => prev.map(r => r._id === res.data._id ? res.data : r));
            setReviewNotes('');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update report');
        } finally {
            setUpdating(false);
        }
    };

    const filteredReports = useMemo(() => {
        let result = reports;
        
        if (statusFilter !== 'ALL') {
            result = result.filter(r => r.status === statusFilter);
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(r => {
                const driverDisplayName = r.driver?.personalInfo?.fullName || r.driverName || 'Unknown Driver';
                return r.vehicleNumber.toLowerCase().includes(q) ||
                driverDisplayName.toLowerCase().includes(q) ||
                r.accidentLocation.toLowerCase().includes(q) ||
                (typeof r.branch === 'object' && r.branch.name.toLowerCase().includes(q))
            });
        }
        return result;
    }, [reports, searchQuery, statusFilter]);

    const StatusBadge = ({ status }: { status: string }) => {
        const styles: Record<string, string> = {
            SUBMITTED: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
            UNDER_REVIEW: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            RESOLVED: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            CLOSED: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
        };
        return (
            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${styles[status] || styles.SUBMITTED}`}>
                {status.replace('_', ' ')}
            </span>
        );
    };

    const handleViewDetails = (report: AccidentReport) => {
        setSelectedReport(report);
        setViewMode('DETAILS');
    };

    const handleBackToList = () => {
        setSelectedReport(null);
        setViewMode('LIST');
    };

    if (viewMode === 'DETAILS' && selectedReport) {
        return (
            <div className="flex-1 w-full h-screen overflow-y-auto custom-scrollbar bg-[#F8F9FA] dark:bg-[#050505]">
                <div className="p-6 md:p-10 max-w-[1200px] mx-auto space-y-8 pb-32">
                    {/* Header Controls */}
                    <div className="flex items-center justify-between gap-4 sticky top-0 bg-[#F8F9FA]/80 dark:bg-[#050505]/80 backdrop-blur-md py-4 z-50">
                        <button 
                            onClick={handleBackToList}
                            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-white/10 transition-all shadow-sm group"
                        >
                            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Intelligence
                        </button>
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest border border-red-500/20">Case ID: {selectedReport._id.slice(-8)}</span>
                            <StatusBadge status={selectedReport.status} />
                        </div>
                    </div>

                    {/* Main Detail Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        
                        {/* Left Side: Information */}
                        <div className="lg:col-span-7 space-y-8">
                            {/* Incident Info Card */}
                            <div className="bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-white/5 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <ShieldAlert size={120} strokeWidth={1} />
                                </div>
                                <h2 className="text-4xl font-black text-gray-900 dark:text-white uppercase tracking-tighter mb-8 leading-none italic">
                                    Incident <span className="text-red-500">Log</span>
                                </h2>

                                <div className="space-y-10">
                                    <div>
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-4 flex items-center gap-2">
                                            <MapPin size={14} className="text-red-500" /> Location & Timeline
                                        </h3>
                                        <div className="grid grid-cols-2 gap-8">
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-1">Occurrence</p>
                                                <p className="text-lg font-black text-gray-900 dark:text-white leading-tight">{selectedReport.accidentLocation}</p>
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-1">Time Captured</p>
                                                <p className="text-lg font-black text-gray-900 dark:text-white leading-tight">{new Date(selectedReport.accidentDate).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-4 flex items-center gap-2">
                                            <FileText size={14} className="text-red-500" /> Description of Event
                                        </h3>
                                        <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-white/[0.02] p-8 rounded-3xl border border-gray-100 dark:border-white/5 font-medium italic">
                                            "{selectedReport.description}"
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Personnel Card */}
                            <div className="bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-white/5 rounded-[2.5rem] p-10 shadow-sm">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-6 flex items-center gap-2">
                                    <Users size={14} className="text-red-500" /> Personnel Involved
                                </h3>
                                <div className="flex items-center gap-8 p-6 rounded-3xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-orange-600 text-white flex items-center justify-center font-black text-3xl shadow-xl">
                                        {(selectedReport.driver?.personalInfo?.fullName || selectedReport.driverName || 'D')[0]}
                                    </div>
                                    <div className="space-y-4 flex-1">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xl font-black text-gray-900 dark:text-white">{selectedReport.driver?.personalInfo?.fullName || selectedReport.driverName}</p>
                                                <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Operator @ {typeof selectedReport.branch === 'object' ? selectedReport.branch.name : 'Branch'}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Vehicle</p>
                                                <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{selectedReport.vehicleNumber}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200/50 dark:border-white/5">
                                            <div className="flex items-center gap-2">
                                                <Phone size={14} className="text-gray-400" />
                                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{selectedReport.driver?.personalInfo?.phone || selectedReport.alternativeMobile}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Mail size={14} className="text-gray-400" />
                                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{selectedReport.driver?.personalInfo?.email || selectedReport.driverEmail}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Media & Controls */}
                        <div className="lg:col-span-5 space-y-8">
                            {/* Evidence Gallery */}
                            <div className="bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-white/5 rounded-[2.5rem] p-10 shadow-sm">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-6 flex items-center gap-2">
                                    <Camera size={14} className="text-red-500" /> Evidence Logs ({selectedReport.images?.length || 0})
                                </h3>
                                {selectedReport.images && selectedReport.images.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-4">
                                        {selectedReport.images.map((img, idx) => (
                                            <a 
                                                key={idx} 
                                                href={img} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="group relative block aspect-[16/9] rounded-3xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-xl transition-all duration-500"
                                            >
                                                <img src={img} alt={`Scene ${idx+1}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-8">
                                                    <span className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                                        <Eye size={18} /> View High-Res Plate {idx+1}
                                                    </span>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-20 text-center rounded-3xl border-2 border-dashed border-gray-200 dark:border-white/10 opacity-30">
                                        <Camera size={48} strokeWidth={1} className="mx-auto mb-4" />
                                        <p className="text-xs font-black uppercase tracking-widest text-gray-400">No media evidence provided</p>
                                    </div>
                                )}
                            </div>

                            {/* Resolution Controls */}
                            <div className="bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-white/5 rounded-[2.5rem] p-10 shadow-sm">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-6 flex items-center gap-2">
                                    <ShieldAlert size={14} className="text-red-500" /> Case Resolution
                                </h3>

                                {selectedReport.status !== 'CLOSED' && selectedReport.status !== 'RESOLVED' ? (
                                    <div className="space-y-6">
                                        <textarea 
                                            value={reviewNotes}
                                            onChange={(e) => setReviewNotes(e.target.value)}
                                            placeholder="Document final resolution, insurance claims or disciplinary actions..."
                                            className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-3xl px-8 py-6 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all text-gray-900 dark:text-white resize-none min-h-[180px] shadow-inner"
                                        />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <button 
                                                onClick={() => handleUpdateStatus('UNDER_REVIEW')}
                                                disabled={updating || selectedReport.status === 'UNDER_REVIEW'}
                                                className="py-5 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-red-500/10 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20 disabled:opacity-50"
                                            >
                                                {selectedReport.status === 'UNDER_REVIEW' ? 'Currently In Review' : 'Initiate Review'}
                                            </button>
                                            <button 
                                                onClick={() => handleUpdateStatus('RESOLVED')}
                                                disabled={updating}
                                                className="py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:shadow-xl hover:shadow-emerald-500/20 transition-all disabled:opacity-50"
                                            >
                                                Finalize Case
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-8 rounded-3xl bg-emerald-500/[0.03] border border-emerald-500/10 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-5">
                                            <CheckCircle2 size={64} />
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-4 flex items-center gap-2">
                                            <CheckCircle2 size={16}/> Resolution Log Entry
                                        </p>
                                        <p className="text-sm text-gray-700 dark:text-gray-400 italic leading-relaxed font-medium">
                                            "{selectedReport.reviewNotes || "This incident has been resolved and closed successfully."}"
                                        </p>
                                        <p className="text-[9px] font-black text-gray-400 mt-6 uppercase tracking-widest border-t border-emerald-500/10 pt-4">
                                            Resolved on {new Date(selectedReport.resolvedAt || '').toLocaleDateString()}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 w-full overflow-hidden flex flex-col bg-[#F8F9FA] dark:bg-[#050505]">
            {/* Premium Header */}
            <header className="p-6 md:p-10 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-[#0A0A0A] z-30">
                <div className="max-w-[1600px] mx-auto">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-white shadow-xl shadow-red-500/20 transform hover:scale-105 transition-transform">
                                <ShieldAlert size={32} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 dark:text-white uppercase italic">Incident <span className="text-red-500">Command</span></h1>
                                <p className="text-gray-500 dark:text-dim font-bold flex items-center gap-2 mt-1 uppercase text-[10px] tracking-[0.2em]">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Live Accident Monitoring System
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative group min-w-[300px]">
                                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                                <input 
                                    type="text" 
                                    placeholder="Search fleet, drivers or locations..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl pl-12 pr-4 py-4 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all text-gray-900 dark:text-white"
                                />
                            </div>
                            
                            <select 
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="bg-gray-100 dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-700 dark:text-white focus:outline-none cursor-pointer appearance-none lg:appearance-auto"
                            >
                                <option value="ALL" className="dark:bg-[#1A1A1A] dark:text-white">All Status</option>
                                <option value="SUBMITTED" className="dark:bg-[#1A1A1A] dark:text-white">Submitted</option>
                                <option value="UNDER_REVIEW" className="dark:bg-[#1A1A1A] dark:text-white">In Review</option>
                                <option value="RESOLVED" className="dark:bg-[#1A1A1A] dark:text-white">Resolved</option>
                                <option value="CLOSED" className="dark:bg-[#1A1A1A] dark:text-white">Closed</option>
                            </select>

                            <button onClick={fetchReports} className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-dim hover:text-red-500 hover:border-red-500/30 transition-all shadow-sm">
                                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-gray-50 dark:bg-[#050505]">
                <div className="max-w-[1600px] mx-auto space-y-8">
                    
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Incidents', value: reports.length, icon: FileText, color: 'text-blue-500' },
                            { label: 'New Reports', value: reports.filter(r => r.status === 'SUBMITTED').length, icon: AlertTriangle, color: 'text-amber-500' },
                            { label: 'Under Review', value: reports.filter(r => r.status === 'UNDER_REVIEW').length, icon: Clock, color: 'text-indigo-500' },
                            { label: 'Resolved Today', value: reports.filter(r => r.status === 'RESOLVED').length, icon: CheckCircle2, color: 'text-emerald-500' },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white dark:bg-[#0F0F0F] border border-gray-200 dark:border-white/5 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-3 rounded-2xl bg-gray-50 dark:bg-white/5 ${stat.color}`}>
                                        <stat.icon size={20} />
                                    </div>
                                    <span className="text-2xl font-black text-gray-900 dark:text-white">{stat.value}</span>
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Table View */}
                    <div className="bg-white dark:bg-[#0F0F0F] border border-gray-200 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[1000px]">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-white/[0.01]">
                                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 dark:border-white/5">Incident & Asset</th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 dark:border-white/5">Location Info</th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 dark:border-white/5 text-center">Images</th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 dark:border-white/5">Status</th>
                                        <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 dark:border-white/5 text-right">Review Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {loading ? (
                                        [1, 2, 3, 4, 5].map(i => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan={5} className="px-8 py-8"><div className="h-4 bg-gray-100 dark:bg-white/5 rounded-full w-full" /></td>
                                            </tr>
                                        ))
                                    ) : filteredReports.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-32 text-center">
                                                <div className="flex flex-col items-center gap-4 opacity-30">
                                                    <ShieldAlert size={64} strokeWidth={1} />
                                                    <p className="text-sm font-black uppercase tracking-[0.3em]">No incidents recorded</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredReports.map((r) => (
                                            <tr 
                                                key={r._id} 
                                                className="group hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-all relative"
                                            >
                                                <td className="px-8 py-6">
                                                    <div className="flex items-center gap-5">
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110 ${r.status === 'SUBMITTED' ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                                                            <Car size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight mb-0.5">{r.vehicleNumber}</p>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                                {r.driver?.personalInfo?.fullName || r.driverName || 'Unknown Driver'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex items-start gap-2">
                                                        <MapPin size={14} className="text-red-500 mt-0.5 shrink-0" />
                                                        <div>
                                                            <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">{r.accidentLocation}</p>
                                                            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter flex items-center gap-1.5">
                                                                <Clock size={10}/> {new Date(r.accidentDate).toLocaleDateString()} at {new Date(r.accidentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${r.images?.length > 0 ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-400'}`}>
                                                            {r.images?.length || 0} Photos
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6">
                                                    <StatusBadge status={r.status} />
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <button 
                                                        onClick={() => handleViewDetails(r)}
                                                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-black font-black text-[9px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-gray-500/20"
                                                    >
                                                        <Eye size={14} /> Review Report
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccidentReports;
