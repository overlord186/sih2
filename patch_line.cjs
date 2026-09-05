const fs = require('fs');
let code = fs.readFileSync('src/components/InteractiveGlobe.tsx', 'utf8');
code = code.replace(
  'if (points.length > 0) {',
  'if (points.length > 1) {'
);
fs.writeFileSync('src/components/InteractiveGlobe.tsx', code);
