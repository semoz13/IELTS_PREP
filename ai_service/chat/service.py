from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

# Artifacts live inside ai_service/chat/artifacts/ by default.
# Override with CHAT_ARTIFACTS_DIR env var if needed.
ARTIFACTS_DIR = Path(os.getenv("CHAT_ARTIFACTS_DIR", Path(__file__).parent / "artifacts"))


def _load_and_fix_json(path: Path) -> list:
    encodings = ["utf-8", "cp1252", "latin-1"]
    content = None
    for enc in encodings:
        try:
            content = path.read_text(encoding=enc)
            break
        except Exception:
            continue
    if content is None:
        raise ValueError(f"Cannot read file: {path}")
    content = content.replace("\x96", "-").replace("\x93", '"').replace("\x94", '"')
    return json.loads(content)


def _keyword_boost(query: str, questions: List[str], base_scores: np.ndarray) -> np.ndarray:
    boosted = base_scores.astype(np.float32, copy=True)
    query_words = set(query.lower().split())
    for i, q in enumerate(questions):
        q_words = set(q.lower().split())
        overlap = len(query_words & q_words)
        boosted[i] += overlap * 0.02
    return boosted


@dataclass
class FAQIndex:
    questions: List[str]
    answers: List[str]
    embeddings: np.ndarray


@dataclass
class FrequentIndex:
    speaking: List[str]
    writing: List[str]
    all_top: List[str]


@dataclass
class Router:
    intent_embeddings: Dict[str, np.ndarray]
    frequent_keywords: List[str]
    faq_keywords: List[str]


