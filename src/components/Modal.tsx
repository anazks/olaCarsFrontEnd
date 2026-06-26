import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
    if (!isOpen) return null;

    const sizeClasses = {
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div 
                className={`border rounded-2xl shadow-2xl w-full ${sizeClasses[size]} overflow-hidden flex flex-col max-h-[90vh] transition-all duration-300`}
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}
            >
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-main)' }}>
                    <h2 className="text-xl font-bold tracking-wide" style={{ color: 'var(--text-main)' }}>{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:opacity-85 hover:bg-white/[0.05] dark:hover:bg-white/10 transition-colors cursor-pointer"
                        style={{ color: 'var(--text-muted)' }}
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto" style={{ color: 'var(--text-main)' }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
