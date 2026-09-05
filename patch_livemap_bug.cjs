const fs = require('fs');

let content = fs.readFileSync('src/components/LiveMap.tsx', 'utf-8');

content = content.replace(
  '{liveData && (',
  '{liveData?.current && ('
);

fs.writeFileSync('src/components/LiveMap.tsx', content);
console.log('patched LiveMap.tsx bug');
