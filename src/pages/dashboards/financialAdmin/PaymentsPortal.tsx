import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  Lock,
  KeyRound,
  Search,
  RefreshCw,
  CreditCard,
  BookOpen,
  Eye, EyeOff,
  Edit,
  Shield,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getUser, getUserRole } from '../../../utils/auth';
import {
  getMpinStatus,
  getPaymentEntries,
  getPortalVendors,
  getPortalAccounts,
  getFinanceAdminsWithAccess,
  isPortalUnlocked,
  clearPortalToken,
  approvePaymentEntry,
  rejectPaymentEntry,
  type PaymentPortalEntry,
  type FinanceAdminAccessItem,
  type PortalVendor,
  type PortalAccount,
  type MpinStatusResponse,
} from '../../../services/paymentPortalService';
import MpinLockModal from '../../../components/paymentPortal/MpinLockModal';
import AdminMpinModal from '../../../components/paymentPortal/AdminMpinModal';
import PaymentEntryModal from '../../../components/paymentPortal/PaymentEntryModal';
import PaymentEntryDetailModal from '../../../components/paymentPortal/PaymentEntryDetailModal';

export const PaymentsPortal: React.FC = () => {
  const currentUser = getUser();
  const userRole = getUserRole();
  const isSuperAdmin = userRole === 'ADMIN';

  // Auth & Portal State
  const [isUnlocked, setIsUnlocked] = useState(isSuperAdmin || isPortalUnlocked());
  const [mpinStatus, setMpinStatus] = useState<MpinStatusResponse | null>(null);
  const [showMpinModal, setShowMpinModal] = useState(!isSuperAdmin && !isPortalUnlocked());

  const canCreate = isSuperAdmin || mpinStatus?.hasEntryAccess;
  const canApprove = isSuperAdmin || mpinStatus?.hasApprovalAccess;

  // Helper to accurately determine if the logged-in user is the creator of the entry
  const isUserEntryCreator = (entryItem: PaymentPortalEntry | null | undefined): boolean => {
    if (!entryItem) return false;
    if (isSuperAdmin) return true;
    if (!currentUser) return false;

    const currentUserId = String(currentUser._id || currentUser.id || '').trim();
    const currentUserEmail = (currentUser.email || '').toLowerCase().trim();

    // Check creator when populated as an object
    if (typeof entryItem.createdBy === 'object' && entryItem.createdBy !== null) {
      const creatorObj = entryItem.createdBy as any;
      const creatorId = String(creatorObj._id || creatorObj.id || '').trim();
      const creatorEmail = (creatorObj.email || '').toLowerCase().trim();

      if (currentUserId && creatorId && currentUserId === creatorId) return true;
      if (currentUserEmail && creatorEmail && currentUserEmail === creatorEmail) return true;
    }

    // Check creator when stored as a raw ID string
    if (typeof entryItem.createdBy === 'string' && currentUserId) {
      if (String(entryItem.createdBy).trim() === currentUserId) return true;
    }

    return false;
  };

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'my-entries' | 'approvals' | 'all-entries' | 'admin-provisioning'>(
    userRole === 'ADMIN' ? 'all-entries' : 'my-entries'
  );

  // Data State
  const [entries, setEntries] = useState<PaymentPortalEntry[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PaymentPortalEntry[]>([]);
  const [allEntries, setAllEntries] = useState<PaymentPortalEntry[]>([]);
  const [financeAdmins, setFinanceAdmins] = useState<FinanceAdminAccessItem[]>([]);
  const [revealedPortalPins, setRevealedPortalPins] = useState<Record<string, boolean>>({});
  const [vendors, setVendors] = useState<PortalVendor[]>([]);
  const [debitAccounts, setDebitAccounts] = useState<PortalAccount[]>([]);
  const [creditAccounts, setCreditAccounts] = useState<PortalAccount[]>([]);

  // Loading & Pagination
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [vendorFilter, setVendorFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Modals State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<PaymentPortalEntry | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<PaymentPortalEntry | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Admin Modal
  const [selectedAdminForMpin, setSelectedAdminForMpin] = useState<FinanceAdminAccessItem | null>(null);
  const [showAdminMpinModal, setShowAdminMpinModal] = useState(false);

  // Quick Reject in Table
  const [rejectPromptId, setRejectPromptId] = useState<string | null>(null);
  const [tableRejectRemark, setTableRejectRemark] = useState<string>('');
  const [rejecting, setRejecting] = useState(false);

  // ─────────────────────────────────────────────────────────────
  // 1. INITIAL LOAD & MPIN CHECK
  // ─────────────────────────────────────────────────────────────

  const checkStatus = useCallback(async () => {
    if (isSuperAdmin) {
      setIsUnlocked(true);
      setShowMpinModal(false);
      return;
    }

    try {
      // Whenever a financial user loads/visits the Payments Portal, always require MPIN
      clearPortalToken();
      setIsUnlocked(false);
      setShowMpinModal(true);

      const status = await getMpinStatus();
      setMpinStatus(status);

      // Select default tab based on access permissions
      if (isSuperAdmin) {
        setActiveTab('all-entries');
      } else if (status.hasEntryAccess) {
        setActiveTab('my-entries');
      } else if (status.hasApprovalAccess) {
        setActiveTab('approvals');
      } else {
        setActiveTab('all-entries');
      }
    } catch (err: any) {
      console.error('[PaymentsPortal] status check error:', err);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    checkStatus();

    // Whenever navigating away to another page on the system, clear portal token immediately
    return () => {
      if (!isSuperAdmin) {
        clearPortalToken();
      }
    };
  }, [checkStatus, isSuperAdmin]);

  // Ensure active tab is always accessible according to user permissions
  useEffect(() => {
    if (!isSuperAdmin && mpinStatus) {
      if (activeTab === 'my-entries' && !canCreate) {
        setActiveTab(canApprove ? 'approvals' : 'all-entries');
      } else if (activeTab === 'approvals' && !canApprove) {
        setActiveTab(canCreate ? 'my-entries' : 'all-entries');
      }
    }
  }, [activeTab, canCreate, canApprove, isSuperAdmin, mpinStatus]);

  // ─────────────────────────────────────────────────────────────
  // 2. FETCH MASTER DATA (VENDORS & ACCOUNTS)
  // ─────────────────────────────────────────────────────────────

  const loadLookups = useCallback(async () => {
    if (!isUnlocked) return;
    try {
      const [vendorsList, accountsData] = await Promise.all([
        getPortalVendors(),
        getPortalAccounts(),
      ]);
      setVendors(vendorsList || []);
      setDebitAccounts(accountsData.debitAccounts || accountsData.allAccounts || []);
      setCreditAccounts(accountsData.creditAccounts || accountsData.allAccounts || []);
    } catch (err) {
      console.error('[PaymentsPortal] failed to load lookups:', err);
    }
  }, [isUnlocked]);

  useEffect(() => {
    if (isUnlocked) {
      loadLookups();
    }
  }, [isUnlocked, loadLookups]);

  // ─────────────────────────────────────────────────────────────
  // 3. FETCH TAB DATA
  // ─────────────────────────────────────────────────────────────

  const loadTabData = useCallback(async () => {
    if (!isUnlocked) return;
    try {
      setLoading(true);

      if (activeTab === 'my-entries') {
        const res = await getPaymentEntries({
          onlyMine: true,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          vendor: vendorFilter || undefined,
          search: searchQuery || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page,
          limit: 15,
        });
        setEntries(res.entries || []);
        
      } else if (activeTab === 'approvals') {
        const res = await getPaymentEntries({
          status: 'PENDING_APPROVAL',
          vendor: vendorFilter || undefined,
          search: searchQuery || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page,
          limit: 15,
        });
        setPendingApprovals(res.entries || []);
        
      } else if (activeTab === 'all-entries') {
        const res = await getPaymentEntries({
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          vendor: vendorFilter || undefined,
          search: searchQuery || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page,
          limit: 15,
        });
        setAllEntries(res.entries || []);
        
      } else if (activeTab === 'admin-provisioning' && isSuperAdmin) {
        const list = await getFinanceAdminsWithAccess();
        setFinanceAdmins(list || []);
      }
    } catch (err: any) {
      console.error('[PaymentsPortal] failed to load tab data:', err);
      toast.error(err.response?.data?.message || 'Failed to fetch payment entries');
    } finally {
      setLoading(false);
    }
  }, [
    isUnlocked,
    activeTab,
    statusFilter,
    vendorFilter,
    searchQuery,
    startDate,
    endDate,
    page,
    isSuperAdmin,
  ]);

  useEffect(() => {
    if (isUnlocked) {
      loadTabData();
    }
  }, [isUnlocked, loadTabData]);

  // Lock portal handler
  const handleLockPortal = () => {
    clearPortalToken();
    setIsUnlocked(false);
    setShowMpinModal(true);
    toast.success('Payments Portal locked');
  };

  // Quick Approve in Approvals Queue
  const handleQuickApprove = async (id: string) => {
    try {
      await approvePaymentEntry(id);
      toast.success('Payment entry approved');
      loadTabData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    }
  };

  // Quick Reject in Approvals Queue
  const handleQuickRejectSubmit = async (id: string) => {
    if (!tableRejectRemark.trim()) {
      toast.error('Rejection remark is required');
      return;
    }
    try {
      setRejecting(true);
      await rejectPaymentEntry(id, tableRejectRemark);
      toast.success('Payment entry rejected and returned to creator');
      setRejectPromptId(null);
      setTableRejectRemark('');
      loadTabData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally {
      setRejecting(false);
    }
  };

  // Compute Metrics
  const pendingCount = pendingApprovals.length;
  const needsRevisionCount = entries.filter((e) => e.status === 'REJECTED').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* MPIN Lock Modal */}
      <MpinLockModal
        isOpen={showMpinModal && !isUnlocked}
        onClose={isSuperAdmin ? () => setShowMpinModal(false) : undefined}
        onUnlocked={(data) => {
          setIsUnlocked(true);
          setShowMpinModal(false);
          if (data?.user) {
            setMpinStatus((prev) => ({
              ...prev,
              hasEntryAccess: !!data.user.hasEntryAccess,
              hasApprovalAccess: !!data.user.hasApprovalAccess,
            } as any));

            if (!isSuperAdmin) {
              if (data.user.hasEntryAccess) {
                setActiveTab('my-entries');
              } else if (data.user.hasApprovalAccess) {
                setActiveTab('approvals');
              } else {
                setActiveTab('all-entries');
              }
            }
          }
          loadLookups();
          loadTabData();
        }}
        userName={currentUser?.fullName || 'Financial Admin'}
      />

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#C8E600]/10 border border-[#C8E600]/25 text-[#C8E600] shadow-lg shadow-[#C8E600]/5">
              <CreditCard size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Payments Portal
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#C8E600]/15 text-[#C8E600] border border-[#C8E600]/30 uppercase tracking-widest">
                  Purchase Section
                </span>
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Dual-control payment processing, supporting document attachments, and approval workflow
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadTabData()}
            className="p-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          {!isSuperAdmin && (
            <button
              onClick={handleLockPortal}
              className="px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
              title="Lock Payments Portal"
            >
              <Lock size={14} className="text-amber-400" />
              <span>Lock Portal</span>
            </button>
          )}

          {canCreate && (
            <button
              onClick={() => {
                setEntryToEdit(null);
                setShowCreateModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-[#C8E600] text-black font-bold text-xs hover:bg-[#d6f21d] flex items-center gap-2 shadow-lg shadow-[#C8E600]/20 transition"
            >
              <Plus size={16} />
              <span>New Payment Entry</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${canCreate ? '4' : '3'} gap-4`}>
        {/* Card 1: My Submissions (Maker only) */}
        {canCreate && (
          <div className="rounded-2xl border border-white/10 bg-[#16181D] p-5 shadow-lg">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">My Submissions</span>
              <FileText size={18} className="text-[#C8E600]" />
            </div>
            <div className="text-2xl font-black text-white">{entries.length}</div>
            <p className="text-[11px] text-gray-400 mt-1">Payment entries created by you</p>
          </div>
        )}

        {/* Card 2: Approvals Queue */}
        <div className="rounded-2xl border border-amber-500/20 bg-[#16181D] p-5 shadow-lg">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Approvals</span>
            <Clock size={18} className="text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300">{pendingCount}</div>
          <p className="text-[11px] text-gray-400 mt-1">
            {canApprove ? 'Entries awaiting your review' : 'Awaiting approver review'}
          </p>
        </div>

        {/* Card 3: Approved Payments */}
        <div className="rounded-2xl border border-emerald-500/20 bg-[#16181D] p-5 shadow-lg">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Approved</span>
            <CheckCircle size={18} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300">
            {entries.filter((e) => e.status === 'APPROVED').length}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Approved payments (No ledger entries posted)</p>
        </div>

        {/* Card 4: Needs Revision (Maker only) */}
        {canCreate && (
          <div className="rounded-2xl border border-red-500/20 bg-[#16181D] p-5 shadow-lg">
            <div className="flex items-center justify-between text-red-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Needs Revision</span>
              <AlertTriangle size={18} className="text-red-400" />
            </div>
            <div className="text-2xl font-black text-red-300">{needsRevisionCount}</div>
            <p className="text-[11px] text-gray-400 mt-1">Rejected entries awaiting your edits</p>
          </div>
        )}

        {/* Card 4 Alt: Total Audited History (For Approver-only view) */}
        {!canCreate && (
          <div className="rounded-2xl border border-blue-500/20 bg-[#16181D] p-5 shadow-lg">
            <div className="flex items-center justify-between text-blue-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Total Entries</span>
              <BookOpen size={18} className="text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white">{allEntries.length}</div>
            <p className="text-[11px] text-gray-400 mt-1">Company-wide audit records</p>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-1 overflow-x-auto">
        {canCreate && (
          <button
            onClick={() => {
              setActiveTab('my-entries');
              setPage(1);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'my-entries'
                ? 'bg-[#C8E600] text-black shadow-lg shadow-[#C8E600]/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText size={15} />
            <span>My Entries</span>
            {needsRevisionCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-black text-[10px] font-black">
                {needsRevisionCount}
              </span>
            )}
          </button>
        )}

        {canApprove && (
          <button
            onClick={() => {
              setActiveTab('approvals');
              setPage(1);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'approvals'
                ? 'bg-[#C8E600] text-black shadow-lg shadow-[#C8E600]/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Clock size={15} />
            <span>Approvals Queue</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black">
                {pendingCount}
              </span>
            )}
          </button>
        )}

        <button
            onClick={() => {
              setActiveTab('all-entries');
              setPage(1);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'all-entries'
                ? 'bg-[#C8E600] text-black shadow-lg shadow-[#C8E600]/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BookOpen size={15} />
            <span>All Entries & History</span>
          </button>

        {isSuperAdmin && (
          <button
            onClick={() => {
              setActiveTab('admin-provisioning');
              setPage(1);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'admin-provisioning'
                ? 'bg-[#C8E600] text-black shadow-lg shadow-[#C8E600]/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Shield size={15} />
            <span>Admin MPIN Provisioning</span>
          </button>
        )}
      </div>

      {/* Filters Bar (Only for entries tabs) */}
      {activeTab !== 'admin-provisioning' && (
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl border border-white/10 bg-[#16181D]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entry #, vendor, reference..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:border-[#C8E600] focus:outline-none text-xs"
            />
          </div>

          {/* Status Filter */}
          {activeTab !== 'approvals' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-white/10 bg-[#1A1D24] text-white focus:border-[#C8E600] focus:outline-none text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Needs Revision</option>
              <option value="DRAFT">Draft</option>
            </select>
          )}

          {/* Vendor Filter */}
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-white/10 bg-[#1A1D24] text-white focus:border-[#C8E600] focus:outline-none text-xs max-w-[200px]"
          >
            <option value="">All Vendors</option>
            {vendors.map((v) => (
              <option key={v._id} value={v._id}>
                {v.name}
              </option>
            ))}
          </select>

          {/* Date range */}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-2 rounded-xl border border-white/10 bg-[#1A1D24] text-white focus:border-[#C8E600] focus:outline-none text-xs"
            title="Start date"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-2 rounded-xl border border-white/10 bg-[#1A1D24] text-white focus:border-[#C8E600] focus:outline-none text-xs"
            title="End date"
          />

          {(searchQuery || statusFilter !== 'ALL' || vendorFilter || startDate || endDate) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setVendorFilter('');
                setStartDate('');
                setEndDate('');
              }}
              className="px-3 py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white text-xs hover:bg-white/5"
            >
              Reset
            </button>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* TAB CONTENT: MY ENTRIES OR ALL ENTRIES OR APPROVALS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeTab !== 'admin-provisioning' ? (
        <div className="rounded-2xl border border-white/10 bg-[#16181D] overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Entry #</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Vendor</th>
                  <th className="py-3.5 px-4">Accounts (Dr / Cr)</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-4">Docs</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      <Loader2 size={24} className="animate-spin mx-auto mb-2 text-[#C8E600]" />
                      <span>Loading payment entries...</span>
                    </td>
                  </tr>
                ) : (
                  (activeTab === 'approvals'
                    ? pendingApprovals
                    : activeTab === 'all-entries'
                    ? allEntries
                    : entries
                  ).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-500">
                        No payment entries found matching your filters.
                      </td>
                    </tr>
                  ) : (
                    (activeTab === 'approvals'
                      ? pendingApprovals
                      : activeTab === 'all-entries'
                      ? allEntries
                      : entries
                    ).map((entry) => {
                      const isRejected = entry.status === 'REJECTED';
                      const isPending = entry.status === 'PENDING_APPROVAL';
                      const isEntryCreator = isUserEntryCreator(entry);
                      const vName =
                        typeof entry.vendor === 'object'
                          ? entry.vendor.name || entry.vendor.companyName
                          : entry.vendorName || 'Vendor';

                      const drCode =
                        typeof entry.debitAccount === 'object'
                          ? entry.debitAccount.code
                          : 'Dr';
                      const crCode =
                        typeof entry.creditAccount === 'object'
                          ? entry.creditAccount.code
                          : 'Cr';

                      return (
                        <React.Fragment key={entry._id}>
                          <tr
                            className={`hover:bg-white/[0.02] transition ${
                              isRejected ? 'bg-red-500/[0.03]' : ''
                            }`}
                          >
                            <td className="py-3.5 px-4 font-mono font-bold text-white">
                              {entry.entryNumber}
                              {entry.revisionCount > 0 && (
                                <span className="ml-1.5 text-[10px] text-purple-400 font-semibold">
                                  v{entry.revisionCount + 1}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-gray-400">
                              {new Date(entry.paymentDate).toLocaleDateString()}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-white max-w-[160px] truncate">
                              {vName}
                            </td>
                            <td className="py-3.5 px-4 text-gray-300 font-mono text-[11px]">
                              <span className="text-blue-400">{drCode}</span> /{' '}
                              <span className="text-emerald-400">{crCode}</span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-[#C8E600]">
                              ${Number(entry.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-3.5 px-4 text-gray-400">
                              {entry.supportingDocuments?.length || 0} file(s)
                            </td>
                            <td className="py-3.5 px-4">
                              {entry.status === 'APPROVED' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                                  <CheckCircle size={11} /> Approved
                                </span>
                              )}
                              {entry.status === 'REJECTED' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/25">
                                  <AlertTriangle size={11} /> Needs Revision
                                </span>
                              )}
                              {entry.status === 'PENDING_APPROVAL' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25">
                                  <Clock size={11} /> Pending
                                </span>
                              )}
                              {entry.status === 'DRAFT' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-500/10 text-gray-400 border border-gray-500/25">
                                  Draft
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {/* View Detail */}
                                <button
                                  onClick={() => {
                                    setSelectedEntry(entry);
                                    setShowDetailModal(true);
                                  }}
                                  className="p-1.5 rounded-lg border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 transition"
                                  title="View Details"
                                >
                                  <Eye size={14} />
                                </button>

                                {/* Revision Edit Button if rejected - only for makers who created the entry */}
                                {isRejected && canCreate && isEntryCreator && (
                                  <button
                                    onClick={() => {
                                      setEntryToEdit(entry);
                                      setShowCreateModal(true);
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-red-500 text-black font-bold hover:bg-red-400 text-[11px] flex items-center gap-1 transition shadow-md shadow-red-500/20"
                                    title="Revise & Re-submit"
                                  >
                                    <Edit size={12} />
                                    <span>Revise</span>
                                  </button>
                                )}

                                {/* Approver actions if in approvals tab */}
                                {activeTab === 'approvals' && isPending && canApprove && (
                                  <>
                                    <button
                                      onClick={() => handleQuickApprove(entry._id)}
                                      className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-black font-bold transition"
                                      title="Approve Entry"
                                    >
                                      <Check size={14} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setRejectPromptId(entry._id);
                                        setTableRejectRemark('');
                                      }}
                                      className="p-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-black font-bold transition"
                                      title="Reject Entry"
                                    >
                                      <X size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Quick inline rejection prompt in table */}
                          {rejectPromptId === entry._id && (
                            <tr className="bg-red-500/[0.08] border-b border-red-500/20 animate-fadeIn">
                              <td colSpan={8} className="p-4">
                                <div className="flex items-center gap-3">
                                  <AlertTriangle size={16} className="text-red-400 shrink-0" />
                                  <span className="text-xs font-bold text-red-400 shrink-0">
                                    Rejection Remark:
                                  </span>
                                  <input
                                    type="text"
                                    value={tableRejectRemark}
                                    onChange={(e) => setTableRejectRemark(e.target.value)}
                                    placeholder="Explain required changes for creator..."
                                    className="flex-1 px-3 py-1.5 rounded-lg border border-red-500/30 bg-black/50 text-white text-xs focus:border-red-400 focus:outline-none"
                                  />
                                  <button
                                    onClick={() => handleQuickRejectSubmit(entry._id)}
                                    disabled={rejecting || !tableRejectRemark.trim()}
                                    className="px-3 py-1.5 rounded-lg bg-red-500 text-black font-bold text-xs hover:bg-red-400 disabled:opacity-40"
                                  >
                                    {rejecting ? 'Rejecting...' : 'Confirm Reject'}
                                  </button>
                                  <button
                                    onClick={() => setRejectPromptId(null)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-white"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ───────────────────────────────────────────────────────────── */
        /* TAB CONTENT: ADMIN PROVISIONING (SUPER ADMIN ONLY)            */
        /* ───────────────────────────────────────────────────────────── */
        <div className="rounded-2xl border border-white/10 bg-[#16181D] overflow-hidden shadow-xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Shield size={18} className="text-[#C8E600]" />
                Financial Admins MPIN & Access Provisioning
              </h3>
              <p className="text-xs text-gray-400">
                Set MPINs and grant Entry (Maker) or Approval (Checker) capabilities to Financial Admins.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Financial Admin</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">MPIN Status</th>
                  <th className="py-3.5 px-4">Entry Access (Maker)</th>
                  <th className="py-3.5 px-4">Approval Access (Checker)</th>
                  <th className="py-3.5 px-4">Portal Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {financeAdmins.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      No Financial Admins found.
                    </td>
                  </tr>
                ) : (
                  financeAdmins.map((fa) => (
                    <tr key={fa._id} className="hover:bg-white/[0.02]">
                      <td className="py-3.5 px-4 font-bold text-white">{fa.fullName}</td>
                      <td className="py-3.5 px-4 text-gray-400">{fa.email}</td>
                      <td className="py-3.5 px-4">
                        {fa.isMpinSet ? (
                          <div className="flex items-center gap-2">
                            {fa.mpin ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-mono text-xs font-bold">
                                <KeyRound size={12} className="text-emerald-400" />
                                <span className="text-[10px] text-gray-400 font-sans uppercase font-bold">PIN:</span>
                                <span className="tracking-widest font-black text-white text-[13px]">
                                  {revealedPortalPins[fa._id] ? fa.mpin : '••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setRevealedPortalPins(prev => ({ ...prev, [fa._id]: !prev[fa._id] }));
                                  }}
                                  className="ml-1 text-emerald-400 hover:text-white p-0.5 rounded hover:bg-emerald-500/20"
                                  title={revealedPortalPins[fa._id] ? 'Hide PIN' : 'Show PIN'}
                                >
                                  {revealedPortalPins[fa._id] ? <EyeOff size={12} /> : <Eye size={12} />}
                                </button>
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-xs">
                                <CheckCircle size={13} /> Configured
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-400 font-semibold text-xs">
                            <AlertTriangle size={13} /> Not Set
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {fa.hasEntryAccess ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-bold text-[10px] border border-blue-500/25">
                            Allowed
                          </span>
                        ) : (
                          <span className="text-gray-500">None</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {fa.hasApprovalAccess ? (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 font-bold text-[10px] border border-purple-500/25">
                            Allowed
                          </span>
                        ) : (
                          <span className="text-gray-500">None</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {fa.portalStatus === 'ACTIVE' && (
                          <span className="text-emerald-400 font-semibold">Active</span>
                        )}
                        {fa.portalStatus === 'LOCKED' && (
                          <span className="text-red-400 font-semibold">Locked</span>
                        )}
                        {fa.portalStatus === 'NOT_CONFIGURED' && (
                          <span className="text-gray-500">Unconfigured</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedAdminForMpin(fa);
                            setShowAdminMpinModal(true);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-[#C8E600] text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition ml-auto"
                        >
                          <KeyRound size={13} className="text-[#C8E600]" />
                          <span>{fa.isMpinSet ? 'Manage MPIN' : 'Set MPIN'}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Entry Create / Revise Modal */}
      <PaymentEntryModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          loadTabData();
        }}
        initialEntry={entryToEdit}
        vendors={vendors}
        debitAccounts={debitAccounts}
        creditAccounts={creditAccounts}
        canCreate={!!canCreate}
      />

      {/* Entry Detail Drawer / Modal */}
      <PaymentEntryDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        entry={selectedEntry}
        canApprove={!!canApprove}
        isCreator={!!(canCreate && isUserEntryCreator(selectedEntry))}
        onSuccess={() => {
          loadTabData();
        }}
        onEditRevision={
          canCreate && isUserEntryCreator(selectedEntry)
            ? (entry) => {
                setEntryToEdit(entry);
                setShowCreateModal(true);
              }
            : undefined
        }
      />

      {/* Admin MPIN Modal */}
      <AdminMpinModal
        isOpen={showAdminMpinModal}
        onClose={() => setShowAdminMpinModal(false)}
        adminUser={selectedAdminForMpin}
        onSuccess={() => {
          loadTabData();
        }}
      />
    </div>
  );
};

export default PaymentsPortal;
