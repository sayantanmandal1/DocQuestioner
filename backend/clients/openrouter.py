"""
OpenRouter client for integrating with OpenAI API through OpenRouter proxy.
"""
import os
import asyncio
import logging
from typing import List, Dict, Any, Optional
import httpx
from dotenv import load_dotenv

# Import custom exceptions
from exceptions import (
    OpenRouterAPIError,
    RateLimitError,
    AuthenticationError,
    ConfigurationError,
    ServiceUnavailableError
)

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class OpenRouterClient:
    """
    Async HTTP client for OpenRouter API communication.
    Handles chat completions with proper error handling and rate limiting.
    """
    
    def __init__(self, api_key: Optional[str] = None, base_url: str = "https://openrouter.ai/api/v1"):
        """
        Initialize OpenRouter client.
        
        Args:
            api_key: OpenRouter API key. If None, will load from OPENAI_API_KEY env var
            base_url: OpenRouter API base URL
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ConfigurationError(
                "OpenRouter API key is required. Set OPENAI_API_KEY environment variable.",
                config_key="OPENAI_API_KEY"
            )
        
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:8000",  # Required by OpenRouter
            "X-Title": "AI Microservices"  # Optional but recommended
        }
        
        # Rate limiting configuration
        self.max_retries = 3
        self.base_delay = 1.0  # Base delay for exponential backoff
        
    async def chat_completion(
        self, 
        messages: List[Dict[str, str]], 
        model: str = "openai/gpt-4",
        max_tokens: Optional[int] = None,
        temperature: float = 0.7
    ) -> str:
        """
        Send chat completion request to OpenRouter.
        
        Args:
            messages: List of message dictionaries with 'role' and 'content'
            model: Model to use for completion
            max_tokens: Maximum tokens in response
            temperature: Sampling temperature
            
        Returns:
            Generated text response
            
        Raises:
            OpenRouterAPIError: If API request fails
        """
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature
        }
        
        if max_tokens:
            payload["max_tokens"] = max_tokens
            
        return await self._make_request_with_retry("/chat/completions", payload)
    
    async def _make_request_with_retry(self, endpoint: str, payload: Dict[str, Any]) -> str:
        """
        Make HTTP request with exponential backoff retry logic.
        
        Args:
            endpoint: API endpoint to call
            payload: Request payload
            
        Returns:
            Generated text response
            
        Raises:
            OpenRouterAPIError: If all retries fail
        """
        url = f"{self.base_url}{endpoint}"
        
        for attempt in range(self.max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(url, json=payload, headers=self.headers)
                    
                    if response.status_code == 200:
                        data = response.json()
                        return self._extract_content(data)
                    
                    elif response.status_code == 429:  # Rate limit
                        if attempt < self.max_retries:
                            delay = self._calculate_backoff_delay(attempt, response)
                            logger.warning(f"Rate limited. Retrying in {delay} seconds...")
                            await asyncio.sleep(delay)
                            continue
                        else:
                            retry_after = response.headers.get("Retry-After")
                            raise RateLimitError(
                                "Rate limit exceeded after all retries",
                                retry_after=int(retry_after) if retry_after else None
                            )
                    
                    elif response.status_code == 401:
                        raise AuthenticationError("Invalid API key or unauthorized access")
                    
                    elif response.status_code >= 500:  # Server errors
                        if attempt < self.max_retries:
                            delay = self.base_delay * (2 ** attempt)
                            logger.warning(f"Server error {response.status_code}. Retrying in {delay} seconds...")
                            await asyncio.sleep(delay)
                            continue
                        else:
                            raise ServiceUnavailableError(
                                f"OpenRouter service unavailable after all retries: {response.status_code}",
                                service_name="OpenRouter"
                            )
                    
                    else:
                        # Client errors (400, 404, etc.)
                        error_data = response.json() if response.content else {}
                        error_message = error_data.get("error", {}).get("message", f"HTTP {response.status_code}")
                        raise OpenRouterAPIError(
                            f"API request failed: {error_message}",
                            status_code=response.status_code,
                            response_data=error_data
                        )
                        
            except httpx.TimeoutException:
                if attempt < self.max_retries:
                    delay = self.base_delay * (2 ** attempt)
                    logger.warning(f"Request timeout. Retrying in {delay} seconds...")
                    await asyncio.sleep(delay)
                    continue
                else:
                    raise OpenRouterAPIError("Request timeout after all retries")
                    
            except httpx.RequestError as e:
                if attempt < self.max_retries:
                    delay = self.base_delay * (2 ** attempt)
                    logger.warning(f"Request error: {e}. Retrying in {delay} seconds...")
                    await asyncio.sleep(delay)
                    continue
                else:
                    raise OpenRouterAPIError(f"Request failed after all retries: {e}")
        
        raise OpenRouterAPIError("Unexpected error: all retries exhausted")
    
    def _calculate_backoff_delay(self, attempt: int, response: httpx.Response) -> float:
        """
        Calculate delay for rate limit backoff.
        
        Args:
            attempt: Current attempt number
            response: HTTP response object
            
        Returns:
            Delay in seconds
        """
        # Check for Retry-After header
        retry_after = response.headers.get("Retry-After")
        if retry_after:
            try:
                return float(retry_after)
            except ValueError:
                pass
        
        # Exponential backoff with jitter
        base_delay = self.base_delay * (2 ** attempt)
        # Add some jitter to avoid thundering herd
        import random
        jitter = random.uniform(0.1, 0.3) * base_delay
        return base_delay + jitter
    
    def _extract_content(self, response_data: Dict[str, Any]) -> str:
        """
        Extract content from OpenRouter API response.
        
        Args:
            response_data: API response JSON
            
        Returns:
            Generated text content
            
        Raises:
            OpenRouterAPIError: If response format is invalid
        """
        try:
            choices = response_data.get("choices", [])
            if not choices:
                raise OpenRouterAPIError("No choices in API response")
            
            message = choices[0].get("message", {})
            content = message.get("content", "")
            
            if not content:
                raise OpenRouterAPIError("Empty content in API response")
            
            return content.strip()
            
        except (KeyError, IndexError, TypeError) as e:
            raise OpenRouterAPIError(f"Invalid response format: {e}", response_data=response_data)
    
    async def health_check(self) -> bool:
        """
        Check if OpenRouter API is accessible with current credentials.
        
        Returns:
            True if API is accessible, False otherwise
        """
        try:
            test_messages = [{"role": "user", "content": "Hello"}]
            await self.chat_completion(test_messages, max_tokens=5)
            return True
        except OpenRouterAPIError:
            return False