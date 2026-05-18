import { useState } from 'react';
import { X, Plus, Landmark } from 'lucide-react';
import Modal from '../Modal';
import { createSupplier, type Supplier } from '../../services/supplierService';
import toast from 'react-hot-toast';

interface QuickAddSupplierModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newSupplier: Supplier) => void;
}

export const QuickAddSupplierModal = ({ isOpen, onClose, onSuccess }: QuickAddSupplierModalProps) => {
    const [submitting, setSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        category: 'Parts/Service'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error('Supplier name is required');
            return;
        }

        setSubmitting(true);
        try {
            const result = await createSupplier({
                name: formData.name.trim(),
                contactPerson: formData.contactPerson.trim() || 'N/A',
                phone: formData.phone.trim() || 'N/A',
                email: formData.email.trim() || 'info@supplier.local',
                address: formData.address.trim() || 'N/A',
                category: formData.category,
                isActive: true
            });
            toast.success(`Supplier "${formData.name}" created successfully!`);
            
            // Check if the response contains the supplier or is wrapped
            const finalSupplier = (result as any).data || result;
            onSuccess(finalSupplier);
            
            // Reset form
            setFormData({
                name: '',
                contactPerson: '',
                phone: '',
                email: '',
                address: '',
                category: 'Parts/Service'
            });
            onClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create supplier');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Quick Add Vendor / Supplier">
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
                {/* Supplier Name */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>
                        Supplier / Company Name *
                    </label>
                    <input
                        type="text"
                        required
                        placeholder="e.g. Acme Auto Parts Ltd"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-brand-lime transition-all"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Contact Person */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>
                            Contact Person
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. John Doe"
                            value={formData.contactPerson}
                            onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                            className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-brand-lime transition-all"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>

                    {/* Category */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>
                            Category
                        </label>
                        <select
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                            className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-brand-lime cursor-pointer appearance-none"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <option value="Parts/Service" style={{ background: 'var(--bg-card)' }}>Parts & Service</option>
                            <option value="Fleet Maintenance" style={{ background: 'var(--bg-card)' }}>Fleet Maintenance</option>
                            <option value="Utilities" style={{ background: 'var(--bg-card)' }}>Utilities</option>
                            <option value="Rent/Lease" style={{ background: 'var(--bg-card)' }}>Rent/Lease</option>
                            <option value="Admin & Office" style={{ background: 'var(--bg-card)' }}>Admin & Office</option>
                            <option value="Other" style={{ background: 'var(--bg-card)' }}>Other</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Phone */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>
                            Phone Number
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. +1 555-0199"
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
                            placeholder="e.g. contact@acme.com"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-brand-lime transition-all"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>
                </div>

                {/* Address */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>
                        Physical Address
                    </label>
                    <textarea
                        rows={2}
                        placeholder="e.g. 100 Main St, Suite 400"
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-4 py-2.5 border rounded-xl outline-none resize-none focus:border-brand-lime transition-all"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
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
                        {submitting ? 'Creating...' : 'Create Vendor'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default QuickAddSupplierModal;
