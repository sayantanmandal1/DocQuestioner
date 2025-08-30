#!/bin/bash

# ===================================
# AI Microservices Deployment Script
# ===================================

set -e

echo "🚀 AI Microservices Deployment Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed"
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Deploy frontend to Vercel
deploy_frontend() {
    print_status "Deploying frontend to Vercel..."
    
    cd frontend
    
    # Install dependencies
    print_status "Installing frontend dependencies..."
    npm ci
    
    # Run tests
    print_status "Running frontend tests..."
    npm test -- --watchAll=false
    
    # Build the project
    print_status "Building frontend..."
    npm run build
    
    # Deploy to Vercel
    if command -v vercel &> /dev/null; then
        print_status "Deploying to Vercel..."
        vercel --prod
        print_success "Frontend deployed to Vercel!"
    else
        print_warning "Vercel CLI not installed. Please install with: npm i -g vercel"
        print_status "You can deploy manually by:"
        print_status "1. Install Vercel CLI: npm i -g vercel"
        print_status "2. Run: vercel --prod"
    fi
    
    cd ..
}

# Deploy backend to Render
deploy_backend() {
    print_status "Preparing backend for Render deployment..."
    
    cd backend
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        print_status "Creating virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate || source venv/Scripts/activate
    
    # Install dependencies
    print_status "Installing backend dependencies..."
    pip install -r requirements.txt
    
    # Run tests
    print_status "Running backend tests..."
    python run_tests.py --unit
    
    print_success "Backend is ready for Render deployment!"
    print_status "To deploy to Render:"
    print_status "1. Push your code to GitHub"
    print_status "2. Connect your GitHub repo to Render"
    print_status "3. Set environment variables in Render dashboard"
    print_status "4. Deploy using the render.yaml configuration"
    
    cd ..
}

# Main deployment function
main() {
    echo "Select deployment option:"
    echo "1. Deploy frontend to Vercel"
    echo "2. Prepare backend for Render"
    echo "3. Deploy both"
    echo "4. Exit"
    
    read -p "Enter your choice (1-4): " choice
    
    case $choice in
        1)
            check_dependencies
            deploy_frontend
            ;;
        2)
            check_dependencies
            deploy_backend
            ;;
        3)
            check_dependencies
            deploy_frontend
            deploy_backend
            ;;
        4)
            print_status "Exiting..."
            exit 0
            ;;
        *)
            print_error "Invalid choice. Please select 1-4."
            exit 1
            ;;
    esac
}

# Run main function
main