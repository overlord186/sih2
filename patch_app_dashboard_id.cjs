const fs = require('fs');
let appContent = fs.readFileSync('src/App.tsx', 'utf-8');
appContent = appContent.replace(
  `{activeTab === 'dashboard' && (
          <div className="space-y-6">`,
  `{activeTab === 'dashboard' && (
          <div className="space-y-6" id="dashboard-content">`
);
fs.writeFileSync('src/App.tsx', appContent);
console.log('patched App.tsx with dashboard ID');
