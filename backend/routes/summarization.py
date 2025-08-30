"""
FastAPI routes for text summarization endpoints.
"""
import logging
from fastapi import APIRouter, HTTPException, status
from models.summarization import SummarizationRequest, SummarizationResponse
from services.summarization import SummarizationService
from exceptions import (
    OpenRouterAPIError,
    ValidationError,
    TextProcessingError,
    ConfigurationError,
    RateLimitError,
    AuthenticationError,
    ServiceUnavailableError
)

logger = logging.getLogger(__name__)

# Create router for summarization endpoints
router = APIRouter(prefix="/api", tags=["summarization"])

# Initialize service (will be dependency injected in production)
summarization_service = SummarizationService()


@router.post(
    "/summarize",
    response_model=SummarizationResponse,
    status_code=status.HTTP_200_OK,
    summary="Summarize text content",
    description="Generate a summary of the provided text with customizable length and style options."
)
async def summarize_text(request: SummarizationRequest) -> SummarizationResponse:
    """
    Summarize text content with automatic chunking for large documents.
    
    Args:
        request: SummarizationRequest with text, max_length, and style
        
    Returns:
        SummarizationResponse with summary and metadata
        
    Raises:
        HTTPException: For various error conditions
    """
    try:
        logger.info(f"Received summarization request for text of length {len(request.text)}")
        
        # Call summarization service
        response = await summarization_service.summarize_text(
            text=request.text,
            max_length=request.max_length,
            style=request.style
        )
        
        logger.info(f"Successfully generated summary with compression ratio {response.compression_ratio:.2f}")
        return response
        
    except (ValidationError, OpenRouterAPIError, RateLimitError, AuthenticationError, 
            ServiceUnavailableError, TextProcessingError, ConfigurationError) as e:
        # Let custom exceptions propagate to global exception handlers
        logger.error(f"Service error: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during summarization: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing your request."
        )


@router.get(
    "/summarize/health",
    summary="Health check for summarization service",
    description="Check if the summarization service is working properly."
)
async def summarization_health_check():
    """
    Health check endpoint for summarization service.
    
    Returns:
        Health status of the summarization service
    """
    try:
        is_healthy = await summarization_service.health_check()
        
        if is_healthy:
            return {
                "status": "healthy",
                "service": "summarization",
                "message": "Summarization service is working properly"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Summarization service is not responding properly"
            )
            
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Summarization service health check failed"
        )