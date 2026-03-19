import { useState } from 'react';
import { Shield, X, Check, Search, Calendar, DollarSign, FileText } from 'lucide-react';
import type { Insurance } from '../../../services/insuranceService';

interface InsuranceSelectorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (insurance: Insurance) => void;
    insurances: Insurance[];
    selectedId?: string;
}

const InsuranceSelectorModal = ({ isOpen, onClose, onSelect, insurances, selectedId }: InsuranceSelectorModalProps) => {
    const [search, setSearch] = useState('');

    if (!isOpen) return null;

    const filtered = insurances.filter(ins => 
        ins.provider?.toLowerCase().includes(search.toLowerCase()) || 
        ins.policyNumber?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-300">
            <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5 flex-shrink-0">
                    <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                        <Shield style={{ color: '#C8E600' }} />
                        Select Insurance Policy
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all" style={{ color: 'var(--text-dim)' }}>
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 flex-shrink-0 border-b border-white/5">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by provider or policy number..."
                            className="w-full pl-12 pr-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2"
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-main)', color: 'var(--text-main)' }}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                    {filtered.length === 0 ? (
                        <div className="text-center py-10" style={{ color: 'var(--text-dim)' }}>
                            <p>No insurance policies found matching your search.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filtered.map(ins => (
                                <div 
                                    key={ins._id}
                                    onClick={() => onSelect(ins)}
                                    className="p-5 rounded-2xl border transition-all cursor-pointer hover:-translate-y-1 relative overflow-hidden flex flex-col group"
                                    style={{ 
                                        background: selectedId === ins._id ? 'rgba(200,230,0,0.05)' : 'var(--bg-sidebar)',
                                        borderColor: selectedId === ins._id ? '#C8E600' : 'var(--border-main)'
                                    }}
                                >
                                    {selectedId === ins._id && (
                                        <div className="absolute top-0 right-0 p-1.5 bg-[#C8E600] rounded-bl-xl text-black">
                                            <Check size={14} />
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg" style={{ color: 'var(--text-main)' }}>{ins.provider}</h3>
                                            <p className="text-xs font-mono" style={{ color: 'var(--text-dim)' }}>{ins.policyNumber}</p>
                                        </div>
                                        <div className="flex flex-col gap-1 items-end">
                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest border"
                                                style={{ background: 'var(--bg-input)', color: 'var(--text-main)', borderColor: 'var(--border-main)' }}>
                                                {ins.policyType || 'INDIVIDUAL'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs flex-grow">
                                        <div>
                                            <p className="font-bold mb-0.5 uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-dim)' }}>Coverage</p>
                                            <p className="font-medium" style={{ color: 'var(--text-main)' }}>{ins.coverageType?.replace('_', ' ') || 'COMPREHENSIVE'}</p>
                                        </div>
                                        <div>
                                            <p className="font-bold mb-0.5 uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-dim)' }}>Insured Value</p>
                                            <p className="font-medium flex items-center gap-1" style={{ color: 'var(--text-main)' }}><DollarSign size={12}/>{ins.insuredValue?.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="font-bold mb-0.5 uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-dim)' }}>Valid Until</p>
                                            <p className="font-medium flex items-center gap-1" style={{ color: 'var(--text-main)' }}><Calendar size={12}/>{ins.expiryDate ? new Date(ins.expiryDate).toLocaleDateString() : 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="font-bold mb-0.5 uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-dim)' }}>Contact details</p>
                                            <p className="font-medium truncate" style={{ color: 'var(--text-main)' }}>{ins.providerContact?.name}</p>
                                            <p className="font-medium truncate" style={{ color: 'var(--text-dim)' }}>{ins.providerContact?.phone}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 pt-3 border-t flex justify-between items-center" style={{ borderColor: 'var(--border-main)' }}>
                                         <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border`} style={{
                                                background: ins.status === 'ACTIVE' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                                color: ins.status === 'ACTIVE' ? '#22c55e' : '#ef4444',
                                                borderColor: ins.status === 'ACTIVE' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'
                                            }}>
                                                {ins.status || 'ACTIVE'}
                                        </span>
                                        {ins.documents?.policyDocumentUrl ? (
                                             <div className="flex items-center gap-1 text-[10px] text-blue-400 group-hover:underline">
                                                 <FileText size={12}/> Document Attached
                                             </div>
                                        ) : (
                                            <span className="text-[10px] italic" style={{ color: 'var(--text-dim)' }}>No Appended Doc</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InsuranceSelectorModal;
