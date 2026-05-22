from __future__ import annotations

from fastapi import APIRouter, HTTPException

from chat.schemas import ChatRequest, ChatResponse, HealthResponse
from chat.service import service


router = APIRouter(tags=["Chat"])


def load_chat_service() -> None:
    """Called once at startup by main.py lifespan."""
    service.load()


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        faq_ready=service.faq_ready,
        frequent_ready=service.frequent_ready,
    )


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    if not service.faq_ready and not service.frequent_ready:
        raise HTTPException(
            status_code=503,
            detail=(
                "Chat service artifacts not ready. "
                "Run: python chat/scripts/build_artifacts.py"
            ),
        )

    intent, confidence, text = service.chat(req.query, top_k_faq=req.top_k_faq)
    return ChatResponse(intent=intent, confidence=min(confidence, 1.0), response=text)
