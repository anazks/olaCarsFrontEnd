import React, { useState, useEffect } from 'react';
import {
  FileText,
  DollarSign,
  Upload,
  Calendar,
  X,
  AlertTriangle,
  Loader2,
  Paperclip,
  Building,
  CreditCard,
  BookOpen,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createPaymentEntry,
  updateAndResubmitPaymentEntry,
  type PaymentPortalEntry,
  type PortalVendor,
  type PortalAccount,
} from '../../services/paymentPortalService';

interface PaymentEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialEntry?: PaymentPortalEntry | null;
  vendors: PortalVendor[];
  debitAccounts: PortalAccount[];
  creditAccounts: PortalAccount[];
  canCreate?: boolean;
}

export const PaymentEntryModal: React.FC<PaymentEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialEntry,
  vendors,
  debitAccounts,
  creditAccounts,
  canCreate = true,
}) => {
  const isRevision = !!(initialEntry && initialEntry.status === 'REJECTED');

  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [debitAccount, setDebitAccount] = useState('');
  const [creditAccount, setCreditAccount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [existingDocs, setExistingDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Searchable Vendor Combobox State
  const [vendorSearch, setVendorSearch] = useState('');
  const [isVendorDropdownOpen, setIsVendorDropdownOpen] = useState(false);
  const vendorDropdownRef = React.useRef<HTMLDivElement>(null);
  const vendorSearchInputRef = React.useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        vendorDropdownRef.current &&
        !vendorDropdownRef.current.contains(event.target as Node)
      ) {
        setIsVendorDropdownOpen(false);
      }
    };
    if (isVendorDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVendorDropdownOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isVendorDropdownOpen && vendorSearchInputRef.current) {
      vendorSearchInputRef.current.focus();
    }
  }, [isVendorDropdownOpen]);

  // Searchable Debit Account Combobox State
  const [debitSearch, setDebitSearch] = useState('');
  const [isDebitDropdownOpen, setIsDebitDropdownOpen] = useState(false);
  const debitDropdownRef = React.useRef<HTMLDivElement>(null);
  const debitSearchInputRef = React.useRef<HTMLInputElement>(null);

  // Searchable Credit Account Combobox State
  const [creditSearch, setCreditSearch] = useState('');
  const [isCreditDropdownOpen, setIsCreditDropdownOpen] = useState(false);
  const creditDropdownRef = React.useRef<HTMLDivElement>(null);
  const creditSearchInputRef = React.useRef<HTMLInputElement>(null);

  // Close Debit/Credit dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        debitDropdownRef.current &&
        !debitDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDebitDropdownOpen(false);
      }
      if (
        creditDropdownRef.current &&
        !creditDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCreditDropdownOpen(false);
      }
    };
    if (isDebitDropdownOpen || isCreditDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDebitDropdownOpen, isCreditDropdownOpen]);

  useEffect(() => {
    if (isDebitDropdownOpen && debitSearchInputRef.current) {
      debitSearchInputRef.current.focus();
    }
  }, [isDebitDropdownOpen]);

  useEffect(() => {
    if (isCreditDropdownOpen && creditSearchInputRef.current) {
      creditSearchInputRef.current.focus();
    }
  }, [isCreditDropdownOpen]);

  const selectedDebitAccount = debitAccounts.find((a) => a._id === debitAccount);
  const selectedCreditAccount = creditAccounts.find((a) => a._id === creditAccount);

  const filteredDebitAccounts = debitAccounts.filter((a) => {
    if (!debitSearch.trim()) return true;
    const query = debitSearch.toLowerCase().trim();
    return (
      (a.code && a.code.toLowerCase().includes(query)) ||
      (a.name && a.name.toLowerCase().includes(query)) ||
      (a.category && a.category.toLowerCase().includes(query))
    );
  });

  const filteredCreditAccounts = creditAccounts.filter((a) => {
    if (!creditSearch.trim()) return true;
    const query = creditSearch.toLowerCase().trim();
    return (
      (a.code && a.code.toLowerCase().includes(query)) ||
      (a.name && a.name.toLowerCase().includes(query)) ||
      (a.category && a.category.toLowerCase().includes(query))
    );
  });

  const getAccountBadgeStyle = (category: string = '') => {
    const upper = category.toUpperCase();
    if (upper.includes('EXPENSE')) {
      return 'bg-orange-500/10 text-orange-400 border-orange-500/25';
    }
    if (upper.includes('ASSET')) {
      return 'bg-blue-500/10 text-blue-400 border-blue-500/25';
    }
    if (upper.includes('LIABILITY') || upper.includes('PAYABLE')) {
      return 'bg-purple-500/10 text-purple-400 border-purple-500/25';
    }
    if (upper.includes('BANK')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
    }
    if (upper.includes('CASH')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/25';
    }
    return 'bg-white/10 text-gray-300 border-white/10';
  };

  const selectedVendor = vendors.find((v) => v._id === vendor);

  const filteredVendors = vendors.filter((v) => {
    if (!vendorSearch.trim()) return true;
    const query = vendorSearch.toLowerCase().trim();
    return (
      (v.name && v.name.toLowerCase().includes(query)) ||
      (v.companyName && v.companyName.toLowerCase().includes(query)) ||
      (v.vendorNumber && v.vendorNumber.toLowerCase().includes(query)) ||
      (v.category && v.category.toLowerCase().includes(query)) ||
      (v.email && v.email.toLowerCase().includes(query)) ||
      (v.phone && v.phone.toLowerCase().includes(query))
    );
  });

  useEffect(() => {
    if (isOpen) {
      if (initialEntry) {
        setVendor(
          typeof initialEntry.vendor === 'object' ? initialEntry.vendor._id : initialEntry.vendor
        );
        setAmount(String(initialEntry.amount || ''));
        setCurrency(initialEntry.currency || 'USD');
        setDebitAccount(
          typeof initialEntry.debitAccount === 'object'
            ? initialEntry.debitAccount._id
            : initialEntry.debitAccount
        );
        setCreditAccount(
          typeof initialEntry.creditAccount === 'object'
            ? initialEntry.creditAccount._id
            : initialEntry.creditAccount
        );
        setPaymentDate(
          initialEntry.paymentDate
            ? new Date(initialEntry.paymentDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
        );
        setReferenceNumber(initialEntry.referenceNumber || '');
        setDescription(initialEntry.description || '');
        setExistingDocs(initialEntry.supportingDocuments || []);
        setRevisionNotes('');
      } else {
        // Reset
        setVendor('');
        setAmount('');
        setCurrency('USD');
        setDebitAccount('');
        setCreditAccount('');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setReferenceNumber('');
        setDescription('');
        setExistingDocs([]);
        setRevisionNotes('');
      }
      setFiles([]);
      setError(null);
    }
  }, [isOpen, initialEntry]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selected].slice(0, 5));
    }
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeExistingDoc = (docId?: string) => {
    setExistingDocs((prev) => prev.filter((d) => d._id !== docId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!canCreate) {
      setError('Checker financial admins do not have permission to create or re-submit payment entries.');
      return;
    }

    if (!vendor || !amount || !debitAccount || !creditAccount) {
      setError('Vendor, Amount, Debit Account, and Credit Account are mandatory fields');
      return;
    }

    const totalDocs = files.length + existingDocs.length;
    if (totalDocs === 0) {
      const msg = 'At least one supporting document (invoice / bill receipt PDF or image) is mandatory.';
      setError(msg);
      toast.error(msg);
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Amount must be a valid positive number');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('vendor', vendor);
      formData.append('amount', String(numAmount));
      formData.append('currency', currency);
      formData.append('debitAccount', debitAccount);
      formData.append('creditAccount', creditAccount);
      formData.append('paymentDate', paymentDate);
      if (referenceNumber) formData.append('referenceNumber', referenceNumber);
      if (description) formData.append('description', description);

      if (isRevision && revisionNotes) {
        formData.append('revisionNotes', revisionNotes);
      }

      // Existing retained documents
      if (isRevision) {
        formData.append(
          'keepExistingDocuments',
          JSON.stringify(existingDocs.map((d) => d._id || d.url))
        );
      }

      // New files
      files.forEach((file) => {
        formData.append('documents', file);
      });

      if (isRevision && initialEntry) {
        await updateAndResubmitPaymentEntry(initialEntry._id, formData);
        toast.success('Payment entry updated and re-submitted for approval!');
      } else {
        await createPaymentEntry(formData);
        toast.success('Payment entry submitted successfully for approval!');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit payment entry';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#16181D] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#16181D]/95 backdrop-blur-md p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C8E600]/10 border border-[#C8E600]/25 text-[#C8E600]">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isRevision ? `Revise & Re-submit: ${initialEntry?.entryNumber}` : 'New Payment Entry'}
              </h3>
              <p className="text-xs text-gray-400">
                {isRevision
                  ? 'Update the entry details addressing the approver remarks below'
                  : 'Enter payment details and attach supporting documents for approval'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {!canCreate && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/25 p-3.5 text-xs text-amber-300">
              <AlertTriangle size={16} className="shrink-0 text-amber-400" />
              <span>
                You have Checker (Approval-only) access. Re-submitting or creating payment entries is restricted to Financial Admins with Entry (Maker) access.
              </span>
            </div>
          )}
          {/* Rejection Alert Banner */}
          {isRevision && initialEntry?.rejectionRemark && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 animate-shake">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-1">
                    Approver Rejection Remarks
                  </h4>
                  <p className="text-sm text-red-200 font-medium whitespace-pre-wrap">
                    "{initialEntry.rejectionRemark}"
                  </p>
                  <div className="mt-2 text-[11px] text-red-400/80">
                    Reviewed by <span className="text-white font-semibold">{initialEntry.reviewerName || 'Approver'}</span>
                    {initialEntry.reviewedAt && (
                      <span> on {new Date(initialEntry.reviewedAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/25 p-3.5 text-xs text-red-400">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form fields grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Vendor / Supplier (Searchable Combobox) */}
            <div className="md:col-span-2 relative" ref={vendorDropdownRef}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <Building size={14} className="text-[#C8E600]" />
                  Corresponding Vendor / Supplier <span className="text-red-400">*</span>
                </label>
                {selectedVendor && (
                  <span className="text-[11px] text-[#C8E600] font-mono font-medium">
                    {selectedVendor.vendorNumber ? `Code: ${selectedVendor.vendorNumber}` : ''}
                  </span>
                )}
              </div>

              {/* Trigger Box */}
              <div
                onClick={() => {
                  setIsVendorDropdownOpen(!isVendorDropdownOpen);
                  if (!isVendorDropdownOpen) setVendorSearch('');
                }}
                className={`w-full min-h-[46px] px-3.5 py-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isVendorDropdownOpen
                    ? 'border-[#C8E600] bg-white/[0.08] ring-2 ring-[#C8E600]/25 shadow-lg shadow-[#C8E600]/5'
                    : selectedVendor
                    ? 'border-white/20 bg-white/[0.04] hover:border-white/30 hover:bg-white/[0.06]'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
                }`}
              >
                {selectedVendor ? (
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-[#C8E600]/15 border border-[#C8E600]/30 text-[#C8E600] flex items-center justify-center font-bold text-xs uppercase shrink-0">
                      {selectedVendor.name.slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white truncate">
                          {selectedVendor.name}
                        </span>
                        {selectedVendor.vendorNumber && (
                          <span className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-mono text-[10px]">
                            {selectedVendor.vendorNumber}
                          </span>
                        )}
                      </div>
                      {(selectedVendor.companyName || selectedVendor.category) && (
                        <p className="text-xs text-gray-400 truncate">
                          {selectedVendor.companyName || ''}
                          {selectedVendor.companyName && selectedVendor.category ? ' • ' : ''}
                          {selectedVendor.category || ''}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 text-gray-400 text-sm">
                    <Building size={16} className="text-gray-500" />
                    <span>Search & select vendor or supplier...</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedVendor && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVendor('');
                        setVendorSearch('');
                      }}
                      className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition"
                      title="Clear vendor"
                    >
                      <X size={14} />
                    </button>
                  )}
                  <div className="text-gray-400 p-0.5">
                    {isVendorDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </div>

              {/* Dropdown Menu Popover */}
              {isVendorDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-white/15 bg-[#16181D] shadow-2xl overflow-hidden backdrop-blur-xl animate-fadeIn">
                  {/* Sticky Search Input Bar */}
                  <div className="p-3 border-b border-white/10 bg-white/[0.02]">
                    <div className="relative">
                      <Search
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        ref={vendorSearchInputRef}
                        type="text"
                        value={vendorSearch}
                        onChange={(e) => setVendorSearch(e.target.value)}
                        placeholder="Type to filter by name, company, code, email..."
                        className="w-full pl-9 pr-8 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:border-[#C8E600] focus:outline-none text-xs"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {vendorSearch && (
                        <button
                          type="button"
                          onClick={() => setVendorSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-gray-400">
                      <span>
                        Showing <strong className="text-white">{filteredVendors.length}</strong> of{' '}
                        {vendors.length} vendors
                      </span>
                      {selectedVendor && (
                        <button
                          type="button"
                          onClick={() => {
                            setVendor('');
                            setIsVendorDropdownOpen(false);
                          }}
                          className="text-red-400 hover:underline"
                        >
                          Deselect
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scrollable List */}
                  <div className="max-h-64 overflow-y-auto divide-y divide-white/5 p-1.5">
                    {filteredVendors.length === 0 ? (
                      <div className="py-8 text-center text-gray-400 space-y-1.5">
                        <Building size={24} className="mx-auto text-gray-600 mb-1" />
                        <p className="text-xs font-semibold text-gray-300">No matching vendors</p>
                        <p className="text-[11px] text-gray-500">
                          {vendorSearch
                            ? `No vendors found matching "${vendorSearch}"`
                            : 'No vendors available in the system'}
                        </p>
                      </div>
                    ) : (
                      filteredVendors.map((v) => {
                        const isSelected = v._id === vendor;
                        return (
                          <div
                            key={v._id}
                            onClick={() => {
                              setVendor(v._id);
                              setIsVendorDropdownOpen(false);
                              setVendorSearch('');
                            }}
                            className={`p-2.5 rounded-xl cursor-pointer transition flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-[#C8E600]/10 border border-[#C8E600]/30'
                                : 'hover:bg-white/5 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                                  isSelected
                                    ? 'bg-[#C8E600] text-black font-extrabold shadow-sm'
                                    : 'bg-white/10 text-gray-200 border border-white/10'
                                }`}
                              >
                                {v.name.slice(0, 2)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-xs font-bold truncate ${
                                      isSelected ? 'text-[#C8E600]' : 'text-white'
                                    }`}
                                  >
                                    {v.name}
                                  </span>
                                  {v.vendorNumber && (
                                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-gray-400 font-mono text-[9px] shrink-0">
                                      {v.vendorNumber}
                                    </span>
                                  )}
                                  {v.category && (
                                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 text-[9px] font-semibold border border-blue-500/20 shrink-0">
                                      {v.category}
                                    </span>
                                  )}
                                </div>
                                {(v.companyName || v.email || v.phone) && (
                                  <p className="text-[11px] text-gray-400 truncate mt-0.5">
                                    {v.companyName ? v.companyName : ''}
                                    {v.companyName && (v.email || v.phone) ? ' • ' : ''}
                                    {v.email || v.phone || ''}
                                  </p>
                                )}
                              </div>
                            </div>

                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-[#C8E600] text-black flex items-center justify-center shrink-0">
                                <Check size={12} className="stroke-[3]" />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <DollarSign size={14} className="text-[#C8E600]" />
                Amount <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:border-[#C8E600] focus:outline-none text-sm font-medium"
                />
              </div>
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center gap-1.5">
                <Calendar size={14} className="text-[#C8E600]" />
                Payment Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-[#C8E600] focus:outline-none text-sm"
              />
            </div>

            {/* Accounts Classification Info Notice */}
            <div className="md:col-span-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300">
              <BookOpen size={13} className="shrink-0 text-blue-400" />
              <span>
                Account classification is for payment verification & review only. <strong>No general ledger entries are created</strong> by the Payments Portal.
              </span>
            </div>

            {/* Debit Account (Searchable Combobox) */}
            <div className="relative" ref={debitDropdownRef}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <BookOpen size={14} className="text-[#C8E600]" />
                  Debit Account (Expense / Asset / AP) <span className="text-red-400">*</span>
                </label>
                {selectedDebitAccount && (
                  <span className="text-[11px] text-[#C8E600] font-mono font-bold">
                    {selectedDebitAccount.code}
                  </span>
                )}
              </div>

              {/* Debit Trigger Box */}
              <div
                onClick={() => {
                  setIsDebitDropdownOpen(!isDebitDropdownOpen);
                  if (!isDebitDropdownOpen) setDebitSearch('');
                }}
                className={`w-full min-h-[46px] px-3.5 py-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                  isDebitDropdownOpen
                    ? 'border-[#C8E600] bg-white/[0.08] ring-2 ring-[#C8E600]/25 shadow-lg shadow-[#C8E600]/5'
                    : selectedDebitAccount
                    ? 'border-white/20 bg-white/[0.04] hover:border-white/30 hover:bg-white/[0.06]'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
                }`}
              >
                {selectedDebitAccount ? (
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="px-2 py-0.5 rounded-lg bg-white/10 text-[#C8E600] font-mono text-xs font-black shrink-0 border border-white/10">
                      {selectedDebitAccount.code}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">
                        {selectedDebitAccount.name}
                      </p>
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider border ${getAccountBadgeStyle(selectedDebitAccount.category)}`}>
                        {selectedDebitAccount.category}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <BookOpen size={15} className="text-gray-500" />
                    <span>Select debit account...</span>
                  </div>
                )}

                <div className="flex items-center gap-1 shrink-0">
                  {selectedDebitAccount && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDebitAccount('');
                        setDebitSearch('');
                      }}
                      className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition"
                      title="Clear debit account"
                    >
                      <X size={13} />
                    </button>
                  )}
                  <div className="text-gray-400 p-0.5">
                    {isDebitDropdownOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </div>
                </div>
              </div>

              {/* Debit Dropdown Popover */}
              {isDebitDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-white/15 bg-[#16181D] shadow-2xl overflow-hidden backdrop-blur-xl animate-fadeIn">
                  <div className="p-2.5 border-b border-white/10 bg-white/[0.02]">
                    <div className="relative">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        ref={debitSearchInputRef}
                        type="text"
                        value={debitSearch}
                        onChange={(e) => setDebitSearch(e.target.value)}
                        placeholder="Search debit account by code, name, category..."
                        className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:border-[#C8E600] focus:outline-none text-xs"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {debitSearch && (
                        <button
                          type="button"
                          onClick={() => setDebitSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto divide-y divide-white/5 p-1.5">
                    {filteredDebitAccounts.length === 0 ? (
                      <div className="py-6 text-center text-gray-400 text-xs">
                        No matching debit accounts
                      </div>
                    ) : (
                      filteredDebitAccounts.map((a) => {
                        const isSelected = a._id === debitAccount;
                        return (
                          <div
                            key={a._id}
                            onClick={() => {
                              setDebitAccount(a._id);
                              setIsDebitDropdownOpen(false);
                              setDebitSearch('');
                            }}
                            className={`p-2 rounded-xl cursor-pointer transition flex items-center justify-between gap-2.5 ${
                              isSelected
                                ? 'bg-[#C8E600]/10 border border-[#C8E600]/30'
                                : 'hover:bg-white/5 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span className="px-2 py-0.5 rounded-lg bg-white/10 text-gray-300 font-mono text-[11px] font-bold shrink-0">
                                {a.code}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs font-bold truncate ${isSelected ? 'text-[#C8E600]' : 'text-white'}`}>
                                  {a.name}
                                </p>
                                <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider border ${getAccountBadgeStyle(a.category)}`}>
                                  {a.category}
                                </span>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-[#C8E600] text-black flex items-center justify-center shrink-0">
                                <Check size={11} className="stroke-[3]" />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Credit Account (Searchable Combobox) */}
            <div className="relative" ref={creditDropdownRef}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <CreditCard size={14} className="text-[#C8E600]" />
                  Credit Account (Bank / Cash) <span className="text-red-400">*</span>
                </label>
                {selectedCreditAccount && (
                  <span className="text-[11px] text-[#C8E600] font-mono font-bold">
                    {selectedCreditAccount.code}
                  </span>
                )}
              </div>

              {/* Credit Trigger Box */}
              <div
                onClick={() => {
                  setIsCreditDropdownOpen(!isCreditDropdownOpen);
                  if (!isCreditDropdownOpen) setCreditSearch('');
                }}
                className={`w-full min-h-[46px] px-3.5 py-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                  isCreditDropdownOpen
                    ? 'border-[#C8E600] bg-white/[0.08] ring-2 ring-[#C8E600]/25 shadow-lg shadow-[#C8E600]/5'
                    : selectedCreditAccount
                    ? 'border-white/20 bg-white/[0.04] hover:border-white/30 hover:bg-white/[0.06]'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
                }`}
              >
                {selectedCreditAccount ? (
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="px-2 py-0.5 rounded-lg bg-white/10 text-[#C8E600] font-mono text-xs font-black shrink-0 border border-white/10">
                      {selectedCreditAccount.code}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">
                        {selectedCreditAccount.name}
                      </p>
                      <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider border ${getAccountBadgeStyle(selectedCreditAccount.category)}`}>
                        {selectedCreditAccount.category}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <CreditCard size={15} className="text-gray-500" />
                    <span>Select credit account...</span>
                  </div>
                )}

                <div className="flex items-center gap-1 shrink-0">
                  {selectedCreditAccount && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreditAccount('');
                        setCreditSearch('');
                      }}
                      className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition"
                      title="Clear credit account"
                    >
                      <X size={13} />
                    </button>
                  )}
                  <div className="text-gray-400 p-0.5">
                    {isCreditDropdownOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </div>
                </div>
              </div>

              {/* Credit Dropdown Popover */}
              {isCreditDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-white/15 bg-[#16181D] shadow-2xl overflow-hidden backdrop-blur-xl animate-fadeIn">
                  <div className="p-2.5 border-b border-white/10 bg-white/[0.02]">
                    <div className="relative">
                      <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        ref={creditSearchInputRef}
                        type="text"
                        value={creditSearch}
                        onChange={(e) => setCreditSearch(e.target.value)}
                        placeholder="Search credit account by code, name, category..."
                        className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:border-[#C8E600] focus:outline-none text-xs"
                        onClick={(e) => e.stopPropagation()}
                      />
                      {creditSearch && (
                        <button
                          type="button"
                          onClick={() => setCreditSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto divide-y divide-white/5 p-1.5">
                    {filteredCreditAccounts.length === 0 ? (
                      <div className="py-6 text-center text-gray-400 text-xs">
                        No matching credit accounts
                      </div>
                    ) : (
                      filteredCreditAccounts.map((a) => {
                        const isSelected = a._id === creditAccount;
                        return (
                          <div
                            key={a._id}
                            onClick={() => {
                              setCreditAccount(a._id);
                              setIsCreditDropdownOpen(false);
                              setCreditSearch('');
                            }}
                            className={`p-2 rounded-xl cursor-pointer transition flex items-center justify-between gap-2.5 ${
                              isSelected
                                ? 'bg-[#C8E600]/10 border border-[#C8E600]/30'
                                : 'hover:bg-white/5 border border-transparent'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span className="px-2 py-0.5 rounded-lg bg-white/10 text-gray-300 font-mono text-[11px] font-bold shrink-0">
                                {a.code}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs font-bold truncate ${isSelected ? 'text-[#C8E600]' : 'text-white'}`}>
                                  {a.name}
                                </p>
                                <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider border ${getAccountBadgeStyle(a.category)}`}>
                                  {a.category}
                                </span>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-[#C8E600] text-black flex items-center justify-center shrink-0">
                                <Check size={11} className="stroke-[3]" />
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Reference Number */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Reference / Bill / Invoice # (Optional)
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. INV-98234 or BILL-002"
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:border-[#C8E600] focus:outline-none text-sm"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Description / Purpose of Payment
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of payment purpose..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:border-[#C8E600] focus:outline-none text-sm resize-none"
              />
            </div>

            {/* Revision Notes if in revision mode */}
            {isRevision && (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-amber-300 mb-1.5">
                  Revision Notes (Explain what was updated)
                </label>
                <input
                  type="text"
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="e.g. Corrected invoice amount and re-attached signed receipt"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-white placeholder-gray-500 focus:border-[#C8E600] focus:outline-none text-sm"
                />
              </div>
            )}
          </div>

          {/* Supporting Documents Section */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-gray-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Paperclip size={14} className="text-[#C8E600]" />
                Supporting Documents (PDF or Images, max 5) <span className="text-red-400">*</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                Required
              </span>
            </label>

            {/* Existing Documents in Revision */}
            {existingDocs.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] text-gray-400 font-medium">Attached Documents:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {existingDocs.map((doc, idx) => (
                    <div
                      key={doc._id || idx}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-white/10 bg-white/5 text-xs text-white"
                    >
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate hover:text-[#C8E600] underline font-medium"
                      >
                        {doc.name}
                      </a>
                      <button
                        type="button"
                        onClick={() => removeExistingDoc(doc._id)}
                        className="text-gray-400 hover:text-red-400 p-1"
                        title="Remove document"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New File Upload Dropzone */}
            <div
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition ${
                files.length === 0 && existingDocs.length === 0
                  ? 'border-amber-500/30 bg-amber-500/[0.02] hover:border-amber-400/60'
                  : 'border-white/10 hover:border-[#C8E600]/50 bg-white/[0.02]'
              }`}
            >
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center justify-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl mb-2 ${
                    files.length === 0 && existingDocs.length === 0
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-white/5 text-gray-300'
                  }`}
                >
                  <Upload size={18} />
                </div>
                <p className="text-xs font-semibold text-white flex items-center gap-1">
                  Click or drag files here to attach <span className="text-red-400">*</span>
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Invoices, payment vouchers, or signed receipts (Mandatory)
                </p>
              </div>
            </div>

            {/* New files list */}
            {files.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] text-[#C8E600] font-semibold">New Files to Upload:</span>
                {files.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#C8E600]/5 border border-[#C8E600]/20 text-xs text-white"
                  >
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-gray-400 hover:text-red-400 p-1"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-gray-300 hover:bg-white/5 transition"
            >
              Cancel
            </button>
            {canCreate ? (
              <button
                type="submit"
                disabled={loading || (files.length === 0 && existingDocs.length === 0)}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#C8E600] text-black hover:bg-[#d6f21d] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-[#C8E600]/20 transition"
                title={
                  files.length === 0 && existingDocs.length === 0
                    ? 'Please attach at least one supporting document before submitting'
                    : undefined
                }
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                <span>{isRevision ? 'Re-submit for Approval' : 'Submit for Approval'}</span>
              </button>
            ) : (
              <span className="text-xs text-gray-500 italic py-2">
                Re-submission disabled for Checker accounts
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentEntryModal;
