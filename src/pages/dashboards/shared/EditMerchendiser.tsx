import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
    getMerchendiserById,
    updateMerchendiser,
    type UpdateMerchendisePayload
} from '../../../services/merchendiseService';
import PermissionSelector from '../../../components/common/PermissionSelector';
import { getUser, getUserRole } from '../../../utils/auth';

const EditMerchendiser = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'permissions'>('details');

    const [formData, setFormData] = useState({
        id: '',
        fullName: '',
        email: '',
        phone: '',
        password: '',
        status: 'ACTIVE',
        permissions: [] as string[]
    });

    const user = getUser();
    const role = getUserRole();
    const isAdmin = role === 'admin';
    const userPermissions = user?.permissions || [];

    useEffect(() => {
        if (id) loadData(id);
    }, [id]);

    const loadData = async (staffId: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await getMerchendiserById(staffId);
            setFormData({
                id: data._id,
                fullName: data.fullName,
                email: data.email,
                phone: data.phone || '',
                password: '',
                status: data.status,
                permissions: data.permissions || []
            });
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load details');
            toast.error('Failed to load details');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        try {
            const payload: UpdateMerchendisePayload = {
                id: formData.id,
                fullName: formData.fullName,
                email: formData.email,
                phone: formData.phone,
                status: formData.status as any,
                permissions: formData.permissions
            };
            if (formData.password) payload.password = formData.password;
            await updateMerchendiser(payload);
            toast.success('Merchandiser updated successfully');
            navigate(-1);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update');
            toast.error('Failed to update');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 size={32} className="animate-spin text-brand-lime" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fadeInUp">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/5 transition-colors border" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>Edit Merchandiser</h1>
                    <p className="text-sm opacity-60">Update details and permissions</p>
                </div>
            </div>

            <div className="glass-card p-6 border shadow-xl rounded-2xl" style={{ borderColor: 'var(--border-main)' }}>
                <div className="flex gap-4 border-b mb-6 transition-colors" style={{ borderColor: 'var(--border-main)' }}>
                    <button onClick={() => setActiveTab('details')} className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'details' ? 'border-brand-lime text-brand-lime' : 'border-transparent text-dim'}`}>
                        {t('management.common.tabs.details', { defaultValue: 'Basic Details' })}
                    </button>
                    <button onClick={() => setActiveTab('permissions')} className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'permissions' ? 'border-brand-lime text-brand-lime' : 'border-transparent text-dim'}`}>
                        {t('management.common.tabs.permissions', { defaultValue: 'Permissions' })}
                        {formData.permissions.length > 0 && (
                            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-brand-lime text-black text-[10px] font-black">{formData.permissions.length}</span>
                        )}
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {activeTab === 'details' ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Full Name</label>
                                    <input type="text" required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="w-full px-4 py-3 rounded-xl outline-none text-sm focus:ring-2 focus:ring-lime" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Email</label>
                                    <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-3 rounded-xl outline-none text-sm focus:ring-2 focus:ring-lime" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Phone</label>
                                    <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full px-4 py-3 rounded-xl outline-none text-sm focus:ring-2 focus:ring-lime" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium" style={{ color: 'var(--text-dim)' }}>New Password (Optional)</label>
                                    <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" className="w-full px-4 py-3 rounded-xl outline-none text-sm focus:ring-2 focus:ring-lime" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }} />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Status</label>
                                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-3 rounded-xl outline-none text-sm focus:ring-2 focus:ring-lime appearance-none cursor-pointer" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}>
                                        <option value="ACTIVE">Active</option>
                                        <option value="SUSPENDED">Suspended</option>
                                        <option value="LOCKED">Locked</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <PermissionSelector userPermissions={userPermissions} selectedPermissions={formData.permissions} isAdmin={isAdmin} onChange={(perms) => setFormData({ ...formData, permissions: perms })} />
                        </div>
                    )}

                    {error && <div className="text-red-400 text-sm p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>{error}</div>}

                    <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 rounded-xl text-sm font-medium cursor-pointer transition-all hover:bg-white/5 border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>Cancel</button>
                        <button type="submit" disabled={saving} className="px-8 py-3 rounded-xl text-sm font-bold cursor-pointer transition-all flex items-center justify-center disabled:opacity-60 hover:shadow-lg hover:-translate-y-0.5" style={{ background: 'var(--brand-lime)', color: '#0A0A0A' }}>
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <><Save size={16} className="mr-2" /> Save Changes</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditMerchendiser;
