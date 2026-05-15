import { Construction } from 'lucide-react';
import Breadcrumbs from '../../../../components/dashboard/shared/Breadcrumbs';

const Customers = () => {
    return (
        <div className="container-responsive space-y-6">
            <Breadcrumbs 
                items={[
                    { label: 'Sales', path: '#' },
                    { label: 'ustomers', active: true }
                ]} 
            />
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <Construction size={48} className="text-brand-lime mb-4" />
                <h2 className="text-xl font-bold text-[var(--text-main)]">ustomers Module</h2>
                <p className="text-sm text-dim mt-2">This page is currently under construction.</p>
            </div>
        </div>
    );
};

export default Customers;
