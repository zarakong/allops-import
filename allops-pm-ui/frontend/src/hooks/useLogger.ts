import { useEffect } from 'react';
import logger from '../utils/logger';

export const useLogger = (componentName: string) => {
  useEffect(() => {
    logger.debug(`Component ${componentName} mounted`);
    
    return () => {
      logger.debug(`Component ${componentName} unmounted`);
    };
  }, [componentName]);

  const logAction = (action: string, data?: any) => {
    logger.info(`${componentName}: ${action}`, data);
  };

  const logError = (action: string, error: Error | any) => {
    logger.error(`${componentName}: ${action}`, error);
  };

  const logApiCall = (endpoint: string, method: string, data?: any) => {
    logger.info(`${componentName}: API call`, {
      endpoint,
      method,
      data
    });
  };

  return {
    logAction,
    logError,
    logApiCall
  };
};