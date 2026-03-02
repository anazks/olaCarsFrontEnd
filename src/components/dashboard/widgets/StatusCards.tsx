export const StatCard = ({
    title,
    superTitle,
    value,
    subValue,
    icon,
    color = '#177A82' // Default Teal
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
            className="p-5 rounded-2xl border transition-colors duration-300"
            style={{
                background: 'var(--bg-card)',
                borderColor: 'var(--border-main)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
            }}
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    {superTitle && <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--text-main)' }}>{superTitle}</h4>}
                </div>
                {icon && (
                    <div
                        className="px-2 py-1 flex items-center gap-1 rounded text-xs font-bold w-fit"
                        style={{ background: 'rgba(128,128,128,0.1)', color: 'var(--text-main)' }}
                    >
                        {icon}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4 rounded-xl p-4" style={{ background: color }}>
                <div className="flex-1">
                    <h2 className="text-3xl font-bold text-white mb-1">{value}</h2>
                    <p className="text-xs text-white/80 font-medium">{title}</p>
                </div>
                {subValue && (
                    <div className="text-right">
                        <span className="text-sm font-bold text-white bg-black/20 px-2 py-1 rounded">
                            {subValue}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export const AlertCard = ({
    title,
    count,
    desc,
    color = '#E74C3C' // Red
}: {
    title: string;
    count: number;
    desc: string;
    color?: string;
}) => {
    return (
        <div
            className="p-5 rounded-2xl flex flex-col justify-center gap-2"
            style={{
                background: color,
                boxShadow: `0 8px 24px ${color}40`,
                color: '#fff'
            }}
        >
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center font-bold">
                    !
                </div>
                <h2 className="text-3xl font-bold leading-none">{count}</h2>
            </div>
            <p className="font-semibold text-sm mt-1">{title}</p>
            {desc && <p className="text-xs text-white/80">{desc}</p>}
        </div>
    );
};
