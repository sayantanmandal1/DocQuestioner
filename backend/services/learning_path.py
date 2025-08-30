"""
Learning path generation service with OpenRouter integration.
"""
import json
import logging
from typing import List, Dict, Any, Optional
from clients.openrouter import OpenRouterClient
from models.learning_path import (
    LearningPathRequest, 
    LearningPathResponse, 
    LearningPhase, 
    Resource
)
from exceptions import (
    OpenRouterAPIError,
    ValidationError,
    LearningPathGenerationError,
    ConfigurationError
)
from middleware import log_service_error

logger = logging.getLogger(__name__)


class LearningPathService:
    """
    Service for generating personalized learning paths based on goals and skill level.
    """
    
    def __init__(self, openrouter_client: Optional[OpenRouterClient] = None):
        """
        Initialize learning path service.
        
        Args:
            openrouter_client: OpenRouter client instance. If None, creates a new one.
        """
        try:
            self.client = openrouter_client or OpenRouterClient()
        except ConfigurationError as e:
            log_service_error("LearningPathService", "__init__", e)
            raise
        
        # Valid skill levels and durations for validation
        self.valid_skill_levels = {"beginner", "intermediate", "advanced"}
        self.valid_durations = {"1-week", "1-month", "3-months", "6-months"}
        
        # Duration to phase mapping for structured planning
        self.duration_phases = {
            "1-week": {"phases": 2, "phase_duration": "3-4 days"},
            "1-month": {"phases": 4, "phase_duration": "1 week"},
            "3-months": {"phases": 6, "phase_duration": "2 weeks"},
            "6-months": {"phases": 8, "phase_duration": "3 weeks"}
        }
    
    async def generate_path(
        self, 
        goals: str, 
        skill_level: str, 
        duration: str, 
        focus_areas: Optional[List[str]] = None
    ) -> LearningPathResponse:
        """
        Generate a personalized learning path based on goals and skill level.
        
        Args:
            goals: Learning goals and objectives
            skill_level: Current skill level (beginner, intermediate, advanced)
            duration: Desired duration (1-week, 1-month, 3-months, 6-months)
            focus_areas: Optional list of specific focus areas
            
        Returns:
            LearningPathResponse with structured learning path
            
        Raises:
            ValueError: If parameters are invalid
            OpenRouterAPIError: If API request fails
        """
        # Validate inputs
        self._validate_inputs(goals, skill_level, duration)
        
        try:
            # Generate structured learning path using AI
            raw_response = await self._generate_raw_path(goals, skill_level, duration, focus_areas)
            
            # Parse and structure the response
            structured_path = await self._create_structured_path(
                raw_response, goals, skill_level, duration
            )
            
            return structured_path
            
        except OpenRouterAPIError as e:
            logger.error(f"OpenRouter API error during learning path generation: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error during learning path generation: {e}")
            raise ValueError(f"Learning path generation failed: {str(e)}")
    
    def _validate_inputs(self, goals: str, skill_level: str, duration: str) -> None:
        """
        Validate input parameters for learning path generation.
        
        Args:
            goals: Learning goals
            skill_level: Skill level
            duration: Duration
            
        Raises:
            ValueError: If any parameter is invalid
        """
        if not goals or len(goals.strip()) < 10:
            raise ValueError("Goals must be at least 10 characters long")
        
        if len(goals) > 1000:
            raise ValueError("Goals must be less than 1000 characters")
        
        if skill_level not in self.valid_skill_levels:
            raise ValueError(f"Skill level must be one of: {', '.join(self.valid_skill_levels)}")
        
        if duration not in self.valid_durations:
            raise ValueError(f"Duration must be one of: {', '.join(self.valid_durations)}")
    
    async def _generate_raw_path(
        self, 
        goals: str, 
        skill_level: str, 
        duration: str, 
        focus_areas: Optional[List[str]]
    ) -> str:
        """
        Generate raw learning path content using AI.
        
        Args:
            goals: Learning goals
            skill_level: Skill level
            duration: Duration
            focus_areas: Focus areas
            
        Returns:
            Raw AI-generated learning path content
        """
        prompt = self._build_learning_path_prompt(goals, skill_level, duration, focus_areas)
        
        messages = [
            {
                "role": "system", 
                "content": "You are an expert learning path designer and educational consultant. Create comprehensive, structured learning paths that are practical, achievable, and tailored to the learner's goals and skill level."
            },
            {"role": "user", "content": prompt}
        ]
        
        # Use higher max_tokens for detailed learning paths
        max_tokens = 2000
        
        response = await self.client.chat_completion(
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.7  # Balanced creativity and consistency
        )
        
        return response.strip()
    
    def _build_learning_path_prompt(
        self, 
        goals: str, 
        skill_level: str, 
        duration: str, 
        focus_areas: Optional[List[str]]
    ) -> str:
        """
        Build the prompt for learning path generation.
        
        Args:
            goals: Learning goals
            skill_level: Skill level
            duration: Duration
            focus_areas: Focus areas
            
        Returns:
            Formatted prompt
        """
        phase_info = self.duration_phases[duration]
        focus_text = f"\nSpecific focus areas: {', '.join(focus_areas)}" if focus_areas else ""
        
        prompt = f"""Create a comprehensive learning path with the following specifications:

**Learning Goals:** {goals}
**Current Skill Level:** {skill_level}
**Duration:** {duration}
**Number of Phases:** {phase_info['phases']}
**Phase Duration:** {phase_info['phase_duration']}{focus_text}

Please provide a structured learning path in the following JSON format:

{{
    "title": "Descriptive title for the learning path",
    "phases": [
        {{
            "phase_number": 1,
            "title": "Phase title",
            "description": "What the learner will accomplish in this phase",
            "duration": "{phase_info['phase_duration']}",
            "objectives": ["Specific learning objective 1", "Specific learning objective 2"],
            "activities": ["Practical activity 1", "Practical activity 2", "Practical activity 3"]
        }}
    ],
    "resources": [
        {{
            "title": "Resource title",
            "type": "book|video|tutorial|documentation|course",
            "url": "https://example.com (if available)",
            "description": "Brief description of the resource"
        }}
    ]
}}

Requirements:
- Create exactly {phase_info['phases']} phases
- Each phase should build upon the previous one
- Include 3-5 specific objectives per phase
- Include 3-6 practical activities per phase
- Recommend 5-10 high-quality learning resources
- Tailor content to {skill_level} level
- Ensure activities are hands-on and practical
- Include a mix of resource types (books, videos, tutorials, etc.)
- Make objectives measurable and achievable

Respond with valid JSON only, no additional text."""
        
        return prompt
    
    async def _create_structured_path(
        self, 
        raw_response: str, 
        goals: str, 
        skill_level: str, 
        duration: str
    ) -> LearningPathResponse:
        """
        Parse raw AI response and create structured learning path.
        
        Args:
            raw_response: Raw AI response
            goals: Original learning goals
            skill_level: Skill level
            duration: Duration
            
        Returns:
            Structured LearningPathResponse
        """
        try:
            # Try to parse JSON response
            parsed_data = json.loads(raw_response)
            
            # Extract and validate phases
            phases = []
            for phase_data in parsed_data.get("phases", []):
                phase = LearningPhase(
                    phase_number=phase_data.get("phase_number", 1),
                    title=phase_data.get("title", "Learning Phase"),
                    description=phase_data.get("description", ""),
                    duration=phase_data.get("duration", "1 week"),
                    objectives=phase_data.get("objectives", []),
                    activities=phase_data.get("activities", [])
                )
                phases.append(phase)
            
            # Extract and validate resources
            resources = []
            for resource_data in parsed_data.get("resources", []):
                resource = Resource(
                    title=resource_data.get("title", "Learning Resource"),
                    type=resource_data.get("type", "tutorial"),
                    url=resource_data.get("url"),
                    description=resource_data.get("description")
                )
                resources.append(resource)
            
            # Create response
            return LearningPathResponse(
                title=parsed_data.get("title", f"Learning Path: {goals[:50]}..."),
                duration=duration,
                skill_level=skill_level,
                phases=phases,
                resources=resources
            )
            
        except json.JSONDecodeError:
            logger.warning("Failed to parse JSON response, creating fallback structure")
            return await self._create_fallback_path(raw_response, goals, skill_level, duration)
        except Exception as e:
            logger.error(f"Error creating structured path: {e}")
            return await self._create_fallback_path(raw_response, goals, skill_level, duration)
    
    async def _create_fallback_path(
        self, 
        raw_response: str, 
        goals: str, 
        skill_level: str, 
        duration: str
    ) -> LearningPathResponse:
        """
        Create a fallback learning path when JSON parsing fails.
        
        Args:
            raw_response: Raw response text
            goals: Learning goals
            skill_level: Skill level
            duration: Duration
            
        Returns:
            Basic LearningPathResponse
        """
        phase_info = self.duration_phases[duration]
        
        # Create basic phases based on duration
        phases = []
        for i in range(phase_info["phases"]):
            phase = LearningPhase(
                phase_number=i + 1,
                title=f"Phase {i + 1}: Learning Fundamentals",
                description=f"Focus on core concepts and practical application for phase {i + 1}",
                duration=phase_info["phase_duration"],
                objectives=[
                    f"Complete foundational learning for phase {i + 1}",
                    f"Apply knowledge through practical exercises",
                    f"Build upon previous phase knowledge"
                ],
                activities=[
                    "Study relevant materials",
                    "Complete practical exercises",
                    "Review and practice concepts"
                ]
            )
            phases.append(phase)
        
        # Create basic resources
        resources = [
            Resource(
                title="Online Documentation",
                type="documentation",
                url=None,
                description="Official documentation and guides"
            ),
            Resource(
                title="Video Tutorials",
                type="video",
                url=None,
                description="Step-by-step video tutorials"
            ),
            Resource(
                title="Practice Exercises",
                type="tutorial",
                url=None,
                description="Hands-on practice exercises"
            )
        ]
        
        return LearningPathResponse(
            title=f"Learning Path: {goals[:50]}{'...' if len(goals) > 50 else ''}",
            duration=duration,
            skill_level=skill_level,
            phases=phases,
            resources=resources
        )
    
    def validate_skill_level(self, skill_level: str) -> bool:
        """
        Validate if skill level is acceptable.
        
        Args:
            skill_level: Skill level to validate
            
        Returns:
            True if skill level is valid
        """
        return skill_level in self.valid_skill_levels
    
    def validate_duration(self, duration: str) -> bool:
        """
        Validate if duration is acceptable.
        
        Args:
            duration: Duration to validate
            
        Returns:
            True if duration is valid
        """
        return duration in self.valid_durations
    
    def process_goals(self, goals: str) -> Dict[str, Any]:
        """
        Process and analyze learning goals for better path generation.
        
        Args:
            goals: Raw learning goals text
            
        Returns:
            Dictionary with processed goal information
        """
        processed = {
            "original": goals,
            "length": len(goals),
            "word_count": len(goals.split()),
            "has_specific_technologies": False,
            "has_timeframe": False,
            "complexity_level": "medium"
        }
        
        # Check for specific technologies or frameworks
        tech_keywords = [
            "python", "javascript", "react", "fastapi", "django", "flask",
            "nodejs", "typescript", "vue", "angular", "docker", "kubernetes",
            "aws", "azure", "gcp", "sql", "mongodb", "postgresql"
        ]
        
        goals_lower = goals.lower()
        for keyword in tech_keywords:
            if keyword in goals_lower:
                processed["has_specific_technologies"] = True
                break
        
        # Check for timeframe mentions
        timeframe_keywords = ["week", "month", "year", "quickly", "fast", "slow", "gradual"]
        for keyword in timeframe_keywords:
            if keyword in goals_lower:
                processed["has_timeframe"] = True
                break
        
        # Assess complexity based on length and content
        if processed["word_count"] > 50 or "advanced" in goals_lower or "complex" in goals_lower:
            processed["complexity_level"] = "high"
        elif processed["word_count"] < 20 or "basic" in goals_lower or "simple" in goals_lower:
            processed["complexity_level"] = "low"
        
        return processed
    
    async def health_check(self) -> bool:
        """
        Check if the learning path service is working properly.
        
        Returns:
            True if service is healthy
        """
        try:
            test_goals = "Learn basic programming concepts and build a simple web application"
            response = await self.generate_path(
                goals=test_goals,
                skill_level="beginner",
                duration="1-month"
            )
            return len(response.phases) > 0 and len(response.resources) > 0
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False