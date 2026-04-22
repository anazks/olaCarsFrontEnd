import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Car, Search, CheckCircle2, ShieldCheck, Route as RouteIcon, Tag, Upload, FileText } from 'lucide-react';
import { getDriverById, progressDriver, uploadDriverDocument } from '../../../services/driverService';
import { getAvailableVehicles, assignVehicleToDriver } from '../../../services/vehicleService';
import agreementService from '../../../services/agreementService';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import type { Driver } from '../../../services/driverService';
import type { Vehicle } from '../../../services/vehicleService';

const DriverVehicleAssignment = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [driver, setDriver] = useState<Driver | null>(null);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
    const [assigning, setAssigning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadedContract, setUploadedContract] = useState<File | null>(null);
    const [generatingPreview, setGeneratingPreview] = useState(false);
    
    const [leaseDuration, setLeaseDuration] = useState<number>(260);
    const [weeklyRent, setWeeklyRent] = useState<number>(0);
    const [notes, setNotes] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                setLoading(true);
                const driverData = await getDriverById(id);
                setDriver(driverData);

                const response = await getAvailableVehicles({
                    limit: 100
                });

                const vehiclesList = response.data || [];
                setVehicles(vehiclesList);

            } catch (err: any) {
                console.error("Error fetching assignment data:", err);
                setError(err.response?.data?.message || 'Failed to load assignment data.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [id]);

    useEffect(() => {
        if (selectedVehicleId) {
            const v = vehicles.find(v => v._id === selectedVehicleId);
            if (v) {
                setLeaseDuration(v.basicDetails.leaseDurationWeeks || 260);
                setWeeklyRent(v.basicDetails.weeklyRent || 0);
            }
        }
    }, [selectedVehicleId, vehicles]);

    const handlePreviewAgreement = async () => {
        if (!selectedVehicleId) {
            toast.error('Please select a vehicle first.');
            return;
        }

        const toastId = toast.loading('Fetching & Generating Preview...');
        try {
            setGeneratingPreview(true);
            const templates = await agreementService.getAgreements({ type: 'VEHICLE_ASSIGNMENT_AGREEMENT' });
            if (!templates || templates.length === 0) {
                throw new Error('No Vehicle Assignment Agreement template found in the system. Please upload a signed physical copy.');
            }
            const templateId = templates[0]._id;
            
            // Convert weeks to months and weekly rent to monthly rent for backend placeholders
            const durationMonths = Math.round((leaseDuration / 52) * 12);
            const rentMonthly = Math.round(weeklyRent * 4.33);

            const rendered = await agreementService.getRenderedAgreement(templateId, {
                driverId: id,
                vehicleId: selectedVehicleId,
                leaseDuration: durationMonths,
                monthlyRent: rentMonthly
            });

            const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
            const container = document.createElement('div');
            container.style.width = '550pt';
            container.style.padding = '40pt';
            container.style.color = '#111';
            container.style.fontFamily = 'serif';
            container.style.lineHeight = '1.6';
            container.innerHTML = rendered.renderedContent;

            const style = document.createElement('style');
            style.innerHTML = `
                h1, h2, h3 { font-family: sans-serif; margin-top: 1.5em; margin-bottom: 0.5em; color: #111; }
                p { margin-bottom: 1em; }
                table { width: 100%; border-collapse: collapse; margin: 1em 0; }
                th, td { border: 1pt solid #eee; padding: 8pt; text-align: left; }
            `;
            container.appendChild(style);
            document.body.appendChild(container);

            await doc.html(container, {
                x: 20,
                y: 20,
                width: 550,
                windowWidth: 800,
                callback: function (doc) {
                    const pdfBlob = doc.output('blob');
                    document.body.removeChild(container);

                    const url = URL.createObjectURL(pdfBlob);
                    window.open(url, '_blank');
                    toast.success('Preview generated.', { id: toastId });
                    setGeneratingPreview(false);
                }
            });
        } catch (err: any) {
            console.error("Error creating preview:", err);
            toast.error(err.response?.data?.message || err.message || 'Failed to preview agreement.', { id: toastId });
            setGeneratingPreview(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadedContract(e.target.files[0]);
        }
    };

    const handleAssign = async () => {
        if (!id || !selectedVehicleId) return;

        if (!uploadedContract) {
            toast.error('Please upload a signed contract before confirming assignment.');
            return;
        }

        const toastId = toast.loading('Uploading and generating assignment...');
        try {
            setAssigning(true);
            setError(null);

            const formData = new FormData();
            formData.append('contractPDF', uploadedContract, uploadedContract.name);
            await uploadDriverDocument(id, formData);

            await assignVehicleToDriver(selectedVehicleId, id, {
                durationWeeks: leaseDuration,
                weeklyRent: weeklyRent,
                notes: notes
            });

            if (driver?.status !== 'ACTIVE') {
                await progressDriver(id, 'ACTIVE', { notes: 'Activated automatically via vehicle assignment and signed contract submission.' });
            }

            toast.success('Vehicle assigned successfully.', { id: toastId });
            navigate('..');
        } catch (err: any) {
            console.error("Error assigning vehicle:", err);
            const errorMessage = err.response?.data?.message || err.message || 'Failed to assign vehicle.';
            setError(errorMessage);
            toast.error(errorMessage, { id: toastId });
            setAssigning(false);
        }
    };

    const filteredVehicles = vehicles.filter(v =>
        (v.basicDetails.make + ' ' + v.basicDetails.model).toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.legalDocs?.registrationNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.basicDetails.vin.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="p-8 text-center animate-pulse flex flex-col items-center gap-4">
                <Car size={32} className="animate-bounce" style={{ color: 'var(--text-dim)', opacity: 0.5 }} />
                <span className="font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Loading Assignment Data...</span>
            </div>
        );
    }

    if (!driver) {
        return <div className="p-8 text-center font-bold text-red-500">Driver not found</div>;
    }

    return (
        <div className="p-4 lg:p-6 container-responsive space-y-6">
            <div className="flex items-center gap-4 border-b pb-5" style={{ borderColor: 'var(--border-main)' }}>
                <button onClick={() => navigate('..')} className="p-2 hover:bg-white/5 rounded-xl border border-transparent transition-all group">
                    <ChevronLeft size={22} style={{ color: 'var(--text-main)' }} />
                </button>
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold" style={{ color: 'var(--text-main)' }}>Assign Vehicle</h1>
                    <p className="text-xs lg:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        Select an available vehicle to assign to <span className="font-bold" style={{ color: 'var(--text-main)' }}>{driver.personalInfo.fullName}</span>
                    </p>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-xl border flex items-start gap-3 bg-red-500/10 border-red-500/20 text-red-500">
                    <ShieldCheck size={20} className="shrink-0" />
                    <div>
                        <p className="font-bold text-sm uppercase tracking-wider">Assignment Failed</p>
                        <p className="text-xs mt-1">{error}</p>
                    </div>
                </div>
            )}

            <div className="relative">
                <input
                    type="text"
                    placeholder="Search by make, model, VIN or registration..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border p-3.5 lg:p-4 pl-12 rounded-2xl font-bold shadow-sm outline-none focus:border-brand-lime transition-all"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                />
                <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
            </div>

            {filteredVehicles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredVehicles.map((vehicle) => {
                        const isSelected = selectedVehicleId === vehicle._id;

                        return (
                            <div
                                key={vehicle._id}
                                onClick={() => setSelectedVehicleId(vehicle._id)}
                                className={`cursor-pointer rounded-2xl border p-5 transition-all relative overflow-hidden group ${isSelected
                                        ? 'border-brand-lime shadow-lg scale-[1.02] bg-brand-lime/5'
                                        : 'hover:border-brand-lime hover:shadow-md'
                                    }`}
                                style={{ backgroundColor: isSelected ? '' : 'var(--bg-card)', borderColor: isSelected ? 'var(--brand-lime)' : 'var(--border-main)' }}
                            >
                                {isSelected && (
                                    <div className="absolute top-0 right-0 p-3 bg-brand-lime rounded-bl-2xl">
                                        <CheckCircle2 size={16} className="text-black" />
                                    </div>
                                )}

                                <div className="w-full aspect-video rounded-xl mb-4 flex items-center justify-center overflow-hidden border" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                                    <Car size={32} style={{ color: 'var(--text-dim)', opacity: 0.3 }} />
                                </div>

                                <div className="space-y-2">
                                    <h3 className="font-bold text-lg leading-tight" style={{ color: 'var(--text-main)' }}>
                                        {vehicle.basicDetails.make} {vehicle.basicDetails.model}
                                    </h3>

                                    <div className="grid grid-cols-2 gap-2 text-xs font-medium" style={{ color: 'var(--text-dim)' }}>
                                        <p className="flex items-center gap-1"><Tag size={12} className="opacity-70" /> {vehicle.basicDetails.year}</p>
                                        <p className="flex items-center gap-1 truncate"><ShieldCheck size={12} className="opacity-70" /> {vehicle.legalDocs?.registrationNumber || 'No Reg'}</p>
                                    </div>
                                    <div className="pt-3 mt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] uppercase font-bold tracking-wider truncate opacity-70">VIN: {vehicle.basicDetails.vin}</p>
                                            {vehicle.basicDetails.weeklyRent ? (
                                                <p className="text-xs font-black text-brand-lime">${vehicle.basicDetails.weeklyRent.toLocaleString()}/wk</p>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="py-20 text-center flex flex-col items-center rounded-2xl border border-dashed" style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                    <Car size={48} className="mb-4" style={{ color: 'var(--text-dim)', opacity: 0.5 }} />
                    <p className="font-bold uppercase tracking-widest text-sm" style={{ color: 'var(--text-dim)' }}>No Available Vehicles Found</p>
                    {searchQuery && <p className="text-xs mt-2 font-medium" style={{ color: 'var(--text-muted)' }}>Try adjusting your search query</p>}
                </div>
            )}

            {selectedVehicleId && (
                <div className="fixed bottom-0 left-0 right-0 border-t p-4 lg:p-6 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] z-50 animate-in slide-in-from-bottom-5 backdrop-blur-xl" style={{ backgroundColor: 'rgba(28, 28, 28, 0.9)', borderColor: 'var(--border-main)' }}>
                    <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 lg:gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-brand-lime/20 text-brand-lime flex items-center justify-center shrink-0">
                                    <RouteIcon size={24} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-dim">Selected Vehicle</p>
                                    <p className="font-black text-lg lg:text-xl truncate">
                                        {vehicles.find(v => v._id === selectedVehicleId)?.basicDetails.make} {vehicles.find(v => v._id === selectedVehicleId)?.basicDetails.model}
                                    </p>
                                </div>
                            </div>

                            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] lg:text-[10px] font-black uppercase tracking-widest opacity-70">Duration (Weeks)</label>
                                    <select
                                        value={leaseDuration}
                                        onChange={(e) => setLeaseDuration(Number(e.target.value))}
                                        className="w-full px-3 py-2 rounded-xl border outline-none font-bold focus:border-brand-lime transition-all appearance-none text-sm"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    >
                                        <option value="52">52 Weeks (1 Year)</option>
                                        <option value="104">104 Weeks (2 Years)</option>
                                        <option value="156">156 Weeks (3 Years)</option>
                                        <option value="208">208 Weeks (4 Years)</option>
                                        <option value="260">260 Weeks (5 Years)</option>
                                        <option value="312">312 Weeks (6 Years)</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] lg:text-[10px] font-black uppercase tracking-widest opacity-70">Weekly Rent (USD)</label>
                                    <input
                                        type="number"
                                        value={weeklyRent}
                                        onChange={(e) => setWeeklyRent(Number(e.target.value))}
                                        className="w-full px-3 py-2 rounded-xl border outline-none font-bold focus:border-brand-lime transition-all text-sm"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[11px] lg:text-[10px] font-black uppercase tracking-widest text-dim">Optional Notes</label>
                                    <input
                                        type="text"
                                        placeholder="Additional terms..."
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        className="w-full px-4 py-2 rounded-xl border outline-none focus:ring-2 focus:ring-lime/50 transition-all text-sm"
                                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="flex flex-wrap gap-2 lg:gap-3 w-full md:w-auto">
                                <button
                                    onClick={handlePreviewAgreement}
                                    disabled={generatingPreview || !leaseDuration}
                                    className="flex items-center gap-2 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl text-[11px] lg:text-xs font-bold transition-all border disabled:opacity-50 hover:bg-white/5"
                                    style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)', background: 'var(--bg-input)' }}
                                >
                                    {generatingPreview ? (
                                        <><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div> Generating...</>
                                    ) : (
                                        <><FileText size={16} /> Preview Agreement</>
                                    )}
                                </button>

                                <label className="flex items-center gap-2 px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl text-[11px] lg:text-xs font-bold transition-all border cursor-pointer hover:border-brand-lime"
                                    style={{ borderColor: uploadedContract ? 'var(--brand-lime)' : 'var(--border-main)', color: uploadedContract ? 'var(--brand-lime)' : 'var(--text-main)', background: uploadedContract ? 'rgba(200,230,0,0.05)' : 'var(--bg-input)' }}
                                >
                                    <Upload size={16} />
                                    {uploadedContract ? 'Change File' : 'Upload Signed Contract'}
                                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} />
                                </label>
                                {uploadedContract && (
                                    <span className="text-[10px] lg:text-xs font-medium flex items-center px-2 truncate max-w-[120px] lg:max-w-[150px]" style={{ color: 'var(--text-dim)' }}>
                                        {uploadedContract.name}
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2 lg:gap-3 w-full md:w-auto mt-2 md:mt-0">
                                <button
                                    onClick={() => setSelectedVehicleId(null)}
                                    className="flex-1 lg:flex-none px-5 lg:px-6 py-2.5 lg:py-3 rounded-xl font-bold transition-all uppercase tracking-wider text-[10px] lg:text-xs border"
                                    style={{ color: 'var(--text-dim)', borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAssign}
                                    disabled={assigning || !uploadedContract || !leaseDuration || !weeklyRent}
                                    className="flex-1 lg:flex-none px-6 lg:px-8 py-2.5 lg:py-3 rounded-xl font-black shadow-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed uppercase tracking-wider text-[10px] lg:text-xs"
                                    style={{ background: 'var(--brand-lime)', color: 'var(--brand-black, #000)' }}
                                >
                                    {assigning ? (
                                        <><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div> Processing...</>
                                    ) : (
                                        <><CheckCircle2 size={18} /> Confirm Assignment</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom spacer so action bar doesn't overlap content */}
            {selectedVehicleId && <div className="h-48 lg:h-40 xl:h-32"></div>}
        </div>
    );
};

export default DriverVehicleAssignment;
