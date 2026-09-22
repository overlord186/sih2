// server.js - Production Entry Point for Cloud Run & Container Deployments
// Since package.json specifies "type": "module", this file is executed as a native ES Module in Node.js.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distCjsPath = path.join(__dirname, "dist", "server.cjs");

// Launch the compiled production server bundle if available, or fall back to TypeScript source
if (fs.existsSync(distCjsPath)) {
  await import("./dist/server.cjs");
} else {
  await import("./server.ts");
}
