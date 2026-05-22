"""
Listening cache builder.

Reads every .wav file in listening/audio/, transcribes with Whisper,
generates IELTS questions with Gemini 2.5 Flash, and writes the result
to listening/listening_cache.json.

Run from ai_service/ root:
    python listening/cache_builder.py

Prerequisites:
    - GEMINI_API_KEY set in .env or environment
    - Audio .wav files placed in listening/audio/
    - pip install openai-whisper google-generativeai python-dotenv
"""
from __future__ import annotations

import json
import logging
import os
import re
import sys
import time
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

SCRIPT_DIR  = Path(__file__).parent
AUDIO_DIR   = SCRIPT_DIR / "audio"
CACHE_FILE  = SCRIPT_DIR / "listening_cache.json"

# Load .env if present
try:
    from dotenv import load_dotenv
    load_dotenv(SCRIPT_DIR.parent / ".env")
except ImportError:
    pass

GEMINI_API_KEY   = os.getenv("GEMINI_API_KEY", "")
WHISPER_MODEL    = os.getenv("WHISPER_MODEL_SIZE", "base")


# ── Whisper transcription ──────────────────────────────────────────────────────
def transcribe(audio_path: Path, model) -> str:
    logger.info(f"Transcribing: {audio_path.name}")
    result = model.transcribe(str(audio_path), language="en")
    return result["text"].strip()


# ── Gemini question generation ─────────────────────────────────────────────────
def generate_questions(transcript: str, section_number: int) -> list:
    """
    Asks Gemini 2.5 Flash to generate 10 IELTS listening questions from the transcript.
    Returns a list of question dicts compatible with the backend's GeneratedListeningQuestion.
    """
    import google.generativeai as genai

    genai.configure(api_key=GEMINI_API_KEY)

    prompt = f"""You are an expert IELTS listening examiner.

Below is a transcript of an audio recording. Generate 10 IELTS-style listening comprehension questions.

Use a MIX of these question types:
- "multiple_choice"   (include 4 choices, mark one as correct)
- "fill_blank"        (short answer that appears verbatim in transcript)
- "complete_table"    (completing a table cell — short answer)

RULES:
1. All answers must be directly supported by the transcript.
2. Questions should vary in difficulty.
3. Return ONLY valid JSON — no markdown, no extra text.

TRANSCRIPT:
{transcript[:3000]}

JSON format:
{{
  "questions": [
    {{
      "type": "fill_blank",
      "text": "The meeting is scheduled for ______.",
      "correctAnswer": "Monday",
      "orderIndex": 1
    }},
    {{
      "type": "multiple_choice",
      "text": "What is the speaker's main concern?",
      "correctAnswer": null,
      "choices": [
        {{"text": "Option A", "isCorrect": true}},
        {{"text": "Option B", "isCorrect": false}},
        {{"text": "Option C", "isCorrect": false}},
        {{"text": "Option D", "isCorrect": false}}
      ],
      "orderIndex": 2
    }}
  ]
}}"""

    gemini_model = genai.GenerativeModel("gemini-2.5-flash")
    response     = gemini_model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(temperature=0.3, max_output_tokens=3000),
    )

    raw  = re.sub(r"^```(?:json)?\s*", "", response.text.strip(), flags=re.MULTILINE)
    raw  = re.sub(r"```\s*$",           "", raw,                   flags=re.MULTILINE).strip()
    data = json.loads(raw)

    questions = data.get("questions", [])
    # Ensure orderIndex is set correctly
    for i, q in enumerate(questions):
        q["orderIndex"] = i + 1

    return questions


# ── Main ───────────────────────────────────────────────────────────────────────
def build_cache() -> None:
    if not GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY not set. Set it in .env or environment.")
        sys.exit(1)

    audio_files = sorted(AUDIO_DIR.glob("*.wav"))
    if not audio_files:
        logger.error(f"No .wav files found in {AUDIO_DIR}. See listening/audio/README.md")
        sys.exit(1)

    logger.info(f"Found {len(audio_files)} audio files.")
    logger.info(f"Loading Whisper '{WHISPER_MODEL}' model...")

    import whisper
    whisper_model = whisper.load_model(WHISPER_MODEL)
    logger.info("Whisper ready.")

    cache = []
    for i, audio_path in enumerate(audio_files):
        section_number = i + 1
        logger.info(f"Processing section {section_number}: {audio_path.name}")

        try:
            transcript = transcribe(audio_path, whisper_model)
            logger.info(f"  Transcript length: {len(transcript)} chars")

            questions = generate_questions(transcript, section_number)
            logger.info(f"  Generated {len(questions)} questions.")
            time.sleep(2)  # Gemini rate limit courtesy

            cache.append({
                "sectionNumber": section_number,
                "audioFile":     audio_path.name,
                "audioUrl":      f"/uploads/audio/{audio_path.name}",
                "transcript":    transcript,
                "questions":     questions,
            })

        except Exception as e:
            logger.error(f"  Failed: {e}")
            # Write a placeholder so the section slot is preserved
            cache.append({
                "sectionNumber": section_number,
                "audioFile":     audio_path.name,
                "audioUrl":      f"/uploads/audio/{audio_path.name}",
                "transcript":    "",
                "questions":     [],
                "error":         str(e),
            })

    CACHE_FILE.write_text(json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf-8")
    ok_count = sum(1 for s in cache if not s.get("error") and s["questions"])
    logger.info(f"Cache written to {CACHE_FILE} ({ok_count}/{len(cache)} sections OK).")


if __name__ == "__main__":
    build_cache()