class IELTSChatService:
    def __init__(self) -> None:
        self._faq: FAQIndex | None = None
        self._frequent: FrequentIndex | None = None
        self._router: Router | None = None
        self._models_loaded = False

    def load(self) -> None:
        from sentence_transformers import SentenceTransformer

        ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

        faq_index_path = ARTIFACTS_DIR / "faq_index.json"
        faq_emb_path   = ARTIFACTS_DIR / "faq_embeddings.npy"
        frequent_path  = ARTIFACTS_DIR / "frequent_index.json"

        if faq_index_path.exists() and faq_emb_path.exists():
            faq_data  = json.loads(faq_index_path.read_text(encoding="utf-8"))
            questions = faq_data["questions"]
            answers   = faq_data["answers"]
            embeddings = np.load(faq_emb_path)
            self._faq = FAQIndex(questions=questions, answers=answers, embeddings=embeddings)

        if frequent_path.exists():
            freq = json.loads(frequent_path.read_text(encoding="utf-8"))
            self._frequent = FrequentIndex(
                speaking=freq.get("speaking", []),
                writing=freq.get("writing", []),
                all_top=freq.get("all_top", []),
            )

        self._embed_model = SentenceTransformer("all-MiniLM-L6-v2")

        intent_examples = {
            "faq": [
                "What is IELTS?", "Explain IELTS exam", "Tell me about IELTS",
                "How does IELTS work?", "What is the IELTS test?",
                "How long is the IELTS exam?", "What is the test duration?",
                "How much time does IELTS take?", "What is a band score?",
                "How is IELTS scored?", "What does band 7 mean?",
                "How are scores calculated?", "How can I register for IELTS?",
                "How do I book the exam?", "How do I apply for IELTS?",
                "Where can I take IELTS?",
                "What is the difference between Academic and General?",
                "Should I take Academic or General IELTS?",
                "Which IELTS module do I need?", "Can I retake IELTS?",
                "How many times can I take IELTS?",
                "What is the speaking test like?",
                "What happens in IELTS writing?", "What sections are in IELTS?",
                "What is the passing score for IELTS?",
                "What score do universities require?",
                "How much does IELTS cost?", "What is the exam fee?",
            ],
            "frequent": [
                "Give me repeated IELTS questions", "Show me repeated questions",
                "Most repeated IELTS questions",
                "What are common IELTS speaking questions?",
                "Most common speaking topics", "Popular speaking topics",
                "Frequent writing topics", "Common writing task 2 questions",
                "Repeated writing essays", "Recent repeated questions in IELTS",
                "Latest repeated questions", "Questions from recent exams",
                "What topics come often in IELTS?",
                "What topics appear frequently?", "Topics asked many times",
                "Predicted IELTS questions", "Expected IELTS questions",
                "Likely topics in next exam", "Recent cue card topics",
                "Popular cue cards", "Repeated speaking cue cards",
                "What questions come in IELTS again and again?",
                "What questions are usually repeated?",
                "Give me recent speaking topics", "Give me recent writing topics",
            ],
        }

        intent_embeddings: Dict[str, np.ndarray] = {}
        for intent, examples in intent_examples.items():
            intent_embeddings[intent] = self._embed_model.encode(
                examples, normalize_embeddings=True
            )

        self._router = Router(
            intent_embeddings=intent_embeddings,
            frequent_keywords=[
                "repeated", "repeat", "common", "frequent", "popular",
                "predicted", "prediction", "recent topics", "cue card",
                "latest questions", "most asked", "common topics",
            ],
            faq_keywords=[
                "what is", "how does", "how long", "how much", "register",
                "book exam", "band score", "exam format", "cost", "fee",
                "difference between", "requirements",
            ],
        )

        self._faq_model = self._embed_model
        self._models_loaded = True

    @property
    def faq_ready(self) -> bool:
        return self._faq is not None and self._models_loaded

    @property
    def frequent_ready(self) -> bool:
        return self._frequent is not None

    def detect_intent(self, query: str) -> Tuple[str, float]:
        if not self._router or not self._models_loaded:
            raise RuntimeError("Service not loaded. Call load() first.")

        query_lower = query.lower()
        q_emb = self._embed_model.encode([query], normalize_embeddings=True)

        scores: Dict[str, float] = {}
        for intent, emb in self._router.intent_embeddings.items():
            sims = cosine_similarity(q_emb, emb)[0]
            scores[intent] = float(np.max(sims))

        if any(k in query_lower for k in self._router.frequent_keywords):
            scores["frequent"] = scores.get("frequent", 0.0) + 0.15
        if any(k in query_lower for k in self._router.faq_keywords):
            scores["faq"] = scores.get("faq", 0.0) + 0.15

        best_intent = max(scores, key=scores.get)
        confidence  = float(scores[best_intent])

        if confidence < 0.55:
            return "uncertain", confidence
        return best_intent, confidence

    def answer_faq(self, query: str, top_k: int = 5) -> str:
        if not self._faq or not self._models_loaded:
            return "FAQ index is not ready. Run: python chat/scripts/build_artifacts.py"

        q_emb = self._faq_model.encode([query], normalize_embeddings=True)
        sims  = cosine_similarity(q_emb, self._faq.embeddings)[0]
        sims  = _keyword_boost(query, self._faq.questions, sims)

        top_indices = np.argsort(sims)[-top_k:][::-1]
        best_idx    = int(top_indices[0])
        return self._faq.answers[best_idx]

    def answer_frequent(self, query: str) -> str:
        if not self._frequent:
            return "Frequent questions index is not ready. Run: python chat/scripts/build_artifacts.py"

        q = query.lower()
        if "speaking" in q:
            data = self._frequent.speaking or self._frequent.all_top
        elif "writing" in q:
            data = self._frequent.writing or self._frequent.all_top
        elif "most frequent" in q:
            data = self._frequent.all_top
        else:
            data = self._frequent.all_top

        if not data:
            return "No frequent questions available in artifacts."

        return "\n".join(f"{i+1}. {text}" for i, text in enumerate(data[:10]))

    def chat(self, query: str, top_k_faq: int = 5) -> Tuple[str, float, str]:
        intent, confidence = self.detect_intent(query)
        if intent == "faq":
            return intent, confidence, self.answer_faq(query, top_k=top_k_faq)
        if intent == "frequent":
            return intent, confidence, self.answer_frequent(query)
        return (
            "uncertain",
            confidence,
            "Could you clarify your request:\n\n1. IELTS exam information\n2. Frequently repeated IELTS questions",
        )


service = IELTSChatService()
