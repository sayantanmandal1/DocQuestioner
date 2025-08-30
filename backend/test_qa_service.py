"""
Unit tests for the Q&A service.
"""
import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from services.qa import QAService, DocumentProcessingError
from clients.openrouter import OpenRouterAPIError
from models.qa import QAResponse


class TestQAService:
    """Test cases for QAService class."""
    
    @pytest.fixture
    def mock_openrouter_client(self):
        """Create a mock OpenRouter client."""
        client = Mock()
        client.chat_completion = AsyncMock()
        return client
    
    @pytest.fixture
    def qa_service(self, mock_openrouter_client):
        """Create QAService instance with mocked client."""
        return QAService(openrouter_client=mock_openrouter_client)
    
    @pytest.fixture
    def sample_document(self):
        """Sample document for testing."""
        return """
        FastAPI is a modern, fast web framework for building APIs with Python 3.7+ based on standard Python type hints.
        
        Key features of FastAPI include:
        - Automatic API documentation with Swagger UI
        - High performance, on par with NodeJS and Go
        - Easy to use and learn
        - Built-in data validation using Pydantic
        - Async support for high concurrency
        
        FastAPI was created by Sebastian Ramirez and is built on top of Starlette for the web parts and Pydantic for the data parts.
        It's designed to be easy to use while providing professional-grade features for production applications.
        """
    
    @pytest.fixture
    def sample_question(self):
        """Sample question for testing."""
        return "What are the key features of FastAPI?"

    # Test answer_question method
    @pytest.mark.asyncio
    async def test_answer_question_success(self, qa_service, mock_openrouter_client, sample_document, sample_question):
        """Test successful question answering."""
        # Mock relevance scoring
        mock_openrouter_client.chat_completion.side_effect = [
            "0.9",  # High relevance score for chunk
            "FastAPI's key features include automatic API documentation with Swagger UI, high performance comparable to NodeJS and Go, ease of use and learning, built-in data validation using Pydantic, and async support for high concurrency."
        ]
        
        response = await qa_service.answer_question(sample_question, sample_document)
        
        assert isinstance(response, QAResponse)
        assert len(response.answer) > 0
        assert "fastapi" in response.answer.lower()
        assert response.confidence > 0
        assert isinstance(response.sources, list)
    
    @pytest.mark.asyncio
    async def test_answer_question_empty_question(self, qa_service, sample_document):
        """Test error handling for empty question."""
        with pytest.raises(ValueError, match="Question cannot be empty"):
            await qa_service.answer_question("", sample_document)
    
    @pytest.mark.asyncio
    async def test_answer_question_short_question(self, qa_service, sample_document):
        """Test error handling for too short question."""
        with pytest.raises(ValueError, match="Question must be at least 5 characters long"):
            await qa_service.answer_question("Hi?", sample_document)
    
    @pytest.mark.asyncio
    async def test_answer_question_long_question(self, qa_service, sample_document):
        """Test error handling for too long question."""
        long_question = "What is " + "very " * 100 + "long question?"
        with pytest.raises(ValueError, match="Question must be no more than 500 characters long"):
            await qa_service.answer_question(long_question, sample_document)
    
    @pytest.mark.asyncio
    async def test_answer_question_empty_document(self, qa_service, sample_question):
        """Test error handling for empty document."""
        with pytest.raises(ValueError, match="Document text cannot be empty"):
            await qa_service.answer_question(sample_question, "")
    
    @pytest.mark.asyncio
    async def test_answer_question_short_document(self, qa_service, sample_question):
        """Test error handling for too short document."""
        with pytest.raises(ValueError, match="Document must be at least 10 characters long"):
            await qa_service.answer_question(sample_question, "Short")
    
    @pytest.mark.asyncio
    async def test_answer_question_large_document(self, qa_service, sample_question):
        """Test error handling for too large document."""
        large_document = "This is a very long document. " * 2000  # Exceeds max_document_size
        with pytest.raises(ValueError, match="Document is too large"):
            await qa_service.answer_question(sample_question, large_document)
    
    @pytest.mark.asyncio
    async def test_answer_question_no_relevant_sections(self, qa_service, mock_openrouter_client):
        """Test handling when no relevant sections are found."""
        # Mock low relevance scores
        mock_openrouter_client.chat_completion.return_value = "0.1"  # Low relevance
        
        response = await qa_service.answer_question(
            "What is quantum computing?", 
            "This document is about cooking recipes and has nothing to do with technology."
        )
        
        assert "couldn't find relevant information" in response.answer
        assert response.confidence == 0.0
        assert response.sources == []
    
    @pytest.mark.asyncio
    async def test_answer_question_api_error(self, qa_service, mock_openrouter_client, sample_document, sample_question):
        """Test handling of OpenRouter API errors."""
        mock_openrouter_client.chat_completion.side_effect = OpenRouterAPIError("API Error")
        
        with pytest.raises(OpenRouterAPIError):
            await qa_service.answer_question(sample_question, sample_document)

    # Test process_document method
    def test_process_document_text_file(self, qa_service):
        """Test processing plain text files."""
        file_content = b"This is a test document with some content."
        result = qa_service.process_document(file_content, "text/plain")
        
        assert result == "This is a test document with some content."
    
    def test_process_document_txt_extension(self, qa_service):
        """Test processing .txt files."""
        file_content = b"This is a test document with some content."
        result = qa_service.process_document(file_content, ".txt")
        
        assert result == "This is a test document with some content."
    
    def test_process_document_unsupported_type(self, qa_service):
        """Test error handling for unsupported file types."""
        file_content = b"Some binary content"
        
        with pytest.raises(DocumentProcessingError, match="Unsupported file type"):
            qa_service.process_document(file_content, "application/pdf")
    
    def test_process_document_invalid_encoding(self, qa_service):
        """Test error handling for invalid file encoding."""
        # Create invalid UTF-8 bytes
        file_content = b'\xff\xfe\x00\x00invalid'
        
        with pytest.raises(DocumentProcessingError, match="Unable to decode file content"):
            qa_service.process_document(file_content, "text/plain")

    # Test validation methods
    def test_validate_question_valid(self, qa_service):
        """Test question validation with valid input."""
        # Should not raise any exception
        qa_service._validate_question("What is FastAPI?")
    
    def test_validate_question_empty(self, qa_service):
        """Test question validation with empty input."""
        with pytest.raises(ValueError, match="Question cannot be empty"):
            qa_service._validate_question("")
    
    def test_validate_question_whitespace_only(self, qa_service):
        """Test question validation with whitespace only."""
        with pytest.raises(ValueError, match="Question cannot be empty"):
            qa_service._validate_question("   ")
    
    def test_validate_question_too_short(self, qa_service):
        """Test question validation with too short input."""
        with pytest.raises(ValueError, match="Question must be at least 5 characters long"):
            qa_service._validate_question("Hi?")
    
    def test_validate_question_too_long(self, qa_service):
        """Test question validation with too long input."""
        long_question = "What is " + "very " * 100 + "long?"
        with pytest.raises(ValueError, match="Question must be no more than 500 characters long"):
            qa_service._validate_question(long_question)
    
    def test_validate_document_valid(self, qa_service):
        """Test document validation with valid input."""
        # Should not raise any exception
        qa_service._validate_document("This is a valid document with enough content.")
    
    def test_validate_document_empty(self, qa_service):
        """Test document validation with empty input."""
        with pytest.raises(ValueError, match="Document text cannot be empty"):
            qa_service._validate_document("")
    
    def test_validate_document_too_short(self, qa_service):
        """Test document validation with too short input."""
        with pytest.raises(ValueError, match="Document must be at least 10 characters long"):
            qa_service._validate_document("Short")
    
    def test_validate_document_too_large(self, qa_service):
        """Test document validation with too large input."""
        large_document = "This is a very long document. " * 2000
        with pytest.raises(ValueError, match="Document is too large"):
            qa_service._validate_document(large_document)

    # Test text processing methods
    def test_split_document_small(self, qa_service):
        """Test document splitting with small document."""
        small_doc = "This is a small document."
        chunks = qa_service._split_document_into_chunks(small_doc)
        
        assert len(chunks) == 1
        assert chunks[0] == small_doc
    
    def test_split_document_large(self, qa_service):
        """Test document splitting with large document."""
        # Create a document larger than max_chunk_size
        large_doc = "This is a sentence. " * 300  # Should exceed max_chunk_size
        chunks = qa_service._split_document_into_chunks(large_doc)
        
        assert len(chunks) > 1
        for chunk in chunks:
            assert len(chunk) <= qa_service.max_chunk_size + qa_service.chunk_overlap
    
    def test_find_sentence_boundary(self, qa_service):
        """Test finding sentence boundaries."""
        text = "First sentence. Second sentence! Third sentence? Fourth sentence."
        
        # Should find boundary after "Second sentence!"
        boundary = qa_service._find_sentence_boundary(text, 10, 35)
        assert boundary > 10
        assert text[boundary-2:boundary] in [". ", "! ", "? "]
    
    def test_find_sentence_boundary_no_sentences(self, qa_service):
        """Test finding sentence boundary when no sentences exist."""
        text = "This is text without proper sentence endings"
        boundary = qa_service._find_sentence_boundary(text, 0, 20)
        
        # Should return the end position when no boundary found
        assert boundary == 20
    
    def test_extract_source_snippets(self, qa_service):
        """Test extracting source snippets."""
        sections = [
            "This is the first relevant section with important information.",
            "This is the second section. It has multiple sentences and provides context.",
            "Third section is shorter."
        ]
        
        snippets = qa_service._extract_source_snippets(sections, max_snippets=2)
        
        assert len(snippets) <= 2
        assert all(len(snippet) <= 100 for snippet in snippets)
    
    def test_clean_text(self, qa_service):
        """Test text cleaning functionality."""
        dirty_text = "  This   has\t\texcessive\n\n\nwhitespace  \r\n  "
        clean_text = qa_service._clean_text(dirty_text)
        
        assert clean_text == "This has excessive whitespace"
    
    def test_clean_text_with_control_characters(self, qa_service):
        """Test text cleaning with control characters."""
        text_with_control = "Normal text\x00with\x07control\x1Fcharacters"
        clean_text = qa_service._clean_text(text_with_control)
        
        assert "\x00" not in clean_text
        assert "\x07" not in clean_text
        assert "\x1F" not in clean_text
        assert "Normal textwithcontrol characters" == clean_text

    # Test confidence estimation
    def test_estimate_answer_confidence_uncertain(self, qa_service):
        """Test confidence estimation for uncertain answers."""
        uncertain_answer = "I don't know the answer to this question."
        confidence = qa_service._estimate_answer_confidence(uncertain_answer, "What is X?", "Some context")
        
        assert confidence == 0.2  # Low confidence for uncertain answers
    
    def test_estimate_answer_confidence_short(self, qa_service):
        """Test confidence estimation for short answers."""
        short_answer = "Yes."
        confidence = qa_service._estimate_answer_confidence(short_answer, "Is X true?", "Some context")
        
        assert confidence < 0.5  # Reduced confidence for short answers
    
    def test_estimate_answer_confidence_long(self, qa_service):
        """Test confidence estimation for very long answers."""
        long_answer = "This is a very long answer that goes on and on. " * 20
        confidence = qa_service._estimate_answer_confidence(long_answer, "What is X?", "Different context")
        
        # Long answers get penalized (0.5 * 0.6 = 0.3), but might get boosted if they match context
        assert confidence <= 0.5  # Should not exceed base confidence for very long answers
    
    def test_estimate_answer_confidence_good(self, qa_service):
        """Test confidence estimation for good answers."""
        good_answer = "FastAPI is a modern web framework with automatic documentation and high performance."
        context = "FastAPI is a modern, fast web framework for building APIs with automatic documentation."
        confidence = qa_service._estimate_answer_confidence(good_answer, "What is FastAPI?", context)
        
        assert confidence > 0.5  # Higher confidence for well-grounded answers

    # Test simple keyword relevance
    def test_simple_keyword_relevance_high(self, qa_service):
        """Test simple keyword relevance with high overlap."""
        question = "What are the benefits of FastAPI?"
        chunk = "FastAPI provides many benefits including high performance and automatic documentation."
        
        relevance = qa_service._simple_keyword_relevance(question, chunk)
        assert relevance > 0.3  # Should have decent relevance
    
    def test_simple_keyword_relevance_low(self, qa_service):
        """Test simple keyword relevance with low overlap."""
        question = "What are the benefits of FastAPI?"
        chunk = "Cooking recipes are important for making delicious meals."
        
        relevance = qa_service._simple_keyword_relevance(question, chunk)
        assert relevance < 0.3  # Should have low relevance
    
    def test_simple_keyword_relevance_no_keywords(self, qa_service):
        """Test simple keyword relevance with no meaningful keywords."""
        question = "What is the and or but?"  # Only stop words
        chunk = "Some text content here."
        
        relevance = qa_service._simple_keyword_relevance(question, chunk)
        assert relevance == 0.0  # Should have zero relevance

    # Test health check
    @pytest.mark.asyncio
    async def test_health_check_success(self, qa_service, mock_openrouter_client):
        """Test successful health check."""
        # Mock successful API responses
        mock_openrouter_client.chat_completion.side_effect = [
            "0.8",  # Relevance score
            "FastAPI is a modern, fast web framework for building APIs with Python."
        ]
        
        is_healthy = await qa_service.health_check()
        assert is_healthy is True
    
    @pytest.mark.asyncio
    async def test_health_check_failure(self, qa_service, mock_openrouter_client):
        """Test health check failure."""
        mock_openrouter_client.chat_completion.side_effect = OpenRouterAPIError("API Error")
        
        is_healthy = await qa_service.health_check()
        assert is_healthy is False


# Integration tests (require actual API key)
class TestQAServiceIntegration:
    """Integration tests for QAService (requires API key)."""
    
    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_real_qa_workflow(self):
        """Test complete Q&A workflow with real API."""
        # Skip if no API key available
        import os
        if not os.getenv("OPENAI_API_KEY"):
            pytest.skip("No API key available for integration test")
        
        qa_service = QAService()
        
        document = """
        Python is a high-level, interpreted programming language with dynamic semantics.
        Its high-level built-in data structures, combined with dynamic typing and dynamic binding,
        make it very attractive for Rapid Application Development, as well as for use as a
        scripting or glue language to connect existing components together.
        
        Python's simple, easy to learn syntax emphasizes readability and therefore reduces
        the cost of program maintenance. Python supports modules and packages, which encourages
        program modularity and code reuse.
        """
        
        question = "What makes Python attractive for Rapid Application Development?"
        
        response = await qa_service.answer_question(question, document)
        
        assert isinstance(response, QAResponse)
        assert len(response.answer) > 0
        assert response.confidence > 0
        assert "python" in response.answer.lower()
        assert isinstance(response.sources, list)


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])