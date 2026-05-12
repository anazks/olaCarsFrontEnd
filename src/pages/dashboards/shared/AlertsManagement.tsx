import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
    AlertTriangle, AlertCircle, Clock, Search, Filter, CheckCircle, 
    Car, Calendar, MapPin, Building2, RefreshCw, ArrowLeft, Eye
} from 'lucide-react';
import type { Alert } from '../../../services/alertService';
import alertService from '../../../services/alertService';
import { getAllBranches } from '../../../services/branchService';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

type SeverityTab = 'ALL' | 'CRITICAL' | 'MAJOR' | 'MINOR';

const AlertsManagement = () => {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<SeverityTab>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCountry, setFilterCountry] = useState('all');
    const [filterBranch, setFilterBranch] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('ACTIVE');

    // Date range defaults to last 1 month
    const todayStr = new Date().toISOString().split('T')[0];
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const oneMonthAgoStr = oneMonthAgo.toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(oneMonthAgoStr);
    const [endDate, setEndDate] = useState(todayStr);

    useEffect(() => {
        fetchData();
    }, [filterStatus]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [alertRes, branchRes] = await Promise.allSettled([
                filterStatus === 'ACTIVE' 
                    ? alertService.getActiveAlerts() 
                    : alertService.getAllAlerts({ status: filterStatus !== 'all' ? filterStatus : undefined }),
                getAllBranches({ limit: 200 })
            ]);

            if (alertRes.status === 'fulfilled') {
                setAlerts(alertRes.value || []);
            }
            if (branchRes.status === 'fulfilled' && branchRes.value?.data) {
                setBranches(branchRes.value.data);
            }
        } catch (err) {
            console.error('Failed to fetch alerts:', err);
            toast.error('Failed to load alerts');
        } finally {
            setLoading(false);
        }
    };

    const handleResolve = async (id: string) => {
        try {
            await alertService.resolveAlert(id);
            toast.success('Alert resolved successfully');
            fetchData();
        } catch (err) {
            toast.error('Failed to resolve alert');
        }
    };

    // Derive unique countries from alerts' own data (populated branchId) + branches API
    const countriesFromAlerts = alerts.map((a: any) => a.country || a.branchId?.country).filter(Boolean);
    const countriesFromBranches = branches.map((b: any) => b.country).filter(Boolean);
    const countries = [...new Set([...countriesFromAlerts, ...countriesFromBranches])];

    // Filter alerts
    const filteredAlerts = alerts.filter(alert => {
        // Date range filter
        const alertDate = new Date(alert.createdAt);
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (alertDate < start) return false;
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (alertDate > end) return false;
        }

        // Severity tab
        if (activeTab === 'CRITICAL' && alert.priority !== 'HIGH') return false;
        if (activeTab === 'MAJOR' && alert.priority !== 'MEDIUM') return false;
        if (activeTab === 'MINOR' && alert.priority !== 'LOW') return false;

        // Country filter - use alert's own country or populated branchId.country
        if (filterCountry !== 'all') {
            const alertCountry = alert.country || alert.branchId?.country;
            if (alertCountry !== filterCountry) return false;
        }

        // Branch filter - compare by _id (works whether branchId is populated or raw ObjectId)
        if (filterBranch !== 'all') {
            const alertBranchId = typeof (alert as any).branchId === 'object' 
                ? (alert as any).branchId?._id?.toString() 
                : (alert as any).branchId?.toString();
            if (alertBranchId !== filterBranch) return false;
        }

        // Type filter
        if (filterType !== 'all' && alert.type !== filterType) return false;

        // Search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchMessage = alert.message?.toLowerCase().includes(q);
            const matchVehicle = alert.vehicleId?.basicDetails?.make?.toLowerCase().includes(q) 
                || alert.vehicleId?.basicDetails?.model?.toLowerCase().includes(q)
                || alert.vehicleId?.basicDetails?.vin?.toLowerCase().includes(q);
            if (!matchMessage && !matchVehicle) return false;
        }

        return true;
    });

    // Counts for tabs
    const dateFiltered = alerts.filter(a => {
        const d = new Date(a.createdAt);
        if (startDate) { const s = new Date(startDate); s.setHours(0,0,0,0); if (d < s) return false; }
        if (endDate) { const e = new Date(endDate); e.setHours(23,59,59,999); if (d > e) return false; }
        return true;
    });
    const criticalCount = dateFiltered.filter(a => a.priority === 'HIGH').length;
    const majorCount = dateFiltered.filter(a => a.priority === 'MEDIUM').length;
    const minorCount = dateFiltered.filter(a => a.priority === 'LOW').length;

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'HIGH': return { bg: '#fef2f2', text: '#dc2626', badge: '#ef4444' };
            case 'MEDIUM': return { bg: '#fff7ed', text: '#ea580c', badge: '#f97316' };
            case 'LOW': return { bg: '#eef2ff', text: '#4338ca', badge: '#4f46e5' };
            default: return { bg: '#f9fafb', text: '#6b7280', badge: '#9ca3af' };
        }
    };

    const getPriorityLabel = (priority: string) => {
        switch (priority) {
            case 'HIGH': return 'Critical';
            case 'MEDIUM': return 'Major';
            case 'LOW': return 'Minor';
            default: return priority;
        }
    };

    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'HIGH': return <AlertTriangle size={14} />;
            case 'MEDIUM': return <AlertCircle size={14} />;
            case 'LOW': return <Clock size={14} />;
            default: return <AlertCircle size={14} />;
        }
    };

    // Derive branch options from alerts' populated branchId + branches API
    const branchNamesFromAlerts = alerts
        .map((a: any) => a.branchId ? { name: a.branchId.name, country: a.branchId.country, _id: a.branchId._id } : null)
        .filter(Boolean);
    const allBranchOptions = [...branches, ...branchNamesFromAlerts];
    // Deduplicate by name
    const uniqueBranches = allBranchOptions.filter((b: any, i: number, arr: any[]) => 
        b.name && arr.findIndex((x: any) => x.name === b.name) === i
    );
    const filteredBranches = filterCountry !== 'all' 
        ? uniqueBranches.filter((b: any) => b.country === filterCountry) 
        : uniqueBranches;

    return (
        <div className="p-6 min-h-screen" style={{ backgroundColor: 'var(--bg-main)' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-xl transition-all hover:scale-105 cursor-pointer"
                        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
                            Alerts Control Center
                        </h1>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
                            Monitor and manage system alerts across all branches
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-lime text-black rounded-xl text-sm font-bold transition-all hover:bg-lime/90 disabled:opacity-50 cursor-pointer"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Total */}
                <div 
                    onClick={() => setActiveTab('ALL')}
                    className={`rounded-2xl p-5 shadow-sm border cursor-pointer transition-all hover:scale-[1.02] ${activeTab === 'ALL' ? 'ring-2 ring-lime' : ''}`}
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#f0fdf4', color: '#22c55e' }}>
                            <Eye size={20} />
                        </div>
                        <span className="text-3xl font-bold" style={{ color: 'var(--text-main)' }}>{dateFiltered.length}</span>
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Total Alerts</span>
                </div>

                {/* Critical */}
                <div 
                    onClick={() => setActiveTab('CRITICAL')}
                    className={`rounded-2xl p-5 shadow-sm border cursor-pointer transition-all hover:scale-[1.02] ${activeTab === 'CRITICAL' ? 'ring-2 ring-[#ef4444]' : ''}`}
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#fef2f2] text-[#ef4444]">
                            <AlertTriangle size={20} />
                        </div>
                        <span className="text-3xl font-bold" style={{ color: '#ef4444' }}>{criticalCount}</span>
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Critical Alerts</span>
                </div>

                {/* Major */}
                <div 
                    onClick={() => setActiveTab('MAJOR')}
                    className={`rounded-2xl p-5 shadow-sm border cursor-pointer transition-all hover:scale-[1.02] ${activeTab === 'MAJOR' ? 'ring-2 ring-[#f97316]' : ''}`}
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#fff7ed] text-[#f97316]">
                            <AlertCircle size={20} />
                        </div>
                        <span className="text-3xl font-bold" style={{ color: '#f97316' }}>{majorCount}</span>
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Major Alerts</span>
                </div>

                {/* Minor */}
                <div 
                    onClick={() => setActiveTab('MINOR')}
                    className={`rounded-2xl p-5 shadow-sm border cursor-pointer transition-all hover:scale-[1.02] ${activeTab === 'MINOR' ? 'ring-2 ring-[#4f46e5]' : ''}`}
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#eef2ff] text-[#4f46e5]">
                            <Clock size={20} />
                        </div>
                        <span className="text-3xl font-bold" style={{ color: '#4f46e5' }}>{minorCount}</span>
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Minor Alerts</span>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="rounded-2xl p-4 shadow-sm border mb-6 flex flex-wrap items-center gap-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <Filter size={16} style={{ color: 'var(--text-dim)' }} />

                {/* Date Range */}
                <div className="flex items-center gap-2">
                    <Calendar size={14} style={{ color: 'var(--text-dim)' }} />
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-1.5 border rounded-lg text-xs outline-none font-bold"
                        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>to</span>
                    <input
                        type="date"
                        value={endDate}
                        max={todayStr}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-1.5 border rounded-lg text-xs outline-none font-bold"
                        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                </div>

                <div className="w-px h-6" style={{ backgroundColor: 'var(--border-main)' }} />

                {/* Country */}
                <div className="flex items-center gap-1">
                    <MapPin size={14} style={{ color: 'var(--text-dim)' }} />
                    <select
                        value={filterCountry}
                        onChange={(e) => { setFilterCountry(e.target.value); setFilterBranch('all'); }}
                        className="px-3 py-1.5 border rounded-lg text-xs outline-none font-bold cursor-pointer"
                        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <option value="all">All Countries</option>
                        {countries.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                {/* Branch */}
                <div className="flex items-center gap-1">
                    <Building2 size={14} style={{ color: 'var(--text-dim)' }} />
                    <select
                        value={filterBranch}
                        onChange={(e) => setFilterBranch(e.target.value)}
                        className="px-3 py-1.5 border rounded-lg text-xs outline-none font-bold cursor-pointer"
                        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <option value="all">All Branches</option>
                        {filteredBranches.map((b: any) => (
                            <option key={b._id} value={b._id}>{b.name}</option>
                        ))}
                    </select>
                </div>

                {/* Alert Type */}
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-1.5 border rounded-lg text-xs outline-none font-bold cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                >
                    <option value="all">All Types</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="INSURANCE">Insurance</option>
                    <option value="REGISTRATION">Registration</option>
                    <option value="OTHER">Other</option>
                </select>

                {/* Status */}
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-1.5 border rounded-lg text-xs outline-none font-bold cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                >
                    <option value="ACTIVE">Active</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="DISMISSED">Dismissed</option>
                    <option value="all">All Statuses</option>
                </select>

                <div className="flex-1" />

                {/* Search */}
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
                    <input
                        type="text"
                        placeholder="Search alerts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 pr-3 py-1.5 border rounded-lg text-xs outline-none w-48 font-medium"
                        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                </div>
            </div>

            {/* Results Count */}
            <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: 'var(--text-dim)' }}>
                    Showing {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''}
                    {activeTab !== 'ALL' && ` · ${activeTab.charAt(0) + activeTab.slice(1).toLowerCase()}`}
                </span>
            </div>

            {/* Alert Cards */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="w-10 h-10 border-4 border-[#148F85] border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filteredAlerts.length === 0 ? (
                <div className="rounded-2xl p-12 shadow-sm border text-center" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <CheckCircle size={48} className="mx-auto mb-4" style={{ color: '#22c55e' }} />
                    <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-main)' }}>No Alerts Found</h3>
                    <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
                        No alerts match the current filters. Try adjusting the date range or filters.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {filteredAlerts.map((alert) => {
                        const colors = getPriorityColor(alert.priority);
                        const vehicle = alert.vehicleId;
                        return (
                            <div
                                key={alert._id}
                                className="rounded-2xl p-5 shadow-sm border transition-all hover:shadow-md"
                                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4 flex-1">
                                        {/* Priority Badge */}
                                        <div 
                                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                            style={{ backgroundColor: colors.bg, color: colors.badge }}
                                        >
                                            {getPriorityIcon(alert.priority)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            {/* Alert Message */}
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span 
                                                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                                                    style={{ backgroundColor: colors.bg, color: colors.badge }}
                                                >
                                                    {getPriorityLabel(alert.priority)}
                                                </span>
                                                <span 
                                                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                                                    style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-dim)' }}
                                                >
                                                    {alert.type}
                                                </span>
                                                {alert.status === 'RESOLVED' && (
                                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#f0fdf4] text-[#22c55e]">
                                                        Resolved
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm font-bold mb-2" style={{ color: 'var(--text-main)' }}>
                                                {alert.message}
                                            </p>

                                            {/* Vehicle Info */}
                                            {vehicle && (
                                                <div className="flex items-center gap-4 flex-wrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <Car size={12} style={{ color: 'var(--text-dim)' }} />
                                                        <span className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                                                            {vehicle.basicDetails?.make} {vehicle.basicDetails?.model} ({vehicle.basicDetails?.year})
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs" style={{ color: 'var(--text-dim)' }}>VIN:</span>
                                                        <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                                                            {vehicle.basicDetails?.vin}
                                                        </span>
                                                    </div>
                                                    {(alert.branchId?.name || vehicle.purchaseDetails?.branch?.name) && (
                                                        <div className="flex items-center gap-1.5">
                                                            <Building2 size={12} style={{ color: 'var(--text-dim)' }} />
                                                            <span className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                                                                {alert.branchId?.name || vehicle.purchaseDetails?.branch?.name}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {(alert.country || alert.branchId?.country) && (
                                                        <div className="flex items-center gap-1.5">
                                                            <MapPin size={12} style={{ color: 'var(--text-dim)' }} />
                                                            <span className="text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                                                                {alert.country || alert.branchId?.country}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right side: date + resolve */}
                                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                        <span className="text-[11px] font-medium" style={{ color: 'var(--text-dim)' }}>
                                            {new Date(alert.createdAt).toLocaleDateString('en-US', { 
                                                month: 'short', day: 'numeric', year: 'numeric' 
                                            })}
                                        </span>
                                        {alert.status === 'ACTIVE' && (
                                            <button
                                                onClick={() => handleResolve(alert._id)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 cursor-pointer"
                                                style={{ backgroundColor: '#f0fdf4', color: '#22c55e' }}
                                            >
                                                <CheckCircle size={12} /> Resolve
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AlertsManagement;
