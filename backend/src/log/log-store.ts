import { Log, LogLevel } from './log.schema';

export class LogStore {
  private readonly entries: Log[] = [];

  static create(): LogStore {
    return new LogStore();
  }

  info(message: string): this {
    return this.push(LogLevel.INFO, message);
  }

  warn(message: string): this {
    return this.push(LogLevel.WARNING, message);
  }

  error(message: string): this {
    return this.push(LogLevel.ERROR, message);
  }

  toArray(): Log[] {
    return [...this.entries];
  }

  private push(level: LogLevel, message: string): this {
    this.entries.push({ timestamp: new Date(), level, message });
    return this;
  }
}
