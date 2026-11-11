import { formatDate } from '../../utils/dateUtils';
import React, { useState, useEffect, useMemo } from 'react';
import {
    X,
    Download,
    FileSpreadsheet,
    FileText,
    Printer,
    Search,
    ChevronDown,
    ChevronUp,
    ArrowUpDown,
    Columns,
    RefreshCw,
    Truck
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    getFleetSummaryReport,
    type GpsVehicle,
    type FleetSummaryRow,
    type FleetSummaryTotals
} from '../../services/gpsService';

interface FleetSummaryReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicles: GpsVehicle[];
    fleetVehicles?: any[];
    fleetDrivers?: any[];
}

// Period Preset Types
type PeriodPreset = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'last_7_days' | 'last_30_days' | 'custom';

// Column definition interface
interface ColumnConfig {
    key: keyof FleetSummaryRow;
    label: string;
    unit?: string;
    visible: boolean;
    align?: 'left' | 'center' | 'right';
    format?: (val: any, row: FleetSummaryRow) => string;
}

export const FleetSummaryReportModal: React.FC<FleetSummaryReportModalProps> = ({
    isOpen,
    onClose,
    vehicles,
    fleetVehicles = [],
    fleetDrivers = []
}) => {
    void fleetVehicles;
    void fleetDrivers;
    // ----------------------------------------------------
    // Filter States
    // ----------------------------------------------------
    const [selectedImeis, setSelectedImeis] = useState<string[]>([]); // Empty = All
    const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
    const [period, setPeriod] = useState<PeriodPreset>('last_30_days');
    const [startTime, setStartTime] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');
    const [reportType, setReportType] = useState<'Summary' | 'Detailed'>('Summary');

    // UI Dropdowns state
    const [isDeviceDropdownOpen, setIsDeviceDropdownOpen] = useState<boolean>(false);
    const [deviceSearchQuery, setDeviceSearchQuery] = useState<string>('');
    const [isColumnsDropdownOpen, setIsColumnsDropdownOpen] = useState<boolean>(false);

    // ----------------------------------------------------
    // Data & Table States
    // ----------------------------------------------------
    const [loading, setLoading] = useState<boolean>(false);
    const [reportRows, setReportRows] = useState<FleetSummaryRow[]>([]);
    const [reportTotals, setReportTotals] = useState<FleetSummaryTotals | null>(null);

    // Table search, pagination & sorting
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [sortField, setSortField] = useState<keyof FleetSummaryRow>('distance');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [rowsPerPage, setRowsPerPage] = useState<number>(25);

    // ----------------------------------------------------
    // Column Configurations
    // ----------------------------------------------------
    const [columns, setColumns] = useState<ColumnConfig[]>([
        { key: 'vehicleNumber', label: 'Vehicle Number', visible: true, align: 'left' },
        { key: 'deviceName', label: 'Device Name', visible: true, align: 'left' },
        { key: 'imei', label: 'IMEI', visible: true, align: 'center', format: (val) => val ? String(val) : '-' },
        { key: 'mcType', label: 'Model', visible: true, align: 'center', format: (val) => val || 'VL802' },
        { key: 'distance', label: 'Distance', unit: 'km', visible: true, align: 'right', format: (val) => `${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km` },
        { key: 'startTime', label: 'First GPS Point', visible: true, align: 'center', format: (val, row) => (val && val !== 'N/A' ? val : (row.startDate ? formatDate(row.startDate) : '-')) },
        { key: 'endTime', label: 'Last GPS Point', visible: true, align: 'center', format: (val) => (val && val !== 'N/A' ? val : '-') },
        { key: 'odometerStart', label: 'Odometer Start', unit: 'km', visible: true, align: 'right', format: (val) => `${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km` },
        { key: 'odometerEnd', label: 'Odometer End', unit: 'km', visible: true, align: 'right', format: (val) => `${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km` },
        { key: 'engineHoursFormatted', label: 'Engine Hours', unit: 'Hours', visible: true, align: 'center' },
        { key: 'fuelConsumed', label: 'Fuel Consumed', unit: 'L', visible: true, align: 'right', format: (val) => `${Number(val || 0).toFixed(1)} L` },
        { key: 'maxSpeed', label: 'Maximum Speed', unit: 'km/h', visible: false, align: 'center', format: (val) => `${val || 0} km/h` },
        { key: 'averageSpeed', label: 'Average Speed', unit: 'km/h', visible: false, align: 'center', format: (val) => `${Number(val || 0).toFixed(2)} km/h` },
    ]);

    // Format date string helpers
    const formatDateForInput = (d: Date): string => {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const formatToApiDateTime = (val: string | Date | undefined): string | undefined => {
        if (!val) return undefined;
        if (typeof val === 'string') {
            const trimmed = val.trim();
            if (!trimmed) return undefined;
            // If already formatted as YYYY-MM-DD HH:mm:ss
            if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
                return trimmed;
            }
            // If datetime-local format YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss
            if (trimmed.includes('T')) {
                const [datePart, timePart] = trimmed.split('T');
                const timeWithSec = timePart.length === 5 ? `${timePart}:00` : timePart;
                return `${datePart} ${timeWithSec}`;
            }
        }
        const d = new Date(val);
        if (isNaN(d.getTime())) return undefined;
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    // Calculate dates based on period preset
    const applyPeriodDates = (p: PeriodPreset) => {
        const now = new Date();
        let start = new Date();
        let end = new Date();

        switch (p) {
            case 'today':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                end = now;
                break;
            case 'yesterday':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
                break;
            case 'this_week': {
                const day = now.getDay() || 7; // Monday = 1
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1, 0, 0, 0);
                end = now;
                break;
            }
            case 'last_week': {
                const day = now.getDay() || 7;
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day - 6, 0, 0, 0);
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 23, 59, 59);
                break;
            }
            case 'this_month':
                start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
                end = now;
                break;
            case 'last_month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
                end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
                break;
            case 'last_7_days':
                start = new Date(now.getTime() - 7 * 86400000);
                end = now;
                break;
            case 'last_30_days':
                start = new Date(now.getTime() - 30 * 86400000);
                end = now;
                break;
            case 'custom':
                return; // don't override manual custom pickers
        }

        setStartTime(formatDateForInput(start));
        setEndTime(formatDateForInput(end));
    };

    // Initialize period dates on component open
    useEffect(() => {
        if (isOpen) {
            applyPeriodDates('last_30_days');
            fetchReport();
        }
    }, [isOpen]);

    // Handle period dropdown change
    const handlePeriodChange = (newPeriod: PeriodPreset) => {
        setPeriod(newPeriod);
        if (newPeriod !== 'custom') {
            applyPeriodDates(newPeriod);
        }
    };

    // Extract unique groups and sub-accounts from vehicles list
    const availableGroups = useMemo(() => {
        const set = new Set<string>();
        vehicles.forEach(v => {
            if (v.account) set.add(v.account);
            if (v.deviceGroup && v.deviceGroup !== 'Default group') set.add(v.deviceGroup);
        });
        return Array.from(set).sort();
    }, [vehicles]);

    // Filter vehicles in multi-select dropdown by search query
    const filteredDropdownVehicles = useMemo(() => {
        if (!deviceSearchQuery.trim()) return vehicles;
        const q = deviceSearchQuery.toLowerCase();
        return vehicles.filter(v =>
            (v.deviceName && v.deviceName.toLowerCase().includes(q)) ||
            (v.vehicleName && v.vehicleName.toLowerCase().includes(q)) ||
            (v.account && v.account.toLowerCase().includes(q)) ||
            v.imei.toLowerCase().includes(q)
        );
    }, [vehicles, deviceSearchQuery]);

    // Group filtered dropdown vehicles by sub-account
    const groupedDropdownVehicles = useMemo(() => {
        const map = new Map<string, GpsVehicle[]>();
        filteredDropdownVehicles.forEach(v => {
            const acc = v.account || 'ARRENDADORA_OLA_CARS (Main)';
            if (!map.has(acc)) map.set(acc, []);
            map.get(acc)!.push(v);
        });
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [filteredDropdownVehicles]);

    // Fetch Report Data from API
    const fetchReport = async () => {
        setLoading(true);
        try {
            const apiStart = formatToApiDateTime(startTime);
            const apiEnd = formatToApiDateTime(endTime);

            const imeisParam = selectedImeis.length > 0 ? selectedImeis.join(',') : 'ALL';
            const data = await getFleetSummaryReport({
                imeis: imeisParam,
                group: selectedGroup,
                startTime: apiStart,
                endTime: apiEnd,
                reportType
            });

            if (data && data.summaryRows) {
                setReportRows(data.summaryRows);
                setReportTotals(data.totals);
                toast.success(`Loaded Fleet Summary for ${data.summaryRows.length} device(s)`);
            } else {
                setReportRows([]);
                setReportTotals(null);
            }
        } catch (err: any) {
            console.error("Failed to load Fleet Summary Report:", err);
            toast.error(err.message || "Failed to load Fleet Summary Report");
            setReportRows([]);
            setReportTotals(null);
        } finally {
            setLoading(false);
        }
    };

    // Filter, Sort, and Paginate rows
    const processedRows = useMemo(() => {
        let result = [...reportRows];

        // Global search filter (supports deviceName, vehicleNumber, displayName, IMEI, mcType, group)
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(r =>
                (r.deviceName && r.deviceName.toLowerCase().includes(q)) ||
                (r.displayName && r.displayName.toLowerCase().includes(q)) ||
                r.device.toLowerCase().includes(q) ||
                r.imei.toLowerCase().includes(q) ||
                (r.mcType && r.mcType.toLowerCase().includes(q)) ||
                r.group.toLowerCase().includes(q) ||
                (r.vehicleNumber && r.vehicleNumber.toLowerCase().includes(q))
            );
        }

        // Sorting
        result.sort((a, b) => {
            if (sortField === 'distance') {
                return sortDirection === 'asc' ? a.distance - b.distance : b.distance - a.distance;
            }

            if (sortField === 'device') {
                const nameA = (a.displayName || a.deviceName || a.vehicleNumber || a.device || '').toLowerCase();
                const nameB = (b.displayName || b.deviceName || b.vehicleNumber || b.device || '').toLowerCase();
                return sortDirection === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
            }

            let valA = a[sortField] ?? '';
            let valB = b[sortField] ?? '';

            if (typeof valA === 'string') valA = (valA as string).toLowerCase();
            if (typeof valB === 'string') valB = (valB as string).toLowerCase();

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [reportRows, searchQuery, sortField, sortDirection]);

    // Paginated subset
    const paginatedRows = useMemo(() => {
        const startIdx = (currentPage - 1) * rowsPerPage;
        return processedRows.slice(startIdx, startIdx + rowsPerPage);
    }, [processedRows, currentPage, rowsPerPage]);

    const totalPages = Math.ceil(processedRows.length / rowsPerPage) || 1;

    // Toggle Sort
    const handleSort = (field: keyof FleetSummaryRow) => {
        if (sortField === field) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Toggle Column Visibility
    const toggleColumnVisibility = (key: keyof FleetSummaryRow) => {
        setColumns(prev =>
            prev.map(col => (col.key === key ? { ...col, visible: !col.visible } : col))
        );
    };

    // Export Handlers
    const handleExportExcel = () => {
        if (processedRows.length === 0) {
            toast.error("No data available to export.");
            return;
        }
        const toastId = toast.loading("Generating Excel File...");
        try {
            const visibleCols = columns.filter(c => c.visible);
            const exportData = processedRows.map(r => {
                const rowObj: Record<string, any> = {};
                visibleCols.forEach(col => {
                    rowObj[col.label] = col.format ? col.format(r[col.key], r) : r[col.key];
                });
                return rowObj;
            });

            // Append Footer Totals row
            if (reportTotals) {
                const totalsRowObj: Record<string, any> = {};
                visibleCols.forEach(col => {
                    if (col.key === 'vehicleNumber' || col.key === 'device') totalsRowObj[col.label] = `TOTALS (${reportTotals.totalDevices} Devices)`;
                    else if (col.key === 'distance') totalsRowObj[col.label] = `${reportTotals.totalDistance} km`;
                    else if (col.key === 'fuelConsumed') totalsRowObj[col.label] = `${reportTotals.totalFuel} L`;
                    else if (col.key === 'averageSpeed') totalsRowObj[col.label] = `${reportTotals.averageSpeed} km/h`;
                    else if (col.key === 'engineHoursFormatted') totalsRowObj[col.label] = reportTotals.totalEngineHoursFormatted;
                    else totalsRowObj[col.label] = '-';
                });
                exportData.push(totalsRowObj);
            }

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Fleet Summary");

            ws["!cols"] = visibleCols.map(c => ({ wch: Math.max(c.label.length + 5, 18) }));

            const dateStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `Fleet_Summary_Report_${dateStr}.xlsx`);
            toast.success("Excel report exported successfully!", { id: toastId });
        } catch (err) {
            console.error("Excel Export Error:", err);
            toast.error("Failed to export Excel report.", { id: toastId });
        }
    };

    const handleExportCSV = () => {
        if (processedRows.length === 0) {
            toast.error("No data available to export.");
            return;
        }
        const toastId = toast.loading("Generating CSV File...");
        try {
            const visibleCols = columns.filter(c => c.visible);
            const exportData = processedRows.map(r => {
                const rowObj: Record<string, any> = {};
                visibleCols.forEach(col => {
                    rowObj[col.label] = col.format ? col.format(r[col.key], r) : r[col.key];
                });
                return rowObj;
            });

            const ws = XLSX.utils.json_to_sheet(exportData);
            const csv = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute("download", `Fleet_Summary_Report_${dateStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success("CSV report exported successfully!", { id: toastId });
        } catch (err) {
            console.error("CSV Export Error:", err);
            toast.error("Failed to export CSV report.", { id: toastId });
        }
    };

    const handleExportPDF = () => {
        if (processedRows.length === 0) {
            toast.error("No data available to export.");
            return;
        }
        const toastId = toast.loading("Generating PDF Report...");
        try {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
            const visibleCols = columns.filter(c => c.visible);

            doc.setFontSize(18);
            doc.text("Fleet Summary Report (Tracksolid Style)", 40, 40);
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleString()} | Period: ${period.toUpperCase()}`, 40, 58);

            const head = [visibleCols.map(c => c.label)];
            const body = processedRows.map(r =>
                visibleCols.map(col => (col.format ? col.format(r[col.key], r) : String(r[col.key] || '')))
            );

            if (reportTotals) {
                const footRow = visibleCols.map(col => {
                    if (col.key === 'device') return `TOTALS (${reportTotals.totalDevices} Devices)`;
                    if (col.key === 'distance') return `${reportTotals.totalDistance} km`;
                    if (col.key === 'fuelConsumed') return `${reportTotals.totalFuel} L`;
                    if (col.key === 'averageSpeed') return `${reportTotals.averageSpeed} km/h`;
                    if (col.key === 'engineHoursFormatted') return reportTotals.totalEngineHoursFormatted;
                    return '-';
                });
                body.push(footRow);
            }

            autoTable(doc, {
                head,
                body,
                startY: 70,
                theme: 'striped',
                headStyles: { fillColor: [40, 44, 52], textColor: [255, 255, 255], fontStyle: 'bold' },
                footStyles: { fillColor: [230, 240, 250], textColor: [0, 0, 0], fontStyle: 'bold' },
                styles: { fontSize: 8, cellPadding: 6 }
            });

            const dateStr = new Date().toISOString().split('T')[0];
            doc.save(`Fleet_Summary_Report_${dateStr}.pdf`);
            toast.success("PDF report exported successfully!", { id: toastId });
        } catch (err) {
            console.error("PDF Export Error:", err);
            toast.error("Failed to export PDF report.", { id: toastId });
        }
    };

    const handlePrint = () => {
        if (processedRows.length === 0) {
            toast.error("No data available to print.");
            return;
        }
        const visibleCols = columns.filter(c => c.visible);
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const tableHeaders = visibleCols.map(c => `<th style="padding:10px; border:1px solid #ddd; background:#f4f6f8; font-size:12px; font-weight:bold; text-align:${c.align || 'left'};">${c.label}</th>`).join('');

        const tableRows = processedRows.map(r => `
            <tr>
                ${visibleCols.map(c => {
            const val = c.format ? c.format(r[c.key], r) : r[c.key];
            return `<td style="padding:8px; border:1px solid #eee; font-size:11px; text-align:${c.align || 'left'};">${val}</td>`;
        }).join('')}
            </tr>
        `).join('');

        const footerRow = reportTotals ? `
            <tr style="background:#eef2f7; font-weight:bold;">
                ${visibleCols.map(c => {
            let val = '-';
            if (c.key === 'vehicleNumber' || c.key === 'device') val = `TOTALS (${reportTotals.totalDevices} Devices)`;
            else if (c.key === 'distance') val = `${reportTotals.totalDistance} km`;
            else if (c.key === 'fuelConsumed') val = `${reportTotals.totalFuel} L`;
            else if (c.key === 'averageSpeed') val = `${reportTotals.averageSpeed} km/h`;
            else if (c.key === 'engineHoursFormatted') val = reportTotals.totalEngineHoursFormatted;
            return `<td style="padding:10px; border:1px solid #ccc; font-size:11px; text-align:${c.align || 'left'};">${val}</td>`;
        }).join('')}
            </tr>
        ` : '';

        printWindow.document.write(`
            <html>
                <head>
                    <title>Fleet Summary Report</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
                        h2 { margin-bottom: 4px; }
                        p { margin-top: 0; font-size: 12px; color: #666; }
                        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    </style>
                </head>
                <body>
                    <h2>Fleet Summary Report (Tracksolid Style)</h2>
                    <p>Generated on: ${new Date().toLocaleString()} | Period: ${period.toUpperCase()}</p>
                    <table>
                        <thead><tr>${tableHeaders}</tr></thead>
                        <tbody>${tableRows}${footerRow}</tbody>
                    </table>
                    <script>
                        window.onload = function() { window.print(); window.close(); }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 md:p-6 animate-fadeIn overflow-y-auto">
            <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl w-full max-w-7xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-[var(--text-main)] transition-all">

                {/* ---------------------------------------------------- */}
                {/* MODAL HEADER */}
                {/* ---------------------------------------------------- */}
                <div className="px-6 py-4 border-b border-[var(--border-main)] flex items-center justify-between bg-gradient-to-r from-[var(--bg-card)] via-[var(--bg-input)] to-[var(--bg-card)]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-500 shadow-sm">
                            <Truck size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                                Fleet Summary Report
                                <span className="text-[10px] font-extrabold uppercase bg-lime-500/20 text-lime-400 px-2 py-0.5 rounded-full border border-lime-500/30">
                                    Tracksolid Style
                                </span>
                            </h2>
                            <p className="text-xs text-[var(--text-dim)] font-medium">
                                Trips & Distance Aggregation Telemetry — <span className="text-[var(--text-main)] font-semibold">jimi.open.platform.report.trips</span>
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2.5 rounded-xl border border-[var(--border-main)] hover:bg-[var(--sidebar-hover)] text-[var(--text-dim)] hover:text-[var(--text-main)] transition-all cursor-pointer"
                        title="Close Modal"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* ---------------------------------------------------- */}
                {/* FILTERS TOOLBAR */}
                {/* ---------------------------------------------------- */}
                <div className="p-4 md:p-5 border-b border-[var(--border-main)] bg-[var(--bg-main)]/50 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">

                        {/* 1. Devices Multi-Select with Sub-Account Groups */}
                        <div className="relative">
                            <label className="block text-[10px] font-black uppercase text-[var(--text-dim)] mb-1">
                                Devices
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsDeviceDropdownOpen(!isDeviceDropdownOpen)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-main)] bg-[var(--bg-input)] flex items-center justify-between hover:border-lime-500/50 transition-all font-semibold"
                            >
                                <span className="truncate">
                                    {selectedImeis.length === 0
                                        ? `All Devices (${vehicles.length})`
                                        : `${selectedImeis.length} Device(s) Selected`}
                                </span>
                                <ChevronDown size={14} className="text-[var(--text-dim)] ml-1 flex-shrink-0" />
                            </button>

                            {/* Dropdown Menu */}
                            {isDeviceDropdownOpen && (
                                <div className="absolute top-full left-0 mt-1 w-80 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-2xl z-50 p-2.5 space-y-2">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                                        <input
                                            type="text"
                                            placeholder="Search device, IMEI, or sub-account..."
                                            value={deviceSearchQuery}
                                            onChange={(e) => setDeviceSearchQuery(e.target.value)}
                                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg outline-none focus:border-lime-500"
                                        />
                                    </div>
                                    <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                        <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-[var(--sidebar-hover)] rounded-lg cursor-pointer text-xs font-bold text-lime-400">
                                            <input
                                                type="checkbox"
                                                checked={selectedImeis.length === 0}
                                                onChange={() => setSelectedImeis([])}
                                                className="accent-lime-500 rounded"
                                            />
                                            Select All Fleet Devices ({vehicles.length})
                                        </label>
                                        <div className="border-t border-[var(--border-main)] my-1" />

                                        {groupedDropdownVehicles.map(([accName, accVehicles]) => {
                                            const accImeis = accVehicles.map(v => v.imei);
                                            const isAllAccSelected = accVehicles.length > 0 && accVehicles.every(v => selectedImeis.includes(v.imei));

                                            return (
                                                <div key={accName} className="rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)]/40 p-1.5 space-y-1">
                                                    <div className="flex items-center justify-between px-1.5 py-0.5">
                                                        <span className="text-[11px] font-bold text-lime-400 truncate max-w-[180px]" title={accName}>
                                                            {accName} ({accVehicles.length})
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isAllAccSelected) {
                                                                    setSelectedImeis(prev => prev.filter(id => !accImeis.includes(id)));
                                                                } else {
                                                                    setSelectedImeis(prev => Array.from(new Set([...prev, ...accImeis])));
                                                                }
                                                            }}
                                                            className="text-[10px] text-lime-400 font-semibold hover:underline flex-shrink-0"
                                                        >
                                                            {isAllAccSelected ? 'Deselect' : 'Select All'}
                                                        </button>
                                                    </div>
                                                    <div className="space-y-0.5 pt-0.5">
                                                        {accVehicles.map(v => {
                                                            const isSelected = selectedImeis.includes(v.imei);
                                                            return (
                                                                <label
                                                                    key={v.imei}
                                                                    className="flex items-center justify-between px-1.5 py-1 hover:bg-[var(--sidebar-hover)] rounded cursor-pointer text-xs"
                                                                >
                                                                    <div className="flex items-center gap-2 truncate">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isSelected}
                                                                            onChange={() => {
                                                                                if (isSelected) {
                                                                                    setSelectedImeis(prev => prev.filter(id => id !== v.imei));
                                                                                } else {
                                                                                    setSelectedImeis(prev => [...prev, v.imei]);
                                                                                }
                                                                            }}
                                                                            className="accent-lime-500 rounded flex-shrink-0"
                                                                        />
                                                                        <span className="truncate">{v.deviceName || v.vehicleName || v.imei}</span>
                                                                    </div>
                                                                    <span className="text-[10px] text-[var(--text-dim)] font-mono ml-1 flex-shrink-0">
                                                                        {v.imei.slice(-5)}
                                                                    </span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <button
                                        onClick={() => setIsDeviceDropdownOpen(false)}
                                        className="w-full py-1.5 text-xs font-bold uppercase bg-lime-500 text-black rounded-lg hover:opacity-90 transition-opacity"
                                    >
                                        Done
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 2. Groups Filter */}
                        <div>
                            <label className="block text-[10px] font-black uppercase text-[var(--text-dim)] mb-1">
                                Sub-Account / Group
                            </label>
                            <select
                                value={selectedGroup}
                                onChange={(e) => setSelectedGroup(e.target.value)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-main)] bg-[var(--bg-input)] font-semibold outline-none focus:border-lime-500"
                            >
                                <option value="ALL">All Sub-Accounts</option>
                                {availableGroups.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                        </div>

                        {/* 3. Period Selector */}
                        <div>
                            <label className="block text-[10px] font-black uppercase text-[var(--text-dim)] mb-1">
                                Period
                            </label>
                            <select
                                value={period}
                                onChange={(e) => handlePeriodChange(e.target.value as PeriodPreset)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-main)] bg-[var(--bg-input)] font-semibold outline-none focus:border-lime-500"
                            >
                                <option value="today">Today</option>
                                <option value="yesterday">Yesterday</option>
                                <option value="this_week">This Week</option>
                                <option value="last_week">Last Week</option>
                                <option value="this_month">This Month</option>
                                <option value="last_month">Last Month</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>

                        {/* 4. Report Type Selector */}
                        <div>
                            <label className="block text-[10px] font-black uppercase text-[var(--text-dim)] mb-1">
                                Report Type
                            </label>
                            <select
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value as any)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-main)] bg-[var(--bg-input)] font-semibold outline-none focus:border-lime-500"
                            >
                                <option value="Summary">Summary</option>
                                <option value="Detailed">Detailed</option>
                            </select>
                        </div>

                        {/* 5. Columns Selector Popover */}
                        <div className="relative">
                            <label className="block text-[10px] font-black uppercase text-[var(--text-dim)] mb-1">
                                Columns
                            </label>
                            <button
                                type="button"
                                onClick={() => setIsColumnsDropdownOpen(!isColumnsDropdownOpen)}
                                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-main)] bg-[var(--bg-input)] flex items-center justify-between font-semibold"
                            >
                                <span className="flex items-center gap-1.5 truncate">
                                    <Columns size={14} /> Visible ({columns.filter(c => c.visible).length})
                                </span>
                                <ChevronDown size={14} className="text-[var(--text-dim)]" />
                            </button>

                            {isColumnsDropdownOpen && (
                                <div className="absolute top-full right-0 mt-1 w-56 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-2xl z-50 p-2 space-y-1">
                                    <div className="text-[10px] font-black uppercase text-[var(--text-dim)] px-2 py-1">Toggle Columns</div>
                                    {columns.map(col => (
                                        <label key={col.key as string} className="flex items-center justify-between px-2 py-1 hover:bg-[var(--sidebar-hover)] rounded cursor-pointer text-xs">
                                            <span>{col.label}</span>
                                            <input
                                                type="checkbox"
                                                checked={col.visible}
                                                onChange={() => toggleColumnVisibility(col.key)}
                                                className="accent-lime-500 rounded"
                                            />
                                        </label>
                                    ))}
                                    <button
                                        onClick={() => setIsColumnsDropdownOpen(false)}
                                        className="w-full mt-1 py-1 text-[10px] font-bold uppercase bg-lime-500 text-black rounded"
                                    >
                                        Done
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 6. Show / Generate Button */}
                        <div className="flex items-end">
                            <button
                                onClick={fetchReport}
                                disabled={loading}
                                className="w-full py-2 px-4 rounded-xl bg-lime-500 hover:bg-lime-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md"
                            >
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                                {loading ? 'Fetching...' : 'Show'}
                            </button>
                        </div>
                    </div>

                    {/* Custom Period Date Pickers (Shown if period === 'custom') */}
                    {period === 'custom' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--border-main)]/50">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-[var(--text-dim)] mb-1">
                                    From Date & Time
                                </label>
                                <input
                                    type="datetime-local"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl outline-none focus:border-lime-500 font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-[var(--text-dim)] mb-1">
                                    To Date & Time
                                </label>
                                <input
                                    type="datetime-local"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl outline-none focus:border-lime-500 font-mono"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* ---------------------------------------------------- */}
                {/* TOOLBAR FOR SEARCH & EXPORTS */}
                {/* ---------------------------------------------------- */}
                <div className="p-4 border-b border-[var(--border-main)] flex flex-col md:flex-row justify-between items-center gap-4 bg-[var(--bg-card)]">
                    {/* Global Search */}
                    <div className="relative w-full md:w-72">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                        <input
                            type="text"
                            placeholder="Search by device name, vehicle number, model, IMEI..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-9 pr-4 py-2 text-xs bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl outline-none focus:border-lime-500 transition-all"
                        />
                    </div>

                    {/* Export Buttons */}
                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        <button
                            onClick={handleExportExcel}
                            className="px-3 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                            <FileSpreadsheet size={14} /> Excel
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="px-3 py-2 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-black transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                            <FileText size={14} /> CSV
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="px-3 py-2 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-black transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                            <Download size={14} /> PDF
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-3 py-2 rounded-xl border border-[var(--border-main)] hover:bg-[var(--sidebar-hover)] text-[var(--text-main)] transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                            <Printer size={14} /> Print
                        </button>
                    </div>
                </div>

                {/* ---------------------------------------------------- */}
                {/* REPORT TABLE */}
                {/* ---------------------------------------------------- */}
                <div className="flex-1 overflow-auto relative min-h-[350px]">
                    {loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--bg-card)]/80 z-20 gap-3">
                            <div className="w-12 h-12 border-4 border-lime-500/30 border-t-lime-500 rounded-full animate-spin" />
                            <p className="text-xs font-bold uppercase tracking-wider text-lime-400">Loading Fleet Telemetry...</p>
                        </div>
                    ) : null}

                    <table className="w-full text-left border-collapse">
                        {/* Sticky Header */}
                        <thead className="sticky top-0 bg-[var(--bg-input)] z-10 border-b border-[var(--border-main)] shadow-sm">
                            <tr>
                                {columns.filter(c => c.visible).map(col => (
                                    <th
                                        key={col.key as string}
                                        onClick={() => handleSort(col.key)}
                                        className={`px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-[var(--text-dim)] hover:text-[var(--text-main)] cursor-pointer select-none border-b border-[var(--border-main)] text-${col.align || 'left'}`}
                                    >
                                        <div className={`flex items-center gap-1 justify-${col.align === 'right' ? 'end' : col.align === 'center' ? 'center' : 'start'}`}>
                                            <span>{col.label}</span>
                                            {sortField === col.key ? (
                                                sortDirection === 'asc' ? <ChevronUp size={14} className="text-lime-400" /> : <ChevronDown size={14} className="text-lime-400" />
                                            ) : (
                                                <ArrowUpDown size={12} className="opacity-30" />
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-[var(--border-main)]/50 text-xs">
                            {paginatedRows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.filter(c => c.visible).length} className="px-6 py-16 text-center text-[var(--text-dim)]">
                                        <div className="flex flex-col items-center gap-2">
                                            <Truck size={32} className="opacity-30" />
                                            <p className="font-bold text-sm">No Fleet Telemetry Records Found</p>
                                            <p className="text-xs opacity-70">Try adjusting the period, device selection, or search query.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedRows.map((row, idx) => (
                                    <tr
                                        key={row.imei || idx}
                                        className="hover:bg-[var(--sidebar-hover)] transition-colors group even:bg-white/[0.015]"
                                    >
                                        {columns.filter(c => c.visible).map(col => (
                                            <td key={col.key as string} className={`px-4 py-3 text-${col.align || 'left'}`}>
                                                {col.key === 'vehicleNumber' ? (
                                                    <span className="font-bold text-xs text-lime-400 font-mono tracking-wide">
                                                        {row.vehicleNumber && row.vehicleNumber !== 'Unassigned' && !row.vehicleNumber.toUpperCase().startsWith('DAÑADO')
                                                            ? row.vehicleNumber
                                                            : (row.deviceName && !row.deviceName.toUpperCase().startsWith('DAÑADO') && !row.deviceName.startsWith('VL802-') ? row.deviceName : '-')}
                                                    </span>
                                                ) : col.key === 'deviceName' || col.key === 'device' ? (
                                                    <span className="text-xs text-[var(--text-main)] font-semibold">
                                                        {(row.deviceName || row.device || '').toUpperCase().includes('DAÑADO') ? (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                                {row.displayName || row.deviceName || row.device}
                                                            </span>
                                                        ) : (
                                                            row.deviceName || row.device || '-'
                                                        )}
                                                    </span>
                                                ) : col.key === 'imei' ? (
                                                    <span className="font-mono text-[11px] text-[var(--text-dim)] bg-zinc-900/60 px-2 py-0.5 rounded border border-white/5 select-all">
                                                        {row.imei}
                                                    </span>
                                                ) : col.format ? (
                                                    <span className="font-medium">{col.format(row[col.key], row)}</span>
                                                ) : (
                                                    <span className="font-medium">{String(row[col.key] || '-')}</span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>

                        {/* Footer Totals Row */}
                        {reportTotals && (
                            <tfoot className="sticky bottom-0 bg-[var(--bg-input)] border-t-2 border-lime-500/50 text-xs font-black shadow-lg">
                                <tr className="bg-lime-500/5">
                                    {columns.filter(c => c.visible).map(col => {
                                        let val = '-';
                                        if (col.key === 'vehicleNumber' || col.key === 'device') val = `TOTALS (${reportTotals.totalDevices} Devices)`;
                                        else if (col.key === 'distance') val = `${reportTotals.totalDistance.toLocaleString()} km`;
                                        else if (col.key === 'fuelConsumed') val = `${reportTotals.totalFuel} L`;
                                        else if (col.key === 'averageSpeed') val = `${reportTotals.averageSpeed} km/h`;
                                        else if (col.key === 'engineHoursFormatted') val = reportTotals.totalEngineHoursFormatted;

                                        return (
                                            <td key={col.key as string} className={`px-4 py-3 text-${col.align || 'left'} text-lime-400`}>
                                                {val}
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                {/* ---------------------------------------------------- */}
                {/* PAGINATION FOOTER */}
                {/* ---------------------------------------------------- */}
                <div className="px-6 py-3 border-t border-[var(--border-main)] bg-[var(--bg-card)] flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
                    <div className="flex items-center gap-2 text-[var(--text-dim)] font-medium">
                        <span>Show:</span>
                        <select
                            value={rowsPerPage}
                            onChange={(e) => {
                                setRowsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="px-2 py-1 rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] text-xs font-bold outline-none"
                        >
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                            <option value={250}>250</option>
                        </select>
                        <span>entries</span>
                        <span className="ml-4 text-[11px]">
                            Showing {processedRows.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, processedRows.length)} of {processedRows.length} rows
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-lg border border-[var(--border-main)] hover:bg-[var(--sidebar-hover)] disabled:opacity-40 font-bold cursor-pointer"
                        >
                            Previous
                        </button>
                        <span className="font-bold px-2">Page {currentPage} of {totalPages}</span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-lg border border-[var(--border-main)] hover:bg-[var(--sidebar-hover)] disabled:opacity-40 font-bold cursor-pointer"
                        >
                            Next
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default FleetSummaryReportModal;
