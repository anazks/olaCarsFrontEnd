import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AgreementList from '../../../components/agreements/AgreementList';
import AgreementHistory from '../../../components/agreements/AgreementHistory';
import type { Agreement } from '../../../services/agreementService';
import { FileText, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const ManageAgreements = () => {
    const { t } = useTranslation();
    const [selectedAgreementForHistory, setSelectedAgreementForHistory] = useState<Agreement | null>(null);
    const [stats, setStats] = useState({
        total: 0,
        published: 0,
        drafts: 0,
        loaded: false
    });

    const handleAgreementsLoaded = (agreements: Agreement[]) => {
        setStats({
            total: agreements.length,
            published: agreements.filter(a => a.status === 'PUBLISHED').length,
            drafts: agreements.filter(a => a.status === 'DRAFT').length,
            loaded: true
        });
    };

    return (
        <div className="p-6 container-responsive space-y-6 animate-in fade-in duration-500">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Manage Agreements', active: true }]} />

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg md:text-xl font-bold tracking-tight flex items-center gap-2.5" style={{ color: 'var(--text-main)' }}>
                        <ShieldCheck size={22} style={{ color: 'var(--brand-lime)' }} />
                        {t('management.agreements.title')}
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">
                        {t('management.agreements.subtitle')}
                    </p>
                </div>
            </div>

            {/* Metric & System Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Agreements */}
                <div 
                    className="p-5 rounded-2xl border transition-all duration-200 flex items-center gap-4 shadow-sm"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-3 rounded-xl bg-lime/10" style={{ color: 'var(--brand-lime)' }}>
                        <FileText size={22} />
                    </div>
                    <div>
                        <div className="text-2xl font-black" style={{ color: 'var(--text-main)' }}>
                            {stats.loaded ? stats.total : '—'}
                        </div>
                        <div className="text-xs font-semibold text-dim uppercase tracking-wider mt-0.5">
                            Total Agreements
                        </div>
                    </div>
                </div>

                {/* Published Agreements */}
                <div 
                    className="p-5 rounded-2xl border transition-all duration-200 flex items-center gap-4 shadow-sm"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-emerald-400">
                            {stats.loaded ? stats.published : '—'}
                        </div>
                        <div className="text-xs font-semibold text-dim uppercase tracking-wider mt-0.5">
                            Active & Published
                        </div>
                    </div>
                </div>

                {/* Drafts */}
                <div 
                    className="p-5 rounded-2xl border transition-all duration-200 flex items-center gap-4 shadow-sm"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
                        <Clock size={22} />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-amber-400">
                            {stats.loaded ? stats.drafts : '—'}
                        </div>
                        <div className="text-xs font-semibold text-dim uppercase tracking-wider mt-0.5">
                            Drafts / In Review
                        </div>
                    </div>
                </div>

                {/* Version Control & Audit Info */}
                <div 
                    className="p-5 rounded-2xl border transition-all duration-200 flex items-center gap-4 shadow-sm"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400">
                        <ShieldCheck size={22} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-sm font-bold truncate" style={{ color: 'var(--text-main)' }}>
                            {t('management.agreements.cards.versionControl.title')}
                        </div>
                        <p className="text-[11px] text-dim line-clamp-2 mt-0.5 leading-snug">
                            {t('management.agreements.cards.versionControl.description')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content (Agreement List) */}
            <AgreementList 
                onViewHistory={(agreement) => setSelectedAgreementForHistory(agreement)} 
                onAgreementsLoaded={handleAgreementsLoaded}
            />

            {/* History Modal */}
            {selectedAgreementForHistory && (
                <AgreementHistory 
                    agreement={selectedAgreementForHistory} 
                    onClose={() => setSelectedAgreementForHistory(null)} 
                />
            )}
        </div>
    );
};

export default ManageAgreements;
