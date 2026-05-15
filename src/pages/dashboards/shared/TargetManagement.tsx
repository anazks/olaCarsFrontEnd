import { useState, useEffect, useMemo } from 'react';
import { 
    Target as TargetIcon, MapPin, Users,
    Plus, User, ArrowRight, TrendingUp, Shield, Activity, Search, Building2, RefreshCw, Clock
} from 'lucide-react';
import { assignTarget, getTargets } from '../../../services/targetService';
import { getAllBranches, type Branch } from '../../../services/branchService';
import { getStaffPerformance } from '../../../services/staffPerformanceService';
import { getUserRole, getUserId, getUser } from '../../../utils/auth';
import { toast } from 'react-hot-toast';

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
            toast.error('Data retrieval failed');
        } finally {
            setFetching(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await assignTarget(formData as any);
            toast.success('Strategic benchmark deployed successfully');
            fetchInitialData();
            setFormData(prev => ({ ...prev, targetValue: 0, notes: '' }));
        } catch (error) {
            console.error('Error assigning target:', error);
            toast.error('Target authorization failed');
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
        return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [existingTargets, searchQuery, branches, staff]);

    const targetsFromAuthority = filteredTargets.filter(t => (t.assignedBy?._id || t.assignedBy) !== userId || userRole === 'admin');
    const myAssignedTargets = filteredTargets.filter(t => (t.assignedBy?._id || t.assignedBy) === userId && userRole !== 'admin');

    return (
        <div className="flex-1 w-full overflow-y-auto h-screen custom-scrollbar bg-gray-50 dark:bg-[#0A0A0A]">
            
            {/* Professional Command Header */}
            <div className="p-8 border-b border-gray-200 dark:border-white/5 bg-white dark:bg-[#0F0F0F] sticky top-0 z-20">
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-xl bg-lime flex items-center justify-center text-black shadow-lg shadow-lime/20">
                            <TargetIcon size={28} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white uppercase">Target Management</h1>
                            <p className="text-gray-500 dark:text-dim font-bold flex items-center gap-2 mt-0.5 uppercase text-[10px] tracking-widest">
                                <Shield size={14} className="text-lime" /> Strategic Benchmarking & Performance Control
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-6 px-8 py-2.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                            <div className="text-center">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Directives</p>
                                <p className="text-lg font-black text-gray-900 dark:text-white leading-none">{existingTargets.length}</p>
                            </div>
                            <div className="w-px h-6 bg-gray-300 dark:bg-white/10" />
                            <div className="text-center">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Agg. Value</p>
                                <p className="text-lg font-black text-lime leading-none">{existingTargets.reduce((acc, t) => acc + t.targetValue, 0)}</p>
                            </div>
                        </div>
                        <button onClick={fetchInitialData} className="p-3.5 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-dim hover:text-lime transition-all shadow-sm">
                            <RefreshCw size={18} className={fetching ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-8 max-w-[1600px] mx-auto pb-24 space-y-8">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    
                    {/* Deployment Form Column */}
                    <div className="xl:col-span-4">
                        <div className="bg-white dark:bg-[#0F0F0F] border border-gray-200 dark:border-white/5 rounded-xl shadow-sm p-6 lg:p-8 sticky top-32">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 rounded-lg bg-lime/10 text-lime flex items-center justify-center">
                                    <Plus size={20} />
                                </div>
                                <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">Deploy Strategic Objective</h2>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Scope Classification</label>
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
                                        className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-lime/50 transition-all text-gray-900 dark:text-white"
                                    >
                                        {canAssignCountry && <option value="COUNTRY">National Country</option>}
                                        {canAssignBranch && <option value="BRANCH">Regional Branch</option>}
                                        {canAssignStaff && <option value="STAFF">Individual Resource</option>}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Recipient Node</label>
                                    <select
                                        value={formData.targetId}
                                        onChange={(e) => setFormData({ ...formData, targetId: e.target.value })}
                                        className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-lime/50 transition-all text-gray-900 dark:text-white"
                                        required
                                    >
                                        <option value="">Select Recipient...</option>
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

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Performance Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                        className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-lime/50 transition-all text-gray-900 dark:text-white"
                                    >
                                        <option value="DRIVER_ACQUISITION">Driver Acquisition</option>
                                        <option value="RENTAL">Rental (New Leases)</option>
                                        <option value="VEHICLE_ACQUISITION">Vehicle Acquisition</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Objective Volume</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={formData.targetValue}
                                            onChange={(e) => setFormData({ ...formData, targetValue: parseInt(e.target.value) })}
                                            className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-lg font-black focus:outline-none focus:ring-1 focus:ring-lime/50 transition-all text-lime"
                                            min="0"
                                            required
                                        />
                                        <Activity size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Cycle Start</label>
                                        <input
                                            type="date"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                            className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-[11px] font-bold text-gray-900 dark:text-white uppercase"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Cycle End</label>
                                        <input
                                            type="date"
                                            value={formData.endDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            className="w-full bg-gray-50 dark:bg-black border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3.5 text-[11px] font-bold text-gray-900 dark:text-white uppercase"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 rounded-xl bg-lime text-black font-black text-xs uppercase tracking-widest transition-all hover:bg-[#B8D500] active:scale-[0.98] mt-2 flex items-center justify-center gap-3 shadow-lg shadow-lime/10"
                                >
                                    {loading ? <Activity className="animate-spin" size={18} /> : <>Deploy Objective <ArrowRight size={18} /></>}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Performance Ledger Column */}
                    <div className="xl:col-span-8 space-y-8">
                        
                        {/* Search Bar */}
                        <div className="relative group">
                            <Search size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-lime transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Search by node, category, or origin..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl pl-14 pr-6 py-4 text-xs font-bold uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-lime/50 transition-all text-gray-900 dark:text-white shadow-sm"
                            />
                        </div>

                        {/* Authority Directives Ledger */}
                        <div className="bg-white dark:bg-[#0F0F0F] border border-gray-200 dark:border-white/5 overflow-hidden rounded-xl shadow-sm">
                            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center gap-3 bg-gray-50/50 dark:bg-white/[0.02]">
                                <Shield size={20} className="text-indigo-600 dark:text-indigo-400" />
                                <div>
                                    <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">Authority Directives</h2>
                                    <p className="text-[9px] font-bold text-gray-500 dark:text-dim uppercase tracking-widest mt-0.5">Mandates inherited from management levels</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/30 dark:bg-white/[0.01]">
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/5 pl-8">Target Node</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/5">Category</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/5 text-center">Timeline</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/5 text-right">Value</th>
                                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/5 text-center pr-8">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                        {fetching ? (
                                            [1, 2, 3].map(i => (
                                                <tr key={i} className="animate-pulse">
                                                    <td colSpan={5} className="p-8"><div className="h-3 bg-gray-100 dark:bg-white/5 rounded-full w-full" /></td>
                                                </tr>
                                            ))
                                        ) : targetsFromAuthority.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-20 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest">No authority directives synchronized</td>
                                            </tr>
                                        ) : (
                                            targetsFromAuthority.map((t) => (
                                                <tr key={t._id} className="hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-colors group/row">
                                                    <td className="p-5 pl-8">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-400 group-hover/row:text-indigo-600 transition-colors">
                                                                {t.targetType === 'COUNTRY' ? <MapPin size={16} /> : t.targetType === 'BRANCH' ? <Building2 size={16} /> : <Users size={16} />}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{getTargetName(t)}</p>
                                                                <p className="text-[9px] font-bold text-gray-400 flex items-center gap-1 mt-0.5">
                                                                    <User size={10} /> {t.assignedBy?.fullName || 'System'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-5">
                                                        <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-dim border border-gray-200 dark:border-white/5">
                                                            {t.category.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="p-5 text-center">
                                                        <div className="inline-flex flex-col gap-0.5 items-center">
                                                            <div className="flex items-center gap-1 text-gray-900 dark:text-white">
                                                                <Clock size={11} className="text-gray-400" />
                                                                <span className="text-[11px] font-bold">{new Date(t.startDate).toLocaleDateString()}</span>
                                                            </div>
                                                            <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">Until {new Date(t.endDate).toLocaleDateString()}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-5 text-right">
                                                        <p className="text-lg font-black text-indigo-600 dark:text-indigo-400">{t.targetValue}</p>
                                                    </td>
                                                    <td className="p-5 text-center pr-8">
                                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded ${
                                                            new Date(t.endDate) > new Date() ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
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

                        {/* Delegated Objectives Ledger */}
                        {userRole !== 'admin' && (
                            <div className="bg-white dark:bg-[#0F0F0F] border border-gray-200 dark:border-white/5 overflow-hidden rounded-xl shadow-sm">
                                <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center gap-3 bg-gray-50/50 dark:bg-white/[0.02]">
                                    <TrendingUp size={20} className="text-lime" />
                                    <div>
                                        <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">My Delegated Objectives</h2>
                                        <p className="text-[9px] font-bold text-gray-500 dark:text-dim uppercase tracking-widest mt-0.5">Benchmarks authorized by you for subordinates</p>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/30 dark:bg-white/[0.01]">
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/5 pl-8">Recipient Node</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/5">Category</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/5 text-center">Timeline</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/5 text-right">Value</th>
                                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-white/5 text-center pr-8">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                            {fetching ? (
                                                [1, 2].map(i => (
                                                    <tr key={i} className="animate-pulse">
                                                        <td colSpan={5} className="p-8"><div className="h-3 bg-gray-100 dark:bg-white/5 rounded-full w-full" /></td>
                                                    </tr>
                                                ))
                                            ) : myAssignedTargets.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="p-20 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest">No active delegations detected</td>
                                                </tr>
                                            ) : (
                                                myAssignedTargets.map((t) => (
                                                    <tr key={t._id} className="hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-colors group/row">
                                                        <td className="p-5 pl-8">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-400 group-hover/row:text-lime transition-colors">
                                                                    {t.targetType === 'COUNTRY' ? <MapPin size={16} /> : t.targetType === 'BRANCH' ? <Building2 size={16} /> : <Users size={16} />}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{getTargetName(t)}</p>
                                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{t.targetType}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-5">
                                                            <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded bg-lime/10 text-lime border border-lime/20">
                                                                {t.category.replace('_', ' ')}
                                                            </span>
                                                        </td>
                                                        <td className="p-5 text-center">
                                                            <div className="inline-flex flex-col gap-0.5 items-center">
                                                                <div className="flex items-center gap-1 text-gray-900 dark:text-white">
                                                                    <Clock size={11} className="text-gray-400" />
                                                                    <span className="text-[11px] font-bold">{new Date(t.startDate).toLocaleDateString()}</span>
                                                                </div>
                                                                <span className="text-[8px] font-black uppercase text-gray-400 tracking-widest">To {new Date(t.endDate).toLocaleDateString()}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-5 text-right">
                                                            <p className="text-lg font-black text-lime">{t.targetValue}</p>
                                                        </td>
                                                        <td className="p-5 text-center pr-8">
                                                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded ${
                                                                new Date(t.endDate) > new Date() ? 'bg-lime text-black' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
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
