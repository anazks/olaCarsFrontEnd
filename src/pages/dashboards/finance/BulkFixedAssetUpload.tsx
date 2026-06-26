import React, { useState, useRef } from 'react';
import { Upload, X, Download, AlertTriangle, CheckCircle, Loader2, Info } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import { bulkUploadFixedAssets, getFixedAssetTypes } from '../../../services/fixedAssetService';
import type { FixedAsset } from '../../../services/fixedAssetService';
import { getAllAccountingCodes } from '../../../services/accountingService';
import { getAllVehicles } from '../../../services/vehicleService';

interface BulkFixedAssetUploadProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface MappedAssetRow {
    name: string;
    code: string;
    status: string;
    fixedAssetType?: string;
    purchaseDate: string;
    purchasePrice: number;
    purchaseQuantity: number;
    currentQuantity: number;
    depreciationStartValue: number;
    currentValue: number;
    notes?: string;
    assetLife: number;
    assetLifeUnit: 'Months' | 'Years';
    warrantyExpirationDate?: string;
    description?: string;
    serialNumber?: string;
    disposalValue: number;
    assetNumberPrefix?: string;
    assetNumberSuffix?: string;
    depreciationStartDate?: string;
    depreciationMethod: string;
    computationType: string;
    depreciationInterval: 'Monthly' | 'Yearly';
    fixedAssetAccount: string;
    depreciationExpenseAccount: string;
    accumulatedDepreciationAccount: string;
    locationId?: string;
    locationName: string;
    _rowErrors: string[];
}

const TEMPLATE_HEADERS = [
    'Fixed Asset Name',
    'Fixed Asset Number',
    'Status',
    'Fixed Asset Type',
    'Purchase Date',
    'Purchase Value',
    'Purchase Quantity',
    'Current Quantity',
    'Depreciation Start Value',
    'Current Value',
    'Notes',
    'Asset Life',
    'Asset Life Basis',
    'Warranty Expiry Date',
    'Description',
    'Serial Number',
    'Disposal Value',
    'Asset Number Prefix',
    'Asset Number Suffix',
    'Depreciation Start Date',
    'Depreciation Method',
    'Computation Type',
    'Depreciation Frequency',
    'Depreciation Percent',
    'Fixed Asset Account',
    'Expense Account',
    'Depreciation Account',
    'Location ID',
    'Location Name'
];

const SAMPLE_ROWS = [
    [
        'ES7402',
        'FA-00024',
        'Active',
        'OLA CARS VEHICLES',
        '2025-08-30',
        '20467.30',
        '1',
        '1',
        '20467.30',
        '17384.90',
        'VIN: LVTDB21B1TD013987\nINV NO:  0000000859',
        '60',
        'Months',
        '',
        'VIN: LVTDB21B1TD013987\nINV NO:  0000000859\n',
        '',
        '0.00',
        'FA-',
        '00024',
        '2025-08-30',
        'Straight Line',
        'Pro Rata',
        'Monthly',
        '0.00',
        'TIGGO 8 PRO',
        'DEPRECIATION OF VEHICLES',
        'Acumulated Depretiacion of Vehicles/Depreciación Acumulada de Vehículos',
        '6671277000000093092',
        'Head Office'
    ]
];

