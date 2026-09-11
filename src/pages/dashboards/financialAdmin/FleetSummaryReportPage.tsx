import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Truck,
    Search,
    RefreshCw,
    Download,
    FileSpreadsheet,
    FileText,
    Printer,
    ChevronDown,
    ArrowUpDown,
    Columns,
    ArrowLeft,
    Gauge,
    Fuel,
    Clock,
    Navigation
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    getFleetSummaryReport,
    getGpsVehiclesList,
    type GpsVehicle,
    type FleetSummaryRow,
    type FleetSummaryTotals
} from '../../../services/gpsService';

// Period Preset Types
type PeriodPreset = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom';

// Column definition interface
interface ColumnConfig {
    key: keyof FleetSummaryRow;
    label: string;
    unit?: string;
    visible: boolean;
    align?: 'left' | 'center' | 'right';
    format?: (val: any, row: FleetSummaryRow) => string;
}

export const FleetSummaryReportPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Determine back link based on current path prefix
    const isExecutiveAdmin = location.pathname.includes('/admin/admin');
    const gpsVehiclesPath = isExecutiveAdmin
        ? '/admin/admin/gps-vehicles'
        : '/admin/financial-admin/gps-vehicles';

    // ----------------------------------------------------
    // Filter States
    // ----------------------------------------------------
    const [vehicles, setVehicles] = useState<GpsVehicle[]>([]);
    const [selectedImeis, setSelectedImeis] = useState<string[]>([]); // Empty = All
    const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
    const [period, setPeriod] = useState<PeriodPreset>('today');
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
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');
    const [sortField, setSortField] = useState<keyof FleetSummaryRow>('driverName');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [rowsPerPage, setRowsPerPage] = useState<number>(25);
    const [totalRecords, setTotalRecords] = useState<number>(0);
    const [totalPages, setTotalPages] = useState<number>(1);

    const abortControllerRef = useRef<AbortController | null>(null);

    // ----------------------------------------------------
    // Column Configurations
    // ----------------------------------------------------
    const [columns, setColumns] = useState<ColumnConfig[]>([
        { key: 'device', label: 'Device', visible: true, align: 'left' },
        { key: 'vehicleNumber', label: 'Vehicle Number', visible: true, align: 'left', format: (val) => val || 'N/A' },
        { key: 'driverName', label: 'Driver Name', visible: true, align: 'left', format: (val) => val || 'Unassigned' },
        { key: 'driverStatus', label: 'Driver Status', visible: true, align: 'center' },
        { key: 'distance', label: 'Distance', unit: 'km', visible: true, align: 'right', format: (val) => `${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km` },
        { key: 'maxSpeed', label: 'Maximum Speed', unit: 'km/h', visible: true, align: 'center', format: (val) => `${val || 0} km/h` },
        { key: 'engineHoursFormatted', label: 'Engine Hours', unit: 'Hours', visible: true, align: 'center' },
        { key: 'fuelConsumed', label: 'Fuel Consumed', unit: 'L', visible: true, align: 'right', format: (val) => `${Number(val || 0).toFixed(1)} L` },
        { key: 'startDate', label: 'Start Date', visible: true, align: 'center' },
        { key: 'odometerStart', label: 'Odometer Start', unit: 'km', visible: true, align: 'right', format: (val) => `${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km` },
        { key: 'odometerEnd', label: 'Odometer End', unit: 'km', visible: true, align: 'right', format: (val) => `${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km` },
        { key: 'averageSpeed', label: 'Average Speed', unit: 'km/h', visible: true, align: 'center', format: (val) => `${Number(val || 0).toFixed(2)} km/h` },
    ]);

    // Format date string helpers
    const formatDateForInput = (d: Date): string => {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const formatToApiDateTime = (val: string | Date | undefined, isEnd = false): string | undefined => {
        if (!val) return undefined;
        if (typeof val === 'string') {
            const trimmed = val.trim();
            if (!trimmed) return undefined;
            if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
                return trimmed;
            }
            if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                return isEnd ? `${trimmed} 23:59:59` : `${trimmed} 00:00:00`;
            }
            if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(trimmed)) {
                return `${trimmed}:00`;
            }
            if (trimmed.includes('T')) {
                const [datePart, timePart] = trimmed.split('T');
                if (!timePart) return isEnd ? `${datePart} 23:59:59` : `${datePart} 00:00:00`;
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
            case 'custom':
                return;
        }

        setStartTime(formatDateForInput(start));
        setEndTime(formatDateForInput(end));
    };

    // Load Vehicles list on page load
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const vList = await getGpsVehiclesList();
                setVehicles(vList || []);
            } catch (err) {
                console.warn("Failed to load vehicle list for fleet report:", err);
            }
        };
        applyPeriodDates('today');
        loadInitialData();
    }, []);

    // Debounce search query input (350ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 350);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Handle period dropdown change
    const handlePeriodChange = (newPeriod: PeriodPreset) => {
        setPeriod(newPeriod);
        if (newPeriod !== 'custom') {
            applyPeriodDates(newPeriod);
        }
    };

    // Extract unique groups from vehicles list
    const availableGroups = useMemo(() => {
        const set = new Set<string>();
        vehicles.forEach(v => {
            if (v.deviceGroup) set.add(v.deviceGroup);
        });
        return Array.from(set);
    }, [vehicles]);

    // Filter vehicles in multi-select dropdown by search query
    const filteredDropdownVehicles = useMemo(() => {
        if (!deviceSearchQuery.trim()) return vehicles;
        const q = deviceSearchQuery.toLowerCase();
        return vehicles.filter(v =>
            (v.deviceName && v.deviceName.toLowerCase().includes(q)) ||
            (v.vehicleName && v.vehicleName.toLowerCase().includes(q)) ||
            v.imei.toLowerCase().includes(q)
        );
    }, [vehicles, deviceSearchQuery]);

    // Central Fetch Report Data from API
    const fetchReport = useCallback(async (
        targetPage = currentPage,
        targetLimit = rowsPerPage,
        targetSearch = debouncedSearch,
        targetStart = startTime,
        targetEnd = endTime,
        targetGroup = selectedGroup,
        targetImeis = selectedImeis,
        targetReportType = reportType
    ) => {
        if (!targetStart || !targetEnd) return;

        // Abort previous in-flight request to prevent race conditions
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLoading(true);
        try {
            const apiStart = formatToApiDateTime(targetStart, false);
            const apiEnd = formatToApiDateTime(targetEnd, true);
            const imeisParam = targetImeis.length > 0 ? targetImeis.join(',') : 'ALL';

            const data = await getFleetSummaryReport({
                imeis: imeisParam,
                group: targetGroup,
                startTime: apiStart,
                endTime: apiEnd,
                reportType: targetReportType,
                page: targetPage,
                limit: targetLimit,
                search: targetSearch
            }, { signal: controller.signal });

            if (data && data.summaryRows) {
                setReportRows(data.summaryRows);
                setReportTotals(data.totals);
                if (data.pagination) {
                    setTotalRecords(data.pagination.total);
                    setTotalPages(data.pagination.totalPages);
                } else {
                    setTotalRecords(data.summaryRows.length);
                    setTotalPages(Math.ceil(data.summaryRows.length / targetLimit) || 1);
                }
            } else {
                setReportRows([]);
                setReportTotals(null);
                setTotalRecords(0);
                setTotalPages(1);
            }
        } catch (err: any) {
            if (err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
                return; // Silently ignore cancelled requests
            }
            console.error("Failed to load Fleet Summary Report:", err);
            toast.error(err.message || "Failed to load Fleet Summary Report");
            setReportRows([]);
            setReportTotals(null);
            setTotalRecords(0);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }, [currentPage, rowsPerPage, debouncedSearch, startTime, endTime, selectedGroup, selectedImeis, reportType]);

    // Reset to page 1 whenever filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedImeis, selectedGroup, startTime, endTime, reportType, debouncedSearch, rowsPerPage]);

    // Trigger report fetch when page, limit, or any filter changes
    useEffect(() => {
        if (startTime && endTime) {
            fetchReport(currentPage, rowsPerPage, debouncedSearch, startTime, endTime, selectedGroup, selectedImeis, reportType);
        }
    }, [currentPage, rowsPerPage, debouncedSearch, startTime, endTime, selectedGroup, selectedImeis, reportType]);

    // Client-side sorting for current page rows
    const processedRows = useMemo(() => {
        let result = [...reportRows];

        result.sort((a, b) => {
            if (sortField === 'driverName') {
                const isUnassignedA = !a.driverName || a.driverName === 'Unassigned';
                const isUnassignedB = !b.driverName || b.driverName === 'Unassigned';
                if (isUnassignedA && !isUnassignedB) return sortDirection === 'asc' ? 1 : -1;
                if (!isUnassignedA && isUnassignedB) return sortDirection === 'asc' ? -1 : 1;
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
    }, [reportRows, sortField, sortDirection]);

    // Rendered rows for table (already paginated by backend)
    const paginatedRows = processedRows;

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

    // Fetch All Fleet Units for Export
    const fetchAllRowsForExport = async (): Promise<{ rows: FleetSummaryRow[]; totals: FleetSummaryTotals | null } | null> => {
        if (reportRows.length >= totalRecords && totalRecords > 0) {
            return { rows: reportRows, totals: reportTotals };
        }

        const apiStart = formatToApiDateTime(startTime, false);
        const apiEnd = formatToApiDateTime(endTime, true);
        const imeisParam = selectedImeis.length > 0 ? selectedImeis.join(',') : 'ALL';

        const data = await getFleetSummaryReport({
            imeis: imeisParam,
            group: selectedGroup,
            startTime: apiStart,
            endTime: apiEnd,
            reportType: reportType,
            page: 1,
            limit: totalRecords > 0 ? totalRecords : 3000,
            search: debouncedSearch
        });

        if (data && Array.isArray(data.summaryRows) && data.summaryRows.length > 0) {
            return { rows: data.summaryRows, totals: data.totals || reportTotals };
        }
        return { rows: reportRows, totals: reportTotals };
    };

    // Export Handlers
    const handleExportExcel = async () => {
        if (totalRecords === 0 && reportRows.length === 0) {
            toast.error("No data available to export.");
            return;
        }
        const toastId = toast.loading("Fetching all units and generating Excel file... (This may take a few moments/minutes for large fleets)");
        try {
            const exportResult = await fetchAllRowsForExport();
            const exportRows = exportResult?.rows || reportRows;
            const exportTotals = exportResult?.totals || reportTotals;

            if (exportRows.length === 0) {
                toast.error("No data found for export.", { id: toastId });
                return;
            }

            const visibleCols = columns.filter(c => c.visible);
            const exportData = exportRows.map(r => {
                const rowObj: Record<string, any> = {};
                visibleCols.forEach(col => {
                    rowObj[col.label] = col.format ? col.format(r[col.key], r) : r[col.key];
                });
                return rowObj;
            });

            if (exportTotals) {
                const totalsRowObj: Record<string, any> = {};
                visibleCols.forEach(col => {
                    if (col.key === 'device') totalsRowObj[col.label] = `TOTALS (${exportTotals.totalDevices} Devices)`;
                    else if (col.key === 'distance') totalsRowObj[col.label] = `${exportTotals.totalDistance} km`;
                    else if (col.key === 'fuelConsumed') totalsRowObj[col.label] = `${exportTotals.totalFuel} L`;
                    else if (col.key === 'averageSpeed') totalsRowObj[col.label] = `${exportTotals.averageSpeed} km/h`;
                    else if (col.key === 'engineHoursFormatted') totalsRowObj[col.label] = exportTotals.totalEngineHoursFormatted;
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
            toast.success(`Exported all ${exportRows.length} units to Excel successfully!`, { id: toastId });
        } catch (err: any) {
            console.error("Excel Export Error:", err);
            toast.error(err.message || "Failed to export Excel report.", { id: toastId });
        }
    };

    const handleExportCSV = async () => {
        if (totalRecords === 0 && reportRows.length === 0) {
            toast.error("No data available to export.");
            return;
        }
        const toastId = toast.loading("Fetching all units and generating CSV file... (This may take a few moments/minutes for large fleets)");
        try {
            const exportResult = await fetchAllRowsForExport();
            const exportRows = exportResult?.rows || reportRows;

            if (exportRows.length === 0) {
                toast.error("No data found for export.", { id: toastId });
                return;
            }

            const visibleCols = columns.filter(c => c.visible);
            const exportData = exportRows.map(r => {
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
            toast.success(`Exported all ${exportRows.length} units to CSV successfully!`, { id: toastId });
        } catch (err: any) {
            console.error("CSV Export Error:", err);
            toast.error(err.message || "Failed to export CSV report.", { id: toastId });
        }
    };

    const handleExportPDF = async () => {
        if (totalRecords === 0 && reportRows.length === 0) {
            toast.error("No data available to export.");
            return;
        }
        const toastId = toast.loading("Fetching all units and generating PDF report... (This may take a few moments/minutes for large fleets)");
        try {
            const exportResult = await fetchAllRowsForExport();
            const exportRows = exportResult?.rows || reportRows;
            const exportTotals = exportResult?.totals || reportTotals;

            if (exportRows.length === 0) {
                toast.error("No data found for export.", { id: toastId });
                return;
            }

            const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
            const visibleCols = columns.filter(c => c.visible);

            doc.setFontSize(18);
            doc.text("Fleet Summary Report (Tracksolid Telemetry)", 40, 40);
            doc.setFontSize(10);
            doc.text(`Generated on: ${new Date().toLocaleString()} | Period: ${period.toUpperCase()}`, 40, 58);

            const head = [visibleCols.map(c => c.label)];
            const body = exportRows.map(r =>
                visibleCols.map(col => (col.format ? col.format(r[col.key], r) : String(r[col.key] || '')))
            );

            if (exportTotals) {
                const footRow = visibleCols.map(col => {
                    if (col.key === 'device') return `TOTALS (${exportTotals.totalDevices} Devices)`;
                    if (col.key === 'distance') return `${exportTotals.totalDistance} km`;
                    if (col.key === 'fuelConsumed') return `${exportTotals.totalFuel} L`;
                    if (col.key === 'averageSpeed') return `${exportTotals.averageSpeed} km/h`;
                    if (col.key === 'engineHoursFormatted') return exportTotals.totalEngineHoursFormatted;
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
            toast.success(`Exported all ${exportRows.length} units to PDF successfully!`, { id: toastId });
        } catch (err: any) {
            console.error("PDF Export Error:", err);
            toast.error(err.message || "Failed to export PDF report.", { id: toastId });
        }
    };

    const handlePrint = async () => {
        if (totalRecords === 0 && reportRows.length === 0) {
            toast.error("No data available to print.");
            return;
        }
        const toastId = toast.loading("Preparing print view for all units... (This may take a few moments/minutes for large fleets)");
        try {
            const exportResult = await fetchAllRowsForExport();
            const exportRows = exportResult?.rows || reportRows;
            const exportTotals = exportResult?.totals || reportTotals;

            const visibleCols = columns.filter(c => c.visible);
            const printWindow = window.open('', '_blank');
            if (!printWindow) return;

            const tableHeaders = visibleCols.map(c => `<th style="padding:10px; border:1px solid #ddd; background:#f4f6f8; font-size:12px; font-weight:bold; text-align:${c.align || 'left'};">${c.label}</th>`).join('');

            const tableRows = exportRows.map(r => `
                <tr>
                    ${visibleCols.map(c => {
                const val = c.format ? c.format(r[c.key], r) : r[c.key];
                return `<td style="padding:8px; border:1px solid #eee; font-size:11px; text-align:${c.align || 'left'};">${val}</td>`;
            }).join('')}
                </tr>
            `).join('');

            const footerRow = exportTotals ? `
                <tr style="background:#eef2f7; font-weight:bold;">
                    ${visibleCols.map(c => {
                let val = '-';
                if (c.key === 'device') val = `TOTALS (${exportTotals.totalDevices} Devices)`;
                else if (c.key === 'distance') val = `${exportTotals.totalDistance} km`;
                else if (c.key === 'fuelConsumed') val = `${exportTotals.totalFuel} L`;
                else if (c.key === 'averageSpeed') val = `${exportTotals.averageSpeed} km/h`;
                else if (c.key === 'engineHoursFormatted') val = exportTotals.totalEngineHoursFormatted;
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
            toast.success("Print view ready!", { id: toastId });
        } catch (err: any) {
            console.error("Print Error:", err);
            toast.error("Failed to generate print view.", { id: toastId });
        }
    };

    return (
        <div className="p-4 md:p-6 min-h-[calc(100vh-112px)] flex flex-col text-[var(--text-main)] bg-[var(--bg-main)] space-y-6">

            {/* ---------------------------------------------------- */}
            {/* PAGE HEADER & BREADCRUMBS */}
            {/* ---------------------------------------------------- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--bg-card)] p-5 rounded-2xl border border-[var(--border-main)] shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-dim)] mb-1">
                        <button
                            onClick={() => navigate(gpsVehiclesPath)}
                            className="hover:text-lime-500 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                            <ArrowLeft size={14} /> Back to GPS Vehicles
                        </button>
                        <span>/</span>
                        <span className="text-lime-500 font-bold">Fleet Summary Report</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-500 shadow-sm">
                            <Truck size={22} />
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
                                Fleet Summary Report
                                <span className="text-[10px] font-extrabold uppercase bg-lime-500/20 text-lime-400 px-2.5 py-0.5 rounded-full border border-lime-500/30">
                                    Tracksolid Style
                                </span>
                            </h1>
                            <p className="text-xs text-[var(--text-dim)] font-medium">
                                Real-time distance aggregation, trip telemetry & fuel consumption powered by <code className="text-lime-400 font-mono text-[11px]">jimi.open.platform.report.trips</code>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-stretch md:self-auto">
                    <button
                        onClick={() => fetchReport()}
                        disabled={loading}
                        className="flex-1 md:flex-none px-4 py-2.5 bg-lime-500 hover:bg-lime-400 text-black font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                        {loading ? 'Refreshing...' : 'Refresh Data'}
                    </button>
                </div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* KPI TOTALS SUMMARY CARDS */}
            {/* ---------------------------------------------------- */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
                {/* 1. Total Distance */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:border-lime-500/30 transition-all">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                        <Navigation size={20} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] truncate">Total Distance</p>
                        <h3 className="text-lg md:text-xl font-black text-emerald-400 truncate">
                            {reportTotals ? `${reportTotals.totalDistance.toLocaleString()} km` : '0.00 km'}
                        </h3>
                    </div>
                </div>

                {/* 2. Total Fuel Consumed */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:border-lime-500/30 transition-all">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                        <Fuel size={20} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] truncate">Total Fuel</p>
                        <h3 className="text-lg md:text-xl font-black text-amber-400 truncate">
                            {reportTotals ? `${reportTotals.totalFuel.toLocaleString()} L` : '0.0 L'}
                        </h3>
                    </div>
                </div>

                {/* 3. Engine Hours */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:border-lime-500/30 transition-all">
                    <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 flex-shrink-0">
                        <Clock size={20} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] truncate">Engine Hours</p>
                        <h3 className="text-lg md:text-xl font-black text-cyan-400 truncate">
                            {reportTotals ? reportTotals.totalEngineHoursFormatted : '0 h 0 m'}
                        </h3>
                    </div>
                </div>

                {/* 4. Average Speed */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:border-lime-500/30 transition-all">
                    <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 flex-shrink-0">
                        <Gauge size={20} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] truncate">Fleet Avg Speed</p>
                        <h3 className="text-lg md:text-xl font-black text-purple-400 truncate">
                            {reportTotals ? `${reportTotals.averageSpeed} km/h` : '0.00 km/h'}
                        </h3>
                    </div>
                </div>

                {/* 5. Total Devices */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl p-4 flex items-center gap-3 shadow-sm hover:border-lime-500/30 transition-all col-span-2 sm:col-span-1">
                    <div className="w-11 h-11 rounded-xl bg-lime-500/10 border border-lime-500/20 flex items-center justify-center text-lime-400 flex-shrink-0">
                        <Truck size={20} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] truncate">Reported Devices</p>
                        <h3 className="text-lg md:text-xl font-black text-lime-400 truncate">
                            {reportTotals ? `${reportTotals.totalDevices} Units` : `${vehicles.length} Units`}
                        </h3>
                    </div>
                </div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* FILTERS TOOLBAR */}
            {/* ---------------------------------------------------- */}
            <div className="p-4 md:p-5 border border-[var(--border-main)] bg-[var(--bg-card)] rounded-2xl space-y-4 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">

                    {/* 1. Devices Multi-Select */}
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
                            <div className="absolute top-full left-0 mt-1 w-64 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl shadow-2xl z-50 p-2 space-y-2">
                                <div className="relative">
                                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                                    <input
                                        type="text"
                                        placeholder="Search device or IMEI..."
                                        value={deviceSearchQuery}
                                        onChange={(e) => setDeviceSearchQuery(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg outline-none focus:border-lime-500 text-[var(--text-main)]"
                                    />
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                                    <label className="flex items-center gap-2 px-2 py-1 hover:bg-[var(--sidebar-hover)] rounded cursor-pointer text-xs font-bold text-lime-400">
                                        <input
                                            type="checkbox"
                                            checked={selectedImeis.length === 0}
                                            onChange={() => setSelectedImeis([])}
                                            className="accent-lime-500 rounded"
                                        />
                                        Select All Devices
                                    </label>
                                    <div className="border-t border-[var(--border-main)] my-1" />
                                    {filteredDropdownVehicles.map(v => {
                                        const isSelected = selectedImeis.includes(v.imei);
                                        return (
                                            <label key={v.imei} className="flex items-center gap-2 px-2 py-1 hover:bg-[var(--sidebar-hover)] rounded cursor-pointer text-xs">
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
                                                    className="accent-lime-500 rounded"
                                                />
                                                <span className="truncate">{v.deviceName || v.vehicleName || v.imei}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => setIsDeviceDropdownOpen(false)}
                                    className="w-full py-1 text-[10px] font-bold uppercase bg-lime-500 text-black rounded hover:opacity-90"
                                >
                                    Done
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 2. Groups Filter */}
                    <div>
                        <label className="block text-[10px] font-black uppercase text-[var(--text-dim)] mb-1">
                            Groups
                        </label>
                        <select
                            value={selectedGroup}
                            onChange={(e) => setSelectedGroup(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-main)] bg-[var(--bg-input)] font-semibold outline-none focus:border-lime-500 text-[var(--text-main)]"
                        >
                            <option value="ALL">All Groups</option>
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
                            className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-main)] bg-[var(--bg-input)] font-semibold outline-none focus:border-lime-500 text-[var(--text-main)]"
                        >
                            <option value="today">Today</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="this_week">This Week</option>
                            <option value="last_week">Last Week</option>
                            <option value="this_month">This Month</option>
                            <option value="last_month">Last Month</option>
                            <option value="custom">Custom Range</option>
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
                            className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border-main)] bg-[var(--bg-input)] font-semibold outline-none focus:border-lime-500 text-[var(--text-main)]"
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
                            onClick={() => fetchReport(1, rowsPerPage, debouncedSearch, startTime, endTime, selectedGroup, selectedImeis, reportType)}
                            disabled={loading}
                            className="w-full py-2 px-4 rounded-xl bg-lime-500 hover:bg-lime-400 text-black font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md"
                        >
                            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            {loading ? 'Fetching...' : 'Show Report'}
                        </button>
                    </div>
                </div>

                {/* Custom Period Date Pickers (Shown if period === 'custom') */}
                {period === 'custom' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[var(--border-main)]/50">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-[var(--text-dim)] mb-1">
                                From Date & Time
                            </label>
                            <input
                                type="datetime-local"
                                value={startTime}
                                onChange={(e) => {
                                    setStartTime(e.target.value);
                                    setPeriod('custom');
                                }}
                                className="w-full px-3 py-2 text-xs bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl outline-none focus:border-lime-500 font-mono text-[var(--text-main)]"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-[var(--text-dim)] mb-1">
                                To Date & Time
                            </label>
                            <input
                                type="datetime-local"
                                value={endTime}
                                onChange={(e) => {
                                    setEndTime(e.target.value);
                                    setPeriod('custom');
                                }}
                                className="w-full px-3 py-2 text-xs bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl outline-none focus:border-lime-500 font-mono text-[var(--text-main)]"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* ---------------------------------------------------- */}
            {/* DATA TABLE & ACTIONS */}
            {/* ---------------------------------------------------- */}
            <div className="border border-[var(--border-main)] bg-[var(--bg-card)] rounded-2xl overflow-hidden shadow-sm flex flex-col">

                {/* Table Top Toolbar */}
                <div className="p-4 border-b border-[var(--border-main)] flex flex-col md:flex-row justify-between items-center gap-4 bg-[var(--bg-card)]">
                    {/* Global Search */}
                    <div className="relative w-full md:w-80">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-dim)]" />
                        <input
                            type="text"
                            placeholder="Search vehicle, driver, plate, IMEI..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 text-xs bg-[var(--bg-input)] border border-[var(--border-main)] rounded-xl outline-none focus:border-lime-500 text-[var(--text-main)]"
                        />
                    </div>

                    {/* Exports and Controls */}
                    <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
                        <button
                            onClick={handleExportExcel}
                            className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-all border border-emerald-500/20"
                            title="Export to Excel"
                        >
                            <FileSpreadsheet size={15} />
                            <span>Excel</span>
                        </button>
                        <button
                            onClick={handleExportCSV}
                            className="px-3 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center gap-1.5 transition-all border border-blue-500/20"
                            title="Export to CSV"
                        >
                            <Download size={15} />
                            <span>CSV</span>
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold flex items-center gap-1.5 transition-all border border-red-500/20"
                            title="Export to PDF"
                        >
                            <FileText size={15} />
                            <span>PDF</span>
                        </button>
                        <button
                            onClick={handlePrint}
                            className="px-3 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-bold flex items-center gap-1.5 transition-all border border-purple-500/20"
                            title="Print Table"
                        >
                            <Printer size={15} />
                            <span>Print</span>
                        </button>

                        <div className="h-6 w-px bg-[var(--border-main)] mx-1 hidden sm:block" />

                        {/* Rows per page */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-[var(--text-dim)] font-medium">Rows:</span>
                            <select
                                value={rowsPerPage}
                                onChange={(e) => {
                                    setRowsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="px-2 py-1.5 text-xs bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg outline-none font-semibold text-[var(--text-main)]"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table Content */}
                <div className="overflow-x-auto min-h-[350px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[var(--border-main)] bg-[var(--bg-input)] text-[var(--text-dim)] uppercase text-[10px] font-black tracking-wider">
                                {columns.filter(c => c.visible).map(col => (
                                    <th
                                        key={col.key as string}
                                        onClick={() => handleSort(col.key)}
                                        className={`px-4 py-3.5 cursor-pointer hover:text-[var(--text-main)] transition-colors select-none ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                                    >
                                        <div className={`flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                                            <span>{col.label}</span>
                                            <ArrowUpDown size={12} className={`opacity-40 ${sortField === col.key ? 'opacity-100 text-lime-400' : ''}`} />
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-[var(--border-main)]/50 text-xs">
                            {loading ? (
                                <tr>
                                    <td colSpan={columns.filter(c => c.visible).length} className="px-4 py-16 text-center text-[var(--text-dim)]">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <RefreshCw size={28} className="animate-spin text-lime-400" />
                                            <p className="font-semibold text-sm">Aggregating telemetry data from Tracksolid Pro...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedRows.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.filter(c => c.visible).length} className="px-4 py-16 text-center text-[var(--text-dim)]">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Truck size={36} className="opacity-30" />
                                            <p className="font-bold text-sm">No trip records found for this period.</p>
                                            <p className="text-xs max-w-sm">Try adjusting your date range, device selection, or group filter above.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedRows.map((row, idx) => (
                                    <tr key={`${row.imei}-${idx}`} className="hover:bg-[var(--sidebar-hover)] transition-colors">
                                        {columns.filter(c => c.visible).map(col => {
                                            const cellVal = row[col.key];

                                            if (col.key === 'device') {
                                                return (
                                                    <td key={col.key} className="px-4 py-3 font-semibold">
                                                        <div>{row.device}</div>
                                                        <div className="text-[10px] text-[var(--text-dim)] font-mono">{row.imei}</div>
                                                    </td>
                                                );
                                            }

                                            if (col.key === 'driverStatus') {
                                                const isActive = row.driverStatus === 'ACTIVE';
                                                return (
                                                    <td key={col.key} className="px-4 py-3 text-center">
                                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${isActive
                                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                            : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'}`}>
                                                            {row.driverStatus || 'UNASSIGNED'}
                                                        </span>
                                                    </td>
                                                );
                                            }

                                            if (col.key === 'distance') {
                                                return (
                                                    <td key={col.key} className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                                                        {col.format ? col.format(cellVal, row) : `${cellVal} km`}
                                                    </td>
                                                );
                                            }

                                            return (
                                                <td
                                                    key={col.key as string}
                                                    className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                                                >
                                                    {col.format ? col.format(cellVal, row) : (cellVal !== undefined && cellVal !== null ? String(cellVal) : '-')}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>

                        {/* Footer Totals Row */}
                        {reportTotals && processedRows.length > 0 && (
                            <tfoot>
                                <tr className="border-t-2 border-[var(--border-main)] bg-[var(--bg-input)] font-black text-xs text-lime-400">
                                    {columns.filter(c => c.visible).map(col => {
                                        if (col.key === 'device') {
                                            return (
                                                <td key={col.key} className="px-4 py-3.5">
                                                    TOTALS ({reportTotals.totalDevices} Devices)
                                                </td>
                                            );
                                        }
                                        if (col.key === 'distance') {
                                            return (
                                                <td key={col.key} className="px-4 py-3.5 text-right font-mono">
                                                    {reportTotals.totalDistance.toLocaleString()} km
                                                </td>
                                            );
                                        }
                                        if (col.key === 'fuelConsumed') {
                                            return (
                                                <td key={col.key} className="px-4 py-3.5 text-right font-mono">
                                                    {reportTotals.totalFuel.toLocaleString()} L
                                                </td>
                                            );
                                        }
                                        if (col.key === 'averageSpeed') {
                                            return (
                                                <td key={col.key} className="px-4 py-3.5 text-center font-mono">
                                                    {reportTotals.averageSpeed} km/h
                                                </td>
                                            );
                                        }
                                        if (col.key === 'engineHoursFormatted') {
                                            return (
                                                <td key={col.key} className="px-4 py-3.5 text-center font-mono">
                                                    {reportTotals.totalEngineHoursFormatted}
                                                </td>
                                            );
                                        }
                                        return <td key={col.key as string} className="px-4 py-3.5 text-center text-[var(--text-dim)]">-</td>;
                                    })}
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                {/* Table Pagination Footer */}
                <div className="p-4 border-t border-[var(--border-main)] flex flex-col sm:flex-row justify-between items-center gap-3 bg-[var(--bg-card)]">
                    <p className="text-xs text-[var(--text-dim)]">
                        Showing <span className="font-bold text-[var(--text-main)]">{totalRecords > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}</span> to <span className="font-bold text-[var(--text-main)]">{Math.min(currentPage * rowsPerPage, totalRecords)}</span> of <span className="font-bold text-[var(--text-main)]">{totalRecords}</span> records
                    </p>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1 || loading}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] hover:bg-[var(--sidebar-hover)] disabled:opacity-40 transition-all cursor-pointer"
                        >
                            Previous
                        </button>

                        <div className="flex items-center gap-1 px-2">
                            <span className="text-xs font-black text-lime-400">{currentPage}</span>
                            <span className="text-xs text-[var(--text-dim)]">/</span>
                            <span className="text-xs text-[var(--text-dim)]">{totalPages}</span>
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage >= totalPages || loading}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[var(--border-main)] bg-[var(--bg-input)] hover:bg-[var(--sidebar-hover)] disabled:opacity-40 transition-all cursor-pointer"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FleetSummaryReportPage;
