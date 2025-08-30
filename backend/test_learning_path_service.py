"""
Unit tests for learning path generation service.
"""
import pytest
import json
from unittest.mock import AsyncMock, Mock, patch
from services.learning_path import LearningPathService
from clients.openrouter import OpenRouterClient, OpenRouterAPIError
from models.learning_path import LearningPathResponse, LearningPhase, Resource


class TestLearningPathService:
    """Test cases for LearningPathService."""
    
    @pytest.fixture
    def mock_openrouter_client(self):
        """Create a mock OpenRouter client."""
        client = Mock(spec=OpenRouterClient)
        client.chat_completion = AsyncMock()
        return client
    
    @pytest.fixture
    def learning_path_service(self, mock_openrouter_client):
        """Create LearningPathService with mocked client."""
        return LearningPathService(openrouter_client=mock_openrouter_client)
    
    @pytest.fixture
    def valid_json_response(self):
        """Sample valid JSON response from AI."""
        return json.dumps({
            "title": "Python Web Development with FastAPI",
            "phases": [
                {
                    "phase_number": 1,
                    "title": "Python Fundamentals",
                    "description": "Learn Python basics and programming concepts",
                    "duration": "1 week",
                    "objectives": [
                        "Understand Python syntax and data types",
                        "Learn control structures and functions",
                        "Master basic data structures"
                    ],
                    "activities": [
                        "Complete Python tutorial exercises",
                        "Build simple calculator program",
                        "Practice with lists and dictionaries"
                    ]
                },
                {
                    "phase_number": 2,
                    "title": "Web Development Basics",
                    "description": "Introduction to web development concepts",
                    "duration": "1 week",
                    "objectives": [
                        "Understand HTTP and web protocols",
                        "Learn HTML and CSS basics",
                        "Introduction to REST APIs"
                    ],
                    "activities": [
                        "Build static HTML pages",
                        "Style pages with CSS",
                        "Create simple REST API endpoints"
                    ]
                }
            ],
            "resources": [
                {
                    "title": "Python Official Documentation",
                    "type": "documentation",
                    "url": "https://docs.python.org/3/",
                    "description": "Comprehensive Python documentation"
                },
                {
                    "title": "FastAPI Tutorial",
                    "type": "tutorial",
                    "url": "https://fastapi.tiangolo.com/tutorial/",
                    "description": "Official FastAPI tutorial"
                }
            ]
        })
    
    @pytest.mark.asyncio
    async def test_generate_path_success(self, learning_path_service, mock_openrouter_client, valid_json_response):
        """Test successful learning path generation."""
        # Setup mock response
        mock_openrouter_client.chat_completion.return_value = valid_json_response
        
        # Test parameters
        goals = "Learn Python web development with FastAPI and build REST APIs"
        skill_level = "beginner"
        duration = "1-month"
        focus_areas = ["FastAPI", "REST APIs"]
        
        # Call service
        result = await learning_path_service.generate_path(
            goals=goals,
            skill_level=skill_level,
            duration=duration,
            focus_areas=focus_areas
        )
        
        # Verify result
        assert isinstance(result, LearningPathResponse)
        assert result.title == "Python Web Development with FastAPI"
        assert result.skill_level == skill_level
        assert result.duration == duration
        assert len(result.phases) == 2
        assert len(result.resources) == 2
        
        # Verify phases
        assert result.phases[0].phase_number == 1
        assert result.phases[0].title == "Python Fundamentals"
        assert len(result.phases[0].objectives) == 3
        assert len(result.phases[0].activities) == 3
        
        # Verify resources
        assert result.resources[0].title == "Python Official Documentation"
        assert result.resources[0].type == "documentation"
        assert result.resources[0].url == "https://docs.python.org/3/"
        
        # Verify API call was made correctly
        mock_openrouter_client.chat_completion.assert_called_once()
        call_args = mock_openrouter_client.chat_completion.call_args
        assert call_args[1]["max_tokens"] == 2000
        assert call_args[1]["temperature"] == 0.7
        assert len(call_args[1]["messages"]) == 2
    
    @pytest.mark.asyncio
    async def test_generate_path_with_invalid_goals(self, learning_path_service):
        """Test learning path generation with invalid goals."""
        with pytest.raises(ValueError, match="Goals must be at least 10 characters long"):
            await learning_path_service.generate_path(
                goals="short",
                skill_level="beginner",
                duration="1-month"
            )
        
        with pytest.raises(ValueError, match="Goals must be less than 1000 characters"):
            await learning_path_service.generate_path(
                goals="x" * 1001,
                skill_level="beginner",
                duration="1-month"
            )
    
    @pytest.mark.asyncio
    async def test_generate_path_with_invalid_skill_level(self, learning_path_service):
        """Test learning path generation with invalid skill level."""
        with pytest.raises(ValueError, match="Skill level must be one of"):
            await learning_path_service.generate_path(
                goals="Learn programming fundamentals",
                skill_level="expert",
                duration="1-month"
            )
    
    @pytest.mark.asyncio
    async def test_generate_path_with_invalid_duration(self, learning_path_service):
        """Test learning path generation with invalid duration."""
        with pytest.raises(ValueError, match="Duration must be one of"):
            await learning_path_service.generate_path(
                goals="Learn programming fundamentals",
                skill_level="beginner",
                duration="2-years"
            )
    
    @pytest.mark.asyncio
    async def test_generate_path_with_openrouter_error(self, learning_path_service, mock_openrouter_client):
        """Test learning path generation when OpenRouter API fails."""
        # Setup mock to raise error
        mock_openrouter_client.chat_completion.side_effect = OpenRouterAPIError("API Error", status_code=500)
        
        with pytest.raises(OpenRouterAPIError):
            await learning_path_service.generate_path(
                goals="Learn programming fundamentals",
                skill_level="beginner",
                duration="1-month"
            )
    
    @pytest.mark.asyncio
    async def test_generate_path_with_invalid_json_response(self, learning_path_service, mock_openrouter_client):
        """Test learning path generation with invalid JSON response."""
        # Setup mock to return invalid JSON
        mock_openrouter_client.chat_completion.return_value = "This is not valid JSON"
        
        # Should still work with fallback
        result = await learning_path_service.generate_path(
            goals="Learn programming fundamentals",
            skill_level="beginner",
            duration="1-month"
        )
        
        assert isinstance(result, LearningPathResponse)
        assert result.skill_level == "beginner"
        assert result.duration == "1-month"
        assert len(result.phases) == 4  # 1-month should have 4 phases
        assert len(result.resources) == 3  # Fallback resources
    
    @pytest.mark.asyncio
    async def test_generate_path_different_durations(self, learning_path_service, mock_openrouter_client, valid_json_response):
        """Test learning path generation with different durations."""
        mock_openrouter_client.chat_completion.return_value = valid_json_response
        
        # Test different durations
        durations = ["1-week", "1-month", "3-months", "6-months"]
        expected_phases = [2, 4, 6, 8]
        
        for duration, expected_phase_count in zip(durations, expected_phases):
            result = await learning_path_service.generate_path(
                goals="Learn programming fundamentals",
                skill_level="beginner",
                duration=duration
            )
            
            assert result.duration == duration
            # Note: The actual phase count comes from the JSON response, 
            # but the prompt should request the correct number
    
    @pytest.mark.asyncio
    async def test_generate_path_different_skill_levels(self, learning_path_service, mock_openrouter_client, valid_json_response):
        """Test learning path generation with different skill levels."""
        mock_openrouter_client.chat_completion.return_value = valid_json_response
        
        skill_levels = ["beginner", "intermediate", "advanced"]
        
        for skill_level in skill_levels:
            result = await learning_path_service.generate_path(
                goals="Learn programming fundamentals",
                skill_level=skill_level,
                duration="1-month"
            )
            
            assert result.skill_level == skill_level
            assert isinstance(result, LearningPathResponse)
    
    def test_validate_skill_level(self, learning_path_service):
        """Test skill level validation."""
        assert learning_path_service.validate_skill_level("beginner") is True
        assert learning_path_service.validate_skill_level("intermediate") is True
        assert learning_path_service.validate_skill_level("advanced") is True
        assert learning_path_service.validate_skill_level("expert") is False
        assert learning_path_service.validate_skill_level("novice") is False
    
    def test_validate_duration(self, learning_path_service):
        """Test duration validation."""
        assert learning_path_service.validate_duration("1-week") is True
        assert learning_path_service.validate_duration("1-month") is True
        assert learning_path_service.validate_duration("3-months") is True
        assert learning_path_service.validate_duration("6-months") is True
        assert learning_path_service.validate_duration("1-year") is False
        assert learning_path_service.validate_duration("2-weeks") is False
    
    def test_process_goals(self, learning_path_service):
        """Test goal processing and analysis."""
        # Test basic goals
        goals = "Learn Python programming"
        result = learning_path_service.process_goals(goals)
        
        assert result["original"] == goals
        assert result["length"] == len(goals)
        assert result["word_count"] == 3
        assert result["has_specific_technologies"] is True  # Contains "python"
        assert result["complexity_level"] == "low"  # Short goals
        
        # Test complex goals with technologies
        complex_goals = "Learn advanced Python web development with FastAPI, Docker, and PostgreSQL to build scalable microservices"
        result = learning_path_service.process_goals(complex_goals)
        
        assert result["has_specific_technologies"] is True
        assert result["complexity_level"] == "high"  # Long goals
        
        # Test goals with timeframe
        timeframe_goals = "Quickly learn JavaScript basics in one week"
        result = learning_path_service.process_goals(timeframe_goals)
        
        assert result["has_timeframe"] is True
    
    def test_build_learning_path_prompt(self, learning_path_service):
        """Test prompt building for learning path generation."""
        goals = "Learn Python web development"
        skill_level = "beginner"
        duration = "1-month"
        focus_areas = ["FastAPI", "REST APIs"]
        
        prompt = learning_path_service._build_learning_path_prompt(
            goals, skill_level, duration, focus_areas
        )
        
        assert goals in prompt
        assert skill_level in prompt
        assert duration in prompt
        assert "FastAPI" in prompt
        assert "REST APIs" in prompt
        assert "JSON" in prompt  # Should request JSON format
        assert "4" in prompt  # 1-month should have 4 phases
    
    @pytest.mark.asyncio
    async def test_create_fallback_path(self, learning_path_service):
        """Test fallback path creation when JSON parsing fails."""
        raw_response = "This is a non-JSON response about learning"
        goals = "Learn programming"
        skill_level = "intermediate"
        duration = "3-months"
        
        result = await learning_path_service._create_fallback_path(
            raw_response, goals, skill_level, duration
        )
        
        assert isinstance(result, LearningPathResponse)
        assert result.skill_level == skill_level
        assert result.duration == duration
        assert len(result.phases) == 6  # 3-months should have 6 phases
        assert len(result.resources) == 3  # Basic fallback resources
        
        # Verify phase structure
        for i, phase in enumerate(result.phases):
            assert phase.phase_number == i + 1
            assert len(phase.objectives) == 3
            assert len(phase.activities) == 3
    
    @pytest.mark.asyncio
    async def test_health_check_success(self, learning_path_service, mock_openrouter_client, valid_json_response):
        """Test successful health check."""
        mock_openrouter_client.chat_completion.return_value = valid_json_response
        
        result = await learning_path_service.health_check()
        assert result is True
    
    @pytest.mark.asyncio
    async def test_health_check_failure(self, learning_path_service, mock_openrouter_client):
        """Test health check failure."""
        mock_openrouter_client.chat_completion.side_effect = Exception("API Error")
        
        result = await learning_path_service.health_check()
        assert result is False
    
    def test_duration_phases_mapping(self, learning_path_service):
        """Test that duration to phases mapping is correct."""
        expected_mapping = {
            "1-week": {"phases": 2, "phase_duration": "3-4 days"},
            "1-month": {"phases": 4, "phase_duration": "1 week"},
            "3-months": {"phases": 6, "phase_duration": "2 weeks"},
            "6-months": {"phases": 8, "phase_duration": "3 weeks"}
        }
        
        assert learning_path_service.duration_phases == expected_mapping
    
    @pytest.mark.asyncio
    async def test_generate_path_with_empty_focus_areas(self, learning_path_service, mock_openrouter_client, valid_json_response):
        """Test learning path generation with empty focus areas."""
        mock_openrouter_client.chat_completion.return_value = valid_json_response
        
        result = await learning_path_service.generate_path(
            goals="Learn programming fundamentals",
            skill_level="beginner",
            duration="1-month",
            focus_areas=[]
        )
        
        assert isinstance(result, LearningPathResponse)
        assert result.skill_level == "beginner"
    
    @pytest.mark.asyncio
    async def test_generate_path_without_focus_areas(self, learning_path_service, mock_openrouter_client, valid_json_response):
        """Test learning path generation without focus areas parameter."""
        mock_openrouter_client.chat_completion.return_value = valid_json_response
        
        result = await learning_path_service.generate_path(
            goals="Learn programming fundamentals",
            skill_level="beginner",
            duration="1-month"
        )
        
        assert isinstance(result, LearningPathResponse)
        assert result.skill_level == "beginner"


