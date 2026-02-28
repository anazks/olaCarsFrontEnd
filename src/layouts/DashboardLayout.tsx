import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from '../components/dashboard/TopBar';

interface DashboardLayoutProps {
    SidebarComponent: React.ElementType;
}

const DashboardLayout = ({ SidebarComponent }: DashboardLayoutProps) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    return (
        <div className="flex h-screen overflow-hidden bg-dark-bg text-white" style={{ background: '#111111' }}>
            {/* Sidebar - Dynamically rendered for each Role */}
            <div className={`
                fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out lg:relative lg:translate-x-0
                ${isSidebarCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-20' : 'translate-x-0 lg:w-64'}
            `}>
                <SidebarComponent isSidebarCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
            </div>

            {/* Mobile Overlay */}
            {!isSidebarCollapsed && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                    onClick={toggleSidebar}
                />
            )}

            <div className="flex-1 flex flex-col overflow-hidden w-full">
                {/* Shared Top Bar across all admin panels */}
                <TopBar toggleSidebar={toggleSidebar} />

                {/* Dynamic page content */}
                <main className="flex-1 overflow-y-auto p-6 relative">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
