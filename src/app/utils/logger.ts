export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

class Logger {
  private isDevelopment: boolean;
  private logs: LogEntry[] = [];
  private maxLogs: number = 100;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development";
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    data?: unknown
  ): LogEntry {
    return {
      timestamp: this.formatTimestamp(),
      level,
      message,
      data,
    };
  }

  private addToHistory(entry: LogEntry): void {
    this.logs.push(entry);
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  private formatOutput(entry: LogEntry): string {
    const { timestamp, level, message, data } = entry;
    const dataStr = data ? ` ${JSON.stringify(data)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`;
  }

  debug(message: string, data?: unknown): void {
    const entry = this.createLogEntry("debug", message, data);
    this.addToHistory(entry);
    if (this.isDevelopment) {
      console.debug(this.formatOutput(entry));
    }
  }

  info(message: string, data?: unknown): void {
    const entry = this.createLogEntry("info", message, data);
    this.addToHistory(entry);
    console.info(this.formatOutput(entry));
  }

  warn(message: string, data?: unknown): void {
    const entry = this.createLogEntry("warn", message, data);
    this.addToHistory(entry);
    console.warn(this.formatOutput(entry));
  }

  error(message: string, data?: unknown): void {
    const entry = this.createLogEntry("error", message, data);
    this.addToHistory(entry);
    console.error(this.formatOutput(entry));
  }

  getHistory(): LogEntry[] {
    return [...this.logs];
  }

  clearHistory(): void {
    this.logs = [];
  }
}

// Export singleton instance
export const logger = new Logger();
