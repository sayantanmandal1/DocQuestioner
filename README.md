# AI Microservices Platform

A comprehensive full-stack application providing modular AI services for text summarization, document Q&A, and learning path generation. Built with FastAPI backend and Next.js frontend, integrating with OpenAI through OpenRouter.

## 🚀 Features

- **Text Summarization**: Transform long documents into concise, meaningful summaries with customizable options
- **Document Q&A**: Upload documents and get intelligent answers to your questions
- **Learning Path Generation**: Create personalized learning paths based on goals and skill level
- **Modern Architecture**: FastAPI backend with Next.js frontend
- **Type Safety**: Full TypeScript support with Pydantic models
- **Comprehensive Testing**: Unit tests, integration tests, and end-to-end testing
- **API Documentation**: Auto-generated OpenAPI/Swagger documentation
- **Error Handling**: Robust error handling with detailed feedback

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │  External APIs  │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│   (OpenRouter)  │
│                 │    │                 │    │                 │
│ • React UI      │    │ • REST APIs     │    │ • OpenAI GPT    │
│ • TypeScript    │    │ • Pydantic      │    │ • Rate Limiting │
│ • Tailwind CSS  │    │ • Async/Await   │    │ • Error Handling│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

- **Python 3.8+** for backend
- **Node.js 18+** for frontend
- **OpenRouter API Key** (for OpenAI access)

## 🛠️ Quick Start

> **📖 For detailed setup instructions, see [SETUP.md](SETUP.md)**

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
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.local.example .env.local
# Edit .env.local if needed (default API URL: http://localhost:8000)
```

### 4. Run the Application

**Start Backend (Terminal 1):**
```bash
cd backend
python main.py
# Backend will run on http://localhost:8000
```

**Start Frontend (Terminal 2):**
```bash
cd frontend
npm run dev
# Frontend will run on http://localhost:3000
```

> **🚨 Troubleshooting?** Check the [SETUP.md](SETUP.md) guide for detailed troubleshooting steps.

## 🔧 Environment Configuration

### Backend (.env)
```env
OPENAI_API_KEY=your_openrouter_api_key_here
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📚 API Documentation

### Interactive Documentation
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

### Core Endpoints

#### Text Summarization
```http
POST /api/summarize
Content-Type: application/json

{
  "text": "Your long text here...",
  "max_length": 150,
  "style": "concise"
}
```

#### Document Q&A
```http
POST /api/qa
Content-Type: multipart/form-data

file: [document file]
question: "Your question here"
```

```http
POST /api/qa/text
Content-Type: application/json

{
  "question": "Your question here",
  "document_text": "Document content..."
}
```

#### Learning Path Generation
```http
POST /api/learning-path
Content-Type: application/json

{
  "goals": "I want to learn Python programming",
  "skill_level": "beginner",
  "duration": "3-months",
  "focus_areas": ["web development", "automation"]
}
```

### Health Checks
- **Root**: `GET /`
- **Health**: `GET /health`
- **API Info**: `GET /api/info`
- **Service Health**: `GET /api/{service}/health`

## 🧪 Testing

### Backend Testing

```bash
cd backend

# Use the test runner for easy testing
python run_tests.py --unit          # Unit tests only
python run_tests.py --integration   # Integration tests
python run_tests.py --coverage      # Tests with coverage
python run_tests.py --all           # All tests

# Or run pytest directly
python -m pytest

# Run specific test files
python -m pytest test_models.py
python -m pytest test_services.py
python -m pytest test_routes.py

# Run with coverage
python -m pytest --cov=. --cov-report=html

# Run integration tests (requires API key)
python test_integration_comprehensive.py
```

### Frontend Testing

```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Type checking
npm run type-check

# Linting
npm run lint
```

### Integration Testing

Run the comprehensive integration test suite:

```bash
cd backend
python test_integration_comprehensive.py
```

## 📦 Postman Collection

