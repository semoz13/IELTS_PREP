# AI Service — Setup Guide

This is the unified FastAPI service that powers all AI features in the IELTS PREP backend.
It runs as a separate process on port **8000**.

---

## 1. Python Environment

Requires Python 3.10+.

```bash
cd ai_service/

python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt
```

> **Note:** PyTorch installs a CPU-only build by default. For GPU support, install
> the CUDA version manually first: https://pytorch.org/get-started/locally/

---

## 2. Environment Variables

Copy `.env.example` to `.env` and fill in your keys:

```bash
cp .env.example .env
```

Edit `.env`:

```
GEMINI_API_KEY=your_gemini_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

Both keys are required. Obtain them from:

- Gemini: https://aistudio.google.com/app/apikey
- Anthropic: https://console.anthropic.com/

---

## 3. Build Chat Artifacts (Basel — one-time)

This generates the FAQ embeddings and frequent-question index.

```bash
python chat/scripts/build_artifacts.py
```

Expected output files in `chat/artifacts/`:

- `faq_index.json`
- `faq_embeddings.npy`
- `frequent_index.json`

> If the artifacts already exist (copied from the original Basel model), skip this step.
> The `/health` endpoint will report `faq_ready: true` if they are valid.

---

## 4. Place Roy's Writing Model Files

The two DistilBERT model files (each ~253 MB) must exist at their original paths.
They are **not** copied into `ai_service/` to avoid duplicating large files.

Required files:

```
AI/roy model/Writing/Writing/ielts_project/task1_model_best.pt   (253 MB)
AI/roy model/Writing/Writing/ielts_project/task2_model_best.pt   (253 MB)
```

If you move them, set environment variables in `.env`:

```
TASK1_MODEL_PATH=/absolute/path/to/task1_model_best.pt
TASK2_MODEL_PATH=/absolute/path/to/task2_model_best.pt
```

---

## 5. Place Confidence Model File (Rami)

The file is already copied to `confidence/exp1_model.pkl`.
If you move it, set:

```
CONFIDENCE_MODEL_PATH=/absolute/path/to/exp1_model.pkl
```

---

## 6. Prepare Listening Audio Files

The listening service needs real audio files to generate questions from.

**Step 6a — Place audio files:**

Copy `.wav` audio files (IELTS-style listening passages) to:

```
ai_service/listening/audio/
```

Need at least 4 files. See `listening/audio/README.md` for details.

> A sample file `section_sample_01.wav` is already included.

**Step 6b — Build the listening cache:**

## I reached here

## MIND FUCK JEJE

```bash
python listening/cache_builder.py
```

This runs Whisper (speech-to-text) + Gemini (question generation) on each file.
It writes results to `listening/listening_cache.json`.

Whisper model size is controlled by `.env`:

```
WHISPER_MODEL_SIZE=base   # tiny | base | small | medium
```

Use `base` for speed, `medium` for best accuracy (downloads ~1.5 GB).

**Step 6c — Copy audio files to backend uploads:**

The Node.js backend serves audio files as static files from `/uploads/audio/`.
Copy them there so the frontend can play them:

```bash
# Adjust path to your backend location
cp listening/audio/*.wav ../IELTS_PREP/backend/uploads/audio/
```

---

## 7. Verify Reading Data

Jawa's pre-generated reading passages are already included at:

```
reading/data/ielts_generated_data.json
reading/data/best_model_config.json
```

To regenerate passages with fresh Gemini content, call:

```
POST /reading/generate
Body: {"section": "academic", "topics": ["your topic 1", "your topic 2", "your topic 3"]}
```

---

## 8. Start the Service

```bash
cd ai_service/
uvicorn main:app --host 0.0.0.0 --port 8000
or
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

For development with auto-reload:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Swagger UI: http://localhost:8000/docs

---

## 9. Configure the Backend

In the Node.js backend's `.env`, set:

```
AI_SERVICE_URL=http://localhost:8000
```

This is the default — no change needed if both services run on the same machine.

---

## 10. Health Check

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{ "status": "ok", "faq_ready": true, "frequent_ready": true }
```

Check listening cache status:

```bash
curl http://localhost:8000/listening/cache-status
```

---

## Startup Checklist

| #   | Check                                 | Command                                            |
| --- | ------------------------------------- | -------------------------------------------------- |
| 1   | Python venv activated                 | `source .venv/bin/activate`                        |
| 2   | `.env` file exists with both API keys | `cat .env`                                         |
| 3   | Chat artifacts built                  | `ls chat/artifacts/` → 3 files                     |
| 4   | Roy's `.pt` files exist               | `ls "AI/roy model/Writing/Writing/ielts_project/"` |
| 5   | Rami's `.pkl` exists                  | `ls confidence/exp1_model.pkl`                     |
| 6   | Audio files in `listening/audio/`     | `ls listening/audio/*.wav`                         |
| 7   | Listening cache built                 | `ls listening/listening_cache.json`                |
| 8   | Service starts without errors         | `uvicorn main:app ...`                             |
| 9   | Health check passes                   | `curl localhost:8000/health`                       |
| 10  | Backend `AI_SERVICE_URL` set          | Check backend `.env`                               |

---

## Troubleshooting

**`503 Chat service artifacts not ready`**
→ Run `python chat/scripts/build_artifacts.py`

**`503 Writing models not ready`**
→ Check that `.pt` files exist at the expected paths. See step 4.

**`503 Listening cache has only N valid sections`**
→ Add more `.wav` files to `listening/audio/` and rerun `cache_builder.py`

**`RuntimeError: GEMINI_API_KEY not set`**
→ Add `GEMINI_API_KEY=...` to `.env`

**`RuntimeError: Confidence model not loaded`**
→ Check that `confidence/exp1_model.pkl` exists

**Whisper takes too long**
→ Set `WHISPER_MODEL_SIZE=tiny` in `.env` and rebuild cache

**HuggingFace datasets download fails**
→ Requires internet access at startup. Datasets are cached after first download in `~/.cache/huggingface/`
