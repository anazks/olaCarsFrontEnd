import { formatDate } from '../../../utils/dateUtils';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, X, RefreshCw, Search, Users, AlertTriangle, MapPin, Mail, Phone, Tag, Eye, Upload, ChevronLeft, ChevronRight, FileText, Paperclip, ExternalLink, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BulkSupplierUpload from './BulkSupplierUpload';
import {
    getAllSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    type Supplier,
    type CreateSupplierPayload,
    type UpdateSupplierPayload,
    type SupplierFilters,
} from '../../../services/supplierService';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import { validatePhoneDetails } from '../../../utils/phoneValidation';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

type ModalMode = 'create' | 'edit' | null;

const CATEGORIES = [
    "Vehicles",
    "Insurance",
    "Spare Parts",
    "Services",
    "Office Supplies",
    "IT Equipment",
    "Marketing",
    "Other"
];

const ManageSuppliers = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Server-side filtering & pagination state
    const [filters, setFilters] = useState({
        page: 1,
        limit: 10,
        search: '',
        category: '',
        isActive: undefined as boolean | undefined,
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
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        companyName: '',
        displayName: '',
        vendorNumber: '',
        contactPerson: '',
        salutation: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        mobilePhone: '',
        address: '',
        website: '',
        source: '',
        companyId: '',
        primaryContactId: '',
        category: CATEGORIES[0],
        customCategory: '',
        isActive: true
    });
    const [formError, setFormError] = useState<string | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Document attachments state
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [existingDocs, setExistingDocs] = useState<any[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            const validFiles = newFiles.filter(file => {
                if (file.size > 20 * 1024 * 1024) {
                    toast.error(`${file.name} exceeds 20MB limit`);
                    return false;
                }
                return true;
            });
            setSelectedFiles(prev => [...prev, ...validFiles]);
        }
        e.target.value = '';
    };

    const removeSelectedFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, idx) => idx !== index));
    };

    const removeExistingDoc = (docIndexOrId: number | string) => {
        setExistingDocs(prev => prev.filter((doc, idx) => (doc._id ? doc._id !== docIndexOrId : idx !== docIndexOrId)));
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return '';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Bulk upload modal state
    const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

    const fetchAllSuppliersForExport = async (): Promise<Supplier[]> => {
        try {
            const exportFilters: SupplierFilters = {
                search: filters.search ? filters.search.trim() : undefined,
                category: filters.category || undefined,
                isActive: filters.isActive,
                page: 1,
                limit: 100000
            };
            const response = await getAllSuppliers(exportFilters);
            if (response.success && Array.isArray(response.data) && response.data.length > 0) {
                return response.data;
            }
        } catch (err) {
            console.error("Failed to fetch all suppliers for export, falling back to loaded page:", err);
        }
        return suppliers;
    };

    const handleExportExcel = async () => {
        if (suppliers.length === 0) {
            toast.error("No suppliers available to export.");
            return;
        }
        const toastId = toast.loading("Fetching all vendors for Excel export...");
        try {
            const allSuppliers = await fetchAllSuppliersForExport();
            if (allSuppliers.length === 0) {
                toast.error("No suppliers available to export.", { id: toastId });
                return;
            }
            toast.loading(`Generating Excel file for ${allSuppliers.length} vendors...`, { id: toastId });

            const exportData = allSuppliers.map((s, idx) => ({
                "Sl No.": String(idx + 1).padStart(2, '0'),
                "Vendor Number": s.vendorNumber || 'N/A',
                "Supplier Name": s.name || 'N/A',
                "Contact Person": s.contactPerson || 'N/A',
                "Email": s.email || 'N/A',
                "Phone": s.phone || s.mobilePhone || 'N/A',
                "Category": s.category || 'N/A',
                "Address": s.address || 'N/A',
                "Status": s.isActive ? 'Active' : 'Inactive'
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Suppliers");
            
            const keys = Object.keys(exportData[0]);
            ws["!cols"] = keys.map(key => {
                const maxLen = Math.max(
                    key.length,
                    ...exportData.map(row => String((row as any)[key] || "").length)
                );
                return { wch: maxLen + 2 };
            });

            const dateStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `suppliers_export_${dateStr}.xlsx`);
            toast.success(`Exported all ${allSuppliers.length} vendors successfully!`, { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export Excel file.", { id: toastId });
        }
    };

    const handleExportCsv = async () => {
        if (suppliers.length === 0) {
            toast.error("No suppliers available to export.");
            return;
        }
        const toastId = toast.loading("Fetching all vendors for CSV export...");
        try {
            const allSuppliers = await fetchAllSuppliersForExport();
            if (allSuppliers.length === 0) {
                toast.error("No suppliers available to export.", { id: toastId });
                return;
            }
            toast.loading(`Generating CSV file for ${allSuppliers.length} vendors...`, { id: toastId });

            const exportData = allSuppliers.map((s, idx) => ({
                "Sl No.": String(idx + 1).padStart(2, '0'),
                "Vendor Number": s.vendorNumber || 'N/A',
                "Supplier Name": s.name || 'N/A',
                "Contact Person": s.contactPerson || 'N/A',
                "Email": s.email || 'N/A',
                "Phone": s.phone || s.mobilePhone || 'N/A',
                "Category": s.category || 'N/A',
                "Address": s.address || 'N/A',
                "Status": s.isActive ? 'Active' : 'Inactive'
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const csvContent = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement("a");
            link.setAttribute("href", url);
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute("download", `suppliers_export_${dateStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success(`Exported all ${allSuppliers.length} vendors successfully!`, { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export CSV file.", { id: toastId });
        }
    };

    const handleExportPdf = async () => {
        if (suppliers.length === 0) {
            toast.error("No suppliers available to export.");
            return;
        }
        const toastId = toast.loading("Fetching all vendors for PDF export...");
        try {
            const allSuppliers = await fetchAllSuppliersForExport();
            if (allSuppliers.length === 0) {
                toast.error("No suppliers available to export.", { id: toastId });
                return;
            }
            toast.loading(`Generating PDF file for ${allSuppliers.length} vendors...`, { id: toastId });

            const doc = new jsPDF();
            const dateStr = new Date().toISOString().split('T')[0];
            const title = "Suppliers / Vendors Registry";
            
            doc.setFontSize(18);
            doc.text(title, 14, 22);
            doc.setFontSize(10);
            doc.text(`Generated on: ${formatDate(new Date())}`, 14, 29);

            const head = [["Sl No.", "Vendor No.", "Supplier Name", "Contact Person", "Email", "Phone", "Category", "Status"]];
            const body = allSuppliers.map((s, idx) => [
                String(idx + 1).padStart(2, '0'),
                s.vendorNumber || 'N/A',
                s.name || 'N/A',
                s.contactPerson || 'N/A',
                s.email || 'N/A',
                s.phone || s.mobilePhone || 'N/A',
                s.category || 'N/A',
                s.isActive ? 'Active' : 'Inactive'
            ]);

            autoTable(doc, {
                head,
                body,
                startY: 34,
                theme: 'striped',
                headStyles: { fillColor: [200, 230, 0], textColor: [0, 0, 0] }
            });

            doc.save(`suppliers_export_${dateStr}.pdf`);
            toast.success(`Exported all ${allSuppliers.length} vendors to PDF!`, { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export PDF file.", { id: toastId });
        }
    };

    const fetchSuppliers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getAllSuppliers(filters);
            if (response.success) {
                setSuppliers(response.data);
                setPagination(response.pagination);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || t('management.suppliers.fetchFailed'));
        } finally {
            setLoading(false);
        }
    }, [filters, t]);

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

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

    const getPageNumbers = () => {
        const totalPages = pagination?.totalPages || 1;
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const pages: (number | string)[] = [];
        pages.push(1);

        let start = Math.max(2, filters.page - 1);
        let end = Math.min(totalPages - 1, filters.page + 1);

        if (filters.page <= 3) { end = 4; }
        if (filters.page >= totalPages - 2) { start = totalPages - 3; }

        if (start > 2) { pages.push('...'); }
        for (let i = start; i <= end; i++) { pages.push(i); }
        if (end < totalPages - 1) { pages.push('...'); }
        pages.push(totalPages);
        return pages;
    };

    const openCreateModal = () => {
        setModalMode('create');
        setSelectedSupplier(null);
        setSelectedFiles([]);
        setExistingDocs([]);
        setFormData({
            name: '',
            companyName: '',
            displayName: '',
            vendorNumber: '',
            contactPerson: '',
            salutation: '',
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            mobilePhone: '',
            address: '',
            website: '',
            source: '',
            companyId: '',
            primaryContactId: '',
            category: CATEGORIES[0],
            customCategory: '',
            isActive: true
        });
        setFormError(null);
    };

    const openEditModal = (supplier: Supplier) => {
        setModalMode('edit');
        setSelectedSupplier(supplier);
        setSelectedFiles([]);
        setExistingDocs(supplier.documents || []);

        const isPredefined = CATEGORIES.includes(supplier.category);

        setFormData({
            name: supplier.name || supplier.companyName || supplier.displayName || '',
            companyName: supplier.companyName || supplier.name || '',
            displayName: supplier.displayName || supplier.name || '',
            vendorNumber: supplier.vendorNumber || '',
            contactPerson: supplier.contactPerson || '',
            salutation: supplier.salutation || '',
            firstName: supplier.firstName || '',
            lastName: supplier.lastName || '',
            email: supplier.email || '',
            phone: supplier.phone || '',
            mobilePhone: supplier.mobilePhone || '',
            address: supplier.address || '',
            website: supplier.website || '',
            source: supplier.source || '',
            companyId: supplier.companyId || '',
            primaryContactId: supplier.primaryContactId || '',
            category: isPredefined ? supplier.category : 'Other',
            customCategory: isPredefined ? '' : supplier.category,
            isActive: supplier.isActive
        });
        setFormError(null);
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedSupplier(null);
        setSelectedFiles([]);
        setExistingDocs([]);
        setFormError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setFormError(null);

        // Validate email format if provided
        if (formData.email && formData.email.trim()) {
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(formData.email.trim())) {
                setFormError(t('management.suppliers.form.invalidEmailFormat', { defaultValue: 'Please enter a valid email address.' }));
                setFormLoading(false);
                return;
            }
        }

        // Validate phone number using the centralized helper if provided
        if (formData.phone && formData.phone.trim()) {
            const phoneValidation = validatePhoneDetails(formData.phone);
            if (!phoneValidation.isValid) {
                let errorMsg = '';
                switch (phoneValidation.errorKey) {
                    case 'REPEATED_DIGITS':
                        errorMsg = t('management.suppliers.form.invalidPhoneRepeated', { defaultValue: 'Phone number cannot consist of repeated digits.' });
                        break;
                    case 'TOO_SHORT':
                        errorMsg = t('management.suppliers.form.phoneTooShort', { defaultValue: 'Phone number is too short.' });
                        break;
                    case 'TOO_LONG':
                        errorMsg = t('management.suppliers.form.phoneTooLong', { defaultValue: 'Phone number is too long.' });
                        break;
                    case 'INVALID_FORMAT':
                    default:
                        errorMsg = t('management.suppliers.form.invalidPhoneLength', { defaultValue: 'Please enter a valid phone number.' });
                        break;
                }
                setFormError(errorMsg);
                setFormLoading(false);
                return;
            }
        }

        const finalCategory = formData.category === 'Other' || formData.category === t('management.suppliers.categories.Other')
            ? formData.customCategory
            : formData.category;

        if (!finalCategory.trim()) {
            setFormError(t('management.suppliers.form.specifyCategory'));
            setFormLoading(false);
            return;
        }

        const primaryName = (formData.companyName || formData.name || formData.displayName || '').trim();
        if (!primaryName) {
            setFormError(t('management.suppliers.form.specifyName', { defaultValue: 'Please enter a Company Name or Supplier Name.' }));
            setFormLoading(false);
            return;
        }

        try {
            if (modalMode === 'create') {
                if (selectedFiles.length > 0) {
                    const fd = new FormData();
                    fd.append('name', primaryName);
                    fd.append('companyName', formData.companyName || primaryName);
                    fd.append('displayName', formData.displayName || primaryName);
                    fd.append('vendorNumber', formData.vendorNumber || '');
                    fd.append('contactPerson', formData.contactPerson || '');
                    fd.append('salutation', formData.salutation || '');
                    fd.append('firstName', formData.firstName || '');
                    fd.append('lastName', formData.lastName || '');
                    fd.append('email', formData.email || '');
                    fd.append('phone', formData.phone || '');
                    fd.append('mobilePhone', formData.mobilePhone || '');
                    fd.append('address', formData.address || '');
                    fd.append('website', formData.website || '');
                    fd.append('source', formData.source || '');
                    fd.append('companyId', formData.companyId || '');
                    fd.append('primaryContactId', formData.primaryContactId || '');
                    fd.append('category', finalCategory);
                    fd.append('isActive', String(formData.isActive));
                    selectedFiles.forEach(file => {
                        fd.append('files', file);
                    });
                    await createSupplier(fd);
                } else {
                    const payload: CreateSupplierPayload = {
                        name: primaryName,
                        companyName: formData.companyName || primaryName,
                        displayName: formData.displayName || primaryName,
                        vendorNumber: formData.vendorNumber,
                        contactPerson: formData.contactPerson,
                        salutation: formData.salutation,
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        email: formData.email,
                        phone: formData.phone,
                        mobilePhone: formData.mobilePhone,
                        address: formData.address,
                        website: formData.website,
                        source: formData.source,
                        companyId: formData.companyId,
                        primaryContactId: formData.primaryContactId,
                        category: finalCategory,
                        isActive: formData.isActive
                    };
                    await createSupplier(payload);
                }
                toast.success(t('management.suppliers.createdSuccess', { defaultValue: 'Supplier created successfully.' }));
            } else if (modalMode === 'edit' && selectedSupplier) {
                if (selectedFiles.length > 0 || (selectedSupplier.documents && existingDocs.length !== selectedSupplier.documents.length)) {
                    const fd = new FormData();
                    fd.append('id', selectedSupplier._id);
                    fd.append('name', primaryName);
                    fd.append('companyName', formData.companyName || primaryName);
                    fd.append('displayName', formData.displayName || primaryName);
                    fd.append('vendorNumber', formData.vendorNumber || '');
                    fd.append('contactPerson', formData.contactPerson || '');
                    fd.append('salutation', formData.salutation || '');
                    fd.append('firstName', formData.firstName || '');
                    fd.append('lastName', formData.lastName || '');
                    fd.append('email', formData.email || '');
                    fd.append('phone', formData.phone || '');
                    fd.append('mobilePhone', formData.mobilePhone || '');
                    fd.append('address', formData.address || '');
                    fd.append('website', formData.website || '');
                    fd.append('source', formData.source || '');
                    fd.append('companyId', formData.companyId || '');
                    fd.append('primaryContactId', formData.primaryContactId || '');
                    fd.append('category', finalCategory);
                    fd.append('isActive', String(formData.isActive));
                    fd.append('existingDocuments', JSON.stringify(existingDocs));
                    selectedFiles.forEach(file => {
                        fd.append('files', file);
                    });
                    await updateSupplier(fd);
                } else {
                    const payload: UpdateSupplierPayload = {
                        id: selectedSupplier._id,
                        name: primaryName,
                        companyName: formData.companyName || primaryName,
                        displayName: formData.displayName || primaryName,
                        vendorNumber: formData.vendorNumber,
                        contactPerson: formData.contactPerson,
                        salutation: formData.salutation,
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        email: formData.email,
                        phone: formData.phone,
                        mobilePhone: formData.mobilePhone,
                        address: formData.address,
                        website: formData.website,
                        source: formData.source,
                        companyId: formData.companyId,
                        primaryContactId: formData.primaryContactId,
                        category: finalCategory,
                        isActive: formData.isActive,
                        existingDocuments: existingDocs
                    };
                    await updateSupplier(payload);
                }
                toast.success(t('management.suppliers.updatedSuccess', { defaultValue: 'Supplier updated successfully.' }));
            }
            closeModal();
            fetchSuppliers();
        } catch (err: any) {
            setFormError(err.response?.data?.message || err.message || t('management.common.operationFailed'));
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await deleteSupplier(deleteTarget._id);
            setDeleteTarget(null);
            fetchSuppliers();
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || t('management.common.deleteFailed'));
            setDeleteTarget(null);
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Manage Suppliers', active: true }]} />

            {/* Compact Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <Users size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        {t('management.suppliers.title')}
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">{t('management.suppliers.subtitle')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={fetchSuppliers}
                        className="flex items-center justify-center p-2 rounded-xl border transition-all hover:bg-white/5 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => setIsBulkUploadOpen(true)}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-white/5 border border-white/10 text-white transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer hover:bg-white/10"
                    >
                        <Upload size={14} /> Bulk Upload
                    </button>
                        <button
                            onClick={handleExportExcel}
                            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold bg-white/5 border border-white/10 text-white transition-all hover:bg-white/10 hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                        >
                            <FileText size={14} className="text-emerald-500" /> Excel
                        </button>

                        <button
                            onClick={handleExportCsv}
                            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold bg-white/5 border border-white/10 text-white transition-all hover:bg-white/10 hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                        >
                            <FileText size={14} className="text-blue-400" /> CSV
                        </button>

                        <button
                            onClick={handleExportPdf}
                            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold bg-white/5 border border-white/10 text-white transition-all hover:bg-white/10 hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                        >
                            <FileText size={14} className="text-rose-500" /> PDF
                        </button>

                        <button
                            onClick={openCreateModal}
                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-brand-lime text-[#0A0A0A] transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                            style={{ backgroundColor: 'var(--brand-lime)' }}
                        >
                            <Plus size={14} strokeWidth={3} /> {t('management.suppliers.add')}
                        </button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder={t('management.common.searchPlaceholder')}
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>
                    <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 border ${
                            showAdvancedFilters 
                            ? 'border-lime text-lime bg-lime/10' 
                            : 'border-transparent text-gray-400 bg-white/5 hover:bg-white/10'
                        }`}
                        style={{ borderColor: showAdvancedFilters ? 'var(--brand-lime)' : 'var(--border-main)' }}
                    >
                        <Plus size={18} className={`transition-transform duration-300 ${showAdvancedFilters ? 'rotate-45' : ''}`} />
                        {t('management.common.filters')}
                    </button>
                </div>

                {showAdvancedFilters && (
                    <div 
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 rounded-2xl border animate-in slide-in-from-top-4 duration-300"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest px-1" style={{ color: 'var(--text-dim)' }}>{t('management.suppliers.form.category')}</label>
                            <select
                                value={filters.category}
                                onChange={(e) => handleFilterChange('category', e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl outline-none text-sm font-bold"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="">{t('management.suppliers.categories.all')}</option>
                                {CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest px-1" style={{ color: 'var(--text-dim)' }}>{t('management.common.table.status')}</label>
                            <select
                                value={filters.isActive === undefined ? '' : filters.isActive.toString()}
                                onChange={(e) => handleFilterChange('isActive', e.target.value === '' ? undefined : e.target.value === 'true')}
                                className="w-full px-4 py-2.5 rounded-xl outline-none text-sm font-bold"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="">{t('management.common.allStatuses')}</option>
                                <option value="true">{t('management.common.status.active')}</option>
                                <option value="false">{t('management.common.status.inactive')}</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => setFilters({
                                    page: 1,
                                    limit: 10,
                                    search: '',
                                    category: '',
                                    isActive: undefined,
                                    sortBy: 'createdAt',
                                    sortOrder: 'desc'
                                })}
                                className="w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border border-dashed transition-all hover:bg-white/5"
                                style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                            >
                                {t('management.common.resetAll')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Error banner */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Table */}
            <div className="rounded-2xl overflow-hidden border transition-colors duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : suppliers.length === 0 ? (
                        <div className="text-center py-20" style={{ color: 'var(--text-dim)' }}>
                            <Users size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">{t('management.suppliers.notFound')}</p>
                            <p className="text-sm mt-1">{t('management.suppliers.clickToAdd')}</p>
                        </div>
                    ) : (
                        <>
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b transition-colors duration-300" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.suppliers.table.supplierInfo')}</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.suppliers.table.contactPerson')}</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.suppliers.table.contactDetails')}</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.suppliers.form.category')}</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.common.table.status')}</th>
                                        <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>{t('management.common.table.actions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {suppliers.map((supplier: Supplier) => (
                                        <tr
                                            key={supplier._id}
                                            className="border-b last:border-0 hover:bg-white/5 transition-colors cursor-pointer"
                                            style={{ borderColor: 'var(--border-main)' }}
                                            onClick={() => navigate(`${supplier._id}`)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                                    {supplier.name}
                                                </div>
                                                <div className="flex items-center gap-1 text-xs mt-1" style={{ color: 'var(--text-dim)' }}>
                                                    <MapPin size={12} />
                                                    <span className="line-clamp-1">{supplier.address}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>{supplier.contactPerson}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-main)' }}>
                                                        <Mail size={14} style={{ color: '#C8E600' }} />
                                                        {supplier.email}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-dim)' }}>
                                                        <Phone size={14} style={{ color: '#C8E600' }} />
                                                        {supplier.phone}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest" style={{ background: 'rgba(200,230,0,0.1)', color: '#C8E600', border: '1px solid rgba(200,230,0,0.2)' }}>
                                                    <Tag size={12} />
                                                    {supplier.category}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${supplier.isActive ? '' : 'opacity-50'}`}
                                                    style={{
                                                        background: supplier.isActive ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)',
                                                        color: supplier.isActive ? '#22c55e' : '#6b7280',
                                                        borderColor: supplier.isActive ? 'rgba(34,197,94,0.3)' : 'rgba(107,114,128,0.3)'
                                                    }}>
                                                    {supplier.isActive ? t('management.common.status.active').toUpperCase() : t('management.common.status.inactive').toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); navigate(`${supplier._id}`); }}
                                                        className="p-2 rounded-xl transition-all cursor-pointer hover:bg-brand-lime/20 active:scale-95"
                                                        style={{ background: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)' }}
                                                        title="View Supplier Profile & Ledger"
                                                    >
                                                        <Eye size={15} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); openEditModal(supplier); }}
                                                        className="p-2 rounded-xl transition-all cursor-pointer hover:bg-blue-500/20 active:scale-95"
                                                        style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}
                                                        title={t('management.common.edit', { defaultValue: 'Edit' })}
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(supplier); }}
                                                        className="p-2 rounded-xl transition-all cursor-pointer hover:bg-red-500/20 active:scale-95"
                                                        style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}
                                                        title={t('management.common.delete.title', { defaultValue: 'Delete' })}
                                                    >
                                                        <Trash2 size={15} />
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
                                    {t('management.common.showing')} <span style={{ color: 'var(--text-main)' }}>{suppliers.length}</span> {t('management.common.of')} <span style={{ color: 'var(--text-main)' }}>{pagination.total}</span> {t('management.common.records')}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        disabled={filters.page === 1}
                                        onClick={() => handlePageChange(filters.page - 1)}
                                        className="p-2 rounded-lg border border-white/10 text-dim hover:text-white disabled:opacity-20 transition-all cursor-pointer bg-transparent"
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
                                                    onClick={() => handlePageChange(Number(p))}
                                                    className={`w-9 h-9 rounded-lg text-xs font-black transition-all cursor-pointer ${filters.page === p ? 'shadow-lg scale-110 z-10' : 'opacity-70 hover:opacity-100'}`}
                                                    style={{
                                                        background: filters.page === p ? 'var(--brand-lime)' : 'transparent',
                                                        border: filters.page === p ? 'none' : '1px solid var(--border-main)',
                                                        color: filters.page === p ? '#000' : 'var(--text-main)'
                                                    }}
                                                >
                                                    {p}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <button
                                        disabled={filters.page === pagination.totalPages}
                                        onClick={() => handlePageChange(filters.page + 1)}
                                        className="p-2 rounded-lg border border-white/10 text-dim hover:text-white disabled:opacity-20 transition-all cursor-pointer bg-transparent"
                                        style={{ borderColor: 'var(--border-main)' }}
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

            {/* Modals */}
            {modalMode && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-3"
                    style={{
                        background: "rgba(0,0,0,0.8)",
                        backdropFilter: "blur(8px)"
                    }}
                >
                    <div
                        className="rounded-2xl p-6 max-w-4xl w-full mx-2 relative border max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-300"
                        style={{
                            background: "var(--bg-card)",
                            borderColor: "var(--border-main)"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* HEADER */}
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-semibold" style={{ color: "var(--text-main)" }}>
                                {modalMode === "create" ? t('management.suppliers.modalTitleCreate') : t('management.suppliers.modalTitleEdit')}
                            </h2>
                            <button onClick={closeModal} className="p-2 hover:bg-white/10 rounded-lg transition">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* SECTION 1: Company Profile */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: "var(--border-main)" }}>
                                    <Briefcase size={16} className="text-brand-lime" />
                                    <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-main)" }}>
                                        {t('management.suppliers.sections.companyInfo', { defaultValue: 'Company Information' })}
                                    </h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Company Name */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                            {t('management.suppliers.form.companyName', { defaultValue: 'Company Name' })} *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                                            style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                            value={formData.companyName}
                                            onChange={(e) => setFormData({ ...formData, companyName: e.target.value, name: e.target.value })}
                                            placeholder={t('management.suppliers.form.companyNamePlaceholder', { defaultValue: 'Enter company name' })}
                                        />
                                    </div>

                                    {/* Display Name */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                            {t('management.suppliers.form.displayName', { defaultValue: 'Display Name' })}
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                                            style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                            value={formData.displayName}
                                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                            placeholder={t('management.suppliers.form.displayNamePlaceholder', { defaultValue: 'Enter public display name' })}
                                        />
                                    </div>

                                    {/* Vendor Number */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                            {t('management.suppliers.form.vendorNumber', { defaultValue: 'Vendor Number' })}
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                                            style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                            value={formData.vendorNumber}
                                            onChange={(e) => setFormData({ ...formData, vendorNumber: e.target.value })}
                                            placeholder="e.g. VEN-00124"
                                        />
                                    </div>

                                    {/* Company ID */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                            {t('management.suppliers.form.companyId', { defaultValue: 'Company ID' })}
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                                            style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                            value={formData.companyId}
                                            onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                                            placeholder="e.g. COMP-9812"
                                        />
                                    </div>

                                    {/* Category Dropdown */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                            {t('management.suppliers.form.category')}
                                        </label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                                            style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                        >
                                            {CATEGORIES.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Custom Category if Other or Source */}
                                    {formData.category === 'Other' || formData.category === t('management.suppliers.categories.Other') ? (
                                        <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                                            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                                {t('management.suppliers.form.customCategory')}
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                                                style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                                value={formData.customCategory}
                                                onChange={(e) => setFormData({ ...formData, customCategory: e.target.value })}
                                                placeholder={t('management.suppliers.form.customCategoryPlaceholder')}
                                            />
                                        </div>
                                    ) : (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                                {t('management.suppliers.form.source', { defaultValue: 'Source' })}
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                                                style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                                value={formData.source}
                                                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                                                placeholder="e.g. Referral, Trade Show, Direct"
                                            />
                                        </div>
                                    )}
                                </div>

                                {(formData.category === 'Other' || formData.category === t('management.suppliers.categories.Other')) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                                {t('management.suppliers.form.source', { defaultValue: 'Source' })}
                                            </label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                                                style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                                value={formData.source}
                                                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                                                placeholder="e.g. Referral, Trade Show, Direct"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* SECTION 2: Contact Details */}
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: "var(--border-main)" }}>
                                    <Users size={16} className="text-brand-lime" />
                                    <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-main)" }}>
                                        {t('management.suppliers.sections.contactDetails', { defaultValue: 'Contact Details' })}
                                    </h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {/* Salutation */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                            {t('management.suppliers.form.salutation', { defaultValue: 'Salutation' })}
                                        </label>
                                        <input
                                            type="text"
                                            list="salutation-options-manage"
                                            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                                            style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                            value={formData.salutation}
                                            onChange={(e) => setFormData({ ...formData, salutation: e.target.value })}
                                            placeholder="e.g. Mr. / Ms. / Dr."
                                        />
                                        <datalist id="salutation-options-manage">
                                            <option value="Mr." />
                                            <option value="Mrs." />
                                            <option value="Ms." />
                                            <option value="Dr." />
                                            <option value="Prof." />
                                            <option value="Eng." />
                                        </datalist>
                                    </div>

                                    {/* First Name */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                            {t('management.suppliers.form.firstName', { defaultValue: 'First Name' })}
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                                            style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                            value={formData.firstName}
                                            onChange={(e) => {
                                                const fn = e.target.value;
                                                const combined = `${fn} ${formData.lastName}`.trim();
                                                setFormData({ 
                                                    ...formData, 
                                                    firstName: fn, 
                                                    contactPerson: formData.contactPerson && formData.contactPerson !== `${formData.firstName} ${formData.lastName}`.trim() ? formData.contactPerson : combined 
                                                });
                                            }}
                                            placeholder="First name"
                                        />
                                    </div>

                                    {/* Last Name */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                            {t('management.suppliers.form.lastName', { defaultValue: 'Last Name' })}
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                                            style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                            value={formData.lastName}
                                            onChange={(e) => {
                                                const ln = e.target.value;
                                                const combined = `${formData.firstName} ${ln}`.trim();
                                                setFormData({ 
                                                    ...formData, 
                                                    lastName: ln, 
                                                    contactPerson: formData.contactPerson && formData.contactPerson !== `${formData.firstName} ${formData.lastName}`.trim() ? formData.contactPerson : combined 
                                                });
                                            }}
                                            placeholder="Last name"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Contact Person */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                            {t('management.suppliers.form.contactPerson')} ({t('common.fullName', { defaultValue: 'Full Name' })})
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                                            style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                            value={formData.contactPerson}
                                            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                            placeholder={t('management.suppliers.form.contactPersonPlaceholder')}
                                        />
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                            {t('management.suppliers.form.email')}
                                        </label>
                                        <input
                                            type="email"
                                            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                                            style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder={t('management.suppliers.form.emailPlaceholder')}
                                        />
                                    </div>

                                    {/* Phone */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                            {t('management.common.modal.phone')}
                                        </label>
                                        <PhoneInput
                                            country={"in"}
                                            value={formData.phone}
                                            onChange={(phone) => setFormData({ ...formData, phone })}
                                            containerStyle={{ width: "100%" }}
                                            inputStyle={{
                                                width: "100%",
                                                height: "42px",
                                                background: "var(--bg-input)",
                                                border: "1px solid var(--border-main)",
                                                color: "var(--text-main)",
                                                borderRadius: "12px",
                                                fontSize: "14px"
                                            }}
                                            buttonStyle={{
                                                background: "var(--bg-input)",
                                                border: "1px solid var(--border-main)",
                                                borderRadius: "12px 0 0 12px"
                                            }}
                                            dropdownStyle={{
                                                background: "var(--bg-card)",
                                                color: "var(--text-main)",
                                                border: "1px solid var(--border-main)",
                                                borderRadius: "12px",
                                                marginTop: "4px",
                                                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)"
                                            }}
                                        />
                                    </div>

                                    {/* Mobile Phone */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                            {t('management.suppliers.form.mobilePhone', { defaultValue: 'Mobile Phone' })}
                                        </label>
                                        <PhoneInput
                                            country={"in"}
                                            value={formData.mobilePhone}
                                            onChange={(mobilePhone) => setFormData({ ...formData, mobilePhone })}
                                            containerStyle={{ width: "100%" }}
                                            inputStyle={{
                                                width: "100%",
                                                height: "42px",
                                                background: "var(--bg-input)",
                                                border: "1px solid var(--border-main)",
                                                color: "var(--text-main)",
                                                borderRadius: "12px",
                                                fontSize: "14px"
                                            }}
                                            buttonStyle={{
                                                background: "var(--bg-input)",
                                                border: "1px solid var(--border-main)",
                                                borderRadius: "12px 0 0 12px"
                                            }}
                                            dropdownStyle={{
                                                background: "var(--bg-card)",
                                                color: "var(--text-main)",
                                                border: "1px solid var(--border-main)",
                                                borderRadius: "12px",
                                                marginTop: "4px",
                                                boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)"
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: Web & Location */}
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: "var(--border-main)" }}>
                                    <MapPin size={16} className="text-brand-lime" />
                                    <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: "var(--text-main)" }}>
                                        {t('management.suppliers.sections.onlineLocation', { defaultValue: 'Online & Location Details' })}
                                    </h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Website */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                            {t('management.suppliers.form.website', { defaultValue: 'Website' })}
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                                            style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                            value={formData.website}
                                            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                            placeholder="e.g. https://company.com"
                                        />
                                    </div>

                                    {/* Primary Contact ID */}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                            {t('management.suppliers.form.primaryContactId', { defaultValue: 'Primary Contact ID' })}
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                                            style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                            value={formData.primaryContactId}
                                            onChange={(e) => setFormData({ ...formData, primaryContactId: e.target.value })}
                                            placeholder="e.g. CONT-8842"
                                        />
                                    </div>
                                </div>

                                {/* Address */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
                                        {t('management.suppliers.form.address')}
                                    </label>
                                    <textarea
                                        rows={2}
                                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime transition-all resize-none"
                                        style={{ background: "var(--bg-input)", border: "1px solid var(--border-main)", color: "var(--text-main)" }}
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        placeholder={t('management.suppliers.form.addressPlaceholder')}
                                    />
                                </div>
                            </div>

                                                        {/* Attach Documents (Optional) */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "var(--text-dim)" }}>
                                        <Paperclip size={13} className="text-lime-400" />
                                        {t('management.suppliers.form.documents', { defaultValue: 'Attach Documents (Optional)' })}
                                    </label>
                                    <span className="text-[11px]" style={{ color: "var(--text-dim)" }}>
                                        PDF, PNG, JPG (Max 20MB)
                                    </span>
                                </div>

                                {/* Dropzone */}
                                <div
                                    className="relative border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer group hover:border-lime-400/60"
                                    style={{
                                        borderColor: "var(--border-main)",
                                        background: "var(--bg-input)"
                                    }}
                                >
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,application/pdf"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className="flex flex-col items-center justify-center py-2">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110" style={{ background: "rgba(200, 230, 0, 0.1)", color: "var(--brand-lime, #C8E600)" }}>
                                            <Upload size={18} />
                                        </div>
                                        <p className="text-xs font-medium" style={{ color: "var(--text-main)" }}>
                                            {t('management.suppliers.form.documentsPlaceholder', { defaultValue: 'Click or drag documents here to attach' })}
                                        </p>
                                        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-dim)" }}>
                                            {t('management.suppliers.form.documentsHint', { defaultValue: 'Registration docs, contracts, tax certificates or agreements' })}
                                        </p>
                                    </div>
                                </div>

                                {/* Existing Documents in Edit Mode */}
                                {existingDocs.length > 0 && (
                                    <div className="space-y-1.5 pt-1">
                                        <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "var(--text-dim)" }}>
                                            {t('management.suppliers.form.existingDocuments', { defaultValue: 'Existing Documents' })} ({existingDocs.length})
                                        </span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {existingDocs.map((doc, idx) => (
                                                <div
                                                    key={doc._id || idx}
                                                    className="flex items-center justify-between p-2.5 rounded-xl border text-xs transition"
                                                    style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border-main)" }}
                                                >
                                                    <a
                                                        href={doc.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 truncate pr-2 hover:text-lime-400 transition"
                                                        style={{ color: "var(--text-main)" }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <FileText size={15} className="text-lime-400 shrink-0" />
                                                        <span className="truncate font-medium">{doc.name || 'Document'}</span>
                                                        <ExternalLink size={12} className="opacity-50 shrink-0" />
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeExistingDoc(doc._id || idx)}
                                                        className="p-1 hover:text-red-400 text-dim transition cursor-pointer"
                                                        title="Remove document"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Newly Selected Files */}
                                {selectedFiles.length > 0 && (
                                    <div className="space-y-1.5 pt-1">
                                        <span className="text-[11px] font-semibold tracking-wider uppercase text-lime-400">
                                            New Files to Upload ({selectedFiles.length})
                                        </span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {selectedFiles.map((file, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center justify-between p-2.5 rounded-xl border text-xs transition"
                                                    style={{ background: "rgba(200,230,0,0.04)", borderColor: "rgba(200,230,0,0.25)" }}
                                                >
                                                    <div className="flex items-center gap-2 truncate pr-2">
                                                        <FileText size={15} className="text-lime-400 shrink-0" />
                                                        <div className="truncate">
                                                            <p className="truncate font-medium" style={{ color: "var(--text-main)" }}>{file.name}</p>
                                                            <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>{formatFileSize(file.size)}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeSelectedFile(idx)}
                                                        className="p-1 hover:text-red-400 text-dim transition cursor-pointer"
                                                        title="Remove file"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

{/* Status and Toggle */}
                            <div className="flex items-center justify-between p-4 rounded-xl border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border-main)" }}>
                                <div>
                                    <div className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>{t('management.suppliers.form.status')}</div>
                                    <div className="text-xs" style={{ color: "var(--text-dim)" }}>{t('management.suppliers.form.statusToggle')}</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-lime-500"></div>
                                </label>
                            </div>

                            {/* ERROR */}
                            {formError && (
                                <div className="p-4 rounded-xl text-sm flex items-center gap-3" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}>
                                    <AlertTriangle size={18} />
                                    {formError}
                                </div>
                            )}

                            {/* ACTIONS */}
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-3 rounded-xl text-sm font-medium transition-all"
                                    style={{ border: "1px solid var(--border-main)", color: "var(--text-dim)" }}
                                >
                                    {t('management.common.modal.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={formLoading}
                                    className="flex-[2] py-3 rounded-xl font-bold flex justify-center items-center shadow-lg hover:-translate-y-0.5 transition-all"
                                    style={{ background: "#C8E600", color: "#0A0A0A" }}
                                >
                                    {formLoading ? (
                                        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        modalMode === "create" ? t('management.suppliers.createButton') : t('management.suppliers.updateButton')
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
                    <div
                        className="rounded-3xl p-8 max-w-md w-full mx-4 relative border animate-in fade-in zoom-in duration-300 transition-colors"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(239,68,68,0.1)' }}>
                            <Trash2 size={40} style={{ color: '#ef4444' }} />
                        </div>
                        <h3 className="text-2xl font-bold text-center mb-2" style={{ color: 'var(--text-main)' }}>{t('management.suppliers.deleteTitle')}</h3>
                        <p className="text-center mb-8" style={{ color: 'var(--text-dim)' }}>
                            {t('management.suppliers.deleteConfirm', { name: deleteTarget.name })}
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 py-3.5 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                                style={{ background: 'transparent', border: '1px solid var(--border-main)', color: 'var(--text-dim)' }}
                            >
                                {t('management.common.modal.cancel')}
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteLoading}
                                className="flex-1 py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center"
                                style={{ background: '#ef4444', color: 'white' }}
                            >
                                {deleteLoading
                                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    : t('management.common.delete.confirmSubmit')
                                }
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BulkSupplierUpload
                isOpen={isBulkUploadOpen}
                onClose={() => setIsBulkUploadOpen(false)}
                onSuccess={fetchSuppliers}
            />
        </div>
    );
};

export default ManageSuppliers;
