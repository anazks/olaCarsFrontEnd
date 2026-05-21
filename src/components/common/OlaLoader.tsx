import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface OlaLoaderProps {
    fullScreen?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const OlaLoader: React.FC<OlaLoaderProps> = ({ fullScreen = false, size = 'md', className = '' }) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const sizeClasses = {
        sm: {
            container: 'w-10 h-10',
            glow: 'blur-md',
            outer: 'w-8 h-8 border-[1.5px]',
            inner: 'w-5 h-5',
            dot: 'w-1.5 h-1.5',
            orbit: 'border-[1.5px]'
        },
        md: {
            container: 'w-20 h-20',
            glow: 'blur-xl',
            outer: 'w-16 h-16 border-2',
            inner: 'w-10 h-10',
            dot: 'w-3 h-3',
            orbit: 'border-2'
        },
        lg: {
            container: 'w-32 h-32',
            glow: 'blur-2xl',
            outer: 'w-24 h-24 border-[3px]',
            inner: 'w-14 h-14',
            dot: 'w-4 h-4',
            orbit: 'border-[3px]'
        }
    };

    const currentSize = sizeClasses[size];

    const content = (
        <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
            <div className={`relative flex items-center justify-center ${currentSize.container}`}>
                {/* Glow behind the logo */}
                <div className={`absolute inset-0 bg-[#C8E600]/25 rounded-full animate-pulse ${currentSize.glow}`} />

                {/* Animated Outer dashed spinning ring */}
                <div className={`absolute inset-0 rounded-full border-dashed border-[#C8E600] animate-[spin_3s_linear_infinite] ${currentSize.orbit}`} />

                {/* Secondary inner dotted ring rotating in opposite direction */}
                <div 
                    className="absolute inset-1.5 rounded-full border border-dotted animate-[spin_6s_linear_infinite_reverse]" 
                    style={{ borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(10, 10, 10, 0.2)' }}
                />

                {/* The Ola Logo (Pulsing size slightly) */}
                <div className={`relative bg-white rounded-full flex items-center justify-center border-[#C8E600] shadow-[0_0_15px_rgba(200,230,0,0.2)] overflow-hidden flex-shrink-0 animate-[pulse_2s_ease-in-out_infinite] ${currentSize.outer}`}>
                    {/* Inner Black Circle */}
                    <div className={`bg-black rounded-full flex items-center justify-center ${currentSize.inner}`}>
                        {/* Innermost Lime Dot with subtle inner glow */}
                        <div className={`bg-[#C8E600] rounded-full shadow-[0_0_8px_#C8E600] ${currentSize.dot}`} />
                    </div>
                </div>
            </div>
            {fullScreen && (
                <div className="flex flex-col items-center gap-1.5 text-center">
                    <span 
                        className="text-sm font-black tracking-[0.25em] uppercase animate-pulse"
                        style={{ color: isDark ? '#FFFFFF' : '#0A0A0A' }}
                    >
                        OLA CARS
                    </span>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#C8E600]">
                            Loading telemetry...
                        </span>
                    </div>
                </div>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div 
                className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm transition-all duration-300"
                style={{ backgroundColor: isDark ? 'rgba(12, 12, 12, 0.95)' : 'rgba(255, 255, 255, 0.95)' }}
            >
                {content}
            </div>
        );
    }

    return content;
};

export default OlaLoader;
