import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoadingSpinner, { LoadingOverlay, LoadingButton } from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('w-8', 'h-8', 'text-blue-600');
  });

  it('renders with custom size', () => {
    render(<LoadingSpinner size="lg" />);
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('w-12', 'h-12');
  });

  it('renders with custom color', () => {
    render(<LoadingSpinner color="white" />);
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('text-white');
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-class" />);
    const container = screen.getByTestId('loading-spinner').parentElement;
    expect(container).toHaveClass('custom-class');
  });
});

describe('LoadingOverlay', () => {
  it('renders with default message', () => {
    render(<LoadingOverlay />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingOverlay message="Processing your request..." />);
    expect(screen.getByText('Processing your request...')).toBeInTheDocument();
  });

  it('has correct overlay styling', () => {
    render(<LoadingOverlay />);
    const overlay = screen.getByText('Loading...').closest('.fixed');
    expect(overlay).toHaveClass('fixed', 'inset-0', 'bg-black', 'bg-opacity-50', 'z-50');
  });
});

describe('LoadingButton', () => {
  it('renders children when not loading', () => {
    render(
      <LoadingButton loading={false} onClose={() => {}}>
        Click me
      </LoadingButton>
    );
    expect(screen.getByText('Click me')).toBeInTheDocument();
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
  });

  it('shows spinner when loading', () => {
    render(
      <LoadingButton loading={true} onClose={() => {}}>
        Click me
      </LoadingButton>
    );
    expect(screen.getByText('Click me')).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('is disabled when loading', () => {
    render(
      <LoadingButton loading={true} onClose={() => {}}>
        Click me
      </LoadingButton>
    );
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('cursor-not-allowed');
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <LoadingButton loading={false} disabled={true} onClose={() => {}}>
        Click me
      </LoadingButton>
    );
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('calls onClick when clicked and not loading', () => {
    const handleClick = jest.fn();
    render(
      <LoadingButton loading={false} onClick={handleClick} onClose={() => {}}>
        Click me
      </LoadingButton>
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when loading', () => {
    const handleClick = jest.fn();
    render(
      <LoadingButton loading={true} onClick={handleClick} onClose={() => {}}>
        Click me
      </LoadingButton>
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('has correct button type', () => {
    render(
      <LoadingButton loading={false} type="submit" onClose={() => {}}>
        Submit
      </LoadingButton>
    );
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'submit');
  });
});