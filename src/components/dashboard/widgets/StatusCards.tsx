export const StatCard = ({
    title,
    superTitle,
    value,
    subValue,
    icon,
    color = '#148F85'
}: {
    title: string;
    superTitle?: string;
    value: string | number;
    subValue?: string;
    icon?: React.ReactNode;
    color?: string;
}) => {
    return (
        <div
            className="p-6 rounded-3xl border transition-all duration-300 hover:shadow-2xl group relative overflow-hidden"
            style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border-main)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.05)'
            }}
        >
            {/* Background Accent */}
            <div 
                className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-[0.03] transition-transform duration-500 group-hover:scale-150"
                style={{ background: color }}
            />

            <div className="flex justify-between items-start mb-6">
                <div className="z-10">
                    {superTitle && (
                        <h4 className="font-black text-[10px] uppercase tracking-[0.2em] mb-1" style={{ color: 'var(--text-dim)' }}>
                            {superTitle}
                        </h4>
                    )}
                </div>
                {icon && (
                    <div
                        className="p-2.5 flex items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-110"
                        style={{ background: color, color: color.includes('rgba(200, 230, 0') ? 'var(--brand-black)' : '#fff' }}
                    >
                        {icon}
                    </div>
                )}
            </div>

            <div className="relative z-10">
                <h2 className="text-4xl font-bold tracking-tight mb-1" style={{ color: 'var(--text-main)' }}>
                    {value}
                </h2>
                <div className="flex items-center gap-2">
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
                        {title}
                    </p>
                    {subValue && (
                        <span className="text-[10px] font-black bg-[var(--bg-input)] px-2 py-0.5 rounded-full" style={{ color: 'var(--text-main)' }}>
                            {subValue}
                        </span>
                    )}
                </div>
            </div>
            
            {/* Bottom Accent Line */}
            <div 
                className="absolute bottom-0 left-0 h-1 transition-all duration-300 group-hover:w-full w-0"
                style={{ background: color }}
            />
        </div>
    );
};

export const AlertCard = ({
    title,
    count,
    desc,
    color = '#E74C3C'
}: {
    title: string;
    count: number;
    desc: string;
    color?: string;
}) => {
    return (
        <div
            className="p-6 rounded-3xl flex flex-col justify-center gap-3 transition-all hover:translate-y-[-4px]"
            style={{
                background: `linear-gradient(135deg, ${color} 0%, ${color}CC 100%)`,
                boxShadow: `0 12px 32px ${color}30`,
                color: '#fff'
            }}
        >
            <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center font-black text-xl">
                    !
                </div>
                <h2 className="text-4xl font-bold leading-none">{count}</h2>
            </div>
            <div>
                <p className="font-black text-xs uppercase tracking-widest opacity-90">{title}</p>
                {desc && <p className="text-sm font-medium mt-1 opacity-80">{desc}</p>}
            </div>
        </div>
    );
};
