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
            setDrivers(data);
        } catch (error) {
            console.error('Error fetching drivers:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-100 text-green-700';
            case 'REJECTED': return 'bg-red-100 text-red-700';
            case 'PENDING_APPLICATION': return 'bg-yellow-100 text-yellow-700';
            case 'TRIAL_PERIOD': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const filteredDrivers = drivers.filter(driver => {
        const matchesSearch = (driver.firstName + ' ' + driver.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
            driver.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || driver.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Driver Management</h1>
                    <p className="text-gray-500">Monitor and manage driver onboarding applications</p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search name or email..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-lime/20 focus:border-brand-lime"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <select
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-lime/20 focus:border-brand-lime appearance-none bg-white font-medium"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="PENDING_APPLICATION">Pending Application</option>
                        <option value="CREDIT_CHECK_REQUIRED">Credit Check</option>
                        <option value="INTERVIEW_SCHEDULED">Interview</option>
                        <option value="TRIAL_PERIOD">Trial Period</option>
                        <option value="APPROVED">Approved</option>
                        <option value="REJECTED">Rejected</option>
                    </select>
                </div>
            </div>

            {/* Drivers Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Driver</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">License</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Applied</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4 h-16 bg-gray-50/50"></td>
                                    </tr>
                                ))
                            ) : filteredDrivers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Users size={40} className="text-gray-300" />
                                            <p>No drivers found matching your criteria</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredDrivers.map((driver) => (
                                    <tr
                                        key={driver.id}
                                        className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                        onClick={() => navigate(driver.id)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-brand-lime/10 flex items-center justify-center font-bold text-brand-lime border border-brand-lime/20 transition-all group-hover:scale-110">
                                                    {driver.firstName[0]}{driver.lastName[0]}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900 group-hover:text-brand-lime transition-colors">
                                                        {driver.firstName} {driver.lastName}
                                                    </div>
                                                    <div className="text-xs text-gray-500">{driver.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(driver.status)}`}>
                                                {driver.status.replace(/_/g, ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <FileText size={14} />
                                                {driver.licenseNumber}
                                            </div>
                                            <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mt-0.5">Exp: {new Date(driver.licenseExpiry).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                                <Calendar size={14} className="text-gray-400" />
                                                {new Date(driver.appliedAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-all text-gray-400 hover:text-gray-600">
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
