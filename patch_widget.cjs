const fs = require('fs');

let widgetContent = fs.readFileSync('src/components/AtmosphereWidget.tsx', 'utf-8');

widgetContent = widgetContent.replace(
  `                  initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                  animate={{ opacity: 1, x, y, scale: 1 }}
                  exit={{ opacity: 0, x: 0, y: 0, scale: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20, delay: index * 0.05 }}`,
  `                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.2, rotate: -45 }}
                  animate={{ opacity: 1, x, y, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, x: 0, y: 0, scale: 0.2, rotate: 45 }}
                  transition={{ type: "spring", stiffness: 400, damping: 14, delay: index * 0.05 }}`
);

// Increase spacing just in case
widgetContent = widgetContent.replace(
  `bottom-[6.5rem]`,
  `bottom-32`
);

fs.writeFileSync('src/components/AtmosphereWidget.tsx', widgetContent);
console.log('patched AtmosphereWidget.tsx');
