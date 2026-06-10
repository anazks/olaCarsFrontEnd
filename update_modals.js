const fs = require('fs');
const path = require('path');
const dir = 'c:\\\\Users\\\\anton\\\\OneDrive\\\\Documents\\\\vs coding\\\\olaCarsFrontEnd\\\\src\\\\pages\\\\dashboards';

function walk(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            walk(filePath, fileList);
        } else if (filePath.endsWith('.tsx')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const files = walk(dir);
let updatedCount = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('PermissionSelector') && content.includes('activeTab === \\'permissions\\'')) {
        let originalContent = content;
        
        // This regex ensures we only modify standard modal strings, and not template literals or already modified ones
        content = content.replace(/className=\"([^\"]*)max-w-(lg|xl|2xl|md)([^\"]*)\"/g, (match, p1, p2, p3) => {
            if (p1.includes('w-full') || p3.includes('w-full')) {
                return "className={`" + p1 + "${activeTab === 'permissions' ? 'max-w-5xl' : 'max-w-" + p2 + "'}" + p3 + "`}";
            }
            return match;
        });
        
        if (content !== originalContent) {
            fs.writeFileSync(file, content);
            console.log('Updated: ' + file);
            updatedCount++;
        }
    }
}
console.log('Total files updated: ' + updatedCount);
