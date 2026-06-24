import { useState, useEffect } from 'react';
import { X, Settings, Calendar, Save, AlertCircle } from 'lucide-react';
import { getGenerationSettings, updateGenerationSettings, getReconfigProgress, type ReconfigProgress } from '../../../services/invoiceService';
import toast from 'react-hot-toast';

interface InvoiceSettingsModalProps {
    onClose: () => void;
}

const InvoiceSettingsModal = ({ onClose }: InvoiceSettingsModalProps) => {
    const [generationDay, setGenerationDay] = useState<number>(3);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [reconfiguring, setReconfiguring] = useState(false);
    const [progress, setProgress] = useState<ReconfigProgress | null>(null);

    const days = [
        { value: 0, label: 'Sunday' },
        { value: 1, label: 'Monday' },
        { value: 2, label: 'Tuesday' },
        { value: 3, label: 'Wednesday' },
        { value: 4, label: 'Thursday' },
        { value: 5, label: 'Friday' },
        { value: 6, label: 'Saturday' },
    ];

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await getGenerationSettings();
                setGenerationDay(data.generationDay);
            } catch (err) {
                console.error('Failed to load settings', err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateGenerationSettings(generationDay);
            setSaving(false);
            setReconfiguring(true);

            // Poll progress
            const interval = setInterval(async () => {
                try {
                    const prog = await getReconfigProgress();
                    setProgress(prog);
                    if (!prog.inProgress) {
                        clearInterval(interval);
                        setReconfiguring(false);
                        toast.success('Rent plans reconfigured successfully');
                        onClose();
                    }
                } catch (err) {
                    clearInterval(interval);
                    setReconfiguring(false);
                    toast.error('Failed to monitor configuration progress');
                }
            }, 600);
        } catch (err: any) {
            setSaving(false);
            toast.error(err.response?.data?.message || 'Failed to update settings');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md border shadow-2xl overflow-hidden rounded-[2rem]" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-lime/10 rounded-xl">
                            <Settings size={20} className="text-brand-lime" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black uppercase tracking-tight" style={{ color: 'var(--text-main)' }}>Invoice Automation</h2>
                            <p className="text-[10px] font-bold text-dim uppercase tracking-widest">Configure scheduled generation rules</p>
                        </div>
                    </div>
                    {!reconfiguring && (
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer" style={{ color: 'var(--text-dim)' }}>
                            <X size={18} />
                        </button>
                    )}
                </div>

                <div className="p-8 space-y-6">
                    {loading ? (
                        <div className="py-10 flex flex-col items-center justify-center gap-4">
                            <div className="w-8 h-8 border-4 border-brand-lime border-t-transparent rounded-full animate-spin" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-dim">Loading Preferences...</span>
                        </div>
                    ) : reconfiguring ? (
                        <div className="py-8 space-y-6 flex flex-col items-center justify-center">
                            <div className="relative flex items-center justify-center">
                                <div className="w-20 h-20 border-4 border-brand-lime/20 border-t-brand-lime rounded-full animate-spin" />
                                <span className="absolute text-[12px] font-black text-brand-lime">{progress?.percentage || 0}%</span>
                            </div>
                            <div className="text-center space-y-2">
                                <h3 className="text-sm font-black uppercase tracking-wider animate-pulse" style={{ color: 'var(--text-main)' }}>Reconfiguring Rent Plans</h3>
                                <p className="text-[10px] font-bold text-dim uppercase tracking-widest">
                                    {progress ? `Processing ${progress.processed} of ${progress.total} Drivers` : 'Preparing calculations...'}
                                </p>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden border border-white/10">
                                <div 
                                    className="bg-brand-lime h-full transition-all duration-300 ease-out" 
                                    style={{ width: `${progress?.percentage || 0}%` }}
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Calendar size={14} className="text-brand-lime" />
                                        <label className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Weekly Generation Day</label>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {days.map((day) => (
                                            <button
                                                key={day.value}
                                                onClick={() => setGenerationDay(day.value)}
                                                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer ${
                                                    generationDay === day.value 
                                                    ? 'bg-brand-lime text-black border-brand-lime shadow-lg' 
                                                    : 'bg-white/5 text-dim border-white/10 hover:bg-white/10'
                                                }`}
                                            >
                                                {day.label}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[9px] font-medium leading-relaxed opacity-60 px-1" style={{ color: 'var(--text-main)' }}>
                                        * The system will automatically generate invoices for all active drivers every week on the selected day at 01:00 AM.
                                    </p>
                                </div>

                                <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-3">
                                    <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />
                                    <p className="text-[10px] font-bold text-amber-200/70 leading-relaxed uppercase tracking-wider">
                                        Changing the day will affect the next scheduled run. It will not generate invoices for past weeks.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="w-full py-4 bg-brand-lime text-black font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all shadow-xl shadow-brand-lime/10 cursor-pointer flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} strokeWidth={3} />
                                        Save Configuration
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InvoiceSettingsModal;
