from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel

from confidence.inference import predict, load_confidence_model

router = APIRouter(prefix="/confidence", tags=["Confidence"])


def load_confidence_model_external() -> None:
    """Alias used by main.py lifespan to load the model at startup."""
    load_confidence_model()


class ConfidenceResponse(BaseModel):
    label:         str
    probabilities: dict


@router.post("/analyze", response_model=ConfidenceResponse)
async def analyze_confidence(audio: UploadFile = File(...)) -> ConfidenceResponse:
    """
    Accepts a .wav audio file and returns a speaking confidence prediction.

    - label:         "Confident" | "Nervous" | "Uncertain"
    - probabilities: {label: float, ...} — all probabilities sum to 1.0

    Used optionally by teachers reviewing speaking submissions.
    """
    if not audio.filename or not audio.filename.lower().endswith(".wav"):
        raise HTTPException(400, "Only .wav files are accepted.")

    # Write to a temp file so librosa can read it
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name

    try:
        label, probs = predict(tmp_path)
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception as e:
        raise HTTPException(500, f"Feature extraction failed: {e}")
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    return ConfidenceResponse(label=label, probabilities=probs)
