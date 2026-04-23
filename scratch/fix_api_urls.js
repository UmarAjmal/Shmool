const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
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
    if (content.includes('https://shmool.onrender.com')) {
      console.log('Patching:', filePath);
      
      // Replace hardcoded URLs with environment variable usage
      // We'll replace the string literal with a template literal expression
      // 'https://shmool.onrender.com' -> `${process.env.NEXT_PUBLIC_API_URL || 'https://shmool.onrender.com'}`
      
      // Handle 'https://shmool.onrender.com'
      content = content.split("'https://shmool.onrender.com").join("`${process.env.NEXT_PUBLIC_API_URL || 'https://shmool.onrender.com'}` + '");
      // Handle "https://shmool.onrender.com"
      content = content.split('"https://shmool.onrender.com').join('`${process.env.NEXT_PUBLIC_API_URL || "https://shmool.onrender.com"}` + "');
      // Handle `https://shmool.onrender.com`
      content = content.split('https://shmool.onrender.com').join('${process.env.NEXT_PUBLIC_API_URL || "https://shmool.onrender.com"}');
      
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
});
console.log('All files processed.');
