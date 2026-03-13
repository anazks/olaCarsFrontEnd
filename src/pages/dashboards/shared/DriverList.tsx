import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Filter, Plus, FileText, ChevronRight, Calendar } from 'lucide-react';
import { driverService } from '../../../services/driverService';
import type { Driver } from '../../../services/driverService';

const DriverList = () => {
    const navigate = useNavigate();
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    useEffect(() => {
        fetchDrivers();
    }, []);

    const fetchDrivers = async () => {
        try {
            setLoading(true);
            const data = await driverService.getAllDrivers();
            console.log(data,'data');
            
            setDrivers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching drivers:', error);
            setDrivers([]);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE':
            case 'APPROVED': return 'bg-green-100 text-green-700';
            case 'REJECTED':
            case 'SUSPENDED': return 'bg-red-100 text-red-700';
            case 'PENDING REVIEW':
            case 'VERIFICATION':
            case 'CREDIT CHECK': 
            case 'MANAGER REVIEW':
            case 'CONTRACT PENDING': return 'bg-yellow-100 text-yellow-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const filteredDrivers = drivers.filter(driver => {
        const fullName = driver.personalInfo?.fullName || '';
        const email = driver.personalInfo?.email || '';
        
        const matchesSearch = fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || driver.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>Driver Management</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Monitor and manage driver onboarding applications</p>
                </div>
                <button
                    onClick={() => navigate('new')}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-brand-lime text-black font-semibold rounded-lg hover:bg-opacity-90 transition-all"
                >
                    <Plus size={20} />
                    New Application
                </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl shadow-sm border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search name or email..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-lime/20 focus:border-brand-lime transition-colors"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <select
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-lime/20 focus:border-brand-lime appearance-none font-medium transition-colors"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="DRAFT">Draft</option>
                        <option value="PENDING REVIEW">Pending Review</option>
                        <option value="VERIFICATION">Verification</option>
                        <option value="CREDIT CHECK">Credit Check</option>
                        <option value="MANAGER REVIEW">Manager Review</option>
                        <option value="APPROVED">Approved</option>
                        <option value="CONTRACT PENDING">Contract Pending</option>
                        <option value="ACTIVE">Active</option>
                        <option value="SUSPENDED">Suspended</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                </div>
            </div>

            {/* Drivers Table */}
            <div className="rounded-xl shadow-sm border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="border-b" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'var(--border-main)' }}>
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Driver</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Status</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>License</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Applied</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-right" style={{ color: 'var(--text-dim)' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4 h-16" style={{ backgroundColor: 'rgba(255,255,255,0.01)' }}></td>
                                    </tr>
                                ))
                            ) : filteredDrivers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center" style={{ color: 'var(--text-dim)' }}>
                                        <div className="flex flex-col items-center gap-2">
                                            <Users size={40} style={{ opacity: 0.2 }} />
                                            <p>No drivers found matching your criteria</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredDrivers.map((driver) => (
                                    <tr
                                        key={driver._id}
                                        className="transition-colors cursor-pointer group"
                                        style={{ borderBottom: '1px solid var(--border-main)' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        onClick={() => navigate(driver._id)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all group-hover:scale-110" style={{ backgroundColor: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)', border: '1px solid rgba(200,230,0,0.2)' }}>
                                                    {(driver.personalInfo?.fullName?.[0] || 'D')}
                                                </div>
                                                <div>
                                                    <div className="font-semibold transition-colors" style={{ color: 'var(--text-main)' }}>
                                                        {driver.personalInfo?.fullName}
                                                    </div>
                                                    <div className="text-xs" style={{ color: 'var(--text-dim)' }}>{driver.personalInfo?.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(driver.status)}`}>
                                                {driver.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                         <td className="px-6 py-4">
                                             <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                                                 <FileText size={14} />
                                                 {driver.drivingLicense?.licenseNumber || 'N/A'}
                                             </div>
                                             <div className="text-[10px] uppercase tracking-wider font-bold mt-0.5" style={{ color: 'var(--text-dim)' }}>Exp: {driver.drivingLicense?.expiryDate ? new Date(driver.drivingLicense.expiryDate).toLocaleDateString() : 'N/A'}</div>
                                         </td>
                                         <td className="px-6 py-4">
                                             <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
                                                 <Calendar size={14} style={{ color: 'var(--text-dim)' }} />
                                                 {new Date(driver.appliedAt).toLocaleDateString()}
                                             </div>
                                         </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 rounded-lg transition-all" style={{ color: 'var(--text-dim)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-main)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-dim)'}>
                                                <ChevronRight size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DriverList;
