// Render a portrait PNG for every character card in a folder via local ComfyUI.
// Usage: node tools/render-portraits.mjs characters/<run-folder> [--force]
import fs from 'node:fs';
import path from 'node:path';
import {txt2img} from './comfy.mjs';

const dir = process.argv[2];
if (!dir) { console.error('Usage: node tools/render-portraits.mjs <characters folder> [--force]'); process.exit(1); }
for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.md')).sort()) {
  const png = path.join(dir, file.replace(/\.md$/, '.png'));
  if (fs.existsSync(png) && !process.argv.includes('--force')) continue;
  const prompt = fs.readFileSync(path.join(dir, file), 'utf8').split('## Image prompt')[1]?.trim();
  if (!prompt) { console.warn(`${file}: no image prompt, skipped`); continue; }
  console.log(`Rendering ${file}…`);
  fs.writeFileSync(png, await txt2img(prompt));
}
console.log('Done →', dir);
