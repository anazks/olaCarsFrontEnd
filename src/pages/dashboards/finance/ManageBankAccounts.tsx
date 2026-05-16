import React, { useState, useEffect } from 'react';
import { 
    Building2, 
    Plus, 
    Search, 
    Trash2, 
    Edit2, 
    X, 
    Save, 
    CheckCircle2, 
    Wallet,
    CreditCard,
    ArrowUpRight,
    Loader2,
    Filter,
    RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
    getAllBankAccounts, 
    createBankAccount, 
    updateBankAccount, 
    deleteBankAccount
} from '../../../services/bankAccountService';
import type { BankAccount } from '../../../services/bankAccountService';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const ManageBankAccounts = () => {
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState('');

    const [formData, setFormData] = useState<Partial<BankAccount>>({
        bankName: '',
        accountNumber: '',
        accountHolderName: '',
        swiftCode: '',
        ifscCode: '',
        branchName: '',
        currency: 'USD',
        initialBalance: 0
    });

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const res = await getAllBankAccounts();
            setAccounts(res.data || []);
        } catch (error) {
            toast.error('Failed to load bank accounts');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingAccount) {
                await updateBankAccount(editingAccount._id, formData);
                toast.success('Account updated successfully');
            } else {
                await createBankAccount(formData);
                toast.success('Account created successfully');
            }
            fetchAccounts();
            setIsModalOpen(false);
            resetForm();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this bank account?')) return;
        try {
            await deleteBankAccount(id);
            toast.success('Account deleted successfully');
            fetchAccounts();
        } catch (error) {
            toast.error('Failed to delete account');
        }
    };

    const handleEdit = (account: BankAccount) => {
        setEditingAccount(account);
        setFormData({
            bankName: account.bankName,
            accountNumber: account.accountNumber,
            accountHolderName: account.accountHolderName,
            swiftCode: account.swiftCode,
            ifscCode: account.ifscCode,
            branchName: account.branchName,
            currency: account.currency,
            initialBalance: account.initialBalance
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setEditingAccount(null);
        setFormData({
            bankName: '',
            accountNumber: '',
            accountHolderName: '',
            swiftCode: '',
            ifscCode: '',
            branchName: '',
            currency: 'USD',
            initialBalance: 0
        });
    };

    const filteredAccounts = accounts.filter(acc => 
        acc.bankName.toLowerCase().includes(search.toLowerCase()) ||
        acc.accountNumber.includes(search) ||
        acc.accountHolderName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="container-responsive py-10 space-y-10 min-h-screen" style={{ color: 'var(--text-main)' }}>
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Manage Bank Accounts', active: true }]} />

            {/* Compact Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <Building2 size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        Bank Accounts
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">Centralized management for company liquidity and settlement accounts.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button 
                        onClick={fetchAccounts}
                        className="flex items-center justify-center p-2 rounded-xl border transition-all hover:bg-white/5 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button 
                        onClick={() => {
                            resetForm();
                            setIsModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-brand-lime text-[#0A0A0A] transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                        style={{ backgroundColor: 'var(--brand-lime)' }}
                    >
                        <Plus size={14} strokeWidth={3} /> Register Account
                    </button>
                </div>
            </div>

            {/* Global Liquidity Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <div className="border rounded-[2.5rem] p-8 relative overflow-hidden group transition-all hover:border-lime/30" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="absolute -top-4 -right-4 w-32 h-32 bg-lime/5 rounded-full blur-3xl group-hover:bg-lime/10 transition-all" />
                    <div className="relative z-10 space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-lime/10 flex items-center justify-center">
                            <Wallet className="text-lime" size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-dim)' }}>Total Liquidity</p>
                            <h2 className="text-4xl font-black mt-1" style={{ color: 'var(--text-main)' }}>
                                <span className="text-lime text-2xl mr-2">$</span>
                                {accounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0).toLocaleString()}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-lime">
                            <ArrowUpRight size={14} />
                            <span>Aggregated across {accounts.length} endpoints</span>
                        </div>
                    </div>
                </div>

                <div className="border rounded-[2.5rem] p-8 relative overflow-hidden group transition-all hover:border-blue-500/30" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="absolute -top-4 -right-4 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all" />
                    <div className="relative z-10 space-y-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                            <CheckCircle2 className="text-blue-500" size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--text-dim)' }}>Active Settlement</p>
                            <h2 className="text-4xl font-black mt-1" style={{ color: 'var(--text-main)' }}>
                                {accounts.filter(a => a.status === 'ACTIVE').length}
                                <span className="text-sm font-bold text-dim ml-2">/ {accounts.length}</span>
                            </h2>
                        </div>
                        <p className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>Synchronized with core ledger</p>
                    </div>
                </div>

                <div className="hidden xl:block border rounded-[2.5rem] p-8 relative overflow-hidden group transition-all hover:border-white/20" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="relative z-10 flex flex-col justify-center h-full space-y-2 text-center">
                        <Building2 size={32} className="mx-auto text-dim opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Institutional Banking</p>
                        <p className="text-xs font-medium px-6 leading-relaxed" style={{ color: 'var(--text-dim)' }}>Register multiple accounts to separate operational expenses from investment capital.</p>
                    </div>
                </div>
            </div>

            {/* Filtering Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center p-2 rounded-[2rem] border" style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)' }}>
                <div className="relative flex-1 w-full group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-dim group-focus-within:text-lime transition-colors" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search by institution name or account fragments..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-transparent py-5 pl-16 pr-6 text-sm font-medium outline-none transition-all placeholder:text-gray-500"
                        style={{ color: 'var(--text-main)' }}
                    />
                </div>
                <div className="px-4 border-l h-10 flex items-center" style={{ borderColor: 'var(--border-main)' }}>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white/5" style={{ color: 'var(--text-dim)' }}>
                        <Filter size={14} /> Filter View
                    </button>
                </div>
            </div>

            {/* Accounts Workspace (Tabular Form) */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-6">
                    <div className="w-16 h-16 border-4 border-lime border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] text-lime font-black uppercase tracking-[0.4em]">Querying Bank API...</p>
                </div>
            ) : filteredAccounts.length > 0 ? (
                <div className="rounded-[2rem] border overflow-hidden transition-all shadow-2xl shadow-black/20" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-dim">Institution</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-dim">Beneficiary</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-dim text-right">Account Details</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-dim text-right">Balance</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-dim text-center">Status</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-dim text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                {filteredAccounts.map((account) => (
                                    <tr key={account._id} className="hover:bg-lime/5 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center text-lime font-black border border-lime/10">
                                                    <CreditCard size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{account.bankName}</p>
                                                    <p className="text-[10px] font-bold" style={{ color: 'var(--text-dim)' }}>{account.branchName || 'Headquarters'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{account.accountHolderName}</p>
                                            <p className="text-[10px] font-medium" style={{ color: 'var(--text-dim)' }}>Legal Beneficiary</p>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <p className="text-xs font-mono font-bold" style={{ color: 'var(--text-main)' }}>{account.accountNumber}</p>
                                            <p className="text-[10px] font-bold text-lime uppercase tracking-widest">{account.swiftCode || account.ifscCode || 'DIRECT'}</p>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[10px] font-black text-lime">{account.currency}</span>
                                                    <span className="text-lg font-black" style={{ color: 'var(--text-main)' }}>{account.currentBalance.toLocaleString()}</span>
                                                </div>
                                                <p className="text-[9px] font-bold italic" style={{ color: 'var(--text-dim)' }}>Open: ${account.initialBalance.toLocaleString()}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                account.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                            }`}>
                                                {account.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleEdit(account)}
                                                    className="p-2 rounded-lg bg-white/5 text-dim hover:text-lime hover:bg-lime/10 transition-all border border-transparent hover:border-lime/20"
                                                    style={{ background: 'var(--bg-input)' }}
                                                    title="Edit Account"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(account._id)}
                                                    className="p-2 rounded-lg bg-white/5 text-dim hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                                                    style={{ background: 'var(--bg-input)' }}
                                                    title="Delete Account"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="border rounded-[4rem] p-32 text-center space-y-8" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="w-24 h-24 bg-lime/10 rounded-full flex items-center justify-center mx-auto ring-8 ring-lime/5 animate-pulse">
                        <Building2 size={48} className="text-lime" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black" style={{ color: 'var(--text-main)' }}>No accounts registered</h3>
                        <p className="font-medium max-w-sm mx-auto" style={{ color: 'var(--text-dim)' }}>Start your financial centralization by registering your first institutional account.</p>
                    </div>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="bg-lime text-black px-12 py-5 rounded-3xl font-black uppercase tracking-[0.2em] text-xs hover:scale-105 transition-all shadow-2xl shadow-lime/20"
                    >
                        Register Now
                    </button>
                </div>
            )}

            {/* Modal Workspace */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsModalOpen(false)} />
                    <div className="relative border rounded-[3rem] w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-500 shadow-[0_0_80px_rgba(0,0,0,0.5)]" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="p-10 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}>
                            <div>
                                <h2 className="text-lg font-black" style={{ color: 'var(--text-main)' }}>{editingAccount ? 'Update Parameters' : 'Account Registration'}</h2>
                                <p className="text-[10px] font-black uppercase tracking-widest mt-1 text-lime">Financial Endpoint Configuration</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white/5 rounded-2xl transition-all" style={{ color: 'var(--text-dim)' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Institution Name</label>
                                    <input 
                                        required
                                        type="text" 
                                        placeholder="e.g. Goldman Sachs"
                                        value={formData.bankName}
                                        onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                                        className="w-full border rounded-2xl px-6 py-4 text-sm font-medium focus:border-lime outline-none transition-all"
                                        style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Account Reference</label>
                                    <input 
                                        required
                                        type="text" 
                                        placeholder="Identification Number"
                                        value={formData.accountNumber}
                                        onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                                        className="w-full border rounded-2xl px-6 py-4 text-sm font-mono font-bold focus:border-lime outline-none transition-all"
                                        style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Legal Beneficiary Name</label>
                                    <input 
                                        required
                                        type="text" 
                                        placeholder="Corporate Entity Name"
                                        value={formData.accountHolderName}
                                        onChange={e => setFormData({ ...formData, accountHolderName: e.target.value })}
                                        className="w-full border rounded-2xl px-6 py-4 text-sm font-medium focus:border-lime outline-none transition-all"
                                        style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Branch Allocation</label>
                                    <input 
                                        type="text" 
                                        placeholder="Primary Headquarters"
                                        value={formData.branchName}
                                        onChange={e => setFormData({ ...formData, branchName: e.target.value })}
                                        className="w-full border rounded-2xl px-6 py-4 text-sm font-medium focus:border-lime outline-none transition-all"
                                        style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Routing Protocol (SWIFT/IFSC)</label>
                                    <input 
                                        type="text" 
                                        placeholder="Routing Code"
                                        value={formData.swiftCode || formData.ifscCode}
                                        onChange={e => setFormData({ ...formData, swiftCode: e.target.value })}
                                        className="w-full border rounded-2xl px-6 py-4 text-sm font-mono font-bold focus:border-lime outline-none transition-all"
                                        style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Base Currency</label>
                                    <select 
                                        value={formData.currency}
                                        onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                        className="w-full border rounded-2xl px-6 py-4 text-sm font-bold focus:border-lime outline-none transition-all appearance-none"
                                        style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                    >
                                        <option value="USD">USD - US Dollar</option>
                                        <option value="EUR">EUR - Euro</option>
                                        <option value="GBP">GBP - British Pound</option>
                                        <option value="AED">AED - UAE Dirham</option>
                                        <option value="INR">INR - Indian Rupee</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Initial Deposit</label>
                                    <div className="relative">
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-lime font-black">$</div>
                                        <input 
                                            required
                                            type="number" 
                                            step="0.01"
                                            placeholder="0.00"
                                            value={formData.initialBalance || ''}
                                            onChange={e => setFormData({ ...formData, initialBalance: e.target.value === '' ? 0 : Number(e.target.value) })}
                                            className="w-full border rounded-2xl px-12 py-4 text-sm font-mono font-bold focus:border-lime outline-none transition-all"
                                            style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-10 flex gap-4">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-5 bg-white/5 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-white/10 transition-all border"
                                    style={{ color: 'var(--text-dim)', borderColor: 'var(--border-main)' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-[2] py-5 bg-lime text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl shadow-lime/20"
                                >
                                    {submitting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <><Save size={20} /> {editingAccount ? 'Commit Changes' : 'Initialize Account'}</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageBankAccounts;
