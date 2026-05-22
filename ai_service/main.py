from __future__ import annotations

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from chat.router    import router as chat_router, load_chat_service
from reading.router import router as reading_router, load_reading_model
from writing.router import router as writing_router, load_writing_models
from speaking.router import router as speaking_router
from listening.router import router as listening_router
from confidence.router import router as confidence_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[startup] Loading all AI models...")

    # Chat (Basel) — fast, load eagerly
    try:
        load_chat_service()
        print("[startup] Chat service ready.")
    except Exception as e:
        print(f"[startup] Chat service failed: {e}")

    # Reading (Jawa) — medium, load eagerly
    try:
        load_reading_model()
        print("[startup] Reading model ready.")
    except Exception as e:
        print(f"[startup] Reading model failed: {e}")

    # Writing (Roy) — large .pt files, load eagerly
    try:
        load_writing_models()
        print("[startup] Writing models ready.")
    except Exception as e:
        print(f"[startup] Writing models failed: {e}")

    # Speaking — no model, JSON only
    print("[startup] Speaking service ready (JSON-based).")

    # Listening — Whisper loaded lazily on first call
    print("[startup] Listening service ready (Whisper loads on first call).")

    # Confidence (Rami) — tiny pkl, load eagerly
    try:
        from confidence.router import load_confidence_model_external
        load_confidence_model_external()
        print("[startup] Confidence model ready.")
    except Exception as e:
        print(f"[startup] Confidence model failed: {e}")

    print("[startup] All services initialised.")
    yield
    print("[shutdown] Shutting down.")


app = FastAPI(
    title="IELTS AI Service",
    description=(
        "Unified AI service for IELTS PREP backend.\n\n"
        "Covers: chat (Basel), reading (Jawa), writing (Roy), "
        "speaking (Roy), listening (Jawa), confidence (Rami)."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "*").split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
app.include_router(chat_router)          # POST /chat, GET /health
app.include_router(reading_router)       # POST /reading/generate
app.include_router(writing_router)       # POST /writing/generate, POST /writing/score
app.include_router(speaking_router)      # POST /speaking/generate
app.include_router(listening_router)     # POST /listening/generate, GET /listening/cache-status
app.include_router(confidence_router)    # POST /confidence/analyze


@app.get("/", tags=["System"])
def root():
    return {"status": "IELTS AI Service running", "docs": "/docs"}
