import { useState } from 'react';
import { 
    X, User, Mail, Phone, MapPin, Building2, Globe, Check, RefreshCw, UserPlus 
} from 'lucide-react';
import { createCustomer, type Customer, type CreateCustomerPayload } from '../../services/customerService';
import { type Branch } from '../../services/branchService';
import toast from 'react-hot-toast';

interface QuickAddCustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newCustomer?: Customer) => void;
    branches: Branch[];
}

export const QuickAddCustomerModal = ({ isOpen, onClose, onSuccess, branches }: QuickAddCustomerModalProps) => {
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
            const res = await createCustomer(payload);
            toast.success('Customer created successfully!', { id: toastId });
            resetForm();
            
            // Extract customer object from response
            const newCustomer = res.data || res;
            onSuccess(newCustomer);
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
            className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
            onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
            <div
                className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] shadow-2xl border animate-in zoom-in-95 duration-200 custom-scrollbar"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
            >
                {/* Modal Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-5 border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200,230,0,0.12)', border: '1px solid rgba(200,230,0,0.25)' }}>
                            <UserPlus size={16} style={{ color: 'var(--brand-lime)' }} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-white">New Customer</h2>
                            <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--text-dim)' }}>Fill in the details to register a new customer</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        type="button"
                        className="p-2 rounded-xl border transition-all hover:bg-white/10 active:scale-95 cursor-pointer"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Modal Body */}
                <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6 text-xs font-semibold">

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
                                    className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
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
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
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
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
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
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
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
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border outline-none appearance-none cursor-pointer transition-all focus:ring-2 focus:ring-brand-lime/20"
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
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
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
                                    className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
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
                                    className="w-full px-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
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
                                        className="w-full pl-10 pr-4 py-3 rounded-xl text-xs font-semibold border outline-none transition-all focus:ring-2 focus:ring-brand-lime/20"
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
                            className="px-5 py-2.5 rounded-xl text-xs font-bold border transition-all hover:bg-white/5 disabled:opacity-50 cursor-pointer"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !name.trim() || !branch}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-black transition-all active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

export default QuickAddCustomerModal;
