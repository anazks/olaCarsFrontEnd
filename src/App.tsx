import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useScrollReveal } from "./hooks/useScrollReveal";
import { useAuthRefresh } from "./hooks/useAuthRefresh";
import { isTokenValid, logout, getToken } from "./utils/auth";
import "./i18n";
import AdminLogin from "./pages/admin/AdminLogin";
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./context/ThemeContext";

// Sidebars
import ExecutiveSidebar from "./components/dashboard/sidebars/ExecutiveSidebar";
import OperationalAdminSidebar from "./components/dashboard/sidebars/OperationalAdminSidebar";
import FinancialAdminSidebar from "./components/dashboard/sidebars/FinancialAdminSidebar";
import CountryManagerSidebar from "./components/dashboard/sidebars/CountryManagerSidebar";
import BranchManagerSidebar from "./components/dashboard/sidebars/BranchManagerSidebar";
import BranchOpStaffSidebar from "./components/dashboard/sidebars/BranchOpStaffSidebar";
import BranchFinStaffSidebar from "./components/dashboard/sidebars/BranchFinStaffSidebar";

// Dashboards
import ExecutiveDashboard from "./pages/dashboards/ExecutiveDashboard";
import OperationalAdminDashboard from "./pages/dashboards/OperationalAdminDashboard";
import FinancialAdminDashboard from "./pages/dashboards/FinancialAdminDashboard";
import CountryManagerDashboard from "./pages/dashboards/CountryManagerDashboard";
import BranchManagerDashboard from "./pages/dashboards/BranchManagerDashboard";
import BranchOpStaffDashboard from "./pages/dashboards/BranchOpStaffDashboard";
import BranchFinStaffDashboard from "./pages/dashboards/BranchFinStaffDashboard";

// Admin Manage Pages
import ManageOperationalAdmins from "./pages/dashboards/admin/ManageOperationalAdmins";
import ManageFinancialAdmins from "./pages/dashboards/admin/ManageFinancialAdmins";
import EditFinancialAdmin from "./pages/dashboards/admin/EditFinancialAdmin";
import EditCountryManager from "./pages/dashboards/shared/EditCountryManager";
import EditBranchManager from "./pages/dashboards/shared/EditBranchManager";
import EditFinanceStaff from "./pages/dashboards/shared/EditFinanceStaff";
import EditOperationStaff from "./pages/dashboards/shared/EditOperationStaff";
import EditWorkshopStaff from "./pages/dashboards/shared/EditWorkshopStaff";
import EditMerchendiser from "./pages/dashboards/shared/EditMerchendiser";
import ManageCountryManagers from "./pages/dashboards/shared/ManageCountryManagers";
import ManageBranches from "./pages/dashboards/shared/ManageBranches";
import BranchDetails from "./pages/dashboards/shared/BranchDetails";
import ManageBranchManagers from "./pages/dashboards/shared/ManageBranchManagers";
import ManageFinanceStaff from "./pages/dashboards/shared/ManageFinanceStaff";
import ManageOperationStaff from "./pages/dashboards/shared/ManageOperationStaff";
import ManageWorkshopManagers from "./pages/dashboards/shared/ManageWorkshopManagers";
import ManageWorkshopStaff from "./pages/dashboards/shared/ManageWorkshopStaff";
import ManageWorkshops from "./pages/dashboards/shared/ManageWorkshops";
import ManageMerchendisers from "./pages/dashboards/shared/ManageMerchendisers";
import ManageSuppliers from "./pages/dashboards/shared/ManageSuppliers";
import SupplierDetail from "./pages/dashboards/shared/SupplierDetail";
import Reports from "./pages/dashboards/shared/Reports";
import POThresholdPage from "./pages/dashboards/admin/POThresholdPage";
import ManageInsurances from "./pages/dashboards/shared/ManageInsurances";
import VehiclePolicyList from "./pages/dashboards/shared/VehiclePolicyList";
import VehiclePolicyDetail from "./pages/dashboards/shared/VehiclePolicyDetail";
import InsuranceClaimDetail from "./pages/dashboards/financialAdmin/InsuranceClaimDetail";
import CreateInsuranceClaim from "./pages/dashboards/financialAdmin/CreateInsuranceClaim";
import PaymentRequestPage from "./pages/dashboards/shared/PaymentRequestPage";
import FinancialAdminPaymentRequests from "./pages/dashboards/financialAdmin/FinancialAdminPaymentRequests";
import ManageAgreements from "./pages/dashboards/shared/ManageAgreements";
import EditAgreement from "./pages/dashboards/shared/EditAgreement";
import VehicleLeaseSettings from "./pages/dashboards/financialAdmin/VehicleLeaseSettings";
import CollectionsDashboard from "./pages/dashboards/financialAdmin/CollectionsDashboard";
import CollectionsLedgerView from "./pages/dashboards/financialAdmin/CollectionsLedgerView";
import ManageBankAccounts from "./pages/dashboards/finance/ManageBankAccounts";
import BankAccountLedger from "./pages/dashboards/finance/BankAccountLedger";
import TargetManagement from "./pages/dashboards/shared/TargetManagement";
import TaskManagement from "./pages/dashboards/shared/TaskManagement";
import DirectivesHub from "./pages/dashboards/shared/DirectivesHub";
// import TaskDelegation from './pages/dashboards/shared/TaskDelegation';
import StaffManagement from "./pages/dashboards/shared/StaffManagement";
import DashboardSettings from "./pages/dashboards/shared/DashboardSettings";
import BulkUploadsHub from "./pages/dashboards/shared/BulkUploadsHub";
import AlertsManagement from "./pages/dashboards/shared/AlertsManagement";
import InsuranceClaimsView from "./pages/dashboards/financialAdmin/InsuranceClaimsView";
import AccidentReports from "./pages/dashboards/shared/AccidentReports";
import AccidentReportDetail from "./pages/dashboards/shared/AccidentReportDetail";
import CreateInvoicePage from "./pages/dashboards/finance/CreateInvoicePage";
import BankingOverview from "./pages/dashboards/finance/BankingOverview";

// Purchase Order Pages
import PurchaseOrderList from "./pages/dashboards/shared/PurchaseOrderList";
import WorkshopPurchaseRequestList from "./pages/dashboards/shared/WorkshopPurchaseRequestList";
import WorkshopPurchaseRequestDetail from "./pages/dashboards/shared/WorkshopPurchaseRequestDetail";
import CreatePurchaseOrder from "./pages/dashboards/shared/CreatePurchaseOrder";
import PurchaseOrderDetail from "./pages/dashboards/shared/PurchaseOrderDetail";
import BillList from "./pages/dashboards/finance/Bills/BillList";
import BillDetail from "./pages/dashboards/finance/Bills/BillDetail";

// Vehicle Pages
import VehicleList from "./pages/dashboards/shared/VehicleList";
import CreateVehicle from "./pages/dashboards/shared/CreateVehicle";
import VehicleDetail from "./pages/dashboards/shared/VehicleDetail";
import VehicleWorkshopHistory from "./pages/dashboards/shared/VehicleWorkshopHistory";

