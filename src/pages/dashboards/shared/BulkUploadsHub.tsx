import { useState } from 'react';
import { Upload, Users, Car, DatabaseZap, BookOpen, X, ShieldAlert, ArrowRight, Lock } from 'lucide-react';
import { getDecodedToken } from '../../../utils/auth';
import Breadcrumbs from '../../../components/dashboard/shared/Breadcrumbs';
import BulkDriverUpload from './BulkDriverUpload';
import BulkVehicleUpload from './BulkVehicleUpload';
import DataMigrationUpload from './DataMigrationUpload';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import BulkUploadJournal from '../finance/BulkUploadJournal';

type ModalType = 'driver' | 'vehicle' | 'migration' | 'journal' | null;

const BulkUploadsHub = () => {
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const decoded = getDecodedToken();
    const userRole = (decoded?.role ?? '').toLowerCase();

    // Check accessibility for each operation
    const hasDriverAccess = ['admin', 'operationadmin', 'countrymanager', 'branchmanager', 'operationstaff'].includes(userRole);
    const hasVehicleAccess = ['admin', 'operationadmin', 'countrymanager', 'branchmanager', 'operationstaff', 'workshopmanager', 'workshopstaff', 'financestaff', 'financeadmin'].includes(userRole);
    const hasMigrationAccess = ['admin', 'operationadmin'].includes(userRole);
    const hasJournalAccess = ['admin', 'financeadmin', 'financestaff'].includes(userRole);

    const handleDownloadTemplate = (type: 'driver' | 'vehicle' | 'migration' | 'journal', format: 'csv' | 'xlsx' = 'xlsx') => {
        // Direct download helper or prompt depending on complexity
        let fileName = '';
        let headers: string[] = [];
        let rows: string[][] = [];

        if (type === 'driver') {
            fileName = 'driver_bulk_template.csv';
            headers = ['fullName', 'email', 'phone', 'whatsappNumber', 'dateOfBirth', 'nationality', 'idType', 'idNumber', 'licenseNumber', 'licenseCountry', 'licenseExpiry', 'emergencyName', 'emergencyRelationship', 'emergencyPhone'];
            rows = [['John Doe', 'john@example.com', '+15550199', '+15550199', '1990-01-01', 'US', 'Passport', 'P12345', 'L9988', 'US', '2028-12-31', 'Jane Doe', 'Spouse', '+15550198']];
        } else if (type === 'vehicle') {
            fileName = 'vehicle_bulk_template.csv';
            headers = ['make', 'model', 'year', 'vin', 'registrationNumber', 'registrationExpiry', 'category', 'fuelType', 'transmission', 'colour', 'odometer', 'gpsSerialNumber', 'purchasePrice', 'vendorName', 'purchaseDate', 'paymentMethod', 'weeklyRent', 'sellingValue', 'leaseDurationWeeks', 'fleetNumber'];
            rows = [['Toyota', 'Camry', '2022', '1NXBR32E6NZ000001', 'REG-123', '2027-12-31', 'Sedan', 'Petrol', 'Automatic', 'Black', '12000', 'GPS-777', '22000', 'Toyota Dealers', '2022-05-10', 'Cash', '180', '16000', '260', 'FL-101']];
        } else if (type === 'migration') {
            fileName = 'data_migration_template.csv';
            headers = ['driverFullName', 'driverEmail', 'driverPhone', 'whatsappNumber', 'dateOfBirth', 'nationality', 'idType', 'idNumber', 'licenseNumber', 'licenseCountry', 'licenseExpiry', 'emergencyName', 'emergencyRelationship', 'emergencyPhone', 'vehicleMake', 'vehicleModel', 'vehicleYear', 'vehicleVin', 'vehicleRegNumber', 'vehicleRegExpiry', 'vehicleCategory', 'vehicleFuelType', 'vehicleTransmission', 'vehicleColour', 'vehicleOdometer', 'vehicleGpsSerial', 'vehiclePurchasePrice', 'vehicleVendorName', 'vehiclePurchaseDate', 'vehiclePaymentMethod', 'vehicleWeeklyRent', 'vehicleSellingValue', 'vehicleLeaseDurationWeeks', 'vehicleFleetNumber'];
            rows = [['Jane Doe', 'jane@example.com', '+15551000', '+15551000', '1993-05-20', 'US', 'Passport', 'P54321', 'L1122', 'US', '2029-01-01', 'Bob Doe', 'Father', '+15552000', 'Toyota', 'Prius', '2021', '1NXBR32E6NZ000099', 'REG-999', '2028-06-30', 'Sedan', 'Hybrid', 'Automatic', 'White', '25000', 'GPS-888', '19000', 'Prius Fleet', '2021-10-12', 'Finance', '160', '14000', '260', 'FL-999']];
        } else if (type === 'journal') {
            fileName = 'journal_entries_template.csv';
            headers = ['date', 'reference', 'description', 'accountCode', 'accountName', 'debit', 'credit', 'branchCode'];
            rows = [
                ['2026-05-20', 'INV-001', 'Rent payment received', '1010', 'Cash', '200', '0', 'BR01'],
                ['2026-05-20', 'INV-001', 'Rent revenue earned', '4010', 'Rent Income', '0', '200', 'BR01']
            ];
        }

        if (format === 'xlsx') {
            const downloadName = fileName.replace('.csv', '.xlsx');
            const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
            XLSX.writeFile(workbook, downloadName);
            toast.success(`${downloadName} downloaded!`);
            return;
        }

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`${fileName} downloaded!`);
    };

    return (
        <div className="flex-1 min-h-screen p-2 space-y-2" style={{ background: 'var(--bg-main)' }}>
            <Breadcrumbs items={[{ label: 'System Preferences', path: '/admin/dashboard-settings' }, { label: 'Bulk Operations Center', active: true }]} />

            {/* Header section with premium styling */}
            <div className="relative rounded-xl p-4 overflow-hidden flex flex-col justify-between gap-3 md:flex-row md:items-center"
                 style={{ 
                     background: 'var(--bg-card)'
                 }}>
                <div className="space-y-0.5 max-w-2xl">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider" 
                         style={{ background: 'rgba(200, 230, 0, 0.1)', color: 'var(--brand-lime)' }}>
                        <Upload size={10} /> Data Imports & Sync
                    </div>
                    <h1 className="text-base md:text-lg font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                        Bulk Operations Center
                    </h1>
                    <p className="text-[11px] font-medium leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                        Onboard users, migrate legacy operations, sync general ledger sheets, and deploy batch fleets with validation logging. Select a model importer below to begin.
                    </p>
                </div>
                <div className="flex gap-2">
                    <div className="px-3 py-1.5 rounded-lg border text-center min-w-24" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                        <p className="text-base font-black text-main">4</p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-dim">Total Modules</p>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg border text-center min-w-24" style={{ background: 'var(--bg-input)', borderColor: 'var(--border-main)' }}>
                        <p className="text-base font-black" style={{ color: 'var(--brand-lime)' }}>Active</p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-dim">System Status</p>
                    </div>
                </div>
            </div>

            {/* Bento Grid layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                
                {/* CARD 1: DRIVERS */}
                <div className="group relative rounded-2xl p-4 border shadow-md flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-lg"
                     style={{ 
                         background: 'var(--bg-card)', 
                         borderColor: 'var(--border-main)' 
                     }}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6" 
                                 style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                                <Users size={20} className="text-blue-500" />
                            </div>
                            {hasDriverAccess ? (
                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                                    Authorized
                                </span>
                            ) : (
                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-1">
                                    <Lock size={10} /> Locked
                                </span>
                            )}
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-main">Driver Bulk Upload</h3>
                            <p className="text-xs text-dim leading-relaxed">
                                Onboard multiple driver applicants. Parsed fields include full name, contact, license credentials, and emergency relations. Auto-associates branches based on user authorization.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-widest text-dim pt-1">
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.csv</span>
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.xlsx</span>
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.txt</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-5 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-dim">Templates:</span>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleDownloadTemplate('driver', 'xlsx')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors"
                                >
                                    Excel
                                </button>
                                <span className="text-dim/30">|</span>
                                <button 
                                    onClick={() => handleDownloadTemplate('driver', 'csv')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors"
                                >
                                    CSV
                                </button>
                            </div>
                        </div>
                        <button
                            disabled={!hasDriverAccess}
                            onClick={() => setActiveModal('driver')}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-sm"
                            style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                        >
                            Launch Importer <ArrowRight size={14} />
                        </button>
                    </div>
                </div>

                {/* CARD 2: VEHICLES */}
                <div className="group relative rounded-2xl p-4 border shadow-md flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-lg"
                     style={{ 
                          background: 'var(--bg-card)', 
                          borderColor: 'var(--border-main)' 
                      }}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6" 
                                 style={{ backgroundColor: 'rgba(234, 179, 8, 0.1)' }}>
                                <Car size={20} style={{ color: '#eab308' }} />
                            </div>
                            {hasVehicleAccess ? (
                                <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                                    Authorized
                                </span>
                            ) : (
                                <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-1">
                                    <Lock size={10} /> Locked
                                </span>
                            )}
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-main">Vehicle Bulk Upload</h3>
                            <p className="text-xs text-dim leading-relaxed">
                                Deploy multiple fleet elements. Auto-assigns to current user branch or accepts branch selections for administrators. Supports make, model, year, category, VIN, and rental parameters.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-widest text-dim pt-1">
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.csv</span>
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.xlsx</span>
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.txt</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-5 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-dim">Templates:</span>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleDownloadTemplate('vehicle', 'xlsx')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors"
                                >
                                    Excel
                                </button>
                                <span className="text-dim/30">|</span>
                                <button 
                                    onClick={() => handleDownloadTemplate('vehicle', 'csv')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors"
                                >
                                    CSV
                                </button>
                            </div>
                        </div>
                        <button
                            disabled={!hasVehicleAccess}
                            onClick={() => setActiveModal('vehicle')}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-sm"
                            style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                        >
                            Launch Importer <ArrowRight size={14} />
                        </button>
                    </div>
                </div>

                {/* CARD 3: DATA MIGRATION */}
                <div className="group relative rounded-2xl p-4 border shadow-md flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-lg"
                     style={{ 
                          background: 'var(--bg-card)', 
                          borderColor: 'var(--border-main)' 
                      }}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6" 
                                 style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }}>
                                <DatabaseZap size={20} style={{ color: '#a855f7' }} />
                            </div>
                            {hasMigrationAccess ? (
                                <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                                    Authorized
                                </span>
                            ) : (
                                <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-1">
                                    <Lock size={10} /> Locked
                                </span>
                            )}
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-main">Data Migration Options</h3>
                            <p className="text-xs text-dim leading-relaxed">
                                Import pre-linked active relationships between drivers, vehicles, and billing details from legacy operations. Bypasses typical onboarding flows directly to verification.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-widest text-dim pt-1">
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.csv</span>
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.xlsx</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-5 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-dim">Templates:</span>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleDownloadTemplate('migration', 'xlsx')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors"
                                >
                                    Excel
                                </button>
                                <span className="text-dim/30">|</span>
                                <button 
                                    onClick={() => handleDownloadTemplate('migration', 'csv')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors"
                                >
                                    CSV
                                </button>
                            </div>
                        </div>
                        <button
                            disabled={!hasMigrationAccess}
                            onClick={() => setActiveModal('migration')}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-sm"
                            style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                        >
                            Launch Importer <ArrowRight size={14} />
                        </button>
                    </div>
                </div>

                {/* CARD 4: JOURNAL ENTRIES */}
                <div className="group relative rounded-2xl p-4 border shadow-md flex flex-col justify-between transition-all hover:scale-[1.01] hover:shadow-lg"
                     style={{ 
                          background: 'var(--bg-card)', 
                          borderColor: 'var(--border-main)' 
                      }}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-6" 
                                 style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                                <BookOpen size={20} style={{ color: '#ef4444' }} />
                            </div>
                            {hasJournalAccess ? (
                                <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                                    Authorized
                                </span>
                            ) : (
                                <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-1">
                                    <Lock size={10} /> Locked
                                </span>
                            )}
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-base font-bold text-main">Bulk Upload Journal Entries</h3>
                            <p className="text-xs text-dim leading-relaxed">
                                Sync accounting entries directly into the general ledger. Useful for mass rent reconciliations, external payment gateway mappings, and monthly depreciation journals.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-widest text-dim pt-1">
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.csv</span>
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.xlsx</span>
                            <span className="px-1.5 py-0.5 rounded bg-input border" style={{ borderColor: 'var(--border-main)' }}>.xls</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 mt-5 pt-3 border-t" style={{ borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-dim">Templates:</span>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleDownloadTemplate('journal', 'xlsx')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors"
                                >
                                    Excel
                                </button>
                                <span className="text-dim/30">|</span>
                                <button 
                                    onClick={() => handleDownloadTemplate('journal', 'csv')}
                                    className="text-[11px] font-bold text-dim hover:text-main transition-colors"
                                >
                                    CSV
                                </button>
                            </div>
                        </div>
                        <button
                            disabled={!hasJournalAccess}
                            onClick={() => setActiveModal('journal')}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-none hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-sm"
                            style={{ backgroundColor: 'var(--brand-lime)', color: 'var(--brand-black)' }}
                        >
                            Launch Importer <ArrowRight size={14} />
                        </button>
                    </div>
                </div>

            </div>

            {/* Safety informational callout */}
            <div className="flex items-start gap-3 p-4 rounded-xl border" 
                 style={{ 
                     background: 'rgba(239, 68, 68, 0.02)', 
                     borderColor: 'rgba(239, 68, 68, 0.15)' 
                 }}>
                <ShieldAlert className="mt-0.5 flex-shrink-0" size={18} style={{ color: '#ef4444' }} />
                <div className="space-y-1">
                    <p className="text-xs font-black uppercase tracking-wider" style={{ color: '#ef4444' }}>Important System Notice</p>
                    <p className="text-xs font-medium leading-relaxed" style={{ color: 'var(--text-dim)' }}>
                        All bulk data changes are logged and linked to your user session. Please ensure your files conform strictly to the downloaded template headers. Row validation errors must be addressed inside the importer interface before committing records to the database.
                    </p>
                </div>
            </div>

            {/* Active Importer Modals */}
            <BulkDriverUpload 
                isOpen={activeModal === 'driver'} 
                onClose={() => setActiveModal(null)} 
                onSuccess={() => { setActiveModal(null); }} 
            />

            <BulkVehicleUpload 
                isOpen={activeModal === 'vehicle'} 
                onClose={() => setActiveModal(null)} 
                onSuccess={() => { setActiveModal(null); }} 
            />

            <DataMigrationUpload 
                isOpen={activeModal === 'migration'} 
                onClose={() => setActiveModal(null)} 
                onSuccess={() => { setActiveModal(null); }} 
            />

            {activeModal === 'journal' && (
                <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                    <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden border shadow-2xl"
                         style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border-main)' }}>
                            <div className="flex items-center gap-3">
                                <BookOpen size={20} style={{ color: 'var(--brand-lime)' }} />
                                <h2 className="text-lg font-bold text-main">Journal Bulk Importer</h2>
                            </div>
                            <button onClick={() => setActiveModal(null)} className="p-2 rounded-lg transition-all hover:scale-110 text-dim">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4">
                            <BulkUploadJournal 
                                onClose={() => setActiveModal(null)} 
                                onSuccess={() => { setActiveModal(null); toast.success('Journal entries uploaded successfully!'); }} 
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkUploadsHub;
