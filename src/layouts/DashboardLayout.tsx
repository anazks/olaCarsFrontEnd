import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import TopBar from '../components/dashboard/TopBar';
import { useDashboardPrefetcher } from '../hooks/useDashboardPrefetcher';

interface DashboardLayoutProps {
    SidebarComponent: React.ElementType;
}

const DashboardLayoutContent = ({ SidebarComponent }: DashboardLayoutProps) => {
    useDashboardPrefetcher();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarCollapsed(!isSidebarCollapsed);
    };

    return (
        <div className="flex h-screen print:h-auto overflow-hidden print:overflow-visible transition-colors duration-300" style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}>
            {/* Sidebar - Dynamically rendered for each Role */}
            <div className={`
                fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 print:hidden
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

            <div className="flex-1 flex flex-col overflow-hidden w-full print:h-auto print:overflow-visible">
                {/* Shared Top Bar across all admin panels */}
                <div className="print:hidden">
                    <TopBar toggleSidebar={toggleSidebar} />
                </div>

                {/* Dynamic page content */}
                <main className="flex-1 overflow-y-auto p-6 relative print:h-auto print:overflow-visible print:p-0">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

const DashboardLayout = (props: DashboardLayoutProps) => {
    return <DashboardLayoutContent {...props} />;
};

export default DashboardLayout;
