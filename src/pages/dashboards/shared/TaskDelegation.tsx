import { useState, useEffect, useMemo } from 'react';
import { 
    ClipboardList, Plus, User, CheckCircle, Search, 
    X, CheckCircle2, Shield, Activity, 
    Trash2, Tag, Clock, ChevronRight, Briefcase, RefreshCw
} from 'lucide-react';
import { delegateTask, getTasks, updateTaskStatus } from '../../../services/taskService';
import { getStaffPerformance } from '../../../services/staffPerformanceService';
import { getAllBranches } from '../../../services/branchService';
import { getUserRole, getUserId, getUser } from '../../../utils/auth';
import { toast } from 'react-hot-toast';

const TaskDelegation = () => {
    const userRole = getUserRole() || '';
    const userId = getUserId() || '';
    const user = getUser();

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [staff, setStaff] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        assignedTo: '',
        assignedToRole: '',
        assignedToRoleModel: '',
        dueDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0],
        notes: ''
    });

    const [branchFilter] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setFetching(true);
        try {
            const bData = await getAllBranches({ limit: 100 });
            
            const sData = await getStaffPerformance({ type: 'all' });
            let allStaff = [
                ...(sData.data.financeStaff || []).map(s => ({ ...s, role: 'FINANCESTAFF', model: 'FinanceStaff' })),
                ...(sData.data.operationStaff || []).map(s => ({ ...s, role: 'OPERATIONSTAFF', model: 'OperationStaff' })),
                ...(sData.data.branchManagers || []).map(s => ({ ...s, role: 'BRANCHMANAGER', model: 'BranchManager' })),
                ...(sData.data.countryManagers || []).map(s => ({ ...s, role: 'COUNTRYMANAGER', model: 'CountryManager' })),
            ];

            if (userRole === 'branchmanager' && user?.branchId) {
                allStaff = allStaff.filter(s => ('branchId' in s) && s.branchId === user.branchId);
            } else if (userRole === 'countrymanager') {
                const managedBranchIds = bData.data
                    .filter((b: any) => {
                        const managerId = typeof b.countryManager === 'object' ? b.countryManager?._id : b.countryManager;
                        return managerId === userId;
                    })
                    .map((b: any) => b._id);
                allStaff = allStaff.filter(s => ('branchId' in s) && managedBranchIds.includes(s.branchId));
            }

            setStaff(allStaff);

            const tData = await getTasks({});
            setTasks(tData.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Data retrieval failed');
        } finally {
            setFetching(false);
        }
    };

    const handleStaffChange = (staffId: string) => {
        const selected = staff.find(s => s.staffId === staffId);
        if (selected) {
            setFormData({
                ...formData,
                assignedTo: selected.staffId,
                assignedToRole: selected.role,
                assignedToRoleModel: selected.model
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await delegateTask(formData as any);
            toast.success('Directive successfully deployed');
            setFormData({ ...formData, title: '', description: '', assignedTo: '', notes: '' });
            setIsModalOpen(false);
            fetchInitialData();
        } catch (error) {
            console.error('Error delegating task:', error);
            toast.error('Authorization failed');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (taskId: string, status: string) => {
        try {
            await updateTaskStatus(taskId, status);
            toast.success(`Directive status updated to ${status}`);
            fetchInitialData();
        } catch (error) {
            console.error('Error updating task status:', error);
            toast.error('Status synchronization failed');
        }
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                 (t.assignedTo?.fullName || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
            return matchesSearch && matchesStatus;
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [tasks, searchQuery, filterStatus]);

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20';
            case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20';
            case 'CANCELLED': return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20';
            default: return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20';
        }
    };

    return (
        <div className="flex-1 w-full overflow-y-auto h-screen custom-scrollbar bg-gray-50 dark:bg-[#0A0A0A]">
            
            {/* Professional Command Header */}
            <div className="p-8 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-[#0F0F0F] sticky top-0 z-20">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/10">
                            <ClipboardList size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Delegation Center</h1>
                            <p className="text-gray-500 dark:text-dim font-bold flex items-center gap-2 mt-0.5 uppercase text-[10px] tracking-widest">
                                <Shield size={14} className="text-indigo-600" /> Operational Task Orchestration & Oversight
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-6 px-8 py-2.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                            <div className="text-center">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Pending</p>
                                <p className="text-lg font-black text-gray-900 dark:text-white leading-none">{tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length}</p>
                            </div>
                            <div className="w-px h-6 bg-gray-300 dark:bg-white/10" />
                            <div className="text-center">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Resolved</p>
                                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none">{tasks.filter(t => t.status === 'COMPLETED').length}</p>
                            </div>
                        </div>

                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-3 px-6 py-4 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest transition-all hover:bg-indigo-700 active:scale-[0.98] shadow-lg shadow-indigo-600/20"
                        >
                            <Plus size={18} />
                            Deploy Directive
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-8 max-w-[1600px] mx-auto space-y-8 pb-24">
                
                {/* Tactical Search & Filter Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-3 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm">
                    <div className="relative flex-1 group">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search by directive, resource, or metadata..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-indigo-600/50 transition-all text-gray-900 dark:text-white"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
                        {['all', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${
                                    filterStatus === status 
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                                        : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-500 dark:text-dim hover:bg-gray-50 dark:hover:bg-white/10'
                                }`}
                            >
                                {status === 'all' ? 'Unified Ledger' : status.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tabular Directive Ledger */}
                <div className="bg-white dark:bg-[#0F0F0F] border border-gray-200 dark:border-white/5 overflow-hidden rounded-xl shadow-sm">
                    <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                <Activity size={20} />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Active Directives</h2>
                                <p className="text-[9px] font-bold text-gray-500 dark:text-dim uppercase tracking-widest mt-0.5">Real-time status of operational assignments</p>
                            </div>
                        </div>
                        <button onClick={fetchInitialData} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                            <RefreshCw size={16} className={fetching ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 dark:bg-white/[0.01]">
                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/5 pl-8">Directive Details</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/5 text-center">Resource Node</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/5 text-center">Timeline</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/5 text-center">Status</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/5 text-right pr-8">Management</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {fetching ? (
                                    [1, 2, 3, 4].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="p-8"><div className="h-3 bg-gray-100 dark:bg-white/5 rounded-full w-full" /></td>
                                        </tr>
                                    ))
                                ) : filteredTasks.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-24 text-center">
                                            <Shield size={40} className="mx-auto mb-4 text-gray-200 dark:text-white/10" />
                                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No directives found in ledger</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTasks.map((task) => (
                                        <tr key={task._id} className="hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-colors group/row">
                                            <td className="p-5 pl-8 max-w-sm">
                                                <div className="space-y-1">
                                                    <h3 className="text-sm font-black text-gray-900 dark:text-white group-hover/row:text-indigo-600 transition-colors flex items-center gap-2">
                                                        {task.title}
                                                        {task.assignedBy === userId && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" title="Authored by you" />}
                                                    </h3>
                                                    <p className="text-[11px] text-gray-500 dark:text-dim leading-relaxed line-clamp-2">{task.description}</p>
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <span className="text-[9px] font-black text-gray-400 uppercase flex items-center gap-1">
                                                            <User size={10} /> By: {task.assignedBy?.fullName || 'Root'}
                                                        </span>
                                                        <span className="text-[9px] font-black text-indigo-600/60 dark:text-indigo-400/60 uppercase">
                                                            {task.assignedByRole}
                                                        </span>
                                                    </div>
                                                    {task.feedback && (
                                                        <div className="mt-3 p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 italic">
                                                            <p className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-1">Staff Observations</p>
                                                            <p className="text-[10px] text-gray-700 dark:text-white">"{task.feedback}"</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-5 text-center">
                                                <div className="inline-flex flex-col items-center gap-1.5">
                                                    <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-900 dark:text-white font-black text-[10px] border border-gray-200 dark:border-white/5">
                                                        {task.assignedTo?.fullName?.charAt(0) || 'R'}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-tighter">{task.assignedTo?.fullName || 'Unspecified'}</span>
                                                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{task.assignedToRole}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-5 text-center">
                                                <div className="inline-flex flex-col gap-1 items-center">
                                                    <div className="flex items-center gap-1.5 text-gray-900 dark:text-white">
                                                        <Clock size={12} className="text-indigo-600 dark:text-indigo-400" />
                                                        <span className="text-xs font-black">{new Date(task.dueDate).toLocaleDateString()}</span>
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Expiration</span>
                                                    {task.completedAt && (
                                                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 justify-center">
                                                            <CheckCircle2 size={10} /> {new Date(task.completedAt).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-5 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getStatusStyle(task.status)}`}>
                                                    <div className="w-1 h-1 rounded-full bg-current" />
                                                    {task.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-5 text-right pr-8">
                                                <div className="flex items-center justify-end gap-2">
                                                    {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                                                        <>
                                                            <button 
                                                                onClick={() => handleStatusUpdate(task._id, 'COMPLETED')}
                                                                className="p-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm group"
                                                                title="Mark as Resolved"
                                                            >
                                                                <CheckCircle2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                    <button 
                                                        onClick={() => handleStatusUpdate(task._id, 'CANCELLED')}
                                                        className="p-2.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-dim hover:bg-rose-600 hover:text-white dark:hover:bg-rose-600 dark:hover:text-white transition-all border border-gray-200 dark:border-white/10 group"
                                                        title="Revoke Directive"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Directive Deployment Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-xl bg-white dark:bg-[#0C0C0C] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50 dark:bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <Plus size={20} />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">Deploy New Directive</h2>
                                    <p className="text-[9px] font-bold text-gray-500 dark:text-dim uppercase tracking-widest mt-0.5">Establish operational resource focus</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Directive Objective</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-600/50 transition-all text-gray-900 dark:text-white"
                                    placeholder="Brief mission title..."
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Detailed Instructions</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl p-4 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-600/50 transition-all text-gray-900 dark:text-white min-h-[100px] resize-none"
                                    placeholder="Provide comprehensive directive details..."
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Target Node</label>
                                    <select
                                        value={formData.assignedTo}
                                        onChange={(e) => handleStaffChange(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-600/50 transition-all text-gray-900 dark:text-white"
                                        required
                                    >
                                        <option value="">Select Resource</option>
                                        {staff
                                            .filter(s => {
                                                const sBranchId = ('branchId' in s) ? s.branchId : null;
                                                if (user?.branchId) return sBranchId === user.branchId;
                                                if (branchFilter) return sBranchId === branchFilter;
                                                return true;
                                            })
                                            .map(s => (
                                                <option key={s.staffId} value={s.staffId}>{s.fullName} ({s.role})</option>
                                            ))
                                        }
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Resolution Window</label>
                                    <input
                                        type="date"
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-[11px] font-bold text-gray-900 dark:text-white uppercase"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest transition-all hover:bg-indigo-700 active:scale-[0.98] mt-4 flex items-center justify-center gap-3 shadow-lg shadow-indigo-600/20"
                            >
                                {loading ? <Activity size={18} className="animate-spin" /> : <>Authorize Directive <CheckCircle size={18} /></>}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskDelegation;
