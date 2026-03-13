import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, X, Calculator, Info, Check, AlertCircle, Image as ImageIcon, FileText } from 'lucide-react';
import type { CreatePurchaseOrderPayload, PurchaseOrderItem, POPurpose } from '../../../services/purchaseOrderService';
import { createPurchaseOrder } from '../../../services/purchaseOrderService';
import type { Supplier } from '../../../services/supplierService';
import { getAllSuppliers } from '../../../services/supplierService';
import type { Branch } from '../../../services/branchService';
import { getAllBranches } from '../../../services/branchService';
import { getDecodedToken, ROLE_LEVELS } from '../../../utils/auth';
import { useNavigate } from 'react-router-dom';

const CreatePurchaseOrder = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Data for dropdowns
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [userLevel, setUserLevel] = useState<number>(0);

    // Form state
    const [formData, setFormData] = useState<CreatePurchaseOrderPayload>({
        purpose: 'Spare Parts',
        supplier: '',
        items: [
            { itemName: '', quantity: 1, unitPrice: 0, description: '', images: [] }
        ],
        paymentDate: '',
        branch: ''
    });

    const fetchData = useCallback(async () => {
        try {
            // 1. Get user role level first to decide which APIs to call
            const decoded = getDecodedToken();
            let currentLevel = 0;
            if (decoded) {
                const role = (decoded.role || decoded.roles || '').toLowerCase();
                currentLevel = ROLE_LEVELS[role] || 0;
                setUserLevel(currentLevel);
            }

            // 2. Conditional API calls
            const suppliersData = await getAllSuppliers();
            setSuppliers(suppliersData);

            // Only fetch branches if user is Country Manager (Level 3) or higher
            if (currentLevel >= 3) {
                const branchesData = await getAllBranches();
                setBranches(branchesData);
            }
        } catch (err) {
            console.error('Failed to fetch initial data:', err);
            setError('Failed to load initial data. Please refresh.');
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { itemName: '', quantity: 1, unitPrice: 0, description: '', images: [] }]
        });
    };

    const removeItem = (index: number) => {
        if (formData.items.length === 1) return;
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    const updateItem = (index: number, field: keyof PurchaseOrderItem, value: any) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData({ ...formData, items: newItems });
    };

    const calculateTotal = () => {
        return formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Validation
        if (!formData.supplier) {
            setError('Please select a supplier');
            setLoading(false);
            return;
        }

        if (userLevel >= 3 && !formData.branch) { // CountryManager+
            setError('Please select a branch');
            setLoading(false);
            return;
        }

        const invalidItems = formData.items.some(item => !item.itemName || item.quantity <= 0 || item.unitPrice <= 0);
        if (invalidItems) {
            setError('Please ensure all items have a name, quantity > 0, and price > 0');
            setLoading(false);
            return;
        }

        try {
            await createPurchaseOrder(formData);
            setSuccess(true);
            setTimeout(() => navigate('..'), 2000);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to create purchase order');
        } finally {
            setLoading(false);
        }
    };

    const total = calculateTotal();

    if (success) {
        return (
            <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center">
                    <Check size={40} />
                </div>
                <h1 className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>PO Created Successfully!</h1>
                <p style={{ color: 'var(--text-dim)' }}>Redirecting you to the list...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                        <Plus size={28} style={{ color: '#C8E600' }} />
                        Create Purchase Order
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>Fill in the details to request a new purchase</p>
                </div>
                <button
                    onClick={() => navigate('..')}
                    className="p-2.5 rounded-xl transition-all border hover:bg-white/5"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                >
                    <X size={20} />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Info Card */}
                <div className="rounded-2xl border p-6 space-y-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-2 mb-2 text-[#C8E600]">
                        <Info size={18} />
                        <h2 className="font-semibold uppercase tracking-wider text-xs">General Information</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Supplier Selection */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                Supplier <span className="text-red-500">*</span>
                            </label>
                            <select
                                required
                                value={formData.supplier}
                                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-lime transition-all"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="">Select a supplier</option>
                                {suppliers.map(s => (
                                    <option key={s._id} value={s._id}>{s.name} ({s.category})</option>
                                ))}
                            </select>
                        </div>

                        {/* Purpose */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                Purpose <span className="text-red-500">*</span>
                            </label>
                            <select
                                required
                                value={formData.purpose}
                                onChange={(e) => setFormData({ ...formData, purpose: e.target.value as POPurpose })}
                                className="w-full px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-lime transition-all"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="Vehicle">Vehicle</option>
                                <option value="Spare Parts">Spare Parts</option>
                                <option value="Others">Others</option>
                            </select>
                        </div>

                        {/* Branch Selection (Conditional) */}
                        {userLevel >= 3 ? (
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                    Target Branch <span className="text-red-500">*</span>
                                </label>
                                <select
                                    required
                                    value={formData.branch}
                                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-lime transition-all"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="">Select a branch</option>
                                    {branches.map(b => (
                                        <option key={b._id} value={b._id}>{b.name} - {b.city}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="space-y-1.5 opacity-50">
                                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                    Target Branch
                                </label>
                                <div className="px-4 py-3 rounded-xl border italic text-sm" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                                    Auto-assigned to your branch
                                </div>
                            </div>
                        )}

                        {/* Payment Date */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                Expected Payment Date
                            </label>
                            <input
                                type="date"
                                value={formData.paymentDate}
                                onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-lime transition-all"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Items Card */}
                <div className="rounded-2xl border p-6 space-y-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2 text-[#C8E600]">
                            <Calculator size={18} />
                            <h2 className="font-semibold uppercase tracking-wider text-xs">Line Items</h2>
                        </div>
                        <button
                            type="button"
                            onClick={addItem}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:bg-lime/20"
                            style={{ background: 'rgba(200,230,0,0.1)', color: '#C8E600', border: '1px solid rgba(200,230,0,0.2)' }}
                        >
                            <Plus size={14} /> Add Item
                        </button>
                    </div>

                    <div className="space-y-4">
                        {formData.items.map((item, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start p-4 rounded-xl border relative group" style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'var(--border-main)' }}>
                                <div className="md:col-span-5 space-y-1">
                                    <input
                                        placeholder="Item name (e.g. Brake Pads)"
                                        value={item.itemName}
                                        onChange={(e) => updateItem(index, 'itemName', e.target.value)}
                                        className="w-full bg-transparent outline-none text-sm font-medium"
                                        style={{ color: 'var(--text-main)' }}
                                    />
                                    <input
                                        placeholder="Short description (optional)"
                                        value={item.description}
                                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                                        className="w-full bg-transparent outline-none text-xs"
                                        style={{ color: 'var(--text-dim)' }}
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Quantity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                        className="w-full bg-transparent outline-none text-sm"
                                        style={{ color: 'var(--text-main)' }}
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Unit Price</label>
                                    <div className="flex items-center gap-1">
                                        <span className="text-sm opacity-50">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={item.unitPrice}
                                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                            className="w-full bg-transparent outline-none text-sm"
                                            style={{ color: 'var(--text-main)' }}
                                        />
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-[10px] uppercase font-bold" style={{ color: 'var(--text-dim)' }}>Subtotal</label>
                                    <div className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                                        ${(item.quantity * item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div className="md:col-span-11 mt-4 space-y-3">
                                    <div className="flex items-center gap-4">
                                        <label className="cursor-pointer group/upload">
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const files = Array.from(e.target.files || []);
                                                    const currentImages = item.images || [];
                                                    updateItem(index, 'images', [...currentImages, ...files]);
                                                }}
                                            />
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed transition-all hover:border-lime group-hover/upload:bg-lime/5"
                                                 style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                                                <ImageIcon size={14} className="group-hover/upload:text-lime" />
                                                <span className="text-xs font-bold uppercase tracking-wider group-hover/upload:text-main">Add Images</span>
                                            </div>
                                        </label>
                                        
                                        {item.images && item.images.length > 0 && (
                                            <div className="flex flex-wrap gap-3">
                                                {item.images.map((file, fileIdx) => (
                                                    <div key={fileIdx} className="relative group">
                                                        <div className="w-16 h-16 rounded-lg border overflow-hidden transition-all group-hover:scale-105" 
                                                             style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                                            {file instanceof File ? (
                                                                <img 
                                                                    src={URL.createObjectURL(file)} 
                                                                    alt={file.name}
                                                                    className="w-full h-full object-cover"
                                                                    onLoad={(e) => URL.revokeObjectURL((e.target as any).src)} // Clean up URL
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <FileText size={16} className="text-lime" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newImages = item.images?.filter((_, i) => i !== fileIdx);
                                                                updateItem(index, 'images', newImages);
                                                            }}
                                                            className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-red-500 text-white shadow-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                                                        >
                                                            <X size={10} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="md:col-span-1 flex justify-end pt-5">
                                    <button
                                        type="button"
                                        onClick={() => removeItem(index)}
                                        disabled={formData.items.length === 1}
                                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 disabled:opacity-0 transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Total Footer */}
                    <div className="flex justify-between items-center pt-6 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <div>
                            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Total amount estimated</p>
                            <p className="text-2xl font-black text-[#C8E600]">
                                ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                            {total > 1000 && (
                                <p className="text-[10px] font-bold text-amber-500 mt-1 uppercase flex items-center gap-1">
                                    <AlertCircle size={10} /> Requires Admin approval {"( > $1000)"}
                                </p>
                            )}
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-10 py-4 rounded-2xl font-bold shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                            style={{ background: '#C8E600', color: '#0A0A0A' }}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save size={20} /> Submit PO
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Global Error */}
                {error && (
                    <div className="p-4 rounded-xl flex items-center gap-3 text-sm animate-shake" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                        <AlertCircle size={18} /> {error}
                    </div>
                )}
            </form>
        </div>
    );
};

export default CreatePurchaseOrder;
