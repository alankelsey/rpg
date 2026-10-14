// Minimal ComfyUI txt2img client (SDXL), same graph as home-open-claw/routes/comfy.js.
const HOST = process.env.COMFY_HOST || 'http://127.0.0.1:8188';
const CKPT = process.env.COMFY_CHECKPOINT || 'sd_xl_base_1.0.safetensors';

export async function txt2img(prompt, {negative = 'blurry, low quality, watermark, text, deformed, extra fingers',
  width = 832, height = 1216, steps = 25, seed = Math.floor(Math.random() * 2 ** 32)} = {}) {
  const graph = {
    1: {class_type: 'CheckpointLoaderSimple', inputs: {ckpt_name: CKPT}},
    2: {class_type: 'CLIPTextEncode', inputs: {text: prompt, clip: ['1', 1]}},
    3: {class_type: 'CLIPTextEncode', inputs: {text: negative, clip: ['1', 1]}},
    6: {class_type: 'EmptyLatentImage', inputs: {width, height, batch_size: 1}},
    10: {class_type: 'KSampler', inputs: {model: ['1', 0], positive: ['2', 0], negative: ['3', 0], latent_image: ['6', 0],
      seed, steps, cfg: 7, sampler_name: 'dpmpp_2m', scheduler: 'karras', denoise: 1}},
    11: {class_type: 'VAEDecode', inputs: {samples: ['10', 0], vae: ['1', 2]}},
    12: {class_type: 'PreviewImage', inputs: {images: ['11', 0]}},
  };
  const queued = await fetch(`${HOST}/prompt`, {method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({prompt: graph})});
  const body = await queued.json();
  if (!queued.ok) throw new Error(`ComfyUI rejected workflow: ${JSON.stringify(body.error || body)}`);
  const id = body.prompt_id;
  for (const deadline = Date.now() + 20 * 60 * 1000; Date.now() < deadline;) {
    await new Promise(r => setTimeout(r, 1500));
    const entry = (await (await fetch(`${HOST}/history/${id}`)).json())[id];
    if (!entry) continue;
    if (entry.status?.status_str === 'error') throw new Error('ComfyUI execution failed');
    const out = entry.outputs?.['12']?.images?.[0];
    if (out) {
      const img = await fetch(`${HOST}/view?${new URLSearchParams({filename: out.filename, subfolder: out.subfolder, type: out.type})}`);
      return Buffer.from(await img.arrayBuffer());
    }
  }
  throw new Error('ComfyUI timed out');
}
