import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Type, Pencil, CheckSquare, Trash2, ShieldCheck } from 'lucide-react';

interface SignaturePadProps {
    onSave: (data: { type: 'CLICK_WRAP' | 'TYPED' | 'DRAWN'; data?: string | Blob }) => void;
    driverName: string;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, driverName }) => {
    const [mode, setMode] = useState<'CLICK_WRAP' | 'TYPED' | 'DRAWN'>('CLICK_WRAP');
    const [typedName, setTypedName] = useState('');
    const [isAccepted, setIsAccepted] = useState(false);
    const sigCanvas = useRef<SignatureCanvas>(null);

    const handleSave = () => {
        if (mode === 'CLICK_WRAP' && isAccepted) {
            onSave({ type: 'CLICK_WRAP' });
        } else if (mode === 'TYPED' && typedName.trim()) {
            onSave({ type: 'TYPED', data: typedName.trim() });
        } else if (mode === 'DRAWN' && sigCanvas.current) {
            if (sigCanvas.current.isEmpty()) return;
            // Get base64 for preview or convert to blob for upload
            const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
            // We'll convert dataUrl to Blob in the parent if needed, 
            // or we can do it here and pass the blob.
            // Let's pass the dataUrl for now, parent will handle multipart.
            onSave({ type: 'DRAWN', data: dataUrl });
        }
    };

    const clearCanvas = () => {
        if (sigCanvas.current) {
            sigCanvas.current.clear();
        }
    };

    return (
        <div className="space-y-6 w-full max-w-2xl mx-auto">
            {/* Mode Selector */}
            <div className="flex p-1 rounded-2xl bg-white/5 border border-white/10">
                {[
                    { id: 'CLICK_WRAP', label: 'Checkbox', icon: CheckSquare },
                    { id: 'TYPED', label: 'Typed', icon: Type },
                    { id: 'DRAWN', label: 'Drawn', icon: Pencil },
                ].map((m) => (
                    <button
                        key={m.id}
                        onClick={() => setMode(m.id as any)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all text-sm ${
                            mode === m.id 
                                ? 'bg-brand-lime text-black shadow-lg shadow-brand-lime/10' 
                                : 'text-dim hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <m.icon size={18} />
                        {m.label}
                    </button>
                ))}
            </div>

            {/* Input Area */}
            <div className="rounded-3xl border-2 border-dashed p-8 min-h-[250px] flex flex-col justify-center items-center relative overflow-hidden transition-all bg-white/5" style={{ borderColor: 'var(--border-main)' }}>
                {mode === 'CLICK_WRAP' && (
                    <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-300">
                        <div className={`p-4 rounded-full transition-all ${isAccepted ? 'bg-brand-lime/20 text-brand-lime' : 'bg-white/10 text-dim'}`}>
                            <ShieldCheck size={48} />
                        </div>
                        <label className="flex items-center gap-4 cursor-pointer group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={isAccepted}
                                    onChange={(e) => setIsAccepted(e.target.checked)}
                                    className="peer sr-only"
                                />
                                <div className="w-6 h-6 border-2 rounded-lg transition-all peer-checked:bg-brand-lime peer-checked:border-brand-lime group-hover:border-brand-lime/50" style={{ borderColor: 'var(--border-main)' }}></div>
                                <div className="absolute inset-0 flex items-center justify-center text-black opacity-0 peer-checked:opacity-100 transition-opacity">
                                    <CheckSquare size={14} />
                                </div>
                            </div>
                            <span className="font-bold text-lg select-none" style={{ color: 'var(--text-main)' }}>
                                I agree to the terms and conditions
                            </span>
                        </label>
                    </div>
                )}

                {mode === 'TYPED' && (
                    <div className="w-full space-y-4 animate-in fade-in zoom-in duration-300">
                        <p className="text-center text-xs font-bold uppercase tracking-widest text-dim">Type your full name as signature</p>
                        <input
                            type="text"
                            placeholder={`e.g. ${driverName}`}
                            value={typedName}
                            onChange={(e) => setTypedName(e.target.value)}
                            className="w-full bg-transparent border-b-2 py-4 text-center text-4xl font-serif outline-none focus:border-brand-lime transition-all italic"
                            style={{ borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
                        />
                        <p className="text-center text-[10px] text-dim italic opacity-50">
                            By typing your name, you understand this constitutes a legally binding electronic signature.
                        </p>
                    </div>
                )}

                {mode === 'DRAWN' && (
                    <div className="w-full flex-1 flex flex-col animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-xs font-bold uppercase tracking-widest text-dim">Draw your signature below</p>
                            <button 
                                onClick={clearCanvas}
                                className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-all"
                                title="Clear Signature"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                        <div className="flex-1 bg-white/[0.02] rounded-2xl border" style={{ borderColor: 'var(--border-main)' }}>
                            <SignatureCanvas
                                ref={sigCanvas}
                                penColor="white"
                                canvasProps={{
                                    className: 'signature-canvas w-full h-[180px]',
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                disabled={
                    (mode === 'CLICK_WRAP' && !isAccepted) ||
                    (mode === 'TYPED' && !typedName.trim())
                }
                className="w-full py-4 rounded-2xl font-black bg-brand-lime text-brand-black shadow-xl shadow-brand-lime/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed uppercase tracking-widest"
            >
                Confirm Signature
            </button>
        </div>
    );
};

export default SignaturePad;
