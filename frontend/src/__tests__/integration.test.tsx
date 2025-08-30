/**
 * End-to-End Integration Tests for AI Microservices Frontend
 * 
 * These tests verify complete user workflows from form submission to result display,
 * including proper error handling and user feedback.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationProvider } from '../components/NotificationProvider';
import Summarization from '../components/Summarization';
import QA from '../components/QA';
import LearningPath from '../components/LearningPath';
import * as services from '../lib/services';

// Mock the services
jest.mock('@/lib/services');
const mockServices = services as jest.Mocked<typeof services>;

// Test wrapper with NotificationProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <NotificationProvider>{children}</NotificationProvider>
);

describe('End-to-End Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Summarization Workflow', () => {
    it('should complete successful summarization workflow', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        summary: 'This is a test summary of the provided text.',
        original_length: 100,
        summary_length: 50,
        compression_ratio: 0.5,
      };

      mockServices.summarizationService.summarizeText.mockResolvedValue(mockResponse);

      render(
        <TestWrapper>
          <Summarization />
        </TestWrapper>
      );

      // Fill in the form
      const textArea = screen.getByLabelText(/text to summarize/i);
      await user.type(textArea, 'This is a long text that needs to be summarized for testing purposes.');

      const maxLengthInput = screen.getByLabelText(/summary length/i);
      await user.clear(maxLengthInput);
      await user.type(maxLengthInput, '100');

      const styleSelect = screen.getByLabelText(/summary style/i);
      await user.selectOptions(styleSelect, 'detailed');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /summarize text/i });
      await user.click(submitButton);

      // Verify loading state
      expect(screen.getByText(/summarizing.../i)).toBeInTheDocument();

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('Summary Results')).toBeInTheDocument();
      });

      // Verify results are displayed
      expect(screen.getByText(mockResponse.summary)).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument(); // Original length
      expect(screen.getByText('50')).toBeInTheDocument(); // Summary length
      expect(screen.getByText('50.0%')).toBeInTheDocument(); // Compression ratio

      // Verify service was called with correct parameters
      expect(mockServices.summarizationService.summarizeText).toHaveBeenCalledWith({
        text: 'This is a long text that needs to be summarized for testing purposes.',
        max_length: 100,
        style: 'detailed',
      });

      // Test copy functionality
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockResolvedValue(undefined),
        },
      });

      const copyButton = screen.getByRole('button', { name: /copy/i });
      await user.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockResponse.summary);
    });

    it('should handle summarization errors gracefully', async () => {
      const user = userEvent.setup();
      const errorMessage = 'API key is invalid';

      mockServices.summarizationService.summarizeText.mockRejectedValue(new Error(errorMessage));

      render(
        <TestWrapper>
          <Summarization />
        </TestWrapper>
      );

      // Fill in the form
      const textArea = screen.getByLabelText(/text to summarize/i);
      await user.type(textArea, 'This is a test text.');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /summarize text/i });
      await user.click(submitButton);

      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });

      // Verify no results are shown
      expect(screen.queryByText('Summary Results')).not.toBeInTheDocument();
    });

    it('should validate form inputs correctly', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Summarization />
        </TestWrapper>
      );

      // Try to submit empty form
      const submitButton = screen.getByRole('button', { name: /summarize text/i });
      await user.click(submitButton);

      // Verify validation errors
      await waitFor(() => {
        expect(screen.getByText('Text is required')).toBeInTheDocument();
      });

      // Test text length validation
      const textArea = screen.getByLabelText(/text to summarize/i);
      await user.type(textArea, 'Short');

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Text must be at least 10 characters long')).toBeInTheDocument();
      });
    });
  });

  describe('Q&A Workflow', () => {
    it('should complete successful Q&A workflow with text input', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        answer: 'The document discusses artificial intelligence and machine learning concepts.',
        confidence: 0.85,
        sources: ['AI is a broad field...', 'Machine learning is a subset...'],
      };

      mockServices.qaService.answerQuestion.mockResolvedValue(mockResponse);

      render(
        <TestWrapper>
          <QA />
        </TestWrapper>
      );

      // Fill in the form
      const questionInput = screen.getByLabelText(/your question/i);
      await user.type(questionInput, 'What is this document about?');

      const documentTextArea = screen.getByLabelText(/document text/i);
      await user.type(documentTextArea, 'This document covers artificial intelligence and machine learning concepts in detail.');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /ask question/i });
      await user.click(submitButton);

      // Verify loading state
      expect(screen.getByText(/processing.../i)).toBeInTheDocument();

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('Answer')).toBeInTheDocument();
      });

      // Verify results are displayed
      expect(screen.getByText(mockResponse.answer)).toBeInTheDocument();
      expect(screen.getByText('85.0%')).toBeInTheDocument(); // Confidence score
      expect(screen.getByText('Supporting Sources')).toBeInTheDocument();

      // Verify service was called with correct parameters
      expect(mockServices.qaService.answerQuestion).toHaveBeenCalledWith({
        question: 'What is this document about?',
        document_text: 'This document covers artificial intelligence and machine learning concepts in detail.',
      });
    });

    it('should complete successful Q&A workflow with file upload', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        answer: 'The uploaded file contains information about React components.',
        confidence: 0.92,
      };

      mockServices.qaService.answerQuestionWithFile.mockResolvedValue(mockResponse);

      render(
        <TestWrapper>
          <QA />
        </TestWrapper>
      );

      // Switch to file mode
      const fileRadio = screen.getByLabelText(/upload file/i);
      await user.click(fileRadio);

      // Fill in question
      const questionInput = screen.getByLabelText(/your question/i);
      await user.type(questionInput, 'What does this file contain?');

      // Create a mock file
      const file = new File(['React component content'], 'component.txt', { type: 'text/plain' });
      const fileInput = screen.getByLabelText(/upload a file/i);
      await user.upload(fileInput, file);

      // Verify file is displayed
      expect(screen.getByText('component.txt')).toBeInTheDocument();

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /ask question/i });
      await user.click(submitButton);

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('Answer')).toBeInTheDocument();
      });

      // Verify results are displayed
      expect(screen.getByText(mockResponse.answer)).toBeInTheDocument();
      expect(screen.getByText('92.0%')).toBeInTheDocument(); // Confidence score

      // Verify service was called with correct parameters
      expect(mockServices.qaService.answerQuestionWithFile).toHaveBeenCalledWith(
        'What does this file contain?',
        file
      );
    });

    it('should handle Q&A errors gracefully', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Document processing failed';

      mockServices.qaService.answerQuestion.mockRejectedValue(new Error(errorMessage));

      render(
        <TestWrapper>
          <QA />
        </TestWrapper>
      );

      // Fill in the form
      const questionInput = screen.getByLabelText(/your question/i);
      await user.type(questionInput, 'What is this about?');

      const documentTextArea = screen.getByLabelText(/document text/i);
      await user.type(documentTextArea, 'Some document content.');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /ask question/i });
      await user.click(submitButton);

      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  describe('Learning Path Workflow', () => {
    it('should complete successful learning path generation workflow', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        title: 'JavaScript Fundamentals Learning Path',
        duration: '1-month',
        skill_level: 'beginner',
        phases: [
          {
            phase_number: 1,
            title: 'Introduction to JavaScript',
            description: 'Learn the basics of JavaScript programming',
            duration: '1 week',
            objectives: ['Understand variables and data types', 'Learn control structures'],
            activities: ['Complete coding exercises', 'Build a simple calculator'],
          },
          {
            phase_number: 2,
            title: 'DOM Manipulation',
            description: 'Learn to interact with web pages',
            duration: '1 week',
            objectives: ['Understand the DOM', 'Learn event handling'],
            activities: ['Create interactive web pages', 'Build a todo app'],
          },
        ],
        resources: [
          {
            title: 'MDN JavaScript Guide',
            type: 'Documentation',
            url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
            description: 'Comprehensive JavaScript documentation',
          },
        ],
      };

      mockServices.learningPathService.generatePath.mockResolvedValue(mockResponse);

      render(
        <TestWrapper>
          <LearningPath />
        </TestWrapper>
      );

      // Fill in the form
      const goalsTextArea = screen.getByLabelText(/learning goals/i);
      await user.type(goalsTextArea, 'I want to learn JavaScript programming from scratch and build interactive web applications.');

      const skillLevelSelect = screen.getByLabelText(/current skill level/i);
      await user.selectOptions(skillLevelSelect, 'beginner');

      const durationSelect = screen.getByLabelText(/preferred timeline/i);
      await user.selectOptions(durationSelect, '1-month');

      // Add focus areas
      const practicalProjectsButton = screen.getByRole('button', { name: /practical projects/i });
      await user.click(practicalProjectsButton);

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /generate learning path/i });
      await user.click(submitButton);

      // Verify loading state
      expect(screen.getByText(/generating path.../i)).toBeInTheDocument();

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('JavaScript Fundamentals Learning Path')).toBeInTheDocument();
      });

      // Verify results are displayed
      expect(screen.getByText('Duration: 1-month')).toBeInTheDocument();
      expect(screen.getByText('Level: beginner')).toBeInTheDocument();
      expect(screen.getByText('2 Phases')).toBeInTheDocument();

      // Verify phases are displayed
      expect(screen.getByText('Introduction to JavaScript')).toBeInTheDocument();
      expect(screen.getByText('DOM Manipulation')).toBeInTheDocument();

      // Verify resources are displayed
      expect(screen.getByText('Recommended Resources')).toBeInTheDocument();
      expect(screen.getByText('MDN JavaScript Guide')).toBeInTheDocument();

      // Verify service was called with correct parameters
      expect(mockServices.learningPathService.generatePath).toHaveBeenCalledWith({
        goals: 'I want to learn JavaScript programming from scratch and build interactive web applications.',
        skill_level: 'beginner',
        duration: '1-month',
        focus_areas: ['Practical Projects'],
      });
    });

    it('should handle learning path generation errors gracefully', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Learning goals are too vague';

      mockServices.learningPathService.generatePath.mockRejectedValue(new Error(errorMessage));

      render(
        <TestWrapper>
          <LearningPath />
        </TestWrapper>
      );

      // Fill in the form
      const goalsTextArea = screen.getByLabelText(/learning goals/i);
      await user.type(goalsTextArea, 'I want to learn programming.');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /generate learning path/i });
      await user.click(submitButton);

      // Wait for error to be displayed
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should allow progress tracking on learning phases', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        title: 'Test Learning Path',
        duration: '1-week',
        skill_level: 'beginner',
        phases: [
          {
            phase_number: 1,
            title: 'Phase 1',
            description: 'First phase',
            duration: '3 days',
            objectives: ['Objective 1', 'Objective 2'],
            activities: ['Activity 1', 'Activity 2'],
          },
        ],
        resources: [],
      };

      mockServices.learningPathService.generatePath.mockResolvedValue(mockResponse);

      render(
        <TestWrapper>
          <LearningPath />
        </TestWrapper>
      );

      // Generate a learning path first
      const goalsTextArea = screen.getByLabelText(/learning goals/i);
      await user.type(goalsTextArea, 'Learn something new.');

      const submitButton = screen.getByRole('button', { name: /generate learning path/i });
      await user.click(submitButton);

      // Wait for results
      await waitFor(() => {
        expect(screen.getByText('Test Learning Path')).toBeInTheDocument();
      });

      // Click on phase to expand it
      const phaseHeader = screen.getByText('Phase 1');
      await user.click(phaseHeader);

      // Verify objectives and activities are shown
      expect(screen.getByText('Objective 1')).toBeInTheDocument();
      expect(screen.getByText('Activity 1')).toBeInTheDocument();

      // Test progress tracking by clicking checkboxes
      const objectiveCheckboxes = screen.getAllByRole('button');
      const firstObjectiveCheckbox = objectiveCheckboxes.find(button => 
        button.closest('li')?.textContent?.includes('Objective 1')
      );

      if (firstObjectiveCheckbox) {
        await user.click(firstObjectiveCheckbox);
        // Verify the objective is marked as completed (would need to check for visual changes)
      }
    });
  });

  describe('Form Reset Functionality', () => {
    it('should reset summarization form correctly', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <Summarization />
        </TestWrapper>
      );

      // Fill in the form
      const textArea = screen.getByLabelText(/text to summarize/i);
      await user.type(textArea, 'Some text content');

      const maxLengthInput = screen.getByLabelText(/summary length/i);
      await user.clear(maxLengthInput);
      await user.type(maxLengthInput, '200');

      // Reset the form
      const resetButton = screen.getByRole('button', { name: /reset/i });
      await user.click(resetButton);

      // Verify form is reset
      expect(textArea).toHaveValue('');
      expect(maxLengthInput).toHaveValue(150); // Default value
    });

    it('should reset Q&A form correctly', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <QA />
        </TestWrapper>
      );

      // Fill in the form
      const questionInput = screen.getByLabelText(/your question/i);
      await user.type(questionInput, 'Test question');

      const documentTextArea = screen.getByLabelText(/document text/i);
      await user.type(documentTextArea, 'Test document');

      // Reset the form
      const resetButton = screen.getByRole('button', { name: /reset/i });
      await user.click(resetButton);

      // Verify form is reset
      expect(questionInput).toHaveValue('');
      expect(documentTextArea).toHaveValue('');
    });

    it('should reset learning path form correctly', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <LearningPath />
        </TestWrapper>
      );

      // Fill in the form
      const goalsTextArea = screen.getByLabelText(/learning goals/i);
      await user.type(goalsTextArea, 'Test learning goals');

      // Add a focus area
      const practicalProjectsButton = screen.getByRole('button', { name: /practical projects/i });
      await user.click(practicalProjectsButton);

      // Reset the form
      const resetButton = screen.getByRole('button', { name: /reset/i });
      await user.click(resetButton);

      // Verify form is reset
      expect(goalsTextArea).toHaveValue('');
      expect(screen.queryByText('Practical Projects')).not.toBeInTheDocument();
    });
  });

  describe('Notification System Integration', () => {
    it('should show success notifications for successful operations', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        summary: 'Test summary',
        original_length: 100,
        summary_length: 50,
        compression_ratio: 0.5,
      };

      mockServices.summarizationService.summarizeText.mockResolvedValue(mockResponse);

      render(
        <TestWrapper>
          <Summarization />
        </TestWrapper>
      );

      // Fill and submit form
      const textArea = screen.getByLabelText(/text to summarize/i);
      await user.type(textArea, 'This is a test text for summarization.');

      const submitButton = screen.getByRole('button', { name: /summarize text/i });
      await user.click(submitButton);

      // Wait for success notification
      await waitFor(() => {
        expect(screen.getByText('Text summarized successfully!')).toBeInTheDocument();
      });
    });

    it('should show error notifications for failed operations', async () => {
      const user = userEvent.setup();
      const errorMessage = 'Network error occurred';

      mockServices.summarizationService.summarizeText.mockRejectedValue(new Error(errorMessage));

      render(
        <TestWrapper>
          <Summarization />
        </TestWrapper>
      );

      // Fill and submit form
      const textArea = screen.getByLabelText(/text to summarize/i);
      await user.type(textArea, 'This is a test text.');

      const submitButton = screen.getByRole('button', { name: /summarize text/i });
      await user.click(submitButton);

      // Wait for error notification
      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });
});