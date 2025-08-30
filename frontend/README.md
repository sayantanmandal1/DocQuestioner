# AI Microservices Frontend

A Next.js frontend application for the AI Microservices platform, providing interfaces for text summarization, document Q&A, and learning path generation.

## Features

- **Text Summarization**: Transform long documents into concise summaries
- **Document Q&A**: Upload documents and ask questions to get intelligent answers
- **Learning Path Generation**: Create personalized learning paths based on goals and skill level
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **TypeScript**: Full type safety and better developer experience
- **Tailwind CSS**: Modern, utility-first styling

## Tech Stack

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type safety and enhanced development experience
- **Tailwind CSS**: Utility-first CSS framework
- **Axios**: HTTP client for API communication

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API server running on `http://localhost:8000`

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.local.example .env.local
```

3. Update the API URL in `.env.local` if needed:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable React components
├── lib/                   # Utility functions and configurations
│   ├── api.ts            # Axios configuration
│   ├── services.ts       # API service functions
│   └── utils.ts          # Common utility functions
└── types/                 # TypeScript type definitions
    └── api.ts            # API request/response types
```

## API Integration

The frontend communicates with the FastAPI backend through the following endpoints:

- `POST /api/summarize` - Text summarization
- `POST /api/qa` - Document Q&A
- `POST /api/learning-path` - Learning path generation

API client configuration is located in `src/lib/api.ts` with service functions in `src/lib/services.ts`.

## Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API base URL (default: http://localhost:8000)
- `NODE_ENV` - Environment mode (development/production)

## Development Guidelines

- Use TypeScript for all new files
- Follow the existing component structure
- Use Tailwind CSS for styling
- Implement proper error handling
- Add loading states for async operations
- Ensure responsive design

## Contributing

1. Follow the existing code style and patterns
2. Add TypeScript types for new features
3. Test components thoroughly
4. Update documentation as needed