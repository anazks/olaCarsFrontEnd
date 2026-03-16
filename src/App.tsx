import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useScrollReveal } from './hooks/useScrollReveal';
import AdminLogin from './pages/admin/AdminLogin';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { ThemeProvider } from './context/ThemeContext';

// Sidebars
import ExecutiveSidebar from './components/dashboard/sidebars/ExecutiveSidebar';
import OperationalAdminSidebar from './components/dashboard/sidebars/OperationalAdminSidebar';
import FinancialAdminSidebar from './components/dashboard/sidebars/FinancialAdminSidebar';
import CountryManagerSidebar from './components/dashboard/sidebars/CountryManagerSidebar';
import BranchManagerSidebar from './components/dashboard/sidebars/BranchManagerSidebar';
import BranchOpStaffSidebar from './components/dashboard/sidebars/BranchOpStaffSidebar';
import BranchFinStaffSidebar from './components/dashboard/sidebars/BranchFinStaffSidebar';

// Dashboards
import ExecutiveDashboard from './pages/dashboards/ExecutiveDashboard';
import OperationalAdminDashboard from './pages/dashboards/OperationalAdminDashboard';
import FinancialAdminDashboard from './pages/dashboards/FinancialAdminDashboard';
import CountryManagerDashboard from './pages/dashboards/CountryManagerDashboard';
import BranchManagerDashboard from './pages/dashboards/BranchManagerDashboard';
import BranchOpStaffDashboard from './pages/dashboards/BranchOpStaffDashboard';
import BranchFinStaffDashboard from './pages/dashboards/BranchFinStaffDashboard';

// Admin Manage Pages
import ManageOperationalAdmins from './pages/dashboards/admin/ManageOperationalAdmins';
import ManageFinancialAdmins from './pages/dashboards/admin/ManageFinancialAdmins';
import ManageCountryManagers from './pages/dashboards/shared/ManageCountryManagers';
import ManageBranches from './pages/dashboards/shared/ManageBranches';
import ManageBranchManagers from './pages/dashboards/shared/ManageBranchManagers';
import ManageFinanceStaff from './pages/dashboards/shared/ManageFinanceStaff';
import ManageOperationStaff from './pages/dashboards/shared/ManageOperationStaff';
import ManageSuppliers from './pages/dashboards/shared/ManageSuppliers';
import POThresholdPage from './pages/dashboards/admin/POThresholdPage';
import ManageInsurances from './pages/dashboards/shared/ManageInsurances';

// Purchase Order Pages
import PurchaseOrderList from './pages/dashboards/shared/PurchaseOrderList';
import CreatePurchaseOrder from './pages/dashboards/shared/CreatePurchaseOrder';
import PurchaseOrderDetail from './pages/dashboards/shared/PurchaseOrderDetail';

// Vehicle Pages
import VehicleList from './pages/dashboards/shared/VehicleList';
import CreateVehicle from './pages/dashboards/shared/CreateVehicle';
import VehicleDetail from './pages/dashboards/shared/VehicleDetail';

// Driver Pages
import DriverList from './pages/dashboards/shared/DriverList';
import CreateDriver from './pages/dashboards/shared/CreateDriver';
import DriverDetail from './pages/dashboards/shared/DriverDetail';
import Profile from './pages/dashboards/shared/Profile';

