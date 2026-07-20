const fs = require('fs');
const content = fs.readFileSync('c:/Users/anton/OneDrive/Documents/vs coding/olaCarsFrontEnd/src/pages/dashboards/finance/BankAccountLedger.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
    if (line.toLowerCase().includes('invoice') || line.toLowerCase().includes('inv-')) {
        if (line.length < 150) {
            console.log(`${i + 1}: ${line.trim()}`);
        }
    }
});
