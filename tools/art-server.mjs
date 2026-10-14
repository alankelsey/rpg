// Local bridge for stat-lab.html's "Generate photo" button:
// character card text -> Ollama writes a short SDXL prompt -> ComfyUI renders -> PNG saved under characters/portraits/.
// Usage: node tools/art-server.mjs   (needs Ollama on :11434 and ComfyUI on :8188)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {txt2img} from './comfy.mjs';

const root = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const outDir = path.join(root, 'characters', 'portraits');
const PORT = Number(process.env.ART_PORT || 4174);
const OLLAMA = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const LLM = process.env.LLM || 'huihui_ai/qwen3-abliterated:14b';
const SIZES = {portrait: [832, 1216], cover: [896, 1152]};

async function writePrompt(card, story, shot) {
  const ask = shot === 'cover'
    ? 'a book cover scene featuring this character in the story setting'
    : 'a waist-up portrait of this character';
  const res = await fetch(`${OLLAMA}/api/chat`, {method: 'POST', body: JSON.stringify({
    model: LLM, stream: false, think: false,
    messages: [{role: 'user', content: `Write a Stable Diffusion XL prompt for ${ask}.
Rules: comma-separated tags, under 50 words, most important first: gender presentation, age, build, skin tone, hair, eyes, distinguishing marks, clothing, expression, setting, lighting.
Use every PHYSICAL attribute that is not "Unspecified", each as a descriptive phrase with its noun ("woman in her 30s", "olive skin", "green eyes", "long braided hair", "visible scar through left eyebrow"), never a bare value like "Olive".
Do not name an art style or medium. Output only the prompt.

${card}

${story}`}]})});
  if (!res.ok) throw new Error(`Ollama: ${res.status} ${await res.text()}`);
  return (await res.json()).message.content.trim().replace(/^["']|["']$/g, '');
}

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, {'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type'});
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, '', 'text/plain');
  if (req.method === 'GET' && req.url.startsWith('/portraits/')) {
    const file = path.join(outDir, path.basename(decodeURIComponent(req.url)));
    return fs.existsSync(file) ? send(res, 200, fs.readFileSync(file), 'image/png') : send(res, 404, {error: 'not found'});
  }
  if (req.method !== 'POST' || req.url !== '/generate') return send(res, 404, {error: 'not found'});
  try {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    const {card = '', story = '', style = '', shot = 'portrait'} = JSON.parse(raw);
    const subject = await writePrompt(card, story, shot);
    const prompt = `${style}, ${subject}`;
    const [width, height] = SIZES[shot] || SIZES.portrait;
    console.log(`Rendering ${shot}: ${prompt}`);
    const png = await txt2img(prompt, {width, height});
    fs.mkdirSync(outDir, {recursive: true});
    const name = (card.match(/^Name: (.*)$/m)?.[1] || 'character').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const file = `${new Date().toISOString().replace(/[:.]/g, '-')}-${name}-${shot}.png`;
    fs.writeFileSync(path.join(outDir, file), png);
    fs.writeFileSync(path.join(outDir, file.replace(/\.png$/, '.txt')), `${prompt}\n\n${card}\n\n${story}\n`);
    send(res, 200, {url: `/portraits/${file}`, file: `characters/portraits/${file}`, prompt});
  } catch (err) {
    console.error(err);
    send(res, 500, {error: err.message});
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Art server on http://127.0.0.1:${PORT}`));
