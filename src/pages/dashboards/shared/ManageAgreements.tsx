import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AgreementList from '../../../components/agreements/AgreementList';
import AgreementHistory from '../../../components/agreements/AgreementHistory';
import type { Agreement } from '../../../services/agreementService';
import { FileText, ShieldCheck, Info } from 'lucide-react';

const ManageAgreements = () => {
    const { t } = useTranslation();
    const [selectedAgreementForHistory, setSelectedAgreementForHistory] = useState<Agreement | null>(null);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                        <ShieldCheck size={36} className="text-lime" style={{ color: 'var(--brand-lime)' }} />
                        {t('management.agreements.title')}
                    </h1>
                    <p className="text-dim max-w-2xl">
                        {t('management.agreements.subtitle')}
                    </p>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl border flex items-start gap-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                        <Info size={24} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-bold text-sm text-main">{t('management.agreements.cards.versionControl.title')}</h3>
                        <p className="text-xs text-dim leading-relaxed">
                            {t('management.agreements.cards.versionControl.description')}
                        </p>
                    </div>
                </div>
                <div className="p-6 rounded-2xl border flex items-start gap-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500">
                        <FileText size={24} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-bold text-sm text-main">{t('management.agreements.cards.tiptap.title')}</h3>
                        <p className="text-xs text-dim leading-relaxed">
                            {t('management.agreements.cards.tiptap.description')}
                        </p>
                    </div>
                </div>
                <div className="p-6 rounded-2xl border flex items-start gap-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="p-3 rounded-xl bg-green-500/10 text-green-500">
                        <ShieldCheck size={24} />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-bold text-sm text-main">{t('management.agreements.cards.auditTrail.title')}</h3>
                        <p className="text-xs text-dim leading-relaxed">
                            {t('management.agreements.cards.auditTrail.description')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="rounded-3xl border p-1" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                <div className="p-6">
                    <AgreementList 
                        onViewHistory={(agreement) => setSelectedAgreementForHistory(agreement)} 
                    />
                </div>
            </div>

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
