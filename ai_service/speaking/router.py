from __future__ import annotations

import json
import random
from pathlib import Path
from typing import List

from fastapi import APIRouter
from pydantic import BaseModel

QUESTIONS_FILE = Path(__file__).parent / "speaking_questions.json"

# ── Part 3 question bank (hardcoded — Part 3 not in Roy's JSON) ───────────────
PART3_QUESTIONS = [
    "Do you think people in your country are moving away from rural areas toward cities? Why?",
    "What are the advantages and disadvantages of living in the countryside compared to urban areas?",
    "How does tourism affect small rural communities? Do the benefits outweigh the drawbacks?",
    "How has technology changed the way people communicate compared to the past?",
    "Do you think social media has had a positive or negative effect on society? Why?",
    "What role should governments play in protecting the environment?",
    "How important is it for young people to learn about their cultural heritage?",
    "Do you think traditional skills and crafts are in danger of disappearing? How can they be preserved?",
    "In what ways can education systems better prepare students for the modern workforce?",
    "How do you think cities will change over the next 50 years?",
    "What are the main causes of stress in modern life, and how can people manage it?",
    "Some people believe that economic growth always leads to environmental damage. Do you agree?",
    "How has globalisation affected local cultures and traditions?",
    "What responsibilities do wealthy nations have toward developing countries?",
    "Do you think it is possible to achieve a good work-life balance in today's world?",
]


class SpeakingGenerateResponse(BaseModel):
    title: str
    questions: List[dict]


router = APIRouter(prefix="/speaking", tags=["Speaking"])

_speaking_data: dict | None = None


def _load_data() -> dict:
    global _speaking_data
    if _speaking_data is None:
        with open(QUESTIONS_FILE, encoding="utf-8") as f:
            _speaking_data = json.load(f)
    return _speaking_data


@router.post("/generate", response_model=SpeakingGenerateResponse)
def generate_speaking_test() -> SpeakingGenerateResponse:
    """
    Returns a full IELTS speaking test across 3 parts in the format
    the Node.js backend's aiService.generateSpeakingTest() expects.

    Part 1 — 3 personal questions  (0s prep, 45s answer)
    Part 2 — 1 cue card            (60s prep, 120s answer)
    Part 3 — 3 discussion prompts  (0s prep, 60s answer)
    """
    data = _load_data()

    part1_pool     = data["part1"]["questions"]
    part1_weights  = data["part1"].get("weights")
    part2_pool     = data["part2"]["questions"]
    part2_weights  = data["part2"].get("weights")

    part1_selected = random.choices(part1_pool, weights=part1_weights, k=3)
    part2_selected = random.choices(part2_pool, weights=part2_weights, k=1)
    part3_selected = random.sample(PART3_QUESTIONS, k=3)

    questions: List[dict] = []
    order = 1

    for q in part1_selected:
        questions.append({
            "partNumber":             1,
            "orderIndex":             order,
            "prompt":                 q,
            "preparationTimeSeconds": 0,
            "answerTimeSeconds":      45,
        })
        order += 1

    for q in part2_selected:
        questions.append({
            "partNumber":             2,
            "orderIndex":             order,
            "prompt":                 q,
            "preparationTimeSeconds": 60,
            "answerTimeSeconds":      120,
        })
        order += 1

    for q in part3_selected:
        questions.append({
            "partNumber":             3,
            "orderIndex":             order,
            "prompt":                 q,
            "preparationTimeSeconds": 0,
            "answerTimeSeconds":      60,
        })
        order += 1

    return SpeakingGenerateResponse(
        title="IELTS Speaking Practice Test",
        questions=questions,
    )
