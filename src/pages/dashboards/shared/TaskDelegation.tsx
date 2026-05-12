import { useState, useEffect, useMemo } from 'react';
import { 
    ClipboardList, Plus, User, CheckCircle, Search, 
    X, CheckCircle2, Shield, Activity, 
    Trash2, Tag, Clock
} from 'lucide-react';
import { delegateTask, getTasks, updateTaskStatus } from '../../../services/taskService';
import { getStaffPerformance } from '../../../services/staffPerformanceService';
import { getAllBranches, type Branch } from '../../../services/branchService';
import { getUserRole, getUserId, getUser } from '../../../utils/auth';

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
            setFormData({ ...formData, title: '', description: '', assignedTo: '', notes: '' });
            setIsModalOpen(false);
            fetchInitialData();
        } catch (error) {
            console.error('Error delegating task:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (taskId: string, status: string) => {
        try {
            await updateTaskStatus(taskId, status);
            fetchInitialData();
        } catch (error) {
            console.error('Error updating task status:', error);
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
            case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'CANCELLED': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
            default: return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        }
    };

    return (
        <div className="flex-1 w-full overflow-y-auto h-screen custom-scrollbar" style={{ backgroundColor: 'var(--bg-main)' }}>
            
            {/* Command Header */}
            <div className="p-8 border-b border-white/5 relative overflow-hidden bg-black/40 backdrop-blur-md sticky top-0 z-20">
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 blur-[100px] rounded-full -mr-48 -mt-48" />
                
                <div className="max-w-[1600px] mx-auto relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shadow-2xl shadow-indigo-500/5 border border-indigo-500/20">
                                <ClipboardList size={32} />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black tracking-tighter text-white">Delegation Center</h1>
                                <p className="text-dim font-medium flex items-center gap-2 mt-1 uppercase text-[10px] tracking-[0.2em]">
                                    <Shield size={14} className="text-indigo-400" /> Operational Task Orchestration & Oversight
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex items-center gap-6 px-8 py-3 rounded-2xl bg-white/5 border border-white/10">
                                <div className="text-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-dim mb-1">Queue</p>
                                    <p className="text-xl font-black text-white leading-none">{tasks.filter(t => t.status !== 'COMPLETED').length}</p>
                                </div>
                                <div className="w-px h-8 bg-white/10" />
                                <div className="text-center">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-dim mb-1">Resolved</p>
                                    <p className="text-xl font-black text-emerald-400 leading-none">{tasks.filter(t => t.status === 'COMPLETED').length}</p>
                                </div>
                            </div>

                            <button 
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-indigo-600 text-white font-black text-sm uppercase tracking-widest transition-all hover:shadow-[0_0_30px_rgba(79,70,229,0.3)] active:scale-[0.98]"
                            >
                                <Plus size={20} />
                                Create Assignment
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8 max-w-[1600px] mx-auto space-y-10 pb-24">
                
                {/* Search & Intelligence Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-4 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-sm">
                    <div className="relative flex-1 group">
                        <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-400 opacity-40 group-focus-within:opacity-100 transition-opacity" />
                        <input 
                            type="text" 
                            placeholder="Filter by task title, description, or resource name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-white"
                        />
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        {['all', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                    filterStatus === status 
                                        ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' 
                                        : 'bg-white/5 border-white/5 text-dim hover:text-white hover:bg-white/10'
                                }`}
                            >
                                {status === 'all' ? 'Unified Ledger' : status.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tabular Task Ledger */}
                <div className="rounded-[2.5rem] border border-white/5 bg-white/5 overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/10">
                                <Activity size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white">Delegation Ledger</h2>
                                <p className="text-[10px] font-black uppercase tracking-widest text-dim mt-1">Real-time tracking of operational resource directives</p>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-black/40">
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-dim border-b border-white/5 pl-10">Directive Details</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-dim border-b border-white/5 text-center">Resource</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-dim border-b border-white/5 text-center">Timeline</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-dim border-b border-white/5 text-center">Status</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-dim border-b border-white/5 text-right pr-10">Management</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {fetching ? (
                                    [1, 2, 3, 4].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="p-10"><div className="h-4 bg-white/5 rounded-full w-full" /></td>
                                        </tr>
                                    ))
                                ) : filteredTasks.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-32 text-center">
                                            <div className="mx-auto w-24 h-24 rounded-[2rem] bg-white/5 flex items-center justify-center text-dim mb-6">
                                                <ClipboardList size={48} className="opacity-20" />
                                            </div>
                                            <p className="text-sm font-black text-dim uppercase tracking-[0.2em]">No Directives Found in Ledger</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTasks.map((task) => (
                                        <tr key={task._id} className="hover:bg-white/[0.03] transition-colors group/row">
                                            <td className="p-6 pl-10 max-w-md">
                                                <div className="space-y-1">
                                                    <h3 className="text-base font-black text-white group-hover/row:text-indigo-400 transition-colors flex items-center gap-2">
                                                        {task.title}
                                                        {task.assignedBy === userId && <Tag size={12} className="text-indigo-500" />}
                                                    </h3>
                                                    <p className="text-xs text-dim line-clamp-2 leading-relaxed">{task.description}</p>
                                                    <p className="text-[10px] font-bold text-dim flex items-center gap-1.5 mt-2">
                                                        <User size={10} className="text-indigo-400" /> By: {task.assignedBy?.fullName || 'Root'} ({task.assignedByRole})
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="inline-flex flex-col items-center gap-1">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-xs border border-indigo-500/10 mb-1">
                                                        {task.assignedTo?.fullName?.charAt(0) || 'R'}
                                                    </div>
                                                    <span className="text-[10px] font-black text-white uppercase tracking-tighter">{task.assignedToRole}</span>
                                                    <span className="text-[8px] font-bold text-dim">{task.assignedTo?.fullName || 'Unspecified'}</span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="inline-flex flex-col gap-1">
                                                    <div className="flex items-center justify-center gap-2 text-white">
                                                        <Clock size={12} className="text-indigo-400" />
                                                        <span className="text-[12px] font-black">{new Date(task.dueDate).toLocaleDateString()}</span>
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase text-dim tracking-widest">Expiration</span>
                                                    {task.completedAt && (
                                                        <span className="text-[8px] font-bold text-emerald-400 mt-1">Resolved {new Date(task.completedAt).toLocaleDateString()}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(task.status)}`}>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                                                    {task.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-6 text-right pr-10">
                                                <div className="flex items-center justify-end gap-2">
                                                    {task.status !== 'COMPLETED' && (
                                                        <>
                                                            {task.status === 'PENDING' && (
                                                                <button 
                                                                    onClick={() => handleStatusUpdate(task._id, 'IN_PROGRESS')}
                                                                    className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all border border-blue-500/10"
                                                                    title="Start Directive"
                                                                >
                                                                    <Activity size={16} />
                                                                </button>
                                                            )}
                                                            <button 
                                                                onClick={() => handleStatusUpdate(task._id, 'COMPLETED')}
                                                                className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/10"
                                                                title="Resolve Directive"
                                                            >
                                                                <CheckCircle2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                    <button 
                                                        onClick={() => handleStatusUpdate(task._id, 'CANCELLED')}
                                                        className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all border border-rose-500/10"
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

            {/* Assignment Drawer (Modal) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsModalOpen(false)} />
                    <div className="relative w-full max-w-xl rounded-[3rem] bg-[#0c0c0c] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                    <Plus size={28} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white">Deploy Directive</h2>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-dim">Establish operational focus for resources</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-dim hover:text-white transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-dim ml-2">Directive Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-black border border-white/10 rounded-2xl p-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-white"
                                    placeholder="Operational objective title..."
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-dim ml-2">Objective Details</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-black border border-white/10 rounded-2xl p-5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-white min-h-[120px]"
                                    placeholder="Comprehensive directive description..."
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-dim ml-2">Resource Node</label>
                                    <select
                                        value={formData.assignedTo}
                                        onChange={(e) => handleStaffChange(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded-2xl p-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-white"
                                        required
                                    >
                                        <option value="">Select Target</option>
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
                                    <label className="text-[11px] font-black uppercase tracking-widest text-dim ml-2">Resolution Deadline</label>
                                    <input
                                        type="date"
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                        className="w-full bg-black border border-white/10 rounded-2xl p-5 text-[11px] font-bold text-white uppercase"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-6 rounded-3xl bg-indigo-600 text-white font-black text-sm uppercase tracking-widest transition-all hover:shadow-[0_0_50px_rgba(79,70,229,0.3)] active:scale-[0.98] mt-4 flex items-center justify-center gap-4"
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>Authorize Directive <CheckCircle size={20} /></>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskDelegation;
