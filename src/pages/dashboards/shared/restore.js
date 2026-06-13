const { execSync } = require('child_process');
try {
    console.log("Running git checkout...");
    const output = execSync('git checkout -- ../../../../App.tsx', { encoding: 'utf-8' });
    console.log("Git checkout output:", output);
} catch (error) {
    console.error("Error running git checkout:", error.message);
    if (error.stdout) console.log("stdout:", error.stdout);
    if (error.stderr) console.error("stderr:", error.stderr);
}