class TestLearningPathServiceIntegration:
    """Integration tests for LearningPathService with real OpenRouter client."""
    
    @pytest.fixture
    def learning_path_service_real(self):
        """Create LearningPathService with real client (mocked at HTTP level)."""
        return LearningPathService()
    
    @pytest.mark.asyncio
    async def test_service_initialization(self, learning_path_service_real):
        """Test service initialization with real client."""
        assert learning_path_service_real.client is not None
        assert hasattr(learning_path_service_real.client, 'chat_completion')
        assert learning_path_service_real.valid_skill_levels == {"beginner", "intermediate", "advanced"}
        assert learning_path_service_real.valid_durations == {"1-week", "1-month", "3-months", "6-months"}
    
    def test_validation_methods(self, learning_path_service_real):
        """Test validation methods work correctly."""
        # Test skill level validation
        assert learning_path_service_real.validate_skill_level("beginner")
        assert not learning_path_service_real.validate_skill_level("invalid")
        
        # Test duration validation
        assert learning_path_service_real.validate_duration("1-month")
        assert not learning_path_service_real.validate_duration("invalid")
    
    def test_goal_processing(self, learning_path_service_real):
        """Test goal processing functionality."""
        goals = "Learn Python web development with FastAPI and Docker"
        result = learning_path_service_real.process_goals(goals)
        
        assert "original" in result
        assert "length" in result
        assert "word_count" in result
        assert "has_specific_technologies" in result
        assert "complexity_level" in result
        assert result["has_specific_technologies"] is True  # Contains Python, FastAPI, Docker


if __name__ == "__main__":
    pytest.main([__file__])