const fs = require('fs');

let indexHtml = fs.readFileSync('index.html', 'utf-8');

const suppressionScript = `
    <script>
      // Suppress Vite HMR WebSocket connection errors in the console
      const originalConsoleError = console.error;
      console.error = function(...args) {
        if (typeof args[0] === 'string' && args[0].includes('[vite] failed to connect to websocket')) return;
        if (args[0] && args[0].message && args[0].message.includes('WebSocket closed without opened')) return;
        originalConsoleError.apply(console, args);
      };
      window.addEventListener('unhandledrejection', function(event) {
        if (event.reason && (
          (event.reason.message && event.reason.message.includes('WebSocket closed without opened')) ||
          (typeof event.reason === 'string' && event.reason.includes('WebSocket closed'))
        )) {
          event.preventDefault();
        }
      });
    </script>
`;

if (!indexHtml.includes('originalConsoleError')) {
  indexHtml = indexHtml.replace('</head>', suppressionScript + '  </head>');
  fs.writeFileSync('index.html', indexHtml);
  console.log('patched index.html');
}
