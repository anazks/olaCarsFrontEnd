/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, RefreshCw, BookMarked, AlertTriangle, X, Edit2, Trash2, List, Upload, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { getAllAccountingCodes, createAccountingCode, updateAccountingCode, deleteAccountingCode } from '../../../services/accountingService';
import type { AccountingCode, CreateAccountingCodePayload, AccountingCategory } from '../../../services/accountingService';
import { getUserRole } from '../../../utils/auth';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import BulkAccountingCodeUpload from './BulkAccountingCodeUpload';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { FileText } from 'lucide-react';

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    'INCOME': { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' }, // Green
    'EXPENSE': { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' }, // Red
    'ASSET': { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6', border: 'rgba(59,130,246,0.3)' }, // Blue
    'LIABILITY': { bg: 'rgba(249,115,22,0.1)', text: '#f97316', border: 'rgba(249,115,22,0.3)' }, // Orange
    'EQUITY': { bg: 'rgba(168,85,247,0.1)', text: '#a855f7', border: 'rgba(168,85,247,0.3)' }, // Purple
};

const CATEGORIES: AccountingCategory[] = ['INCOME', 'EXPENSE', 'ASSET', 'LIABILITY', 'EQUITY'];

const ACCOUNT_TYPES = [
    'Income', 'Expense', 'Cost of Goods Sold', 'Other Expense', 'Cash', 'Bank', 'Accounts Receivable', 'Fixed Asset',
    'Other Current Asset', 'Other Asset',
    'Accounts Payable', 'Other Current Liability', 'Other Liability',
    'Non Current Liability', 'Output Tax', 'Input Tax',
    'Stock', 'Equity'
];

const mapAccountTypeToCategory = (type: string): AccountingCategory => {
    const t = type.toLowerCase().trim();
    if (['income', 'other income', 'ncome'].includes(t)) return 'INCOME';
    if (['expense', 'other expense', 'cost of goods sold', 'expence'].includes(t)) return 'EXPENSE';
    if (['equity', 'stock'].includes(t)) return 'EQUITY';
    if (['liability', 'other liability', 'other current liability', 'non current liability', 'non current liab', 'accounts payable', 'output tax'].includes(t)) return 'LIABILITY';
    return 'ASSET';
};

const ChartOfAccounts = ({ isEmbedded = false }: { isEmbedded?: boolean }) => {
    const [codes, setCodes] = useState<AccountingCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddRouteActive, setIsAddRouteActive] = useState(false);
    const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    
    // Filters
    const [activeCategoryFilter, setActiveCategoryFilter] = useState<AccountingCategory | 'ALL'>('ALL');
    const [activeAccountTypeFilter, setActiveAccountTypeFilter] = useState<string>('');

    // Pagination, Sorting & Search States
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'code' | 'name' | 'category' | 'createdAt'>('code');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(10);
    const [pagination, setPagination] = useState<{ total: number; page: number; limit: number; totalPages: number } | null>(null);

    // Add Form State
    const [newCode, setNewCode] = useState<CreateAccountingCodePayload>({
        code: '',
        name: '',
        category: 'INCOME',
        accountType: 'Income',
        description: '',
        mileageRate: 0,
        mileageUnit: '',
        isMileage: false,
        accountNumber: '',
        accountStatus: 'Active',
        currency: 'USD',
        parentAccount: '',
        cuentaEspanol: ''
    });
    const [creating, setCreating] = useState(false);

    // Edit Form State
    const [editingCode, setEditingCode] = useState<AccountingCode | null>(null);
    const [editPayload, setEditPayload] = useState<CreateAccountingCodePayload>({
        code: '',
        name: '',
        category: 'INCOME',
        accountType: 'Income',
        description: '',
        mileageRate: 0,
        mileageUnit: '',
        isMileage: false,
        accountNumber: '',
        accountStatus: 'Active',
        currency: 'USD',
        parentAccount: '',
        cuentaEspanol: ''
    });
    const [isEditing, setIsEditing] = useState(false);

    // Delete State
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const userRole = getUserRole() || '';
    const canManageCodes = ['admin', 'financeadmin'].includes(userRole);

    const handleExportExcel = () => {
        if (codes.length === 0) {
            toast.error("No accounting codes available to export.");
            return;
        }
        const toastId = toast.loading("Generating Excel file...");
        try {
            const exportData = codes.map((c, idx) => ({
                "Sl No.": String(idx + 1).padStart(2, '0'),
                "Account Code": c.code || 'N/A',
                "Account Name": c.name || 'N/A',
                "Category": c.category || 'N/A',
                "Account Type": c.accountType || 'N/A',
                "Description": c.description || '—',
                "Parent Account": typeof c.parentAccount === 'object' ? (c.parentAccount as any)?.name : c.parentAccount || '—',
                "Status": c.accountStatus || 'Active'
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Chart of Accounts");
            
            const keys = Object.keys(exportData[0]);
            ws["!cols"] = keys.map(key => {
                const maxLen = Math.max(
                    key.length,
                    ...exportData.map(row => String((row as any)[key] || "").length)
                );
                return { wch: maxLen + 2 };
            });

            const dateStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `chart_of_accounts_export_${dateStr}.xlsx`);
            toast.success("Excel file downloaded successfully!", { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export Excel file.", { id: toastId });
        }
    };

    const handleExportCsv = () => {
        if (codes.length === 0) {
            toast.error("No accounting codes available to export.");
            return;
        }
        const toastId = toast.loading("Generating CSV file...");
        try {
            const exportData = codes.map((c, idx) => ({
                "Sl No.": String(idx + 1).padStart(2, '0'),
                "Account Code": c.code || 'N/A',
                "Account Name": c.name || 'N/A',
                "Category": c.category || 'N/A',
                "Account Type": c.accountType || 'N/A',
                "Description": c.description || '—',
                "Parent Account": typeof c.parentAccount === 'object' ? (c.parentAccount as any)?.name : c.parentAccount || '—',
                "Status": c.accountStatus || 'Active'
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const csvContent = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement("a");
            link.setAttribute("href", url);
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute("download", `chart_of_accounts_export_${dateStr}.csv`);
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
        if (codes.length === 0) {
            toast.error("No accounting codes available to export.");
            return;
        }
        const toastId = toast.loading("Generating PDF file...");
        try {
            const doc = new jsPDF();
            const dateStr = new Date().toISOString().split('T')[0];
            const title = "Chart of Accounts Report";
            
            doc.setFontSize(18);
            doc.text(title, 14, 22);
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 29);

            const head = [["Sl No.", "Code", "Name", "Category", "Account Type", "Status"]];
            const body = codes.map((c, idx) => [
                String(idx + 1).padStart(2, '0'),
                c.code || 'N/A',
                c.name || 'N/A',
                c.category || 'N/A',
                c.accountType || 'N/A',
                c.accountStatus || 'Active'
            ]);

            autoTable(doc, {
                head,
                body,
                startY: 34,
                theme: 'striped',
                headStyles: { fillColor: [200, 230, 0], textColor: [0, 0, 0] }
            });

            doc.save(`chart_of_accounts_export_${dateStr}.pdf`);
            toast.success("PDF file downloaded successfully!", { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export PDF file.", { id: toastId });
        }
    };

    const fetchCodes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (isEmbedded) {
                const data = await getAllAccountingCodes();
                setCodes(Array.isArray(data) ? data : []);
                setPagination(null);
            } else {
                const params: any = {
                    page: currentPage,
                    limit,
                    sortBy,
                    sortOrder,
                };
                if (searchQuery.trim()) {
                    params.search = searchQuery.trim();
                }
                if (activeCategoryFilter !== 'ALL') {
                    params.category = activeCategoryFilter;
                }
                if (activeAccountTypeFilter) {
                    params.accountType = activeAccountTypeFilter;
                }
                const response = await getAllAccountingCodes(params);
                setCodes(Array.isArray(response.data) ? response.data : []);
                setPagination(response.pagination || null);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch accounting codes');
        } finally {
            setLoading(false);
        }
    }, [isEmbedded, currentPage, limit, sortBy, sortOrder, searchQuery, activeCategoryFilter, activeAccountTypeFilter]);

    useEffect(() => {
        if (isEmbedded) {
            fetchCodes();
            return;
        }
        const timer = setTimeout(() => {
            fetchCodes();
        }, searchQuery ? 500 : 0);
        return () => clearTimeout(timer);
    }, [fetchCodes, searchQuery, activeCategoryFilter, currentPage, isEmbedded]);

    useEffect(() => {
        if (location.state?.openAddForm) {
            setIsAddRouteActive(true);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location, navigate]);

    const handleSort = (field: 'code' | 'name' | 'category' | 'createdAt') => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
        setCurrentPage(1);
    };

    const SortIcon = ({ field }: { field: 'code' | 'name' | 'category' | 'createdAt' }) => {
        if (sortBy !== field) return <ChevronDown size={10} className="opacity-20 ml-1 inline-block" />;
        return <span className={`inline-block ml-1 transition-transform duration-200 ${sortOrder === 'asc' ? 'rotate-180' : ''}`}><ChevronDown size={14} style={{ color: 'var(--brand-lime)' }} /></span>;
    };

    const handlePageChange = (newPage: number) => {
        if (pagination && newPage >= 1 && newPage <= pagination.totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleCreateCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setError(null);
        try {
            const payload = {
                ...newCode,
                category: mapAccountTypeToCategory(newCode.accountType || 'Income'),
                parentAccount: newCode.parentAccount || null
            };
            await createAccountingCode(payload);
            setNewCode({
                code: '',
                name: '',
                category: 'INCOME',
                accountType: 'Income',
                description: '',
                mileageRate: 0,
                mileageUnit: '',
                isMileage: false,
                accountNumber: '',
                accountStatus: 'Active',
                currency: 'USD',
                parentAccount: '',
                cuentaEspanol: ''
            });
            setIsAddRouteActive(false);
            await fetchCodes();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to create accounting code');
        } finally {
            setCreating(false);
        }
    };

    const handleEditClick = (code: AccountingCode) => {
        setEditingCode(code);
        setEditPayload({
            code: code.code,
            name: code.name,
            category: code.category,
            accountType: code.accountType || 'Income',
            description: code.description || '',
            mileageRate: code.mileageRate || 0,
            mileageUnit: code.mileageUnit || '',
            isMileage: !!code.isMileage,
            accountNumber: code.accountNumber || '',
            accountStatus: code.accountStatus || 'Active',
            currency: code.currency || 'USD',
            parentAccount: typeof code.parentAccount === 'object' && code.parentAccount ? code.parentAccount._id : (code.parentAccount || ''),
            cuentaEspanol: code.cuentaEspanol || ''
        });
        setIsAddRouteActive(false);
    };

    const handleUpdateCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCode) return;
        setIsEditing(true);
        setError(null);
        try {
            const targetId = editingCode._id || (editingCode as any).id;
            const payload = {
                ...editPayload,
                category: mapAccountTypeToCategory(editPayload.accountType || 'Income'),
                parentAccount: editPayload.parentAccount || null
            };
            await updateAccountingCode(targetId, payload);
            setEditingCode(null);
            await fetchCodes();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to update: ' + (typeof err === 'object' ? JSON.stringify(err.response?.data || err.message) : err));
        } finally {
            setIsEditing(false);
        }
    };

    const handleDeleteClick = (id: string) => {
        setDeletingId(id);
    };

    const confirmDelete = async () => {
        if (!deletingId) return;
        setIsDeleting(true);
        setError(null);
        try {
            await deleteAccountingCode(deletingId);
            await fetchCodes();
            setDeletingId(null);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to delete: ' + (typeof err === 'object' ? JSON.stringify(err.response?.data || err.message) : err));
            setDeletingId(null);
        } finally {
            setIsDeleting(false);
        }
    };

    const getHierarchicalCodes = (flatCodes: AccountingCode[]): (AccountingCode & { depth: number })[] => {
        const idToChildren: Record<string, AccountingCode[]> = {};
        const roots: AccountingCode[] = [];
        const idToCode: Record<string, AccountingCode> = {};

        flatCodes.forEach(c => {
            const id = c._id || (c as any).id;
            if (id) idToCode[id] = c;
        });

        flatCodes.forEach(c => {
            const parentId = c.parentAccount
                ? (typeof c.parentAccount === 'object'
                    ? (c.parentAccount._id || (c.parentAccount as any).id)
                    : String(c.parentAccount))
                : null;

            if (parentId && idToCode[parentId]) {
                if (!idToChildren[parentId]) {
                    idToChildren[parentId] = [];
                }
                idToChildren[parentId].push(c);
            } else {
                roots.push(c);
            }
        });

        roots.sort((a, b) => a.code.localeCompare(b.code));

        const result: (AccountingCode & { depth: number })[] = [];

        const traverse = (node: AccountingCode, depth: number) => {
            result.push({ ...node, depth });
            const nodeId = node._id || (node as any).id;
            if (nodeId && idToChildren[nodeId]) {
                const children = idToChildren[nodeId];
                children.sort((a, b) => a.code.localeCompare(b.code));
                children.forEach(child => {
                    traverse(child, depth + 1);
                });
            }
        };

        roots.forEach(root => {
            traverse(root, 0);
        });

        return result;
    };

    const hierarchicalCodes = getHierarchicalCodes(codes);
    const filteredCodes = hierarchicalCodes.filter(c => {
        if (activeCategoryFilter !== 'ALL' && c.category !== activeCategoryFilter) return false;
        if (activeAccountTypeFilter && (c.accountType || '').toLowerCase() !== activeAccountTypeFilter.toLowerCase()) return false;
        return true;
    });

    return (
        <div className={isEmbedded ? "space-y-6" : "container-responsive space-y-6"}>
            {!isEmbedded && <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Chart Of Accounts', active: true }]} />}

            {/* Compact Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <BookMarked size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        Chart of Accounts
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">Manage financial buckets and accounting codes</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold transition-all border outline-none hover:bg-white/5 active:scale-95 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <FileText size={14} className="text-emerald-500" /> Excel
                    </button>

                    <button
                        onClick={handleExportCsv}
                        className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all border outline-none hover:bg-white/5 active:scale-95 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <FileText size={14} className="text-blue-400" /> CSV
                    </button>

                    <button
                        onClick={handleExportPdf}
                        className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all border outline-none hover:bg-white/5 active:scale-95 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <FileText size={14} className="text-rose-500" /> PDF
                    </button>

                    <button
                        onClick={fetchCodes}
                        className="flex items-center justify-center p-2 rounded-xl border transition-all hover:bg-white/5 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {canManageCodes && !isAddRouteActive && (
                        <>
                            <button
                                onClick={() => setIsBulkUploadOpen(true)}
                                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide border transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer hover:bg-white/5"
                                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <Upload size={14} /> Bulk Upload
                            </button>
                            <button
                                onClick={() => setIsAddRouteActive(true)}
                                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-brand-lime text-[#0A0A0A] transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                                style={{ backgroundColor: 'var(--brand-lime)' }}
                            >
                                <Plus size={14} strokeWidth={3} /> Add Code
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Create Form */}
            {isAddRouteActive && (
                <div className="p-6 rounded-2xl border transition-colors duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Add Accounting Code</h2>
                        <button onClick={() => setIsAddRouteActive(false)} className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'var(--text-dim)' }}>
                            <X size={20} />
                        </button>
                    </div>
                    <form onSubmit={handleCreateCode} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Code</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. 4000"
                                    value={newCode.code}
                                    onChange={e => setNewCode({ ...newCode, code: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Name</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Rental Income"
                                    value={newCode.name}
                                    onChange={e => setNewCode({ ...newCode, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Account Type</label>
                                <select
                                    required
                                    value={newCode.accountType}
                                    onChange={e => setNewCode({ ...newCode, accountType: e.target.value, category: mapAccountTypeToCategory(e.target.value) })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    {ACCOUNT_TYPES.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Parent Account</label>
                                <select
                                    value={newCode.parentAccount || ''}
                                    onChange={e => setNewCode({ ...newCode, parentAccount: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="">— None —</option>
                                    {codes.map(c => (
                                        <option key={c._id} value={c._id}>{c.code} - {c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Cuenta en Español</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Caja Menuda"
                                    value={newCode.cuentaEspanol || ''}
                                    onChange={e => setNewCode({ ...newCode, cuentaEspanol: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Account #</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 1010-01"
                                    value={newCode.accountNumber || ''}
                                    onChange={e => setNewCode({ ...newCode, accountNumber: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Currency</label>
                                <input
                                    type="text"
                                    placeholder="USD"
                                    value={newCode.currency || 'USD'}
                                    onChange={e => setNewCode({ ...newCode, currency: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Status</label>
                                <select
                                    value={newCode.accountStatus || 'Active'}
                                    onChange={e => setNewCode({ ...newCode, accountStatus: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Description</label>
                                <input
                                    type="text"
                                    placeholder="Enter description..."
                                    value={newCode.description || ''}
                                    onChange={e => setNewCode({ ...newCode, description: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div className="flex items-center pt-8">
                                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer" style={{ color: 'var(--text-main)' }}>
                                    <input
                                        type="checkbox"
                                        checked={!!newCode.isMileage}
                                        onChange={e => setNewCode({ ...newCode, isMileage: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-300 text-lime focus:ring-lime"
                                    />
                                    Is Mileage Account
                                </label>
                            </div>
                            {newCode.isMileage && (
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-main)' }}>Rate</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            value={newCode.mileageRate || 0}
                                            onChange={e => setNewCode({ ...newCode, mileageRate: Number(e.target.value) })}
                                            className="w-full px-3 py-2 rounded-xl outline-none text-xs"
                                            style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-main)' }}>Unit</label>
                                        <select
                                            value={newCode.mileageUnit || ''}
                                            onChange={e => setNewCode({ ...newCode, mileageUnit: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl outline-none text-xs"
                                            style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                        >
                                            <option value="">None</option>
                                            <option value="KM">KM</option>
                                            <option value="MI">MI</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={creating}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: '#C8E600', color: '#0A0A0A' }}
                            >
                                {creating ? 'Creating...' : 'Create Accounting Code'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Edit Form */}
            {editingCode && (
                <div className="p-6 rounded-2xl border transition-colors duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Edit Accounting Code</h2>
                        <button onClick={() => setEditingCode(null)} className="p-2 rounded-lg hover:bg-white/5 transition-colors" style={{ color: 'var(--text-dim)' }}>
                            <X size={20} />
                        </button>
                    </div>
                    <form onSubmit={handleUpdateCode} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Code</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. 4000"
                                    value={editPayload.code}
                                    onChange={e => setEditPayload({ ...editPayload, code: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Name</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Rental Income"
                                    value={editPayload.name}
                                    onChange={e => setEditPayload({ ...editPayload, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Account Type</label>
                                <select
                                    required
                                    value={editPayload.accountType}
                                    onChange={e => setEditPayload({ ...editPayload, accountType: e.target.value, category: mapAccountTypeToCategory(e.target.value) })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    {ACCOUNT_TYPES.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Parent Account</label>
                                <select
                                    value={editPayload.parentAccount || ''}
                                    onChange={e => setEditPayload({ ...editPayload, parentAccount: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="">— None —</option>
                                    {codes.filter(c => c._id !== (editingCode?._id || (editingCode as any)?.id)).map(c => (
                                        <option key={c._id} value={c._id}>{c.code} - {c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Cuenta en Español</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Placa y Permiso..."
                                    value={editPayload.cuentaEspanol || ''}
                                    onChange={e => setEditPayload({ ...editPayload, cuentaEspanol: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Account #</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 1010-01"
                                    value={editPayload.accountNumber || ''}
                                    onChange={e => setEditPayload({ ...editPayload, accountNumber: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Currency</label>
                                <input
                                    type="text"
                                    placeholder="USD"
                                    value={editPayload.currency || 'USD'}
                                    onChange={e => setEditPayload({ ...editPayload, currency: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Status</label>
                                <select
                                    value={editPayload.accountStatus || 'Active'}
                                    onChange={e => setEditPayload({ ...editPayload, accountStatus: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-main)' }}>Description</label>
                                <input
                                    type="text"
                                    placeholder="Enter description..."
                                    value={editPayload.description || ''}
                                    onChange={e => setEditPayload({ ...editPayload, description: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div className="flex items-center pt-8">
                                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer" style={{ color: 'var(--text-main)' }}>
                                    <input
                                        type="checkbox"
                                        checked={!!editPayload.isMileage}
                                        onChange={e => setEditPayload({ ...editPayload, isMileage: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-300 text-lime focus:ring-lime"
                                    />
                                    Is Mileage Account
                                </label>
                            </div>
                            {editPayload.isMileage && (
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-main)' }}>Rate</label>
                                        <input
                                            type="number"
                                            step="0.001"
                                            value={editPayload.mileageRate || 0}
                                            onChange={e => setEditPayload({ ...editPayload, mileageRate: Number(e.target.value) })}
                                            className="w-full px-3 py-2 rounded-xl outline-none text-xs"
                                            style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-main)' }}>Unit</label>
                                        <select
                                            value={editPayload.mileageUnit || ''}
                                            onChange={e => setEditPayload({ ...editPayload, mileageUnit: e.target.value })}
                                            className="w-full px-3 py-2 rounded-xl outline-none text-xs"
                                            style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                        >
                                            <option value="">None</option>
                                            <option value="KM">KM</option>
                                            <option value="MI">MI</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={isEditing}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ background: '#C8E600', color: '#0A0A0A' }}
                            >
                                {isEditing ? 'Updating...' : 'Update Accounting Code'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deletingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !isDeleting && setDeletingId(null)}>
                    <div className="bg-[#1A1A1A] border border-[#333] rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 text-red-500 mb-4">
                            <AlertTriangle size={24} />
                            <h3 className="text-lg font-bold text-white">Confirm Deletion</h3>
                        </div>
                        <p className="text-[#A0A0A0] text-sm mb-6">
                            Are you sure you want to delete this accounting code? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeletingId(null)}
                                disabled={isDeleting}
                                className="px-4 py-2 rounded-xl text-sm font-medium text-[#A0A0A0] hover:text-white transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {isDeleting ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                Delete 
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Search and Filters */}
            {!isEmbedded && (
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Search input */}
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search by code, name, or account type..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-12 pr-4 py-4 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime font-medium"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>

                    {/* Account Type dropdown filter */}
                    <div className="relative sm:w-64">
                        <select
                            id="accountTypeFilter"
                            value={activeAccountTypeFilter}
                            onChange={(e) => {
                                setActiveAccountTypeFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-4 pr-10 py-4 rounded-xl outline-none text-sm font-medium appearance-none cursor-pointer transition-all focus:ring-2 focus:ring-lime"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: activeAccountTypeFilter ? 'var(--brand-lime)' : 'var(--text-dim)' }}
                        >
                            <option value="">All Account Types</option>
                            {ACCOUNT_TYPES.map(type => (
                                <option key={type} value={type} style={{ color: 'var(--text-main)', background: 'var(--bg-card)' }}>
                                    {type}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: activeAccountTypeFilter ? 'var(--brand-lime)' : 'var(--text-dim)' }} />
                        {activeAccountTypeFilter && (
                            <button
                                onClick={() => { setActiveAccountTypeFilter(''); setCurrentPage(1); }}
                                className="absolute right-8 top-1/2 -translate-y-1/2 hover:opacity-70 transition-opacity"
                                title="Clear filter"
                                style={{ color: 'var(--brand-lime)' }}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1 p-1 rounded-xl w-max" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)' }}>
                {(['ALL', ...CATEGORIES] as const).map((cat) => {
                    const isActive = activeCategoryFilter === cat;
                    const count = cat === 'ALL' ? codes.length : codes.filter(c => c.category === cat).length;
                    return (
                        <button
                            key={cat}
                            onClick={() => {
                                setActiveCategoryFilter(cat);
                                setCurrentPage(1);
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
                            style={{
                                background: isActive ? 'rgba(200,230,0,0.15)' : 'transparent',
                                color: isActive ? '#C8E600' : 'var(--text-dim)',
                                fontWeight: isActive ? 700 : 500,
                            }}
                        >
                            {cat}
                            {isEmbedded && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                                    background: isActive ? 'rgba(200,230,0,0.2)' : 'var(--bg-sidebar)',
                                    color: isActive ? '#C8E600' : 'var(--text-dim)',
                                }}>
                                    {count}
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Table */}
            <div className="rounded-2xl overflow-hidden border transition-colors duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filteredCodes.length === 0 ? (
                        <div className="text-center py-20" style={{ color: 'var(--text-dim)' }}>
                            <BookMarked size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">No accounting codes found</p>
                            <p className="text-sm mt-1">Adjust your filters or add a new code.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b transition-colors duration-300" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                    <th className="px-6 py-4">
                                        {isEmbedded ? (
                                            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Code</span>
                                        ) : (
                                            <button onClick={() => handleSort('code')} className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider outline-none hover:text-lime transition-colors" style={{ color: 'var(--text-dim)' }}>
                                                Code <SortIcon field="code" />
                                            </button>
                                        )}
                                    </th>
                                    <th className="px-6 py-4">
                                        {isEmbedded ? (
                                            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Name</span>
                                        ) : (
                                            <button onClick={() => handleSort('name')} className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider outline-none hover:text-lime transition-colors" style={{ color: 'var(--text-dim)' }}>
                                                Name <SortIcon field="name" />
                                            </button>
                                        )}
                                    </th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Account Type</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Spanish Name</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Parent Account</th>
                                    <th className="px-6 py-4">
                                        {isEmbedded ? (
                                            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Category</span>
                                        ) : (
                                            <button onClick={() => handleSort('category')} className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider outline-none hover:text-lime transition-colors" style={{ color: 'var(--text-dim)' }}>
                                                Category <SortIcon field="category" />
                                            </button>
                                        )}
                                    </th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCodes.map((c) => {
                                    const style = CATEGORY_STYLES[c.category] || { bg: 'transparent', text: 'var(--text-main)', border: 'transparent' };
                                    const codeId = c._id || (c as any).id;
                                    const parentVal = c.parentAccount
                                        ? (typeof c.parentAccount === 'object' && 'name' in c.parentAccount
                                            ? `${c.parentAccount.code} - ${c.parentAccount.name}`
                                            : String(c.parentAccount))
                                        : '—';
                                    return (
                                        <tr key={codeId} className="border-b last:border-0 hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-main)' }}>
                                            <td className="px-6 py-4">
                                                <div className="font-mono text-sm font-bold" style={{ color: 'var(--text-main)' }}>{c.code}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-sm flex items-center gap-1.5" style={{ color: 'var(--text-main)', paddingLeft: `${c.depth * 20}px` }}>
                                                    {c.depth > 0 && <span className="opacity-45 text-[11px] font-mono select-none" style={{ color: 'var(--text-dim)' }}>↳</span>}
                                                    {c.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-main)' }}>
                                                {c.accountType || '—'}
                                            </td>
                                            <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-dim)' }}>
                                                {c.cuentaEspanol || '—'}
                                            </td>
                                            <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-dim)' }}>
                                                {parentVal}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
                                                    style={{ background: style.bg, color: style.text, borderColor: style.border }}>
                                                    {c.category}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button 
                                                        onClick={() => navigate(`../chart-of-accounts/${codeId}`)}
                                                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                                        style={{ color: 'var(--text-dim)' }}
                                                        title="View Transactions"
                                                    >
                                                        <List size={16} />
                                                    </button>
                                                    {canManageCodes && (
                                                        <>
                                                            <button 
                                                                onClick={() => handleEditClick(c)}
                                                                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                                                style={{ color: 'var(--text-dim)' }}
                                                                title="Edit Code"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteClick(codeId)}
                                                                disabled={deletingId === codeId}
                                                                className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                                                style={{ color: '#ef4444' }}
                                                                title="Delete Code"
                                                            >
                                                                {deletingId === codeId && isDeleting ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination footer */}
                {!isEmbedded && pagination && pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t flex items-center justify-between gap-4" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                        <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                            Showing <span className="text-lime font-black">{filteredCodes.length}</span> of <span className="text-white font-black">{pagination.total}</span> records
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
            <BulkAccountingCodeUpload
                isOpen={isBulkUploadOpen}
                onClose={() => setIsBulkUploadOpen(false)}
                onSuccess={() => {
                    setIsBulkUploadOpen(false);
                    fetchCodes();
                }}
            />
        </div>
    );
};

export default ChartOfAccounts;