function App() {
  // Wire up intersection-observer scroll reveals globally
  useScrollReveal();

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          {/* Admin Login Gateway */}
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Admin Dashboards - Protected */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin/admin/*" element={<DashboardLayout SidebarComponent={ExecutiveSidebar} />}>
              <Route index element={<ExecutiveDashboard />} />
              <Route path="manage-operational-admins" element={<ManageOperationalAdmins />} />
              <Route path="manage-financial-admins" element={<ManageFinancialAdmins />} />
              <Route path="manage-country-managers" element={<ManageCountryManagers />} />
              <Route path="manage-branches" element={<ManageBranches />} />
              <Route path="manage-branch-managers" element={<ManageBranchManagers />} />
              <Route path="manage-finance-staff" element={<ManageFinanceStaff />} />
              <Route path="manage-operation-staff" element={<ManageOperationStaff />} />
              <Route path="manage-suppliers" element={<ManageSuppliers />} />
              <Route path="po-threshold" element={<POThresholdPage />} />
              <Route path="purchase-orders" element={<PurchaseOrderList />} />
              <Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
              <Route path="vehicles" element={<VehicleList />} />
              <Route path="vehicles/:id" element={<VehicleDetail />} />
              <Route path="drivers" element={<DriverList />} />
              <Route path="drivers/new" element={<CreateDriver />} />
              <Route path="drivers/:id" element={<DriverDetail />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['operationadmin']} />}>
            <Route path="/admin/operational-admin/*" element={<DashboardLayout SidebarComponent={OperationalAdminSidebar} />}>
              <Route index element={<OperationalAdminDashboard />} />
              <Route path="manage-country-managers" element={<ManageCountryManagers />} />
              <Route path="manage-branches" element={<ManageBranches />} />
              <Route path="manage-branch-managers" element={<ManageBranchManagers />} />
              <Route path="manage-finance-staff" element={<ManageFinanceStaff />} />
              <Route path="manage-operation-staff" element={<ManageOperationStaff />} />
              <Route path="manage-suppliers" element={<ManageSuppliers />} />
              <Route path="purchase-orders" element={<PurchaseOrderList />} />
              <Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
              <Route path="vehicles" element={<VehicleList />} />
              <Route path="vehicles/:id" element={<VehicleDetail />} />
              <Route path="drivers" element={<DriverList />} />
              <Route path="drivers/:id" element={<DriverDetail />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['financialadmin']} />}>
            <Route path="/admin/financial-admin/*" element={<DashboardLayout SidebarComponent={FinancialAdminSidebar} />}>
              <Route index element={<FinancialAdminDashboard />} />
              <Route path="manage-country-managers" element={<ManageCountryManagers />} />
              <Route path="manage-branches" element={<ManageBranches />} />
              <Route path="manage-branch-managers" element={<ManageBranchManagers />} />
              <Route path="manage-finance-staff" element={<ManageFinanceStaff />} />
              <Route path="manage-operation-staff" element={<ManageOperationStaff />} />
              <Route path="manage-suppliers" element={<ManageSuppliers />} />
              <Route path="purchase-orders" element={<PurchaseOrderList />} />
              <Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
              <Route path="vehicles" element={<VehicleList />} />
              <Route path="vehicles/:id" element={<VehicleDetail />} />
              <Route path="drivers" element={<DriverList />} />
              <Route path="drivers/:id" element={<DriverDetail />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['countrymanager']} />}>
            <Route path="/admin/country-manager/*" element={<DashboardLayout SidebarComponent={CountryManagerSidebar} />}>
              <Route index element={<CountryManagerDashboard />} />
              <Route path="manage-branches" element={<ManageBranches />} />
              <Route path="manage-branch-managers" element={<ManageBranchManagers />} />
              <Route path="manage-finance-staff" element={<ManageFinanceStaff />} />
              <Route path="manage-operation-staff" element={<ManageOperationStaff />} />
              <Route path="manage-suppliers" element={<ManageSuppliers />} />
              <Route path="purchase-orders" element={<PurchaseOrderList />} />
              <Route path="purchase-orders/create" element={<CreatePurchaseOrder />} />
              <Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
              <Route path="vehicles" element={<VehicleList />} />
              <Route path="vehicles/create" element={<CreateVehicle />} />
              <Route path="vehicles/:id" element={<VehicleDetail />} />
              <Route path="drivers" element={<DriverList />} />
              <Route path="drivers/new" element={<CreateDriver />} />
              <Route path="drivers/:id" element={<DriverDetail />} />
              <Route path="insurances" element={<ManageInsurances />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['branchmanager']} />}>
            <Route path="/admin/branch-manager/*" element={<DashboardLayout SidebarComponent={BranchManagerSidebar} />}>
              <Route index element={<BranchManagerDashboard />} />
              <Route path="manage-finance-staff" element={<ManageFinanceStaff />} />
              <Route path="manage-operation-staff" element={<ManageOperationStaff />} />
              <Route path="manage-suppliers" element={<ManageSuppliers />} />
              <Route path="purchase-orders" element={<PurchaseOrderList />} />
              <Route path="purchase-orders/create" element={<CreatePurchaseOrder />} />
              <Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
              <Route path="vehicles" element={<VehicleList />} />
              <Route path="vehicles/create" element={<CreateVehicle />} />
              <Route path="vehicles/:id" element={<VehicleDetail />} />
              <Route path="drivers" element={<DriverList />} />
              <Route path="drivers/new" element={<CreateDriver />} />
              <Route path="drivers/:id" element={<DriverDetail />} />
              <Route path="insurances" element={<ManageInsurances />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['operationstaff']} />}>
            <Route path="/admin/branch-op-staff/*" element={<DashboardLayout SidebarComponent={BranchOpStaffSidebar} />}>
              <Route index element={<BranchOpStaffDashboard />} />
              <Route path="purchase-orders" element={<PurchaseOrderList />} />
              <Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
              <Route path="vehicles" element={<VehicleList />} />
              <Route path="vehicles/:id" element={<VehicleDetail />} />
              <Route path="drivers" element={<DriverList />} />
              <Route path="drivers/:id" element={<DriverDetail />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['financestaff']} />}>
            <Route path="/admin/branch-fin-staff/*" element={<DashboardLayout SidebarComponent={BranchFinStaffSidebar} />}>
              <Route index element={<BranchFinStaffDashboard />} />
              <Route path="purchase-orders" element={<PurchaseOrderList />} />
              <Route path="purchase-orders/:id" element={<PurchaseOrderDetail />} />
              <Route path="vehicles" element={<VehicleList />} />
              <Route path="vehicles/:id" element={<VehicleDetail />} />
              <Route path="drivers" element={<DriverList />} />
              <Route path="drivers/new" element={<CreateDriver />} />
              <Route path="drivers/:id" element={<DriverDetail />} />
              <Route path="profile" element={<Profile />} />
            </Route>
          </Route>

          {/* Global /purchase-orders route to handle TopBar bell click redirect */}
          <Route path="/purchase-orders" element={<ProtectedRoute allowedRoles={['admin', 'operationadmin', 'financialadmin', 'countrymanager', 'branchmanager', 'branchopstaff', 'financestaff']} />}>
            <Route index element={<Navigate to="/" replace />} />
          </Route>

          {/* Redirect "/" and any unknown routes to login */}
          <Route path="*" element={<Navigate to="/admin/login" replace />} />

        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
