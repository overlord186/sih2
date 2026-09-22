import fs from 'fs';
let content = fs.readFileSync('src/components/SocioEconomicImpactView.tsx', 'utf8');

// The file contains literally {\` instead of {` because I escaped it inside a cat << 'EOF'
// Oh wait, cat << 'EOF' does NOT expand variables, but I escaped it. So bash wrote \` verbatim.
content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$');

fs.writeFileSync('src/components/SocioEconomicImpactView.tsx', content);
console.log('Fixed escape characters in SocioEconomicImpactView.tsx');
