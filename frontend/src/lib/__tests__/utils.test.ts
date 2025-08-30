import {
  cn,
  formatFileSize,
  truncateText,
  isValidFileType,
  formatErrorMessage,
  debounce,
  throttle,
  formatDuration,
  copyToClipboard,
  generateId,
  isEmpty,
  formatDate,
  getRelativeTime,
  isValidEmail,
  isValidUrl,
  sleep,
} from '../utils';

describe('cn', () => {
  it('combines class names', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  it('handles conditional classes', () => {
    expect(cn('class1', false && 'class2', 'class3')).toBe('class1 class3');
  });
});

describe('formatFileSize', () => {
  it('formats bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(1073741824)).toBe('1 GB');
  });

  it('formats with decimals', () => {
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(2621440)).toBe('2.5 MB');
  });
});

describe('truncateText', () => {
  it('truncates long text', () => {
    expect(truncateText('This is a long text', 10)).toBe('This is a ...');
  });

  it('returns original text if shorter than max length', () => {
    expect(truncateText('Short', 10)).toBe('Short');
  });

  it('returns original text if equal to max length', () => {
    expect(truncateText('Exactly10!', 10)).toBe('Exactly10!');
  });
});

describe('isValidFileType', () => {
  it('validates file types correctly', () => {
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    expect(isValidFileType(file, ['text/plain', 'text/html'])).toBe(true);
    expect(isValidFileType(file, ['image/jpeg', 'image/png'])).toBe(false);
  });
});

describe('formatErrorMessage', () => {
  it('formats Error objects', () => {
    const error = new Error('Test error');
    expect(formatErrorMessage(error)).toBe('Test error');
  });

  it('formats string errors', () => {
    expect(formatErrorMessage('String error')).toBe('String error');
  });

  it('formats unknown errors', () => {
    expect(formatErrorMessage(null)).toBe('An unexpected error occurred');
    expect(formatErrorMessage(undefined)).toBe('An unexpected error occurred');
    expect(formatErrorMessage({})).toBe('An unexpected error occurred');
  });
});

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('delays function execution', () => {
    const fn = jest.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    expect(fn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancels previous calls', () => {
    const fn = jest.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn();
    debouncedFn();
    debouncedFn();

    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('throttle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('limits function calls', () => {
    const fn = jest.fn();
    const throttledFn = throttle(fn, 100);

    throttledFn();
    throttledFn();
    throttledFn();

    expect(fn).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(100);
    throttledFn();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('formatDuration', () => {
  it('formats milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms');
    expect(formatDuration(1500)).toBe('1.5s');
    expect(formatDuration(65000)).toBe('1.1m');
    expect(formatDuration(3700000)).toBe('1.0h');
  });
});

describe('copyToClipboard', () => {
  it('copies text using modern API', async () => {
    const mockWriteText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    });
    Object.assign(window, { isSecureContext: true });

    const result = await copyToClipboard('test text');
    expect(result).toBe(true);
    expect(mockWriteText).toHaveBeenCalledWith('test text');
  });

  it('falls back to execCommand', async () => {
    Object.assign(navigator, { clipboard: undefined });
    const mockExecCommand = jest.fn().mockReturnValue(true);
    Object.assign(document, { execCommand: mockExecCommand });

    const result = await copyToClipboard('test text');
    expect(result).toBe(true);
  });
});

describe('generateId', () => {
  it('generates random IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
    expect(id1).toHaveLength(8);
  });

  it('generates IDs with custom length', () => {
    const id = generateId(12);
    expect(id).toHaveLength(12);
  });
});

describe('isEmpty', () => {
  it('detects empty values', () => {
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty(undefined)).toBe(true);
    expect(isEmpty('')).toBe(true);
    expect(isEmpty('   ')).toBe(true);
    expect(isEmpty([])).toBe(true);
    expect(isEmpty({})).toBe(true);
  });

  it('detects non-empty values', () => {
    expect(isEmpty('text')).toBe(false);
    expect(isEmpty([1, 2, 3])).toBe(false);
    expect(isEmpty({ key: 'value' })).toBe(false);
    expect(isEmpty(0)).toBe(false);
    expect(isEmpty(false)).toBe(false);
  });
});

describe('formatDate', () => {
  it('formats dates correctly', () => {
    const date = new Date('2023-12-25T10:30:00');
    const formatted = formatDate(date);
    expect(formatted).toMatch(/Dec 25, 2023/);
  });

  it('handles string dates', () => {
    const formatted = formatDate('2023-12-25T10:30:00');
    expect(formatted).toMatch(/Dec 25, 2023/);
  });

  it('handles timestamp numbers', () => {
    const timestamp = new Date('2023-12-25T10:30:00').getTime();
    const formatted = formatDate(timestamp);
    expect(formatted).toMatch(/Dec 25, 2023/);
  });
});

describe('getRelativeTime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-12-25T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns "just now" for recent times', () => {
    const recent = new Date('2023-12-25T11:59:30');
    expect(getRelativeTime(recent)).toBe('just now');
  });

  it('returns minutes ago', () => {
    const fiveMinutesAgo = new Date('2023-12-25T11:55:00');
    expect(getRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
  });

  it('returns hours ago', () => {
    const twoHoursAgo = new Date('2023-12-25T10:00:00');
    expect(getRelativeTime(twoHoursAgo)).toBe('2 hours ago');
  });

  it('returns days ago', () => {
    const threeDaysAgo = new Date('2023-12-22T12:00:00');
    expect(getRelativeTime(threeDaysAgo)).toBe('3 days ago');
  });

  it('returns formatted date for older times', () => {
    const weekAgo = new Date('2023-12-18T12:00:00');
    const result = getRelativeTime(weekAgo);
    expect(result).toMatch(/Dec 18, 2023/);
  });
});

describe('isValidEmail', () => {
  it('validates correct emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    expect(isValidEmail('user+tag@example.org')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('invalid@')).toBe(false);
    expect(isValidEmail('@invalid.com')).toBe(false);
    expect(isValidEmail('invalid@.com')).toBe(false);
  });
});

describe('isValidUrl', () => {
  it('validates correct URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('http://localhost:3000')).toBe(true);
    expect(isValidUrl('ftp://files.example.com')).toBe(true);
  });

  it('rejects invalid URLs', () => {
    expect(isValidUrl('invalid')).toBe(false);
    expect(isValidUrl('not-a-url')).toBe(false);
    expect(isValidUrl('://missing-protocol.com')).toBe(false);
  });
});

describe('sleep', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves after specified time', async () => {
    const promise = sleep(1000);
    jest.advanceTimersByTime(1000);
    await expect(promise).resolves.toBeUndefined();
  });
});