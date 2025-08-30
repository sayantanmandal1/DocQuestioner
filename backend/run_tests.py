#!/usr/bin/env python3
"""
Test runner script for AI Microservices backend.
Provides easy commands to run different types of tests.
"""

import os
import sys
import subprocess
import argparse
from pathlib import Path

def run_command(command, description):
    """Run a command and handle errors"""
    print(f"\n🚀 {description}")
    print("=" * 50)
    
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=False)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed with exit code {e.returncode}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Test runner for AI Microservices backend")
    parser.add_argument("--unit", action="store_true", help="Run unit tests")
    parser.add_argument("--integration", action="store_true", help="Run integration tests")
    parser.add_argument("--coverage", action="store_true", help="Run tests with coverage")
    parser.add_argument("--all", action="store_true", help="Run all tests")
    parser.add_argument("--openrouter", action="store_true", help="Run OpenRouter integration test")
    
    args = parser.parse_args()
    
    # Change to backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    # Check if virtual environment is activated
    if not os.getenv("VIRTUAL_ENV"):
        print("⚠️  Warning: Virtual environment not detected")
        print("   Consider activating your virtual environment first")
        print()
    
    # Check if API key is available
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("⚠️  Warning: OPENAI_API_KEY not set")
        print("   Some integration tests may fail without API key")
        print()
    
    success = True
    
    if args.unit or args.all:
        # Run unit tests
        success &= run_command(
            "python -m pytest test_models.py test_summarization_service.py test_qa_service.py test_learning_path_service.py test_openrouter.py test_error_handling.py -v",
            "Running Unit Tests"
        )
    
    if args.coverage or args.all:
        # Run tests with coverage
        success &= run_command(
            "python -m pytest --cov=. --cov-report=html --cov-report=term-missing",
            "Running Tests with Coverage"
        )
        
        if success:
            print("\n📊 Coverage report generated in htmlcov/index.html")
    
    if args.integration or args.all:
        # Run comprehensive integration tests
        success &= run_command(
            "python test_integration_comprehensive.py",
            "Running Comprehensive Integration Tests"
        )
    
    if args.openrouter:
        # Run OpenRouter integration test
        if not api_key:
            print("❌ Cannot run OpenRouter integration test without OPENAI_API_KEY")
            success = False
        else:
            success &= run_command(
                "python test_openrouter_integration.py",
                "Running OpenRouter Integration Test"
            )
    
    # If no specific test type was requested, show help
    if not any([args.unit, args.integration, args.coverage, args.all, args.openrouter]):
        print("🧪 AI Microservices Test Runner")
        print("=" * 40)
        print("Available test options:")
        print("  --unit        Run unit tests")
        print("  --integration Run integration tests")
        print("  --coverage    Run tests with coverage")
        print("  --openrouter  Run OpenRouter integration test")
        print("  --all         Run all tests")
        print()
        print("Examples:")
        print("  python run_tests.py --unit")
        print("  python run_tests.py --integration")
        print("  python run_tests.py --all")
        print("  python run_tests.py --coverage")
        return
    
    # Final summary
    print("\n" + "=" * 60)
    if success:
        print("🎉 All tests completed successfully!")
    else:
        print("⚠️  Some tests failed. Please review the output above.")
    print("=" * 60)
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()