"""
Reading router — wraps Jawa's reading model.

Passage generation: Gemini 2.5 Flash
Answer extraction:  deepset/roberta-base-squad2 (or best model from notebook-3 config)

Changes from original Jawa main.py:
  - Gemini API key moved to .env (GEMINI_API_KEY)
  - DATA_FILE / CONFIG_FILE resolved relative to this module, not ../ relative paths
  - Mounted under /reading prefix
  - POST /reading/generate returns passages adapted to the backend's expected format
    (multiple question types derived from the extractive QA pairs)
"""
from __future__ import annotations

import json
import logging
import os
import re
import time
from pathlib import Path
from typing import List, Optional

import numpy as np
import torch
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from transformers import AutoModelForQuestionAnswering, AutoTokenizer

logger = logging.getLogger(__name__)

# ── Config ─────────────────────────────────────────────────────────────────────
DATA_DIR    = Path(__file__).parent / "data"
DATA_FILE   = DATA_DIR / "ielts_generated_data.json"
CONFIG_FILE = DATA_DIR / "best_model_config.json"

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
DEFAULT_MODEL  = "deepset/roberta-base-squad2"
DEVICE         = torch.device("cuda" if torch.cuda.is_available() else "cpu")

DEFAULT_TOPICS = [
    ("P1", "the environmental impact of fast fashion on water pollution and textile waste"),
    ("P2", "the neuroscience of sleep and its role in memory consolidation and cognitive performance"),
    ("P3", "the history and economic significance of the Silk Road trade routes"),
]


# ── App state ──────────────────────────────────────────────────────────────────
class _State:
    tokenizer   = None
    model       = None
    ielts_data: list = []
    ready       = False


state = _State()


def load_reading_model() -> None:
    """Called at startup by main.py lifespan."""
    model_name = DEFAULT_MODEL
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE) as f:
            cfg = json.load(f)
        model_name = cfg.get("selected_model", model_name)
        logger.info(f"[reading] Best model from config: {model_name}")

    logger.info(f"[reading] Loading {model_name} on {DEVICE}...")
    state.tokenizer = AutoTokenizer.from_pretrained(model_name)
    state.model     = AutoModelForQuestionAnswering.from_pretrained(model_name).to(DEVICE)
    state.model.eval()

    state.ielts_data = _load_or_generate_passages()
    state.ready      = True
    logger.info("[reading] Reading model ready.")


# ── Gemini passage generation ──────────────────────────────────────────────────
def _gemini_generate_passage(topic: str, passage_id: str) -> dict:
    import google.generativeai as genai

    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY not set in environment.")

    genai.configure(api_key=GEMINI_API_KEY)

    prompt = f"""You are an expert IELTS exam writer.

Generate an IELTS Reading passage and 6 questions about: "{topic}"

STRICT RULES:
1. Passage must be 250-350 words, formal academic English.
2. Generate exactly 6 questions.
3. Each answer MUST be a short phrase (2-8 words) that appears VERBATIM in the passage.
4. Answers should be facts: numbers, names, percentages, years, short noun phrases.
5. Return ONLY valid JSON — no markdown, no extra text.

JSON structure:
{{
  "title": "passage title",
  "text": "full passage text...",
  "questions": [
    {{"q": "question?", "a": "exact phrase from passage"}},
    {{"q": "question?", "a": "exact phrase from passage"}},
    {{"q": "question?", "a": "exact phrase from passage"}},
    {{"q": "question?", "a": "exact phrase from passage"}},
    {{"q": "question?", "a": "exact phrase from passage"}},
    {{"q": "question?", "a": "exact phrase from passage"}}
  ]
}}"""

    gemini_model = genai.GenerativeModel("gemini-2.5-flash")
    response     = gemini_model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(temperature=0.4, max_output_tokens=2048),
    )

    raw  = re.sub(r"^```(?:json)?\s*", "", response.text.strip(), flags=re.MULTILINE)
    raw  = re.sub(r"```\s*$", "", raw, flags=re.MULTILINE).strip()
    data = json.loads(raw)
    data["id"] = passage_id

    text = data["text"]
    for q in data["questions"]:
        idx = text.lower().find(q["a"].lower())
        if idx == -1:
            idx = text.lower().find(q["a"].lower().split()[0])
        q["a_start"] = max(idx, 0)

    return data


def _load_or_generate_passages() -> list:
    if DATA_FILE.exists():
        logger.info(f"[reading] Loading saved passages from {DATA_FILE}")
        with open(DATA_FILE, encoding="utf-8") as f:
            data = json.load(f)
        for p in data:
            for q in p.get("questions", []):
                if "a_start" not in q:
                    idx = p["text"].lower().find(q["a"].lower())
                    q["a_start"] = max(idx, 0)
        logger.info(f"[reading] Loaded {len(data)} passages.")
        return data
    else:
        logger.info("[reading] No saved data — generating from Gemini 2.5 Flash...")
        passages = []
        for pid, topic in DEFAULT_TOPICS:
            logger.info(f"[reading] Generating [{pid}]: {topic[:50]}...")
            p = _gemini_generate_passage(topic, pid)
            passages.append(p)
            time.sleep(1)
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(passages, f, indent=2, ensure_ascii=False)
        logger.info(f"[reading] Generated and saved {len(passages)} passages.")
        return passages


