"""
Unit tests for Pydantic models validation and serialization.
"""
import pytest
from pydantic import ValidationError
from models import (
    SummarizationRequest, SummarizationResponse,
    QARequest, QAResponse,
    LearningPathRequest, LearningPathResponse,
    LearningPhase, Resource
)


class TestSummarizationModels:
    """Test cases for summarization models."""

    def test_summarization_request_valid(self):
        """Test valid summarization request."""
        request = SummarizationRequest(
            text="This is a test text that needs to be summarized.",
            max_length=100,
            style="concise"
        )
        assert request.text == "This is a test text that needs to be summarized."
        assert request.max_length == 100
        assert request.style == "concise"

    def test_summarization_request_defaults(self):
        """Test summarization request with default values."""
        request = SummarizationRequest(text="This is a test text.")
        assert request.max_length == 150
        assert request.style == "concise"

    def test_summarization_request_text_too_short(self):
        """Test validation error for text too short."""
        with pytest.raises(ValidationError) as exc_info:
            SummarizationRequest(text="short")
        assert "at least 10 characters" in str(exc_info.value)

    def test_summarization_request_text_too_long(self):
        """Test validation error for text too long."""
        long_text = "a" * 10001
        with pytest.raises(ValidationError) as exc_info:
            SummarizationRequest(text=long_text)
        assert "at most 10000 characters" in str(exc_info.value)

    def test_summarization_request_invalid_style(self):
        """Test validation error for invalid style."""
        with pytest.raises(ValidationError) as exc_info:
            SummarizationRequest(text="This is a test text.", style="invalid")
        assert "String should match pattern" in str(exc_info.value)

    def test_summarization_request_max_length_bounds(self):
        """Test validation for max_length bounds."""
        # Test lower bound
        with pytest.raises(ValidationError):
            SummarizationRequest(text="This is a test text.", max_length=49)
        
        # Test upper bound
        with pytest.raises(ValidationError):
            SummarizationRequest(text="This is a test text.", max_length=501)

    def test_summarization_response_valid(self):
        """Test valid summarization response."""
        response = SummarizationResponse(
            summary="This is a summary.",
            original_length=100,
            summary_length=50,
            compression_ratio=0.5
        )
        assert response.summary == "This is a summary."
        assert response.original_length == 100
        assert response.summary_length == 50
        assert response.compression_ratio == 0.5

    def test_summarization_response_serialization(self):
        """Test response serialization to dict."""
        response = SummarizationResponse(
            summary="Test summary",
            original_length=100,
            summary_length=50,
            compression_ratio=0.5
        )
        data = response.model_dump()
        assert data["summary"] == "Test summary"
        assert data["original_length"] == 100


class TestQAModels:
    """Test cases for Q&A models."""

    def test_qa_request_valid(self):
        """Test valid Q&A request."""
        request = QARequest(
            question="What is FastAPI?",
            document_text="FastAPI is a web framework."
        )
        assert request.question == "What is FastAPI?"
        assert request.document_text == "FastAPI is a web framework."

    def test_qa_request_question_too_short(self):
        """Test validation error for question too short."""
        with pytest.raises(ValidationError) as exc_info:
            QARequest(question="Hi?")
        assert "at least 5 characters" in str(exc_info.value)

    def test_qa_request_question_too_long(self):
        """Test validation error for question too long."""
        long_question = "What is " + "a" * 500
        with pytest.raises(ValidationError) as exc_info:
            QARequest(question=long_question)
        assert "at most 500 characters" in str(exc_info.value)

    def test_qa_request_optional_document(self):
        """Test Q&A request with optional document."""
        request = QARequest(question="What is the meaning of life?")
        assert request.document_text is None

    def test_qa_response_valid(self):
        """Test valid Q&A response."""
        response = QAResponse(
            answer="FastAPI is a modern web framework.",
            confidence=0.95,
            sources=["FastAPI documentation", "Tutorial section"]
        )
        assert response.answer == "FastAPI is a modern web framework."
        assert response.confidence == 0.95
        assert len(response.sources) == 2

    def test_qa_response_confidence_bounds(self):
        """Test confidence score validation."""
        # Valid confidence
        response = QAResponse(answer="Test answer", confidence=0.5)
        assert response.confidence == 0.5
        
        # Invalid confidence - too low
        with pytest.raises(ValidationError):
            QAResponse(answer="Test answer", confidence=-0.1)
        
        # Invalid confidence - too high
        with pytest.raises(ValidationError):
            QAResponse(answer="Test answer", confidence=1.1)

    def test_qa_response_optional_fields(self):
        """Test Q&A response with optional fields."""
        response = QAResponse(answer="Test answer")
        assert response.confidence is None
        assert response.sources is None


