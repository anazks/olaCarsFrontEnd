import React, { useState, useEffect, useCallback } from 'react';
import { 
    User, 
    Moon, 
    Sun, 
    Globe, 
    DollarSign, 
    Save, 
    CheckCircle2, 
    Shield, 
    Key, 
    Eye, 
    EyeOff,
    RefreshCw,
    AlertTriangle,
    Settings,
    Building2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../context/ThemeContext';
import { getUser, getUserRole } from '../../../utils/auth';
import { changePassword } from '../../../services/authService';
import systemSettingsService from '../../../services/systemSettingsService';
import ManageBankAccounts from '../finance/ManageBankAccounts';

const DashboardSettings = () => {
    const { t, i18n } = useTranslation();
    const { theme, toggleTheme } = useTheme();
    const user = getUser();
    const role = getUserRole();
    
    // State for Tabs
    const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'operations' | 'banking'>('profile');

    // Profile State
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
    const [profileStatus, setProfileStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({
        type: null,
        message: ''
    });
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

    // Operations (PO Threshold) State
    const [threshold, setThreshold] = useState<number | string>('');
    const [loadingThreshold, setLoadingThreshold] = useState(false);
    const [savingThreshold, setSavingThreshold] = useState(false);
    const [thresholdError, setThresholdError] = useState<string | null>(null);
    const [thresholdSuccess, setThresholdSuccess] = useState(false);

    // Fetch PO Threshold
    const fetchThreshold = useCallback(async () => {
        if (role !== 'admin' && role !== 'operationadmin') return;
        setLoadingThreshold(true);
        setThresholdError(null);
        try {
            const value = await systemSettingsService.getPOThreshold();
            setThreshold(value);
        } catch (err: any) {
            setThresholdError(err.message || 'Failed to fetch threshold');
        } finally {
            setLoadingThreshold(false);
        }
    }, [role]);

    useEffect(() => {
        if (activeTab === 'operations') {
            fetchThreshold();
        }
    }, [activeTab, fetchThreshold]);

    // Handlers
    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const togglePasswordVisibility = (field: keyof typeof showPassword) => {
        setShowPassword({ ...showPassword, [field]: !showPassword[field] });
    };

    const handleSubmitPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword) {
            setProfileStatus({ type: 'error', message: 'New passwords do not match!' });
            return;
        }
        setIsSubmittingPassword(true);
        try {
            await changePassword(user?.id || '', {
                oldPassword: passwords.oldPassword,
                newPassword: passwords.newPassword
            });
            setProfileStatus({ type: 'success', message: 'Password updated successfully!' });
            setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            setProfileStatus({ type: 'error', message: error.response?.data?.message || 'Update failed' });
        } finally {
            setIsSubmittingPassword(false);
        }
    };

    const handleSaveThreshold = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingThreshold(true);
        setThresholdError(null);
        try {
            await systemSettingsService.updatePOThreshold(Number(threshold));
            setThresholdSuccess(true);
            setTimeout(() => setThresholdSuccess(false), 3000);
        } catch (err: any) {
            setThresholdError(err.message || 'Update failed');
        } finally {
            setSavingThreshold(false);
        }
    };

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <div className="max-w-6xl mx-auto p-4 sm:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                        <div className="p-2.5 rounded-xl" style={{ background: 'var(--brand-lime)', color: '#000' }}>
                            <Settings size={24} />
                        </div>
                        {t('common.dashboardSettings', 'Dashboard Settings')}
                    </h1>
                    <p className="text-sm mt-1 font-medium" style={{ color: 'var(--text-dim)' }}>
                        Customize your workspace experience and manage account security.
                    </p>
                </div>
            </div>

            {/* Navigation Tabs (Top Layer) */}
            <div className="flex items-center gap-2 p-1 rounded-2xl border backdrop-blur-md overflow-x-auto no-scrollbar" style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)' }}>
                <button 
                    onClick={() => setActiveTab('profile')}
                    className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'profile' ? 'bg-lime text-black shadow-lg shadow-lime/20' : 'hover:bg-white/5'}`}
                    style={activeTab !== 'profile' ? { color: 'var(--text-dim)' } : {}}
                >
                    <User size={16} /> Profile & Security
                </button>
                <button 
                    onClick={() => setActiveTab('appearance')}
                    className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'appearance' ? 'bg-lime text-black shadow-lg shadow-lime/20' : 'hover:bg-white/5'}`}
                    style={activeTab !== 'appearance' ? { color: 'var(--text-dim)' } : {}}
                >
                    <Moon size={16} /> Appearance
                </button>
                {(role === 'admin' || role === 'operationadmin') && (
                    <button 
                        onClick={() => setActiveTab('operations')}
                        className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'operations' ? 'bg-lime text-black shadow-lg shadow-lime/20' : 'hover:bg-white/5'}`}
                        style={activeTab !== 'operations' ? { color: 'var(--text-dim)' } : {}}
                    >
                        <DollarSign size={16} /> Operations
                    </button>
                )}
                <button 
                    onClick={() => setActiveTab('banking')}
                    className={`flex items-center gap-2.5 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'banking' ? 'bg-lime text-black shadow-lg shadow-lime/20' : 'hover:bg-white/5'}`}
                    style={activeTab !== 'banking' ? { color: 'var(--text-dim)' } : {}}
                >
                    <Building2 size={16} /> Bank Accounts
                </button>
            </div>

            {/* Main Content Area */}
            <div className="w-full min-h-[60vh]">
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                            {/* Security Health Overview */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2 p-8 rounded-[2.5rem] border flex flex-col justify-between group transition-all hover:border-lime/30" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-black flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                                                <Shield className="text-lime" size={24} /> Security Overview
                                            </h3>
                                            <p className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Manage your account authentication and encryption parameters.</p>
                                        </div>
                                        <div className="px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-green-500">System Secure</span>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-8 flex items-center gap-10">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-dim">Authentication</p>
                                            <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>Password Only</p>
                                        </div>
                                        <div className="w-px h-8 bg-white/5" style={{ background: 'var(--border-main)' }} />
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-black uppercase tracking-widest text-dim">Active Sessions</p>
                                            <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>1 Endpoint</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-8 rounded-[2.5rem] border flex flex-col items-center justify-center text-center space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                    <div className="w-16 h-16 rounded-3xl bg-lime/10 flex items-center justify-center border border-lime/10">
                                        <Key className="text-lime" size={32} />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Auto-Lock</p>
                                        <p className="text-[10px] font-medium" style={{ color: 'var(--text-dim)' }}>Session expires after 24h</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 rounded-[3rem] border shadow-2xl shadow-black/20" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                <div className="mb-10">
                                    <h3 className="text-2xl font-black" style={{ color: 'var(--text-main)' }}>Update Master Password</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-lime mt-1">Credentials Synchronization</p>
                                </div>
                                
                                <form onSubmit={handleSubmitPassword} className="space-y-8">
                                    {profileStatus.type && (
                                        <div className={`p-5 rounded-2xl flex items-center gap-4 text-sm font-bold border ${profileStatus.type === 'success' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                            {profileStatus.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                                            {profileStatus.message}
                                        </div>
                                    )}

                                    <div className="space-y-2 max-w-md">
                                        <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Verification of Current Credentials</label>
                                        <div className="relative group">
                                            <input 
                                                type={showPassword.old ? 'text' : 'password'}
                                                name="oldPassword"
                                                value={passwords.oldPassword}
                                                onChange={handlePasswordChange}
                                                className="w-full px-6 py-4 rounded-2xl border outline-none transition-all focus:border-lime"
                                                style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                                placeholder="Old password..."
                                            />
                                            <button type="button" onClick={() => togglePasswordVisibility('old')} className="absolute right-6 top-1/2 -translate-y-1/2 text-dim hover:text-lime transition-colors">
                                                {showPassword.old ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t pt-10" style={{ borderColor: 'var(--border-main)' }}>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Proposed New Password</label>
                                            <div className="relative">
                                                <input 
                                                    type={showPassword.new ? 'text' : 'password'}
                                                    name="newPassword"
                                                    value={passwords.newPassword}
                                                    onChange={handlePasswordChange}
                                                    className="w-full px-6 py-4 rounded-2xl border outline-none transition-all focus:border-lime"
                                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                                    placeholder="Complex character mix recommended"
                                                />
                                                <button type="button" onClick={() => togglePasswordVisibility('new')} className="absolute right-6 top-1/2 -translate-y-1/2 text-dim hover:text-lime transition-colors">
                                                    {showPassword.new ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Re-confirm Identification</label>
                                            <div className="relative">
                                                <input 
                                                    type={showPassword.confirm ? 'text' : 'password'}
                                                    name="confirmPassword"
                                                    value={passwords.confirmPassword}
                                                    onChange={handlePasswordChange}
                                                    className="w-full px-6 py-4 rounded-2xl border outline-none transition-all focus:border-lime"
                                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                                    placeholder="Match previous input"
                                                />
                                                <button type="button" onClick={() => togglePasswordVisibility('confirm')} className="absolute right-6 top-1/2 -translate-y-1/2 text-dim hover:text-lime transition-colors">
                                                    {showPassword.confirm ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6">
                                        <button 
                                            type="submit" 
                                            disabled={isSubmittingPassword}
                                            className="px-10 py-5 rounded-[1.5rem] bg-lime text-black font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-2xl shadow-lime/20"
                                        >
                                            {isSubmittingPassword ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                                            Finalize Authentication Change
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* 2FA Placeholder Card */}
                            <div className="p-8 rounded-[3rem] border border-dashed flex flex-col md:flex-row items-center justify-between gap-6" style={{ background: 'rgba(200,230,0,0.02)', borderColor: 'var(--border-main)' }}>
                                <div className="flex items-center gap-6 text-center md:text-left">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/5 shadow-inner">
                                        <Shield size={24} className="text-dim opacity-50" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black" style={{ color: 'var(--text-main)' }}>Multi-Factor Authentication (MFA)</h4>
                                        <p className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Add an extra layer of protection using authenticator apps.</p>
                                    </div>
                                </div>
                                <button disabled className="px-8 py-3.5 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-dim cursor-not-allowed">
                                    Feature Restricted
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Appearance & Language Tab */}
                    {activeTab === 'appearance' && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            {/* Theme Selection */}
                            <div className="p-8 rounded-3xl border bg-card shadow-xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                <h3 className="text-xl font-black mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                    <Moon size={20} className="text-lime" style={{ color: 'var(--brand-lime)' }} />
                                    Appearance
                                </h3>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div 
                                        onClick={() => theme === 'dark' && toggleTheme()}
                                        className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center gap-4 ${theme === 'light' ? 'border-lime shadow-md' : 'border-transparent'}`}
                                        style={{ 
                                            background: theme === 'light' ? 'rgba(200,230,0,0.05)' : 'var(--bg-input)',
                                            borderColor: theme === 'light' ? 'var(--brand-lime)' : 'var(--border-main)'
                                        }}
                                    >
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white shadow-inner text-orange-500">
                                            <Sun size={24} />
                                        </div>
                                        <span className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>Light Mode</span>
                                        {theme === 'light' && <CheckCircle2 size={20} className="text-lime" style={{ color: 'var(--brand-lime)' }} />}
                                    </div>

                                    <div 
                                        onClick={() => theme === 'light' && toggleTheme()}
                                        className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center gap-4 ${theme === 'dark' ? 'border-lime shadow-md' : 'border-transparent'}`}
                                        style={{ 
                                            background: theme === 'dark' ? 'rgba(200,230,0,0.05)' : 'var(--bg-input)',
                                            borderColor: theme === 'dark' ? 'var(--brand-lime)' : 'var(--border-main)'
                                        }}
                                    >
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-zinc-800 shadow-inner text-blue-400">
                                            <Moon size={24} />
                                        </div>
                                        <span className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>Dark Mode</span>
                                        {theme === 'dark' && <CheckCircle2 size={20} className="text-lime" style={{ color: 'var(--brand-lime)' }} />}
                                    </div>
                                </div>
                            </div>

                            {/* Language Selection */}
                            <div className="p-8 rounded-3xl border bg-card shadow-xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                <h3 className="text-xl font-black mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                    <Globe size={20} className="text-lime" style={{ color: 'var(--brand-lime)' }} />
                                    System Language
                                </h3>
                                
                                <div className="space-y-3">
                                    <div 
                                        onClick={() => changeLanguage('en')}
                                        className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${i18n.language === 'en' ? 'border-lime bg-lime/5' : 'hover:bg-black/5'}`}
                                        style={{ 
                                            borderColor: i18n.language === 'en' ? 'var(--brand-lime)' : 'var(--border-main)',
                                            background: i18n.language === 'en' ? 'rgba(200,230,0,0.05)' : 'transparent'
                                        }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-2xl">🇺🇸</div>
                                            <div>
                                                <div className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>English</div>
                                                <div className="text-xs" style={{ color: 'var(--text-dim)' }}>Default system language</div>
                                            </div>
                                        </div>
                                        {i18n.language === 'en' && <CheckCircle2 size={20} style={{ color: 'var(--brand-lime)' }} />}
                                    </div>

                                    <div 
                                        onClick={() => changeLanguage('es')}
                                        className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${i18n.language === 'es' ? 'border-lime bg-lime/5' : 'hover:bg-black/5'}`}
                                        style={{ 
                                            borderColor: i18n.language === 'es' ? 'var(--brand-lime)' : 'var(--border-main)',
                                            background: i18n.language === 'es' ? 'rgba(200,230,0,0.05)' : 'transparent'
                                        }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-2xl">🇪🇸</div>
                                            <div>
                                                <div className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>Español</div>
                                                <div className="text-xs" style={{ color: 'var(--text-dim)' }}>Spanish localization</div>
                                            </div>
                                        </div>
                                        {i18n.language === 'es' && <CheckCircle2 size={20} style={{ color: 'var(--brand-lime)' }} />}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Operations Tab */}
                    {activeTab === 'operations' && (role === 'admin' || role === 'operationadmin') && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <div className="p-8 rounded-3xl border bg-card shadow-xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-black flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                                        <DollarSign size={20} className="text-lime" style={{ color: 'var(--brand-lime)' }} />
                                        Purchase Order Threshold
                                    </h3>
                                    <button 
                                        onClick={fetchThreshold}
                                        className="p-2 rounded-lg hover:bg-black/5 transition-colors"
                                        style={{ color: 'var(--text-dim)' }}
                                    >
                                        <RefreshCw size={18} className={loadingThreshold ? 'animate-spin' : ''} />
                                    </button>
                                </div>

                                {loadingThreshold ? (
                                    <div className="py-12 flex flex-col items-center gap-4">
                                        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--brand-lime)', borderTopColor: 'transparent' }}></div>
                                        <p className="text-sm font-medium animate-pulse" style={{ color: 'var(--text-dim)' }}>Fetching latest settings...</p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSaveThreshold} className="space-y-6">
                                        <div className="space-y-3">
                                            <label className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Minimum Approval Amount</label>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg transition-colors group-focus-within:text-lime" style={{ color: 'var(--text-dim)' }}>$</div>
                                                <input 
                                                    type="number"
                                                    value={threshold}
                                                    onChange={(e) => setThreshold(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-4 rounded-xl border outline-none transition-all focus:ring-2 focus:ring-lime/20 text-xl font-bold"
                                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                                                Purchase orders exceeding this amount will require manual review and high-level authorization before processing.
                                            </p>
                                        </div>

                                        {thresholdError && (
                                            <div className="p-4 rounded-xl flex items-center gap-3 text-sm bg-red-500/10 text-red-500 border border-red-500/20">
                                                <AlertTriangle size={18} /> {thresholdError}
                                            </div>
                                        )}

                                        {thresholdSuccess && (
                                            <div className="p-4 rounded-xl flex items-center gap-3 text-sm bg-green-500/10 text-green-500 border border-green-500/20">
                                                <CheckCircle2 size={18} /> Threshold updated successfully
                                            </div>
                                        )}

                                        <button 
                                            type="submit" 
                                            disabled={savingThreshold}
                                            className="px-8 py-3.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all hover:shadow-lg active:scale-95 disabled:opacity-50"
                                            style={{ background: 'var(--brand-lime)', color: '#000' }}
                                        >
                                            {savingThreshold ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                                            Save Threshold
                                        </button>
                                    </form>
                                )}
                            </div>

                            <div className="p-6 rounded-2xl border border-dashed flex items-start gap-4" style={{ background: 'rgba(200,230,0,0.02)', borderColor: 'var(--border-main)' }}>
                                <Shield size={20} style={{ color: 'var(--brand-lime)' }} className="mt-1 flex-shrink-0" />
                                <div>
                                    <h4 className="text-sm font-black mb-1" style={{ color: 'var(--text-main)' }}>Policy Enforcement</h4>
                                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                                        Changing the PO threshold will apply to all new purchase orders immediately. Existing pending orders will retain their original authorization requirements.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'banking' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <ManageBankAccounts />
                        </div>
                    )}
                </div>
        </div>
    );
};

export default DashboardSettings;
