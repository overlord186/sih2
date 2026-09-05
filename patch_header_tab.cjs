const fs = require('fs');
let content = fs.readFileSync('src/components/Header.tsx', 'utf-8');

// Remove methodology tab
content = content.replace(/<button\s+id="tab-methodology-btn"[\s\S]*?<\/button>/, '');

// Update Help button text
content = content.replace('Help & Terms Glossary', 'Methodology & Glossary');

fs.writeFileSync('src/components/Header.tsx', content);
console.log('patched Header.tsx tab');
