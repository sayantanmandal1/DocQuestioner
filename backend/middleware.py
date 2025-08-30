"""
Middleware for AI Microservices application.
Provides error handling, logging, and request/response processing.
"""
import logging
import time
from datetime import datetime
from typing import Dict, Any
from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.middleware.base import BaseHTTPMiddleware

from exceptions import (
    BaseServiceError,
    OpenRouterAPIError,
    DocumentProcessingError,
    ValidationError,
    ServiceUnavailableError,
    RateLimitError,
    AuthenticationError,
    ConfigurationError,
    TextProcessingError,
    LearningPathGenerationError
)

logger = logging.getLogger(__name__)


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware for comprehensive error handling and logging."""
    
    async def dispatch(self, request: Request, call_next):
        """Process request and handle any exceptions that occur."""
        start_time = time.time()
        
        try:
            # Log incoming request
            logger.info(f"Incoming request: {request.method} {request.url}")
            
            # Process request
            response = await call_next(request)
            
            # Log successful response
            process_time = time.time() - start_time
            logger.info(f"Request completed: {request.method} {request.url} - {response.status_code} - {process_time:.3f}s")
            
            return response
            
        except Exception as exc:
            # Log error
            process_time = time.time() - start_time
            logger.error(f"Request failed: {request.method} {request.url} - {exc.__class__.__name__}: {exc} - {process_time:.3f}s")
            
            # Handle different exception types
            return await self._handle_exception(request, exc)
    
    async def _handle_exception(self, request: Request, exc: Exception) -> JSONResponse:
        """Handle different types of exceptions with appropriate responses."""
        
        # Handle custom service errors
        if isinstance(exc, BaseServiceError):
            return await self._handle_service_error(request, exc)
        
        # Handle FastAPI validation errors
        elif isinstance(exc, RequestValidationError):
            return await self._handle_validation_error(request, exc)
        
        # Handle HTTP exceptions
        elif isinstance(exc, HTTPException):
            return await self._handle_http_exception(request, exc)
        
        # Handle unexpected errors
        else:
            return await self._handle_unexpected_error(request, exc)
    
    async def _handle_service_error(self, request: Request, exc: BaseServiceError) -> JSONResponse:
        """Handle custom service errors with specific status codes."""
        
        # Map exception types to HTTP status codes
        status_code_mapping = {
            OpenRouterAPIError: self._get_openrouter_status_code(exc),
            DocumentProcessingError: status.HTTP_422_UNPROCESSABLE_ENTITY,
            ValidationError: status.HTTP_400_BAD_REQUEST,
            ServiceUnavailableError: status.HTTP_503_SERVICE_UNAVAILABLE,
            RateLimitError: status.HTTP_429_TOO_MANY_REQUESTS,
            AuthenticationError: status.HTTP_401_UNAUTHORIZED,
            ConfigurationError: status.HTTP_500_INTERNAL_SERVER_ERROR,
            TextProcessingError: status.HTTP_422_UNPROCESSABLE_ENTITY,
            LearningPathGenerationError: status.HTTP_422_UNPROCESSABLE_ENTITY,
        }
        
        status_code = status_code_mapping.get(type(exc), status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        error_response = {
            "error": exc.error_code,
            "message": exc.message,
            "details": exc.details,
            "timestamp": datetime.utcnow().isoformat(),
            "path": str(request.url)
        }
        
        # Add retry information for rate limit errors
        if isinstance(exc, RateLimitError) and exc.retry_after:
            error_response["retry_after"] = exc.retry_after
        
        return JSONResponse(
            status_code=status_code,
            content=error_response
        )
    
    def _get_openrouter_status_code(self, exc: OpenRouterAPIError) -> int:
        """Get appropriate status code for OpenRouter API errors."""
        if exc.status_code:
            return exc.status_code
        return status.HTTP_502_BAD_GATEWAY
    
    async def _handle_validation_error(self, request: Request, exc: RequestValidationError) -> JSONResponse:
        """Handle FastAPI validation errors."""
        
        # Extract field-specific error messages
        error_details = []
        for error in exc.errors():
            field = " -> ".join(str(loc) for loc in error["loc"])
            message = error["msg"]
            error_details.append({
                "field": field,
                "message": message,
                "type": error.get("type", "validation_error")
            })
        
        error_response = {
            "error": "VALIDATION_ERROR",
            "message": "Request validation failed",
            "details": error_details,
            "timestamp": datetime.utcnow().isoformat(),
            "path": str(request.url)
        }
        
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=error_response
        )
    
    async def _handle_http_exception(self, request: Request, exc: HTTPException) -> JSONResponse:
        """Handle FastAPI HTTP exceptions."""
        
        error_response = {
            "error": "HTTP_ERROR",
            "message": exc.detail,
            "status_code": exc.status_code,
            "timestamp": datetime.utcnow().isoformat(),
            "path": str(request.url)
        }
        
        return JSONResponse(
            status_code=exc.status_code,
            content=error_response
        )
    
    async def _handle_unexpected_error(self, request: Request, exc: Exception) -> JSONResponse:
        """Handle unexpected errors."""
        
        # Log the full exception for debugging
        logger.exception(f"Unexpected error in {request.method} {request.url}: {exc}")
        
        error_response = {
            "error": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred while processing your request",
            "timestamp": datetime.utcnow().isoformat(),
            "path": str(request.url)
        }
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_response
        )


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for detailed request/response logging."""
    
    async def dispatch(self, request: Request, call_next):
        """Log request details and response information."""
        start_time = time.time()
        
        # Log request details
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        logger.info(
            f"Request started: {request.method} {request.url} "
            f"from {client_ip} with {user_agent}"
        )
        
        # Process request
        response = await call_next(request)
        
        # Log response details
        process_time = time.time() - start_time
        logger.info(
            f"Request completed: {request.method} {request.url} "
            f"- Status: {response.status_code} "
            f"- Time: {process_time:.3f}s"
        )
        
        # Add processing time header
        response.headers["X-Process-Time"] = str(process_time)
        
        return response


def create_error_response(
    error_code: str,
    message: str,
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    details: Dict[str, Any] = None,
    path: str = None
) -> Dict[str, Any]:
    """Create standardized error response format."""
    
    return {
        "error": error_code,
        "message": message,
        "details": details or {},
        "timestamp": datetime.utcnow().isoformat(),
        "path": path
    }


def log_service_error(service_name: str, operation: str, error: Exception, **kwargs):
    """Log service errors with consistent format."""
    
    logger.error(
        f"Service error in {service_name}.{operation}: "
        f"{error.__class__.__name__}: {error}",
        extra={
            "service": service_name,
            "operation": operation,
            "error_type": error.__class__.__name__,
            "error_message": str(error),
            **kwargs
        }
    )