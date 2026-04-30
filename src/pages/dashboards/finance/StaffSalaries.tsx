import { useState, useEffect } from 'react';
import { 
    Users, 
    DollarSign, 
    TrendingUp, 
    Calendar, 
    Search, 
    Plus, 
    Edit2, 
    Wallet, 
    CheckCircle2, 
    ArrowUpRight,
    Calculator,
    Save,
    X,
    Loader2,
    Filter,
    Building2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getSalaryStructures, updateSalaryStructure, processPayroll } from '../../../services/salaryService';
import type { SalaryStructure } from '../../../services/salaryService';
import { getAllFinanceStaff } from '../../../services/financeStaffService';
import { getAllOperationStaff } from '../../../services/operationStaffService';
import { getAllBranchManagers } from '../../../services/branchManagerService';
import { getAllCountryManagers } from '../../../services/countryManagerService';
import { getAllWorkshopManagers } from '../../../services/workshopManagerService';
import { getAllWorkshopStaff } from '../../../services/workshopStaffService';
import { getAllBranches } from '../../../services/branchService';
import type { Branch } from '../../../services/branchService';
import { getAllFinancialAdmins } from '../../../services/financialAdminService';
import { getAllOperationalAdmins } from '../../../services/operationalAdminService';
import { getUserRole } from '../../../utils/auth';

