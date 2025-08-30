# AI Microservices Backend

FastAPI backend providing AI services for text summarization, document Q&A, and learning path generation.

## Project Structure

```
backend/
├── main.py              # FastAPI application entry point
├── requirements.txt     # Python dependencies
├── setup.py            # Setup script for development environment
├── .env                # Environment variables (create from .env.example)
├── models/             # Pydantic data models
├── services/           # Business logic services
├── clients/            # External API clients
└── routes/             # API route handlers
```

## Setup

1. Create and activate a virtual environment:
```bash
python -m venv venv
venv\Scripts\activate  # On Windows
# or
source venv/bin/activate  # On Unix/MacOS
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

Or use the setup script:
```bash
python setup.py
```

3. Configure environment variables:
```bash
# Copy .env.example to .env and configure
cp .env.example .env
```

Required environment variables:
- `OPENAI_API_KEY`: Your OpenRouter API key for OpenAI access

## Running the Application

### Development Server
```bash
python main.py
```

### Using Uvicorn directly
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Documentation

Once running, access the interactive API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Health Check

- Root endpoint: http://localhost:8000/
- Health check: http://localhost:8000/health