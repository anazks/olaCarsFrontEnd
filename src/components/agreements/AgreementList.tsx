import { formatDate } from '../../utils/dateUtils';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    FileText, 
    Edit, 
    History, 
    Plus, 
    Search, 
    Globe, 
    Download, 
    ChevronDown, 
    RefreshCw, 
    FileSpreadsheet, 
    X 
} from 'lucide-react';
import agreementService from '../../services/agreementService';
import type { Agreement } from '../../services/agreementService';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

interface AgreementListProps {
    onViewHistory: (agreement: Agreement) => void;
    onAgreementsLoaded?: (agreements: Agreement[]) => void;
}

const AgreementList = ({ onViewHistory, onAgreementsLoaded }: AgreementListProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [agreements, setAgreements] = useState<Agreement[]>([]);
    const [loading, setLoading] = useState(true);
    const [countryFilter, setCountryFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const handleExportExcel = () => {
        if (filteredAgreements.length === 0) {
            toast.error("No agreements available to export.");
            return;
        }
        const toastId = toast.loading("Generating Excel file...");
        try {
            const exportData = filteredAgreements.map((a, idx) => ({
                "Sl No.": String(idx + 1).padStart(2, '0'),
                "Title": a.title || 'N/A',
                "Country": a.country || 'N/A',
                "Type": a.type || 'N/A',
                "Version": a.version || 0,
                "Status": a.status || 'N/A',
                "Last Updated": a.updatedAt ? formatDate(a.updatedAt) : 'N/A'
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Agreements");

            const keys = Object.keys(exportData[0]);
            ws["!cols"] = keys.map(key => {
                const maxLen = Math.max(
                    key.length,
                    ...exportData.map(row => String((row as any)[key] || "").length)
                );
                return { wch: maxLen + 2 };
            });

            const dateStr = new Date().toISOString().split('T')[0];
            XLSX.writeFile(wb, `agreements_export_${dateStr}.xlsx`);
            toast.success("Excel file downloaded successfully!", { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export Excel file.", { id: toastId });
        }
    };

    const handleExportCsv = () => {
        if (filteredAgreements.length === 0) {
            toast.error("No agreements available to export.");
            return;
        }
        const toastId = toast.loading("Generating CSV file...");
        try {
            const exportData = filteredAgreements.map((a, idx) => ({
                "Sl No.": String(idx + 1).padStart(2, '0'),
                "Title": a.title || 'N/A',
                "Country": a.country || 'N/A',
                "Type": a.type || 'N/A',
                "Version": a.version || 0,
                "Status": a.status || 'N/A',
                "Last Updated": a.updatedAt ? formatDate(a.updatedAt) : 'N/A'
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const csvContent = XLSX.utils.sheet_to_csv(ws);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.setAttribute("href", url);
            const dateStr = new Date().toISOString().split('T')[0];
            link.setAttribute("download", `agreements_export_${dateStr}.csv`);
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
        if (filteredAgreements.length === 0) {
            toast.error("No agreements available to export.");
            return;
        }
        const toastId = toast.loading("Generating PDF file...");
        try {
            const doc = new jsPDF();
            const dateStr = new Date().toISOString().split('T')[0];
            const title = "Agreements Report";

            doc.setFontSize(18);
            doc.text(title, 14, 22);
            doc.setFontSize(10);
            doc.text(`Generated on: ${formatDate(new Date())}`, 14, 29);

            const head = [["Sl No.", "Title", "Country", "Type", "Version", "Status", "Last Updated"]];
            const body = filteredAgreements.map((a, idx) => [
                String(idx + 1).padStart(2, '0'),
                a.title || 'N/A',
                a.country || 'N/A',
                a.type || 'N/A',
                String(a.version || 0),
                a.status || 'N/A',
                a.updatedAt ? formatDate(a.updatedAt) : 'N/A'
            ]);

            autoTable(doc, {
                head,
                body,
                startY: 34,
                theme: 'striped',
                headStyles: { fillColor: [200, 230, 0], textColor: [0, 0, 0] }
            });

            doc.save(`agreements_export_${dateStr}.pdf`);
            toast.success("PDF file downloaded successfully!", { id: toastId });
        } catch (err) {
            console.error(err);
            toast.error("Failed to export PDF file.", { id: toastId });
        }
    };

    const fetchAgreements = async () => {
        setLoading(true);
        try {
            const data = await agreementService.getAgreements({ country: countryFilter || undefined });
            setAgreements(data);
            onAgreementsLoaded?.(data);
        } catch (error) {
            console.error('Failed to fetch agreements:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = async (agreement: Agreement) => {
        const toastId = toast.loading(t('management.agreements.list.toast.generating'));
        try {
            const doc = new jsPDF({
                unit: 'pt',
                format: 'a4',
                orientation: 'portrait'
            });

            // Create a temporary container for rendering
            const container = document.createElement('div');
            container.style.width = '550pt'; // A4 width minus padding
            container.style.padding = '40pt';
            container.style.color = '#111';
            container.style.fontFamily = 'serif';
            container.style.lineHeight = '1.6';

            container.innerHTML = `
                <div style="border-bottom: 2pt solid #A3E635; padding-bottom: 10pt; margin-bottom: 20pt;">
                    <h1 style="font-size: 24pt; margin: 0; color: #111;">${agreement.title}</h1>
                    <p style="font-size: 10pt; color: #666; margin: 5pt 0 0 0;">
                        Country: ${agreement.country} | Version: ${agreement.version} | Date: ${formatDate(new Date())}
                    </p>
                </div>
                <div style="font-size: 11pt; color: #333;">
                    ${agreement.content}
                </div>
                <div style="margin-top: 40pt; padding-top: 10pt; border-top: 0.5pt solid #eee; font-size: 8pt; color: #999; text-align: center;">
                    Generated by Ola Cars Legal Management System
                </div>
            `;

            // Inject styles to handle common TipTap tags
            const style = document.createElement('style');
            style.innerHTML = `
                h1, h2, h3 { font-family: sans-serif; margin-top: 1.5em; margin-bottom: 0.5em; color: #111; }
                p { margin-bottom: 1em; }
                ul, ol { margin-bottom: 1em; padding-left: 2em; }
                li { margin-bottom: 0.5em; }
                blockquote { border-left: 3pt solid #A3E635; padding-left: 10pt; font-style: italic; color: #555; margin: 1em 0; }
                a { color: #A3E635; text-decoration: underline; }
                table { width: 100%; border-collapse: collapse; margin: 1em 0; }
                th, td { border: 1pt solid #eee; padding: 8pt; text-align: left; }
                th { background: #f9f9f9; }
                .has-text-align-left { text-align: left; }
                .has-text-align-center { text-align: center; }
                .has-text-align-right { text-align: right; }
                .has-text-align-justify { text-align: justify; }
                img { max-width: 100%; height: auto; display: block; margin: 10pt auto; border-radius: 4pt; }
            `;
            container.appendChild(style);
            document.body.appendChild(container);

            await doc.html(container, {
                x: 20,
                y: 20,
                width: 550,
                windowWidth: 800
            });

            doc.save(`${agreement.title.replace(/\s+/g, '_')}_v${agreement.version}.pdf`);
            toast.success(t('management.agreements.list.toast.success'), { id: toastId });
        } catch (error) {
            console.error('PDF generation failed:', error);
            toast.error(t('management.agreements.list.toast.failed'), { id: toastId });
        } finally {
            const container = document.querySelector('div[style*="550pt"]');
            if (container) document.body.removeChild(container);
        }
    };

    useEffect(() => {
        fetchAgreements();
    }, [countryFilter]);

    const filteredAgreements = agreements.filter(a =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'PUBLISHED':
                return {
                    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    dot: 'bg-emerald-400'
                };
            case 'DRAFT':
                return {
                    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    dot: 'bg-amber-400'
                };
            case 'ARCHIVED':
                return {
                    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                    dot: 'bg-rose-400'
                };
            default:
                return {
                    badge: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
                    dot: 'bg-gray-400'
                };
        }
    };

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
                {/* Search & Country Filter */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-2xl">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim pointer-events-none" size={16} />
                        <input
                            type="text"
                            placeholder={t('management.agreements.list.searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-9 py-2.5 rounded-xl border text-xs sm:text-sm outline-none focus:ring-2 focus:ring-lime transition-all"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-main p-0.5 rounded transition-colors"
                                title="Clear search"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Country Filter */}
                    <div className="relative min-w-[170px]">
                        <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim pointer-events-none" size={15} />
                        <select
                            value={countryFilter}
                            onChange={(e) => setCountryFilter(e.target.value)}
                            className="w-full pl-10 pr-9 py-2.5 rounded-xl border text-xs sm:text-sm outline-none focus:ring-2 focus:ring-lime transition-all appearance-none cursor-pointer"
                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        >
                            <option value="">{t('management.common.allCountries')}</option>
                            <option value="US">USA</option>
                            <option value="IN">India</option>
                            <option value="KE">Kenya</option>
                            <option value="NG">Nigeria</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-dim pointer-events-none" size={14} />
                    </div>
                </div>

                {/* Export Buttons, Refresh, and Create Agreement Button */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Export Segmented Control */}
                    <div className="flex items-center gap-1 p-1 rounded-xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <button
                            onClick={handleExportExcel}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-white/5 active:scale-95 cursor-pointer"
                            style={{ color: 'var(--text-main)' }}
                            title="Export to Excel"
                        >
                            <FileSpreadsheet size={14} className="text-emerald-500" />
                            <span>Excel</span>
                        </button>
                        <div className="w-px h-3.5 bg-white/10" />
                        <button
                            onClick={handleExportCsv}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-white/5 active:scale-95 cursor-pointer"
                            style={{ color: 'var(--text-main)' }}
                            title="Export to CSV"
                        >
                            <FileText size={14} className="text-sky-400" />
                            <span>CSV</span>
                        </button>
                        <div className="w-px h-3.5 bg-white/10" />
                        <button
                            onClick={handleExportPdf}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-white/5 active:scale-95 cursor-pointer"
                            style={{ color: 'var(--text-main)' }}
                            title="Export to PDF"
                        >
                            <FileText size={14} className="text-rose-500" />
                            <span>PDF</span>
                        </button>
                    </div>

                    {/* Refresh */}
                    <button
                        onClick={fetchAgreements}
                        disabled={loading}
                        className="flex items-center justify-center p-2.5 rounded-xl border transition-all hover:bg-white/5 active:scale-95 text-dim hover:text-main disabled:opacity-50 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                        title={t('common.refresh', { defaultValue: 'Refresh' })}
                    >
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    </button>

                    {/* Create Agreement */}
                    <button
                        onClick={() => navigate('new')}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all hover:opacity-90 active:scale-95 shadow-sm whitespace-nowrap cursor-pointer"
                        style={{ background: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                    >
                        <Plus size={16} />
                        <span>{t('management.agreements.list.createBtn')}</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-2xl border overflow-hidden shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.02)' }}>
                                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-dim">{t('management.agreements.list.table.title')}</th>
                                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-dim">{t('management.agreements.list.table.country')}</th>
                                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-dim">{t('management.agreements.list.table.type')}</th>
                                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-dim">{t('management.agreements.list.table.version')}</th>
                                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-dim">{t('management.agreements.list.table.status')}</th>
                                <th className="px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-dim">{t('management.agreements.list.table.lastUpdated')}</th>
                                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-dim text-right">{t('management.common.table.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5" style={{ borderColor: 'var(--border-main)' }}>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={7} className="px-6 py-4">
                                            <div className="h-6 bg-white/5 rounded-lg w-full"></div>
                                        </td>
                                    </tr>
                                ))
                            ) : filteredAgreements.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                                            <div className="p-3 rounded-full bg-white/5 text-dim border border-white/5">
                                                <FileText size={26} className="opacity-40" />
                                            </div>
                                            <p className="text-sm font-medium text-dim">
                                                {searchQuery || countryFilter 
                                                    ? t('management.agreements.list.noAgreements') 
                                                    : 'No agreements created yet.'}
                                            </p>
                                            {(searchQuery || countryFilter) && (
                                                <button
                                                    onClick={() => { setSearchQuery(''); setCountryFilter(''); }}
                                                    className="text-xs font-semibold hover:underline cursor-pointer"
                                                    style={{ color: 'var(--brand-lime)' }}
                                                >
                                                    Clear filters
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredAgreements.map((agreement) => {
                                    const statusConfig = getStatusConfig(agreement.status);
                                    return (
                                        <tr key={agreement._id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 rounded-xl bg-lime/10 text-lime shrink-0">
                                                        <FileText size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span 
                                                            onClick={() => navigate(`edit/${agreement._id}`)}
                                                            className="font-semibold text-sm text-main hover:underline cursor-pointer block truncate"
                                                        >
                                                            {agreement.title}
                                                        </span>
                                                        <span className="text-[11px] text-dim block mt-0.5">
                                                            Created by {agreement.createdBy || 'System'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-1.5 text-xs font-medium text-main">
                                                    <Globe size={13} className="text-dim" />
                                                    <span>{agreement.country || 'Global'}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="text-[10px] font-bold px-2 py-1 rounded bg-white/5 text-dim border border-white/10 uppercase tracking-wide">
                                                    {agreement.type.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="inline-flex items-center text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-lime/10 text-lime border border-lime/20">
                                                    v{agreement.version}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${statusConfig.badge}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                                                    {t(`management.agreements.statusLabels.${agreement.status}`, { defaultValue: agreement.status })}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-xs text-dim whitespace-nowrap">
                                                {formatDate(agreement.updatedAt || agreement.createdAt)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => navigate(`edit/${agreement._id}`)}
                                                        className="p-2 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/5 text-dim hover:text-main transition-all cursor-pointer"
                                                        title={t('management.agreements.list.actions.edit')}
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadPDF(agreement)}
                                                        className="p-2 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/5 text-dim hover:text-main transition-all cursor-pointer"
                                                        title={t('management.agreements.list.actions.download')}
                                                    >
                                                        <Download size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => onViewHistory(agreement)}
                                                        className="p-2 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/5 text-dim hover:text-main transition-all cursor-pointer"
                                                        title={t('management.agreements.list.actions.history')}
                                                    >
                                                        <History size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AgreementList;
