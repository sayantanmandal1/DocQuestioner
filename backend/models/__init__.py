"""
Pydantic models for AI microservices.
"""
from .summarization import SummarizationRequest, SummarizationResponse
from .qa import QARequest, QAResponse
from .learning_path import (
    LearningPathRequest, 
    LearningPathResponse, 
    LearningPhase, 
    Resource
)

__all__ = [
    "SummarizationRequest",
    "SummarizationResponse", 
    "QARequest",
    "QAResponse",
    "LearningPathRequest",
    "LearningPathResponse",
    "LearningPhase",
    "Resource"
]