import { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, Edit2, Trash2, FileText, Upload, X, Check, AlertCircle, Search } from 'lucide-react';
import {
    getAllInsurances,
    createInsurance,
    updateInsurance,
    deleteInsurance,
    type Insurance,
    type CreateInsurancePayload,
    type PolicyType,
    type CoverageType
} from '../../../services/insuranceService';

const ManageInsurances = () => {
    const [insurances, setInsurances] = useState<Insurance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [selectedInsurance, setSelectedInsurance] = useState<Insurance | null>(null);
    const [formData, setFormData] = useState<CreateInsurancePayload>({
        provider: '',
        policyNumber: '',
        policyType: 'INDIVIDUAL',
        coverageType: 'COMPREHENSIVE',
        startDate: '',
        expiryDate: '',
        insuredValue: 0,
        providerContact: {
            name: '',
            phone: '',
            email: ''
        }
    });

    const [policyFile, setPolicyFile] = useState<File | null>(null);

    const fetchInsurances = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getAllInsurances();
            console.log(data, 'data');
            setInsurances(Array.isArray(data) ? data : []);
            setError(null);
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to fetch insurances');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInsurances();
    }, [fetchInsurances]);

    const handleOpenCreateModal = () => {
        setModalMode('create');
        setFormData({
            provider: '',
            policyNumber: '',
            policyType: 'INDIVIDUAL',
            coverageType: 'COMPREHENSIVE',
            startDate: '',
            expiryDate: '',
            insuredValue: 0,
            providerContact: { name: '', phone: '', email: '' }
        });
        setPolicyFile(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (ins: Insurance) => {
        setModalMode('edit');
        setSelectedInsurance(ins);
        setFormData({
            provider: ins.provider,
            policyNumber: ins.policyNumber,
            policyType: ins.policyType,
            coverageType: ins.coverageType,
            startDate: ins.startDate.split('T')[0],
            expiryDate: ins.expiryDate.split('T')[0],
            insuredValue: ins.insuredValue,
            providerContact: { ...ins.providerContact }
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            if (modalMode === 'create') {
                const fd = new FormData();
                fd.append('provider', formData.provider);
                fd.append('policyNumber', formData.policyNumber);
                fd.append('policyType', formData.policyType);
                fd.append('coverageType', formData.coverageType);
                fd.append('startDate', new Date(formData.startDate).toISOString());
                fd.append('expiryDate', new Date(formData.expiryDate).toISOString());
                fd.append('insuredValue', formData.insuredValue.toString());
                fd.append('providerContact[name]', formData.providerContact.name);
                fd.append('providerContact[phone]', formData.providerContact.phone);
                fd.append('providerContact[email]', formData.providerContact.email);
                
                if (policyFile) {
                    fd.append('policyDocument', policyFile);
                }

                await createInsurance(fd);
            } else if (selectedInsurance) {
                await updateInsurance(selectedInsurance._id, formData);
            }
            setIsModalOpen(false);
            setPolicyFile(null);
            fetchInsurances();
        } catch (err) {
            setError('Failed to save insurance');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this insurance policy?')) return;
        try {
            await deleteInsurance(id);
            fetchInsurances();
        } catch (err) {
            setError('Failed to delete insurance');
        }
    };


    const filteredInsurances = insurances.filter(ins =>
        (ins?.provider?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (ins?.policyNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Shield className="text-lime" /> Insurance Management
                    </h1>
                    <p className="text-sm text-dim">Manage vehicle insurance policies and documents</p>
                </div>
                <button
                    onClick={handleOpenCreateModal}
                    className="flex items-center gap-2 bg-lime text-black px-4 py-2 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(163,230,53,0.3)] transition-all"
                >
                    <Plus size={20} /> New Policy
                </button>
            </div>

            <div className="flex items-center gap-4 bg-glass border border-white/5 p-4 rounded-2xl">
                <Search className="text-dim" size={20} />
                <input
                    type="text"
                    placeholder="Search by provider or policy number..."
                    className="bg-transparent outline-none w-full text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {error && (
                <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl animate-in fade-in duration-300">
                    <AlertCircle size={20} />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            <div className="bg-glass border border-white/5 rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-xs font-bold uppercase tracking-wider text-dim">
                        <tr>
                            <th className="px-6 py-4">Provider / Policy</th>
                            <th className="px-6 py-4">Type / Coverage</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Expiry</th>
                            <th className="px-6 py-4">Insured Value</th>
                            <th className="px-6 py-4">Document</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-dim">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="animate-spin border-2 border-lime border-t-transparent rounded-full w-6 h-6" />
                                        <span className="text-sm">Loading policies...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredInsurances.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-dim">
                                    <div className="flex flex-col items-center gap-2">
                                        <Shield size={32} className="opacity-20" />
                                        <span className="text-sm">No insurance policies found</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredInsurances.map(ins => (
                                <tr key={ins._id} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold">{ins.provider || 'N/A'}</div>
                                        <div className="text-xs text-dim">{ins.policyNumber || 'No Policy #'}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="flex flex-col gap-1">
                                            <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] w-fit font-bold">{ins.policyType || 'INDIVIDUAL'}</span>
                                            <span className="text-xs text-dim">{ins.coverageType || 'COMPREHENSIVE'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                                            ins.status === 'ACTIVE' ? 'bg-lime/10 text-lime' : 'bg-red-500/10 text-red-500'
                                        }`}>
                                            {ins.status || 'UNKNOWN'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm">
                                        {ins.expiryDate ? new Date(ins.expiryDate).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-mono">
                                        ${(ins.insuredValue || 0).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {ins.policyDocument ? (
                                                <a
                                                    href={ins.policyDocument}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 bg-lime/10 text-lime rounded-lg hover:bg-lime/20"
                                                >
                                                    <FileText size={16} />
                                                </a>
                                            ) : (
                                                <span className="text-[10px] text-dim italic">No Document</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => handleOpenEditModal(ins)} className="p-2 hover:bg-white/10 rounded-lg text-dim hover:text-white transition-all">
                                                <Edit2 size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(ins._id)} className="p-2 hover:bg-red-500/10 rounded-lg text-dim hover:text-red-500 transition-all">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* CRUD Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-300">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                {modalMode === 'create' ? <Plus className="text-lime" /> : <Edit2 className="text-lime" />}
                                {modalMode === 'create' ? 'New Insurance Policy' : 'Edit Insurance Policy'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-dim hover:text-white transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-lime">Policy Info</h3>
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-dim uppercase">Provider</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-lime transition-all"
                                            value={formData.provider}
                                            onChange={(e) => setFormData({...formData, provider: e.target.value})}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-dim uppercase">Policy Number</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-lime transition-all"
                                            value={formData.policyNumber}
                                            onChange={(e) => setFormData({...formData, policyNumber: e.target.value})}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs text-dim uppercase">Policy Type</label>
                                            <select
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-lime transition-all text-sm"
                                                value={formData.policyType}
                                                onChange={(e) => setFormData({...formData, policyType: e.target.value as PolicyType})}
                                            >
                                                <option value="INDIVIDUAL">INDIVIDUAL</option>
                                                <option value="FLEET">FLEET</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs text-dim uppercase">Coverage</label>
                                            <select
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-lime transition-all text-sm"
                                                value={formData.coverageType}
                                                onChange={(e) => setFormData({...formData, coverageType: e.target.value as CoverageType})}
                                            >
                                                <option value="COMPREHENSIVE">COMPREHENSIVE</option>
                                                <option value="THIRD_PARTY">THIRD_PARTY</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-lime">Financials & Timeline</h3>
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-dim uppercase">Insured Value ($)</label>
                                        <input
                                            required
                                            type="number"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-lime transition-all"
                                            value={formData.insuredValue}
                                            onChange={(e) => setFormData({...formData, insuredValue: Number(e.target.value)})}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs text-dim uppercase">Start Date</label>
                                            <input
                                                required
                                                type="date"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-lime transition-all text-sm"
                                                value={formData.startDate}
                                                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs text-dim uppercase">Expiry Date</label>
                                            <input
                                                required
                                                type="date"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-lime transition-all text-sm"
                                                value={formData.expiryDate}
                                                onChange={(e) => setFormData({...formData, expiryDate: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 p-4 rounded-2xl space-y-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-lime">Provider Contact</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-dim uppercase">Name</label>
                                        <input
                                            required
                                            type="text"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-lime transition-all text-sm"
                                            value={formData.providerContact.name}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                providerContact: { ...formData.providerContact, name: e.target.value }
                                            })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-dim uppercase">Phone</label>
                                        <input
                                            required
                                            type="tel"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-lime transition-all text-sm"
                                            value={formData.providerContact.phone}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                providerContact: { ...formData.providerContact, phone: e.target.value }
                                            })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-dim uppercase">Email</label>
                                        <input
                                            required
                                            type="email"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-lime transition-all text-sm"
                                            value={formData.providerContact.email}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                providerContact: { ...formData.providerContact, email: e.target.value }
                                            })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {modalMode === 'create' && (
                                <div className="bg-white/5 p-4 rounded-2xl space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-lime">Policy Document</h3>
                                    <div className="flex items-center gap-4">
                                        <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl p-6 hover:border-lime/40 hover:bg-lime/5 transition-all cursor-pointer group">
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                onChange={(e) => setPolicyFile(e.target.files?.[0] || null)}
                                            />
                                            {policyFile ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <Check className="text-lime" size={24} />
                                                    <span className="text-xs font-medium">{policyFile.name}</span>
                                                    <span className="text-[10px] text-dim">Click to change</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2">
                                                    <Upload className="text-dim group-hover:text-lime transition-colors" size={24} />
                                                    <span className="text-xs font-medium">Upload Policy Document</span>
                                                    <span className="text-[10px] text-dim">PDF, JPG, or PNG</span>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-3 rounded-xl font-bold hover:bg-white/5 transition-all text-dim hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-3 bg-lime text-black rounded-xl font-bold hover:shadow-[0_0_20px_rgba(163,230,53,0.3)] transition-all flex items-center gap-2"
                                >
                                    {loading ? (
                                        <div className="animate-spin border-2 border-black border-t-transparent rounded-full w-4 h-4" />
                                    ) : (
                                        modalMode === 'create' ? <Check size={20} /> : <Upload size={20} />
                                    )}
                                    {modalMode === 'create' ? 'Create Policy' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageInsurances;
