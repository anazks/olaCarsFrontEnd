import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Calendar, Briefcase, FileText, ChevronLeft, Building2, ShieldCheck, ChevronRight } from 'lucide-react';
import { driverService } from '../../../services/driverService';
import { getAllBranches } from '../../../services/branchService';

const CreateDriver = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [branches, setBranches] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        licenseNumber: '',
        licenseExpiry: '',
        branchId: '',
        dateOfBirth: '',
        emergencyContactName: '',
        emergencyContactPhone: ''
    });

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        try {
            const data = await getAllBranches();
            console.log('Fetched branches:', data);
            setBranches(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching branches:', error);
            setBranches([]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);

            // Transform data to match backend schema
            const driverData = {
                personalInfo: {
                    fullName: `${formData.firstName} ${formData.lastName}`.trim(),
                    email: formData.email,
                    phone: formData.phoneNumber,
                    dateOfBirth: formData.dateOfBirth
                },
                emergencyContact: {
                    name: formData.emergencyContactName,
                    phone: formData.emergencyContactPhone
                },
                drivingLicense: {
                    licenseNumber: formData.licenseNumber,
                    expiryDate: formData.licenseExpiry
                },
                branch: formData.branchId, // Map branchId to branch
            };

            await driverService.createDriver(driverData);
            navigate('..');
        } catch (error) {
            console.error('Error creating driver application:', error);
            alert('Failed to submit application. Please check your data.');
        } finally {
            setLoading(false);
        }
    };

    const InputField = ({ icon, label, name, type = "text", placeholder, options, required = true }: any) => (
        <div className="space-y-1.5 flex-1 min-w-[280px]">
            <label className="text-xs font-bold uppercase tracking-widest ml-1" style={{ color: 'var(--text-dim)' }}>{label}</label>
            <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-brand-lime" style={{ color: 'var(--text-dim)' }}>
                    {icon}
                </div>
                {options ? (
                    <select
                        name={name}
                        required={required}
                        value={formData[name as keyof typeof formData]}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-lime/20 focus:border-brand-lime transition-all appearance-none cursor-pointer font-medium"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        <option value="">{placeholder}</option>
                        {options.map((opt: any) => (
                            <option key={opt.id || opt.value} value={opt._id || opt.id || opt.value}>{opt.name || opt.label}</option>
                        ))}
                    </select>
                ) : (
                    <input
                        type={type}
                        name={name}
                        required={required}
                        placeholder={placeholder}
                        value={formData[name as keyof typeof formData]}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-lime/20 focus:border-brand-lime transition-all font-medium"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                )}
            </div>
        </div>
    );

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <button
                    onClick={() => navigate('..')}
                    className="flex items-center gap-2 text-gray-500 hover:text-black transition-colors font-semibold"
                >
                    <ChevronLeft size={20} />
                    Back to List
                </button>
                <div className="text-right">
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>New Driver Application</h1>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>Step 1: Basic Information Entry</p>
                </div>
            </div>

            {/* Application Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Personal Section */}
                <div className="p-6 rounded-2xl shadow-sm border space-y-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-2 border-b pb-4 mb-2" style={{ borderColor: 'rgba(255,255,255,0.02)' }}>
                        <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)' }}>
                            <User size={20} />
                        </div>
                        <h2 className="font-bold uppercase tracking-wider text-sm" style={{ color: 'var(--text-main)' }}>Personal Information</h2>
                    </div>

                    <div className="flex flex-wrap gap-6">
                        <InputField icon={<User size={18} />} label="First Name" name="firstName" placeholder="e.g. John" />
                        <InputField icon={<User size={18} />} label="Last Name" name="lastName" placeholder="e.g. Doe" />
                        <InputField icon={<Mail size={18} />} label="Email Address" name="email" type="email" placeholder="john.doe@example.com" />
                        <InputField icon={<Phone size={18} />} label="Phone Number" name="phoneNumber" placeholder="+254 700 000000" />
                        <InputField icon={<Phone size={18} />} label="WhatsApp Number" name="whatsappNumber" placeholder="+254 700 000000 (Optional)" required={false} />
                        <InputField icon={<Calendar size={18} />} label="Date of Birth" name="dateOfBirth" type="date" />
                        <InputField icon={<Building2 size={18} />} label="Nationality" name="nationality" placeholder="e.g. Kenyan" />
                    </div>

                    <div className="border-t pt-4 mt-6" style={{ borderColor: 'rgba(255,255,255,0.02)' }}>
                        <h3 className="font-bold uppercase tracking-wider text-xs mb-4" style={{ color: 'var(--text-dim)' }}>Emergency Contact</h3>
                        <div className="flex flex-wrap gap-6">
                            <InputField icon={<User size={18} />} label="Contact Name" name="emergencyContactName" placeholder="e.g. Jane Doe" />
                            <InputField icon={<Phone size={18} />} label="Contact Phone" name="emergencyContactPhone" placeholder="+254 700 000000" />
                            <InputField icon={<User size={18} />} label="Relationship" name="emergencyContactRelationship" placeholder="e.g. Spouse / Brother" />
                        </div>
                    </div>
                </div>

                {/* Professional Section */}
                <div className="p-6 rounded-2xl shadow-sm border space-y-6" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-2 border-b pb-4 mb-2" style={{ borderColor: 'rgba(255,255,255,0.02)' }}>
                        <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)' }}>
                            <Briefcase size={20} />
                        </div>
                        <h2 className="font-bold uppercase tracking-wider text-sm" style={{ color: 'var(--text-main)' }}>Professional Details</h2>
                    </div>

                    <div className="flex flex-wrap gap-6">
                        <InputField 
                            icon={<FileText size={18} />} 
                            label="ID Document Type" 
                            name="idType" 
                            options={[{ id: 'National ID', name: 'National ID' }, { id: 'Passport', name: 'Passport' }]} 
                        />
                        <InputField icon={<FileText size={18} />} label="ID Number" name="idNumber" placeholder="Enter ID/Passport Number" />
                        <InputField icon={<FileText size={18} />} label="License Number" name="licenseNumber" placeholder="DL-XXXXX" />
                        <InputField icon={<Calendar size={18} />} label="License Expiry" name="licenseExpiry" type="date" />
                        <InputField
                            icon={<Building2 size={18} />}
                            label="Assigned Branch"
                            name="branchId"
                            placeholder="Select Branch"
                            options={branches}
                        />
                    </div>
                </div>

                {/* Document Preview Placeholder */}
                <div className="p-6 rounded-2xl flex items-start gap-4 border" style={{ backgroundColor: 'rgba(200,230,0,0.03)', borderColor: 'rgba(200,230,0,0.1)' }}>
                    <div className="p-3 rounded-xl shrink-0" style={{ backgroundColor: 'rgba(200,230,0,0.1)', color: 'var(--brand-lime)' }}>
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold" style={{ color: 'var(--text-main)' }}>Documentation Next Steps</h3>
                        <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                            Once this application is submitted, you will be able to upload the required documents (License Copy, ID, Utility Bill) from the driver's profile page. All applications undergo a <strong>mandatory credit check</strong>.
                        </p>
                    </div>
                </div>

                {/* Submission */}
                <div className="flex justify-end gap-4 pb-12">
                    <button
                        type="button"
                        onClick={() => navigate('..')}
                        className="px-8 py-3 border rounded-xl font-bold transition-all active:scale-95"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card)'}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`flex items-center gap-2 px-12 py-3 font-bold rounded-xl transition-all shadow-lg active:scale-95 border-none ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                        style={{ 
                            backgroundColor: 'var(--brand-lime)', 
                            color: 'var(--brand-black)' 
                        }}
                    >
                        {loading ? 'Submitting...' : 'Initiate Application'}
                        {!loading && <ChevronRight size={20} />}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateDriver;
