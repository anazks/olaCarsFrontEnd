/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    RefreshCw,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
    getAllBankAccounts, 
    createBankAccount, 
    updateBankAccount, 
    deleteBankAccount
} from '../../../services/bankAccountService';
import type { BankAccount } from '../../../services/bankAccountService';
import { getAllAccountingCodes } from '../../../services/accountingService';
import { getLedgerEntries } from '../../../services/ledgerService';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const ManageBankAccounts = () => {
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [accountingCodes, setAccountingCodes] = useState<any[]>([]);
    const [selectedCodeId, setSelectedCodeId] = useState<string>('NEW');

    // Pagination, Sorting & Search States
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
    const [sortBy, setSortBy] = useState<'bankName' | 'accountHolderName' | 'currentBalance' | 'createdAt'>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(10);
    const [pagination, setPagination] = useState<{ total: number; page: number; limit: number; totalPages: number } | null>(null);

    const [formData, setFormData] = useState<Partial<BankAccount>>({
        bankName: '',
        accountNumber: '',
        accountHolderName: 'Ola Cars Corporate',
        swiftCode: '',
        ifscCode: '',
        branchName: '',
        currency: 'USD',
        initialBalance: 0,
        accountType: 'Bank',
        accountName: '',
        accountCode: '',
        description: ''
    });

    // Transactions Modal & Search States
    const [isTxModalOpen, setIsTxModalOpen] = useState(false);
    const [selectedAccountForTx, setSelectedAccountForTx] = useState<BankAccount | null>(null);
    const [txEntries, setTxEntries] = useState<any[]>([]);
    const [txLoading, setTxLoading] = useState(false);
    const [txSearch, setTxSearch] = useState('');
    const [txTypeFilter, setTxTypeFilter] = useState<'ALL' | 'DEBIT' | 'CREDIT'>('ALL');
    const [txPage, setTxPage] = useState(1);
    const [txPagination, setTxPagination] = useState<any>(null);
    const [txSummary, setTxSummary] = useState({ totalDebit: 0, totalCredit: 0, netMovement: 0 });

    const fetchTransactions = useCallback(async () => {
        if (!selectedAccountForTx) return;
        setTxLoading(true);
        try {
            const accCodeId = selectedAccountForTx.accountingCode?._id || selectedAccountForTx.accountingCode;
            if (!accCodeId) {
                toast.error('This bank account is not linked to any accounting code.');
                setTxLoading(false);
                return;
            }
            const params: any = {
                accountingCode: accCodeId,
                page: txPage,
                limit: 10
            };
            if (txSearch.trim()) {
                params.search = txSearch.trim();
            }
            if (txTypeFilter !== 'ALL') {
                params.type = txTypeFilter;
            }
            const res = await getLedgerEntries(params);
            setTxEntries(res.data || []);
            setTxSummary(res.summary || { totalDebit: 0, totalCredit: 0, netMovement: 0 });
            setTxPagination(res.pagination || null);
        } catch (error) {
            console.error('Failed to load ledger transactions', error);
            toast.error('Failed to load transactions');
        } finally {
            setTxLoading(false);
        }
    }, [selectedAccountForTx, txPage, txSearch, txTypeFilter]);

    useEffect(() => {
        if (isTxModalOpen && selectedAccountForTx) {
            const timer = setTimeout(() => {
                fetchTransactions();
            }, txSearch ? 400 : 0);
            return () => clearTimeout(timer);
        }
    }, [txSearch, txTypeFilter, txPage, isTxModalOpen, selectedAccountForTx, fetchTransactions]);

    const handleViewTransactions = (account: BankAccount) => {
        setSelectedAccountForTx(account);
        setTxEntries([]);
        setTxSearch('');
        setTxTypeFilter('ALL');
        setTxPage(1);
        setTxPagination(null);
        setTxSummary({ totalDebit: 0, totalCredit: 0, netMovement: 0 });
        setIsTxModalOpen(true);
    };

    const fetchAccounts = useCallback(async () => {
        setLoading(true);
        try {
            const params: any = {
                page: currentPage,
                limit,
                sortBy,
                sortOrder,
            };
            if (searchQuery.trim()) {
                params.search = searchQuery.trim();
            }
            if (statusFilter !== 'ALL') {
                params.status = statusFilter;
            }
            const res = await getAllBankAccounts(params);
            setAccounts(res.data || []);
            setPagination(res.pagination || null);
        } catch {
            toast.error('Failed to load bank accounts');
        } finally {
            setLoading(false);
        }
    }, [currentPage, limit, sortBy, sortOrder, searchQuery, statusFilter]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchAccounts();
        }, searchQuery ? 500 : 0);
        return () => clearTimeout(timer);
    }, [fetchAccounts, searchQuery]);

    const fetchAccountingCodes = useCallback(async () => {
        try {
            const res = await getAllAccountingCodes({ limit: 1000 });
            const list = Array.isArray(res) ? res : (res?.data || []);
            setAccountingCodes(list);
        } catch (err) {
            console.error('Failed to load accounting codes', err);
        }
    }, []);

    useEffect(() => {
        fetchAccountingCodes();
    }, [fetchAccountingCodes]);

    const filteredCodes = useMemo(() => {
        return accountingCodes.filter((code: any) => {
            if (formData.accountType === 'Credit Card') {
                return code.accountType === 'Credit Card' || 
                       (code.category === 'LIABILITY' && (code.accountType?.includes('Credit Card') || code.accountType?.includes('Liability')));
            } else {
                return code.accountType === 'Bank' || 
                       (code.category === 'ASSET' && (code.accountType === 'Bank' || code.code?.startsWith('1.1.02')));
            }
        });
    }, [accountingCodes, formData.accountType]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                accountHolderName: formData.accountHolderName || 'Ola Cars Corporate'
            };
            if (editingAccount) {
                await updateBankAccount(editingAccount._id, payload);
                toast.success('Account updated successfully');
            } else {
                await createBankAccount(payload);
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
        } catch {
            toast.error('Failed to delete account');
        }
    };

    const handleEdit = (account: BankAccount) => {
        setEditingAccount(account);
        const codeId = account.accountingCode?._id || account.accountingCode || 'NEW';
        setSelectedCodeId(typeof codeId === 'string' ? codeId : codeId.toString());
        setFormData({
            bankName: account.bankName,
            accountNumber: account.accountNumber,
            accountHolderName: account.accountHolderName || 'Ola Cars Corporate',
            swiftCode: account.swiftCode || '',
            ifscCode: account.ifscCode || '',
            branchName: account.branchName || '',
            currency: account.currency,
            initialBalance: account.initialBalance,
            accountType: account.accountType || 'Bank',
            accountName: account.accountName || '',
            accountCode: account.accountCode || '',
            description: account.description || ''
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setEditingAccount(null);
        setSelectedCodeId('NEW');
        setFormData({
            bankName: '',
            accountNumber: '',
            accountHolderName: 'Ola Cars Corporate',
            swiftCode: '',
            ifscCode: '',
            branchName: '',
            currency: 'USD',
            initialBalance: 0,
            accountType: 'Bank',
            accountName: '',
            accountCode: '',
            description: ''
        });
    };

    const handleSort = (field: 'bankName' | 'accountHolderName' | 'currentBalance' | 'createdAt') => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
        setCurrentPage(1);
    };

    const SortIcon = ({ field }: { field: 'bankName' | 'accountHolderName' | 'currentBalance' | 'createdAt' }) => {
        if (sortBy !== field) return <ChevronDown size={10} className="opacity-20 ml-1 inline-block" />;
        return <span className={`inline-block ml-1 transition-transform duration-200 ${sortOrder === 'asc' ? 'rotate-180' : ''}`}><ChevronDown size={14} style={{ color: 'var(--brand-lime)' }} /></span>;
    };

    const handlePageChange = (newPage: number) => {
        if (pagination && newPage >= 1 && newPage <= pagination.totalPages) {
            setCurrentPage(newPage);
        }
    };

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



            {/* Filtering Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center p-2 rounded-[2rem] border w-full" style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)' }}>
                <div className="relative flex-1 w-full group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-dim group-focus-within:text-lime transition-colors" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search by institution name, holder, or account fragments..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full bg-transparent py-5 pl-16 pr-6 text-sm font-medium outline-none transition-all placeholder:text-gray-500"
                        style={{ color: 'var(--text-main)' }}
                    />
                </div>
                <div className="px-6 border-l flex items-center gap-3" style={{ borderColor: 'var(--border-main)' }}>
                    <span className="text-[10px] font-black uppercase tracking-wider text-dim">Status:</span>
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value as any);
                            setCurrentPage(1);
                        }}
                        className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                        style={{ color: 'var(--text-main)' }}
                    >
                        <option value="ALL">All Accounts</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Accounts Workspace (Tabular Form) */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-6">
                    <div className="w-16 h-16 border-4 border-lime border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--brand-lime)', borderTopColor: 'transparent' }} />
                    <p className="text-[10px] text-lime font-black uppercase tracking-[0.4em]" style={{ color: 'var(--brand-lime)' }}>Querying Bank API...</p>
                </div>
            ) : accounts.length > 0 ? (
                <div className="rounded-[2rem] border overflow-hidden transition-all shadow-2xl shadow-black/20" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-dim">Account Details</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-dim">Bank & Number</th>
                                    <th className="px-6 py-5">
                                        <button onClick={() => handleSort('currentBalance')} className="flex items-center justify-end w-full gap-1.5 text-[10px] font-black uppercase tracking-widest text-dim outline-none hover:text-lime transition-colors">
                                            Balance <SortIcon field="currentBalance" />
                                        </button>
                                    </th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-dim text-center">Status</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-dim text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                {accounts.map((account) => (
                                    <tr key={account._id} className="hover:bg-lime/5 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center text-lime font-black border border-lime/10">
                                                    <Building2 size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{account.accountName || account.bankName}</p>
                                                    <p className="text-[10px] font-bold text-dim flex items-center gap-1.5 mt-0.5">
                                                        <span className="font-mono text-[9px] px-1.5 py-0.5 bg-white/5 border border-white/10 rounded">{account.accountCode || '—'}</span>
                                                        <span className="uppercase text-[9px] tracking-wider text-lime">{account.accountType || 'Bank'}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{account.bankName}</p>
                                            <p className="text-xs font-mono font-bold text-dim mt-0.5">{account.accountNumber}</p>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <span className="text-[10px] font-black text-lime mr-1">{account.currency}</span>
                                            <span className="text-md font-black" style={{ color: 'var(--text-main)' }}>{account.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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
                                                    onClick={() => handleViewTransactions(account)}
                                                    className="p-2 rounded-lg bg-white/5 text-dim hover:text-lime hover:bg-lime/10 transition-all border border-transparent hover:border-lime/20 cursor-pointer"
                                                    style={{ background: 'var(--bg-input)' }}
                                                    title="View Transactions"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleEdit(account)}
                                                    className="p-2 rounded-lg bg-white/5 text-dim hover:text-lime hover:bg-lime/10 transition-all border border-transparent hover:border-lime/20 cursor-pointer"
                                                    style={{ background: 'var(--bg-input)' }}
                                                    title="Edit Account"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(account._id)}
                                                    className="p-2 rounded-lg bg-white/5 text-dim hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20 cursor-pointer"
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

                    {/* Pagination footer */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="px-6 py-4 border-t flex items-center justify-between gap-4" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                            <div className="text-[11px] font-bold uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>
                                Showing <span className="text-lime font-black">{accounts.length}</span> of <span className="text-white font-black">{pagination.total}</span> records
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1 || loading}
                                    className="p-2 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                                    style={{ color: 'var(--text-main)' }}
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-black/20 rounded-xl border border-white/5">
                                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                        let pageNum = currentPage;
                                        if (pagination.totalPages <= 5) pageNum = i + 1;
                                        else if (currentPage <= 3) pageNum = i + 1;
                                        else if (currentPage >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                                        else pageNum = currentPage - 2 + i;
                                        
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => handlePageChange(pageNum)}
                                                className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${currentPage === pageNum ? 'bg-lime text-black' : 'hover:bg-white/5 opacity-50'}`}
                                                style={{ color: currentPage === pageNum ? '#000' : 'var(--text-main)', backgroundColor: currentPage === pageNum ? 'var(--brand-lime)' : '' }}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>
                                
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === pagination.totalPages || loading}
                                    className="p-2 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                                    style={{ color: 'var(--text-main)' }}
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
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
                    <div className="absolute inset-0" onClick={() => setIsModalOpen(false)} />
                    <div className="relative border-t-4 border-x border-b rounded-[2rem] w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in duration-300 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)]"
                        style={{ 
                            background: 'var(--bg-card)', 
                            borderColor: 'var(--border-main)', 
                            borderTopColor: 'var(--brand-lime)'
                        }}
                    >
                        <div className="p-8 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}>
                            <div>
                                <h2 className="text-lg font-black" style={{ color: 'var(--text-main)' }}>{editingAccount ? 'Update Parameters' : 'Account Registration'}</h2>
                                <p className="text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: 'var(--brand-lime)' }}>Financial Endpoint Configuration</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2.5 hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition-all" style={{ color: 'var(--text-dim)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <label className="sm:w-36 text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: 'var(--text-dim)' }}>Account Type</label>
                                    <div className="flex-1">
                                        <select 
                                            value={formData.accountType}
                                            onChange={e => {
                                                const type = e.target.value as any;
                                                setSelectedCodeId('NEW');
                                                setFormData(prev => ({ 
                                                    ...prev, 
                                                    accountType: type,
                                                    accountCode: '',
                                                    accountName: '',
                                                    currency: 'USD'
                                                }));
                                            }}
                                            className="w-full border rounded-2xl px-4 py-3 text-sm font-bold focus:border-lime outline-none transition-all appearance-none"
                                            style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                        >
                                            <option value="Bank">Bank</option>
                                            <option value="Credit Card">Credit Card</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:col-span-2">
                                    <label className="sm:w-36 text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: 'var(--text-dim)' }}>Chart of Accounts</label>
                                    <div className="flex-1">
                                        <select 
                                            value={selectedCodeId}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setSelectedCodeId(val);
                                                if (val === 'NEW') {
                                                    setFormData(prev => ({ ...prev, accountCode: '', accountName: '', currency: 'USD' }));
                                                } else {
                                                    const matched = filteredCodes.find((c: any) => c._id === val);
                                                    if (matched) {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            accountCode: matched.code,
                                                            accountName: matched.name,
                                                            currency: matched.currency || 'USD'
                                                        }));
                                                    }
                                                }
                                            }}
                                            className="w-full border rounded-2xl px-4 py-3 text-sm font-bold focus:border-lime outline-none transition-all appearance-none"
                                            style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                        >
                                            <option value="NEW">-- Create New Accounting Code --</option>
                                            {filteredCodes.map(code => (
                                                <option key={code._id} value={code._id}>{code.code} - {code.name} ({code.currency || 'USD'})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <label className="sm:w-36 text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: 'var(--text-dim)' }}>Account Code</label>
                                    <div className="flex-1">
                                        <input 
                                            required
                                            type="text" 
                                            placeholder="e.g. 1020"
                                            value={formData.accountCode}
                                            onChange={e => setFormData({ ...formData, accountCode: e.target.value })}
                                            disabled={selectedCodeId !== 'NEW'}
                                            className="w-full border rounded-2xl px-4 py-3 text-sm font-mono font-bold focus:border-lime outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                            style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <label className="sm:w-36 text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: 'var(--text-dim)' }}>Account Name</label>
                                    <div className="flex-1">
                                        <input 
                                            required
                                            type="text" 
                                            placeholder="e.g. Chase Operations Checking"
                                            value={formData.accountName}
                                            onChange={e => setFormData({ ...formData, accountName: e.target.value })}
                                            disabled={selectedCodeId !== 'NEW'}
                                            className="w-full border rounded-2xl px-4 py-3 text-sm font-medium focus:border-lime outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                            style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <label className="sm:w-36 text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: 'var(--text-dim)' }}>Base Currency</label>
                                    <div className="flex-1">
                                        <select 
                                            value={formData.currency}
                                            onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                            className="w-full border rounded-2xl px-4 py-3 text-sm font-bold focus:border-lime outline-none transition-all appearance-none"
                                            style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                        >
                                            <option value="USD">USD - US Dollar</option>
                                            <option value="EUR">EUR - Euro</option>
                                            <option value="GBP">GBP - British Pound</option>
                                            <option value="AED">AED - UAE Dirham</option>
                                            <option value="INR">INR - Indian Rupee</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <label className="sm:w-36 text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: 'var(--text-dim)' }}>Bank Name</label>
                                    <div className="flex-1">
                                        <input 
                                            required
                                            type="text" 
                                            placeholder="e.g. JPMorgan Chase"
                                            value={formData.bankName}
                                            onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                                            className="w-full border rounded-2xl px-4 py-3 text-sm font-medium focus:border-lime outline-none transition-all"
                                            style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <label className="sm:w-36 text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: 'var(--text-dim)' }}>Account Number</label>
                                    <div className="flex-1">
                                        <input 
                                            required
                                            type="text" 
                                            placeholder="Identification / Card / Account Number"
                                            value={formData.accountNumber}
                                            onChange={e => setFormData({ ...formData, accountNumber: e.target.value })}
                                            className="w-full border rounded-2xl px-4 py-3 text-sm font-mono font-bold focus:border-lime outline-none transition-all"
                                            style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <label className="sm:w-36 text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: 'var(--text-dim)' }}>IFSC/SWIFT Routing</label>
                                    <div className="flex-1">
                                        <input 
                                            type="text" 
                                            placeholder="Routing Code"
                                            value={formData.ifscCode}
                                            onChange={e => setFormData({ ...formData, ifscCode: e.target.value, swiftCode: e.target.value })}
                                            className="w-full border rounded-2xl px-4 py-3 text-sm font-mono font-bold focus:border-lime outline-none transition-all"
                                            style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <label className="sm:w-36 text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: 'var(--text-dim)' }}>Initial Balance</label>
                                    <div className="flex-1 relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-lime font-black" style={{ color: 'var(--brand-lime)' }}>$</div>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            placeholder="0.00"
                                            value={formData.initialBalance ?? 0}
                                            onChange={e => setFormData({ ...formData, initialBalance: e.target.value === '' ? 0 : Number(e.target.value) })}
                                            className="w-full border rounded-2xl pl-8 pr-4 py-3 text-sm font-mono font-bold focus:border-lime outline-none transition-all"
                                            style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <label className="sm:w-36 text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: 'var(--text-dim)' }}>Branch Allocation</label>
                                    <div className="flex-1">
                                        <input 
                                            type="text" 
                                            placeholder="Primary Headquarters"
                                            value={formData.branchName}
                                            onChange={e => setFormData({ ...formData, branchName: e.target.value })}
                                            className="w-full border rounded-2xl px-4 py-3 text-sm font-medium focus:border-lime outline-none transition-all"
                                            style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 md:col-span-2">
                                    <label className="sm:w-36 text-[10px] font-black uppercase tracking-widest shrink-0" style={{ color: 'var(--text-dim)' }}>Legal Beneficiary</label>
                                    <div className="flex-1">
                                        <input 
                                            required
                                            type="text" 
                                            placeholder="Corporate Entity Name"
                                            value={formData.accountHolderName}
                                            onChange={e => setFormData({ ...formData, accountHolderName: e.target.value })}
                                            className="w-full border rounded-2xl px-4 py-3 text-sm font-medium focus:border-lime outline-none transition-all"
                                            style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-start gap-3 md:col-span-2">
                                    <label className="sm:w-36 text-[10px] font-black uppercase tracking-widest shrink-0 sm:mt-3" style={{ color: 'var(--text-dim)' }}>Description / Notes</label>
                                    <div className="flex-1">
                                        <textarea 
                                            placeholder="Enter account description or notes..."
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full border rounded-2xl px-4 py-3 text-sm font-medium focus:border-lime outline-none transition-all"
                                            style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 flex gap-4">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-4 bg-white/5 text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-white/10 transition-all border"
                                    style={{ color: 'var(--text-dim)', borderColor: 'var(--border-main)' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-[2] py-4 bg-lime text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-lime/10"
                                    style={{ backgroundColor: 'var(--brand-lime)' }}
                                >
                                    {submitting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <><Save size={18} /> {editingAccount ? 'Commit Changes' : 'Initialize Account'}</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Transactions Modal */}
            {isTxModalOpen && selectedAccountForTx && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60" onClick={() => setIsTxModalOpen(false)} />
                    <div className="relative border-t-4 border-x border-b rounded-[2rem] w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in duration-300 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] flex flex-col"
                        style={{ 
                            background: 'var(--bg-card)', 
                            borderColor: 'var(--border-main)', 
                            borderTopColor: 'var(--brand-lime)',
                            height: '80vh'
                        }}
                    >
                        {/* Header */}
                        <div className="p-8 border-b flex justify-between items-center flex-shrink-0" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}>
                            <div>
                                <h2 className="text-lg font-black" style={{ color: 'var(--text-main)' }}>
                                    {selectedAccountForTx.accountName || selectedAccountForTx.bankName} Transactions
                                </h2>
                                <p className="text-[10px] font-black uppercase tracking-widest mt-1" style={{ color: 'var(--brand-lime)' }}>
                                    Ledger Entries — Code {selectedAccountForTx.accountCode || '—'} ({selectedAccountForTx.currency})
                                </p>
                            </div>
                            <button onClick={() => setIsTxModalOpen(false)} className="p-2.5 hover:bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition-all cursor-pointer" style={{ color: 'var(--text-dim)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                            
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-5 border rounded-2xl" style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)' }}>
                                    <p className="text-[9px] font-black uppercase tracking-wider text-dim">Total Debits (Inflow)</p>
                                    <p className="text-xl font-black mt-1 text-green-500">
                                        + {selectedAccountForTx.currency} {txSummary.totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="p-5 border rounded-2xl" style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)' }}>
                                    <p className="text-[9px] font-black uppercase tracking-wider text-dim">Total Credits (Outflow)</p>
                                    <p className="text-xl font-black mt-1 text-red-500">
                                        - {selectedAccountForTx.currency} {txSummary.totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="p-5 border rounded-2xl" style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)' }}>
                                    <p className="text-[9px] font-black uppercase tracking-wider text-dim">Net Movement</p>
                                    <p className="text-xl font-black mt-1" style={{ color: 'var(--text-main)' }}>
                                        {selectedAccountForTx.currency} {txSummary.netMovement.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>

                            {/* Filters */}
                            <div className="flex flex-col sm:flex-row gap-4 items-center p-2 rounded-2xl border" style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)' }}>
                                <div className="relative flex-1 w-full group">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dim group-focus-within:text-lime transition-colors" size={16} />
                                    <input 
                                        type="text" 
                                        placeholder="Search description..."
                                        value={txSearch}
                                        onChange={(e) => {
                                            setTxSearch(e.target.value);
                                            setTxPage(1);
                                        }}
                                        className="w-full bg-transparent py-2 pl-10 pr-4 text-xs font-medium outline-none transition-all placeholder:text-gray-500 animate-none"
                                        style={{ color: 'var(--text-main)' }}
                                    />
                                </div>
                                <div className="px-4 border-l flex items-center gap-2" style={{ borderColor: 'var(--border-main)' }}>
                                    <span className="text-[9px] font-black uppercase tracking-wider text-dim">Type:</span>
                                    <select
                                        value={txTypeFilter}
                                        onChange={(e) => {
                                            setTxTypeFilter(e.target.value as any);
                                            setTxPage(1);
                                        }}
                                        className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                                        style={{ color: 'var(--text-main)' }}
                                    >
                                        <option value="ALL">All</option>
                                        <option value="DEBIT">Debit (Inflow)</option>
                                        <option value="CREDIT">Credit (Outflow)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Transactions Table */}
                            {txLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <Loader2 className="w-10 h-10 animate-spin text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                                    <p className="text-[10px] text-lime font-black uppercase tracking-[0.2em]" style={{ color: 'var(--brand-lime)' }}>Loading Transactions...</p>
                                </div>
                            ) : txEntries.length > 0 ? (
                                <div className="border rounded-2xl overflow-hidden" style={{ borderColor: 'var(--border-main)' }}>
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}>
                                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-dim">Date</th>
                                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-dim">Description</th>
                                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-dim text-right">Debit (Inflow)</th>
                                                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-dim text-right">Credit (Outflow)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                            {txEntries.map((entry) => (
                                                <tr key={entry._id} className="hover:bg-white/5 transition-colors text-xs">
                                                    <td className="px-6 py-4 font-bold text-dim">
                                                        {new Date(entry.entryDate || entry.date).toLocaleDateString(undefined, {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric'
                                                        })}
                                                    </td>
                                                    <td className="px-6 py-4 font-medium" style={{ color: 'var(--text-main)' }}>
                                                        {entry.description}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-green-500 font-bold">
                                                        {entry.type === 'DEBIT' ? `+ ${entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right text-red-500 font-bold">
                                                        {entry.type === 'CREDIT' ? `- ${entry.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-20 border border-dashed rounded-2xl" style={{ borderColor: 'var(--border-main)' }}>
                                    <p className="text-xs font-bold text-dim">No transactions found for this account.</p>
                                </div>
                            )}

                            {/* Pagination */}
                            {txPagination && txPagination.totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-dim">
                                        Page {txPage} of {txPagination.totalPages}
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setTxPage(prev => Math.max(prev - 1, 1))}
                                            disabled={txPage === 1}
                                            className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-[10px] font-bold transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                            style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setTxPage(prev => Math.min(prev + 1, txPagination.totalPages))}
                                            disabled={txPage === txPagination.totalPages}
                                            className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-[10px] font-bold transition-all disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                                            style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageBankAccounts;
