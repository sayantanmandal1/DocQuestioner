"""
Unit tests for SummarizationService with mocked OpenRouter responses.
"""
import pytest
from unittest.mock import AsyncMock, Mock, patch
from services.summarization import SummarizationService
from clients.openrouter import OpenRouterClient, OpenRouterAPIError
from models.summarization import SummarizationResponse


class TestSummarizationService:
    """Test cases for SummarizationService."""
    
    @pytest.fixture
    def mock_openrouter_client(self):
        """Create a mocked OpenRouter client."""
        client = Mock(spec=OpenRouterClient)
        client.chat_completion = AsyncMock()
        return client
    
    @pytest.fixture
    def summarization_service(self, mock_openrouter_client):
        """Create SummarizationService with mocked client."""
        return SummarizationService(openrouter_client=mock_openrouter_client)
    
    @pytest.mark.asyncio
    async def test_summarize_short_text_success(self, summarization_service, mock_openrouter_client):
        """Test successful summarization of short text."""
        # Arrange
        input_text = "This is a test text that needs to be summarized. It contains important information."
        expected_summary = "This is a concise summary of the test text."
        mock_openrouter_client.chat_completion.return_value = expected_summary
        
        # Act
        result = await summarization_service.summarize_text(input_text, max_length=150, style="concise")
        
        # Assert
        assert isinstance(result, SummarizationResponse)
        assert result.summary == expected_summary
        assert result.original_length == len(input_text)
        assert result.summary_length == len(expected_summary)
        assert result.compression_ratio == len(expected_summary) / len(input_text)
        
        # Verify API call
        mock_openrouter_client.chat_completion.assert_called_once()
        call_args = mock_openrouter_client.chat_completion.call_args
        assert call_args[1]["max_tokens"] == 300  # max_length * 2
        assert call_args[1]["temperature"] == 0.3
    
    @pytest.mark.asyncio
    async def test_summarize_with_different_styles(self, summarization_service, mock_openrouter_client):
        """Test summarization with different styles."""
        input_text = "This is a test text for style testing. It has multiple sentences and ideas."
        mock_openrouter_client.chat_completion.return_value = "Style-specific summary"
        
        styles = ["concise", "detailed", "bullet-points"]
        
        for style in styles:
            result = await summarization_service.summarize_text(input_text, style=style)
            assert result.summary == "Style-specific summary"
            
            # Check that the prompt contains style-specific instructions
            call_args = mock_openrouter_client.chat_completion.call_args
            messages = call_args[1]["messages"]
            user_message = messages[1]["content"]
            
            if style == "bullet-points":
                assert "bullet points" in user_message.lower()
            elif style == "detailed":
                assert "detailed" in user_message.lower()
            else:  # concise
                assert "concise" in user_message.lower()
    
    @pytest.mark.asyncio
    async def test_summarize_long_text_with_chunking(self, summarization_service, mock_openrouter_client):
        """Test summarization of long text that requires chunking."""
        # Create a long text that exceeds max_chunk_size
        long_text = "This is a sentence. " * 200  # Creates text longer than 3000 chars
        
        # Mock responses for chunk summaries and final summary
        mock_openrouter_client.chat_completion.side_effect = [
            "Summary of chunk 1",
            "Summary of chunk 2", 
            "Final combined summary"
        ]
        
        result = await summarization_service.summarize_text(long_text, max_length=100)
        
        assert result.summary == "Final combined summary"
        assert result.original_length == len(long_text)
        
        # Should be called multiple times for chunking
        assert mock_openrouter_client.chat_completion.call_count >= 2
    
    @pytest.mark.asyncio
    async def test_text_validation_too_short(self, summarization_service):
        """Test validation error for text that's too short."""
        short_text = "Short"
        
        with pytest.raises(ValueError, match="Text must be at least 10 characters long"):
            await summarization_service.summarize_text(short_text)
    
    @pytest.mark.asyncio
    async def test_max_length_validation(self, summarization_service):
        """Test validation for max_length parameter."""
        text = "This is a valid text for testing validation of parameters."
        
        # Test max_length too small
        with pytest.raises(ValueError, match="max_length must be between 50 and 500"):
            await summarization_service.summarize_text(text, max_length=30)
        
        # Test max_length too large
        with pytest.raises(ValueError, match="max_length must be between 50 and 500"):
            await summarization_service.summarize_text(text, max_length=600)
    
    @pytest.mark.asyncio
    async def test_style_validation(self, summarization_service):
        """Test validation for style parameter."""
        text = "This is a valid text for testing style validation."
        
        with pytest.raises(ValueError, match="style must be one of"):
            await summarization_service.summarize_text(text, style="invalid_style")
    
    @pytest.mark.asyncio
    async def test_openrouter_api_error_handling(self, summarization_service, mock_openrouter_client):
        """Test handling of OpenRouter API errors."""
        text = "This is a test text for error handling."
        mock_openrouter_client.chat_completion.side_effect = OpenRouterAPIError("API Error", status_code=429)
        
        with pytest.raises(OpenRouterAPIError):
            await summarization_service.summarize_text(text)
    
    @pytest.mark.asyncio
    async def test_unexpected_error_handling(self, summarization_service, mock_openrouter_client):
        """Test handling of unexpected errors."""
        text = "This is a test text for unexpected error handling."
        mock_openrouter_client.chat_completion.side_effect = Exception("Unexpected error")
        
        with pytest.raises(ValueError, match="Summarization failed"):
            await summarization_service.summarize_text(text)
    
    def test_split_text_into_chunks_short_text(self, summarization_service):
        """Test text splitting for short text that doesn't need chunking."""
        short_text = "This is a short text."
        chunks = summarization_service._split_text_into_chunks(short_text)
        
        assert len(chunks) == 1
        assert chunks[0] == short_text
    
    def test_split_text_into_chunks_long_text(self, summarization_service):
        """Test text splitting for long text."""
        # Create text longer than max_chunk_size
        long_text = "This is a sentence. " * 300
        chunks = summarization_service._split_text_into_chunks(long_text)
        
        assert len(chunks) > 1
        
        # Check that chunks have reasonable sizes
        for chunk in chunks:
            assert len(chunk) <= summarization_service.max_chunk_size + summarization_service.chunk_overlap
        
        # Check that all text is covered
        total_chars = sum(len(chunk) for chunk in chunks)
        # Should be more than original due to overlap, but not too much more
        assert total_chars >= len(long_text)
    
    def test_find_sentence_boundary(self, summarization_service):
        """Test finding sentence boundaries for clean text splitting."""
        text = "First sentence. Second sentence! Third sentence? Fourth sentence."
        
        # Test finding boundary in middle
        boundary = summarization_service._find_sentence_boundary(text, 10, 35)
        assert boundary > 10
        assert text[boundary-2:boundary] in [". ", "! ", "? "]
    
    def test_find_sentence_boundary_no_sentences(self, summarization_service):
        """Test sentence boundary finding when no sentences are found."""
        text = "This is text without proper sentence endings and no periods or exclamations"
        
        boundary = summarization_service._find_sentence_boundary(text, 10, 50)
        assert boundary == 50  # Should return end position
    
    def test_build_summarization_prompt(self, summarization_service):
        """Test prompt building for different styles."""
        text = "Test text for prompt building."
        
        # Test concise style
        prompt = summarization_service._build_summarization_prompt(text, 100, "concise")
        assert "concise" in prompt.lower()
        assert "100 words" in prompt
        assert text in prompt
        
        # Test bullet-points style
        prompt = summarization_service._build_summarization_prompt(text, 150, "bullet-points")
        assert "bullet points" in prompt.lower()
        assert "150 words" in prompt
        
        # Test detailed style
        prompt = summarization_service._build_summarization_prompt(text, 200, "detailed")
        assert "detailed" in prompt.lower()
        assert "200 words" in prompt
    
    def test_validate_text_length(self, summarization_service):
        """Test text length validation."""
        # Valid lengths
        assert summarization_service.validate_text_length("This is valid text.")
        assert summarization_service.validate_text_length("A" * 5000)
        
        # Invalid lengths
        assert not summarization_service.validate_text_length("Short")  # Too short
        assert not summarization_service.validate_text_length("A" * 15000)  # Too long
        assert not summarization_service.validate_text_length("")  # Empty
        assert not summarization_service.validate_text_length("   ")  # Only whitespace
    
    @pytest.mark.asyncio
    async def test_health_check_success(self, summarization_service, mock_openrouter_client):
        """Test successful health check."""
        mock_openrouter_client.chat_completion.return_value = "Health check summary"
        
        result = await summarization_service.health_check()
        assert result is True
    
    @pytest.mark.asyncio
    async def test_health_check_failure(self, summarization_service, mock_openrouter_client):
        """Test health check failure."""
        mock_openrouter_client.chat_completion.side_effect = Exception("Health check failed")
        
        result = await summarization_service.health_check()
        assert result is False
    
    @pytest.mark.asyncio
    async def test_chunking_with_failed_chunks(self, summarization_service, mock_openrouter_client):
        """Test chunking behavior when some chunks fail to summarize."""
        long_text = "This is a sentence. " * 200
        
        # Mock some chunks to fail and others to succeed
        mock_openrouter_client.chat_completion.side_effect = [
            Exception("Chunk 1 failed"),
            "Summary of chunk 2",
            "Final combined summary"
        ]
        
        result = await summarization_service.summarize_text(long_text, max_length=100)
        
        # Should still succeed with remaining chunks
        assert result.summary == "Final combined summary"
    
    @pytest.mark.asyncio
    async def test_chunking_all_chunks_fail(self, summarization_service, mock_openrouter_client):
        """Test chunking behavior when all chunks fail to summarize."""
        long_text = "This is a sentence. " * 200
        
        # Mock all chunks to fail
        mock_openrouter_client.chat_completion.side_effect = Exception("All chunks failed")
        
        with pytest.raises(ValueError, match="Failed to summarize any chunks"):
            await summarization_service.summarize_text(long_text, max_length=100)


class TestSummarizationServiceIntegration:
    """Integration tests for SummarizationService."""
    
    @pytest.mark.asyncio
    async def test_service_initialization_with_default_client(self):
        """Test service initialization with default OpenRouter client."""
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
            service = SummarizationService()
            assert service.client is not None
            assert isinstance(service.client, OpenRouterClient)
    
    @pytest.mark.asyncio
    async def test_service_initialization_without_api_key(self):
        """Test service initialization failure without API key."""
        with patch.dict('os.environ', {}, clear=True):
            with pytest.raises(ValueError, match="OpenRouter API key is required"):
                SummarizationService()
    
    def test_service_configuration(self):
        """Test service configuration parameters."""
        with patch.dict('os.environ', {'OPENAI_API_KEY': 'test-key'}):
            service = SummarizationService()
            
            assert service.max_chunk_size == 3000
            assert service.chunk_overlap == 200
            assert service.max_tokens_per_request == 1000