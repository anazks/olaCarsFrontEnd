import { Construction } from 'lucide-react';
import Breadcrumbs from '../../../../components/dashboard/shared/Breadcrumbs';

const VendorCredits = () => {
    return (
        <div className="container-responsive space-y-6">
            <Breadcrumbs 
                items={[
                    { label: 'Purchases', path: '#' },
                    { label: 'Vendor Credits', active: true }
                ]} 
            />
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <Construction size={20} className="text-brand-lime" />
                        Vendor Credits
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">Track and apply supplier credit balance</p>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
                <Construction size={32} className="text-dim mb-3 opacity-40" />
                <p className="text-xs font-black uppercase tracking-widest text-dim opacity-60">Module Under Construction</p>
                <p className="text-[11px] text-dim mt-1 opacity-40">We are currently implementing full functionality for Vendor Credits.</p>
            </div>
        </div>
    );
};

export default VendorCredits;
