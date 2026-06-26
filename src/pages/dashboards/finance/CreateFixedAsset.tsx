import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calculator, AlertCircle, Info, Settings, Plus } from 'lucide-react';
import { createFixedAsset, getFixedAssetById, updateFixedAsset, calculateDepreciationPreview, getFixedAssetTypes, createFixedAssetType } from '../../../services/fixedAssetService';
import type { DepreciationScheduleEntry, DepreciationInterval, FixedAssetStatus, FixedAssetType } from '../../../services/fixedAssetService';
import { getAllAccountingCodes } from '../../../services/accountingService';
import type { AccountingCode } from '../../../services/accountingService';
import { getAllVehicles, createVehicle } from '../../../services/vehicleService';
import { getAllBranches, createBranch } from '../../../services/branchService';
import type { Branch } from '../../../services/branchService';
import { getAllCountryManagers } from '../../../services/countryManagerService';
import { getAllBills } from '../../../services/billService';
import CreateBillModal from './Bills/CreateBillModal';
import { getUserRole } from '../../../utils/auth';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import toast from 'react-hot-toast';
import Modal from '../../../components/Modal';
import QuickAddAccountModal from '../../../components/common/QuickAddAccountModal';
import { SearchableSelect } from '../../../components/common/SearchableSelect';

