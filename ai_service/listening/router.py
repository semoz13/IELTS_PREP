"""
Listening router — extracted from Jawa's Notebook 4.

Flow:
  1. cache_builder.py pre-processes audio files (Whisper + Gemini) → listening_cache.json
  2. POST /listening/generate reads the cache and returns 4 random sections.
  3. GET  /listening/cache-status reports cache readiness.

Whisper is loaded lazily (first /listening/generate call) to avoid blocking startup
since the medium model is ~1.5 GB.

TODO: If Gemini question generation needs tuning (question quality), adjust the
      prompt in cache_builder.py generate_questions().
"""
from __future__ import annotations

import json
import logging
import os
import random
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

SCRIPT_DIR     = Path(__file__).parent
CACHE_FILE     = SCRIPT_DIR / "listening_cache.json"
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")

router = APIRouter(prefix="/listening", tags=["Listening"])

_cache: List[dict] = []
_cache_loaded       = False


def _load_cache() -> None:
    global _cache, _cache_loaded
    if CACHE_FILE.exists():
        with open(CACHE_FILE, encoding="utf-8") as f:
            _cache = json.load(f)
        _cache_loaded = True
        logger.info(f"[listening] Cache loaded: {len(_cache)} sections.")
    else:
        logger.warning(
            "[listening] listening_cache.json not found. "
            "Run: python listening/cache_builder.py"
        )


# Load cache at import time (lightweight — just JSON)
_load_cache()


# ── Schemas ────────────────────────────────────────────────────────────────────
class ListeningGenerateResponse(BaseModel):
    title:    str
    sections: List[dict]


# ── Endpoints ──────────────────────────────────────────────────────────────────
@router.post("/generate", response_model=ListeningGenerateResponse)
def generate_listening_test() -> ListeningGenerateResponse:
    """
    Returns 4 random sections from the pre-built cache.
    Each section includes the audioUrl and questions in the format the backend expects.
    """
    # Reload in case cache was rebuilt while server is running
    _load_cache()

    ready_sections = [s for s in _cache if s.get("questions") and not s.get("error")]

    if len(ready_sections) < 4:
        raise HTTPException(
            status_code=503,
            detail=(
                f"Listening cache has only {len(ready_sections)} valid section(s). "
                "Need at least 4. Run: python listening/cache_builder.py"
            ),
        )

    selected = random.sample(ready_sections, k=4)

    sections = []
    for i, s in enumerate(selected):
        sections.append({
            "sectionNumber": i + 1,          # renumber 1-4 regardless of cache order
            "audioUrl":      s["audioUrl"],
            "questions":     s["questions"],
        })

    return ListeningGenerateResponse(
        title="IELTS Listening Practice Test",
        sections=sections,
    )


@router.get("/cache-status", tags=["Listening"])
def cache_status() -> dict:
    """Reports the current state of listening_cache.json."""
    _load_cache()

    total   = len(_cache)
    valid   = sum(1 for s in _cache if s.get("questions") and not s.get("error"))
    invalid = total - valid

    return {
        "cache_file":     str(CACHE_FILE),
        "total_sections": total,
        "valid_sections": valid,
        "invalid_sections": invalid,
        "ready":          valid >= 4,
        "note": (
            "Ready — POST /listening/generate will work."
            if valid >= 4
            else "Not ready. Run: python listening/cache_builder.py"
        ),
    }
