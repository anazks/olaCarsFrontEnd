const fs = require('fs');
const content = fs.readFileSync('c:/Users/anton/OneDrive/Documents/vs coding/olaCarsFrontEnd/src/pages/dashboards/finance/BankAccountLedger.tsx', 'utf8');
const lines = content.split('\n');
let insideTable = false;
let count = 0;
lines.forEach((line, i) => {
    if (line.includes('<table') || line.includes('thead') || line.includes('tbody')) {
        insideTable = true;
    }
    if (insideTable && count < 250) {
        console.log(`${i + 1}: ${line}`);
        count++;
    }
});
