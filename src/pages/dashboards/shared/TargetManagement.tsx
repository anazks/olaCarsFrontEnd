import { useState, useEffect } from 'react';
import { Target as TargetIcon, MapPin, Users, Briefcase, Calendar, CheckCircle, Plus, Info, User } from 'lucide-react';
import { assignTarget, getTargets } from '../../../services/targetService';
import { getAllBranches, type Branch } from '../../../services/branchService';
import { getStaffPerformance } from '../../../services/staffPerformanceService';
import { getUserRole, getUserId, getUser } from '../../../utils/auth';

const TargetManagement = () => {
    const userRole = getUserRole() || '';
    const userId = getUserId() || '';
    const user = getUser();

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [existingTargets, setExistingTargets] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        targetType: 'BRANCH' as 'COUNTRY' | 'BRANCH' | 'STAFF',
        targetId: '',
        category: 'DRIVER_ACQUISITION' as 'DRIVER_ACQUISITION' | 'RENTAL' | 'VEHICLE_ACQUISITION',
        targetValue: 0,
        period: 'MONTHLY' as 'WEEKLY' | 'MONTHLY' | 'YEARLY',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
        notes: ''
    });

    const [branchFilter, setBranchFilter] = useState('');

    useEffect(() => {
        fetchInitialData();
        
        // Default target type based on role
        if (userRole === 'branchmanager') {
            setFormData(prev => ({ 
                ...prev, 
                targetType: 'STAFF',
                targetId: '' 
            }));
        } else if (userRole === 'countrymanager') {
            setFormData(prev => ({ 
                ...prev, 
                targetType: 'BRANCH',
                targetId: '' 
            }));
        }
    }, [userRole]);

    const fetchInitialData = async () => {
        setFetching(true);
        try {
            const bData = await getAllBranches({ limit: 100 });
            setBranches(bData.data || []);

            const sData = await getStaffPerformance({ type: 'all' });
            let allStaff = [
                ...(sData.data.financeStaff || []),
                ...(sData.data.operationStaff || []),
                ...(sData.data.branchManagers || []),
                ...(sData.data.countryManagers || []),
                ...(sData.data.globalAdmins || [])
            ];
            
            // Filter staff for Branch Manager and Country Manager
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

            const tData = await getTargets({});
            setExistingTargets(tData.data || []);
        } catch (error) {
            console.error('Error fetching initial data:', error);
        } finally {
            setFetching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await assignTarget(formData as any);
            alert('Target assigned successfully!');
            fetchInitialData(); // Refresh list
        } catch (error) {
            console.error('Error assigning target:', error);
            alert('Failed to assign target.');
        } finally {
            setLoading(false);
        }
    };

    const canAssignCountry = ['admin', 'superadmin'].includes(userRole.toLowerCase().replace(' ', ''));
    const canAssignBranch = ['admin', 'superadmin', 'countrymanager', 'branchmanager'].includes(userRole.toLowerCase().replace(' ', ''));
    const canAssignStaff = true; // Most managers can assign to staff

    const getTargetName = (t: any) => {
        if (t.targetType === 'COUNTRY') return `Country: ${t.targetId}`;
        if (t.targetType === 'BRANCH') {
            const branch = branches.find(b => b._id === t.targetId);
            return branch ? `Branch: ${branch.name}` : `Branch: ${t.targetId}`;
        }
        if (t.targetType === 'STAFF') {
            const member = staff.find(s => s.staffId === t.targetId);
            return member ? `Staff: ${member.fullName}` : `Staff: ${t.targetId}`;
        }
        return t.targetId;
    };

    return (
        <div className="flex-1 p-4 md:p-8 overflow-auto" style={{ backgroundColor: 'var(--bg-lighter)' }}>
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 rounded-2xl bg-[var(--brand-lime)]/10 text-[var(--brand-lime)]">
                        <TargetIcon size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold font-plus-jakarta" style={{ color: 'var(--text-main)' }}>Target Management</h1>
                        <p style={{ color: 'var(--text-dim)' }}>Set operational benchmarks and growth targets</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Assignment Form */}
                    <div className="lg:col-span-1">
                        <div className="p-6 rounded-3xl border shadow-sm sticky top-8" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}>
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <Plus size={20} className="text-[var(--brand-lime)]" />
                                New Assignment
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {canAssignCountry || canAssignBranch || canAssignStaff ? (
                                    <div>
                                        <label className="block text-xs font-bold uppercase mb-2 opacity-60">Target Type</label>
                                        <select
                                            value={formData.targetType}
                                            onChange={(e) => {
                                                const newType = e.target.value as any;
                                                let newId = '';
                                                if (newType === 'BRANCH' && userRole === 'branchmanager' && user?.branchId) {
                                                    newId = user.branchId;
                                                }
                                                setFormData({ ...formData, targetType: newType, targetId: newId });
                                            }}
                                            className="w-full p-3 rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--brand-lime)]"
                                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        >
                                            {canAssignCountry && <option value="COUNTRY">Country</option>}
                                            {canAssignBranch && <option value="BRANCH">Branch</option>}
                                            {canAssignStaff && <option value="STAFF">Individual Staff</option>}
                                        </select>
                                    </div>
                                ) : null}

                                {formData.targetType === 'STAFF' && !user?.branchId && (
                                    <div>
                                        <label className="block text-xs font-bold uppercase mb-2 opacity-60">Filter by Branch</label>
                                        <select
                                            value={branchFilter}
                                            onChange={(e) => setBranchFilter(e.target.value)}
                                            className="w-full p-3 rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--brand-lime)]"
                                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        >
                                            <option value="">All Branches</option>
                                            {branches.map(b => (
                                                <option key={b._id} value={b._id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {!(formData.targetType === 'BRANCH' && userRole === 'branchmanager') && (
                                    <div>
                                        <label className="block text-xs font-bold uppercase mb-2 opacity-60">
                                            Select {formData.targetType.charAt(0) + formData.targetType.slice(1).toLowerCase()}
                                        </label>
                                        <select
                                            value={formData.targetId}
                                            onChange={(e) => setFormData({ ...formData, targetId: e.target.value })}
                                            className="w-full p-3 rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--brand-lime)]"
                                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                            required
                                        >
                                            <option value="">Select Option</option>
                                            {formData.targetType === 'COUNTRY' && staff
                                                .filter(s => s.metrics && 'totalCountryBranches' in s.metrics) // Identify country managers
                                                .map(s => (
                                                    <option key={s.staffId} value={s.country}>{s.fullName} ({s.country})</option>
                                                ))
                                            }
                                            {formData.targetType === 'BRANCH' && branches
                                                .filter(b => {
                                                    if (userRole === 'countrymanager') {
                                                        // Handle both populated and unpopulated countryManager
                                                        const managerId = typeof b.countryManager === 'object' ? b.countryManager?._id : b.countryManager;
                                                        return managerId === userId;
                                                    }
                                                    return true;
                                                })
                                                .map(b => (
                                                    <option key={b._id} value={b._id}>{b.name}</option>
                                                ))
                                            }
                                            {formData.targetType === 'STAFF' && staff
                                                .filter(s => {
                                                    const sBranchId = ('branchId' in s) ? s.branchId : null;
                                                    if (user?.branchId) return sBranchId === user.branchId;
                                                    if (branchFilter) return sBranchId === branchFilter;
                                                    return true;
                                                })
                                                .map(s => (
                                                    <option key={s.staffId} value={s.staffId}>{s.fullName} ({s._listType || s.role || 'Staff'})</option>
                                                ))
                                            }
                                        </select>
                                    </div>
                                )}
                                
                                {formData.targetType === 'BRANCH' && userRole === 'branchmanager' && (
                                    <div className="p-3 rounded-xl border bg-white/5 opacity-80" style={{ borderColor: 'var(--border-main)' }}>
                                        <p className="text-xs font-bold uppercase opacity-60 mb-1">Target Assigned To</p>
                                        <p className="font-bold flex items-center gap-2">
                                            <MapPin size={14} className="text-[var(--brand-lime)]" />
                                            Your Branch (Auto-assigned)
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold uppercase mb-2 opacity-60">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                        className="w-full p-3 rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--brand-lime)]"
                                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <option value="DRIVER_ACQUISITION">Driver Acquisition</option>
                                        <option value="RENTAL">Rental (New Leases)</option>
                                        <option value="VEHICLE_ACQUISITION">Vehicle Acquisition</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase mb-2 opacity-60">Target Value</label>
                                    <input
                                        type="number"
                                        value={formData.targetValue}
                                        onChange={(e) => setFormData({ ...formData, targetValue: parseInt(e.target.value) })}
                                        className="w-full p-3 rounded-xl border bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--brand-lime)]"
                                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                        min="0"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase mb-2 opacity-60">Start Date</label>
                                        <input
                                            type="date"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            className="w-full p-3 rounded-xl border bg-transparent text-sm"
                                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase mb-2 opacity-60">End Date</label>
                                        <input
                                            type="date"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            className="w-full p-3 rounded-xl border bg-transparent text-sm"
                                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] mt-4"
                                    style={{ backgroundColor: 'var(--brand-lime)', color: '#000' }}
                                >
                                    {loading ? 'Processing...' : 'Assign Target'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Existing Targets List */}
                    <div className="lg:col-span-2">
                        <div className="p-6 rounded-3xl border shadow-sm" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <CheckCircle size={20} className="text-blue-500" />
                                    {userRole === 'admin' ? 'Active Targets' : 'Targets from Higher Authority'}
                                </h2>
                                <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                    {userRole === 'admin' 
                                        ? existingTargets.length 
                                        : existingTargets.filter(t => (t.assignedBy?._id || t.assignedBy) !== userId).length
                                    } Assigned
                                </span>
                            </div>

                            <div className="space-y-4">
                                {fetching ? (
                                    [1, 2, 3].map(i => (
                                        <div key={i} className="p-5 rounded-2xl border animate-pulse" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-lighter)' }}>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-white/5" />
                                                    <div className="space-y-2">
                                                        <div className="h-4 w-32 bg-white/5 rounded" />
                                                        <div className="h-3 w-24 bg-white/5 rounded" />
                                                    </div>
                                                </div>
                                                <div className="h-8 w-16 bg-white/5 rounded" />
                                            </div>
                                        </div>
                                    ))
                                ) : ((userRole === 'admin' ? existingTargets : existingTargets.filter(t => (t.assignedBy?._id || t.assignedBy) !== userId)).length === 0) ? (
                                    <div className="text-center py-12 opacity-50 border border-dashed rounded-2xl" style={{ borderColor: 'var(--border-main)' }}>
                                        No targets received from authority yet
                                    </div>
                                ) : (
                                    (userRole === 'admin' ? existingTargets : existingTargets.filter(t => (t.assignedBy?._id || t.assignedBy) !== userId)).map((t) => (
                                        <div key={t._id} className="p-5 rounded-2xl border flex items-center justify-between group transition-all hover:border-[var(--brand-lime)]/50" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-lighter)' }}>
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-black/5 dark:bg-white/5 border border-white/5">
                                                    {t.targetType === 'COUNTRY' ? <MapPin size={20} /> : t.targetType === 'BRANCH' ? <Briefcase size={20} /> : <Users size={20} />}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold flex items-center gap-2">
                                                        {getTargetName(t)}
                                                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white/5 opacity-60">
                                                            {t.category.replace('_', ' ')}
                                                        </span>
                                                    </h3>
                                                    <p className="text-xs opacity-60 flex items-center gap-2 mt-1">
                                                        <Calendar size={12} /> {new Date(t.startDate).toLocaleDateString()} - {new Date(t.endDate).toLocaleDateString()}
                                                    </p>
                                                    <p className="text-[10px] opacity-40 mt-1 flex items-center gap-1 italic">
                                                        <User size={10} /> Assigned by: {t.assignedBy?.fullName || 'Unknown'} ({t.assignedByRole})
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <span className="text-2xl font-bold font-plus-jakarta" style={{ color: 'var(--brand-lime)' }}>{t.targetValue}</span>
                                                <p className="text-[10px] font-bold uppercase opacity-40">Monthly Target</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* My Assigned Targets Section (Only for non-admins) */}
                        {userRole !== 'admin' && (
                            <div className="p-6 rounded-3xl border shadow-sm mt-8" style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)' }}>
                                <div className="flex items-center justify-between mb-8">
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <TargetIcon size={20} className="text-[var(--brand-lime)]" />
                                        My Assigned Targets
                                    </h2>
                                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-[var(--brand-lime)]/10 text-[var(--brand-lime)] border border-[var(--brand-lime)]/20">
                                        {existingTargets.filter(t => (t.assignedBy?._id || t.assignedBy) === userId).length} Delegated
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    {fetching ? (
                                        [1, 2].map(i => (
                                            <div key={i} className="p-5 rounded-2xl border animate-pulse" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-lighter)' }}>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-xl bg-white/5" />
                                                        <div className="space-y-2">
                                                            <div className="h-4 w-32 bg-white/5 rounded" />
                                                            <div className="h-3 w-24 bg-white/5 rounded" />
                                                        </div>
                                                    </div>
                                                    <div className="h-8 w-16 bg-white/5 rounded" />
                                                </div>
                                            </div>
                                        ))
                                    ) : existingTargets.filter(t => (t.assignedBy?._id || t.assignedBy) === userId).length === 0 ? (
                                        <div className="text-center py-12 opacity-50 border border-dashed rounded-2xl" style={{ borderColor: 'var(--border-main)' }}>
                                            You haven't assigned any targets yet
                                        </div>
                                    ) : (
                                        existingTargets.filter(t => (t.assignedBy?._id || t.assignedBy) === userId).map((t) => (
                                            <div key={t._id} className="p-5 rounded-2xl border flex items-center justify-between group transition-all hover:border-[var(--brand-lime)]/50" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-lighter)' }}>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-black/5 dark:bg-white/5 border border-white/5">
                                                        {t.targetType === 'COUNTRY' ? <MapPin size={20} /> : t.targetType === 'BRANCH' ? <Briefcase size={20} /> : <Users size={20} />}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold flex items-center gap-2">
                                                            {getTargetName(t)}
                                                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white/5 opacity-60">
                                                                {t.category.replace('_', ' ')}
                                                            </span>
                                                        </h3>
                                                        <p className="text-xs opacity-60 flex items-center gap-2 mt-1">
                                                            <Calendar size={12} /> {new Date(t.startDate).toLocaleDateString()} - {new Date(t.endDate).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <span className="text-2xl font-bold font-plus-jakarta" style={{ color: 'var(--brand-lime)' }}>{t.targetValue}</span>
                                                    <p className="text-[10px] font-bold uppercase opacity-40">Monthly Target</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Roles Guide */}
                        <div className="mt-8 p-6 rounded-3xl border border-dashed grid grid-cols-1 md:grid-cols-2 gap-6" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-main)' }}>
                            <div className="flex gap-4">
                                <div className="shrink-0 w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                    <Info size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm mb-1">Target Hierarchy</h4>
                                    <p className="text-xs opacity-60 leading-relaxed">Admins set national goals, Country Managers split them into Branch targets, and Branch Managers assign individual staff quotas.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="shrink-0 w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
                                    <Info size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm mb-1">Performance Tracking</h4>
                                    <p className="text-xs opacity-60 leading-relaxed">Actual performance is calculated in real-time based on system telemetry (Active Drivers, Vehicles, and signed Lease Agreements).</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TargetManagement;
