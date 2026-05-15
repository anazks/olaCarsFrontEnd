import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BreadcrumbItem {
    label: string;
    path?: string;
    active?: boolean;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
}

const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items }) => {
    return (
        <nav className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar py-1">
            <Link 
                to="/admin" 
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
