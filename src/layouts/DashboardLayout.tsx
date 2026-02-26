import { Outlet } from 'react-router-dom';
import TopBar from '../components/dashboard/TopBar';

interface DashboardLayoutProps {
    SidebarComponent: React.ElementType;
}

const DashboardLayout = ({ SidebarComponent }: DashboardLayoutProps) => {
    return (
        <div className="flex h-screen overflow-hidden bg-dark-bg text-white" style={{ background: '#111111' }}>
            {/* Sidebar - Dynamically rendered for each Role */}
            <SidebarComponent />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Shared Top Bar across all admin panels */}
                <TopBar />

                {/* Dynamic page content */}
                <main className="flex-1 overflow-y-auto p-6 relative">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
