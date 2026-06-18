import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ShieldAlert, 
    ArrowLeft, 
    Car, 
    User, 
    FileText, 
    Eye,
    PlusCircle
} from 'lucide-react';
import { getVehiclePolicyById } from '../../../services/insuranceService';
import type { VehiclePolicy } from '../../../services/insuranceService';
import { getAllDrivers } from '../../../services/driverService';
import type { Driver } from '../../../services/driverService';
import toast from 'react-hot-toast';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import { getUserRole } from '../../../utils/auth';
import { API_ROLE_TO_ROUTE } from '../../../services/authService';

const VehiclePolicyDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const role = getUserRole();
    const baseRoute = (role && API_ROLE_TO_ROUTE[role]) || '/admin/financial-admin';
    
    const [policy, setPolicy] = useState<VehiclePolicy | null>(null);
    const [driver, setDriver] = useState<Driver | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        if (!id) return;
        try {
            setLoading(true);
            const policyData = await getVehiclePolicyById(id);
            setPolicy(policyData);
            
            // Try to find if there is a driver assigned to this vehicle
            if (policyData.vehicle?._id) {
                try {
                    const driversRes = await getAllDrivers({ currentVehicle: policyData.vehicle?._id, limit: 1 });
                    const assignedDriver = (driversRes as any).data?.[0];
                    if (assignedDriver) {
                        setDriver(assignedDriver);
                    }
                } catch (dErr) {
                    console.error("Failed to load driver:", dErr);
                }
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || error.message || 'Failed to load policy details');
        } finally {
            setLoading(false);
        }
    };

    const getFullUrl = (path: string | undefined) => {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        const baseUrl = 'https://ola-cars-uploads-2026.s3.ap-south-1.amazonaws.com';
        return `${baseUrl}/${path.startsWith('/') ? path.slice(1) : path}`;
    };

    if (loading || !policy) {
        return (
            <div className="p-8 text-center animate-pulse flex flex-col items-center gap-4">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Vehicle Policy Detail', active: true }]} />

                <ShieldAlert size={32} className="animate-bounce text-dim opacity-50" />
                <span className="font-bold text-muted uppercase tracking-widest">Loading Policy Profile...</span>
            </div>
        );
    }

    const vehicle = policy.vehicle;
    const masterInsurance = policy.insurance;

    return (
        <div className="p-6 max-w-[1200px] mx-auto space-y-6">
            <button 
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-sm font-bold opacity-60 hover:opacity-100 transition-opacity"
            >
                <ArrowLeft size={16} /> Back to Policies
            </button>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-xl font-black flex items-center gap-3 tracking-tight" style={{ color: 'var(--text-main)' }}>
                        <ShieldAlert className="text-[#D4F12E]" size={32} />
                        Vehicle Policy Details
                    </h1>
                    <p className="mt-1 font-medium text-sm" style={{ color: 'var(--text-muted)' }}>
                        Detailed view of the insurance bound to {vehicle?.basicDetails?.registrationNumber || 'Vehicle'}
                    </p>
                </div>
                
                <button
                    onClick={() => navigate(`${baseRoute}/insurance-claims/new?vehicleId=${vehicle?._id}`)}
                    className="px-6 py-2.5 rounded-xl bg-[#D4F12E] text-black font-black uppercase tracking-widest text-sm hover:bg-[#c2dd2a] transition-all flex items-center gap-2"
                >
                    <PlusCircle size={18} /> File Claim
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Master Insurance */}
                <div className="bg-glass border rounded-2xl p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                        <FileText size={20} className="text-[#D4F12E]" />
                        Master Insurance Policy
                    </h2>
                    <div className="space-y-4 mt-4">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Provider</p>
                            <p className="font-bold text-lg">{typeof masterInsurance?.supplier === 'object' ? masterInsurance.supplier.name : 'Master Policy'}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Master Policy Number</p>
                            <p className="font-medium font-mono">{masterInsurance?.policyNumber || 'N/A'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Type</p>
                                <p className="font-medium">{masterInsurance?.policyType}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Coverage</p>
                                <p className="font-medium">{masterInsurance?.coverageType?.replace('_', ' ')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Specific Vehicle Policy */}
                <div className="bg-glass border rounded-2xl p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                        <ShieldAlert size={20} className="text-[#D4F12E]" />
                        Vehicle Coverage Details
                    </h2>
                    <div className="space-y-4 mt-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Policy Status</p>
                                <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                    policy.status === 'ACTIVE' ? '' : 'opacity-50'
                                }`} style={{ 
                                    background: policy.status === 'ACTIVE' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                    color: policy.status === 'ACTIVE' ? '#22c55e' : '#ef4444',
                                    borderColor: policy.status === 'ACTIVE' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'
                                }}>
                                    {policy.status || 'UNKNOWN'}
                                </span>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Insured Value</p>
                                <p className="font-bold text-xl text-white">${(policy.insuredValue || masterInsurance?.insuredValue || 0).toLocaleString()}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Vehicle Policy Number (If different)</p>
                            <p className="font-medium font-mono">{policy.policyNumber || 'Same as Master'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Start Date</p>
                                <p className="font-medium">{policy.startDate ? new Date(policy.startDate).toLocaleDateString() : 'N/A'}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Expiry Date</p>
                                <p className="font-medium">{policy.expiryDate ? new Date(policy.expiryDate).toLocaleDateString() : 'N/A'}</p>
                            </div>
                        </div>
                        {policy.certificate && (
                            <div className="pt-2">
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Certificate of Insurance</p>
                                <div className="flex gap-2">
                                    <a 
                                        href={getFullUrl(policy.certificate)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-sm font-bold"
                                    >
                                        <Eye size={16} /> View Certificate
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Vehicle & Renter Details */}
                <div className="space-y-6">
                    <div className="bg-glass border rounded-2xl p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                            <Car size={20} className="text-[#D4F12E]" />
                            Vehicle Details
                        </h2>
                        {vehicle ? (
                            <div className="space-y-3 mt-4">
                                <p className="font-bold text-lg">
                                    {vehicle?.basicDetails?.make || 'Unknown Make'} {vehicle?.basicDetails?.model || 'Unknown Model'} {vehicle?.basicDetails?.year ? `(${vehicle.basicDetails.year})` : ''}
                                </p>
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Registration Number</p>
                                    <p className="font-medium font-mono bg-white/5 px-2 py-1 rounded inline-block">{vehicle?.legalDocs?.registrationNumber || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Plate No</p>
                                    <p className="font-medium font-mono text-gray-400">{vehicle?.basicDetails?.vin || 'N/A'}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">Vehicle details not available.</p>
                        )}
                    </div>

                    <div className="bg-glass border rounded-2xl p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                            <User size={20} className="text-[#D4F12E]" />
                            Current Renter
                        </h2>
                        {driver ? (
                            <div className="space-y-3 mt-4">
                                <div className="flex items-center gap-4">
                                    {driver.personalInfo.photograph ? (
                                        <img src={getFullUrl(driver.personalInfo.photograph)} alt={driver.personalInfo.fullName} className="w-12 h-12 rounded-full object-cover border border-white/20" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-[#1A1A1A] border border-gray-800 flex items-center justify-center">
                                            <User size={24} className="text-gray-500" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-bold text-lg">{driver.personalInfo.fullName}</p>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase bg-green-500/10 text-green-500 border border-green-500/30">
                                            ACTIVE RENTAL
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 mt-4">Contact Info</p>
                                    <p className="font-medium text-sm">{driver.personalInfo.email}</p>
                                    <p className="font-medium text-sm">{driver.personalInfo.phone}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <User size={32} className="mx-auto text-gray-600 mb-2" />
                                <p className="text-gray-400 text-sm font-bold">No active driver assigned</p>
                                <p className="text-gray-500 text-xs mt-1">This vehicle is not currently rented.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default VehiclePolicyDetail;
