// Roll characters with the real stat-lab.js rules, then use local Ollama to write
// character cards and image prompts and render portraits with local ComfyUI (SDXL).
// Usage: node tools/make-characters.mjs [count=6] [--seed=N] [--no-images]
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {txt2img} from './comfy.mjs';

const root = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const args = process.argv.slice(2);
const count = Number(args.find(a => /^\d+$/.test(a)) || 6);
let seed = Number((args.find(a => a.startsWith('--seed=')) || '--seed=' + Date.now()).slice(7));
const OLLAMA = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const LLM = process.env.LLM || 'huihui_ai/qwen3-abliterated:14b';

// Load data + calculate() from stat-lab.js, skipping its DOM wiring.
const src = fs.readFileSync(path.join(root, 'stat-lab.js'), 'utf8');
const keep = src.slice(0, src.indexOf('const $=')) + src.slice(src.indexOf('function addEffect'), src.indexOf('function render('));
const form = {};
const ctx = {form, console, render: () => {}};
vm.createContext(ctx);
vm.runInContext(keep + `
var $ = id => ({value: form[id], checked: form[id] === true});
var currentCharacter; this.calc = () => { calculate(); return currentCharacter; };
this.data = {stats, archetypes, layers, trauma, threads};`, ctx);
const {stats, archetypes, layers, trauma, threads} = ctx.data;

const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = list => list[Math.floor(rand() * list.length)];
const shuffled = [...archetypes].sort(() => rand() - 0.5);

async function chat(prompt, json = false) {
  const res = await fetch(`${OLLAMA}/api/chat`, {method: 'POST', body: JSON.stringify({
    model: LLM, stream: false, think: false, format: json ? 'json' : undefined,
    messages: [{role: 'user', content: prompt}]})});
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return (await res.json()).message.content.trim();
}

const outDir = path.join(root, 'characters', new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-'));
fs.mkdirSync(outDir, {recursive: true});
const signed = n => `${n > 0 ? '+' : ''}${Number.isInteger(n) ? n : n.toFixed(1)}`;
const takenNames = [];

for (let i = 0; i < count; i++) {
  const archetype = shuffled[i % shuffled.length];
  Object.assign(form, {archetype: archetype.name, 'career-years': pick(['1', '1.5', '2']),
    'trauma-severity': pick(['none', 'mild', 'severe', 'chronic']), 'trauma-type': pick(trauma).name,
    'trauma-processed': rand() < 0.5, 'custom-stat': 'Strength', 'base-stat': 10, 'custom-percent': 0});
  for (const layer of layers) form[layer.id] = pick(layer.items).name;
  const c = ctx.calc();
  const openThreads = threads.filter(() => rand() < 0.3);
  const sheet = [
    `Background archetype: ${archetype.name} — ${archetype.summary}`,
    ...layers.map(l => `${l.label}: ${c.selected[l.id].name}`),
    `Career length multiplier: ×${form['career-years']}`,
    `Trauma: ${form['trauma-severity'] === 'none' ? 'None' : `${form['trauma-type']} (${form['trauma-severity']}${form['trauma-processed'] ? ', processed' : ''})`}`,
    `Open threads: ${openThreads.join(', ') || 'None'}`,
    `Synergy tags: ${c.synergies.join(', ') || 'None'}`,
    'STATS (base 10):', ...stats.map(s => `${s}: ${c.results[s].value.toFixed(1)} (${signed(c.results[s].capped)}%)`),
  ].join('\n');

  console.log(`[${i + 1}/${count}] ${archetype.name}…`);
  const meta = JSON.parse(await chat(`Invent a contemporary-drama RPG character from this sheet. Avoid these names: ${takenNames.join(', ') || 'none'}.
Return JSON {"name": str, "age": int, "appearance": str (2 sentences, concrete visual details), "image_prompt": str (one detailed text-to-image portrait prompt: subject, clothing, setting, lighting, palette, painterly character-art style)}.\n\n${sheet}`, true));
  takenNames.push(meta.name);
  const card = await chat(`Write a character card in Markdown for ${meta.name} (age ${meta.age}). Appearance: ${meta.appearance}
Sections: one-line hook, personality, backstory (one paragraph grounded in every origin item), strengths and flaws (cite the highest and lowest stats), motivation, story seed. No preamble, no title line.\n\n${sheet}`);

  const slug = `${String(i + 1).padStart(2, '0')}-${meta.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  fs.writeFileSync(path.join(outDir, `${slug}.md`), `# ${meta.name}\n\n**Age:** ${meta.age}  \n**Appearance:** ${meta.appearance}\n\n${card}\n\n## Sheet\n\n\`\`\`\n${sheet}\n\`\`\`\n\n## Image prompt\n\n${meta.image_prompt}\n`);

  if (!args.includes('--no-images')) {
    try { fs.writeFileSync(path.join(outDir, `${slug}.png`), await txt2img(meta.image_prompt)); }
    catch (err) { console.warn(`  image skipped: ${err.message}`); }
  }
}
console.log('Done →', outDir);
