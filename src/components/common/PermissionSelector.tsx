import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, Check, Minus, X } from 'lucide-react';
import { permissionCategories } from '../../utils/permissionCategories';

interface PermissionSelectorProps {
    userPermissions: string[]; // What the current user is allowed to grant
    selectedPermissions: string[]; // What is currently checked
    onChange: (permissions: string[]) => void;
    isAdmin?: boolean;
}

const PermissionSelector: React.FC<PermissionSelectorProps> = ({ 
    userPermissions, 
    selectedPermissions, 
    onChange,
    isAdmin = false
}) => {
    const [search, setSearch] = useState('');
    const [selectedCategoryForModal, setSelectedCategoryForModal] = useState<string | null>(null);

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
            <div className="relative group">
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

            {/* Modal Popup for Category Permissions */}
            {activeModalCategory && (
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
