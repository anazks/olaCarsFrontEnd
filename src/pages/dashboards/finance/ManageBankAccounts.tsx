import { useState, useEffect } from 'react';
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
    Filter
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
    getAllBankAccounts, 
    createBankAccount, 
    updateBankAccount, 
    deleteBankAccount
} from '../../../services/bankAccountService';
import type { BankAccount } from '../../../services/bankAccountService';

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
        <div className="p-6 space-y-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Building2 className="text-[#C8E600]" />
                        Bank Accounts
                    </h1>
                    <p className="text-white/40 text-sm mt-1">Manage company bank accounts and tracking balances</p>
                </div>
                <button 
                    onClick={() => {
                        resetForm();
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-[#C8E600] text-black px-6 py-3 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(200,230,0,0.3)] transition-all"
                >
                    <Plus size={20} />
                    Add Bank Account
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Wallet size={80} />
                    </div>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Total Bank Balance</p>
                    <h2 className="text-3xl font-bold text-white mt-2">
                        ${accounts.reduce((sum, acc) => sum + (acc.currentBalance || 0), 0).toLocaleString()}
                    </h2>
                    <div className="flex items-center gap-2 text-[#C8E600] text-xs mt-4">
                        <ArrowUpRight size={14} />
                        <span>Across {accounts.length} accounts</span>
                    </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CreditCard size={80} />
                    </div>
                    <p className="text-white/40 text-xs font-bold uppercase tracking-wider">Active Accounts</p>
                    <h2 className="text-3xl font-bold text-white mt-2">
                        {accounts.filter(a => a.status === 'ACTIVE').length}
                    </h2>
                    <div className="flex items-center gap-2 text-white/40 text-xs mt-4">
                        <CheckCircle2 size={14} />
                        <span>System synchronized</span>
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by bank name, account number..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl py-3 pl-12 pr-4 text-white focus:border-[#C8E600] outline-none transition-all"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-3 rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all">
                        <Filter size={20} />
                    </button>
                </div>
            </div>

            {/* Accounts Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-10 h-10 text-[#C8E600] animate-spin" />
                    <p className="text-white/40 animate-pulse">Loading accounts...</p>
                </div>
            ) : filteredAccounts.length > 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {filteredAccounts.map(account => (
                        <div key={account._id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-[#C8E600]/30 transition-all group">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-[#C8E600]/10 flex items-center justify-center">
                                            <Building2 className="text-[#C8E600]" size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-lg">{account.bankName}</h3>
                                            <p className="text-white/40 text-xs font-mono">{account.accountNumber}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => handleEdit(account)}
                                            className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-[#C8E600] hover:bg-[#C8E600]/10 transition-all"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(account._id)}
                                            className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                    <div>
                                        <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Account Holder</p>
                                        <p className="text-white/80 text-sm mt-1">{account.accountHolderName}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Branch</p>
                                        <p className="text-white/80 text-sm mt-1">{account.branchName || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">SWIFT / IFSC</p>
                                        <p className="text-white/80 text-sm mt-1 font-mono">{account.swiftCode || account.ifscCode || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Status</p>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold mt-1 ${
                                            account.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                                        }`}>
                                            {account.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] text-white/40 font-bold uppercase">Current Balance</p>
                                        <p className="text-2xl font-bold text-white mt-1">
                                            <span className="text-[#C8E600] mr-1">{account.currency}</span>
                                            {account.currentBalance.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-white/20 font-bold uppercase">Initial</p>
                                        <p className="text-sm text-white/40 font-mono italic">${account.initialBalance.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-20 text-center">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Building2 size={40} className="text-white/20" />
                    </div>
                    <h3 className="text-xl font-bold text-white">No bank accounts found</h3>
                    <p className="text-white/40 mt-2 max-w-sm mx-auto">Start by adding your company bank accounts to track transactions and balances</p>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="mt-8 px-8 py-3 bg-[#C8E600] text-black rounded-xl font-bold hover:scale-105 transition-all"
                    >
                        Add First Account
                    </button>
                </div>
            )}

            {/* Account Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <div className="relative bg-[#121212] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <div>
                                <h2 className="text-xl font-bold text-white">{editingAccount ? 'Edit Account' : 'Add Bank Account'}</h2>
                                <p className="text-xs text-white/40 mt-1">Enter bank details accurately for financial records</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                                <X size={20} className="text-white/40" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Bank Name</label>
                                    <input 
                                        required
                                        type="text" 
                                        placeholder="e.g. JPMorgan Chase"
                                        value={formData.bankName}
                                        onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                                        className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-white focus:border-[#C8E600] outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Account Number</label>
                                    <input 
                                        required
                                        type="text" 
                                        placeholder="Account Number"
                                        value={formData.accountNumber}
                                        onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                                        className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-white focus:border-[#C8E600] outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Account Holder Name</label>
                                    <input 
                                        required
                                        type="text" 
                                        placeholder="Full Legal Name"
                                        value={formData.accountHolderName}
                                        onChange={e => setFormData({ ...formData, accountHolderName: e.target.value })}
                                        className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-white focus:border-[#C8E600] outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Branch Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="Main Branch"
                                        value={formData.branchName}
                                        onChange={e => setFormData({ ...formData, branchName: e.target.value })}
                                        className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-white focus:border-[#C8E600] outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">SWIFT / BIC Code</label>
                                    <input 
                                        type="text" 
                                        placeholder="SWIFT Code"
                                        value={formData.swiftCode}
                                        onChange={e => setFormData({ ...formData, swiftCode: e.target.value })}
                                        className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-white focus:border-[#C8E600] outline-none transition-all font-mono"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">IFSC Code (Optional)</label>
                                    <input 
                                        type="text" 
                                        placeholder="IFSC Code"
                                        value={formData.ifscCode}
                                        onChange={e => setFormData({ ...formData, ifscCode: e.target.value })}
                                        className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-white focus:border-[#C8E600] outline-none transition-all font-mono"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Currency</label>
                                    <select 
                                        value={formData.currency}
                                        onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                        className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3 text-white focus:border-[#C8E600] outline-none transition-all"
                                    >
                                        <option value="USD">USD - US Dollar</option>
                                        <option value="EUR">EUR - Euro</option>
                                        <option value="GBP">GBP - British Pound</option>
                                        <option value="AED">AED - UAE Dirham</option>
                                        <option value="INR">INR - Indian Rupee</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Opening Balance</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 font-bold">$</div>
                                        <input 
                                            required
                                            type="number" 
                                            step="0.01"
                                            placeholder="0.00"
                                            value={formData.initialBalance}
                                            onChange={e => setFormData({ ...formData, initialBalance: Number(e.target.value) })}
                                            className="w-full bg-[#1A1A1A] border border-white/5 rounded-xl px-8 py-3 text-white focus:border-[#C8E600] outline-none transition-all font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5 flex gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-4 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-[2] py-4 bg-[#C8E600] text-black font-bold rounded-2xl hover:shadow-[0_0_20px_rgba(200,230,0,0.3)] transition-all flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <><Save size={20} /> {editingAccount ? 'Update Account' : 'Create Account'}</>
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
