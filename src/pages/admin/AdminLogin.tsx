import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { loginByRole, API_ROLE_TO_ROUTE } from '../../services/authService';
import { setToken, getDecodedToken } from '../../utils/auth';
import loginBgVideo from '../../assets/loginbgvideo.mp4';

const ROLES = [
    { ui: 'admin', label: 'Admin (Executive / CEO)' },
    { ui: 'operational-admin', label: 'Operational Admin' },
    { ui: 'financial-admin', label: 'Financial Admin' },
    { ui: 'country-manager', label: 'Country Manager' },
    { ui: 'branch-manager', label: 'Branch Manager' },
    { ui: 'branch-op-staff', label: 'Branch Operational Staff' },
    { ui: 'branch-fin-staff', label: 'Branch Finance Staff' },
];

const AdminLogin = () => {
    const [role, setRole] = useState('admin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await loginByRole(role, { email, password });
            const { token } = response;

            // Persist the token
            setToken(token);

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
                'Login failed. Please check your credentials.';
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

            {/* Dark Overlay for Readability */}
            <div className="absolute top-0 left-0 w-full h-full bg-black/50 z-10" />

            {/* Login Form Container */}
            <div
                className="relative z-20 w-full max-w-md p-8 rounded-2xl border shadow-2xl backdrop-blur-md transition-all duration-300"
                style={{
                    background: 'rgba(28, 28, 28, 0.85)',
                    borderColor: 'rgba(255, 255, 255, 0.1)'
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
                    <h1 className="text-2xl font-bold text-white transition-colors">Staff Portal</h1>
                    <p className="text-sm mt-2 text-gray-300 transition-colors">Sign in to access your dashboard</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    {/* Role Selector */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-400 transition-colors">
                            Role
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl outline-none cursor-pointer transition-all focus:ring-2 focus:ring-lime text-white"
                            style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                        >
                            {ROLES.map(({ ui, label }) => (
                                <option key={ui} value={ui} className="bg-[#1C1C1C] text-white">{label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Email / ID */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-400 transition-colors">
                            Email / Employee ID
                        </label>
                        <input
                            type="text"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. admin@olacars.com"
                            className="w-full px-4 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-lime text-white"
                            style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                        />
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-400 transition-colors">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 rounded-xl outline-none transition-all focus:ring-2 focus:ring-lime text-white pr-12"
                                style={{ background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors"
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
                            : 'Access Dashboard'
                        }
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
