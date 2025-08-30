'use client';

import { useState, useEffect } from 'react';
import { healthService } from '@/lib/services';
import { useNotifications } from './NotificationProvider';

interface HealthStatus {
  status: 'checking' | 'healthy' | 'unhealthy';
  message: string;
  lastChecked?: Date;
}

export default function HealthCheck() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    status: 'checking',
    message: 'Checking backend connection...',
  });
  const { error } = useNotifications();

  const checkHealth = async () => {
    setHealthStatus({
      status: 'checking',
      message: 'Checking backend connection...',
    });

    try {
      await healthService.checkHealth();
      setHealthStatus({
        status: 'healthy',
        message: 'Backend is running and accessible',
        lastChecked: new Date(),
      });
    } catch (err) {
      console.error('Health check failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Backend is not accessible';
      setHealthStatus({
        status: 'unhealthy',
        message: errorMessage,
        lastChecked: new Date(),
      });
      error(`Backend health check failed: ${errorMessage}`);
    }
  };

  useEffect(() => {
    checkHealth();
    
    // Set up periodic health checks every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (healthStatus.status) {
      case 'healthy':
        return 'text-green-600 dark:text-green-400';
      case 'unhealthy':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  const getStatusIcon = () => {
    switch (healthStatus.status) {
      case 'healthy':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'unhealthy':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`flex items-center gap-1 ${getStatusColor()}`}>
        {getStatusIcon()}
        <span className="font-medium">
          {healthStatus.status === 'checking' ? 'Checking...' : 
           healthStatus.status === 'healthy' ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      
      {healthStatus.lastChecked && (
        <span className="text-gray-500 dark:text-gray-400">
          Last checked: {healthStatus.lastChecked.toLocaleTimeString()}
        </span>
      )}
      
      <button
        onClick={checkHealth}
        disabled={healthStatus.status === 'checking'}
        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Refresh health check"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
}