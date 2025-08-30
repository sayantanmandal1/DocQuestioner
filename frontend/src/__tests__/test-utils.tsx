import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { NotificationProvider } from '../components/NotificationProvider';

// Test wrapper with NotificationProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <NotificationProvider>{children}</NotificationProvider>
);

// Custom render function that includes providers
const customRender = (ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  render(ui, { wrapper: TestWrapper, ...options });

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };