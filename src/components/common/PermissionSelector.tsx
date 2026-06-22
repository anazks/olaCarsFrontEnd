import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, Check, Minus, X, Download } from 'lucide-react';
import { permissionCategories } from '../../utils/permissionCategories';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

interface PermissionSelectorProps {
    userPermissions: string[]; // What the current user is allowed to grant
    selectedPermissions: string[]; // What is currently checked
    onChange: (permissions: string[]) => void;
    isAdmin?: boolean;
    staffName?: string;
}

const PermissionSelector: React.FC<PermissionSelectorProps> = ({ 
    userPermissions, 
    selectedPermissions, 
    onChange,
    isAdmin = false,
    staffName
}) => {
    const [search, setSearch] = useState('');
    const [selectedCategoryForModal, setSelectedCategoryForModal] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'edit' | 'table'>('edit');
    const [showGrantedOnly, setShowGrantedOnly] = useState(true);

    const handleDownloadPdf = () => {
        try {
            const doc = new jsPDF();
            const titleText = staffName ? `${staffName} - Permissions List` : 'System Permissions List';
            
            // Header Bar
            doc.setFillColor(30, 30, 30);
            doc.rect(0, 0, 210, 30, 'F');
            
            doc.setTextColor(200, 230, 0); // brand-lime
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('OLA CARS', 14, 20);
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('RESOURCE SECURITY COMPLIANCE', 142, 20);
            
            // Title & Metadata
            doc.setTextColor(30, 30, 30);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(titleText, 14, 45);
            
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 52);
            doc.text(`Total Assigned Permissions: ${selectedPermissions.length}`, 14, 57);
            
            // Table Body
            const tableBody: any[] = [];
            permissionCategories.forEach(cat => {
                cat.permissions.forEach(perm => {
                    if (selectedPermissions.includes(perm)) {
                        tableBody.push([
                            cat.category,
                            perm.split('_').join(' '),
                            'GRANTED'
                        ]);
                    }
                });
            });

            if (tableBody.length === 0) {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'italic');
                doc.text('No permissions are currently selected/assigned for this user.', 14, 75);
            } else {
                autoTable(doc, {
                    head: [['Category', 'Permission Name', 'Status']],
                    body: tableBody,
                    startY: 65,
                    theme: 'striped',
                    headStyles: { fillColor: [200, 230, 0], textColor: [0, 0, 0], fontStyle: 'bold' },
                    bodyStyles: { fontStyle: 'normal' },
                    didParseCell: (data) => {
                        if (data.section === 'body' && data.column.index === 2) {
                            data.cell.styles.textColor = [34, 197, 94]; // Green color
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                });
            }

            const safeFilename = (staffName || 'permissions').toLowerCase().replace(/[^a-z0-9]/g, '_');
            doc.save(`${safeFilename}_permissions.pdf`);
            toast.success('Permissions PDF exported successfully!');
        } catch (error) {
            console.error('PDF generation error:', error);
            toast.error('Failed to generate permissions PDF');
        }
    };

    // Filter categories based on search and user's own permissions
    const filteredCategories = useMemo(() => {
        return permissionCategories.map(cat => {
            const allowedInCat = cat.permissions.filter(p => isAdmin || userPermissions.includes(p));
            const filteredInCat = allowedInCat.filter(p => 
                p.toLowerCase().includes(search.toLowerCase()) || 
                cat.category.toLowerCase().includes(search.toLowerCase())
            );

            return {
                ...cat,
                permissions: filteredInCat,
                totalAllowed: allowedInCat.length
            };
        }).filter(cat => cat.permissions.length > 0);
    }, [search, userPermissions, isAdmin]);

    // Flattened list of allowed permissions for the table view
    const tableRows = useMemo(() => {
        const rows: { category: string; permission: string; isGranted: boolean }[] = [];
        permissionCategories.forEach(cat => {
            const allowedInCat = cat.permissions.filter(p => isAdmin || userPermissions.includes(p));
            allowedInCat.forEach(perm => {
                const matchesSearch = 
                    perm.toLowerCase().includes(search.toLowerCase()) || 
                    cat.category.toLowerCase().includes(search.toLowerCase());
                
                if (matchesSearch) {
                    const isGranted = selectedPermissions.includes(perm);
                    rows.push({
                        category: cat.category,
                        permission: perm,
                        isGranted
                    });
                }
            });
        });
        return rows;
    }, [search, selectedPermissions, userPermissions, isAdmin]);

    const displayedRows = useMemo(() => {
        return tableRows.filter(row => !showGrantedOnly || row.isGranted);
    }, [tableRows, showGrantedOnly]);

    const togglePermission = (perm: string) => {
        if (selectedPermissions.includes(perm)) {
            onChange(selectedPermissions.filter(p => p !== perm));
        } else {
            onChange([...selectedPermissions, perm]);
        }
    };

    const toggleCategory = (_category: string, permissions: string[]) => {
        const allSelected = permissions.every(p => selectedPermissions.includes(p));
        if (allSelected) {
            onChange(selectedPermissions.filter(p => !permissions.includes(p)));
        } else {
            const newSelection = [...new Set([...selectedPermissions, ...permissions])];
            onChange(newSelection);
        }
    };

    const activeModalCategory = useMemo(() => {
        return filteredCategories.find(c => c.category === selectedCategoryForModal);
    }, [filteredCategories, selectedCategoryForModal]);

    return (
        <div className="space-y-4 max-h-[400px] flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                <div className="flex rounded-xl p-1 bg-black/20 border border-white/5 w-fit" style={{ borderColor: 'var(--border-main)' }}>
                    <button
                        type="button"
                        onClick={() => setViewMode('edit')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${viewMode === 'edit' ? 'bg-brand-lime text-black font-extrabold' : 'text-dim hover:text-white'}`}
                    >
                        Edit Grid
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${viewMode === 'table' ? 'bg-brand-lime text-black font-extrabold' : 'text-dim hover:text-white'}`}
                    >
                        Table View
                    </button>
                </div>
                {viewMode === 'table' && (
                    <button
                        type="button"
                        onClick={() => setShowGrantedOnly(!showGrantedOnly)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-200 self-start sm:self-auto ${showGrantedOnly ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'border-white/10 text-dim hover:text-white'}`}
                    >
                        {showGrantedOnly ? 'Showing: Granted Only' : 'Showing: All Allowed'}
                    </button>
                )}
            </div>

            <div className="flex gap-3">
                <div className="relative group flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dim group-focus-within:text-lime transition-colors" size={18} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search permissions..."
                        className="w-full pl-11 pr-4 py-3 rounded-2xl outline-none text-sm transition-all border border-transparent focus:border-lime/30 focus:ring-4 focus:ring-lime/10 font-medium"
                        style={{ background: 'var(--bg-input)', color: 'var(--text-main)' }}
                    />
                </div>
                <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="px-4 py-3 rounded-xl bg-brand-lime text-[#0A0A0A] font-bold hover:opacity-90 active:scale-95 transition-all text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-lime/10 flex-shrink-0"
                    style={{ background: 'var(--brand-lime)' }}
                    title="Export Permissions List to PDF"
                >
                    <Download size={16} />
                    Export PDF
                </button>
            </div>

            {viewMode === 'edit' ? (
                <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-start content-start pr-2 pb-2 scrollbar-thin scrollbar-thumb-black/10 dark:scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {filteredCategories.length === 0 ? (
                        <div className="text-center py-8 text-dim text-sm italic">
                            No permissions found matching your search or access level.
                        </div>
                    ) : (
                        filteredCategories.map((cat) => {
                            const selectedInCat = cat.permissions.filter(p => selectedPermissions.includes(p));
                            const isAllSelected = selectedInCat.length === cat.permissions.length;
                            const isSomeSelected = selectedInCat.length > 0 && !isAllSelected;

                            return (
                                <div key={cat.category} className="rounded-2xl border transition-all duration-300 overflow-hidden hover:border-lime/30" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                                    <div className="flex items-center justify-between px-5 py-4 cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5" onClick={() => setSelectedCategoryForModal(cat.category)}>
                                        <div className="flex items-center gap-3">
                                            <button 
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleCategory(cat.category, cat.permissions);
                                                }}
                                                className="transition-all hover:scale-110 active:scale-95"
                                            >
                                                {isAllSelected ? (
                                                    <div className="w-5 h-5 rounded-md flex items-center justify-center bg-lime shadow-[0_0_10px_rgba(200,230,0,0.3)]">
                                                        <Check size={14} className="text-black font-black" strokeWidth={3} />
                                                    </div>
                                                ) : isSomeSelected ? (
                                                    <div className="w-5 h-5 rounded-md flex items-center justify-center bg-lime/20 border border-lime/50 text-lime">
                                                        <Minus size={14} strokeWidth={3} />
                                                    </div>
                                                ) : (
                                                    <div className="w-5 h-5 rounded-md border border-black/20 dark:border-white/10 bg-black/5 dark:bg-white/5" />
                                                )}
                                            </button>
                                            <div>
                                                <h4 className="text-sm font-black transition-colors" style={{ color: 'var(--text-main)' }}>{cat.category}</h4>
                                                <p className="text-[10px] font-bold tracking-tight opacity-60">
                                                    {selectedInCat.length} / {cat.permissions.length} PERMISSIONS
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-dim" />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto pr-2 pb-2 scrollbar-thin border rounded-2xl overflow-hidden" style={{ borderColor: 'var(--border-main)', background: 'rgba(255,255,255,0.01)' }}>
                    {displayedRows.length === 0 ? (
                        <div className="text-center py-12 text-dim text-sm italic">
                            {showGrantedOnly ? 'No granted permissions assigned to this user.' : 'No permissions found matching search or access level.'}
                        </div>
                    ) : (
                        <table className="w-full text-sm border-collapse text-left">
                            <thead>
                                <tr className="border-b transition-colors" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-input)' }}>
                                    <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider w-10"></th>
                                    <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Category</th>
                                    <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>Permission Name</th>
                                    <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-center" style={{ color: 'var(--text-dim)' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y" style={{ borderColor: 'var(--border-main)' }}>
                                {displayedRows.map((row) => (
                                    <tr 
                                        key={row.permission} 
                                        className="transition-colors hover:bg-white/5 cursor-pointer" 
                                        onClick={() => togglePermission(row.permission)}
                                    >
                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <button 
                                                type="button"
                                                onClick={() => togglePermission(row.permission)}
                                                className="transition-all hover:scale-110 active:scale-95"
                                            >
                                                {row.isGranted ? (
                                                    <div className="w-5 h-5 rounded-md flex items-center justify-center bg-lime shadow-[0_0_10px_rgba(200,230,0,0.3)]">
                                                        <Check size={14} className="text-black font-black" strokeWidth={3} />
                                                    </div>
                                                ) : (
                                                    <div className="w-5 h-5 rounded-md border border-black/20 dark:border-white/10 bg-black/5 dark:bg-white/5" />
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 font-bold text-xs" style={{ color: 'var(--text-main)' }}>{row.category}</td>
                                        <td className="px-4 py-3 text-sm font-semibold transition-colors" style={{ color: row.isGranted ? 'var(--brand-lime)' : 'var(--text-main)' }}>
                                            {row.permission.split('_').join(' ')}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {row.isGranted ? (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    Granted
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-white/5 text-dim border border-white/5">
                                                    Not Granted
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Modal Popup for Category Permissions */}
            {activeModalCategory && viewMode === 'edit' && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-lg mx-4 rounded-2xl p-6 border shadow-2xl transition-all animate-in zoom-in-95 duration-200" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between mb-4 border-b pb-4" style={{ borderColor: 'var(--border-main)' }}>
                            <div>
                                <h3 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>{activeModalCategory.category} Permissions</h3>
                                <p className="text-xs text-dim">Select specific permissions below</p>
                            </div>
                            <button type="button" onClick={() => setSelectedCategoryForModal(null)} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
                                <X size={20} className="text-dim" />
                            </button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2 scrollbar-thin">
                            {activeModalCategory.permissions.map((perm) => {
                                const isChecked = selectedPermissions.includes(perm);
                                return (
                                    <label 
                                        key={perm} 
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border border-transparent ${isChecked ? 'bg-lime/5 border-lime/10' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                                    >
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={isChecked}
                                            onChange={() => togglePermission(perm)}
                                        />
                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isChecked ? 'bg-lime border-lime shadow-[0_0_8px_rgba(200,230,0,0.2)]' : 'border-black/20 dark:border-white/20'}`}>
                                            {isChecked && <Check size={14} className="text-black font-black" strokeWidth={3} />}
                                        </div>
                                        <span className={`text-sm font-bold transition-colors ${isChecked ? 'text-lime' : 'text-dim'}`}>
                                            {perm.split('_').join(' ')}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                        <div className="mt-6 pt-4 border-t flex justify-end" style={{ borderColor: 'var(--border-main)' }}>
                            <button 
                                type="button"
                                onClick={() => setSelectedCategoryForModal(null)}
                                className="px-6 py-2.5 rounded-xl font-bold bg-[var(--brand-lime)] text-black hover:opacity-90 transition-opacity"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PermissionSelector;