const formatDateUTC = (dateInput: string | Date | undefined) => {
    if (!dateInput) return '—';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '—';
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${month}/${day}/${year}`;
};

const CreateFixedAsset = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Custom option lists & modals state
    const [locations, setLocations] = useState<string[]>([]);
    const [fixedAssetTypes, setFixedAssetTypes] = useState<FixedAssetType[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [countryManagers, setCountryManagers] = useState<any[]>([]);

    const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
    const [branchSubmitting, setBranchSubmitting] = useState(false);
    const [newBranchData, setNewBranchData] = useState({
        name: '',
        code: '',
        address: '',
        city: '',
        state: '',
        phone: '',
        email: '',
        country: '',
        countryManager: ''
    });

    const [isAssetTypeModalOpen, setIsAssetTypeModalOpen] = useState(false);
    const [newAssetTypeName, setNewAssetTypeName] = useState('');

    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
    const [accountModalTarget, setAccountModalTarget] = useState<'fixedAsset' | 'accumulatedDepreciation' | 'depreciationExpense' | null>(null);

    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
    const [vehicleSubmitting, setVehicleSubmitting] = useState(false);
    const [newVehicleData, setNewVehicleData] = useState({
        make: '',
        model: '',
        year: new Date().getFullYear(),
        vin: '',
        category: 'Sedan' as any,
        fuelType: 'Petrol' as any,
        transmission: 'Automatic' as any,
        vendorName: 'Internal',
        purchasePrice: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        branch: ''
    });

    // Form inputs
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        transactionSeries: 'Default Transaction Series',
        code: '',
        purchasePrice: '', // Purchase Value
        purchaseQuantity: '1',
        serialNumber: '',
        currentQuantity: '1',
        currentValue: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        disposalValue: '0',
        warrantyExpirationDate: '',
        fixedAssetType: 'Vehicles',
        description: '',
        
        depreciationMethod: 'Straight-Line' as const,
        computationType: 'Prorata Basis',
        depreciationInterval: 'Monthly' as DepreciationInterval, // Depreciation Frequency
        depreciationStartDate: new Date().toISOString().split('T')[0],
        assetLife: '60',
        assetLifeUnit: 'Months' as 'Months' | 'Years',

        fixedAssetAccount: '',
        accumulatedDepreciationAccount: '',
        depreciationExpenseAccount: '',
        linkedVehicle: '',
        originalBill: '',
        status: 'Draft' as FixedAssetStatus,
        notes: ''
    });

    const [accounts, setAccounts] = useState<AccountingCode[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [bills, setBills] = useState<any[]>([]);
    const [isBillModalOpen, setIsBillModalOpen] = useState(false);
    const [previewSchedule, setPreviewSchedule] = useState<DepreciationScheduleEntry[]>([]);
    const [calculatingPreview, setCalculatingPreview] = useState(false);

    const userRole = getUserRole() || '';
    const getRolePath = () => {
        const role = userRole.toLowerCase();
        if (role === 'admin') return 'admin';
        return 'financial-admin';
    };

    // Fetch master lists (accounts, vehicles, branches)
    useEffect(() => {
        const fetchMasterData = async () => {
            setLoading(true);
            try {
                // Fetch lookup data in parallel to optimize page load performance
                const [typesData, accData, vehRes, branchRes, managerRes, billsRes] = await Promise.all([
                    getFixedAssetTypes(),
                    getAllAccountingCodes({ limit: 2000, select: 'code,name', skipPopulate: 'true' }),
                    getAllVehicles({ limit: 1000, select: 'basicDetails.make,basicDetails.model,legalDocs.registrationNumber', skipPopulate: 'true' } as any),
                    getAllBranches({ limit: 100, select: 'name', skipPopulate: 'true' } as any),
                    getAllCountryManagers({ limit: 100, select: 'personalInfo.fullName', skipPopulate: 'true' } as any).catch(mgrErr => {
                        console.error("Failed to load country managers:", mgrErr);
                        return { data: [] };
                    }),
                    getAllBills({ limit: 50, select: 'billNumber,billDate,totalAmount', skipPopulate: 'true' } as any).catch(billsErr => {
                        console.error("Failed to load bills:", billsErr);
                        return { data: [] };
                    })
                ]);

                setFixedAssetTypes(typesData);
                setAccounts(Array.isArray(accData) ? accData : ((accData as any).data || []));
                setVehicles(vehRes.data || []);

                const branchesList = branchRes.data || [];
                setBranches(branchesList);
                const branchNames = branchesList.map(b => b.name);
                setLocations(branchNames);
                if (branchesList.length > 0) {
                    setNewVehicleData(prev => ({ ...prev, branch: branchesList[0]._id }));
                    if (!isEditMode) {
                        setFormData(prev => ({ ...prev, location: branchesList[0].name }));
                    }
                }

                // Set default type to Vehicles if not in edit mode
                if (!isEditMode && typesData.length > 0) {
                    const vehicleType = typesData.find(t => t.name.toLowerCase() === 'vehicles');
                    if (vehicleType) {
                        setFormData(prev => ({ ...prev, fixedAssetType: vehicleType._id }));
                    } else {
                        setFormData(prev => ({ ...prev, fixedAssetType: typesData[0]._id }));
                    }
                }

                setCountryManagers(managerRes.data || []);
                let fetchedBills = billsRes.data || [];

                // If edit mode, load existing asset
                if (isEditMode) {
                    const asset = await getFixedAssetById(id);
                    setFormData({
                        name: asset.name || '',
                        location: asset.location || '',
                        transactionSeries: 'Default Transaction Series',
                        code: asset.code || '',
                        purchasePrice: String(asset.purchasePrice || ''),
                        purchaseQuantity: String(asset.purchaseQuantity || '1'),
                        serialNumber: asset.serialNumber || '',
                        currentQuantity: String(asset.currentQuantity || '1'),
                        currentValue: String(asset.currentValue || asset.purchasePrice || ''),
                        purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                        disposalValue: String(asset.disposalValue || 0),
                        warrantyExpirationDate: asset.warrantyExpirationDate ? new Date(asset.warrantyExpirationDate).toISOString().split('T')[0] : '',
                        fixedAssetType: typeof asset.fixedAssetType === 'object' && asset.fixedAssetType ? asset.fixedAssetType._id : (asset.fixedAssetType || ''),
                        description: asset.description || '',

                        depreciationMethod: asset.depreciationMethod || 'Straight-Line',
                        computationType: asset.computationType || 'Prorata Basis',
                        depreciationInterval: asset.depreciationInterval || 'Monthly',
                        depreciationStartDate: asset.depreciationStartDate ? new Date(asset.depreciationStartDate).toISOString().split('T')[0] : (asset.purchaseDate ? new Date(asset.purchaseDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
                        assetLife: String(asset.assetLife || '60'),
                        assetLifeUnit: asset.assetLifeUnit || 'Months',

                        fixedAssetAccount: typeof asset.fixedAssetAccount === 'object' && asset.fixedAssetAccount ? asset.fixedAssetAccount._id : (typeof asset.fixedAssetAccount === 'string' ? asset.fixedAssetAccount : ''),
                        accumulatedDepreciationAccount: typeof asset.accumulatedDepreciationAccount === 'object' && asset.accumulatedDepreciationAccount ? asset.accumulatedDepreciationAccount._id : (typeof asset.accumulatedDepreciationAccount === 'string' ? asset.accumulatedDepreciationAccount : ''),
                        depreciationExpenseAccount: typeof asset.depreciationExpenseAccount === 'object' && asset.depreciationExpenseAccount ? asset.depreciationExpenseAccount._id : (typeof asset.fixedAssetAccount === 'string' ? asset.depreciationExpenseAccount : ''),
                        linkedVehicle: typeof asset.linkedVehicle === 'object' && asset.linkedVehicle ? asset.linkedVehicle._id : (typeof asset.linkedVehicle === 'string' ? asset.linkedVehicle : ''),
                        originalBill: typeof asset.originalBill === 'object' && asset.originalBill ? asset.originalBill._id : (typeof asset.originalBill === 'string' ? asset.originalBill : ''),
                        status: asset.status || 'Draft',
                        notes: asset.notes || ''
                    });
                    if (asset.depreciationSchedule) {
                        setPreviewSchedule(asset.depreciationSchedule);
                    }

                    // Dynamically append custom location/type if not in defaults
                    if (asset.location) {
                        const loc = asset.location;
                        setLocations(prev => {
                            if (!prev.includes(loc)) {
                                return [...prev, loc];
                            }
                            return prev;
                        });
                    }
                    if (asset.fixedAssetType) {
                        const fat = asset.fixedAssetType;
                        const fatId = typeof fat === 'object' && fat ? fat._id : fat;
                        const fatName = typeof fat === 'object' && fat ? fat.name : fat;
                        setFixedAssetTypes(prev => {
                            if (!prev.some(t => t._id === fatId)) {
                                return [...prev, { _id: fatId, name: fatName }];
                            }
                            return prev;
                        });
                    }

                    // Prepend original bill to options if not present
                    if (asset.originalBill) {
                        const linkedBillVal = typeof asset.originalBill === 'object' && asset.originalBill ? asset.originalBill : null;
                        if (linkedBillVal && linkedBillVal._id) {
                            const exists = fetchedBills.some(b => b._id === linkedBillVal._id);
                            if (!exists) {
                                fetchedBills = [linkedBillVal as any, ...fetchedBills];
                            }
                        }
                    }
                }

                setBills(fetchedBills);
            } catch (err: any) {
                setError('Failed to load form lookup data.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchMasterData();
    }, [id, isEditMode]);

    // Handle account selection auto-fills (especially for vehicles)
    const handleAccountChange = async (accountId: string) => {
        setFormData(prev => ({ ...prev, fixedAssetAccount: accountId }));
        const selected = accounts.find(a => a._id === accountId);
        if (selected) {
            // Check if user selected a vehicle account type
            const isVehicle = selected.name.toLowerCase().includes('vehicle') || selected.name.toLowerCase().includes('vehículo');
            if (isVehicle) {
                // Auto-fill Accumulated Depreciation & Expense accounts for vehicles
                const accDep = accounts.find(a => a.name.includes('Acumulated Depretiacion of Vehicles') || a.name.includes('Depreciación Acumulada de Vehículos'));
                const expDep = accounts.find(a => a.name === 'DEPRECIATION OF VEHICLES');
                
                setFormData(prev => ({
                    ...prev,
                    accumulatedDepreciationAccount: accDep ? accDep._id : prev.accumulatedDepreciationAccount,
                    depreciationExpenseAccount: expDep ? expDep._id : prev.depreciationExpenseAccount
                }));
            }
        }
    };

    // Calculate Depreciation Preview
    const handlePreviewSchedule = async () => {
        const cost = Number(formData.purchasePrice);
        if (!cost || cost <= 0) {
            toast.error('Please enter a valid Purchase Value first.');
            return;
        }
        setCalculatingPreview(true);
        try {
            const preview = await calculateDepreciationPreview({
                purchasePrice: cost,
                residualValue: Number(formData.disposalValue || 0),
                usefulLifeYears: formData.assetLifeUnit === 'Years' ? Number(formData.assetLife) : Number(formData.assetLife) / 12,
                depreciationInterval: formData.depreciationInterval,
                purchaseDate: formData.depreciationStartDate || formData.purchaseDate,
                purchaseValue: cost,
                disposalValue: Number(formData.disposalValue || 0),
                depreciationStartDate: formData.depreciationStartDate,
                assetLife: Number(formData.assetLife),
                assetLifeUnit: formData.assetLifeUnit
            });
            setPreviewSchedule(preview);
            toast.success('Depreciation schedule calculated!');
        } catch (err: any) {
            toast.error('Failed to calculate schedule preview.');
        } finally {
            setCalculatingPreview(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.fixedAssetAccount || !formData.accumulatedDepreciationAccount || !formData.depreciationExpenseAccount) {
            toast.error('Please select all required accounts.');
            return;
        }

        setSubmitting(true);
        setError(null);

        const payload = {
            name: formData.name,
            code: formData.code || undefined,
            purchaseDate: formData.purchaseDate,
            purchasePrice: Number(formData.purchasePrice),
            residualValue: Number(formData.disposalValue || 0),
            usefulLifeYears: formData.assetLifeUnit === 'Years' ? Number(formData.assetLife) : Number(formData.assetLife) / 12,
            
            location: formData.location,
            purchaseQuantity: Number(formData.purchaseQuantity || 1),
            serialNumber: formData.serialNumber,
            currentQuantity: Number(formData.currentQuantity || 1),
            currentValue: Number(formData.currentValue || formData.purchasePrice),
            disposalValue: Number(formData.disposalValue || 0),
            warrantyExpirationDate: formData.warrantyExpirationDate || undefined,
            fixedAssetType: formData.fixedAssetType,
            description: formData.description,
            notes: formData.notes,
            computationType: formData.computationType,
            depreciationStartDate: formData.depreciationStartDate,
            assetLife: Number(formData.assetLife),
            assetLifeUnit: formData.assetLifeUnit,

            depreciationMethod: formData.depreciationMethod,
            depreciationInterval: formData.depreciationInterval,
            fixedAssetAccount: formData.fixedAssetAccount,
            accumulatedDepreciationAccount: formData.accumulatedDepreciationAccount,
            depreciationExpenseAccount: formData.depreciationExpenseAccount,
            linkedVehicle: formData.linkedVehicle || undefined,
            originalBill: formData.originalBill || undefined,
            status: formData.status
        };

        try {
            if (isEditMode) {
                await updateFixedAsset(id, payload);
                toast.success('Asset updated successfully.');
            } else {
                await createFixedAsset(payload);
                toast.success('Asset capitalized successfully.');
            }
            navigate(`/admin/${getRolePath()}/fixed-assets`);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || 'Failed to save Fixed Asset');
            toast.error('Failed to capitalize asset.');
        } finally {
            setSubmitting(false);
        }
    };

    // Modals Submit and Success Handlers
    const handleAddBranchSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const { name, code, address, city, state, phone, email, country, countryManager } = newBranchData;
        if (!name.trim() || !code.trim() || !address.trim() || !city.trim() || !state.trim() || !phone.trim() || !email.trim() || !country.trim()) {
            toast.error('Please fill all required branch fields');
            return;
        }

        setBranchSubmitting(true);
        try {
            const result = await createBranch({
                name: name.trim(),
                code: code.trim().toUpperCase(),
                address: address.trim(),
                city: city.trim(),
                state: state.trim(),
                phone: phone.trim(),
                email: email.trim(),
                country: country.trim(),
                countryManager: countryManager || undefined,
                status: 'ACTIVE'
            });

            toast.success(`Branch "${result.name}" created successfully!`);

            // Refresh branch options & locations
            const branchRes = await getAllBranches({ limit: 100 });
            const branchesList = branchRes.data || [];
            setBranches(branchesList);
            const branchNames = branchesList.map(b => b.name);
            setLocations(branchNames);

            // Pre-select newly created branch in both location & vehicle branch selector
            setFormData(prev => ({ ...prev, location: result.name }));
            setNewVehicleData(prev => ({ ...prev, branch: result._id }));

            // Reset branch modal data and close
            setNewBranchData({
                name: '',
                code: '',
                address: '',
                city: '',
                state: '',
                phone: '',
                email: '',
                country: '',
                countryManager: ''
            });
            setIsBranchModalOpen(false);
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Failed to create branch');
        } finally {
            setBranchSubmitting(false);
        }
    };

    const handleBillSuccess = async () => {
        try {
            const oldBills = [...bills];
            const billsRes = await getAllBills({ limit: 50 });
            const newBills = billsRes.data || [];
            setBills(newBills);

            // Find the bill that exists in newBills but not in oldBills
            const newlyCreated = newBills.find(nb => !oldBills.some(ob => ob._id === nb._id));
            if (newlyCreated) {
                setFormData(prev => ({ ...prev, originalBill: newlyCreated._id }));
                toast.success(`Bill "${newlyCreated.billNumber}" created and linked!`);
            } else if (newBills.length > 0) {
                setFormData(prev => ({ ...prev, originalBill: newBills[0]._id }));
            }
            setIsBillModalOpen(false);
        } catch (err) {
            console.error('Failed to reload bills:', err);
        }
    };

    const handleAddAssetTypeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newAssetTypeName.trim();
        if (!trimmed) {
            toast.error('Asset Type name cannot be empty');
            return;
        }
        if (fixedAssetTypes.some(t => t.name.toLowerCase() === trimmed.toLowerCase())) {
            toast.error('Asset Type already exists');
            return;
        }
        try {
            const newType = await createFixedAssetType({ name: trimmed });
            setFixedAssetTypes(prev => [...prev, newType]);
            setFormData(prev => ({ ...prev, fixedAssetType: newType._id }));
            setIsAssetTypeModalOpen(false);
            setNewAssetTypeName('');
        } catch (err) {
            console.error("Failed to create fixed asset type:", err);
        }
    };

    const handleAccountSuccess = (newAccount: AccountingCode) => {
        setAccounts(prev => [...prev, newAccount]);
        
        if (accountModalTarget === 'fixedAsset') {
            setFormData(prev => ({ ...prev, fixedAssetAccount: newAccount._id }));
        } else if (accountModalTarget === 'accumulatedDepreciation') {
            setFormData(prev => ({ ...prev, accumulatedDepreciationAccount: newAccount._id }));
        } else if (accountModalTarget === 'depreciationExpense') {
            setFormData(prev => ({ ...prev, depreciationExpenseAccount: newAccount._id }));
        }
        
        setIsAccountModalOpen(false);
        setAccountModalTarget(null);
    };

    const handleAddVehicleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const price = Number(newVehicleData.purchasePrice);
        if (!newVehicleData.make.trim()) {
            toast.error('Make is required');
            return;
        }
        if (!newVehicleData.model.trim()) {
            toast.error('Model is required');
            return;
        }
        if (!newVehicleData.branch) {
            toast.error('Branch is required');
            return;
        }
        if (!price || price <= 0) {
            toast.error('Purchase price must be greater than 0');
            return;
        }

        setVehicleSubmitting(true);
        try {
            const payload = {
                purchaseDetails: {
                    vendorName: newVehicleData.vendorName,
                    purchaseDate: newVehicleData.purchaseDate,
                    purchasePrice: price,
                    currency: 'USD',
                    paymentMethod: 'Cash' as const,
                    branch: newVehicleData.branch
                },
                basicDetails: {
                    make: newVehicleData.make.trim(),
                    model: newVehicleData.model.trim(),
                    year: Number(newVehicleData.year),
                    vin: newVehicleData.vin.trim() ? newVehicleData.vin.trim().toUpperCase() : undefined,
                    category: newVehicleData.category,
                    fuelType: newVehicleData.fuelType,
                    transmission: newVehicleData.transmission
                }
            };
            const result = await createVehicle(payload);
            toast.success(`Vehicle "${payload.basicDetails.make} ${payload.basicDetails.model}" created successfully!`);
            
            setVehicles(prev => [...prev, result]);
            setFormData(prev => ({ ...prev, linkedVehicle: result._id }));
            
            setNewVehicleData({
                make: '',
                model: '',
                year: new Date().getFullYear(),
                vin: '',
                category: 'Sedan',
                fuelType: 'Petrol',
                transmission: 'Automatic',
                vendorName: 'Internal',
                purchasePrice: '',
                purchaseDate: new Date().toISOString().split('T')[0],
                branch: branches.length > 0 ? branches[0]._id : ''
            });
            setIsVehicleModalOpen(false);
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Failed to create vehicle');
        } finally {
            setVehicleSubmitting(false);
        }
    };

    const getAccountModalParams = () => {
        if (accountModalTarget === 'fixedAsset') {
            return { defaultCategory: 'ASSET' as const, defaultAccountType: 'Fixed Asset' };
        }
        if (accountModalTarget === 'accumulatedDepreciation') {
            return { defaultCategory: 'ASSET' as const, defaultAccountType: 'Fixed Asset' };
        }
        return { defaultCategory: 'EXPENSE' as const, defaultAccountType: 'Expense' };
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Breadcrumbs items={[{ label: 'Dashboard', path: '#' }, { label: 'Fixed Assets', path: '#' }, { label: 'Loading...', active: true }]} />
                <div className="w-10 h-10 border-4 border-[#C8E600] border-t-transparent rounded-full animate-spin" />
                <p style={{ color: 'var(--text-dim)' }}>Loading asset information...</p>
            </div>
        );
    }

    // Filters for asset, contra-asset, and expense accounts (robust case-insensitive check to support all db seed variants)
    const assetAccounts = accounts.filter(a => 
        (a.category?.toUpperCase() === 'ASSET' || a.category?.toUpperCase() === 'FIXED ASSET') && 
        (a.accountType?.toLowerCase() === 'fixed asset' || a.category?.toLowerCase() === 'fixed asset')
    );
    const contraAssetAccounts = accounts.filter(a => 
        a.category?.toUpperCase() === 'ASSET' || a.category?.toUpperCase() === 'FIXED ASSET'
    );
    const expenseAccounts = accounts.filter(a => 
        a.category?.toUpperCase() === 'EXPENSE' || a.category?.toUpperCase() === 'OTHER EXPENSE'
    );

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-20">
            <Breadcrumbs items={[
                { label: 'Dashboard', path: '#' },
                { label: 'Fixed Assets', path: `/admin/${getRolePath()}/fixed-assets` },
                { label: isEditMode ? 'Edit Asset' : 'Capitalize Asset', active: true }
            ]} />

            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2.5 rounded-xl hover:bg-white/5 transition-all text-[#C8E600] cursor-pointer">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                        {isEditMode ? 'Modify Capitalized Asset' : 'Capitalize New Asset'}
                    </h1>
                    <p className="text-xs font-semibold text-dim mt-0.5">Define capitalization parameters, salvage/residual values, and depreciation cycles</p>
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
                    <AlertCircle size={18} /> {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="rounded-2xl border p-8 space-y-8" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                    {/* Top Details (Two columns grid) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                        {/* Column 1 */}
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Fixed Asset Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Enter asset name"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm focus:ring-1 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Fixed Asset# <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <div className="w-1/2">
                                        <SearchableSelect
                                            options={[{ value: 'Default Transaction Series', label: 'Default Transaction Series' }]}
                                            value={formData.transactionSeries}
                                            onChange={val => setFormData({ ...formData, transactionSeries: val })}
                                            placeholder="Select Series"
                                            required
                                        />
                                    </div>
                                    <div className="relative flex-1">
                                        <input
                                            required
                                            type="text"
                                            placeholder="e.g. FA-00551"
                                            value={formData.code}
                                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                                            className="w-full pl-4 pr-10 py-3 rounded-xl outline-none text-sm focus:ring-1 focus:ring-lime font-mono"
                                            style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                        />
                                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#C8E600] transition-colors" title="Autogenerate code" onClick={() => setFormData(prev => ({ ...prev, code: `FA-${Math.floor(10000 + Math.random() * 90000)}` }))}>
                                            <Settings size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Purchase Value <span className="text-red-500">*</span>
                                    <span title="Original acquisition cost of the asset"><Info size={13} className="opacity-60 cursor-help" /></span>
                                </label>
                                <div className="flex">
                                    <span className="px-4 py-3 rounded-l-xl border-y border-l text-sm bg-white/5 font-bold" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>USD</span>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.purchasePrice}
                                        onChange={e => setFormData({ ...formData, purchasePrice: e.target.value, currentValue: formData.currentValue ? formData.currentValue : e.target.value })}
                                        className="w-full px-4 py-3 rounded-r-xl outline-none text-sm focus:ring-1 focus:ring-lime"
                                        style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Serial Number
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter manufacturer serial number"
                                    value={formData.serialNumber}
                                    onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm focus:ring-1 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Current Value
                                    <span title="Present book value of the asset"><Info size={13} className="opacity-60 cursor-help" /></span>
                                </label>
                                <div className="flex">
                                    <span className="px-4 py-3 rounded-l-xl border-y border-l text-sm bg-white/5 font-bold" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>USD</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.currentValue}
                                        onChange={e => setFormData({ ...formData, currentValue: e.target.value })}
                                        className="w-full px-4 py-3 rounded-r-xl outline-none text-sm focus:ring-1 focus:ring-lime"
                                        style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Disposal Value
                                    <span title="Estimated salvage/residual value at end of useful life"><Info size={13} className="opacity-60 cursor-help" /></span>
                                </label>
                                <div className="flex">
                                    <span className="px-4 py-3 rounded-l-xl border-y border-l text-sm bg-white/5 font-bold" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>USD</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={formData.disposalValue}
                                        onChange={e => setFormData({ ...formData, disposalValue: e.target.value })}
                                        className="w-full px-4 py-3 rounded-r-xl outline-none text-sm focus:ring-1 focus:ring-lime"
                                        style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Fixed Asset Type <span className="text-red-500">*</span>
                                    <span title="Select the class of fixed asset"><Info size={13} className="opacity-60 cursor-help" /></span>
                                </label>
                                <SearchableSelect
                                    options={fixedAssetTypes.map(type => ({ value: type._id, label: type.name }))}
                                    value={formData.fixedAssetType}
                                    onChange={val => setFormData({ ...formData, fixedAssetType: val })}
                                    placeholder="Select Fixed Asset Type"
                                    onAddNew={() => setIsAssetTypeModalOpen(true)}
                                    addNewText="Add New Asset Type"
                                    required
                                />
                            </div>
                        </div>

                        {/* Column 2 */}
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Location
                                </label>
                                <SearchableSelect
                                    options={locations.map(loc => ({ value: loc, label: loc }))}
                                    value={formData.location}
                                    onChange={val => setFormData({ ...formData, location: val })}
                                    placeholder="Select Location"
                                    onAddNew={() => setIsBranchModalOpen(true)}
                                    addNewText="Add New Branch"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Purchase Quantity
                                </label>
                                <input
                                    type="number"
                                    placeholder="1"
                                    value={formData.purchaseQuantity}
                                    onChange={e => setFormData({ ...formData, purchaseQuantity: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm focus:ring-1 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Current Quantity
                                </label>
                                <input
                                    type="number"
                                    placeholder="1"
                                    value={formData.currentQuantity}
                                    onChange={e => setFormData({ ...formData, currentQuantity: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm focus:ring-1 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Purchase Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    required
                                    type="date"
                                    value={formData.purchaseDate}
                                    onChange={e => setFormData({ ...formData, purchaseDate: e.target.value, depreciationStartDate: formData.depreciationStartDate ? formData.depreciationStartDate : e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm focus:ring-1 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Warranty Expiration Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.warrantyExpirationDate}
                                    onChange={e => setFormData({ ...formData, warrantyExpirationDate: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm focus:ring-1 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div className="flex-1 flex flex-col">
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Description
                                </label>
                                <textarea
                                    rows={5}
                                    placeholder="Enter detailed description of the asset"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm focus:ring-1 focus:ring-lime flex-1 resize-none"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Depreciation Details */}
                    <div className="border-t pt-6" style={{ borderColor: 'var(--border-main)' }}>
                        <h3 className="text-md font-black tracking-tight uppercase mb-5" style={{ color: 'var(--text-main)' }}>Depreciation Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Depreciation Method <span className="text-red-500">*</span>
                                    <span title="Calculation strategy for periodic depreciation"><Info size={13} className="opacity-60 cursor-help" /></span>
                                </label>
                                <SearchableSelect
                                    options={[{ value: 'Straight-Line', label: 'Straight-Line Method' }]}
                                    value={formData.depreciationMethod}
                                    onChange={val => setFormData({ ...formData, depreciationMethod: val as any })}
                                    placeholder="Select Method"
                                    required
                                />
                            </div>

                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Computation Type <span className="text-red-500">*</span>
                                    <span title="Determines how depreciation is calculated (e.g. Prorata basis or Full Period)"><Info size={13} className="opacity-60 cursor-help" /></span>
                                </label>
                                <SearchableSelect
                                    options={[
                                        { value: 'Prorata Basis', label: 'Prorata Basis' },
                                        { value: 'Full Period', label: 'Full Period' }
                                    ]}
                                    value={formData.computationType}
                                    onChange={val => setFormData({ ...formData, computationType: val })}
                                    placeholder="Select Computation Type"
                                    required
                                />
                            </div>

                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Depreciation Frequency <span className="text-red-500">*</span>
                                    <span title="Interval for posting depreciation journal entries"><Info size={13} className="opacity-60 cursor-help" /></span>
                                </label>
                                <SearchableSelect
                                    options={[
                                        { value: 'Monthly', label: 'Monthly' },
                                        { value: 'Yearly', label: 'Yearly' }
                                    ]}
                                    value={formData.depreciationInterval}
                                    onChange={val => setFormData({ ...formData, depreciationInterval: val as any })}
                                    placeholder="Select Frequency"
                                    required
                                />
                            </div>

                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Depreciation Start Date
                                    <span title="The date from which depreciation calculation starts"><Info size={13} className="opacity-60 cursor-help" /></span>
                                </label>
                                <input
                                    type="date"
                                    value={formData.depreciationStartDate}
                                    onChange={e => setFormData({ ...formData, depreciationStartDate: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl outline-none text-sm focus:ring-1 focus:ring-lime"
                                    style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>

                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Asset Life <span className="text-red-500">*</span>
                                    <span title="Useful lifespan of the asset"><Info size={13} className="opacity-60 cursor-help" /></span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        required
                                        type="number"
                                        min="1"
                                        placeholder="60"
                                        value={formData.assetLife}
                                        onChange={e => setFormData({ ...formData, assetLife: e.target.value })}
                                        className="w-2/3 px-4 py-3 rounded-xl outline-none text-sm focus:ring-1 focus:ring-lime"
                                        style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                    <div className="w-1/3">
                                        <SearchableSelect
                                            options={[
                                                { value: 'Months', label: 'Months' },
                                                { value: 'Years', label: 'Years' }
                                            ]}
                                            value={formData.assetLifeUnit}
                                            onChange={val => setFormData({ ...formData, assetLifeUnit: val as any })}
                                            placeholder="Unit"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end mt-4">
                            <button
                                type="button"
                                onClick={handlePreviewSchedule}
                                disabled={calculatingPreview}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-[#C8E600] transition-all cursor-pointer"
                            >
                                <Calculator size={14} /> {calculatingPreview ? 'Calculating...' : 'Preview Depreciation Schedule'}
                            </button>
                        </div>

                        {previewSchedule.length > 0 && (
                            <div className="mt-4 border rounded-xl overflow-hidden" style={{ borderColor: 'var(--border-main)' }}>
                                <div className="bg-white/5 px-4 py-2 text-[10px] font-bold uppercase text-dim tracking-wider" style={{ color: 'var(--text-dim)' }}>Depreciation Preview Schedule</div>
                                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-white/5 border-b" style={{ borderColor: 'var(--border-main)' }}>
                                            <tr>
                                                <th className="px-4 py-2 font-bold" style={{ color: 'var(--text-dim)' }}>#</th>
                                                <th className="px-4 py-2 font-bold" style={{ color: 'var(--text-dim)' }}>Period Date</th>
                                                <th className="px-4 py-2 font-bold" style={{ color: 'var(--text-dim)' }}>Depreciation</th>
                                                <th className="px-4 py-2 font-bold" style={{ color: 'var(--text-dim)' }}>Accumulated</th>
                                                <th className="px-4 py-2 font-bold text-right" style={{ color: 'var(--text-dim)' }}>Book Value</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {previewSchedule.map((entry) => (
                                                <tr key={entry.periodIndex} className="hover:bg-white/5 transition-colors">
                                                    <td className="px-4 py-2 font-semibold" style={{ color: 'var(--text-main)' }}>{entry.periodIndex}</td>
                                                    <td className="px-4 py-2 text-dim" style={{ color: 'var(--text-dim)' }}>{formatDateUTC(entry.periodDate)}</td>
                                                    <td className="px-4 py-2 text-main" style={{ color: 'var(--text-main)' }}>${entry.depreciationAmount.toFixed(2)}</td>
                                                    <td className="px-4 py-2 text-main" style={{ color: 'var(--text-main)' }}>${entry.accumulatedDepreciation.toFixed(2)}</td>
                                                    <td className="px-4 py-2 text-right font-bold text-[#C8E600]">${entry.bookValue.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section: Account Details */}
                    <div className="border-t pt-6" style={{ borderColor: 'var(--border-main)' }}>
                        <h3 className="text-md font-black tracking-tight uppercase mb-5" style={{ color: 'var(--text-main)' }}>Account Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Fixed Asset Account <span className="text-red-500">*</span>
                                    <span title="Asset account on the Balance Sheet"><Info size={13} className="opacity-60 cursor-help" /></span>
                                </label>
                                <SearchableSelect
                                    options={assetAccounts.map(a => ({ value: a._id, label: `${a.code} - ${a.name}` }))}
                                    value={formData.fixedAssetAccount}
                                    onChange={val => handleAccountChange(val)}
                                    placeholder="Select Fixed Asset Account"
                                    onAddNew={() => {
                                        setAccountModalTarget('fixedAsset');
                                        setIsAccountModalOpen(true);
                                    }}
                                    addNewText="Add New Account"
                                    required
                                />
                            </div>

                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Accumulated Depreciation Account <span className="text-red-500">*</span>
                                    <span title="Contra-asset account on the Balance Sheet"><Info size={13} className="opacity-60 cursor-help" /></span>
                                </label>
                                <SearchableSelect
                                    options={contraAssetAccounts.map(a => ({ value: a._id, label: `${a.code} - ${a.name}` }))}
                                    value={formData.accumulatedDepreciationAccount}
                                    onChange={val => setFormData({ ...formData, accumulatedDepreciationAccount: val })}
                                    placeholder="Select Contra-Asset Account"
                                    onAddNew={() => {
                                        setAccountModalTarget('accumulatedDepreciation');
                                        setIsAccountModalOpen(true);
                                    }}
                                    addNewText="Add New Account"
                                    required
                                />
                            </div>

                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Depreciation Expense Account <span className="text-red-500">*</span>
                                    <span title="Expense account on the Profit & Loss Statement"><Info size={13} className="opacity-60 cursor-help" /></span>
                                </label>
                                <SearchableSelect
                                    options={expenseAccounts.map(a => ({ value: a._id, label: `${a.code} - ${a.name}` }))}
                                    value={formData.depreciationExpenseAccount}
                                    onChange={val => setFormData({ ...formData, depreciationExpenseAccount: val })}
                                    placeholder="Select Expense Account"
                                    onAddNew={() => {
                                        setAccountModalTarget('depreciationExpense');
                                        setIsAccountModalOpen(true);
                                    }}
                                    addNewText="Add New Account"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Link to Fleet Vehicle (Optional)
                                </label>
                                <SearchableSelect
                                    options={vehicles.map(v => ({
                                        value: v._id,
                                        label: `${v.basicDetails?.make || ''} ${v.basicDetails?.model || ''} (${v.legalDocs?.registrationNumber || v.basicDetails?.vin || 'Unregistered'})`
                                    }))}
                                    value={formData.linkedVehicle}
                                    onChange={val => setFormData({ ...formData, linkedVehicle: val })}
                                    placeholder="Select Vehicle"
                                    onAddNew={() => setIsVehicleModalOpen(true)}
                                    addNewText="Add New Vehicle"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Link to Purchase Bill (Optional)
                                </label>
                                <SearchableSelect
                                    options={bills.map(b => ({
                                        value: b._id,
                                        label: `${b.billNumber || ''} ($${(b.totalAmount || 0).toFixed(2)}) - ${b.supplier?.name || b.supplier || 'N/A'}`
                                    }))}
                                    value={formData.originalBill}
                                    onChange={val => setFormData({ ...formData, originalBill: val })}
                                    placeholder="Select Purchase Bill"
                                    onAddNew={() => setIsBillModalOpen(true)}
                                    addNewText="Add New Bill"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                                    Capitalization Status
                                </label>
                                <SearchableSelect
                                    options={[
                                        { value: 'Draft', label: 'Draft' },
                                        { value: 'Pending', label: 'Pending (Approved but inactive)' },
                                        { value: 'Active', label: 'Active (Depreciating)' },
                                        { value: 'Inactive', label: 'Inactive (Disposed / Retired)' }
                                    ]}
                                    value={formData.status}
                                    onChange={val => setFormData({ ...formData, status: val as any })}
                                    placeholder="Select Status"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Notes */}
                    <div className="border-t pt-6" style={{ borderColor: 'var(--border-main)' }}>
                        <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>
                            Notes
                            <span title="Additional internal notes about the asset"><Info size={13} className="opacity-60 cursor-help" /></span>
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Enter notes..."
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl outline-none text-sm focus:ring-1 focus:ring-lime resize-none"
                            style={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>
                </div>

                {/* Form Buttons */}
                <div className="flex gap-4 justify-end">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="px-6 py-3 rounded-xl text-sm font-bold border border-white/10 hover:bg-white/5 transition-all text-dim cursor-pointer"
                        style={{ color: 'var(--text-dim)' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-8 py-3 rounded-xl text-sm font-bold shadow-lg hover:scale-102 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
                        style={{ background: '#C8E600', color: '#111' }}
                    >
                            {isEditMode ? 'Update Capitalization' : 'Capitalize and Save Asset'}
                    </button>
                </div>
            </form>

            {/* Quick Add Branch Modal */}
            <Modal isOpen={isBranchModalOpen} onClose={() => setIsBranchModalOpen(false)} title="Quick Add Branch">
                <form onSubmit={handleAddBranchSubmit} className="space-y-4 text-xs font-semibold">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-dim mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                Branch Name *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Downtown Office"
                                value={newBranchData.name}
                                onChange={e => setNewBranchData({ ...newBranchData, name: e.target.value })}
                                className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-[#C8E600] transition-all"
                                style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-dim mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                Branch Code *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. DT-01"
                                value={newBranchData.code}
                                onChange={e => setNewBranchData({ ...newBranchData, code: e.target.value })}
                                className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-[#C8E600] transition-all uppercase"
                                style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-dim mb-1.5" style={{ color: 'var(--text-dim)' }}>
                            Address *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. 123 Main St"
                            value={newBranchData.address}
                            onChange={e => setNewBranchData({ ...newBranchData, address: e.target.value })}
                            className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-[#C8E600] transition-all"
                            style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-dim mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                City *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Los Angeles"
                                value={newBranchData.city}
                                onChange={e => setNewBranchData({ ...newBranchData, city: e.target.value })}
                                className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-[#C8E600] transition-all"
                                style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-dim mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                State *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. CA"
                                value={newBranchData.state}
                                onChange={e => setNewBranchData({ ...newBranchData, state: e.target.value })}
                                className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-[#C8E600] transition-all"
                                style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-dim mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                Phone *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. +1 555-0199"
                                value={newBranchData.phone}
                                onChange={e => setNewBranchData({ ...newBranchData, phone: e.target.value })}
                                className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-[#C8E600] transition-all"
                                style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-dim mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                Email *
                            </label>
                            <input
                                type="email"
                                required
                                placeholder="e.g. downtown@olacars.com"
                                value={newBranchData.email}
                                onChange={e => setNewBranchData({ ...newBranchData, email: e.target.value })}
                                className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-[#C8E600] transition-all"
                                style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-dim mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                Country Manager
                            </label>
                            <SearchableSelect
                                options={countryManagers.map(cm => ({
                                    value: cm._id,
                                    label: `${cm.fullName} (${cm.country})`
                                }))}
                                value={newBranchData.countryManager}
                                onChange={val => {
                                    const mgr = countryManagers.find(cm => cm._id === val);
                                    setNewBranchData(prev => ({
                                        ...prev,
                                        countryManager: val,
                                        country: mgr ? mgr.country : prev.country
                                    }));
                                }}
                                placeholder="Select Country Manager"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-dim mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                Country *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. United States"
                                value={newBranchData.country}
                                onChange={e => setNewBranchData({ ...newBranchData, country: e.target.value })}
                                className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-[#C8E600] transition-all"
                                style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <button
                            type="button"
                            disabled={branchSubmitting}
                            onClick={() => setIsBranchModalOpen(false)}
                            className="flex-1 px-5 py-2.5 rounded-xl border font-bold hover:bg-white/5 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={branchSubmitting}
                            className="flex-1 px-5 py-2.5 rounded-xl font-black text-black bg-[#C8E600] flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                            style={{ background: '#C8E600' }}
                        >
                            <Plus size={14} strokeWidth={3} />
                            {branchSubmitting ? 'Creating...' : 'Create Branch'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Create Bill Modal */}
            <CreateBillModal
                isOpen={isBillModalOpen}
                onClose={() => setIsBillModalOpen(false)}
                onSuccess={handleBillSuccess}
            />

            {/* Quick Add Asset Type Modal */}
            <Modal isOpen={isAssetTypeModalOpen} onClose={() => setIsAssetTypeModalOpen(false)} title="Quick Add Asset Type">
                <form onSubmit={handleAddAssetTypeSubmit} className="space-y-4 text-xs font-semibold">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>
                            Asset Type Name *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Office Equipment"
                            value={newAssetTypeName}
                            onChange={e => setNewAssetTypeName(e.target.value)}
                            className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-[#C8E600] transition-all font-semibold"
                            style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                    </div>
                    <div className="pt-4 flex gap-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <button
                            type="button"
                            onClick={() => setIsAssetTypeModalOpen(false)}
                            className="flex-1 px-5 py-2.5 rounded-xl border font-bold hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-5 py-2.5 rounded-xl font-black text-black bg-[#C8E600] flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                            style={{ background: '#C8E600' }}
                        >
                            <Plus size={14} strokeWidth={3} />
                            Add Asset Type
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Quick Add Accounting Code Modal */}
            <QuickAddAccountModal
                isOpen={isAccountModalOpen}
                onClose={() => {
                    setIsAccountModalOpen(false);
                    setAccountModalTarget(null);
                }}
                onSuccess={handleAccountSuccess}
                {...getAccountModalParams()}
            />

            {/* Quick Add Vehicle Modal */}
            <Modal isOpen={isVehicleModalOpen} onClose={() => setIsVehicleModalOpen(false)} title="Quick Add Fleet Vehicle">
                <form onSubmit={handleAddVehicleSubmit} className="space-y-4 text-xs font-semibold">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-dim mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                Make *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Toyota"
                                value={newVehicleData.make}
                                onChange={e => setNewVehicleData({ ...newVehicleData, make: e.target.value })}
                                className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-[#C8E600] transition-all"
                                style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-dim mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                Model *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Camry"
                                value={newVehicleData.model}
                                onChange={e => setNewVehicleData({ ...newVehicleData, model: e.target.value })}
                                className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-[#C8E600] transition-all"
                                style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-dim mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                Year *
                            </label>
                            <input
                                type="number"
                                required
                                min="1900"
                                max={new Date().getFullYear() + 2}
                                value={newVehicleData.year}
                                onChange={e => setNewVehicleData({ ...newVehicleData, year: Number(e.target.value) })}
                                className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-[#C8E600] transition-all font-mono"
                                style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-dim mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                VIN
                            </label>
                            <input
                                type="text"
                                placeholder="17-digit VIN (Optional)"
                                value={newVehicleData.vin}
                                onChange={e => setNewVehicleData({ ...newVehicleData, vin: e.target.value })}
                                className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-[#C8E600] transition-all font-mono uppercase"
                                style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-dim mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                Category
                            </label>
                            <SearchableSelect
                                options={[
                                    { value: 'Sedan', label: 'Sedan' },
                                    { value: 'SUV', label: 'SUV' },
                                    { value: 'Pickup', label: 'Pickup' },
                                    { value: 'Van', label: 'Van' },
                                    { value: 'Luxury', label: 'Luxury' },
                                    { value: 'Commercial', label: 'Commercial' },
                                    { value: 'MUV', label: 'MUV' }
                                ]}
                                value={newVehicleData.category}
                                onChange={val => setNewVehicleData({ ...newVehicleData, category: val as any })}
                                placeholder="Select Category"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-dim mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                Fuel Type
                            </label>
                            <SearchableSelect
                                options={[
                                    { value: 'Petrol', label: 'Petrol' },
                                    { value: 'Diesel', label: 'Diesel' },
                                    { value: 'Hybrid', label: 'Hybrid' },
                                    { value: 'Electric', label: 'Electric' }
                                ]}
                                value={newVehicleData.fuelType}
                                onChange={val => setNewVehicleData({ ...newVehicleData, fuelType: val as any })}
                                placeholder="Select Fuel Type"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-dim mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                Gearbox
                            </label>
                            <SearchableSelect
                                options={[
                                    { value: 'Automatic', label: 'Automatic' },
                                    { value: 'Manual', label: 'Manual' }
                                ]}
                                value={newVehicleData.transmission}
                                onChange={val => setNewVehicleData({ ...newVehicleData, transmission: val as any })}
                                placeholder="Select Gearbox"
                                required
                            />
                        </div>
                    </div>

                    <div className="border-t pt-4 space-y-4" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-dim mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                    Purchase Price (USD) *
                                </label>
                                <input
                                    type="number"
                                    required
                                    placeholder="0.00"
                                    value={newVehicleData.purchasePrice}
                                    onChange={e => setNewVehicleData({ ...newVehicleData, purchasePrice: e.target.value })}
                                    className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-[#C8E600] transition-all font-mono"
                                    style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-dim mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                    Branch *
                                </label>
                                <SearchableSelect
                                    options={branches.map(br => ({ value: br._id, label: br.name }))}
                                    value={newVehicleData.branch}
                                    onChange={val => setNewVehicleData({ ...newVehicleData, branch: val })}
                                    placeholder="Select Branch"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-dim mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                    Purchase Date *
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={newVehicleData.purchaseDate}
                                    onChange={e => setNewVehicleData({ ...newVehicleData, purchaseDate: e.target.value })}
                                    className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-[#C8E600] transition-all font-mono"
                                    style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-dim mb-1.5" style={{ color: 'var(--text-dim)' }}>
                                    Vendor Name
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Internal / Auto Dealer"
                                    value={newVehicleData.vendorName}
                                    onChange={e => setNewVehicleData({ ...newVehicleData, vendorName: e.target.value })}
                                    className="w-full px-4 py-2.5 border rounded-xl outline-none focus:border-[#C8E600] transition-all"
                                    style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <button
                            type="button"
                            disabled={vehicleSubmitting}
                            onClick={() => setIsVehicleModalOpen(false)}
                            className="flex-1 px-5 py-2.5 rounded-xl border font-bold hover:bg-white/5 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={vehicleSubmitting}
                            className="flex-1 px-5 py-2.5 rounded-xl font-black text-black bg-[#C8E600] flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                            style={{ background: '#C8E600' }}
                        >
                            <Plus size={14} strokeWidth={3} />
                            {vehicleSubmitting ? 'Creating...' : 'Onboard Vehicle'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default CreateFixedAsset;
