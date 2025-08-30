import React from 'react';
import { render, screen, waitFor } from '../../__tests__/test-utils';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import Summarization from '../Summarization';
import { summarizationService } from '../../lib/services';
import type { SummarizationResponse } from '../../types/api';

// Mock the summarization service
jest.mock('../../lib/services', () => ({
  summarizationService: {
    summarizeText: jest.fn(),
  },
}));

const mockSummarizationService = summarizationService as jest.Mocked<typeof summarizationService>;

describe('Summarization Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all form elements correctly', () => {
    render(<Summarization />);

    // Check for main elements
    expect(screen.getByLabelText(/text to summarize/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/summary length/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/summary style/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /summarize text/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });

  it('shows character count for text input', async () => {
    const user = userEvent.setup();
    render(<Summarization />);

    const textArea = screen.getByLabelText(/text to summarize/i);
    await user.type(textArea, 'Hello world');

    expect(screen.getByText('11/10,000 characters')).toBeInTheDocument();
  });

  it('validates required text input', async () => {
    const user = userEvent.setup();
    render(<Summarization />);

    const submitButton = screen.getByRole('button', { name: /summarize text/i });
    await user.click(submitButton);

    expect(screen.getByText('Text is required')).toBeInTheDocument();
  });

  it('validates minimum text length', async () => {
    const user = userEvent.setup();
    render(<Summarization />);

    const textArea = screen.getByLabelText(/text to summarize/i);
    await user.type(textArea, 'Short');

    const submitButton = screen.getByRole('button', { name: /summarize text/i });
    await user.click(submitButton);

    expect(screen.getByText('Text must be at least 10 characters long')).toBeInTheDocument();
  });

  it('validates maximum text length', async () => {
    const user = userEvent.setup();
    render(<Summarization />);

    const textArea = screen.getByLabelText(/text to summarize/i);
    const longText = 'a'.repeat(10001);
    await user.type(textArea, longText);

    const submitButton = screen.getByRole('button', { name: /summarize text/i });
    await user.click(submitButton);

    expect(screen.getByText('Text must be less than 10,000 characters')).toBeInTheDocument();
  });

  it('validates summary length range', async () => {
    const user = userEvent.setup();
    render(<Summarization />);

    const lengthInput = screen.getByLabelText(/summary length/i);
    await user.clear(lengthInput);
    await user.type(lengthInput, '30');

    const textArea = screen.getByLabelText(/text to summarize/i);
    await user.type(textArea, 'This is a valid text that is long enough for testing purposes.');

    const submitButton = screen.getByRole('button', { name: /summarize text/i });
    await user.click(submitButton);

    expect(screen.getByText('Summary length must be between 50 and 500 characters')).toBeInTheDocument();
  });

  it('clears validation errors when user starts typing', async () => {
    const user = userEvent.setup();
    render(<Summarization />);

    // Trigger validation error
    const submitButton = screen.getByRole('button', { name: /summarize text/i });
    await user.click(submitButton);
    expect(screen.getByText('Text is required')).toBeInTheDocument();

    // Start typing to clear error
    const textArea = screen.getByLabelText(/text to summarize/i);
    await user.type(textArea, 'Hello');

    expect(screen.queryByText('Text is required')).not.toBeInTheDocument();
  });

  it('disables submit button when text is empty', () => {
    render(<Summarization />);

    const submitButton = screen.getByRole('button', { name: /summarize text/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when valid text is entered', async () => {
    const user = userEvent.setup();
    render(<Summarization />);

    const textArea = screen.getByLabelText(/text to summarize/i);
    await user.type(textArea, 'This is a valid text for summarization testing.');

    const submitButton = screen.getByRole('button', { name: /summarize text/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('shows loading state during API call', async () => {
    const user = userEvent.setup();

    // Mock a delayed response
    mockSummarizationService.summarizeText.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );

    render(<Summarization />);

    const textArea = screen.getByLabelText(/text to summarize/i);
    await user.type(textArea, 'This is a valid text for summarization testing.');

    const submitButton = screen.getByRole('button', { name: /summarize text/i });
    await user.click(submitButton);

    expect(screen.getByText(/summarizing.../i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('successfully submits form and displays results', async () => {
    const user = userEvent.setup();

    const mockResponse: SummarizationResponse = {
      summary: 'This is a test summary of the provided text.',
      original_length: 45,
      summary_length: 47,
      compression_ratio: 0.96,
    };

    mockSummarizationService.summarizeText.mockResolvedValue(mockResponse);

    render(<Summarization />);

    // Fill form
    const textArea = screen.getByLabelText(/text to summarize/i);
    await user.type(textArea, 'This is a valid text for summarization testing.');

    const lengthInput = screen.getByLabelText(/summary length/i);
    await user.clear(lengthInput);
    await user.type(lengthInput, '100');

    const styleSelect = screen.getByLabelText(/summary style/i);
    await user.selectOptions(styleSelect, 'detailed');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /summarize text/i });
    await user.click(submitButton);

    // Wait for results
    await waitFor(() => {
      expect(screen.getByText('Summary Results')).toBeInTheDocument();
    });

    // Check results display
    expect(screen.getByText(mockResponse.summary)).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument(); // original length
    expect(screen.getByText('47')).toBeInTheDocument(); // summary length
    expect(screen.getByText('96.0%')).toBeInTheDocument(); // compression ratio

    // Verify API was called with correct parameters
    expect(mockSummarizationService.summarizeText).toHaveBeenCalledWith({
      text: 'This is a valid text for summarization testing.',
      max_length: 100,
      style: 'detailed',
    });
  });

  it('displays API error messages', async () => {
    const user = userEvent.setup();

    const errorMessage = 'API key is invalid';
    mockSummarizationService.summarizeText.mockRejectedValue({
      response: {
        data: {
          detail: errorMessage,
        },
      },
    });

    render(<Summarization />);

    const textArea = screen.getByLabelText(/text to summarize/i);
    await user.type(textArea, 'This is a valid text for summarization testing.');

    const submitButton = screen.getByRole('button', { name: /summarize text/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('displays generic error for unknown errors', async () => {
    const user = userEvent.setup();

    mockSummarizationService.summarizeText.mockRejectedValue(new Error());

    render(<Summarization />);

    const textArea = screen.getByLabelText(/text to summarize/i);
    await user.type(textArea, 'This is a valid text for summarization testing.');

    const submitButton = screen.getByRole('button', { name: /summarize text/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
    });
  });

  it('resets form when reset button is clicked', async () => {
    const user = userEvent.setup();
    render(<Summarization />);

    // Fill form with data
    const textArea = screen.getByLabelText(/text to summarize/i);
    await user.type(textArea, 'This is some test text.');

    const lengthInput = screen.getByLabelText(/summary length/i);
    await user.clear(lengthInput);
    await user.type(lengthInput, '200');

    const styleSelect = screen.getByLabelText(/summary style/i);
    await user.selectOptions(styleSelect, 'bullet-points');

    // Click reset
    const resetButton = screen.getByRole('button', { name: /reset/i });
    await user.click(resetButton);

    // Check form is reset
    expect(textArea).toHaveValue('');
    expect(lengthInput).toHaveValue(150);
    expect(styleSelect).toHaveValue('concise');
  });

  it('copies summary to clipboard when copy button is clicked', async () => {
    const user = userEvent.setup();

    const mockResponse: SummarizationResponse = {
      summary: 'This is a test summary.',
      original_length: 45,
      summary_length: 23,
      compression_ratio: 0.51,
    };

    mockSummarizationService.summarizeText.mockResolvedValue(mockResponse);

    render(<Summarization />);

    // Submit form to get results
    const textArea = screen.getByLabelText(/text to summarize/i);
    await user.type(textArea, 'This is a valid text for summarization testing.');

    const submitButton = screen.getByRole('button', { name: /summarize text/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Summary Results')).toBeInTheDocument();
    });

    // Click copy button
    const copyButton = screen.getByRole('button', { name: /copy/i });
    await user.click(copyButton);

    // Verify clipboard was called
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockResponse.summary);
  });

  it('updates style options correctly', async () => {
    const user = userEvent.setup();
    render(<Summarization />);

    const styleSelect = screen.getByLabelText(/summary style/i);

    // Check all options are available
    expect(screen.getByRole('option', { name: 'Concise' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Detailed' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Bullet Points' })).toBeInTheDocument();

    // Test selection
    await user.selectOptions(styleSelect, 'bullet-points');
    expect(styleSelect).toHaveValue('bullet-points');
  });

  it('handles form submission with default values', async () => {
    const user = userEvent.setup();

    const mockResponse: SummarizationResponse = {
      summary: 'Default summary.',
      original_length: 30,
      summary_length: 15,
      compression_ratio: 0.5,
    };

    mockSummarizationService.summarizeText.mockResolvedValue(mockResponse);

    render(<Summarization />);

    const textArea = screen.getByLabelText(/text to summarize/i);
    await user.type(textArea, 'This is a test with defaults.');

    const submitButton = screen.getByRole('button', { name: /summarize text/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockSummarizationService.summarizeText).toHaveBeenCalledWith({
        text: 'This is a test with defaults.',
        max_length: 150, // default value
        style: 'concise', // default value
      });
    });
  });
});