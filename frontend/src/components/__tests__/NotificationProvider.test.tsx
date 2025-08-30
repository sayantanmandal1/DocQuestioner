import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { NotificationProvider, useNotifications, useApiErrorHandler } from '../NotificationProvider';

// Test component that uses the notification context
function TestComponent() {
  const { success, error, info, notifications } = useNotifications();
  
  return (
    <div>
      <button onClick={() => success('Success message')}>Success</button>
      <button onClick={() => error('Error message')}>Error</button>
      <button onClick={() => info('Info message')}>Info</button>
      <div data-testid="notification-count">{notifications.length}</div>
    </div>
  );
}

// Test component for API error handler
function ApiErrorTestComponent() {
  const handleApiError = useApiErrorHandler();
  
  return (
    <div>
      <button onClick={() => handleApiError(new Error('API Error'))}>
        Handle Error
      </button>
      <button onClick={() => handleApiError('String error')}>
        Handle String Error
      </button>
      <button onClick={() => handleApiError({ message: 'Object error' })}>
        Handle Object Error
      </button>
      <button onClick={() => handleApiError(null)}>
        Handle Unknown Error
      </button>
    </div>
  );
}

describe('NotificationProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('provides notification context to children', () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );
    
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  it('shows success notification', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );
    
    fireEvent.click(screen.getByText('Success'));
    
    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });
    
    expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
  });

  it('shows error notification', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );
    
    fireEvent.click(screen.getByText('Error'));
    
    await waitFor(() => {
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
    
    expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
  });

  it('shows info notification', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );
    
    fireEvent.click(screen.getByText('Info'));
    
    await waitFor(() => {
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });
    
    expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
  });

  it('removes notification after duration', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );
    
    fireEvent.click(screen.getByText('Success'));
    
    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });
    
    // Fast-forward time to trigger auto-removal
    act(() => {
      jest.advanceTimersByTime(3300); // 3000ms duration + 300ms fade out
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
    
    expect(screen.getByTestId('notification-count')).toHaveTextContent('0');
  });

  it('limits number of notifications', async () => {
    render(
      <NotificationProvider maxNotifications={2}>
        <TestComponent />
      </NotificationProvider>
    );
    
    // Add 3 notifications
    fireEvent.click(screen.getByText('Success'));
    fireEvent.click(screen.getByText('Error'));
    fireEvent.click(screen.getByText('Info'));
    
    await waitFor(() => {
      expect(screen.getByTestId('notification-count')).toHaveTextContent('2');
    });
  });

  it('removes notification when close button is clicked', async () => {
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );
    
    fireEvent.click(screen.getByText('Success'));
    
    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });
    
    // Find and click the close button
    const closeButton = screen.getByRole('button', { name: '' }); // X button
    fireEvent.click(closeButton);
    
    // Wait for fade out animation
    act(() => {
      jest.advanceTimersByTime(300);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
  });

  it('throws error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useNotifications must be used within a NotificationProvider');
    
    consoleSpy.mockRestore();
  });
});

describe('useApiErrorHandler', () => {
  it('handles Error objects', async () => {
    render(
      <NotificationProvider>
        <ApiErrorTestComponent />
      </NotificationProvider>
    );
    
    fireEvent.click(screen.getByText('Handle Error'));
    
    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('handles string errors', async () => {
    render(
      <NotificationProvider>
        <ApiErrorTestComponent />
      </NotificationProvider>
    );
    
    fireEvent.click(screen.getByText('Handle String Error'));
    
    await waitFor(() => {
      expect(screen.getByText('String error')).toBeInTheDocument();
    });
  });

  it('handles object errors with message property', async () => {
    render(
      <NotificationProvider>
        <ApiErrorTestComponent />
      </NotificationProvider>
    );
    
    fireEvent.click(screen.getByText('Handle Object Error'));
    
    await waitFor(() => {
      expect(screen.getByText('Object error')).toBeInTheDocument();
    });
  });

  it('handles unknown errors with fallback message', async () => {
    render(
      <NotificationProvider>
        <ApiErrorTestComponent />
      </NotificationProvider>
    );
    
    fireEvent.click(screen.getByText('Handle Unknown Error'));
    
    await waitFor(() => {
      expect(screen.getByText('An error occurred')).toBeInTheDocument();
    });
  });
});