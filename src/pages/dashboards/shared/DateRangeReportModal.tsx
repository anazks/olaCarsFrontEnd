import React, { useState, useEffect } from 'react';
import { X, Calendar, Download, AlertCircle } from 'lucide-react';

interface DateRangeReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDownload: (startDate: string, endDate: string) => Promise<void>;
    title: string;
}

const DateRangeReportModal: React.FC<DateRangeReportModalProps> = ({
    isOpen,
    onClose,
    onDownload,
    title
}) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setStartDate('');
            setEndDate('');
            setError(null);
            setLoading(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!startDate || !endDate) {
            setError('Please select both start and end dates.');
            return;
        }
        if (endDate < startDate) {
            setError('End date cannot be earlier than start date.');
            return;
        }

        setError(null);
        setLoading(true);
        try {
            await onDownload(startDate, endDate);
            onClose();
        } catch (err: any) {
            console.error('Error downloading report:', err);
            setError(err.response?.data?.message || err.message || 'Failed to download report. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-brand-lime/10 text-brand-lime">
                            <Calendar size={24} />
                        </div>
                        <h3 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>
                            Generate {title}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                        style={{ color: 'var(--text-dim)' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                        Select the date range to generate and download the report in Excel format.
                    </p>

                    {error && (
                        <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                            <AlertCircle size={14} className="flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-dim">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => {
                                    setStartDate(e.target.value);
                                    setError(null);
                                }}
                                className="w-full px-3 py-2 rounded-xl outline-none text-xs border focus:border-brand-lime/30"
                                style={{
                                    background: 'var(--bg-input)',
                                    borderColor: 'var(--border-main)',
                                    color: 'var(--text-main)'
                                }}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-dim">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => {
                                    setEndDate(e.target.value);
                                    setError(null);
                                }}
                                className="w-full px-3 py-2 rounded-xl outline-none text-xs border focus:border-brand-lime/30"
                                style={{
                                    background: 'var(--bg-input)',
                                    borderColor: 'var(--border-main)',
                                    color: 'var(--text-main)'
                                }}
                                min={startDate}
                                required
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 mt-8">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all hover:bg-white/5"
                            style={{ border: '1px solid var(--border-main)', color: 'var(--text-dim)' }}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                            style={{
                                background: 'var(--brand-lime)',
                                color: '#0A0A0A',
                                opacity: loading ? 0.5 : 1
                            }}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Download size={14} />
                                    Download Report
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DateRangeReportModal;
