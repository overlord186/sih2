import fs from 'node:fs';
import path from 'node:path';

try {
  const distDir = path.resolve(process.cwd(), 'dist');
  const buildDir = path.resolve(process.cwd(), 'build');

  if (fs.existsSync(distDir)) {
    fs.rmSync(buildDir, { recursive: true, force: true });
    fs.cpSync(distDir, buildDir, { recursive: true });
    console.log('[Postbuild] Successfully synchronized dist to build directory.');
  }
} catch (err) {
  console.warn('[Postbuild] Notice: Failed to mirror dist to build directory:', err.message);
}