const BulkFixedAssetUpload = ({ isOpen, onClose, onSuccess }: BulkFixedAssetUploadProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [parsedAssets, setParsedAssets] = useState<MappedAssetRow[]>([]);
    const [previewFilter, setPreviewFilter] = useState<'all' | 'valid' | 'invalid'>('all');
    const [fileName, setFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadStep, setUploadStep] = useState<string>(''); // Steps: 'parsing', 'validating', 'uploading', 'complete'
    const [dragOver, setDragOver] = useState(false);
    const [resultsSummary, setResultsSummary] = useState<{ created: number; duplicatesCount: number; errorsCount: number } | null>(null);
    const [accountingCodes, setAccountingCodes] = useState<any[]>([]);
    const [fixedAssetTypes, setFixedAssetTypes] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            const fetchMetadata = async () => {
                setIsLoadingMetadata(true);
                try {
                    const [codesRes, typesRes, vehiclesRes] = await Promise.all([
                        getAllAccountingCodes({ limit: 5000, select: 'code,name', skipPopulate: 'true' }),
                        getFixedAssetTypes(),
                        getAllVehicles({ limit: 5000, select: 'basicDetails.make,basicDetails.model,legalDocs.registrationNumber', skipPopulate: 'true' } as any)
                    ]);
                    
                    const codesList = Array.isArray(codesRes) ? codesRes : (codesRes.data || []);
                    setAccountingCodes(codesList);
                    
                    setFixedAssetTypes(typesRes || []);
                    
                    const vehiclesList = vehiclesRes.data || [];
                    setVehicles(vehiclesList);
                } catch (err) {
                    console.error('Failed to load metadata for validation', err);
                    toast.error('Failed to load chart of accounts or vehicles list.');
                } finally {
                    setIsLoadingMetadata(false);
                }
            };
            fetchMetadata();
        }
    }, [isOpen]);

    const downloadTemplate = () => {
        const worksheet = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...SAMPLE_ROWS]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Fixed Assets Template');
        XLSX.writeFile(workbook, 'fixed_assets_bulk_upload_template.xlsx');
    };

    const downloadInvalidRows = () => {
        const invalidRows = parsedAssets.filter(c => c._rowErrors.length > 0);
        if (invalidRows.length === 0) return;

        const dataToExport = invalidRows.map(c => ({
            'Fixed Asset Name': c.name,
            'Fixed Asset Number': c.code,
            'Status': c.status,
            'Fixed Asset Type': c.fixedAssetType || '',
            'Purchase Date': c.purchaseDate,
            'Purchase Value': c.purchasePrice,
            'Purchase Quantity': c.purchaseQuantity,
            'Current Quantity': c.currentQuantity,
            'Depreciation Start Value': c.depreciationStartValue,
            'Current Value': c.currentValue,
            'Notes': c.notes || '',
            'Asset Life': c.assetLife,
            'Asset Life Basis': c.assetLifeUnit,
            'Warranty Expiry Date': c.warrantyExpirationDate || '',
            'Description': c.description || '',
            'Serial Number': c.serialNumber || '',
            'Disposal Value': c.disposalValue,
            'Asset Number Prefix': c.assetNumberPrefix || '',
            'Asset Number Suffix': c.assetNumberSuffix || '',
            'Depreciation Start Date': c.depreciationStartDate || '',
            'Depreciation Method': c.depreciationMethod,
            'Computation Type': c.computationType,
            'Depreciation Frequency': c.depreciationInterval,
            'Fixed Asset Account': c.fixedAssetAccount,
            'Expense Account': c.depreciationExpenseAccount,
            'Depreciation Account': c.accumulatedDepreciationAccount,
            'Location ID': c.locationId || '',
            'Location Name': c.locationName,
            'Validation Errors': c._rowErrors.join(', ')
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Invalid Fixed Assets');
        XLSX.writeFile(workbook, 'invalid_fixed_assets.xlsx');
        toast.success(`Downloaded ${invalidRows.length} invalid rows for corrections.`);
    };

    const parseFlexibleDate = (val: any): Date | null => {
        if (!val) return null;
        if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
        if (typeof val === 'number') {
            // Excel serial date representation
            const d = new Date((val - 25569) * 86400 * 1000);
            return isNaN(d.getTime()) ? null : d;
        }
        const str = String(val).trim();
        if (!str) return null;
        // Check for DD/MM/YYYY or DD-MM-YYYY
        const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        if (dmyMatch) {
            const d = new Date(parseInt(dmyMatch[3]), parseInt(dmyMatch[2]) - 1, parseInt(dmyMatch[1]));
            if (!isNaN(d.getTime())) return d;
        }
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
    };

    const parseFlexibleDateString = (val: any): string => {
        const d = parseFlexibleDate(val);
        return d ? d.toISOString().split('T')[0] : '';
    };

    const parseNumber = (val: any): number => {
        if (val === undefined || val === null || val === '') return 0;
        if (typeof val === 'number') return val;
        const cleaned = String(val).replace(/[$,\s]/g, '');
        const num = Number(cleaned);
        return isNaN(num) ? 0 : num;
    };

    const validateRow = (row: any): string[] => {
        const errors: string[] = [];
        if (!row.name || !String(row.name).trim()) {
            errors.push('Missing Fixed Asset Name');
        }
        if (!row.code || !String(row.code).trim()) {
            errors.push('Missing Fixed Asset Number');
        }
        if (!row.purchaseDate || !String(row.purchaseDate).trim()) {
            errors.push('Missing Purchase Date');
        } else {
            const date = new Date(row.purchaseDate);
            if (isNaN(date.getTime())) {
                errors.push('Invalid Purchase Date');
            }
        }
        if (row.purchasePrice === undefined || row.purchasePrice === null || isNaN(row.purchasePrice) || row.purchasePrice <= 0) {
            errors.push('Missing or invalid Purchase Value');
        }

        const faAcc = String(row.fixedAssetAccount || '').trim();
        const expAcc = String(row.depreciationExpenseAccount || '').trim();
        const depAcc = String(row.accumulatedDepreciationAccount || '').trim();

        if (!faAcc) {
            errors.push('Missing Fixed Asset Account');
        } else if (accountingCodes.length > 0) {
            const normalize = (s: string) => s.toLowerCase().replace(/[\s_-]/g, "");
            const normalizedTarget = normalize(faAcc);
            const exists = accountingCodes.some(c => 
                normalize(c.name || '') === normalizedTarget || 
                normalize(c.code || '') === normalizedTarget
            );
            if (!exists) {
                errors.push(`Fixed Asset Account "${faAcc}" not found in Chart of Accounts`);
            }
        }

        if (!expAcc) {
            errors.push('Missing Expense Account');
        } else if (accountingCodes.length > 0) {
            const normalize = (s: string) => s.toLowerCase().replace(/[\s_-]/g, "");
            const normalizedTarget = normalize(expAcc);
            const exists = accountingCodes.some(c => 
                normalize(c.name || '') === normalizedTarget || 
                normalize(c.code || '') === normalizedTarget
            );
            if (!exists) {
                errors.push(`Expense Account "${expAcc}" not found in Chart of Accounts`);
            }
        }

        if (!depAcc) {
            errors.push('Missing Depreciation Account');
        } else if (accountingCodes.length > 0) {
            const normalize = (s: string) => s.toLowerCase().replace(/[\s_-]/g, "");
            const normalizedTarget = normalize(depAcc);
            const exists = accountingCodes.some(c => 
                normalize(c.name || '') === normalizedTarget || 
                normalize(c.code || '') === normalizedTarget
            );
            if (!exists) {
                errors.push(`Depreciation Account "${depAcc}" not found in Chart of Accounts`);
            }
        }

        const typeName = String(row.fixedAssetType || '').trim();
        if (typeName && fixedAssetTypes.length > 0) {
            const normalize = (s: string) => s.toLowerCase().replace(/[\s_-]/g, "");
            const normalizedTarget = normalize(typeName);
            const exists = fixedAssetTypes.some(t => normalize(t.name || '') === normalizedTarget);
            if (!exists) {
                errors.push(`Asset Type "${typeName}" not found in database`);
            }
        }

        // Vehicle check is ignored per user preference. Missing vehicles are left unmapped (empty) without raising errors.

        return errors;
    };

    React.useEffect(() => {
        if (parsedAssets.length > 0) {
            setParsedAssets(prev => prev.map(row => ({
                ...row,
                _rowErrors: validateRow(row)
            })));
        }
    }, [accountingCodes, fixedAssetTypes, vehicles]);

    const mapHeaders = (row: any): Partial<MappedAssetRow> => {
        const mapped: any = {};
        for (const key of Object.keys(row)) {
            const normalizedKey = key.trim().toLowerCase();
            const val = row[key];
            if (normalizedKey === 'fixed asset name' || normalizedKey === 'asset name' || normalizedKey === 'name') {
                mapped.name = val !== undefined && val !== null ? String(val).trim() : '';
            } else if (normalizedKey === 'fixed asset number' || normalizedKey === 'asset number' || normalizedKey === 'code') {
                mapped.code = val !== undefined && val !== null ? String(val).trim() : '';
            } else if (normalizedKey === 'status') {
                mapped.status = val !== undefined && val !== null ? String(val).trim() : 'Active';
            } else if (normalizedKey === 'fixed asset type' || normalizedKey === 'asset type') {
                mapped.fixedAssetType = val !== undefined && val !== null ? String(val).trim() : '';
            } else if (normalizedKey === 'purchase date') {
                mapped.purchaseDate = parseFlexibleDateString(val);
            } else if (normalizedKey === 'purchase value' || normalizedKey === 'purchase price') {
                mapped.purchasePrice = parseNumber(val);
            } else if (normalizedKey === 'purchase quantity') {
                mapped.purchaseQuantity = parseNumber(val) || 1;
            } else if (normalizedKey === 'current quantity') {
                mapped.currentQuantity = parseNumber(val) || 1;
            } else if (normalizedKey === 'depreciation start value') {
                mapped.depreciationStartValue = parseNumber(val);
            } else if (normalizedKey === 'current value') {
                mapped.currentValue = parseNumber(val);
            } else if (normalizedKey === 'notes') {
                mapped.notes = val !== undefined && val !== null ? String(val).trim() : '';
            } else if (normalizedKey === 'asset life') {
                mapped.assetLife = parseNumber(val);
            } else if (normalizedKey === 'asset life basis' || normalizedKey === 'asset life unit') {
                mapped.assetLifeUnit = val;
            } else if (normalizedKey === 'warranty expiry date' || normalizedKey === 'warranty expiration date') {
                mapped.warrantyExpirationDate = parseFlexibleDateString(val) || undefined;
            } else if (normalizedKey === 'description') {
                mapped.description = val !== undefined && val !== null ? String(val).trim() : '';
            } else if (normalizedKey === 'serial number') {
                mapped.serialNumber = val !== undefined && val !== null ? String(val).trim() : '';
            } else if (normalizedKey === 'disposal value') {
                mapped.disposalValue = parseNumber(val) || 0;
            } else if (normalizedKey === 'asset number prefix') {
                mapped.assetNumberPrefix = val;
            } else if (normalizedKey === 'asset number suffix') {
                mapped.assetNumberSuffix = val;
            } else if (normalizedKey === 'depreciation start date') {
                mapped.depreciationStartDate = parseFlexibleDateString(val);
            } else if (normalizedKey === 'depreciation method') {
                mapped.depreciationMethod = val;
            } else if (normalizedKey === 'computation type') {
                mapped.computationType = val;
            } else if (normalizedKey === 'depreciation frequency' || normalizedKey === 'depreciation interval') {
                mapped.depreciationInterval = val;
            } else if (normalizedKey === 'fixed asset account') {
                mapped.fixedAssetAccount = val !== undefined && val !== null ? String(val).trim() : '';
            } else if (normalizedKey === 'expense account') {
                mapped.depreciationExpenseAccount = val !== undefined && val !== null ? String(val).trim() : '';
            } else if (normalizedKey === 'depreciation account') {
                mapped.accumulatedDepreciationAccount = val !== undefined && val !== null ? String(val).trim() : '';
            } else if (normalizedKey === 'location id') {
                mapped.locationId = val;
            } else if (normalizedKey === 'location name' || normalizedKey === 'location') {
                mapped.locationName = val !== undefined && val !== null ? String(val).trim() : '';
            }
        }
        return mapped;
    };

    const parseFile = (file: File) => {
        setResultsSummary(null);
        setFileName(file.name);
        setUploadStep('parsing');
        
        const extension = file.name.split('.').pop()?.toLowerCase();

        const processRawRows = (jsonData: any[]) => {
            setUploadStep('validating');
            const rows: MappedAssetRow[] = jsonData.map(row => {
                const mapped = mapHeaders(row);
                return {
                    name: mapped.name || '',
                    code: mapped.code || '',
                    status: mapped.status || 'Active',
                    fixedAssetType: mapped.fixedAssetType || '',
                    purchaseDate: mapped.purchaseDate || '',
                    purchasePrice: mapped.purchasePrice || 0,
                    purchaseQuantity: mapped.purchaseQuantity || 1,
                    currentQuantity: mapped.currentQuantity || 1,
                    depreciationStartValue: mapped.depreciationStartValue || mapped.purchasePrice || 0,
                    currentValue: mapped.currentValue || mapped.purchasePrice || 0,
                    notes: mapped.notes || mapped.description || '',
                    assetLife: mapped.assetLife || 60,
                    assetLifeUnit: (mapped.assetLifeUnit && String(mapped.assetLifeUnit).toLowerCase().startsWith('year')) ? 'Years' : 'Months',
                    warrantyExpirationDate: mapped.warrantyExpirationDate || '',
                    description: mapped.description || '',
                    serialNumber: mapped.serialNumber || '',
                    disposalValue: mapped.disposalValue || 0,
                    assetNumberPrefix: mapped.assetNumberPrefix || '',
                    assetNumberSuffix: mapped.assetNumberSuffix || '',
                    depreciationStartDate: mapped.depreciationStartDate || mapped.purchaseDate || '',
                    depreciationMethod: mapped.depreciationMethod || 'Straight Line',
                    computationType: mapped.computationType || 'Pro Rata',
                    depreciationInterval: mapped.depreciationInterval || 'Monthly',
                    fixedAssetAccount: mapped.fixedAssetAccount || '',
                    depreciationExpenseAccount: mapped.depreciationExpenseAccount || '',
                    accumulatedDepreciationAccount: mapped.accumulatedDepreciationAccount || '',
                    locationId: mapped.locationId || '',
                    locationName: mapped.locationName || 'Head Office',
                    _rowErrors: []
                };
            });

            // Perform validation
            const validatedRows = rows.map(r => ({
                ...r,
                _rowErrors: validateRow(r)
            }));

            setParsedAssets(validatedRows);
            setUploadStep('complete');
            if (validatedRows.length === 0) {
                toast.error('No rows found in Excel sheet.');
            } else {
                toast.success(`Successfully parsed ${validatedRows.length} row(s)`);
            }
        };

        if (extension === 'xlsx' || extension === 'xls') {
            const reader = new FileReader();
            reader.onload = (e) => {
                const originalConsoleWarn = console.warn;
                const originalConsoleError = console.error;
                console.warn = (...args) => {
                    if (args[0] && String(args[0]).includes('Bad uncompressed size')) return;
                    originalConsoleWarn.apply(console, args);
                };
                console.error = (...args) => {
                    if (args[0] && String(args[0]).includes('Bad uncompressed size')) return;
                    originalConsoleError.apply(console, args);
                };
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    processRawRows(jsonData);
                } catch (err) {
                    toast.error('Failed to parse Excel file.');
                    setUploadStep('');
                } finally {
                    console.warn = originalConsoleWarn;
                    console.error = originalConsoleError;
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                transformHeader: (h: string) => h.trim(),
                complete: (results) => {
                    processRawRows(results.data);
                },
                error: (err: any) => {
                    toast.error(`CSV Parsing error: ${err.message}`);
                    setUploadStep('');
                }
            });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) parseFile(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) parseFile(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => setDragOver(false);

    const handleSubmit = async () => {
        const validAssets = parsedAssets.filter(c => c._rowErrors.length === 0);
        if (validAssets.length === 0) {
            toast.error('No valid fixed assets to import. Please resolve errors.');
            return;
        }

        setUploading(true);
        setUploadStep('uploading');
        try {
            const payload = validAssets.map(({ _rowErrors, ...rest }) => rest);
            const res = await bulkUploadFixedAssets(payload);
            
            const { created, duplicates: dups, errors: errs } = res.data;
            setResultsSummary({
                created: created?.length || 0,
                duplicatesCount: dups?.length || 0,
                errorsCount: errs?.length || 0
            });

            if (errs && errs.length > 0) {
                toast.error(`Imported with errors: ${errs.length} row(s) failed.`);
            } else if (dups && dups.length > 0 && created.length === 0) {
                toast.success('Upload skipped: All assets are duplicates.');
            } else {
                toast.success('Fixed assets imported successfully!');
            }

            onSuccess();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Bulk upload failed.');
        } finally {
            setUploading(false);
            setUploadStep('complete');
        }
    };

    const handleReset = () => {
        setParsedAssets([]);
        setPreviewFilter('all');
        setFileName('');
        setResultsSummary(null);
        setUploadStep('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    if (!isOpen) return null;

    const errorCount = parsedAssets.filter(c => c._rowErrors.length > 0).length;
    const validCount = parsedAssets.filter(c => c._rowErrors.length === 0).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden animate-fade-in" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center animate-pulse" style={{ backgroundColor: 'rgba(200,230,0,0.1)' }}>
                            <Upload size={20} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Bulk Import Fixed Assets</h2>
                            <p className="text-xs text-dim" style={{ color: 'var(--text-dim)' }}>Capitalize fixed assets in bulk and auto-generate depreciation schedules</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:scale-105 transition-all text-dim hover:text-white cursor-pointer" style={{ color: 'var(--text-dim)' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Template Downloader */}
                    <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border text-sm" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                        <Info size={16} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                        <span className="font-medium text-dim" style={{ color: 'var(--text-dim)' }}>Download the sample template to align your spreadsheet columns:</span>
                        <button
                            onClick={downloadTemplate}
                            className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all hover:scale-105 active:scale-95 cursor-pointer"
                        >
                            <Download size={14} /> Download template
                        </button>
                    </div>

                    {/* Drag and Drop Zone */}
                    {parsedAssets.length === 0 && !uploading && (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all hover:bg-white/5 hover:border-brand-lime/50 ${dragOver ? 'border-brand-lime bg-white/5' : 'border-white/10'}`}
                        >
                            <Upload size={40} className="mb-4 text-dim animate-bounce" style={{ color: 'var(--text-dim)' }} />
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Drag & drop your Excel/CSV file here or click to browse</p>
                            <p className="text-xs text-dim mt-1" style={{ color: 'var(--text-dim)' }}>Supports .xlsx, .xls, and .csv files</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls,.csv"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>
                    )}

                    {/* Step Tracker Visual */}
                    {uploadStep && (
                        <div className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}>
                            <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${uploadStep === 'parsing' ? 'bg-amber-500 animate-ping' : 'bg-green-500'}`} />
                                <span className="text-xs font-bold text-dim" style={{ color: uploadStep === 'parsing' ? 'var(--text-main)' : 'var(--text-dim)' }}>1. Reading file</span>
                            </div>
                            <div className="w-8 h-[1px] bg-white/10" />
                            <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${uploadStep === 'validating' ? 'bg-amber-500 animate-ping' : uploadStep === 'parsing' ? 'bg-white/10' : 'bg-green-500'}`} />
                                <span className="text-xs font-bold text-dim" style={{ color: uploadStep === 'validating' ? 'var(--text-main)' : 'var(--text-dim)' }}>2. Validating structures</span>
                            </div>
                            <div className="w-8 h-[1px] bg-white/10" />
                            <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${uploadStep === 'uploading' ? 'bg-amber-500 animate-ping' : ['parsing', 'validating'].includes(uploadStep) ? 'bg-white/10' : 'bg-green-500'}`} />
                                <span className="text-xs font-bold text-dim" style={{ color: uploadStep === 'uploading' ? 'var(--text-main)' : 'var(--text-dim)' }}>3. Importing & schedules</span>
                            </div>
                            <div className="w-8 h-[1px] bg-white/10" />
                            <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${uploadStep === 'complete' ? 'bg-green-500' : 'bg-white/10'}`} />
                                <span className="text-xs font-bold text-dim" style={{ color: uploadStep === 'complete' ? 'var(--text-main)' : 'var(--text-dim)' }}>4. Complete</span>
                            </div>
                        </div>
                    )}

                    {/* Parsed Assets List */}
                    {parsedAssets.length > 0 && (
                        <div className="space-y-4">
                            {/* File Info */}
                            <div className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-sidebar)' }}>
                                <div className="flex items-center gap-3">
                                    <CheckCircle size={18} className="text-brand-lime" style={{ color: 'var(--brand-lime)' }} />
                                    <div>
                                        <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{fileName}</p>
                                        <p className="text-xs text-dim" style={{ color: 'var(--text-dim)' }}>
                                            {parsedAssets.length} row(s) found • <span className="text-green-500 font-bold">{validCount} valid</span> • <span className="text-red-500 font-bold">{errorCount} invalid</span>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {errorCount > 0 && (
                                        <button
                                            onClick={downloadInvalidRows}
                                            className="px-3 py-1.5 rounded-xl border text-xs font-bold bg-red-500/10 border-red-500/20 hover:bg-red-500/20 text-red-500 transition-all cursor-pointer flex items-center gap-1"
                                        >
                                            <Download size={12} /> Download Invalid Rows
                                        </button>
                                    )}
                                    <button onClick={handleReset} disabled={uploading} className="px-3 py-1.5 rounded-xl border text-xs font-bold hover:bg-white/5 transition-all cursor-pointer disabled:opacity-50" style={{ borderColor: 'var(--border-main)', color: 'var(--text-dim)' }}>
                                        Clear File
                                    </button>
                                </div>
                            </div>

                            {/* Summary results after upload */}
                            {resultsSummary && (
                                <div className="p-4 rounded-xl border space-y-2 text-sm" style={{ borderColor: 'var(--border-main)', background: 'rgba(200,230,0,0.03)' }}>
                                    <p className="font-bold text-white">Import Summary:</p>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="p-3 rounded-lg border text-center bg-green-500/5 border-green-500/20 text-green-500">
                                            <div className="text-lg font-black">{resultsSummary.created}</div>
                                            <div className="text-xs">Assets Created</div>
                                        </div>
                                        <div className="p-3 rounded-lg border text-center bg-amber-500/5 border-amber-500/20 text-amber-500">
                                            <div className="text-lg font-black">{resultsSummary.duplicatesCount}</div>
                                            <div className="text-xs">Duplicates Skipped</div>
                                        </div>
                                        <div className="p-3 rounded-lg border text-center bg-red-500/5 border-red-500/20 text-red-500">
                                            <div className="text-lg font-black">{resultsSummary.errorsCount}</div>
                                            <div className="text-xs">Rows Failed</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Preview Filter Tabs */}
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-dim" style={{ color: 'var(--text-dim)' }}>Preview Rows</h3>
                                <div className="flex gap-1 p-0.5 rounded-lg border text-xs bg-white/5" style={{ borderColor: 'var(--border-main)' }}>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewFilter('all')}
                                        className={`px-3 py-1.5 rounded-md transition-all cursor-pointer font-bold ${previewFilter === 'all' ? 'bg-white/10 text-white' : 'text-dim'}`}
                                    >
                                        All ({parsedAssets.length})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewFilter('valid')}
                                        className={`px-3 py-1.5 rounded-md transition-all cursor-pointer font-bold ${previewFilter === 'valid' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'text-dim'}`}
                                    >
                                        Valid ({validCount})
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPreviewFilter('invalid')}
                                        className={`px-3 py-1.5 rounded-md transition-all cursor-pointer font-bold ${previewFilter === 'invalid' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-dim'}`}
                                    >
                                        Invalid ({errorCount})
                                    </button>
                                </div>
                            </div>

                            {/* Preview Table */}
                            <div className="rounded-xl overflow-hidden border max-h-[300px] overflow-y-auto" style={{ borderColor: 'var(--border-main)' }}>
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="border-b" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border-main)' }}>
                                            <th className="px-4 py-3 font-bold text-dim" style={{ color: 'var(--text-dim)' }}>Status</th>
                                            <th className="px-4 py-3 font-bold text-dim" style={{ color: 'var(--text-dim)' }}>Asset Number</th>
                                            <th className="px-4 py-3 font-bold text-dim" style={{ color: 'var(--text-dim)' }}>Asset Name</th>
                                            <th className="px-4 py-3 font-bold text-dim" style={{ color: 'var(--text-dim)' }}>Cost</th>
                                            <th className="px-4 py-3 font-bold text-dim" style={{ color: 'var(--text-dim)' }}>Fixed Asset Type</th>
                                            <th className="px-4 py-3 font-bold text-dim" style={{ color: 'var(--text-dim)' }}>FA Account</th>
                                            <th className="px-4 py-3 font-bold text-dim" style={{ color: 'var(--text-dim)' }}>Location</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedAssets
                                            .filter(c => {
                                                if (previewFilter === 'valid') return c._rowErrors.length === 0;
                                                if (previewFilter === 'invalid') return c._rowErrors.length > 0;
                                                return true;
                                            })
                                            .map((c, idx) => {
                                                const hasError = c._rowErrors.length > 0;
                                                return (
                                                    <tr key={idx} className={`border-b last:border-0 hover:bg-white/5 transition-colors ${hasError ? 'bg-red-500/5' : ''}`} style={{ borderColor: 'var(--border-main)' }}>
                                                        <td className="px-4 py-3">
                                                            {hasError ? (
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="text-red-500 flex items-center gap-1 font-bold">
                                                                        <AlertTriangle size={14} /> Error
                                                                    </span>
                                                                    <span className="text-[10px] text-red-400 font-medium whitespace-normal leading-tight">
                                                                        {c._rowErrors.join(', ')}
                                                                    </span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-green-500 flex items-center gap-1 font-bold">
                                                                    <CheckCircle size={14} /> Valid
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 font-mono text-white font-bold">{c.code}</td>
                                                        <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                                                        <td className="px-4 py-3 font-semibold text-brand-lime" style={{ color: 'var(--brand-lime)' }}>${c.purchasePrice.toLocaleString()}</td>
                                                        <td className="px-4 py-3 text-dim" style={{ color: 'var(--text-dim)' }}>{c.fixedAssetType}</td>
                                                        <td className="px-4 py-3 text-dim" style={{ color: 'var(--text-dim)' }}>{c.fixedAssetAccount}</td>
                                                        <td className="px-4 py-3 text-dim" style={{ color: 'var(--text-dim)' }}>{c.locationName}</td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 px-6 py-4 border-t justify-end" style={{ borderColor: 'var(--border-main)' }}>
                    <button
                        onClick={onClose}
                        disabled={uploading}
                        className="px-5 py-2.5 rounded-xl border font-bold hover:bg-white/5 transition-all text-sm cursor-pointer disabled:opacity-50"
                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                    >
                        Close
                    </button>
                    {parsedAssets.length > 0 && !resultsSummary && (
                        <button
                            onClick={handleSubmit}
                            disabled={uploading || validCount === 0}
                            className="px-6 py-2.5 rounded-xl font-bold bg-brand-lime text-black flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            style={{ backgroundColor: 'var(--brand-lime)' }}
                        >
                            {uploading ? <Loader2 size={16} className="animate-spin" /> : null}
                            {uploading ? 'Importing...' : `Import ${validCount} Assets`}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BulkFixedAssetUpload;
