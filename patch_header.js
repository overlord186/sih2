import fs from 'fs';
let content = fs.readFileSync('src/components/Header.tsx', 'utf8');

content = content.replace("  | 'methodology'\n  | 'help';", "  | 'methodology'\n  | 'help'\n  | 'impact';");

const newTab = `<button
              id="tab-impact-btn"
              onClick={() => onTabChange('impact')}
              className={\`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer \${
                activeTab === 'impact'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }\`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Socio-Economic Impact</span>
            </button>`;

if (content.includes("id=\"tab-planner-btn\"")) {
    const splitStr = `            <button\n              id="tab-planner-btn"`;
    const parts = content.split(splitStr);
    content = parts[0] + newTab + "\\n" + splitStr + parts[1];
}

fs.writeFileSync('src/components/Header.tsx', content);
console.log('Patched Header.tsx');
