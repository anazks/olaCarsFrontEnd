import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginByRole, API_ROLE_TO_ROUTE } from '../../services/authService';
import { setToken, getDecodedToken } from '../../utils/auth';

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
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const { token } = await loginByRole(role, { email, password });

            // Persist the token
            setToken(token);

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

    const inputStyle = {
        background: '#111111',
        border: '1px solid #2A2A2A',
        color: 'white',
    };

    return (
        <div className="flex items-center justify-center min-h-screen" style={{ background: '#111111' }}>
            <div
                className="w-full max-w-md p-8 rounded-2xl border"
                style={{ background: '#1C1C1C', borderColor: '#2A2A2A' }}
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl mx-auto mb-4"
                        style={{ background: '#C8E600', color: '#0A0A0A' }}
                    >
                        OC
                    </div>
                    <h1 className="text-2xl font-bold text-white">Staff Portal</h1>
                    <p className="text-gray-400 text-sm mt-2">Sign in to access your dashboard</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    {/* Role Selector */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">
                            Role
                        </label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl outline-none cursor-pointer"
                            style={inputStyle}
                        >
                            {ROLES.map(({ ui, label }) => (
                                <option key={ui} value={ui}>{label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Email / ID */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">
                            Email / Employee ID
                        </label>
                        <input
                            type="text"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="e.g. admin@olacars.com"
                            className="w-full px-4 py-3 rounded-xl outline-none"
                            style={inputStyle}
                            onFocus={(e) => { e.currentTarget.style.borderColor = '#C8E600'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = '#2A2A2A'; }}
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-4 py-3 rounded-xl outline-none"
                            style={inputStyle}
                            onFocus={(e) => { e.currentTarget.style.borderColor = '#C8E600'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = '#2A2A2A'; }}
                        />
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 rounded-xl font-bold text-sm cursor-pointer transition-all duration-300 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                        style={{ background: '#C8E600', color: '#0A0A0A' }}
                        onMouseEnter={(e) => {
                            if (isLoading) return;
                            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 25px rgba(200,230,0,0.3)';
                        }}
                        onMouseLeave={(e) => {
                            if (isLoading) return;
                            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                        }}
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
