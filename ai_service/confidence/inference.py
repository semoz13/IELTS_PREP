"""
Confidence inference — extracted from Rami's notebook.

Extracts 100 audio features using librosa (matching the feature set the SVM was trained on):
  - MFCC mean (40) + std (40)
  - Chroma mean (12)
  - ZCR (1)
  - RMS mean (1) + std (1)
  - Spectral centroid (1)
  - Spectral rolloff (1)
  - Pitch mean (1) + std (1)
  - Pause rate (1)
  Total: 100 features

Model: SVM (sklearn) — exp1_model.pkl
Classes: Confident | Nervous | Uncertain

TODO: The original notebook's feature extraction used duration=4.0 and offset=0.3.
      Longer recordings are truncated to 4s. Consider adjusting if needed.
"""
from __future__ import annotations

import os
from pathlib import Path

import joblib
import numpy as np

_MODEL_DEFAULT = Path(__file__).parent / "exp1_model.pkl"
MODEL_PATH     = Path(os.getenv("CONFIDENCE_MODEL_PATH", str(_MODEL_DEFAULT)))

_model   = None
_classes = None


def load_confidence_model() -> None:
    global _model, _classes
    pipeline = joblib.load(MODEL_PATH)
    _model   = pipeline
    # sklearn SVM exposes classes_ on the classifier step
    if hasattr(pipeline, "classes_"):
        _classes = list(pipeline.classes_)
    elif hasattr(pipeline, "steps"):
        for _, step in pipeline.steps:
            if hasattr(step, "classes_"):
                _classes = list(step.classes_)
                break
    if _classes is None:
        _classes = ["Confident", "Nervous", "Uncertain"]


def extract_features(filepath: str) -> np.ndarray:
    """Extract 100-feature vector from a WAV file (matches Rami's training set-up)."""
    import librosa

    y, sr = librosa.load(filepath, sr=22050, duration=4.0, offset=0.3)
    if len(y) < sr * 0.5:
        raise ValueError("Audio too short (< 0.5 s).")

    mfcc        = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=40)
    mfcc_mean   = np.mean(mfcc, axis=1)        # 40
    mfcc_std    = np.std(mfcc,  axis=1)        # 40
    chroma      = librosa.feature.chroma_stft(y=y, sr=sr)
    chroma_mean = np.mean(chroma, axis=1)      # 12
    zcr         = np.array([np.mean(librosa.feature.zero_crossing_rate(y))])  # 1
    rms         = librosa.feature.rms(y=y)
    rms_mean    = np.array([np.mean(rms)])     # 1
    rms_std     = np.array([np.std(rms)])      # 1
    sc          = np.array([np.mean(librosa.feature.spectral_centroid(y=y, sr=sr))])   # 1
    sr_         = np.array([np.mean(librosa.feature.spectral_rolloff(y=y, sr=sr))])    # 1

    try:
        f0, vf, _ = librosa.pyin(y, fmin=75, fmax=500, sr=sr)
        f0v        = f0[vf] if vf is not None else np.array([])
        pitch_mean = np.array([np.mean(f0v) if len(f0v) > 0 else 0.0])  # 1
        pitch_std  = np.array([np.std(f0v)  if len(f0v) > 0 else 0.0])  # 1
    except Exception:
        pitch_mean = np.array([0.0])
        pitch_std  = np.array([0.0])

    intervals  = librosa.effects.split(y, top_db=25)
    speech_dur = sum([(e - s) for s, e in intervals]) / sr
    pause_rate = np.array([1.0 - (speech_dur / (len(y) / sr))])          # 1

    return np.hstack([
        mfcc_mean, mfcc_std, chroma_mean,
        zcr, rms_mean, rms_std, sc, sr_,
        pitch_mean, pitch_std, pause_rate,
    ])


def predict(filepath: str) -> tuple[str, dict]:
    """
    Returns (label, probabilities_dict).
    Raises RuntimeError if model not loaded.
    """
    if _model is None:
        raise RuntimeError("Confidence model not loaded. Call load_confidence_model() first.")

    features = extract_features(filepath).reshape(1, -1)
    label    = _model.predict(features)[0]

    if hasattr(_model, "predict_proba"):
        proba = _model.predict_proba(features)[0]
        probs = {cls: float(p) for cls, p in zip(_classes, proba)}
    else:
        # SVM without probability=True — return 1.0 for predicted class
        probs = {cls: (1.0 if cls == label else 0.0) for cls in _classes}

    return str(label), probs
