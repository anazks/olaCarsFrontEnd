import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useScrollReveal } from './hooks/useScrollReveal';
import LandingPage from './pages/LandingPage';
import AdminLogin from './pages/admin/AdminLogin';
import DashboardLayout from './layouts/DashboardLayout';

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

function App() {
  // Wire up intersection-observer scroll reveals globally
  useScrollReveal();

  return (
    <Router>
      <Routes>
        {/* Customer Facing App */}
        <Route path="/" element={<LandingPage />} />

        {/* Admin Login Gateway */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin Dashboards */}
        <Route path="/admin/executive/*" element={<DashboardLayout SidebarComponent={ExecutiveSidebar} />}>
          <Route index element={<ExecutiveDashboard />} />
        </Route>

        <Route path="/admin/operational-admin/*" element={<DashboardLayout SidebarComponent={OperationalAdminSidebar} />}>
          <Route index element={<OperationalAdminDashboard />} />
        </Route>

        <Route path="/admin/financial-admin/*" element={<DashboardLayout SidebarComponent={FinancialAdminSidebar} />}>
          <Route index element={<FinancialAdminDashboard />} />
        </Route>

        <Route path="/admin/country-manager/*" element={<DashboardLayout SidebarComponent={CountryManagerSidebar} />}>
          <Route index element={<CountryManagerDashboard />} />
        </Route>

        <Route path="/admin/branch-manager/*" element={<DashboardLayout SidebarComponent={BranchManagerSidebar} />}>
          <Route index element={<BranchManagerDashboard />} />
        </Route>

        <Route path="/admin/branch-op-staff/*" element={<DashboardLayout SidebarComponent={BranchOpStaffSidebar} />}>
          <Route index element={<BranchOpStaffDashboard />} />
        </Route>

        <Route path="/admin/branch-fin-staff/*" element={<DashboardLayout SidebarComponent={BranchFinStaffSidebar} />}>
          <Route index element={<BranchFinStaffDashboard />} />
        </Route>

      </Routes>
    </Router>
  );
}

export default App;