// Driver Pages
import DriverList from "./pages/dashboards/shared/DriverList";
import CreateDriver from "./pages/dashboards/shared/CreateDriver";
import DriverDetail from "./pages/dashboards/shared/DriverDetail";
import DriverRentPlan from "./pages/dashboards/shared/DriverRentPlan";
import DriverVehicleAssignment from "./pages/dashboards/shared/DriverVehicleAssignment";
import DriverPerformanceDashboard from "./pages/dashboards/shared/DriverPerformanceDashboard";
import StaffPerformanceDashboard from "./pages/dashboards/shared/StaffPerformanceDashboard";
import StaffPerformanceDetails from "./pages/dashboards/shared/StaffPerformanceDetails";
import WGroupDashboard from "./pages/dashboards/WGroupDashboard";
import DashboardHub from "./pages/dashboards/shared/DashboardHub";
import DriverDashboard from "./pages/dashboards/driver/DriverDashboard";
import AgreementSignPage from "./pages/dashboards/driver/AgreementSignPage";
import NotificationsPage from "./pages/dashboards/shared/NotificationsPage";
import ComplaintsPage from "./pages/dashboards/shared/ComplaintsPage";
import MyTasks from "./pages/dashboards/shared/MyTasks";

// Finance Pages
import TaxManagement from "./pages/dashboards/finance/TaxManagement";
import ChartOfAccounts from "./pages/dashboards/finance/ChartOfAccounts";
import AccountingCodeDetails from "./pages/dashboards/finance/AccountingCodeDetails";
import GeneralLedger from "./pages/dashboards/finance/GeneralLedger";
import LedgerEntryDetailPage from "./pages/dashboards/finance/LedgerEntryDetailPage";
import FinanceDashboard from "./pages/dashboards/finance/FinanceDashboard";
import FinancialStatements from "./pages/dashboards/finance/FinancialStatements";
import BalanceSheet from "./pages/dashboards/finance/BalanceSheet";
import StaffSalaries from "./pages/dashboards/finance/StaffSalaries.tsx";
import VoucherDashboard from "./pages/dashboards/finance/VoucherDashboard";
import ManualJournals from "./pages/dashboards/finance/ManualJournals";
import CreateJournalPage from "./pages/dashboards/finance/CreateJournalPage";
import FixedAssets from "./pages/dashboards/finance/FixedAssets";
import CreateFixedAsset from "./pages/dashboards/finance/CreateFixedAsset";
import FixedAssetDetail from "./pages/dashboards/finance/FixedAssetDetail";
import InvoiceList from "./pages/dashboards/finance/InvoiceList";
import InvoiceDetail from "./pages/dashboards/finance/InvoiceDetail";
import FinancialAdminScraps from "./pages/dashboards/financialAdmin/FinancialAdminScraps";
import FinancialAdminWriteOffs from "./pages/dashboards/financialAdmin/FinancialAdminWriteOffs";
import InventoryList from "./pages/dashboards/shared/InventoryList";
import InventoryDetail from "./pages/dashboards/shared/InventoryDetail";

// Sales Pages
import Customers from "./pages/dashboards/finance/Sales/Customers";
import CustomerDetail from "./pages/dashboards/finance/Sales/CustomerDetail";
import PaymentsReceived from "./pages/dashboards/finance/Sales/PaymentsReceived";
import CreditNotes from "./pages/dashboards/finance/Sales/CreditNotes";
import CreditNoteDetail from "./pages/dashboards/finance/Sales/CreditNoteDetail";

// Purchases Pages
import Expenses from "./pages/dashboards/finance/Purchases/Expenses";
import ExpenseDetail from "./pages/dashboards/finance/Purchases/ExpenseDetail";
import PaymentsMade from "./pages/dashboards/finance/Purchases/PaymentsMade";

