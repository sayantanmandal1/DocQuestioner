"""
Text summarization service with chunking and OpenRouter integration.
"""
import re
import logging
from typing import List, Optional
from clients.openrouter import OpenRouterClient
from models.summarization import SummarizationRequest, SummarizationResponse
from exceptions import (
    OpenRouterAPIError,
    ValidationError,
    TextProcessingError,
    ConfigurationError,
    RateLimitError,
    AuthenticationError,
    ServiceUnavailableError
)
from middleware import log_service_error

logger = logging.getLogger(__name__)


class SummarizationService:
    """
    Service for text summarization with chunking support for large documents.
    """
    
    def __init__(self, openrouter_client: Optional[OpenRouterClient] = None):
        """
        Initialize summarization service.
        
        Args:
            openrouter_client: OpenRouter client instance. If None, creates a new one.
        """
        try:
            self.client = openrouter_client or OpenRouterClient()
        except ConfigurationError as e:
            log_service_error("SummarizationService", "__init__", e)
            raise
        
        # Configuration for text processing
        self.max_chunk_size = 3000  # Maximum characters per chunk
        self.chunk_overlap = 200    # Overlap between chunks to maintain context
        self.max_tokens_per_request = 1000  # Conservative token limit for API calls
        
    async def summarize_text(
        self, 
        text: str, 
        max_length: int = 150, 
        style: str = "concise"
    ) -> SummarizationResponse:
        """
        Summarize text with automatic chunking for large documents.
        
        Args:
            text: Text content to summarize
            max_length: Maximum length of summary in words
            style: Summarization style (concise, detailed, bullet-points)
            
        Returns:
            SummarizationResponse with summary and metadata
            
        Raises:
            ValueError: If text is too short or parameters are invalid
            OpenRouterAPIError: If API request fails
        """
        # Validate input
        if len(text.strip()) < 10:
            raise ValidationError("Text must be at least 10 characters long", field="text", value=len(text.strip()))
        
        if max_length < 50 or max_length > 500:
            raise ValidationError("max_length must be between 50 and 500 words", field="max_length", value=max_length)
        
        if style not in ["concise", "detailed", "bullet-points"]:
            raise ValidationError("style must be one of: concise, detailed, bullet-points", field="style", value=style)
        
        original_length = len(text)
        
        try:
            # Check if text needs chunking
            if len(text) <= self.max_chunk_size:
                summary = await self._summarize_single_chunk(text, max_length, style)
            else:
                summary = await self._summarize_with_chunking(text, max_length, style)
            
            summary_length = len(summary)
            compression_ratio = summary_length / original_length if original_length > 0 else 0
            
            return SummarizationResponse(
                summary=summary,
                original_length=original_length,
                summary_length=summary_length,
                compression_ratio=compression_ratio
            )
            
        except (OpenRouterAPIError, RateLimitError, AuthenticationError, ServiceUnavailableError) as e:
            log_service_error("SummarizationService", "summarize_text", e, text_length=original_length)
            raise
        except Exception as e:
            log_service_error("SummarizationService", "summarize_text", e, text_length=original_length)
            raise TextProcessingError(f"Summarization failed: {str(e)}", text_length=original_length)
    
    async def _summarize_single_chunk(
        self, 
        text: str, 
        max_length: int, 
        style: str
    ) -> str:
        """
        Summarize a single chunk of text.
        
        Args:
            text: Text to summarize
            max_length: Maximum summary length in words
            style: Summarization style
            
        Returns:
            Generated summary
        """
        prompt = self._build_summarization_prompt(text, max_length, style)
        
        messages = [
            {"role": "system", "content": "You are an expert text summarizer. Provide clear, accurate summaries that capture the key points of the given text."},
            {"role": "user", "content": prompt}
        ]
        
        # Calculate appropriate max_tokens based on requested length
        max_tokens = min(max_length * 2, self.max_tokens_per_request)  # Rough word-to-token conversion
        
        summary = await self.client.chat_completion(
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.3  # Lower temperature for more consistent summaries
        )
        
        return summary.strip()
    
    async def _summarize_with_chunking(
        self, 
        text: str, 
        max_length: int, 
        style: str
    ) -> str:
        """
        Summarize large text by chunking and then creating a final summary.
        
        Args:
            text: Large text to summarize
            max_length: Maximum final summary length in words
            style: Summarization style
            
        Returns:
            Generated summary
        """
        # Split text into chunks
        chunks = self._split_text_into_chunks(text)
        
        # Summarize each chunk
        chunk_summaries = []
        chunk_max_length = max(50, max_length // len(chunks))  # Distribute length across chunks
        
        for i, chunk in enumerate(chunks):
            try:
                chunk_summary = await self._summarize_single_chunk(
                    chunk, 
                    chunk_max_length, 
                    "concise"  # Use concise style for chunk summaries
                )
                chunk_summaries.append(chunk_summary)
                logger.debug(f"Summarized chunk {i+1}/{len(chunks)}")
            except Exception as e:
                logger.warning(f"Failed to summarize chunk {i+1}: {e}")
                # Continue with other chunks
                continue
        
        if not chunk_summaries:
            raise ValueError("Failed to summarize any chunks of the text")
        
        # Combine chunk summaries into final summary
        combined_text = " ".join(chunk_summaries)
        
        # If combined summaries are still too long, summarize again
        if len(combined_text) > self.max_chunk_size:
            final_summary = await self._summarize_single_chunk(
                combined_text, 
                max_length, 
                style
            )
        else:
            # Create final summary with requested style
            final_summary = await self._summarize_single_chunk(
                combined_text, 
                max_length, 
                style
            )
        
        return final_summary
    
    def _split_text_into_chunks(self, text: str) -> List[str]:
        """
        Split text into overlapping chunks for processing.
        
        Args:
            text: Text to split
            
        Returns:
            List of text chunks
        """
        if len(text) <= self.max_chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + self.max_chunk_size
            
            # If this isn't the last chunk, try to break at a sentence boundary
            if end < len(text):
                # Look for sentence endings within the overlap region
                search_start = max(start, end - self.chunk_overlap)
                sentence_break = self._find_sentence_boundary(text, search_start, end)
                
                if sentence_break > start:
                    end = sentence_break
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            # Move start position with overlap
            start = max(start + 1, end - self.chunk_overlap)
        
        return chunks
    
    def _find_sentence_boundary(self, text: str, start: int, end: int) -> int:
        """
        Find the best sentence boundary within a range.
        
        Args:
            text: Full text
            start: Start position to search
            end: End position to search
            
        Returns:
            Position of sentence boundary, or end if none found
        """
        # Look for sentence endings (., !, ?) followed by whitespace
        sentence_pattern = r'[.!?]\s+'
        
        # Search backwards from end to start
        search_text = text[start:end]
        matches = list(re.finditer(sentence_pattern, search_text))
        
        if matches:
            # Return position after the last sentence ending
            last_match = matches[-1]
            return start + last_match.end()
        
        # If no sentence boundary found, look for paragraph breaks
        paragraph_pattern = r'\n\s*\n'
        matches = list(re.finditer(paragraph_pattern, search_text))
        
        if matches:
            last_match = matches[-1]
            return start + last_match.start()
        
        # If no good boundary found, return the end position
        return end
    
    def _build_summarization_prompt(
        self, 
        text: str, 
        max_length: int, 
        style: str
    ) -> str:
        """
        Build the prompt for text summarization.
        
        Args:
            text: Text to summarize
            max_length: Maximum summary length
            style: Summarization style
            
        Returns:
            Formatted prompt
        """
        style_instructions = {
            "concise": "Create a concise summary that captures the main points in clear, direct language.",
            "detailed": "Create a detailed summary that includes important context and supporting details.",
            "bullet-points": "Create a summary using bullet points to organize the key information clearly."
        }
        
        instruction = style_instructions.get(style, style_instructions["concise"])
        
        prompt = f"""Please summarize the following text. {instruction}

Requirements:
- Maximum length: approximately {max_length} words
- Focus on the most important information
- Maintain accuracy and clarity
- Use proper grammar and structure

Text to summarize:
{text}

Summary:"""
        
        return prompt
    
    def validate_text_length(self, text: str) -> bool:
        """
        Validate if text length is within acceptable limits.
        
        Args:
            text: Text to validate
            
        Returns:
            True if text length is valid
        """
        text_length = len(text.strip())
        return 10 <= text_length <= 10000
    
    async def health_check(self) -> bool:
        """
        Check if the summarization service is working properly.
        
        Returns:
            True if service is healthy
        """
        try:
            test_text = "This is a test text for health check. It contains enough content to be summarized properly."
            response = await self.summarize_text(test_text, max_length=50, style="concise")
            return len(response.summary) > 0
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False