import { useNavigate } from 'react-router-dom';
import { Search, Settings, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getUser, getUserRole } from '../../utils/auth';
import { API_ROLE_TO_ROUTE } from '../../services/authService';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import AlertNotificationCenter from './AlertNotificationCenter';

interface TopBarProps {
    toggleSidebar: () => void;
}

const TopBar = ({ }: TopBarProps) => {
    const { theme, toggleTheme } = useTheme();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const user = getUser();

    const role = getUserRole();

    const getFormattedRole = (roleStr: string | null) => {
        if (!roleStr) return t('common.accessPanel');

        const roleMap: Record<string, string> = {
            'admin': t('roles.admin'),
            'operationaladmin': t('roles.operationalAdmin'),
            'operationadmin': t('roles.operationalAdmin'),
            'financialadmin': t('roles.financialAdmin'),
            'financeadmin': t('roles.financialAdmin'),
            'countrymanager': t('roles.countryManager'),
            'branchmanager': t('roles.branchManager'),
            'branchopstaff': t('roles.branchOpStaff'),
            'operationstaff': t('roles.operationStaff'),
            'branchfinstaff': t('roles.branchFinStaff'),
            'financestaff': t('roles.financeStaff'),
            'workshopstaff': t('roles.workshopStaff')
        };

        const normalizedRole = roleStr.toLowerCase().replace(/-/g, '');
        return roleMap[normalizedRole] || (
            roleStr
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
        );
    };

    const getInitials = (name: string | null) => {
        if (!name) return '??';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const handleProfileClick = () => {
        if (role) {
            const basePath = API_ROLE_TO_ROUTE[role];
            if (basePath) {
                navigate(`${basePath}/profile`);
            }
        }
    };

    return (
        <header
            className="flex items-center justify-between px-6 py-4 h-20 flex-shrink-0 transition-colors duration-300"
            style={{
                background: 'var(--bg-topbar)',
                borderBottom: '1px solid var(--border-main)'
            }}
        >
            <div className="flex items-center gap-4 flex-1">
                {/* Search Bar */}
                <div className="flex-1 max-w-lg">
                    <div
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors duration-300"
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)' }}
                    >
                        <Search size={18} className="text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('common.search')}
                            className="bg-transparent border-none outline-none text-sm w-full text-main placeholder-gray-500"
                            style={{ color: 'var(--text-main)' }}
                        />
                        <div className="flex items-center justify-center px-1.5 py-0.5 rounded textxs font-medium" style={{ background: 'var(--bg-card)', color: 'var(--text-dim)', border: '1px solid var(--border-main)' }}>
                            ⌘K
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Tools */}
            <div className="flex items-center gap-5 ml-4">
                {/* Language Switcher */}
                <LanguageSwitcher />

                {/* Alerts Notification Center */}
                <AlertNotificationCenter />

                <button
                    onClick={toggleTheme}
                    className="flex items-center justify-center p-2 rounded-full hover:bg-white/5 transition-colors cursor-pointer text-gray-400 hover:text-lime"
                    title={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
                >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <button
                    onClick={handleProfileClick}
                    className="flex items-center justify-center p-2 rounded-full hover:bg-white/5 transition-colors cursor-pointer text-gray-400 hover:text-lime"
                    title={t('common.settings')}
                >
                    <Settings size={20} />
                </button>

                {/* Profile Divider */}
                <div className="w-px h-8" style={{ background: 'var(--border-main)' }} />

                {/* User Profile */}
                <div 
                    onClick={handleProfileClick}
                    className="flex items-center gap-3 cursor-pointer group hover:opacity-80 transition-opacity"
                >
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold transition-colors" style={{ color: 'var(--text-main)' }}>
                            {user?.fullName || user?.email?.split('@')[0] || 'Admin User'}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
                            {getFormattedRole(role)}
                        </p>
                    </div>
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: '#C8E600' }}
                    >
                        {getInitials(user?.fullName || user?.email?.split('@')[0] || 'Admin User')}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default TopBar;
