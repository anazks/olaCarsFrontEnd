import { useState, useEffect } from 'react';
import { 
    Mail, Shield, MessageSquare, Send, AlertCircle, 
    Plus, Edit2, Trash2, CheckCircle2, XCircle, 
    Settings, Key, RefreshCw, Search, ArrowLeft,
    Check, X, Zap
} from 'lucide-react';
import { 
    getAllEmailConfigs, 
    createEmailConfig, 
    updateEmailConfig, 
    deleteEmailConfig, 
    assignEmailPurpose,
    type EmailConfig 
} from '../../../services/emailConfigService';
import { toast } from 'react-hot-toast';

const EmailSettings = () => {
    const [configs, setConfigs] = useState<EmailConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [selectedConfig, setSelectedConfig] = useState<EmailConfig | null>(null);
    const [saving, setSaving] = useState(false);

    // Form states
    const [email, setEmail] = useState('');
    const [label, setLabel] = useState('');
    const [purpose, setPurpose] = useState<EmailConfig['purpose']>('NONE');
    const [appPassword, setAppPassword] = useState('');

    const fetchConfigs = async () => {
        setLoading(true);
        try {
            const res = await getAllEmailConfigs();
            setConfigs(res.data.data || []);
        } catch (error: any) {
            toast.error('Failed to load email configurations');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    const resetForm = () => {
        setEmail('');
        setLabel('');
        setPurpose('NONE');
        setAppPassword('');
        setSelectedConfig(null);
    };

    const handleEdit = (config: EmailConfig) => {
        setSelectedConfig(config);
        setEmail(config.email);
        setLabel(config.label);
        setPurpose(config.purpose);
        setAppPassword(config.appPassword || '');
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const data = { email, label, purpose, appPassword };
            if (selectedConfig) {
                await updateEmailConfig(selectedConfig._id, data);
                toast.success('Configuration updated');
            } else {
                await createEmailConfig(data);
                toast.success('New email added');
            }
            setShowForm(false);
            resetForm();
            fetchConfigs();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Action failed');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this configuration?')) return;
        try {
            await deleteEmailConfig(id);
            toast.success('Email deleted');
            fetchConfigs();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const PurposeBadge = ({ purpose }: { purpose: string }) => {
        const styles: Record<string, string> = {
            ESCALATION: 'bg-red-500/10 text-red-500 border-red-500/20',
            GENERAL_ENQUIRY: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            COMPLAINT: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
            OUTGOING: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            NONE: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
        };

        const icons: Record<string, any> = {
            ESCALATION: <AlertCircle size={10} />,
            GENERAL_ENQUIRY: <MessageSquare size={10} />,
            COMPLAINT: <Shield size={10} />,
            OUTGOING: <Send size={10} />,
            NONE: <Mail size={10} />,
        };

        return (
            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 w-fit ${styles[purpose] || styles.NONE}`}>
                {icons[purpose]} {purpose.replace('_', ' ')}
            </span>
        );
    };

    return (
        <div className="flex-1 w-full space-y-8 animate-in fade-in duration-500">
            
            {/* Action Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                        <Mail size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter italic">Email <span className="text-indigo-500">Nexus</span></h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Configure System Communication Channels</p>
                    </div>
                </div>
                {!showForm && (
                    <button 
                        onClick={() => { resetForm(); setShowForm(true); }}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                    >
                        <Plus size={16} /> New Configuration
                    </button>
                )}
            </div>

            {/* Inline Config Form */}
            {showForm && (
                <div className="bg-white dark:bg-[#0A0A0A] border border-gray-200 dark:border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-indigo-500/5 animate-in slide-in-from-top-4 duration-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                        <Mail size={160} strokeWidth={1} />
                    </div>
                    
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-3">
                            <Zap className="text-indigo-500" size={20} />
                            <h3 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-widest italic">
                                {selectedConfig ? 'Edit' : 'Create'} System <span className="text-indigo-500">Relay</span>
                            </h3>
                        </div>
                        <button 
                            onClick={() => { setShowForm(false); resetForm(); }}
                            className="p-3 rounded-xl bg-gray-50 dark:bg-white/5 text-gray-400 hover:text-red-500 transition-all border border-transparent hover:border-red-500/20"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Friendly Label</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Primary Support Relay"
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Email Address</label>
                                <input 
                                    type="email" 
                                    placeholder="noreply@olacars.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">System Role / Purpose</label>
                                <select 
                                    value={purpose}
                                    onChange={(e) => setPurpose(e.target.value as any)}
                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white cursor-pointer"
                                >
                                    <option value="NONE">Unassigned / Backup</option>
                                    <option value="OUTGOING">Primary Outgoing Relay</option>
                                    <option value="ESCALATION">Critical Escalations</option>
                                    <option value="GENERAL_ENQUIRY">Customer Enquiries</option>
                                    <option value="COMPLAINT">Complaints Desk</option>
                                </select>
                            </div>

                            {purpose === 'OUTGOING' && (
                                <div className="space-y-2 p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 animate-pulse">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2">
                                        <Key size={12} /> App Password Required
                                    </label>
                                    <input 
                                        type="password" 
                                        placeholder="•••• •••• •••• ••••"
                                        value={appPassword}
                                        onChange={(e) => setAppPassword(e.target.value)}
                                        className="w-full bg-white dark:bg-black/40 border border-indigo-500/20 rounded-2xl px-6 py-4 text-sm font-black tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all dark:text-white"
                                        required={purpose === 'OUTGOING'}
                                    />
                                    <p className="text-[8px] text-gray-400 font-medium leading-tight mt-2 italic">
                                        Use a secure App Password for relay authorization.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="md:col-span-2 pt-6 flex items-center justify-end gap-4 border-t border-gray-100 dark:border-white/5">
                            <button 
                                type="button"
                                onClick={() => { setShowForm(false); resetForm(); }}
                                className="px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-all"
                            >
                                Discard Changes
                            </button>
                            <button 
                                type="submit"
                                disabled={saving}
                                className="px-10 py-4 bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-indigo-600 transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-3 disabled:opacity-50"
                            >
                                {saving ? <RefreshCw className="animate-spin" size={16} /> : <Check size={16} />}
                                {selectedConfig ? 'Update Entry' : 'Register Email'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Assignments Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {['ESCALATION', 'GENERAL_ENQUIRY', 'COMPLAINT', 'OUTGOING'].map((p) => {
                    const assigned = configs.find(c => c.purpose === p);
                    return (
                        <div key={p} className="bg-white dark:bg-[#0F0F0F] border border-gray-200 dark:border-white/5 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                                <Mail size={48} />
                            </div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${assigned ? 'bg-indigo-500 animate-pulse' : 'bg-gray-300'}`} />
                                {p.replace('_', ' ')}
                            </p>
                            <p className={`text-sm font-black truncate ${assigned ? 'text-gray-900 dark:text-white' : 'text-gray-400 italic'}`}>
                                {assigned ? assigned.email : 'Unassigned'}
                            </p>
                            {assigned && (
                                <p className="text-[8px] font-bold text-indigo-500 uppercase mt-1 tracking-tighter">
                                    Label: {assigned.label}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Config Table */}
            <div className="bg-white dark:bg-[#0F0F0F] border border-gray-200 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Master Config Registry</h3>
                    <div className="flex items-center gap-2">
                        <button onClick={fetchConfigs} className="p-2 text-gray-400 hover:text-indigo-500 transition-all">
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-white/[0.01]">
                                <th className="px-10 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 dark:border-white/5">Identity & Address</th>
                                <th className="px-10 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 dark:border-white/5">Functional Role</th>
                                <th className="px-10 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 dark:border-white/5">Status</th>
                                <th className="px-10 py-6 text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 dark:border-white/5 text-right">Operations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {loading && configs.length === 0 ? (
                                [1, 2, 3].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={4} className="px-10 py-8"><div className="h-4 bg-gray-100 dark:bg-white/5 rounded-full w-full" /></td>
                                    </tr>
                                ))
                            ) : configs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-24 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-20">
                                            <Mail size={64} strokeWidth={1} />
                                            <p className="text-sm font-black uppercase tracking-[0.3em]">No email records enstated</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                configs.map((config) => (
                                    <tr key={config._id} className="group hover:bg-gray-50 dark:hover:bg-white/[0.01] transition-all">
                                        <td className="px-10 py-7">
                                            <div className="flex items-center gap-5">
                                                <div className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 group-hover:text-indigo-500 group-hover:bg-indigo-500/10 transition-all border border-transparent group-hover:border-indigo-500/20 shadow-sm">
                                                    <Mail size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-gray-900 dark:text-white tracking-tight leading-none mb-1">{config.label}</p>
                                                    <p className="text-[11px] font-bold text-gray-400">{config.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-7">
                                            <PurposeBadge purpose={config.purpose} />
                                        </td>
                                        <td className="px-10 py-7">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${config.isActive ? 'bg-emerald-500 shadow-lg shadow-emerald-500/40' : 'bg-gray-300'}`} />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{config.isActive ? 'Live' : 'Inactive'}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-7 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <button 
                                                    onClick={() => handleEdit(config)}
                                                    className="p-3 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-500/10 transition-all border border-transparent hover:border-indigo-500/20"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(config._id)}
                                                    className="p-3 rounded-xl bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default EmailSettings;
