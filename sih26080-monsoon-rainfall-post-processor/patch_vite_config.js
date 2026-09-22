import fs from 'fs';
let content = fs.readFileSync('vite.config.ts', 'utf8');

const plugin = `
      {
        name: 'catch-vite-websocket-rejection',
        transformIndexHtml: {
          order: 'pre',
          handler() {
            return [
              {
                tag: 'script',
                attrs: { type: 'text/javascript' },
                injectTo: 'head-prepend',
                children: \`
                  window.addEventListener('unhandledrejection', function(event) {
                    var reason = event.reason;
                    var msg = typeof reason === 'string' ? reason : (reason && reason.message) ? reason.message : '';
                    if (msg.includes('WebSocket') || msg.includes('vite')) {
                      event.preventDefault();
                      event.stopImmediatePropagation();
                    }
                  });
                  
                  // Also intercept console.error to avoid spam
                  var oErr = console.error;
                  console.error = function() {
                    if (arguments[0] && typeof arguments[0] === 'string' && arguments[0].includes('WebSocket')) return;
                    oErr.apply(console, arguments);
                  };
                \`
              }
            ];
          }
        }
      },
`;

if (!content.includes('catch-vite-websocket-rejection')) {
    content = content.replace('plugins: [', 'plugins: [\n' + plugin);
}

fs.writeFileSync('vite.config.ts', content);
console.log('Patched vite.config.ts');
