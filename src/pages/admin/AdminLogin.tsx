import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminLogin = () => {
    const [role, setRole] = useState('executive');
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, authenticate here, then navigate based on returned role
        navigate(`/admin/${role}`);
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-dark-bg text-white" style={{ background: '#111111' }}>
            <div className="w-full max-w-md p-8 rounded-2xl bg-dark-card border border-dark-border" style={{ background: '#1C1C1C', borderColor: '#2A2A2A' }}>
                <div className="text-center mb-8">
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl mx-auto mb-4"
                        style={{ background: '#C8E600', color: '#0A0A0A' }}
                    >
                        OC
                    </div>
                    <h1 className="text-2xl font-bold">Staff Portal</h1>
                    <p className="text-gray-400 text-sm mt-2">Sign in to access your dashboard</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Employee ID / Email</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. EMP-1029"
                            className="w-full px-4 py-3 rounded-xl outline-none"
                            style={{ background: '#111111', border: '1px solid #2A2A2A', color: 'white' }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = '#C8E600'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = '#2A2A2A'; }}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
                        <input
                            type="password"
                            required
                            placeholder="••••••••"
                            className="w-full px-4 py-3 rounded-xl outline-none"
                            style={{ background: '#111111', border: '1px solid #2A2A2A', color: 'white' }}
                            onFocus={(e) => { e.currentTarget.style.borderColor = '#C8E600'; }}
                            onBlur={(e) => { e.currentTarget.style.borderColor = '#2A2A2A'; }}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">Simulate Role (Dev Only)</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl outline-none cursor-pointer"
                            style={{ background: '#111111', border: '1px solid #2A2A2A', color: 'white' }}
                        >
                            <option value="executive">Executive (CEO)</option>
                            <option value="operational-admin">Operational Admin</option>
                            <option value="financial-admin">Financial Admin</option>
                            <option value="country-manager">Country Manager</option>
                            <option value="branch-manager">Branch Manager</option>
                            <option value="branch-op-staff">Branch Operational Staff</option>
                            <option value="branch-fin-staff">Branch Finance Staff</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3.5 rounded-xl font-bold text-sm cursor-pointer transition-all duration-300"
                        style={{ background: '#C8E600', color: '#0A0A0A' }}
                        onMouseEnter={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 25px rgba(200,230,0,0.3)';
                        }}
                        onMouseLeave={(e) => {
                            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
                            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                        }}
                    >
                        Access Dashboard
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
