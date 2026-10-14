# Local image generation (stat-lab)

The **Generate photo** button on `stat-lab.html` (next to **Copy character card**) turns the current character into an image without any cloud service:

```
stat-lab.html ──► tools/art-server.mjs (:4174) ──► Ollama (:11434)  writes a short image prompt from the card
                                              └──► ComfyUI (:8188)  renders it with SDXL
```

The page sends the character card text, the story data, the **Image style** and the **Shot** (both chosen under Story options → Book art). Images are saved in `characters/portraits/` with a `.txt` file holding the prompt, card and story.

## Requirements

- Node.js 18 or newer (uses built-in `fetch`).
- Python 3 (serves the page).
- [Ollama](https://ollama.com) with a chat model:
  ```
  ollama pull huihui_ai/qwen3-abliterated:14b
  ```
- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) installed in `~/ComfyUI` with its own `venv`, and the SDXL base checkpoint at
  `~/ComfyUI/models/checkpoints/sd_xl_base_1.0.safetensors` (from [stabilityai/stable-diffusion-xl-base-1.0](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0)).

Ollama's own image models (for example `x/flux2-klein:4b`) are not used: current Ollama builds answer "image generation models are not currently supported".

## Start everything

Run each in its own terminal:

```
ollama serve                                         # 1. LLM on :11434 (skip if the Ollama app is already running)
~/ComfyUI/start.sh                                   # 2. ComfyUI on :8188 (or: cd ~/ComfyUI && ./venv/bin/python main.py --listen 127.0.0.1 --port 8188)
node tools/art-server.mjs                            # 3. bridge on :4174, from the repo root
python3 -m http.server 4173 --bind 127.0.0.1         # 4. page server, from the repo root
```

Open <http://127.0.0.1:4173/stat-lab.html>, fill in the character (the **Physical attributes** fields matter most for the picture), pick an image style and shot, then click **Generate photo**. The first image takes longer while SDXL loads; after that expect a minute or two per image.

## Settings

`tools/art-server.mjs` reads these environment variables:

| Variable | Default |
|---|---|
| `ART_PORT` | `4174` |
| `OLLAMA_HOST` | `http://127.0.0.1:11434` |
| `LLM` | `huihui_ai/qwen3-abliterated:14b` |
| `COMFY_HOST` | `http://127.0.0.1:8188` |
| `COMFY_CHECKPOINT` | `sd_xl_base_1.0.safetensors` |

If you change `ART_PORT`, also change `ART_SERVER` near the top of `stat-lab.js`.

Image styles are defined in `imageStyles` in `stat-lab.js`; each is a phrase placed in front of the generated prompt.

## Batch tools

- `node tools/make-characters.mjs 6` rolls 6 random characters with the stat-lab rules, writes Markdown cards, and renders a portrait for each into `characters/<timestamp>/`. Add `--no-images` to skip rendering.
- `node tools/render-portraits.mjs characters/<folder> [--force]` renders (or re-renders) portraits for existing cards.

## Troubleshooting

| Message on the page | Fix |
|---|---|
| `Failed: Failed to fetch. Is the art server running?` | Start `node tools/art-server.mjs`. |
| `Failed: fetch failed` | Ollama or ComfyUI is not running; start both. |
| `ComfyUI rejected workflow` | The checkpoint file name doesn't match; check `~/ComfyUI/models/checkpoints/` or set `COMFY_CHECKPOINT`. |

SDXL often drops small details such as scars. Put important features in **Distinguishing marks** and in **Appearance**, and keep them short.
