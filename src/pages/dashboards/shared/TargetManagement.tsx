import { useState, useEffect, useMemo } from 'react';
import {
    Target as TargetIcon, MapPin, Users,
    Plus, User, ArrowRight, TrendingUp, Shield, Activity, Search, Building2, CheckCircle2, Clock, AlertCircle,
    ChevronDown, ChevronUp, FileText, BarChart3
} from 'lucide-react';
import { assignTarget, getTargets, updateTargetStatus } from '../../../services/targetService';
import { delegateTask, getTasks, updateTaskStatus as updateTaskStatusService } from '../../../services/taskService';
import { getAllBranches, type Branch } from '../../../services/branchService';
import { getStaffPerformance } from '../../../services/staffPerformanceService';
import { getUserRole, getUserId, getUser, ROLE_LEVELS } from '../../../utils/auth';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const TargetManagement = () => {
    const userRole = (getUserRole() || '').toLowerCase().replace(/[\s-_]/g, '');
    const userId = getUserId() || '';
    const user = getUser();

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [existingTargets, setExistingTargets] = useState<any[]>([]);
    const [existingTasks, setExistingTasks] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'TASKS' | 'TARGETS'>('TARGETS');

    const [targetFormData, setTargetFormData] = useState({
        targetType: 'BRANCH' as 'COUNTRY' | 'BRANCH' | 'STAFF',
        targetId: '',
        category: 'DRIVER_ACQUISITION' as 'DRIVER_ACQUISITION' | 'RENTAL' | 'VEHICLE_ACQUISITION',
        targetValue: 0,
        period: 'MONTHLY' as 'WEEKLY' | 'MONTHLY' | 'YEARLY',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
        notes: ''
    });

    const [taskFormData, setTaskFormData] = useState({
        title: '',
        description: '',
        targetType: 'BRANCH' as 'COUNTRY' | 'BRANCH' | 'STAFF',
        targetId: '',
        dueDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0],
        notes: ''
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [isTargetAssignmentOpen, setIsTargetAssignmentOpen] = useState(false);
    const [isTaskAssignmentOpen, setIsTaskAssignmentOpen] = useState(true);
    const [isAssignedListOpen, setIsAssignedListOpen] = useState(true);
    const [isDelegatedListOpen, setIsDelegatedListOpen] = useState(true);

    // Hierarchical selection states
    const [taskFilters, setTaskFilters] = useState({
        country: '',
        branchId: '',
        role: ''
    });

    const [targetFilters, setTargetFilters] = useState({
        country: '',
        branchId: '',
        role: ''
    });

    // Staff filtering states
    const [staffFilters, setStaffFilters] = useState({
        role: '',
        branchId: '',
        country: ''
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

                // Only show staff with lower level than current user
                if (staffLevel >= currentUserLevel) return false;
                if (s.role === 'Operation Admin') return false; // Always hide Operation Admin from this list

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

            const tData = await getTargets({});
            setExistingTargets(tData.data || []);

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
        
        setTargetFormData(prev => ({ ...prev, targetType: defaultType as any }));
        setTaskFormData(prev => ({ ...prev, targetType: defaultType as any }));
    }, [userRole]);

    const handleTargetSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await assignTarget(targetFormData as any);
            fetchInitialData();
            setTargetFormData(prev => ({ ...prev, targetValue: 0, notes: '' }));
            setTargetFilters({ country: '', branchId: '' });
            setIsTargetAssignmentOpen(false);
        } catch (error) {
            console.error('Error assigning target:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTaskSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await delegateTask(taskFormData as any);
            fetchInitialData();
            setTaskFormData(prev => ({ ...prev, title: '', description: '', notes: '' }));
            setTaskFilters({ country: '', branchId: '' });
            setIsTaskAssignmentOpen(false);
        } catch (error) {
            console.error('Error delegating task:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateTargetStatus = async (targetId: string, status: string) => {
        try {
            await updateTargetStatus(targetId, status);
            fetchInitialData();
        } catch (error) {
            console.error('Error updating status:', error);
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

    const filteredTargets = useMemo(() => {
        let list = existingTargets;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(t =>
                getTargetName(t).toLowerCase().includes(q) ||
                t.category.toLowerCase().includes(q) ||
                (t.assignedBy?.fullName || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [existingTargets, searchQuery, branches, staff]);

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

    const activeList = activeTab === 'TARGETS' ? filteredTargets : filteredTasks;

    const assignedToMe = activeList.filter(t => {
        if (t.targetType === 'STAFF') return t.targetId === userId || t.targetId === user?.staffId;
        if (t.targetType === 'BRANCH') return t.targetId === user?.branchId;
        if (t.targetType === 'COUNTRY') return t.targetId === user?.country;
        return false;
    });

    const delegatedByMe = activeList.filter(t => (t.assignedBy?._id || t.assignedBy) === userId);

    useEffect(() => {
        if (!fetching) {
            setIsAssignedListOpen(assignedToMe.length > 0);
            setIsDelegatedListOpen(delegatedByMe.length > 0);
        }
    }, [fetching, activeTab]);

    const kpis = useMemo(() => {
        const source = activeTab === 'TARGETS' ? existingTargets : existingTasks;
        const total = source.length;
        const completed = source.filter(t => t.status === 'COMPLETED').length;
        const pending = total - completed;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { total, completed, pending, rate };
    }, [existingTargets, existingTasks, activeTab]);

    return (
        <div className="flex-1 w-full overflow-y-auto h-screen custom-scrollbar" style={{ backgroundColor: 'var(--bg-main)' }}>
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Target Management', active: true }]} />

            
            {/* Compact Header & Controls */}
            <div className="p-6 md:p-8 max-w-[1600px] mx-auto pb-0 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                    <div>
                        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                            <TargetIcon size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                            Target Management
                        </h1>
                        <p className="text-xs font-medium text-dim mt-0.5">Strategic benchmarking and workforce performance objectives.</p>
                    </div>

                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-main)]">
                        <div className="text-right">
                            <p className="text-[9px] font-black uppercase tracking-widest text-dim">Active</p>
                            <p className="text-sm font-black text-[var(--text-main)] leading-none">{existingTargets.length}</p>
                        </div>
                        <div className="w-px h-6 bg-[var(--border-main)] mx-2" />
                        <div className="text-right">
                            <p className="text-[9px] font-black uppercase tracking-widest text-dim">Volume</p>
                            <p className="text-sm font-black text-[var(--text-main)] leading-none">{existingTargets.reduce((acc, t) => acc + t.targetValue, 0)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-8 max-w-[1600px] mx-auto pb-24 space-y-8">

                {/* 1. Assignment Section */}
                {canAssign && (
                    <div className="space-y-6">
                        {/* Task Assignment Box */}
                        <div className="rounded-[2.5rem] border border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden relative group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
                            <div
                                className="p-8 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-input)] cursor-pointer hover:bg-[var(--bg-main)] transition-colors"
                                onClick={() => setIsTaskAssignmentOpen(!isTaskAssignmentOpen)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-[var(--text-main)]">Deploy New Task</h2>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-dim">Assign qualitative directives to countries, branches, or staff</p>
                                    </div>
                                </div>
                                <div className="text-dim">
                                    {isTaskAssignmentOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                </div>
                            </div>

                            {isTaskAssignmentOpen && (
                                <form onSubmit={handleTaskSubmit} className="p-8 transition-all duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-dim ml-2">Task Title</label>
                                            <input
                                                type="text"
                                                value={taskFormData.title}
                                                onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                                                placeholder="Enter task title..."
                                                className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-[var(--text-main)]"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-dim ml-2">Scope</label>
                                            <select
                                                value={taskFormData.targetType}
                                                onChange={(e) => {
                                                    const newType = e.target.value as any;
                                                    setTaskFormData({ ...taskFormData, targetType: newType, targetId: '' });
                                                    setTaskFilters({ country: '', branchId: '' });
                                                }}
                                                className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-[var(--text-main)]"
                                            >
                                                {canAssignCountry && <option value="COUNTRY">National Country</option>}
                                                {canAssignBranch && <option value="BRANCH">Regional Branch</option>}
                                                {canAssignStaff && <option value="STAFF">Individual Staff</option>}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-dim ml-2">
                                                {taskFormData.targetType === 'COUNTRY' ? 'Select Country' : 
                                                 taskFormData.targetType === 'BRANCH' ? 'Select Branch' : 'Select Role & Staff'}
                                            </label>
                                            
                                            <div className="flex flex-col gap-3">
                                                {/* Role Selection (Only for Staff Scope) */}
                                                {taskFormData.targetType === 'STAFF' && (
                                                    <select
                                                        value={taskFilters.role}
                                                        onChange={(e) => {
                                                            setTaskFilters({ ...taskFilters, role: e.target.value, branchId: '', country: '' });
                                                            setTaskFormData({ ...taskFormData, targetId: '' });
                                                        }}
                                                        className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-[var(--text-main)]"
                                                        required
                                                    >
                                                        <option value="">1. Select Role Type</option>
                                                        {availableRoles.map(r => (
                                                            <option key={r} value={r}>{r}</option>
                                                        ))}
                                                    </select>
                                                )}

                                                {/* Country Selection (Admin only, only for BRANCH scope now) */}
                                                {(taskFormData.targetType === 'BRANCH') && canAssignCountry && (
                                                    <select
                                                        value={taskFilters.country}
                                                        onChange={(e) => {
                                                            setTaskFilters({ ...taskFilters, country: e.target.value, branchId: '' });
                                                            setTaskFormData({ ...taskFormData, targetId: '' });
                                                        }}
                                                        className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-[var(--text-main)]"
                                                        required
                                                    >
                                                        <option value="">2. Select Country</option>
                                                        {Array.from(new Set(branches.map(b => b.country))).filter(Boolean).map(c => (
                                                            <option key={c} value={c}>{c}</option>
                                                        ))}
                                                    </select>
                                                )}

                                                {/* Branch Selection (When Branch scope or Staff-level scope) */}
                                                {(taskFormData.targetType === 'BRANCH' || (taskFormData.targetType === 'STAFF' && taskFilters.role && !['Country Manager', 'Finance Admin'].includes(taskFilters.role))) && canAssignBranch && (
                                                    <select
                                                        value={taskFilters.branchId}
                                                        onChange={(e) => {
                                                            setTaskFilters({ ...taskFilters, branchId: e.target.value });
                                                            setTaskFormData({ ...taskFormData, targetId: '' });
                                                        }}
                                                        className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-[var(--text-main)] disabled:opacity-50"
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

                                                {/* Final Selection */}
                                                <select
                                                    value={taskFormData.targetId}
                                                    onChange={(e) => setTaskFormData({ ...taskFormData, targetId: e.target.value })}
                                                    className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-[var(--text-main)] disabled:opacity-50"
                                                    required
                                                    disabled={(taskFormData.targetType === 'BRANCH' || (taskFormData.targetType === 'STAFF' && !['Country Manager', 'Finance Admin'].includes(taskFilters.role))) && !taskFilters.branchId}
                                                >
                                                    <option value="">{`Final ${taskFormData.targetType === 'COUNTRY' ? 'Country' : taskFormData.targetType === 'BRANCH' ? 'Branch' : 'Staff'} Selection`}</option>
                                                    {taskFormData.targetType === 'COUNTRY' && Array.from(new Set(branches.map(b => b.country))).filter(Boolean).map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                    
                                                    {/* Branch selection for BRANCH scope */}
                                                    {taskFormData.targetType === 'BRANCH' && taskFilters.branchId && (
                                                        <option value={taskFilters.branchId}>{branches.find(b => b._id === taskFilters.branchId)?.name}</option>
                                                    )}

                                                    {/* Staff selection logic */}
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
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                                        <div className="lg:col-span-2 space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-dim ml-2">Description</label>
                                            <textarea
                                                value={taskFormData.description}
                                                onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                                                placeholder="Detailed instructions for this task..."
                                                className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all text-[var(--text-main)] min-h-[100px]"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-dim ml-2">Due Date</label>
                                                <input
                                                    type="date"
                                                    value={taskFormData.dueDate}
                                                    onChange={(e) => setTaskFormData({ ...taskFormData, dueDate: e.target.value })}
                                                    className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-4 text-sm font-bold text-[var(--text-main)] uppercase"
                                                    required
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="w-full py-4 rounded-2xl bg-blue-500 text-white font-black text-xs uppercase tracking-widest transition-all hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] active:scale-[0.98] flex items-center justify-center gap-3"
                                            >
                                                {loading ? <Activity className="animate-spin" size={18} /> : <>Deploy Task <ArrowRight size={18} /></>}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>

                        {/* Target Assignment Box */}
                        <div className="rounded-[2.5rem] border border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden relative group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-lime/30 to-transparent" />
                            <div
                                className="p-8 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-input)] cursor-pointer hover:bg-[var(--bg-main)] transition-colors"
                                onClick={() => setIsTargetAssignmentOpen(!isTargetAssignmentOpen)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center text-lime">
                                        <TrendingUp size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-[var(--text-main)]">Deploy New Target</h2>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-dim">Assign quantitative objectives to countries, branches, or staff</p>
                                    </div>
                                </div>
                                <div className="text-dim">
                                    {isTargetAssignmentOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                </div>
                            </div>

                            {isTargetAssignmentOpen && (
                                <form onSubmit={handleTargetSubmit} className="p-8 transition-all duration-300">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-dim ml-2">Scope</label>
                                            <select
                                                value={targetFormData.targetType}
                                                onChange={(e) => {
                                                    const newType = e.target.value as any;
                                                    setTargetFormData({ ...targetFormData, targetType: newType, targetId: '' });
                                                    setTargetFilters({ country: '', branchId: '' });
                                                }}
                                                className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-lime/30 transition-all text-[var(--text-main)]"
                                            >
                                                {canAssignCountry && <option value="COUNTRY">National Country</option>}
                                                {canAssignBranch && <option value="BRANCH">Regional Branch</option>}
                                                {canAssignStaff && <option value="STAFF">Individual Staff</option>}
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-dim ml-2">
                                                {targetFormData.targetType === 'COUNTRY' ? 'Select Country' : 
                                                 targetFormData.targetType === 'BRANCH' ? 'Select Branch' : 'Select Role & Staff'}
                                            </label>
                                            
                                            <div className="flex flex-col gap-3">
                                                {/* Role Selection (Only for Staff Scope) */}
                                                {targetFormData.targetType === 'STAFF' && (
                                                    <select
                                                        value={targetFilters.role}
                                                        onChange={(e) => {
                                                            setTargetFilters({ ...targetFilters, role: e.target.value, branchId: '', country: '' });
                                                            setTargetFormData({ ...targetFormData, targetId: '' });
                                                        }}
                                                        className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-lime/30 transition-all text-[var(--text-main)]"
                                                        required
                                                    >
                                                        <option value="">1. Select Role Type</option>
                                                        {availableRoles.map(r => (
                                                            <option key={r} value={r}>{r}</option>
                                                        ))}
                                                    </select>
                                                )}

                                                {/* Country Selection (Admin only, only for BRANCH scope now) */}
                                                {(targetFormData.targetType === 'BRANCH') && canAssignCountry && (
                                                    <select
                                                        value={targetFilters.country}
                                                        onChange={(e) => {
                                                            setTargetFilters({ ...targetFilters, country: e.target.value, branchId: '' });
                                                            setTargetFormData({ ...targetFormData, targetId: '' });
                                                        }}
                                                        className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-lime/30 transition-all text-[var(--text-main)]"
                                                        required
                                                    >
                                                        <option value="">2. Select Country</option>
                                                        {Array.from(new Set(branches.map(b => b.country))).filter(Boolean).map(c => (
                                                            <option key={c} value={c}>{c}</option>
                                                        ))}
                                                    </select>
                                                )}

                                                {/* Branch Selection (When Branch scope or Staff-level scope) */}
                                                {(targetFormData.targetType === 'BRANCH' || (targetFormData.targetType === 'STAFF' && targetFilters.role && !['Country Manager', 'Finance Admin'].includes(targetFilters.role))) && canAssignBranch && (
                                                    <select
                                                        value={targetFilters.branchId}
                                                        onChange={(e) => {
                                                            setTargetFilters({ ...targetFilters, branchId: e.target.value });
                                                            setTargetFormData({ ...targetFormData, targetId: '' });
                                                        }}
                                                        className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-lime/30 transition-all text-[var(--text-main)] disabled:opacity-50"
                                                        required={targetFormData.targetType === 'BRANCH' || (targetFormData.targetType === 'STAFF' && !['Country Manager', 'Finance Admin'].includes(targetFilters.role))}
                                                        disabled={targetFormData.targetType === 'BRANCH' && canAssignCountry && !targetFilters.country}
                                                    >
                                                        <option value="">{targetFormData.targetType === 'BRANCH' ? '3. Select Target Branch' : '2. Select Branch'}</option>
                                                        {branches
                                                            .filter(b => {
                                                                if (targetFormData.targetType === 'BRANCH' && canAssignCountry && targetFilters.country && b.country !== targetFilters.country) return false;
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

                                                {/* Final Selection */}
                                                <select
                                                    value={targetFormData.targetId}
                                                    onChange={(e) => setTargetFormData({ ...targetFormData, targetId: e.target.value })}
                                                    className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-lime/30 transition-all text-[var(--text-main)] disabled:opacity-50"
                                                    required
                                                    disabled={(targetFormData.targetType === 'BRANCH' || (targetFormData.targetType === 'STAFF' && !['Country Manager', 'Finance Admin'].includes(targetFilters.role))) && !targetFilters.branchId}
                                                >
                                                    <option value="">{`Final ${targetFormData.targetType === 'COUNTRY' ? 'Country' : targetFormData.targetType === 'BRANCH' ? 'Branch' : 'Staff'} Selection`}</option>
                                                    {targetFormData.targetType === 'COUNTRY' && Array.from(new Set(branches.map(b => b.country))).filter(Boolean).map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                    
                                                    {/* Branch selection for BRANCH scope */}
                                                    {targetFormData.targetType === 'BRANCH' && targetFilters.branchId && (
                                                        <option value={targetFilters.branchId}>{branches.find(b => b._id === targetFilters.branchId)?.name}</option>
                                                    )}

                                                    {/* Staff selection logic */}
                                                    {targetFormData.targetType === 'STAFF' && targetFilters.role === 'Country Manager' && staff
                                                        .filter(s => s.role === 'Country Manager')
                                                        .map(s => (
                                                            <option key={s.staffId || s._id} value={s.staffId || s._id}>
                                                                {s.country} ({s.fullName})
                                                            </option>
                                                        ))
                                                    }
                                                    {targetFormData.targetType === 'STAFF' && targetFilters.role === 'Finance Admin' && staff
                                                        .filter(s => s.role === 'Finance Admin')
                                                        .map(s => (
                                                            <option key={s.staffId || s._id} value={s.staffId || s._id}>
                                                                {s.fullName} (Finance Admin)
                                                            </option>
                                                        ))
                                                    }
                                                    {targetFormData.targetType === 'STAFF' && targetFilters.role && !['Country Manager', 'Finance Admin'].includes(targetFilters.role) && staff
                                                        .filter(s => {
                                                            if (s.role !== targetFilters.role) return false;
                                                            if (targetFilters.branchId && s.branchId !== targetFilters.branchId) return false;
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
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-dim ml-2">Category</label>
                                            <select
                                                value={targetFormData.category}
                                                onChange={(e) => setTargetFormData({ ...targetFormData, category: e.target.value as any })}
                                                className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-lime/30 transition-all text-[var(--text-main)]"
                                            >
                                                <option value="DRIVER_ACQUISITION">Driver Acquisition</option>
                                                <option value="RENTAL">Rental (New Leases)</option>
                                                <option value="VEHICLE_ACQUISITION">Vehicle Acquisition</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-dim ml-2">Target Value</label>
                                            <input
                                                type="number"
                                                value={targetFormData.targetValue}
                                                onChange={(e) => setTargetFormData({ ...targetFormData, targetValue: parseInt(e.target.value) })}
                                                className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-4 text-xl font-black focus:outline-none focus:ring-2 focus:ring-lime/30 transition-all text-lime"
                                                min="0"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                                        <div className="lg:col-span-2 space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-dim ml-2">Target Note / Description</label>
                                            <input
                                                type="text"
                                                value={targetFormData.notes}
                                                onChange={(e) => setTargetFormData({ ...targetFormData, notes: e.target.value })}
                                                placeholder="Specific instructions for this objective..."
                                                className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-lime/30 transition-all text-[var(--text-main)]"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-dim ml-2">Due Date</label>
                                            <input
                                                type="date"
                                                value={targetFormData.endDate}
                                                onChange={(e) => setTargetFormData({ ...targetFormData, endDate: e.target.value })}
                                                className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-4 text-sm font-bold text-[var(--text-main)] uppercase"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-8 flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="px-10 py-4 rounded-2xl bg-lime text-black font-black text-xs uppercase tracking-widest transition-all hover:shadow-[0_0_30px_rgba(200,230,0,0.2)] active:scale-[0.98] flex items-center gap-3"
                                        >
                                            {loading ? <Activity className="animate-spin" size={18} /> : <>Deploy Target <ArrowRight size={18} /></>}
                                        </button>
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
                            <h2 className="text-2xl font-black text-[var(--text-main)]">Operational Pulse</h2>
                            <p className="text-xs font-bold text-dim uppercase tracking-widest">Active directives and objectives tracking</p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            {/* Module Toggle */}
                            <div className="flex bg-[var(--bg-card)] p-1.5 rounded-2xl border border-[var(--border-main)] shadow-inner">
                                <button
                                    onClick={() => setActiveTab('TASKS')}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'TASKS' ? 'bg-blue-500 text-white shadow-lg' : 'text-dim hover:text-[var(--text-main)]'}`}
                                >
                                    <FileText size={14} /> Tasks
                                </button>
                                <button
                                    onClick={() => setActiveTab('TARGETS')}
                                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'TARGETS' ? 'bg-lime text-black shadow-lg' : 'text-dim hover:text-[var(--text-main)]'}`}
                                >
                                    <BarChart3 size={14} /> Targets
                                </button>
                            </div>

                            <div className="relative group min-w-[250px]">
                                <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-dim group-focus-within:text-lime transition-colors" />
                                <input
                                    type="text"
                                    placeholder={`Filter ${activeTab.toLowerCase()}...`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl pl-12 pr-6 py-3 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-lime/30 transition-all text-[var(--text-main)]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Authority Tasks (Assigned to User) */}
                    <div className="rounded-[2.5rem] border border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden">
                        <div
                            className="p-6 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-input)] cursor-pointer hover:bg-[var(--bg-main)] transition-colors"
                            onClick={() => setIsAssignedListOpen(!isAssignedListOpen)}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === 'TASKS' ? 'bg-blue-500/10 text-blue-400' : 'bg-lime/10 text-lime'}`}>
                                    <Shield size={20} />
                                </div>
                                <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">Directives Assigned to You</h3>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="px-3 py-1 rounded-full bg-[var(--bg-main)] text-[10px] font-black text-dim border border-[var(--border-main)]">
                                    {assignedToMe.length} {activeTab === 'TASKS' ? 'Tasks' : 'Targets'}
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
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] pl-8">Source / Recipient</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)]">Objective Details</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border(--border-main)]">Timeline</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] text-right">Magnitude</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] text-center pr-8">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-main)]">
                                        {fetching ? (
                                            <tr><td colSpan={5} className="p-20 text-center animate-pulse text-dim">Fetching directives...</td></tr>
                                        ) : assignedToMe.length === 0 ? (
                                            <tr><td colSpan={5} className="p-20 text-center text-dim font-black uppercase tracking-widest italic opacity-30">No active {activeTab.toLowerCase()}</td></tr>
                                        ) : (
                                            assignedToMe.map((t) => (
                                                <tr key={t._id} className="hover:bg-[var(--bg-input)] transition-colors group/row">
                                                    <td className="p-5 pl-8">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-xl bg-[var(--bg-input)] flex items-center justify-center text-dim group-hover/row:${activeTab === 'TASKS' ? 'text-blue-400' : 'text-lime'} transition-colors`}>
                                                                {t.targetType === 'COUNTRY' ? <MapPin size={18} /> : t.targetType === 'BRANCH' ? <Building2 size={18} /> : <Users size={18} />}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-[var(--text-main)]">{getTargetName(t)}</p>
                                                                <p className="text-[9px] font-bold text-dim flex items-center gap-1 mt-0.5 uppercase tracking-tighter">
                                                                    <User size={10} className={activeTab === 'TASKS' ? 'text-blue-400' : 'text-lime'} /> By {t.assignedBy?.fullName || 'System'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="space-y-1">
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${activeTab === 'TASKS' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-lime/10 border-lime/20 text-lime'}`}>
                                                                {activeTab === 'TASKS' ? t.title : t.category.replace('_', ' ')}
                                                            </span>
                                                            <p className="text-xs font-medium text-dim line-clamp-1">{activeTab === 'TASKS' ? t.description : (t.notes || 'No specific instructions')}</p>
                                                        </div>
                                                    </td>
                                                    <td className="p-5">
                                                        <div className={`flex flex-col ${new Date(activeTab === 'TASKS' ? t.dueDate : t.endDate) < new Date() && t.status !== 'COMPLETED' ? 'text-rose-500' : 'text-dim'}`}>
                                                            <span className="text-[11px] font-black">{new Date(activeTab === 'TASKS' ? t.dueDate : t.endDate).toLocaleDateString()}</span>
                                                            <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                                                                {new Date(activeTab === 'TASKS' ? t.dueDate : t.endDate) < new Date() && t.status !== 'COMPLETED' ? <AlertCircle size={10} /> : <Clock size={10} />}
                                                                {new Date(activeTab === 'TASKS' ? t.dueDate : t.endDate) < new Date() && t.status !== 'COMPLETED' ? 'Overdue' : 'Remaining'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-5 text-right">
                                                        {activeTab === 'TARGETS' ? (
                                                            <p className="text-2xl font-black text-lime">{t.targetValue}</p>
                                                        ) : (
                                                            <span className="text-[10px] font-black text-dim uppercase tracking-widest italic opacity-50">Qualitative</span>
                                                        )}
                                                    </td>
                                                    <td className="p-5 text-center pr-8">
                                                        {t.status === 'COMPLETED' ? (
                                                            <div className="flex items-center justify-center gap-2 text-lime">
                                                                <CheckCircle2 size={18} />
                                                                <span className="text-[10px] font-black uppercase tracking-widest">Completed</span>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => activeTab === 'TASKS' ? handleUpdateTaskStatus(t._id!, 'COMPLETED') : handleUpdateTargetStatus(t._id!, 'COMPLETED')}
                                                                className={`px-4 py-2 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${activeTab === 'TASKS' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500 hover:text-white' : 'bg-lime/10 text-lime border border-lime/20 hover:bg-lime hover:text-black'}`}
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
                    <div className="rounded-[2.5rem] border border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden">
                        <div
                            className="p-6 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-input)] cursor-pointer hover:bg-[var(--bg-main)] transition-colors"
                            onClick={() => setIsDelegatedListOpen(!isDelegatedListOpen)}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeTab === 'TASKS' ? 'bg-blue-500/10 text-blue-400' : 'bg-lime/10 text-lime'}`}>
                                    <TrendingUp size={20} />
                                </div>
                                <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">Objectives You Delegated</h3>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="px-3 py-1 rounded-full bg-[var(--bg-main)] text-[10px] font-black text-dim border border-[var(--border-main)]">
                                    {delegatedByMe.length} {activeTab === 'TASKS' ? 'Tasks' : 'Targets'}
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
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] pl-8">Recipient</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)]">Type & Title</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)]">Status</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] text-right">{activeTab === 'TARGETS' ? 'Magnitude' : 'Timeline'}</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] text-center pr-8">Progress</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-main)]">
                                        {fetching ? (
                                            <tr><td colSpan={5} className="p-20 text-center text-dim">Fetching...</td></tr>
                                        ) : delegatedByMe.length === 0 ? (
                                            <tr><td colSpan={5} className="p-20 text-center text-dim font-black uppercase tracking-widest italic opacity-30">No objectives delegated</td></tr>
                                        ) : (
                                            delegatedByMe.map((t) => (
                                                <tr key={t._id} className="hover:bg-[var(--bg-input)] transition-colors group/row">
                                                    <td className="p-5 pl-8">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-xl bg-[var(--bg-input)] flex items-center justify-center text-dim group-hover/row:${activeTab === 'TASKS' ? 'text-blue-400' : 'text-lime'} transition-colors`}>
                                                                {t.targetType === 'COUNTRY' ? <MapPin size={18} /> : t.targetType === 'BRANCH' ? <Building2 size={18} /> : <Users size={18} />}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-[var(--text-main)]">{getTargetName(t)}</p>
                                                                <p className="text-[9px] font-black text-dim uppercase tracking-widest mt-0.5">{t.targetType}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="space-y-1">
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${activeTab === 'TASKS' ? 'bg-blue-500/5 border-blue-500/10 text-blue-400' : 'bg-lime/5 border-lime/10 text-lime'}`}>
                                                                {activeTab === 'TASKS' ? 'Directive' : t.category.replace('_', ' ')}
                                                            </span>
                                                            <p className="text-xs font-bold text-dim line-clamp-1">{activeTab === 'TASKS' ? t.title : (t.notes || 'Standard Objective')}</p>
                                                        </div>
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'COMPLETED' ? 'bg-lime' : 'bg-orange-400 animate-pulse'}`} />
                                                            <span className={`text-[10px] font-black uppercase tracking-widest ${t.status === 'COMPLETED' ? 'text-lime' : 'text-orange-400'}`}>
                                                                {t.status || 'PENDING'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-5 text-right">
                                                        {activeTab === 'TARGETS' ? (
                                                            <p className="text-2xl font-black text-lime font-plus-jakarta">{t.targetValue}</p>
                                                        ) : (
                                                            <p className="text-xs font-black text-dim">{new Date(t.dueDate).toLocaleDateString()}</p>
                                                        )}
                                                    </td>
                                                    <td className="p-5 text-center pr-8">
                                                        <div className="w-full bg-[var(--bg-input)] h-1 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full transition-all duration-1000 ${t.status === 'COMPLETED' ? 'w-full bg-lime' : (t.status === 'IN_PROGRESS' ? 'w-1/2 bg-blue-400' : 'w-1/4 bg-orange-400')}`}
                                                            />
                                                        </div>
                                                        <p className="text-[8px] font-black uppercase tracking-widest mt-2 text-dim">
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

export default TargetManagement;