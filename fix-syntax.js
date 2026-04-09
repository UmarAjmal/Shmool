const fs = require('fs');
let c = fs.readFileSync('client/components/dashboards/shared.tsx', 'utf8');
c = c.replace('  );\n}\n\n}\n\n// Page Shell', '  );\n}\n\n// Page Shell');
c = c.replace('  );\r\n}\r\n\r\n}\r\n\r\n// Page Shell', '  );\r\n}\r\n\r\n// Page Shell');
c = c.replace('  );\n}\n\n}\r\n\n// Page Shell', '  );\n}\n\n// Page Shell');
// or regex:
c = c.replace(/\)\;\r?\n\}\r?\n\r?\n\}\r?\n\r?\n\/\/ Page Shell/, ');\n}\n\n// Page Shell');
fs.writeFileSync('client/components/dashboards/shared.tsx', c);
console.log('Done!');
