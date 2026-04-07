const fs = require('fs');
let content = fs.readFileSync('client/components/dashboards/StudentDashboard.tsx', 'utf8');

exports = { content, write: () => fs.writeFileSync('client/components/dashboards/StudentDashboard.tsx', content) };
