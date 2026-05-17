import { useState, useEffect, useMemo } from 'react';
import { 
    ShieldAlert, Search, MapPin, Car, Phone, Mail, 
    CheckCircle2, XCircle, Clock, Eye, AlertTriangle, RefreshCw,
    ChevronRight, FileText, Camera, Users
} from 'lucide-react';
import { 
    getAllAccidentReports, 
    getBranchAccidentReports, 
    updateAccidentReportStatus, 
    type AccidentReport 
} from '../../../services/accidentReportService';
import { getUserRole, getUser } from '../../../utils/auth';
import { toast } from 'react-hot-toast';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

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

    return (
        <div className="flex-1 w-full overflow-hidden flex flex-col bg-[#F8F9FA] dark:bg-[#050505]">
            <div className="px-6 md:px-8 pt-4 bg-white dark:bg-[#0A0A0A]">
                <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Accident Reports', active: true }]} />
            </div>

            {/* Compact Header */}
            <div className="px-6 md:px-8 py-4 border-b border-gray-200 dark:border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-30 bg-white dark:bg-[#0A0A0A]">
                <div>
                    <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2 uppercase italic">
                        <ShieldAlert size={20} className="text-red-500" /> Incident <span className="text-red-500">Command</span>
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">Live Fleet Incident & Accident Monitoring</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <div className="relative group min-w-[220px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
                        <input 
                            type="text" 
                            placeholder="Search fleet, drivers..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all text-gray-900 dark:text-white"
                        />
                    </div>
                    
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-gray-100 dark:bg-[#1A1A1A] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-[11px] font-bold text-gray-700 dark:text-white focus:outline-none cursor-pointer appearance-none"
                    >
                        <option value="ALL">All Status</option>
                        <option value="SUBMITTED">Submitted</option>
                        <option value="UNDER_REVIEW">In Review</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                    </select>

                    <button onClick={fetchReports} className="flex items-center justify-center p-2 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-dim hover:text-red-500 hover:border-red-500/30 transition-all">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row relative">
                
                {/* Main Content Area */}
                <main className={`flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar transition-all duration-500 ${selectedReport ? 'lg:mr-[500px]' : ''}`}>
                    <div className="max-w-[1400px] mx-auto space-y-6">
                        
                        {/* Summary Cards */}
                        {!selectedReport && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
                        )}

                        {/* List View */}
                        <div className="bg-white dark:bg-[#0F0F0F] border border-gray-200 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="bg-gray-50/50 dark:bg-white/[0.01]">
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 dark:border-white/5">Incident & Asset</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 dark:border-white/5">Location Info</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 dark:border-white/5">Status</th>
                                            <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 dark:border-white/5 text-right">Review</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                        {loading ? (
                                            [1, 2, 3, 4, 5].map(i => (
                                                <tr key={i} className="animate-pulse">
                                                    <td colSpan={4} className="px-8 py-8"><div className="h-4 bg-gray-100 dark:bg-white/5 rounded-full w-full" /></td>
                                                </tr>
                                            ))
                                        ) : filteredReports.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="p-32 text-center">
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
                                                    onClick={() => setSelectedReport(r)}
                                                    className={`group hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-all cursor-pointer relative ${selectedReport?._id === r._id ? 'bg-red-500/[0.03] dark:bg-red-500/[0.05]' : ''}`}
                                                >
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-5">
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110 ${r.status === 'SUBMITTED' ? 'bg-red-500 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                                                                <Car size={20} />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                    <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{r.vehicleNumber}</p>
                                                                    {r.images?.length > 0 && <span className="text-[8px] bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded font-black uppercase">{r.images.length} Evidence</span>}
                                                                </div>
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
                                                    <td className="px-8 py-6">
                                                        <StatusBadge status={r.status} />
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <button className="p-3 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-400 group-hover:text-red-500 group-hover:bg-red-500/10 transition-all border border-transparent group-hover:border-red-500/20">
                                                            <ChevronRight size={18} />
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
                </main>

                {/* Glassmorphism Side Details Panel */}
                <div className={`fixed inset-y-0 right-0 w-full lg:w-[500px] bg-white dark:bg-[#0A0A0A] border-l border-gray-200 dark:border-white/10 shadow-2xl transform transition-transform duration-500 ease-out z-40 overflow-y-auto custom-scrollbar ${selectedReport ? 'translate-x-0' : 'translate-x-full'}`}>
                    {selectedReport && (
                        <div className="p-8 md:p-10 space-y-10">
                            {/* Panel Header */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 text-[8px] font-black uppercase tracking-[0.2em] border border-red-500/20">Incident Case</span>
                                        <StatusBadge status={selectedReport.status} />
                                    </div>
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">{selectedReport.vehicleNumber}</h2>
                                    <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Case ID: {selectedReport._id}</p>
                                </div>
                                <button 
                                    onClick={() => setSelectedReport(null)} 
                                    className="p-3 bg-gray-100 dark:bg-white/5 rounded-2xl text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                                >
                                    <XCircle size={24} />
                                </button>
                            </div>

                            {/* Section: Participants */}
                            <section className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 flex items-center gap-2">
                                    <Users size={12} /> Personnel & Asset
                                </h3>
                                <div className="grid grid-cols-2 gap-4 p-6 rounded-3xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
                                    <div className="col-span-2 flex items-center gap-4 mb-2 pb-4 border-b border-gray-200/50 dark:border-white/5">
                                        <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center font-black text-lg shadow-inner">
                                            {(selectedReport.driver?.personalInfo?.fullName || selectedReport.driverName || 'D')[0]}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-900 dark:text-white">{selectedReport.driver?.personalInfo?.fullName || selectedReport.driverName}</p>
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Active Driver</p>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1.5"><Mail size={10}/> Email</p>
                                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">{selectedReport.driver?.personalInfo?.email || selectedReport.driverEmail || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1.5"><Phone size={10}/> Primary Contact</p>
                                        <p className="text-xs font-bold text-gray-900 dark:text-white">{selectedReport.driver?.personalInfo?.phone || selectedReport.alternativeMobile}</p>
                                    </div>
                                    <div className="pt-2 border-t border-gray-200/50 dark:border-white/5 mt-2 col-span-2">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1.5"><MapPin size={10}/> Operating Branch</p>
                                        <p className="text-xs font-black text-red-500 uppercase">{typeof selectedReport.branch === 'object' ? selectedReport.branch.name : 'Central Hub'}</p>
                                    </div>
                                </div>
                            </section>

                            {/* Section: Evidence */}
                            <section className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 flex items-center gap-2">
                                    <Camera size={12} /> Evidence Gallery
                                </h3>
                                {selectedReport.images && selectedReport.images.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        {selectedReport.images.map((img, idx) => (
                                            <a 
                                                key={idx} 
                                                href={img} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="aspect-[4/3] rounded-2xl overflow-hidden border border-gray-200 dark:border-white/10 group relative block shadow-sm hover:shadow-xl transition-all"
                                            >
                                                <img src={img} alt={`Scene ${idx+1}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-125" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                                    <span className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                                        <Eye size={12} /> View Evidence {idx+1}
                                                    </span>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center rounded-3xl border border-dashed border-gray-200 dark:border-white/10 opacity-40">
                                        <Camera size={24} className="mx-auto mb-2" />
                                        <p className="text-[9px] font-black uppercase tracking-widest">No visual evidence provided</p>
                                    </div>
                                )}
                            </section>

                            {/* Section: Description */}
                            <section className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 flex items-center gap-2">
                                    <FileText size={12} /> Incident Report
                                </h3>
                                <div className="p-6 rounded-3xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
                                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200/50 dark:border-white/5">
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Time of Incident</p>
                                            <p className="text-xs font-bold text-gray-900 dark:text-white">{new Date(selectedReport.accidentDate).toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Location</p>
                                            <p className="text-xs font-bold text-gray-900 dark:text-white flex items-center justify-end gap-1"><MapPin size={12} className="text-red-500"/> {selectedReport.accidentLocation}</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium italic">
                                        "{selectedReport.description}"
                                    </p>
                                </div>
                            </section>

                            {/* Section: Actions */}
                            <section className="pt-10 border-t border-gray-200 dark:border-white/10 space-y-6 pb-20">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Resolution Controls</h3>
                                    {selectedReport.resolvedAt && (
                                        <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1.5 bg-emerald-500/10 px-2 py-1 rounded-full">
                                            <CheckCircle2 size={12}/> Closed {new Date(selectedReport.resolvedAt).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>

                                {selectedReport.status !== 'CLOSED' && selectedReport.status !== 'RESOLVED' ? (
                                    <div className="space-y-4">
                                        <textarea 
                                            value={reviewNotes}
                                            onChange={(e) => setReviewNotes(e.target.value)}
                                            placeholder="Enter investigation notes or resolution steps..."
                                            className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded-2xl px-6 py-5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all text-gray-900 dark:text-white resize-none min-h-[140px]"
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <button 
                                                onClick={() => handleUpdateStatus('UNDER_REVIEW')}
                                                disabled={updating || selectedReport.status === 'UNDER_REVIEW'}
                                                className="py-4 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white font-black text-[11px] uppercase tracking-widest rounded-2xl hover:bg-red-500/10 hover:text-red-500 disabled:opacity-50 transition-all border border-transparent hover:border-red-500/20"
                                            >
                                                {selectedReport.status === 'UNDER_REVIEW' ? 'In Review' : 'Start Review'}
                                            </button>
                                            <button 
                                                onClick={() => handleUpdateStatus('RESOLVED')}
                                                disabled={updating}
                                                className="py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 transition-all"
                                            >
                                                Mark Resolved
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-6 rounded-3xl bg-emerald-500/[0.03] border border-emerald-500/10">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-3 flex items-center gap-1.5">
                                            <CheckCircle2 size={14}/> Final Resolution Notes
                                        </p>
                                        <p className="text-sm text-gray-700 dark:text-gray-400 italic leading-relaxed font-medium">
                                            {selectedReport.reviewNotes || "No notes were provided for this resolution."}
                                        </p>
                                    </div>
                                )}
                            </section>
                        </div>
                    )}
                </div>

                {/* Mobile Backdrop */}
                {selectedReport && (
                    <div 
                        onClick={() => setSelectedReport(null)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
                    />
                )}
            </div>
        </div>
    );
};

export default AccidentReports;
