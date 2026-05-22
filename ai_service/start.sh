#!/usr/bin/env bash
# ── IELTS AI Service — startup script ─────────────────────────────────────────
# Run from the ai_service/ directory:
#   chmod +x start.sh && ./start.sh
# ──────────────────────────────────────────────────────────────────────────────
set -e
cd "$(dirname "$0")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; exit 1; }

echo "─── IELTS AI Service — pre-flight checks ───────────────────────────────"

# 1. .env
if [ ! -f ".env" ]; then
  fail ".env not found. Copy .env.example to .env and fill in your API keys."
fi
ok ".env exists"

# 2. GEMINI_API_KEY
source .env 2>/dev/null || true
if [ -z "$GEMINI_API_KEY" ] || [ "$GEMINI_API_KEY" = "your_gemini_api_key_here" ]; then
  fail "GEMINI_API_KEY is not set in .env"
fi
ok "GEMINI_API_KEY set"

# 3. ANTHROPIC_API_KEY
if [ -z "$ANTHROPIC_API_KEY" ] || [ "$ANTHROPIC_API_KEY" = "your_anthropic_api_key_here" ]; then
  fail "ANTHROPIC_API_KEY is not set in .env"
fi
ok "ANTHROPIC_API_KEY set"

# 4. Chat artifacts
if [ ! -f "chat/artifacts/faq_index.json" ] || \
   [ ! -f "chat/artifacts/faq_embeddings.npy" ] || \
   [ ! -f "chat/artifacts/frequent_index.json" ]; then
  warn "Chat artifacts missing. Running build_artifacts.py now..."
  python chat/scripts/build_artifacts.py || fail "Artifact build failed."
else
  ok "Chat artifacts present"
fi

# 5. Roy writing model files
TASK1="${TASK1_MODEL_PATH:-../AI/roy model/Writing/Writing/ielts_project/task1_model_best.pt}"
TASK2="${TASK2_MODEL_PATH:-../AI/roy model/Writing/Writing/ielts_project/task2_model_best.pt}"

if [ ! -f "$TASK1" ]; then
  fail "Task 1 model not found: $TASK1  (set TASK1_MODEL_PATH in .env to override)"
fi
ok "task1_model_best.pt found"

if [ ! -f "$TASK2" ]; then
  fail "Task 2 model not found: $TASK2  (set TASK2_MODEL_PATH in .env to override)"
fi
ok "task2_model_best.pt found"

# 6. Confidence model
CONF="${CONFIDENCE_MODEL_PATH:-confidence/exp1_model.pkl}"
if [ ! -f "$CONF" ]; then
  warn "Confidence model not found at $CONF — /confidence/analyze will return 503"
else
  ok "exp1_model.pkl found"
fi

# 7. Listening cache
if [ ! -f "listening/listening_cache.json" ]; then
  AUDIO_COUNT=$(ls listening/audio/*.wav 2>/dev/null | wc -l)
  if [ "$AUDIO_COUNT" -ge 4 ]; then
    warn "Listening cache not found. Running cache_builder.py..."
    python listening/cache_builder.py || warn "Cache build failed — /listening/generate will return 503"
  else
    warn "Listening cache not found and fewer than 4 audio files in listening/audio/."
    warn "/listening/generate will return 503 until you add audio and run cache_builder.py"
  fi
else
  ok "listening_cache.json found"
fi

echo "─── Starting uvicorn ───────────────────────────────────────────────────"
exec uvicorn main:app --host 0.0.0.0 --port 8000
