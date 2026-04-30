import { useState, useEffect } from 'react';
import { ClipboardList, Plus, User, Clock, CheckCircle, Search, Filter, AlertCircle, Calendar, X, Info } from 'lucide-react';
import { delegateTask, getTasks, updateTaskStatus } from '../../../services/taskService';
import { getStaffPerformance } from '../../../services/staffPerformanceService';
import { getAllBranches } from '../../../services/branchService';
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

    const [branchFilter, setBranchFilter] = useState('');

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

            // Filter staff for Branch Manager and Country Manager
            if (userRole === 'branchmanager' && user?.branchId) {
                allStaff = allStaff.filter(s => s.branchId === user.branchId);
            } else if (userRole === 'countrymanager') {
                const managedBranchIds = bData.data
                    .filter((b: any) => {
                        const managerId = typeof b.countryManager === 'object' ? b.countryManager?._id : b.countryManager;
                        return managerId === userId;
                    })
                    .map((b: any) => b._id);
                allStaff = allStaff.filter(s => managedBranchIds.includes(s.branchId));
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
            alert('Task delegated successfully!');
            setFormData({ ...formData, title: '', description: '', assignedTo: '', notes: '' });
            setIsModalOpen(false);
            fetchInitialData();
        } catch (error) {
            console.error('Error delegating task:', error);
            alert('Failed to delegate task.');
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

    const filteredTasks = tasks.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             t.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="flex-1 p-4 md:p-8 overflow-auto" style={{ backgroundColor: 'var(--bg-lighter)' }}>
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
                            <ClipboardList size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold font-plus-jakarta" style={{ color: 'var(--text-main)' }}>Task Delegation</h1>
                            <p style={{ color: 'var(--text-dim)' }}>Assign and track specific operational tasks</p>
                        </div>
                    </div>

                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                    >
                        <Plus size={20} />
                        Create Task
                    </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    {/* Sidebar Filters */}
                    <div className="xl:col-span-1 space-y-6">
                        <div className="p-6 rounded-3xl border shadow-sm sticky top-8" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}>
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <Filter size={20} className="text-indigo-500" />
                                Filters
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase mb-2 opacity-60">Search</label>
                                    <div className="relative">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                                        <input
                                            type="text"
                                            placeholder="Task title..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2.5 rounded-xl border bg-transparent text-sm"
                                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase mb-2 opacity-60">Status</label>
                                    <select
                                        value={filterStatus}
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl border bg-transparent text-sm appearance-none"
                                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <option value="all">All Status</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="COMPLETED">Completed</option>
                                    </select>
                                </div>

                                {!user?.branchId && (
                                    <div>
                                        <label className="block text-xs font-bold uppercase mb-2 opacity-60">Branch</label>
                                        <select
                                            value={branchFilter}
                                            onChange={(e) => setBranchFilter(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border bg-transparent text-sm"
                                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        >
                                            <option value="">All Branches</option>
                                            {Array.from(new Set(staff.map(s => s.branchId))).filter(Boolean).map(bId => {
                                                const s = staff.find(st => st.branchId === bId);
                                                return <option key={bId} value={bId}>{s.branchName || bId}</option>;
                                            })}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="xl:col-span-3">
                        <div className="p-6 rounded-3xl border shadow-sm" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <ClipboardList size={20} className="text-indigo-500" />
                                    Active Assignments
                                </h2>
                            </div>

                             <div className="space-y-4">
                                {fetching ? (
                                    [1, 2, 3].map(i => (
                                        <div key={i} className="p-6 rounded-2xl border animate-pulse" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-lighter)' }}>
                                            <div className="flex flex-col md:flex-row gap-6">
                                                <div className="flex-1 space-y-4">
                                                    <div className="h-6 w-1/3 bg-white/5 rounded" />
                                                    <div className="h-16 w-full bg-white/5 rounded" />
                                                    <div className="flex gap-4">
                                                        <div className="h-4 w-24 bg-white/5 rounded" />
                                                        <div className="h-4 w-24 bg-white/5 rounded" />
                                                    </div>
                                                </div>
                                                <div className="w-full md:w-32 h-10 bg-white/5 rounded mt-4 md:mt-0" />
                                            </div>
                                        </div>
                                    ))
                                ) : filteredTasks.length === 0 ? (
                                    <div className="text-center py-20 opacity-40 border border-dashed rounded-3xl" style={{ borderColor: 'var(--border-main)' }}>
                                        <AlertCircle size={48} className="mx-auto mb-4 opacity-20" />
                                        <p>No tasks found matching your filters</p>
                                    </div>
                                ) : (
                                    filteredTasks.map((task) => (
                                        <div key={task._id} className="p-6 rounded-2xl border transition-all hover:border-indigo-500/50" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-lighter)' }}>
                                            <div className="flex flex-col md:flex-row gap-6">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>{task.title}</h3>
                                                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                                                            task.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                            task.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                            'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                        }`}>
                                                            {task.status}
                                                        </span>
                                                        <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border ${
                                                            task.assignedBy === userId ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' : 'bg-pink-500/10 text-pink-500 border-pink-500/20'
                                                        }`}>
                                                            {task.assignedBy === userId ? 'SENT' : 'RECEIVED'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm opacity-70 mb-4 leading-relaxed">{task.description}</p>
                                                    <div className="flex flex-wrap items-center gap-4 text-xs font-medium opacity-60">
                                                        <span className="flex items-center gap-1.5"><User size={14} /> Assigned to: {task.assignedToRole}</span>
                                                        <span className="flex items-center gap-1.5"><Calendar size={14} /> Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                                                        <span className="flex items-center gap-1.5 italic"><Info size={14} /> From: {task.assignedBy?.fullName || 'System'} ({task.assignedByRole})</span>
                                                        {task.completedAt && <span className="flex items-center gap-1.5 text-emerald-500"><CheckCircle size={14} /> Done: {new Date(task.completedAt).toLocaleDateString()}</span>}
                                                    </div>
                                                </div>

                                                <div className="flex flex-row md:flex-col gap-2 shrink-0 justify-end md:justify-center border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                                                    {task.status !== 'COMPLETED' && (
                                                        <>
                                                            {task.status === 'PENDING' && (
                                                                <button 
                                                                    onClick={() => handleStatusUpdate(task._id, 'IN_PROGRESS')}
                                                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all"
                                                                >
                                                                    Start Task
                                                                </button>
                                                            )}
                                                            <button 
                                                                onClick={() => handleStatusUpdate(task._id, 'COMPLETED')}
                                                                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all"
                                                            >
                                                                Mark Complete
                                                            </button>
                                                        </>
                                                    )}
                                                    <button 
                                                        onClick={() => handleStatusUpdate(task._id, 'CANCELLED')}
                                                        className="px-4 py-2 rounded-xl text-xs font-bold opacity-40 hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-500 transition-all"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Task Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="relative w-full max-w-lg p-8 rounded-[32px] border shadow-2xl animate-in zoom-in-95 duration-200" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Plus size={24} className="text-indigo-500" />
                                Create New Task
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold uppercase mb-2 opacity-60">Task Title</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full p-4 rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    placeholder="e.g., Audit branch inventory"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase mb-2 opacity-60">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full p-4 rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px]"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    placeholder="Details about the task..."
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase mb-2 opacity-60">Assign To</label>
                                    <select
                                        value={formData.assignedTo}
                                        onChange={(e) => handleStaffChange(e.target.value)}
                                        className="w-full p-4 rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        required
                                    >
                                        <option value="">Select Staff</option>
                                        {staff
                                            .filter(s => {
                                                if (user?.branchId) return s.branchId === user.branchId;
                                                if (branchFilter) return s.branchId === branchFilter;
                                                return true;
                                            })
                                            .map(s => (
                                                <option key={s.staffId} value={s.staffId}>{s.fullName} ({s.role})</option>
                                            ))
                                        }
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase mb-2 opacity-60">Due Date</label>
                                    <input
                                        type="date"
                                        value={formData.dueDate}
                                        onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                        className="w-full p-4 rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 rounded-2xl font-bold transition-all bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
                            >
                                {loading ? 'Processing...' : 'Delegate Task'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaskDelegation;
