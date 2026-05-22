"""
Writing router — wraps Roy's writing scoring model + Claude Haiku feedback.

Endpoints:
  POST /writing/generate  → random Task 1 + Task 2 prompts with rowId
  POST /writing/score     → score essay with DistilBERT + Claude feedback
"""
from __future__ import annotations

import json
import logging
import random
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/writing", tags=["Writing"])

# Lazy-loaded at startup
_task1_dataset = None
_task2_dataset = None
_models_loaded  = False


def load_writing_models() -> None:
    """Called at startup by main.py lifespan."""
    global _task1_dataset, _task2_dataset, _models_loaded

    from writing.inference import load_models
    load_models()

    from datasets import load_dataset
    logger.info("[writing] Loading HuggingFace datasets...")
    _task1_dataset = load_dataset("hai2131/IELTS-essays-task-1", split="train")
    _task2_dataset = load_dataset("chillies/IELTS-writing-task-2-evaluation", split="train")
    _models_loaded = True
    logger.info("[writing] Writing models + datasets ready.")


# ── Schemas ────────────────────────────────────────────────────────────────────
class GenerateWritingRequest(BaseModel):
    section: str = "academic"   # academic | general


class GenerateWritingResponse(BaseModel):
    title:   str
    section: str
    task1:   dict
    task2:   dict


class ScoreWritingRequest(BaseModel):
    taskType: Literal["task1", "task2"]
    rowId:    int
    essay:    str


class CriteriaScores(BaseModel):
    taskAchievement:  float
    coherenceCohesion: float
    lexicalResource:  float
    grammaticalRange: float


class ScoreWritingResponse(BaseModel):
    band:           float
    criteriaScores: CriteriaScores
    feedback:       str   # JSON-serialised string of Roy's nested feedback object


# ── Helpers ────────────────────────────────────────────────────────────────────
def _require_ready():
    if not _models_loaded:
        raise HTTPException(503, "Writing models not ready.")


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.post("/generate", response_model=GenerateWritingResponse)
def generate_writing_test(req: GenerateWritingRequest) -> GenerateWritingResponse:
    """
    Returns a random Task 1 question (from HuggingFace) and a random Task 2
    question, plus the rowId for each so the backend can pass it back at
    scoring time.
    """
    _require_ready()

    # Task 1
    row_id_1 = random.randint(0, len(_task1_dataset) - 1)
    row1     = _task1_dataset[row_id_1]

    # Task 2
    row_id_2 = random.randint(0, len(_task2_dataset) - 1)
    row2     = _task2_dataset[row_id_2]

    task1 = {
        "taskType":          "task1",
        "prompt":            row1.get("topic", "Describe the chart below."),
        "imageUrl":          row1.get("image", None),
        "imageDescription":  row1.get("image_description", None),
        "rowId":             row_id_1,
        "minWordCount":      150,
        "timeAllowedMinutes": 20,
    }
    task2 = {
        "taskType":          "task2",
        "prompt":            row2.get("prompt", "Write an essay on the topic provided."),
        "rowId":             row_id_2,
        "minWordCount":      250,
        "timeAllowedMinutes": 40,
    }

    return GenerateWritingResponse(
        title=f"IELTS {req.section.capitalize()} Writing Practice Test",
        section=req.section,
        task1=task1,
        task2=task2,
    )


@router.post("/score", response_model=ScoreWritingResponse)
def score_writing(req: ScoreWritingRequest) -> ScoreWritingResponse:
    """
    Scores an IELTS essay.

    1. Looks up the original prompt/image_description from the HuggingFace dataset
       using rowId.
    2. Runs Roy's DistilBERT model to get 5 criterion scores.
    3. Sends scores + essay to Claude Haiku for structured feedback.
    4. Returns adapted scores mapped to the backend's AiWritingScore format.
    """
    _require_ready()

    from writing.inference import predict_scores
    from writing.feedback  import get_feedback

    # Retrieve prompt context for feedback
    try:
        if req.taskType == "task1":
            row              = _task1_dataset[req.rowId]
            image_description = row.get("image_description", None)
            prompt_for_feedback = None
        else:
            row              = _task2_dataset[req.rowId]
            image_description = None
            prompt_for_feedback = row.get("prompt", None)
    except Exception:
        # rowId out of range or dataset changed — gracefully degrade
        image_description    = None
        prompt_for_feedback  = None

    # Score with DistilBERT
    raw_scores = predict_scores(req.essay, task_type=req.taskType)

    # Get Claude feedback
    try:
        feedback_obj = get_feedback(
            essay=req.essay,
            scores=raw_scores,
            task_type=req.taskType,
            image_description=image_description,
            prompt=prompt_for_feedback,
        )
        feedback_str = json.dumps(feedback_obj, ensure_ascii=False)
    except Exception as e:
        logger.warning(f"[writing] Claude feedback failed: {e}")
        feedback_str = json.dumps({"overall_comment": "Feedback generation failed. Please try again."})

    # Map Roy's criterion names → backend names
    # Roy:    task_achievement | coherence_cohesion | lexical_resource | grammar | overall
    # Backend: taskAchievement | coherenceCohesion  | lexicalResource  | grammaticalRange
    criteria = CriteriaScores(
        taskAchievement=raw_scores["task_achievement"],
        coherenceCohesion=raw_scores["coherence_cohesion"],
        lexicalResource=raw_scores["lexical_resource"],
        grammaticalRange=raw_scores["grammar"],  # "grammar" maps to grammaticalRange
    )

    band = float(raw_scores["overall"])

    return ScoreWritingResponse(
        band=band,
        criteriaScores=criteria,
        feedback=feedback_str,
    )
