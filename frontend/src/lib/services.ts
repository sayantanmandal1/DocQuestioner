import { api, handleApiError } from './api';
import type {
  SummarizationRequest,
  SummarizationResponse,
  QARequest,
  QAResponse,
  LearningPathRequest,
  LearningPathResponse,
} from '../types/api';

// Summarization Service
export const summarizationService = {
  async summarizeText(request: SummarizationRequest): Promise<SummarizationResponse> {
    try {
      return await api.post<SummarizationResponse>('/api/summarize', request);
    } catch (error) {
      const apiError = handleApiError(error);
      throw new Error(apiError.message);
    }
  },
};

// Q&A Service
export const qaService = {
  async answerQuestion(request: QARequest): Promise<QAResponse> {
    try {
      return await api.post<QAResponse>('/api/qa', request);
    } catch (error) {
      const apiError = handleApiError(error);
      throw new Error(apiError.message);
    }
  },

  async answerQuestionWithFile(question: string, file: File): Promise<QAResponse> {
    try {
      const formData = new FormData();
      formData.append('question', question);
      formData.append('file', file);

      return await api.upload<QAResponse>('/api/qa', formData);
    } catch (error) {
      const apiError = handleApiError(error);
      throw new Error(apiError.message);
    }
  },
};

// Learning Path Service
export const learningPathService = {
  async generatePath(request: LearningPathRequest): Promise<LearningPathResponse> {
    try {
      return await api.post<LearningPathResponse>('/api/learning-path', request);
    } catch (error) {
      const apiError = handleApiError(error);
      throw new Error(apiError.message);
    }
  },
};

// Health Check Service
export const healthService = {
  async checkHealth(): Promise<{ status: string }> {
    try {
      return await api.get<{ status: string }>('/health');
    } catch (error) {
      const apiError = handleApiError(error);
      throw new Error(apiError.message);
    }
  },
};