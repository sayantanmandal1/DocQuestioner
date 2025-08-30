"""
Setup script for AI Microservices backend
Run this to set up the development environment
"""

import subprocess
import sys
import os

def run_command(command, description):
    """Run a shell command and handle errors"""
    print(f"\n{description}...")
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print(f"✓ {description} completed successfully")
        return result
    except subprocess.CalledProcessError as e:
        print(f"✗ {description} failed: {e}")
        print(f"Error output: {e.stderr}")
        return None

def main():
    """Main setup function"""
    print("Setting up AI Microservices backend...")
    
    # Check if we're in a virtual environment
    if sys.prefix == sys.base_prefix:
        print("\nRecommendation: Create and activate a virtual environment first:")
        print("python -m venv venv")
        print("venv\\Scripts\\activate  # On Windows")
        print("source venv/bin/activate  # On Unix/MacOS")
        print("\nThen run this setup script again.")
        
    # Install dependencies
    run_command("pip install -r requirements.txt", "Installing dependencies")
    
    print("\n✓ Setup complete!")
    print("\nTo start the development server:")
    print("python main.py")
    print("\nOr use uvicorn directly:")
    print("uvicorn main:app --reload --host 0.0.0.0 --port 8000")

if __name__ == "__main__":
    main()