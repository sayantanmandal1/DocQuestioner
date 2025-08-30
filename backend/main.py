"""
FastAPI application for AI Microservices
Provides text summarization, Q&A, and learning path generation services
"""

import logging
import os
from datetime import datetime
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from dotenv import load_dotenv

# Import route handlers
from routes.summarization import router as summarization_router
from routes.qa import router as qa_router
from routes.learning_path import router as learning_path_router

# Import custom exceptions and middleware
from exceptions import (
    BaseServiceError,
    OpenRouterAPIError,
    DocumentProcessingError,
    ValidationError,
    ServiceUnavailableError,
    RateLimitError,
    AuthenticationError,
    ConfigurationError
)
from middleware import ErrorHandlingMiddleware, RequestLoggingMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Create FastAPI application instance
app = FastAPI(
    title="AI Microservices API",
    description="""
    ## AI Microservices Platform
    
    A comprehensive API platform providing modular AI services powered by OpenAI through OpenRouter.
    
    ### Available Services
    
    * **Text Summarization** - Transform long documents into concise, meaningful summaries
    * **Document Q&A** - Upload documents and get intelligent answers to your questions
    * **Learning Path Generation** - Create personalized learning paths based on goals and skill level
    
    ### Authentication
    
    This API uses OpenRouter for OpenAI API access. Ensure your `OPENAI_API_KEY` environment variable is configured.
    
    ### Rate Limits
    
    API calls are subject to OpenRouter's rate limiting. The API will return appropriate error codes and retry-after headers when limits are exceeded.
    
    ### Error Handling
    
    All endpoints return standardized error responses with detailed information for debugging and user feedback.
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    contact={
        "name": "AI Microservices API",
        "url": "https://github.com/your-repo/ai-microservices",
        "email": "support@ai-microservices.com"
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    servers=[
        {
            "url": "http://localhost:8000",
            "description": "Development server"
        },
        {
            "url": "https://api.ai-microservices.com",
            "description": "Production server"
        }
    ],
    tags_metadata=[
        {
            "name": "health",
            "description": "Health check and system status endpoints"
        },
        {
            "name": "info",
            "description": "API information and metadata endpoints"
        },
        {
            "name": "summarization",
            "description": "Text summarization services with customizable options"
        },
        {
            "name": "qa",
            "description": "Document Q&A services with file upload support"
        },
        {
            "name": "learning-path",
            "description": "Personalized learning path generation services"
        }
    ]
)

# Add custom middleware for logging
app.add_middleware(RequestLoggingMiddleware)

# Configure CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js default port
        "http://127.0.0.1:3000",
        "http://localhost:3001",  # Alternative frontend port
        "http://localhost:8080",  # Alternative development port
        "https://localhost:3000", # HTTPS development
        "https://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=[
        "Accept",
        "Accept-Language",
        "Content-Language",
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-CSRF-Token",
        "Cache-Control"
    ],
    expose_headers=["X-Process-Time"],
)


# Global exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors with detailed messages"""
    logger.warning(f"Validation error for {request.url}: {exc}")
    
    # Extract field-specific error messages
    error_details = []
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"])
        message = error["msg"]
        error_type = error.get("type", "validation_error")
        error_details.append({
            "field": field,
            "message": message,
            "type": error_type
        })
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "VALIDATION_ERROR",
            "message": "Request validation failed",
            "details": error_details,
            "timestamp": datetime.utcnow().isoformat(),
            "path": str(request.url)
        }
    )


@app.exception_handler(BaseServiceError)
async def service_error_handler(request: Request, exc: BaseServiceError):
    """Handle custom service errors with specific status codes."""
    
    # Map exception types to HTTP status codes
    status_code_mapping = {
        OpenRouterAPIError: exc.status_code if hasattr(exc, 'status_code') and exc.status_code else status.HTTP_502_BAD_GATEWAY,
        DocumentProcessingError: status.HTTP_422_UNPROCESSABLE_ENTITY,
        ValidationError: status.HTTP_400_BAD_REQUEST,
        ServiceUnavailableError: status.HTTP_503_SERVICE_UNAVAILABLE,
        RateLimitError: status.HTTP_429_TOO_MANY_REQUESTS,
        AuthenticationError: status.HTTP_401_UNAUTHORIZED,
        ConfigurationError: status.HTTP_500_INTERNAL_SERVER_ERROR,
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
    if isinstance(exc, RateLimitError) and hasattr(exc, 'retry_after') and exc.retry_after:
        error_response["retry_after"] = exc.retry_after
    
    return JSONResponse(
        status_code=status_code,
        content=error_response
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with consistent format"""
    logger.warning(f"HTTP exception for {request.url}: {exc.status_code} - {exc.detail}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "HTTP_ERROR",
            "message": exc.detail,
            "status_code": exc.status_code,
            "timestamp": datetime.utcnow().isoformat(),
            "path": str(request.url)
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    logger.error(f"Unexpected error for {request.url}: {exc}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred while processing your request",
            "timestamp": datetime.utcnow().isoformat(),
            "path": str(request.url)
        }
    )


# Include route handlers
app.include_router(summarization_router)
app.include_router(qa_router)
app.include_router(learning_path_router)


# Add explicit OPTIONS handler for CORS preflight
@app.options("/{path:path}")
async def options_handler(request: Request):
    """Handle CORS preflight requests."""
    return JSONResponse(
        status_code=200,
        content={"message": "OK"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
        }
    )


@app.get("/", tags=["health"])
async def root():
    """Root endpoint for basic health check"""
    return {
        "message": "AI Microservices API is running",
        "status": "healthy",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/health", tags=["health"])
async def health_check():
    """Comprehensive health check endpoint"""
    # Check environment variables
    api_key_configured = bool(os.getenv("OPENAI_API_KEY"))
    
    health_status = {
        "status": "healthy",
        "service": "AI Microservices API",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": {
            "api_key_configured": api_key_configured,
            "python_version": os.sys.version.split()[0],
        },
        "services": {
            "summarization": "available",
            "qa": "available", 
            "learning_path": "available"
        }
    }
    
    # If API key is not configured, mark as degraded
    if not api_key_configured:
        health_status["status"] = "degraded"
        health_status["warnings"] = ["OPENAI_API_KEY environment variable is not configured"]
    
    return health_status


@app.get("/api/info", tags=["info"])
async def api_info():
    """Get API information and available endpoints"""
    return {
        "name": "AI Microservices API",
        "version": "1.0.0",
        "description": "Modular AI services for text summarization, document Q&A, and learning path generation",
        "endpoints": {
            "summarization": {
                "POST /api/summarize": "Summarize text content with customizable options",
                "GET /api/summarize/health": "Health check for summarization service"
            },
            "qa": {
                "POST /api/qa": "Answer questions based on uploaded documents",
                "POST /api/qa/text": "Answer questions based on direct text input",
                "GET /api/qa/health": "Health check for Q&A service"
            },
            "learning_path": {
                "POST /api/learning-path": "Generate personalized learning paths",
                "GET /api/learning-path/options": "Get available options for learning path generation",
                "POST /api/learning-path/validate": "Validate learning path request parameters",
                "GET /api/learning-path/health": "Health check for learning path service"
            }
        },
        "documentation": {
            "swagger_ui": "/docs",
            "redoc": "/redoc",
            "openapi_json": "/openapi.json"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)