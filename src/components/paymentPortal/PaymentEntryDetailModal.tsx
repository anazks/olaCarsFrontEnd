import React, { useState } from 'react';
import {
  FileText,
  DollarSign,
  Building,
  CreditCard,
  BookOpen,
  X,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Paperclip,
  ExternalLink,
  Loader2,
  Edit,
  History,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  approvePaymentEntry,
  rejectPaymentEntry,
  type PaymentPortalEntry,
} from '../../services/paymentPortalService';

interface PaymentEntryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: PaymentPortalEntry | null;
  canApprove: boolean;
  isCreator: boolean;
  onSuccess: () => void;
  onEditRevision?: (entry: PaymentPortalEntry) => void;
}

export const PaymentEntryDetailModal: React.FC<PaymentEntryDetailModalProps> = ({
  isOpen,
  onClose,
  entry,
  canApprove,
  isCreator,
  onSuccess,
  onEditRevision,
}) => {
  const [rejectRemark, setRejectRemark] = useState('');
  const [showRejectPrompt, setShowRejectPrompt] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [showApprovePrompt, setShowApprovePrompt] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !entry) return null;

  const handleApprove = async () => {
    try {
      setLoading(true);
      await approvePaymentEntry(entry._id, approvalNotes);
      toast.success('Payment entry approved successfully');
      setShowApprovePrompt(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectRemark.trim()) {
      toast.error('Rejection remark is mandatory');
      return;
    }

    try {
      setLoading(true);
      await rejectPaymentEntry(entry._id, rejectRemark);
      toast.success('Payment entry rejected and returned to creator');
      setShowRejectPrompt(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <CheckCircle size={13} />
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/25">
            <XCircle size={13} />
            Needs Revision
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-500/10 text-gray-400 border border-gray-500/25">
            <Clock size={13} />
            Draft
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25">
            <Clock size={13} />
            Pending Approval
          </span>
        );
    }
  };

  const vendorName =
    typeof entry.vendor === 'object'
      ? entry.vendor.name || entry.vendor.companyName
      : entry.vendorName || 'Vendor';

  const debitAccName =
    typeof entry.debitAccount === 'object'
      ? `${entry.debitAccount.code} - ${entry.debitAccount.name}`
      : 'Debit Account';

  const creditAccName =
    typeof entry.creditAccount === 'object'
      ? `${entry.creditAccount.code} - ${entry.creditAccount.name}`
      : 'Credit Account';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#16181D] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#16181D]/95 backdrop-blur-md p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#C8E600]/10 border border-[#C8E600]/25 text-[#C8E600]">
              <FileText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-bold text-white tracking-tight">{entry.entryNumber}</h3>
                {getStatusBadge(entry.status)}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Created on {new Date(entry.createdAt).toLocaleDateString()} by{' '}
                <span className="text-gray-200 font-medium">{entry.creatorName || 'Financial Admin'}</span>
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

        <div className="p-6 space-y-6">
          {/* Rejection Alert Banner */}
          {entry.status === 'REJECTED' && entry.rejectionRemark && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-1">
                      Approver Rejection Remarks
                    </h4>
                    <p className="text-sm text-red-100 font-medium whitespace-pre-wrap">
                      "{entry.rejectionRemark}"
                    </p>
                    <p className="text-[11px] text-red-400/80 mt-1.5">
                      Rejected by {entry.reviewerName || 'Approver'}{' '}
                      {entry.reviewedAt && `on ${new Date(entry.reviewedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>

                {isCreator && onEditRevision && (
                  <button
                    onClick={() => {
                      onClose();
                      onEditRevision(entry);
                    }}
                    className="shrink-0 px-4 py-2 rounded-xl bg-red-500 hover:bg-red-400 text-black font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-red-500/20"
                  >
                    <Edit size={14} />
                    <span>Edit & Re-submit</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Primary Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Amount & Vendor */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <DollarSign size={14} className="text-[#C8E600]" />
                Payment Financials
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Total Amount</span>
                <span className="text-2xl font-black text-[#C8E600]">
                  ${Number(entry.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-gray-400 ml-1.5">{entry.currency || 'USD'}</span>
              </div>
              <div className="pt-2 border-t border-white/5">
                <span className="text-xs text-gray-400 block">Payment Date</span>
                <span className="text-sm text-white font-medium">
                  {new Date(entry.paymentDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Vendor & Ref */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <Building size={14} className="text-[#C8E600]" />
                Vendor Information
              </div>
              <div>
                <span className="text-xs text-gray-400 block">Vendor</span>
                <span className="text-base font-bold text-white block">{vendorName}</span>
              </div>
              <div className="pt-2 border-t border-white/5">
                <span className="text-xs text-gray-400 block">Reference / Bill #</span>
                <span className="text-sm text-white font-mono font-medium">
                  {entry.referenceNumber || 'N/A'}
                </span>
              </div>
            </div>

            {/* Debit Account */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <BookOpen size={14} className="text-blue-400" />
                Debit Account (Expense / Asset / AP)
              </div>
              <p className="text-sm font-semibold text-white">{debitAccName}</p>
            </div>

            {/* Credit Account */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                <CreditCard size={14} className="text-emerald-400" />
                Credit Account (Bank / Cash)
              </div>
              <p className="text-sm font-semibold text-white">{creditAccName}</p>
            </div>
          </div>

          {/* Description */}
          {entry.description && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                Description / Purpose
              </span>
              <p className="text-sm text-gray-200 whitespace-pre-wrap">{entry.description}</p>
            </div>
          )}

          {/* Attached Supporting Documents */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Paperclip size={14} className="text-[#C8E600]" />
              Attached Documents ({entry.supportingDocuments?.length || 0})
            </span>

            {(!entry.supportingDocuments || entry.supportingDocuments.length === 0) ? (
              <p className="text-xs text-gray-500 italic">No supporting documents attached.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {entry.supportingDocuments.map((doc, idx) => (
                  <a
                    key={doc._id || idx}
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition group"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText size={16} className="text-[#C8E600] shrink-0" />
                      <span className="text-xs text-white font-medium truncate">{doc.name}</span>
                    </div>
                    <ExternalLink size={14} className="text-gray-400 group-hover:text-white shrink-0 ml-2" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Status & Review History Timeline */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <History size={14} className="text-purple-400" />
              Audit Trail & Status History
            </span>

            <div className="space-y-3 relative before:absolute before:inset-0 before:left-2.5 before:w-0.5 before:bg-white/10">
              {entry.statusHistory?.map((hist, idx) => (
                <div key={hist._id || idx} className="relative flex items-start gap-4 pl-7">
                  <div className="absolute left-1.5 top-1.5 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-[#C8E600] border-2 border-[#16181D]" />
                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{hist.status}</span>
                      <span className="text-[11px] text-gray-500">
                        {new Date(hist.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-400 mt-0.5">
                      By <span className="text-gray-300 font-medium">{hist.actionByName}</span>
                    </p>
                    {hist.remarks && (
                      <p className="text-gray-300 mt-1 p-2 rounded-lg bg-white/5 border border-white/5 whitespace-pre-wrap font-mono text-[11px]">
                        "{hist.remarks}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rejection Input Section */}
          {showRejectPrompt && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 space-y-3 animate-fadeIn">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                <AlertTriangle size={15} />
                Mandatory Rejection Remark
              </h4>
              <p className="text-xs text-red-200">
                Please provide specific instructions detailing what changes or documents are required. The creator will be notified and will be able to revise and re-submit this entry.
              </p>
              <textarea
                rows={3}
                value={rejectRemark}
                onChange={(e) => setRejectRemark(e.target.value)}
                placeholder="e.g. Document amount does not match invoice #39281. Please re-attach the signed invoice and update debit account to Workshop Repairs."
                className="w-full p-3 rounded-xl border border-red-500/30 bg-black/40 text-white placeholder-red-300/40 focus:border-red-400 focus:outline-none text-xs resize-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRejectPrompt(false)}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-gray-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={loading || !rejectRemark.trim()}
                  className="px-4 py-1.5 rounded-lg bg-red-500 text-black font-bold text-xs hover:bg-red-400 disabled:opacity-40 flex items-center gap-1.5"
                >
                  {loading && <Loader2 size={13} className="animate-spin" />}
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </div>
          )}

          {/* Approval Notes Input Section */}
          {showApprovePrompt && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3 animate-fadeIn">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle size={15} />
                Confirm Payment Approval
              </h4>
              <input
                type="text"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Optional approval note or authorization memo..."
                className="w-full p-2.5 rounded-xl border border-emerald-500/30 bg-black/40 text-white placeholder-emerald-300/40 focus:border-emerald-400 focus:outline-none text-xs"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowApprovePrompt(false)}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg border border-white/10 text-xs text-gray-300 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 text-black font-bold text-xs hover:bg-emerald-400 disabled:opacity-40 flex items-center gap-1.5"
                >
                  {loading && <Loader2 size={13} className="animate-spin" />}
                  <span>Confirm Approval</span>
                </button>
              </div>
            </div>
          )}

          {/* Action Bar for Approvers */}
          {canApprove && entry.status === 'PENDING_APPROVAL' && !showRejectPrompt && !showApprovePrompt && (
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowRejectPrompt(true)}
                className="px-5 py-2.5 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <XCircle size={15} />
                <span>Reject & Request Changes</span>
              </button>
              <button
                type="button"
                onClick={() => setShowApprovePrompt(true)}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition"
              >
                <CheckCircle size={15} />
                <span>Accept & Approve</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentEntryDetailModal;
