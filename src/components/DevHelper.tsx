import { useEffect } from 'react';

const DevHelper = () => {
  useEffect(() => {
    // Suppress specific console warnings in development
    if (process.env.NODE_ENV === 'development') {
      const originalWarn = console.warn;
      const originalError = console.error;

      console.warn = (...args) => {
        // Suppress specific warnings that are not critical
        const message = args[0];
        if (
          typeof message === 'string' &&
          (message.includes('React Router Future Flag Warning') ||
            message.includes('defaultProps') ||
            message.includes('findDOMNode') ||
            message.includes('API endpoints not available') ||
            message.includes('using mock data') ||
            message.includes('No routes matched location'))
        ) {
          return;
        }
        originalWarn.apply(console, args);
      };

      console.error = (...args) => {
        // Filter out specific development-only errors
        const message = args[0];
        if (
          typeof message === 'string' &&
          (message.includes('Error fetching users:') ||
            message.includes('Error fetching machines:') ||
            message.includes('Resource not found:') ||
            message.includes('404 (Not Found)'))
        ) {
          // Still log but with less prominence
          console.log('🔧 Dev Info:', ...args);
          return;
        }
        originalError.apply(console, args);
      };

      // Cleanup
      return () => {
        console.warn = originalWarn;
        console.error = originalError;
      };
    }
  }, []);

  return null;
};

export default DevHelper;
