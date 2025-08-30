"""
Pydantic models for text summarization requests and responses.
"""
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class SummarizationRequest(BaseModel):
    """Request model for text summarization."""
    text: str = Field(
        ..., 
        min_length=10, 
        max_length=10000,
        description="Text content to be summarized"
    )
    max_length: Optional[int] = Field(
        150, 
        ge=50, 
        le=500,
        description="Maximum length of the summary in words"
    )
    style: Optional[str] = Field(
        "concise", 
        pattern="^(concise|detailed|bullet-points)$",
        description="Style of summarization: concise, detailed, or bullet-points"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "text": "This is a long text that needs to be summarized. It contains multiple sentences and paragraphs with important information that should be condensed into a shorter format.",
                "max_length": 150,
                "style": "concise"
            }
        }
    )


class SummarizationResponse(BaseModel):
    """Response model for text summarization."""
    summary: str = Field(..., description="The generated summary")
    original_length: int = Field(..., description="Length of original text in characters")
    summary_length: int = Field(..., description="Length of summary in characters")
    compression_ratio: float = Field(..., description="Ratio of summary length to original length")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "summary": "This is a concise summary of the original text highlighting the key points.",
                "original_length": 150,
                "summary_length": 75,
                "compression_ratio": 0.5
            }
        }
    )