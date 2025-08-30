"""
Custom exception classes for AI Microservices application.
Provides structured error handling with detailed error information.
"""
from typing import Optional, Dict, Any


class BaseServiceError(Exception):
    """Base exception class for all service-related errors."""
    
    def __init__(
        self, 
        message: str, 
        error_code: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code or self.__class__.__name__
        self.details = details or {}
        super().__init__(self.message)


class OpenRouterAPIError(BaseServiceError):
    """Exception for OpenRouter API communication errors."""
    
    def __init__(
        self, 
        message: str, 
        status_code: Optional[int] = None, 
        response_data: Optional[Dict] = None
    ):
        self.status_code = status_code
        self.response_data = response_data
        super().__init__(
            message, 
            error_code="OPENROUTER_API_ERROR",
            details={
                "status_code": status_code,
                "response_data": response_data
            }
        )


class DocumentProcessingError(BaseServiceError):
    """Exception for document processing and validation errors."""
    
    def __init__(self, message: str, file_type: Optional[str] = None):
        self.file_type = file_type
        super().__init__(
            message,
            error_code="DOCUMENT_PROCESSING_ERROR",
            details={"file_type": file_type}
        )


class ValidationError(BaseServiceError):
    """Exception for input validation errors."""
    
    def __init__(self, message: str, field: Optional[str] = None, value: Optional[Any] = None):
        self.field = field
        self.value = value
        super().__init__(
            message,
            error_code="VALIDATION_ERROR",
            details={"field": field, "value": str(value) if value is not None else None}
        )


class ServiceUnavailableError(BaseServiceError):
    """Exception for service unavailability errors."""
    
    def __init__(self, message: str, service_name: Optional[str] = None):
        self.service_name = service_name
        super().__init__(
            message,
            error_code="SERVICE_UNAVAILABLE",
            details={"service_name": service_name}
        )


class RateLimitError(BaseServiceError):
    """Exception for rate limiting errors."""
    
    def __init__(self, message: str, retry_after: Optional[int] = None):
        self.retry_after = retry_after
        super().__init__(
            message,
            error_code="RATE_LIMIT_ERROR",
            details={"retry_after": retry_after}
        )


class AuthenticationError(BaseServiceError):
    """Exception for authentication and authorization errors."""
    
    def __init__(self, message: str):
        super().__init__(
            message,
            error_code="AUTHENTICATION_ERROR"
        )


class ConfigurationError(BaseServiceError):
    """Exception for configuration and environment setup errors."""
    
    def __init__(self, message: str, config_key: Optional[str] = None):
        self.config_key = config_key
        super().__init__(
            message,
            error_code="CONFIGURATION_ERROR",
            details={"config_key": config_key}
        )


class TextProcessingError(BaseServiceError):
    """Exception for text processing and chunking errors."""
    
    def __init__(self, message: str, text_length: Optional[int] = None):
        self.text_length = text_length
        super().__init__(
            message,
            error_code="TEXT_PROCESSING_ERROR",
            details={"text_length": text_length}
        )


class LearningPathGenerationError(BaseServiceError):
    """Exception for learning path generation specific errors."""
    
    def __init__(self, message: str, goals: Optional[str] = None, skill_level: Optional[str] = None):
        self.goals = goals
        self.skill_level = skill_level
        super().__init__(
            message,
            error_code="LEARNING_PATH_ERROR",
            details={"goals": goals, "skill_level": skill_level}
        )