Import the Postman collection for easy API testing:

1. Open Postman
2. Import `backend/postman_collection.json`
3. Set environment variable `OPENAI_API_KEY` with your API key
4. Run the collection to test all endpoints

## 🏗️ Project Structure

```
ai-microservices/
├── backend/                    # FastAPI backend
│   ├── main.py                # Application entry point
│   ├── requirements.txt       # Python dependencies
│   ├── models/                # Pydantic data models
│   ├── services/              # Business logic services
│   ├── routes/                # API route handlers
│   ├── clients/               # External API clients
│   ├── test_*.py             # Test files
│   └── postman_collection.json # Postman API collection
├── frontend/                   # Next.js frontend
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   ├── components/       # React components
│   │   ├── lib/              # Utilities and API client
│   │   └── types/            # TypeScript type definitions
│   ├── package.json          # Node.js dependencies
│   └── __tests__/            # Test files
└── README.md                  # This file
```

## 🔍 Development Guidelines

### Backend Development
- Use **FastAPI** for all API endpoints
- Implement **Pydantic models** for request/response validation
- Add **comprehensive error handling** with custom exceptions
- Write **unit tests** for all services and routes
- Use **async/await** for all I/O operations
- Follow **Python PEP 8** style guidelines

### Frontend Development
- Use **TypeScript** for all new files
- Implement **React components** with proper error boundaries
- Use **Tailwind CSS** for styling
- Add **loading states** for all async operations
- Implement **proper error handling** with user feedback
- Write **component tests** using Jest and React Testing Library

### API Integration
- Use **OpenRouter** for OpenAI API access
- Implement **rate limiting** and **retry logic**
- Add **comprehensive logging** for debugging
- Use **environment variables** for configuration
- Never expose **API keys** in frontend code

## 🚀 Deployment

> **📖 For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)**

### Quick Production Deployment

#### Frontend (Vercel)
1. Push to GitHub
2. Connect repository to Vercel
3. Set `NEXT_PUBLIC_API_URL` environment variable
4. Deploy automatically on push

#### Backend (Render)
1. Push to GitHub
2. Connect repository to Render
3. Set `OPENAI_API_KEY` environment variable
4. Deploy using provided Dockerfile

### Local Docker Development

```bash
# Quick start with Docker Compose
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
```

### Environment Variables for Production

**Backend:**
- `OPENAI_API_KEY`: Your OpenRouter API key
- `CORS_ORIGINS`: Comma-separated list of allowed origins
- `LOG_LEVEL`: Logging level (INFO, DEBUG, WARNING, ERROR)

**Frontend:**
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NODE_ENV`: production

### Deployment Scripts

```bash
# Setup development environment
./scripts/setup-env.sh

# Deploy to production
./scripts/deploy.sh
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Quality Standards
- All code must pass linting and type checking
- Test coverage should be maintained above 80%
- All new features must include tests
- Follow existing code style and patterns
- Update documentation for new features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**Backend won't start:**
- Check that `OPENAI_API_KEY` is set in `.env`
- Ensure Python 3.8+ is installed
- Verify all dependencies are installed: `pip install -r requirements.txt`

**Frontend won't connect to backend:**
- Ensure backend is running on `http://localhost:8000`
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify CORS settings in backend

**API calls failing:**
- Verify OpenRouter API key is valid
- Check rate limits and quotas
- Review error logs for detailed information

### Getting Help

- Check the [Issues](https://github.com/your-repo/ai-microservices/issues) page
- Review API documentation at `/docs`
- Run health checks: `GET /health`
- Enable debug logging for detailed error information

## 🔄 Changelog

### v1.0.0 (Current)
- Initial release with core AI services
- FastAPI backend with OpenRouter integration
- Next.js frontend with TypeScript
- Comprehensive testing suite
- API documentation and Postman collection
- Docker deployment support

---

**Built with ❤️ using FastAPI, Next.js, and OpenAI**