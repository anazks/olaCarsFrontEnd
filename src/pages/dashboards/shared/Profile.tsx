import React, { useState } from 'react';
import { Mail, Shield, Key, Eye, EyeOff, Save, CheckCircle2 } from 'lucide-react';
import { getUser, getUserRole } from '../../../utils/auth';
import { changePassword } from '../../../services/authService';

const Profile = () => {
    const user = getUser();
    const role = getUserRole();
    
    const [passwords, setPasswords] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState({
        old: false,
        new: false,
        confirm: false
    });
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({
        type: null,
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const togglePasswordVisibility = (field: keyof typeof showPassword) => {
        setShowPassword({ ...showPassword, [field]: !showPassword[field] });
    };

    const handleSubmitPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (passwords.newPassword !== passwords.confirmPassword) {
            setStatus({ type: 'error', message: 'New passwords do not match!' });
            return;
        }

        if (passwords.newPassword.length < 6) {
            setStatus({ type: 'error', message: 'Password must be at least 6 characters long.' });
            return;
        }

        setIsSubmitting(true);
        setStatus({ type: null, message: '' });

        try {
            await changePassword(user?.id || '', {
                oldPassword: passwords.oldPassword,
                newPassword: passwords.newPassword
            });
            setStatus({ type: 'success', message: 'Password changed successfully!' });
            setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            setStatus({ 
                type: 'error', 
                message: error.response?.data?.message || 'Failed to change password. Please check your old password.' 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getFormattedRole = (roleStr: string | null) => {
        if (!roleStr) return 'User';
        return roleStr
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold mb-2 text-main" style={{ color: 'var(--text-main)' }}>Profile Settings</h1>
                <p className="text-sm text-dim" style={{ color: 'var(--text-dim)' }}>Manage your personal information and security settings.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* User Details Card */}
                <div className="md:col-span-1 space-y-6">
                    <div 
                        className="p-6 rounded-2xl border bg-card shadow-xl transition-all duration-300"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div 
                                className="w-24 h-24 rounded-full flex items-center justify-center font-bold text-3xl shadow-lg border-2"
                                style={{ 
                                    background: 'var(--bg-input)', 
                                    borderColor: 'var(--border-main)', 
                                    color: '#C8E600' 
                                }}
                            >
                                {user?.fullName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-main" style={{ color: 'var(--text-main)' }}>
                                    {user?.fullName || 'Admin User'}
                                </h2>
                                <p className="text-sm text-dim" style={{ color: 'var(--text-dim)' }}>
                                    {getFormattedRole(role)}
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 space-y-4">
                            <div className="flex items-center gap-3 text-sm">
                                <Mail size={18} className="text-gray-400" />
                                <span className="text-main" style={{ color: 'var(--text-main)' }}>{user?.email || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <Shield size={18} className="text-gray-400" />
                                <span className="text-main" style={{ color: 'var(--text-main)' }}>Role Level: {role || 'N/A'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Change Password Section */}
                <div className="md:col-span-2">
                    <div 
                        className="p-8 rounded-2xl border bg-card shadow-xl transition-all duration-300 h-full"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <div className="flex items-center gap-2 mb-6">
                            <Key size={20} className="text-lime" style={{ color: '#C8E600' }} />
                            <h3 className="text-xl font-bold text-main" style={{ color: 'var(--text-main)' }}>Update Password</h3>
                        </div>

                        <form onSubmit={handleSubmitPassword} className="space-y-5">
                            {status.type && (
                                <div 
                                    className={`p-4 rounded-xl flex items-center gap-3 text-sm animate-in zoom-in duration-300 ${
                                        status.type === 'success' 
                                            ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                                            : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                    }`}
                                >
                                    {status.type === 'success' ? <CheckCircle2 size={18} /> : <Shield size={18} />}
                                    {status.message}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-dim" style={{ color: 'var(--text-dim)' }}>Current Password</label>
                                <div className="relative group">
                                    <input
                                        type={showPassword.old ? 'text' : 'password'}
                                        name="oldPassword"
                                        value={passwords.oldPassword}
                                        onChange={handlePasswordChange}
                                        required
                                        className="w-full px-4 py-3 rounded-xl border outline-none transition-all duration-300 bg-input focus:ring-2 focus:ring-lime/20"
                                        style={{ 
                                            background: 'var(--bg-input)', 
                                            borderColor: 'var(--border-main)',
                                            color: 'var(--text-main)'
                                        }}
                                        placeholder="••••••••"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => togglePasswordVisibility('old')}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                    >
                                        {showPassword.old ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-dim" style={{ color: 'var(--text-dim)' }}>New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword.new ? 'text' : 'password'}
                                            name="newPassword"
                                            value={passwords.newPassword}
                                            onChange={handlePasswordChange}
                                            required
                                            className="w-full px-4 py-3 rounded-xl border outline-none transition-all duration-300 bg-input focus:ring-2 focus:ring-lime/20"
                                            style={{ 
                                                background: 'var(--bg-input)', 
                                                borderColor: 'var(--border-main)',
                                                color: 'var(--text-main)'
                                            }}
                                            placeholder="••••••••"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => togglePasswordVisibility('new')}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                        >
                                            {showPassword.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-dim" style={{ color: 'var(--text-dim)' }}>Confirm New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword.confirm ? 'text' : 'password'}
                                            name="confirmPassword"
                                            value={passwords.confirmPassword}
                                            onChange={handlePasswordChange}
                                            required
                                            className="w-full px-4 py-3 rounded-xl border outline-none transition-all duration-300 bg-input focus:ring-2 focus:ring-lime/20"
                                            style={{ 
                                                background: 'var(--bg-input)', 
                                                borderColor: 'var(--border-main)',
                                                color: 'var(--text-main)'
                                            }}
                                            placeholder="••••••••"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => togglePasswordVisibility('confirm')}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                        >
                                            {showPassword.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full md:w-auto px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-lime/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#b0cc00]"
                                    style={{ background: '#C8E600', color: '#000' }}
                                >
                                    {isSubmitting ? (
                                        <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Save size={18} />
                                            Update Password
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
