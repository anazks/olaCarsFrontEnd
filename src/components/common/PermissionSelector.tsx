import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, Check, Minus, Info } from 'lucide-react';
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
    const [expandedCategories, setExpandedCategories] = useState<string[]>(
        permissionCategories.map(c => c.category)
    );

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

    const toggleExpand = (category: string) => {
        if (expandedCategories.includes(category)) {
            setExpandedCategories(expandedCategories.filter(c => c !== category));
        } else {
            setExpandedCategories([...expandedCategories, category]);
        }
    };

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

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {filteredCategories.length === 0 ? (
                    <div className="text-center py-8 text-dim text-sm italic">
                        No permissions found matching your search or access level.
                    </div>
                ) : (
                    filteredCategories.map((cat) => {
                        const isExpanded = expandedCategories.includes(cat.category);
                        const selectedInCat = cat.permissions.filter(p => selectedPermissions.includes(p));
                        const isAllSelected = selectedInCat.length === cat.permissions.length;
                        const isSomeSelected = selectedInCat.length > 0 && !isAllSelected;

                        return (
                            <div key={cat.category} className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'ring-1 ring-lime/20 shadow-lg shadow-lime/5' : 'hover:border-lime/30'}`} style={{ borderColor: isExpanded ? 'var(--brand-lime)' : 'var(--border-main)', background: isExpanded ? 'rgba(200,230,0,0.03)' : 'rgba(255,255,255,0.01)' }}>
                                <div className={`flex items-center justify-between px-5 py-4 cursor-pointer transition-colors ${isExpanded ? 'bg-lime/5' : 'hover:bg-white/5'}`} onClick={() => toggleExpand(cat.category)}>
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
                                                <div className="w-5 h-5 rounded-md border border-white/10 bg-white/5" />
                                            )}
                                        </button>
                                        <div>
                                            <h4 className={`text-sm font-black transition-colors ${isExpanded ? 'text-lime' : ''}`} style={{ color: !isExpanded ? 'var(--text-main)' : '' }}>{cat.category}</h4>
                                            <p className="text-[10px] font-bold tracking-tight opacity-60">
                                                {selectedInCat.length} / {cat.permissions.length} PERMISSIONS
                                            </p>
                                        </div>
                                    </div>
                                    {isExpanded ? <ChevronDown size={16} className="text-dim" /> : <ChevronRight size={16} className="text-dim" />}
                                </div>

                                {isExpanded && (
                                    <div className="px-4 pb-3 grid grid-cols-1 gap-2 pt-1 border-t transition-colors" style={{ borderColor: 'var(--border-main)' }}>
                                        {cat.permissions.map((perm) => {
                                            const isChecked = selectedPermissions.includes(perm);
                                            return (
                                                <label 
                                                    key={perm} 
                                                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border border-transparent ${isChecked ? 'bg-lime/5 border-lime/10' : 'hover:bg-white/5 hover:translate-x-1'}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        className="hidden"
                                                        checked={isChecked}
                                                        onChange={() => togglePermission(perm)}
                                                    />
                                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isChecked ? 'bg-lime border-lime shadow-[0_0_8px_rgba(200,230,0,0.2)]' : 'border-white/20'}`}>
                                                        {isChecked && <Check size={14} className="text-black font-black" strokeWidth={3} />}
                                                    </div>
                                                    <span className={`text-xs font-bold transition-colors ${isChecked ? 'text-lime' : 'text-dim'}`}>
                                                        {perm.split('_').join(' ')}
                                                    </span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default PermissionSelector;
