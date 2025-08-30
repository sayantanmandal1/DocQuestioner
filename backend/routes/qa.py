"""
FastAPI routes for document Q&A endpoints.
"""
import logging
from fastapi import APIRouter, HTTPException, status, File, UploadFile, Form
from typing import Optional
from models.qa import QARequest, QAResponse
from services.qa import QAService
from exceptions import (
    OpenRouterAPIError,
    DocumentProcessingError,
    ValidationError,
    ConfigurationError,
    RateLimitError,
    AuthenticationError,
    ServiceUnavailableError
)

logger = logging.getLogger(__name__)

# Create router for Q&A endpoints
router = APIRouter(prefix="/api", tags=["qa"])

# Initialize service (will be dependency injected in production)
qa_service = QAService()


@router.post(
    "/qa",
    response_model=QAResponse,
    status_code=status.HTTP_200_OK,
    summary="Answer questions based on document content",
    description="Upload a document and ask questions about its content. Supports text files and direct text input."
)
async def answer_question(
    question: str = Form(..., description="Question to be answered"),
    file: Optional[UploadFile] = File(None, description="Document file to analyze (optional if document_text is provided)"),
    document_text: Optional[str] = Form(None, description="Direct text input (optional if file is provided)")
) -> QAResponse:
    """
    Answer a question based on document content.
    
    Args:
        question: Question to be answered
        file: Optional uploaded document file
        document_text: Optional direct text input
        
    Returns:
        QAResponse with answer, confidence, and sources
        
    Raises:
        HTTPException: For various error conditions
    """
    try:
        logger.info(f"Received Q&A request with question: {question[:100]}...")
        
        # Validate that either file or document_text is provided
        if not file and not document_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either a document file or document_text must be provided"
            )
        
        # Process document content
        if file:
            # Validate file type
            if file.content_type and not file.content_type.startswith('text/'):
                raise HTTPException(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    detail=f"Unsupported file type: {file.content_type}. Only text files are supported."
                )
            
            # Read file content
            try:
                file_content = await file.read()
                document_content = qa_service.process_document(file_content, file.content_type or 'text/plain')
                logger.info(f"Processed uploaded file: {file.filename}, size: {len(file_content)} bytes")
            except DocumentProcessingError as e:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=str(e)
                )
        else:
            document_content = document_text
            logger.info(f"Using direct text input, length: {len(document_content)} characters")
        
        # Call Q&A service
        response = await qa_service.answer_question(
            question=question,
            document_text=document_content
        )
        
        logger.info(f"Successfully generated answer with confidence {response.confidence:.2f}")
        return response
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except (ValidationError, DocumentProcessingError, OpenRouterAPIError, RateLimitError, 
            AuthenticationError, ServiceUnavailableError, ConfigurationError) as e:
        # Let custom exceptions propagate to global exception handlers
        logger.error(f"Service error: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during Q&A: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing your request."
        )


@router.post(
    "/qa/text",
    response_model=QAResponse,
    status_code=status.HTTP_200_OK,
    summary="Answer questions with direct text input",
    description="Answer questions based on directly provided text content (alternative to file upload)."
)
async def answer_question_text(request: QARequest) -> QAResponse:
    """
    Answer a question based on directly provided text content.
    
    Args:
        request: QARequest with question and document_text
        
    Returns:
        QAResponse with answer, confidence, and sources
        
    Raises:
        HTTPException: For various error conditions
    """
    try:
        logger.info(f"Received text-based Q&A request with question: {request.question[:100]}...")
        
        # document_text validation is handled by the service
        
        # Call Q&A service
        response = await qa_service.answer_question(
            question=request.question,
            document_text=request.document_text
        )
        
        logger.info(f"Successfully generated answer with confidence {response.confidence:.2f}")
        return response
        
    except (ValidationError, DocumentProcessingError, OpenRouterAPIError, RateLimitError, 
            AuthenticationError, ServiceUnavailableError, ConfigurationError) as e:
        # Let custom exceptions propagate to global exception handlers
        logger.error(f"Service error: {type(e).__name__}: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during Q&A: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while processing your request."
        )


@router.get(
    "/qa/health",
    summary="Health check for Q&A service",
    description="Check if the Q&A service is working properly."
)
async def qa_health_check():
    """
    Health check endpoint for Q&A service.
    
    Returns:
        Health status of the Q&A service
    """
    try:
        is_healthy = await qa_service.health_check()
        
        if is_healthy:
            return {
                "status": "healthy",
                "service": "qa",
                "message": "Q&A service is working properly"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Q&A service is not responding properly"
            )
            
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Q&A service health check failed"
        )