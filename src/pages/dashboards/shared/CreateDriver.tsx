import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Calendar, Briefcase, FileText, ChevronLeft, Building2, ShieldCheck, ChevronRight, Globe } from 'lucide-react';
import { driverService } from '../../../services/driverService';
import { getAllBranches } from '../../../services/branchService';
import { getUser, getUserRole } from '../../../utils/auth';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';

// ─── Country Codes ────────────────────────────────────────────────────
const COUNTRY_CODES = [
    { code: '+254', country: 'Kenya', flag: '🇰🇪' },
    { code: '+256', country: 'Uganda', flag: '🇺🇬' },
    { code: '+255', country: 'Tanzania', flag: '🇹🇿' },
    { code: '+251', country: 'Ethiopia', flag: '🇪🇹' },
    { code: '+234', country: 'Nigeria', flag: '🇳🇬' },
    { code: '+233', country: 'Ghana', flag: '🇬🇭' },
    { code: '+27', country: 'South Africa', flag: '🇿🇦' },
    { code: '+91', country: 'India', flag: '🇮🇳' },
    { code: '+971', country: 'UAE', flag: '🇦🇪' },
    { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
    { code: '+44', country: 'UK', flag: '🇬🇧' },
    { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
    { code: '+86', country: 'China', flag: '🇨🇳' },
    { code: '+61', country: 'Australia', flag: '🇦🇺' },
    { code: '+49', country: 'Germany', flag: '🇩🇪' },
    { code: '+33', country: 'France', flag: '🇫🇷' },
];

const RELATIONSHIP_OPTIONS = [
    { id: 'Spouse', name: 'Spouse' },
    { id: 'Parent', name: 'Parent' },
    { id: 'Sibling', name: 'Sibling' },
    { id: 'Child', name: 'Child' },
    { id: 'Friend', name: 'Friend' },
    { id: 'Colleague', name: 'Colleague' },
    { id: 'Other', name: 'Other (Specify)' },
];

// ─── Validation Helpers ───────────────────────────────────────────────
const isValidPhoneDigits = (digits: string) => /^\d{6,15}$/.test(digits);

const getMaxDOB = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 14);
    return d.toISOString().split('T')[0];
};

const getTodayStr = () => new Date().toISOString().split('T')[0];

// ─── InputField Component ─────────────────────────────────────────────
const InputField = ({ icon, label, name, type = "text", placeholder, options, required = true, formData, onChange, error, maxDate, minDate }: any) => (
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
                    onChange={onChange}
                    className="w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-lime/20 focus:border-brand-lime transition-all appearance-none cursor-pointer font-medium"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: error ? '#ef4444' : 'var(--border-main)', color: 'var(--text-main)' }}
                >
                    <option value="">{placeholder}</option>
                    {options.map((opt: any) => (
                        <option key={opt.id || opt.value || opt._id} value={opt._id || opt.id || opt.value}>{opt.name || opt.label}</option>
                    ))}
                </select>
            ) : (
                <input
                    type={type}
                    name={name}
                    required={required}
                    placeholder={placeholder}
                    value={formData[name as keyof typeof formData]}
                    onChange={onChange}
                    max={maxDate}
                    min={minDate}
                    className="w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-lime/20 focus:border-brand-lime transition-all font-medium"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: error ? '#ef4444' : 'var(--border-main)', color: 'var(--text-main)' }}
                />
            )}
        </div>
        {error && <p className="text-xs font-semibold ml-1 mt-1" style={{ color: '#ef4444' }}>{error}</p>}
    </div>
);

// ─── PhoneInputField with Country Code ────────────────────────────────
const PhoneInputField = ({ icon, label, name, codeName, required = true, formData, onChange, onCodeChange, error, placeholder }: any) => (
    <div className="space-y-1.5 flex-1 min-w-[280px]">
        <label className="text-xs font-bold uppercase tracking-widest ml-1" style={{ color: 'var(--text-dim)' }}>{label}</label>
        <div className="flex gap-2">
            <div className="relative shrink-0" style={{ width: '120px' }}>
                <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }}>
                    <Globe size={16} />
                </div>
                <select
                    name={codeName}
                    value={formData[codeName as keyof typeof formData]}
                    onChange={onCodeChange}
                    className="w-full pl-9 pr-2 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-lime/20 focus:border-brand-lime transition-all appearance-none cursor-pointer font-medium text-sm"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: error ? '#ef4444' : 'var(--border-main)', color: 'var(--text-main)' }}
                >
                    {COUNTRY_CODES.map(cc => (
                        <option key={cc.code} value={cc.code}>{cc.flag} {cc.code}</option>
                    ))}
                </select>
            </div>
            <div className="relative group flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-brand-lime" style={{ color: 'var(--text-dim)' }}>
                    {icon}
                </div>
                <input
                    type="tel"
                    name={name}
                    required={required}
                    placeholder={placeholder || "700 000000"}
                    value={formData[name as keyof typeof formData]}
                    onChange={onChange}
                    className="w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-lime/20 focus:border-brand-lime transition-all font-medium"
                    style={{ backgroundColor: 'var(--bg-input)', borderColor: error ? '#ef4444' : 'var(--border-main)', color: 'var(--text-main)' }}
                />
            </div>
        </div>
        {error && <p className="text-xs font-semibold ml-1 mt-1" style={{ color: '#ef4444' }}>{error}</p>}
    </div>
);

