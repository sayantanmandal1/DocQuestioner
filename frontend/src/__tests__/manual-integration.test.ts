/**
 * Manual Integration Test
 * 
 * This test can be run manually to verify that the frontend can connect to the backend.
 * Make sure the backend is running on http://localhost:8000 before running this test.
 */

import { healthService, summarizationService, qaService, learningPathService } from '../lib/services';

describe('Manual Integration Tests', () => {
  // Skip these tests by default since they require a running backend
  describe.skip('Backend Integration', () => {
    it('should connect to backend health endpoint', async () => {
      const response = await healthService.checkHealth();
      expect(response).toHaveProperty('status');
    });

    it('should successfully call summarization service', async () => {
      const request = {
        text: 'This is a test text that needs to be summarized for integration testing purposes.',
        max_length: 100,
        style: 'concise' as const,
      };

      const response = await summarizationService.summarizeText(request);
      
      expect(response).toHaveProperty('summary');
      expect(response).toHaveProperty('original_length');
      expect(response).toHaveProperty('summary_length');
      expect(response).toHaveProperty('compression_ratio');
      expect(typeof response.summary).toBe('string');
      expect(response.summary.length).toBeGreaterThan(0);
    });

    it('should successfully call Q&A service', async () => {
      const request = {
        question: 'What is this document about?',
        document_text: 'This document discusses artificial intelligence and machine learning concepts.',
      };

      const response = await qaService.answerQuestion(request);
      
      expect(response).toHaveProperty('answer');
      expect(typeof response.answer).toBe('string');
      expect(response.answer.length).toBeGreaterThan(0);
    });

    it('should successfully call learning path service', async () => {
      const request = {
        goals: 'I want to learn JavaScript programming from scratch.',
        skill_level: 'beginner' as const,
        duration: '1-month' as const,
        focus_areas: ['Practical Projects'],
      };

      const response = await learningPathService.generatePath(request);
      
      expect(response).toHaveProperty('title');
      expect(response).toHaveProperty('duration');
      expect(response).toHaveProperty('skill_level');
      expect(response).toHaveProperty('phases');
      expect(Array.isArray(response.phases)).toBe(true);
      expect(response.phases.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock a network error by using an invalid URL
      const originalUrl = process.env.NEXT_PUBLIC_API_URL;
      process.env.NEXT_PUBLIC_API_URL = 'http://invalid-url:9999';

      try {
        await healthService.checkHealth();
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toContain('Network error');
      } finally {
        // Restore original URL
        process.env.NEXT_PUBLIC_API_URL = originalUrl;
      }
    });
  });
});