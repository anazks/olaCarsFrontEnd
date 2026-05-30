import { useState, useEffect, useMemo } from 'react';
import {
    MapPin, Users,
    User, ArrowRight, Shield, Activity, Search, Building2, CheckCircle2, Clock, AlertCircle,
    ChevronDown, ChevronUp, FileText, TrendingUp
} from 'lucide-react';
import { delegateTask, getTasks, updateTaskStatus as updateTaskStatusService } from '../../../services/taskService';
import { getAllBranches, type Branch } from '../../../services/branchService';
import { getStaffPerformance } from '../../../services/staffPerformanceService';
import { getUserRole, getUserId, getUser, ROLE_LEVELS } from '../../../utils/auth';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import toast from 'react-hot-toast';

const TaskManagement = () => {
    const userRole = (getUserRole() || '').toLowerCase().replace(/[\s-_]/g, '');
    const userId = getUserId() || '';
    const user = getUser();

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [existingTasks, setExistingTasks] = useState<any[]>([]);

    const [taskFormData, setTaskFormData] = useState({
        title: '',
        description: '',
        targetType: 'BRANCH' as 'COUNTRY' | 'BRANCH' | 'STAFF',
        targetId: '',
        dueDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0],
        notes: ''
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [isTaskAssignmentOpen, setIsTaskAssignmentOpen] = useState(true);
    const [isAssignedListOpen, setIsAssignedListOpen] = useState(true);
    const [isDelegatedListOpen, setIsDelegatedListOpen] = useState(true);

    const [taskFilters, setTaskFilters] = useState({
        country: '',
        branchId: '',
        role: ''
    });

    const fetchInitialData = async () => {
        setFetching(true);
        try {
            const bData = await getAllBranches({ limit: 100 });
            setBranches(bData.data || []);

            const sData = await getStaffPerformance({ type: 'all' });
            const normalizedStaff = [
                ...(sData.data.financeStaff || []).map((s: any) => ({ ...s, role: 'Finance Staff' })),
                ...(sData.data.operationStaff || []).map((s: any) => ({ ...s, role: 'Operation Staff' })),
                ...(sData.data.branchManagers || []).map((s: any) => ({ ...s, role: 'Branch Manager' })),
                ...(sData.data.countryManagers || []).map((s: any) => ({ ...s, role: 'Country Manager' })),
                ...(sData.data.globalAdmins || []).map((s: any) => {
                    const r = (s.role || '').toLowerCase();
                    let label = 'Global Admin';
                    if (r.includes('finance')) label = 'Finance Admin';
                    else if (r.includes('operation')) label = 'Operation Admin';
                    return { ...s, role: label };
                })
            ];

            const currentUserLevel = ROLE_LEVELS[userRole] || 0;

            let allStaff = normalizedStaff.filter(s => {
                const roleKey = s.role.toLowerCase().replace(/[\s-_]/g, '');
                const staffLevel = ROLE_LEVELS[roleKey] || 0;

                if (staffLevel >= currentUserLevel) return false;
                if (s.role === 'Operation Admin') return false; 

                return true;
            });

            if (userRole === 'branchmanager' && user?.branchId) {
                allStaff = allStaff.filter(s => ('branchId' in s) && s.branchId === user.branchId);
            } else if (userRole === 'countrymanager') {
                const managedBranchIds = bData.data
                    .filter((b: Branch) => {
                        const managerId = typeof b.countryManager === 'object' ? (b.countryManager as any)?._id : b.countryManager;
                        return managerId === userId;
                    })
                    .map((b: any) => b._id);
                allStaff = allStaff.filter(s => ('branchId' in s) && managedBranchIds.includes(s.branchId));
            }

            setStaff(allStaff);

            const taskData = await getTasks({});
            setExistingTasks(taskData.data || []);
        } catch (error) {
            console.error('Error fetching initial data:', error);
        } finally {
            setFetching(false);
        }
    };

    const availableRoles = useMemo(() => {
        const currentUserLevel = ROLE_LEVELS[userRole] || 0;
        const roles = [
            'Country Manager',
            'Branch Manager',
            'Finance Staff',
            'Operation Staff',
            'Finance Admin'
        ];
        return roles.filter(r => {
            const roleKey = r.toLowerCase().replace(/[\s-_]/g, '');
            return (ROLE_LEVELS[roleKey] || 0) < currentUserLevel;
        });
    }, [userRole]);

    useEffect(() => {
        fetchInitialData();
        const defaultType = userRole === 'branchmanager' ? 'STAFF' : userRole === 'countrymanager' ? 'BRANCH' : 'COUNTRY';
        setTaskFormData(prev => ({ ...prev, targetType: defaultType as any }));
    }, [userRole]);

    const handleTaskSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. Only allow alphabets and spaces on task title
        const titleTrimmed = taskFormData.title.trim();
        if (!titleTrimmed) {
            toast.error('Task title is required.');
            return;
        }
        const titleRegex = /^[a-zA-Z\s]+$/;
        if (!titleRegex.test(titleTrimmed)) {
            toast.error('Task title can only contain alphabets and spaces.');
            return;
        }

        // 2. Do not allow past due dates
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        const selectedDueDate = new Date(taskFormData.dueDate);
        if (selectedDueDate < today) {
            toast.error('Due date cannot be in the past.');
            return;
        }

        setLoading(true);
        try {
            await delegateTask(taskFormData as any);
            toast.success('Task deployed successfully!');
            fetchInitialData();
            setTaskFormData(prev => ({ ...prev, title: '', description: '', notes: '' }));
            setTaskFilters({ country: '', branchId: '', role: '' });
            setIsTaskAssignmentOpen(false);
        } catch (error: any) {
            console.error('Error delegating task:', error);
            toast.error(error.response?.data?.message || 'Error delegating task.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateTaskStatus = async (taskId: string, status: string) => {
        try {
            await updateTaskStatusService(taskId, status);
            fetchInitialData();
        } catch (error) {
            console.error('Error updating task status:', error);
        }
    };

    const canAssign = ['admin', 'superadmin', 'financeadmin', 'countrymanager', 'branchmanager'].includes(userRole);
    const canAssignCountry = ['admin', 'superadmin', 'financeadmin'].includes(userRole);
    const canAssignBranch = ['admin', 'superadmin', 'financeadmin', 'countrymanager'].includes(userRole);
    const canAssignStaff = ['branchmanager', 'countrymanager', 'financeadmin', 'admin', 'superadmin'].includes(userRole);

    const getTargetName = (t: any) => {
        if (t.targetType === 'COUNTRY') return t.targetId;
        if (t.targetType === 'BRANCH') {
            const branch = branches.find(b => b._id === t.targetId);
            return branch ? branch.name : t.targetId;
        }
        if (t.targetType === 'STAFF') {
            const member = staff.find(s => s.staffId === t.targetId || s._id === t.targetId);
            return member ? member.fullName : t.targetId;
        }
        return t.targetId;
    };

    const filteredTasks = useMemo(() => {
        let list = existingTasks;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(t =>
                t.title.toLowerCase().includes(q) ||
                getTargetName(t).toLowerCase().includes(q) ||
                (t.assignedBy?.fullName || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [existingTasks, searchQuery, branches, staff]);

    const assignedToMe = filteredTasks.filter(t => {
        if (t.targetType === 'STAFF') return t.targetId === userId || t.targetId === user?.staffId;
        if (t.targetType === 'BRANCH') return t.targetId === user?.branchId;
        if (t.targetType === 'COUNTRY') return t.targetId === user?.country;
        return false;
    });

    const delegatedByMe = filteredTasks.filter(t => (t.assignedBy?._id || t.assignedBy) === userId);

    useEffect(() => {
        if (!fetching) {
            setIsAssignedListOpen(assignedToMe.length > 0);
            setIsDelegatedListOpen(delegatedByMe.length > 0);
        }
    }, [fetching, existingTasks]);

    return (
        <div className="flex-1 w-full overflow-y-auto h-screen custom-scrollbar" style={{ backgroundColor: 'var(--bg-main)' }}>
            <Breadcrumbs items={[
                { label: 'Directives', path: '/admin/admin/directives' }, 
                { label: 'Task Management', active: true }
            ]} />

            <div className="p-6 md:p-8 max-w-[1600px] mx-auto pb-0 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                    <div>
                        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                            <FileText size={20} className="text-blue-500" />
                            Task Management
                        </h1>
                        <p className="text-xs font-semibold text-dim mt-0.5">Deploy and track qualitative directives and action items.</p>
                    </div>

                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-main)]">
                        <div className="text-right">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-dim">Active Tasks</p>
                            <p className="text-sm font-bold text-[var(--text-main)] leading-none">{existingTasks.filter(t => t.status !== 'COMPLETED').length}</p>
                        </div>
                        <div className="w-px h-6 bg-[var(--border-main)] mx-2" />
                        <div className="text-right">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-dim">Completed</p>
                            <p className="text-sm font-bold text-[var(--text-main)] leading-none">{existingTasks.filter(t => t.status === 'COMPLETED').length}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-8 max-w-[1600px] mx-auto pb-24 space-y-8">
                {/* 1. Assignment Section */}
                {canAssign && (
                    <div className="space-y-6">
                        <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden relative group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
                            <div
                                className="p-6 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-input)] cursor-pointer hover:bg-[var(--bg-main)] transition-colors"
                                onClick={() => setIsTaskAssignmentOpen(!isTaskAssignmentOpen)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-[var(--text-main)]">Deploy New Task</h2>
                                        <p className="text-xs font-semibold text-dim">Assign qualitative directives to countries, branches, or staff</p>
                                    </div>
                                </div>
                                <div className="text-dim">
                                    {isTaskAssignmentOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </div>

                            {isTaskAssignmentOpen && (
                                <form onSubmit={handleTaskSubmit} className="p-6 transition-all duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-dim ml-1">Task Title</label>
                                            <input
                                                type="text"
                                                value={taskFormData.title}
                                                onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value.replace(/[^a-zA-Z\s]/g, '') })}
                                                placeholder="Enter task title..."
                                                className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl p-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/80 transition-all text-[var(--text-main)]"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-dim ml-1">Scope</label>
                                            <select
                                                value={taskFormData.targetType}
                                                onChange={(e) => {
                                                    const newType = e.target.value as any;
                                                    setTaskFormData({ ...taskFormData, targetType: newType, targetId: '' });
                                                    setTaskFilters({ country: '', branchId: '', role: '' });
                                                }}
                                                className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl p-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/80 transition-all text-[var(--text-main)] appearance-none cursor-pointer"
                                            >
                                                {canAssignCountry && <option value="COUNTRY">National Country</option>}
                                                {canAssignBranch && <option value="BRANCH">Regional Branch</option>}
                                                {canAssignStaff && <option value="STAFF">Individual Staff</option>}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-dim ml-1">
                                                {taskFormData.targetType === 'COUNTRY' ? 'Select Country Manager' : 
                                                 taskFormData.targetType === 'BRANCH' ? 'Select Branch' : 'Select Role & Staff'}
                                            </label>
                                            
                                            <div className="flex flex-col gap-3">
                                                {taskFormData.targetType === 'STAFF' && (
                                                    <select
                                                        value={taskFilters.role}
                                                        onChange={(e) => {
                                                            setTaskFilters({ ...taskFilters, role: e.target.value, branchId: '', country: '' });
                                                            setTaskFormData({ ...taskFormData, targetId: '' });
                                                        }}
                                                        className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl p-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/80 transition-all text-[var(--text-main)]"
                                                        required
                                                    >
                                                        <option value="">1. Select Role Type</option>
                                                        {availableRoles.map(r => (
                                                            <option key={r} value={r}>{r}</option>
                                                        ))}
                                                    </select>
                                                )}

                                                {(taskFormData.targetType === 'BRANCH') && canAssignCountry && (
                                                    <select
                                                        value={taskFilters.country}
                                                        onChange={(e) => {
                                                            setTaskFilters({ ...taskFilters, country: e.target.value, branchId: '' });
                                                            setTaskFormData({ ...taskFormData, targetId: '' });
                                                        }}
                                                        className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl p-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/80 transition-all text-[var(--text-main)]"
                                                        required
                                                    >
                                                        <option value="">2. Select Country Manager</option>
                                                        {staff
                                                            .filter(s => s.role === 'Country Manager' && s.country)
                                                            .map(s => (
                                                                <option key={s._id || s.staffId} value={s.country}>
                                                                    {s.country} ({s.fullName})
                                                                </option>
                                                            ))
                                                        }
                                                    </select>
                                                )}

                                                {(taskFormData.targetType === 'BRANCH' || (taskFormData.targetType === 'STAFF' && taskFilters.role && !['Country Manager', 'Finance Admin'].includes(taskFilters.role))) && canAssignBranch && (
                                                    <select
                                                        value={taskFormData.targetType === 'BRANCH' ? taskFormData.targetId : taskFilters.branchId}
                                                        onChange={(e) => {
                                                            if (taskFormData.targetType === 'BRANCH') {
                                                                setTaskFilters({ ...taskFilters, branchId: e.target.value });
                                                                setTaskFormData({ ...taskFormData, targetId: e.target.value });
                                                            } else {
                                                                setTaskFilters({ ...taskFilters, branchId: e.target.value });
                                                                setTaskFormData({ ...taskFormData, targetId: '' });
                                                            }
                                                        }}
                                                        className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl p-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/80 transition-all text-[var(--text-main)] disabled:opacity-50"
                                                        required={taskFormData.targetType === 'BRANCH' || (taskFormData.targetType === 'STAFF' && !['Country Manager', 'Finance Admin'].includes(taskFilters.role))}
                                                        disabled={taskFormData.targetType === 'BRANCH' && canAssignCountry && !taskFilters.country}
                                                    >
                                                        <option value="">{taskFormData.targetType === 'BRANCH' ? '3. Select Target Branch' : '2. Select Branch'}</option>
                                                        {branches
                                                            .filter(b => {
                                                                if (taskFormData.targetType === 'BRANCH' && canAssignCountry && taskFilters.country && b.country !== taskFilters.country) return false;
                                                                if (userRole === 'countrymanager') {
                                                                    const managerId = typeof b.countryManager === 'object' ? (b.countryManager as any)?._id : b.countryManager;
                                                                    return managerId === userId;
                                                                }
                                                                return true;
                                                             })
                                                            .map(b => (
                                                                <option key={b._id} value={b._id}>{b.name}</option>
                                                            ))
                                                        }
                                                    </select>
                                                )}

                                                {taskFormData.targetType !== 'BRANCH' && (
                                                    <select
                                                        value={taskFormData.targetId}
                                                        onChange={(e) => setTaskFormData({ ...taskFormData, targetId: e.target.value })}
                                                        className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl p-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/80 transition-all text-[var(--text-main)] disabled:opacity-50"
                                                        required
                                                        disabled={taskFormData.targetType === 'STAFF' && !['Country Manager', 'Finance Admin'].includes(taskFilters.role) && !taskFilters.branchId}
                                                    >
                                                        <option value="">{`Final ${taskFormData.targetType === 'COUNTRY' ? 'Country' : 'Staff'} Selection`}</option>
                                                        {taskFormData.targetType === 'COUNTRY' && staff
                                                            .filter(s => s.role === 'Country Manager' && s.country)
                                                            .map(s => (
                                                                <option key={s._id || s.staffId} value={s.country}>
                                                                    {s.country} ({s.fullName})
                                                                </option>
                                                            ))
                                                        }

                                                    {taskFormData.targetType === 'STAFF' && taskFilters.role === 'Country Manager' && staff
                                                        .filter(s => s.role === 'Country Manager')
                                                        .map(s => (
                                                            <option key={s.staffId || s._id} value={s.staffId || s._id}>
                                                                {s.country} ({s.fullName})
                                                            </option>
                                                        ))
                                                    }
                                                    {taskFormData.targetType === 'STAFF' && taskFilters.role === 'Finance Admin' && staff
                                                        .filter(s => s.role === 'Finance Admin')
                                                        .map(s => (
                                                            <option key={s.staffId || s._id} value={s.staffId || s._id}>
                                                                {s.fullName} (Finance Admin)
                                                            </option>
                                                        ))
                                                    }
                                                    {taskFormData.targetType === 'STAFF' && taskFilters.role && !['Country Manager', 'Finance Admin'].includes(taskFilters.role) && staff
                                                        .filter(s => {
                                                            if (s.role !== taskFilters.role) return false;
                                                            if (taskFilters.branchId && s.branchId !== taskFilters.branchId) return false;
                                                            if (userRole === 'branchmanager') return s.branchId === user?.branchId;
                                                            return true;
                                                        })
                                                        .map(s => (
                                                            <option key={s.staffId || s._id} value={s.staffId || s._id}>
                                                                {s.fullName}
                                                            </option>
                                                        ))
                                                    }
                                                </select>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                                        <div className="lg:col-span-2 space-y-2">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-dim ml-1">Description</label>
                                            <textarea
                                                value={taskFormData.description}
                                                onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                                                placeholder="Detailed instructions for this task..."
                                                className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl p-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/80 transition-all text-[var(--text-main)] min-h-[100px]"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-xs font-semibold uppercase tracking-wider text-dim ml-1">Due Date</label>
                                                <input
                                                    type="date"
                                                    value={taskFormData.dueDate}
                                                    min={new Date().toISOString().split('T')[0]}
                                                    onChange={(e) => setTaskFormData({ ...taskFormData, dueDate: e.target.value })}
                                                    className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl p-3.5 text-sm font-semibold text-[var(--text-main)] uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/80 transition-all"
                                                    required
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="w-full py-3 px-8 rounded-xl bg-blue-500 text-white font-bold text-xs uppercase tracking-wider transition-all hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-3"
                                            >
                                                {loading ? <Activity className="animate-spin" size={18} /> : <>Deploy Task <ArrowRight size={18} /></>}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                )}

                {/* 2. Assigned Tasks List */}
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <h2 className="text-lg font-bold text-[var(--text-main)]">Operational Pulse</h2>
                            <p className="text-xs font-semibold text-dim uppercase tracking-wider">Active tasks tracking</p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="relative group min-w-[250px]">
                                <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-dim group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Filter tasks..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl pl-12 pr-6 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-[var(--text-main)]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Authority Tasks (Assigned to User) */}
                    <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden">
                        <div
                            className="p-5 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-input)] cursor-pointer hover:bg-[var(--bg-main)] transition-colors"
                            onClick={() => setIsAssignedListOpen(!isAssignedListOpen)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-400">
                                    <Shield size={20} />
                                </div>
                                <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider">Tasks Assigned to You</h3>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="px-3 py-1 rounded-full bg-[var(--bg-main)] text-[10px] font-bold text-dim border border-[var(--border-main)]">
                                    {assignedToMe.length} Tasks
                                </span>
                                <div className="text-dim">
                                    {isAssignedListOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </div>
                        </div>

                        {isAssignedListOpen && (
                            <div className="overflow-x-auto animate-in fade-in slide-in-from-top-2 duration-300">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[var(--bg-input)]">
                                            <th className="p-4 pl-8 text-[11px] font-bold uppercase tracking-wider text-dim border-b border-[var(--border-main)]">Source / Recipient</th>
                                            <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-dim border-b border-[var(--border-main)]">Task Details</th>
                                            <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-dim border-b border-[var(--border-main)]">Timeline</th>
                                            <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-dim border-b border-[var(--border-main)] text-right">Type</th>
                                            <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-dim border-b border-[var(--border-main)] text-center pr-8">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-main)]">
                                        {fetching ? (
                                            <tr><td colSpan={5} className="p-20 text-center animate-pulse text-dim">Fetching tasks...</td></tr>
                                        ) : assignedToMe.length === 0 ? (
                                            <tr><td colSpan={5} className="p-20 text-center text-dim font-semibold uppercase tracking-wider italic opacity-35">No active tasks</td></tr>
                                        ) : (
                                            assignedToMe.map((t) => (
                                                <tr key={t._id} className="hover:bg-[var(--bg-input)] transition-colors group/row">
                                                    <td className="p-4 pl-8">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-[var(--bg-input)] flex items-center justify-center text-dim group-hover/row:text-blue-400 transition-colors">
                                                                {t.targetType === 'COUNTRY' ? <MapPin size={18} /> : t.targetType === 'BRANCH' ? <Building2 size={18} /> : <Users size={18} />}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-[var(--text-main)]">{getTargetName(t)}</p>
                                                                <p className="text-[10px] font-semibold text-dim flex items-center gap-1 mt-0.5 uppercase tracking-wide">
                                                                    <User size={10} className="text-blue-400" /> By {t.assignedBy?.fullName || 'System'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="space-y-1">
                                                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border bg-blue-500/10 border-blue-500/20 text-blue-400">
                                                                {t.title}
                                                            </span>
                                                            <p className="text-xs font-semibold text-dim line-clamp-1">{t.description}</p>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className={`flex flex-col ${new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED' ? 'text-rose-500' : 'text-dim'}`}>
                                                            <span className="text-[11px] font-semibold">{new Date(t.dueDate).toLocaleDateString()}</span>
                                                            <span className="text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                                                                {new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED' ? <AlertCircle size={10} /> : <Clock size={10} />}
                                                                {new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED' ? 'Overdue' : 'Remaining'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <span className="text-[10px] font-bold text-dim uppercase tracking-wider italic opacity-50">Qualitative</span>
                                                    </td>
                                                    <td className="p-4 text-center pr-8">
                                                        {t.status === 'COMPLETED' ? (
                                                            <div className="flex items-center justify-center gap-2 text-lime">
                                                                 <CheckCircle2 size={18} />
                                                                <span className="text-[10px] font-bold uppercase tracking-wider">Completed</span>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleUpdateTaskStatus(t._id!, 'COMPLETED')}
                                                                className="px-4 py-2 rounded-xl transition-all text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500 hover:text-white"
                                                            >
                                                                Complete
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Delegated Tasks (Assigned BY User) - Hidden for staff roles */}
                    {canAssign && (
                    <div className="rounded-2xl border border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden">
                        <div
                            className="p-5 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-input)] cursor-pointer hover:bg-[var(--bg-main)] transition-colors"
                            onClick={() => setIsDelegatedListOpen(!isDelegatedListOpen)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-400">
                                    <TrendingUp size={20} />
                                </div>
                                <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider">Tasks You Delegated</h3>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="px-3 py-1 rounded-full bg-[var(--bg-main)] text-[10px] font-bold text-dim border border-[var(--border-main)]">
                                    {delegatedByMe.length} Tasks
                                </span>
                                <div className="text-dim">
                                    {isDelegatedListOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </div>
                        </div>

                        {isDelegatedListOpen && (
                            <div className="overflow-x-auto animate-in fade-in slide-in-from-top-2 duration-300">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[var(--bg-input)]">
                                            <th className="p-4 pl-8 text-[11px] font-bold uppercase tracking-wider text-dim border-b border-[var(--border-main)]">Recipient</th>
                                            <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-dim border-b border-[var(--border-main)]">Type & Title</th>
                                            <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-dim border-b border-[var(--border-main)]">Status</th>
                                            <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-dim border-b border-[var(--border-main)] text-right">Timeline</th>
                                            <th className="p-4 text-[11px] font-bold uppercase tracking-wider text-dim border-b border-[var(--border-main)] text-center pr-8">Progress</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-main)]">
                                        {fetching ? (
                                            <tr><td colSpan={5} className="p-20 text-center text-dim animate-pulse">Fetching...</td></tr>
                                        ) : delegatedByMe.length === 0 ? (
                                            <tr><td colSpan={5} className="p-20 text-center text-dim font-semibold uppercase tracking-wider italic opacity-35">No tasks delegated</td></tr>
                                        ) : (
                                            delegatedByMe.map((t) => (
                                                <tr key={t._id} className="hover:bg-[var(--bg-input)] transition-colors group/row">
                                                    <td className="p-4 pl-8">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-[var(--bg-input)] flex items-center justify-center text-dim group-hover/row:text-blue-400 transition-colors">
                                                                {t.targetType === 'COUNTRY' ? <MapPin size={18} /> : t.targetType === 'BRANCH' ? <Building2 size={18} /> : <Users size={18} />}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-[var(--text-main)]">{getTargetName(t)}</p>
                                                                <p className="text-[10px] font-semibold text-dim uppercase tracking-wider mt-0.5">{t.targetType}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="space-y-1">
                                                            <span className="text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border bg-blue-500/5 border-blue-500/10 text-blue-400">
                                                                Directive
                                                            </span>
                                                            <p className="text-xs font-semibold text-dim line-clamp-1">{t.title}</p>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'COMPLETED' ? 'bg-lime' : 'bg-orange-400 animate-pulse'}`} />
                                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${t.status === 'COMPLETED' ? 'text-lime' : 'text-orange-400'}`}>
                                                                {t.status || 'PENDING'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <span className="text-xs font-semibold text-dim">{new Date(t.dueDate).toLocaleDateString()}</span>
                                                    </td>
                                                    <td className="p-4 text-center pr-8">
                                                        <div className="w-full bg-[var(--bg-input)] h-1 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full transition-all duration-1000 ${t.status === 'COMPLETED' ? 'w-full bg-lime' : (t.status === 'IN_PROGRESS' ? 'w-1/2 bg-blue-400' : 'w-1/4 bg-orange-400')}`}
                                                            />
                                                        </div>
                                                        <p className="text-[8px] font-bold uppercase tracking-wider mt-2 text-dim">
                                                            {t.status === 'COMPLETED' ? 'Mission Success' : 'Deployment Active'}
                                                        </p>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskManagement;