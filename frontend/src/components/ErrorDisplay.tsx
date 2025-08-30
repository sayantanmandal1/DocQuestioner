'use client';

import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  type?: 'error' | 'warning' | 'info';
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  showIcon?: boolean;
}

export default function ErrorDisplay({
  title,
  message,
  type = 'error',
  onRetry,
  onDismiss,
  className = '',
  showIcon = true,
}: ErrorDisplayProps) {
  const typeStyles = {
    error: {
      container: 'bg-red-50 border-red-200 text-red-800',
      icon: 'text-red-500',
      button: 'bg-red-600 hover:bg-red-700 text-white',
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      icon: 'text-yellow-500',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    },
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: 'text-blue-500',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
  };

  const styles = typeStyles[type];

  return (
    <div className={`border rounded-lg p-4 ${styles.container} ${className}`}>
      <div className="flex items-start gap-3">
        {showIcon && (
          <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${styles.icon}`} />
        )}
        
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="font-semibold text-sm mb-1">{title}</h3>
          )}
          <p className="text-sm leading-relaxed">{message}</p>
          
          {(onRetry || onDismiss) && (
            <div className="flex gap-2 mt-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${styles.button}`}
                >
                  <RefreshCw className="w-3 h-3" />
                  Try Again
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 hover:bg-black/5 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Inline error component for forms
interface InlineErrorProps {
  message: string;
  className?: string;
}

export function InlineError({ message, className = '' }: InlineErrorProps) {
  return (
    <div className={`flex items-center gap-1 text-red-600 text-sm mt-1 ${className}`}>
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// Error boundary fallback component
interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <ErrorDisplay
          title="Something went wrong"
          message={error.message || 'An unexpected error occurred. Please try refreshing the page.'}
          onRetry={resetError}
          className="shadow-lg"
        />
      </div>
    </div>
  );
}