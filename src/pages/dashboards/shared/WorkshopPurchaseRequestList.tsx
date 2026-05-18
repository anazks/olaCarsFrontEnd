import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, FileText, AlertTriangle, Clock, CheckCircle, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { getWorkshopProcurementRequests, type ProcurementRequest, type PaginationMetadata } from '../../../services/workshopProcurementService';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

const StatusBadge = ({ status }: { status: ProcurementRequest['status'] }) => {
    const styles = {
        PENDING: {
            bg: 'rgba(245, 158, 11, 0.1)',
            text: '#f59e0b',
            border: 'rgba(245, 158, 11, 0.3)',
        },
        APPROVED: {
            bg: 'rgba(34, 197, 94, 0.1)',
            text: '#22c55e',
            border: 'rgba(34, 197, 94, 0.3)',
        },
        REJECTED: {
            bg: 'rgba(239, 68, 68, 0.1)',
            text: '#ef4444',
            border: 'rgba(239, 68, 68, 0.3)',
        },
        CONVERTED_TO_PO: {
            bg: 'rgba(59, 130, 246, 0.1)',
            text: '#3b82f6',
            border: 'rgba(59, 130, 246, 0.3)',
        }
    };
    const style = styles[status] || styles.APPROVED;
    return (
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-tighter w-fit"
            style={{ background: style.bg, color: style.text, borderColor: style.border }}>
            {status === 'CONVERTED_TO_PO' ? 'CONVERTED' : status}
        </div>
    );
};

const WorkshopPurchaseRequestList = () => {
    const { t } = useTranslation();
    
    // Data State
    const [requests, setRequests] = useState<ProcurementRequest[]>([]);
    
    // Status State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Pagination State
    const [pagination, setPagination] = useState<PaginationMetadata | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [limit] = useState(10); // Page size limit

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await getWorkshopProcurementRequests({
                page: currentPage,
                limit: limit,
                status: 'APPROVED',
                sortBy: 'updatedAt',
                sortOrder: 'desc'
            });
            setRequests(Array.isArray(response.data) ? response.data : []);
            setPagination(response.pagination);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch workshop purchase requests');
        } finally {
            setLoading(false);
        }
    }, [currentPage, limit]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handlePageChange = (newPage: number) => {
        if (pagination && newPage >= 1 && newPage <= pagination.totalPages) {
            setCurrentPage(newPage);
        }
    };

    return (
        <div className="container-responsive space-y-6">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Purchases', path: '#' }, { label: 'Workshop Purchase Requests', active: true }]} />

            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div>
                    <h1 className="text-lg font-bold tracking-tight flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <ShoppingBag size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        Workshop Purchase Requests
                    </h1>
                    <p className="text-xs font-medium text-dim mt-0.5">Approved spare parts and procurement requests from workshop branches</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchRequests}
                        className="flex items-center justify-center p-2 rounded-xl border transition-all hover:bg-white/5 active:scale-95 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-sm animate-in fade-in slide-in-from-left-2 duration-300" 
                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Table Section */}
            <div className="rounded-2xl overflow-hidden border transition-colors duration-300 shadow-2xl" 
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto">
                    {loading && requests.length === 0 ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-10 h-10 border-4 border-[#C8E600] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(200,230,0,0.3)]" />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-24" style={{ color: 'var(--text-dim)' }}>
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FileText size={40} className="opacity-20" />
                            </div>
                            <p className="text-xl font-black" style={{ color: 'var(--text-main)' }}>No Approved Requests Found</p>
                            <p className="text-sm mt-1 opacity-50">Workshop branches have not submitted any approved procurement requests yet.</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead>
                                <tr className="transition-colors duration-300" style={{ background: 'rgba(255,255,255,0.01)' }}>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Request No</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Part Details</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center" style={{ color: 'var(--text-dim)' }}>Quantity</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Unit Cost</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Total Cost</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Source Branch & Creator</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>Approval Details</th>
                                </tr>
                            </thead>
                            <tbody className={loading ? 'opacity-40 transition-opacity' : ''}>
                                {requests.map((req) => {
                                    const totalCost = (req.quantity || 0) * (req.part?.unitCost || 0);
                                    return (
                                        <tr
                                            key={req._id}
                                            className="border-t hover:bg-[#C8E600]/[0.02] transition-colors group"
                                            style={{ borderColor: 'var(--border-main)' }}
                                        >
                                            <td className="px-6 py-6 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-black text-sm text-[var(--text-main)]">
                                                        {req.requestNumber}
                                                    </span>
                                                    <StatusBadge status={req.status} />
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                                                        {req.part?.partName || 'Unknown Part'}
                                                    </span>
                                                    <span className="text-[10px] opacity-50 font-medium" style={{ color: 'var(--text-dim)' }}>
                                                        No: {req.part?.partNumber || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 text-center text-sm font-black" style={{ color: 'var(--text-main)' }}>
                                                {req.quantity}
                                            </td>
                                            <td className="px-6 py-6 text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                                                ${(req.part?.unitCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-6">
                                                <span className="text-sm font-black text-[var(--brand-lime)]" style={{ color: 'var(--brand-lime)' }}>
                                                    ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="space-y-0.5">
                                                    <div className="text-xs font-bold text-[var(--text-main)]">
                                                        📍 {req.branch?.name || 'Main Branch'}
                                                    </div>
                                                    <div className="text-[10px] opacity-60 text-[var(--text-dim)]">
                                                        By: {req.requestedBy?.fullName || 'Technician'} ({req.requestedByRole})
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="space-y-0.5">
                                                    <div className="text-xs font-bold text-[var(--text-main)]">
                                                        👤 {req.approvedBy?.fullName || 'Manager'}
                                                    </div>
                                                    <div className="text-[10px] opacity-40 text-[var(--text-dim)]">
                                                        {new Date(req.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} at {new Date(req.updatedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination Controls */}
                {pagination && (
                    <div className="px-8 py-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4" 
                        style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                        <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                            Showing {requests.length} of {pagination.total} requests
                        </div>
                        
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1 || loading}
                                    className="p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed group cursor-pointer"
                                    style={{ color: 'var(--text-main)' }}
                                >
                                    <ChevronLeft size={20} className="group-active:-translate-x-1 transition-transform" />
                                </button>
                                
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-black/20 rounded-2xl border border-white/5">
                                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                                        let pageNum = currentPage;
                                        if (pagination.totalPages <= 5) pageNum = i + 1;
                                        else if (currentPage <= 3) pageNum = i + 1;
                                        else if (currentPage >= pagination.totalPages - 2) pageNum = pagination.totalPages - 4 + i;
                                        else pageNum = currentPage - 2 + i;
                                        
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => handlePageChange(pageNum)}
                                                className={`w-10 h-10 rounded-xl text-xs font-black transition-all cursor-pointer ${currentPage === pageNum ? 'bg-[#C8E600] text-black shadow-lg shadow-lime/20 scale-110' : 'hover:bg-white/5 opacity-50 hover:opacity-100'}`}
                                                style={{ 
                                                    color: currentPage === pageNum ? '#000' : 'var(--text-main)' 
                                                }}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>
                                
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === pagination.totalPages || loading}
                                    className="p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all disabled:opacity-20 disabled:cursor-not-allowed group cursor-pointer"
                                    style={{ color: 'var(--text-main)' }}
                                >
                                    <ChevronRight size={20} className="group-active:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkshopPurchaseRequestList;
