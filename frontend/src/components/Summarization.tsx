'use client';

import { useState } from 'react';
import { summarizationService } from '../lib/services';
import type { SummarizationRequest, SummarizationResponse } from '../types/api';
import { useNotifications } from './NotificationProvider';

interface FormData {
  text: string;
  maxLength: number;
  style: 'concise' | 'detailed' | 'bullet-points';
}

interface FormErrors {
  text?: string;
  maxLength?: string;
}

export default function Summarization() {
  const [formData, setFormData] = useState<FormData>({
    text: '',
    maxLength: 150,
    style: 'concise',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SummarizationResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const { success, error } = useNotifications();

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.text.trim()) {
      newErrors.text = 'Text is required';
    } else if (formData.text.length < 10) {
      newErrors.text = 'Text must be at least 10 characters long';
    } else if (formData.text.length > 10000) {
      newErrors.text = 'Text must be less than 10,000 characters';
    }

    if (formData.maxLength < 50 || formData.maxLength > 500) {
      newErrors.maxLength = 'Summary length must be between 50 and 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setApiError(null);
    setResult(null);

    try {
      const request: SummarizationRequest = {
        text: formData.text,
        max_length: formData.maxLength,
        style: formData.style,
      };

      const response = await summarizationService.summarizeText(request);
      setResult(response);
      success('Text summarized successfully!');
    } catch (err: unknown) {
      console.error('Summarization error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      setApiError(errorMessage);
      error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      success('Summary copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text:', err);
      error('Failed to copy to clipboard');
    }
  };

  const resetForm = () => {
    setFormData({
      text: '',
      maxLength: 150,
      style: 'concise',
    });
    setErrors({});
    setResult(null);
    setApiError(null);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Text Input */}
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Text to Summarize
          </label>
          <textarea
            id="text"
            value={formData.text}
            onChange={(e) => handleInputChange('text', e.target.value)}
            placeholder="Enter the text you want to summarize..."
            className={`w-full h-40 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.text ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isLoading}
          />
          {errors.text && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.text}</p>
          )}
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {formData.text.length}/10,000 characters
          </p>
        </div>

        {/* Options Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Max Length */}
          <div>
            <label htmlFor="maxLength" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Summary Length
            </label>
            <input
              type="number"
              id="maxLength"
              value={formData.maxLength}
              onChange={(e) => handleInputChange('maxLength', parseInt(e.target.value) || 150)}
              min="50"
              max="500"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.maxLength ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.maxLength && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.maxLength}</p>
            )}
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Characters (50-500)
            </p>
          </div>

          {/* Style */}
          <div>
            <label htmlFor="style" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Summary Style
            </label>
            <select
              id="style"
              value={formData.style}
              onChange={(e) => handleInputChange('style', e.target.value as FormData['style'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              disabled={isLoading}
            >
              <option value="concise">Concise</option>
              <option value="detailed">Detailed</option>
              <option value="bullet-points">Bullet Points</option>
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isLoading || !formData.text.trim()}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Summarizing...
              </span>
            ) : (
              'Summarize Text'
            )}
          </button>
          
          <button
            type="button"
            onClick={resetForm}
            disabled={isLoading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            Reset
          </button>
        </div>
      </form>

      {/* Error Display */}
      {apiError && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                {apiError}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="mt-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Summary Results
          </h3>
          
          {/* Summary Text */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-gray-900 dark:text-white">Summary</h4>
              <button
                onClick={() => copyToClipboard(result.summary)}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm flex items-center gap-1"
                title="Copy to clipboard"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
            </div>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {result.summary}
            </p>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {result.original_length.toLocaleString()}
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-300">
                Original Characters
              </div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {result.summary_length.toLocaleString()}
              </div>
              <div className="text-sm text-green-800 dark:text-green-300">
                Summary Characters
              </div>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {(result.compression_ratio * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-purple-800 dark:text-purple-300">
                Compression Ratio
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}