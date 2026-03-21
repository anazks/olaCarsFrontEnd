import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShieldCheck, FileText, AlertTriangle, ArrowLeft, CheckCircle } from 'lucide-react';
import agreementService from '../../../services/agreementService';
import SignaturePad from '../../../components/agreements/SignaturePad';
import toast from 'react-hot-toast';

const AgreementSignPage = () => {
    const { id } = useParams<{ id: string }>(); // agreementId
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [agreement, setAgreement] = useState<{ renderedContent: string; title: string; version: number } | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [step, setStep] = useState<'REVIEW' | 'SIGN' | 'SUCCESS'>('REVIEW');

    useEffect(() => {
        const fetchRendered = async () => {
            if (!id) return;
            try {
                const data = await agreementService.getRenderedAgreement(id);
                setAgreement(data);
            } catch (err: any) {
                toast.error('Failed to load personalized agreement');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchRendered();
    }, [id]);

    const handleSignatureSubmit = async (sigData: { type: string; data?: string | Blob }) => {
        if (!id || !agreement) return;

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('agreementId', id);
            formData.append('versionId', String(agreement.version));
            formData.append('signatureType', sigData.type);

            if (sigData.type === 'DRAWN' && typeof sigData.data === 'string') {
                // Convert dataURL to Blob
                const res = await fetch(sigData.data);
                const blob = await res.blob();
                formData.append('signatureImage', blob, 'signature.png');
            } else if (sigData.type === 'TYPED' && typeof sigData.data === 'string') {
                formData.append('signatureData', sigData.data);
            }

            await agreementService.acceptAgreement(formData);
            setStep('SUCCESS');
            toast.success('Agreement signed successfully');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to submit signature');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
                <div className="w-12 h-12 border-4 border-lime border-t-transparent rounded-full animate-spin" />
                <p className="text-dim animate-pulse">Preparing your personalized contract...</p>
            </div>
        );
    }

    if (!agreement) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
                <AlertTriangle size={48} className="text-red-500 mb-4" />
                <h1 className="text-2xl font-black mb-2">Agreement Not Found</h1>
                <p className="text-dim mb-6">We couldn't retrieve the contract details. Please contact support.</p>
                <button 
                    onClick={() => navigate(-1)}
                    className="px-6 py-3 bg-white/5 border rounded-xl font-bold"
                >
                    Go Back
                </button>
            </div>
        );
    }

    if (step === 'SUCCESS') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 bg-brand-lime/20 text-brand-lime rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-brand-lime/10">
                    <CheckCircle size={64} />
                </div>
                <h1 className="text-4xl font-black mb-4">Contract Signed!</h1>
                <p className="text-dim max-w-md mx-auto mb-10 text-lg leading-relaxed">
                    Thank you. Your lease agreement has been electronically signed and recorded. 
                    You can now proceed with your vehicle activation.
                </p>
                <button 
                    onClick={() => navigate('/')}
                    className="px-12 py-4 bg-brand-lime text-brand-black rounded-2xl font-black shadow-xl shadow-brand-lime/20 transition-all hover:scale-105 active:scale-95"
                >
                    Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white selection:bg-lime selection:text-black">
            {/* Sticky Header */}
            <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => step === 'SIGN' ? setStep('REVIEW') : navigate(-1)}
                            className="p-2 hover:bg-white/5 rounded-xl transition-all"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h2 className="font-black text-lg leading-none">{agreement.title}</h2>
                            <p className="text-[10px] text-dim uppercase tracking-widest mt-1">Version {agreement.version} • Legal Document</p>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-brand-lime/10 border border-brand-lime/20 text-brand-lime text-[10px] font-black uppercase tracking-widest">
                        <ShieldCheck size={14} /> Encrypted Session
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto p-6 pb-32">
                {step === 'REVIEW' ? (
                    <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
                        {/* Notice */}
                        <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/20 flex gap-4">
                            <FileText className="text-blue-400 shrink-0" size={24} />
                            <div>
                                <h3 className="font-bold text-blue-100">Please Review Carefully</h3>
                                <p className="text-sm text-blue-100/60 leading-relaxed mt-1">
                                    Below is your personalized rental agreement. This document includes your specific vehicle details, 
                                    lease duration, and monthly rent. Please read all sections before signing.
                                </p>
                            </div>
                        </div>

                        {/* Agreement Content */}
                        <div className="rounded-3xl border border-white/10 bg-[#0a0a0a] overflow-hidden shadow-2xl">
                            <div className="p-8 md:p-12 prose prose-invert max-w-none prose-headings:font-black prose-p:text-dim prose-strong:text-white">
                                <div dangerouslySetInnerHTML={{ __html: agreement.renderedContent }} />
                            </div>
                        </div>

                        {/* Bottom Action */}
                        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-40">
                            <div className="max-w-5xl mx-auto">
                                <button 
                                    onClick={() => setStep('SIGN')}
                                    className="w-full py-5 rounded-2xl font-black bg-brand-lime text-black shadow-2xl shadow-brand-lime/20 hover:scale-[1.02] active:scale-95 transition-all text-xl uppercase tracking-widest"
                                >
                                    Proceed to Signature
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-12 py-12 animate-in slide-in-from-bottom-5 duration-500">
                        <div className="text-center space-y-4">
                            <h1 className="text-5xl font-black tracking-tighter">Sign Document</h1>
                            <p className="text-dim text-lg">Choose your preferred method to sign this legally binding agreement.</p>
                        </div>
                        
                        <div className="relative">
                            <SignaturePad 
                                driverName="John Doe" // This should ideally come from auth context
                                onSave={handleSignatureSubmit} 
                            />
                            {submitting && (
                                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-3xl flex items-center justify-center z-50">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-12 h-12 border-4 border-lime border-t-transparent rounded-full animate-spin" />
                                        <p className="font-bold tracking-widest uppercase text-lime">Submitting Signature...</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default AgreementSignPage;
