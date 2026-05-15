import { useState, useEffect, useMemo } from 'react';
import { 
    ShieldAlert, Search, MapPin, Calendar, Car, Phone, Mail, 
    CheckCircle2, XCircle, Clock, Eye, AlertTriangle, RefreshCw
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
        if (!searchQuery) return reports;
        const q = searchQuery.toLowerCase();
        return reports.filter(r => {
            const driverDisplayName = r.driver?.personalInfo?.fullName || r.driverName || 'Unknown Driver';
            return r.vehicleNumber.toLowerCase().includes(q) ||
            driverDisplayName.toLowerCase().includes(q) ||
            r.accidentLocation.toLowerCase().includes(q) ||
            (typeof r.branch === 'object' && r.branch.name.toLowerCase().includes(q))
        });
    }, [reports, searchQuery]);

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
        <div className="flex-1 w-full overflow-y-auto h-screen custom-scrollbar bg-gray-50 dark:bg-[#0A0A0A]">
            {/* Header */}
            <div className="p-8 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-[#0F0F0F] sticky top-0 z-20">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-xl bg-red-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
                            <ShieldAlert size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Accident Reports</h1>
                            <p className="text-gray-500 dark:text-dim font-bold flex items-center gap-2 mt-0.5 uppercase text-[10px] tracking-widest">
                                <AlertTriangle size={14} className="text-red-500" /> Incident Command Center
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative group w-72">
                            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-red-500 transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Search vehicle, driver, location..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all text-gray-900 dark:text-white"
                            />
                        </div>
                        <button onClick={fetchReports} className="p-3 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-dim hover:text-red-500 transition-all shadow-sm">
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-8 max-w-[1600px] mx-auto pb-24 grid grid-cols-1 xl:grid-cols-12 gap-8">
                
                {/* Ledger Column */}
                <div className={`xl:col-span-${selectedReport ? '7' : '12'} space-y-6 transition-all duration-300`}>
                    <div className="bg-white dark:bg-[#0F0F0F] border border-gray-200 dark:border-white/5 overflow-hidden rounded-xl shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 dark:bg-white/[0.02]">
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/5">Vehicle & Driver</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/5">Location & Time</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/5">Status</th>
                                        <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/5 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {loading ? (
                                        [1, 2, 3].map(i => (
                                            <tr key={i} className="animate-pulse">
                                                <td colSpan={4} className="p-8"><div className="h-3 bg-gray-100 dark:bg-white/5 rounded-full w-full" /></td>
                                            </tr>
                                        ))
                                    ) : filteredReports.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="p-20 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest">No accident reports found</td>
                                        </tr>
                                    ) : (
                                        filteredReports.map((r) => (
                                            <tr key={r._id} className={`hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-colors cursor-pointer ${selectedReport?._id === r._id ? 'bg-red-50/50 dark:bg-red-500/5' : ''}`} onClick={() => setSelectedReport(r)}>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${r.status === 'SUBMITTED' ? 'bg-red-500/10 text-red-500' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                                                            <Car size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{r.vehicleNumber}</p>
                                                            <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                                                                {r.driver?.personalInfo?.fullName || r.driverName || 'Unknown Driver'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <p className="text-xs font-bold text-gray-900 dark:text-white">{r.accidentLocation}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">{new Date(r.accidentDate).toLocaleString()}</p>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <StatusBadge status={r.status} />
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <button className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                                                        <Eye size={16} />
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

                {/* Details Column */}
                {selectedReport && (
                    <div className="xl:col-span-5 space-y-6">
                        <div className="bg-white dark:bg-[#0F0F0F] border border-gray-200 dark:border-white/5 rounded-xl shadow-sm p-8 sticky top-32">
                            <div className="flex items-start justify-between mb-8">
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">Report Details</h2>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">ID: {selectedReport._id.slice(-6)}</span>
                                        <span className="text-gray-300 dark:text-white/20">•</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{new Date(selectedReport.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedReport(null)} className="p-2 bg-gray-100 dark:bg-white/5 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                                    <XCircle size={20} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Driver & Contact */}
                                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Driver</p>
                                        <p className="text-xs font-bold text-gray-900 dark:text-white">
                                            {selectedReport.driver?.personalInfo?.fullName || selectedReport.driverName || 'Unknown Driver'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Branch</p>
                                        <p className="text-xs font-bold text-gray-900 dark:text-white">{typeof selectedReport.branch === 'object' ? selectedReport.branch.name : 'Unknown'}</p>
                                    </div>
                                    <div className="col-span-2 grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1"><Phone size={10}/> Driver Contact</p>
                                            <p className="text-xs font-bold text-gray-900 dark:text-white">{selectedReport.driver?.personalInfo?.phone || selectedReport.alternativeMobile}</p>
                                            <p className="text-xs font-bold text-gray-500 mt-0.5">{selectedReport.driver?.personalInfo?.email || selectedReport.driverEmail}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1 flex items-center gap-1"><Phone size={10}/> Emergency / Incident Contact</p>
                                            <p className="text-xs font-bold text-gray-900 dark:text-white">{selectedReport.alternativeMobile}</p>
                                            {selectedReport.alternativeEmail && <p className="text-xs font-bold text-gray-500 mt-0.5">{selectedReport.alternativeEmail}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Incident Details */}
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5"><MapPin size={12}/> Location & Time</p>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedReport.accidentLocation}</p>
                                    <p className="text-xs font-medium text-gray-500 mt-1">{new Date(selectedReport.accidentDate).toLocaleString()}</p>
                                </div>

                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1.5"><ShieldAlert size={12}/> Incident Description</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-white/[0.02] p-4 rounded-xl border border-gray-100 dark:border-white/5">{selectedReport.description}</p>
                                </div>

                                {/* Images */}
                                {selectedReport.images && selectedReport.images.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Evidence Photos ({selectedReport.images.length})</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {selectedReport.images.map((img, idx) => (
                                                <a key={idx} href={img} target="_blank" rel="noopener noreferrer" className="aspect-video rounded-lg overflow-hidden border border-gray-200 dark:border-white/10 group relative block">
                                                    <img src={img} alt={`Evidence ${idx+1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Eye size={20} className="text-white" />
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Status Management */}
                                <div className="pt-6 border-t border-gray-200 dark:border-white/5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Case Resolution</p>
                                    
                                    <div className="flex items-center gap-4 mb-6">
                                        <StatusBadge status={selectedReport.status} />
                                        {selectedReport.resolvedAt && (
                                            <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1"><Clock size={12}/> {new Date(selectedReport.resolvedAt).toLocaleDateString()}</span>
                                        )}
                                    </div>

                                    {selectedReport.status !== 'CLOSED' && selectedReport.status !== 'RESOLVED' && (
                                        <div className="space-y-4">
                                            <textarea 
                                                value={reviewNotes}
                                                onChange={(e) => setReviewNotes(e.target.value)}
                                                placeholder="Add resolution notes or instructions for the driver..."
                                                className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all text-gray-900 dark:text-white resize-none min-h-[100px]"
                                            />
                                            <div className="grid grid-cols-2 gap-3">
                                                <button 
                                                    onClick={() => handleUpdateStatus('UNDER_REVIEW')}
                                                    disabled={updating || selectedReport.status === 'UNDER_REVIEW'}
                                                    className="py-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-blue-500/20 disabled:opacity-50 transition-all"
                                                >
                                                    Mark In Review
                                                </button>
                                                <button 
                                                    onClick={() => handleUpdateStatus('RESOLVED')}
                                                    disabled={updating}
                                                    className="py-3 bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-all"
                                                >
                                                    Resolve Case
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {(selectedReport.status === 'CLOSED' || selectedReport.status === 'RESOLVED') && selectedReport.reviewNotes && (
                                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Final Review Notes</p>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 italic">"{selectedReport.reviewNotes}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccidentReports;
