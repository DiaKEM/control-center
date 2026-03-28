import { RunAllCommand } from './run-all.command';

describe('RunAllCommand', () => {
  it('calls jobManager.runAll()', async () => {
    const jobManager = { runAll: jest.fn().mockResolvedValue(undefined) };
    const command = new RunAllCommand(jobManager as any);
    await command.run([], {});
    expect(jobManager.runAll).toHaveBeenCalled();
  });
});
