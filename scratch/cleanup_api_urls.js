const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach( f => {
    let dirPath = path.join(dir, f);
    if (f === 'node_modules' || f === '.next' || f === '.git') return;
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

const clientDir = path.join(__dirname, '..', 'client');

walk(clientDir, (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check for the messy nested pattern
    if (content.includes('process.env.NEXT_PUBLIC_API_URL')) {
        console.log('Cleaning up:', filePath);
        
        // Strategy: Replace the entire messy block back to a clean version.
        // We want: process.env.NEXT_PUBLIC_API_URL || "https://shmool.onrender.com"
        
        // The pattern I see in the user metadata is:
        // process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || '${process.env.NEXT_PUBLIC_API_URL || "https://shmool.onrender.com"}'}` + ''
        
        // This is a regex nightmare. Let's try to just find any string that starts with process.env... and ends with shmool.onrender.com...
        
        // Actually, let's just do a simple string replace for the specific mess.
        const mess = '`${process.env.NEXT_PUBLIC_API_URL || \'${process.env.NEXT_PUBLIC_API_URL || "https://shmool.onrender.com"}\'}` + \'\'';
        const mess2 = '`${process.env.NEXT_PUBLIC_API_URL || "${process.env.NEXT_PUBLIC_API_URL || \\"https://shmool.onrender.com\\"}"}` + "';
        
        // Or better: find the innermost URL and replace the whole block.
        // Actually, I'll just use a regex to find `${process.env...}` blocks and simplify them.
        
        content = content.replace(/\$\{process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*["'].*?["']\}/g, '${process.env.NEXT_PUBLIC_API_URL || "https://shmool.onrender.com"}');
        content = content.replace(/process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*[`'"].*?shmool\.onrender\.com.*?[`'"]/g, 'process.env.NEXT_PUBLIC_API_URL || "https://shmool.onrender.com"');

        // Clean up the weird concatenations like + ''
        content = content.replace(/\s*\+\s*['"]['"]/g, '');
        
        // Fix double usage
        content = content.replace(/process\.env\.NEXT_PUBLIC_API_URL\s*\|\|\s*process\.env\.NEXT_PUBLIC_API_URL/g, 'process.env.NEXT_PUBLIC_API_URL');

        fs.writeFileSync(filePath, content, 'utf8');
    }
  }
});
console.log('Cleanup finished.');