class TestLearningPathModels:
    """Test cases for learning path models."""

    def test_learning_path_request_valid(self):
        """Test valid learning path request."""
        request = LearningPathRequest(
            goals="Learn Python web development",
            skill_level="beginner",
            duration="3-months",
            focus_areas=["FastAPI", "Databases"]
        )
        assert request.goals == "Learn Python web development"
        assert request.skill_level == "beginner"
        assert request.duration == "3-months"
        assert request.focus_areas == ["FastAPI", "Databases"]

    def test_learning_path_request_goals_too_short(self):
        """Test validation error for goals too short."""
        with pytest.raises(ValidationError) as exc_info:
            LearningPathRequest(
                goals="Learn",
                skill_level="beginner",
                duration="1-month"
            )
        assert "at least 10 characters" in str(exc_info.value)

    def test_learning_path_request_invalid_skill_level(self):
        """Test validation error for invalid skill level."""
        with pytest.raises(ValidationError) as exc_info:
            LearningPathRequest(
                goals="Learn Python programming",
                skill_level="expert",
                duration="1-month"
            )
        assert "String should match pattern" in str(exc_info.value)

    def test_learning_path_request_invalid_duration(self):
        """Test validation error for invalid duration."""
        with pytest.raises(ValidationError) as exc_info:
            LearningPathRequest(
                goals="Learn Python programming",
                skill_level="beginner",
                duration="2-years"
            )
        assert "String should match pattern" in str(exc_info.value)

    def test_learning_path_request_default_focus_areas(self):
        """Test default empty focus areas."""
        request = LearningPathRequest(
            goals="Learn Python programming",
            skill_level="beginner",
            duration="1-month"
        )
        assert request.focus_areas == []

    def test_resource_model(self):
        """Test Resource model."""
        resource = Resource(
            title="FastAPI Tutorial",
            type="tutorial",
            url="https://example.com",
            description="Learn FastAPI basics"
        )
        assert resource.title == "FastAPI Tutorial"
        assert resource.type == "tutorial"
        assert resource.url == "https://example.com"
        assert resource.description == "Learn FastAPI basics"

    def test_learning_phase_model(self):
        """Test LearningPhase model."""
        phase = LearningPhase(
            phase_number=1,
            title="Python Basics",
            description="Learn Python fundamentals",
            duration="2-weeks",
            objectives=["Learn syntax", "Understand data types"],
            activities=["Complete tutorials", "Build projects"]
        )
        assert phase.phase_number == 1
        assert phase.title == "Python Basics"
        assert len(phase.objectives) == 2
        assert len(phase.activities) == 2

    def test_learning_phase_invalid_phase_number(self):
        """Test validation error for invalid phase number."""
        with pytest.raises(ValidationError) as exc_info:
            LearningPhase(
                phase_number=0,
                title="Test Phase",
                description="Test description",
                duration="1-week",
                objectives=["Test"],
                activities=["Test"]
            )
        assert "greater than or equal to 1" in str(exc_info.value)

    def test_learning_path_response_valid(self):
        """Test valid learning path response."""
        phase = LearningPhase(
            phase_number=1,
            title="Python Basics",
            description="Learn fundamentals",
            duration="2-weeks",
            objectives=["Learn syntax"],
            activities=["Practice coding"]
        )
        
        resource = Resource(
            title="Python Tutorial",
            type="tutorial"
        )
        
        response = LearningPathResponse(
            title="Python Learning Path",
            duration="3-months",
            skill_level="beginner",
            phases=[phase],
            resources=[resource]
        )
        
        assert response.title == "Python Learning Path"
        assert response.duration == "3-months"
        assert response.skill_level == "beginner"
        assert len(response.phases) == 1
        assert len(response.resources) == 1

    def test_model_serialization(self):
        """Test model serialization to JSON."""
        request = LearningPathRequest(
            goals="Learn Python",
            skill_level="beginner",
            duration="1-month"
        )
        
        json_data = request.model_dump_json()
        assert "Learn Python" in json_data
        assert "beginner" in json_data
        assert "1-month" in json_data


if __name__ == "__main__":
    pytest.main([__file__])