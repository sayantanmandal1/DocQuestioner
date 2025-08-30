"""
Integration test for OpenRouter client.
This test requires a valid OPENAI_API_KEY environment variable.
Run manually to test actual API integration.
"""
import asyncio
import os
from clients.openrouter import OpenRouterClient, OpenRouterAPIError


async def test_integration():
    """Test OpenRouter client with actual API."""
    try:
        # Initialize client
        client = OpenRouterClient()
        print("✓ OpenRouter client initialized successfully")
        
        # Test health check
        is_healthy = await client.health_check()
        print(f"✓ Health check: {'PASSED' if is_healthy else 'FAILED'}")
        
        if not is_healthy:
            print("❌ Health check failed - check your API key")
            return
        
        # Test simple chat completion
        messages = [
            {"role": "user", "content": "Say 'Hello, World!' and nothing else."}
        ]
        
        response = await client.chat_completion(messages, max_tokens=10)
        print(f"✓ Chat completion response: {response}")
        
        # Test with different model
        response2 = await client.chat_completion(
            messages, 
            model="openai/gpt-3.5-turbo",
            max_tokens=10,
            temperature=0.1
        )
        print(f"✓ GPT-3.5 response: {response2}")
        
        print("\n🎉 All integration tests passed!")
        
    except OpenRouterAPIError as e:
        print(f"❌ OpenRouter API Error: {e}")
        print(f"   Status Code: {e.status_code}")
        print(f"   Response Data: {e.response_data}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")


if __name__ == "__main__":
    # Check if API key is available
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEY environment variable not set")
        print("   Please set your OpenRouter API key to run integration tests")
        exit(1)
    
    print("🚀 Running OpenRouter integration tests...")
    print(f"   Using API key: {api_key[:10]}...{api_key[-4:]}")
    print()
    
    asyncio.run(test_integration())