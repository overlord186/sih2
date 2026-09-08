import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// polyfill
global.window = {};
global.document = {
  readyState: 'complete',
  getElementById: () => null,
  addEventListener: () => {},
  createElement: () => ({
    setAttribute: () => {},
    appendChild: () => {},
    style: {}
  }),
  createElementNS: () => ({
    setAttribute: () => {},
    appendChild: () => {},
    style: {}
  })
};
global.navigator = { userAgent: 'node' };
global.location = { search: '' };
global.console.warn = () => {};

try {
  await import('./dist/assets/index-GcWY-Fzy.js');
  console.log('Bundle loaded successfully without top-level errors.');
} catch (e) {
  console.error('Bundle loading failed!', e);
}
