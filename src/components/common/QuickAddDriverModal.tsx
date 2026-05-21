import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import Modal from '../Modal';
import { createDriver, type Driver } from '../../services/driverService';
import { getAllBranches, type Branch } from '../../services/branchService';
import toast from 'react-hot-toast';

interface QuickAddDriverModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newDriver: Driver) => void;
    defaultBranchId?: string;
}

export const QuickAddDriverModal = ({
    isOpen,
    onClose,
    onSuccess,
    defaultBranchId = ''
}: QuickAddDriverModalProps) => {
    const [submitting, setSubmitting] = useState(false);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        email: '',
        branch: defaultBranchId
    });

    useEffect(() => {
        if (isOpen) {
            fetchBranches();
            setFormData(prev => ({
                ...prev,
                branch: defaultBranchId || prev.branch
            }));
        }
    }, [isOpen, defaultBranchId]);

    const fetchBranches = async () => {
        try {
            const res = await getAllBranches({ limit: 100 });
            setBranches(res.data || []);
            if (res.data && res.data.length > 0 && !formData.branch) {
                setFormData(prev => ({ ...prev, branch: res.data[0]._id }));
            }
        } catch (err) {
            console.error('Failed to load branches in driver quick add modal', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.fullName.trim()) {
            toast.error('Driver name is required');
            return;
        }
        if (!formData.phone.trim()) {
            toast.error('Driver phone number is required');
            return;
        }
        if (!formData.branch) {
            toast.error('Branch is required');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                status: 'DRAFT',
                personalInfo: {
                    fullName: formData.fullName.trim(),
                    phone: formData.phone.trim(),
                    email: formData.email.trim() || undefined,
                    dateOfBirth: '1990-01-01' // Default DOB to pass schema validation if needed
                },
                branch: formData.branch
            };

            const result = await createDriver(payload);
            toast.success(`Driver "${formData.fullName}" created successfully!`);
            
            const finalDriver = (result as any).data || result;
            onSuccess(finalDriver);
            
            // Reset form
            setFormData({
                fullName: '',
                phone: '',
                email: '',
                branch: defaultBranchId
            });
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create driver');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Quick Add Customer / Driver">
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
                {/* Full Name */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>
                        Full Name *
                    </label>
                    <input
                        type="text"
                        required
                        placeholder="e.g. Johnathan Smith"
                        value={formData.fullName}
                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-brand-lime transition-all"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Phone */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>
                            Phone Number *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. +1 555-0155"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-brand-lime transition-all"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>
                            Email Address
                        </label>
                        <input
                            type="email"
                            placeholder="e.g. john@example.com"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-brand-lime transition-all"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>
                </div>

                {/* Branch Selection */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>
                        Operating Branch *
                    </label>
                    <select
                        required
                        value={formData.branch}
                        onChange={e => setFormData({ ...formData, branch: e.target.value })}
                        className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-brand-lime cursor-pointer appearance-none"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <option value="">Select Branch</option>
                        {branches.map(b => (
                            <option key={b._id} value={b._id} style={{ background: 'var(--bg-card)' }}>
                                {b.name} ({b.code})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex gap-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="flex-1 px-5 py-2.5 rounded-xl border font-bold hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 px-5 py-2.5 rounded-xl font-black text-black bg-brand-lime flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                        style={{ background: 'var(--brand-lime)' }}
                    >
                        <Plus size={14} strokeWidth={3} />
                        {submitting ? 'Creating...' : 'Create Driver'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default QuickAddDriverModal;
