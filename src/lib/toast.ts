import { toast as sonnerToast } from 'sonner';

// Sonner toast utility with consistent API
export const toast = {
  success: (message: string, description?: string) => {
    if (description) {
      sonnerToast.success(message, { description });
    } else {
      sonnerToast.success(message);
    }
  },
  
  error: (message: string, description?: string) => {
    if (description) {
      sonnerToast.error(message, { description });
    } else {
      sonnerToast.error(message);
    }
  },
  
  info: (message: string, description?: string) => {
    if (description) {
      sonnerToast.info(message, { description });
    } else {
      sonnerToast.info(message);
    }
  },
  
  warning: (message: string, description?: string) => {
    if (description) {
      sonnerToast.warning(message, { description });
    } else {
      sonnerToast.warning(message);
    }
  },
  
  // For backward compatibility with existing toast calls
  default: (options: {
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive' | 'success' | 'warning';
  }) => {
    const { title = '', description, variant = 'default' } = options;
    
    switch (variant) {
      case 'success':
        toast.success(title, description);
        break;
      case 'destructive':
        toast.error(title, description);
        break;
      case 'warning':
        toast.warning(title, description);
        break;
      default:
        toast.info(title, description);
        break;
    }
  },
  
  // Promise toast for async operations
  promise: <T>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return sonnerToast.promise(promise, options);
  },
  
  // Dismiss all toasts
  dismiss: () => {
    sonnerToast.dismiss();
  },
  
  // Custom toast with full Sonner options
  custom: (message: string, options?: Parameters<typeof sonnerToast>[1]) => {
    return sonnerToast(message, options);
  },
};

// Export individual functions for direct use
export const { success, error, info, warning, promise, dismiss, custom } = toast;

// Default export for compatibility
export default toast;
