"""
Pydantic models for document Q&A requests and responses.
"""
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict


class QARequest(BaseModel):
    """Request model for document Q&A."""
    question: str = Field(
        ..., 
        min_length=5, 
        max_length=500,
        description="Question to be answered based on the document"
    )
    document_text: Optional[str] = Field(
        None,
        description="Text content of the document (used when document is provided as text)"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "question": "What are the main benefits of using FastAPI?",
                "document_text": "FastAPI is a modern, fast web framework for building APIs with Python 3.7+ based on standard Python type hints. It provides automatic API documentation, high performance, and easy testing capabilities."
            }
        }
    )


class QAResponse(BaseModel):
    """Response model for document Q&A."""
    answer: str = Field(..., description="Generated answer to the question")
    confidence: Optional[float] = Field(
        None, 
        ge=0.0, 
        le=1.0,
        description="Confidence score of the answer (0.0 to 1.0)"
    )
    sources: Optional[List[str]] = Field(
        None,
        description="List of relevant text snippets from the document that support the answer"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "answer": "The main benefits of FastAPI include automatic API documentation, high performance, and easy testing capabilities based on standard Python type hints.",
                "confidence": 0.95,
                "sources": [
                    "FastAPI is a modern, fast web framework for building APIs",
                    "It provides automatic API documentation, high performance, and easy testing capabilities"
                ]
            }
        }
    )