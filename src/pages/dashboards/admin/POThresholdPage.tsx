import { useState, useEffect, useCallback } from 'react';
import { DollarSign, Save, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import systemSettingsService from '../../../services/systemSettingsService';

const POThresholdPage = () => {
    const { t } = useTranslation();
    const [threshold, setThreshold] = useState<number | string>('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const fetchThreshold = useCallback(async () => {
        setLoading(true);
        setError(null);
        setSuccess(false);
        try {
            const value = await systemSettingsService.getPOThreshold();
            setThreshold(value);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || t('management.threshold.loadingFailed') || 'Failed to fetch threshold');
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchThreshold();
    }, [fetchThreshold]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            const numValue = Number(threshold);
            if (isNaN(numValue) || numValue < 0) {
                throw new Error('Please enter a valid positive number');
            }
            await systemSettingsService.updatePOThreshold(numValue);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || t('management.common.operationFailed'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3 transition-colors" style={{ color: 'var(--text-main)' }}>
                        <DollarSign size={28} style={{ color: 'var(--brand-lime)' }} />
                        {t('management.threshold.title')}
                    </h1>
                    <p className="text-sm mt-1 transition-colors" style={{ color: 'var(--text-dim)' }}>
                        {t('management.threshold.subtitle')}
                    </p>
                </div>
                <button
                    onClick={fetchThreshold}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer disabled:opacity-50"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-dim)' }}
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> {t('common.refresh')}
                </button>
            </div>

            {/* Main Card */}
            <div className="rounded-2xl p-8 transition-colors shadow-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)' }}>
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--brand-lime)', borderTopColor: 'transparent' }} />
                        <p className="text-sm animate-pulse" style={{ color: 'var(--text-dim)' }}>{t('management.threshold.loading')}</p>
                    </div>
                ) : (
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold transition-colors" style={{ color: 'var(--text-main)' }}>
                                {t('management.threshold.label')}
                            </label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors group-focus-within:text-lime" style={{ color: 'var(--text-dim)' }}>
                                    <span className="font-bold text-lg">$</span>
                                </div>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={threshold}
                                    onChange={(e) => setThreshold(e.target.value)}
                                    placeholder="e.g. 1000"
                                    className="w-full pl-10 pr-4 py-4 rounded-xl outline-none text-xl font-bold transition-all focus:ring-2 focus:ring-lime"
                                    style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <p className="text-xs transition-colors" style={{ color: 'var(--text-dim)' }}>
                                {t('management.threshold.helperText')}
                            </p>
                        </div>

                        {error && (
                            <div className="flex items-center gap-3 p-4 rounded-xl text-sm transition-colors animate-in slide-in-from-top-2" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                                <AlertTriangle size={18} /> {error}
                            </div>
                        )}

                        {success && (
                            <div className="flex items-center gap-3 p-4 rounded-xl text-sm transition-colors animate-in slide-in-from-top-2" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e' }}>
                                <CheckCircle2 size={18} /> {t('management.threshold.success')}
                            </div>
                        )}

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-bold transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-60 disabled:transform-none"
                                style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}
                            >
                                {saving ? (
                                    <RefreshCw size={20} className="animate-spin" />
                                ) : (
                                    <Save size={20} />
                                )}
                                {saving ? t('management.threshold.saving') : t('management.threshold.saveBtn')}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Info Section */}
            <div className="p-6 rounded-2xl transition-colors" style={{ background: 'rgba(200,230,0,0.03)', border: '1px border-dashed var(--border-main)' }}>
                <h3 className="text-sm font-bold flex items-center gap-2 mb-2" style={{ color: 'var(--text-main)' }}>
                    <AlertTriangle size={16} style={{ color: 'var(--brand-lime)' }} />
                    {t('management.threshold.noteTitle')}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                    {t('management.threshold.noteText')}
                </p>
            </div>
        </div>
    );
};

export default POThresholdPage;
