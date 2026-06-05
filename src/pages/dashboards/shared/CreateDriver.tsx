import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { addCustomer } from '../../../store/dashboardSlice';
import { User, Mail, Phone, Calendar, Briefcase, FileText, ChevronLeft, Building2, ShieldCheck, ChevronRight, ChevronDown } from 'lucide-react';
import { driverService } from '../../../services/driverService';
import { getAllBranches } from '../../../services/branchService';
import { getUser, getUserRole } from '../../../utils/auth';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import { validatePhoneDetails } from '../../../utils/phoneValidation';

// ─── Country Codes ────────────────────────────────────────────────────
const COUNTRY_CODES = [
    { code: '+91', country: 'India', iso: 'IN', placeholder: '9876543210', maxDigits: 10 },
    { code: '+254', country: 'Kenya', iso: 'KE', placeholder: '712 345678', maxDigits: 9 },
    { code: '+256', country: 'Uganda', iso: 'UG', placeholder: '772 345678', maxDigits: 9 },
    { code: '+255', country: 'Tanzania', iso: 'TZ', placeholder: '712 345678', maxDigits: 9 },
    { code: '+251', country: 'Ethiopia', iso: 'ET', placeholder: '912 345678', maxDigits: 9 },
    { code: '+234', country: 'Nigeria', iso: 'NG', placeholder: '803 123 4567', maxDigits: 10 },
    { code: '+233', country: 'Ghana', iso: 'GH', placeholder: '24 123 4567', maxDigits: 9 },
    { code: '+27', country: 'South Africa', iso: 'ZA', placeholder: '82 123 4567', maxDigits: 9 },
    { code: '+971', country: 'UAE', iso: 'AE', placeholder: '50 123 4567', maxDigits: 9 },
    { code: '+966', country: 'Saudi Arabia', iso: 'SA', placeholder: '50 123 4567', maxDigits: 9 },
    { code: '+44', country: 'UK', iso: 'GB', placeholder: '7123 456789', maxDigits: 10 },
    { code: '+1', country: 'USA', iso: 'US', placeholder: '202 555 0123', maxDigits: 10 },
    { code: '+1', country: 'Canada', iso: 'CA', placeholder: '416 555 0123', maxDigits: 10 },
    { code: '+86', country: 'China', iso: 'CN', placeholder: '138 1234 5678', maxDigits: 11 },
    { code: '+61', country: 'Australia', iso: 'AU', placeholder: '412 345 678', maxDigits: 9 },
    { code: '+49', country: 'Germany', iso: 'DE', placeholder: '170 1234567', maxDigits: 11 },
    { code: '+33', country: 'France', iso: 'FR', placeholder: '6 1234 5678', maxDigits: 9 },
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
const isValidEmail = (email: string) => {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email.trim())) return false;
    const parts = email.trim().split('@');
    if (parts.length !== 2) return false;
    const domain = parts[1];
    const domainParts = domain.split('.');
    if (domainParts.length < 2) return false;
    const tld = domainParts[domainParts.length - 1];
    if (tld.length < 2 || /\d/.test(tld)) return false;
    return true;
};

const isValidName = (name: string) => /^[a-zA-Z\s'-]{2,50}$/.test(name.trim());
const isValidAlphanumeric = (str: string) => /^[a-zA-Z0-9-]{3,30}$/.test(str.trim());

const getPhoneErrorMessage = (validation: any, fieldLabel: string) => {
    switch (validation.errorKey) {
        case 'REQUIRED':
            return `${fieldLabel} is required.`;
        case 'REPEATED_DIGITS':
            return 'Phone number cannot consist of repeated digits.';
        case 'TOO_SHORT':
            return 'Phone number is too short for this country.';
        case 'TOO_LONG':
            return 'Phone number is too long for this country.';
        case 'INVALID_FORMAT':
        default:
            return `Enter a valid ${fieldLabel.toLowerCase()}.`;
    }
};

const getMaxDOB = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 14);
    return d.toISOString().split('T')[0];
};

const getTodayStr = () => new Date().toISOString().split('T')[0];

