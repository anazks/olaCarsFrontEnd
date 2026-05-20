import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ShieldAlert, Search, MapPin, Car, 
    CheckCircle2, Clock, Eye, AlertTriangle, RefreshCw,
    FileText
} from 'lucide-react';
import { 
    getAllAccidentReports, 
    getBranchAccidentReports, 
    type AccidentReport 
} from '../../../services/accidentReportService';
import { getUserRole, getUser } from '../../../utils/auth';
import { toast } from 'react-hot-toast';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const AccidentReports = () => {
    const navigate = useNavigate();
    const userRole = getUserRole() || '';
    const user = getUser();

    const [loading, setLoading] = useState(true);
    const [reports, setReports] = useState<AccidentReport[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
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
                <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                    <div className="max-w-[1400px] mx-auto space-y-6">
                        
                        {/* Summary Cards */}
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
                                                    onClick={() => navigate(`${r._id}`)}
                                                    className="group hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-all cursor-pointer relative"
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
                                                            <Eye size={18} />
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
            </div>
        </div>
    );
};

export default AccidentReports;
