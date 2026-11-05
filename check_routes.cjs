const fs = require('fs');
const content = fs.readFileSync('c:/Users/anton/OneDrive/Documents/vs coding/olaCarsFrontEnd/src/App.tsx', 'utf8');
const lines = content.split(/\r?\n/);

lines.forEach((l, idx) => {
    if (l.includes('<Route path="') && (l.includes('Layout') || l.includes('Dashboard') || l.includes('/admin') || l.includes('/finance') || l.includes('/merchandis') || l.includes('purchase-orders'))) {
        console.log(`${idx + 1}: ${l.trim()}`);
    }
});

