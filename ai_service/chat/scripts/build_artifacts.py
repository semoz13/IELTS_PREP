"""
Build Basel chat artifacts.

Run from the ai_service/ root:
    python chat/scripts/build_artifacts.py

Outputs (written to chat/artifacts/):
    faq_index.json
    faq_embeddings.npy
    frequent_index.json
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import List, Tuple

import numpy as np

# Resolve paths relative to this script so it works from any cwd.
SCRIPT_DIR    = Path(__file__).parent
CHAT_DIR      = SCRIPT_DIR.parent
ARTIFACTS_DIR = CHAT_DIR / "artifacts"
FAQ_JSON      = CHAT_DIR / "ielts_dataset.json"


def load_and_fix_json(path: Path) -> list:
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


def clean_text(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[^a-zA-Z0-9?,.! ]", "", text)
    return text


def build_faq(faq_json_path: Path, artifacts_dir: Path) -> None:
    from sentence_transformers import SentenceTransformer

    if not faq_json_path.exists():
        print(f"ERROR: {faq_json_path} not found.", file=sys.stderr)
        sys.exit(1)

    data = load_and_fix_json(faq_json_path)

    questions: List[str] = []
    answers:   List[str] = []
    for item in data:
        ans = item.get("answer", "")
        for q in item.get("questions", []):
            if not q:
                continue
            questions.append(str(q))
            answers.append(str(ans))

    model = SentenceTransformer("all-MiniLM-L6-v2")
    emb   = model.encode(questions, normalize_embeddings=True, show_progress_bar=True)
    emb   = np.asarray(emb, dtype=np.float32)

    artifacts_dir.mkdir(parents=True, exist_ok=True)
    (artifacts_dir / "faq_index.json").write_text(
        json.dumps({"questions": questions, "answers": answers}, ensure_ascii=False),
        encoding="utf-8",
    )
    np.save(artifacts_dir / "faq_embeddings.npy", emb)
    print(f"FAQ: {len(questions)} Q/A pairs indexed.")


def _load_dorat_questions(limit_writing: int = 3000) -> Tuple[List[str], List[str]]:
    from datasets import load_dataset

    speaking       = load_dataset("qwertyuiopasdfg/IELTs-Speaking-answer")
    speaking_q     = [str(x) for x in speaking["train"]["instruction"] if x]

    writing_large  = load_dataset("nlpatunt/D_Ielts_Writing_Task_2_Dataset", streaming=True)
    writing_q: List[str] = []
    for row in writing_large["train"]:
        p = row.get("prompt")
        if p:
            writing_q.append(str(p))
        if len(writing_q) >= limit_writing:
            break

    return speaking_q, writing_q


def build_frequent(artifacts_dir: Path, limit_writing: int = 3000) -> None:
    import pandas as pd
    import hdbscan
    from bertopic import BERTopic
    from sentence_transformers import SentenceTransformer
    from umap import UMAP

    speaking_q, writing_q = _load_dorat_questions(limit_writing=limit_writing)

    df_s = pd.DataFrame({"question": speaking_q, "source": "speaking"})
    df_w = pd.DataFrame({"question": writing_q,  "source": "writing"})
    all_questions = pd.concat([df_s, df_w], ignore_index=True)

    all_questions["question"] = all_questions["question"].astype(str).map(clean_text)
    all_questions = all_questions.drop_duplicates(subset=["question"]).reset_index(drop=True)
    questions = all_questions["question"].tolist()

    embedder   = SentenceTransformer("all-mpnet-base-v2")
    embeddings = embedder.encode(questions, normalize_embeddings=True, show_progress_bar=True)

    umap_model    = UMAP(n_neighbors=30, n_components=10, metric="cosine", min_dist=0.05)
    cluster_model = hdbscan.HDBSCAN(min_cluster_size=12, prediction_data=True)
    topic_model   = BERTopic(umap_model=umap_model, hdbscan_model=cluster_model)

    topics, _    = topic_model.fit_transform(questions, embeddings)
    all_questions["topic"] = topics

    topic_freq = (
        all_questions.groupby(["source", "topic"])
        .size()
        .reset_index(name="frequency")
    )
    topic_freq = topic_freq[topic_freq["topic"] != -1]

    representatives = topic_model.get_representative_docs()

    results = []
    for row in topic_freq.itertuples(index=False):
        topic_id = int(row.topic)
        rep_docs = representatives.get(topic_id) or []
        rep      = rep_docs[0] if rep_docs else ""
        results.append({"source": str(row.source), "topic": topic_id,
                        "frequency": int(row.frequency), "question": rep})

    results_df = pd.DataFrame(results)
    if results_df.empty:
        payload = {"speaking": [], "writing": [], "all_top": []}
    else:
        def _top(source: str, n: int = 20) -> List[str]:
            data = (
                results_df[results_df["source"] == source]
                .sort_values(by="frequency", ascending=False)
                .head(n)
            )
            return [str(x) for x in data["question"].tolist() if x]

        payload = {
            "speaking": _top("speaking"),
            "writing":  _top("writing"),
            "all_top":  [
                q for q in
                results_df.sort_values(by="frequency", ascending=False)
                          .head(20)["question"].astype(str).tolist()
                if q
            ],
        }

    artifacts_dir.mkdir(parents=True, exist_ok=True)
    (artifacts_dir / "frequent_index.json").write_text(
        json.dumps(payload, ensure_ascii=False), encoding="utf-8"
    )
    print(f"Frequent: {len(payload['speaking'])} speaking, {len(payload['writing'])} writing topics.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Build Basel chat artifacts.")
    parser.add_argument("--faq-json",      default=str(FAQ_JSON))
    parser.add_argument("--artifacts-dir", default=str(ARTIFACTS_DIR))
    parser.add_argument("--limit-writing", type=int, default=3000)
    args = parser.parse_args()

    artifacts_dir  = Path(args.artifacts_dir)
    faq_json_path  = Path(args.faq_json)

    print(f"Building FAQ from: {faq_json_path}")
    build_faq(faq_json_path=faq_json_path, artifacts_dir=artifacts_dir)

    print("Building frequent topics (this can take a while)...")
    build_frequent(artifacts_dir=artifacts_dir, limit_writing=args.limit_writing)

    print(f"Done. Artifacts in: {artifacts_dir.resolve()}")


if __name__ == "__main__":
    main()
