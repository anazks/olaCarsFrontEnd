import React, { useState, useEffect } from 'react';
import { getAllEnquiries, updateEnquiryStatus, deleteEnquiry } from '../../../services/enquiryService';
import { MessageSquare, Clock, CheckCircle, XCircle, Search, Filter, Trash2, Reply, User, Phone, Mail, MapPin, ShieldAlert, Info, ChevronRight, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getUser } from '../../../utils/auth';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const ComplaintsPage = () => {
    const user = getUser();
    const [enquiries, setEnquiries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [activeTab, setActiveTab] = useState<'COMPLAINT' | 'ENQUIRY'>('COMPLAINT');
    const [selectedEnquiry, setSelectedEnquiry] = useState<any>(null);
    const [responseMessage, setResponseMessage] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        fetchEnquiries();
    }, [user?.branchId, activeTab]);

    const fetchEnquiries = async () => {
        setLoading(true);
        try {
            const params: any = { type: activeTab };
            if (user?.role === 'BRANCHMANAGER' || user?.role === 'OPERATIONSTAFF') {
                params.branchId = user.branchId;
            }
            const res = await getAllEnquiries(params);
            setEnquiries(res.data || []);
        } catch (error) {
            console.error('Failed to fetch enquiries', error);
            toast.error('Failed to load records');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            setIsUpdating(true);
            await updateEnquiryStatus(id, { status, response: responseMessage });
            toast.success(`Ticket marked as ${status}`);
            setResponseMessage('');
            setSelectedEnquiry(null);
            fetchEnquiries();
        } catch (error) {
            toast.error('Failed to update status');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this record?')) return;
        try {
            await deleteEnquiry(id);
            toast.success('Record deleted');
            fetchEnquiries();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    const filteredEnquiries = enquiries.filter(e => {
        const matchesSearch = 
            e.name?.toLowerCase().includes(search.toLowerCase()) || 
            e.message?.toLowerCase().includes(search.toLowerCase()) ||
            e.identificationValue?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' || e.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'RESOLVED': return 'bg-green-500/10 text-green-600 border-green-500/20';
            case 'IN_PROGRESS': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
            case 'PENDING': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
            default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    return (
        <div className="container-responsive py-8 space-y-8 min-h-screen" style={{ color: 'var(--text-main)' }}>
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Complaints Page', active: true }]} />

            {/* Compact Header Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        {activeTab === 'COMPLAINT' ? (
                            <><ShieldAlert className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} size={20} /> Help Desk: Complaints</>
                        ) : (
                            <><MessageSquare className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} size={20} /> Support: General Enquiries</>
                        )}
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">
                        Processing {filteredEnquiries.length} {activeTab.toLowerCase()}s for {user?.branchName || 'your branch'}.
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex p-1 rounded-xl border bg-white/[0.02] backdrop-blur-md border-white/5" style={{ borderColor: 'var(--border-main)' }}>
                    <button
                        onClick={() => setActiveTab('COMPLAINT')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            activeTab === 'COMPLAINT' ? 'bg-brand-lime text-black shadow-md' : 'hover:text-brand-lime text-dim'
                        }`}
                        style={activeTab === 'COMPLAINT' ? { backgroundColor: 'var(--brand-lime)' } : {}}
                    >
                        Complaints
                    </button>
                    <button
                        onClick={() => setActiveTab('ENQUIRY')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            activeTab === 'ENQUIRY' ? 'bg-brand-lime text-black shadow-md' : 'hover:text-brand-lime text-dim'
                        }`}
                        style={activeTab === 'ENQUIRY' ? { backgroundColor: 'var(--brand-lime)' } : {}}
                    >
                        Queries
                    </button>
                </div>
            </div>

            {/* Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center">
                <div className="lg:col-span-2 relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dim group-focus-within:text-lime transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Quick search drivers, messages, or IDs..."
                        className="w-full border rounded-2xl py-3.5 pl-12 pr-4 text-[15px] focus:border-lime outline-none transition-all placeholder:text-gray-400 font-medium"
                        style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="relative group">
                    <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-dim group-focus-within:text-lime transition-colors" size={18} />
                    <select
                        className="w-full border rounded-2xl py-3.5 pl-12 pr-10 text-[15px] focus:border-lime outline-none appearance-none transition-all font-medium"
                        style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="ALL">All Status</option>
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">Processing</option>
                        <option value="RESOLVED">Resolved</option>
                    </select>
                    <ChevronRight size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-dim rotate-90" />
                </div>
                <div className="flex justify-end">
                    <button onClick={fetchEnquiries} className="px-6 py-3.5 rounded-2xl border font-black uppercase tracking-widest text-[10px] flex items-center gap-2 transition-all hover:bg-lime hover:text-black" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                        <Clock size={16} /> Sync Data
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="py-32 text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-lime border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-[10px] text-lime font-black uppercase tracking-[0.3em]">Processing Queue...</p>
                </div>
            ) : (
                <div className="rounded-[2rem] border overflow-hidden transition-all shadow-2xl shadow-black/20" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-dim">Driver Details</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-dim">Subject / Category</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-dim">Message Preview</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-dim text-center">Status</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-dim text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                {filteredEnquiries.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-24 text-center">
                                            <div className="space-y-4 opacity-40">
                                                <Info size={48} className="mx-auto" />
                                                <p className="text-sm font-bold uppercase tracking-widest">Zero {activeTab.toLowerCase()}s found</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredEnquiries.map((e) => (
                                        <React.Fragment key={e._id}>
                                            <tr className="hover:bg-lime/5 transition-colors group cursor-pointer" onClick={() => setSelectedEnquiry(selectedEnquiry === e._id ? null : e._id)}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-lime flex items-center justify-center text-black font-black text-sm">
                                                            {e.name?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{e.name}</p>
                                                            <p className="text-[10px] font-bold" style={{ color: 'var(--text-dim)' }}>{e.mobile}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        <p className="text-[11px] font-black text-lime uppercase tracking-widest">{e.category}</p>
                                                        <p className="text-[10px] font-medium" style={{ color: 'var(--text-dim)' }}>{new Date(e.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 max-w-xs">
                                                    <p className="text-sm truncate" style={{ color: 'var(--text-dim)' }}>{e.message}</p>
                                                    {e.identificationValue && (
                                                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-dim mt-1 inline-block border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                                            Ref: {e.identificationValue}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${getStatusStyle(e.status)}`}>
                                                        {e.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            className={`p-2 rounded-lg transition-all ${selectedEnquiry === e._id ? 'bg-lime text-black' : 'text-dim hover:text-white hover:bg-white/10'}`}
                                                            style={selectedEnquiry !== e._id ? { background: 'var(--bg-input)' } : {}}
                                                            title="Respond"
                                                        >
                                                            <Reply size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={(ev) => { ev.stopPropagation(); handleDelete(e._id); }}
                                                            className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Expandable Respond Section */}
                                            {selectedEnquiry === e._id && (
                                                <tr>
                                                    <td colSpan={5} className="px-8 py-8" style={{ background: 'var(--bg-sidebar)' }}>
                                                        <div className="max-w-4xl space-y-6 animate-in slide-in-from-top-2">
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                                <div className="space-y-4">
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-lime">Submission Details</p>
                                                                    <div className="p-4 rounded-2xl border" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                                                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>{e.message}</p>
                                                                    </div>
                                                                    {e.response && (
                                                                        <div className="p-4 rounded-2xl border border-lime/20 bg-lime/5">
                                                                            <p className="text-[10px] font-black uppercase tracking-widest text-lime mb-2">Previous Response</p>
                                                                            <p className="text-sm italic" style={{ color: 'var(--text-main)' }}>"{e.response}"</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="space-y-4">
                                                                    <p className="text-[10px] font-black uppercase tracking-widest text-lime">Action Center</p>
                                                                    <textarea
                                                                        className="w-full border rounded-2xl p-4 text-sm focus:border-lime outline-none resize-none font-medium"
                                                                        style={{ color: 'var(--text-main)', background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                                                        placeholder="Draft your reply..."
                                                                        rows={4}
                                                                        value={responseMessage}
                                                                        onChange={(ev) => setResponseMessage(ev.target.value)}
                                                                    />
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => handleUpdateStatus(e._id, 'RESOLVED')}
                                                                            disabled={isUpdating}
                                                                            className="flex-1 py-3 rounded-xl bg-lime text-black font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-all disabled:opacity-50"
                                                                        >
                                                                            Resolve Ticket
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleUpdateStatus(e._id, 'IN_PROGRESS')}
                                                                            disabled={isUpdating}
                                                                            className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] transition-all disabled:opacity-50"
                                                                        >
                                                                            Processing
                                                                        </button>
                                                                        <button
                                                                            onClick={() => setSelectedEnquiry(null)}
                                                                            className="px-4 py-3 rounded-xl border text-dim font-black uppercase tracking-widest text-[10px] hover:text-white transition-all"
                                                                            style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}
                                                                        >
                                                                            Close
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComplaintsPage;
