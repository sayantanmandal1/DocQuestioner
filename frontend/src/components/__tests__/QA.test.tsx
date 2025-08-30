import React from 'react';
import { render, screen, waitFor } from '../../../__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import QA from '../QA';
import { qaService } from '../../lib/services';
import type { QAResponse } from '../../types/api';

// Mock the QA service
jest.mock('../../lib/services', () => ({
  qaService: {
    answerQuestion: jest.fn(),
    answerQuestionWithFile: jest.fn(),
  },
}));

const mockQAService = qaService as jest.Mocked<typeof qaService>;

// Mock clipboard API
const mockWriteText = jest.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe('QA Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteText.mockClear();
  });

  it('renders all form elements correctly', () => {
    render(<QA />);
    
    // Check for main elements
    expect(screen.getByLabelText(/your question/i)).toBeInTheDocument();
    expect(screen.getByText(/document input method/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/paste text/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/upload file/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/document text/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ask question/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('shows character count for question input', async () => {
    const user = userEvent.setup();
    render(<QA />);
    
    const questionInput = screen.getByLabelText(/your question/i);
    await user.type(questionInput, 'What is this about?');
    
    expect(screen.getByText('19/500 characters')).toBeInTheDocument();
  });

  it('switches between text and file input modes', async () => {
    const user = userEvent.setup();
    render(<QA />);
    
    // Initially in text mode
    expect(screen.getByLabelText(/document text/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/upload document/i)).not.toBeInTheDocument();
    
    // Switch to file mode
    const fileRadio = screen.getByLabelText(/upload file/i);
    await user.click(fileRadio);
    
    expect(screen.queryByLabelText(/document text/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/upload document/i)).toBeInTheDocument();
  });

  it('validates required question input', async () => {
    const user = userEvent.setup();
    render(<QA />);
    
    const submitButton = screen.getByRole('button', { name: /ask question/i });
    await user.click(submitButton);
    
    expect(screen.getByText('Question is required')).toBeInTheDocument();
  });

  it('validates minimum question length', async () => {
    const user = userEvent.setup();
    render(<QA />);
    
    const questionInput = screen.getByLabelText(/your question/i);
    await user.type(questionInput, 'Hi?');
    
    const submitButton = screen.getByRole('button', { name: /ask question/i });
    await user.click(submitButton);
    
    expect(screen.getByText('Question must be at least 5 characters long')).toBeInTheDocument();
  });

  it('validates maximum question length', async () => {
    const user = userEvent.setup();
    render(<QA />);
    
    const questionInput = screen.getByLabelText(/your question/i);
    const longQuestion = 'a'.repeat(501);
    await user.type(questionInput, longQuestion);
    
    const submitButton = screen.getByRole('button', { name: /ask question/i });
    await user.click(submitButton);
    
    expect(screen.getByText('Question must be less than 500 characters')).toBeInTheDocument();
  });

  it('validates required document text in text mode', async () => {
    const user = userEvent.setup();
    render(<QA />);
    
    const questionInput = screen.getByLabelText(/your question/i);
    await user.type(questionInput, 'What is this about?');
    
    const submitButton = screen.getByRole('button', { name: /ask question/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Document text is required')).toBeInTheDocument();
    });
  });

  it('validates minimum document text length', async () => {
    const user = userEvent.setup();
    render(<QA />);
    
    const questionInput = screen.getByLabelText(/your question/i);
    await user.type(questionInput, 'What is this about?');
    
    const documentText = screen.getByLabelText(/document text/i);
    await user.type(documentText, 'Short');
    
    const submitButton = screen.getByRole('button', { name: /ask question/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Document text must be at least 10 characters long')).toBeInTheDocument();
    });
  });

  it('validates required file in file mode', async () => {
    const user = userEvent.setup();
    render(<QA />);
    
    // Switch to file mode
    const fileRadio = screen.getByLabelText(/upload file/i);
    await user.click(fileRadio);
    
    const questionInput = screen.getByLabelText(/your question/i);
    await user.type(questionInput, 'What is this about?');
    
    const submitButton = screen.getByRole('button', { name: /ask question/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Please select a file to upload')).toBeInTheDocument();
    });
  });

  it('validates file size limit', async () => {
    const user = userEvent.setup();
    render(<QA />);
    
    // Switch to file mode
    const fileRadio = screen.getByLabelText(/upload file/i);
    await user.click(fileRadio);
    
    const questionInput = screen.getByLabelText(/your question/i);
    await user.type(questionInput, 'What is this about?');
    
    // Create a large file (>10MB)
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/upload document/i);
    await user.upload(fileInput, largeFile);
    
    const submitButton = screen.getByRole('button', { name: /ask question/i });
    await user.click(submitButton);
    
    expect(screen.getByText('File size must be less than 10MB')).toBeInTheDocument();
  });

  it('validates file type', async () => {
    const user = userEvent.setup();
    render(<QA />);
    
    // Switch to file mode
    const fileRadio = screen.getByLabelText(/upload file/i);
    await user.click(fileRadio);
    
    const questionInput = screen.getByLabelText(/your question/i);
    await user.type(questionInput, 'What is this about?');
    
    // Create a non-text file
    const imageFile = new File(['fake image'], 'image.jpg', { type: 'image/jpeg' });
    const fileInput = screen.getByLabelText(/upload document/i);
    await user.upload(fileInput, imageFile);
    
    const submitButton = screen.getByRole('button', { name: /ask question/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Only text files are supported')).toBeInTheDocument();
    });
  });

  it('clears validation errors when user starts typing', async () => {
    const user = userEvent.setup();
    render(<QA />);
    
    // Trigger validation error
    const submitButton = screen.getByRole('button', { name: /ask question/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Question is required')).toBeInTheDocument();
    });
    
    // Start typing to clear error
    const questionInput = screen.getByLabelText(/your question/i);
    await user.type(questionInput, 'What');
    
    expect(screen.queryByText('Question is required')).not.toBeInTheDocument();
  });

  it('disables submit button when form is invalid', () => {
    render(<QA />);
    
    const submitButton = screen.getByRole('button', { name: /ask question/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when form is valid in text mode', async () => {
    const user = userEvent.setup();
    render(<QA />);
    
    const questionInput = screen.getByLabelText(/your question/i);
    await user.type(questionInput, 'What is this about?');
    
    const documentText = screen.getByLabelText(/document text/i);
    await user.type(documentText, 'This is a sample document for testing purposes.');
    
    const submitButton = screen.getByRole('button', { name: /ask question/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('enables submit button when form is valid in file mode', async () => {
    const user = userEvent.setup();
    render(<QA />);
    
    // Switch to file mode
    const fileRadio = screen.getByLabelText(/upload file/i);
    await user.click(fileRadio);
    
    const questionInput = screen.getByLabelText(/your question/i);
    await user.type(questionInput, 'What is this about?');
    
    const textFile = new File(['This is a test document'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/upload document/i);
    await user.upload(fileInput, textFile);
    
    const submitButton = screen.getByRole('button', { name: /ask question/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('shows loading state during API call', async () => {
    const user = userEvent.setup();
    
    // Mock a delayed response
    mockQAService.answerQuestion.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<QA />);
    
    const questionInput = screen.getByLabelText(/your question/i);
    await user.type(questionInput, 'What is this about?');
    
    const documentText = screen.getByLabelText(/document text/i);
    await user.type(documentText, 'This is a sample document for testing purposes.');
    
    const submitButton = screen.getByRole('button', { name: /ask question/i });
    await user.click(submitButton);
    
    expect(screen.getByText(/processing.../i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('successfully submits form with text input and displays results', async () => {
    const user = userEvent.setup();
    
    const mockResponse: QAResponse = {
      answer: 'This document is about testing Q&A functionality.',
      confidence: 0.95,
      sources: ['This is a sample document for testing purposes.'],
    };
    
    mockQAService.answerQuestion.mockResolvedValue(mockResponse);
    
    render(<QA />);
    
    // Fill form
    const questionInput = screen.getByLabelText(/your question/i);
    await user.type(questionInput, 'What is this about?');
    
    const documentText = screen.getByLabelText(/document text/i);
    await user.type(documentText, 'This is a sample document for testing purposes.');
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /ask question/i });
    await user.click(submitButton);
    
    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('Answer')).toBeInTheDocument();
    });
    
    // Check results display
    expect(screen.getByText(mockResponse.answer)).toBeInTheDocument();
    expect(screen.getByText('95.0%')).toBeInTheDocument(); // confidence
    expect(screen.getByText('Supporting Sources')).toBeInTheDocument();
    // Check that sources section exists and contains the expected text
    const sourcesSection = screen.getByText('Supporting Sources').closest('div');
    expect(sourcesSection).toHaveTextContent('This is a sample document for testing purposes.');
    
    // Verify API was called with correct parameters
    expect(mockQAService.answerQuestion).toHaveBeenCalledWith({
      question: 'What is this about?',
      document_text: 'This is a sample document for testing purposes.',
    });
  });

  it('successfully submits form with file upload and displays results', async () => {
    const user = userEvent.setup();
    
    const mockResponse: QAResponse = {
      answer: 'This file contains test content.',
      confidence: 0.88,
      sources: ['Test file content'],
    };
    
    mockQAService.answerQuestionWithFile.mockResolvedValue(mockResponse);
    
    render(<QA />);
    
    // Switch to file mode
    const fileRadio = screen.getByLabelText(/upload file/i);
    await user.click(fileRadio);
    
    // Fill form
    const questionInput = screen.getByLabelText(/your question/i);
    await user.type(questionInput, 'What does this file contain?');
    
    const textFile = new File(['Test file content'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/upload document/i);
    await user.upload(fileInput, textFile);
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /ask question/i });
    await user.click(submitButton);
    
    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('Answer')).toBeInTheDocument();
    });
    
    // Check results display
    expect(screen.getByText(mockResponse.answer)).toBeInTheDocument();
    expect(screen.getByText('88.0%')).toBeInTheDocument(); // confidence
    
    // Verify API was called with correct parameters
    expect(mockQAService.answerQuestionWithFile).toHaveBeenCalledWith(
      'What does this file contain?',
      textFile
    );
  });

  it('displays results without confidence and sources', async () => {
    const user = userEvent.setup();
    
    const mockResponse: QAResponse = {
      answer: 'This is a basic answer without additional metadata.',
    };
    
    mockQAService.answerQuestion.mockResolvedValue(mockResponse);
    
    render(<QA />);
    
    const questionInput = screen.getByLabelText(/your question/i);
    await user.type(questionInput, 'What is this about?');
    
    const documentText = screen.getByLabelText(/document text/i);
    await user.type(documentText, 'This is a sample document for testing purposes.');
    
    const submitButton = screen.getByRole('button', { name: /ask question/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Answer')).toBeInTheDocument();
    });
    
    expect(screen.getByText(mockResponse.answer)).toBeInTheDocument();
    expect(screen.queryByText('Confidence Score')).not.toBeInTheDocument();
    expect(screen.queryByText('Supporting Sources')).not.toBeInTheDocument();
  });

  it('displays API error messages', async () => {
    const user = userEvent.setup();
    
    const errorMessage = 'Document processing failed';
    mockQAService.answerQuestion.mockRejectedValue({
      response: {
        data: {
          detail: errorMessage,
        },
      },
    });
    
    render(<QA />);
    
    const questionInput = screen.getByLabelText(/your question/i);
    await user.type(questionInput, 'What is this about?');
    
    const documentText = screen.getByLabelText(/document text/i);
    await user.type(documentText, 'This is a sample document for testing purposes.');
    
    const submitButton = screen.getByRole('button', { name: /ask question/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('displays generic error for unknown errors', async () => {
    const user = userEvent.setup();
    
    mockQAService.answerQuestion.mockRejectedValue(new Error());
    
    render(<QA />);
    
    const questionInput = screen.getByLabelText(/your question/i);
    await user.type(questionInput, 'What is this about?');
    
    const documentText = screen.getByLabelText(/document text/i);
    await user.type(documentText, 'This is a sample document for testing purposes.');
    
    const submitButton = screen.getByRole('button', { name: /ask question/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
    });
  });

  it('resets form when reset button is clicked', async () => {
    const user = userEvent.setup();
    render(<QA />);
    
    // Fill form with data
    const questionInput = screen.getByLabelText(/your question/i);
    await user.type(questionInput, 'What is this about?');
    
    const documentText = screen.getByLabelText(/document text/i);
    await user.type(documentText, 'This is a sample document.');
    
    // Click reset
    const resetButton = screen.getByRole('button', { name: /reset/i });
    await user.click(resetButton);
    
    // Check form is reset
    expect(questionInput).toHaveValue('');
    expect(documentText).toHaveValue('');
    expect(screen.getByLabelText(/paste text/i)).toBeChecked();
  });

  it('copies answer to clipboard when copy button is clicked', async () => {
    const user = userEvent.setup();
    
    const mockResponse: QAResponse = {
      answer: 'This is the answer to copy.',
    };
    
    mockQAService.answerQuestion.mockResolvedValue(mockResponse);
    
    render(<QA />);
    
    // Submit form to get results
    const questionInput = screen.getByLabelText(/your question/i);
    await user.type(questionInput, 'What is this about?');
    
    const documentText = screen.getByLabelText(/document text/i);
    await user.type(documentText, 'This is a sample document for testing purposes.');
    
    const submitButton = screen.getByRole('button', { name: /ask question/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Answer')).toBeInTheDocument();
    });
    
    // Click copy button
    const copyButton = screen.getByRole('button', { name: /copy/i });
    await user.click(copyButton);
    
    // Verify clipboard was called
    expect(mockWriteText).toHaveBeenCalledWith(mockResponse.answer);
  });

  it('shows file information when file is selected', async () => {
    const user = userEvent.setup();
    render(<QA />);
    
    // Switch to file mode
    const fileRadio = screen.getByLabelText(/upload file/i);
    await user.click(fileRadio);
    
    const textFile = new File(['Test content'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/upload document/i);
    await user.upload(fileInput, textFile);
    
    expect(screen.getByText(/test\.txt/)).toBeInTheDocument();
    expect(screen.getByText(/\(0\.0 KB\)/)).toBeInTheDocument();
  });

  it('removes file when remove button is clicked', async () => {
    const user = userEvent.setup();
    render(<QA />);
    
    // Switch to file mode
    const fileRadio = screen.getByLabelText(/upload file/i);
    await user.click(fileRadio);
    
    const textFile = new File(['Test content'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/upload document/i);
    await user.upload(fileInput, textFile);
    
    expect(screen.getByText(/test\.txt/)).toBeInTheDocument();
    
    // Click remove button
    const removeButton = screen.getByRole('button', { name: '' }); // SVG button
    await user.click(removeButton);
    
    expect(screen.queryByText(/test\.txt/)).not.toBeInTheDocument();
  });

  it('clears form data when switching input modes', async () => {
    const user = userEvent.setup();
    render(<QA />);
    
    // Fill text mode
    const documentText = screen.getByLabelText(/document text/i);
    await user.type(documentText, 'Some text content');
    
    // Switch to file mode
    const fileRadio = screen.getByLabelText(/upload file/i);
    await user.click(fileRadio);
    
    // Switch back to text mode
    const textRadio = screen.getByLabelText(/paste text/i);
    await user.click(textRadio);
    
    // Check that text was cleared
    expect(screen.getByLabelText(/document text/i)).toHaveValue('');
  });

  it('shows character count for document text', async () => {
    const user = userEvent.setup();
    render(<QA />);
    
    const documentText = screen.getByLabelText(/document text/i);
    await user.type(documentText, 'Hello world');
    
    expect(screen.getByText('11 characters')).toBeInTheDocument();
  });
});