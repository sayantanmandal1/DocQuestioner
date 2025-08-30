import axios, { AxiosError } from 'axios';
import { ApiClient, handleApiError, checkApiHealth } from '../api';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiClient', () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    apiClient = new ApiClient();
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('makes GET request successfully', async () => {
      const mockData = { message: 'success' };
      mockedAxios.request.mockResolvedValueOnce({ data: mockData });

      const result = await apiClient.get('/test');

      expect(result).toEqual(mockData);
      expect(mockedAxios.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/test',
      });
    });

    it('retries on network error', async () => {
      const networkError = new AxiosError('Network Error');
      networkError.code = 'ERR_NETWORK';
      
      const mockData = { message: 'success' };

      mockedAxios.request
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({ data: mockData });

      const result = await apiClient.get('/test');

      expect(result).toEqual(mockData);
      expect(mockedAxios.request).toHaveBeenCalledTimes(3);
    });

    it('fails after max retries', async () => {
      const networkError = new AxiosError('Network Error');
      networkError.code = 'ERR_NETWORK';

      mockedAxios.request.mockRejectedValue(networkError);

      await expect(apiClient.get('/test')).rejects.toThrow('Network Error');
      expect(mockedAxios.request).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it('does not retry on 4xx errors', async () => {
      const clientError = new AxiosError('Bad Request');
      clientError.response = { status: 400 } as any;

      mockedAxios.request.mockRejectedValueOnce(clientError);

      await expect(apiClient.get('/test')).rejects.toThrow('Bad Request');
      expect(mockedAxios.request).toHaveBeenCalledTimes(1);
    });
  });

  describe('post', () => {
    it('makes POST request successfully', async () => {
      const mockData = { id: 1 };
      const postData = { name: 'test' };
      mockedAxios.request.mockResolvedValueOnce({ data: mockData });

      const result = await apiClient.post('/test', postData);

      expect(result).toEqual(mockData);
      expect(mockedAxios.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/test',
        data: postData,
      });
    });
  });

  describe('put', () => {
    it('makes PUT request successfully', async () => {
      const mockData = { updated: true };
      const putData = { name: 'updated' };
      mockedAxios.request.mockResolvedValueOnce({ data: mockData });

      const result = await apiClient.put('/test/1', putData);

      expect(result).toEqual(mockData);
      expect(mockedAxios.request).toHaveBeenCalledWith({
        method: 'PUT',
        url: '/test/1',
        data: putData,
      });
    });
  });

  describe('delete', () => {
    it('makes DELETE request successfully', async () => {
      const mockData = { deleted: true };
      mockedAxios.request.mockResolvedValueOnce({ data: mockData });

      const result = await apiClient.delete('/test/1');

      expect(result).toEqual(mockData);
      expect(mockedAxios.request).toHaveBeenCalledWith({
        method: 'DELETE',
        url: '/test/1',
      });
    });
  });

  describe('upload', () => {
    it('makes upload request successfully', async () => {
      const mockData = { uploaded: true };
      const formData = new FormData();
      formData.append('file', new File(['content'], 'test.txt'));
      
      mockedAxios.request.mockResolvedValueOnce({ data: mockData });

      const result = await apiClient.upload('/upload', formData);

      expect(result).toEqual(mockData);
      expect(mockedAxios.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/upload',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    });

    it('merges custom headers with upload headers', async () => {
      const mockData = { uploaded: true };
      const formData = new FormData();
      const customHeaders = { 'X-Custom': 'value' };
      
      mockedAxios.request.mockResolvedValueOnce({ data: mockData });

      await apiClient.upload('/upload', formData, { headers: customHeaders });

      expect(mockedAxios.request).toHaveBeenCalledWith({
        method: 'POST',
        url: '/upload',
        data: formData,
        headers: {
          'X-Custom': 'value',
          'Content-Type': 'multipart/form-data',
        },
      });
    });
  });
});

describe('handleApiError', () => {
  it('handles AxiosError with response', () => {
    const axiosError = new AxiosError('Request failed');
    axiosError.response = {
      status: 400,
      data: { message: 'Bad request', details: { field: 'invalid' } },
    } as any;
    axiosError.code = 'ERR_BAD_REQUEST';

    const result = handleApiError(axiosError);

    expect(result).toEqual({
      message: 'Bad request',
      status: 400,
      code: 'ERR_BAD_REQUEST',
      details: { message: 'Bad request', details: { field: 'invalid' } },
    });
  });

  it('handles AxiosError without response', () => {
    const axiosError = new AxiosError('Network Error');
    axiosError.request = {};
    axiosError.code = 'ERR_NETWORK';

    const result = handleApiError(axiosError);

    expect(result).toEqual({
      message: 'Network error - please check your connection',
      code: 'ERR_NETWORK',
    });
  });

  it('handles AxiosError with fallback message', () => {
    const axiosError = new AxiosError();
    axiosError.response = {
      status: 500,
      data: {},
    } as any;

    const result = handleApiError(axiosError);

    expect(result.message).toBe('Server error occurred');
    expect(result.status).toBe(500);
  });

  it('handles regular Error objects', () => {
    const error = new Error('Regular error');
    const result = handleApiError(error);

    expect(result).toEqual({
      message: 'Regular error',
    });
  });

  it('handles unknown error types', () => {
    const result = handleApiError('string error');

    expect(result).toEqual({
      message: 'string error',
    });
  });

  it('handles null/undefined errors', () => {
    const result = handleApiError(null);

    expect(result).toEqual({
      message: 'An unexpected error occurred',
    });
  });
});

describe('checkApiHealth', () => {
  let apiClient: ApiClient;

  beforeEach(() => {
    apiClient = new ApiClient();
    jest.clearAllMocks();
  });

  it('returns true when health check succeeds', async () => {
    mockedAxios.request.mockResolvedValueOnce({ data: { status: 'ok' } });

    const result = await checkApiHealth();

    expect(result).toBe(true);
    expect(mockedAxios.request).toHaveBeenCalledWith({
      method: 'GET',
      url: '/health',
    });
  });

  it('returns false when health check fails', async () => {
    mockedAxios.request.mockRejectedValueOnce(new Error('Server down'));

    const result = await checkApiHealth();

    expect(result).toBe(false);
  });
});