const fs = require('fs');
const content = fs.readFileSync('c:/Users/anton/OneDrive/Documents/vs coding/olaCarsFrontEnd/src/pages/dashboards/finance/BankAccountLedger.tsx', 'utf8');
const lines = content.split('\n');
let foundNormalTable = false;
let count = 0;
lines.forEach((line, i) => {
    if (line.includes('!isBulkEditing') || line.includes('className="min-w-full')) {
        foundNormalTable = true;
    }
    if (foundNormalTable && count < 250) {
        console.log(`${i + 1}: ${line}`);
        count++;
    }
});
