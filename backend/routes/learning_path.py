"""
FastAPI routes for learning path generation endpoints.
"""
import logging
from fastapi import APIRouter, HTTPException, status
from models.learning_path import LearningPathRequest, LearningPathResponse
from services.learning_path import LearningPathService
from exceptions import (
    OpenRouterAPIError,
    ValidationError,
    LearningPathGenerationError,
    ConfigurationError,
    RateLimitError,
    AuthenticationError,
    ServiceUnavailableError
)

logger = logging.getLogger(__name__)

# Create router for learning path endpoints
router = APIRouter(prefix="/api", tags=["learning-path"])

# Initialize service (will be dependency injected in production)
learning_path_service = LearningPathService()


@router.post(
    "/learning-path",
    response_model=LearningPathResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate personalized learning path",
    description="Create a structured learning path based on goals, skill level, and desired duration."
)
async def generate_learning_path(request: LearningPathRequest) -> LearningPathResponse:
    """
    Generate a personalized learning path based on goals and skill level.
    
    Args:
        request: LearningPathRequest with goals, skill_level, duration, and focus_areas
        
    Returns:
        LearningPathResponse with structured learning path
        
    Raises:
        HTTPException: For various error conditions
    """
    try:
        logger.info(f"Received learning path request for {request.skill_level} level, {request.duration} duration")
        
        # Call learning path service
        response = await learning_path_service.generate_path(
            goals=request.goals,
            skill_level=request.skill_level,
            duration=request.duration,
            focus_areas=request.focus_areas
        )
        
        logger.info(f"Successfully generated learning path with {len(response.phases)} phases and {len(response.resources)} resources")
        return response
        
    except (ValidationError, LearningPathGenerationError, OpenRouterAPIError, RateLimitError, 
            AuthenticationError, ServiceUnavailableError, ConfigurationError) as e:
        # Let custom exceptions propagate to global exception handlers
        logger.error(f"Service error: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during learning path generation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing your request."
        )


@router.get(
    "/learning-path/options",
    summary="Get available options for learning path generation",
    description="Retrieve valid skill levels and duration options for learning path requests."
)
async def get_learning_path_options():
    """
    Get available options for learning path generation.
    
    Returns:
        Dictionary with valid skill levels and durations
    """
    return {
        "skill_levels": ["beginner", "intermediate", "advanced"],
        "durations": ["1-week", "1-month", "3-months", "6-months"],
        "skill_level_descriptions": {
            "beginner": "New to the subject with little to no prior experience",
            "intermediate": "Some experience with basic concepts and looking to expand knowledge",
            "advanced": "Experienced practitioner looking to master advanced concepts"
        },
        "duration_descriptions": {
            "1-week": "Intensive crash course covering essential basics",
            "1-month": "Comprehensive introduction with hands-on practice",
            "3-months": "In-depth learning with project-based application",
            "6-months": "Mastery-focused path with advanced topics and specialization"
        }
    }


@router.post(
    "/learning-path/validate",
    summary="Validate learning path request parameters",
    description="Validate goals, skill level, and duration before generating a learning path."
)
async def validate_learning_path_request(request: LearningPathRequest):
    """
    Validate learning path request parameters without generating the path.
    
    Args:
        request: LearningPathRequest to validate
        
    Returns:
        Validation result with processed goal information
        
    Raises:
        HTTPException: If validation fails
    """
    try:
        # Validate skill level
        if not learning_path_service.validate_skill_level(request.skill_level):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid skill level: {request.skill_level}. Must be one of: beginner, intermediate, advanced"
            )
        
        # Validate duration
        if not learning_path_service.validate_duration(request.duration):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid duration: {request.duration}. Must be one of: 1-week, 1-month, 3-months, 6-months"
            )
        
        # Process goals
        goal_analysis = learning_path_service.process_goals(request.goals)
        
        return {
            "valid": True,
            "message": "Request parameters are valid",
            "goal_analysis": goal_analysis,
            "estimated_phases": learning_path_service.duration_phases[request.duration]["phases"],
            "phase_duration": learning_path_service.duration_phases[request.duration]["phase_duration"]
        }
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Validation failed: {str(e)}"
        )


@router.get(
    "/learning-path/health",
    summary="Health check for learning path service",
    description="Check if the learning path service is working properly."
)
async def learning_path_health_check():
    """
    Health check endpoint for learning path service.
    
    Returns:
        Health status of the learning path service
    """
    try:
        is_healthy = await learning_path_service.health_check()
        
        if is_healthy:
            return {
                "status": "healthy",
                "service": "learning-path",
                "message": "Learning path service is working properly"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Learning path service is not responding properly"
            )
            
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Learning path service health check failed"
        )