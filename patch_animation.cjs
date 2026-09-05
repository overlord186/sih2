const fs = require('fs');

let fileContent = fs.readFileSync('src/components/KidVisualStage.tsx', 'utf-8');

fileContent = fileContent.replace(
  `animation: \`fall \${duration}s linear infinite\`,
                    animationDelay: \`\${delay}s\`,`,
  `animation: \`fall \${duration}s linear \${delay}s infinite\`,`
);

fileContent = fileContent.replace(
  `animation: \`splashBounce \${duration}s ease-out infinite\`,
                    animationDelay: \`\${delay}s\`,`,
  `animation: \`splashBounce \${duration}s ease-out \${delay}s infinite\`,`
);

fs.writeFileSync('src/components/KidVisualStage.tsx', fileContent);
console.log('patched KidVisualStage.tsx');
