import { RunJobCommand } from './run-job.command';

describe('RunJobCommand', () => {
  it('calls jobManager.run() with the provided job key', async () => {
    const jobManager = { run: jest.fn().mockResolvedValue(undefined) };
    const command = new RunJobCommand(jobManager as any);
    await command.run(['pump-age'], {});
    expect(jobManager.run).toHaveBeenCalledWith('pump-age');
  });
});
