import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { History, X, User, Shield, FileText } from 'lucide-react';
import agreementService from '../../services/agreementService';
import type { Agreement, AgreementVersion } from '../../services/agreementService';

interface AgreementHistoryProps {
    agreement: Agreement;
    onClose: () => void;
}

const AgreementHistory = ({ agreement, onClose }: AgreementHistoryProps) => {
    const { t } = useTranslation();
    const [history, setHistory] = useState<AgreementVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVersion, setSelectedVersion] = useState<AgreementVersion | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const data = await agreementService.getAgreementHistory(agreement._id);
                setHistory(data);
                if (data.length > 0) {
                    setSelectedVersion(data[0]);
                }
            } catch (error) {
                console.error('Failed to fetch agreement history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [agreement._id]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="w-full max-w-6xl h-full max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300" 
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.02)' }}>
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-lime/10 text-lime">
                            <History size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-main">{t('management.agreements.history.title')}</h2>
                            <p className="text-sm text-dim">{agreement.title} ({agreement.country})</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-3 rounded-xl hover:bg-white/5 text-dim transition-all"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Version List */}
                    <div className="w-80 border-r flex flex-col overflow-y-auto" style={{ borderColor: 'var(--border-main)' }}>
                        {loading ? (
                            <div className="p-4 space-y-4">
                                {Array(4).fill(0).map((_, i) => (
                                    <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse"></div>
                                ))}
                            </div>
                        ) : history.length === 0 ? (
                            <div className="p-8 text-center text-dim text-sm italic">
                                {t('management.agreements.history.noVersions')}
                            </div>
                        ) : (
                            <div className="p-4 space-y-2">
                                {history.map((version) => (
                                    <button
                                        key={version._id}
                                        onClick={() => setSelectedVersion(version)}
                                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                                            selectedVersion?._id === version._id 
                                                ? 'bg-lime/10 border-lime/30 text-lime' 
                                                : 'border-transparent hover:bg-white/5 text-dim hover:text-main'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-black/20">
                                                v{version.version}
                                            </span>
                                            <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">
                                                {new Date(version.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-xs">
                                                <User size={12} className="opacity-50" />
                                                <span className="truncate">{version.updatedBy}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] opacity-70">
                                                <Shield size={10} />
                                                {version.updaterRole}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Content Preview */}
                    <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        {selectedVersion ? (
                            <div className="max-w-3xl mx-auto space-y-8">
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                                    <div className="flex items-center gap-4 text-sm">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold text-dim tracking-wider">{t('management.agreements.history.version')}</span>
                                            <span className="font-bold text-main">{t('management.agreements.history.info', { version: selectedVersion.version })}</span>
                                        </div>
                                        <div className="w-px h-8 bg-white/10 mx-2" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold text-dim tracking-wider">{t('management.agreements.history.createdBy')}</span>
                                            <span className="font-medium text-main">{selectedVersion.updatedBy} ({selectedVersion.updaterRole})</span>
                                        </div>
                                        <div className="w-px h-8 bg-white/10 mx-2" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-bold text-dim tracking-wider">{t('management.agreements.history.date')}</span>
                                            <span className="font-medium text-main">{new Date(selectedVersion.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-lime text-black font-bold text-xs uppercase tracking-wider">
                                        {t(`management.agreements.statusLabels.${selectedVersion.status}`)}
                                    </div>
                                </div>

                                <div className="prose prose-invert max-w-none text-main/90 agreement-content-preview border-t pt-8" style={{ borderColor: 'var(--border-main)' }}>
                                    <h1 className="text-3xl font-bold mb-6">{selectedVersion.title}</h1>
                                    <div dangerouslySetInnerHTML={{ __html: selectedVersion.content }} />
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-dim gap-4">
                                <FileText size={48} className="opacity-10" />
                                <p>{t('management.agreements.history.previewPlaceholder')}</p>
                            </div>
                        )}
                    </div>
                </div>

                <style dangerouslySetInnerHTML={{ __html: `
                    .agreement-content-preview h1 { font-size: 2em; font-weight: bold; margin-bottom: 0.5em; color: var(--text-main); }
                    .agreement-content-preview h2 { font-size: 1.5em; font-weight: bold; margin-bottom: 0.5em; color: var(--text-main); }
                    .agreement-content-preview h3 { font-size: 1.25em; font-weight: bold; margin-bottom: 0.5em; color: var(--text-main); }
                    .agreement-content-preview ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1em; }
                    .agreement-content-preview ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1em; }
                    .agreement-content-preview blockquote { border-left: 4px solid var(--brand-lime); padding-left: 1em; font-style: italic; margin-bottom: 1em; color: var(--text-dim); }
                    .agreement-content-preview a { color: var(--brand-lime); text-decoration: underline; }
                `}} />
            </div>
        </div>
    );
};

export default AgreementHistory;
