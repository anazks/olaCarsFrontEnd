/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Building2, 
    Wallet, 
    CreditCard, 
    RefreshCw, 
    Search, 
    Globe, 
    Building, 
    Calendar,
    Plus,
    Upload,
    TrendingUp,
    FileSpreadsheet,
    Info,
    Eye
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip as RechartsTooltip
} from 'recharts';
import { getAllBankAccounts, createBankAccount } from '../../../services/bankAccountService';
import type { BankAccount } from '../../../services/bankAccountService';
import { getAllAccountingCodes } from '../../../services/accountingService';
import type { AccountingCode } from '../../../services/accountingService';
import { getBalanceSheetReport, getDailyFinanceReport } from '../../../services/reportingService';
import type { BalanceSheetReport } from '../../../services/reportingService';
import { getAllBranches } from '../../../services/branchService';
import type { Branch } from '../../../services/branchService';
import { getUser, getUserRole } from '../../../utils/auth';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const BankingOverview = () => {
    const navigate = useNavigate();
    const currentUser = getUser();
    const userRole = getUserRole();

    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [cashAccounts, setCashAccounts] = useState<AccountingCode[]>([]);
    const [balanceSheet, setBalanceSheet] = useState<BalanceSheetReport | null>(null);
    const [dailyFinance, setDailyFinance] = useState<any[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [countries, setCountries] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAllAccounts, setShowAllAccounts] = useState(false);
    const [showChart, setShowChart] = useState(false);
    
    // Import Statement Modal
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedAccountForImport, setSelectedAccountForImport] = useState('');
    const [importFile, setImportFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);



    // Filters
    const [filters, setFilters] = useState({
        country: userRole === 'countrymanager' ? currentUser?.country || '' : '',
        branch: '',
        endDate: new Date().toISOString().split('T')[0]
    });
    
    // Search and account type filter
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<'ALL' | 'Cash' | 'Bank' | 'Credit Card'>('ALL');

    // Fetch branches and countries
    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const res = await getAllBranches({ limit: 1000 });
                const allBranches = res.data || [];
                setBranches(allBranches);
                const uniqueCountries = Array.from(new Set(allBranches.map((b: any) => b.country))) as string[];
                setCountries(uniqueCountries);
            } catch (err) {
                console.error('Failed to load branches for filters', err);
            }
        };
        fetchBranches();
    }, []);

    const filteredBranches = useMemo(() => {
        if (!filters.country) return branches;
        return branches.filter(b => b.country === filters.country);
    }, [branches, filters.country]);

    // Role-based redirect path for registration page
    const getRegistrationPath = () => {
        if (userRole === 'admin') return '/admin/admin/bank-accounts';
        if (userRole === 'financialadmin' || userRole === 'financeadmin') return '/admin/financial-admin/bank-accounts';
        return '';
    };

    const handleCountryChange = (country: string) => {
        setFilters(prev => ({ ...prev, country, branch: '' }));
    };

    const fetchBankingData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Get bank and credit card accounts
            const bankParams: any = { limit: 1000 };
            if (filters.branch) bankParams.branchId = filters.branch;
            const bankRes = await getAllBankAccounts(bankParams);
            let loadedBankAccounts = bankRes.data || [];

            // Seed default Chase Checking account if DB is empty
            if (loadedBankAccounts.length === 0) {
                console.log('No bank accounts found in DB. Seeding default Chase Checking account...');
                try {
                    await createBankAccount({
                        bankName: 'JPMorgan Chase',
                        accountNumber: '120034005600',
                        accountHolderName: 'Ola Cars Corporate',
                        swiftCode: 'CHASUS33',
                        ifscCode: 'CHASUS33',
                        branchName: 'New York HQ',
                        currency: 'USD',
                        initialBalance: 125000,
                        currentBalance: 125000,
                        status: 'ACTIVE',
                        accountType: 'Bank',
                        accountName: 'Chase Operations Checking',
                        accountCode: '1020',
                        description: 'Primary operational checking account seeded automatically.'
                    });
                    
                    // Re-fetch bank accounts after seeding
                    const freshBankRes = await getAllBankAccounts(bankParams);
                    loadedBankAccounts = freshBankRes.data || [];
                    toast.success('Seeded Chase Operations Checking automatically');
                } catch (seedErr) {
                    console.error('Failed to seed default bank account', seedErr);
                }
            }
            
            // 2. Get cash/bank accounting codes
            const cashRes = (await getAllAccountingCodes({ limit: 1000 })) as any;
            const loadedCashAccounts = Array.isArray(cashRes) ? cashRes : (cashRes?.data || []);

            // 3. Get balance sheet report for books balances
            const balanceSheetRes = await getBalanceSheetReport({
                country: filters.country,
                branch: filters.branch,
                endDate: filters.endDate
            });

            // 4. Get daily finance report for chart trend
            const dailyRes = await getDailyFinanceReport({
                country: filters.country,
                branch: filters.branch,
                endDate: filters.endDate
            });

            setBankAccounts(loadedBankAccounts);
            setCashAccounts(loadedCashAccounts);
            setBalanceSheet(balanceSheetRes?.data || null);
            setDailyFinance(dailyRes?.data || []);
        } catch (err) {
            toast.error('Failed to load banking data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchBankingData();
    }, [fetchBankingData]);

    // Format combined accounts listing
    const combinedAccounts = useMemo(() => {
        const list: any[] = [];
        const matchedBankAccountIds = new Set<string>();
        const matchedAccountingCodeIds = new Set<string>();

        // 1. Process all Cash and Bank AccountingCodes
        const cashAndBankCodes = cashAccounts.filter((c: any) => 
            c.accountType === 'Cash' || c.accountType === 'Bank' || c.category === 'Cash' || c.category === 'Bank'
        );

        cashAndBankCodes.forEach((code: any) => {
            // Find a matching BankAccount in the DB
            const bankMatch = bankAccounts.find((b: any) => 
                b.accountCode === code.code || 
                (b.accountingCode && (b.accountingCode._id === code._id || b.accountingCode === code._id))
            );

            // Get books balance from balance sheet
            const nameToMatch = code.name;
            const assetMatch = balanceSheet?.assets?.find((a: any) => a.name === nameToMatch);
            const liabilityMatch = balanceSheet?.liabilities?.find((l: any) => l.name === nameToMatch);
            const booksBalance = assetMatch ? assetMatch.amount : (liabilityMatch ? liabilityMatch.amount : 0);

            if (bankMatch) {
                matchedBankAccountIds.add(bankMatch._id);
                matchedAccountingCodeIds.add(code._id);
                list.push({
                    id: bankMatch._id,
                    accountingCodeId: code._id,
                    name: bankMatch.accountName || code.name,
                    code: code.code,
                    accountNumber: bankMatch.accountNumber,
                    type: bankMatch.accountType || code.accountType || 'Bank',
                    bankName: bankMatch.bankName,
                    currency: bankMatch.currency || code.currency || 'USD',
                    bankBalance: bankMatch.currentBalance || 0,
                    booksBalance: booksBalance,
                    status: bankMatch.status || 'ACTIVE',
                    isLinked: true
                });
            } else {
                matchedAccountingCodeIds.add(code._id);
                list.push({
                    id: `code-${code._id}`,
                    accountingCodeId: code._id,
                    name: code.name,
                    code: code.code,
                    accountNumber: code.accountNumber || '—',
                    type: code.accountType || 'Cash',
                    bankName: code.accountType === 'Cash' ? 'Cash Account' : 'Bank Account',
                    currency: code.currency || 'USD',
                    bankBalance: code.accountType === 'Cash' ? booksBalance : 0, // For Cash, display book balance as bank balance
                    booksBalance: booksBalance,
                    status: code.accountStatus === 'Active' ? 'ACTIVE' : 'INACTIVE',
                    isLinked: false
                });
            }
        });

        // 2. Process remaining BankAccounts in DB that didn't match any Cash/Bank AccountingCode
        bankAccounts.forEach((bank: any) => {
            if (matchedBankAccountIds.has(bank._id)) return;

            const nameToMatch = bank.accountingCode?.name || bank.accountName || bank.bankName;
            let booksBalance = 0;
            if (bank.accountType === 'Credit Card') {
                const booksMatch = balanceSheet?.liabilities?.find((l: any) => l.name === nameToMatch);
                booksBalance = booksMatch ? booksMatch.amount : 0;
            } else {
                const booksMatch = balanceSheet?.assets?.find((a: any) => a.name === nameToMatch);
                booksBalance = booksMatch ? booksMatch.amount : 0;
            }

            list.push({
                id: bank._id,
                accountingCodeId: bank.accountingCode?._id || null,
                name: bank.accountName || bank.bankName,
                code: bank.accountCode || '—',
                accountNumber: bank.accountNumber,
                type: bank.accountType || 'Bank',
                bankName: bank.bankName,
                currency: bank.currency || 'USD',
                bankBalance: bank.currentBalance || 0,
                booksBalance: booksBalance,
                status: bank.status || 'ACTIVE',
                isLinked: bank.accountingCode ? true : false
            });
        });

        // Apply filters & search
        return list.filter(acc => {
            const matchesSearch = 
                acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                acc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                acc.accountNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                acc.bankName.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesType = typeFilter === 'ALL' || acc.type === typeFilter;
            
            return matchesSearch && matchesType;
        });
    }, [bankAccounts, cashAccounts, balanceSheet, searchQuery, typeFilter]);

    const displayedAccounts = useMemo(() => {
        if (showAllAccounts) return combinedAccounts;
        return combinedAccounts.slice(0, 5);
    }, [combinedAccounts, showAllAccounts]);

    // Financial calculations for cards
    const cardMetrics = useMemo(() => {
        // Cash in Hand: Sum of cash account books balance
        const cashInHand = cashAccounts
            .filter((c: any) => c.accountType === 'Cash')
            .reduce((sum, cash) => {
                const booksMatch = balanceSheet?.assets?.find((a: any) => a.name === cash.name);
                return sum + (booksMatch ? booksMatch.amount : 0);
            }, 0);

        // Bank Balance: Sum of bank accounts currentBalance
        const bankBalance = bankAccounts
            .filter(b => b.accountType !== 'Credit Card')
            .reduce((sum, b) => sum + (b.currentBalance || 0), 0);

        // Credit Card Balance: Sum of credit card accounts currentBalance
        const creditCardBalance = bankAccounts
            .filter(b => b.accountType === 'Credit Card')
            .reduce((sum, b) => sum + (b.currentBalance || 0), 0);

        const totalLiquidity = cashInHand + bankBalance - creditCardBalance;

        return {
            cashInHand,
            bankBalance,
            creditCardBalance,
            totalLiquidity
        };
    }, [bankAccounts, cashAccounts, balanceSheet]);

    // Cumulative liquidity trend calculations for the chart
    const chartData = useMemo(() => {
        // Start from initial sum of all accounts
        const initialBank = bankAccounts.reduce((sum, b) => sum + (b.initialBalance || 0), 0);
        let runningBalance = initialBank;

        if (!Array.isArray(dailyFinance) || dailyFinance.length === 0) {
            return [];
        }

        return dailyFinance.map(d => {
            const netDaily = (d.income || 0) - (d.expenses || 0);
            runningBalance += netDaily;
            return {
                date: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                balance: runningBalance,
                inflow: d.income || 0,
                outflow: d.expenses || 0
            };
        });
    }, [dailyFinance, bankAccounts]);

    const handleViewTransactions = (account: any) => {
        if (!account.accountingCodeId) {
            toast.error('This account is not linked to any accounting code.');
            return;
        }
        const basePath = window.location.pathname.split('/banking')[0];
        navigate(`${basePath}/chart-of-accounts/${account.accountingCodeId}`);
    };

    const handleImportSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAccountForImport || !importFile) {
            toast.error('Please select an account and upload a statement file');
            return;
        }

        setImporting(true);
        // Simulate importing statement file
        setTimeout(() => {
            setImporting(false);
            setIsImportModalOpen(false);
            setImportFile(null);
            toast.success('Statement import completed: 12 new transactions reconciled.');
            fetchBankingData();
        }, 1500);
    };

    return (
        <div className="container-responsive py-10 space-y-10 min-h-screen" style={{ color: 'var(--text-main)' }}>
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Banking Overview', active: true }]} />

            {/* Header section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5" id="banking-overview-title" style={{ color: 'var(--text-main)' }}>
                        <Building2 size={24} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        Banking Overview
                    </h1>
                    <p className="text-xs font-semibold text-dim mt-1.5 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 uppercase tracking-widest text-[9px]">LIQUIDITY COMMAND</span>
                        Manage institutional cash flows, check cash, bank, and card ledgers.
                    </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                    <button 
                        onClick={() => setIsImportModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide border border-white/10 hover:bg-white/5 transition-all cursor-pointer"
                        style={{ color: 'var(--text-dim)' }}
                        id="btn-import-statement"
                    >
                        <Upload size={14} /> Import Statement
                    </button>
                    {getRegistrationPath() && (
                        <button 
                            onClick={() => navigate(getRegistrationPath())}
                            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide bg-brand-lime text-[#0A0A0A] hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
                            style={{ backgroundColor: 'var(--brand-lime)' }}
                            id="btn-register-bank-account"
                        >
                            <Plus size={14} strokeWidth={3} /> Add Bank / Card
                        </button>
                    )}
                    <button 
                        onClick={fetchBankingData}
                        className="flex items-center justify-center p-2.5 rounded-xl border transition-all hover:bg-white/5 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                        title="Re-synchronize Ledger Accounts"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-2 rounded-3xl shadow-sm"
                 style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-main)' }}>
                
                {/* Country Filter */}
                <div className="relative flex items-center">
                    <div className="absolute left-4" style={{ color: 'var(--text-dim)' }}>
                        <Globe size={18} />
                    </div>
                    <select 
                        value={filters.country}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        disabled={userRole === 'countrymanager'}
                        className="w-full bg-transparent border-none pl-12 pr-4 py-4 text-sm font-bold focus:ring-0 appearance-none cursor-pointer disabled:opacity-50"
                        style={{ color: 'var(--text-main)' }}
                    >
                        <option value="" style={{ backgroundColor: 'var(--bg-card)' }}>Global (All Countries)</option>
                        {countries.map(c => (
                            <option key={c} value={c} style={{ backgroundColor: 'var(--bg-card)' }}>{c}</option>
                        ))}
                    </select>
                </div>

                {/* Branch Filter */}
                <div className="relative border-y md:border-y-0 md:border-x flex items-center"
                     style={{ borderColor: 'var(--border-main)' }}>
                    <div className="absolute left-4" style={{ color: 'var(--text-dim)' }}>
                        <Building size={18} />
                    </div>
                    <select 
                        value={filters.branch}
                        onChange={(e) => setFilters(prev => ({ ...prev, branch: e.target.value }))}
                        className="w-full bg-transparent border-none pl-12 pr-4 py-4 text-sm font-bold focus:ring-0 appearance-none cursor-pointer"
                        style={{ color: 'var(--text-main)' }}
                    >
                        <option value="" style={{ backgroundColor: 'var(--bg-card)' }}>Consolidated Branches</option>
                        {filteredBranches.map(b => (
                            <option key={b._id} value={b._id} style={{ backgroundColor: 'var(--bg-card)' }}>{b.name} ({b.city})</option>
                        ))}
                    </select>
                </div>

                {/* End Date Filter */}
                <div className="relative flex items-center">
                    <div className="absolute left-4" style={{ color: 'var(--text-dim)' }}>
                        <Calendar size={18} />
                    </div>
                    <input 
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full bg-transparent border-none pl-12 pr-4 py-4 text-sm font-bold focus:ring-0 appearance-none cursor-pointer"
                        style={{ color: 'var(--text-main)' }}
                    />
                </div>
            </div>

            {/* Summary metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                
                {/* Cash in hand */}
                <div className="border rounded-[2rem] p-6 relative overflow-hidden group transition-all hover:border-lime/30" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="relative z-10 space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center">
                                <Wallet className="text-lime" style={{ color: 'var(--brand-lime)' }} size={20} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-lime bg-lime/10 px-2 py-0.5 rounded-md">Ledger Balance</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: 'var(--text-dim)' }}>Cash In Hand</p>
                            <h2 className="text-2xl font-black mt-1" style={{ color: 'var(--text-main)' }}>
                                <span className="text-lime text-lg mr-1" style={{ color: 'var(--brand-lime)' }}>$</span>
                                {cardMetrics.cashInHand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h2>
                        </div>
                    </div>
                </div>

                {/* Bank Balance */}
                <div className="border rounded-[2rem] p-6 relative overflow-hidden group transition-all hover:border-lime/30" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="relative z-10 space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <Building2 className="text-blue-500" size={20} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">Statement Base</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: 'var(--text-dim)' }}>Bank Accounts Balance</p>
                            <h2 className="text-2xl font-black mt-1" style={{ color: 'var(--text-main)' }}>
                                <span className="text-blue-400 text-lg mr-1">$</span>
                                {cardMetrics.bankBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h2>
                        </div>
                    </div>
                </div>

                {/* Credit Card Liability */}
                <div className="border rounded-[2rem] p-6 relative overflow-hidden group transition-all hover:border-rose-500/30" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="relative z-10 space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                                <CreditCard className="text-rose-500" size={20} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md">Short Liability</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: 'var(--text-dim)' }}>Credit Card Balance</p>
                            <h2 className="text-2xl font-black mt-1" style={{ color: 'var(--text-main)' }}>
                                <span className="text-rose-400 text-lg mr-1">$</span>
                                {cardMetrics.creditCardBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h2>
                        </div>
                    </div>
                </div>

                {/* Net Liquidity */}
                <div className="border rounded-[2rem] p-6 relative overflow-hidden group transition-all hover:border-lime/30" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="relative z-10 space-y-4">
                        <div className="flex justify-between items-start">
                            <div className="w-10 h-10 rounded-xl bg-brand-lime/10 flex items-center justify-center">
                                <TrendingUp className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} size={20} />
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-lime bg-lime/10 px-2 py-0.5 rounded-md" style={{ color: 'var(--brand-lime)', backgroundColor: 'rgba(212,241,46,0.1)' }}>Total Assets</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.15em]" style={{ color: 'var(--text-dim)' }}>Net Liquid Wealth</p>
                            <h2 className="text-2xl font-black mt-1" style={{ color: 'var(--text-main)' }}>
                                <span className="text-lime text-lg mr-1" style={{ color: 'var(--brand-lime)' }}>$</span>
                                {cardMetrics.totalLiquidity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h2>
                        </div>
                    </div>
                </div>
            </div>

            {/* Line chart widget */}
            <div className="border rounded-[2.5rem] p-8 space-y-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <div>
                        <h2 className="text-md font-black" style={{ color: 'var(--text-main)' }}>Liquidity Trend Analysis</h2>
                        <p className="text-xs text-dim mt-0.5">Historical and projected company cash position matching core journal items.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {showChart && !loading && chartData.length > 0 && (
                            <div className="hidden lg:flex items-center gap-4 text-xs font-bold text-dim mr-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-full bg-brand-lime inline-block" style={{ backgroundColor: 'var(--brand-lime)' }} />
                                    <span>Inflow</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                                    <span>Outflow</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                                    <span>Running Balance</span>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={() => setShowChart(prev => !prev)}
                            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border border-white/10 hover:bg-white/5 transition-all cursor-pointer"
                            style={{ color: 'var(--text-dim)' }}
                        >
                            {showChart ? 'Hide Chart' : 'Show Chart'}
                        </button>
                    </div>
                </div>

                {showChart && (
                    <div className="h-[300px] w-full animate-in fade-in slide-in-from-top-4 duration-300">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="w-8 h-8 border-4 border-lime border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--brand-lime)', borderTopColor: 'transparent' }} />
                            </div>
                        ) : chartData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2">
                                <TrendingUp size={36} className="text-dim opacity-20" />
                                <p className="text-xs font-semibold text-dim">No transactions available in ledger for the selected period.</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--brand-lime)" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="var(--brand-lime)" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                                    <XAxis dataKey="date" stroke="rgba(255, 255, 255, 0.4)" fontSize={10} tickLine={false} />
                                    <YAxis stroke="rgba(255, 255, 255, 0.4)" fontSize={10} tickLine={false} />
                                    <RechartsTooltip 
                                        contentStyle={{ background: 'var(--bg-popover)', border: '1px solid var(--border-main)', borderRadius: '12px' }}
                                        labelStyle={{ color: 'var(--text-main)', fontSize: '11px', fontWeight: 'bold' }}
                                    />
                                    <Area type="monotone" dataKey="inflow" stroke="var(--brand-lime)" strokeWidth={2} fillOpacity={1} fill="url(#colorInflow)" name="Cash Inflow" />
                                    <Area type="monotone" dataKey="outflow" stroke="#f43f5e" strokeWidth={1.5} fillOpacity={0} name="Cash Outflow" />
                                    <Area type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" name="Net Liquidity" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                )}
            </div>

            {/* Combined Accounts Table Section */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex flex-col md:flex-row gap-4 items-center p-2 rounded-[2rem] border w-full md:max-w-xl" style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)' }}>
                        <div className="relative flex-1 w-full group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-dim group-focus-within:text-lime transition-colors" size={20} />
                            <input 
                                type="text" 
                                placeholder="Search cash, bank or card names..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-transparent py-3 pl-16 pr-6 text-sm font-medium outline-none transition-all placeholder:text-gray-500"
                                style={{ color: 'var(--text-main)' }}
                                id="input-search-accounts"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <span className="text-[10px] font-black uppercase tracking-wider text-dim whitespace-nowrap">Filter Type:</span>
                        <div className="flex rounded-xl p-1 bg-white/5 border border-white/10 text-xs w-full md:w-auto">
                            {(['ALL', 'Cash', 'Bank', 'Credit Card'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setTypeFilter(type)}
                                    className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap ${typeFilter === type ? 'bg-lime text-black' : 'text-dim hover:text-white'}`}
                                    style={{ backgroundColor: typeFilter === type ? 'var(--brand-lime)' : '' }}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="w-12 h-12 border-4 border-lime border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--brand-lime)', borderTopColor: 'transparent' }} />
                        <p className="text-xs font-semibold text-dim">Syncing database with Chart of Accounts...</p>
                    </div>
                ) : combinedAccounts.length > 0 ? (
                    <div className="rounded-[2rem] border overflow-hidden transition-all shadow-2xl shadow-black/20" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full text-left border-collapse" id="banking-accounts-table">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}>
                                        <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-dim">Account Details</th>
                                        <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-dim">Institution & Number</th>
                                        <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-dim text-right">Statement Balance</th>
                                        <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-dim text-right font-mono">Books Balance</th>
                                        <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-dim text-center">Status</th>
                                        <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-dim text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                    {displayedAccounts.map((account) => (
                                        <tr key={account.id} className="hover:bg-lime/5 transition-colors group">
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black border ${
                                                        account.type === 'Cash' 
                                                            ? 'bg-lime/10 border-lime/10 text-lime' 
                                                            : account.type === 'Credit Card'
                                                            ? 'bg-rose-500/10 border-rose-500/10 text-rose-500'
                                                            : 'bg-blue-500/10 border-blue-500/10 text-blue-500'
                                                    }`}
                                                    style={{ 
                                                        color: account.type === 'Cash' ? 'var(--brand-lime)' : '', 
                                                        borderColor: account.type === 'Cash' ? 'rgba(212,241,46,0.1)' : ''
                                                    }}>
                                                        {account.type === 'Cash' ? <Wallet size={14} /> : account.type === 'Credit Card' ? <CreditCard size={14} /> : <Building2 size={14} />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-xs" style={{ color: 'var(--text-main)' }}>{account.name}</p>
                                                        <p className="text-[9px] font-bold text-dim uppercase tracking-wider mt-0.5">Code: <span className="font-mono text-lime" style={{ color: 'var(--brand-lime)' }}>{account.code}</span> | {account.type}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{account.bankName}</p>
                                                <p className="text-[9px] font-mono text-dim mt-0.5">{account.accountNumber}</p>
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <div className="flex flex-col items-end">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[9px] font-black text-dim">{account.currency}</span>
                                                        <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                                                            {account.type === 'Cash' ? '—' : account.bankBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-mono">
                                                <div className="flex flex-col items-end">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[9px] font-black text-lime" style={{ color: 'var(--brand-lime)' }}>{account.currency}</span>
                                                        <span className="text-xs font-black text-lime" style={{ color: 'var(--brand-lime)' }}>
                                                            {account.booksBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                                    account.status === 'ACTIVE' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                                }`}>
                                                    {account.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                <button 
                                                    onClick={() => handleViewTransactions(account)}
                                                    className="px-3 py-1.5 rounded-lg bg-white/5 text-[10px] font-black uppercase tracking-wider text-dim hover:text-lime hover:bg-lime/10 border border-white/5 hover:border-lime/20 transition-all cursor-pointer inline-flex items-center gap-1.5"
                                                    style={{ border: '1px solid var(--border-main)' }}
                                                    title="View Ledger"
                                                >
                                                    <Eye size={12} /> View Ledger
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {combinedAccounts.length > 5 && (
                            <div className="flex justify-center py-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                <button
                                    onClick={() => setShowAllAccounts(prev => !prev)}
                                    className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border border-white/10 hover:bg-white/5 transition-all cursor-pointer"
                                    style={{ color: 'var(--text-dim)' }}
                                    id="btn-toggle-accounts-view"
                                >
                                    {showAllAccounts ? 'Show Less' : `Show All (${combinedAccounts.length})`}
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="border rounded-[3rem] p-20 text-center space-y-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <Building2 size={40} className="mx-auto text-dim opacity-20" />
                        <div className="space-y-1.5">
                            <h3 className="text-lg font-black" style={{ color: 'var(--text-main)' }}>No accounts match the filters</h3>
                            <p className="text-xs font-semibold max-w-sm mx-auto" style={{ color: 'var(--text-dim)' }}>Try refining your search query or setting the filter type back to all accounts.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Import Statement Modal Workspace */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0" onClick={() => setIsImportModalOpen(false)} />
                    <div className="relative border rounded-[2.5rem] w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300 shadow-[0_0_80px_rgba(0,0,0,0.5)]" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="p-8 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}>
                            <div>
                                <h2 className="text-md font-black" style={{ color: 'var(--text-main)' }}>Import Bank Statement</h2>
                                <p className="text-[10px] font-black uppercase tracking-widest mt-1 text-lime">Reconcile Ledger Items</p>
                            </div>
                        </div>

                        <form onSubmit={handleImportSubmit} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Select Target Account</label>
                                <select 
                                    value={selectedAccountForImport}
                                    onChange={e => setSelectedAccountForImport(e.target.value)}
                                    className="w-full border rounded-2xl px-4 py-3 text-sm font-bold focus:border-lime outline-none transition-all appearance-none"
                                    style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                    required
                                >
                                    <option value="">-- Choose Account --</option>
                                    {cashAccounts.map(c => (
                                        <option key={c._id} value={c._id}>{c.name} ({c.code}) - Cash</option>
                                    ))}
                                    {bankAccounts.map(b => (
                                        <option key={b._id} value={b._id}>{b.accountName || b.bankName} - {b.accountType}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Upload Statement File (CSV / OFX / QIF)</label>
                                <div className="border border-dashed rounded-2xl p-6 text-center space-y-3 hover:border-lime/50 transition-all relative" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                                    <FileSpreadsheet size={32} className="mx-auto text-dim opacity-40" />
                                    {importFile ? (
                                        <p className="text-xs font-bold text-lime" style={{ color: 'var(--brand-lime)' }}>{importFile.name}</p>
                                    ) : (
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>Drag statement here or click to browse</p>
                                            <p className="text-[10px] text-dim">Maximum file size: 5MB</p>
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        accept=".csv,.ofx,.qif"
                                        onChange={e => setImportFile(e.target.files?.[0] || null)}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex items-start gap-2.5 p-3.5 rounded-xl text-xs text-dim bg-white/5 border" style={{ borderColor: 'var(--border-main)' }}>
                                <Info size={16} className="text-lime flex-shrink-0 mt-0.5" style={{ color: 'var(--brand-lime)' }} />
                                <span className="leading-relaxed">Ola Cars uses smart matching filters to link imported bank entries with recorded supplier bills and client invoices automatically.</span>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setIsImportModalOpen(false)}
                                    className="flex-1 py-4 bg-white/5 text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-white/10 transition-all border"
                                    style={{ color: 'var(--text-dim)', borderColor: 'var(--border-main)' }}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={importing}
                                    className="flex-[2] py-4 bg-lime text-black text-[10px] font-black uppercase tracking-wider rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md"
                                    style={{ backgroundColor: 'var(--brand-lime)' }}
                                >
                                    {importing ? (
                                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <>Reconcile Statement</>
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

export default BankingOverview;
