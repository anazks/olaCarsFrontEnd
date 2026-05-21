const fs = require('fs');
const file = 'c:\\Users\\anton\\OneDrive\\Documents\\vs coding\\olaCarsFrontEnd\\src\\pages\\dashboards\\shared\\DriverDetail.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove the huge stepper completely
code = code.replace(
    /\{currentStepIndex !== -1 && \!\['REJECTED', 'ACTIVE', 'SUSPENDED'\]\.includes\(driver\.status\) && \([\s\S]*?\}\)\}\s*<\/div>\s*<\/div>\s*\)\}/,
    ''
);

// 2. Reduce Global Class Names (paddings, radii, sizes)
// Note: We avoid replacing '-' prefixed classes using negative lookbehind
const replacements = [
    [/space-y-8/g, 'space-y-4'],
    [/space-y-6/g, 'space-y-4'],
    [/(?<!-)p-8/g, 'p-4'],
    [/(?<!-)p-6/g, 'p-4'],
    [/px-8 py-4/g, 'px-4 py-2 text-xs'],
    [/px-6 py-4/g, 'px-4 py-2 text-xs'],
    [/px-8 py-3/g, 'px-4 py-2 text-xs'],
    [/px-6 py-3/g, 'px-4 py-2 text-xs'],
    [/rounded-\[2rem\]/g, 'rounded-lg'],
    [/rounded-3xl/g, 'rounded-lg'],
    [/rounded-2xl/g, 'rounded-lg'],
    [/(?<!-)rounded-xl/g, 'rounded-lg'],
    [/(?<!-)gap-8/g, 'gap-4'],
    [/(?<!-)gap-6/g, 'gap-4'],
    [/(?<!-)text-xl/g, 'text-base'],
    [/(?<!-)text-2xl/g, 'text-lg'],
    [/w-64 h-64/g, 'hidden'], // remove large blur blobs
    [/w-48 h-48/g, 'hidden'],
    [/w-32 h-32/g, 'hidden'],
    [/font-black/g, 'font-semibold'],
    [/size=\{24\}/g, 'size={18}'],
    [/size=\{20\}/g, 'size={16}'],
];

for (const [regex, replacement] of replacements) {
    code = code.replace(regex, replacement);
}

// 3. Compact Action Center specifically
// Replace the huge "Current Stage: XXX" text
code = code.replace(
    /<div className="flex items-center gap-3">\s*<div className="p-3 rounded-lg bg-brand-lime\/10 text-brand-lime">\s*<Clock size=\{18\} \/>\s*<\/div>\s*<div>\s*<h2 className="text-base font-semibold uppercase tracking-tighter" style=\{\{ color: 'var\(--text-main\)' \}\}>\s*Current Stage: \{driver\.status\.replace\(\/_\/g, ' '\)\}\s*<\/h2>\s*<p className="text-xs font-medium opacity-60">Complete the tasks below to progress the application\.<\/p>\s*<\/div>\s*<\/div>/,
    `<div className="flex items-center gap-2">
                            <Clock size={16} className="text-brand-lime" />
                            <div>
                                <h2 className="text-sm font-semibold uppercase tracking-tighter" style={{ color: 'var(--text-main)' }}>
                                    Action Required
                                </h2>
                            </div>
                        </div>`
);

// 4. Compact the main header (Driver Name & Status)
code = code.replace(
    /className="text-base font-semibold" style=\{\{ color: 'var\(--text-main\)' \}\}>\{driver\.personalInfo\?\.fullName\}<\/h1>\s*<div className="flex flex-col">\s*<span className="px-3 py-1 text-xs font-semibold rounded-full border uppercase tracking-wider w-fit"/,
    `className="text-lg font-semibold" style={{ color: 'var(--text-main)' }}>{driver.personalInfo?.fullName}</h1>
                            <div className="flex flex-col">
                                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md border uppercase tracking-wider w-fit"`
);

fs.writeFileSync(file, code);
console.log('DriverDetail CSS compacted successfully.');
