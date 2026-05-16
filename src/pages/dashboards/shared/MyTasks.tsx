import { useState, useEffect, useMemo } from 'react';
import { 
    ClipboardList, CheckCircle, Search, 
    Activity, Clock, Shield,
    CheckCircle2, RefreshCw, X, MessageSquare, AlertCircle
} from 'lucide-react';
import { getTasks, updateTaskStatus } from '../../../services/taskService';
import { getUser } from '../../../utils/auth';
import { toast } from 'react-hot-toast';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const MyTasks = () => {
    const user = getUser();
    const userId = user?.id || user?._id;

    const [fetching, setFetching] = useState(true);
    const [tasks, setTasks] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    
    // Modal State
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [feedbackText, setFeedbackText] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        setFetching(true);
        try {
            const tData = await getTasks({ assignedTo: userId });
            setTasks(Array.isArray(tData.data) ? tData.data : []);
        } catch (error) {
            console.error('Error fetching missions:', error);
            toast.error('Failed to load assigned missions');
        } finally {
            setFetching(false);
        }
    };

    const handleOpenStatusModal = (task: any) => {
        setSelectedTask(task);
        setFeedbackText(task.feedback || '');
    };

    const handleUpdateStatus = async (status: string) => {
        if (!selectedTask) return;
        
        setIsUpdating(true);
        try {
            await updateTaskStatus(selectedTask._id, status, feedbackText);
            toast.success(`Mission updated to ${status.replace('_', ' ')}`);
            setSelectedTask(null);
            setFeedbackText('');
            fetchTasks();
        } catch (error) {
            console.error('Error updating mission status:', error);
            toast.error('Failed to update mission');
        } finally {
            setIsUpdating(false);
        }
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 t.description.toLowerCase().includes(searchQuery.toLowerCase());
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
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'My Tasks', active: true }]} />

            
            {/* Professional Header */}
            <div className="p-8 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-black/40 backdrop-blur-md sticky top-0 z-20">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/10">
                            <Shield size={28} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Assigned Missions</h1>
                            <p className="text-gray-500 dark:text-dim font-bold flex items-center gap-2 mt-0.5 uppercase text-[10px] tracking-widest">
                                <Activity size={14} className="text-indigo-600" /> Operational Directive Management
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-5 px-6 py-2.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                            <div className="text-center">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Active</p>
                                <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 leading-none">{tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length}</p>
                            </div>
                            <div className="w-px h-6 bg-gray-300 dark:bg-white/10" />
                            <div className="text-center">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Resolved</p>
                                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 leading-none">{tasks.filter(t => t.status === 'COMPLETED').length}</p>
                            </div>
                        </div>

                        <button 
                            onClick={fetchTasks}
                            className="p-3.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-dim hover:text-indigo-600 dark:hover:text-white transition-all shadow-sm"
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-8 max-w-[1600px] mx-auto space-y-8 pb-24">
                
                {/* Search & Filters */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-3 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm">
                    <div className="relative flex-1 group">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Find mission by directive or details..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-indigo-600/50 transition-all text-gray-900 dark:text-white"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
                        {['all', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${
                                    filterStatus === status 
                                        ? 'bg-indigo-600 text-white border-indigo-600' 
                                        : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-500 dark:text-dim hover:bg-gray-50 dark:hover:bg-white/10'
                                }`}
                            >
                                {status === 'all' ? 'Unified View' : status.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mission Table */}
                <div className="bg-white dark:bg-[#0F0F0F] border border-gray-200 dark:border-white/5 overflow-hidden rounded-xl shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-white/[0.02]">
                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 dark:border-white/5 pl-8">Directive / Objective</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 dark:border-white/5 text-center">Origin</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 dark:border-white/5 text-center">Resolution Window</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 dark:border-white/5 text-center">Current State</th>
                                    <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 dark:border-white/5 text-right pr-8">Management</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {fetching ? (
                                    [1, 2, 3].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="p-8"><div className="h-3 bg-gray-100 dark:bg-white/5 rounded-full w-full" /></td>
                                        </tr>
                                    ))
                                ) : filteredTasks.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-24 text-center">
                                            <Shield size={40} className="mx-auto mb-4 text-gray-200 dark:text-white/10" />
                                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No active directives found</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTasks.map((task) => (
                                        <tr key={task._id} className="hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-colors">
                                            <td className="p-5 pl-8 max-w-sm">
                                                <div className="space-y-1">
                                                    <h3 className="text-sm font-black text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">
                                                        {task.title}
                                                    </h3>
                                                    <p className="text-[11px] text-gray-500 dark:text-dim leading-relaxed line-clamp-2">{task.description}</p>
                                                    {task.feedback && (
                                                        <div className="mt-2 flex items-start gap-2 text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/5 px-2 py-1.5 rounded-md border border-indigo-100 dark:border-indigo-500/10 italic">
                                                            <MessageSquare size={12} className="mt-0.5 flex-shrink-0" />
                                                            <span>"{task.feedback}"</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-5 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className="text-[9px] font-black text-gray-900 dark:text-white uppercase px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded">{task.assignedByRole}</span>
                                                    <span className="text-[10px] text-gray-500 dark:text-dim font-bold">{task.assignedBy?.fullName || 'Manager'}</span>
                                                </div>
                                            </td>
                                            <td className="p-5 text-center">
                                                <div className="flex flex-col gap-1 items-center">
                                                    <div className="flex items-center gap-1.5 text-gray-900 dark:text-white">
                                                        <Clock size={12} className="text-indigo-600 dark:text-indigo-400" />
                                                        <span className="text-xs font-black">{new Date(task.dueDate).toLocaleDateString()}</span>
                                                    </div>
                                                    {task.completedAt && (
                                                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">Resolved {new Date(task.completedAt).toLocaleDateString()}</span>
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
                                                                onClick={() => handleOpenStatusModal(task)}
                                                                className="p-2.5 rounded-lg bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-dim hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white transition-all border border-gray-200 dark:border-white/10 group"
                                                                title="Update Mission"
                                                            >
                                                                <Activity size={16} className="group-hover:animate-pulse" />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleUpdateStatus('COMPLETED')}
                                                                className="hidden lg:flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm"
                                                            >
                                                                <CheckCircle2 size={16} />
                                                                <span className="text-[10px] font-black uppercase tracking-widest">Resolve</span>
                                                            </button>
                                                        </>
                                                    )}
                                                    {task.status === 'COMPLETED' && (
                                                        <div className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/5 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-500/10">
                                                            <CheckCircle size={14} />
                                                            <span className="text-[9px] font-black uppercase tracking-widest">Successful</span>
                                                        </div>
                                                    )}
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

            {/* Status Update Modal */}
            {selectedTask && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-lg bg-white dark:bg-[#0C0C0C] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                    <Activity size={20} />
                                </div>
                                <div>
                                    <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">Mission Intelligence Update</h2>
                                    <p className="text-[9px] font-bold text-gray-500 dark:text-dim uppercase tracking-widest mt-0.5">Directive: {selectedTask.title}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedTask(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all rounded-lg">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Directive Feedback & Observations</label>
                                <div className="relative">
                                    <MessageSquare size={16} className="absolute left-4 top-4 text-gray-400" />
                                    <textarea
                                        value={feedbackText}
                                        onChange={(e) => setFeedbackText(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl p-4 pl-12 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-600/50 transition-all text-gray-900 dark:text-white min-h-[120px] resize-none"
                                        placeholder="Enter operational feedback or resolution details..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => handleUpdateStatus('IN_PROGRESS')}
                                    disabled={isUpdating || selectedTask.status === 'IN_PROGRESS'}
                                    className={`flex items-center justify-center gap-2 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                        selectedTask.status === 'IN_PROGRESS'
                                            ? 'bg-blue-600/10 text-blue-600 border-blue-200 cursor-not-allowed opacity-50'
                                            : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/10 active:scale-[0.98]'
                                    }`}
                                >
                                    {isUpdating ? <RefreshCw size={14} className="animate-spin" /> : <Activity size={14} />}
                                    Initiate Mission
                                </button>
                                <button
                                    onClick={() => handleUpdateStatus('COMPLETED')}
                                    disabled={isUpdating}
                                    className="flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/10 active:scale-[0.98] transition-all"
                                >
                                    {isUpdating ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                    Finalize Resolution
                                </button>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5 flex items-center justify-center gap-2">
                            <AlertCircle size={12} className="text-gray-400" />
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Updates are synchronized across the operational network</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyTasks;
