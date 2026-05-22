from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, description="User message/query.")
    top_k_faq: int = Field(5, ge=1, le=20, description="Top-k FAQ candidates.")


Intent = Literal["faq", "frequent", "uncertain"]


class ChatResponse(BaseModel):
    intent: Intent
    confidence: float = Field(..., ge=0.0, le=1.0)
    response: str
    details: Optional[dict] = None


class HealthResponse(BaseModel):
    status: Literal["ok"]
    faq_ready: bool
    frequent_ready: bool
