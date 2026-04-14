import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Plus, Trash2, Upload, X, Check, AlertTriangle, Search, Eye, Download } from 'lucide-react';
import {
    getAllInsurances,
    createInsurance,
    deleteInsurance,
    type Insurance,
    type CreateInsurancePayload,
    type InsuranceStatus,
    type PolicyType,
    type CoverageType
} from '../../../services/insuranceService';
import { getAllSuppliers, type Supplier } from '../../../services/supplierService';

const ManageInsurances = () => {
    const { t } = useTranslation();
    const [insurances, setInsurances] = useState<Insurance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Server-side filtering & pagination state
    const [filters, setFilters] = useState({
        page: 1,
        limit: 10,
        search: '',
        status: undefined as InsuranceStatus | undefined,
        policyType: undefined as PolicyType | undefined,
        coverageType: undefined as CoverageType | undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc' as 'asc' | 'desc'
    });
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
    });
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [supplierLoading, setSupplierLoading] = useState(false);
    const [formData, setFormData] = useState<CreateInsurancePayload>({
        supplier: '',
        country: 'Global',
        policyType: 'INDIVIDUAL',
        coverageType: 'COMPREHENSIVE',
        startDate: '',
        expiryDate: '',
        insuredValue: 0,
    });

    const [policyFile, setPolicyFile] = useState<File | null>(null);

    // Fetch suppliers for insurance category
    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                setSupplierLoading(true);
                const resp = await getAllSuppliers({ category: 'Insurance', limit: 100 });
                if (resp.success) setSuppliers(resp.data);
            } catch (err) {
                console.error('Failed to fetch insurance suppliers:', err);
            } finally {
                setSupplierLoading(false);
            }
        };
        fetchSuppliers();
    }, []);

    const fetchInsurances = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getAllInsurances(filters);
            if (response.success) {
                setInsurances(response.data);
                setPagination(response.pagination);
            }
            setError(null);
        } catch (err) {
            console.error('Fetch error:', err);
            setError(t('management.insurances.fetchFailed'));
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchInsurances();
    }, [fetchInsurances]);

    const handleFilterChange = (key: string, value: any) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            page: 1
        }));
    };

    const handlePageChange = (newPage: number) => {
        setFilters(prev => ({
            ...prev,
            page: newPage
        }));
    };

    const getFullUrl = (path: string | undefined) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const baseUrl = 'https://ola-cars-uploads-2026.s3.ap-south-1.amazonaws.com';
        return `${baseUrl}/${path.startsWith('/') ? path.slice(1) : path}`;
    };

    const handleOpenCreateModal = () => {
        setFormData({
            supplier: '',
            country: 'Global',
            policyType: 'INDIVIDUAL',
            coverageType: 'COMPREHENSIVE',
            startDate: '',
            expiryDate: '',
            insuredValue: 0,
        });
        setPolicyFile(null);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const fd = new FormData();
            fd.append('supplier', formData.supplier);
            fd.append('country', formData.country);
            fd.append('policyType', formData.policyType);
            fd.append('coverageType', formData.coverageType);
            
            if (formData.startDate) fd.append('startDate', new Date(formData.startDate).toISOString());
            if (formData.expiryDate) fd.append('expiryDate', new Date(formData.expiryDate).toISOString());
            
            fd.append('insuredValue', formData.insuredValue.toString());
            
            if (policyFile) {
                fd.append('policyDocument', policyFile);
            }

            await createInsurance(fd);
            setIsModalOpen(false);
            setPolicyFile(null);
            fetchInsurances();
        } catch (err: any) {
            setError(err.response?.data?.error || t('management.insurances.saveFailed'));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm(t('management.insurances.deleteConfirm'))) return;
        try {
            deleteInsurance(id);
            fetchInsurances();
        } catch (err) {
            setError(t('management.insurances.deleteFailed'));
        }
    };

    return (
        <div className="container-responsive space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <Shield className="text-lime" /> {t('management.insurances.title')}
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--text-dim)' }}>{t('management.insurances.subtitle')}</p>
                </div>
                <button
                    onClick={handleOpenCreateModal}
                    className="flex items-center gap-2 bg-lime text-black px-6 py-2.5 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(163,230,53,0.3)] transition-all hover:-translate-y-0.5"
                >
                    <Plus size={20} /> {t('management.insurances.add')}
                </button>
            </div>

            {/* Search and Advanced Filters */}
            <div className="space-y-4">
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder={t('management.common.searchPlaceholder')}
                            className="w-full pl-12 pr-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: showAdvancedFilters ? '#C8E600' : 'var(--text-dim)' }}
                    >
                        {t('management.common.filters')} {showAdvancedFilters ? '↑' : '↓'}
                    </button>
                </div>

                {showAdvancedFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl animate-in slide-in-from-top-2 duration-200" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)' }}>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: 'var(--text-dim)' }}>{t('management.common.table.status')}</label>
                            <select
                                value={filters.status || ''}
                                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                                className="w-full px-4 py-2 rounded-lg text-sm outline-none"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="">{t('management.common.allStatuses')}</option>
                                <option value="ACTIVE">{t('management.insurances.statusLabels.ACTIVE')}</option>
                                <option value="EXPIRED">{t('management.insurances.statusLabels.EXPIRED')}</option>
                                <option value="CANCELLED">{t('management.insurances.statusLabels.CANCELLED')}</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: 'var(--text-dim)' }}>{t('management.insurances.form.policyType')}</label>
                            <select
                                value={filters.policyType || ''}
                                onChange={(e) => handleFilterChange('policyType', e.target.value || undefined)}
                                className="w-full px-4 py-2 rounded-lg text-sm outline-none"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="">{t('management.insurances.types.all')}</option>
                                <option value="INDIVIDUAL">{t('management.insurances.types.INDIVIDUAL')}</option>
                                <option value="FLEET">{t('management.insurances.types.FLEET')}</option>
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider pl-1" style={{ color: 'var(--text-dim)' }}>{t('management.insurances.form.coverage')}</label>
                            <select
                                value={filters.coverageType || ''}
                                onChange={(e) => handleFilterChange('coverageType', e.target.value || undefined)}
                                className="w-full px-4 py-2 rounded-lg text-sm outline-none"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="">{t('management.insurances.coverage.all')}</option>
                                <option value="COMPREHENSIVE">{t('management.insurances.coverage.COMPREHENSIVE')}</option>
                                <option value="THIRD_PARTY">{t('management.insurances.coverage.THIRD_PARTY')}</option>
                            </select>
                        </div>
                        <div className="flex items-end pb-0.5">
                            <button
                                onClick={() => setFilters({
                                    ...filters,
                                    search: '',
                                    status: undefined,
                                    policyType: undefined,
                                    coverageType: undefined,
                                    page: 1
                                })}
                                className="w-full py-2 rounded-lg text-sm font-bold transition-all hover:bg-white/5"
                                style={{ border: '1px solid var(--border-main)', color: 'var(--text-dim)' }}
                            >
                                {t('management.common.resetAll')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            <div className="bg-glass border border-white/5 rounded-2xl overflow-hidden overflow-x-auto" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : insurances.length === 0 ? (
                    <div className="text-center py-20" style={{ color: 'var(--text-dim)' }}>
                        <Shield size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">{t('management.insurances.notFound')}</p>
                        <p className="text-sm mt-1">{t('management.insurances.clickToAdd')}</p>
                    </div>
                ) : (
                    <>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b transition-colors duration-300" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.insurances.table.providerPolicy')}</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.insurances.table.typeCoverage')}</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.common.table.status')}</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.insurances.table.expiry')}</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.insurances.table.insuredValue')}</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.insurances.table.docs')}</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>{t('management.common.table.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {insurances.map(ins => (
                                    <tr key={ins._id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-bold" style={{ color: 'var(--text-main)' }}>
                                                {typeof ins.supplier === 'object' ? ins.supplier?.name : 'N/A'}
                                            </div>
                                            <div className="text-xs" style={{ color: 'var(--text-dim)' }}>{ins.policyNumber || 'No Policy #'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] w-fit font-bold uppercase tracking-widest" style={{ color: 'var(--text-main)', border: '1px solid var(--border-main)' }}>
                                                    {t(`management.insurances.types.${ins.policyType || 'INDIVIDUAL'}`)}
                                                </span>
                                                <span className="text-[10px] uppercase font-medium" style={{ color: 'var(--text-dim)' }}>{t(`management.insurances.coverage.${ins.coverageType || 'COMPREHENSIVE'}`)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                ins.status === 'ACTIVE' ? '' : 'opacity-50'
                                            }`} style={{
                                                background: ins.status === 'ACTIVE' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                                color: ins.status === 'ACTIVE' ? '#22c55e' : '#ef4444',
                                                borderColor: ins.status === 'ACTIVE' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'
                                            }}>
                                                {t(`management.insurances.statusLabels.${ins.status || 'UNKNOWN'}`)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-main)' }}>
                                            {ins.expiryDate ? new Date(ins.expiryDate).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                                            ${(ins.insuredValue || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {ins.documents?.policyDocumentUrl ? (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setSelectedImage(getFullUrl(ins.documents?.policyDocumentUrl))}
                                                        className="p-2 rounded-xl transition-all hover:bg-lime/20 text-lime"
                                                        style={{ background: 'rgba(200,230,0,0.1)' }}
                                                        title={t('management.common.view', { defaultValue: 'View' })}
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <a
                                                        href={getFullUrl(ins.documents?.policyDocumentUrl)}
                                                        download
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-2 rounded-xl transition-all hover:bg-blue-500/20 text-blue-500"
                                                        style={{ background: 'rgba(59,130,246,0.1)' }}
                                                        title={t('management.common.download', { defaultValue: 'Download' })}
                                                    >
                                                        <Download size={16} />
                                                    </a>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] italic" style={{ color: 'var(--text-dim)' }}>No Document</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleDelete(ins._id)} className="p-2 rounded-xl hover:bg-red-500/10 text-dim hover:text-red-500 transition-all cursor-pointer">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}>
                            <div className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>
                                {t('management.common.showing')} <span style={{ color: 'var(--text-main)' }}>{insurances.length}</span> {t('management.common.of')} <span style={{ color: 'var(--text-main)' }}>{pagination.total}</span> {t('management.common.records')}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    disabled={filters.page === 1}
                                    onClick={() => handlePageChange(filters.page - 1)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:bg-white/10"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    {t('management.common.pagination.previous')}
                                </button>
                                <div className="flex items-center gap-1">
                                    {[...Array(pagination.totalPages)].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => handlePageChange(i + 1)}
                                            className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${filters.page === i + 1 ? 'shadow-lg shadow-lime/20' : 'hover:bg-white/10'}`}
                                            style={{
                                                background: filters.page === i + 1 ? 'var(--brand-lime)' : 'var(--bg-input)',
                                                border: '1px solid var(--border-main)',
                                                color: filters.page === i + 1 ? '#000' : 'var(--text-main)'
                                            }}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    disabled={filters.page === pagination.totalPages}
                                    onClick={() => handlePageChange(filters.page + 1)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer hover:bg-white/10"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    {t('management.common.pagination.next')}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* CRUD Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-300">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Plus className="text-lime" />
                                {t('management.insurances.modalTitleCreate')}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-dim hover:text-white transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-lime">{t('management.insurances.form.policyInfo')}</h3>
                                    
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-dim uppercase">Supplier *</label>
                                        <select
                                            required
                                            disabled={supplierLoading}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-lime transition-all text-sm disabled:opacity-50"
                                            value={formData.supplier}
                                            onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                                        >
                                            <option value="">{supplierLoading ? 'Loading Suppliers...' : 'Select Insurance Supplier'}</option>
                                            {suppliers.map(s => (
                                                <option key={s._id} value={s._id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-dim uppercase">Country *</label>
                                        <input
                                            required
                                            type="text"
                                            placeholder="e.g. Global, UAE, India"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-lime transition-all"
                                            value={formData.country}
                                            onChange={(e) => setFormData({...formData, country: e.target.value})}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs text-dim uppercase">{t('management.insurances.form.policyType')}</label>
                                            <select
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-lime transition-all text-sm"
                                                value={formData.policyType}
                                                onChange={(e) => setFormData({...formData, policyType: e.target.value as PolicyType})}
                                            >
                                                <option value="INDIVIDUAL">{t('management.insurances.types.INDIVIDUAL')}</option>
                                                <option value="FLEET">{t('management.insurances.types.FLEET')}</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs text-dim uppercase">{t('management.insurances.form.coverage')}</label>
                                            <select
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-lime transition-all text-sm"
                                                value={formData.coverageType}
                                                onChange={(e) => setFormData({...formData, coverageType: e.target.value as CoverageType})}
                                            >
                                                <option value="COMPREHENSIVE">{t('management.insurances.coverage.COMPREHENSIVE')}</option>
                                                <option value="THIRD_PARTY">{t('management.insurances.coverage.THIRD_PARTY')}</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-lime">{t('management.insurances.form.financialsTimeline')}</h3>
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
                                            <label className="text-xs text-dim uppercase">{t('management.insurances.form.startDate')} (Opt)</label>
                                            <input
                                                type="date"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-lime transition-all text-sm"
                                                value={formData.startDate}
                                                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs text-dim uppercase">{t('management.insurances.form.expiryDate')} (Opt)</label>
                                            <input
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
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-lime">{t('management.insurances.form.policyDoc')}</h3>
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
                                                     <span className="text-[10px] text-dim">{t('management.insurances.form.clickToChange')}</span>
                                                 </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2">
                                                     <Upload className="text-dim group-hover:text-lime transition-colors" size={24} />
                                                     <span className="text-xs font-medium">{t('management.insurances.form.uploadDoc')}</span>
                                                     <span className="text-[10px] text-dim">{t('management.insurances.form.docTypes')}</span>
                                                 </div>
                                            )}
                                        </label>
                                    </div>
                                </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                     className="px-6 py-3 rounded-xl font-bold hover:bg-white/5 transition-all text-dim hover:text-white"
                                 >
                                     {t('management.common.modal.cancel')}
                                 </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-3 bg-lime text-black rounded-xl font-bold hover:shadow-[0_0_20px_rgba(163,230,53,0.3)] transition-all flex items-center gap-2"
                                >
                                    {loading ? (
                                        <div className="animate-spin border-2 border-black border-t-transparent rounded-full w-4 h-4" />
                                     ) : (
                                         <Check size={20} />
                                     )}
                                     {t('management.insurances.createButton')}
                                 </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* ImageViewer Modal */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 animate-in fade-in duration-300"
                    onClick={() => setSelectedImage(null)}
                >
                    <button 
                        className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-10"
                        onClick={() => setSelectedImage(null)}
                    >
                        <X size={24} />
                    </button>
                    <div 
                        className="relative max-w-5xl max-h-[90vh] w-full flex items-center justify-center animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img 
                            src={selectedImage} 
                            alt="Insurance Document" 
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-white/10"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageInsurances;
