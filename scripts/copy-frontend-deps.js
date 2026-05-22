import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '../src/web/public/vendor');

const deps = [
  { from: 'alpinejs/dist/cdn.min.js', to: 'alpinejs.js' },
  { from: 'chart.js/dist/chart.umd.js', to: 'chart.js' },
  { from: '@picocss/pico/css/pico.min.css', to: 'pico.css' },
];

fs.mkdirSync(publicDir, { recursive: true });

for (const dep of deps) {
  const src = path.join(__dirname, '../node_modules', dep.from);
  const dest = path.join(publicDir, dep.to);
  fs.copyFileSync(src, dest);
  console.log(`Copied ${dep.from} -> ${dest}`);
}
