const fs = require('fs');

let serverContent = fs.readFileSync('server.ts', 'utf-8');

// Replace app.listen with server.listen
serverContent = serverContent.replace(
  `async function startServer() {
  const app = express();`,
  `import http from "http";\n\nasync function startServer() {
  const app = express();
  const server = http.createServer(app);`
);

serverContent = serverContent.replace(
  `app.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });`,
  `server.listen(PORT, "0.0.0.0", () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });`
);

serverContent = serverContent.replace(
  `const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false
      },
      appType: "spa",
    });`,
  `const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: { server }
      },
      appType: "spa",
    });`
);

fs.writeFileSync('server.ts', serverContent);
console.log('patched server.ts with HMR server attachment');
