import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../../../store';
import { setCustomersData } from '../../../../store/dashboardSlice';
import { 
    Users, Search, Filter, ChevronRight, ChevronLeft, RefreshCw, 
    ArrowUpDown, ArrowUp, ArrowDown, DollarSign, FileText, UserPlus,
    X, User, Mail, Phone, MapPin, Building2, Globe, Check
} from 'lucide-react';
import { getAllCustomers, createCustomer, type Customer, type CreateCustomerPayload } from '../../../../services/customerService';
import type { PaginationMetadata } from '../../../../services/driverService';
import { getAllBranches, type Branch } from '../../../../services/branchService';
import Breadcrumbs from '../../../../components/dashboard/shared/Breadcrumbs';
import toast from 'react-hot-toast';

const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

/* ─────────────────────────────────────────────────────────────────────────────
   CREATE CUSTOMER MODAL
   ───────────────────────────────────────────────────────────────────────────── */

interface CreateCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    branches: Branch[];
}

const CreateCustomerModal = ({ isOpen, onClose, onSuccess, branches }: CreateCustomerModalProps) => {
    const [submitting, setSubmitting] = useState(false);

    // Form fields
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [branch, setBranch] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [country, setCountry] = useState('');
    const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

    const resetForm = () => {
        setName(''); setEmail(''); setPhone(''); setWhatsappNumber('');
        setBranch(''); setAddress(''); setCity(''); setState('');
        setCountry(''); setStatus('ACTIVE');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { toast.error('Customer name is required'); return; }
        if (!branch) { toast.error('Please select a branch'); return; }

        setSubmitting(true);
        const toastId = toast.loading('Creating customer...');
        try {
            const payload: CreateCustomerPayload = {
                name: name.trim(),
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                whatsappNumber: whatsappNumber.trim() || undefined,
                branch,
                address: address.trim() || undefined,
                city: city.trim() || undefined,
                state: state.trim() || undefined,
                country: country.trim() || undefined,
                status,
            };
            await createCustomer(payload);
            toast.success('Customer created successfully!', { id: toastId });
            resetForm();
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || err.message || 'Failed to create customer', { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div
                className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] shadow-2xl border animate-in fade-in slide-in-from-bottom-4 duration-300 custom-scrollbar"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
            >
                {/* Modal Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-5 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200,230,0,0.12)', border: '1px solid rgba(200,230,0,0.25)' }}>
                            <UserPlus size={16} style={{ color: 'var(--brand-lime)' }} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>New Customer</h2>
                            <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--text-dim)' }}>Fill in the details to register a new customer</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-xl border transition-all hover:bg-white/10 active:scale-95"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6">

                    {/* Status Toggle Banner */}
                    <div className="flex items-center justify-between p-4 rounded-2xl border" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Initial Status</p>
                            <p className="text-xs font-bold mt-0.5" style={{ color: 'var(--text-main)' }}>
                                {status === 'ACTIVE' ? 'Customer will be active and visible in all listings' : 'Customer will be created as inactive'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setStatus(s => s === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
                            className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 border ${status === 'ACTIVE' ? 'border-emerald-500/40' : 'border-white/10'}`}
                            style={{ background: status === 'ACTIVE' ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)' }}
                        >
                            <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center ${status === 'ACTIVE' ? 'left-6 bg-emerald-500' : 'left-0.5 bg-white/20'}`}>
                                {status === 'ACTIVE' && <Check size={10} className="text-white" />}
                            </span>
                        </button>
                    </div>

                    {/* ── Section: Identity ── */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                            <User size={12} /> Identity
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Name */}
                            <div className="sm:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                    Full Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Mohammed Al-Rashid"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Section: Contact ── */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                            <Mail size={12} /> Contact Information
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>Email Address</label>
                                <div className="relative">
                                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                                    <input
                                        type="email"
                                        placeholder="customer@example.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>Phone Number</label>
                                <div className="relative">
                                    <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                                    <input
                                        type="tel"
                                        placeholder="+971 50 000 0000"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>WhatsApp Number</label>
                                <div className="relative">
                                    <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                                    <input
                                        type="tel"
                                        placeholder="+971 50 000 0000"
                                        value={whatsappNumber}
                                        onChange={e => setWhatsappNumber(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Section: Branch & Location ── */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                            <Building2 size={12} /> Branch & Location
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Branch */}
                            <div className="sm:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                    Assigned Branch <span className="text-rose-500">*</span>
                                </label>
                                <div className="relative">
                                    <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                                    <select
                                        value={branch}
                                        onChange={e => setBranch(e.target.value)}
                                        required
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border outline-none appearance-none cursor-pointer transition-all"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: branch ? 'var(--text-main)' : 'var(--text-dim)' }}
                                    >
                                        <option value="">Select a branch...</option>
                                        {branches.map(b => (
                                            <option key={b._id} value={b._id}>{b.name} — {b.city || b.country}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Address */}
                            <div className="sm:col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>Street Address</label>
                                <div className="relative">
                                    <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                                    <input
                                        type="text"
                                        placeholder="123 Sheikh Zayed Road"
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>City</label>
                                <input
                                    type="text"
                                    placeholder="Dubai"
                                    value={city}
                                    onChange={e => setCity(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>State / Emirate</label>
                                <input
                                    type="text"
                                    placeholder="Dubai"
                                    value={state}
                                    onChange={e => setState(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-dim)' }}>Country</label>
                                <div className="relative">
                                    <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-dim)' }} />
                                    <input
                                        type="text"
                                        placeholder="United Arab Emirates"
                                        value={country}
                                        onChange={e => setCountry(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Actions ── */}
                    <div className="flex items-center justify-end gap-3 pt-2 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={submitting}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold border transition-all hover:bg-white/5 disabled:opacity-50"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !name.trim() || !branch}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-black transition-all active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ background: 'var(--brand-lime)' }}
                        >
                            {submitting ? (
                                <><RefreshCw size={13} className="animate-spin" /> Creating...</>
                            ) : (
                                <><UserPlus size={13} /> Create Customer</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN CUSTOMERS PAGE
   ───────────────────────────────────────────────────────────────────────────── */

const Customers = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const customersState = useSelector((state: RootState) => state.dashboard.customers);

    const [customers, setCustomers] = useState<Customer[]>(customersState.list);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(!customersState.isLoaded);
    const [error, setError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const isFirstMount = useRef(true);

    const getDefaultStartDate = () => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    const getDefaultEndDate = () => {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    };

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [branchFilter, setBranchFilter] = useState('ALL');
    const [startDate, setStartDate] = useState(getDefaultStartDate());
    const [endDate, setEndDate] = useState(getDefaultEndDate());

    // Sorting State
    const [sortBy, setSortBy] = useState<string>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Pagination State
    const [page, setPage] = useState(1);
    const [limit] = useState(25);
    const [pagination, setPagination] = useState<PaginationMetadata | null>(customersState.pagination);

    const getPageNumbers = () => {
        const totalPages = pagination?.totalPages || 1;
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const pages: (number | string)[] = [];
        pages.push(1);

        let start = Math.max(2, page - 1);
        let end = Math.min(totalPages - 1, page + 1);

        if (page <= 3) { end = 4; }
        if (page >= totalPages - 2) { start = totalPages - 3; }

        if (start > 2) { pages.push('...'); }
        for (let i = start; i <= end; i++) { pages.push(i); }
        if (end < totalPages - 1) { pages.push('...'); }
        pages.push(totalPages);
        return pages;
    };

    // Debounce Search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 350);
        return () => clearTimeout(t);
    }, [searchQuery]);

    // Reset page on filter change
    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, statusFilter, branchFilter, sortBy, sortOrder, startDate, endDate]);

    useEffect(() => {
        const fetchBranchesData = async () => {
            try {
                const data = await getAllBranches();
                setBranches(Array.isArray(data) ? data : (data as any).data || []);
            } catch (error) {
                console.error('Error fetching branches:', error);
            }
        };
        fetchBranchesData();
    }, []);

    const fetchData = useCallback(async (showLoadingSpinner = true) => {
        try {
            if (showLoadingSpinner) setLoading(true);
            setError(null);
            const filters: any = { page, limit, sortBy, sortOrder };

            if (debouncedSearch.trim()) filters.search = debouncedSearch.trim();
            if (statusFilter !== 'ALL') filters.status = statusFilter;
            if (branchFilter !== 'ALL') filters.branch = branchFilter;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;

            const res = await getAllCustomers(filters);
            const customersList = res.data || [];
            setCustomers(customersList);
            setPagination(res.pagination);

            dispatch(setCustomersData({
                list: customersList,
                pagination: res.pagination
            }));
        } catch (error: any) {
            console.error('Error fetching customers:', error);
            setError(error.message || 'Failed to load customers');
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, page, limit, sortBy, sortOrder, statusFilter, branchFilter, startDate, endDate, dispatch]);

    useEffect(() => {
        const cacheAge = Date.now() - (customersState.lastFetched || 0);
        const isCacheFresh = customersState.isLoaded && cacheAge < 5 * 60 * 1000;

        if (isFirstMount.current && isCacheFresh) {
            isFirstMount.current = false;
            setCustomers(customersState.list);
            setPagination(customersState.pagination);
            return;
        }

        const shouldShowLoader = !customersState.isLoaded || !isFirstMount.current;
        fetchData(shouldShowLoader);
        isFirstMount.current = false;
    }, [fetchData]);

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sortBy !== field) return <ArrowUpDown size={10} className="opacity-20 group-hover:opacity-100 transition-opacity" />;
        return sortOrder === 'asc' ? <ArrowUp size={10} className="text-brand-lime" /> : <ArrowDown size={10} className="text-brand-lime" />;
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE':
            case 'APPROVED': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'INACTIVE':
            case 'REJECTED':
            case 'SUSPENDED': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            default: return 'bg-white/5 text-dim border-white/10';
        }
    };

    return (
        <div className="container-responsive space-y-6 pb-12">
            <Breadcrumbs 
                items={[
                    { label: 'Sales', path: '#' },
                    { label: 'Customers', active: true }
                ]} 
            />

            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                    <div>
                        <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                            <Users size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                            Customer Registry
                        </h1>
                        <p className="text-xs font-medium text-dim mt-0.5">Manage and view all registered customers and their financial status</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <button 
                            onClick={() => fetchData(true)} 
                            className="p-2 rounded-xl border transition-all duration-300 hover:bg-white/10 active:scale-95"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        </button>

                        <button
                            onClick={() => navigate('../invoices')}
                            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm hover:bg-white/5 active:scale-95"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <FileText size={14} className="opacity-70" /> Invoices
                        </button>

                        <button
                            onClick={() => navigate('../payments-received')}
                            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm hover:bg-white/5 active:scale-95"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <DollarSign size={14} className="opacity-70" /> Payments
                        </button>

                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="flex items-center justify-center gap-1.5 px-4 py-2 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all duration-300"
                            style={{ background: 'var(--brand-lime)' }}
                        >
                            <UserPlus size={14} /> Add Customer
                        </button>
                    </div>
                </div>

                {/* Filters Section */}
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dim" size={16} />
                            <input
                                type="text"
                                placeholder="Search by name, email, or customer ID..."
                                className="w-full pl-11 pr-4 py-3 rounded-2xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
                                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3">
                            <div className="relative flex-shrink-0">
                                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-dim" size={14} />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="pl-10 pr-8 py-3 border rounded-2xl text-xs font-bold outline-none appearance-none cursor-pointer"
                                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="ALL">ALL STATUSES</option>
                                    {['ACTIVE', 'INACTIVE'].map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="relative flex-shrink-0">
                                <Filter className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-dim" size={14} />
                                <select
                                    value={branchFilter}
                                    onChange={(e) => setBranchFilter(e.target.value)}
                                    className="pl-10 pr-8 py-3 border rounded-2xl text-xs font-bold outline-none appearance-none cursor-pointer"
                                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="ALL">ALL BRANCHES</option>
                                    {branches.map(b => (
                                        <option key={b._id} value={b._id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2 bg-black/5 rounded-2xl px-3 py-1.5 border" style={{ borderColor: 'var(--border-main)' }}>
                            <span className="text-[10px] font-black uppercase text-dim opacity-60">From</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => {
                                    const newStart = e.target.value;
                                    setStartDate(newStart);
                                    if (endDate && newStart && newStart > endDate) { setEndDate(''); }
                                }}
                                className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                                style={{ color: 'var(--text-main)' }}
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-black/5 rounded-2xl px-3 py-1.5 border" style={{ borderColor: 'var(--border-main)' }}>
                            <span className="text-[10px] font-black uppercase text-dim opacity-60">To</span>
                            <input
                                type="date"
                                value={endDate}
                                min={startDate || undefined}
                                onChange={e => setEndDate(e.target.value)}
                                className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                                style={{ color: 'var(--text-main)' }}
                            />
                        </div>
                        {(searchQuery || statusFilter !== 'ALL' || branchFilter !== 'ALL' || startDate !== getDefaultStartDate() || endDate !== getDefaultEndDate()) && (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setStatusFilter('ALL');
                                    setBranchFilter('ALL');
                                    setStartDate(getDefaultStartDate());
                                    setEndDate(getDefaultEndDate());
                                }}
                                className="p-2 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 active:scale-95 transition-all duration-200 cursor-pointer"
                                title="Reset Constraints"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Table Section */}
                <div className="border shadow-lg rounded-[2rem] overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse text-left text-xs select-text">
                            <thead style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                                <tr className="border-b" style={{ borderColor: 'var(--border-main)' }}>
                                    <th className="py-4 px-6 text-left w-10">Sl No.</th>
                                    <th className="py-4 px-6 text-left group cursor-pointer select-none" onClick={() => handleSort('name')}>
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Customer Details <SortIcon field="name" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left group cursor-pointer select-none" onClick={() => handleSort('customerId')}>
                                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Customer ID <SortIcon field="customerId" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-left">
                                        <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Contact Info</div>
                                    </th>
                                    <th className="py-4 px-6 text-left">
                                        <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Branch / Region</div>
                                    </th>
                                    <th className="py-4 px-6 text-center group cursor-pointer select-none" onClick={() => handleSort('status')}>
                                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Status <SortIcon field="status" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-center group cursor-pointer select-none" onClick={() => handleSort('createdAt')}>
                                        <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Registered <SortIcon field="createdAt" />
                                        </div>
                                    </th>
                                    <th className="py-4 px-6 text-right text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-medium" style={{ color: 'var(--text-main)', borderColor: 'var(--border-main)' }}>
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center">
                                            <div className="flex flex-col items-center justify-center gap-3">
                                                <RefreshCw className="animate-spin text-brand-lime" size={28} />
                                                <span className="text-xs font-black tracking-widest text-dim uppercase">Fetching Customers...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center">
                                            <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-6 inline-block">
                                                <p className="text-xs font-black uppercase text-rose-500">{error}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : customers.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(200,230,0,0.08)', border: '1px solid rgba(200,230,0,0.2)' }}>
                                                    <Users size={28} style={{ color: 'var(--brand-lime)' }} />
                                                </div>
                                                <div className="text-dim space-y-1 uppercase">
                                                    <p className="text-xs font-black tracking-widest">No customers found</p>
                                                    <p className="text-[10px] font-semibold normal-case opacity-60">Try adjusting your filters or add a new customer</p>
                                                </div>
                                                <button
                                                    onClick={() => setIsCreateModalOpen(true)}
                                                    className="flex items-center gap-1.5 px-5 py-2.5 text-black font-black text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-all"
                                                    style={{ background: 'var(--brand-lime)' }}
                                                >
                                                    <UserPlus size={13} /> Add First Customer
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    customers.map((customer, index) => (
                                        <tr 
                                            key={customer._id} 
                                            onClick={() => navigate(customer._id)}
                                            className="transition-colors cursor-pointer group"
                                            style={{ borderBottom: '1px solid var(--border-main)' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <td className="py-5 px-6 font-semibold text-dim opacity-50">{(index + 1 + (page - 1) * limit).toString().padStart(2, '0')}</td>
                                            <td className="py-5 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-brand-lime/10 border border-brand-lime/20 flex items-center justify-center flex-shrink-0 shadow-inner">
                                                        <span className="text-brand-lime text-[10px] font-black">
                                                            {customer.name ? customer.name[0].toUpperCase() : 'C'}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-black leading-snug tracking-tight text-white" style={{ color: 'var(--text-main)' }}>
                                                            {customer.name}
                                                        </span>
                                                        <span className="text-[9px] font-black text-dim uppercase tracking-wider mt-0.5 opacity-60">
                                                            Joined {formatDate(customer.createdAt)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 font-black text-brand-lime" style={{ color: 'var(--brand-lime)' }}>
                                                {customer.customerId || 'TEMP-ID'}
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold" style={{ color: 'var(--text-main)' }}>{customer.phone || '—'}</span>
                                                    <span className="text-[9px] text-dim lowercase mt-0.5">{customer.email || '—'}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>
                                                        {customer.branch?.name || 'N/A'}
                                                    </span>
                                                    <span className="text-[9px] font-black uppercase text-dim tracking-widest mt-0.5">
                                                        {customer.branch?.city || customer.branch?.country || 'Global'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-6 text-center">
                                                <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border ${getStatusColor(customer.status)}`}>
                                                    {customer.status}
                                                </span>
                                            </td>
                                            <td className="py-5 px-6 text-center text-dim font-bold">
                                                {formatDate(customer.createdAt)}
                                            </td>
                                            <td className="py-5 px-6 text-right">
                                                <button className="p-2 bg-white/5 border border-white/10 text-dim hover:text-brand-lime hover:border-brand-lime/30 rounded-xl transition-all duration-300">
                                                    <ChevronRight size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {!loading && customers.length > 0 && pagination && pagination.totalPages >= 1 && (
                        <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                            <p className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>
                                Showing {customers.length} of {pagination.total} customers
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(page - 1)}
                                    disabled={page === 1 || loading}
                                    className="p-2 rounded-lg border border-white/10 text-dim hover:text-white disabled:opacity-20 transition-all cursor-pointer"
                                    style={{ borderColor: 'var(--border-main)' }}
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <div className="flex items-center gap-1">
                                    {getPageNumbers().map((p, index) => {
                                        if (p === '...') {
                                            return (
                                                <span key={`ell-${index}`} className="px-2 text-dim text-xs font-black select-none">
                                                    ...
                                                </span>
                                            );
                                        }
                                        return (
                                            <button
                                                key={p}
                                                onClick={() => setPage(Number(p))}
                                                className={`w-9 h-9 rounded-lg text-xs font-black transition-all cursor-pointer ${page === p ? 'bg-brand-lime text-black shadow-lg scale-110' : 'text-dim hover:bg-white/5 border border-white/5'}`}
                                            >
                                                {p}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => setPage(page + 1)}
                                    disabled={page === pagination.totalPages || loading}
                                    className="p-2 rounded-lg border border-white/10 text-dim hover:text-white disabled:opacity-20 transition-all cursor-pointer"
                                    style={{ borderColor: 'var(--border-main)' }}
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Customer Modal */}
            <CreateCustomerModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => fetchData(true)}
                branches={branches}
            />
        </div>
    );
};

export default Customers;