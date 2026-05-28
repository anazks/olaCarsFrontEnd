import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getUserRole } from '../../../utils/auth';
import { API_ROLE_TO_ROUTE } from '../../../services/authService';

interface BreadcrumbItem {
    label: string;
    path?: string;
    active?: boolean;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
    const role = getUserRole();
    
    const getDashboardPath = () => {
        switch (role) {
            case 'admin': return '/admin/admin';
            case 'operationadmin': return '/admin/operational-admin';
            case 'financeadmin':
            case 'financialadmin': return '/admin/financial-admin';
            case 'countrymanager': return '/admin/country-manager';
            case 'branchmanager': return '/admin/branch-manager';
            case 'operationstaff': return '/admin/branch-op-staff';
            case 'financestaff': return '/admin/branch-fin-staff';
            case 'driver': return '/admin/driver';
            default: return '/admin';
        }
    };
    const homePath = (role && API_ROLE_TO_ROUTE[role]) || '/admin/login';

    return (
        <nav className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar py-1">
            <Link 
                to={getDashboardPath()} 
                to={homePath} 
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-dim hover:text-brand-lime transition-colors"
            >
                <Home size={12} />
            </Link>

            {items.map((item, index) => (
                <React.Fragment key={index}>
                    <ChevronRight size={10} className="text-white/10 flex-shrink-0" />
                    {item.path && !item.active ? (
                        <Link 
                            to={item.path}
                            className="text-[10px] font-black uppercase tracking-widest text-dim hover:text-brand-lime transition-colors whitespace-nowrap"
                        >
                            {item.label}
                        </Link>
                    ) : (
                        <span className={`text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${item.active ? 'text-brand-lime' : 'text-dim opacity-50'}`}>
                            {item.label}
                        </span>
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
};

export default Breadcrumbs;
