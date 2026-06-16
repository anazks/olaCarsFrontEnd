import { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Search, Plus, Check } from 'lucide-react';

export interface SearchableSelectOption {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    options: SearchableSelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    onAddNew?: () => void;
    addNewText?: string;
    required?: boolean;
    disabled?: boolean;
    isLoading?: boolean;
}

export const SearchableSelect = ({
    options,
    value,
    onChange,
    placeholder = 'Select option...',
    onAddNew,
    addNewText = 'Add New',
    required = false,
    disabled = false,
    isLoading = false
}: SearchableSelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [openUpward, setOpenUpward] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Find the currently selected option's label
    const selectedOption = useMemo(() => {
        return options.find(opt => opt.value === value);
    }, [options, value]);

    // Filter options based on search query
    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return options;
        const query = searchQuery.toLowerCase();
        return options.filter(opt => opt.label.toLowerCase().includes(query));
    }, [options, searchQuery]);

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Focus search input when dropdown opens
    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        } else {
            setSearchQuery('');
        }
    }, [isOpen]);

    const handleTriggerClick = () => {
        if (disabled || isLoading) return;
        if (!isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            setOpenUpward(spaceBelow < 285);
        }
        setIsOpen(!isOpen);
    };

    return (
        <div ref={containerRef} className="relative w-full">
            {/* Hidden Input for Form Validation if required */}
            {required && (
                <input
                    type="text"
                    value={value}
                    required
                    tabIndex={-1}
                    className="absolute opacity-0 pointer-events-none w-full h-full left-0 top-0"
                    readOnly
                />
            )}

            {/* Select Trigger */}
            <button
                type="button"
                onClick={handleTriggerClick}
                disabled={disabled || isLoading}
                className={`w-full px-4 py-3 border rounded-2xl text-sm font-semibold outline-none flex items-center justify-between transition-all select-none ${
                    (disabled || isLoading)
                        ? 'opacity-40 cursor-not-allowed'
                        : 'cursor-pointer focus:border-brand-lime hover:border-[#C8E600]/60'
                }`}
                style={{
                    background: 'var(--bg-input)',
                    borderColor: isOpen ? 'var(--brand-lime, #C8E600)' : 'var(--border-main)',
                    color: selectedOption ? 'var(--text-main)' : 'var(--text-dim, #888)'
                }}
            >
                <span className="truncate">
                    {isLoading ? 'Loading options...' : (selectedOption ? selectedOption.label : placeholder)}
                </span>
                {isLoading ? (
                    <div className="w-4 h-4 border-2 border-brand-lime border-t-transparent rounded-full animate-spin flex-shrink-0" style={{ borderColor: 'var(--brand-lime, #C8E600) transparent var(--brand-lime, #C8E600) var(--brand-lime, #C8E600)' }} />
                ) : (
                    <ChevronDown
                        size={16}
                        className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand-lime' : 'text-dim'}`}
                        style={{ color: isOpen ? 'var(--brand-lime, #C8E600)' : 'var(--text-dim)' }}
                    />
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className={`absolute ${openUpward ? 'bottom-full mb-2' : 'top-full mt-2'} w-full border rounded-2xl shadow-2xl z-[9999] overflow-hidden flex flex-col animate-in fade-in duration-150`}
                    style={{
                        background: 'var(--bg-card, #1C1C1C)',
                        borderColor: 'var(--border-main, #2A2A2A)'
                    }}
                >
                    {/* Search Field */}
                    <div className="p-3 border-b flex items-center gap-2" style={{ borderColor: 'var(--border-main)' }}>
                        <Search size={14} className="text-dim opacity-50" style={{ color: 'var(--text-dim)' }} />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Type to filter..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent text-xs font-semibold outline-none"
                            style={{ color: 'var(--text-main)' }}
                        />
                    </div>
                    {/* Quick Add Option */}
                    {onAddNew && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                                onAddNew();
                            }}
                            className="w-full text-left px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-brand-lime hover:bg-[#C8E600]/10 border-b border-dashed transition-all flex items-center gap-1 cursor-pointer"
                            style={{
                                color: 'var(--brand-lime, #C8E600)',
                                borderColor: 'var(--border-main)'
                            }}
                        >
                            <Plus size={11} strokeWidth={3} />
                            {addNewText}
                        </button>
                    )}                    {/* Options List */}
                    <div className="max-h-56 overflow-y-auto custom-scrollbar divide-y divide-white/[0.02]" style={{ borderColor: 'var(--border-main)' }}>
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-4 text-center text-xs text-dim italic" style={{ color: 'var(--text-dim)' }}>
                                No results found
                            </div>
                        ) : (
                            filteredOptions.map(opt => {
                                const isSelected = opt.value === value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => {
                                            onChange(opt.value);
                                            setIsOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-white/5 active:bg-white/10 transition-colors flex items-center justify-between cursor-pointer"
                                        style={{
                                            color: isSelected ? 'var(--brand-lime, #C8E600)' : 'var(--text-main)'
                                        }}
                                    >
                                        <span className="truncate pr-4">{opt.label}</span>
                                        {isSelected && <Check size={14} className="text-brand-lime flex-shrink-0" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
