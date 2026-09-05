const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf-8');

const newTab = `            <button
              id="tab-planner-btn"
              onClick={() => onTabChange('planner')}
              className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors \${
                activeTab === 'planner'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }\`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              AI Action Planner
            </button>
            <button
              id="tab-help-btn"`;

content = content.replace(/<button\s+id="tab-help-btn"/, newTab);
content = content.replace(/import {([^}]+)} from 'lucide-react';/, "import { $1, Briefcase } from 'lucide-react';");

fs.writeFileSync('src/components/Header.tsx', content);
console.log('patched Header.tsx');
