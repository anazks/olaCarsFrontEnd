import { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, Search, Car, AlertTriangle, Eye } from 'lucide-react';
import { getAllVehicles } from '../../../services/vehicleService';
import type { Vehicle, VehicleStatus } from '../../../services/vehicleService';
import { useNavigate } from 'react-router-dom';
import { getUserRole } from '../../../utils/auth';

// ── Status Badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    'PENDING ENTRY': { bg: 'rgba(245,158,11,0.1)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
    'DOCUMENTS REVIEW': { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
    'INSURANCE VERIFICATION': { bg: 'rgba(139,92,246,0.1)', text: '#8b5cf6', border: 'rgba(139,92,246,0.3)' },
    'INSPECTION REQUIRED': { bg: 'rgba(236,72,153,0.1)', text: '#ec4899', border: 'rgba(236,72,153,0.3)' },
    'INSPECTION FAILED': { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
    'REPAIR IN PROGRESS': { bg: 'rgba(249,115,22,0.1)', text: '#f97316', border: 'rgba(249,115,22,0.3)' },
    'ACCOUNTING SETUP': { bg: 'rgba(20,184,166,0.1)', text: '#14b8a6', border: 'rgba(20,184,166,0.3)' },
    'GPS ACTIVATION': { bg: 'rgba(6,182,212,0.1)', text: '#06b6d4', border: 'rgba(6,182,212,0.3)' },
    'BRANCH MANAGER APPROVAL': { bg: 'rgba(168,85,247,0.1)', text: '#a855f7', border: 'rgba(168,85,247,0.3)' },
    'ACTIVE — AVAILABLE': { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' },
    'ACTIVE — RENTED': { bg: 'rgba(34,197,94,0.1)', text: '#16a34a', border: 'rgba(34,197,94,0.3)' },
    'ACTIVE — MAINTENANCE': { bg: 'rgba(249,115,22,0.1)', text: '#f97316', border: 'rgba(249,115,22,0.3)' },
    'SUSPENDED': { bg: 'rgba(239,68,68,0.1)', text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
    'TRANSFER PENDING': { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6', border: 'rgba(59,130,246,0.3)' },
    'TRANSFER COMPLETE': { bg: 'rgba(34,197,94,0.1)', text: '#22c55e', border: 'rgba(34,197,94,0.3)' },
    'RETIRED': { bg: 'rgba(107,114,128,0.1)', text: '#6b7280', border: 'rgba(107,114,128,0.3)' },
};

const StatusBadge = ({ status }: { status: VehicleStatus }) => {
    const style = STATUS_STYLES[status] || STATUS_STYLES['PENDING ENTRY'];
    return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
            style={{ background: style.bg, color: style.text, borderColor: style.border }}>
            {status}
        </div>
    );
};

// ── Filter Tabs ───────────────────────────────────────────────────────────────

type FilterTab = 'ALL' | 'ONBOARDING' | 'ACTIVE' | 'SUSPENDED' | 'RETIRED';

const ONBOARDING_STATUSES: VehicleStatus[] = [
    'PENDING ENTRY', 'DOCUMENTS REVIEW', 'INSURANCE VERIFICATION',
    'INSPECTION REQUIRED', 'INSPECTION FAILED', 'REPAIR IN PROGRESS',
    'ACCOUNTING SETUP', 'GPS ACTIVATION', 'BRANCH MANAGER APPROVAL',
];
const ACTIVE_STATUSES: VehicleStatus[] = ['ACTIVE — AVAILABLE', 'ACTIVE — RENTED', 'ACTIVE — MAINTENANCE', 'TRANSFER PENDING', 'TRANSFER COMPLETE'];

// ── Component ─────────────────────────────────────────────────────────────────

const VehicleList = () => {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
    const navigate = useNavigate();

    const fetchVehicles = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAllVehicles();
            setVehicles(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch vehicles');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchVehicles();
    }, [fetchVehicles]);

    const filtered = vehicles.filter((v) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
            v.basicDetails.vin.toLowerCase().includes(q) ||
            v.basicDetails.make.toLowerCase().includes(q) ||
            v.basicDetails.model.toLowerCase().includes(q);

        let matchesTab = true;
        if (activeTab === 'ONBOARDING') matchesTab = ONBOARDING_STATUSES.includes(v.status);
        else if (activeTab === 'ACTIVE') matchesTab = ACTIVE_STATUSES.includes(v.status);
        else if (activeTab === 'SUSPENDED') matchesTab = v.status === 'SUSPENDED';
        else if (activeTab === 'RETIRED') matchesTab = v.status === 'RETIRED';

        return matchesSearch && matchesTab;
    });

    const tabs: { key: FilterTab; label: string; count: number }[] = [
        { key: 'ALL', label: 'All', count: vehicles.length },
        { key: 'ONBOARDING', label: 'Onboarding', count: vehicles.filter(v => ONBOARDING_STATUSES.includes(v.status)).length },
        { key: 'ACTIVE', label: 'Active', count: vehicles.filter(v => ACTIVE_STATUSES.includes(v.status)).length },
        { key: 'SUSPENDED', label: 'Suspended', count: vehicles.filter(v => v.status === 'SUSPENDED').length },
        { key: 'RETIRED', label: 'Retired', count: vehicles.filter(v => v.status === 'RETIRED').length },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
                        <Car size={28} style={{ color: '#C8E600' }} />
                        Vehicles
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>Manage vehicle onboarding and fleet lifecycle</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchVehicles}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-muted)' }}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    {['countrymanager', 'branchmanager'].includes(getUserRole() || '') && (
                        <button
                            onClick={() => navigate('create')}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
                            style={{ background: '#C8E600', color: '#0A0A0A' }}
                        >
                            <Plus size={18} /> Add Vehicle
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)' }}>
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer"
                        style={{
                            background: activeTab === tab.key ? 'rgba(200,230,0,0.15)' : 'transparent',
                            color: activeTab === tab.key ? '#C8E600' : 'var(--text-dim)',
                            fontWeight: activeTab === tab.key ? 700 : 500,
                        }}
                    >
                        {tab.label}
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                            background: activeTab === tab.key ? 'rgba(200,230,0,0.2)' : 'var(--bg-sidebar)',
                            color: activeTab === tab.key ? '#C8E600' : 'var(--text-dim)',
                        }}>
                            {tab.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                    type="text"
                    placeholder="Search by VIN, make, or model..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl outline-none text-sm transition-colors focus:ring-2 focus:ring-lime"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                />
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Table */}
            <div className="rounded-2xl overflow-hidden border transition-colors duration-300" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-2 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-20" style={{ color: 'var(--text-dim)' }}>
                            <Car size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-medium">No vehicles found</p>
                            <p className="text-sm mt-1">Try adjusting your filters or add a new vehicle</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b transition-colors duration-300" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Vehicle</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>VIN</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Year</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Category</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Price</th>
                                    <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((v) => (
                                    <tr
                                        key={v._id}
                                        className="border-b last:border-0 hover:bg-white/5 transition-colors cursor-pointer"
                                        style={{ borderColor: 'var(--border-main)' }}
                                        onClick={() => navigate(v._id)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-bold" style={{ color: 'var(--text-main)' }}>
                                                {v.basicDetails.make} {v.basicDetails.model}
                                            </div>
                                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                                                {v.basicDetails.colour || ''} · {v.basicDetails.fuelType}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-mono" style={{ color: 'var(--text-main)' }}>{v.basicDetails.vin}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm" style={{ color: 'var(--text-main)' }}>{v.basicDetails.year}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm" style={{ color: 'var(--text-main)' }}>{v.basicDetails.category}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={v.status} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                                                {v.purchaseDetails.currency} {v.purchaseDetails.purchasePrice.toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); navigate(v._id); }}
                                                    className="p-2 rounded-lg transition-colors cursor-pointer hover:bg-lime/20"
                                                    style={{ background: 'rgba(200,230,0,0.1)', color: '#C8E600' }}
                                                    title="View Details"
                                                >
                                                    <Eye size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VehicleList;
