"""
Pydantic models for learning path generation requests and responses.
"""
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class LearningPathRequest(BaseModel):
    """Request model for learning path generation."""
    goals: str = Field(
        ..., 
        min_length=10, 
        max_length=1000,
        description="Learning goals and objectives"
    )
    skill_level: str = Field(
        ..., 
        pattern="^(beginner|intermediate|advanced)$",
        description="Current skill level: beginner, intermediate, or advanced"
    )
    duration: str = Field(
        ..., 
        pattern="^(1-week|1-month|3-months|6-months)$",
        description="Desired duration for the learning path"
    )
    focus_areas: Optional[List[str]] = Field(
        [],
        description="Specific areas or topics to focus on"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "goals": "Learn Python web development with FastAPI and build REST APIs",
                "skill_level": "beginner",
                "duration": "3-months",
                "focus_areas": ["FastAPI", "REST APIs", "Database integration"]
            }
        }
    )


class Resource(BaseModel):
    """Model for learning resources."""
    title: str = Field(..., description="Title of the resource")
    type: str = Field(..., description="Type of resource (book, video, tutorial, etc.)")
    url: Optional[str] = Field(None, description="URL to the resource")
    description: Optional[str] = Field(None, description="Brief description of the resource")


class LearningPhase(BaseModel):
    """Model for a phase in the learning path."""
    phase_number: int = Field(..., ge=1, description="Phase number in the learning path")
    title: str = Field(..., description="Title of the learning phase")
    description: str = Field(..., description="Description of what will be learned in this phase")
    duration: str = Field(..., description="Estimated duration for this phase")
    objectives: List[str] = Field(..., description="Learning objectives for this phase")
    activities: List[str] = Field(..., description="Recommended activities and exercises")


class LearningPathResponse(BaseModel):
    """Response model for learning path generation."""
    title: str = Field(..., description="Title of the learning path")
    duration: str = Field(..., description="Total duration of the learning path")
    skill_level: str = Field(..., description="Target skill level")
    phases: List[LearningPhase] = Field(..., description="List of learning phases")
    resources: List[Resource] = Field(..., description="Recommended learning resources")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Python Web Development with FastAPI",
                "duration": "3-months",
                "skill_level": "beginner",
                "phases": [
                    {
                        "phase_number": 1,
                        "title": "Python Fundamentals",
                        "description": "Learn Python basics and programming concepts",
                        "duration": "3-weeks",
                        "objectives": ["Understand Python syntax", "Learn data structures"],
                        "activities": ["Complete Python tutorials", "Build simple scripts"]
                    }
                ],
                "resources": [
                    {
                        "title": "FastAPI Documentation",
                        "type": "documentation",
                        "url": "https://fastapi.tiangolo.com/",
                        "description": "Official FastAPI documentation"
                    }
                ]
            }
        }
    )