import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Calendar, Briefcase, FileText, ChevronLeft, MapPin, Building2, ShieldCheck, Sparkles, ChevronRight } from 'lucide-react';
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
        experienceYears: '',
        branchId: '',
        homeAddress: '',
        dateOfBirth: ''
    });

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        try {
            const data = await getAllBranches();
            setBranches(data);
        } catch (error) {
            console.error('Error fetching branches:', error);
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
            await driverService.createDriver({
                ...formData,
                experienceYears: parseInt(formData.experienceYears)
            });
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
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-1">{label}</label>
            <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-brand-lime">
                    {icon}
                </div>
                {options ? (
                    <select
                        name={name}
                        required={required}
                        value={formData[name as keyof typeof formData]}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-lime/20 focus:border-brand-lime transition-all appearance-none cursor-pointer font-medium"
                    >
                        <option value="">{placeholder}</option>
                        {options.map((opt: any) => (
                            <option key={opt.id || opt.value} value={opt.id || opt.value}>{opt.name || opt.label}</option>
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
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-lime/20 focus:border-brand-lime transition-all placeholder:text-gray-300 font-medium"
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
                    <h1 className="text-2xl font-bold text-gray-900">New Driver Application</h1>
                    <p className="text-sm text-gray-500 font-medium">Step 1: Basic Information Entry</p>
                </div>
            </div>

            {/* Application Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Personal Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                    <div className="flex items-center gap-2 border-b border-gray-50 pb-4 mb-2">
                        <div className="p-2 bg-brand-lime/10 rounded-lg text-brand-lime">
                            <User size={20} />
                        </div>
                        <h2 className="font-bold text-gray-900 uppercase tracking-wider text-sm">Personal Information</h2>
                    </div>

                    <div className="flex flex-wrap gap-6">
                        <InputField icon={<User size={18} />} label="First Name" name="firstName" placeholder="e.g. John" />
                        <InputField icon={<User size={18} />} label="Last Name" name="lastName" placeholder="e.g. Doe" />
                        <InputField icon={<Mail size={18} />} label="Email Address" name="email" type="email" placeholder="john.doe@example.com" />
                        <InputField icon={<Phone size={18} />} label="Phone Number" name="phoneNumber" placeholder="+254 700 000000" />
                        <InputField icon={<Calendar size={18} />} label="Date of Birth" name="dateOfBirth" type="date" />
                        <InputField icon={<MapPin size={18} />} label="Home Address" name="homeAddress" placeholder="123 Street, Nairobi" />
                    </div>
                </div>

                {/* Professional Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                    <div className="flex items-center gap-2 border-b border-gray-50 pb-4 mb-2">
                        <div className="p-2 bg-brand-lime/10 rounded-lg text-brand-lime">
                            <Briefcase size={20} />
                        </div>
                        <h2 className="font-bold text-gray-900 uppercase tracking-wider text-sm">Professional Details</h2>
                    </div>

                    <div className="flex flex-wrap gap-6">
                        <InputField icon={<FileText size={18} />} label="License Number" name="licenseNumber" placeholder="DL-XXXXX" />
                        <InputField icon={<Calendar size={18} />} label="License Expiry" name="licenseExpiry" type="date" />
                        <InputField icon={<Sparkles size={18} />} label="Exp. Years" name="experienceYears" type="number" placeholder="Years of experience" />
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
                <div className="bg-brand-lime/5 border border-brand-lime/20 p-6 rounded-2xl flex items-start gap-4">
                    <div className="p-3 bg-brand-lime/20 rounded-xl text-brand-lime shrink-0">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">Documentation Next Steps</h3>
                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                            Once this application is submitted, you will be able to upload the required documents (License Copy, ID, Utility Bill) from the driver's profile page. All applications undergo a <strong>mandatory credit check</strong>.
                        </p>
                    </div>
                </div>

                {/* Submission */}
                <div className="flex justify-end gap-4 pb-12">
                    <button
                        type="button"
                        onClick={() => navigate('..')}
                        className="px-8 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-all active:scale-95"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className={`flex items-center gap-2 px-12 py-3 bg-brand-lime text-black font-bold rounded-xl transition-all shadow-lg active:scale-95 ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-brand-lime/20'}`}
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
