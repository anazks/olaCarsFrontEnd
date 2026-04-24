import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Info, Calendar, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import alertService from '../../../services/alertService';
import type { Alert } from '../../../services/alertService';
import { getUserRole } from '../../../utils/auth';
import { API_ROLE_TO_ROUTE } from '../../../services/authService';

const NotificationsPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const role = getUserRole();

    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const data = await alertService.getAllAlerts();
            setAlerts(data);
        } catch (error) {
            console.error('Failed to fetch alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    const handleResolve = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await alertService.resolveAlert(id);
            // Re-fetch to get updated status and resolved timestamps
            fetchAlerts();
        } catch (error) {
            console.error('Failed to resolve alert:', error);
        }
    };

    const handleAlertClick = (alert: Alert) => {
        if (role) {
            const basePath = API_ROLE_TO_ROUTE[role];
            if (basePath && alert.vehicleId) {
                navigate(`${basePath}/vehicles/${alert.vehicleId._id}`);
            }
        }
    };

    const getIcon = (type: string, priority: string, status: string) => {
        if (status === 'RESOLVED') {
            return <CheckCircle2 size={24} style={{ color: 'var(--brand-lime)' }} />;
        }
        const color = priority === 'HIGH' ? 'var(--status-failed)' : (priority === 'MEDIUM' ? '#FFA500' : 'var(--text-dim)');
        switch (type) {
            case 'MAINTENANCE': return <AlertTriangle size={24} style={{ color }} />;
            case 'INSURANCE': return <Calendar size={24} style={{ color }} />;
            default: return <Info size={24} style={{ color }} />;
        }
    };

    const filteredAlerts = alerts.filter(alert => {
        if (filter === 'ALL') return true;
        return alert.status === filter;
    });

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-main">{t('common.notifications') || 'Notifications'}</h1>
                    <p className="text-dim text-sm mt-1">Manage and view all your system alerts.</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 border-b border-white/5 pb-4">
                {(['ALL', 'ACTIVE', 'RESOLVED'] as const).map(status => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            filter === status 
                            ? 'bg-lime text-black shadow-lg shadow-lime/20' 
                            : 'text-dim hover:text-main hover:bg-white/5'
                        }`}
                    >
                        {status.charAt(0) + status.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>

            {/* Notifications List */}
            <div className="space-y-4">
                {loading && alerts.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <div className="w-8 h-8 border-4 border-lime border-t-transparent rounded-full animate-spin" />
                        <p className="text-dim text-sm tracking-wide">Loading notifications...</p>
                    </div>
                ) : filteredAlerts.length > 0 ? (
                    <div className="grid gap-4">
                        {filteredAlerts.map(alert => (
                            <div
                                key={alert._id}
                                onClick={() => handleAlertClick(alert)}
                                className={`p-5 rounded-2xl border transition-all cursor-pointer flex gap-5 ${
                                    alert.status === 'RESOLVED'
                                    ? 'bg-white/[0.01] border-white/5 opacity-70'
                                    : 'bg-card border-white/10 hover:border-lime/30 shadow-sm hover:shadow-lg'
                                }`}
                            >
                                <div className="mt-1 flex-shrink-0">
                                    {getIcon(alert.type, alert.priority, alert.status)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-3">
                                            <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md ${
                                                alert.priority === 'HIGH' ? 'bg-red-500/10 text-red-500' : 
                                                alert.priority === 'MEDIUM' ? 'bg-orange-500/10 text-orange-500' : 
                                                'bg-white/5 text-dim'
                                            }`}>
                                                {alert.type}
                                            </span>
                                            {alert.status === 'ACTIVE' && (
                                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-lime/10 text-lime border border-lime/20">
                                                    New
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs font-medium text-dim">
                                            {new Date(alert.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-base text-main mb-3 leading-relaxed">
                                        {alert.message}
                                    </p>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4 pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white/5 text-dim">
                                                Vehicle: <span className="text-main">{alert.vehicleId?.basicDetails?.vin || 'Unknown'}</span>
                                            </span>
                                            {alert.vehicleId?.basicDetails?.make && (
                                                <span className="text-xs font-medium px-3 py-1.5 rounded-lg bg-white/5 text-dim">
                                                    {alert.vehicleId.basicDetails.make} {alert.vehicleId.basicDetails.model}
                                                </span>
                                            )}
                                        </div>
                                        {alert.status === 'ACTIVE' && (
                                            <button
                                                onClick={(e) => handleResolve(e, alert._id)}
                                                className="text-sm font-semibold text-main hover:text-black hover:bg-lime border border-white/10 hover:border-lime transition-all px-4 py-2 rounded-lg flex items-center gap-2"
                                            >
                                                <CheckCircle2 size={16} />
                                                Mark as Resolved
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 flex flex-col items-center justify-center gap-4 bg-white/[0.02] rounded-2xl border border-white/5 border-dashed">
                        <Bell size={48} className="text-dim opacity-50" />
                        <div className="text-center">
                            <p className="text-main font-medium text-lg">No notifications found</p>
                            <p className="text-dim text-sm mt-1">You're all caught up!</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
