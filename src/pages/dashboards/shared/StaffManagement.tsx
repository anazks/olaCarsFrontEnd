import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
    Users, 
    Shield, 
    DollarSign, 
    Globe, 
    UserCheck, 
    ShieldCheck, 
    UserCog, 
    Wrench, 
    Target, 
    ClipboardList, 
    BarChart3,
    ArrowRight
} from 'lucide-react';
import HasPermission from '../../../components/HasPermission';
import { getUserRole, hasPermission, ROLE_LEVELS } from '../../../utils/auth';

const StaffManagement = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const userRole = getUserRole();

    // Determine base path based on role
    const getBasePath = () => {
        switch (userRole) {
            case 'admin': return '/admin/admin';
            case 'operationadmin': return '/admin/operational-admin';
            case 'financialadmin':
            case 'financeadmin': return '/admin/financial-admin';
            case 'countrymanager': return '/admin/country-manager';
            case 'branchmanager': return '/admin/branch-manager';
            default: return '/admin/admin';
        }
    };

    const basePath = getBasePath();

    const managementItems = [
        { 
            icon: <Shield size={24} />, 
            label: t('sidebar.items.operationalAdmins', 'Operational Admins'), 
            path: `${basePath}/manage-operational-admins`, 
            permission: 'STAFF_VIEW',
            minRoleLevel: 5,
            description: 'Manage high-level operational administrators and their access.'
        },
        { 
            icon: <DollarSign size={24} />, 
            label: t('sidebar.items.financialAdmins', 'Financial Admins'), 
            path: `${basePath}/manage-financial-admins`, 
            permission: 'STAFF_VIEW',
            minRoleLevel: 5,
            description: 'Manage financial administrators responsible for accounting and audits.'
        },
        { 
            icon: <Globe size={24} />, 
            label: t('sidebar.items.countryManagers', 'Country Managers'), 
            path: `${basePath}/manage-country-managers`, 
            permission: 'STAFF_VIEW',
            minRoleLevel: 4,
            description: 'Regional management and country-wide operational oversight.'
        },
        { 
            icon: <UserCheck size={24} />, 
            label: t('sidebar.items.branchManagers', 'Branch Managers'), 
            path: `${basePath}/manage-branch-managers`, 
            permission: 'STAFF_VIEW',
            minRoleLevel: 3,
            description: 'Local branch supervisors and facility managers.'
        },
        { 
            icon: <ShieldCheck size={24} />, 
            label: t('sidebar.items.financeStaff', 'Finance Staff'), 
            path: `${basePath}/manage-finance-staff`, 
            permission: 'STAFF_VIEW',
            minRoleLevel: 2,
            description: 'Branch-level accounting and financial operations staff.'
        },
        { 
            icon: <ShieldCheck size={24} />, 
            label: t('sidebar.items.groundOpsStaff', 'Ground Ops Staff'), 
            path: `${basePath}/manage-operation-staff`, 
            permission: 'STAFF_VIEW',
            minRoleLevel: 2,
            description: 'Day-to-sync field operations and ground support team.'
        },
        { 
            icon: <UserCog size={24} />, 
            label: t('sidebar.items.workshopManagers', 'Workshop Managers'), 
            path: `${basePath}/manage-workshop-managers`, 
            permission: 'STAFF_VIEW',
            minRoleLevel: 2,
            description: 'Maintenance facility supervisors and technical leads.'
        },
        { 
            icon: <Wrench size={24} />, 
            label: t('sidebar.items.workshopStaff', 'Workshop Staff'), 
            path: `${basePath}/manage-workshop-staff`, 
            permission: 'STAFF_VIEW',
            minRoleLevel: 2,
            description: 'Technicians, mechanics, and workshop support personnel.'
        }
    ];

    const performanceItems = [
        { 
            icon: <BarChart3 size={24} />, 
            label: 'Staff Performance', 
            path: `${basePath}/staff-performance`, 
            permission: 'STAFF_PERFORMANCE_VIEW',
            minRoleLevel: 1,
            description: 'Track and analyze staff productivity and efficiency metrics.'
        },
        { 
            icon: <Target size={24} />, 
            label: 'Target Management', 
            path: `${basePath}/target-management`, 
            permission: 'STAFF_PERFORMANCE_VIEW',
            minRoleLevel: 1,
            description: 'Set, monitor, and adjust performance targets for individuals and teams.'
        },
        { 
            icon: <ClipboardList size={24} />, 
            label: 'Task Delegation', 
            path: `${basePath}/task-delegation`, 
            permission: 'STAFF_PERFORMANCE_VIEW',
            minRoleLevel: 1,
            description: 'Assign duties, track progress, and manage workforce distribution.'
        }
    ];

    const ManagementCard = ({ item }: { item: any }) => {
        const hasPerm = hasPermission(item.permission);
        const userLevel = ROLE_LEVELS[userRole || ''] || 0;
        const isLevelPermitted = userLevel >= item.minRoleLevel;
        const isFullyPermitted = hasPerm && isLevelPermitted;
        
        return (
            <HasPermission permission={item.permission} mode="disable">
                <div 
                    onClick={() => isFullyPermitted && navigate(item.path)}
                    className={`group p-6 rounded-2xl border transition-all relative flex flex-col justify-between min-h-[160px] ${!isFullyPermitted ? 'grayscale opacity-60' : 'hover:shadow-xl hover:-translate-y-1 cursor-pointer'}`}
                    style={{ 
                        background: 'var(--bg-card)', 
                        borderColor: !isFullyPermitted ? 'rgba(255,0,0,0.2)' : 'var(--border-main)',
                    }}
                >
                    {!isFullyPermitted && (
                        <div className="absolute top-4 right-4 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-1.5 z-10">
                            <Shield size={10} className="text-red-500" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-red-500">No Permission</span>
                        </div>
                    )}
                    <div>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${isFullyPermitted ? 'group-hover:bg-lime/20' : ''}`} style={{ background: isFullyPermitted ? 'rgba(200,230,0,0.1)' : 'rgba(100,100,100,0.1)', color: isFullyPermitted ? 'var(--brand-lime)' : 'var(--text-dim)' }}>
                            {item.icon}
                        </div>
                        <h3 className="text-lg font-bold transition-colors" style={{ color: isFullyPermitted ? 'var(--text-main)' : 'var(--text-dim)' }}>{item.label}</h3>
                        <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-dim)', opacity: isFullyPermitted ? 1 : 0.6 }}>{item.description}</p>
                    </div>
                    <div className={`mt-4 flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors ${isFullyPermitted ? 'group-hover:text-lime' : ''}`} style={{ color: 'var(--text-dim)' }}>
                        {isFullyPermitted ? t('common.manage', 'Manage') : 'Access Denied'} <ArrowRight size={14} className={`transition-transform ${isFullyPermitted ? 'group-hover:translate-x-1' : ''}`} />
                    </div>
                </div>
            </HasPermission>
        );
    };

    return (
        <div className="p-4 sm:p-8 min-h-full transition-colors duration-300" style={{ background: 'var(--bg-main)' }}>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-3xl font-black flex items-center gap-4 tracking-tight" style={{ color: 'var(--text-main)' }}>
                        <div className="p-3 rounded-2xl" style={{ background: 'var(--brand-lime)', color: '#000' }}>
                            <Users size={28} />
                        </div>
                        {t('sidebar.sections.staffManagement', 'Staff Management')}
                    </h1>
                    <p className="text-sm mt-2 max-w-2xl font-medium" style={{ color: 'var(--text-dim)' }}>
                        Comprehensive workforce oversight. Manage administrative hierarchies, branch personnel, technical staff, and monitor organizational performance from a unified interface.
                    </p>
                </div>

                {/* Staff Roles Section */}
                <section className="mb-12">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-px flex-1" style={{ background: 'var(--border-main)' }}></div>
                        <h2 className="text-[10px] uppercase font-black tracking-[0.2em]" style={{ color: 'var(--text-dim)' }}>
                            Personnel & Roles
                        </h2>
                        <div className="h-px flex-1" style={{ background: 'var(--border-main)' }}></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {managementItems.map((item, idx) => (
                            <ManagementCard key={idx} item={item} />
                        ))}
                    </div>
                </section>

                {/* Performance & Operations Section */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="h-px flex-1" style={{ background: 'var(--border-main)' }}></div>
                        <h2 className="text-[10px] uppercase font-black tracking-[0.2em]" style={{ color: 'var(--text-dim)' }}>
                            Performance & Delegation
                        </h2>
                        <div className="h-px flex-1" style={{ background: 'var(--border-main)' }}></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {performanceItems.map((item, idx) => (
                            <ManagementCard key={idx} item={item} />
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default StaffManagement;