function App() {
  // Wire up intersection-observer scroll reveals globally
  useScrollReveal();

  // Activity-aware background token & profile refresh (profile every 5 minutes)
  useAuthRefresh(300000);

  useEffect(() => {
    // Check token validity every 60 seconds — but only logout if there's
    // truly no way to recover (no refresh token at all)
    const interval = setInterval(() => {
      const token = getToken();
      if (token && !isTokenValid()) {
        // isTokenValid already returns true if a refreshToken exists,
        // so reaching here means BOTH tokens are gone/expired
        console.warn(
          "[App] Session fully expired (no refresh token) — logging out",
        );
        logout("expired");
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return (
    <ThemeProvider>
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          style: {
            fontSize: "13px",
            fontFamily: "'Inter', sans-serif",
            borderRadius: "12px",
            background: "var(--bg-card)",
            color: "var(--text-main)",
            border: "1px solid var(--border-main)",
          },
          success: {
            iconTheme: {
              primary: "var(--brand-lime)",
              secondary: "var(--brand-black)",
            },
          },
        }}
      />
      <Router>
        <Routes>
          {/* Admin Login Gateway */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Admin Dashboards - Protected */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route
              path="/admin/admin/*"
              element={<DashboardLayout SidebarComponent={ExecutiveSidebar} />}
            >
              <Route index element={<ExecutiveDashboard />} />
              <Route path="dashboard-hub" element={<DashboardHub />} />
              <Route path="wgroup-dashboard" element={<WGroupDashboard />} />

              {/* Staff Management */}
              <Route
                element={<ProtectedRoute requiredPermission="STAFF_VIEW" />}
              >
                <Route path="staff-management" element={<StaffManagement />} />
                <Route
                  path="manage-operational-admins"
                  element={<ManageOperationalAdmins />}
                />
                <Route
                  path="manage-financial-admins"
                  element={<ManageFinancialAdmins />}
                />
                <Route
                  path="manage-financial-admins/edit/:id"
                  element={<EditFinancialAdmin />}
                />
                <Route
                  path="manage-country-managers"
                  element={<ManageCountryManagers />}
                />
                <Route
                  path='manage-country-managers/edit/:id'
                  element={<EditCountryManager />}
                
                />
                <Route
                  path="manage-branch-managers"
                  element={<ManageBranchManagers />}
                />
                <Route
                  path='manage-branch-managers/edit/:id'
                  element={<EditBranchManager />}
                
                />
                <Route
                  path="manage-finance-staff"
                  element={<ManageFinanceStaff />}
                />
                <Route
                  path='manage-finance-staff/edit/:id'
                  element={<EditFinanceStaff />}
                
                />
                <Route
                  path="manage-operation-staff"
                  element={<ManageOperationStaff />}
                />
                <Route
                  path='manage-operation-staff/edit/:id'
                  element={<EditOperationStaff />}
                
                />
                <Route path="manage-workshops" element={<ManageWorkshops />} />
                <Route
                  path="manage-workshop-managers"
                  element={<ManageWorkshopManagers />}
                />
                <Route
                  path="manage-workshop-staff"
                  element={<ManageWorkshopStaff />}
                />
                <Route
                  path='manage-workshop-staff/edit/:id'
                  element={<EditWorkshopStaff />}
                
                />
                <Route
                  path="manage-merchendisers"
                  element={<ManageMerchendisers />}
                />
                <Route
                  path='manage-merchendisers/edit/:id'
                  element={<EditMerchendiser />}
                
                />
              </Route>

              {/* Branch / Supplier Management */}
              <Route
                element={<ProtectedRoute requiredPermission="BRANCH_VIEW" />}
              >
                <Route path="manage-branches" element={<ManageBranches />} />
                <Route path="manage-branches/:id" element={<BranchDetails />} />
              </Route>

              <Route
                element={<ProtectedRoute requiredPermission="SUPPLIER_VIEW" />}
              >
                <Route path="manage-suppliers" element={<ManageSuppliers />} />
                <Route
                  path="manage-suppliers/:id"
                  element={<SupplierDetail />}
                />
              </Route>

              <Route path="po-threshold" element={<POThresholdPage />} />

              {/* Purchase Orders */}
              <Route
                element={
                  <ProtectedRoute requiredPermission="PURCHASE_ORDER_VIEW" />
                }
              >
                <Route path="purchase-orders" element={<PurchaseOrderList />} />
                <Route
                  path="workshop-purchase-requests"
                  element={<WorkshopPurchaseRequestList />}
                />
                <Route
                  path="workshop-purchase-requests/:id"
                  element={<WorkshopPurchaseRequestDetail />}
                />
                <Route
                  path="purchase-orders/create"
                  element={<CreatePurchaseOrder />}
                />
                <Route
                  path="purchase-orders/:id"
                  element={<PurchaseOrderDetail />}
                />
                <Route path="bills" element={<BillList />} />
                <Route path="bills/:id" element={<BillDetail />} />
              </Route>

              {/* Vehicles */}
              <Route
                element={<ProtectedRoute requiredPermission="VEHICLE_VIEW" />}
              >
                <Route
                  path="vehicles"
                  element={<VehicleList mode="active" />}
                />
                <Route
                  path="pending-vehicles"
                  element={<VehicleList mode="pending" />}
                />
                <Route path="vehicles/create" element={<CreateVehicle />} />
                <Route path="vehicles/:id" element={<VehicleDetail />} />
                <Route
                  path="vehicles/:id/workshop-history"
                  element={<VehicleWorkshopHistory />}
                />
              </Route>

              <Route
                element={<ProtectedRoute requiredPermission="INSURANCE_VIEW" />}
              >
                <Route path="insurances" element={<ManageInsurances />} />
                <Route
                  path="vehicle-policies"
                  element={<VehiclePolicyList />}
                />
                <Route
                  path="vehicle-policies/:id"
                  element={<VehiclePolicyDetail />}
                />
                <Route
                  path="insurance-claims"
                  element={<InsuranceClaimsView />}
                />
                <Route
                  path="insurance-claims/new"
                  element={<CreateInsuranceClaim />}
                />
                <Route
                  path="insurance-claims/:id"
                  element={<InsuranceClaimDetail />}
                />
              </Route>
              <Route path="drivers" element={<DriverList />} />
              <Route path="drivers/new" element={<CreateDriver />} />
              <Route path="drivers/:id" element={<DriverDetail />} />
              <Route
                path="drivers/:id/rent-plan"
                element={<DriverRentPlan />}
              />
              <Route
                path="drivers/:id/assign-vehicle"
                element={<DriverVehicleAssignment />}
              />
              <Route
                path="driver-performance"
                element={<DriverPerformanceDashboard />}
              />
              <Route
                path="staff-performance"
                element={<StaffPerformanceDashboard />}
              />
              <Route
                path="staff-performance/:id"
                element={<StaffPerformanceDetails />}
              />
              <Route
                path="dashboard-settings"
                element={<DashboardSettings />}
              />
              <Route path="bulk-uploads" element={<BulkUploadsHub />} />
              <Route
                path="profile"
                element={<Navigate to="dashboard-settings" replace />}
              />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="reports" element={<Reports />} />
              <Route path="taxes" element={<TaxManagement />} />
              <Route path="chart-of-accounts" element={<ChartOfAccounts />} />
              <Route
                path="chart-of-accounts/:id"
                element={<AccountingCodeDetails />}
              />
              <Route path="ledger" element={<GeneralLedger />} />
              <Route path="ledger/:id" element={<LedgerEntryDetailPage />} />
              <Route path="manual-journals" element={<ManualJournals />} />
              <Route path="manual-journals/new" element={<CreateJournalPage />} />
              <Route path="fixed-assets" element={<FixedAssets />} />
              <Route path="fixed-assets/new" element={<CreateFixedAsset />} />
              <Route path="fixed-assets/new/:id" element={<CreateFixedAsset />} />
              <Route path="fixed-assets/:id" element={<FixedAssetDetail />} />
              <Route path="vouchers" element={<VoucherDashboard />} />
              <Route path="invoices" element={<InvoiceList />} />
              <Route path="invoices/create" element={<CreateInvoicePage />} />
              <Route path="invoices/:id" element={<InvoiceDetail />} />
              <Route path="credit-notes/:id" element={<CreditNoteDetail />} />
              <Route path="finance-dashboard" element={<FinanceDashboard />} />
              <Route
                path="financial-statements"
                element={<FinancialStatements />}
              />
              <Route path="balance-sheet" element={<BalanceSheet />} />
              <Route path="staff-salaries" element={<StaffSalaries />} />
              <Route path="bank-accounts" element={<ManageBankAccounts />} />
              <Route path="bank-accounts/:id/ledger" element={<BankAccountLedger />} />
              <Route path="banking" element={<BankingOverview />} />
              <Route path="directives" element={<DirectivesHub />} />
              <Route path="directives/tasks" element={<TaskManagement />} />
              <Route path="directives/targets" element={<TargetManagement />} />
              <Route path="accident-reports" element={<AccidentReports />} />
              <Route
                path="accident-reports/:id"
                element={<AccidentReportDetail />}
              />
              <Route path="alerts" element={<AlertsManagement />} />
              <Route path="agreements" element={<ManageAgreements />} />
              <Route path="agreements/new" element={<EditAgreement />} />
              <Route path="agreements/edit/:id" element={<EditAgreement />} />

              {/* Sales Routes */}
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="payments-received" element={<PaymentsReceived />} />
              <Route path="credit-notes" element={<CreditNotes />} />
              <Route path="credit-notes/:id" element={<CreditNoteDetail />} />

              {/* Purchases Routes */}
              <Route path="expenses" element={<Expenses />} />
              <Route path="expenses/:id" element={<ExpenseDetail />} />
              <Route path="payments-made" element={<PaymentsMade />} />
              <Route path="scraps" element={<FinancialAdminScraps />} />
              <Route path="write-offs" element={<FinancialAdminWriteOffs />} />
              <Route path="inventory" element={<InventoryList />} />
              <Route path="inventory/:id" element={<InventoryDetail />} />

              {/* Nested Collections Routing Hub */}
              <Route
                path="collections"
                element={<Navigate to="dashboard" replace />}
              />
              <Route
                path="collections/dashboard"
                element={<CollectionsDashboard />}
              />
              <Route
                path="collections/overdue"
                element={<CollectionsLedgerView type="OVERDUE" />}
              />
              <Route
                path="collections/upcoming"
                element={<CollectionsLedgerView type="UPCOMING" />}
              />
              <Route
                path="collections/invoices"
                element={<CollectionsLedgerView type="GENERAL" />}
              />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["operationadmin"]} />}>
            <Route
              path="/admin/operational-admin/*"
              element={
                <DashboardLayout SidebarComponent={OperationalAdminSidebar} />
              }
            >
              <Route index element={<OperationalAdminDashboard />} />

              <Route
                element={<ProtectedRoute requiredPermission="STAFF_VIEW" />}
              >
                <Route path="staff-management" element={<StaffManagement />} />
                <Route
                  path="manage-country-managers"
                  element={<ManageCountryManagers />}
                />
                <Route
                  path='manage-country-managers/edit/:id'
                  element={<EditCountryManager />}
                
                />
                <Route
                  path="manage-branch-managers"
                  element={<ManageBranchManagers />}
                />
                <Route
                  path='manage-branch-managers/edit/:id'
                  element={<EditBranchManager />}
                
                />
                <Route
                  path="manage-finance-staff"
                  element={<ManageFinanceStaff />}
                />
                <Route
                  path='manage-finance-staff/edit/:id'
                  element={<EditFinanceStaff />}
                
                />
                <Route
                  path="manage-operation-staff"
                  element={<ManageOperationStaff />}
                />
                <Route
                  path='manage-operation-staff/edit/:id'
                  element={<EditOperationStaff />}
                
                />
                <Route path="manage-workshops" element={<ManageWorkshops />} />
                <Route
                  path="manage-workshop-managers"
                  element={<ManageWorkshopManagers />}
                />
                <Route
                  path="manage-workshop-staff"
                  element={<ManageWorkshopStaff />}
                />
                <Route
                  path='manage-workshop-staff/edit/:id'
                  element={<EditWorkshopStaff />}
                
                />
                <Route
                  path="manage-merchendisers"
                  element={<ManageMerchendisers />}
                />
                <Route
                  path='manage-merchendisers/edit/:id'
                  element={<EditMerchendiser />}
                
                />
              </Route>

              <Route
                element={<ProtectedRoute requiredPermission="BRANCH_VIEW" />}
              >
                <Route path="manage-branches" element={<ManageBranches />} />
                <Route path="manage-branches/:id" element={<BranchDetails />} />
              </Route>

              <Route
                element={<ProtectedRoute requiredPermission="SUPPLIER_VIEW" />}
              >
                <Route path="manage-suppliers" element={<ManageSuppliers />} />
                <Route
                  path="manage-suppliers/:id"
                  element={<SupplierDetail />}
                />
              </Route>

              <Route
                element={
                  <ProtectedRoute requiredPermission="PURCHASE_ORDER_VIEW" />
                }
              >
                <Route path="purchase-orders" element={<PurchaseOrderList />} />
                <Route
                  path="purchase-orders/create"
                  element={<CreatePurchaseOrder />}
                />
                <Route
                  path="purchase-orders/:id"
                  element={<PurchaseOrderDetail />}
                />
                <Route path="bills" element={<BillList />} />
                <Route path="bills/:id" element={<BillDetail />} />
              </Route>

              <Route
                element={<ProtectedRoute requiredPermission="VEHICLE_VIEW" />}
              >
                <Route
                  path="vehicles"
                  element={<VehicleList mode="active" />}
                />
                <Route
                  path="pending-vehicles"
                  element={<VehicleList mode="pending" />}
                />
                <Route path="vehicles/:id" element={<VehicleDetail />} />
                <Route
                  path="vehicles/:id/workshop-history"
                  element={<VehicleWorkshopHistory />}
                />
              </Route>

              <Route
                element={<ProtectedRoute requiredPermission="INSURANCE_VIEW" />}
              >
                <Route path="insurances" element={<ManageInsurances />} />
              </Route>

              <Route
                element={<ProtectedRoute requiredPermission="DRIVER_VIEW" />}
              >
                <Route path="drivers" element={<DriverList />} />
                <Route path="drivers/new" element={<CreateDriver />} />
                <Route path="drivers/:id" element={<DriverDetail />} />
                <Route
                  path="drivers/:id/rent-plan"
                  element={<DriverRentPlan />}
                />
                <Route
                  path="drivers/:id/assign-vehicle"
                  element={<DriverVehicleAssignment />}
                />
              </Route>

              <Route
                path="driver-performance"
                element={<DriverPerformanceDashboard />}
              />
              <Route
                path="staff-performance"
                element={<StaffPerformanceDashboard />}
              />
              <Route
                path="staff-performance/:id"
                element={<StaffPerformanceDetails />}
              />
              <Route
                path="dashboard-settings"
                element={<DashboardSettings />}
              />
              <Route path="bulk-uploads" element={<BulkUploadsHub />} />
              <Route
                path="profile"
                element={<Navigate to="dashboard-settings" replace />}
              />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="reports" element={<Reports />} />
              <Route path="directives" element={<DirectivesHub />} />
              <Route path="directives/tasks" element={<TaskManagement />} />
              <Route path="directives/targets" element={<TargetManagement />} />
              <Route path="finance-dashboard" element={<FinanceDashboard />} />
              <Route path="agreements" element={<ManageAgreements />} />
              <Route path="agreements/new" element={<EditAgreement />} />
              <Route path="agreements/edit/:id" element={<EditAgreement />} />
              <Route path="alerts" element={<AlertsManagement />} />
              <Route path="accident-reports" element={<AccidentReports />} />
              <Route
                path="accident-reports/:id"
                element={<AccidentReportDetail />}
              />

              {/* Nested Collections Routing Hub */}
              <Route
                path="collections"
                element={<Navigate to="dashboard" replace />}
              />
              <Route
                path="collections/dashboard"
                element={<CollectionsDashboard />}
              />
              <Route
                path="collections/overdue"
                element={<CollectionsLedgerView type="OVERDUE" />}
              />
              <Route
                path="collections/upcoming"
                element={<CollectionsLedgerView type="UPCOMING" />}
              />
              <Route
                path="collections/invoices"
                element={<CollectionsLedgerView type="GENERAL" />}
              />
            </Route>
          </Route>

          <Route
            element={
              <ProtectedRoute
                allowedRoles={["financialadmin", "financeadmin"]}
              />
            }
          >
            <Route
              path="/admin/financial-admin/*"
              element={
                <DashboardLayout SidebarComponent={FinancialAdminSidebar} />
              }
            >
              <Route index element={<FinancialAdminDashboard />} />
              <Route path="dashboard-hub" element={<DashboardHub />} />
              <Route path="wgroup-dashboard" element={<WGroupDashboard />} />

              {/* Nested Collections Routing Hub */}
              <Route
                path="collections"
                element={<Navigate to="dashboard" replace />}
              />
              <Route
                path="collections/dashboard"
                element={<CollectionsDashboard />}
              />
              <Route
                path="collections/overdue"
                element={<CollectionsLedgerView type="OVERDUE" />}
              />
              <Route
                path="collections/upcoming"
                element={<CollectionsLedgerView type="UPCOMING" />}
              />
              <Route
                path="collections/invoices"
                element={<CollectionsLedgerView type="GENERAL" />}
              />

              <Route
                element={<ProtectedRoute requiredPermission="STAFF_VIEW" />}
              >
                <Route path="staff-management" element={<StaffManagement />} />
                <Route
                  path="manage-country-managers"
                  element={<ManageCountryManagers />}
                />
                <Route
                  path='manage-country-managers/edit/:id'
                  element={<EditCountryManager />}
                
                />
                <Route
                  path="manage-branch-managers"
                  element={<ManageBranchManagers />}
                />
                <Route
                  path='manage-branch-managers/edit/:id'
                  element={<EditBranchManager />}
                
                />
                <Route
                  path="manage-finance-staff"
                  element={<ManageFinanceStaff />}
                />
                <Route
                  path='manage-finance-staff/edit/:id'
                  element={<EditFinanceStaff />}
                
                />
                <Route
                  path="manage-operation-staff"
                  element={<ManageOperationStaff />}
                />
                <Route
                  path='manage-operation-staff/edit/:id'
                  element={<EditOperationStaff />}
                
                />
                <Route path="manage-workshops" element={<ManageWorkshops />} />
                <Route
                  path="manage-workshop-managers"
                  element={<ManageWorkshopManagers />}
                />
                <Route
                  path="manage-workshop-staff"
                  element={<ManageWorkshopStaff />}
                />
                <Route
                  path='manage-workshop-staff/edit/:id'
                  element={<EditWorkshopStaff />}
                
                />
              </Route>

              <Route
                element={<ProtectedRoute requiredPermission="BRANCH_VIEW" />}
              >
                <Route path="manage-branches" element={<ManageBranches />} />
                <Route path="manage-branches/:id" element={<BranchDetails />} />
              </Route>

              <Route
                element={<ProtectedRoute requiredPermission="SUPPLIER_VIEW" />}
              >
                <Route path="manage-suppliers" element={<ManageSuppliers />} />
                <Route
                  path="manage-suppliers/:id"
                  element={<SupplierDetail />}
                />
              </Route>

              <Route
                element={
                  <ProtectedRoute requiredPermission="PURCHASE_ORDER_VIEW" />
                }
              >
                <Route path="purchase-orders" element={<PurchaseOrderList />} />
                <Route
                  path="workshop-purchase-requests"
                  element={<WorkshopPurchaseRequestList />}
                />
                <Route
                  path="workshop-purchase-requests/:id"
                  element={<WorkshopPurchaseRequestDetail />}
                />
                <Route
                  path="purchase-orders/create"
                  element={<CreatePurchaseOrder />}
                />
                <Route
                  path="purchase-orders/:id"
                  element={<PurchaseOrderDetail />}
                />
                <Route path="bills" element={<BillList />} />
                <Route path="bills/:id" element={<BillDetail />} />
              </Route>

              <Route
                element={<ProtectedRoute requiredPermission="VEHICLE_VIEW" />}
              >
                <Route
                  path="vehicles"
                  element={<VehicleList mode="active" />}
                />
                <Route
                  path="pending-vehicles"
                  element={<VehicleList mode="pending" />}
                />
                <Route path="vehicles/create" element={<CreateVehicle />} />
                <Route path="vehicles/:id" element={<VehicleDetail />} />
                <Route
                  path="vehicles/:id/workshop-history"
                  element={<VehicleWorkshopHistory />}
                />
              </Route>

              <Route
                element={<ProtectedRoute requiredPermission="INSURANCE_VIEW" />}
              >
                <Route path="insurances" element={<ManageInsurances />} />
                <Route
                  path="vehicle-policies"
                  element={<VehiclePolicyList />}
                />
                <Route
                  path="vehicle-policies/:id"
                  element={<VehiclePolicyDetail />}
                />
              </Route>

              <Route
                path="vehicle-lease-settings"
                element={<VehicleLeaseSettings />}
              />
              <Route
                path="insurance-claims"
                element={<InsuranceClaimsView />}
              />
              <Route
                path="insurance-claims/new"
                element={<CreateInsuranceClaim />}
              />
              <Route
                path="insurance-claims/:id"
                element={<InsuranceClaimDetail />}
              />

              <Route
                element={<ProtectedRoute requiredPermission="DRIVER_VIEW" />}
              >
                <Route path="drivers" element={<DriverList />} />
                <Route path="drivers/new" element={<CreateDriver />} />
                <Route path="drivers/:id" element={<DriverDetail />} />
                <Route
                  path="drivers/:id/rent-plan"
                  element={<DriverRentPlan />}
                />
                <Route
                  path="drivers/:id/assign-vehicle"
                  element={<DriverVehicleAssignment />}
                />
              </Route>

              <Route
                path="driver-performance"
                element={<DriverPerformanceDashboard />}
              />
              <Route
                path="staff-performance"
                element={<StaffPerformanceDashboard />}
              />
              <Route
                path="staff-performance/:id"
                element={<StaffPerformanceDetails />}
              />
              <Route
                path="dashboard-settings"
                element={<DashboardSettings />}
              />
              <Route path="bulk-uploads" element={<BulkUploadsHub />} />
              <Route
                path="profile"
                element={<Navigate to="dashboard-settings" replace />}
              />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="reports" element={<Reports />} />
              <Route path="taxes" element={<TaxManagement />} />
              <Route path="chart-of-accounts" element={<ChartOfAccounts />} />
              <Route
                path="chart-of-accounts/:id"
                element={<AccountingCodeDetails />}
              />
              <Route path="ledger" element={<GeneralLedger />} />
              <Route path="ledger/:id" element={<LedgerEntryDetailPage />} />
              <Route path="manual-journals" element={<ManualJournals />} />
              <Route path="manual-journals/new" element={<CreateJournalPage />} />
              <Route path="fixed-assets" element={<FixedAssets />} />
              <Route path="fixed-assets/new" element={<CreateFixedAsset />} />
              <Route path="fixed-assets/new/:id" element={<CreateFixedAsset />} />
              <Route path="fixed-assets/:id" element={<FixedAssetDetail />} />
              <Route path="vouchers" element={<VoucherDashboard />} />
              <Route path="invoices" element={<InvoiceList />} />
              <Route path="invoices/create" element={<CreateInvoicePage />} />
              <Route path="invoices/:id" element={<InvoiceDetail />} />
              <Route path="finance-dashboard" element={<FinanceDashboard />} />
              <Route
                path="financial-statements"
                element={<FinancialStatements />}
              />
              <Route path="balance-sheet" element={<BalanceSheet />} />
              <Route path="staff-salaries" element={<StaffSalaries />} />
              <Route path="bank-accounts" element={<ManageBankAccounts />} />
              <Route path="bank-accounts/:id/ledger" element={<BankAccountLedger />} />
              <Route path="banking" element={<BankingOverview />} />
              <Route path="directives" element={<DirectivesHub />} />
              <Route path="directives/tasks" element={<TaskManagement />} />
              <Route path="directives/targets" element={<TargetManagement />} />
              <Route path="accident-reports" element={<AccidentReports />} />
              <Route
                path="accident-reports/:id"
                element={<AccidentReportDetail />}
              />
              <Route path="alerts" element={<AlertsManagement />} />

              {/* Sales Routes */}
              <Route path="customers" element={<Customers />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="payments-received" element={<PaymentsReceived />} />
              <Route path="credit-notes" element={<CreditNotes />} />
              <Route path="credit-notes/:id" element={<CreditNoteDetail />} />

              {/* Purchases Routes */}
              <Route path="expenses" element={<Expenses />} />
              <Route path="expenses/:id" element={<ExpenseDetail />} />
              <Route path="payments-made" element={<PaymentsMade />} />
              <Route
                path="payment-requests"
                element={<FinancialAdminPaymentRequests />}
              />
              <Route path="scraps" element={<FinancialAdminScraps />} />
              <Route path="write-offs" element={<FinancialAdminWriteOffs />} />
              <Route path="inventory" element={<InventoryList />} />
              <Route path="inventory/:id" element={<InventoryDetail />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["countrymanager"]} />}>
            <Route
              path="/admin/country-manager/*"
              element={
                <DashboardLayout SidebarComponent={CountryManagerSidebar} />
              }
            >
              <Route index element={<CountryManagerDashboard />} />
              <Route
                element={<ProtectedRoute requiredPermission="BRANCH_VIEW" />}
              >
                <Route path="manage-branches" element={<ManageBranches />} />
                <Route path="manage-branches/:id" element={<BranchDetails />} />
              </Route>
              <Route
                element={<ProtectedRoute requiredPermission="STAFF_VIEW" />}
              >
                <Route path="staff-management" element={<StaffManagement />} />
                <Route
                  path="manage-branch-managers"
                  element={<ManageBranchManagers />}
                />
                <Route
                  path='manage-branch-managers/edit/:id'
                  element={<EditBranchManager />}
                
                />
                <Route
                  path="manage-finance-staff"
                  element={<ManageFinanceStaff />}
                />
                <Route
                  path='manage-finance-staff/edit/:id'
                  element={<EditFinanceStaff />}
                
                />
                <Route
                  path="manage-operation-staff"
                  element={<ManageOperationStaff />}
                />
                <Route
                  path='manage-operation-staff/edit/:id'
                  element={<EditOperationStaff />}
                
                />
                <Route path="manage-workshops" element={<ManageWorkshops />} />
                <Route
                  path="manage-workshop-managers"
                  element={<ManageWorkshopManagers />}
                />
                <Route
                  path="manage-workshop-staff"
                  element={<ManageWorkshopStaff />}
                />
                <Route
                  path='manage-workshop-staff/edit/:id'
                  element={<EditWorkshopStaff />}
                
                />
                <Route
                  path="manage-merchendisers"
                  element={<ManageMerchendisers />}
                />
                <Route
                  path='manage-merchendisers/edit/:id'
                  element={<EditMerchendiser />}
                
                />
              </Route>
              <Route
                element={<ProtectedRoute requiredPermission="SUPPLIER_VIEW" />}
              >
                <Route path="manage-suppliers" element={<ManageSuppliers />} />
                <Route
                  path="manage-suppliers/:id"
                  element={<SupplierDetail />}
                />
              </Route>
              <Route
                element={
                  <ProtectedRoute requiredPermission="PURCHASE_ORDER_VIEW" />
                }
              >
                <Route path="purchase-orders" element={<PurchaseOrderList />} />
                <Route
                  path="purchase-orders/create"
                  element={<CreatePurchaseOrder />}
                />
                <Route
                  path="purchase-orders/:id"
                  element={<PurchaseOrderDetail />}
                />
                <Route path="bills" element={<BillList />} />
                <Route path="bills/:id" element={<BillDetail />} />
              </Route>
              <Route
                element={<ProtectedRoute requiredPermission="VEHICLE_VIEW" />}
              >
                <Route
                  path="vehicles"
                  element={<VehicleList mode="active" />}
                />
                <Route
                  path="pending-vehicles"
                  element={<VehicleList mode="pending" />}
                />
                <Route path="vehicles/create" element={<CreateVehicle />} />
                <Route path="vehicles/:id" element={<VehicleDetail />} />
                <Route
                  path="vehicles/:id/workshop-history"
                  element={<VehicleWorkshopHistory />}
                />
              </Route>
              <Route path="drivers" element={<DriverList />} />
              <Route path="drivers/new" element={<CreateDriver />} />
              <Route path="drivers/:id" element={<DriverDetail />} />
              <Route
                path="drivers/:id/rent-plan"
                element={<DriverRentPlan />}
              />
              <Route
                path="drivers/:id/assign-vehicle"
                element={<DriverVehicleAssignment />}
              />
              <Route
                path="driver-performance"
                element={<DriverPerformanceDashboard />}
              />
              <Route
                path="staff-performance"
                element={<StaffPerformanceDashboard />}
              />
              <Route
                path="staff-performance/:id"
                element={<StaffPerformanceDetails />}
              />
              <Route path="insurances" element={<ManageInsurances />} />
              <Route
                path="dashboard-settings"
                element={<DashboardSettings />}
              />
              <Route path="bulk-uploads" element={<BulkUploadsHub />} />
              <Route
                path="profile"
                element={<Navigate to="dashboard-settings" replace />}
              />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="reports" element={<Reports />} />
              <Route path="agreements" element={<ManageAgreements />} />
              <Route path="agreements/new" element={<EditAgreement />} />
              <Route path="agreements/edit/:id" element={<EditAgreement />} />
              <Route path="alerts" element={<AlertsManagement />} />
              <Route path="taxes" element={<TaxManagement />} />
              <Route path="chart-of-accounts" element={<ChartOfAccounts />} />
              <Route
                path="chart-of-accounts/:id"
                element={<AccountingCodeDetails />}
              />
              <Route path="ledger" element={<GeneralLedger />} />
              <Route path="ledger/:id" element={<LedgerEntryDetailPage />} />
              <Route path="manual-journals" element={<ManualJournals />} />
              <Route path="manual-journals/new" element={<CreateJournalPage />} />
              <Route path="vouchers" element={<VoucherDashboard />} />
              <Route path="invoices" element={<InvoiceList />} />
              <Route path="invoices/create" element={<CreateInvoicePage />} />
              <Route path="invoices/:id" element={<InvoiceDetail />} />
              <Route path="credit-notes/:id" element={<CreditNoteDetail />} />
              <Route path="finance-dashboard" element={<FinanceDashboard />} />
              <Route
                path="financial-statements"
                element={<FinancialStatements />}
              />
              <Route path="balance-sheet" element={<BalanceSheet />} />
              <Route path="banking" element={<BankingOverview />} />
              <Route path="directives" element={<DirectivesHub />} />
              <Route path="directives/tasks" element={<TaskManagement />} />
              <Route path="directives/targets" element={<TargetManagement />} />
              <Route path="accident-reports" element={<AccidentReports />} />
              <Route
                path="accident-reports/:id"
                element={<AccidentReportDetail />}
              />
              <Route path="payment-requests" element={<PaymentRequestPage />} />

              {/* Nested Collections Routing Hub */}
              <Route
                path="collections"
                element={<Navigate to="dashboard" replace />}
              />
              <Route
                path="collections/dashboard"
                element={<CollectionsDashboard />}
              />
              <Route
                path="collections/overdue"
                element={<CollectionsLedgerView type="OVERDUE" />}
              />
              <Route
                path="collections/upcoming"
                element={<CollectionsLedgerView type="UPCOMING" />}
              />
              <Route
                path="collections/invoices"
                element={<CollectionsLedgerView type="GENERAL" />}
              />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["branchmanager"]} />}>
            <Route
              path="/admin/branch-manager/*"
              element={
                <DashboardLayout SidebarComponent={BranchManagerSidebar} />
              }
            >
              <Route index element={<BranchManagerDashboard />} />

              <Route
                element={<ProtectedRoute requiredPermission="STAFF_VIEW" />}
              >
                <Route path="staff-management" element={<StaffManagement />} />
                <Route
                  path="manage-finance-staff"
                  element={<ManageFinanceStaff />}
                />
                <Route
                  path='manage-finance-staff/edit/:id'
                  element={<EditFinanceStaff />}
                
                />
                <Route
                  path="manage-operation-staff"
                  element={<ManageOperationStaff />}
                />
                <Route
                  path='manage-operation-staff/edit/:id'
                  element={<EditOperationStaff />}
                
                />
                <Route
                  path="manage-workshop-managers"
                  element={<ManageWorkshopManagers />}
                />
                <Route
                  path="manage-workshop-staff"
                  element={<ManageWorkshopStaff />}
                />
                <Route
                  path='manage-workshop-staff/edit/:id'
                  element={<EditWorkshopStaff />}
                
                />
                <Route
                  path="manage-merchendisers"
                  element={<ManageMerchendisers />}
                />
                <Route
                  path='manage-merchendisers/edit/:id'
                  element={<EditMerchendiser />}
                
                />
              </Route>

              <Route
                element={<ProtectedRoute requiredPermission="SUPPLIER_VIEW" />}
              >
                <Route path="manage-suppliers" element={<ManageSuppliers />} />
                <Route
                  path="manage-suppliers/:id"
                  element={<SupplierDetail />}
                />
              </Route>

              <Route
                element={
                  <ProtectedRoute requiredPermission="PURCHASE_ORDER_VIEW" />
                }
              >
                <Route path="purchase-orders" element={<PurchaseOrderList />} />
                <Route
                  path="purchase-orders/create"
                  element={<CreatePurchaseOrder />}
                />
                <Route
                  path="purchase-orders/:id"
                  element={<PurchaseOrderDetail />}
                />
                <Route path="bills" element={<BillList />} />
                <Route path="bills/:id" element={<BillDetail />} />
              </Route>

              <Route
                element={<ProtectedRoute requiredPermission="VEHICLE_VIEW" />}
              >
                <Route path="vehicles" element={<VehicleList />} />
                <Route path="vehicles/create" element={<CreateVehicle />} />
                <Route path="vehicles/:id" element={<VehicleDetail />} />
                <Route
                  path="vehicles/:id/workshop-history"
                  element={<VehicleWorkshopHistory />}
                />
              </Route>

              <Route
                element={<ProtectedRoute requiredPermission="DRIVER_VIEW" />}
              >
                <Route path="drivers" element={<DriverList />} />
                <Route path="drivers/new" element={<CreateDriver />} />
                <Route path="drivers/:id" element={<DriverDetail />} />
                <Route
                  path="drivers/:id/rent-plan"
                  element={<DriverRentPlan />}
                />
                <Route
                  path="drivers/:id/assign-vehicle"
                  element={<DriverVehicleAssignment />}
                />
              </Route>

              <Route
                path="driver-performance"
                element={<DriverPerformanceDashboard />}
              />
              <Route
                path="staff-performance"
                element={<StaffPerformanceDashboard />}
              />
              <Route
                path="staff-performance/:id"
                element={<StaffPerformanceDetails />}
              />
              <Route path="insurances" element={<ManageInsurances />} />
              <Route
                path="dashboard-settings"
                element={<DashboardSettings />}
              />
              <Route path="bulk-uploads" element={<BulkUploadsHub />} />
              <Route
                path="profile"
                element={<Navigate to="dashboard-settings" replace />}
              />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="reports" element={<Reports />} />
              <Route path="directives" element={<DirectivesHub />} />
              <Route path="directives/tasks" element={<TaskManagement />} />
              <Route path="directives/targets" element={<TargetManagement />} />
              <Route path="alerts" element={<AlertsManagement />} />
              <Route path="complaints" element={<ComplaintsPage />} />
              <Route path="my-tasks" element={<MyTasks />} />
              <Route path="accident-reports" element={<AccidentReports />} />
              <Route
                path="accident-reports/:id"
                element={<AccidentReportDetail />}
              />

              {/* Nested Collections Routing Hub */}
              <Route
                path="collections"
                element={<Navigate to="dashboard" replace />}
              />
              <Route
                path="collections/dashboard"
                element={<CollectionsDashboard />}
              />
              <Route
                path="collections/overdue"
                element={<CollectionsLedgerView type="OVERDUE" />}
              />
              <Route
                path="collections/upcoming"
                element={<CollectionsLedgerView type="UPCOMING" />}
              />
              <Route
                path="collections/invoices"
                element={<CollectionsLedgerView type="GENERAL" />}
              />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["operationstaff"]} />}>
            <Route
              path="/admin/branch-op-staff/*"
              element={
                <DashboardLayout SidebarComponent={BranchOpStaffSidebar} />
              }
            >
              <Route index element={<BranchOpStaffDashboard />} />

              <Route
                element={
                  <ProtectedRoute requiredPermission="PURCHASE_ORDER_VIEW" />
                }
              >
                <Route path="purchase-orders" element={<PurchaseOrderList />} />
                <Route
                  path="purchase-orders/:id"
                  element={<PurchaseOrderDetail />}
                />
              </Route>

              <Route
                element={<ProtectedRoute requiredPermission="VEHICLE_VIEW" />}
              >
                <Route
                  path="vehicles"
                  element={<VehicleList mode="active" />}
                />
                <Route
                  path="pending-vehicles"
                  element={<VehicleList mode="pending" />}
                />
                <Route path="vehicles/create" element={<CreateVehicle />} />
                <Route path="vehicles/:id" element={<VehicleDetail />} />
                <Route
                  path="vehicles/:id/workshop-history"
                  element={<VehicleWorkshopHistory />}
                />
              </Route>

              <Route
                element={<ProtectedRoute requiredPermission="INSURANCE_VIEW" />}
              >
                <Route path="insurances" element={<ManageInsurances />} />
              </Route>

              <Route
                element={<ProtectedRoute requiredPermission="DRIVER_VIEW" />}
              >
                <Route path="drivers" element={<DriverList />} />
                <Route path="drivers/new" element={<CreateDriver />} />
                <Route path="drivers/:id" element={<DriverDetail />} />
                <Route
                  path="drivers/:id/rent-plan"
                  element={<DriverRentPlan />}
                />
              </Route>

              <Route
                path="driver-performance"
                element={<DriverPerformanceDashboard />}
              />
              <Route
                path="dashboard-settings"
                element={<DashboardSettings />}
              />
              <Route path="bulk-uploads" element={<BulkUploadsHub />} />
              <Route
                path="profile"
                element={<Navigate to="dashboard-settings" replace />}
              />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="my-tasks" element={<MyTasks />} />
              <Route path="accident-reports" element={<AccidentReports />} />
              <Route
                path="accident-reports/:id"
                element={<AccidentReportDetail />}
              />
              <Route path="directives" element={<DirectivesHub />} />
              <Route path="directives/tasks" element={<TaskManagement />} />
              <Route path="directives/targets" element={<TargetManagement />} />

              {/* Nested Collections Routing Hub */}
              <Route
                path="collections"
                element={<Navigate to="dashboard" replace />}
              />
              <Route
                path="collections/dashboard"
                element={<CollectionsDashboard />}
              />
              <Route
                path="collections/overdue"
                element={<CollectionsLedgerView type="OVERDUE" />}
              />
              <Route
                path="collections/upcoming"
                element={<CollectionsLedgerView type="UPCOMING" />}
              />
              <Route
                path="collections/invoices"
                element={<CollectionsLedgerView type="GENERAL" />}
              />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["financestaff"]} />}>
            <Route
              path="/admin/branch-fin-staff/*"
              element={
                <DashboardLayout SidebarComponent={BranchFinStaffSidebar} />
              }
            >
              <Route index element={<BranchFinStaffDashboard />} />

              <Route
                element={
                  <ProtectedRoute requiredPermission="PURCHASE_ORDER_VIEW" />
                }
              >
                <Route path="purchase-orders" element={<PurchaseOrderList />} />
                <Route
                  path="purchase-orders/:id"
                  element={<PurchaseOrderDetail />}
                />
                <Route path="bills" element={<BillList />} />
                <Route path="bills/:id" element={<BillDetail />} />
              </Route>

              <Route
                element={<ProtectedRoute requiredPermission="VEHICLE_VIEW" />}
              >
                <Route path="vehicles" element={<VehicleList />} />
                <Route path="vehicles/:id" element={<VehicleDetail />} />
                <Route
                  path="vehicles/:id/workshop-history"
                  element={<VehicleWorkshopHistory />}
                />
              </Route>

              <Route
                element={<ProtectedRoute requiredPermission="INSURANCE_VIEW" />}
              >
                <Route path="insurances" element={<ManageInsurances />} />
              </Route>

              <Route
                element={<ProtectedRoute requiredPermission="DRIVER_VIEW" />}
              >
                <Route path="drivers" element={<DriverList />} />
                <Route path="drivers/new" element={<CreateDriver />} />
                <Route path="drivers/:id" element={<DriverDetail />} />
                <Route
                  path="drivers/:id/rent-plan"
                  element={<DriverRentPlan />}
                />
                <Route
                  path="drivers/:id/assign-vehicle"
                  element={<DriverVehicleAssignment />}
                />
              </Route>

              <Route
                path="driver-performance"
                element={<DriverPerformanceDashboard />}
              />
              <Route
                path="dashboard-settings"
                element={<DashboardSettings />}
              />
              <Route path="bulk-uploads" element={<BulkUploadsHub />} />
              <Route
                path="profile"
                element={<Navigate to="dashboard-settings" replace />}
              />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="taxes" element={<TaxManagement />} />
              <Route path="chart-of-accounts" element={<ChartOfAccounts />} />
              <Route
                path="chart-of-accounts/:id"
                element={<AccountingCodeDetails />}
              />
              <Route path="ledger" element={<GeneralLedger />} />
              <Route path="ledger/:id" element={<LedgerEntryDetailPage />} />
              <Route path="manual-journals" element={<ManualJournals />} />
              <Route path="manual-journals/new" element={<CreateJournalPage />} />
              <Route path="vouchers" element={<VoucherDashboard />} />
              <Route path="invoices" element={<InvoiceList />} />
              <Route path="invoices/create" element={<CreateInvoicePage />} />
              <Route path="invoices/:id" element={<InvoiceDetail />} />
              <Route path="credit-notes/:id" element={<CreditNoteDetail />} />
              <Route path="finance-dashboard" element={<FinanceDashboard />} />
              <Route
                path="financial-statements"
                element={<FinancialStatements />}
              />
              <Route path="balance-sheet" element={<BalanceSheet />} />
              <Route path="my-tasks" element={<MyTasks />} />
              <Route path="accident-reports" element={<AccidentReports />} />
              <Route
                path="accident-reports/:id"
                element={<AccidentReportDetail />}
              />
              <Route path="directives" element={<DirectivesHub />} />
              <Route path="directives/tasks" element={<TaskManagement />} />
              <Route path="directives/targets" element={<TargetManagement />} />

              {/* Nested Collections Routing Hub */}
              <Route
                path="collections"
                element={<Navigate to="dashboard" replace />}
              />
              <Route
                path="collections/dashboard"
                element={<CollectionsDashboard />}
              />
              <Route
                path="collections/overdue"
                element={<CollectionsLedgerView type="OVERDUE" />}
              />
              <Route
                path="collections/upcoming"
                element={<CollectionsLedgerView type="UPCOMING" />}
              />
              <Route
                path="collections/invoices"
                element={<CollectionsLedgerView type="GENERAL" />}
              />
            </Route>
          </Route>

          {/* Global /purchase-orders route to handle TopBar bell click redirect */}
          <Route
            path="/purchase-orders"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "admin",
                  "operationadmin",
                  "financialadmin",
                  "countrymanager",
                  "branchmanager",
                  "branchopstaff",
                  "financestaff",
                ]}
              />
            }
          >
            <Route index element={<Navigate to="/" replace />} />
          </Route>

          {/* Agreement Signing Route */}
          <Route path="/agreements/sign/:id" element={<AgreementSignPage />} />

          {/* Driver Dashboard - Protected */}
          <Route element={<ProtectedRoute allowedRoles={["driver"]} />}>
            <Route
              path="/admin/driver/*"
              element={<DashboardLayout SidebarComponent={ExecutiveSidebar} />}
            >
              <Route index element={<DriverDashboard />} />
              <Route
                path="dashboard-settings"
                element={<DashboardSettings />}
              />
              <Route
                path="profile"
                element={<Navigate to="dashboard-settings" replace />}
              />
            </Route>
          </Route>

          {/* Redirect "/" and any unknown routes to login */}
          <Route path="*" element={<Navigate to="/admin/login" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
