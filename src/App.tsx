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
          {/* allowedRoles must match the 'role' field in the JWT from the API */}
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
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['operationaladmin']} />}>
            <Route path="/admin/operational-admin/*" element={<DashboardLayout SidebarComponent={OperationalAdminSidebar} />}>
              <Route index element={<OperationalAdminDashboard />} />
              <Route path="manage-country-managers" element={<ManageCountryManagers />} />
              <Route path="manage-branches" element={<ManageBranches />} />
              <Route path="manage-branch-managers" element={<ManageBranchManagers />} />
              <Route path="manage-finance-staff" element={<ManageFinanceStaff />} />
              <Route path="manage-operation-staff" element={<ManageOperationStaff />} />
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
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['countrymanager']} />}>
            <Route path="/admin/country-manager/*" element={<DashboardLayout SidebarComponent={CountryManagerSidebar} />}>
              <Route index element={<CountryManagerDashboard />} />
              <Route path="manage-branches" element={<ManageBranches />} />
              <Route path="manage-branch-managers" element={<ManageBranchManagers />} />
              <Route path="manage-finance-staff" element={<ManageFinanceStaff />} />
              <Route path="manage-operation-staff" element={<ManageOperationStaff />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['branchmanager']} />}>
            <Route path="/admin/branch-manager/*" element={<DashboardLayout SidebarComponent={BranchManagerSidebar} />}>
              <Route index element={<BranchManagerDashboard />} />
              <Route path="manage-finance-staff" element={<ManageFinanceStaff />} />
              <Route path="manage-operation-staff" element={<ManageOperationStaff />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['branchopstaff']} />}>
            <Route path="/admin/branch-op-staff/*" element={<DashboardLayout SidebarComponent={BranchOpStaffSidebar} />}>
              <Route index element={<BranchOpStaffDashboard />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['branchfinstaff']} />}>
            <Route path="/admin/branch-fin-staff/*" element={<DashboardLayout SidebarComponent={BranchFinStaffSidebar} />}>
              <Route index element={<BranchFinStaffDashboard />} />
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