const CreateDriver = () => {
    const navigate = useNavigate();
    const user = getUser();
    const role = getUserRole();
    const [loading, setLoading] = useState(false);
    const [branches, setBranches] = useState<any[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phoneCode: '+254',
        phoneNumber: '',
        whatsappCode: '+254',
        whatsappNumber: '',
        dateOfBirth: '',
        nationality: '',
        emergencyContactName: '',
        emergencyContactCode: '+254',
        emergencyContactPhone: '',
        emergencyContactRelationship: '',
        customRelationship: '',
        idType: '',
        idNumber: '',
        licenseNumber: '',
        licenseExpiry: '',
        branchId: ''
    });

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        try {
            const response = await getAllBranches();
            console.log('Fetched branches:', response);
            const fetchedBranches = Array.isArray(response.data) ? response.data : [];
            setBranches(fetchedBranches);

            // Auto-select branch for Branch Manager
            if (role === 'branchmanager' && user?.branch) {
                const branchId = typeof user.branch === 'object' ? user.branch._id : user.branch;
                if (branchId) {
                    setFormData(prev => ({ ...prev, branchId }));
                }
            } else if (role === 'branchmanager' && fetchedBranches.length === 1) {
                setFormData(prev => ({ ...prev, branchId: fetchedBranches[0]._id }));
            }
        } catch (error) {
            console.error('Error fetching branches:', error);
            setBranches([]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error for the field on change
        if (errors[name]) {
            setErrors(prev => { const next = { ...prev }; delete next[name]; return next; });
        }
    };

    // ─── Validation ───────────────────────────────────────────────────
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        // DOB: must be at least 14 years old
        if (formData.dateOfBirth) {
            const dob = new Date(formData.dateOfBirth);
            const minAge = new Date();
            minAge.setFullYear(minAge.getFullYear() - 14);
            if (dob > minAge) {
                newErrors.dateOfBirth = 'Driver must be at least 14 years old.';
            }
            if (dob > new Date()) {
                newErrors.dateOfBirth = 'Date of birth cannot be a future date.';
            }
        } else {
            newErrors.dateOfBirth = 'Date of birth is required.';
        }

        // Phone Number
        if (!formData.phoneNumber) {
            newErrors.phoneNumber = 'Phone number is required.';
        } else if (!isValidPhoneDigits(formData.phoneNumber.replace(/\s/g, ''))) {
            newErrors.phoneNumber = 'Enter a valid phone number (6-15 digits).';
        }

        // WhatsApp (optional but validate if filled)
        if (formData.whatsappNumber && !isValidPhoneDigits(formData.whatsappNumber.replace(/\s/g, ''))) {
            newErrors.whatsappNumber = 'Enter a valid WhatsApp number (6-15 digits).';
        }

        // Emergency Contact Phone
        if (!formData.emergencyContactPhone) {
            newErrors.emergencyContactPhone = 'Emergency contact phone is required.';
        } else if (!isValidPhoneDigits(formData.emergencyContactPhone.replace(/\s/g, ''))) {
            newErrors.emergencyContactPhone = 'Enter a valid phone number (6-15 digits).';
        }

        // License Expiry: must be in the future
        if (formData.licenseExpiry) {
            const expiry = new Date(formData.licenseExpiry);
            if (expiry <= new Date()) {
                newErrors.licenseExpiry = 'License expiry must be a future date.';
            }
        } else {
            newErrors.licenseExpiry = 'License expiry date is required.';
        }
        // Relationship: required, and if Other, customRelationship must be filled
        if (formData.emergencyContactRelationship === 'Other' && !formData.customRelationship.trim()) {
            newErrors.customRelationship = 'Please specify the relationship.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        try {
            setLoading(true);

            // Combine country code + number
            const fullPhone = `${formData.phoneCode}${formData.phoneNumber.replace(/\s/g, '')}`;
            const fullWhatsapp = formData.whatsappNumber ? `${formData.whatsappCode}${formData.whatsappNumber.replace(/\s/g, '')}` : '';
            const fullEmergencyPhone = `${formData.emergencyContactCode}${formData.emergencyContactPhone.replace(/\s/g, '')}`;

            // Transform data to match backend schema
            const driverData = {
                personalInfo: {
                    fullName: `${formData.firstName} ${formData.lastName}`.trim(),
                    email: formData.email,
                    phone: fullPhone,
                    whatsappNumber: fullWhatsapp,
                    dateOfBirth: formData.dateOfBirth,
                    nationality: formData.nationality
                },
                emergencyContact: {
                    name: formData.emergencyContactName,
                    phone: fullEmergencyPhone,
                    relationship: formData.emergencyContactRelationship === 'Other'
                        ? formData.customRelationship
                        : formData.emergencyContactRelationship
                },
                identityDocs: {
                    idType: formData.idType,
                    idNumber: formData.idNumber
                },
                drivingLicense: {
                    licenseNumber: formData.licenseNumber,
                    expiryDate: formData.licenseExpiry
                },
                branch: formData.branchId,
            };

            await driverService.createDriver(driverData);
            navigate('../drivers');
        } catch (error) {
            console.error('Error creating driver application:', error);
            alert('Failed to submit application. Please check your data.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'is Valid Phone Digits', active: true }]} />

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
                    <h1 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>New Driver Application</h1>
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
                        <InputField icon={<User size={18} />} label="First Name" name="firstName" placeholder="e.g. John" formData={formData} onChange={handleChange} error={errors.firstName} />
                        <InputField icon={<User size={18} />} label="Last Name" name="lastName" placeholder="e.g. Doe" formData={formData} onChange={handleChange} error={errors.lastName} />
                        <InputField icon={<Mail size={18} />} label="Email Address" name="email" type="email" placeholder="john.doe@example.com" formData={formData} onChange={handleChange} error={errors.email} />
                        <PhoneInputField
                            icon={<Phone size={18} />}
                            label="Phone Number"
                            name="phoneNumber"
                            codeName="phoneCode"
                            formData={formData}
                            onChange={handleChange}
                            onCodeChange={handleChange}
                            error={errors.phoneNumber}
                            placeholder="700 000000"
                        />
                        <PhoneInputField
                            icon={<Phone size={18} />}
                            label="WhatsApp Number"
                            name="whatsappNumber"
                            codeName="whatsappCode"
                            required={false}
                            formData={formData}
                            onChange={handleChange}
                            onCodeChange={handleChange}
                            error={errors.whatsappNumber}
                            placeholder="700 000000 (Optional)"
                        />
                        <InputField icon={<Calendar size={18} />} label="Date of Birth" name="dateOfBirth" type="date" formData={formData} onChange={handleChange} error={errors.dateOfBirth} maxDate={getMaxDOB()} />
                        <InputField icon={<Building2 size={18} />} label="Nationality" name="nationality" placeholder="e.g. Kenyan" formData={formData} onChange={handleChange} error={errors.nationality} />
                    </div>

                    <div className="border-t pt-4 mt-6" style={{ borderColor: 'rgba(255,255,255,0.02)' }}>
                        <h3 className="font-bold uppercase tracking-wider text-xs mb-4" style={{ color: 'var(--text-dim)' }}>Emergency Contact</h3>
                        <div className="flex flex-wrap gap-6">
                            <InputField icon={<User size={18} />} label="Contact Name" name="emergencyContactName" placeholder="e.g. Jane Doe" formData={formData} onChange={handleChange} error={errors.emergencyContactName} />
                            <PhoneInputField
                                icon={<Phone size={18} />}
                                label="Contact Phone"
                                name="emergencyContactPhone"
                                codeName="emergencyContactCode"
                                formData={formData}
                                onChange={handleChange}
                                onCodeChange={handleChange}
                                error={errors.emergencyContactPhone}
                                placeholder="700 000000"
                            />
                            <InputField
                                icon={<User size={18} />}
                                label="Relationship"
                                name="emergencyContactRelationship"
                                placeholder="Select Relationship"
                                options={RELATIONSHIP_OPTIONS}
                                formData={formData}
                                onChange={handleChange}
                                error={errors.emergencyContactRelationship}
                            />
                            {formData.emergencyContactRelationship === 'Other' && (
                                <InputField
                                    icon={<User size={18} />}
                                    label="Specify Relationship"
                                    name="customRelationship"
                                    placeholder="e.g. Uncle, Cousin, Neighbor"
                                    formData={formData}
                                    onChange={handleChange}
                                    error={errors.customRelationship}
                                />
                            )}
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
                            formData={formData}
                            onChange={handleChange}
                            error={errors.idType}
                        />
                        <InputField icon={<FileText size={18} />} label="ID Number" name="idNumber" placeholder="Enter ID/Passport Number" formData={formData} onChange={handleChange} error={errors.idNumber} />
                        <InputField icon={<FileText size={18} />} label="License Number" name="licenseNumber" placeholder="DL-XXXXX" formData={formData} onChange={handleChange} error={errors.licenseNumber} />
                        <InputField icon={<Calendar size={18} />} label="License Expiry" name="licenseExpiry" type="date" formData={formData} onChange={handleChange} error={errors.licenseExpiry} minDate={getTodayStr()} />
                        <InputField
                            icon={<Building2 size={18} />}
                            label="Assigned Branch"
                            name="branchId"
                            placeholder="Select Branch"
                            options={branches}
                            formData={formData}
                            onChange={handleChange}
                            error={errors.branchId}
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
