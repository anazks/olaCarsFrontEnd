import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface ApproveRejectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reason: string) => void;
    action: 'APPROVE' | 'REJECT';
    loading?: boolean;
    poId: string;
}

const ApproveRejectModal: React.FC<ApproveRejectModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    action,
    loading = false,
    poId
}) => {
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (isOpen) {
            setReason('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const isReject = action === 'REJECT';

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isReject ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                            {isReject ? <XCircle size={24} /> : <CheckCircle2 size={24} />}
                        </div>
                        <h3 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>
                            {isReject ? 'Confirm Rejection' : 'Confirm Approval'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                        style={{ color: 'var(--text-dim)' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="space-y-4">
                    <p style={{ color: 'var(--text-dim)' }}>
                        Are you sure you want to <strong>{action.toLowerCase()}</strong> purchase order <strong>{poId}</strong>?
                    </p>

                    <div className="space-y-2">
                        <label className="text-sm font-medium" style={{ color: 'var(--text-dim)' }}>
                            {isReject ? 'Reason for Rejection (Required)' : 'Notes (Optional)'}
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={isReject ? "Please explain why this PO is being rejected..." : "Add any notes regarding this approval..."}
                            className="w-full px-4 py-3 rounded-xl outline-none text-sm transition-all focus:ring-2 focus:ring-lime resize-none"
                            style={{
                                background: 'var(--bg-input)',
                                border: '1px solid var(--border-main)',
                                color: 'var(--text-main)',
                                height: '100px'
                            }}
                            required={isReject}
                        />
                    </div>

                    {isReject && !reason.trim() && (
                        <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 p-2 rounded-lg">
                            <AlertCircle size={14} />
                            Please provide a reason for rejection.
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-8">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl text-sm font-medium transition-all hover:bg-white/5"
                        style={{ border: '1px solid var(--border-main)', color: 'var(--text-dim)' }}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(reason)}
                        disabled={loading || (isReject && !reason.trim())}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center`}
                        style={{
                            background: isReject ? '#ef4444' : '#C8E600',
                            color: isReject ? 'white' : '#0A0A0A',
                            opacity: (loading || (isReject && !reason.trim())) ? 0.5 : 1
                        }}
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                            isReject ? 'Reject PO' : 'Approve PO'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApproveRejectModal;
