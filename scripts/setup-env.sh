#!/bin/bash

# ===================================
# Environment Setup Script
# ===================================

set -e

echo "🔧 AI Microservices Environment Setup"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Setup backend environment
setup_backend() {
    print_status "Setting up backend environment..."
    
    cd backend
    
    # Create virtual environment
    if [ ! -d "venv" ]; then
        print_status "Creating Python virtual environment..."
        python3 -m venv venv
        print_success "Virtual environment created"
    else
        print_status "Virtual environment already exists"
    fi
    
    # Activate virtual environment
    print_status "Activating virtual environment..."
    source venv/bin/activate || source venv/Scripts/activate
    
    # Upgrade pip
    print_status "Upgrading pip..."
    pip install --upgrade pip
    
    # Install dependencies
    print_status "Installing Python dependencies..."
    pip install -r requirements.txt
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        print_status "Creating .env file from template..."
        cp .env.example .env
        print_warning "Please edit .env file and add your OPENAI_API_KEY"
    else
        print_status ".env file already exists"
    fi
    
    print_success "Backend environment setup complete!"
    cd ..
}

# Setup frontend environment
setup_frontend() {
    print_status "Setting up frontend environment..."
    
    cd frontend
    
    # Install dependencies
    print_status "Installing Node.js dependencies..."
    npm ci
    
    # Create .env.local file if it doesn't exist
    if [ ! -f ".env.local" ]; then
        print_status "Creating .env.local file from template..."
        cp .env.local.example .env.local
        print_success ".env.local file created"
    else
        print_status ".env.local file already exists"
    fi
    
    print_success "Frontend environment setup complete!"
    cd ..
}

# Run tests to verify setup
verify_setup() {
    print_status "Verifying setup..."
    
    # Test backend
    print_status "Testing backend setup..."
    cd backend
    source venv/bin/activate || source venv/Scripts/activate
    python -c "import fastapi; print('✅ FastAPI installed')"
    python -c "import uvicorn; print('✅ Uvicorn installed')"
    python -c "import pydantic; print('✅ Pydantic installed')"
    cd ..
    
    # Test frontend
    print_status "Testing frontend setup..."
    cd frontend
    npm list next > /dev/null && echo "✅ Next.js installed"
    npm list react > /dev/null && echo "✅ React installed"
    npm list typescript > /dev/null && echo "✅ TypeScript installed"
    cd ..
    
    print_success "Setup verification complete!"
}

# Main setup function
main() {
    echo "Select setup option:"
    echo "1. Setup backend only"
    echo "2. Setup frontend only"
    echo "3. Setup both (recommended)"
    echo "4. Verify existing setup"
    echo "5. Exit"
    
    read -p "Enter your choice (1-5): " choice
    
    case $choice in
        1)
            setup_backend
            ;;
        2)
            setup_frontend
            ;;
        3)
            setup_backend
            setup_frontend
            verify_setup
            ;;
        4)
            verify_setup
            ;;
        5)
            print_status "Exiting..."
            exit 0
            ;;
        *)
            print_error "Invalid choice. Please select 1-5."
            exit 1
            ;;
    esac
    
    echo ""
    print_success "Environment setup completed!"
    echo ""
    print_status "Next steps:"
    print_status "1. Edit backend/.env and add your OPENAI_API_KEY"
    print_status "2. Start backend: cd backend && python main.py"
    print_status "3. Start frontend: cd frontend && npm run dev"
    print_status "4. Visit http://localhost:3000 to use the application"
}

# Run main function
main