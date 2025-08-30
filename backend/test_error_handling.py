"""
Integration tests for comprehensive error handling and middleware.
Tests various error scenarios and edge cases across all services.
"""
import pytest
import os
from unittest.mock import patch, Mock
from fastapi.testclient import TestClient
from httpx import Response

from main import app
from exceptions import (
    OpenRouterAPIError,
    DocumentProcessingError,
    ValidationError,
    ServiceUnavailableError,
    RateLimitError,
    AuthenticationError,
    ConfigurationError
)


class TestErrorHandlingMiddleware:
    """Test error handling middleware functionality."""
    
    def setup_method(self):
        """Set up test client."""
        self.client = TestClient(app)
    
    def test_validation_error_response_format(self):
        """Test that validation errors return standardized format."""
        # Send invalid request to summarization endpoint
        response = self.client.post(
            "/api/summarize",
            json={"text": "short", "max_length": 30}  # Too short text and invalid max_length
        )
        
        assert response.status_code == 422
        data = response.json()
        
        # Check standardized error format
        assert "error" in data
        assert "message" in data
        assert "details" in data
        assert "timestamp" in data
        assert "path" in data
        
        assert data["error"] == "VALIDATION_ERROR"
        assert isinstance(data["details"], list)
        assert len(data["details"]) > 0
    
    def test_missing_required_fields(self):
        """Test validation error for missing required fields."""
        response = self.client.post("/api/summarize", json={})
        
        assert response.status_code == 422
        data = response.json()
        
        assert data["error"] == "VALIDATION_ERROR"
        assert "text" in str(data["details"])
    
    def test_invalid_field_types(self):
        """Test validation error for invalid field types."""
        response = self.client.post(
            "/api/summarize",
            json={"text": 123, "max_length": "invalid"}  # Wrong types
        )
        
        assert response.status_code == 422
        data = response.json()
        assert data["error"] == "VALIDATION_ERROR"
    
    def test_cors_headers_present(self):
        """Test that CORS headers are properly set."""
        response = self.client.options("/api/summarize")
        
        assert "access-control-allow-origin" in response.headers
        assert "access-control-allow-methods" in response.headers
        assert "access-control-allow-headers" in response.headers
    
    def test_cors_preflight_request(self):
        """Test CORS preflight request handling."""
        response = self.client.options(
            "/api/summarize",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type"
            }
        )
        
        assert response.status_code == 200
        assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"
    
    def test_process_time_header_added(self):
        """Test that process time header is added to responses."""
        response = self.client.get("/health")
        
        assert response.status_code == 200
        assert "x-process-time" in response.headers
        assert float(response.headers["x-process-time"]) >= 0


