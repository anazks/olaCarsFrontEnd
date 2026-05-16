import { useState, useEffect } from 'react';
import { ShieldAlert, Search, PlusCircle, Filter, Eye } from 'lucide-react';
import { getClaims } from '../../../services/insuranceClaimService';
import type { InsuranceClaim } from '../../../services/insuranceClaimService';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const InsuranceClaimsView = () => {
    const navigate = useNavigate();
    const [claims, setClaims] = useState<InsuranceClaim[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const claimsRes = await getClaims();
            setClaims(claimsRes.data || []);
        } catch (error: any) {
            toast.error(error.message || 'Failed to fetch claims');
        } finally {
            setLoading(false);
        }
    };

    const filteredClaims = claims.filter(c => 
        c.claimNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.policyNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="p-8 text-center animate-pulse flex flex-col items-center gap-4">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Insurance Claims View', active: true }]} />

                <ShieldAlert size={32} className="animate-bounce text-dim opacity-50" />
                <span className="font-bold text-muted uppercase tracking-widest">Loading Claims...</span>
            </div>
        );
    }

    return (
        <div className="max-w-[1400px] mx-auto space-y-6">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Insurance Claims View', active: true }]} />

            {/* Compact Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <ShieldAlert size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        Insurance Claims
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">Track and manage all system-wide vehicle insurance claims.</p>
                </div>
                
                <button
                    onClick={() => navigate('/admin/financial-admin/insurance-claims/new')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide bg-brand-lime text-[#0A0A0A] transition-all hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                    style={{ backgroundColor: 'var(--brand-lime)' }}
                >
                    <PlusCircle size={14} strokeWidth={3} />
                    File Manual Claim
                </button>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-glass p-4 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="relative flex-1 md:max-w-md">
                    <input
                        type="text"
                        placeholder="Search by claim number, policy number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full border py-3 pl-10 pr-4 rounded-xl font-medium text-sm shadow-sm outline-none transition-all"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50" style={{ color: 'var(--text-dim)' }} />
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-3 rounded-xl border font-bold text-sm bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                        <Filter size={16} /> Filters
                    </button>
                    <select className="px-4 py-3 rounded-xl border font-bold text-sm bg-transparent outline-none appearance-none cursor-pointer" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                        <option value="all" style={{ background: 'var(--bg-card)' }}>All Statuses</option>
                        <option value="active" style={{ background: 'var(--bg-card)' }}>Open Claims</option>
                        <option value="closed" style={{ background: 'var(--bg-card)' }}>Closed Claims</option>
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto w-full border rounded-xl shadow-sm" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-card)' }}>
                <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead style={{ backgroundColor: 'var(--bg-input)' }}>
                        <tr className="text-[11px] font-black uppercase tracking-wider opacity-60 border-b" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                            <th className="py-4 px-6">Claim #</th>
                            <th className="py-4 px-6">Status</th>
                            <th className="py-4 px-6">Policy Number</th>
                            <th className="py-4 px-6 text-right">Amount</th>
                            <th className="py-4 px-6 text-right">Incident Date</th>
                            <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y" style={{ borderColor: 'var(--border-main)' }}>
                        {filteredClaims.map((claim) => (
                            <tr key={claim._id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => navigate(`/admin/financial-admin/insurance-claims/${claim._id}`)}>
                                <td className="py-4 px-6 font-bold text-[#D4F12E]">{claim.claimNumber}</td>
                                <td className="py-4 px-6">
                                    <span className={`px-2.5 py-1 rounded text-[10px] font-black tracking-widest uppercase ${
                                        claim.status === 'CLOSED' ? 'bg-gray-500/10 text-gray-500' :
                                        claim.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' :
                                        claim.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                                        claim.status === 'PAYMENT_RECEIVED' ? 'bg-blue-500/10 text-blue-500' :
                                        'bg-yellow-500/10 text-yellow-500'
                                    }`}>
                                        • {claim.status}
                                    </span>
                                </td>
                                <td className="py-4 px-6 font-medium opacity-80">{claim.policyNumber}</td>
                                <td className="py-4 px-6 font-bold text-right">${claim.claimAmount.toLocaleString()}</td>
                                <td className="py-4 px-6 font-medium opacity-80 text-right">{new Date(claim.incidentDate).toLocaleDateString()}</td>
                                <td className="py-4 px-6 flex items-center justify-end gap-2">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/financial-admin/insurance-claims/${claim._id}`); }}
                                        className="px-3 py-1.5 rounded bg-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-colors flex items-center gap-1"
                                    >
                                        <Eye size={12} /> View
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {filteredClaims.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-12 text-center text-sm font-bold opacity-50 uppercase tracking-widest">
                                    No Claims Found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Pagination Placeholder */}
            <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                    <select className="px-3 py-1.5 rounded-lg border font-bold text-sm bg-transparent outline-none appearance-none cursor-pointer shadow-sm" style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                        <option value="15" style={{ background: 'var(--bg-card)' }}>15 ˅</option>
                        <option value="50" style={{ background: 'var(--bg-card)' }}>50 ˅</option>
                    </select>
                </div>
                <div className="flex items-center gap-1 text-sm font-bold">
                    <button className="px-2.5 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5 opacity-50 cursor-not-allowed">{'<'}</button>
                    <button className="px-2.5 py-1 rounded bg-[#D4F12E] text-black">01</button>
                    <button className="px-2.5 py-1 rounded hover:bg-black/5 dark:hover:bg-white/5">{'>'}</button>
                </div>
            </div>
        </div>
    );
};

export default InsuranceClaimsView;
