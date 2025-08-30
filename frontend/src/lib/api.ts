import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Extend the axios config type to include metadata
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: Date;
    };
  }
}

// API base URL - hardcoded to production backend
const API_BASE_URL = 'https://docquestioner.onrender.com';

// Retry configuration
interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition?: (error: AxiosError) => boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  retries: 3,
  retryDelay: 1000,
  retryCondition: (error: AxiosError) => {
    // Retry on network errors, timeouts, and 5xx server errors
    return (
      !error.response ||
      error.code === 'ECONNABORTED' ||
      error.code === 'NETWORK_ERROR' ||
      (error.response.status >= 500 && error.response.status < 600)
    );
  },
};

// Create axios instance with default configuration
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add retry functionality
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function axiosRetry<T>(
  config: AxiosRequestConfig,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<AxiosResponse<T>> {
  let lastError: AxiosError;

  for (let attempt = 0; attempt <= retryConfig.retries; attempt++) {
    try {
      return await apiClient.request<T>(config);
    } catch (error) {
      lastError = error as AxiosError;

      // Don't retry if it's the last attempt or retry condition is not met
      if (
        attempt === retryConfig.retries ||
        !retryConfig.retryCondition?.(lastError)
      ) {
        throw lastError;
      }

      // Wait before retrying with exponential backoff
      const delay = retryConfig.retryDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  throw lastError!;
}

// Request interceptor for adding auth headers if needed
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add any auth tokens or other headers here if needed
    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() };
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors and logging
apiClient.interceptors.response.use(
  (response) => {
    // Log successful requests in development
    if (process.env.NODE_ENV === 'development') {
      const startTime = response.config.metadata?.startTime?.getTime();
      const duration = startTime ? new Date().getTime() - startTime : 0;
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status} (${duration}ms)`);
    }
    return response;
  },
  (error: AxiosError) => {
    // Log errors in development
    if (process.env.NODE_ENV === 'development') {
      const duration = error.config?.metadata?.startTime
        ? new Date().getTime() - error.config.metadata.startTime.getTime()
        : 0;
      console.error(`❌ ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response?.status || 'Network Error'} (${duration}ms)`);
    }

    // Handle common error scenarios
    if (error.response?.status === 401) {
      console.error('Unauthorized access');
    } else if (error.response?.status && error.response.status >= 500) {
      console.error('Server error:', error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      console.error('Request timeout');
    } else if (error.code === 'ERR_NETWORK') {
      console.error('Network error - check if the server is running');
    }

    return Promise.reject(error);
  }
);

// Enhanced API client with retry logic
export class ApiClient {
  private retryConfig: RetryConfig;

  constructor(retryConfig: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosRetry<T>({ ...config, method: 'GET', url }, this.retryConfig);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosRetry<T>({ ...config, method: 'POST', url, data }, this.retryConfig);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosRetry<T>({ ...config, method: 'PUT', url, data }, this.retryConfig);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosRetry<T>({ ...config, method: 'DELETE', url }, this.retryConfig);
    return response.data;
  }

  async upload<T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosRetry<T>({
      ...config,
      method: 'POST',
      url,
      data: formData,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
    }, this.retryConfig);
    return response.data;
  }
}

// Default API client instance
export const api = new ApiClient();

// Error handling utilities
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

export function handleApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;

    if (axiosError.response) {
      // Server responded with error status
      const responseData = axiosError.response.data as any;
      return {
        message: responseData?.message || axiosError.message || 'Server error occurred',
        status: axiosError.response.status,
        code: axiosError.code,
        details: responseData,
      };
    } else if (axiosError.request) {
      // Request was made but no response received
      return {
        message: 'Network error - please check your connection',
        code: axiosError.code,
      };
    }
  }

  // Fallback for other types of errors
  return {
    message: error instanceof Error ? error.message : 'An unexpected error occurred',
  };
}

// Health check utility
export async function checkApiHealth(): Promise<boolean> {
  try {
    await api.get('/health');
    return true;
  } catch {
    return false;
  }
}

export default apiClient;