class TestOpenRouterErrorHandling:
    """Test OpenRouter API error handling scenarios."""
    
    def setup_method(self):
        """Set up test client."""
        self.client = TestClient(app)
    
    @patch.dict(os.environ, {}, clear=True)
    def test_missing_api_key_configuration(self):
        """Test handling of missing API key configuration."""
        # This should be caught during service initialization
        response = self.client.post(
            "/api/summarize",
            json={"text": "This is a test text for summarization."}
        )
        
        # Should return OpenRouter API error (502) since it tries to connect without API key
        assert response.status_code == 502
        data = response.json()
        assert "OPENROUTER_API_ERROR" in data["error"]
    
    @patch('clients.openrouter.OpenRouterClient.chat_completion')
    def test_rate_limit_error_handling(self, mock_chat):
        """Test rate limit error handling."""
        mock_chat.side_effect = RateLimitError("Rate limit exceeded", retry_after=60)
        
        response = self.client.post(
            "/api/summarize",
            json={"text": "This is a test text for summarization."}
        )
        
        assert response.status_code == 429
        data = response.json()
        assert data["error"] == "RATE_LIMIT_ERROR"
        assert data["retry_after"] == 60
    
    @patch('clients.openrouter.OpenRouterClient.chat_completion')
    def test_authentication_error_handling(self, mock_chat):
        """Test authentication error handling."""
        mock_chat.side_effect = AuthenticationError("Invalid API key")
        
        response = self.client.post(
            "/api/summarize",
            json={"text": "This is a test text for summarization."}
        )
        
        assert response.status_code == 401
        data = response.json()
        assert data["error"] == "AUTHENTICATION_ERROR"
    
    @patch('clients.openrouter.OpenRouterClient.chat_completion')
    def test_service_unavailable_error_handling(self, mock_chat):
        """Test service unavailable error handling."""
        mock_chat.side_effect = ServiceUnavailableError("OpenRouter service unavailable", service_name="OpenRouter")
        
        response = self.client.post(
            "/api/summarize",
            json={"text": "This is a test text for summarization."}
        )
        
        assert response.status_code == 503
        data = response.json()
        assert data["error"] == "SERVICE_UNAVAILABLE"
    
    @patch('clients.openrouter.OpenRouterClient.chat_completion')
    def test_openrouter_api_error_handling(self, mock_chat):
        """Test OpenRouter API error handling."""
        mock_chat.side_effect = OpenRouterAPIError("API request failed", status_code=400)
        
        response = self.client.post(
            "/api/summarize",
            json={"text": "This is a test text for summarization."}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert data["error"] == "OPENROUTER_API_ERROR"


class TestDocumentProcessingErrors:
    """Test document processing error scenarios."""
    
    def setup_method(self):
        """Set up test client."""
        self.client = TestClient(app)
    
    def test_empty_document_error(self):
        """Test error handling for empty document."""
        response = self.client.post(
            "/api/qa/text",
            json={"question": "What is this about?", "document_text": ""}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert data["error"] == "VALIDATION_ERROR"
    
    def test_document_too_large_error(self):
        """Test error handling for oversized document."""
        large_text = "This is a very long document. " * 2000  # Exceeds typical limits
        
        response = self.client.post(
            "/api/qa/text",
            json={"question": "What is this about?", "document_text": large_text}
        )
        
        # Should be handled by validation or service logic
        assert response.status_code in [400, 422]
    
    def test_invalid_file_upload(self):
        """Test error handling for invalid file uploads."""
        # Test with invalid file content
        response = self.client.post(
            "/api/qa",
            files={"file": ("test.txt", b"\xff\xfe\x00\x00invalid", "text/plain")},
            data={"question": "What is this about?"}
        )
        
        # Should handle document processing error
        assert response.status_code in [400, 422]
    
    def test_unsupported_file_type(self):
        """Test error handling for unsupported file types."""
        response = self.client.post(
            "/api/qa",
            files={"file": ("test.pdf", b"fake pdf content", "application/pdf")},
            data={"question": "What is this about?"}
        )
        
        # Should handle unsupported file type
        assert response.status_code in [400, 422, 415]


class TestLearningPathErrors:
    """Test learning path generation error scenarios."""
    
    def setup_method(self):
        """Set up test client."""
        self.client = TestClient(app)
    
    def test_invalid_skill_level(self):
        """Test error handling for invalid skill level."""
        response = self.client.post(
            "/api/learning-path",
            json={
                "goals": "Learn Python programming",
                "skill_level": "expert",  # Invalid skill level
                "duration": "1-month"
            }
        )
        
        assert response.status_code == 422
        data = response.json()
        assert data["error"] == "VALIDATION_ERROR"
    
    def test_invalid_duration(self):
        """Test error handling for invalid duration."""
        response = self.client.post(
            "/api/learning-path",
            json={
                "goals": "Learn Python programming",
                "skill_level": "beginner",
                "duration": "2-years"  # Invalid duration
            }
        )
        
        assert response.status_code == 422
        data = response.json()
        assert data["error"] == "VALIDATION_ERROR"
    
    def test_empty_goals(self):
        """Test error handling for empty goals."""
        response = self.client.post(
            "/api/learning-path",
            json={
                "goals": "",  # Empty goals
                "skill_level": "beginner",
                "duration": "1-month"
            }
        )
        
        assert response.status_code == 422
        data = response.json()
        assert data["error"] == "VALIDATION_ERROR"
    
    def test_goals_too_short(self):
        """Test error handling for goals that are too short."""
        response = self.client.post(
            "/api/learning-path",
            json={
                "goals": "Learn",  # Too short
                "skill_level": "beginner",
                "duration": "1-month"
            }
        )
        
        assert response.status_code == 422
        data = response.json()
        assert data["error"] == "VALIDATION_ERROR"


class TestHealthCheckErrors:
    """Test health check error scenarios."""
    
    def setup_method(self):
        """Set up test client."""
        self.client = TestClient(app)
    
    @patch.dict(os.environ, {}, clear=True)
    def test_health_check_with_missing_api_key(self):
        """Test health check when API key is missing."""
        response = self.client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should indicate degraded status
        assert data["status"] == "degraded"
        assert "warnings" in data
        assert any("OPENAI_API_KEY" in warning for warning in data["warnings"])
    
    def test_health_check_with_api_key(self):
        """Test health check when API key is configured."""
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"}):
            response = self.client.get("/health")
            
            assert response.status_code == 200
            data = response.json()
            
            # Should indicate healthy status
            assert data["status"] == "healthy"
            assert data["environment"]["api_key_configured"] is True


class TestEdgeCases:
    """Test edge cases and boundary conditions."""
    
    def setup_method(self):
        """Set up test client."""
        self.client = TestClient(app)
    
    def test_malformed_json_request(self):
        """Test handling of malformed JSON requests."""
        response = self.client.post(
            "/api/summarize",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422
    
    def test_missing_content_type_header(self):
        """Test handling of requests with missing content type."""
        response = self.client.post(
            "/api/summarize",
            data='{"text": "test"}',
            headers={}
        )
        
        # Should still be handled appropriately
        assert response.status_code in [400, 422]
    
    def test_extremely_long_request_path(self):
        """Test handling of extremely long request paths."""
        long_path = "/api/summarize" + "a" * 1000
        
        response = self.client.post(long_path, json={"text": "test"})
        
        # Should return 404 or 405 for non-existent endpoint
        assert response.status_code in [404, 405]
    
    def test_concurrent_requests_error_handling(self):
        """Test error handling under concurrent requests."""
        import concurrent.futures
        import threading
        
        def make_request():
            return self.client.post(
                "/api/summarize",
                json={"text": "short"}  # Invalid request
            )
        
        # Make multiple concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            responses = [future.result() for future in futures]
        
        # All should return consistent error responses
        for response in responses:
            assert response.status_code == 422
            data = response.json()
            assert data["error"] == "VALIDATION_ERROR"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])