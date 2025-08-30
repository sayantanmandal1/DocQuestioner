"""
Test script to verify FastAPI routes are working correctly.
"""
import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app

# Create test client
client = TestClient(app)


def test_health_endpoints():
    """Test all health check endpoints"""
    print("Testing health endpoints...")
    
    # Test root endpoint
    response = client.get("/")
    print(f"Root endpoint: {response.status_code} - {response.json()}")
    assert response.status_code == 200
    
    # Test main health endpoint
    response = client.get("/health")
    print(f"Health endpoint: {response.status_code} - {response.json()}")
    assert response.status_code == 200
    
    # Test API info endpoint
    response = client.get("/api/info")
    print(f"API info endpoint: {response.status_code} - {response.json()}")
    assert response.status_code == 200
    
    print("✅ All health endpoints working!")


def test_summarization_endpoints():
    """Test summarization endpoints"""
    print("\nTesting summarization endpoints...")
    
    # Test summarization health check
    response = client.get("/api/summarize/health")
    print(f"Summarization health: {response.status_code}")
    
    # Test summarization endpoint with sample data
    test_data = {
        "text": "This is a test text for summarization. It contains multiple sentences to test the summarization functionality. The service should be able to process this text and return a shorter summary.",
        "max_length": 50,
        "style": "concise"
    }
    
    response = client.post("/api/summarize", json=test_data)
    print(f"Summarization endpoint: {response.status_code}")
    if response.status_code != 200:
        print(f"Error: {response.json()}")
    
    print("✅ Summarization endpoints tested!")


def test_qa_endpoints():
    """Test Q&A endpoints"""
    print("\nTesting Q&A endpoints...")
    
    # Test Q&A health check
    response = client.get("/api/qa/health")
    print(f"Q&A health: {response.status_code}")
    
    # Test Q&A text endpoint
    test_data = {
        "question": "What is FastAPI?",
        "document_text": "FastAPI is a modern, fast web framework for building APIs with Python 3.7+ based on standard Python type hints. It provides automatic API documentation, high performance, and easy testing capabilities."
    }
    
    response = client.post("/api/qa/text", json=test_data)
    print(f"Q&A text endpoint: {response.status_code}")
    if response.status_code != 200:
        print(f"Error: {response.json()}")
    
    print("✅ Q&A endpoints tested!")


def test_learning_path_endpoints():
    """Test learning path endpoints"""
    print("\nTesting learning path endpoints...")
    
    # Test learning path health check
    response = client.get("/api/learning-path/health")
    print(f"Learning path health: {response.status_code}")
    
    # Test learning path options
    response = client.get("/api/learning-path/options")
    print(f"Learning path options: {response.status_code} - {response.json()}")
    assert response.status_code == 200
    
    # Test learning path validation
    test_data = {
        "goals": "Learn Python web development with FastAPI",
        "skill_level": "beginner",
        "duration": "1-month",
        "focus_areas": ["FastAPI", "REST APIs"]
    }
    
    response = client.post("/api/learning-path/validate", json=test_data)
    print(f"Learning path validation: {response.status_code}")
    if response.status_code == 200:
        print(f"Validation result: {response.json()}")
    else:
        print(f"Error: {response.json()}")
    
    # Test learning path generation
    response = client.post("/api/learning-path", json=test_data)
    print(f"Learning path generation: {response.status_code}")
    if response.status_code != 200:
        print(f"Error: {response.json()}")
    
    print("✅ Learning path endpoints tested!")


def test_error_handling():
    """Test error handling"""
    print("\nTesting error handling...")
    
    # Test validation error
    response = client.post("/api/summarize", json={"text": "short"})  # Too short
    print(f"Validation error test: {response.status_code}")
    assert response.status_code == 422
    
    # Test invalid skill level
    response = client.post("/api/learning-path", json={
        "goals": "Learn something",
        "skill_level": "invalid",
        "duration": "1-month"
    })
    print(f"Invalid skill level test: {response.status_code}")
    assert response.status_code == 422
    
    print("✅ Error handling tested!")


if __name__ == "__main__":
    print("🚀 Starting FastAPI route tests...\n")
    
    try:
        test_health_endpoints()
        test_summarization_endpoints()
        test_qa_endpoints()
        test_learning_path_endpoints()
        test_error_handling()
        
        print("\n🎉 All tests completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        sys.exit(1)