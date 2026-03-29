import { LogStore } from './log-store';
import { LogLevel } from './log.schema';

describe('LogStore', () => {
  it('creates an empty store via static factory', () => {
    const store = LogStore.create();
    expect(store.toArray()).toHaveLength(0);
  });

  it('info() adds an INFO log entry and returns this', () => {
    const store = LogStore.create();
    const returned = store.info('hello');
    const entries = store.toArray();
    expect(returned).toBe(store);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      level: LogLevel.INFO,
      message: 'hello',
    });
    expect(entries[0].timestamp).toBeInstanceOf(Date);
  });

  it('warn() adds a WARNING log entry', () => {
    const store = LogStore.create();
    store.warn('caution');
    expect(store.toArray()[0]).toMatchObject({
      level: LogLevel.WARNING,
      message: 'caution',
    });
  });

  it('error() adds an ERROR log entry', () => {
    const store = LogStore.create();
    store.error('boom');
    expect(store.toArray()[0]).toMatchObject({
      level: LogLevel.ERROR,
      message: 'boom',
    });
  });

  it('supports method chaining', () => {
    const entries = LogStore.create().info('a').warn('b').error('c').toArray();
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.level)).toEqual([
      LogLevel.INFO,
      LogLevel.WARNING,
      LogLevel.ERROR,
    ]);
  });

  it('toArray() returns a copy, not the internal array', () => {
    const store = LogStore.create().info('x');
    const arr1 = store.toArray();
    const arr2 = store.toArray();
    expect(arr1).not.toBe(arr2);
  });
});
