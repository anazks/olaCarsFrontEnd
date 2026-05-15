import { useState, useEffect, useMemo } from 'react';
import { 
    Target as TargetIcon, MapPin, Users,
    Plus, User, ArrowRight, TrendingUp, Shield, Activity, Search, Building2
} from 'lucide-react';
import { assignTarget, getTargets } from '../../../services/targetService';
import { getAllBranches, type Branch } from '../../../services/branchService';
import { getStaffPerformance } from '../../../services/staffPerformanceService';
import { getUserRole, getUserId, getUser } from '../../../utils/auth';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

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

    const [branchFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchInitialData();
        
        if (userRole === 'branchmanager') {
            setFormData(prev => ({ ...prev, targetType: 'STAFF', targetId: '' }));
        } else if (userRole === 'countrymanager') {
            setFormData(prev => ({ ...prev, targetType: 'BRANCH', targetId: '' }));
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
            fetchInitialData();
            setFormData(prev => ({ ...prev, targetValue: 0, notes: '' }));
        } catch (error) {
            console.error('Error assigning target:', error);
        } finally {
            setLoading(false);
        }
    };

    const canAssignCountry = ['admin', 'superadmin'].includes(userRole.toLowerCase().replace(' ', ''));
    const canAssignBranch = ['admin', 'superadmin', 'countrymanager', 'branchmanager'].includes(userRole.toLowerCase().replace(' ', ''));
    const canAssignStaff = true;

    const getTargetName = (t: any) => {
        if (t.targetType === 'COUNTRY') return t.targetId;
        if (t.targetType === 'BRANCH') {
            const branch = branches.find(b => b._id === t.targetId);
            return branch ? branch.name : t.targetId;
        }
        if (t.targetType === 'STAFF') {
            const member = staff.find(s => s.staffId === t.targetId);
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

    const targetsFromAuthority = filteredTargets.filter(t => (t.assignedBy?._id || t.assignedBy) !== userId || userRole === 'admin');
    const myAssignedTargets = filteredTargets.filter(t => (t.assignedBy?._id || t.assignedBy) === userId && userRole !== 'admin');

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

            <div className="p-8 max-w-[1600px] mx-auto pb-24">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    
                    {/* Left Column: Form (Sticky) */}
                    <div className="xl:col-span-4">
                        <div className="rounded-[2.5rem] border border-[var(--border-main)] bg-[var(--bg-card)] p-8 sticky top-8 overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-lime/30 to-transparent" />
                            
                            <h2 className="text-xl font-black text-[var(--text-main)] mb-8 flex items-center gap-3">
                                <Plus size={20} className="text-lime" />
                                Deploy Objective
                            </h2>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dim ml-2">Scope Classification</label>
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
                                        className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-lime/30 transition-all text-[var(--text-main)]"
                                    >
                                        {canAssignCountry && <option value="COUNTRY">National Country</option>}
                                        {canAssignBranch && <option value="BRANCH">Regional Branch</option>}
                                        {canAssignStaff && <option value="STAFF">Individual Resource</option>}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dim ml-2">Target Node</label>
                                    <select
                                        value={formData.targetId}
                                        onChange={(e) => setFormData({ ...formData, targetId: e.target.value })}
                                        className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-lime/30 transition-all text-[var(--text-main)]"
                                        required
                                    >
                                        <option value="">Select Option</option>
                                        {formData.targetType === 'COUNTRY' && staff
                                            .filter(s => s.metrics && 'totalCountryBranches' in s.metrics)
                                            .map(s => (
                                                <option key={s.staffId} value={s.country}>{s.fullName} ({s.country})</option>
                                            ))
                                        }
                                        {formData.targetType === 'BRANCH' && branches
                                            .filter(b => {
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

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dim ml-2">Performance Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                        className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-lime/30 transition-all text-[var(--text-main)]"
                                    >
                                        <option value="DRIVER_ACQUISITION">Driver Acquisition</option>
                                        <option value="RENTAL">Rental (New Leases)</option>
                                        <option value="VEHICLE_ACQUISITION">Vehicle Acquisition</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-dim ml-2">Objective Value</label>
                                    <input
                                        type="number"
                                        value={formData.targetValue}
                                        onChange={(e) => setFormData({ ...formData, targetValue: parseInt(e.target.value) })}
                                        className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-4 text-xl font-black focus:outline-none focus:ring-2 focus:ring-lime/30 transition-all text-lime"
                                        min="0"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-dim ml-2">Cycle Start</label>
                                        <input
                                            type="date"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-4 text-[10px] font-bold text-[var(--text-main)] uppercase"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-dim ml-2">Cycle End</label>
                                        <input
                                            type="date"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-2xl p-4 text-[10px] font-bold text-[var(--text-main)] uppercase"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-5 rounded-2xl bg-lime text-black font-black text-xs uppercase tracking-widest transition-all hover:shadow-[0_0_30px_rgba(200,230,0,0.2)] active:scale-[0.98] mt-4 flex items-center justify-center gap-3"
                                >
                                    {loading ? <Activity className="animate-spin" size={18} /> : <>Deploy Target <ArrowRight size={18} /></>}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Right Column: Tables */}
                    <div className="xl:col-span-8 space-y-10">
                        
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-4 rounded-[2rem] bg-[var(--bg-input)] border border-[var(--border-main)] mb-8">
                            <div className="relative flex-1 group">
                                <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-lime opacity-40 group-focus-within:opacity-100 transition-opacity" />
                                <input 
                                    type="text" 
                                    placeholder="Search directives..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl pl-12 pr-6 py-3.5 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-lime/30 transition-all text-[var(--text-main)]"
                                />
                            </div>
                        </div>

                        {/* 1. Higher Authority Table */}
                        <div className="rounded-[2.5rem] border border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden">
                            <div className="p-8 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-input)]">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/10">
                                        <Shield size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-[var(--text-main)]">Authority Directives</h2>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-dim mt-1">Operational Mandates from Management</p>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-[var(--bg-input)]">
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] pl-8">Target Node</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)]">Category</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)]">Cycle Range</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] text-right">Value</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] text-center pr-8">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-main)]">
                                        {fetching ? (
                                            [1, 2, 3].map(i => (
                                                <tr key={i} className="animate-pulse">
                                                    <td colSpan={5} className="p-8"><div className="h-4 bg-[var(--bg-input)] rounded-full w-full" /></td>
                                                </tr>
                                            ))
                                        ) : targetsFromAuthority.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-20 text-center text-dim font-black uppercase tracking-widest italic opacity-30">No directives found</td>
                                            </tr>
                                        ) : (
                                            targetsFromAuthority.map((t) => (
                                                <tr key={t._id} className="hover:bg-[var(--bg-input)] transition-colors group/row">
                                                    <td className="p-5 pl-8">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-[var(--bg-input)] flex items-center justify-center text-dim group-hover/row:text-blue-400 transition-colors">
                                                                {t.targetType === 'COUNTRY' ? <MapPin size={18} /> : t.targetType === 'BRANCH' ? <Building2 size={18} /> : <Users size={18} />}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-[var(--text-main)]">{getTargetName(t)}</p>
                                                                <p className="text-[9px] font-bold text-dim flex items-center gap-1 mt-0.5">
                                                                    <User size={10} /> {t.assignedBy?.fullName || 'System'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-5">
                                                        <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-[var(--bg-input)] border border-[var(--border-main)] text-dim">
                                                            {t.category.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="p-5">
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-bold text-[var(--text-main)]">{new Date(t.startDate).toLocaleDateString()}</span>
                                                            <span className="text-[9px] font-black uppercase text-dim tracking-widest">Until {new Date(t.endDate).toLocaleDateString()}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-5 text-right">
                                                        <p className="text-2xl font-black text-blue-400 font-plus-jakarta">{t.targetValue}</p>
                                                    </td>
                                                    <td className="p-5 text-center pr-8">
                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                                                            new Date(t.endDate) > new Date() ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                                        }`}>
                                                            {new Date(t.endDate) > new Date() ? 'Active' : 'Expired'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 2. My Assigned Targets Table */}
                        {userRole !== 'admin' && (
                            <div className="rounded-[2.5rem] border border-[var(--border-main)] bg-[var(--bg-card)] overflow-hidden">
                                <div className="p-8 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-input)]">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-lime/10 flex items-center justify-center text-lime border border-lime/10">
                                            <TrendingUp size={24} />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-[var(--text-main)]">My Delegated Objectives</h2>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-dim mt-1">Benchmarks you assigned to nodes</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-[var(--bg-input)]">
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] pl-8">Recipient</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)]">Category</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)]">Cycle Range</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] text-right">Value</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-dim border-b border-[var(--border-main)] text-center pr-8">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[var(--border-main)]">
                                            {fetching ? (
                                                [1, 2].map(i => (
                                                    <tr key={i} className="animate-pulse">
                                                        <td colSpan={5} className="p-8"><div className="h-4 bg-[var(--bg-input)] rounded-full w-full" /></td>
                                                    </tr>
                                                ))
                                            ) : myAssignedTargets.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="p-20 text-center text-dim font-black uppercase tracking-widest italic opacity-30">No objectives delegated</td>
                                                </tr>
                                            ) : (
                                                myAssignedTargets.map((t) => (
                                                    <tr key={t._id} className="hover:bg-[var(--bg-input)] transition-colors group/row">
                                                        <td className="p-5 pl-8">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-xl bg-[var(--bg-input)] flex items-center justify-center text-dim group-hover/row:text-lime transition-colors">
                                                                    {t.targetType === 'COUNTRY' ? <MapPin size={18} /> : t.targetType === 'BRANCH' ? <Building2 size={18} /> : <Users size={18} />}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-black text-[var(--text-main)]">{getTargetName(t)}</p>
                                                                    <p className="text-[9px] font-black text-dim uppercase tracking-widest mt-0.5">{t.targetType}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-5">
                                                            <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-lime/5 border border-lime/10 text-lime">
                                                                {t.category.replace('_', ' ')}
                                                            </span>
                                                        </td>
                                                        <td className="p-5">
                                                            <div className="flex flex-col">
                                                                <span className="text-[11px] font-bold text-[var(--text-main)]">{new Date(t.startDate).toLocaleDateString()}</span>
                                                                <span className="text-[9px] font-black uppercase text-dim tracking-widest">To {new Date(t.endDate).toLocaleDateString()}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-5 text-right">
                                                            <p className="text-2xl font-black text-lime font-plus-jakarta">{t.targetValue}</p>
                                                        </td>
                                                        <td className="p-5 text-center pr-8">
                                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                                                                new Date(t.endDate) > new Date() ? 'bg-lime/20 text-lime' : 'bg-rose-500/10 text-rose-400'
                                                            }`}>
                                                                {new Date(t.endDate) > new Date() ? 'Live' : 'Terminated'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TargetManagement;