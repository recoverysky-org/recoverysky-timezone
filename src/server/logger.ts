/**
 * Simple console logger with emoji decorations
 * KISS and DRY - no fancy stuff, just clean output
 */

interface LogContext {
    ip?: string;
    debug?: boolean;
    error?: any;
}

class Logger {
    private debugMode: boolean = false;

    setDebugMode(enabled: boolean): void {
        this.debugMode = enabled;
    }

    private formatMessage(level: string, message: string, context?: LogContext): string {
        const timestamp = new Date().toISOString();
        const ip = context?.ip ? ` [${context.ip}]` : '';
        const debug = context?.debug ? ' 🔍' : '';
        
        let formattedMessage = `${timestamp}${ip} ${level}${debug} ${message}`;
        
        // Handle error objects with pretty printing
        if (context?.error) {
            const errorStr = typeof context.error === 'object' 
                ? JSON.stringify(context.error, null, 2)
                : String(context.error);
            formattedMessage += `\n${errorStr}`;
        }
        
        return formattedMessage;
    }

    info(message: string, context?: LogContext): void {
        console.log(this.formatMessage('🌸', message, context));
    }

    success(message: string, context?: LogContext): void {
        console.log(this.formatMessage('✨', message, context));
    }

    warn(message: string, context?: LogContext): void {
        console.log(this.formatMessage('🌻', message, context));
    }

    error(message: string, context?: LogContext): void {
        console.log(this.formatMessage('🌺', message, context));
    }

    debug(message: string, context?: LogContext): void {
        if (this.debugMode) {
            console.log(this.formatMessage('🌼', message, context));
        }
    }

    api(method: string, path: string, statusCode: number, context?: LogContext): void {
        const emoji = statusCode >= 400 ? '🌺' : statusCode >= 300 ? '🌻' : '🌸';
        const message = `${method} ${path} → ${statusCode}`;
        console.log(this.formatMessage(emoji, message, context));
    }
}

// Export singleton instance
export const logger = new Logger();