// ─── InputField Component ─────────────────────────────────────────────
const InputField = ({ icon, label, name, type = "text", placeholder, options, required = true, formData, onChange, onBlur, error, maxDate, minDate }: any) => (
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
                    onBlur={onBlur}
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
                    onBlur={onBlur}
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

// ─── Custom CountryCodeSelect Dropdown (Cross-Platform) ────────────────
const CountryCodeSelect = ({ name, value, onChange, error }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedCountry = COUNTRY_CODES.find(cc => cc.code === value) || COUNTRY_CODES[0];

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative shrink-0 animate-in fade-in duration-200" style={{ width: '120px' }} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-full flex items-center justify-between pl-3 pr-2 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-lime/20 focus:border-brand-lime transition-all font-semibold text-sm cursor-pointer"
                style={{ backgroundColor: 'var(--bg-input)', borderColor: error ? '#ef4444' : 'var(--border-main)', color: 'var(--text-main)' }}
            >
                <div className="flex items-center gap-1.5">
                    <img 
                        src={`https://flagcdn.com/w40/${selectedCountry.iso.toLowerCase()}.png`} 
                        alt={selectedCountry.country} 
                        className="w-5 h-3.5 object-cover rounded-sm shadow-sm"
                    />
                    <span>{selectedCountry.code}</span>
                </div>
                <ChevronDown size={14} style={{ color: 'var(--text-dim)' }} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div 
                    className="absolute left-0 mt-1.5 w-64 max-h-60 overflow-y-auto rounded-xl shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150 border scrollbar-thin"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)' }}
                >
                    {COUNTRY_CODES.map((cc) => (
                        <button
                            key={`${cc.code}-${cc.iso}`}
                            type="button"
                            onClick={() => {
                                onChange({ target: { name, value: cc.code } });
                                setIsOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 hover:bg-white/5 cursor-pointer text-left ${cc.code === value ? 'bg-lime/10' : ''}`}
                            style={{ color: cc.code === value ? 'var(--brand-lime)' : 'var(--text-main)' }}
                        >
                            <img 
                                src={`https://flagcdn.com/w40/${cc.iso.toLowerCase()}.png`} 
                                alt={cc.country} 
                                className="w-5 h-3.5 object-cover rounded-sm shadow-sm"
                            />
                            <span className="w-10 text-xs text-dim" style={{ color: 'var(--text-dim)' }}>{cc.code}</span>
                            <span className="truncate flex-1">{cc.country}</span>
                            {cc.code === value && <span className="text-xs ml-auto" style={{ color: 'var(--brand-lime)' }}>✓</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── PhoneInputField with Country Code ────────────────────────────────
const PhoneInputField = ({ icon, label, name, codeName, required = true, formData, onChange, onCodeChange, onBlur, error, placeholder }: any) => {
    const selectedCode = formData[codeName as keyof typeof formData];
    const country = COUNTRY_CODES.find(cc => cc.code === selectedCode);
    const maxDigits = country ? country.maxDigits : 15;

    const displayPlaceholder = placeholder || (country 
        ? `${country.placeholder}${required ? '' : ' (Optional)'}` 
        : `700 000000${required ? '' : ' (Optional)'}`);

    return (
        <div className="space-y-1.5 flex-1 min-w-[280px]">
            <label className="text-xs font-bold uppercase tracking-widest ml-1" style={{ color: 'var(--text-dim)' }}>{label}</label>
            <div className="flex gap-2">
                <CountryCodeSelect
                    name={codeName}
                    value={selectedCode}
                    onChange={onCodeChange}
                    error={error}
                />
                <div className="relative group flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-brand-lime" style={{ color: 'var(--text-dim)' }}>
                        {icon}
                    </div>
                    <input
                        type="tel"
                        name={name}
                        required={required}
                        placeholder={displayPlaceholder}
                        maxLength={maxDigits}
                        value={formData[name as keyof typeof formData]}
                        onChange={onChange}
                        onBlur={onBlur}
                        className="w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-lime/20 focus:border-brand-lime transition-all font-medium"
                        style={{ backgroundColor: 'var(--bg-input)', borderColor: error ? '#ef4444' : 'var(--border-main)', color: 'var(--text-main)' }}
                    />
                </div>
            </div>
            {error && <p className="text-xs font-semibold ml-1 mt-1" style={{ color: '#ef4444' }}>{error}</p>}
        </div>
    );
};

const CreateDriver = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const user = getUser();
    const role = getUserRole();
    const [loading, setLoading] = useState(false);
    const [branches, setBranches] = useState<any[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phoneCode: '+91',
        phoneNumber: '',
        whatsappCode: '+91',
        whatsappNumber: '',
        dateOfBirth: '',
        nationality: '',
        emergencyContactName: '',
        emergencyContactCode: '+91',
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

    const validateField = (name: string, value: string): string => {
        let error = '';
        switch (name) {
            case 'firstName':
                if (!value.trim()) error = 'First name is required.';
                else if (!isValidName(value)) error = 'First name should be 2-50 letters only.';
                break;
            case 'lastName':
                if (!value.trim()) error = 'Last name is required.';
                else if (!isValidName(value)) error = 'Last name should be 2-50 letters only.';
                break;
            case 'email':
                if (!value.trim()) error = 'Email address is required.';
                else if (!isValidEmail(value)) error = 'Enter a valid email address.';
                break;
            case 'phoneNumber': {
                const fullPhone = `${formData.phoneCode}${value.trim()}`;
                const validation = validatePhoneDetails(fullPhone);
                if (!value.trim()) {
                    error = 'Phone number is required.';
                } else if (!validation.isValid) {
                    error = getPhoneErrorMessage(validation, 'Phone number');
                }
                break;
            }
            case 'whatsappNumber': {
                if (value.trim()) {
                    const fullPhone = `${formData.whatsappCode}${value.trim()}`;
                    const validation = validatePhoneDetails(fullPhone);
                    if (!validation.isValid) {
                        error = getPhoneErrorMessage(validation, 'WhatsApp number');
                    }
                }
                break;
            }
            case 'dateOfBirth':
                if (!value) error = 'Date of birth is required.';
                else {
                    const dob = new Date(value);
                    const minAge = new Date();
                    minAge.setFullYear(minAge.getFullYear() - 14);
                    if (dob > minAge) error = 'Driver must be at least 14 years old.';
                    if (dob > new Date()) error = 'Date of birth cannot be a future date.';
                }
                break;
            case 'nationality':
                if (!value.trim()) error = 'Nationality is required.';
                break;
            case 'emergencyContactName':
                if (!value.trim()) error = 'Emergency contact name is required.';
                break;
            case 'emergencyContactPhone': {
                const fullPhone = `${formData.emergencyContactCode}${value.trim()}`;
                const validation = validatePhoneDetails(fullPhone);
                if (!value.trim()) {
                    error = 'Emergency contact phone is required.';
                } else if (!validation.isValid) {
                    error = getPhoneErrorMessage(validation, 'Contact phone');
                }
                break;
            }
            case 'emergencyContactRelationship':
                if (!value) error = 'Emergency contact relationship is required.';
                break;
            case 'customRelationship':
                if (formData.emergencyContactRelationship === 'Other' && !value.trim()) error = 'Please specify the relationship.';
                break;
            case 'idType':
                if (!value) error = 'ID Document type is required.';
                break;
            case 'idNumber':
                if (!value.trim()) error = 'ID/Passport number is required.';
                else if (!isValidAlphanumeric(value)) error = 'Enter a valid ID/Passport number.';
                break;
            case 'licenseNumber':
                if (!value.trim()) error = 'License number is required.';
                else if (!isValidAlphanumeric(value)) error = 'Enter a valid license number.';
                break;
            case 'licenseExpiry':
                if (!value) error = 'License expiry date is required.';
                else if (new Date(value) <= new Date()) error = 'License expiry must be a future date.';
                break;
            case 'branchId':
                if (!value) error = 'Please assign a branch.';
                break;
            default:
                break;
        }
        setErrors(prev => ({ ...prev, [name]: error }));
        return error;
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
        validateField(name, value);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        let { name, value } = e.target;

        // Strip alphabets and non-digits entirely for phone number fields
        if (name === 'phoneNumber' || name === 'whatsappNumber' || name === 'emergencyContactPhone') {
            value = value.replace(/\D/g, '');
        }

        // Disable numeric characters for first name, last name, and emergency contact name
        if (name === 'firstName' || name === 'lastName' || name === 'emergencyContactName') {
            value = value.replace(/[^a-zA-Z\s'-]/g, '');
        }

        setFormData(prev => {
            const updated = { ...prev, [name]: value };
            
            // Handle clearing customRelationship
            if (name === 'emergencyContactRelationship' && value !== 'Other') {
                updated.customRelationship = '';
                setErrors(prevErr => {
                    const next = { ...prevErr };
                    delete next.customRelationship;
                    return next;
                });
            }
            
            // Dynamic check when country code is switched
            if (name === 'phoneCode' && touched.phoneNumber) {
                setTimeout(() => validateField('phoneNumber', updated.phoneNumber), 0);
            }
            if (name === 'whatsappCode' && touched.whatsappNumber) {
                setTimeout(() => validateField('whatsappNumber', updated.whatsappNumber), 0);
            }
            if (name === 'emergencyContactCode' && touched.emergencyContactPhone) {
                setTimeout(() => validateField('emergencyContactPhone', updated.emergencyContactPhone), 0);
            }
            
            return updated;
        });

        // Set touched to true on change to show validation in real-time
        setTouched(prev => ({ ...prev, [name]: true }));
        validateField(name, value);
    };

    // ─── Validation ───────────────────────────────────────────────────
    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        const touchedFields: Record<string, boolean> = {};

        Object.keys(formData).forEach((key) => {
            if (key === 'customRelationship' && formData.emergencyContactRelationship !== 'Other') {
                return;
            }
            if (key === 'whatsappNumber' && !formData.whatsappNumber) {
                return;
            }
            if (key === 'phoneCode' || key === 'whatsappCode' || key === 'emergencyContactCode') {
                return;
            }

            const value = formData[key as keyof typeof formData] || '';
            const err = validateField(key, value);
            if (err) {
                newErrors[key] = err;
            }
            touchedFields[key] = true;
        });

        setTouched(touchedFields);
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

            const newDriver = await driverService.createDriver(driverData);
            dispatch(addCustomer(newDriver));
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
                    onClick={() => navigate(-1)}
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
                        <InputField icon={<User size={18} />} label="First Name" name="firstName" placeholder="e.g. John" formData={formData} onChange={handleChange} onBlur={handleBlur} error={errors.firstName} />
                        <InputField icon={<User size={18} />} label="Last Name" name="lastName" placeholder="e.g. Doe" formData={formData} onChange={handleChange} onBlur={handleBlur} error={errors.lastName} />
                        <InputField icon={<Mail size={18} />} label="Email Address" name="email" type="email" placeholder="john.doe@example.com" formData={formData} onChange={handleChange} onBlur={handleBlur} error={errors.email} />
                        <PhoneInputField
                            icon={<Phone size={18} />}
                            label="Phone Number"
                            name="phoneNumber"
                            codeName="phoneCode"
                            formData={formData}
                            onChange={handleChange}
                            onCodeChange={handleChange}
                            onBlur={handleBlur}
                            error={errors.phoneNumber}
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
                            onBlur={handleBlur}
                            error={errors.whatsappNumber}
                        />
                        <InputField icon={<Calendar size={18} />} label="Date of Birth" name="dateOfBirth" type="date" formData={formData} onChange={handleChange} onBlur={handleBlur} error={errors.dateOfBirth} maxDate={getMaxDOB()} />
                        <InputField icon={<Building2 size={18} />} label="Nationality" name="nationality" placeholder="e.g. Kenyan" formData={formData} onChange={handleChange} onBlur={handleBlur} error={errors.nationality} />
                    </div>

                    <div className="border-t pt-4 mt-6" style={{ borderColor: 'rgba(255,255,255,0.02)' }}>
                        <h3 className="font-bold uppercase tracking-wider text-xs mb-4" style={{ color: 'var(--text-dim)' }}>Emergency Contact</h3>
                        <div className="flex flex-wrap gap-6">
                            <InputField icon={<User size={18} />} label="Contact Name" name="emergencyContactName" placeholder="e.g. Jane Doe" formData={formData} onChange={handleChange} onBlur={handleBlur} error={errors.emergencyContactName} />
                            <PhoneInputField
                                icon={<Phone size={18} />}
                                label="Contact Phone"
                                name="emergencyContactPhone"
                                codeName="emergencyContactCode"
                                formData={formData}
                                onChange={handleChange}
                                onCodeChange={handleChange}
                                onBlur={handleBlur}
                                error={errors.emergencyContactPhone}
                            />
                            <InputField
                                icon={<User size={18} />}
                                label="Relationship"
                                name="emergencyContactRelationship"
                                placeholder="Select Relationship"
                                options={RELATIONSHIP_OPTIONS}
                                formData={formData}
                                onChange={handleChange}
                                onBlur={handleBlur}
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
                                    onBlur={handleBlur}
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
                            onBlur={handleBlur}
                            error={errors.idType}
                        />
                        <InputField icon={<FileText size={18} />} label="ID Number" name="idNumber" placeholder="Enter ID/Passport Number" formData={formData} onChange={handleChange} onBlur={handleBlur} error={errors.idNumber} />
                        <InputField icon={<FileText size={18} />} label="License Number" name="licenseNumber" placeholder="DL-XXXXX" formData={formData} onChange={handleChange} onBlur={handleBlur} error={errors.licenseNumber} />
                        <InputField icon={<Calendar size={18} />} label="License Expiry" name="licenseExpiry" type="date" formData={formData} onChange={handleChange} onBlur={handleBlur} error={errors.licenseExpiry} minDate={getTodayStr()} />
                        <InputField
                            icon={<Building2 size={18} />}
                            label="Assigned Branch"
                            name="branchId"
                            placeholder="Select Branch"
                            options={branches}
                            formData={formData}
                            onChange={handleChange}
                            onBlur={handleBlur}
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
