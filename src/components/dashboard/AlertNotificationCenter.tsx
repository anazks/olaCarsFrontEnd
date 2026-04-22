import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, Info, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import alertService from '../../services/alertService';
import type { Alert } from '../../services/alertService';
import { API_ROLE_TO_ROUTE } from '../../services/authService';
import { getUserRole } from '../../utils/auth';

const AlertNotificationCenter: React.FC = () => {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();
    const navigate = useNavigate();
    const role = getUserRole();

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const data = await alertService.getActiveAlerts();
            setAlerts(data);
        } catch (error) {
            console.error('Failed to fetch alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
        // Poll for alerts every 5 minutes
        const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleResolve = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        try {
            await alertService.resolveAlert(id);
            setAlerts(prev => prev.filter(a => a._id !== id));
        } catch (error) {
            console.error('Failed to resolve alert:', error);
        }
    };

    const handleAlertClick = (alert: Alert) => {
        if (role) {
            const basePath = API_ROLE_TO_ROUTE[role];
            if (basePath && alert.vehicleId) {
                navigate(`${basePath}/vehicles/${alert.vehicleId._id}`);
                setIsOpen(false);
            }
        }
    };

    const getIcon = (type: string, priority: string) => {
        const color = priority === 'HIGH' ? 'var(--status-failed)' : (priority === 'MEDIUM' ? '#FFA500' : 'var(--text-dim)');
        switch (type) {
            case 'MAINTENANCE': return <AlertTriangle size={18} style={{ color }} />;
            case 'INSURANCE': return <Calendar size={18} style={{ color }} />;
            default: return <Info size={18} style={{ color }} />;
        }
    };

    return (
        <div className="relative" ref={panelRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center p-2 rounded-full hover:bg-white/5 transition-colors cursor-pointer text-gray-400 hover:text-lime relative"
                title={t('common.alerts') || 'Alerts'}
            >
                <Bell size={20} />
                {alerts.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-[var(--bg-topbar)]">
                        {alerts.length > 9 ? '9+' : alerts.length}
                    </span>
                )}
            </button>

            {isOpen && (
                <div 
                    className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200"
                    style={{ 
                        background: 'var(--bg-card)', 
                        border: '1px solid var(--border-main)',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                    }}
                >
                    <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                        <h3 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>
                            {t('common.notifications') || 'Notifications'}
                        </h3>
                        <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--bg-main)', color: 'var(--text-dim)' }}>
                            {alerts.length} New
                        </span>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                        {loading && alerts.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-3">
                                <div className="w-6 h-6 border-2 border-lime border-t-transparent rounded-full animate-spin" />
                                <p className="text-xs text-dim">Loading alerts...</p>
                            </div>
                        ) : alerts.length > 0 ? (
                            alerts.map((alert) => (
                                <div
                                    key={alert._id}
                                    onClick={() => handleAlertClick(alert)}
                                    className="px-5 py-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer group flex gap-4"
                                >
                                    <div className="mt-1 flex-shrink-0">
                                        {getIcon(alert.type, alert.priority)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: alert.priority === 'HIGH' ? 'var(--status-failed)' : 'var(--text-dim)' }}>
                                                {alert.type}
                                            </p>
                                            <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>
                                                {new Date(alert.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--text-main)' }}>
                                            {alert.message}
                                        </p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ background: 'rgba(200, 230, 0, 0.1)', color: 'var(--brand-lime)' }}>
                                                {alert.vehicleId?.basicDetails?.vin || 'Unknown Vehicle'}
                                            </span>
                                            <button
                                                onClick={(e) => handleResolve(e, alert._id)}
                                                className="text-[11px] font-semibold text-dim hover:text-lime flex items-center gap-1 transition-colors"
                                            >
                                                <CheckCircle2 size={12} />
                                                Resolve
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 flex flex-col items-center justify-center gap-3 opacity-40">
                                <Bell size={32} />
                                <p className="text-sm">No active alerts</p>
                            </div>
                        )}
                    </div>

                    <div className="px-5 py-3 bg-white/[0.02] border-t border-white/5 flex justify-center">
                        <button 
                            className="text-[11px] font-bold uppercase tracking-widest text-dim hover:text-lime transition-colors"
                            onClick={() => setIsOpen(false)}
                        >
                            Close Panel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AlertNotificationCenter;
