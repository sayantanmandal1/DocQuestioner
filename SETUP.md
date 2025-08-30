# AI Microservices Setup Guide

This guide provides detailed setup instructions for the AI Microservices platform.

## 📋 Prerequisites

### System Requirements
- **Python 3.8+** (recommended: Python 3.9 or 3.10)
- **Node.js 18+** (recommended: Node.js 18 LTS or 20 LTS)
- **Git** for version control
- **OpenRouter API Key** for OpenAI access

### Verify Prerequisites

```bash
# Check Python version
python --version

# Check Node.js version
node --version

# Check npm version
npm --version

# Check Git version
git --version
```

## 🔑 Getting API Keys

### OpenRouter Setup
1. Visit [OpenRouter](https://openrouter.ai/)
2. Sign up for an account
3. Navigate to Settings → Credits
4. Add credits to your account (required for API usage)
5. Go to Settings → API Keys
6. Create a new API key
7. Copy the API key (starts with `sk-or-v1-...`)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-repo/ai-microservices.git
cd ai-microservices
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Upgrade pip
python -m pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

# Verify installation
python -c "import fastapi; print('FastAPI installed successfully')"
```

### 3. Backend Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your API key
# Windows:
notepad .env
# macOS/Linux:
nano .env
```

Add your OpenRouter API key to the `.env` file:
```env
OPENAI_API_KEY=sk-or-v1-your-api-key-here
```

### 4. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Verify installation
npm list --depth=0
```

### 5. Frontend Configuration

```bash
# Copy environment template
cp .env.local.example .env.local

# Edit .env.local if needed (default values should work)
# Windows:
notepad .env.local
# macOS/Linux:
nano .env.local
```

Default frontend configuration:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🧪 Testing the Setup

### 1. Test Backend

```bash
cd backend

# Ensure virtual environment is activated
# Run basic tests
python run_tests.py --unit

# Test API key configuration
python -c "
import os
from dotenv import load_dotenv
load_dotenv()
api_key = os.getenv('OPENAI_API_KEY')
if api_key:
    print(f'✅ API key configured: {api_key[:10]}...{api_key[-4:]}')
else:
    print('❌ API key not found')
"
```

### 2. Test Frontend

```bash
cd frontend

# Run type checking
npm run type-check

# Run linting
npm run lint

# Run tests
npm test
```

## 🏃‍♂️ Running the Application

### Start Backend (Terminal 1)

```bash
cd backend

# Activate virtual environment if not already active
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Start the server
python main.py
```

You should see:
```
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

### Start Frontend (Terminal 2)

```bash
cd frontend

# Start development server
npm run dev
```

You should see:
```
  ▲ Next.js 15.0.0
  - Local:        http://localhost:3000
  - Network:      http://192.168.x.x:3000

 ✓ Ready in 2.1s
```

### Verify Everything is Working

1. **Backend Health Check**: Visit http://localhost:8000/health
2. **API Documentation**: Visit http://localhost:8000/docs
3. **Frontend**: Visit http://localhost:3000
4. **Test API Call**: Try the summarization feature in the frontend

## 🔧 Development Tools

### Backend Development

```bash
cd backend

# Run development server with auto-reload
python main.py

# Run specific tests
python -m pytest test_models.py -v

# Run tests with coverage
python run_tests.py --coverage

# Run integration tests
python run_tests.py --integration

# Format code (if black is installed)
black . --line-length 88

# Type checking (if mypy is installed)
mypy .
```

### Frontend Development

```bash
cd frontend

# Development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run tests in watch mode
npm run test:watch

# Type checking
npm run type-check

# Linting with auto-fix
npm run lint -- --fix
```

## 📊 Testing & Quality Assurance

### Running All Tests

```bash
# Backend tests
cd backend
python run_tests.py --all

# Frontend tests
cd frontend
npm test
```

### Test Coverage

```bash
# Backend coverage
cd backend
python run_tests.py --coverage
# Open htmlcov/index.html in browser

# Frontend coverage
cd frontend
npm run test:coverage
# Open coverage/lcov-report/index.html in browser
```

### API Testing with Postman

1. Import `backend/postman_collection.json` into Postman
2. Set environment variable `OPENAI_API_KEY` with your API key
3. Run the collection to test all endpoints

## 🐳 Docker Setup (Optional)

### Backend Docker

```bash
cd backend

# Build image
docker build -t ai-microservices-backend .

# Run container
docker run -p 8000:8000 -e OPENAI_API_KEY=your-key-here ai-microservices-backend
```

### Frontend Docker

```bash
cd frontend

# Build image
docker build -t ai-microservices-frontend .

# Run container
docker run -p 3000:3000 ai-microservices-frontend
```

### Docker Compose

```bash
# From project root
docker-compose up --build
```

## 🚨 Troubleshooting

### Common Issues

#### Backend Won't Start

**Issue**: `ModuleNotFoundError` or import errors
```bash
# Solution: Ensure virtual environment is activated and dependencies installed
cd backend
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux
pip install -r requirements.txt
```

**Issue**: `OPENAI_API_KEY not found`
```bash
# Solution: Check .env file exists and contains API key
cat .env  # macOS/Linux
type .env  # Windows
```

#### Frontend Won't Start

**Issue**: `Module not found` errors
```bash
# Solution: Reinstall dependencies
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Issue**: API connection errors
```bash
# Solution: Verify backend is running and NEXT_PUBLIC_API_URL is correct
curl http://localhost:8000/health
```

#### API Calls Failing

**Issue**: 401 Unauthorized errors
- Check API key is valid and has credits
- Verify API key format (should start with `sk-or-v1-`)

**Issue**: 402 Payment Required errors
- Add credits to your OpenRouter account
- Check usage limits and quotas

**Issue**: CORS errors
- Ensure frontend URL is in backend CORS configuration
- Check browser developer tools for specific CORS errors

### Getting Help

1. **Check Logs**: Look at terminal output for error messages
2. **Health Checks**: Visit `/health` endpoint to check system status
3. **API Documentation**: Use `/docs` for interactive API testing
4. **Test Suite**: Run integration tests to identify issues
5. **Environment**: Verify all environment variables are set correctly

### Debug Mode

Enable debug logging for more detailed error information:

```bash
# Backend debug mode
cd backend
export LOG_LEVEL=DEBUG  # macOS/Linux
set LOG_LEVEL=DEBUG     # Windows
python main.py

# Frontend debug mode
cd frontend
export NODE_ENV=development
npm run dev
```

## 📚 Next Steps

After successful setup:

1. **Explore the API**: Use the Swagger UI at `/docs`
2. **Test Features**: Try all three AI services through the frontend
3. **Review Code**: Examine the codebase structure and patterns
4. **Customize**: Modify prompts, add new features, or integrate with your systems
5. **Deploy**: Follow deployment guides for production setup

## 🔄 Updates and Maintenance

### Updating Dependencies

```bash
# Backend updates
cd backend
pip list --outdated
pip install --upgrade package-name

# Frontend updates
cd frontend
npm outdated
npm update
```

### Database Migrations (if applicable)

```bash
# If using database migrations
cd backend
alembic upgrade head
```

### Environment Updates

Regularly update your `.env` files when:
- API keys change
- New configuration options are added
- Environment-specific settings change

---

**Need help?** Check the main [README.md](README.md) or open an issue on GitHub.