import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  ShoppingBag,
  Wrench,
} from "lucide-react";
import { removeToken, getUser } from "../../../utils/auth";
import { useTranslation } from "react-i18next";
import HasPermission from "../../../components/HasPermission";

interface FinancialAdminSidebarProps {
  isSidebarCollapsed?: boolean;
  toggleSidebar?: () => void;
}

interface SubItem {
  label: string;
  path: string;
  permission?: string;
  badge?: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  permission?: string;
  subItems?: SubItem[];
}

const FinancialAdminSidebar = ({
  isSidebarCollapsed = false,
  toggleSidebar,
}: FinancialAdminSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  // Track only one open section for accordion behavior, default to accounting
  const [openSection, setOpenSection] = useState<string | null>("accounting");

  const currentUser = getUser();
  const userName = currentUser?.name || "Admin";
  const userRole = "Financial Admin";

  useEffect(() => {
    // Auto expand parent section of active route if relevant
    const activeItem = menuItems.find((item) =>
      item.subItems?.some((sub) => isActive(sub.path)),
    );
    if (activeItem) {
      setOpenSection(activeItem.id);
    }
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (!path) return false;
    if (
      path === "/admin/admin" ||
      path === "/admin/financial-admin" ||
      path === "/admin/branch-fin-staff"
    ) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const toggleSection = (id: string) => {
    setOpenSection((prev) => (prev === id ? null : id));
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
    navigate("/admin/login");
  };

  const menuItems: MenuItem[] = [
    {
      id: "dashboard",
      label: t("sidebar.items.dashboard"),
      icon: <LayoutGrid size={22} />,
      subItems: [
        {
          label: t("sidebar.items.executiveDashboard"),
          path: "/admin/financial-admin",
        },
        {
          label: t("sidebar.items.collectionsDashboard"),
          path: "/admin/financial-admin/collections/dashboard",
        },
        {
          label: t("sidebar.items.fleetDashboard"),
          path: "/admin/financial-admin/driver-performance",
          permission: "STAFF_PERFORMANCE_VIEW",
        },
        {
          label: t("sidebar.items.financeDashboard"),
          path: "/admin/financial-admin/finance-dashboard",
          permission: "REPORTS_VIEW",
        },
        {
          label: t("sidebar.items.wGroup"),
          path: "/admin/financial-admin/wgroup-dashboard",
          badge: "BETA",
        },
      ],
    },
    {
      id: "fleet",
      label: t("sidebar.sections.fleet"),
      icon: <Car size={22} />,
      subItems: [
        {
          label: t("sidebar.items.manageVehicles"),
          path: "/admin/financial-admin/vehicles",
          permission: "VEHICLE_VIEW",
        },
        {
          label: t("sidebar.items.pendingEntryVehicles"),
          path: "/admin/financial-admin/pending-vehicles",
          permission: "VEHICLE_VIEW",
        },
        {
          label: t("sidebar.items.vehicleLeaseSettings"),
          path: "/admin/financial-admin/vehicle-lease-settings",
          permission: "LEASE_VIEW",
        },
        {
          label: t("sidebar.items.fleetPerformance"),
          path: "/admin/financial-admin/driver-performance",
          permission: "STAFF_PERFORMANCE_VIEW",
        },
      ],
    },
    {
      id: "drivers",
      label: t("sidebar.sections.drivers"),
      icon: <Users size={22} />,
      subItems: [
        {
          label: t("sidebar.items.driverList"),
          path: "/admin/financial-admin/drivers",
          permission: "DRIVER_VIEW",
        },
        {
          label: t("sidebar.items.driverPerformance"),
          path: "/admin/financial-admin/driver-performance",
          permission: "STAFF_PERFORMANCE_VIEW",
        },
      ],
    },
    {
      id: "collections",
      label: t("sidebar.sections.collections"),
      icon: <Library size={22} />,
      subItems: [
        {
          label: t("sidebar.items.collectionsDashboard"),
          path: "/admin/financial-admin/collections/dashboard",
        },
        {
          label: t("sidebar.items.overduePayments"),
          path: "/admin/financial-admin/collections/overdue",
        },
        {
          label: t("sidebar.items.upcomingPayments"),
          path: "/admin/financial-admin/collections/upcoming",
        },
        {
          label: t("sidebar.items.invoicesLedger"),
          path: "/admin/financial-admin/collections/invoices",
        },
      ],
    },
    {
      id: "sales",
      label: t("sidebar.sections.sales"),
      icon: <ShoppingCart size={22} />,
      subItems: [
        {
          label: t("sidebar.items.customers"),
          path: "/admin/financial-admin/customers",
        },
        {
          label: t("sidebar.items.invoices"),
          path: "/admin/financial-admin/invoices",
        },
        {
          label: t("sidebar.items.paymentsReceived"),
          path: "/admin/financial-admin/payments-received",
        },
        ...(currentUser?.role !== "admin"
          ? [
              {
                label: t("sidebar.items.creditNotes"),
                path: "/admin/financial-admin/credit-notes",
              },
            ]
          : []),
      ],
    },
    {
      id: "purchases",
      label: t("sidebar.sections.purchases"),
      icon: <ShoppingBag size={22} />,
      subItems: [
        {
          label: t("sidebar.items.vendors"),
          path: "/admin/financial-admin/manage-suppliers",
          permission: "SUPPLIER_VIEW",
        },
        {
          label: t("sidebar.items.expenses"),
          path: "/admin/financial-admin/expenses",
        },
        {
          label: t("sidebar.items.purchaseOrders"),
          path: "/admin/financial-admin/purchase-orders",
          permission: "PURCHASE_ORDER_VIEW",
        },
        {
          label: t("sidebar.items.purchaseRequests"),
          path: "/admin/financial-admin/workshop-purchase-requests",
          permission: "PURCHASE_ORDER_VIEW",
        },
        {
          label: t("sidebar.items.bills"),
          path: "/admin/financial-admin/bills",
        },
        {
          label: t("sidebar.items.paymentsMade"),
          path: "/admin/financial-admin/payments-made",
        },
      ],
    },
    {
      id: "accounting",
      label: t("sidebar.sections.accounting"),
      icon: <Calculator size={22} />,
      subItems: [
        {
          label: t("sidebar.items.financeDashboard"),
          path: "/admin/financial-admin/finance-dashboard",
          permission: "REPORTS_VIEW",
        },
        {
          label: t("sidebar.items.paymentRequests"),
          path: "/admin/financial-admin/payment-requests",
        },
        {
          label: t("sidebar.items.generalLedger"),
          path: "/admin/financial-admin/ledger",
          permission: "LEDGER_VIEW",
        },
        {
          label: t("sidebar.items.intelligenceReports"),
          path: "/admin/financial-admin/reports",
          permission: "REPORTS_VIEW",
        },
        {
          label: t("sidebar.items.financialStatements"),
          path: "/admin/financial-admin/financial-statements",
          permission: "REPORTS_VIEW",
        },
        {
          label: t("sidebar.items.manualJournals"),
          path: "/admin/financial-admin/manual-journals",
          permission: "JOURNAL_VIEW",
        },
      ],
    },
    {
      id: "insurance",
      label: t("sidebar.sections.insurance"),
      icon: <Shield size={22} />,
      subItems: [
        {
          label: t("sidebar.items.allInsurance"),
          path: "/admin/financial-admin/vehicle-policies",
        },
        {
          label: t("sidebar.items.claims"),
          path: "/admin/financial-admin/insurance-claims",
          permission: "INSURANCE_CLAIM_VIEW",
        },
        {
          label: t("sidebar.items.providers"),
          path: "/admin/financial-admin/insurances",
        },
      ],
    },
    {
      id: "staff",
      label: t("sidebar.sections.staffHumanResources"),
      icon: <Users size={22} />,
      subItems: [
        {
          label: t("sidebar.items.staffManagement"),
          path: "/admin/financial-admin/staff-management",
          permission: "STAFF_VIEW",
        },
        {
          label: t("sidebar.items.staffPerformance"),
          path: "/admin/financial-admin/staff-performance",
          permission: "STAFF_PERFORMANCE_VIEW",
        },
        {
          label: t("sidebar.items.directivesDelegation"),
          path: "/admin/financial-admin/directives",
          permission: "STAFF_PERFORMANCE_VIEW",
        },
        // { label: t('sidebar.items.taskDelegation'), path: '/admin/financial-admin/task-delegation', permission: 'STAFF_PERFORMANCE_VIEW' },
        {
          label: t("sidebar.items.accidentReports"),
          path: "/admin/financial-admin/accident-reports",
          permission: "STAFF_VIEW",
        },
      ],
    },
    {
      id: "workshop-management",
      label: t("sidebar.sections.workshopManagement"),
      icon: <Wrench size={22} />,
      subItems: [
        {
          label: t("sidebar.items.scraps"),
          path: "/admin/financial-admin/scraps",
        },
        {
          label: t("sidebar.items.writeOffs"),
          path: "/admin/financial-admin/write-offs",
        },
      ],
    },
    {
      id: "administration",
      label: t("sidebar.sections.administration"),
      icon: <Library size={22} />,
      subItems: [
        {
          label: t("sidebar.items.manageWorkshops", {
            defaultValue: "Manage Workshops",
          }),
          path: "/admin/financial-admin/manage-workshops",
          permission: "STAFF_VIEW",
        },
        {
          label: t("sidebar.items.branchManagement"),
          path: "/admin/financial-admin/manage-branches",
          permission: "BRANCH_VIEW",
        },
        {
          label: t("sidebar.items.manageSuppliers"),
          path: "/admin/financial-admin/manage-suppliers",
          permission: "SUPPLIER_VIEW",
        },
      ],
    },
    {
      id: "gps",
      label: t("sidebar.sections.gps"),
      icon: <Crosshair size={22} />,
      subItems: [],
    },
    {
      id: "alerts",
      label: t("sidebar.sections.alerts"),
      icon: <Bell size={22} />,
      path: "/admin/financial-admin/alerts",
    },
    {
      id: "settings",
      label: t("sidebar.sections.accountSettings"),
      icon: <Settings size={22} />,
      subItems: [
        {
          label: t("sidebar.sections.settings"),
          path: "/admin/financial-admin/dashboard-settings",
        },
        {
          label: t("sidebar.items.systemBulkUploads"),
          path: "/admin/financial-admin/bulk-uploads",
        },
      ],
    },
  ];

  return (
    <aside className="w-full h-full flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out relative bg-[var(--bg-sidebar)] border-r border-[var(--border-main)]">
      {/* Logo Header */}
      <div
        className={`h-20 flex items-center border-b border-[var(--border-main)] px-6 justify-between`}
      >
        <div className={`flex items-center gap-2`}>
          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center border-2 border-[#D4F12E] overflow-hidden flex-shrink-0">
            <div className="bg-black w-[22px] h-[22px] rounded-full flex items-center justify-center">
              <div className="bg-[#D4F12E] w-2.5 h-2.5 rounded-full"></div>
            </div>
          </div>
          {!isSidebarCollapsed && (
            <div className="flex items-center border-l border-[var(--border-main)] h-7 pl-3 ml-1">
              <span className="text-[var(--text-main)] font-bold tracking-widest text-[16px] uppercase whitespace-nowrap">
                Ola Cars
              </span>
            </div>
          )}
        </div>

        {/* Mobile-only Close Button inside sidebar */}
        {toggleSidebar && (
          <button
            onClick={toggleSidebar}
            className="lg:hidden text-[var(--sidebar-text)] hover:text-[var(--text-main)] p-1.5 hover:bg-[var(--sidebar-hover)] rounded-md transition-colors cursor-pointer"
            title={t("sidebar.items.closeSidebar")}
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
                                    ${isCurrentlyActive || (!hasSub && isCurrentlyActive) ? "bg-[var(--sidebar-hover)]/80" : "hover:bg-[var(--sidebar-hover)]"}
                                    ${isSidebarCollapsed ? "justify-center px-0" : ""}
                                `}
                style={{
                  borderLeft:
                    isCurrentlyActive || (!hasSub && isCurrentlyActive)
                      ? "4px solid var(--sidebar-active)"
                      : "4px solid transparent",
                }}
              >
                <div
                  className={`${isCurrentlyActive ? "text-[var(--sidebar-active)]" : "text-[var(--sidebar-text)] group-hover:text-[var(--text-main)]"} transition-colors`}
                >
                  {item.icon}
                </div>
                {!isSidebarCollapsed && (
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-[15px] font-medium transition-colors ${isCurrentlyActive ? "text-[var(--text-main)]" : "text-[var(--sidebar-text)] group-hover:text-[var(--text-main)]"}`}
                    >
                      {item.label}
                    </span>
                    {hasSub && (
                      <span className="text-[var(--sidebar-text)]/50 group-hover:text-[var(--sidebar-text)]">
                        {isOpen ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
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
                                            ${isOpen ? "max-h-[500px] opacity-100 mt-1 mb-2 py-1" : "max-h-0 opacity-0 mt-0 mb-0 py-0"}
                                        `}
                  >
                    {item.subItems!.map((sub, idx) => {
                      const isItActive = isActive(sub.path);
                      const renderSub = (
                        <div
                          key={idx}
                          onClick={() => handleNavigation(sub.path)}
                          className={`cursor-pointer py-2 text-sm transition-colors flex items-center justify-between
                                                        ${isItActive ? "text-[var(--sidebar-active)] font-medium" : "text-[var(--sidebar-text)] hover:text-[var(--text-main)]"}
                                                    `}
                        >
                          <span>{sub.label}</span>
                          {sub.badge && (
                            <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-rose-600 text-white leading-none mr-2">
                              {sub.badge}
                            </span>
                          )}
                        </div>
                      );

                      return sub.permission ? (
                        <HasPermission
                          key={idx}
                          permission={sub.permission}
                          mode="hide"
                        >
                          {renderSub}
                        </HasPermission>
                      ) : (
                        renderSub
                      );
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
        <div
          className={`flex items-center gap-3 ${isSidebarCollapsed ? "justify-center px-0" : ""}`}
        >
          <div className="w-10 h-10 rounded-full bg-[var(--bg-input)] overflow-hidden border-2 border-[#D4F12E] flex-shrink-0 flex items-center justify-center">
            {currentUser?.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt="profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={20} className="text-[var(--sidebar-text)]" />
            )}
          </div>
          {!isSidebarCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-[var(--text-main)] text-sm font-semibold truncate">
                {userName}
              </span>
              <span className="text-[var(--sidebar-text)] text-xs truncate">
                {currentUser?.role || userRole}
              </span>
              <button
                onClick={handleLogout}
                className="text-xs text-red-400 hover:text-red-300 bg-red-900/30 px-2 py-0.5 rounded mt-1 inline-block w-fit"
              >
                {t("sidebar.items.logout")}
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default FinancialAdminSidebar;