# ── Span extraction (Jawa's extract_span, unchanged logic) ────────────────────
def _extract_span(passage: str, question: str, k: int = 5) -> list:
    enc = state.tokenizer(
        question, passage,
        truncation="only_second",
        max_length=384,
        return_offsets_mapping=True,
        return_tensors="pt",
    )

    iids    = enc["input_ids"].to(DEVICE)
    amsk    = enc["attention_mask"].to(DEVICE)
    offsets = enc["offset_mapping"].squeeze().tolist()
    seq_ids = enc.sequence_ids(0)

    with torch.no_grad():
        out = state.model(input_ids=iids, attention_mask=amsk)

    sl = out.start_logits[0]
    el = out.end_logits[0]

    candidates = []
    q_words    = set(re.findall(r"\w+", question.lower()))

    for s in range(len(sl)):
        if seq_ids[s] != 1:
            continue
        for e in range(s, min(s + 15, len(el))):
            if seq_ids[e] != 1:
                continue
            sc   = offsets[s][0]
            ec   = offsets[e][1]
            text = passage[sc:ec].strip()

            if len(text) < 3:
                continue
            if not re.search(r"[a-zA-Z]", text):
                continue
            words = text.split()
            if len(words) < 2 or len(words) > 10:
                continue
            if text.count(" ") == 0:
                continue

            score   = sl[s].item() + el[e].item()
            t_words = set(re.findall(r"\w+", text.lower()))
            overlap = len(q_words & t_words)
            if overlap == 0:
                continue
            score += overlap * 2.5

            candidates.append({"text": text, "score": score, "start": sc, "end": ec})

    candidates = sorted(candidates, key=lambda x: x["score"], reverse=True)
    seen, top_k = set(), []
    for c in candidates:
        if c["text"] not in seen:
            seen.add(c["text"])
            top_k.append(c)
        if len(top_k) >= k:
            break
    return top_k


# ── Adapter: Jawa passage → backend GeneratedReadingTest format ───────────────
def _adapt_passages_to_backend(raw_passages: list, section: str) -> dict:
    """
    Converts Jawa's format:
        [{id, title, text, questions: [{q, a, a_start}]}]

    Into what the backend's generateReadingTest() returns:
        {title, section, passages: [{index, title, body, questions: [{type, text, correctAnswer, orderIndex}]}]}

    Since Jawa generates extractive (fill-blank) QA pairs, we emit all questions as
    fill_blank.  We also synthesise 2 true_false_not_given questions per passage by
    rephrasing the first two answers with simple affirmations — giving the backend the
    type variety it stores.
    """
    adapted_passages = []
    for i, p in enumerate(raw_passages):
        questions = []
        order     = 1

        raw_qs = p.get("questions", [])

        # First 4 → fill_blank
        for rq in raw_qs[:4]:
            questions.append({
                "type":          "fill_blank",
                "text":          rq["q"].rstrip("?") + " is ______.",
                "correctAnswer": rq["a"],
                "orderIndex":    order,
            })
            order += 1

        # Next 1 → true_false_not_given (affirmative statement from answer)
        if len(raw_qs) >= 5:
            rq = raw_qs[4]
            questions.append({
                "type":          "true_false_not_given",
                "text":          f"The passage states that '{rq['a']}'.",
                "correctAnswer": "TRUE",
                "orderIndex":    order,
            })
            order += 1

        # Last 1 → multiple_choice (answer + 3 distractors from other passage answers)
        if len(raw_qs) >= 6:
            rq       = raw_qs[5]
            # Build distractors from other answers in the same passage
            other_as = [x["a"] for x in raw_qs if x["a"] != rq["a"]][:3]
            while len(other_as) < 3:
                other_as.append("None of the above")
            choices = [{"text": rq["a"], "isCorrect": True}] + \
                      [{"text": d, "isCorrect": False} for d in other_as]
            import random; random.shuffle(choices)
            questions.append({
                "type":       "multiple_choice",
                "text":       rq["q"],
                "choices":    choices,
                "orderIndex": order,
            })
            order += 1

        adapted_passages.append({
            "index":     i + 1,
            "title":     p.get("title", f"Passage {i+1}"),
            "body":      p.get("text", ""),
            "questions": questions,
        })

    return {
        "title":    f"IELTS {section.capitalize()} Reading Practice Test",
        "section":  section,
        "passages": adapted_passages,
    }


# ── Schemas ────────────────────────────────────────────────────────────────────
class GenerateReadingRequest(BaseModel):
    section: str = Field("academic", pattern="^(academic|general)$")
    topics:  Optional[List[str]] = Field(
        None,
        description="Optional list of topics to generate fresh passages. If omitted, cached passages are used.",
    )


# ── Router ─────────────────────────────────────────────────────────────────────
router = APIRouter(prefix="/reading", tags=["Reading"])


@router.post("/generate")
def generate_reading_test(req: GenerateReadingRequest) -> dict:
    """
    Generate an IELTS reading test.

    - If `topics` are provided: calls Gemini to generate fresh passages.
    - Otherwise: returns adapted cached passages from data/ielts_generated_data.json.

    Returns the format expected by the backend's generateReadingTest().
    """
    if not state.ready:
        raise HTTPException(503, "Reading model not ready.")

    if req.topics:
        if not GEMINI_API_KEY:
            raise HTTPException(400, "GEMINI_API_KEY not set — cannot generate fresh passages.")
        passages = []
        for i, topic in enumerate(req.topics[:3]):  # cap at 3 passages
            pid = f"P{i+1}"
            logger.info(f"[reading] Generating fresh passage [{pid}]: {topic[:50]}...")
            p = _gemini_generate_passage(topic, pid)
            passages.append(p)
            time.sleep(1)
        # Persist new passages so subsequent calls reuse them
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(passages, f, indent=2, ensure_ascii=False)
        state.ielts_data = passages
    else:
        passages = state.ielts_data

    return _adapt_passages_to_backend(passages, req.section)


@router.get("/health", tags=["Reading"])
def reading_health():
    return {
        "status":          "ready" if state.ready else "loading",
        "passages_cached": len(state.ielts_data),
    }
