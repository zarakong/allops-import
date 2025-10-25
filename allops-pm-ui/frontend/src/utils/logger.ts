// Frontend Logger Configuration
class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const logData = data ? JSON.stringify(data, null, 2) : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message} ${logData}`;
  }

  private writeToFile(level: string, message: string, data?: any) {
    // In a real application, you might send logs to a logging service
    // For now, we'll just log to console and localStorage
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Store in localStorage (limited storage, for demo purposes)
    try {
      const existingLogs = JSON.parse(localStorage.getItem('frontend-logs') || '[]');
      existingLogs.push(logEntry);
      
      // Keep only last 100 logs to prevent storage overflow
      if (existingLogs.length > 100) {
        existingLogs.splice(0, existingLogs.length - 100);
      }
      
      localStorage.setItem('frontend-logs', JSON.stringify(existingLogs));
    } catch (error) {
      console.error('Failed to write log to localStorage:', error);
    }
  }

  info(message: string, data?: any) {
    const formattedMessage = this.formatMessage('info', message, data);
    
    if (this.isDevelopment) {
      console.info(formattedMessage);
    }
    
    this.writeToFile('info', message, data);
  }

  warn(message: string, data?: any) {
    const formattedMessage = this.formatMessage('warn', message, data);
    
    if (this.isDevelopment) {
      console.warn(formattedMessage);
    }
    
    this.writeToFile('warn', message, data);
  }

  error(message: string, error?: Error | any) {
    const errorData = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : error;

    const formattedMessage = this.formatMessage('error', message, errorData);
    
    if (this.isDevelopment) {
      console.error(formattedMessage);
    }
    
    this.writeToFile('error', message, errorData);
  }

  debug(message: string, data?: any) {
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage('debug', message, data);
      console.debug(formattedMessage);
    }
    
    this.writeToFile('debug', message, data);
  }

  // Method to get logs from localStorage
  getLogs(): any[] {
    try {
      return JSON.parse(localStorage.getItem('frontend-logs') || '[]');
    } catch (error) {
      console.error('Failed to retrieve logs from localStorage:', error);
      return [];
    }
  }

  // Method to clear logs
  clearLogs() {
    try {
      localStorage.removeItem('frontend-logs');
    } catch (error) {
      console.error('Failed to clear logs from localStorage:', error);
    }
  }

  // Method to export logs as JSON
  exportLogs(): string {
    return JSON.stringify(this.getLogs(), null, 2);
  }
}

const logger = new Logger();

// Global error handler for unhandled errors
window.addEventListener('error', (event) => {
  logger.error('Unhandled error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

// Global handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection', {
    reason: event.reason
  });
});

export default logger;