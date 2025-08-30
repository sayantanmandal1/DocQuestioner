import Link from "next/link";
import { Card, Grid, Container } from '@/components';
import { Bot, FileText, MessageCircleQuestion, GraduationCap, Zap, CheckCircle, Shield, Heart } from 'lucide-react';

export default function Home() {
  return (
    <Container size="xl" className="py-16">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="flex justify-center mb-6">
          <Bot className="w-16 h-16 text-blue-600" />
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          AI Microservices Platform
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Harness the power of AI with our comprehensive suite of microservices. 
          From text summarization to intelligent Q&A and personalized learning paths.
        </p>
      </div>

      {/* Services Grid */}
      <Grid cols={3} gap="lg" className="mb-20">
        {/* Text Summarization */}
        <Card padding="lg" shadow="lg" className="hover:shadow-xl transition-shadow">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">
            Text Summarization
          </h3>
          <p className="text-gray-600 mb-6">
            Transform lengthy documents into concise, meaningful summaries. Perfect for research, 
            content curation, and quick information extraction.
          </p>
          <Link 
            href="/summarization"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Summarization
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </Card>

        {/* Document Q&A */}
        <Card padding="lg" shadow="lg" className="hover:shadow-xl transition-shadow">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
            <MessageCircleQuestion className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">
            Document Q&A
          </h3>
          <p className="text-gray-600 mb-6">
            Ask questions about your documents and get intelligent, contextual answers. 
            Upload files or paste text to start exploring your content.
          </p>
          <Link 
            href="/qa"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Try Q&A
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </Card>

        {/* Learning Path Generation */}
        <Card padding="lg" shadow="lg" className="hover:shadow-xl transition-shadow">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
            <GraduationCap className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-2xl font-semibold text-gray-900 mb-4">
            Learning Paths
          </h3>
          <p className="text-gray-600 mb-6">
            Generate personalized learning paths tailored to your goals and skill level. 
            Get structured guidance for your educational journey.
          </p>
          <Link 
            href="/learning-path"
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Create Path
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </Card>
      </Grid>

      {/* Features Section */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-12">
          Why Choose Our AI Platform?
        </h2>
        <Grid cols={4} gap="lg" className="mb-16">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Fast & Reliable</h3>
            <p className="text-gray-600 text-sm">
              Lightning-fast processing with enterprise-grade reliability
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Easy to Use</h3>
            <p className="text-gray-600 text-sm">
              Intuitive interface designed for both beginners and experts
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Secure</h3>
            <p className="text-gray-600 text-sm">
              Your data is protected with industry-standard security measures
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Open Source</h3>
            <p className="text-gray-600 text-sm">
              Built with transparency and community collaboration in mind
            </p>
          </div>
        </Grid>

        {/* API Documentation Link */}
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Looking for API documentation?
          </p>
          <a 
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-6 py-3 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition-colors"
          >
            View API Docs
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </Container>
  );
}