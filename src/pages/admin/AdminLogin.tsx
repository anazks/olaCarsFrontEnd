import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { loginByRole, API_ROLE_TO_ROUTE, UI_ROLE_TO_API_ROLE } from '../../services/authService';
import { setToken, getDecodedToken, setRefreshToken, setAPIRole } from '../../utils/auth';
import loginBgVideo from '../../assets/loginbgvideo.mp4';

import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../components/dashboard/LanguageSwitcher';

const AdminLogin = () => {
    const { t } = useTranslation();
    const { theme, toggleTheme } = useTheme();
    const [role, setRole] = useState('admin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const ROLES = [
        { ui: 'admin', label: t('login.roleAdmin') },
        { ui: 'operational-admin', label: t('login.roleOperationalAdmin') },
        { ui: 'financial-admin', label: t('login.roleFinancialAdmin') },
        { ui: 'country-manager', label: t('login.roleCountryManager') },
        { ui: 'branch-manager', label: t('login.roleBranchManager') },
        { ui: 'branch-op-staff', label: t('login.roleBranchOpStaff') },
        { ui: 'branch-fin-staff', label: t('login.roleBranchFinStaff') },
    ];

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await loginByRole(role, { email, password });
            const { token, refreshToken } = response;

            // Persist the token
            setToken(token);
            if (refreshToken) {
                setRefreshToken(refreshToken);
            }

            // Save the API role for token refresh mapping
            const apiRole = UI_ROLE_TO_API_ROLE[role];
            if (apiRole) {
                setAPIRole(apiRole);
            }


            // Store user info if available
            if (response.user) {
                const { setUser } = await import('../../utils/auth');
                setUser(response.user);
            } else {
                // Fallback: store basic info if user object is missing
                const { setUser } = await import('../../utils/auth');
                setUser({ fullName: email.split('@')[0], email });
            }

            // Decode to get the role from the JWT payload, normalize to lowercase
            const decoded = getDecodedToken();
            const jwtRole = decoded?.role ? decoded.role.toLowerCase() : null;

            // Navigate to the dashboard that matches the JWT role,
            // fallback to the UI-selected role route
            const destination =
                (jwtRole && API_ROLE_TO_ROUTE[jwtRole]) ||
                API_ROLE_TO_ROUTE[role.replace(/-/g, '')] ||
                `/admin/${role}`;

            console.log('[login] navigating to:', destination);
            navigate(destination);
        } catch (err: any) {
            console.error('Login error:', err);
            const message =
                err.response?.data?.message ||
                err.response?.data?.error ||
                err.message ||
                t('login.loginFailed');
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative flex items-center justify-center min-h-screen overflow-hidden">
            {/* Background Video */}
            <video
                autoPlay
                muted
                loop
                playsInline
                className="absolute top-0 left-0 w-full h-full object-cover z-0"
            >
                <source src={loginBgVideo} type="video/mp4" />
                Your browser does not support the video tag.
            </video>

            {/* Theme-reactive Overlay for Readability */}
            <div 
                className="absolute top-0 left-0 w-full h-full z-10 transition-all duration-500" 
                style={{ background: theme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.3)' }}
            />

            {/* Language & Theme Overlays */}
            <div className="absolute top-6 right-6 z-30 flex items-center gap-3">
                <button
                    onClick={toggleTheme}
                    className="flex items-center justify-center p-2.5 rounded-xl hover:bg-white/10 transition-all cursor-pointer text-gray-400 hover:text-brand-lime border border-white/10 backdrop-blur-md bg-black/20"
                    title={theme === 'dark' ? t('common.lightMode') : t('common.darkMode')}
                >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <LanguageSwitcher />
            </div>

            {/* Login Form Container */}
            <div
                className="relative z-20 w-full max-w-md p-8 rounded-2xl border shadow-2xl backdrop-blur-md transition-all duration-300"
                style={{
                    background: 'var(--bg-card)',
                    opacity: 0.95,
                    borderColor: 'var(--border-main)'
                }}
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl mx-auto mb-4 shadow-lg"
                        style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}
                    >
                        OC
                    </div>
                    <h1 className="text-2xl font-bold transition-colors" style={{ color: 'var(--text-main)' }}>{t('login.staffPortal')}</h1>
                    <p className="text-sm mt-2 transition-colors" style={{ color: 'var(--text-dim)' }}>{t('login.signInMessage')}</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    {/* Role Selector */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium transition-colors" style={{ color: 'var(--text-dim)' }}>
                            {t('login.role')}
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl outline-none cursor-pointer transition-all focus:ring-2 focus:ring-lime appearance-none"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        >
                            {ROLES.map(({ ui, label }) => (
                                <option key={ui} value={ui} style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>{label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Email / ID */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium transition-colors" style={{ color: 'var(--text-dim)' }}>
                            {t('login.emailLabel')}
                        </label>
                        <input
                            type="text"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('login.emailPlaceholder')}
                            className="w-full px-4 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-lime"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium transition-colors" style={{ color: 'var(--text-dim)' }}>
                            {t('login.password')}
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-lime pr-12"
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-brand-lime transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-3 rounded-xl text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 rounded-xl font-bold text-sm cursor-pointer transition-all duration-300 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg hover:-translate-y-0.5"
                        style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}
                    >
                        {isLoading
                            ? <div className="w-5 h-5 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
                            : t('login.accessDashboard')
                        }
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
