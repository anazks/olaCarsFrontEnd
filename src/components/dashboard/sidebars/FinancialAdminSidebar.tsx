import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutGrid,
    Car,
    Users,
    Library,
    Calculator,
    Crosshair,
    Bell,
    Settings,
    ChevronDown,
    ChevronUp,
    User,
    X,
    Shield,
    ShoppingCart,
    ShoppingBag
} from 'lucide-react';
import { removeToken, getUser } from '../../../utils/auth';
import { useTranslation } from 'react-i18next';
import HasPermission from '../../../components/HasPermission';

interface FinancialAdminSidebarProps {
    isSidebarCollapsed?: boolean;
    toggleSidebar?: () => void;
}

interface SubItem {
    label: string;
    path: string;
    permission?: string;
}

interface MenuItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    path?: string;
    permission?: string;
    subItems?: SubItem[];
}

const FinancialAdminSidebar = ({ isSidebarCollapsed = false, toggleSidebar }: FinancialAdminSidebarProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    // Track only one open section for accordion behavior, default to accounting
    const [openSection, setOpenSection] = useState<string | null>('accounting');

    const currentUser = getUser();
    const userName = currentUser?.name || 'Admin';
    const userRole = 'Financial Admin';

    useEffect(() => {
        // Auto expand parent section of active route if relevant
        const currentPath = location.pathname;
        const activeItem = menuItems.find(item =>
            item.subItems?.some(sub => currentPath.startsWith(sub.path))
        );
        if (activeItem) {
            setOpenSection(activeItem.id);
        }
    }, [location.pathname]);

    const isActive = (path: string) => {
        if (!path) return false;
        if (path === '/admin/financial-admin') {
            return location.pathname === '/admin/financial-admin';
        }
        return location.pathname.startsWith(path);
    };

    const toggleSection = (id: string) => {
        setOpenSection(prev => prev === id ? null : id);
    };

    const handleNavigation = (path: string) => {
        navigate(path);
        // Automatically collapse sidebar on mobile screens after navigating
        if (window.innerWidth < 1024 && toggleSidebar) {
            toggleSidebar();
        }
    };

    const handleLogout = () => {
        removeToken();
        navigate('/admin/login');
    };

    const menuItems: MenuItem[] = [
        {
            id: 'dashboard',
            label: t('sidebar.items.dashboard', 'Dashboard'),
            icon: <LayoutGrid size={22} />,
            path: '/admin/financial-admin'
        },
        {
            id: 'fleet',
            label: 'Fleet',
            icon: <Car size={22} />,
            subItems: [
                { label: t('sidebar.items.manageVehicles', 'Manage Vehicles'), path: '/admin/financial-admin/vehicles', permission: 'VEHICLE_VIEW' },
                { label: 'Vehicle Lease Settings', path: '/admin/financial-admin/vehicle-lease-settings', permission: 'LEASE_VIEW' },
                { label: 'Fleet Performance', path: '/admin/financial-admin/driver-performance', permission: 'STAFF_PERFORMANCE_VIEW' },
            ]
        },
        {
            id: 'drivers',
            label: 'Drivers',
            icon: <Users size={22} />,
            subItems: [
                { label: 'Driver List', path: '/admin/financial-admin/drivers', permission: 'DRIVER_VIEW' },
                { label: 'Driver Performance', path: '/admin/financial-admin/driver-performance', permission: 'STAFF_PERFORMANCE_VIEW' },
            ]
        },
        {
            id: 'collections',
            label: 'Collections',
            icon: <Library size={22} />,
            subItems: [
                { label: 'Collections Dashboard', path: '/admin/financial-admin/collections/dashboard' },
                { label: 'Overdue Payments', path: '/admin/financial-admin/collections/overdue' },
                { label: 'Upcoming Payments', path: '/admin/financial-admin/collections/upcoming' },
                { label: 'Invoices Ledger', path: '/admin/financial-admin/collections/invoices' },
            ]
        },
        {
            id: 'sales',
            label: 'Sales',
            icon: <ShoppingCart size={22} />,
            subItems: [
                { label: 'Invoices', path: '/admin/financial-admin/invoices' },
                { label: 'Payments Received', path: '/admin/financial-admin/payments-received' },
                { label: 'Credit Notes', path: '/admin/financial-admin/credit-notes' },
            ]
        },
        {
            id: 'purchases',
            label: 'Purchases',
            icon: <ShoppingBag size={22} />,
            subItems: [
                { label: 'Vendors', path: '/admin/financial-admin/manage-suppliers', permission: 'SUPPLIER_VIEW' },
                { label: 'Expenses', path: '/admin/financial-admin/expenses' },
                { label: 'Recurring Expenses', path: '/admin/financial-admin/recurring-expenses' },
                { label: 'Purchase Orders', path: '/admin/financial-admin/purchase-orders', permission: 'PURCHASE_ORDER_VIEW' },
                { label: 'Bills', path: '/admin/financial-admin/purchase-bills' },
                { label: 'Recurring Bills', path: '/admin/financial-admin/recurring-bills' },
                { label: 'Payments Made', path: '/admin/financial-admin/payments-made' },
                { label: 'Vendor Credits', path: '/admin/financial-admin/vendor-credits' },
            ]
        },
        {
            id: 'accounting',
            label: 'Accounting',
            icon: <Calculator size={22} />,
            subItems: [
                { label: 'Finance Dashboard', path: '/admin/financial-admin/finance-dashboard', permission: 'REPORTS_VIEW' },
                { label: 'General Ledger', path: '/admin/financial-admin/ledger', permission: 'LEDGER_VIEW' },
                { label: 'Intelligence Reports', path: '/admin/financial-admin/reports', permission: 'REPORTS_VIEW' },
                { label: 'Financial Statements', path: '/admin/financial-admin/financial-statements', permission: 'REPORTS_VIEW' },
                { label: 'Staff Salaries', path: '/admin/financial-admin/staff-salaries', permission: 'REPORTS_VIEW' },
                { label: 'Add Journal Entry', path: '/admin/financial-admin/ledger?action=create', permission: 'JOURNAL_CREATE' },
                { label: 'Purchase Orders', path: '/admin/financial-admin/purchase-orders', permission: 'PURCHASE_ORDER_VIEW' },
            ]
        },
        {
            id: 'insurance',
            label: 'Insurance',
            icon: <Shield size={22} />,
            subItems: [
                { label: 'All Insurance', path: '/admin/financial-admin/vehicle-policies' },
                { label: 'Claims', path: '/admin/financial-admin/insurance-claims', permission: 'INSURANCE_CLAIM_VIEW' },
                { label: 'Settings', path: '/admin/financial-admin/insurances' },
            ]
        },
        {
            id: 'staff',
            label: 'Staff & Human Resources',
            icon: <Users size={22} />,
            subItems: [
                { label: 'Staff Management', path: '/admin/financial-admin/staff-management', permission: 'STAFF_VIEW' },
                { label: 'Staff Performance', path: '/admin/financial-admin/staff-performance', permission: 'STAFF_PERFORMANCE_VIEW' },
                { label: 'Target Management', path: '/admin/financial-admin/target-management', permission: 'STAFF_PERFORMANCE_VIEW' },
                { label: 'Task Delegation', path: '/admin/financial-admin/task-delegation', permission: 'STAFF_PERFORMANCE_VIEW' },
                { label: 'Accident Reports', path: '/admin/financial-admin/accident-reports', permission: 'STAFF_VIEW' },
            ]
        },
        {
            id: 'gps',
            label: 'GPS',
            icon: <Crosshair size={22} />,
            subItems: []
        },
        {
            id: 'alerts',
            label: 'Alerts',
            icon: <Bell size={22} />,
            path: '/admin/financial-admin/alerts'
        },
        {
            id: 'settings',
            label: 'Settings',
            icon: <Settings size={22} />,
            subItems: [
                { label: 'Branch Management', path: '/admin/financial-admin/manage-branches', permission: 'BRANCH_VIEW' },
                { label: 'Manage Suppliers', path: '/admin/financial-admin/manage-suppliers', permission: 'SUPPLIER_VIEW' },
                { label: 'System Preferences', path: '/admin/financial-admin/dashboard-settings' },
            ]
        },
    ];

    return (
        <aside
            className="w-full h-full flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out relative bg-[var(--bg-sidebar)] border-r border-[var(--border-main)]"
        >
            {/* Logo Header */}
            <div className={`h-20 flex items-center border-b border-[var(--border-main)] px-6 justify-between`}>
                <div className={`flex items-center gap-2`}>
                    <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center border-2 border-[#D4F12E] overflow-hidden flex-shrink-0">
                        <div className="bg-black w-[22px] h-[22px] rounded-full flex items-center justify-center">
                            <div className="bg-[#D4F12E] w-2.5 h-2.5 rounded-full"></div>
                        </div>
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="flex items-center border-l border-[var(--border-main)] h-7 pl-3 ml-1">
                            <span className="text-[var(--text-main)] font-bold tracking-widest text-[16px] uppercase whitespace-nowrap">Ola Cars</span>
                        </div>
                    )}
                </div>

                {/* Mobile-only Close Button inside sidebar */}
                {toggleSidebar && (
                    <button
                        onClick={toggleSidebar}
                        className="lg:hidden text-[var(--sidebar-text)] hover:text-[var(--text-main)] p-1.5 hover:bg-[var(--sidebar-hover)] rounded-md transition-colors cursor-pointer"
                        title="Close Sidebar"
                    >
                        <X size={22} />
                    </button>
                )}
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto pt-6 custom-scrollbar overflow-x-hidden">
                <div className="space-y-1">
                    {menuItems.map((item) => {
                        const hasSub = item.subItems && item.subItems.length > 0;
                        const isOpen = openSection === item.id;
                        const isCurrentlyActive = item.path ? isActive(item.path) : false;

                        const renderMainItem = () => (
                            <div
                                onClick={() => {
                                    if (isSidebarCollapsed && toggleSidebar) {
                                        // If collapsed, expand the entire sidebar first
                                        toggleSidebar();
                                        // Then either open the dropdown or navigate
                                        if (hasSub) {
                                            setOpenSection(item.id);
                                        } else if (item.path) {
                                            handleNavigation(item.path);
                                        }
                                    } else {
                                        // Normal expanded behavior
                                        if (hasSub) {
                                            toggleSection(item.id);
                                        } else if (item.path) {
                                            handleNavigation(item.path);
                                        }
                                    }
                                }}
                                className={`group relative flex items-center gap-4 px-6 py-3.5 cursor-pointer transition-all duration-200
                                    ${(isCurrentlyActive || (!hasSub && isCurrentlyActive)) ? 'bg-[var(--sidebar-hover)]/80' : 'hover:bg-[var(--sidebar-hover)]'}
                                    ${isSidebarCollapsed ? 'justify-center px-0' : ''}
                                `}
                                style={{
                                    borderLeft: (isCurrentlyActive || (!hasSub && isCurrentlyActive)) ? '4px solid #D4F12E' : '4px solid transparent',
                                }}
                            >
                                <div className={`${isCurrentlyActive ? 'text-[#D4F12E]' : 'text-[var(--sidebar-text)] group-hover:text-[var(--text-main)]'} transition-colors`}>
                                    {item.icon}
                                </div>
                                {!isSidebarCollapsed && (
                                    <div className="flex items-center justify-between w-full">
                                        <span className={`text-[15px] font-medium transition-colors ${isCurrentlyActive ? 'text-[var(--text-main)]' : 'text-[var(--sidebar-text)] group-hover:text-[var(--text-main)]'}`}>
                                            {item.label}
                                        </span>
                                        {hasSub && (
                                            <span className="text-[var(--sidebar-text)]/50 group-hover:text-[var(--sidebar-text)]">
                                                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );

                        return (
                            <div key={item.id}>
                                {item.permission ? (
                                    <HasPermission permission={item.permission} mode="hide">
                                        {renderMainItem()}
                                    </HasPermission>
                                ) : (
                                    renderMainItem()
                                )}

                                {/* Render sub-items with smooth transition */}
                                {!isSidebarCollapsed && hasSub && (
                                    <div
                                        className={`ml-12 pl-4 relative border-l border-[var(--border-main)] flex flex-col gap-0.5 transition-all duration-300 ease-in-out overflow-hidden
                                            ${isOpen ? 'max-h-[500px] opacity-100 mt-1 mb-2 py-1' : 'max-h-0 opacity-0 mt-0 mb-0 py-0'}
                                        `}
                                    >
                                        {item.subItems!.map((sub, idx) => {
                                            const isItActive = isActive(sub.path);
                                            const renderSub = (
                                                <div
                                                    key={idx}
                                                    onClick={() => handleNavigation(sub.path)}
                                                    className={`cursor-pointer py-2 text-sm transition-colors
                                                        ${isItActive ? 'text-[#D4F12E] font-medium' : 'text-[var(--sidebar-text)] hover:text-[var(--text-main)]'}
                                                    `}
                                                >
                                                    {sub.label}
                                                </div>
                                            );

                                            return sub.permission ? (
                                                <HasPermission key={idx} permission={sub.permission} mode="hide">
                                                    {renderSub}
                                                </HasPermission>
                                            ) : renderSub;
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* User Profile Section */}
            <div className="mt-auto border-t border-[var(--border-main)] px-6 py-4">
                <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}>
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-input)] overflow-hidden border-2 border-[#D4F12E] flex-shrink-0 flex items-center justify-center">
                        {currentUser?.avatarUrl ? (
                            <img src={currentUser.avatarUrl} alt="profile" className="w-full h-full object-cover" />
                        ) : (
                            <User size={20} className="text-[var(--sidebar-text)]" />
                        )}
                    </div>
                    {!isSidebarCollapsed && (
                        <div className="flex flex-col min-w-0">
                            <span className="text-[var(--text-main)] text-sm font-semibold truncate">{userName}</span>
                            <span className="text-[var(--sidebar-text)] text-xs truncate">{currentUser?.role || userRole}</span>
                            <button
                                onClick={handleLogout}
                                className="text-xs text-red-400 hover:text-red-300 bg-red-900/30 px-2 py-0.5 rounded mt-1 inline-block w-fit"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default FinancialAdminSidebar;

