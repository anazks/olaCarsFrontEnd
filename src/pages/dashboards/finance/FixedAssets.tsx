import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Layers, Clipboard, AlertTriangle, ArrowUpRight, Search, Tag, Edit2, Trash2, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { getAllFixedAssets, getFixedAssetTypes, createFixedAssetType, updateFixedAssetType, deleteFixedAssetType } from '../../../services/fixedAssetService';
import BulkFixedAssetUpload from './BulkFixedAssetUpload';
import type { FixedAsset, FixedAssetType } from '../../../services/fixedAssetService';
import Modal from '../../../components/Modal';
import toast from 'react-hot-toast';
import { getUserRole } from '../../../utils/auth';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText } from 'lucide-react';

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    'Draft': { bg: 'rgba(100, 116, 139, 0.1)', text: '#64748b', border: 'rgba(100, 116, 139, 0.3)' }, // Gray
    'Pending': { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' }, // Yellow/Orange
    'Active': { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' }, // Green
    'Inactive': { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' }, // Red
};

const FixedAssets = () => {
    const [assets, setAssets] = useState<FixedAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const navigate = useNavigate();
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 25,
        totalPages: 0
    });

    const getPageNumbers = () => {
        const totalPages = pagination.totalPages;
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        const pages: (number | string)[] = [];
        pages.push(1);
        const page = pagination.page;
        let start = Math.max(2, page - 1);
        let end = Math.min(totalPages - 1, page + 1);

        if (page <= 3) {
            end = 4;
        }
        if (page >= totalPages - 2) {
            start = totalPages - 3;
        }

        if (start > 2) {
            pages.push('...');
        }
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        if (end < totalPages - 1) {
            pages.push('...');
        }
        pages.push(totalPages);
        return pages;
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= (pagination?.totalPages || 1)) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    const handleLimitChange = (newLimit: number) => {
        setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
    };

    // Fixed Asset Types Management state
    const [isTypesModalOpen, setIsTypesModalOpen] = useState(false);
    const [assetTypes, setAssetTypes] = useState<FixedAssetType[]>([]);
    const [loadingTypes, setLoadingTypes] = useState(false);
    const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
    const [typeName, setTypeName] = useState('');
    const [typeDescription, setTypeDescription] = useState('');
    const [submittingType, setSubmittingType] = useState(false);

    const userRole = getUserRole() || '';
    const isFinancialAdmin = ['admin', 'financeadmin', 'financialadmin'].includes(userRole.toLowerCase());

    const getRolePath = () => {
        const role = userRole.toLowerCase();
        if (role === 'admin') return 'admin';
        return 'financial-admin';
    };

    const handleExportExcel = () => {
        if (assets.length === 0) {
            toast.error("No fixed assets available to export.");
            return;
        }
        const toastId = toast.loading("Generating Excel file...");
        try {
            const exportData = assets.map((a, idx) => ({
                "Sl No.": String(idx + 1).padStart(2, '0'),
                "Asset Code": a.assetCode || 'N/A',
                "Asset Name": a.assetName || 'N/A',
                "Asset Type": typeof a.assetType === 'object' ? a.assetType?.name : 'N/A',
                "Serial Number": a.serialNumber || '—',
                "Purchase Date": a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString() : 'N/A',
                "Purchase Cost ($)": a.purchaseCost || 0,
                "Current Value ($)": a.currentValue || 0,
                "Depreciation Rate (%)": a.depreciationRate || 0,
                "Status": a.status || 'N/A',
                "Location": a.location || '—'
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Fixed Assets");
            
            const keys = Object.keys(exportData[0]);
            ws["!cols"] = keys.map(key => {
                const maxLen = Math.max(
                    key.length,
                    ...exportData.map(row => String((row as any)[key] || "").length)
                );
                return { wch: maxLen + 2 };
            });

            const dateStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `fixed_assets_export_${dateStr}.xlsx`);
            toast.success("Excel file downloaded successfully!", { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export Excel file.", { id: toastId });
        }
    };

    const handleExportCsv = () => {
        if (assets.length === 0) {
            toast.error("No fixed assets available to export.");
            return;
        }
        const toastId = toast.loading("Generating CSV file...");
        try {
            const exportData = assets.map((a, idx) => ({
                "Sl No.": String(idx + 1).padStart(2, '0'),
                "Asset Code": a.assetCode || 'N/A',
                "Asset Name": a.assetName || 'N/A',
                "Asset Type": typeof a.assetType === 'object' ? a.assetType?.name : 'N/A',
                "Serial Number": a.serialNumber || '—',
                "Purchase Date": a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString() : 'N/A',
                "Purchase Cost ($)": a.purchaseCost || 0,
                "Current Value ($)": a.currentValue || 0,
                "Depreciation Rate (%)": a.depreciationRate || 0,
                "Status": a.status || 'N/A',
                "Location": a.location || '—'
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const csvContent = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement("a");
            link.setAttribute("href", url);
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute("download", `fixed_assets_export_${dateStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success("CSV file downloaded successfully!", { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export CSV file.", { id: toastId });
        }
    };

    const handleExportPdf = () => {
        if (assets.length === 0) {
            toast.error("No fixed assets available to export.");
            return;
        }
        const toastId = toast.loading("Generating PDF file...");
        try {
            const doc = new jsPDF();
            const dateStr = new Date().toISOString().split('T')[0];
            const title = "Fixed Assets Report";
            
            doc.setFontSize(18);
            doc.text(title, 14, 22);
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 29);

            const head = [["Sl No.", "Asset Code", "Asset Name", "Asset Type", "Purchase Date", "Cost ($)", "Status"]];
            const body = assets.map((a, idx) => [
                String(idx + 1).padStart(2, '0'),
                a.assetCode || 'N/A',
                a.assetName || 'N/A',
                typeof a.assetType === 'object' ? a.assetType?.name : 'N/A',
                a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString() : 'N/A',
                `$${(a.purchaseCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                a.status || 'N/A'
            ]);

            autoTable(doc, {
                head,
                body,
                startY: 34,
                theme: 'striped',
                headStyles: { fillColor: [200, 230, 0], textColor: [0, 0, 0] }
            });

            doc.save(`fixed_assets_export_${dateStr}.pdf`);
            toast.success("PDF file downloaded successfully!", { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export PDF file.", { id: toastId });
        }
    };

    const fetchAssets = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params: any = {
                page: pagination.page,
                limit: pagination.limit
            };
            if (statusFilter !== 'ALL') params.status = statusFilter;
            if (searchQuery.trim()) params.search = searchQuery.trim();

            const res = await getAllFixedAssets(params);
            if (res && res.data) {
                setAssets(res.data);
                setPagination(prev => ({
                    ...prev,
                    total: res.pagination?.total || 0,
                    totalPages: res.pagination?.pages || 0,
                    page: res.pagination?.page || prev.page
                }));
            } else {
                setAssets(res || []);
                setPagination(prev => ({
                    ...prev,
                    total: (res || []).length,
                    totalPages: 1,
                    page: 1
                }));
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch fixed assets');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, searchQuery, pagination.page, pagination.limit]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchAssets();
        }, searchQuery ? 400 : 0);
        return () => clearTimeout(timer);
    }, [fetchAssets, searchQuery, statusFilter]);

    const fetchAssetTypes = useCallback(async () => {
        setLoadingTypes(true);
        try {
            const data = await getFixedAssetTypes();
            setAssetTypes(data);
        } catch (err) {
            console.error("Failed to fetch fixed asset types", err);
        } finally {
            setLoadingTypes(false);
        }
    }, []);

    useEffect(() => {
        if (isTypesModalOpen) {
            fetchAssetTypes();
        }
    }, [isTypesModalOpen, fetchAssetTypes]);

    const handleTypeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = typeName.trim();
        if (!trimmedName) {
            toast.error("Asset Type name cannot be empty");
            return;
        }

        setSubmittingType(true);
        try {
            if (editingTypeId) {
                const updated = await updateFixedAssetType(editingTypeId, {
                    name: trimmedName,
                    description: typeDescription.trim(),
                });
                setAssetTypes(prev => prev.map(t => t._id === editingTypeId ? updated : t));
                toast.success(`Asset Type "${trimmedName}" updated!`);
            } else {
                if (assetTypes.some(t => t.name.toLowerCase() === trimmedName.toLowerCase())) {
                    toast.error("An Asset Type with this name already exists");
                    setSubmittingType(false);
                    return;
                }
                const newType = await createFixedAssetType({
                    name: trimmedName,
                    description: typeDescription.trim(),
                });
                setAssetTypes(prev => [...prev, newType]);
                toast.success(`Asset Type "${trimmedName}" created!`);
            }
            setTypeName('');
            setTypeDescription('');
            setEditingTypeId(null);
        } catch (err) {
            console.error("Failed to save fixed asset type", err);
        } finally {
            setSubmittingType(false);
        }
    };

    const handleEditType = (type: FixedAssetType) => {
        setEditingTypeId(type._id);
        setTypeName(type.name);
        setTypeDescription(type.description || '');
    };

    const handleCancelEdit = () => {
        setEditingTypeId(null);
        setTypeName('');
        setTypeDescription('');
    };

    const handleDeleteType = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to delete the asset type "${name}"?`)) {
            return;
        }

        try {
            await deleteFixedAssetType(id);
            setAssetTypes(prev => prev.filter(t => t._id !== id));
            toast.success(`Asset Type "${name}" deleted!`);
        } catch (err) {
            console.error("Failed to delete fixed asset type", err);
        }
    };

    const getBookValue = (asset: FixedAsset) => {
        if (asset.currentValue !== undefined && asset.currentValue !== null) {
            return asset.currentValue;
        }
        if (asset.depreciationSchedule && asset.depreciationSchedule.length > 0) {
            // Find last posted entry
            const posted = asset.depreciationSchedule
                .filter(e => e.status === 'Posted')
                .sort((a, b) => b.periodIndex - a.periodIndex);
            if (posted.length > 0) return posted[0].bookValue;
        }
        return asset.purchasePrice;
    };

    return (
        <div className="container-responsive space-y-6">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Fixed Assets', active: true }]} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <Layers size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        Fixed Assets
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">Track capitalization, residual value, and run depreciation schedules</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-[11px] font-bold transition-all border outline-none hover:bg-white/5 active:scale-95 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <FileText size={14} className="text-emerald-500" /> Excel
                    </button>

                    <button
                        onClick={handleExportCsv}
                        className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-[11px] font-bold transition-all border outline-none hover:bg-white/5 active:scale-95 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <FileText size={14} className="text-blue-400" /> CSV
                    </button>

                    <button
                        onClick={handleExportPdf}
                        className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-[11px] font-bold transition-all border outline-none hover:bg-white/5 active:scale-95 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <FileText size={14} className="text-rose-500" /> PDF
                    </button>

                    <button
                        onClick={fetchAssets}
                        className="flex items-center justify-center p-2.5 rounded-xl border transition-all hover:bg-white/5 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {isFinancialAdmin && (
                        <>
                            <button
                                onClick={() => setIsTypesModalOpen(true)}
                                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide border transition-all hover:bg-white/5 active:scale-95 cursor-pointer"
                                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <Tag size={14} /> Asset Types
                            </button>
                            <button
                                onClick={() => setIsUploadModalOpen(true)}
                                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide border transition-all hover:bg-white/5 active:scale-95 cursor-pointer"
                                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <Upload size={14} /> Import Assets
                            </button>
                            <button
                                onClick={() => navigate(`/admin/${getRolePath()}/fixed-assets/new`)}
                                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wide bg-brand-lime text-[#0A0A0A] transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                                style={{ backgroundColor: 'var(--brand-lime)' }}
                            >
                                <Plus size={14} strokeWidth={3} /> Capitalize Asset
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/[0.02] border p-4 rounded-2xl" style={{ borderColor: 'var(--border-main)' }}>
                <div className="relative w-full md:w-80">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by asset name or code..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl outline-none text-sm transition-colors focus:ring-1 focus:ring-lime"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                    />
                </div>

                <div className="flex gap-1 overflow-x-auto w-full md:w-auto custom-scrollbar pb-1 md:pb-0">
                    {['ALL', 'Draft', 'Pending', 'Active', 'Inactive'].map((status) => (
                        <button
                            key={status}
                            onClick={() => { setStatusFilter(status); setPagination(prev => ({ ...prev, page: 1 })); }}
                            className="px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer"
                            style={{
                                background: statusFilter === status ? '#C8E600' : 'rgba(255,255,255,0.02)',
                                color: statusFilter === status ? '#000' : 'var(--text-dim)',
                                border: statusFilter === status ? '1px solid #C8E600' : '1px solid var(--border-main)',
                            }}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Assets Table */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-8 h-8 border-3 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs" style={{ color: 'var(--text-dim)' }}>Loading asset registry...</p>
                </div>
            ) : assets.length === 0 ? (
                <div className="text-center py-20 border rounded-2xl space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <Clipboard size={40} className="mx-auto text-gray-600 opacity-40" />
                    <h3 className="font-bold text-base" style={{ color: 'var(--text-main)' }}>No Fixed Assets Found</h3>
                    <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--text-dim)' }}>
                        Draft assets are created automatically when bills are paid or purchase orders are received. You can also capitalize assets manually.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Asset Info</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Account</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Purchase Date</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Useful Life</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Original Cost</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Book Value</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {assets.map((asset) => {
                                const styles = STATUS_STYLES[asset.status] || STATUS_STYLES.Draft;
                                const originalCost = asset.purchasePrice;
                                const bookValue = getBookValue(asset);
                                return (
                                    <tr
                                        key={asset._id}
                                        onClick={() => navigate(`/admin/${getRolePath()}/fixed-assets/${asset._id}`)}
                                        className="hover:bg-white/5 cursor-pointer transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{asset.name}</div>
                                            <div className="flex gap-2 items-center text-[10px] mt-1">
                                                <span className="font-mono" style={{ color: 'var(--text-dim)' }}>{asset.code}</span>
                                                <span style={{ color: 'var(--text-dim)' }}>•</span>
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-dim)', border: '1px solid var(--border-main)' }}>
                                                    {typeof asset.fixedAssetType === 'object' && asset.fixedAssetType
                                                        ? asset.fixedAssetType.name
                                                        : (asset.fixedAssetType || 'Vehicles')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                                            {typeof asset.fixedAssetAccount === 'object' ? asset.fixedAssetAccount.name : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-xs" style={{ color: 'var(--text-dim)' }}>
                                            {new Date(asset.purchaseDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-xs" style={{ color: 'var(--text-dim)' }}>
                                            {asset.usefulLifeYears} Years ({asset.depreciationInterval})
                                        </td>
                                        <td className="px-6 py-4 text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                                            ${originalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold" style={{ color: '#C8E600' }}>
                                            ${bookValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                                                style={{ background: styles.bg, color: styles.text, borderColor: styles.border }}
                                            >
                                                {asset.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => navigate(`/admin/${getRolePath()}/fixed-assets/${asset._id}`)}
                                                className="p-2 bg-white/5 rounded-xl border border-white/10 hover:border-[#C8E600] text-dim hover:text-[#C8E600] transition-all cursor-pointer"
                                            >
                                                <ArrowUpRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    
                    {/* Pagination Controls */}
                    <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors shadow-[0_-1px_0_0_rgba(0,0,0,0.05)]" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                        <div className="flex flex-wrap items-center gap-4">
                            <p className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>
                                Showing {assets.length} of {pagination.total} fixed assets
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>Rows per page:</span>
                                <select
                                    value={pagination.limit}
                                    onChange={(e) => handleLimitChange(Number(e.target.value))}
                                    className="px-2 py-1 rounded bg-[var(--bg-input)] border border-[var(--border-main)] text-xs font-bold outline-none cursor-pointer focus:ring-1 focus:ring-lime"
                                    style={{ color: 'var(--text-main)' }}
                                >
                                    {[25, 50, 100].map(val => (
                                        <option key={val} value={val} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>{val}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page === 1 || loading}
                                    className="p-2 rounded-lg border transition-all hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
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
                                                onClick={() => handlePageChange(Number(p))}
                                                className={`w-9 h-9 rounded-lg text-xs font-black transition-all ${pagination.page === p ? 'shadow-lg scale-110 z-10' : 'hover:bg-black/5 opacity-70 hover:opacity-100'}`}
                                                style={{ 
                                                    background: pagination.page === p ? 'var(--brand-lime)' : 'transparent',
                                                    color: pagination.page === p ? '#000' : 'var(--text-main)',
                                                    border: pagination.page === p ? 'none' : '1px solid var(--border-main)'
                                                }}
                                            >
                                                {p}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page === pagination.totalPages || loading}
                                    className="p-2 rounded-lg border transition-all hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* Manage Asset Types Modal */}
            <Modal isOpen={isTypesModalOpen} onClose={() => { setIsTypesModalOpen(false); handleCancelEdit(); }} title="Manage Fixed Asset Types" size="2xl">
                <div className="space-y-6 text-xs font-semibold max-h-[80vh] overflow-y-auto pr-1">
                    {/* Upper form to Add/Edit */}
                    <form onSubmit={handleTypeSubmit} className="space-y-4 p-4 rounded-xl border transition-all" style={{ background: 'var(--bg-main)', borderColor: 'var(--border-main)' }}>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#C8E600] flex items-center gap-1.5">
                            {editingTypeId ? 'Edit Asset Type' : 'Add New Asset Type'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                    Type Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Computer Equipment"
                                    value={typeName}
                                    onChange={e => setTypeName(e.target.value)}
                                    className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-[#C8E600] transition-all font-semibold"
                                    style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                    Description
                                </label>
                                <input
                                    type="text"
                                    placeholder="Brief description of the asset category"
                                    value={typeDescription}
                                    onChange={e => setTypeDescription(e.target.value)}
                                    className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-[#C8E600] transition-all font-semibold"
                                    style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            {editingTypeId && (
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="px-4 py-2 rounded-lg border font-bold hover:bg-white/5 transition-all cursor-pointer"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    Cancel Edit
                                </button>
                            )}
                            <button
                                type="submit"
                                disabled={submittingType}
                                className="px-5 py-2 rounded-lg font-black text-black bg-[#C8E600] flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                                style={{ background: '#C8E600' }}
                            >
                                {submittingType ? 'Saving...' : editingTypeId ? 'Update Type' : 'Create Type'}
                            </button>
                        </div>
                    </form>

                    {/* Lower list/table of Types */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                            Existing Asset Types
                        </h3>
                        {loadingTypes ? (
                            <div className="flex justify-center py-6">
                                <div className="w-6 h-6 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : assetTypes.length === 0 ? (
                            <div className="text-center py-8 border rounded-xl" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                                No fixed asset types found.
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-main)' }}>
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-black/5 dark:bg-white/5 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Name</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Description</th>
                                            <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {assetTypes.map(type => (
                                            <tr key={type._id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors border-b" style={{ borderColor: 'var(--border-main)' }}>
                                                <td className="px-4 py-3 font-bold text-sm" style={{ color: 'var(--text-main)' }}>{type.name}</td>
                                                <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>{type.description || '—'}</td>
                                                <td className="px-4 py-3 text-right space-x-2">
                                                    <button
                                                        onClick={() => handleEditType(type)}
                                                        className="p-1.5 bg-black/[0.02] dark:bg-white/5 rounded-lg border border-black/10 dark:border-white/10 hover:border-[#C8E600] transition-all cursor-pointer inline-flex items-center justify-center"
                                                        style={{ color: 'var(--text-muted)' }}
                                                    >
                                                        <Edit2 size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteType(type._id, type.name)}
                                                        className="p-1.5 bg-black/[0.02] dark:bg-white/5 rounded-lg border border-black/10 dark:border-white/10 hover:border-red-500 transition-all cursor-pointer inline-flex items-center justify-center"
                                                        style={{ color: 'var(--text-muted)' }}
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
            <BulkFixedAssetUpload
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onSuccess={() => {
                    setIsUploadModalOpen(false);
                    fetchAssets();
                }}
            />
        </div>
    );
};

export default FixedAssets;
