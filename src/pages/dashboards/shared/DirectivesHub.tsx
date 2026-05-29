import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Target, ClipboardList, ArrowRight, ShieldCheck, BarChart4 } from 'lucide-react';
import { getUser } from '../../../utils/auth';

const DirectivesHub = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const user = getUser();
    const userRole = user?.role?.toLowerCase() || '';

    // Determine the base route path depending on user role
    let basePath = '/admin/admin';
    if (userRole === 'operationadmin') basePath = '/admin/operational-admin';
    if (userRole === 'financialadmin' || userRole === 'financeadmin') basePath = '/admin/financial-admin';
    if (userRole === 'countrymanager') basePath = '/admin/country-manager';
    if (userRole === 'branchmanager') basePath = '/admin/branch-manager';
    if (userRole === 'operationstaff') basePath = '/admin/branch-op-staff';
    if (userRole === 'financestaff') basePath = '/admin/branch-fin-staff';

    return (
        <div className="w-full h-full bg-[var(--bg-main)] p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10 fade-in-up">
                <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-main)] mb-1 shadow-sm">
                        <ShieldCheck size={12} className="text-lime" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-main)]">
                            {t('target.hub.badge', 'Strategy & Leadership')}
                        </span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-main)] drop-shadow-sm flex items-center gap-2">
                        <Target className="text-lime w-6 h-6" />
                        Directives & Delegation
                    </h1>
                    <p className="text-[var(--text-secondary)] text-xs max-w-2xl font-medium leading-relaxed">
                        {t('target.hub.description', 'Centralized command center for delegating qualitative tasks and setting quantitative objectives across your organization.')}
                    </p>
                </div>
            </div>

            {/* Interaction Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 relative z-10">
                
                {/* Task Management Card */}
                <div 
                    onClick={() => navigate(`${basePath}/directives/tasks`)}
                    className="group relative bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-6 sm:p-8 overflow-hidden cursor-pointer transition-all duration-300 hover:border-blue-500 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 transition-opacity duration-300 group-hover:opacity-10 text-blue-500">
                        <ClipboardList size={120} />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                            <ClipboardList className="text-blue-500" size={28} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-[var(--text-main)] group-hover:text-blue-500 transition-colors">
                                Task Management
                            </h2>
                            <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-sm">
                                Deploy qualitative directives, assign action items, and monitor the operational pulse of your teams and branches.
                            </p>
                        </div>
                        <div className="pt-4 flex items-center text-sm font-bold text-[var(--text-main)] group-hover:text-blue-500 transition-colors">
                            Manage Tasks <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </div>

                {/* Target Management Card */}
                <div 
                    onClick={() => navigate(`${basePath}/directives/targets`)}
                    className="group relative bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)] p-6 sm:p-8 overflow-hidden cursor-pointer transition-all duration-300 hover:border-lime hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-5 transition-opacity duration-300 group-hover:opacity-10 text-lime">
                        <BarChart4 size={120} />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <div className="w-14 h-14 bg-lime/10 rounded-xl flex items-center justify-center border border-lime/20">
                            <BarChart4 className="text-lime" size={28} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-bold text-[var(--text-main)] group-hover:text-lime transition-colors">
                                Target Management
                            </h2>
                            <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-sm">
                                Set quantitative objectives, track key performance indicators (KPIs), and evaluate staff or branch progress against goals.
                            </p>
                        </div>
                        <div className="pt-4 flex items-center text-sm font-bold text-[var(--text-main)] group-hover:text-lime transition-colors">
                            Manage Targets <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DirectivesHub;
