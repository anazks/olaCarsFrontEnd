import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Search, Car, AlertTriangle, Eye, ChevronLeft, ChevronRight, Users, Filter, SlidersHorizontal, Shield, ChevronDown } from 'lucide-react';
import { getAllVehicles } from '../../../services/vehicleService';
import type { Vehicle, VehicleStatus, VehicleCategory, FuelType } from '../../../services/vehicleService';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAllBranches, type Branch } from '../../../services/branchService';
import HasPermission from '../../../components/HasPermission';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import BulkVehicleUpload from './BulkVehicleUpload';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { FileText } from 'lucide-react';

// ── Status Styles ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    'PENDING ENTRY': { bg: 'rgba(245,158,11,0.1)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
    'DOCUMENTS REVIEW': { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
    'INSURANCE VERIFICATION': { bg: 'rgba(139,92,246,0.1)', text: '#8b5cf6', border: 'rgba(139,92,246,0.3)' },
    'INSPECTION REQUIRED': { bg: 'rgba(236,72,153,0.1)', text: '#ec4899', border: 'rgba(236,72,153,0.3)' },
    'INSPECTION FAILED': { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
    'REPAIR IN PROGRESS': { bg: 'rgba(249,115,22,0.1)', text: '#f97316', border: 'rgba(249,115,22,0.3)' },
    'ACCOUNTING SETUP': { bg: 'rgba(20,184,166,0.1)', text: '#14b8a6', border: 'rgba(20,184,166,0.3)' },
    'GPS ACTIVATION': { bg: 'rgba(6,182,212,0.1)', text: '#06b6d4', border: 'rgba(6,182,212,0.3)' },
    'BRANCH MANAGER APPROVAL': { bg: 'rgba(168,85,247,0.1)', text: '#a855f7', border: 'rgba(168,85,247,0.3)' },
    'ACTIVE — AVAILABLE': { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' },
    'ACTIVE — RENTED': { bg: 'rgba(34,197,94,0.1)', text: '#16a34a', border: 'rgba(34,197,94,0.3)' },
    'ACTIVE — MAINTENANCE': { bg: 'rgba(249,115,22,0.1)', text: '#f97316', border: 'rgba(249,115,22,0.3)' },
    'SUSPENDED': { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
    'TRANSFER PENDING': { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
    'TRANSFER COMPLETE': { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' },
    'RETIRED': { bg: 'rgba(107,114,128,0.1)', text: '#6b7280', border: 'rgba(107,114,128,0.3)' },
    'PRE-BOOKED': { bg: 'rgba(14,165,233,0.1)', text: '#0ea5e9', border: 'rgba(14,165,233,0.3)' },
    'W. GROUP ACTIVE': { bg: 'rgba(132,204,22,0.1)', text: '#84cc16', border: 'rgba(132,204,22,0.3)' },
};

const CATEGORIES = ['Sedan', 'SUV', 'Pickup', 'Van', 'Luxury', 'Commercial', 'MUV'];
const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric'];
const VEHICLE_STATUSES = [
    "PENDING ENTRY",
    "DOCUMENTS REVIEW",
    "INSURANCE VERIFICATION",
    "INSPECTION REQUIRED",
    "INSPECTION FAILED",
    "REPAIR IN PROGRESS",
    "ACCOUNTING SETUP",
    "GPS ACTIVATION",
    "BRANCH MANAGER APPROVAL",
    "ACTIVE — AVAILABLE",
    "ACTIVE — RENTED",
    "ACTIVE — MAINTENANCE",
    "SUSPENDED",
    "TRANSFER PENDING",
    "TRANSFER COMPLETE",
    "RETIRED",
    "PRE-BOOKED",
    "W. GROUP ACTIVE",
];

const ACTIVE_STATUSES = ["ACTIVE — AVAILABLE", "ACTIVE — RENTED", "W. GROUP ACTIVE"];
const PENDING_STATUSES = VEHICLE_STATUSES.filter(status => !ACTIVE_STATUSES.includes(status));

const StatusBadge = ({ status }: { status: string }) => {
    const style = STATUS_STYLES[status] || STATUS_STYLES['PENDING ENTRY'];
    return (
        <div className="inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-300 shadow-sm hover:scale-105"
            style={{ background: style.bg, color: style.text, borderColor: style.border }}>
            {status}
        </div>
    );
};

interface VehicleListProps {
    mode?: 'active' | 'pending';
}

const VehicleList = ({ mode = 'active' }: VehicleListProps) => {
    const { t } = useTranslation();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
    
    // Server-side filtering & pagination state
    const [filters, setFilters] = useState({
        page: 1,
        limit: 25,
        search: '',
        status: '' as VehicleStatus | string,
        branch: '',
        category: '' as VehicleCategory | string,
        fuelType: '' as FuelType | string,
        sortBy: 'createdAt',
        sortOrder: 'desc' as 'asc' | 'desc'
    });
    
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 25,
        totalPages: 0
    });

    const handleExportExcel = () => {
        if (vehicles.length === 0) {
            toast.error("No vehicles available to export.");
            return;
        }
        const toastId = toast.loading("Generating Excel file...");
        try {
            const exportData = vehicles.map((v, idx) => ({
                "Sl No.": String(idx + 1).padStart(2, '0'),
                "Vehicle Number": v.vehicleNumber || 'N/A',
                "Brand": v.brand || 'N/A',
                "Model": v.model || 'N/A',
                "Year": v.year || 'N/A',
                "Category": v.category || 'N/A',
                "Color": v.color || 'N/A',
                "Fuel Type": v.fuelType || 'N/A',
                "Branch": typeof v.branch === 'object' ? v.branch?.name : 'N/A',
                "Status": v.status || 'N/A'
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Vehicles");
            
            const keys = Object.keys(exportData[0]);
            ws["!cols"] = keys.map(key => {
                const maxLen = Math.max(
                    key.length,
                    ...exportData.map(row => String((row as any)[key] || "").length)
                );
                return { wch: maxLen + 2 };
            });

            const dateStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `${mode}_vehicles_export_${dateStr}.xlsx`);
            toast.success("Excel file downloaded successfully!", { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export Excel file.", { id: toastId });
        }
    };

    const handleExportCsv = () => {
        if (vehicles.length === 0) {
            toast.error("No vehicles available to export.");
            return;
        }
        const toastId = toast.loading("Generating CSV file...");
        try {
            const exportData = vehicles.map((v, idx) => ({
                "Sl No.": String(idx + 1).padStart(2, '0'),
                "Vehicle Number": v.vehicleNumber || 'N/A',
                "Brand": v.brand || 'N/A',
                "Model": v.model || 'N/A',
                "Year": v.year || 'N/A',
                "Category": v.category || 'N/A',
                "Color": v.color || 'N/A',
                "Fuel Type": v.fuelType || 'N/A',
                "Branch": typeof v.branch === 'object' ? v.branch?.name : 'N/A',
                "Status": v.status || 'N/A'
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const csvContent = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement("a");
            link.setAttribute("href", url);
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute("download", `${mode}_vehicles_export_${dateStr}.csv`);
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
        if (vehicles.length === 0) {
            toast.error("No vehicles available to export.");
            return;
        }
        const toastId = toast.loading("Generating PDF file...");
        try {
            const doc = new jsPDF();
            const dateStr = new Date().toISOString().split('T')[0];
            const title = `${mode === 'pending' ? 'Pending' : 'Active'} Vehicles Report`;
            
            doc.setFontSize(18);
            doc.text(title, 14, 22);
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 29);

            const head = [["Sl No.", "Vehicle Number", "Brand", "Model", "Year", "Category", "Branch", "Status"]];
            const body = vehicles.map((v, idx) => [
                String(idx + 1).padStart(2, '0'),
                v.vehicleNumber || 'N/A',
                v.brand || 'N/A',
                v.model || 'N/A',
                String(v.year || 'N/A'),
                v.category || 'N/A',
                typeof v.branch === 'object' ? v.branch?.name : 'N/A',
                v.status || 'N/A'
            ]);

            autoTable(doc, {
                head,
                body,
                startY: 34,
                theme: 'striped',
                headStyles: { fillColor: [200, 230, 0], textColor: [0, 0, 0] }
            });

            doc.save(`${mode}_vehicles_export_${dateStr}.pdf`);
            toast.success("PDF file downloaded successfully!", { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export PDF file.", { id: toastId });
        }
    };

    const getPageNumbers = () => {
        const totalPages = pagination.totalPages;
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const pages: (number | string)[] = [];
        pages.push(1);

        const page = filters.page;
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
    
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();

    const fetchMetadata = useCallback(async () => {
        try {
            const bResponse = await getAllBranches({ limit: 1000 });
            if (bResponse.success) setBranches(bResponse.data);
        } catch (err) {
            console.error('Failed to fetch filter metadata:', err);
        }
    }, []);

    const fetchVehicles = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Clean up empty filters before sending request
            const activeFilters = Object.fromEntries(
                Object.entries(filters).filter(([_, v]) => v !== '' && v !== undefined)
            );
            
            // If no specific status is filtered, restrict query to the active/pending list
            if (!activeFilters.status) {
                activeFilters.status = mode === 'active' 
                    ? ACTIVE_STATUSES.join(',') 
                    : PENDING_STATUSES.join(',');
            }
            
            const response = await getAllVehicles(activeFilters);
            if (response.success) {
                setVehicles(response.data);
                setPagination(response.pagination);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || t('management.common.operationFailed'));
        } finally {
            setLoading(false);
        }
    }, [filters, mode, t]);

    // Reset filters and page when mode changes
    useEffect(() => {
        setFilters(prev => ({
            ...prev,
            status: '',
            page: 1
        }));
    }, [mode]);

    useEffect(() => {
        fetchMetadata();
    }, [fetchMetadata]);

    useEffect(() => {
        const debounceId = setTimeout(() => {
            fetchVehicles();
        }, 300);
        return () => clearTimeout(debounceId);
    }, [fetchVehicles, filters.search, filters.page, filters.limit, filters.status, filters.branch, filters.category, filters.fuelType]);

    const handleFilterChange = (key: string, value: any) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            page: 1 // Reset to first page on filter change
        }));
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= (pagination?.totalPages || 1)) {
            setFilters(prev => ({
                ...prev,
                page: newPage
            }));
        }
    };

    const handleSort = (field: string) => {
        setFilters(prev => ({
            ...prev,
            sortBy: field,
            sortOrder: prev.sortBy === field && prev.sortOrder === 'desc' ? 'asc' : 'desc',
            page: 1
        }));
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (filters.sortBy !== field) return <div className="opacity-20 transition-opacity group-hover:opacity-50"><ChevronDown size={14} /></div>;
        return <div className={`transition-transform duration-200 ${filters.sortOrder === 'asc' ? 'rotate-180' : ''}`}><ChevronDown size={14} className="text-lime" style={{ color: 'var(--brand-lime)' }} /></div>;
    };

    return (
        <div className="container-responsive space-y-8 p-6 lg:p-8 animate-in fade-in duration-500">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: mode === 'active' ? 'Vehicle Fleet' : 'Pending Entry Vehicles', active: true }]} />

            {/* Compact Header Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <Car size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        {mode === 'active' ? t('management.vehicles.title', 'Vehicle Fleet') : 'Pending Entry Vehicles'}
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">
                        {mode === 'active'
                            ? t('management.vehicles.subtitle', 'Manage and monitor all company vehicles.')
                            : 'Track and complete onboarding for pending vehicles.'}
                    </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={handleExportExcel}
                        className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all border outline-none hover:bg-white/5 active:scale-95 cursor-pointer"
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
                        onClick={() => fetchVehicles()}
                        className="flex items-center justify-center p-2 rounded-xl transition-all duration-300 hover:bg-white/10 active:scale-95"
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        title="Refresh Data"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                    
                    <HasPermission permission="INSURANCE_VIEW">
                        <button
                            onClick={() => navigate('../insurances')}
                            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm hover:bg-white/5 active:scale-95"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <Shield size={14} className="opacity-70" /> {t('sidebar.items.insuranceManagement', 'Insurance')}
                        </button>
                    </HasPermission>
                    
                    <HasPermission permission="DRIVER_VIEW">
                        <button
                            onClick={() => navigate('../drivers')}
                            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm hover:bg-white/5 active:scale-95"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <Users size={14} className="opacity-70" /> {t('sidebar.items.drivers', 'Drivers')}
                        </button>
                    </HasPermission>

                    <HasPermission permission="VEHICLE_VIEW">
                        <button
                            onClick={() => navigate('../fleet')}
                            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm hover:bg-white/5 active:scale-95"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <Users size={14} className="opacity-70 text-[var(--brand-lime)]" /> {t('sidebar.items.fleetManagement', 'Fleet Management')}
                        </button>
                    </HasPermission>
                    
                    <HasPermission permission="VEHICLE_EDIT">
                        <button
                            onClick={() => navigate(mode === 'active' ? 'temp-assignments' : '../vehicles/temp-assignments')}
                            className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-bold transition-all duration-300 shadow-sm hover:bg-white/5 active:scale-95"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <Car size={14} className="opacity-70" style={{ color: '#f97316' }} /> Temp Assignments
                        </button>
                    </HasPermission>
                    
                    <HasPermission permission="VEHICLE_CREATE">
                        <div className="flex gap-2">
                            {/* <button
                                onClick={() => setIsBulkUploadOpen(true)}
                                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 border"
                                style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                            >
                                <Upload size={14} /> Bulk Upload
                            </button> */}
                            <button
                                onClick={() => navigate(mode === 'active' ? 'create' : '../vehicles/create')}
                                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95"
                                style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}
                            >
                                <Plus size={14} strokeWidth={3} /> {t('management.vehicles.onboardingBtn', 'Add Vehicle')}
                            </button>
                        </div>
                    </HasPermission>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-2xl text-sm font-semibold animate-in slide-in-from-top-2 shadow-lg" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Search and Filters Bar */}
            <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-2.5">
                    {/* Primary Search */}
                    <div className="relative flex-1 group">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#C8E600] transition-colors" />
                        <input
                            type="text"
                            placeholder={t('management.vehicles.searchPlaceholder', 'Search by Make, Model, Plate No, or Fleet #...')}
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-xl outline-none text-sm font-medium transition-all duration-300 focus:shadow-[0_0_0_2px_rgba(200,230,0,0.3)] placeholder:opacity-50"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>
                    
                    {/* Status Dropdown (Primary Filter) */}
                    <div className="sm:w-72 relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                            <Filter size={14} />
                        </div>
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="w-full pl-9 pr-8 py-2 rounded-xl text-sm font-semibold outline-none appearance-none transition-all duration-300 cursor-pointer focus:shadow-[0_0_0_2px_rgba(200,230,0,0.3)]"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <option value="">{mode === 'active' ? 'All Active Statuses' : 'All Pending Statuses'}</option>
                            {(mode === 'active' ? ACTIVE_STATUSES : PENDING_STATUSES).map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                            <ChevronDownIcon />
                        </div>
                    </div>

                    <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 hover:bg-white/5 active:scale-95 whitespace-nowrap shadow-sm"
                        style={{ 
                            background: showAdvancedFilters ? 'rgba(200, 230, 0, 0.1)' : 'var(--bg-card)', 
                            border: '1px solid var(--border-main)', 
                            color: showAdvancedFilters ? '#C8E600' : 'var(--text-main)' 
                        }}
                    >
                        <SlidersHorizontal size={15} />
                        {t('management.vehicles.advancedFilters', 'More Filters')}
                    </button>
                </div>

                {/* Advanced Filters Panel */}
                {showAdvancedFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 p-4 rounded-2xl animate-in slide-in-from-top-4 fade-in duration-300 shadow-xl border relative overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        {/* Decorative glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C8E600] rounded-full blur-[100px] opacity-5 pointer-events-none" />
                        
                        <div className="space-y-1 relative z-10">
                            <label className="text-[11px] font-black uppercase tracking-widest pl-1" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.table.category', 'Category')}</label>
                            <div className="relative">
                                <select
                                    value={filters.category}
                                    onChange={(e) => handleFilterChange('category', e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl text-sm font-medium outline-none appearance-none cursor-pointer transition-all duration-300 focus:ring-2 focus:ring-[#C8E600]/30 hover:shadow-md"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="">{t('management.vehicles.filters.allCategories', 'All Categories')}</option>
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{t(`management.vehicles.categories.${cat}`, cat)}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"><ChevronDownIcon /></div>
                            </div>
                        </div>
                        
                        <div className="space-y-1 relative z-10">
                            <label className="text-[11px] font-black uppercase tracking-widest pl-1" style={{ color: 'var(--text-dim)' }}>{t('management.vehicles.table.fuelType', 'Fuel Type')}</label>
                            <div className="relative">
                                <select
                                    value={filters.fuelType}
                                    onChange={(e) => handleFilterChange('fuelType', e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl text-sm font-medium outline-none appearance-none cursor-pointer transition-all duration-300 focus:ring-2 focus:ring-[#C8E600]/30 hover:shadow-md"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="">{t('management.vehicles.filters.allFuelTypes', 'All Fuel Types')}</option>
                                    {FUEL_TYPES.map(fuel => (
                                        <option key={fuel} value={fuel}>{t(`management.vehicles.fuelTypes.${fuel}`, fuel)}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"><ChevronDownIcon /></div>
                            </div>
                        </div>

                        <div className="space-y-1 relative z-10">
                            <label className="text-[11px] font-black uppercase tracking-widest pl-1" style={{ color: 'var(--text-dim)' }}>{t('management.common.modal.branchName', 'Branch')}</label>
                            <div className="relative">
                                <select
                                    value={filters.branch}
                                    onChange={(e) => handleFilterChange('branch', e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl text-sm font-medium outline-none appearance-none cursor-pointer transition-all duration-300 focus:ring-2 focus:ring-[#C8E600]/30 hover:shadow-md"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="">{t('management.vehicles.filters.allBranches', 'All Branches')}</option>
                                    {branches.map(branch => (
                                        <option key={branch._id} value={branch._id}>{branch.name}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"><ChevronDownIcon /></div>
                            </div>
                        </div>

                        <div className="flex items-end pt-1 relative z-10">
                            <button
                                onClick={() => setFilters({
                                    ...filters,
                                    search: '',
                                    status: '',
                                    branch: '',
                                    category: '',
                                    fuelType: '',
                                    page: 1
                                })}
                                className="w-full py-2 rounded-xl text-sm font-bold uppercase tracking-wide transition-all duration-300 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30"
                                style={{ border: '1px solid var(--border-main)', color: 'var(--text-dim)' }}
                            >
                                {t('management.common.resetFilters', 'Clear All Filters')}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Premium Data Table */}
            <div className="rounded-3xl border shadow-xl overflow-hidden transition-all duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 opacity-80">
                            <div className="w-12 h-12 border-4 border-[#C8E600]/20 border-t-[#C8E600] rounded-full animate-spin mb-6" />
                            <p className="text-sm font-bold tracking-widest uppercase" style={{ color: 'var(--text-dim)' }}>Syncing Fleet Data...</p>
                        </div>
                    ) : vehicles.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-32 text-center px-4">
                            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-inner" style={{ background: 'var(--bg-input)' }}>
                                <Car size={48} style={{ color: 'var(--text-dim)' }} className="opacity-50" />
                            </div>
                            <h3 className="text-xl font-black mb-2" style={{ color: 'var(--text-main)' }}>No Vehicles Found</h3>
                            <p className="text-sm max-w-md mx-auto" style={{ color: 'var(--text-dim)' }}>
                                {filters.search || filters.status || filters.branch || filters.category || filters.fuelType ? "We couldn't find any vehicles matching your current filters. Try adjusting them." : "Your fleet is currently empty. Start by adding your first vehicle."}
                            </p>
                            {(filters.search || filters.status || filters.branch || filters.category || filters.fuelType) && (
                                <button
                                    onClick={() => setFilters({ ...filters, search: '', status: '', branch: '', category: '', fuelType: '', page: 1 })}
                                    className="mt-6 px-6 py-3 rounded-full text-sm font-bold transition-all duration-300 hover:scale-105 shadow-lg"
                                    style={{ background: '#C8E600', color: '#0A0A0A', boxShadow: '0 4px 15px rgba(200, 230, 0, 0.2)' }}
                                >
                                    Clear All Filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead>
                                <tr className="border-b" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                                    <th className="px-4 py-2.5 cursor-pointer group" onClick={() => handleSort('basicDetails.make')}>
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            {t('management.vehicles.table.vehicle', 'Vehicle Details')} <SortIcon field="basicDetails.make" />
                                        </div>
                                    </th>
                                    <th className="px-4 py-2.5 cursor-pointer group" onClick={() => handleSort('basicDetails.fleetNumber')}>
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Fleet & Staff <SortIcon field="basicDetails.fleetNumber" />
                                        </div>
                                    </th>
                                    <th className="px-4 py-2.5 cursor-pointer group" onClick={() => handleSort('legalDocs.registrationNumber')}>
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            {t('management.vehicles.table.vin', 'Plate No / Reg')} <SortIcon field="legalDocs.registrationNumber" />
                                        </div>
                                    </th>
                                    <th className="px-4 py-2.5">
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            Specs
                                        </div>
                                    </th>
                                    <th className="px-4 py-2.5 cursor-pointer group" onClick={() => handleSort('status')}>
                                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                                            {t('common.status', 'Status')} <SortIcon field="status" />
                                        </div>
                                    </th>
                                    <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {vehicles.map((v) => {
                                    const detailPath = mode === 'active' ? v._id : `../vehicles/${v._id}`;
                                    return (
                                        <tr
                                            key={v._id}
                                            onClick={() => navigate(detailPath, { state: { from: location.pathname } })}
                                            className="transition-colors cursor-pointer group"
                                            style={{ borderBottom: '1px solid var(--border-main)' }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm" 
                                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                                        <Car size={20} style={{ color: v.basicDetails?.colour?.toLowerCase() || 'var(--text-dim)' }} />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-black tracking-wide" style={{ color: 'var(--text-main)' }}>
                                                            {v.basicDetails?.make || 'Unknown'} {v.basicDetails?.model || ''}
                                                        </div>
                                                        <div className="text-xs font-medium mt-1 flex items-center gap-2" style={{ color: 'var(--text-dim)' }}>
                                                            <span className="px-2 py-0.5 rounded-md border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                                                {v.basicDetails?.year || 'N/A'}
                                                            </span>
                                                            <span className="px-2 py-0.5 rounded-md border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                                                {v.basicDetails?.colour || 'N/A'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            
                                            <td className="px-4 py-2.5">
                                                <div className="text-sm font-mono font-black" style={{ color: '#C8E600' }}>
                                                    {v.fleet?.fleetNumber ? `Fleet #${v.fleet.fleetNumber}` : (v.basicDetails?.fleetNumber ? `Fleet #${v.basicDetails.fleetNumber}` : 'UNASSIGNED')}
                                                </div>
                                                <div className="text-xs font-semibold mt-1 opacity-80" style={{ color: 'var(--text-dim)' }}>
                                                    {v.handlingStaff ? (typeof v.handlingStaff === 'object' ? v.handlingStaff.fullName : `ID: ${v.handlingStaff}`) : 'No Staff'}
                                                </div>
                                            </td>
                                            
                                            <td className="px-4 py-2.5">
                                                <div className="text-sm font-mono font-bold" style={{ color: 'var(--text-main)' }}>
                                                    {v.legalDocs?.registrationNumber || v.basicDetails?.fleetNumber || '—'}
                                                </div>
                                            </td>
                                            
                                            <td className="px-4 py-2.5">
                                                <div className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                                                    {v.basicDetails?.category || 'General'}
                                                </div>
                                                <div className="text-xs mt-1 flex items-center gap-1.5 font-medium" style={{ color: 'var(--text-dim)' }}>
                                                    {v.basicDetails?.fuelType || 'N/A'} <span className="opacity-50">•</span> {v.basicDetails?.transmission || 'N/A'}
                                                </div>
                                            </td>
                                            
                                            <td className="px-4 py-2.5">
                                                <StatusBadge status={v.status} />
                                            </td>
                                            
                                            <td className="px-4 py-2.5 text-right">
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); navigate(detailPath, { state: { from: location.pathname } }); }}
                                                        className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 hover:bg-[#C8E600] hover:text-black hover:scale-110 shadow-sm border border-white/10"
                                                        style={{ background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                                        title="View Details"
                                                    >
                                                        <Eye size={12} strokeWidth={2.5} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Modern Pagination Footer */}
                {!loading && vehicles.length > 0 && pagination && (
                    <div className="px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors shadow-[0_-1px_0_0_rgba(0,0,0,0.05)]" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                        <div className="flex flex-wrap items-center gap-4">
                            <p className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>
                                Showing {vehicles.length} of {pagination.total} vehicles
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold" style={{ color: 'var(--text-dim)' }}>Rows per page:</span>
                                <select
                                    value={filters.limit}
                                    onChange={(e) => handleFilterChange('limit', Number(e.target.value))}
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
                                    onClick={() => handlePageChange(filters.page - 1)}
                                    disabled={filters.page === 1 || loading}
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
                                                className={`w-9 h-9 rounded-lg text-xs font-black transition-all ${filters.page === p ? 'shadow-lg scale-110 z-10' : 'hover:bg-black/5 opacity-70 hover:opacity-100'}`}
                                                style={{ 
                                                    background: filters.page === p ? 'var(--brand-lime)' : 'transparent',
                                                    color: filters.page === p ? '#000' : 'var(--text-main)',
                                                    border: filters.page === p ? 'none' : '1px solid var(--border-main)'
                                                }}
                                            >
                                                {p}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => handlePageChange(filters.page + 1)}
                                    disabled={filters.page === pagination.totalPages || loading}
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
            <BulkVehicleUpload
                isOpen={isBulkUploadOpen}
                onClose={() => setIsBulkUploadOpen(false)}
                onSuccess={() => {
                    setIsBulkUploadOpen(false);
                    fetchVehicles();
                }}
            />
        </div>
    );
};

// Small utility icon for selects
const ChevronDownIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="m6 9 6 6 6-6"/>
    </svg>
);

export default VehicleList;