const StaffSalaries = () => {

    const role = getUserRole();
    const [loading, setLoading] = useState(true);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>([]);
    
    // Filters
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [branchFilter, setBranchFilter] = useState('ALL');
    
    const [selectedStaff, setSelectedStaff] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [processing, setProcessing] = useState(false);

    const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false);
    const [payrollData, setPayrollData] = useState({
        leaveDeduction: 0,
        leaveDays: 0,
        totalDays: 30,
        notes: ''
    });

    // Form State for editing structure
    const [formData, setFormData] = useState<Partial<SalaryStructure>>({
        baseSalary: 0,
        allowances: [],
        bonuses: [],
        deductions: [],
        currency: 'USD'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [
                structuresRes, 
                finStaffRes, 
                opStaffRes, 
                bmRes, 
                cmRes,
                wmRes, 
                wsRes,
                branchesRes,
                faRes,
                oaRes
            ] = await Promise.all([
                getSalaryStructures(),
                getAllFinanceStaff(),
                getAllOperationStaff(),
                getAllBranchManagers(),
                getAllCountryManagers(),
                getAllWorkshopManagers(),
                getAllWorkshopStaff(),
                getAllBranches(),
                role === 'admin' ? getAllFinancialAdmins() : Promise.resolve({ data: [] }),
                role === 'admin' ? getAllOperationalAdmins() : Promise.resolve({ data: [] })
            ]);

            setSalaryStructures(structuresRes.data || []);
            setBranches(branchesRes.data || []);
            
            // Combine staff lists with explicit role tagging
            const combined = [
                ...(finStaffRes.data || []).map((s: any) => ({ ...s, role: 'FINANCESTAFF' })),
                ...(opStaffRes.data || []).map((s: any) => ({ ...s, role: 'OPERATIONSTAFF' })),
                ...(bmRes.data || []).map((s: any) => ({ ...s, role: 'BRANCHMANAGER' })),
                ...(cmRes.data || []).map((s: any) => ({ ...s, role: 'COUNTRYMANAGER' })),
                ...(wmRes.data || []).map((s: any) => ({ ...s, role: 'WORKSHOPMANAGER' })),
                ...(wsRes.data || []).map((s: any) => ({ ...s, role: 'WORKSHOPSTAFF' })),
                ...(faRes?.data || []).map((s: any) => ({ ...s, role: 'FINANCEADMIN' })),
                ...(oaRes?.data || []).map((s: any) => ({ ...s, role: 'OPERATIONADMIN' }))
            ];
            
            setStaffList(combined);
            
            if (combined.length === 0) {
                console.log('No staff found in any department');
            }
        } catch (error) {
            console.error('Error fetching salary data:', error);
            toast.error('Failed to fetch salary data');
        } finally {
            setLoading(false);
        }
    };

    const getStructureForStaff = (staffId: string) => {
        return salaryStructures.find(s => {
            const sStaffId = typeof s.staffId === 'object' ? (s.staffId as any)._id : s.staffId;
            return sStaffId === staffId;
        });
    };

    const handleEditStructure = (staff: any) => {
        const existing = getStructureForStaff(staff._id);
        setSelectedStaff(staff);
        setFormData(existing || {
            staffId: staff._id,
            staffRole: staff.role,
            baseSalary: 0,
            allowances: [],
            bonuses: [],
            deductions: [],
            currency: 'USD'
        });
        setIsModalOpen(true);
    };

    const handleSaveStructure = async () => {
        try {
            setProcessing(true);
            
            // Ensure staffId is just the ID string (it might be populated as an object)
            const payload = {
                ...formData,
                staffId: typeof formData.staffId === 'object' ? (formData.staffId as any)._id : formData.staffId
            };
            
            await updateSalaryStructure(payload);
            toast.success('Salary structure updated');
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            toast.error('Failed to update structure');
        } finally {
            setProcessing(false);
        }
    };

    const handleProcessPayroll = (staff: any) => {
        const structure = getStructureForStaff(staff._id);
        if (!structure || structure.baseSalary <= 0) {
            toast.error('Please set up salary structure first');
            return;
        }
        setSelectedStaff(staff);
        setPayrollData({ 
            leaveDeduction: 0, 
            leaveDays: 0, 
            totalDays: 30, 
            notes: '' 
        });
        setIsPayrollModalOpen(true);
    };

    const confirmProcessPayroll = async () => {
        try {
            setProcessing(true);
            const now = new Date();
            await processPayroll({
                staffId: selectedStaff._id,
                staffRole: selectedStaff.role,
                month: now.getMonth() + 1,
                year: now.getFullYear(),
                branchId: selectedStaff.branchId?._id || selectedStaff.branchId,
                leaveDeduction: payrollData.leaveDeduction
            });

            toast.success(`Payroll processed for ${selectedStaff.fullName}`);
            setIsPayrollModalOpen(false);
            fetchData();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Payroll processing failed');
        } finally {
            setProcessing(false);
        }
    };

    const filteredStaff = staffList.filter(s => {
        const matchesSearch = s.fullName.toLowerCase().includes(search.toLowerCase()) ||
                            s.email.toLowerCase().includes(search.toLowerCase());
        const matchesRole = roleFilter === 'ALL' || s.role === roleFilter;
        const staffBranchId = s.branchId?._id || s.branchId;
        const matchesBranch = branchFilter === 'ALL' || staffBranchId === branchFilter;
        
        return matchesSearch && matchesRole && matchesBranch;
    });

    const handleBulkPayroll = async () => {
        const staffWithStructure = filteredStaff.filter(s => {
            const structure = getStructureForStaff(s._id);
            return structure && structure.baseSalary > 0;
        });

        if (staffWithStructure.length === 0) {
            toast.error('No staff with configured salary structures found');
            return;
        }

        if (!window.confirm(`Are you sure you want to process payroll for ${staffWithStructure.length} staff members?`)) {
            return;
        }

        try {
            setProcessing(true);
            let successCount = 0;
            let failCount = 0;

            for (const staff of staffWithStructure) {
                try {
                    const now = new Date();
                    await processPayroll({
                        staffId: staff._id,
                        staffRole: staff.role,
                        month: now.getMonth() + 1,
                        year: now.getFullYear(),
                        branchId: staff.branchId?._id || staff.branchId
                    });
                    successCount++;
                } catch (err) {
                    console.error(`Failed for ${staff.fullName}:`, err);
                    failCount++;
                }
            }

            toast.success(`Bulk processing complete: ${successCount} successful, ${failCount} failed`);
            fetchData();
        } catch (error) {
            toast.error('Bulk processing encountered an error');
        } finally {
            setProcessing(false);
        }
    };

    const stats = {
        totalPayroll: salaryStructures.reduce((sum, s) => sum + s.baseSalary, 0),
        activeStaff: staffList.length,
        pendingPayments: staffList.length
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <Loader2 className="animate-spin text-[#C8E600]" size={48} />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700">
            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight italic uppercase">
                        Staff <span className="text-[#C8E600]">Payrolls</span>
                    </h1>
                    <p className="text-white/40 mt-1 font-medium">Manage salary structures and monthly cost allocation</p>
                </div>
                
                <div className="flex items-center gap-4">
                    <button 
                        onClick={fetchData}
                        className="px-6 py-3 rounded-2xl bg-white/5 text-white font-bold text-sm hover:bg-white/10 transition-all border border-white/5"
                    >
                        Refresh Data
                    </button>
                    <button 
                        onClick={handleBulkPayroll}
                        disabled={processing}
                        className="px-6 py-3 rounded-2xl bg-[#C8E600] text-black font-bold text-sm hover:scale-105 transition-all shadow-[0_0_20px_rgba(200,230,0,0.2)] flex items-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                    >
                        {processing ? <Loader2 className="animate-spin" size={18} /> : <DollarSign size={18} />} 
                        Process Full Payroll
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#1A1A1A] border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                        <TrendingUp size={80} className="text-[#C8E600]" />
                    </div>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Monthly Payroll Base</p>
                    <h3 className="text-3xl font-black text-white mt-2">${stats.totalPayroll.toLocaleString()}</h3>
                    <div className="flex items-center gap-2 mt-4 text-[#C8E600] text-xs font-bold bg-[#C8E600]/10 w-fit px-2 py-1 rounded-full">
                        <ArrowUpRight size={14} /> Globalized tracking
                    </div>
                </div>

                <div className="bg-[#1A1A1A] border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                        <Users size={80} className="text-blue-500" />
                    </div>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Active Staff Members</p>
                    <h3 className="text-3xl font-black text-white mt-2">{stats.activeStaff}</h3>
                    <p className="text-white/20 text-xs mt-4 font-medium italic">Across all active branches</p>
                </div>

                <div className="bg-[#1A1A1A] border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                        <Calendar size={80} className="text-orange-500" />
                    </div>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Next Payment Date</p>
                    <h3 className="text-3xl font-black text-white mt-2">May 01, 2026</h3>
                    <div className="flex items-center gap-2 mt-4 text-orange-500 text-xs font-bold bg-orange-500/10 w-fit px-2 py-1 rounded-full">
                        Due in 2 days
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-[#111111] border border-white/5 p-4 rounded-3xl flex flex-wrap gap-4 items-center">
                <div className="relative group flex-1 min-w-[200px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#C8E600] transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search staff..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#C8E600]/50 transition-all"
                    />
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-white/20" />
                        <select 
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C8E600]/30"
                        >
                            <option value="ALL">All Roles</option>
                            <option value="COUNTRYMANAGER">Country Managers</option>
                            <option value="BRANCHMANAGER">Branch Managers</option>
                            <option value="FINANCESTAFF">Finance Staff</option>
                            <option value="OPERATIONSTAFF">Operation Staff</option>
                            {role === 'admin' && (
                                <>
                                    <option value="FINANCEADMIN">Finance Admins</option>
                                    <option value="OPERATIONADMIN">Operational Admins</option>
                                </>
                            )}
                            <option value="WORKSHOPMANAGER">Workshop Managers</option>
                            <option value="WORKSHOPSTAFF">Workshop Staff</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-white/20" />
                        <select 
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C8E600]/30"
                        >
                            <option value="ALL">All Branches</option>
                            {branches.map(b => (
                                <option key={b._id} value={b._id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Staff Table */}
            <div className="bg-[#111111] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/[0.02]">
                                <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Staff Member</th>
                                <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Department & Branch</th>
                                <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Base Salary</th>
                                <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Gross Monthly Cost</th>
                                <th className="px-6 py-4 text-[10px] font-black text-white/40 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredStaff.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-white/20 italic">
                                        No staff members found matching the current filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredStaff.map((staff) => {
                                    const structure = getStructureForStaff(staff._id);
                                    const totalAllowances = structure?.allowances.reduce((s, a) => s + a.amount, 0) || 0;
                                    const totalBonuses = structure?.bonuses.reduce((s, b) => s + b.amount, 0) || 0;
                                    const totalDeductions = structure?.deductions.reduce((s, d) => s + d.amount, 0) || 0;
                                    const monthlyCost = (structure?.baseSalary || 0) + totalAllowances + totalBonuses - totalDeductions;

                                    return (
                                        <tr key={staff._id} className="hover:bg-white/[0.01] transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-[#C8E600]/10 flex items-center justify-center text-[#C8E600] font-black text-lg">
                                                        {staff.fullName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white group-hover:text-[#C8E600] transition-colors">{staff.fullName}</p>
                                                        <p className="text-[11px] text-white/40 mt-0.5">{staff.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="space-y-1">
                                                    <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-white/60 tracking-wider uppercase block w-fit">
                                                        {staff.role.replace('STAFF', '').replace('MANAGER', ' MGR')}
                                                    </span>
                                                    <p className="text-[10px] text-white/30 font-medium ml-1">
                                                        {staff.branchId?.name || 'Central Office'}
                                                    </p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 font-mono text-sm text-white/80">
                                                ${(structure?.baseSalary || 0).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono font-black text-[#C8E600] text-sm">
                                                        ${monthlyCost.toLocaleString()}
                                                    </span>
                                                    <span className="text-[9px] text-white/20 font-bold uppercase ml-1">Excl. Leaves</span>
                                                    {totalAllowances > 0 && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">
                                                            +{totalAllowances}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleEditStructure(staff)}
                                                        className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                                                        title="Edit Salary Structure"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleProcessPayroll(staff)}
                                                        className="px-4 py-2 rounded-xl bg-[#C8E600]/10 text-[#C8E600] text-[11px] font-black uppercase tracking-wider hover:bg-[#C8E600] hover:text-black transition-all"
                                                    >
                                                        Process Payment
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Salary Structure Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-[#111111] border border-white/10 rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-[#C8E600]/10 text-[#C8E600]">
                                    <Wallet size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white italic uppercase tracking-tight">
                                        Salary <span className="text-[#C8E600]">Structure</span>
                                    </h2>
                                    <p className="text-xs text-white/40 font-medium">Configuring for {selectedStaff?.fullName}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Base Salary (USD)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                        <input 
                                            type="number" 
                                            value={formData.baseSalary}
                                            onChange={(e) => setFormData({...formData, baseSalary: parseFloat(e.target.value) || 0})}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-mono font-bold text-white focus:outline-none focus:border-[#C8E600]/50 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Allowances Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                                        <Plus size={14} className="text-[#C8E600]" /> Allowances
                                    </h4>
                                    <button 
                                        onClick={() => setFormData({...formData, allowances: [...(formData.allowances || []), { name: '', amount: 0 }]})}
                                        className="text-[10px] font-black text-[#C8E600] uppercase hover:underline"
                                    >
                                        + Add Item
                                    </button>
                                </div>
                                {formData.allowances?.map((allowance, idx) => (
                                    <div key={idx} className="flex gap-4 items-center animate-in slide-in-from-left-2">
                                        <input 
                                            placeholder="Allowance Name"
                                            value={allowance.name}
                                            onChange={(e) => {
                                                const newAllowances = [...(formData.allowances || [])];
                                                newAllowances[idx].name = e.target.value;
                                                setFormData({...formData, allowances: newAllowances});
                                            }}
                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C8E600]/30"
                                        />
                                        <input 
                                            type="number"
                                            placeholder="Amount"
                                            value={allowance.amount}
                                            onChange={(e) => {
                                                const newAllowances = [...(formData.allowances || [])];
                                                newAllowances[idx].amount = parseFloat(e.target.value) || 0;
                                                setFormData({...formData, allowances: newAllowances});
                                            }}
                                            className="w-32 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white font-mono"
                                        />
                                        <button 
                                            onClick={() => setFormData({...formData, allowances: formData.allowances?.filter((_, i) => i !== idx)})}
                                            className="text-rose-500/50 hover:text-rose-500 p-2"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Totals Preview */}
                            <div className="mt-8 p-6 bg-[#C8E600]/5 border border-[#C8E600]/10 rounded-3xl flex justify-between items-center">
                                <div>
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Calculated Net Salary</p>
                                    <p className="text-xs text-white/30 italic mt-1">(Base + Allowances + Bonuses - Deductions)</p>
                                </div>
                                <h3 className="text-3xl font-black text-[#C8E600] italic">
                                    ${((formData.baseSalary || 0) + (formData.allowances?.reduce((s, a) => s + a.amount, 0) || 0)).toLocaleString()}
                                </h3>
                            </div>
                        </div>

                        <div className="p-6 bg-white/[0.02] border-t border-white/5 flex gap-4">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-4 rounded-2xl bg-white/5 text-white font-bold text-sm hover:bg-white/10 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveStructure}
                                disabled={processing}
                                className="flex-1 py-4 rounded-2xl bg-[#C8E600] text-black font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(200,230,0,0.2)] flex items-center justify-center gap-2"
                            >
                                {processing ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Save Structure</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Payroll Process Modal */}
            {isPayrollModalOpen && selectedStaff && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsPayrollModalOpen(false)} />
                    <div className="relative bg-[#111111] border border-white/10 rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 rounded-2xl bg-[#C8E600]/10 text-[#C8E600]">
                                    <Calculator size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white italic uppercase tracking-tight">
                                        Process <span className="text-[#C8E600]">Payout</span>
                                    </h2>
                                    <p className="text-xs text-white/40 font-medium">Finalize monthly cost for {selectedStaff.fullName}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsPayrollModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Days in Month</label>
                                    <input 
                                        type="number" 
                                        value={payrollData.totalDays}
                                        onChange={(e) => {
                                            const total = parseInt(e.target.value) || 30;
                                            const structure = getStructureForStaff(selectedStaff._id);
                                            const base = structure?.baseSalary || 0;
                                            const deduction = (base / total) * payrollData.leaveDays;
                                            setPayrollData({...payrollData, totalDays: total, leaveDeduction: Number(deduction.toFixed(2))});
                                        }}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C8E600]/30"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Leave Days</label>
                                    <input 
                                        type="number" 
                                        value={payrollData.leaveDays}
                                        onChange={(e) => {
                                            const leaves = parseInt(e.target.value) || 0;
                                            const structure = getStructureForStaff(selectedStaff._id);
                                            const base = structure?.baseSalary || 0;
                                            const deduction = (base / payrollData.totalDays) * leaves;
                                            setPayrollData({...payrollData, leaveDays: leaves, leaveDeduction: Number(deduction.toFixed(2))});
                                        }}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#C8E600]/30"
                                    />
                                </div>
                            </div>

                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                <div className="flex justify-between text-xs font-bold text-white/40 uppercase tracking-widest mb-2">
                                    <span>Standard Cost</span>
                                    <span>Final Net Payout</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="text-white font-mono">
                                        ${((getStructureForStaff(selectedStaff._id)?.baseSalary || 0) + 
                                           (getStructureForStaff(selectedStaff._id)?.allowances.reduce((s, a) => s + a.amount, 0) || 0) -
                                           (getStructureForStaff(selectedStaff._id)?.deductions.reduce((s, d) => s + d.amount, 0) || 0)).toLocaleString()}
                                    </div>
                                    <div className="text-2xl font-black text-[#C8E600] italic">
                                        ${((getStructureForStaff(selectedStaff._id)?.baseSalary || 0) + 
                                           (getStructureForStaff(selectedStaff._id)?.allowances.reduce((s, a) => s + a.amount, 0) || 0) -
                                           (getStructureForStaff(selectedStaff._id)?.deductions.reduce((s, d) => s + d.amount, 0) || 0) -
                                           payrollData.leaveDeduction).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest">Calculated Leave Deduction</label>
                                    <span className="text-[10px] text-[#C8E600] font-bold">
                                        {payrollData.leaveDays} Days Leave
                                    </span>
                                </div>
                                <div className="relative">
                                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                                    <input 
                                        type="number" 
                                        value={payrollData.leaveDeduction}
                                        onChange={(e) => setPayrollData({...payrollData, leaveDeduction: parseFloat(e.target.value) || 0})}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-mono font-bold text-[#C8E600] focus:outline-none focus:border-[#C8E600]/50 transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                                <p className="text-[10px] text-white/20 italic ml-1">* Auto-calculated based on days present, can be manually overridden</p>
                            </div>
                        </div>

                        <div className="p-6 bg-white/[0.02] border-t border-white/5 flex gap-4">
                            <button 
                                onClick={() => setIsPayrollModalOpen(false)}
                                className="flex-1 py-4 rounded-2xl bg-white/5 text-white font-bold text-sm hover:bg-white/10 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmProcessPayroll}
                                disabled={processing}
                                className="flex-1 py-4 rounded-2xl bg-[#C8E600] text-black font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(200,230,0,0.2)] flex items-center justify-center gap-2"
                            >
                                {processing ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18} /> Confirm Payout</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffSalaries;
