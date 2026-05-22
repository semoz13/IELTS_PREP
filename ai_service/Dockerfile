FROM python:3.11-slim

WORKDIR /app

# System packages
#   libsndfile1 — soundfile dep used by librosa (confidence module)
#   ffmpeg      — openai-whisper needs it for audio format conversion
#   curl        — used by Docker health checks
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libsndfile1 \
        ffmpeg \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps as a separate layer — only re-runs when requirements change
COPY requirements-runtime.txt .
RUN pip install --no-cache-dir -r requirements-runtime.txt

# Copy application code
# .dockerignore excludes: .venv/, *.pt, listening/audio/, .env, __pycache__
COPY . .

EXPOSE 8000

# Single worker — multiple workers would each load all torch models into RAM
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
