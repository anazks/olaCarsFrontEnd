import React, { useState, useEffect } from 'react';
import { KeyRound, Shield, X, AlertCircle, Loader2, Unlock } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  setOrUpdateMpin,
  unlockFinanceAdmin,
  type FinanceAdminAccessItem,
} from '../../services/paymentPortalService';

interface AdminMpinModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminUser: FinanceAdminAccessItem | null;
  onSuccess: () => void;
}

export const AdminMpinModal: React.FC<AdminMpinModalProps> = ({
  isOpen,
  onClose,
  adminUser,
  onSuccess,
}) => {
  const [mpin, setMpin] = useState('');
  const [confirmMpin, setConfirmMpin] = useState('');
  const [hasEntryAccess, setHasEntryAccess] = useState(true);
  const [hasApprovalAccess, setHasApprovalAccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (adminUser) {
      setMpin(adminUser.mpin || '');
      setConfirmMpin(adminUser.mpin || '');
      setHasEntryAccess(adminUser.hasEntryAccess ?? true);
      setHasApprovalAccess(adminUser.hasApprovalAccess ?? false);
      setError(null);
    }
  }, [adminUser, isOpen]);

  if (!isOpen || !adminUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^\d{4,6}$/.test(mpin)) {
      setError('MPIN must be 4 to 6 numeric digits');
      return;
    }

    if (mpin !== confirmMpin) {
      setError('MPIN confirmation does not match');
      return;
    }

    try {
      setLoading(true);
      await setOrUpdateMpin({
        financeAdminId: adminUser._id,
        mpin,
        hasEntryAccess,
        hasApprovalAccess,
      });

      toast.success(`MPIN and access provisioned for ${adminUser.fullName}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to set MPIN';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async () => {
    try {
      setUnlocking(true);
      await unlockFinanceAdmin(adminUser._id);
      toast.success(`Unlocked portal access for ${adminUser.fullName}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to unlock');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#16181D] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C8E600]/10 border border-[#C8E600]/25 text-[#C8E600]">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {adminUser.isMpinSet ? 'Reset User MPIN & Provision Access' : 'Set User MPIN & Provision Access'}
              </h3>
              <p className="text-xs text-gray-400">
                {adminUser.fullName} ({adminUser.email})
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {adminUser.portalStatus === 'LOCKED' && (
            <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/25 p-4 text-xs text-amber-300">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>Account is currently locked due to 5 failed MPIN attempts.</span>
              </div>
              <button
                type="button"
                onClick={handleUnlock}
                disabled={unlocking}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400 text-xs flex items-center gap-1 transition"
              >
                {unlocking ? <Loader2 size={13} className="animate-spin" /> : <Unlock size={13} />}
                <span>Unlock Now</span>
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/25 p-3 text-xs text-red-400">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                New MPIN (4-6 digits)
              </label>
              <input
                type="password"
                maxLength={6}
                value={mpin}
                onChange={(e) => setMpin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:border-[#C8E600] focus:outline-none text-center text-lg tracking-widest font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Confirm MPIN
              </label>
              <input
                type="password"
                maxLength={6}
                value={confirmMpin}
                onChange={(e) => setConfirmMpin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-gray-500 focus:border-[#C8E600] focus:outline-none text-center text-lg tracking-widest font-mono"
                required
              />
            </div>
          </div>

          {/* Provisioning access controls */}
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Shield size={14} className="text-[#C8E600]" />
              Provision Payments Portal Capabilities
            </h4>

            <label className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/5 cursor-pointer transition">
              <input
                type="checkbox"
                checked={hasEntryAccess}
                onChange={(e) => setHasEntryAccess(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-600 text-[#C8E600] focus:ring-[#C8E600]"
              />
              <div>
                <span className="text-sm font-semibold text-white block">
                  Entry Access (Maker)
                </span>
                <span className="text-xs text-gray-400">
                  Allows this Financial Admin to create payments, attach documents, and revise returned entries.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white/5 cursor-pointer transition">
              <input
                type="checkbox"
                checked={hasApprovalAccess}
                onChange={(e) => setHasApprovalAccess(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-600 text-[#C8E600] focus:ring-[#C8E600]"
              />
              <div>
                <span className="text-sm font-semibold text-white block">
                  Approval Access (Checker)
                </span>
                <span className="text-xs text-gray-400">
                  Allows this Financial Admin to view the approval queue and accept or reject submissions with remarks.
                </span>
              </div>
            </label>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-xs font-semibold text-gray-300 hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || mpin.length < 4}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#C8E600] text-black hover:bg-[#d6f21d] disabled:opacity-40 flex items-center gap-2 transition"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              <span>Save MPIN & Permissions</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminMpinModal;
