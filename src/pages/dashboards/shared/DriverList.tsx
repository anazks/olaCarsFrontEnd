import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Filter, Plus, FileText, ChevronRight, Calendar, ChevronDown, RefreshCw, ChevronLeft, Upload, Database } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { driverService, type Driver, type DriverFilters, type PaginationMetadata } from '../../../services/driverService';
import { getAllBranches, type Branch } from '../../../services/branchService';
import BulkDriverUpload from './BulkDriverUpload';
import DataMigrationUpload from './DataMigrationUpload';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

const DriverList = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [showBulkUpload, setShowBulkUpload] = useState(false);
    const [showDataMigration, setShowDataMigration] = useState(false);

    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [branchFilter, setBranchFilter] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Sorting State
    const [sortBy, setSortBy] = useState<string>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Pagination State
    const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(25);

    const getPageNumbers = () => {
        const totalPages = pagination?.totalPages || 1;
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const pages: (number | string)[] = [];
        pages.push(1);

        const page = currentPage;
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

    const formatDriverDate = (date?: string | null): string => {
        if (!date) return 'N/A';
        const parsed = new Date(date);
        if (Number.isNaN(parsed.getTime())) return 'N/A';
        const day = String(parsed.getDate()).padStart(2, '0');
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const year = parsed.getFullYear();
        return `${day}/${month}/${year}`;
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchDrivers();
        }, searchTerm ? 500 : 0);
        return () => clearTimeout(timer);
    }, [currentPage, limit, statusFilter, branchFilter, startDate, endDate, sortBy, sortOrder, searchTerm]);

    useEffect(() => {
        const fetchBranchesData = async () => {
            try {
                const response = await getAllBranches();
                const branchData = Array.isArray(response) ? response : Array.isArray(response.data) ? response.data : [];
                setBranches(branchData);
            } catch (error) {
                console.error('Error fetching branches:', error);
            }
        };
        fetchBranchesData();
    }, []);

    const handleExportExcel = () => {
        if (drivers.length === 0) {
            toast.error("No drivers available to export.");
            return;
        }
        const toastId = toast.loading("Generating Excel file...");
        try {
            const exportData = drivers.map((d, idx) => ({
                "Sl No.": String(idx + 1).padStart(2, '0'),
                "Driver ID": d.driverId || 'N/A',
                "Full Name": d.personalInfo?.fullName || (d as any).firstName || 'N/A',
                "Email": d.personalInfo?.email || (d as any).email || 'N/A',
                "Phone": d.personalInfo?.phone || (d as any).phone || 'N/A',
                "Branch": typeof (d as any).branch === 'object' ? (d as any).branch?.name : 'N/A',
                "Status": (d as any).status || 'N/A',
                "Onboarding Date": (d as any).createdAt ? new Date((d as any).createdAt).toLocaleDateString() : 'N/A'
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Drivers");
            
            const keys = Object.keys(exportData[0]);
            ws["!cols"] = keys.map(key => {
                const maxLen = Math.max(
                    key.length,
                    ...exportData.map(row => String((row as any)[key] || "").length)
                );
                return { wch: maxLen + 2 };
            });

            const dateStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `drivers_export_${dateStr}.xlsx`);
            toast.success("Excel file downloaded successfully!", { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export Excel file.", { id: toastId });
        }
    };

    const handleExportCsv = () => {
        if (drivers.length === 0) {
            toast.error("No drivers available to export.");
            return;
        }
        const toastId = toast.loading("Generating CSV file...");
        try {
            const exportData = drivers.map((d, idx) => ({
                "Sl No.": String(idx + 1).padStart(2, '0'),
                "Driver ID": d.driverId || 'N/A',
                "Full Name": d.personalInfo?.fullName || (d as any).firstName || 'N/A',
                "Email": d.personalInfo?.email || (d as any).email || 'N/A',
                "Phone": d.personalInfo?.phone || (d as any).phone || 'N/A',
                "Branch": typeof (d as any).branch === 'object' ? (d as any).branch?.name : 'N/A',
                "Status": (d as any).status || 'N/A',
                "Onboarding Date": (d as any).createdAt ? new Date((d as any).createdAt).toLocaleDateString() : 'N/A'
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const csvContent = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement("a");
            link.setAttribute("href", url);
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute("download", `drivers_export_${dateStr}.csv`);
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
        if (drivers.length === 0) {
            toast.error("No drivers available to export.");
            return;
        }
        const toastId = toast.loading("Generating PDF file...");
        try {
            const doc = new jsPDF();
            const dateStr = new Date().toISOString().split('T')[0];
            const title = "Drivers Report";
            
            doc.setFontSize(18);
            doc.text(title, 14, 22);
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 29);

            const head = [["Sl No.", "Driver ID", "Name", "Email", "Phone", "Branch", "Status"]];
            const body = drivers.map((d, idx) => [
                String(idx + 1).padStart(2, '0'),
                d.driverId || 'N/A',
                d.personalInfo?.fullName || 'N/A',
                d.personalInfo?.email || 'N/A',
                d.personalInfo?.phone || 'N/A',
                typeof (d as any).branch === 'object' ? (d as any).branch?.name : 'N/A',
                (d as any).status || 'N/A'
            ]);

            autoTable(doc, {
                head,
                body,
                startY: 34,
                theme: 'striped',
                headStyles: { fillColor: [200, 230, 0], textColor: [0, 0, 0] }
            });

            doc.save(`drivers_export_${dateStr}.pdf`);
            toast.success("PDF file downloaded successfully!", { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export PDF file.", { id: toastId });
        }
    };

    const fetchDrivers = async () => {
        try {
            setLoading(true);
            const filters: DriverFilters = {
                page: currentPage,
                limit: limit,
                sortBy,
                sortOrder
            };

            if (searchTerm.trim()) filters.search = searchTerm.trim();
            if (statusFilter !== 'ALL') filters.status = statusFilter;
            if (branchFilter !== 'ALL') filters.branch = branchFilter;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;

            const res = await driverService.getAllDrivers(filters);
            setDrivers(res.data || []);
            setPagination(res.pagination);
        } catch (error) {
            console.error('Error fetching drivers:', error);
            setDrivers([]);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE':
            case 'APPROVED': return 'bg-green-100 text-green-700';
            case 'REJECTED':
            case 'SUSPENDED': return 'bg-red-100 text-red-700';
            case 'PENDING REVIEW':
            case 'VERIFICATION':
            case 'CREDIT CHECK': 
            case 'MANAGER REVIEW':
            case 'CONTRACT PENDING': return 'bg-yellow-100 text-yellow-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const handlePageChange = (newPage: number) => {
        if (pagination && newPage >= 1 && newPage <= pagination.totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
        setCurrentPage(1);
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sortBy !== field) return <div className="opacity-20 transition-opacity group-hover:opacity-50"><ChevronDown size={14} /></div>;
        return <div className={`transition-transform duration-200 ${sortOrder === 'asc' ? 'rotate-180' : ''}`}><ChevronDown size={14} className="text-lime" style={{ color: 'var(--brand-lime)' }} /></div>;
    };

    const FilterLabel = ({ label }: { label: string }) => (
        <label className="block text-[10px] uppercase font-black tracking-widest mb-1.5 ml-1" style={{ color: 'var(--text-dim)' }}>
            {label}
        </label>
    );

    return (
        <div className="p-6 container-responsive space-y-6">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Driver List', active: true }]} />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <Users size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        {t('management.drivers.title')}
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">{t('management.drivers.subtitle')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
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
                        onClick={fetchDrivers}
                        className="flex items-center justify-center p-2 rounded-xl border transition-all hover:bg-white/5 disabled:opacity-50"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                        title={t('common.refresh')}
                        disabled={loading}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all border outline-none ${showAdvancedFilters ? 'border-lime text-lime bg-lime/10' : ''}`}
                        style={{ 
                            background: showAdvancedFilters ? '' : 'var(--bg-card)', 
                            borderColor: showAdvancedFilters ? 'var(--brand-lime)' : 'var(--border-main)', 
                            color: showAdvancedFilters ? 'var(--brand-lime)' : 'var(--text-dim)' 
                        }}
                    >
                        <Filter size={14} /> {t('management.common.filters')}
                    </button>
                    <button
                        onClick={() => setShowDataMigration(true)}
                        className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all hover:bg-white/5 active:scale-95 border"
                        style={{ 
                            borderColor: '#f59e0b', 
                            color: '#f59e0b',
                            background: 'rgba(245,158,11,0.06)'
                        }}
                    >
                        <Database size={14} /> Data Migration
                    </button>
                    <button
                        onClick={() => setShowBulkUpload(true)}
                        className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all hover:bg-white/5 active:scale-95 border"
                        style={{ 
                            borderColor: 'var(--brand-lime)', 
                            color: 'var(--brand-lime)',
                            background: 'rgba(200,230,0,0.06)'
                        }}
                    >
                        <Upload size={14} /> {t('management.drivers.bulkUploadBtn', 'Bulk Upload')}
                    </button>
                    <button
                        onClick={() => navigate('new')}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all shadow-lg hover:scale-105 active:scale-95"
                        style={{ 
                            backgroundColor: 'var(--brand-lime)', 
                            color: '#0A0A0A'
                        }}
                    >
                        <Plus size={14} strokeWidth={3} /> {t('management.drivers.newBtn')}
                    </button>
                </div>
            </div>

            {/* Toolbar / Filters */}
            <div className="p-4 rounded-xl border mb-6 space-y-3 transition-colors shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors" size={16} style={{ color: 'var(--text-dim)' }} />
                    <input
                        type="text"
                        placeholder={t('management.drivers.searchPlaceholder')}
                        className="w-full pl-10 pr-4 py-2 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime font-bold shadow-sm"
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>

                {/* Advanced Filters */}
                {showAdvancedFilters && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t transition-all animate-in slide-in-from-top-2 duration-300" style={{ borderColor: 'var(--border-main)' }}>
                        <div>
                            <FilterLabel label={t('management.drivers.filters.status')} />
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                                className="w-full px-3 py-2 rounded-xl outline-none text-xs font-bold transition-all focus:ring-2 focus:ring-lime"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="ALL">{t('management.drivers.filters.allStatuses')}</option>
                                {['DRAFT', 'PENDING REVIEW', 'VERIFICATION', 'CREDIT CHECK', 'MANAGER REVIEW', 'APPROVED', 'CONTRACT PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'].map(status => (
                                    <option key={status} value={status}>{t(`management.drivers.statusLabels.${status}`)}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <FilterLabel label={t('management.drivers.filters.branch')} />
                            <select
                                value={branchFilter}
                                onChange={(e) => { setBranchFilter(e.target.value); setCurrentPage(1); }}
                                className="w-full px-3 py-2 rounded-xl outline-none text-xs font-bold transition-all focus:ring-2 focus:ring-lime"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            >
                                <option value="ALL">All Branches</option>
                                {branches.map(b => (
                                    <option key={b._id} value={b._id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <FilterLabel label={t('management.drivers.filters.from')} />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                                className="w-full px-3 py-2 rounded-xl outline-none text-xs font-bold transition-all focus:ring-2 focus:ring-lime"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>
                        <div>
                            <FilterLabel label={t('management.drivers.filters.to')} />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                                className="w-full px-3 py-2 rounded-xl outline-none text-xs font-bold transition-all focus:ring-2 focus:ring-lime"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Drivers Table */}
            <div className="rounded-xl shadow-sm border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="border-b" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                            <tr>
                                <th className="px-4 py-2.5 cursor-pointer group" onClick={() => handleSort('personalInfo.fullName')}>
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                        {t('management.drivers.table.driver')} <SortIcon field="personalInfo.fullName" />
                                    </div>
                                </th>
                                <th className="px-4 py-2.5 cursor-pointer group" onClick={() => handleSort('driverId')}>
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                        ID <SortIcon field="driverId" />
                                    </div>
                                </th>
                                <th className="px-4 py-2.5 cursor-pointer group" onClick={() => handleSort('status')}>
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                        {t('common.status')} <SortIcon field="status" />
                                    </div>
                                </th>
                                <th className="px-4 py-2.5">
                                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>{t('management.drivers.table.license')}</span>
                                </th>
                                <th className="px-4 py-2.5 cursor-pointer group" onClick={() => handleSort('createdAt')}>
                                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                        {t('management.drivers.table.applied')} <SortIcon field="createdAt" />
                                    </div>
                                </th>
                                <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-4 h-16" style={{ backgroundColor: 'rgba(255,255,255,0.01)' }}></td>
                                    </tr>
                                ))
                            ) : drivers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center" style={{ color: 'var(--text-dim)' }}>
                                        <div className="flex flex-col items-center gap-2">
                                            <Users size={40} style={{ opacity: 0.2 }} />
                                            <p>{t('management.drivers.empty.noDrivers')}</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                drivers.map((driver) => (
                                    <tr
                                        key={driver._id}
                                        className="transition-colors cursor-pointer group"
                                        style={{ borderBottom: '1px solid var(--border-main)' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        onClick={() => navigate(driver._id)}
                                    >
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all group-hover:scale-110" style={{ backgroundColor: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)', border: '1px solid rgba(200,230,0,0.2)' }}>
                                                    {(driver.personalInfo?.fullName?.[0] || 'D')}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm transition-colors" style={{ color: 'var(--text-main)' }}>
                                                        {driver.personalInfo?.fullName}
                                                    </div>
                                                    <div className="text-xs" style={{ color: 'var(--text-dim)' }}>{driver.personalInfo?.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="font-mono text-xs font-bold" style={{ color: 'var(--brand-lime)' }}>
                                                {driver.driverId || '—'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(driver.status)}`}>
                                                {t(`management.drivers.statusLabels.${driver.status}`)}
                                            </span>
                                        </td>
                                         <td className="px-4 py-2.5">
                                             <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                                                 <FileText size={12} />
                                                 {driver.drivingLicense?.licenseNumber || 'N/A'}
                                             </div>
                                             <div className="text-[10px] uppercase tracking-wider font-bold mt-0.5" style={{ color: 'var(--text-dim)' }}>{t('management.drivers.table.expiry')}: {formatDriverDate(driver.drivingLicense?.expiryDate)}</div>
                                         </td>
                                         <td className="px-4 py-2.5">
                                             <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                                                 <Calendar size={12} style={{ color: 'var(--text-dim)' }} />
                                                 {formatDriverDate(driver.appliedAt || driver.createdAt)}
                                             </div>
                                         </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <button className="p-1 rounded-lg transition-all" style={{ color: 'var(--text-dim)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-main)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-dim)'}>
                                                <ChevronRight size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination && (
                    <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors shadow-[0_-1px_0_0_rgba(0,0,0,0.05)]" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                        <div className="flex flex-wrap items-center gap-4">
                            <p className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>
                                {t('management.drivers.pagination.showing', { count: drivers.length, total: pagination.total })}
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>Rows per page:</span>
                                <select
                                    value={limit}
                                    onChange={(e) => {
                                        setLimit(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
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
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1 || loading}
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
                                                className={`w-9 h-9 rounded-lg text-xs font-black transition-all ${currentPage === p ? 'shadow-lg scale-110 z-10' : 'hover:bg-black/5 opacity-70 hover:opacity-100'}`}
                                                style={{ 
                                                    background: currentPage === p ? 'var(--brand-lime)' : 'transparent',
                                                    color: currentPage === p ? '#000' : 'var(--text-main)',
                                                    border: currentPage === p ? 'none' : '1px solid var(--border-main)'
                                                }}
                                            >
                                                {p}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === pagination.totalPages || loading}
                                    className="p-2 rounded-lg border transition-all hover:bg-black/5 disabled:opacity-30 disabled:cursor-not-allowed"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            {/* Bulk Upload Modal */}
            <BulkDriverUpload
                isOpen={showBulkUpload}
                onClose={() => setShowBulkUpload(false)}
                onSuccess={() => {
                    fetchDrivers();
                    setShowBulkUpload(false);
                }}
            />
            {/* Data Migration Modal */}
            <DataMigrationUpload
                isOpen={showDataMigration}
                onClose={() => setShowDataMigration(false)}
                onSuccess={() => {
                    fetchDrivers();
                    setShowDataMigration(false);
                }}
            />
        </div>
    );
};

export default DriverList;
