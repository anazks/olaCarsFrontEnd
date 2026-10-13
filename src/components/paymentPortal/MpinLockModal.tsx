import React, { useState, useEffect } from 'react';
import { Lock, AlertCircle, Loader2, ArrowRight, ShieldCheck, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { verifyMpin } from '../../services/paymentPortalService';

interface MpinLockModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onUnlocked: (data: any) => void;
    userName?: string;
}

export const MpinLockModal: React.FC<MpinLockModalProps> = ({
  isOpen,
  onClose,
  onUnlocked,
    userName = 'Financial Admin',
}) => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setError(null);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (pin.length < 4) {
      setError('MPIN must be at least 4 digits');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await verifyMpin(pin);
      toast.success('Payments Portal unlocked successfully');
      onUnlocked(res);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Incorrect MPIN';
      setError(msg);
      toast.error(msg);
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#16181D] shadow-2xl">
        {/* Glow accent */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-[#C8E600]/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition"
          >
            <X size={18} />
          </button>
        )}

        <div className="p-8 text-center">
          {/* Lock icon badge */}
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#C8E600]/10 border border-[#C8E600]/25 text-[#C8E600] shadow-lg shadow-[#C8E600]/5">
            <Lock size={30} className="animate-pulse" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-white mb-1">
            Payments Portal Verification
          </h2>
          <p className="text-sm text-gray-400 mb-6">
            Welcome, <span className="text-white font-medium">{userName}</span>. Enter your assigned MPIN to unlock payment operations.
          </p>

          {/* Masked circles display */}
          <div className="flex items-center justify-center gap-3 mb-6">
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const isFilled = idx < pin.length;
              return (
                <div
                  key={idx}
                  className={`h-4 w-4 rounded-full border transition-all duration-200 ${
                    isFilled
                      ? 'border-[#C8E600] bg-[#C8E600] shadow-md shadow-[#C8E600]/50 scale-110'
                      : 'border-white/20 bg-white/5'
                  }`}
                />
              );
            })}
          </div>

          {error && (
            <div className="mb-4 flex items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 animate-shake">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto mb-6">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                disabled={loading}
                className="h-12 rounded-xl border border-white/10 bg-white/5 text-lg font-semibold text-white hover:bg-white/10 active:scale-95 transition"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              disabled={loading}
              className="h-12 rounded-xl border border-white/10 bg-white/5 text-xs font-medium text-gray-400 hover:bg-white/10 active:scale-95 transition"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleDigit('0')}
              disabled={loading}
              className="h-12 rounded-xl border border-white/10 bg-white/5 text-lg font-semibold text-white hover:bg-white/10 active:scale-95 transition"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              disabled={loading}
              className="h-12 rounded-xl border border-white/10 bg-white/5 text-sm font-medium text-gray-400 hover:bg-white/10 active:scale-95 transition"
            >
              ⌫
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={pin.length < 4 || loading}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-[#C8E600] text-black hover:bg-[#d6f21d] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#C8E600]/20 flex items-center justify-center gap-2 transition"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Verifying MPIN...</span>
              </>
            ) : (
              <>
                <span>Unlock Portal</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
            <ShieldCheck size={14} className="text-[#C8E600]" />
            <span>Dual-control authorization & 256-bit encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MpinLockModal;
