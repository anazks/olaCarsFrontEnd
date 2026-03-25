import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    AlertTriangle, FileText, CheckCircle2, 
    Car, Clock, ShieldCheck, ArrowRight 
} from 'lucide-react';
import { getUser } from '../../../utils/auth';
import agreementService from '../../../services/agreementService';

const DriverDashboard = () => {
    const navigate = useNavigate();
    const user = getUser();
    const [pendingAgreement, setPendingAgreement] = useState<{ id: string; title: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAgreements = async () => {
            if (!user?.id) return;
            try {
                // In a real scenario, we'd have an endpoint to get the latest pending agreement.
                // For now, we'll try to fetch agreements and check their status.
                // According to the guide, we should check verification status.
                const agreements = await agreementService.getAgreements();
                
                // Find the first published agreement that hasn't been signed by this driver
                for (const ag of agreements) {
                    if (ag.status === 'PUBLISHED') {
                        const { accepted } = await agreementService.verifySignature(user.id, ag._id);
                        if (!accepted) {
                            setPendingAgreement({ id: ag._id, title: ag.title });
                            break;
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to check agreement status:", err);
            } finally {
                setLoading(false);
            }
        };

        checkAgreements();
    }, [user?.id]);

    return (
        <div className="container-responsive space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                    Welcome, {user?.fullName || 'Driver'}!
                </h1>
                <p className="text-dim mt-2">Manage your vehicle, agreements, and active rental status.</p>
            </div>

            {/* Action Required Banner */}
            {!loading && pendingAgreement && (
                <div 
                    className="group relative overflow-hidden rounded-3xl border p-8 shadow-2xl shadow-brand-lime/10 transition-all hover:scale-[1.01]"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--brand-lime)' }}
                >
                    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <FileText size={120} className="text-brand-lime" />
                    </div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                        <div className="w-16 h-16 rounded-2xl bg-brand-lime/20 text-brand-lime flex items-center justify-center shrink-0">
                            <AlertTriangle size={32} />
                        </div>
                        
                        <div className="flex-1 text-center md:text-left space-y-2">
                            <h2 className="text-2xl font-black uppercase tracking-tight text-brand-lime">Action Required</h2>
                            <p className="text-lg text-white/80 font-medium">
                                Please sign your <span className="text-white font-bold">{pendingAgreement.title}</span> agreement to activate your vehicle and start earning.
                            </p>
                        </div>
                        
                        <button 
                            onClick={() => navigate(`/agreements/sign/${pendingAgreement.id}`)}
                            className="px-8 py-4 bg-brand-lime text-brand-black rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-brand-lime/20 transition-all hover:translate-x-2 active:scale-95"
                        >
                            Review & Sign <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            )}

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-3xl border p-6 space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                            <Car size={24} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 px-2 py-1 rounded-full">Active</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-dim">Current Vehicle</p>
                        <h3 className="text-xl font-bold mt-1">Toyota Corolla (KCB 123X)</h3>
                    </div>
                </div>

                <div className="rounded-3xl border p-6 space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                            <Clock size={24} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2 py-1 rounded-full">12 Months</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-dim">Lease Duration</p>
                        <h3 className="text-xl font-bold mt-1">Remaining: 245 Days</h3>
                    </div>
                </div>

                <div className="rounded-3xl border p-6 space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-green-500/10 text-green-400 flex items-center justify-center">
                            <ShieldCheck size={24} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-green-400 bg-green-500/10 px-2 py-1 rounded-full">Compliant</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-dim">Insurance Status</p>
                        <h3 className="text-xl font-bold mt-1">Fully Covered</h3>
                    </div>
                </div>
            </div>

            {/* Placeholder for Recent Activity */}
            <div className="rounded-3xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="p-6 border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <h3 className="font-black uppercase tracking-widest text-sm text-dim">Recent Activity</h3>
                </div>
                <div className="p-12 text-center space-y-4">
                    <CheckCircle2 size={48} className="mx-auto opacity-20 text-dim" />
                    <p className="font-bold text-dim uppercase tracking-widest text-xs">No recent updates on your account</p>
                </div>
            </div>
        </div>
    );
};

export default DriverDashboard;
