"""
Document Q&A service with document processing and OpenRouter integration.
"""
import re
import logging
from typing import List, Optional, Tuple
from clients.openrouter import OpenRouterClient
from models.qa import QARequest, QAResponse
from exceptions import (
    OpenRouterAPIError,
    DocumentProcessingError,
    ValidationError,
    ConfigurationError
)
from middleware import log_service_error

logger = logging.getLogger(__name__)


class QAService:
    """
    Service for document Q&A with text processing and question answering capabilities.
    """
    
    def __init__(self, openrouter_client: Optional[OpenRouterClient] = None):
        """
        Initialize Q&A service.
        
        Args:
            openrouter_client: OpenRouter client instance. If None, creates a new one.
        """
        try:
            self.client = openrouter_client or OpenRouterClient()
        except ConfigurationError as e:
            log_service_error("QAService", "__init__", e)
            raise
        
        # Configuration for document processing
        self.max_document_size = 50000  # Maximum characters per document
        self.max_chunk_size = 4000      # Maximum characters per chunk for processing
        self.chunk_overlap = 300        # Overlap between chunks to maintain context
        self.max_tokens_per_request = 1500  # Conservative token limit for API calls
        self.min_confidence_threshold = 0.3  # Minimum confidence for answers
        
    async def answer_question(
        self, 
        question: str, 
        document_text: str
    ) -> QAResponse:
        """
        Answer a question based on the provided document.
        
        Args:
            question: Question to be answered
            document_text: Text content of the document
            
        Returns:
            QAResponse with answer, confidence, and sources
            
        Raises:
            ValueError: If question or document is invalid
            DocumentProcessingError: If document processing fails
            OpenRouterAPIError: If API request fails
        """
        # Validate inputs
        self._validate_question(question)
        self._validate_document(document_text)
        
        try:
            # Process document and find relevant sections
            relevant_sections = await self._find_relevant_sections(question, document_text)
            
            if not relevant_sections:
                return QAResponse(
                    answer="I couldn't find relevant information in the document to answer your question.",
                    confidence=0.0,
                    sources=[]
                )
            
            # Generate answer based on relevant sections
            answer, confidence = await self._generate_answer(question, relevant_sections)
            
            # Extract source snippets
            sources = self._extract_source_snippets(relevant_sections, max_snippets=3)
            
            return QAResponse(
                answer=answer,
                confidence=confidence,
                sources=sources
            )
            
        except OpenRouterAPIError as e:
            logger.error(f"OpenRouter API error during Q&A: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error during Q&A: {e}")
            raise DocumentProcessingError(f"Q&A processing failed: {str(e)}")
    
    def process_document(self, file_content: bytes, file_type: str) -> str:
        """
        Process uploaded document and extract text content.
        
        Args:
            file_content: Raw file content as bytes
            file_type: MIME type or file extension
            
        Returns:
            Extracted text content
            
        Raises:
            DocumentProcessingError: If document processing fails
        """
        try:
            # For now, we'll handle plain text files
            # In a production system, you'd add support for PDF, DOCX, etc.
            if file_type.lower() in ['text/plain', '.txt', 'txt']:
                text = file_content.decode('utf-8')
                return self._clean_text(text)
            else:
                raise DocumentProcessingError(
                    f"Unsupported file type: {file_type}. Currently only plain text files are supported."
                )
                
        except UnicodeDecodeError:
            raise DocumentProcessingError("Unable to decode file content. Please ensure the file is in UTF-8 format.")
        except DocumentProcessingError:
            raise
        except Exception as e:
            raise DocumentProcessingError(f"Document processing failed: {str(e)}")
    
    def _validate_question(self, question: str) -> None:
        """
        Validate question input.
        
        Args:
            question: Question to validate
            
        Raises:
            ValueError: If question is invalid
        """
        if not question or not question.strip():
            raise ValidationError("Question cannot be empty", field="question", value=question)
        
        if len(question.strip()) < 5:
            raise ValidationError("Question must be at least 5 characters long", field="question", value=len(question.strip()))
        
        if len(question.strip()) > 500:
            raise ValidationError("Question must be no more than 500 characters long", field="question", value=len(question.strip()))
    
    def _validate_document(self, document_text: str) -> None:
        """
        Validate document input.
        
        Args:
            document_text: Document text to validate
            
        Raises:
            ValueError: If document is invalid
        """
        if not document_text or not document_text.strip():
            raise ValidationError("Document text cannot be empty", field="document_text", value=document_text)
        
        if len(document_text.strip()) < 10:
            raise ValidationError("Document must be at least 10 characters long", field="document_text", value=len(document_text.strip()))
        
        if len(document_text) > self.max_document_size:
            raise ValidationError(f"Document is too large. Maximum size is {self.max_document_size} characters", field="document_text", value=len(document_text))
    
    async def _find_relevant_sections(self, question: str, document_text: str) -> List[str]:
        """
        Find sections of the document that are relevant to the question.
        
        Args:
            question: Question to find relevant sections for
            document_text: Full document text
            
        Returns:
            List of relevant text sections
        """
        # Split document into chunks
        chunks = self._split_document_into_chunks(document_text)
        
        # Score each chunk for relevance to the question
        relevant_chunks = []
        
        for chunk in chunks:
            try:
                relevance_score = await self._score_chunk_relevance(question, chunk)
                if relevance_score > self.min_confidence_threshold:
                    relevant_chunks.append((chunk, relevance_score))
            except Exception as e:
                logger.warning(f"Failed to score chunk relevance: {e}")
                continue
        
        # Sort by relevance score and return top chunks
        relevant_chunks.sort(key=lambda x: x[1], reverse=True)
        
        # Return top 3 most relevant chunks
        return [chunk for chunk, score in relevant_chunks[:3]]
    
    async def _score_chunk_relevance(self, question: str, chunk: str) -> float:
        """
        Score how relevant a chunk is to the question.
        
        Args:
            question: Question to score against
            chunk: Text chunk to score
            
        Returns:
            Relevance score between 0.0 and 1.0
        """
        prompt = f"""Rate how relevant the following text passage is to answering the given question.
Respond with only a number between 0.0 and 1.0, where:
- 0.0 = completely irrelevant
- 0.5 = somewhat relevant
- 1.0 = highly relevant and directly answers the question

Question: {question}

Text passage:
{chunk}

Relevance score:"""
        
        messages = [
            {"role": "system", "content": "You are an expert at evaluating text relevance. Respond only with a decimal number between 0.0 and 1.0."},
            {"role": "user", "content": prompt}
        ]
        
        try:
            response = await self.client.chat_completion(
                messages=messages,
                max_tokens=10,
                temperature=0.1
            )
            
            # Extract numeric score from response
            score_text = response.strip()
            score = float(score_text)
            
            # Ensure score is within valid range
            return max(0.0, min(1.0, score))
            
        except (ValueError, OpenRouterAPIError) as e:
            logger.warning(f"Failed to score chunk relevance: {e}")
            # Fallback: simple keyword matching
            return self._simple_keyword_relevance(question, chunk)
    
    def _simple_keyword_relevance(self, question: str, chunk: str) -> float:
        """
        Simple keyword-based relevance scoring as fallback.
        
        Args:
            question: Question to score against
            chunk: Text chunk to score
            
        Returns:
            Simple relevance score between 0.0 and 1.0
        """
        question_words = set(re.findall(r'\b\w+\b', question.lower()))
        chunk_words = set(re.findall(r'\b\w+\b', chunk.lower()))
        
        # Remove common stop words
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'}
        question_words -= stop_words
        chunk_words -= stop_words
        
        if not question_words:
            return 0.0
        
        # Calculate overlap ratio
        overlap = len(question_words.intersection(chunk_words))
        return min(1.0, overlap / len(question_words))
    
    async def _generate_answer(self, question: str, relevant_sections: List[str]) -> Tuple[str, float]:
        """
        Generate an answer based on relevant document sections.
        
        Args:
            question: Question to answer
            relevant_sections: List of relevant text sections
            
        Returns:
            Tuple of (answer, confidence_score)
        """
        # Combine relevant sections
        context = "\n\n".join(relevant_sections)
        
        prompt = f"""Based on the following context from a document, please answer the question accurately and concisely.

Context:
{context}

Question: {question}

Instructions:
- Provide a clear, direct answer based only on the information in the context
- If the context doesn't contain enough information to answer the question, say so
- Be specific and cite relevant details from the context
- Keep the answer focused and concise

Answer:"""
        
        messages = [
            {"role": "system", "content": "You are a helpful assistant that answers questions based on provided context. Only use information from the given context to answer questions."},
            {"role": "user", "content": prompt}
        ]
        
        answer = await self.client.chat_completion(
            messages=messages,
            max_tokens=self.max_tokens_per_request,
            temperature=0.2  # Lower temperature for more factual answers
        )
        
        # Estimate confidence based on answer quality
        confidence = self._estimate_answer_confidence(answer, question, context)
        
        return answer.strip(), confidence
    
    def _estimate_answer_confidence(self, answer: str, question: str, context: str) -> float:
        """
        Estimate confidence in the generated answer.
        
        Args:
            answer: Generated answer
            question: Original question
            context: Context used for answering
            
        Returns:
            Confidence score between 0.0 and 1.0
        """
        # Simple heuristics for confidence estimation
        confidence = 0.5  # Base confidence
        
        # Check if answer indicates uncertainty
        uncertainty_phrases = [
            "i don't know", "not sure", "unclear", "cannot determine",
            "not enough information", "doesn't contain", "unable to answer"
        ]
        
        answer_lower = answer.lower()
        if any(phrase in answer_lower for phrase in uncertainty_phrases):
            confidence = 0.2
        
        # Check if answer is too short (might indicate lack of information)
        if len(answer.strip()) < 20:
            confidence *= 0.7
        
        # Check if answer is very long (might indicate hallucination)
        if len(answer.strip()) > 500:
            confidence *= 0.6
        
        # Check for specific details (indicates good grounding in context)
        if len(answer.split()) > 10 and any(word in context.lower() for word in answer.lower().split()[:10]):
            confidence = min(1.0, confidence + 0.2)
        
        return max(0.0, min(1.0, confidence))
    
    def _split_document_into_chunks(self, document_text: str) -> List[str]:
        """
        Split document into overlapping chunks for processing.
        
        Args:
            document_text: Document text to split
            
        Returns:
            List of text chunks
        """
        if len(document_text) <= self.max_chunk_size:
            return [document_text]
        
        chunks = []
        start = 0
        
        while start < len(document_text):
            end = start + self.max_chunk_size
            
            # If this isn't the last chunk, try to break at a sentence boundary
            if end < len(document_text):
                # Look for sentence endings within the overlap region
                search_start = max(start, end - self.chunk_overlap)
                sentence_break = self._find_sentence_boundary(document_text, search_start, end)
                
                if sentence_break > start:
                    end = sentence_break
            
            chunk = document_text[start:end].strip()
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
    
    def _extract_source_snippets(self, relevant_sections: List[str], max_snippets: int = 3) -> List[str]:
        """
        Extract source snippets from relevant sections.
        
        Args:
            relevant_sections: List of relevant text sections
            max_snippets: Maximum number of snippets to return
            
        Returns:
            List of source snippets
        """
        snippets = []
        
        for section in relevant_sections[:max_snippets]:
            # Extract first sentence or first 100 characters, whichever is shorter
            sentences = re.split(r'[.!?]+', section)
            if sentences and sentences[0].strip():
                snippet = sentences[0].strip()
                if len(snippet) > 100:
                    snippet = snippet[:97] + "..."
                snippets.append(snippet)
            elif len(section) > 100:
                snippets.append(section[:97] + "...")
            else:
                snippets.append(section.strip())
        
        return snippets
    
    def _clean_text(self, text: str) -> str:
        """
        Clean and normalize text content.
        
        Args:
            text: Raw text to clean
            
        Returns:
            Cleaned text
        """
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove control characters except newlines and tabs
        text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
        
        # Normalize line breaks
        text = re.sub(r'\r\n|\r', '\n', text)
        
        return text.strip()
    
    async def health_check(self) -> bool:
        """
        Check if the Q&A service is working properly.
        
        Returns:
            True if service is healthy
        """
        try:
            test_document = "FastAPI is a modern, fast web framework for building APIs with Python. It provides automatic API documentation and high performance."
            test_question = "What is FastAPI?"
            
            response = await self.answer_question(test_question, test_document)
            return len(response.answer) > 0 and "fastapi" in response.answer.lower()
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False