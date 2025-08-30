'use client';

import { useState, useRef } from 'react';
import { qaService } from '../lib/services';
import type { QAResponse } from '../types/api';
import { useNotifications } from './NotificationProvider';

interface FormData {
  question: string;
  documentText: string;
  file: File | null;
  inputMode: 'text' | 'file';
}

interface FormErrors {
  question?: string;
  document?: string;
  file?: string;
}

export default function QA() {
  const [formData, setFormData] = useState<FormData>({
    question: '',
    documentText: '',
    file: null,
    inputMode: 'text',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<QAResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const { success, error } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate question
    if (!formData.question.trim()) {
      newErrors.question = 'Question is required';
    } else if (formData.question.length < 5) {
      newErrors.question = 'Question must be at least 5 characters long';
    } else if (formData.question.length > 500) {
      newErrors.question = 'Question must be less than 500 characters';
    }

    // Validate document input based on mode
    if (formData.inputMode === 'text') {
      if (!formData.documentText.trim()) {
        newErrors.document = 'Document text is required';
      } else if (formData.documentText.length < 10) {
        newErrors.document = 'Document text must be at least 10 characters long';
      }
    } else {
      if (!formData.file) {
        newErrors.file = 'Please select a file to upload';
      } else if (formData.file.size > 10 * 1024 * 1024) { // 10MB limit
        newErrors.file = 'File size must be less than 10MB';
      } else if (!formData.file.type.startsWith('text/')) {
        newErrors.file = 'Only text files are supported';
      }
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
      let response: QAResponse;

      if (formData.inputMode === 'file' && formData.file) {
        response = await qaService.answerQuestionWithFile(formData.question, formData.file);
      } else {
        response = await qaService.answerQuestion({
          question: formData.question,
          document_text: formData.documentText,
        });
      }

      setResult(response);
      success('Question answered successfully!');
    } catch (err: unknown) {
      console.error('Q&A error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      setApiError(errorMessage);
      error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing/selecting
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleModeChange = (mode: 'text' | 'file') => {
    setFormData(prev => ({
      ...prev,
      inputMode: mode,
      file: null,
      documentText: '',
    }));
    setErrors({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleInputChange('file', file);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      success('Answer copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text:', err);
      error('Failed to copy to clipboard');
    }
  };

  const resetForm = () => {
    setFormData({
      question: '',
      documentText: '',
      file: null,
      inputMode: 'text',
    });
    setErrors({});
    setResult(null);
    setApiError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isFormValid = formData.question.trim() && 
    ((formData.inputMode === 'text' && formData.documentText.trim()) || 
     (formData.inputMode === 'file' && formData.file));

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Question Input */}
        <div>
          <label htmlFor="question" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Your Question
          </label>
          <input
            type="text"
            id="question"
            value={formData.question}
            onChange={(e) => handleInputChange('question', e.target.value)}
            placeholder="What would you like to know about the document?"
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
              errors.question ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isLoading}
          />
          {errors.question && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.question}</p>
          )}
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {formData.question.length}/500 characters
          </p>
        </div>

        {/* Input Mode Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Document Input Method
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="inputMode"
                value="text"
                checked={formData.inputMode === 'text'}
                onChange={() => handleModeChange('text')}
                className="mr-2 text-blue-600 focus:ring-blue-500"
                disabled={isLoading}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Paste Text</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="inputMode"
                value="file"
                checked={formData.inputMode === 'file'}
                onChange={() => handleModeChange('file')}
                className="mr-2 text-blue-600 focus:ring-blue-500"
                disabled={isLoading}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Upload File</span>
            </label>
          </div>
        </div>

        {/* Document Input - Text Mode */}
        {formData.inputMode === 'text' && (
          <div>
            <label htmlFor="documentText" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Document Text
            </label>
            <textarea
              id="documentText"
              value={formData.documentText}
              onChange={(e) => handleInputChange('documentText', e.target.value)}
              placeholder="Paste your document content here..."
              className={`w-full h-40 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.document ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.document && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.document}</p>
            )}
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {formData.documentText.length} characters
            </p>
          </div>
        )}

        {/* Document Input - File Mode */}
        {formData.inputMode === 'file' && (
          <div>
            <label htmlFor="file" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Upload Document
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md dark:border-gray-600">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600 dark:text-gray-400">
                  <label
                    htmlFor="file"
                    className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file"
                      name="file"
                      type="file"
                      className="sr-only"
                      accept="text/*,.txt,.md,.csv,.json,.xml,.html,.htm"
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      disabled={isLoading}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Text files up to 10MB
                </p>
              </div>
            </div>
            {formData.file && (
              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {formData.file.name} ({(formData.file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange('file', null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                      }
                    }}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    disabled={isLoading}
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
            {errors.file && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.file}</p>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isLoading || !isFormValid}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              'Ask Question'
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
            Answer
          </h3>
          
          {/* Answer Text */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-medium text-gray-900 dark:text-white">Response</h4>
              <button
                onClick={() => copyToClipboard(result.answer)}
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
              {result.answer}
            </p>
          </div>

          {/* Confidence Score */}
          {result.confidence !== undefined && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Confidence Score
                </span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2 mr-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(result.confidence * 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {(result.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Sources */}
          {result.sources && result.sources.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h4 className="font-medium text-green-800 dark:text-green-300 mb-3">
                Supporting Sources
              </h4>
              <div className="space-y-2">
                {result.sources.map((source, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800 rounded p-3 border-l-4 border-green-500">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      &ldquo;{source}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}