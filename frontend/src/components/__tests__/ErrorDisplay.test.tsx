import { render, screen, fireEvent } from '@testing-library/react';
import ErrorDisplay, { InlineError, ErrorFallback } from '../ErrorDisplay';

describe('ErrorDisplay', () => {
  it('renders error message', () => {
    render(<ErrorDisplay message="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders with title', () => {
    render(<ErrorDisplay title="Error Title" message="Error message" />);
    expect(screen.getByText('Error Title')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('renders with different types', () => {
    const { rerender } = render(<ErrorDisplay message="Test" type="error" />);
    expect(screen.getByText('Test').closest('div')).toHaveClass('bg-red-50', 'border-red-200', 'text-red-800');

    rerender(<ErrorDisplay message="Test" type="warning" />);
    expect(screen.getByText('Test').closest('div')).toHaveClass('bg-yellow-50', 'border-yellow-200', 'text-yellow-800');

    rerender(<ErrorDisplay message="Test" type="info" />);
    expect(screen.getByText('Test').closest('div')).toHaveClass('bg-blue-50', 'border-blue-200', 'text-blue-800');
  });

  it('shows retry button when onRetry is provided', () => {
    const handleRetry = jest.fn();
    render(<ErrorDisplay message="Error" onRetry={handleRetry} />);
    
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('shows dismiss button when onDismiss is provided', () => {
    const handleDismiss = jest.fn();
    render(<ErrorDisplay message="Error" onDismiss={handleDismiss} />);
    
    const dismissButton = screen.getByText('Dismiss');
    expect(dismissButton).toBeInTheDocument();
    
    fireEvent.click(dismissButton);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('shows close button when onDismiss is provided', () => {
    const handleDismiss = jest.fn();
    render(<ErrorDisplay message="Error" onDismiss={handleDismiss} />);
    
    const closeButton = screen.getByRole('button', { name: '' }); // X button has no text
    fireEvent.click(closeButton);
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('hides icon when showIcon is false', () => {
    render(<ErrorDisplay message="Error" showIcon={false} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ErrorDisplay message="Error" className="custom-class" />);
    expect(screen.getByText('Error').closest('div')).toHaveClass('custom-class');
  });
});

describe('InlineError', () => {
  it('renders error message with icon', () => {
    render(<InlineError message="Field is required" />);
    expect(screen.getByText('Field is required')).toBeInTheDocument();
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<InlineError message="Error" className="custom-class" />);
    expect(screen.getByText('Error').closest('div')).toHaveClass('custom-class');
  });

  it('has correct styling', () => {
    render(<InlineError message="Error" />);
    const container = screen.getByText('Error').closest('div');
    expect(container).toHaveClass('text-red-600', 'text-sm', 'mt-1');
  });
});

describe('ErrorFallback', () => {
  it('renders error message and retry button', () => {
    const error = new Error('Test error');
    const resetError = jest.fn();
    
    render(<ErrorFallback error={error} resetError={resetError} />);
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
    
    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);
    expect(resetError).toHaveBeenCalledTimes(1);
  });

  it('renders fallback message for unknown errors', () => {
    const error = {} as Error; // Error without message
    const resetError = jest.fn();
    
    render(<ErrorFallback error={error} resetError={resetError} />);
    
    expect(screen.getByText('An unexpected error occurred. Please try refreshing the page.')).toBeInTheDocument();
  });
});