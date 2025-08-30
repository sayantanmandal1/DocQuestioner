"""
Unit tests for OpenRouter client functionality.
"""
import pytest
import asyncio
import os
from unittest.mock import AsyncMock, patch, MagicMock
import httpx

from clients.openrouter import OpenRouterClient, OpenRouterAPIError


class TestOpenRouterClient:
    """Test cases for OpenRouterClient class."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.api_key = "test-api-key"
        self.client = OpenRouterClient(api_key=self.api_key)
    
    def test_init_with_api_key(self):
        """Test client initialization with provided API key."""
        client = OpenRouterClient(api_key="test-key")
        assert client.api_key == "test-key"
        assert "Bearer test-key" in client.headers["Authorization"]
    
    @patch.dict(os.environ, {"OPENAI_API_KEY": "env-key"})
    def test_init_with_env_var(self):
        """Test client initialization with environment variable."""
        client = OpenRouterClient()
        assert client.api_key == "env-key"
    
    @patch.dict(os.environ, {}, clear=True)
    def test_init_without_api_key_raises_error(self):
        """Test that missing API key raises ValueError."""
        with pytest.raises(ValueError, match="OpenRouter API key is required"):
            OpenRouterClient()
    
    @pytest.mark.asyncio
    async def test_chat_completion_success(self):
        """Test successful chat completion request."""
        mock_response_data = {
            "choices": [
                {
                    "message": {
                        "content": "Hello! How can I help you today?"
                    }
                }
            ]
        }
        
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_response_data
            mock_client.post.return_value = mock_response
            
            messages = [{"role": "user", "content": "Hello"}]
            result = await self.client.chat_completion(messages)
            
            assert result == "Hello! How can I help you today?"
            mock_client.post.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_chat_completion_with_parameters(self):
        """Test chat completion with custom parameters."""
        mock_response_data = {
            "choices": [{"message": {"content": "Test response"}}]
        }
        
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_response_data
            mock_client.post.return_value = mock_response
            
            messages = [{"role": "user", "content": "Test"}]
            await self.client.chat_completion(
                messages, 
                model="openai/gpt-3.5-turbo",
                max_tokens=100,
                temperature=0.5
            )
            
            # Verify the request payload
            call_args = mock_client.post.call_args
            payload = call_args[1]["json"]
            
            assert payload["model"] == "openai/gpt-3.5-turbo"
            assert payload["max_tokens"] == 100
            assert payload["temperature"] == 0.5
            assert payload["messages"] == messages
    
    @pytest.mark.asyncio
    async def test_unauthorized_error(self):
        """Test handling of 401 unauthorized error."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            mock_response = MagicMock()
            mock_response.status_code = 401
            mock_response.json.return_value = {"error": {"message": "Invalid API key"}}
            mock_response.content = b'{"error": {"message": "Invalid API key"}}'
            mock_client.post.return_value = mock_response
            
            messages = [{"role": "user", "content": "Test"}]
            
            with pytest.raises(OpenRouterAPIError) as exc_info:
                await self.client.chat_completion(messages)
            
            assert exc_info.value.status_code == 401
            assert "Invalid API key" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_rate_limit_retry(self):
        """Test rate limit handling with retry."""
        mock_response_data = {
            "choices": [{"message": {"content": "Success after retry"}}]
        }
        
        with patch("httpx.AsyncClient") as mock_client_class, \
             patch("asyncio.sleep") as mock_sleep:
            
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            # First call returns 429, second call succeeds
            rate_limit_response = MagicMock()
            rate_limit_response.status_code = 429
            rate_limit_response.json.return_value = {"error": {"message": "Rate limited"}}
            rate_limit_response.content = b'{"error": {"message": "Rate limited"}}'
            rate_limit_response.headers = {}
            
            success_response = MagicMock()
            success_response.status_code = 200
            success_response.json.return_value = mock_response_data
            
            mock_client.post.side_effect = [rate_limit_response, success_response]
            
            messages = [{"role": "user", "content": "Test"}]
            result = await self.client.chat_completion(messages)
            
            assert result == "Success after retry"
            assert mock_client.post.call_count == 2
            mock_sleep.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_rate_limit_max_retries_exceeded(self):
        """Test rate limit with max retries exceeded."""
        with patch("httpx.AsyncClient") as mock_client_class, \
             patch("asyncio.sleep"):
            
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            mock_response = MagicMock()
            mock_response.status_code = 429
            mock_response.json.return_value = {"error": {"message": "Rate limited"}}
            mock_response.content = b'{"error": {"message": "Rate limited"}}'
            mock_response.headers = {}
            mock_client.post.return_value = mock_response
            
            messages = [{"role": "user", "content": "Test"}]
            
            with pytest.raises(OpenRouterAPIError) as exc_info:
                await self.client.chat_completion(messages)
            
            assert exc_info.value.status_code == 429
            assert "Rate limit exceeded" in str(exc_info.value)
            assert mock_client.post.call_count == 4  # Initial + 3 retries
    
    @pytest.mark.asyncio
    async def test_server_error_retry(self):
        """Test server error handling with retry."""
        mock_response_data = {
            "choices": [{"message": {"content": "Success after server error"}}]
        }
        
        with patch("httpx.AsyncClient") as mock_client_class, \
             patch("asyncio.sleep") as mock_sleep:
            
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            # First call returns 500, second call succeeds
            server_error_response = MagicMock()
            server_error_response.status_code = 500
            server_error_response.json.return_value = {"error": {"message": "Internal server error"}}
            server_error_response.content = b'{"error": {"message": "Internal server error"}}'
            
            success_response = MagicMock()
            success_response.status_code = 200
            success_response.json.return_value = mock_response_data
            
            mock_client.post.side_effect = [server_error_response, success_response]
            
            messages = [{"role": "user", "content": "Test"}]
            result = await self.client.chat_completion(messages)
            
            assert result == "Success after server error"
            assert mock_client.post.call_count == 2
            mock_sleep.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_timeout_retry(self):
        """Test timeout handling with retry."""
        mock_response_data = {
            "choices": [{"message": {"content": "Success after timeout"}}]
        }
        
        with patch("httpx.AsyncClient") as mock_client_class, \
             patch("asyncio.sleep") as mock_sleep:
            
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            # First call times out, second call succeeds
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_response_data
            
            mock_client.post.side_effect = [httpx.TimeoutException("Timeout"), mock_response]
            
            messages = [{"role": "user", "content": "Test"}]
            result = await self.client.chat_completion(messages)
            
            assert result == "Success after timeout"
            assert mock_client.post.call_count == 2
            mock_sleep.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_invalid_response_format(self):
        """Test handling of invalid response format."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"invalid": "format"}
            mock_client.post.return_value = mock_response
            
            messages = [{"role": "user", "content": "Test"}]
            
            with pytest.raises(OpenRouterAPIError, match="No choices in API response"):
                await self.client.chat_completion(messages)
    
    @pytest.mark.asyncio
    async def test_empty_content_response(self):
        """Test handling of empty content in response."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "choices": [{"message": {"content": ""}}]
            }
            mock_client.post.return_value = mock_response
            
            messages = [{"role": "user", "content": "Test"}]
            
            with pytest.raises(OpenRouterAPIError, match="Empty content in API response"):
                await self.client.chat_completion(messages)
    
    @pytest.mark.asyncio
    async def test_health_check_success(self):
        """Test successful health check."""
        mock_response_data = {
            "choices": [{"message": {"content": "OK"}}]
        }
        
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_response_data
            mock_client.post.return_value = mock_response
            
            result = await self.client.health_check()
            assert result is True
    
    @pytest.mark.asyncio
    async def test_health_check_failure(self):
        """Test health check failure."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client_class.return_value.__aenter__.return_value = mock_client
            
            mock_response = MagicMock()
            mock_response.status_code = 401
            mock_response.json.return_value = {"error": {"message": "Unauthorized"}}
            mock_response.content = b'{"error": {"message": "Unauthorized"}}'
            mock_client.post.return_value = mock_response
            
            result = await self.client.health_check()
            assert result is False
    
    def test_calculate_backoff_delay_with_retry_after(self):
        """Test backoff delay calculation with Retry-After header."""
        mock_response = MagicMock()
        mock_response.headers = {"Retry-After": "5.0"}
        
        delay = self.client._calculate_backoff_delay(0, mock_response)
        assert delay == 5.0
    
    def test_calculate_backoff_delay_exponential(self):
        """Test exponential backoff delay calculation."""
        mock_response = MagicMock()
        mock_response.headers = {}
        
        # Mock random to make test deterministic
        with patch("random.uniform", return_value=0.2):
            delay = self.client._calculate_backoff_delay(1, mock_response)
            # Base delay (1.0) * 2^1 + jitter (0.2 * 2.0) = 2.4
            assert delay == 2.4
    
    def test_extract_content_success(self):
        """Test successful content extraction."""
        response_data = {
            "choices": [
                {"message": {"content": "  Test content  "}}
            ]
        }
        
        content = self.client._extract_content(response_data)
        assert content == "Test content"
    
    def test_extract_content_no_choices(self):
        """Test content extraction with no choices."""
        response_data = {"choices": []}
        
        with pytest.raises(OpenRouterAPIError, match="No choices in API response"):
            self.client._extract_content(response_data)
    
    def test_extract_content_invalid_format(self):
        """Test content extraction with invalid format."""
        response_data = {"invalid": "format"}
        
        with pytest.raises(OpenRouterAPIError, match="No choices in API response"):
            self.client._extract_content(response_data)


if __name__ == "__main__":
    pytest.main([__file__])