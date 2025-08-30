// API Request Types
export interface SummarizationRequest {
  text: string;
  max_length?: number;
  style?: 'concise' | 'detailed' | 'bullet-points';
}

export interface QARequest {
  question: string;
  document_text?: string;
}

export interface LearningPathRequest {
  goals: string;
  skill_level: 'beginner' | 'intermediate' | 'advanced';
  duration: '1-week' | '1-month' | '3-months' | '6-months';
  focus_areas?: string[];
}

// API Response Types
export interface SummarizationResponse {
  summary: string;
  original_length: number;
  summary_length: number;
  compression_ratio: number;
}

export interface QAResponse {
  answer: string;
  confidence?: number;
  sources?: string[];
}

export interface LearningPhase {
  phase_number: number;
  title: string;
  description: string;
  duration: string;
  objectives: string[];
  activities: string[];
}

export interface Resource {
  title: string;
  type: string;
  url?: string;
  description?: string;
}

export interface LearningPathResponse {
  title: string;
  duration: string;
  skill_level: string;
  phases: LearningPhase[];
  resources: Resource[];
}

// Error Response Type
export interface ApiError {
  detail: string;
  status_code: number;
}

// Common API Response wrapper
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}