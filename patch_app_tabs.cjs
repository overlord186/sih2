const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// Combine methodology and help into the help tab
content = content.replace(
  `{activeTab === 'methodology' && (
          <MethodologyView />
        )}
        {activeTab === 'help' && (
          <HelpGuideView />
        )}`,
  `{activeTab === 'help' && (
          <div className="space-y-8">
            <HelpGuideView />
            <MethodologyView />
          </div>
        )}`
);

fs.writeFileSync('src/App.tsx', content);
console.log('patched App.tsx to combine tabs');
