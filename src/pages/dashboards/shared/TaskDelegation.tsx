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
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

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
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Task Delegation', active: true }]} />

            
            {/* Compact Header & Controls */}
            <div className="p-6 md:p-8 max-w-[1600px] mx-auto pb-0 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                    <div>
                        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                            <ClipboardList size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                            Delegation Center
                        </h1>
                        <p className="text-xs font-medium text-dim mt-0.5">Operational task orchestration and administrative oversight.</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-main)]">
                            <div className="text-right">
                                <p className="text-[9px] font-black uppercase tracking-widest text-dim">Queue</p>
                                <p className="text-sm font-black text-white leading-none">{tasks.filter(t => t.status !== 'COMPLETED').length}</p>
                            </div>
                            <div className="w-px h-6 bg-[var(--border-main)] mx-2" />
                            <div className="text-right">
                                <p className="text-[9px] font-black uppercase tracking-widest text-dim">Resolved</p>
                                <p className="text-sm font-black text-brand-lime leading-none" style={{ color: 'var(--brand-lime)' }}>{tasks.filter(t => t.status === 'COMPLETED').length}</p>
                            </div>
                        </div>

                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-brand-lime text-[#0A0A0A] transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                            style={{ backgroundColor: 'var(--brand-lime)' }}
                        >
                            <Plus size={14} strokeWidth={3} />
                            Create Assignment
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-8 max-w-[1600px] mx-auto space-y-8 pb-24">
                
                {/* Search & Intelligence Bar */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-4 rounded-[2rem] bg-[var(--bg-card)] border border-[var(--border-main)] backdrop-blur-sm">
                    <div className="relative flex-1 group">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search by directive, resource, or metadata..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl pl-14 pr-6 py-4 text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-[var(--text-main)]"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
                        {['all', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${
                                    filterStatus === status 
                                        ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' 
                                        : 'bg-[var(--bg-input)] border-[var(--border-main)] text-dim hover:text-[var(--text-main)] hover:bg-[var(--bg-card)]'
                                }`}
                            >
                                {status === 'all' ? 'Unified Ledger' : status.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tabular Task Ledger */}
                <div className="rounded-[2.5rem] border border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden shadow-2xl">
                    <div className="p-8 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-input)]">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/10">
                                <Activity size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-[var(--text-main)]">Delegation Ledger</h2>
                                <p className="text-[10px] font-black uppercase tracking-widest text-dim mt-1">Real-time tracking of operational resource directives</p>
                            </div>
                        </div>
                        <button onClick={fetchInitialData} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                            <RefreshCw size={16} className={fetching ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[var(--bg-input)]">
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] pl-10">Directive Details</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] text-center">Resource</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] text-center">Timeline</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] text-center">Status</th>
                                    <th className="p-6 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] text-right pr-10">Management</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-main)]">
                                {fetching ? (
                                    [1, 2, 3, 4].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="p-10"><div className="h-4 bg-[var(--bg-input)] rounded-full w-full" /></td>
                                        </tr>
                                    ))
                                ) : filteredTasks.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-32 text-center">
                                            <div className="mx-auto w-24 h-24 rounded-[2rem] bg-[var(--bg-input)] flex items-center justify-center text-dim mb-6">
                                                <ClipboardList size={48} className="opacity-20" />
                                            </div>
                                            <p className="text-sm font-black text-dim uppercase tracking-[0.2em]">No Directives Found in Ledger</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTasks.map((task) => (
                                        <tr key={task._id} className="hover:bg-[var(--bg-input)] transition-colors group/row">
                                            <td className="p-6 pl-10 max-w-md">
                                                <div className="space-y-1">
                                                    <h3 className="text-base font-black text-[var(--text-main)] group-hover/row:text-indigo-400 transition-colors flex items-center gap-2">
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
                                                    <span className="text-[10px] font-black text-[var(--text-main)] uppercase tracking-tighter">{task.assignedToRole}</span>
                                                    <span className="text-[8px] font-bold text-dim">{task.assignedTo?.fullName || 'Unspecified'}</span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-center">
                                                <div className="inline-flex flex-col gap-1">
                                                    <div className="flex items-center justify-center gap-2 text-[var(--text-main)]">
                                                        <Clock size={12} className="text-indigo-400" />
                                                        <span className="text-[12px] font-black">{new Date(task.dueDate).toLocaleDateString()}</span>
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase text-dim tracking-widest">Expiration</span>
                                                    {task.completedAt && (
                                                        <span className="text-[8px] font-bold text-emerald-400 mt-1">Resolved {new Date(task.completedAt).toLocaleDateString()}</span>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsModalOpen(false)} />
                    <div className="relative w-full max-w-xl rounded-[3rem] bg-[var(--bg-card)] border border-[var(--border-main)] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-input)]">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                    <Plus size={28} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-[var(--text-main)]">Deploy Directive</h2>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-dim">Establish operational focus for resources</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 rounded-2xl bg-[var(--bg-input)] hover:bg-[var(--bg-card)] text-dim hover:text-[var(--text-main)] transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Directive Objective</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-[var(--text-main)]"
                                    placeholder="Operational objective title..."
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Detailed Instructions</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-[var(--text-main)] min-h-[120px]"
                                    placeholder="Comprehensive directive description..."
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Target Node</label>
                                    <select
                                        value={formData.assignedTo}
                                        onChange={(e) => handleStaffChange(e.target.value)}
                                        className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all text-[var(--text-main)]"
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
                                        className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-5 text-[11px] font-bold text-[var(--text-main)] uppercase"
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
