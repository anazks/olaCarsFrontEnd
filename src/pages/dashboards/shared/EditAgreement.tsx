import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Save, ArrowLeft, Info, AlertTriangle, ShieldCheck, 
    Globe, FileText, Copy, Hash 
} from 'lucide-react';
import agreementService from '../../../services/agreementService';
import AgreementEditor from '../../../components/agreements/AgreementEditor';
import toast from 'react-hot-toast';

const EditAgreement = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEdit = Boolean(id);

    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        country: 'US',
        type: 'TERMS_AND_CONDITIONS',
        content: '',
        status: 'DRAFT'
    });
    const [placeholders, setPlaceholders] = useState<string[]>([]);

    useEffect(() => {
        const loadInitialData = async () => {
            if (isEdit && id) {
                try {
                    const data = await agreementService.getAgreement(id);
                    setFormData({
                        title: data.title,
                        country: data.country,
                        type: data.type,
                        content: data.content,
                        status: data.status
                    });
                } catch (err: any) {
                    setError('Failed to load agreement');
                    toast.error('Could not fetch agreement details');
                } finally {
                    setLoading(false);
                }
            }
            
            try {
                const tags = await agreementService.getPlaceholders();
                setPlaceholders(tags);
            } catch (err) {
                console.error('Failed to fetch placeholders');
            }
        };
        loadInitialData();
    }, [id, isEdit]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.content) {
            toast.error('Title and content are required');
            return;
        }

        setSaving(true);
        try {
            if (isEdit && id) {
                await agreementService.updateAgreement(id, formData);
                toast.success('Agreement updated successfully');
            } else {
                await agreementService.createAgreement(formData);
                toast.success('Agreement created successfully');
            }
            navigate('..');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to save agreement');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="w-12 h-12 border-4 border-lime border-t-transparent rounded-full animate-spin" />
                <p className="text-dim animate-pulse">Loading Agreement...</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('..')}
                        className="p-3 rounded-2xl border hover:bg-white/5 text-dim transition-all"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                            {isEdit ? 'Edit Agreement' : 'Create New Agreement'}
                        </h1>
                        <p className="text-dim">
                            {isEdit ? `Modifying versioned document ${formData.title}` : 'Set up a new legal or system policy'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        type="button"
                        onClick={() => navigate('..')}
                        className="flex-1 md:flex-none px-6 py-3 rounded-2xl font-bold border transition-all hover:bg-white/5"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-10 py-3 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                        style={{ background: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                    >
                        {saving ? (
                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save size={20} />
                                {isEdit ? 'Save Changes' : 'Create Agreement'}
                            </>
                        )}
                    </button>
                </div>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left Panel: Settings */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="rounded-3xl border p-6 space-y-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 text-lime uppercase text-[10px] font-black tracking-widest">
                            <Info size={14} /> Basic Settings
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-dim">Agreement Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Terms of Service"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-lime transition-all"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-dim">Country</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" size={16} />
                                    <select
                                        value={formData.country}
                                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                        className="w-full pl-10 pr-10 py-3 rounded-xl border outline-none appearance-none cursor-pointer"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <option value="US">USA (US)</option>
                                        <option value="IN">India (IN)</option>
                                        <option value="KE">Kenya (KE)</option>
                                        <option value="NG">Nigeria (NG)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-dim">Type</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border outline-none"
                                    style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                >
                                    <option value="TERMS_AND_CONDITIONS">Terms & Conditions</option>
                                    <option value="PRIVACY_POLICY">Privacy Policy</option>
                                    <option value="RETURN_POLICY">Return Policy</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-dim">Status</label>
                                <div className="flex gap-2">
                                    {['DRAFT', 'PUBLISHED', 'ARCHIVED'].map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, status: s })}
                                            className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                                                formData.status === s 
                                                    ? (s === 'PUBLISHED' ? 'bg-green-500/20 border-green-500/50 text-green-500' : 
                                                       s === 'DRAFT' ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500' :
                                                       'bg-red-500/20 border-red-500/50 text-red-500')
                                                    : 'border-white/5 text-dim hover:bg-white/5'
                                            }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {isEdit && (
                        <div className="rounded-3xl border p-6 bg-blue-500/5 border-blue-500/20 space-y-3">
                            <div className="flex items-center gap-2 text-blue-400 uppercase text-[10px] font-black tracking-widest">
                                <ShieldCheck size={14} /> Version Control
                            </div>
                            <p className="text-xs text-blue-100/60 leading-relaxed">
                                Editing this agreement will create a new version. 
                                Previous content will be archived in the history collection.
                            </p>
                        </div>
                    )}
                </div>

                {/* Middle Panel: Editor */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="rounded-3xl border p-1 h-full min-h-[600px] flex flex-col" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-card)' }}>
                        <div className="px-6 py-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-2 text-lime uppercase text-[10px] font-black tracking-widest">
                                <FileText size={14} /> Document Content
                            </div>
                        </div>
                        <div className="flex-1 p-4">
                            <AgreementEditor 
                                content={formData.content} 
                                onChange={(html) => setFormData({ ...formData, content: html })} 
                            />
                        </div>
                    </div>
                </div>

                {/* Right Panel: Placeholders */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="rounded-3xl border p-6 space-y-6 sticky top-8" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center gap-2 text-blue-400 uppercase text-[10px] font-black tracking-widest">
                            <Hash size={14} /> Available Tags
                        </div>
                        <p className="text-xs text-dim leading-relaxed">
                            Click to copy tags and paste them into the editor to create dynamic content.
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                            {placeholders.map((tag) => (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(`{{${tag}}}`);
                                        toast.success(`Copied {{${tag}}}`);
                                    }}
                                    className="flex items-center justify-between px-3 py-2 rounded-xl border bg-white/5 border-white/5 hover:border-lime/30 text-left transition-all group"
                                >
                                    <span className="text-xs font-mono text-lime">{"{{" + tag + "}}"}</span>
                                    <Copy size={12} className="text-dim opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))}
                            {placeholders.length === 0 && (
                                <div className="text-center py-8 text-dim text-xs">
                                    No tags available
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </form>

            {error && (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500">
                    <AlertTriangle size={20} />
                    <span className="text-sm font-medium">{error}</span>
                </div>
            )}
        </div>
    );
};

export default EditAgreement;
