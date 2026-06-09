import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Search, Save, CheckCircle2, Filter, FileText, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { getAllVehicles, updateVehicleLeaseSettings } from '../../../services/vehicleService';
import type { Vehicle } from '../../../services/vehicleService';
import { getAllBranches, type Branch } from '../../../services/branchService';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

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
];
const LEASE_ELIGIBLE_STATUSES = VEHICLE_STATUSES.filter(status => status !== 'ACTIVE — RENTED');

const ChevronDownIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="m6 9 6 6 6-6"/>
    </svg>
);

const VehicleLeaseSettings = () => {
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [exportingPdf, setExportingPdf] = useState(false);

    // Server-side filtration and pagination state
    const [filters, setFilters] = useState({
        page: 1,
        limit: 25,
        search: '',
        status: '',
        branch: '',
        category: '',
        fuelType: '',
        sortBy: 'createdAt',
        sortOrder: 'desc' as 'asc' | 'desc'
    });

    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 25,
        totalPages: 0
    });

    const [branches, setBranches] = useState<Branch[]>([]);
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    // Local state to manage edits before saving
    const [edits, setEdits] = useState<Record<string, { durationWeeks: number; sellingValue: number }>>({});

    const fetchMetadata = useCallback(async () => {
        try {
            const bResponse = await getAllBranches({ limit: 1000 });
            if (bResponse.success) setBranches(bResponse.data);
        } catch (err) {
            console.error('Failed to fetch filter metadata:', err);
        }
    }, []);

    const fetchVehicles = useCallback(async () => {
        try {
            setLoading(true);
            const activeFilters = Object.fromEntries(
                Object.entries(filters).filter(([_, v]) => v !== '' && v !== undefined)
            );
            
            // If no specific status is filtered, restrict query to eligible lease statuses
            if (!activeFilters.status) {
                activeFilters.status = LEASE_ELIGIBLE_STATUSES.join(',');
            }

            const response = await getAllVehicles(activeFilters);
            if (response.success) {
                setVehicles(response.data);
                setPagination(response.pagination);

                // Initialize edits map dynamically, preserving existing unsaved changes
                setEdits(prev => {
                    const updated = { ...prev };
                    response.data.forEach(v => {
                        if (!(v._id in updated)) {
                            updated[v._id] = {
                                durationWeeks: v.basicDetails.leaseDurationWeeks || 260,
                                sellingValue: v.basicDetails.sellingValue || 0,
                            };
                        }
                    });
                    return updated;
                });
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to fetch vehicles');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchMetadata();
    }, [fetchMetadata]);

    useEffect(() => {
        const debounceId = setTimeout(() => {
            fetchVehicles();
        }, 300);
        return () => clearTimeout(debounceId);
    }, [fetchVehicles, filters.search, filters.page, filters.limit, filters.status, filters.branch, filters.category, filters.fuelType, filters.sortBy, filters.sortOrder]);

    const handleFilterChange = (key: string, value: any) => {
        setFilters(prev => ({
            ...prev,
            [key]: value,
            page: 1 // Reset to first page on filter changes
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

    const handleSave = async (id: string) => {
        const edit = edits[id];
        if (!edit) return;

        try {
            setSavingId(id);
            const payload = {
                durationWeeks: Number(edit.durationWeeks),
                sellingValue: Number(edit.sellingValue),
            };
            console.log('[DEBUG] updateVehicleLeaseSettings - Payload:', payload);

            await updateVehicleLeaseSettings(id, payload);
            toast.success('Lease settings updated successfully');

            // Update local state to match edits
            setVehicles(prev => prev.map(v => {
                if (v._id === id) {
                    return {
                        ...v,
                        basicDetails: {
                            ...v.basicDetails,
                            leaseDurationWeeks: Number(edit.durationWeeks),
                            sellingValue: Number(edit.sellingValue)
                        }
                    };
                }
                return v;
            }));
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update lease settings');
        } finally {
            setSavingId(null);
        }
    };

    const handleEditChange = (id: string, field: 'durationWeeks' | 'sellingValue', value: string) => {
        setEdits(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }));
    };

    const exportPDF = async () => {
        setExportingPdf(true);
        const toastId = toast.loading("Generating PDF Report on Full Data...");
        try {
            // Clean up empty filters
            const activeFilters = Object.fromEntries(
                Object.entries(filters).filter(([_, v]) => v !== '' && v !== undefined)
            );
            
            if (!activeFilters.status) {
                activeFilters.status = LEASE_ELIGIBLE_STATUSES.join(',');
            }

            // Expose all matching records by requesting with a large limit in page 1
            activeFilters.page = 1;
            activeFilters.limit = 2000;

            const response = await getAllVehicles(activeFilters);
            const exportData = response.data;

            if (exportData.length === 0) {
                toast.error("No vehicles found to export", { id: toastId });
                return;
            }

            const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
            
            // Header
            doc.setFontSize(18);
            doc.setTextColor(20, 20, 20);
            doc.text("Vehicle Lease Settings Report", 40, 40);
            
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 40, 55);
            
            // Draw a separator line
            doc.setDrawColor(220, 220, 220);
            doc.line(40, 65, 550, 65);

            // Active filters text
            let filterText = "Active Filters: ";
            const filterParts = [];
            if (filters.search) filterParts.push(`Search: "${filters.search}"`);
            if (filters.status) filterParts.push(`Status: ${filters.status}`);
            if (filters.branch) {
                const branchName = branches.find(b => b._id === filters.branch)?.name || filters.branch;
                filterParts.push(`Branch: ${branchName}`);
            }
            if (filters.category) filterParts.push(`Category: ${filters.category}`);
            if (filters.fuelType) filterParts.push(`Fuel: ${filters.fuelType}`);
            
            filterText += filterParts.length > 0 ? filterParts.join(" | ") : "None";
            doc.setFontSize(8);
            doc.text(filterText, 40, 80);

            // Table Columns
            const head = [['Sl No.', 'Vehicle Make & Model', 'Plate No / VIN', 'Status', 'Lease Duration (Wks)', 'Selling Value']];
            
            // Table Rows
            const body = exportData.map((v, idx) => [
                (idx + 1).toString().padStart(2, '0'),
                `${v.basicDetails?.make || 'Unknown'} ${v.basicDetails?.model || ''}`,
                v.basicDetails?.vin || 'N/A',
                v.status,
                `${v.basicDetails?.leaseDurationWeeks || 260} Weeks`,
                v.purchaseDetails?.currency && v.basicDetails?.sellingValue 
                    ? `${v.purchaseDetails.currency} ${v.basicDetails.sellingValue.toLocaleString()}`
                    : `AED ${(v.basicDetails?.sellingValue || 0).toLocaleString()}`
            ]);

            autoTable(doc, {
                head,
                body,
                startY: 95,
                theme: 'striped',
                headStyles: { fillColor: [200, 230, 0], textColor: [0, 0, 0], fontStyle: 'bold' },
                styles: { fontSize: 8 },
                columnStyles: {
                    0: { cellWidth: 40 },
                    1: { cellWidth: 155 },
                    2: { cellWidth: 85 },
                    3: { cellWidth: 100 },
                    4: { cellWidth: 70 },
                    5: { cellWidth: 60, halign: 'right' }
                }
            });

            doc.save(`Vehicle_Lease_Settings_${new Date().toISOString().slice(0, 10)}.pdf`);
            toast.success(`Successfully exported ${exportData.length} records to PDF.`, { id: toastId });
        } catch (err: any) {
            console.error("PDF generation failed:", err);
            toast.error("Failed to generate PDF report.", { id: toastId });
        } finally {
            setExportingPdf(false);
        }
    };

    return (
        <div className="container-responsive space-y-6">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Vehicle Lease Settings', active: true }]} />

            {/* Compact Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <Car size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        Vehicle Lease Settings
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">Global configuration for standard lease durations and rental rates.</p>
                </div>
            </div>

            {/* Search and Filters Bar */}
            <div className="flex flex-col gap-3 mt-2">
                <div className="flex flex-col sm:flex-row gap-2.5">
                    {/* Primary Search */}
                    <div className="relative flex-1 group">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#C8E600] transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by Make, Model, Plate No, or Fleet #..."
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
                            <option value="">All Eligible Statuses</option>
                            {LEASE_ELIGIBLE_STATUSES.map(status => (
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
                        More Filters
                    </button>

                    <button
                        onClick={exportPDF}
                        disabled={exportingPdf || loading}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-brand-lime text-black hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                        <FileText size={15} />
                        {exportingPdf ? 'Exporting...' : 'Export PDF'}
                    </button>
                </div>

                {/* Advanced Filters Panel */}
                {showAdvancedFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 p-4 rounded-2xl animate-in slide-in-from-top-4 fade-in duration-300 shadow-xl border relative overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        {/* Decorative glow */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C8E600] rounded-full blur-[100px] opacity-5 pointer-events-none" />
                        
                        <div className="space-y-1 relative z-10">
                            <label className="text-[11px] font-black uppercase tracking-widest pl-1" style={{ color: 'var(--text-dim)' }}>Category</label>
                            <div className="relative">
                                <select
                                    value={filters.category}
                                    onChange={(e) => handleFilterChange('category', e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl text-sm font-medium outline-none appearance-none cursor-pointer transition-all duration-300 focus:ring-2 focus:ring-[#C8E600]/30 hover:shadow-md"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="">All Categories</option>
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"><ChevronDownIcon /></div>
                            </div>
                        </div>
                        
                        <div className="space-y-1 relative z-10">
                            <label className="text-[11px] font-black uppercase tracking-widest pl-1" style={{ color: 'var(--text-dim)' }}>Fuel Type</label>
                            <div className="relative">
                                <select
                                    value={filters.fuelType}
                                    onChange={(e) => handleFilterChange('fuelType', e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl text-sm font-medium outline-none appearance-none cursor-pointer transition-all duration-300 focus:ring-2 focus:ring-[#C8E600]/30 hover:shadow-md"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="">All Fuel Types</option>
                                    {FUEL_TYPES.map(fuel => (
                                        <option key={fuel} value={fuel}>{fuel}</option>
                                    ))}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"><ChevronDownIcon /></div>
                            </div>
                        </div>

                        <div className="space-y-1 relative z-10">
                            <label className="text-[11px] font-black uppercase tracking-widest pl-1" style={{ color: 'var(--text-dim)' }}>Branch</label>
                            <div className="relative">
                                <select
                                    value={filters.branch}
                                    onChange={(e) => handleFilterChange('branch', e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl text-sm font-medium outline-none appearance-none cursor-pointer transition-all duration-300 focus:ring-2 focus:ring-[#C8E600]/30 hover:shadow-md"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="">All Branches</option>
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
                                Clear All Filters
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="overflow-x-auto w-full border rounded-xl shadow-sm mt-4" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-card)' }}>
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 opacity-80">
                        <div className="w-10 h-10 border-4 border-[#C8E600]/20 border-t-[#C8E600] rounded-full animate-spin mb-4" />
                        <p className="text-xs font-bold tracking-widest uppercase text-dim">Syncing Lease Data...</p>
                    </div>
                ) : vehicles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 shadow-inner bg-[var(--bg-input)]">
                            <Car size={36} className="text-dim opacity-50" />
                        </div>
                        <h3 className="text-lg font-black mb-1 text-main">No Vehicles Found</h3>
                        <p className="text-xs max-w-md mx-auto text-dim">
                            We couldn't find any vehicles matching your active filters. Try adjusting them.
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead style={{ backgroundColor: 'var(--bg-input)' }}>
                            <tr className="text-[11px] font-black uppercase tracking-wider opacity-60 border-b" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                                <th className="py-4 pl-4 pr-2 w-10">
                                    <input type="checkbox" className="rounded border-gray-300" />
                                </th>
                                <th className="py-4 px-3">Sl No.</th>
                                <th className="py-4 px-3 cursor-pointer group" onClick={() => handleSort('basicDetails.make')}>
                                    <div className="flex items-center gap-2">
                                        Vehicle <SortIcon field="basicDetails.make" />
                                    </div>
                                </th>
                                <th className="py-4 px-3 cursor-pointer group" onClick={() => handleSort('status')}>
                                    <div className="flex items-center gap-2">
                                        Status <SortIcon field="status" />
                                    </div>
                                </th>
                                <th className="py-4 px-3">Duration (Weeks)</th>
                                <th className="py-4 px-3">Selling Value (USD)</th>
                                <th className="py-4 pr-4 pl-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y" style={{ borderColor: 'var(--border-main)' }}>
                            {vehicles.map((vehicle, index) => {
                                const isSaving = savingId === vehicle._id;
                                const editState = edits[vehicle._id] || { durationWeeks: 260, sellingValue: 0 };

                                const hasChanged =
                                    Number(editState.durationWeeks) !== (vehicle.basicDetails.leaseDurationWeeks || 260) ||
                                    Number(editState.sellingValue) !== (vehicle.basicDetails.sellingValue || 0);

                                const serialNumber = (index + 1 + (filters.page - 1) * filters.limit).toString().padStart(2, '0');

                                return (
                                    <tr key={vehicle._id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                        <td className="py-4 pl-4 pr-2">
                                            <input type="checkbox" className="rounded border-gray-300" />
                                        </td>
                                        <td className="py-4 px-3 font-semibold text-gray-500">{serialNumber}</td>
                                        <td 
                                            className="py-4 px-3 cursor-pointer"
                                            onClick={() => navigate(`../vehicles/${vehicle._id}`)}
                                        >
                                            <div className="font-bold hover:opacity-80 transition-opacity" style={{ color: 'var(--brand-lime)' }}>{vehicle.basicDetails.make} {vehicle.basicDetails.model}</div>
                                            <div className="text-[10px] uppercase font-black tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>Plate No: {vehicle.basicDetails.vin}</div>
                                        </td>
                                        <td className="py-4 px-3">
                                            <span className={`px-2.5 py-1 rounded text-[10px] font-black tracking-widest uppercase ${vehicle.status.includes('ACTIVE') ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                                                }`}>
                                                • {vehicle.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-3">
                                            <select
                                                value={editState.durationWeeks}
                                                onChange={(e) => handleEditChange(vehicle._id, 'durationWeeks', e.target.value)}
                                                className="px-3 py-1.5 rounded-lg border outline-none font-bold focus:border-brand-lime transition-all appearance-none"
                                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                            >
                                                <option value="52">52 Weeks (1 Year)</option>
                                                <option value="104">104 Weeks (2 Years)</option>
                                                <option value="156">156 Weeks (3 Years)</option>
                                                <option value="208">208 Weeks (4 Years)</option>
                                                <option value="260">260 Weeks (5 Years)</option>
                                                <option value="312">312 Weeks (6 Years)</option>
                                            </select>
                                        </td>
                                        <td className="py-4 px-3">
                                            <input
                                                type="number"
                                                value={editState.sellingValue}
                                                onChange={(e) => handleEditChange(vehicle._id, 'sellingValue', e.target.value)}
                                                className="w-28 px-3 py-1.5 rounded-lg border outline-none font-bold focus:border-brand-lime transition-all"
                                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                            />
                                        </td>
                                        <td className="py-4 pr-4 pl-3 flex justify-end">
                                            <button
                                                onClick={() => handleSave(vehicle._id)}
                                                disabled={isSaving || !hasChanged}
                                                className={`px-4 py-2 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-1 ${hasChanged
                                                        ? 'bg-[#D4F12E] text-black hover:scale-[1.02] active:scale-95'
                                                        : 'bg-black/5 dark:bg-white/5 text-gray-500 cursor-not-allowed'
                                                    }`}
                                            >
                                                {isSaving ? (
                                                    <><div className="w-3 h-3 border border-black border-t-transparent rounded-full animate-spin"></div> Saving...</>
                                                ) : hasChanged ? (
                                                    <><Save size={14} /> Save</>
                                                ) : (
                                                    <><CheckCircle2 size={14} /> Saved</>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination Footer */}
            {!loading && vehicles.length > 0 && pagination && (
                <div className="flex items-center justify-between pt-6 mt-6 border-t border-dashed pb-8" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-4">
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
                        <div className="flex items-center gap-1 text-sm font-bold">
                            <button 
                                disabled={filters.page <= 1 || loading}
                                onClick={() => handlePageChange(filters.page - 1)}
                                className="p-2 rounded-lg border border-[var(--border-main)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ color: 'var(--text-main)' }}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            {getPageNumbers().map((item, index) => {
                                if (item === '...') {
                                    return (
                                        <span key={`ellipsis-${index}`} className="px-1.5 text-xs font-bold" style={{ color: 'var(--text-dim)' }}>
                                            ...
                                        </span>
                                    );
                                }
                                return (
                                    <button 
                                        key={item}
                                        onClick={() => handlePageChange(Number(item))}
                                        className={`px-2.5 py-1 rounded text-xs font-bold ${filters.page === item ? 'bg-[#D4F12E] text-black font-black' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                                        style={{ 
                                            color: filters.page === item ? '#000' : 'var(--text-main)'
                                        }}
                                    >
                                        {item.toString().padStart(2, '0')}
                                    </button>
                                );
                            })}
                            <button 
                                disabled={filters.page >= pagination.totalPages || loading}
                                onClick={() => handlePageChange(filters.page + 1)}
                                className="p-2 rounded-lg border border-[var(--border-main)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ color: 'var(--text-main)' }}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default VehicleLeaseSettings;
