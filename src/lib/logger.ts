export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

function safeStringify(value: unknown, space = 2): string {
  try {
    return JSON.stringify(value, null, space);
  } catch {
    return '"[unserializable]"';
  }
}

function normalizeLogData(data: unknown): unknown {
  if (data === undefined) {
    return undefined;
  }

  try {
    const serializedData = JSON.stringify(data);

    if (serializedData === undefined) {
      return "[unserializable]";
    }

    return data;
  } catch {
    return "[unserializable]";
  }
}

class Logger {
  private readonly isDevelopment: boolean;
  private readonly maxLogs = 100;
  private logs: LogEntry[] = [];

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development";
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    data?: unknown,
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

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  private formatOutput(entry: LogEntry): string {
    const { timestamp, level, message, data } = entry;

    return safeStringify({
      timestamp,
      level,
      message,
      ...(data === undefined ? {} : { data: normalizeLogData(data) }),
    });
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

export const logger = new Logger();
